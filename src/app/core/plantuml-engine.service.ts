import { Injectable, signal } from '@angular/core';

type RenderToString = (
  lines: string[],
  onSuccess: (svg: string) => void,
  onError: (message: string) => void,
) => void;

export interface DiagramError {
  /** 1-based line number in the editor, or null if PlantUML did not report one. */
  line: number | null;
  message: string;
}

export type RenderResult =
  | { ok: true; svg: string; durationMs: number }
  | { ok: false; error: DiagramError; errorSvg: string | null; durationMs: number };

export type EngineState = 'idle' | 'loading' | 'ready' | 'failed';

const RENDER_TIMEOUT_MS = 20_000;

/**
 * Thin wrapper around the official TeaVM build of PlantUML (`@plantuml/core`).
 *
 * The engine builds its SVG through the real DOM (it measures text via getBBox),
 * so it has to live on the main thread. Renders are serialized because the
 * engine keeps shared internal state; intermediate requests are dropped so only
 * the latest source is rendered ("latest wins").
 */
@Injectable({ providedIn: 'root' })
export class PlantUmlEngineService {
  readonly state = signal<EngineState>('idle');
  readonly themes = signal<{ id: string; label: string }[]>([]);

  private renderFn?: Promise<RenderToString>;
  private busy = false;
  private pending: { source: string; resolve: (r: RenderResult | null) => void } | null = null;

  /** Starts loading the engine (idempotent). */
  load(): Promise<RenderToString> {
    if (!this.renderFn) {
      this.state.set('loading');
      this.renderFn = this.doLoad().then(
        (fn) => {
          this.state.set('ready');
          return fn;
        },
        (err) => {
          this.state.set('failed');
          throw err;
        },
      );
    }
    return this.renderFn;
  }

  /**
   * Renders the given source. If another render is requested before this one
   * starts, this call resolves with `null` (superseded).
   */
  render(source: string): Promise<RenderResult | null> {
    return new Promise((resolve) => {
      this.pending?.resolve(null);
      this.pending = { source, resolve };
      void this.pump();
    });
  }

  private async pump(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      while (this.pending) {
        const job = this.pending;
        this.pending = null;
        const fn = await this.load();
        job.resolve(await this.renderOnce(fn, job.source));
      }
    } catch (err) {
      this.pending?.resolve({
        ok: false,
        error: {
          line: null,
          message: `PlantUML-Engine konnte nicht geladen werden: ${String(err)}`,
        },
        errorSvg: null,
        durationMs: 0,
      });
      this.pending = null;
    } finally {
      this.busy = false;
    }
  }

  private renderOnce(fn: RenderToString, source: string): Promise<RenderResult> {
    const started = performance.now();
    const lines = source.split(/\r\n|\r|\n/);
    return new Promise<RenderResult>((resolve) => {
      let done = false;
      const finish = (r: RenderResult) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(r);
      };
      const timer = setTimeout(
        () =>
          finish({
            ok: false,
            error: { line: null, message: 'Zeitüberschreitung beim Rendern' },
            errorSvg: null,
            durationMs: performance.now() - started,
          }),
        RENDER_TIMEOUT_MS,
      );
      try {
        fn(
          lines,
          (svg) => {
            const durationMs = performance.now() - started;
            const error = extractError(svg);
            finish(
              error
                ? { ok: false, error, errorSvg: svg, durationMs }
                : { ok: true, svg, durationMs },
            );
          },
          (message) =>
            finish({
              ok: false,
              error: { line: null, message: String(message) },
              errorSvg: null,
              durationMs: performance.now() - started,
            }),
        );
      } catch (err) {
        finish({
          ok: false,
          error: { line: null, message: String(err) },
          errorSvg: null,
          durationMs: performance.now() - started,
        });
      }
    });
  }

  private async doLoad(): Promise<RenderToString> {
    const w = window as unknown as Record<string, unknown>;
    // Lets `!include <C4/C4_Container>` & co. lazily fetch the standard library.
    w['PLANTUML_STDLIB_BASE'] ??= 'https://plantuml.github.io/plantuml/js-plantuml/';
    await Promise.all([
      loadScript('viz-global.js'),
      loadScript('themes.js').catch(() => undefined),
    ]);
    this.themes.set(readThemes());
    const url = new URL('plantuml.js', document.baseURI).href;
    const mod = (await import(/* @vite-ignore */ url)) as { renderToString: RenderToString };
    return mod.renderToString;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = new URL(src, document.baseURI).href;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`${src} konnte nicht geladen werden`));
    document.head.appendChild(el);
  });
}

function readThemes(): { id: string; label: string }[] {
  const all =
    (globalThis as unknown as { PLANTUML_THEMES?: Record<string, string> }).PLANTUML_THEMES ?? {};
  return Object.entries(all)
    .filter(([id]) => id !== '_none_')
    .map(([id, def]) => ({ id, label: /display_name:\s*(.+)/.exec(def)?.[1]?.trim() || id }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

const decode = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

/**
 * PlantUML reports syntax errors by rendering an "error image" (still via the
 * success callback). We recognise it and extract line + message.
 */
export function extractError(svg: string): DiagramError | null {
  const isVersionBanner = svg.includes('>PlantUML version ');
  const lineMatch = /\[From [^\]]*?\(line (\d+)\)\s*\]/.exec(svg);
  const unsupported = svg.includes('Diagram not supported by this release');
  if (!(isVersionBanner && lineMatch) && !unsupported) return null;

  const texts = [...svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)].map((m) => ({
    attrs: m[1],
    text: decode(m[2]).trim(),
  }));
  const red = texts.filter((t) => /fill="#FF0000"/i.test(t.attrs) && t.text);
  let message = red.map((t) => t.text).join(' ');
  if (!message && unsupported) {
    message = 'Diagrammtyp nicht erkannt – fehlt @startuml / @enduml?';
  }
  if (!message) message = 'Syntaxfehler';
  message = message
    .replace(/^Syntax Error\?/, 'Syntaxfehler?')
    .replace('Assumed diagram type:', 'Vermuteter Diagrammtyp:');
  return { line: lineMatch ? Number(lineMatch[1]) : unsupported ? 1 : null, message };
}

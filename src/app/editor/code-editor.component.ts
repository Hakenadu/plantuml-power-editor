import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  model,
  output,
  untracked,
} from '@angular/core';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  startCompletion,
} from '@codemirror/autocomplete';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  redo,
  toggleComment,
  undo,
} from '@codemirror/commands';
import { bracketMatching, indentOnInput, indentUnit } from '@codemirror/language';
import { Diagnostic, lintGutter, lintKeymap, setDiagnostics } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import {
  Compartment,
  EditorSelection,
  EditorState,
  Extension,
  RangeSetBuilder,
  StateEffect,
  StateField,
} from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import { DiagramError } from '../core/plantuml-engine.service';
import { plantumlCompletions } from './plantuml-completion';
import { plantuml } from './plantuml-language';

// ---------------------------------------------------------------------------
// Error line + inline error widget
// ---------------------------------------------------------------------------

const wrapCompartment = new Compartment();
const setErrorEffect = StateEffect.define<DiagramError | null>();

class ErrorWidget extends WidgetType {
  constructor(readonly message: string) {
    super();
  }
  override eq(other: ErrorWidget): boolean {
    return other.message === this.message;
  }
  toDOM(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'cm-pe-error-widget';
    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded';
    icon.textContent = 'error';
    const text = document.createElement('span');
    text.textContent = this.message;
    el.append(icon, text);
    return el;
  }
  override ignoreEvent(): boolean {
    return true;
  }
}

const errorField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(setErrorEffect)) continue;
      const err = e.value;
      if (!err || err.line == null) return Decoration.none;
      const lineNo = Math.min(Math.max(err.line, 1), tr.state.doc.lines);
      const line = tr.state.doc.line(lineNo);
      const builder = new RangeSetBuilder<Decoration>();
      builder.add(line.from, line.from, Decoration.line({ class: 'cm-pe-error-line' }));
      builder.add(
        line.to,
        line.to,
        Decoration.widget({ widget: new ErrorWidget(err.message), block: true, side: 1 }),
      );
      return builder.finish();
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ---------------------------------------------------------------------------
// "Jump to line" flash
// ---------------------------------------------------------------------------

const flashEffect = StateEffect.define<number | null>();
const flashField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(flashEffect)) continue;
      if (e.value == null) return Decoration.none;
      const line = tr.state.doc.line(Math.min(Math.max(e.value, 1), tr.state.doc.lines));
      return Decoration.set([Decoration.line({ class: 'cm-pe-flash-line' }).range(line.from)]);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: 'var(--pe-editor-font-size, 14px)',
    backgroundColor: 'transparent',
    color: 'var(--mat-sys-on-surface)',
  },
  '.cm-scroller': {
    fontFamily: 'var(--pe-mono)',
    lineHeight: '1.65',
    fontVariantLigatures: 'none',
    overscrollBehavior: 'contain',
  },
  '.cm-content': { padding: '12px 0 40vh', caretColor: 'var(--mat-sys-primary)' },
  '.cm-line': { padding: '0 16px 0 8px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--mat-sys-primary)',
    borderLeftWidth: '2px',
  },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection':
    {
      backgroundColor: 'color-mix(in srgb, var(--mat-sys-primary) 26%, transparent) !important',
    },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent)',
    border: 'none',
    fontFamily: 'var(--pe-mono)',
    fontSize: '0.86em',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 12px', minWidth: '28px' },
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in srgb, var(--mat-sys-primary) 6%, transparent)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--mat-sys-primary)',
    fontWeight: '700',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'color-mix(in srgb, var(--mat-sys-tertiary) 25%, transparent)',
    outline: '1px solid color-mix(in srgb, var(--mat-sys-tertiary) 60%, transparent)',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'color-mix(in srgb, var(--mat-sys-tertiary) 16%, transparent)',
  },
  '.cm-pe-error-line': {
    backgroundColor: 'color-mix(in srgb, var(--mat-sys-error) 11%, transparent)',
    boxShadow: 'inset 3px 0 0 var(--mat-sys-error)',
  },
  '.cm-pe-error-widget': {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '2px 16px 6px 8px',
    padding: '6px 12px',
    borderRadius: '10px',
    fontFamily: 'var(--mat-sys-body-medium-font, Inter, sans-serif)',
    fontSize: '0.85em',
    lineHeight: '1.4',
    color: 'var(--mat-sys-on-error-container)',
    backgroundColor: 'var(--mat-sys-error-container)',
    animation: 'pe-pop .18s ease-out',
  },
  '.cm-pe-error-widget .material-symbols-rounded': { fontSize: '18px' },
  '.cm-pe-flash-line': { animation: 'pe-flash 1.8s ease-out' },
  '.cm-tooltip-autocomplete > ul': { fontFamily: 'var(--pe-mono)', maxHeight: '18em !important' },
  '.cm-tooltip-autocomplete > ul > li': { padding: '4px 10px !important', lineHeight: '1.6' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'color-mix(in srgb, var(--mat-sys-primary) 22%, transparent) !important',
    color: 'var(--mat-sys-on-surface) !important',
  },
  '.cm-completionDetail': {
    opacity: '0.6',
    fontStyle: 'normal',
    marginLeft: '12px',
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.85em',
  },
  '.cm-completionMatchedText': {
    textDecoration: 'none',
    color: 'var(--mat-sys-primary)',
    fontWeight: '700',
  },
  '.cm-completionIcon': { opacity: '0.7' },
  '.cm-completionInfo': { padding: '8px 10px' },
  '.cm-panels': {
    backgroundColor: 'var(--mat-sys-surface-container)',
    color: 'var(--mat-sys-on-surface)',
  },
  '.cm-panels.cm-panels-bottom': { borderTop: '1px solid var(--mat-sys-outline-variant)' },
  '.cm-search input, .cm-search button': { fontSize: '13px' },
  '.cm-textfield': {
    borderRadius: '8px',
    border: '1px solid var(--mat-sys-outline)',
    background: 'var(--mat-sys-surface)',
    color: 'var(--mat-sys-on-surface)',
    padding: '4px 8px',
  },
  '.cm-button': {
    borderRadius: '8px',
    backgroundImage: 'none',
    background: 'var(--mat-sys-surface-container-highest)',
    color: 'var(--mat-sys-on-surface)',
    border: '1px solid var(--mat-sys-outline-variant)',
  },
  '.cm-diagnostic-error': { borderLeftColor: 'var(--mat-sys-error)' },
  '.cm-lint-marker-error': { content: 'none' },
});

@Component({
  selector: 'pe-code-editor',
  template: '',
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown.control.space)': '$event.preventDefault()',
  },
})
export class CodeEditorComponent {
  /** Two-way bound source text. */
  readonly value = model.required<string>();
  readonly error = input<DiagramError | null>(null);
  readonly wrap = input(false);
  readonly focused = output<boolean>();
  /** 1-based line of the main cursor. */
  readonly cursorLine = output<number>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private view?: EditorView;
  private flashTimer?: ReturnType<typeof setTimeout>;
  private lastEmitted: string | null = null;

  constructor() {
    afterNextRender(() => this.createView());

    // External changes (e.g. from the style editor) -> editor, preserving undo history.
    effect(() => {
      const next = this.value();
      const view = this.view;
      if (!view || next === this.lastEmitted) return;
      const current = view.state.doc.toString();
      if (current === next) return;
      view.dispatch({ changes: minimalChange(current, next), userEvent: 'input.external' });
      this.lastEmitted = next;
    });

    effect(() => {
      const err = this.error();
      const view = this.view;
      if (!view) return;
      untracked(() => this.applyError(view, err));
    });

    effect(() => {
      const wrap = this.wrap();
      this.view?.dispatch({
        effects: wrapCompartment.reconfigure(wrap ? EditorView.lineWrapping : []),
      });
    });

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.flashTimer);
      this.view?.destroy();
    });
  }

  /** Selects the given 1-based line, scrolls it into view and flashes it. */
  revealLine(line: number, focus = true): void {
    const view = this.view;
    if (!view) return;
    const l = view.state.doc.line(Math.min(Math.max(line, 1), view.state.doc.lines));
    view.dispatch({
      selection: EditorSelection.range(l.from + (l.text.length - l.text.trimStart().length), l.to),
      effects: [EditorView.scrollIntoView(l.from, { y: 'center' }), flashEffect.of(null)],
    });
    // Re-add in a separate transaction so the CSS animation restarts.
    setTimeout(() => view.dispatch({ effects: flashEffect.of(line) }), 16);
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => view.dispatch({ effects: flashEffect.of(null) }), 1900);
    if (focus) view.focus();
  }

  focus(): void {
    this.view?.focus();
  }

  undo(): void {
    if (this.view) undo(this.view);
  }

  redo(): void {
    if (this.view) redo(this.view);
  }

  triggerCompletion(): void {
    if (this.view) {
      this.view.focus();
      startCompletion(this.view);
    }
  }

  toggleComment(): void {
    if (this.view) toggleComment(this.view);
  }

  private createView(): void {
    const initial = this.value();
    this.lastEmitted = initial;
    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      indentUnit.of('  '),
      bracketMatching(),
      closeBrackets(),
      autocompletion({
        override: [plantumlCompletions],
        activateOnTyping: true,
        icons: true,
        closeOnBlur: true,
        maxRenderedOptions: 80,
      }),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      lintGutter(),
      plantuml(),
      editorTheme,
      errorField,
      flashField,
      wrapCompartment.of(this.wrap() ? EditorView.lineWrapping : []),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...completionKeymap,
        ...lintKeymap,
        indentWithTab,
      ]),
      EditorView.contentAttributes.of({
        'aria-label': 'PlantUML Quelltext',
        autocapitalize: 'off',
        autocorrect: 'off',
        spellcheck: 'false',
      }),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) {
          const text = u.state.doc.toString();
          this.lastEmitted = text;
          this.value.set(text);
        }
        if (u.focusChanged) this.focused.emit(u.view.hasFocus);
        if (u.selectionSet || u.docChanged) {
          this.cursorLine.emit(u.state.doc.lineAt(u.state.selection.main.head).number);
        }
      }),
    ];
    this.view = new EditorView({
      parent: this.host.nativeElement,
      state: EditorState.create({ doc: initial, extensions }),
    });
    this.applyError(this.view, this.error());
  }

  private applyError(view: EditorView, err: DiagramError | null): void {
    const diagnostics: Diagnostic[] = [];
    if (err && err.line != null) {
      const line = view.state.doc.line(Math.min(Math.max(err.line, 1), view.state.doc.lines));
      diagnostics.push({
        from: line.from + (line.text.length - line.text.trimStart().length),
        to: line.to,
        severity: 'error',
        message: err.message,
        source: 'PlantUML',
      });
    }
    view.dispatch(setDiagnostics(view.state, diagnostics), { effects: setErrorEffect.of(err) });
  }
}

/** Computes a minimal single replacement between two strings (keeps cursor & undo sane). */
function minimalChange(a: string, b: string): { from: number; to: number; insert: string } {
  let start = 0;
  const minLen = Math.min(a.length, b.length);
  while (start < minLen && a.charCodeAt(start) === b.charCodeAt(start)) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a.charCodeAt(endA - 1) === b.charCodeAt(endB - 1)) {
    endA--;
    endB--;
  }
  return { from: start, to: endA, insert: b.slice(start, endB) };
}

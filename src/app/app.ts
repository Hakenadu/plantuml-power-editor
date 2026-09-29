import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { CodeEditorComponent } from './editor/code-editor.component';
import { setCompletionThemes } from './editor/plantuml-completion';
import { DiagramPreviewComponent, PreviewPointerEvent } from './preview/diagram-preview.component';
import {
  StyleChange,
  StyleContext,
  StylePanelComponent,
} from './style-panel/style-panel.component';
import { DiagramAction, DiagramListComponent } from './sidebar/diagram-list.component';
import {
  StorageNoticeDialogComponent,
  StorageNoticeData,
  StorageNoticeResult,
} from './dialogs/storage-notice-dialog.component';
import { RenameDialogComponent } from './dialogs/rename-dialog.component';

import { DiagramError, PlantUmlEngineService } from './core/plantuml-engine.service';
import { DiagramStoreService, StorageFullError, StoredDiagram } from './core/diagram-store.service';
import { ExportService } from './core/export.service';
import { detectDiagramType } from './core/plantuml-analysis';
import { DiagramTarget, TargetKind, resolveTarget } from './core/diagram-targets';
import {
  StyleModel,
  applyLinkStyle,
  applyStyleModel,
  emptyStyleModel,
  ensureElementStereotype,
  findStereotypeLine,
  parseLinkStyle,
  parseStyleModel,
  removeElementStereotype,
  stereotypeFor,
  globalStyleKey,
} from './core/plantuml-styles';
import { DiagramTemplate, TEMPLATE_DEFS } from './core/templates';
import { I18nService } from './i18n/i18n.service';
import { SeoService } from './core/seo.service';
import { LanguagePreference } from './i18n/languages';

type StyleTarget =
  | { mode: 'global' }
  | {
      mode: 'element';
      elementId: string;
      label: string;
      kind: TargetKind;
      line?: number;
      activity: boolean;
    }
  | { mode: 'link'; label: string; line: number };

type Layout = 'tabs' | 'vertical' | 'horizontal';

const RENDER_DEBOUNCE_MS = 140;
const DRAFT_DEBOUNCE_MS = 400;
/** Pause after the last keystroke before an error on the current line is shown. */
const ERROR_IDLE_MS = 1500;
/** Short grace period for errors on other lines (e.g. an unclosed block further down). */
const ERROR_OTHER_LINE_MS = 350;

@Component({
  selector: 'app-root',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    CodeEditorComponent,
    DiagramPreviewComponent,
    StylePanelComponent,
    DiagramListComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onGlobalKey($event)',
    '(window:resize)': 'onResize()',
    '(window:beforeunload)': 'flushDraft()',
    '[class]': '"layout-" + layout()',
    '[style.--split]': 'splitRatio()',
  },
})
export class App {
  protected readonly engine = inject(PlantUmlEngineService);
  protected readonly store = inject(DiagramStoreService);
  private readonly exporter = inject(ExportService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly i18n = inject(I18nService);
  /** Current UI dictionary (signal). */
  protected readonly t = this.i18n.t;
  /** Language-dependent meta tags (instantiated for its side effects). */
  protected readonly seo = inject(SeoService);
  /** Source of the start template while the user has not touched it (search-engine view). */
  private readonly initialSource = signal<string | null>(null);

  private readonly editor = viewChild(CodeEditorComponent);
  private readonly preview = viewChild(DiagramPreviewComponent);
  private readonly ctxTrigger = viewChild<MatMenuTrigger>('ctxTrigger');

  protected readonly templates = computed<DiagramTemplate[]>(() =>
    TEMPLATE_DEFS.map((d) => ({ ...d, ...this.t().templates[d.id] })),
  );

  // ---- Document state ------------------------------------------------------
  protected readonly source = signal('');
  protected readonly name = signal(this.t().app.untitled);
  protected readonly currentId = signal<string | null>(null);
  private readonly savedSource = signal<string | null>(null);
  protected readonly dirty = computed(() => this.source() !== this.savedSource());

  // ---- Render state --------------------------------------------------------
  protected readonly svg = signal<string | null>(null);
  protected readonly error = signal<DiagramError | null>(null);
  /**
   * The error actually shown to the user. Errors on the line being typed are held back until the
   * user pauses or leaves the line, so half-typed statements do not flash red. Fixes show instantly.
   */
  protected readonly shownError = signal<DiagramError | null>(null);
  /** An error exists but is currently held back while the user types. */
  protected readonly errorPending = computed(() => !!this.error() && !this.shownError());
  /** `shownError` with a message in the UI language (for editor and preview). */
  protected readonly displayError = computed<DiagramError | null>(() => {
    const err = this.shownError();
    return err ? { ...err, message: this.i18n.errorMessage(err) } : null;
  });
  protected readonly cursorLine = signal(1);
  protected readonly rendering = signal(false);
  protected readonly lastDuration = signal<number | null>(null);
  protected readonly diagramType = computed(() => detectDiagramType(this.source()));
  protected readonly diagramTypeLabel = computed(() => this.t().diagramTypes[this.diagramType()]);
  private readonly styleModel = computed<StyleModel>(() => parseStyleModel(this.source()));

  // ---- Layout --------------------------------------------------------------
  private readonly viewport = signal({ w: window.innerWidth, h: window.innerHeight });
  protected readonly layout = computed<Layout>(() => {
    const { w, h } = this.viewport();
    if (w < 760) return 'tabs';
    if (w < 1100 && h > w) return 'vertical';
    return 'horizontal';
  });
  protected readonly wideSidebar = computed(() => this.viewport().w >= 1280);
  protected readonly mobilePane = signal<'editor' | 'preview'>('editor');
  protected readonly sidebarOpen = signal(
    this.store.prefs().sidebarOpen && window.innerWidth >= 1280,
  );
  protected readonly splitRatio = signal(this.store.prefs().splitRatio);
  protected readonly wrap = signal(this.store.prefs().wrap);
  protected readonly themePref = signal(this.store.prefs().theme);
  protected readonly dragging = signal(false);

  // ---- Context menu & style panel -----------------------------------------
  protected readonly menuPos = signal({ x: 0, y: 0 });
  protected readonly menuTarget = signal<DiagramTarget | null>(null);
  protected readonly styleTarget = signal<StyleTarget | null>(null);
  protected readonly styleContext = computed<StyleContext | null>(() => this.buildStyleContext());

  // ---- Export options ------------------------------------------------------
  protected readonly pngTransparent = signal(false);

  private renderTimer?: ReturnType<typeof setTimeout>;
  private draftTimer?: ReturnType<typeof setTimeout>;
  private renderingTimer?: ReturnType<typeof setTimeout>;
  private renderSeq = 0;
  private errorTimer?: ReturnType<typeof setTimeout>;
  private lastEditAt = 0;
  private lastSource = '';

  constructor() {
    inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-rounded');
    this.restoreInitialState();
    this.applyTheme();
    this.engine.load().then(
      () => setCompletionThemes(this.engine.themes().map((t) => t.id)),
      () => this.snackBar.open(this.t().snack.engineFailed, this.t().common.ok),
    );

    // Live rendering (debounced, latest wins).
    effect(() => {
      const src = this.source();
      untracked(() => this.scheduleRender(src));
    });

    // Typing-aware error display.
    effect(() => {
      const src = this.source();
      this.error();
      this.cursorLine();
      untracked(() => {
        if (src !== this.lastSource) {
          this.lastEditAt = this.lastSource ? Date.now() : 0;
          this.lastSource = src;
        }
        this.updateShownError();
      });
    });

    // Autosave working draft so nothing is lost on reload.
    effect(() => {
      const draft = {
        id: this.currentId(),
        name: this.name(),
        source: this.source(),
        svg: this.svg() ?? undefined,
        updatedAt: Date.now(),
      };
      clearTimeout(this.draftTimer);
      this.draftTimer = setTimeout(() => this.store.saveDraft(draft), DRAFT_DEBOUNCE_MS);
    });

    effect(() => {
      const n = this.name();
      const untouched = !this.currentId() && this.source() === this.initialSource();
      document.title = untouched
        ? this.t().seo.title
        : `${this.dirty() ? '● ' : ''}${n} | PlantUML Power Editor`;
    });

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.renderTimer);
      clearTimeout(this.draftTimer);
      clearTimeout(this.renderingTimer);
      clearTimeout(this.errorTimer);
    });
  }

  private updateShownError(): void {
    clearTimeout(this.errorTimer);
    const err = this.error();
    const shown = this.shownError();
    if (!err) {
      if (shown) this.shownError.set(null);
      return;
    }
    if (shown && shown.line === err.line && shown.message === err.message) return;
    const idle = Date.now() - this.lastEditAt;
    const onCursorLine = err.line === null || err.line === this.cursorLine();
    const delay = Math.max(0, (onCursorLine ? ERROR_IDLE_MS : ERROR_OTHER_LINE_MS) - idle);
    if (delay === 0) {
      this.shownError.set(err);
      return;
    }
    // Keep an already visible error only if it still points to the same line.
    if (shown && shown.line !== err.line) this.shownError.set(null);
    this.errorTimer = setTimeout(() => this.updateShownError(), delay);
  }

  // ==========================================================================
  // Rendering
  // ==========================================================================

  private scheduleRender(src: string): void {
    clearTimeout(this.renderTimer);
    this.renderTimer = setTimeout(
      () => void this.renderNow(src),
      this.svg() ? RENDER_DEBOUNCE_MS : 0,
    );
  }

  private async renderNow(src: string): Promise<void> {
    const seq = ++this.renderSeq;
    clearTimeout(this.renderingTimer);
    // Only show the progress indicator for slow renders to avoid flicker.
    this.renderingTimer = setTimeout(() => this.rendering.set(true), 180);
    const result = await this.engine.render(src);
    if (seq !== this.renderSeq || !result) return;
    clearTimeout(this.renderingTimer);
    this.rendering.set(false);
    this.lastDuration.set(result.durationMs);
    if (result.ok) {
      this.svg.set(result.svg);
      this.error.set(null);
    } else {
      this.error.set(result.error);
    }
  }

  // ==========================================================================
  // Editor <-> preview interaction
  // ==========================================================================

  protected onPreviewPointer(e: PreviewPointerEvent): void {
    const target = e.background
      ? null
      : resolveTarget(e.svg, e.element, this.source(), this.diagramType());
    // Left click on empty canvas does nothing (it is used for panning).
    if (!target && e.trigger === 'click') {
      this.preview()?.select(null);
      return;
    }
    this.preview()?.select(target?.node ?? null);
    this.menuTarget.set(target);
    this.menuPos.set({ x: e.clientX, y: e.clientY });
    const trigger = this.ctxTrigger();
    if (!trigger) return;
    trigger.closeMenu();
    // Let the anchor move before opening.
    setTimeout(() => trigger.openMenu(), 16);
  }

  protected jumpToLine(line: number | undefined): void {
    if (!line) return;
    if (this.layout() === 'tabs') this.mobilePane.set('editor');
    // Wait a frame so the editor is visible (mobile tab switch) before scrolling.
    setTimeout(() => this.editor()?.revealLine(line, this.layout() !== 'tabs'), 16);
  }

  protected jumpToError(): void {
    const line = this.shownError()?.line ?? this.error()?.line ?? undefined;
    this.jumpToLine(line);
    // Coming from the preview banner: open the detail box right away.
    if (line) setTimeout(() => this.editor()?.setErrorExpanded(true), 32);
  }

  protected canStyle(t: DiagramTarget | null): boolean {
    if (!t) return false;
    if (t.kind === 'link' || t.kind === 'message') return !!t.line;
    if (t.kind === 'activity') return !!t.line;
    return t.kind === 'element' && !!t.elementId;
  }

  protected openStyleFor(t: DiagramTarget | null): void {
    if (!t) return this.openGlobalStyle();
    if ((t.kind === 'link' || t.kind === 'message') && t.line) {
      this.styleTarget.set({ mode: 'link', label: t.label, line: t.line });
    } else if (t.elementId) {
      this.styleTarget.set({
        mode: 'element',
        elementId: t.elementId,
        label: t.label,
        kind: t.kind,
        line: t.line,
        activity: t.kind === 'activity',
      });
    }
    if (this.layout() === 'tabs') this.mobilePane.set('preview');
  }

  protected openGlobalStyle(): void {
    this.styleTarget.set({ mode: 'global' });
    if (this.layout() === 'tabs') this.mobilePane.set('preview');
  }

  protected closeStyle(): void {
    this.styleTarget.set(null);
    this.preview()?.select(null);
  }

  private buildStyleContext(): StyleContext | null {
    const t = this.styleTarget();
    if (!t) return null;
    const model = this.styleModel();
    if (t.mode === 'global') {
      const current = globalStyleKey(model);
      const custom = this.store.customThemes();
      return {
        mode: 'global',
        model,
        themes: this.engine.themes(),
        customThemes: custom,
        activeCustomTheme:
          custom.find((ct) => globalStyleKey({ ...ct, theme: ct.base }) === current)?.id ?? null,
      };
    }
    const lines = this.source().split(/\r\n|\r|\n/);
    if (t.mode === 'link') {
      return {
        mode: 'link',
        label: t.label,
        line: t.line,
        style: parseLinkStyle(lines[t.line - 1] ?? ''),
        sequence: this.diagramType() === 'sequence',
      };
    }
    const stereotype = stereotypeFor(t.elementId);
    const markerLine = findStereotypeLine(this.source(), stereotype);
    return {
      mode: 'element',
      label: t.label,
      kindLabel: this.t().targetKinds[t.kind],
      line: markerLine ?? t.line,
      props: model.elements[stereotype] ?? {},
    };
  }

  protected onStyleChange(change: StyleChange): void {
    const t = this.styleTarget();
    if (!t) return;
    let src = this.source();

    switch (change.type) {
      case 'element':
      case 'element-reset': {
        if (t.mode !== 'element') return;
        const stereotype = stereotypeFor(t.elementId);
        if (change.type === 'element' && change.value !== undefined) {
          const res = ensureElementStereotype(src, this.diagramType(), {
            id: t.elementId,
            label: t.label,
            line: t.line,
            activity: t.activity,
          });
          if (!res) {
            this.snackBar.open(this.t().snack.elementNotFound, this.t().common.ok, {
              duration: 4000,
            });
            return;
          }
          src = res.source;
        }
        const model = parseStyleModel(src);
        const props = { ...(model.elements[stereotype] ?? {}) };
        if (change.type === 'element-reset') {
          for (const k of Object.keys(props)) delete props[k as keyof typeof props];
        } else if (change.value === undefined) {
          delete props[change.key];
        } else {
          (props as Record<string, unknown>)[change.key] = change.value;
        }
        if (Object.keys(props).length) {
          model.elements[stereotype] = props;
        } else {
          delete model.elements[stereotype];
          src = removeElementStereotype(src, stereotype);
        }
        src = applyStyleModel(src, model);
        break;
      }
      case 'link': {
        if (t.mode !== 'link') return;
        const eol = src.includes('\r\n') ? '\r\n' : '\n';
        const lines = src.split(/\r\n|\r|\n/);
        const idx = t.line - 1;
        if (!lines[idx]) return;
        lines[idx] = applyLinkStyle(lines[idx], change.style, this.diagramType() === 'sequence');
        src = lines.join(eol);
        break;
      }
      case 'global': {
        const model = parseStyleModel(src);
        const props = { ...(model.global[change.selector] ?? {}) };
        if (change.value === undefined) delete props[change.key];
        else (props as Record<string, unknown>)[change.key] = change.value;
        model.global[change.selector] = props;
        src = applyStyleModel(src, model);
        break;
      }
      case 'theme': {
        const model = parseStyleModel(src);
        model.theme = change.theme;
        src = applyStyleModel(src, model);
        break;
      }
      case 'custom-theme': {
        const theme = this.store.customThemes().find((ct) => ct.id === change.id);
        if (!theme) return;
        const model = parseStyleModel(src);
        model.theme = theme.base;
        model.handwritten = theme.handwritten;
        model.global = structuredClone(theme.global);
        src = applyStyleModel(src, model);
        break;
      }
      case 'save-theme':
        this.saveCustomTheme();
        return;
      case 'delete-theme':
        this.deleteCustomTheme(change.id);
        return;
      case 'handwritten': {
        const model = parseStyleModel(src);
        model.handwritten = change.value;
        src = applyStyleModel(src, model);
        break;
      }
      case 'global-reset': {
        const model = parseStyleModel(src);
        const next = emptyStyleModel();
        next.elements = model.elements;
        src = applyStyleModel(src, next);
        break;
      }
    }
    if (src !== this.source()) this.source.set(src);
  }

  /** Stores the current diagram-wide styles as a named custom theme. */
  private saveCustomTheme(): void {
    const tr = this.t().stylePanel;
    this.dialog
      .open(RenameDialogComponent, {
        data: { name: tr.defaultThemeName, title: tr.saveThemeTitle, confirm: this.t().app.save },
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .subscribe((name?: string) => {
        if (!name) return;
        const model = this.styleModel();
        try {
          const theme = this.store.saveTheme({
            name,
            base: model.theme,
            handwritten: model.handwritten,
            global: structuredClone(model.global),
          });
          this.snackBar.open(this.t().snack.themeSaved(theme.name), undefined, { duration: 3000 });
        } catch {
          this.snackBar.open(
            this.t().snack.saveFailed(this.t().snack.storageFull),
            this.t().common.ok,
            { duration: 6000 },
          );
        }
      });
  }

  private deleteCustomTheme(id: string): void {
    const removed = this.store.removeTheme(id);
    if (!removed) return;
    this.snackBar
      .open(this.t().snack.themeDeleted(removed.name), this.t().snack.undoAction, {
        duration: 6000,
      })
      .onAction()
      .subscribe(() => this.store.restoreTheme(removed));
  }

  // ==========================================================================
  // Persistence
  // ==========================================================================

  private restoreInitialState(): void {
    const draft = this.store.loadDraft();
    if (draft && draft.source.trim()) {
      this.source.set(draft.source);
      if (draft.svg) this.svg.set(draft.svg);
      this.name.set(draft.name || this.t().app.untitled);
      const stored = draft.id ? this.store.get(draft.id) : undefined;
      this.currentId.set(stored ? stored.id : null);
      this.savedSource.set(stored ? stored.source : null);
    } else {
      this.loadTemplate(this.templates()[0], false);
      this.initialSource.set(this.source());
    }
  }

  protected flushDraft(): void {
    clearTimeout(this.draftTimer);
    this.store.saveDraft({
      id: this.currentId(),
      name: this.name(),
      source: this.source(),
      svg: this.svg() ?? undefined,
      updatedAt: Date.now(),
    });
  }

  protected async save(asNew = false): Promise<void> {
    const prefs = this.store.prefs();
    const isNew = asNew || !this.currentId();
    let name = this.name();
    if (isNew || !prefs.storageNoticeAcknowledged) {
      const ref = this.dialog.open<
        StorageNoticeDialogComponent,
        StorageNoticeData,
        StorageNoticeResult
      >(StorageNoticeDialogComponent, {
        data: {
          name: asNew ? this.t().app.copyName(name) : name,
          showNotice: !prefs.storageNoticeAcknowledged,
        },
        width: '520px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'first-tabbable',
      });
      const result = await new Promise<StorageNoticeResult | undefined>((r) =>
        ref.afterClosed().subscribe(r),
      );
      if (!result) return;
      name = result.name;
      if (result.dontShowAgain) this.store.updatePrefs({ storageNoticeAcknowledged: true });
    }
    try {
      const saved = this.store.save({
        id: isNew ? null : this.currentId(),
        name,
        source: this.source(),
        thumbnail: this.svg() ?? undefined,
      });
      this.currentId.set(saved.id);
      this.name.set(saved.name);
      this.savedSource.set(saved.source);
      this.flushDraft();
      this.snackBar
        .open(this.t().snack.saved(saved.name), this.t().snack.historyAction, { duration: 3500 })
        .onAction()
        .subscribe(() => this.sidebarOpen.set(true));
    } catch (err) {
      const reason = err instanceof StorageFullError ? this.t().snack.storageFull : String(err);
      this.snackBar.open(this.t().snack.saveFailed(reason), this.t().common.ok, {
        duration: 6000,
      });
    }
  }

  protected onDiagramAction({ action, diagram }: DiagramAction): void {
    switch (action) {
      case 'open':
        this.openDiagram(diagram);
        break;
      case 'rename':
        this.dialog
          .open(RenameDialogComponent, {
            data: diagram.name,
            width: '420px',
            maxWidth: 'calc(100vw - 32px)',
          })
          .afterClosed()
          .subscribe((name?: string) => {
            if (!name) return;
            this.store.rename(diagram.id, name);
            if (this.currentId() === diagram.id) this.name.set(name);
          });
        break;
      case 'duplicate': {
        const copy = this.store.duplicate(diagram.id, this.t().app.copyName);
        if (copy)
          this.snackBar.open(this.t().snack.created(copy.name), undefined, { duration: 2500 });
        break;
      }
      case 'export':
        this.exporter.downloadText(diagram.source, diagram.name);
        break;
      case 'delete': {
        const removed = this.store.remove(diagram.id);
        if (!removed) return;
        if (this.currentId() === diagram.id) {
          this.currentId.set(null);
          this.savedSource.set(null);
        }
        this.snackBar
          .open(this.t().snack.deleted(removed.name), this.t().snack.undoAction, { duration: 6000 })
          .onAction()
          .subscribe(() => {
            this.store.restore(removed);
            if (this.source() === removed.source) {
              this.currentId.set(removed.id);
              this.savedSource.set(removed.source);
            }
          });
        break;
      }
    }
  }

  private openDiagram(d: StoredDiagram): void {
    if (d.id === this.currentId() && !this.dirty()) {
      if (!this.wideSidebar()) this.sidebarOpen.set(false);
      return;
    }
    this.replaceDocument({ id: d.id, name: d.name, source: d.source, saved: d.source });
    if (!this.wideSidebar()) this.sidebarOpen.set(false);
  }

  protected loadTemplate(t: DiagramTemplate, undoable = true): void {
    this.replaceDocument({ id: null, name: t.name, source: t.source, saved: null }, undoable);
    if (!this.wideSidebar()) this.sidebarOpen.set(false);
  }

  private replaceDocument(
    next: { id: string | null; name: string; source: string; saved: string | null },
    undoable = true,
  ): void {
    const prev = {
      id: this.currentId(),
      name: this.name(),
      source: this.source(),
      saved: this.savedSource(),
    };
    const wasDirty = this.dirty() && prev.source.trim().length > 0;
    this.styleTarget.set(null);
    this.svg.set(null);
    this.error.set(null);
    this.preview()?.resetFit();
    this.currentId.set(next.id);
    this.name.set(next.name);
    this.source.set(next.source);
    this.savedSource.set(next.saved);
    if (undoable && wasDirty) {
      this.snackBar
        .open(this.t().snack.replaced, this.t().snack.restoreAction, { duration: 7000 })
        .onAction()
        .subscribe(() => this.replaceDocument(prev, false));
    }
  }

  protected rename(): void {
    this.dialog
      .open(RenameDialogComponent, {
        data: this.name(),
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .subscribe((name?: string) => {
        if (!name) return;
        this.name.set(name);
        const id = this.currentId();
        if (id) this.store.rename(id, name);
      });
  }

  // ==========================================================================
  // Export
  // ==========================================================================

  protected async exportPng(scale: number): Promise<void> {
    const svg = this.svg();
    if (!svg) return;
    try {
      await this.exporter.downloadPng(svg, this.name(), {
        scale,
        background: this.pngTransparent() ? null : '#FFFFFF',
      });
    } catch (err) {
      this.snackBar.open(this.t().snack.pngFailed((err as Error).message), this.t().common.ok, {
        duration: 5000,
      });
    }
  }

  protected exportSvg(): void {
    const svg = this.svg();
    if (svg) this.exporter.downloadSvg(svg, this.name());
  }

  protected exportSource(): void {
    this.exporter.downloadText(this.source(), this.name());
  }

  protected async copyPng(): Promise<void> {
    const svg = this.svg();
    if (!svg) return;
    try {
      await this.exporter.copyPng(svg, {
        scale: 2,
        background: this.pngTransparent() ? null : '#FFFFFF',
      });
      this.snackBar.open(this.t().snack.pngCopied, undefined, { duration: 2500 });
    } catch {
      this.snackBar.open(this.t().snack.copyUnsupported, this.t().common.ok, { duration: 4000 });
    }
  }

  protected async copySvg(): Promise<void> {
    const svg = this.svg();
    if (!svg) return;
    try {
      await this.exporter.copySvg(svg);
      this.snackBar.open(this.t().snack.svgCopied, undefined, { duration: 2500 });
    } catch {
      this.snackBar.open(this.t().snack.copyFailed, this.t().common.ok, { duration: 4000 });
    }
  }

  // ==========================================================================
  // Layout, theme & shortcuts
  // ==========================================================================

  protected onResize(): void {
    this.viewport.set({ w: window.innerWidth, h: window.innerHeight });
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
    if (this.wideSidebar()) this.store.updatePrefs({ sidebarOpen: this.sidebarOpen() });
  }

  protected cycleTheme(): void {
    const order = ['system', 'light', 'dark'] as const;
    const next = order[(order.indexOf(this.themePref()) + 1) % order.length];
    this.themePref.set(next);
    this.store.updatePrefs({ theme: next });
    this.applyTheme();
  }

  protected themeIcon = computed(
    () => ({ system: 'brightness_auto', light: 'light_mode', dark: 'dark_mode' })[this.themePref()],
  );
  protected themeLabel = computed(() => this.t().app.colorSchemes[this.themePref()]);

  protected setLanguage(pref: LanguagePreference): void {
    void this.i18n.setPreference(pref);
  }

  private applyTheme(): void {
    const root = document.documentElement;
    const pref = this.themePref();
    const dark =
      pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', dark);
    root.classList.toggle('light', !dark);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#16151c' : '#fdf8fd');
    if (pref === 'system') {
      matchMedia('(prefers-color-scheme: dark)').onchange = () =>
        this.themePref() === 'system' && this.applyTheme();
    }
  }

  protected toggleWrap(): void {
    this.wrap.update((v) => !v);
    this.store.updatePrefs({ wrap: this.wrap() });
  }

  protected onGlobalKey(e: KeyboardEvent): void {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      void this.save(e.shiftKey);
    } else if (mod && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      this.toggleSidebar();
    } else if (mod && e.shiftKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      void this.exportPng(2);
    } else if (e.key === 'Escape' && this.styleTarget()) {
      this.closeStyle();
    }
  }

  // Split-pane resizing ------------------------------------------------------
  protected startResize(e: PointerEvent): void {
    e.preventDefault();
    const handle = e.currentTarget as HTMLElement;
    const container = handle.parentElement!;
    handle.setPointerCapture(e.pointerId);
    this.dragging.set(true);
    const vertical = this.layout() === 'vertical';
    const move = (ev: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const ratio = vertical
        ? (ev.clientY - rect.top) / rect.height
        : (ev.clientX - rect.left) / rect.width;
      this.splitRatio.set(Math.min(0.8, Math.max(0.18, ratio)));
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      this.dragging.set(false);
      this.store.updatePrefs({ splitRatio: this.splitRatio() });
      this.preview()?.fit();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  protected resetSplit(): void {
    this.splitRatio.set(0.42);
    this.store.updatePrefs({ splitRatio: 0.42 });
    setTimeout(() => this.preview()?.fit(), 16);
  }

  protected nudgeSplit(e: KeyboardEvent): void {
    const vertical = this.layout() === 'vertical';
    const dec = vertical ? 'ArrowUp' : 'ArrowLeft';
    const inc = vertical ? 'ArrowDown' : 'ArrowRight';
    if (e.key !== dec && e.key !== inc) return;
    e.preventDefault();
    this.splitRatio.update((r) =>
      Math.min(0.8, Math.max(0.18, r + (e.key === inc ? 0.02 : -0.02))),
    );
    this.store.updatePrefs({ splitRatio: this.splitRatio() });
  }
}

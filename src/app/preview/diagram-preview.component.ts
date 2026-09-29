import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DiagramError, EngineState } from '../core/plantuml-engine.service';
import { I18nService } from '../i18n/i18n.service';

export interface PreviewPointerEvent {
  element: Element;
  svg: SVGSVGElement;
  clientX: number;
  clientY: number;
  /** true if the pointer hit the empty diagram area / canvas instead of a drawn element. */
  background: boolean;
  trigger: 'click' | 'context';
}

interface View {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
const PAPER_PADDING = 24;

@Component({
  selector: 'pe-diagram-preview',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, MatProgressBarModule, DecimalPipe],
  templateUrl: './diagram-preview.component.html',
  styleUrl: './diagram-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.stale]': 'stale()',
    '[class.panning]': 'panning()',
  },
})
export class DiagramPreviewComponent {
  readonly svg = input<string | null>(null);
  readonly error = input<DiagramError | null>(null);
  readonly rendering = input(false);
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  readonly engineState = input<EngineState>('idle');
  readonly lastDuration = input<number | null>(null);

  readonly pointer = output<PreviewPointerEvent>();
  readonly jumpToError = output<void>();

  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  readonly view = signal<View>({ x: 0, y: 0, scale: 1 });
  readonly panning = signal(false);
  readonly stale = computed(() => !!this.error() && !!this.svg());
  readonly transform = computed(() => {
    const v = this.view();
    return `translate(${v.x}px, ${v.y}px) scale(${v.scale})`;
  });

  private readonly sanitizedSvg = computed(() => sanitizeSvg(this.svg()));
  private hasFitted = false;
  /** Set once the user pans/zooms manually; until then the diagram is kept fitted. */
  private userAdjusted = false;
  private lastSize = { width: 0, height: 0 };
  private pointers = new Map<number, { x: number; y: number }>();
  private gesture: {
    startX: number;
    startY: number;
    startView: View;
    moved: boolean;
    pinchDist?: number;
    pinchCenter?: { x: number; y: number };
    target: Element | null;
    button: number;
  } | null = null;
  private longPressTimer?: ReturnType<typeof setTimeout>;
  private selected: Element | null = null;

  constructor() {
    // Write the SVG into the stage without Angular's sanitizer re-parsing on every CD.
    afterRenderEffect(() => {
      const markup = this.sanitizedSvg();
      const stage = this.stage().nativeElement;
      if (markup === null) {
        stage.replaceChildren();
        return;
      }
      stage.innerHTML = markup;
      this.selected = null;
      const svgEl = stage.querySelector('svg');
      if (!svgEl) return;
      const size = svgSize(svgEl);
      svgEl.setAttribute('width', String(size.width));
      svgEl.setAttribute('height', String(size.height));
      svgEl.style.display = 'block';
      const sizeChanged =
        Math.abs(size.width - this.lastSize.width) > 0.5 ||
        Math.abs(size.height - this.lastSize.height) > 0.5;
      this.lastSize = size;
      if (!this.hasFitted) {
        this.hasFitted = true;
        this.fit();
      } else if (sizeChanged) {
        if (this.userAdjusted) this.keepInView();
        else this.fit();
      }
    });

    const ro = new ResizeObserver(() => {
      if (!this.hasFitted) return;
      if (this.userAdjusted) this.keepInView();
      else this.fit();
    });
    afterRenderEffect(() => ro.observe(this.viewport().nativeElement));
    inject(DestroyRef).onDestroy(() => {
      ro.disconnect();
      clearTimeout(this.longPressTimer);
    });
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  fit(): void {
    const vp = this.viewport().nativeElement.getBoundingClientRect();
    const { width, height } = this.lastSize;
    if (!width || !height || !vp.width || !vp.height) return;
    const w = width + PAPER_PADDING * 2;
    const h = height + PAPER_PADDING * 2;
    const margin = vp.width < 600 ? 16 : 40;
    const scale = clamp(
      Math.min((vp.width - margin * 2) / w, (vp.height - margin * 2) / h, 2),
      MIN_SCALE,
      MAX_SCALE,
    );
    this.view.set({ scale, x: (vp.width - w * scale) / 2, y: (vp.height - h * scale) / 2 });
    this.userAdjusted = false;
  }

  actualSize(): void {
    this.zoomAt(1 / this.view().scale);
  }

  zoomBy(factor: number): void {
    this.zoomAt(factor);
  }

  resetFit(): void {
    this.hasFitted = false;
    this.userAdjusted = false;
  }

  /** Visually marks the given node (or clears the selection). */
  select(node: Element | null | undefined): void {
    this.selected?.classList.remove('pe-selected');
    this.selected = node ?? null;
    this.selected?.classList.add('pe-selected');
  }

  // -------------------------------------------------------------------------
  // Pointer handling: pan, pinch-zoom, click & long-press detection
  // -------------------------------------------------------------------------

  onPointerDown(e: PointerEvent): void {
    if ((e.target as Element).closest('.overlay-ui')) return;
    if (e.button === 0) this.viewport().nativeElement.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      this.gesture = {
        startX: e.clientX,
        startY: e.clientY,
        startView: this.view(),
        moved: false,
        target: e.target as Element,
        button: e.button,
      };
      if (e.pointerType === 'touch') {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = setTimeout(() => {
          if (this.gesture && !this.gesture.moved) {
            this.emitPointer(this.gesture.target, e.clientX, e.clientY, 'context');
            this.gesture = null;
          }
        }, 520);
      }
    } else if (this.pointers.size === 2) {
      clearTimeout(this.longPressTimer);
      const [a, b] = [...this.pointers.values()];
      this.gesture = {
        startX: 0,
        startY: 0,
        startView: this.view(),
        moved: true,
        pinchDist: Math.hypot(a.x - b.x, a.y - b.y),
        pinchCenter: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        target: null,
        button: 0,
      };
    }
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.pointers.has(e.pointerId) || !this.gesture) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = this.gesture;
    if (g.pinchDist && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const rect = this.viewport().nativeElement.getBoundingClientRect();
      this.userAdjusted = true;
      const s0 = g.startView.scale;
      const scale = clamp(s0 * (dist / g.pinchDist), MIN_SCALE, MAX_SCALE);
      const cx0 = g.pinchCenter!.x - rect.left;
      const cy0 = g.pinchCenter!.y - rect.top;
      const px = (cx0 - g.startView.x) / s0;
      const py = (cy0 - g.startView.y) / s0;
      this.view.set({
        scale,
        x: center.x - rect.left - px * scale,
        y: center.y - rect.top - py * scale,
      });
      return;
    }
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.moved && Math.hypot(dx, dy) > (e.pointerType === 'touch' ? 8 : 4)) {
      g.moved = true;
      clearTimeout(this.longPressTimer);
      this.panning.set(true);
      this.userAdjusted = true;
    }
    if (g.moved) this.view.set({ ...g.startView, x: g.startView.x + dx, y: g.startView.y + dy });
  }

  onPointerUp(e: PointerEvent): void {
    clearTimeout(this.longPressTimer);
    const g = this.gesture;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size > 0) {
      // Pinch ended with one finger remaining: continue as pan from here.
      const [p] = [...this.pointers.values()];
      this.gesture = {
        startX: p.x,
        startY: p.y,
        startView: this.view(),
        moved: true,
        target: null,
        button: 0,
      };
      return;
    }
    this.gesture = null;
    this.panning.set(false);
    if (g && !g.moved && g.button === 0 && e.type === 'pointerup') {
      this.emitPointer(g.target, e.clientX, e.clientY, 'click');
    }
  }

  onContextMenu(e: MouseEvent): void {
    if ((e.target as Element).closest('.overlay-ui')) return;
    e.preventDefault();
    // Touch long-press is handled by our own timer.
    if ((e as PointerEvent).pointerType === 'touch') return;
    this.emitPointer(e.target as Element, e.clientX, e.clientY, 'context');
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.userAdjusted = true;
    if (e.ctrlKey || e.metaKey) {
      const rect = this.viewport().nativeElement.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0022));
      this.zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top);
    } else {
      const k = e.deltaMode === 1 ? 16 : 1;
      const v = this.view();
      this.view.set({ ...v, x: v.x - e.deltaX * k, y: v.y - e.deltaY * k });
    }
  }

  onDoubleClick(e: MouseEvent): void {
    const target = e.target as Element;
    if (target.closest('.overlay-ui')) return;
    if (!this.stage().nativeElement.contains(target) || target.tagName === 'svg') this.fit();
  }

  onKey(e: KeyboardEvent): void {
    if (e.key === '+' || e.key === '=') this.zoomBy(1.2);
    else if (e.key === '-') this.zoomBy(1 / 1.2);
    else if (e.key === '0') this.fit();
    else if (e.key === '1') this.actualSize();
    else return;
    e.preventDefault();
  }

  private emitPointer(
    target: Element | null,
    clientX: number,
    clientY: number,
    trigger: 'click' | 'context',
  ): void {
    const svg = this.stage().nativeElement.querySelector('svg');
    if (!svg || !target) return;
    const inSvg = svg.contains(target);
    const background =
      !inSvg ||
      target === svg ||
      (target.tagName === 'g' && target.parentNode === svg) ||
      isBackgroundRect(svg, target);
    this.pointer.emit({ element: target, svg, clientX, clientY, background, trigger });
  }

  private zoomAt(factor: number, cx?: number, cy?: number): void {
    this.userAdjusted = true;
    const vp = this.viewport().nativeElement.getBoundingClientRect();
    const v = this.view();
    const scale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
    const x0 = cx ?? vp.width / 2;
    const y0 = cy ?? vp.height / 2;
    const px = (x0 - v.x) / v.scale;
    const py = (y0 - v.y) / v.scale;
    this.view.set({ scale, x: x0 - px * scale, y: y0 - py * scale });
  }

  /** Makes sure at least part of the diagram stays visible after resizes. */
  private keepInView(): void {
    const vp = this.viewport().nativeElement.getBoundingClientRect();
    const v = this.view();
    const w = (this.lastSize.width + PAPER_PADDING * 2) * v.scale;
    const h = (this.lastSize.height + PAPER_PADDING * 2) * v.scale;
    const minVisible = 80;
    const x = clamp(v.x, minVisible - w, vp.width - minVisible);
    const y = clamp(v.y, minVisible - h, vp.height - minVisible);
    if (x !== v.x || y !== v.y) this.view.set({ ...v, x, y });
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function svgSize(svg: SVGSVGElement): { width: number; height: number } {
  const vb = svg.viewBox?.baseVal;
  const width = parseFloat(svg.getAttribute('width') ?? '') || vb?.width || 400;
  const height = parseFloat(svg.getAttribute('height') ?? '') || vb?.height || 300;
  return { width, height };
}

/** A full-size background rect (e.g. document BackGroundColor) counts as background. */
function isBackgroundRect(svg: SVGSVGElement, el: Element): boolean {
  if (el.tagName !== 'rect') return false;
  const { width, height } = svgSize(svg);
  const w = parseFloat(el.getAttribute('width') ?? '0');
  const h = parseFloat(el.getAttribute('height') ?? '0');
  return w >= width * 0.98 && h >= height * 0.98;
}

/** Strips scripts and inline event handlers from engine output before inserting it. */
function sanitizeSvg(svg: string | null): string | null {
  if (!svg) return null;
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return svg.replace(/<script[\s\S]*?<\/script>/gi, '');
  doc.querySelectorAll('script, foreignObject iframe').forEach((n) => n.remove());
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      if ((name === 'href' || name === 'xlink:href') && /^\s*javascript:/i.test(attr.value))
        el.removeAttribute(attr.name);
    }
  });
  return new XMLSerializer().serializeToString(doc.documentElement);
}

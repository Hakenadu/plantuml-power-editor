import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StoredDiagram } from '../core/diagram-store.service';
import { detectDiagramType, DIAGRAM_TYPE_LABELS } from '../core/plantuml-analysis';

export interface DiagramAction {
  action: 'open' | 'rename' | 'duplicate' | 'delete' | 'export';
  diagram: StoredDiagram;
}

@Component({
  selector: 'pe-diagram-list',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <div class="brand">
        <img src="favicon.svg" alt="" width="28" height="28" />
        <div>
          <strong>Meine Diagramme</strong>
          <span>{{ diagrams().length }} gespeichert · Local Storage</span>
        </div>
      </div>
      <button
        mat-icon-button
        (click)="closed.emit()"
        matTooltip="Seitenleiste schließen"
        aria-label="Seitenleiste schließen"
      >
        <mat-icon>left_panel_close</mat-icon>
      </button>
    </div>

    <div class="actions">
      <button mat-flat-button class="new" (click)="create.emit()">
        <mat-icon>add</mat-icon>
        Neues Diagramm
      </button>
    </div>

    @if (diagrams().length > 3) {
      <label class="search">
        <mat-icon>search</mat-icon>
        <input
          placeholder="Suchen …"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
          aria-label="Diagramme durchsuchen"
        />
      </label>
    }

    <div class="list" role="list">
      @for (d of filtered(); track d.id) {
        <div
          class="item"
          role="listitem"
          tabindex="0"
          [class.active]="d.id === activeId()"
          (click)="action.emit({ action: 'open', diagram: d })"
          (keydown.enter)="action.emit({ action: 'open', diagram: d })"
        >
          <div class="thumb">
            @if (thumb(d); as url) {
              <img [src]="url" alt="" loading="lazy" />
            } @else {
              <mat-icon>schema</mat-icon>
            }
          </div>
          <div class="meta">
            <span class="name" [title]="d.name">{{ d.name }}</span>
            <span class="sub">{{ typeLabel(d) }} · {{ relative(d.updatedAt) }}</span>
          </div>
          <button
            mat-icon-button
            class="more"
            [matMenuTriggerFor]="menu"
            (click)="$event.stopPropagation()"
            aria-label="Aktionen"
          >
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #menu="matMenu" xPosition="before">
            <button mat-menu-item (click)="action.emit({ action: 'rename', diagram: d })">
              <mat-icon>edit</mat-icon>Umbenennen
            </button>
            <button mat-menu-item (click)="action.emit({ action: 'duplicate', diagram: d })">
              <mat-icon>content_copy</mat-icon>Duplizieren
            </button>
            <button mat-menu-item (click)="action.emit({ action: 'export', diagram: d })">
              <mat-icon>download</mat-icon>Als .puml herunterladen
            </button>
            <button
              mat-menu-item
              class="danger"
              (click)="action.emit({ action: 'delete', diagram: d })"
            >
              <mat-icon>delete</mat-icon>Löschen
            </button>
          </mat-menu>
        </div>
      } @empty {
        <div class="empty">
          <mat-icon>inventory_2</mat-icon>
          @if (query()) {
            <p>Keine Treffer für „{{ query() }}“.</p>
          } @else {
            <p>Noch keine Diagramme gespeichert.</p>
            <p class="hint">
              Mit <kbd>Strg</kbd> + <kbd>S</kbd> speicherst du das aktuelle Diagramm im Local
              Storage dieses Browsers.
            </p>
          }
        </div>
      }
    </div>

    <div class="foot">
      <mat-icon>info</mat-icon>
      <span
        >Daten liegen nur lokal in diesem Browser ({{ usageKb() | number: '1.0-0' }} KB
        belegt).</span
      >
    </div>
  `,
  styleUrl: './diagram-list.component.scss',
})
export class DiagramListComponent {
  readonly diagrams = input.required<StoredDiagram[]>();
  readonly activeId = input<string | null>(null);
  readonly usageKb = input(0);
  readonly action = output<DiagramAction>();
  readonly create = output<void>();
  readonly closed = output<void>();

  readonly query = signal('');
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.diagrams();
    return q
      ? all.filter((d) => d.name.toLowerCase().includes(q) || d.source.toLowerCase().includes(q))
      : all;
  });

  private readonly sanitizer = inject(DomSanitizer);
  private readonly thumbCache = new Map<string, { svg: string; url: SafeUrl }>();

  thumb(d: StoredDiagram): SafeUrl | null {
    if (!d.thumbnail) return null;
    const cached = this.thumbCache.get(d.id);
    if (cached && cached.svg === d.thumbnail) return cached.url;
    const url = this.sanitizer.bypassSecurityTrustUrl(
      'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(d.thumbnail),
    );
    this.thumbCache.set(d.id, { svg: d.thumbnail, url });
    return url;
  }

  typeLabel(d: StoredDiagram): string {
    return DIAGRAM_TYPE_LABELS[detectDiagramType(d.source)];
  }

  relative(ts: number): string {
    const diff = (Date.now() - ts) / 1000;
    const rtf = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });
    if (diff < 60) return 'gerade eben';
    if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
    if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
    if (diff < 86400 * 7) return rtf.format(-Math.round(diff / 86400), 'day');
    return new Date(ts).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}

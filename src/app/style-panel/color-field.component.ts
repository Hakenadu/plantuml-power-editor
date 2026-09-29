import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { toHexColor } from '../core/plantuml-colors';
import { I18nService } from '../i18n/i18n.service';

const QUICK = [
  '#FFFFFF',
  '#F1F1F1',
  '#FEFECE',
  '#E2E2F0',
  '#DDEBFF',
  '#DFF5E1',
  '#FFE4E1',
  '#FFE8C2',
  '#EDE4FF',
  '#181818',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
];

/** Compact color picker: swatch (native picker), hex text, quick palette and reset. */
@Component({
  selector: 'pe-color-field',
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <span class="label">{{ label() }}</span>
      @if (value()) {
        <button
          mat-icon-button
          class="reset"
          (click)="valueChange.emit(undefined)"
          [matTooltip]="t().common.reset"
          [attr.aria-label]="t().common.reset"
        >
          <mat-icon>restart_alt</mat-icon>
        </button>
      }
    </div>
    <div class="row">
      <label
        class="swatch"
        [class.empty]="!hex()"
        [style.--c]="hex() ?? 'transparent'"
        [matTooltip]="t().colorField.pick"
      >
        <input
          type="color"
          [value]="hex() ?? '#ffffff'"
          (input)="onPick($event)"
          [attr.aria-label]="label()"
        />
      </label>
      <input
        class="text"
        [value]="value() ?? ''"
        [placeholder]="t().common.standard"
        spellcheck="false"
        (change)="onText($event)"
        (keydown.enter)="onText($event)"
        [attr.aria-label]="t().colorField.textAria(label())"
      />
    </div>
    <div class="quick">
      @for (c of quick; track c) {
        <button
          class="chip"
          [style.--c]="c"
          [class.active]="hex() === c"
          (click)="valueChange.emit(c)"
          [attr.aria-label]="c"
        ></button>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 28px;
    }
    .label {
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);
    }
    .reset {
      --mat-icon-button-state-layer-size: 28px;
      width: 28px;
      height: 28px;
      padding: 2px;
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }
    .row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .swatch {
      position: relative;
      flex: none;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--c);
      border: 1px solid var(--mat-sys-outline-variant);
      cursor: pointer;
      overflow: hidden;
      box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--mat-sys-surface) 40%, transparent);
      &.empty {
        background: repeating-conic-gradient(#8883 0 25%, transparent 0 50%) 50% / 12px 12px;
      }
      input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
        width: 100%;
        height: 100%;
      }
    }
    .text {
      flex: 1;
      min-width: 0;
      height: 40px;
      box-sizing: border-box;
      border-radius: 12px;
      border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container-lowest);
      color: var(--mat-sys-on-surface);
      padding: 0 12px;
      font-family: var(--pe-mono);
      font-size: 13px;
      outline: none;
      &:focus {
        border-color: var(--mat-sys-primary);
        box-shadow: 0 0 0 1px var(--mat-sys-primary);
      }
    }
    .quick {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1px solid color-mix(in srgb, var(--mat-sys-on-surface) 20%, transparent);
      background: var(--c);
      cursor: pointer;
      padding: 0;
      transition: transform 0.12s ease;
      &:hover {
        transform: scale(1.18);
      }
      &.active {
        outline: 2px solid var(--mat-sys-primary);
        outline-offset: 2px;
      }
    }
  `,
})
export class ColorFieldComponent {
  readonly label = input.required<string>();
  readonly value = input<string | undefined>(undefined);
  readonly valueChange = output<string | undefined>();

  protected readonly t = inject(I18nService).t;
  readonly quick = QUICK;
  readonly hex = computed(() => toHexColor(this.value()));

  onPick(e: Event): void {
    this.valueChange.emit((e.target as HTMLInputElement).value.toUpperCase());
  }

  onText(e: Event): void {
    const raw = (e.target as HTMLInputElement).value.trim();
    if (!raw) return this.valueChange.emit(undefined);
    const withHash = raw.startsWith('#') ? raw : `#${raw}`;
    this.valueChange.emit(/^#[0-9a-f]{3,8}$/i.test(withHash) ? withHash.toUpperCase() : withHash);
  }
}

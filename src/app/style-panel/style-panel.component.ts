import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgTemplateOutlet } from '@angular/common';
import {
  LinkStyle,
  StyleModel,
  StyleProps,
  StylePropKey,
  GlobalSelector,
} from '../core/plantuml-styles';
import { ColorFieldComponent } from './color-field.component';
import { I18nService } from '../i18n/i18n.service';

export type StyleContext =
  | { mode: 'element'; label: string; kindLabel: string; props: StyleProps; line?: number }
  | { mode: 'link'; label: string; style: LinkStyle; sequence: boolean; line?: number }
  | { mode: 'global'; model: StyleModel; themes: { id: string; label: string }[] };

export type StyleChange =
  | { type: 'element'; key: StylePropKey; value: string | number | undefined }
  | { type: 'element-reset' }
  | { type: 'link'; style: LinkStyle }
  | {
      type: 'global';
      selector: GlobalSelector;
      key: StylePropKey;
      value: string | number | undefined;
    }
  | { type: 'theme'; theme: string | null }
  | { type: 'handwritten'; value: boolean }
  | { type: 'global-reset' };

export const FONTS = [
  'sans-serif',
  'serif',
  'monospace',
  'Arial',
  'Helvetica',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Segoe UI',
  'Roboto',
  'Inter',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Consolas',
  'Comic Sans MS',
];

interface SectionDef {
  selector: GlobalSelector;
  icon: string;
  fields: StylePropKey[];
}

const GLOBAL_SECTIONS: SectionDef[] = [
  { selector: 'document', icon: 'wallpaper', fields: ['BackGroundColor'] },
  {
    selector: 'root',

    icon: 'text_fields',
    fields: ['FontName', 'FontSize', 'FontColor', 'FontStyle'],
  },
  {
    selector: 'element',

    icon: 'category',
    fields: [
      'BackGroundColor',
      'LineColor',
      'FontColor',
      'RoundCorner',
      'LineThickness',
      'Shadowing',
      'Padding',
    ],
  },
  {
    selector: 'arrow',

    icon: 'trending_flat',
    fields: ['LineColor', 'LineThickness', 'LineStyle', 'FontColor', 'FontSize'],
  },
  {
    selector: 'note',

    icon: 'sticky_note_2',
    fields: ['BackGroundColor', 'LineColor', 'FontColor', 'RoundCorner'],
  },
  {
    selector: 'title',

    icon: 'title',
    fields: ['FontSize', 'FontColor', 'FontStyle', 'BackGroundColor'],
  },
];

const ELEMENT_FIELDS: StylePropKey[] = [
  'BackGroundColor',
  'LineColor',
  'FontColor',
  'FontName',
  'FontSize',
  'FontStyle',
  'RoundCorner',
  'LineThickness',
  'LineStyle',
  'Shadowing',
  'Padding',
  'HorizontalAlignment',
];

@Component({
  selector: 'pe-style-panel',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatSelectModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatFormFieldModule,
    ColorFieldComponent,
    NgTemplateOutlet,
  ],
  templateUrl: './style-panel.component.html',
  styleUrl: './style-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StylePanelComponent {
  readonly context = input.required<StyleContext>();
  readonly change = output<StyleChange>();
  readonly close = output<void>();
  readonly jump = output<number>();

  protected readonly t = inject(I18nService).t;

  readonly fonts = FONTS;
  readonly sections = GLOBAL_SECTIONS;
  readonly elementFields = ELEMENT_FIELDS;
  readonly activeSection = signal<GlobalSelector>('element');

  readonly section = computed(
    () => this.sections.find((s) => s.selector === this.activeSection()) ?? this.sections[0],
  );

  readonly globalProps = computed<StyleProps>(() => {
    const ctx = this.context();
    return ctx.mode === 'global' ? (ctx.model.global[this.activeSection()] ?? {}) : {};
  });

  readonly hasGlobalValues = computed(() => {
    const ctx = this.context();
    if (ctx.mode !== 'global') return false;
    return (
      !!ctx.model.theme ||
      ctx.model.handwritten ||
      Object.values(ctx.model.global).some((p) => p && Object.keys(p).length)
    );
  });

  readonly hasElementValues = computed(() => {
    const ctx = this.context();
    return ctx.mode === 'element' && Object.keys(ctx.props).length > 0;
  });

  sectionHasValues(sel: GlobalSelector): boolean {
    const ctx = this.context();
    return ctx.mode === 'global' && Object.keys(ctx.model.global[sel] ?? {}).length > 0;
  }

  elementProps(): StyleProps {
    const ctx = this.context();
    return ctx.mode === 'element' ? ctx.props : {};
  }

  linkStyle(): LinkStyle {
    const ctx = this.context();
    return ctx.mode === 'link' ? ctx.style : {};
  }

  emitProp(key: StylePropKey, value: string | number | undefined | null): void {
    const v = value === null || value === '' ? undefined : value;
    const ctx = this.context();
    if (ctx.mode === 'element') this.change.emit({ type: 'element', key, value: v });
    else if (ctx.mode === 'global')
      this.change.emit({ type: 'global', selector: this.activeSection(), key, value: v });
  }

  emitLink(patch: Partial<LinkStyle>): void {
    const next = { ...this.linkStyle(), ...patch };
    for (const k of Object.keys(next) as (keyof LinkStyle)[])
      if (next[k] === undefined) delete next[k];
    this.change.emit({ type: 'link', style: next });
  }

  themeChange(theme: string | null): void {
    this.change.emit({ type: 'theme', theme });
  }

  handwritten(value: boolean): void {
    this.change.emit({ type: 'handwritten', value });
  }

  label(key: StylePropKey): string {
    return this.t().stylePanel.props[key] ?? key;
  }

  isColor(key: StylePropKey): boolean {
    return key.endsWith('Color');
  }

  sliderRange(key: StylePropKey): { min: number; max: number; step: number; def: number } {
    switch (key) {
      case 'FontSize':
        return { min: 8, max: 40, step: 1, def: 14 };
      case 'RoundCorner':
        return { min: 0, max: 50, step: 1, def: 5 };
      case 'LineThickness':
        return { min: 0, max: 8, step: 0.5, def: 1 };
      case 'Shadowing':
        return { min: 0, max: 12, step: 1, def: 0 };
      case 'Padding':
      case 'Margin':
        return { min: 0, max: 40, step: 1, def: 5 };
      default:
        return { min: 0, max: 100, step: 1, def: 0 };
    }
  }

  unit(key: StylePropKey): string {
    return key === 'FontSize' ||
      key === 'RoundCorner' ||
      key === 'LineThickness' ||
      key === 'Padding' ||
      key === 'Margin'
      ? 'px'
      : '';
  }

  asNumber(v: unknown): number | undefined {
    return typeof v === 'number' ? v : v === undefined ? undefined : Number(v);
  }

  asString(v: unknown): string | undefined {
    return v === undefined ? undefined : String(v);
  }

  prop(props: StyleProps, key: StylePropKey): unknown {
    return props[key];
  }
}

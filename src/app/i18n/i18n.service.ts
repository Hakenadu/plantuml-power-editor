import { Injectable, computed, inject, signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { DiagramStoreService } from '../core/diagram-store.service';
import type { DiagramError } from '../core/plantuml-engine.service';
import { setCompletionTexts } from '../editor/plantuml-completion';
import {
  FALLBACK_LANGUAGE,
  LANGUAGES,
  LanguageCode,
  LanguagePreference,
  detectSystemLanguage,
  isLanguageCode,
} from './languages';
import type { Translations } from './translations';

/**
 * Runtime i18n based on signals: templates read `i18n.t().section.key`, so switching the
 * language re-renders everything without a reload. Dictionaries are lazy-loaded per language.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly store = inject(DiagramStoreService);
  private readonly cache = new Map<LanguageCode, Translations>();
  private readonly dict = signal<Translations | null>(null);
  private loadSeq = 0;

  readonly languages = LANGUAGES;
  /** The user's choice ("system" follows the browser/OS language). */
  readonly preference = signal<LanguagePreference>(this.storedPreference());
  /** The active language. */
  readonly lang = signal<LanguageCode>(FALLBACK_LANGUAGE);
  /** BCP 47 locale for Intl APIs and Angular pipes. */
  readonly locale = computed(() => this.lang());
  readonly systemLanguage = signal<LanguageCode>(detectSystemLanguage());

  /** Current dictionary. Only valid after `init()` (runs as an app initializer). */
  readonly t = computed(() => {
    const d = this.dict();
    if (!d) throw new Error('I18nService used before init()');
    return d;
  });

  readonly languageLabel = computed(() => labelOf(this.lang()));
  readonly systemLanguageLabel = computed(() => labelOf(this.systemLanguage()));

  constructor() {
    window.addEventListener('languagechange', () => {
      this.systemLanguage.set(detectSystemLanguage());
      if (this.preference() === 'system') void this.activate(this.systemLanguage());
    });
  }

  /** Loads the preferred language; called once before the app renders. */
  init(): Promise<void> {
    return this.activate(this.resolve(this.preference()));
  }

  async setPreference(pref: LanguagePreference): Promise<void> {
    this.preference.set(pref);
    this.store.updatePrefs({ language: pref });
    await this.activate(this.resolve(pref));
  }

  /** Localized message for an engine error (codes → dictionary, PlantUML messages translated). */
  errorMessage(err: DiagramError): string {
    const e = this.t().errors;
    if (err.code === 'timeout') return e.timeout;
    if (err.code === 'unknown-type' && !err.message) return e.unknownType;
    if (!err.message) return e.syntax;
    return e.engineMessages.reduce((msg, [from, to]) => msg.replace(from, to), err.message);
  }

  private resolve(pref: LanguagePreference): LanguageCode {
    return pref === 'system' ? this.systemLanguage() : pref;
  }

  private async activate(code: LanguageCode): Promise<void> {
    const seq = ++this.loadSeq;
    let dict = this.cache.get(code);
    if (!dict) {
      const def = LANGUAGES.find((l) => l.code === code)!;
      const [loaded, ngLocale] = await Promise.all([def.load(), def.ngLocale?.()]);
      if (ngLocale) registerLocaleData(ngLocale, code);
      dict = loaded;
      this.cache.set(code, dict);
    }
    if (seq !== this.loadSeq) return; // a newer switch won
    setCompletionTexts(dict.completion);
    document.documentElement.lang = code;
    this.lang.set(code);
    this.dict.set(dict);
  }

  private storedPreference(): LanguagePreference {
    const pref = this.store.prefs().language;
    return pref === 'system' || isLanguageCode(pref) ? pref : 'system';
  }
}

export function labelOf(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code;
}

import type { Translations } from './translations';

/**
 * Registry of supported UI languages. To add a language:
 *   1. create `locales/<code>.ts` exporting a `Translations` object (the compiler lists missing keys),
 *   2. add an entry below (`ngLocale` only if Angular pipes need its number/date formats).
 */
export const LANGUAGES = [
  {
    code: 'de',
    /** Native name, shown in the language menu regardless of the current UI language. */
    label: 'Deutsch',
    load: () => import('./locales/de').then((m) => m.default),
    ngLocale: () => import('@angular/common/locales/de').then((m) => m.default),
  },
  {
    code: 'en',
    label: 'English',
    load: () => import('./locales/en').then((m) => m.default),
    // Angular ships English locale data by default.
    ngLocale: undefined,
  },
] as const satisfies readonly LanguageDefinition[];

interface LanguageDefinition {
  code: string;
  label: string;
  load: () => Promise<Translations>;
  ngLocale: (() => Promise<unknown>) | undefined;
}

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
/** What the user picked: a concrete language or "follow the system". */
export type LanguagePreference = LanguageCode | 'system';

export const FALLBACK_LANGUAGE: LanguageCode = 'en';

export function isLanguageCode(value: unknown): value is LanguageCode {
  return LANGUAGES.some((l) => l.code === value);
}

/** Best match for the browser/OS language list, e.g. `de-AT` → `de`. */
export function detectSystemLanguage(
  preferred: readonly string[] = navigator.languages?.length
    ? navigator.languages
    : [navigator.language],
): LanguageCode {
  for (const tag of preferred) {
    const base = tag?.toLowerCase().split(/[-_]/)[0];
    if (isLanguageCode(base)) return base;
  }
  return FALLBACK_LANGUAGE;
}

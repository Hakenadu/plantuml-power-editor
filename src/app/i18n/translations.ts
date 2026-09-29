import type de from './locales/de';

/**
 * Shape of a UI dictionary. German is the reference language: every other locale is typed as
 * `Translations`, so the compiler reports missing or superfluous keys.
 */
export type Translations = typeof de;

/** Declares a complete string table for a union of keys (keeps the key type in `Translations`). */
export const table = <K extends string>(entries: Record<K, string>): Record<K, string> => entries;

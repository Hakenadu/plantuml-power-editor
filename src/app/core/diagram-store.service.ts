import { Injectable, computed, signal } from '@angular/core';
import type { LanguagePreference } from '../i18n/languages';

export interface StoredDiagram {
  id: string;
  name: string;
  source: string;
  /** Small SVG preview of the last successful render (may be omitted if too large). */
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Draft {
  /** Id of the stored diagram this draft belongs to, if any. */
  id: string | null;
  name: string;
  source: string;
  /** Last successfully rendered SVG, so a broken draft still shows something after reload. */
  svg?: string;
  updatedAt: number;
}

const LIST_KEY = 'pe.diagrams.v1';
const DRAFT_KEY = 'pe.draft.v1';
const PREFS_KEY = 'pe.prefs.v1';
const MAX_THUMBNAIL_CHARS = 150_000;

export interface Prefs {
  storageNoticeAcknowledged: boolean;
  theme: 'system' | 'light' | 'dark';
  splitRatio: number;
  wrap: boolean;
  sidebarOpen: boolean;
  fontSize: number;
  language: LanguagePreference;
}

const DEFAULT_PREFS: Prefs = {
  storageNoticeAcknowledged: false,
  theme: 'system',
  splitRatio: 0.42,
  wrap: false,
  sidebarOpen: true,
  fontSize: 14,
  language: 'system',
};

/** Thrown by `save` when localStorage has no room left (message is localized by the caller). */
export class StorageFullError extends Error {
  constructor() {
    super('localStorage is full');
    this.name = 'StorageFullError';
  }
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Persists diagrams, the working draft and UI preferences in localStorage. */
@Injectable({ providedIn: 'root' })
export class DiagramStoreService {
  private readonly list = signal<StoredDiagram[]>(read<StoredDiagram[]>(LIST_KEY, []));
  readonly diagrams = computed(() => [...this.list()].sort((a, b) => b.updatedAt - a.updatedAt));
  readonly prefs = signal<Prefs>({ ...DEFAULT_PREFS, ...read<Partial<Prefs>>(PREFS_KEY, {}) });

  constructor() {
    // Keep multiple tabs in sync.
    window.addEventListener('storage', (e) => {
      if (e.key === LIST_KEY) this.list.set(read<StoredDiagram[]>(LIST_KEY, []));
    });
  }

  get(id: string): StoredDiagram | undefined {
    return this.list().find((d) => d.id === id);
  }

  /** Saves (insert or update). Returns the stored diagram or throws if the quota is exceeded. */
  save(input: {
    id: string | null;
    name: string;
    source: string;
    thumbnail?: string;
  }): StoredDiagram {
    const now = Date.now();
    const thumbnail =
      input.thumbnail && input.thumbnail.length <= MAX_THUMBNAIL_CHARS
        ? input.thumbnail
        : undefined;
    const existing = input.id ? this.get(input.id) : undefined;
    const diagram: StoredDiagram = existing
      ? { ...existing, name: input.name, source: input.source, thumbnail, updatedAt: now }
      : {
          id: crypto.randomUUID(),
          name: input.name,
          source: input.source,
          thumbnail,
          createdAt: now,
          updatedAt: now,
        };
    const next = existing
      ? this.list().map((d) => (d.id === diagram.id ? diagram : d))
      : [...this.list(), diagram];
    if (!write(LIST_KEY, next)) {
      // Retry without thumbnail before giving up.
      diagram.thumbnail = undefined;
      const slim = existing
        ? this.list().map((d) => (d.id === diagram.id ? diagram : d))
        : [...this.list(), diagram];
      if (!write(LIST_KEY, slim)) throw new StorageFullError();
      this.list.set(slim);
      return diagram;
    }
    this.list.set(next);
    return diagram;
  }

  rename(id: string, name: string): void {
    const next = this.list().map((d) => (d.id === id ? { ...d, name } : d));
    write(LIST_KEY, next);
    this.list.set(next);
  }

  duplicate(id: string, copyName: (name: string) => string): StoredDiagram | undefined {
    const d = this.get(id);
    if (!d) return undefined;
    return this.save({
      id: null,
      name: copyName(d.name),
      source: d.source,
      thumbnail: d.thumbnail,
    });
  }

  remove(id: string): StoredDiagram | undefined {
    const d = this.get(id);
    const next = this.list().filter((x) => x.id !== id);
    write(LIST_KEY, next);
    this.list.set(next);
    return d;
  }

  restore(d: StoredDiagram): void {
    const next = [...this.list().filter((x) => x.id !== d.id), d];
    write(LIST_KEY, next);
    this.list.set(next);
  }

  loadDraft(): Draft | null {
    return read<Draft | null>(DRAFT_KEY, null);
  }

  saveDraft(draft: Draft): void {
    if (draft.svg && draft.svg.length > 400_000) draft = { ...draft, svg: undefined };
    if (!write(DRAFT_KEY, draft)) write(DRAFT_KEY, { ...draft, svg: undefined });
  }

  updatePrefs(patch: Partial<Prefs>): void {
    this.prefs.update((p) => ({ ...p, ...patch }));
    write(PREFS_KEY, this.prefs());
  }

  /** Approximate bytes used by this app in localStorage. */
  usageBytes(): number {
    let total = 0;
    for (const key of [LIST_KEY, DRAFT_KEY, PREFS_KEY])
      total += (localStorage.getItem(key)?.length ?? 0) * 2;
    return total;
  }
}

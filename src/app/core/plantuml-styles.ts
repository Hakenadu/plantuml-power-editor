import {
  CLASS_KEYWORDS,
  DEPLOYMENT_KEYWORDS,
  DiagramType,
  SEQUENCE_PARTICIPANT_KEYWORDS,
  STYLE_BLOCK_BEGIN,
  STYLE_BLOCK_END,
  codeLines,
  collectElements,
  escapeRe,
  insertionLineAfterStart,
} from './plantuml-analysis';

/**
 * Style properties supported by PlantUML's `<style>` engine
 * (see https://plantuml.com/style-evolution). Only the subset that is
 * reliably honoured across diagram types is exposed in the UI.
 */
export interface StyleProps {
  BackGroundColor?: string;
  LineColor?: string;
  FontColor?: string;
  FontName?: string;
  FontSize?: number;
  FontStyle?: string;
  RoundCorner?: number;
  LineThickness?: number;
  LineStyle?: string;
  Shadowing?: number;
  Padding?: number;
  Margin?: number;
  HorizontalAlignment?: string;
  MaximumWidth?: number;
  HyperLinkColor?: string;
}

export type StylePropKey = keyof StyleProps;

export const GLOBAL_SELECTORS = [
  'document',
  'root',
  'element',
  'arrow',
  'note',
  'title',
  'legend',
] as const;
export type GlobalSelector = (typeof GLOBAL_SELECTORS)[number];

export interface StyleModel {
  theme: string | null;
  handwritten: boolean;
  global: Partial<Record<GlobalSelector, StyleProps>>;
  /** Per-element styles keyed by stereotype class name (`pe_...`). */
  elements: Record<string, StyleProps>;
}

export const emptyStyleModel = (): StyleModel => ({
  theme: null,
  handwritten: false,
  global: {},
  elements: {},
});

const NUMERIC_PROPS = new Set<StylePropKey>([
  'FontSize',
  'RoundCorner',
  'LineThickness',
  'Shadowing',
  'Padding',
  'Margin',
  'MaximumWidth',
]);

// ---------------------------------------------------------------------------
// Managed block parsing / serialising
// ---------------------------------------------------------------------------

interface BlockLocation {
  /** 0-based index of the begin marker line. */
  start: number;
  /** 0-based index of the end marker line. */
  end: number;
}

function findBlock(lines: string[]): BlockLocation | null {
  const start = lines.findIndex((l) => l.trim() === STYLE_BLOCK_BEGIN);
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && l.trim() === STYLE_BLOCK_END);
  return end < 0 ? null : { start, end };
}

export function parseStyleModel(source: string): StyleModel {
  const model = emptyStyleModel();
  const lines = source.split(/\r\n|\r|\n/);
  const block = findBlock(lines);
  if (!block) return model;

  let selector: string | null = null;
  for (const raw of lines.slice(block.start + 1, block.end)) {
    const line = raw.trim();
    let m: RegExpExecArray | null;
    if ((m = /^!theme\s+(\S+)/.exec(line))) {
      model.theme = m[1];
    } else if (/^skinparam\s+handwritten\s+true/i.test(line)) {
      model.handwritten = true;
    } else if ((m = /^([.\w-]+)\s*\{$/.exec(line))) {
      selector = m[1];
    } else if (line === '}') {
      selector = null;
    } else if (selector && (m = /^(\w+)\s+(.+)$/.exec(line))) {
      const key = m[1] as StylePropKey;
      const value = NUMERIC_PROPS.has(key) ? Number(m[2]) : m[2].trim();
      const target = selector.startsWith('.')
        ? (model.elements[selector.slice(1)] ??= {})
        : (model.global[selector as GlobalSelector] ??= {});
      (target as Record<string, unknown>)[key] = value;
    }
  }
  return model;
}

function serializeProps(selector: string, props: StyleProps | undefined): string[] {
  const entries = Object.entries(props ?? {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (!entries.length) return [];
  return [`${selector} {`, ...entries.map(([k, v]) => `  ${k} ${v}`), '}'];
}

export function serializeStyleModel(model: StyleModel): string[] {
  const body: string[] = [];
  if (model.theme) body.push(`!theme ${model.theme}`);
  if (model.handwritten) body.push('skinparam handwritten true');
  const style: string[] = [];
  for (const sel of GLOBAL_SELECTORS) style.push(...serializeProps(sel, model.global[sel]));
  const elementIds = Object.keys(model.elements).sort();
  for (const id of elementIds) style.push(...serializeProps(`.${id}`, model.elements[id]));
  if (style.length) body.push('<style>', ...style, '</style>');
  for (const id of elementIds) {
    if (Object.keys(model.elements[id]).length) body.push(`hide <<${id}>> stereotype`);
  }
  return body.length ? [STYLE_BLOCK_BEGIN, ...body, STYLE_BLOCK_END] : [];
}

/** Returns the source with the managed style block replaced by `model`. */
export function applyStyleModel(source: string, model: StyleModel): string {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/\r\n|\r|\n/);
  const block = findBlock(lines);
  const serialized = serializeStyleModel(model);
  if (block) {
    lines.splice(block.start, block.end - block.start + 1, ...serialized);
  } else if (serialized.length) {
    const startIdx = lines.findIndex((l) => /^\s*@start\w+/.test(l));
    lines.splice(startIdx + 1, 0, ...serialized);
  }
  return lines.join(eol);
}

// ---------------------------------------------------------------------------
// Per-element stereotypes
// ---------------------------------------------------------------------------

export function stereotypeFor(elementId: string): string {
  const cleaned = elementId
    .normalize('NFKD')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `pe_${cleaned || 'element'}`;
}

export interface ElementTarget {
  /** The identifier as used in the source (alias or name). */
  id: string;
  /** Display label from the rendering, used as a fallback for lookup. */
  label?: string;
  /** 1-based source line reported by PlantUML (declaration or first usage). */
  line?: number;
  /** Activity nodes are addressed by their `:label;` line. */
  activity?: boolean;
}

export interface StereotypeResult {
  source: string;
  stereotype: string;
  /** 1-based line that carries the stereotype. */
  line: number;
}

/**
 * Makes sure the element carries its `<<pe_...>>` stereotype, adding an explicit
 * declaration if the element is only used implicitly. Returns null if the
 * element could not be located.
 */
export function ensureElementStereotype(
  source: string,
  type: DiagramType,
  target: ElementTarget,
): StereotypeResult | null {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/\r\n|\r|\n/);
  const stereotype = stereotypeFor(target.id);
  const marker = `<<${stereotype}>>`;

  const existing = findStereotypeLine(source, stereotype);
  if (existing) return { source, stereotype, line: existing };

  // Activity nodes: `:label;` -> `:label; <<pe_x>>`
  if (target.activity && target.line) {
    const idx = target.line - 1;
    lines[idx] = lines[idx].replace(/;\s*$/, `; ${marker}`);
    return { source: lines.join(eol), stereotype, line: target.line };
  }

  const elements = collectElements(source, type);
  const el =
    elements.find((e) => e.id === target.id) ??
    elements.find((e) => e.label === target.id) ??
    (target.label
      ? elements.find((e) => e.label === target.label || e.id === target.label)
      : undefined);

  if (el?.explicit) {
    const idx = el.line - 1;
    const updated = insertStereotypeIntoDeclaration(lines[idx], marker);
    if (updated !== null) {
      lines[idx] = updated;
      return { source: lines.join(eol), stereotype, line: el.line };
    }
  }

  // Implicit element: add a declaration right before its first usage so that
  // the participant order in sequence diagrams does not change.
  const id = el?.id ?? target.id;
  const needsQuotes = /[^\w.]/.test(id);
  const ref = needsQuotes ? `"${id}"` : id;
  let decl: string;
  if (el?.kind === 'component') decl = `component [${id}] ${marker}`;
  else if (el?.kind === 'usecase') decl = `usecase (${id}) ${marker}`;
  else if (type === 'sequence') decl = `participant ${ref} ${marker}`;
  else if (type === 'state') decl = `state ${ref} ${marker}`;
  else if (type === 'usecase') decl = `usecase ${ref} ${marker}`;
  else if (type === 'component' || type === 'deployment') decl = `component ${ref} ${marker}`;
  else if (type === 'object') decl = `object ${ref} ${marker}`;
  else decl = `class ${ref} ${marker}`;

  let insertAt = el ? el.line - 1 : (target.line ?? insertionLineAfterStart(source)) - 1;
  if (type === 'sequence' && el && !el.explicit) {
    // Keep the order: declare every participant of that line (left to right) before it.
    const before = elements.filter((e) => e.line === el.line && !e.explicit && e.id !== el.id);
    const leftOfEl = before.filter(
      (e) => lines[insertAt].indexOf(e.id) < lines[insertAt].indexOf(el.id),
    );
    const extra = leftOfEl.map((e) => `participant ${/[^\w.]/.test(e.id) ? `"${e.id}"` : e.id}`);
    lines.splice(insertAt, 0, ...extra, decl);
    return { source: lines.join(eol), stereotype, line: insertAt + extra.length + 1 };
  }
  insertAt = Math.max(insertAt, insertionLineAfterStart(source) - 1);
  lines.splice(insertAt, 0, decl);
  return { source: lines.join(eol), stereotype, line: insertAt + 1 };
}

/** 1-based line carrying `<<stereotype>>` outside the managed style block, or null. */
export function findStereotypeLine(source: string, stereotype: string): number | null {
  const lines = codeLines(source);
  const block = findBlock(source.split(/\r\n|\r|\n/));
  const marker = `<<${stereotype}>>`;
  const idx = lines.findIndex(
    (l, i) => (!block || i < block.start || i > block.end) && l.includes(marker),
  );
  return idx >= 0 ? idx + 1 : null;
}

const ALL_DECL_KEYWORDS = [
  ...new Set([
    ...SEQUENCE_PARTICIPANT_KEYWORDS,
    ...CLASS_KEYWORDS,
    ...DEPLOYMENT_KEYWORDS,
    'state',
    'object',
    'map',
    'usecase',
  ]),
].sort((a, b) => b.length - a.length);

function insertStereotypeIntoDeclaration(line: string, marker: string): string | null {
  const kw = ALL_DECL_KEYWORDS.map((k) => k.replace(/\s+/g, '\\s+')).join('|');
  const re = new RegExp(
    String.raw`^(\s*(?:${kw})\s+(?:"[^"]+"|\[[^\]]+\]|\([^)]+\)|[\w.$:\u00C0-\u024F]+)(?:<[^<>]*>)?(?:\s+as\s+(?:"[^"]+"|[\w.]+))?(?:\s*<<[^>]+>>)*)`,
    'i',
  );
  const bracket = /^(\s*(?:\[[^\]]+\]|\([^)]+\))(?:\s+as\s+[\w.]+)?(?:\s*<<[^>]+>>)*)/;
  const m = re.exec(line) ?? bracket.exec(line);
  if (!m) return null;
  return `${m[1]} ${marker}${line.slice(m[1].length)}`;
}

/** Removes the element stereotype from the source (used when all its styles are reset). */
export function removeElementStereotype(source: string, stereotype: string): string {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const re = new RegExp(String.raw`\s*<<${escapeRe(stereotype)}>>`, 'g');
  return source
    .split(/\r\n|\r|\n/)
    .map((l) => (l.trim() === '' ? l : l.replace(re, '')))
    .join(eol);
}

// ---------------------------------------------------------------------------
// Arrow / link styling:  A -[#red,dashed,thickness=2]-> B
// ---------------------------------------------------------------------------

export interface LinkStyle {
  color?: string;
  style?: 'dashed' | 'dotted' | 'bold' | 'plain' | 'hidden';
  thickness?: number;
}

const ARROW_RE =
  /(<\|?|[*o}x#+^])?([-.=~]+)(\[[^\]]*\])?((?:up|down|left|right|u|d|l|r)?[-.=~]*)(\|?>{1,2}|[*o{x#+^]|\\\\|\/\/|\\|\/)?/;

function locateArrow(line: string): { index: number; match: RegExpExecArray } | null {
  // Skip the part after the message label (`: ...`).
  const colon = line.search(/\s:\s|:(?=[^>\-]*$)/);
  const head = colon > 0 ? line.slice(0, colon) : line;
  const re = new RegExp(ARROW_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(head))) {
    const body = (m[2] ?? '') + (m[4] ?? '');
    const hasHead = !!(m[1] || m[5]);
    if (
      body.replace(/[a-z]/g, '').length >= 1 &&
      (hasHead || body.replace(/[a-z]/g, '').length >= 2)
    ) {
      return { index: m.index, match: m };
    }
    if (m[0].length === 0) re.lastIndex++;
  }
  return null;
}

export function parseLinkStyle(line: string): LinkStyle {
  const loc = locateArrow(line);
  const inner = loc?.match[3]?.slice(1, -1);
  if (!inner) return {};
  const result: LinkStyle = {};
  for (const part of inner.split(/[,;]/).map((p) => p.trim())) {
    let m: RegExpExecArray | null;
    if ((m = /^#([\w]+)/.exec(part))) result.color = `#${m[1]}`;
    else if ((m = /^thickness=(\d+)/.exec(part))) result.thickness = Number(m[1]);
    else if (/^(dashed|dotted|bold|plain|hidden)$/.test(part))
      result.style = part as LinkStyle['style'];
  }
  return result;
}

export function applyLinkStyle(line: string, style: LinkStyle, sequence: boolean): string {
  const loc = locateArrow(line);
  if (!loc) return line;
  const m = loc.match;
  const parts: string[] = [];
  if (style.color) parts.push(style.color);
  if (style.style && style.style !== 'plain') parts.push(style.style);
  if (style.thickness) parts.push(`thickness=${style.thickness}`);
  const bracket = parts.length ? `[${parts.join(sequence ? ';' : ',')}]` : '';

  const pre = m[1] ?? '';
  const body1 = m[2] ?? '';
  const body2 = m[4] ?? '';
  const headPart = m[5] ?? '';
  let rebuilt: string;
  if (m[3] !== undefined) {
    rebuilt = pre + body1 + bracket + body2 + headPart;
  } else {
    // Insert after the first body char:  --> => -[..]->   -> => -[..]>
    const all = body1 + body2;
    rebuilt = pre + all.slice(0, 1) + bracket + all.slice(1) + headPart;
  }
  return line.slice(0, loc.index) + rebuilt + line.slice(loc.index + m[0].length);
}

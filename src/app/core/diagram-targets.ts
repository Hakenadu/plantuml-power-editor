import { DiagramType, codeLines, collectElements, escapeRe } from './plantuml-analysis';

export type TargetKind = 'element' | 'link' | 'message' | 'activity' | 'text' | 'group';

/** Something the user clicked on inside the rendered diagram. */
export interface DiagramTarget {
  kind: TargetKind;
  /** Human readable name for menus. */
  label: string;
  /** Element identifier as used in the source (for styling). */
  elementId?: string;
  /** 1-based line in the source. */
  line?: number;
  /** Bounding box in SVG user units (for highlighting). */
  bbox?: DOMRect;
  /** SVG node to highlight. */
  node?: SVGGraphicsElement;
}

const SHAPES = 'rect, path, polygon, ellipse, circle, line, polyline, text, image';

function textOf(el: Element): string {
  return (el.textContent ?? '').replace(/ /g, ' ').trim();
}

function bboxOf(el: Element): DOMRect | undefined {
  try {
    return (el as SVGGraphicsElement).getBBox();
  } catch {
    return undefined;
  }
}

function contains(outer: DOMRect, inner: DOMRect, slack = 1): boolean {
  return (
    inner.x >= outer.x - slack &&
    inner.y >= outer.y - slack &&
    inner.x + inner.width <= outer.x + outer.width + slack &&
    inner.y + inner.height <= outer.y + outer.height + slack
  );
}

/**
 * Resolves the clicked SVG node to a diagram target. PlantUML adds
 * `data-source-line` / `data-qualified-name` for graphviz based diagrams
 * (class, component, state, use case, ...). Sequence and activity diagrams
 * carry no such metadata, so we fall back to matching the rendered text
 * against the source.
 */
export function resolveTarget(
  svg: SVGSVGElement,
  clicked: Element,
  source: string,
  type: DiagramType,
): DiagramTarget | null {
  // 1) Graphviz based diagrams with metadata.
  const meta = clicked.closest('g[data-source-line]') as SVGGElement | null;
  if (meta && svg.contains(meta)) {
    const line = Number(meta.getAttribute('data-source-line')) + 1;
    const cls = meta.getAttribute('class') ?? '';
    if (cls.includes('link')) {
      const e1 = svg.querySelector(`#${CSS.escape(meta.getAttribute('data-entity-1') ?? '')}`);
      const e2 = svg.querySelector(`#${CSS.escape(meta.getAttribute('data-entity-2') ?? '')}`);
      const n1 = e1?.getAttribute('data-qualified-name') ?? '?';
      const n2 = e2?.getAttribute('data-qualified-name') ?? '?';
      return {
        kind: 'link',
        label: `${short(n1)} → ${short(n2)}`,
        line,
        node: meta,
        bbox: bboxOf(meta),
      };
    }
    const qn = meta.getAttribute('data-qualified-name') ?? textOf(meta);
    const elementId = resolveElementId(qn, source, type);
    const special = qn.startsWith('.') || cls.includes('start') || cls.includes('end');
    return {
      kind: cls.includes('cluster') ? 'group' : 'element',
      label: special ? readableSpecial(qn, cls) : (firstText(meta) ?? short(qn)),
      elementId: special ? undefined : elementId,
      line,
      node: meta,
      bbox: bboxOf(meta),
    };
  }

  // 2) Sequence participants: lifeline groups carry a <title>.
  const titled = clicked.closest('g');
  const title = titled?.querySelector(':scope > title')?.textContent?.trim();
  if (title && type === 'sequence') {
    return participantTarget(title, source, type, titled as SVGGElement);
  }

  // 3) Text based matching.
  const shape = clicked.closest(SHAPES);
  if (!shape || shape === svg) return null;
  const text = shape.tagName === 'text' ? shape : findTextFor(svg, shape);
  if (!text) return null;
  const label = textOf(text);
  if (!label) return null;

  if (type === 'sequence') {
    const participant = collectElements(source, type).find(
      (e) => e.label === label || e.id === label,
    );
    if (participant)
      return participantTarget(
        participant.id,
        source,
        type,
        (findShapeFor(svg, text) ?? text) as SVGGraphicsElement,
      );
    const msg = findMessageLine(source, label, occurrenceIndex(svg, text));
    if (msg)
      return {
        kind: 'message',
        label,
        line: msg,
        node: text as SVGGraphicsElement,
        bbox: bboxOf(text),
      };
  }

  if (type === 'activity') {
    const line = findActivityLine(source, label, occurrenceIndex(svg, text));
    if (line) {
      const node = (findShapeFor(svg, text) ?? text) as SVGGraphicsElement;
      return { kind: 'activity', label, elementId: label, line, node, bbox: bboxOf(node) };
    }
  }

  const line = findAnyLine(source, label);
  if (!line) return null;
  const element = collectElements(source, type).find((e) => e.label === label || e.id === label);
  const node = (findShapeFor(svg, text) ?? text) as SVGGraphicsElement;
  return element
    ? {
        kind: 'element',
        label,
        elementId: element.id,
        line: element.line,
        node,
        bbox: bboxOf(node),
      }
    : { kind: 'text', label, line, node: text as SVGGraphicsElement, bbox: bboxOf(text) };
}

function short(qn: string): string {
  return qn.split('.').pop() || qn;
}

function readableSpecial(qn: string, cls: string): string {
  if (cls.includes('start')) return 'Start';
  if (cls.includes('end')) return 'Ende';
  return qn;
}

function firstText(g: Element): string | null {
  // Skip single-letter class icons ("C", "I", "E", ...).
  for (const t of Array.from(g.querySelectorAll('text'))) {
    const s = textOf(t);
    if (s.length > 1 || (s && g.querySelectorAll('text').length === 1)) return s;
  }
  return null;
}

function resolveElementId(qualifiedName: string, source: string, type: DiagramType): string {
  const elements = collectElements(source, type);
  if (elements.some((e) => e.id === qualifiedName)) return qualifiedName;
  const s = short(qualifiedName);
  return elements.find((e) => e.id === s || e.label === s)?.id ?? s;
}

function participantTarget(
  id: string,
  source: string,
  type: DiagramType,
  node: SVGGraphicsElement,
): DiagramTarget {
  const el = collectElements(source, type).find((e) => e.id === id || e.label === id);
  return {
    kind: 'element',
    label: el?.label ?? id,
    elementId: el?.id ?? id,
    line: el?.line,
    node,
    bbox: bboxOf(node),
  };
}

/** Finds the text that labels a clicked shape (text inside rect, or message label above an arrow line). */
function findTextFor(svg: SVGSVGElement, shape: Element): Element | null {
  const box = bboxOf(shape);
  if (!box) return null;
  const texts = Array.from(svg.querySelectorAll('text')).filter((t) => textOf(t));
  const inside = texts.filter((t) => {
    const b = bboxOf(t);
    return b && contains(box, b, 2);
  });
  if (inside.length) return inside.find((t) => textOf(t).length > 1) ?? inside[0];

  // Lines / arrow heads: nearest text just above and horizontally overlapping.
  let best: Element | null = null;
  let bestDist = Infinity;
  for (const t of texts) {
    const b = bboxOf(t);
    if (!b) continue;
    const overlapX = b.x < box.x + box.width + 4 && b.x + b.width > box.x - 4;
    const dy = box.y - (b.y + b.height);
    if (overlapX && dy > -6 && dy < 24 && dy < bestDist) {
      best = t;
      bestDist = dy;
    }
  }
  return best;
}

/** Finds the shape (rect/polygon/...) that surrounds a text element. */
function findShapeFor(svg: SVGSVGElement, text: Element): Element | null {
  const tb = bboxOf(text);
  if (!tb) return null;
  let best: Element | null = null;
  let bestArea = Infinity;
  for (const s of Array.from(svg.querySelectorAll('rect, polygon, ellipse, path'))) {
    const b = bboxOf(s);
    if (!b || b.width < 4 || b.height < 4) continue;
    const area = b.width * b.height;
    if (contains(b, tb, 3) && area < bestArea && area < 400_000) {
      best = s;
      bestArea = area;
    }
  }
  return best;
}

function occurrenceIndex(svg: SVGSVGElement, text: Element): number {
  const label = textOf(text);
  const same: Element[] = Array.from(svg.querySelectorAll('text')).filter(
    (t) => textOf(t) === label,
  );
  return Math.max(0, same.indexOf(text));
}

function findMessageLine(source: string, label: string, occurrence: number): number | null {
  const lines = codeLines(source);
  const re = new RegExp(String.raw`[-.>x\]\[)o/\\]\s*[^:]*:\s*${escapeRe(label)}\s*$`);
  const hits: number[] = [];
  lines.forEach((l, i) => {
    if (re.test(l) || new RegExp(String.raw`:\s*${escapeRe(label)}\s*$`).test(l)) hits.push(i + 1);
  });
  if (!hits.length) return findAnyLine(source, label);
  return hits[Math.min(occurrence, hits.length - 1)];
}

function findActivityLine(source: string, label: string, occurrence: number): number | null {
  const lines = codeLines(source);
  const hits: number[] = [];
  const re = new RegExp(String.raw`^\s*(#\w+)?:\s*${escapeRe(label)}`);
  lines.forEach((l, i) => {
    if (re.test(l)) hits.push(i + 1);
  });
  if (hits.length) return hits[Math.min(occurrence, hits.length - 1)];
  return null;
}

function findAnyLine(source: string, label: string): number | null {
  const lines = codeLines(source);
  const needle = label.toLowerCase();
  const idx = lines.findIndex((l) => l.toLowerCase().includes(needle));
  return idx >= 0 ? idx + 1 : null;
}

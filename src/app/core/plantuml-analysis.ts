/**
 * Lightweight, regex-based analysis of PlantUML sources. It is intentionally
 * forgiving: it runs on every keystroke and must never throw on half-typed input.
 */

export type DiagramType =
  | 'sequence'
  | 'class'
  | 'activity'
  | 'usecase'
  | 'component'
  | 'state'
  | 'object'
  | 'deployment'
  | 'timing'
  | 'mindmap'
  | 'wbs'
  | 'gantt'
  | 'json'
  | 'yaml'
  | 'salt'
  | 'other';

export const DIAGRAM_TYPE_LABELS: Record<DiagramType, string> = {
  sequence: 'Sequenzdiagramm',
  class: 'Klassendiagramm',
  activity: 'Aktivitätsdiagramm',
  usecase: 'Use-Case-Diagramm',
  component: 'Komponentendiagramm',
  state: 'Zustandsdiagramm',
  object: 'Objektdiagramm',
  deployment: 'Deploymentdiagramm',
  timing: 'Timingdiagramm',
  mindmap: 'Mindmap',
  wbs: 'Work Breakdown Structure',
  gantt: 'Gantt-Diagramm',
  json: 'JSON',
  yaml: 'YAML',
  salt: 'Salt (Wireframe)',
  other: 'Diagramm',
};

export const SEQUENCE_PARTICIPANT_KEYWORDS = [
  'participant',
  'actor',
  'boundary',
  'control',
  'entity',
  'database',
  'collections',
  'queue',
];

export const CLASS_KEYWORDS = [
  'class',
  'abstract class',
  'abstract',
  'interface',
  'enum',
  'annotation',
  'entity',
  'exception',
  'metaclass',
  'protocol',
  'record',
  'stereotype',
  'struct',
  'dataclass',
];

export const DEPLOYMENT_KEYWORDS = [
  'actor',
  'agent',
  'artifact',
  'boundary',
  'card',
  'circle',
  'cloud',
  'collections',
  'component',
  'control',
  'database',
  'entity',
  'file',
  'folder',
  'frame',
  'hexagon',
  'interface',
  'label',
  'node',
  'package',
  'person',
  'process',
  'queue',
  'rectangle',
  'stack',
  'storage',
  'usecase',
  'port',
  'portin',
  'portout',
];

const STRIP_COMMENT = /(^|\s)'.*$/;

/** Returns the source lines with comments and `<style>` blocks blanked (line numbers stay stable). */
export function codeLines(source: string): string[] {
  const lines = source.split(/\r\n|\r|\n/);
  let inBlockComment = false;
  let inStyle = false;
  return lines.map((raw) => {
    let line = raw;
    if (inBlockComment) {
      const end = line.indexOf("'/");
      if (end < 0) return '';
      inBlockComment = false;
      line = line.slice(end + 2);
    }
    const start = line.indexOf("/'");
    if (start >= 0) {
      const end = line.indexOf("'/", start + 2);
      if (end < 0) {
        inBlockComment = true;
        line = line.slice(0, start);
      } else {
        line = line.slice(0, start) + line.slice(end + 2);
      }
    }
    if (/^\s*<style>/i.test(line)) inStyle = true;
    if (inStyle) {
      if (/<\/style>/i.test(line)) inStyle = false;
      return '';
    }
    if (/^\s*'/.test(line)) return '';
    return line.replace(STRIP_COMMENT, '$1');
  });
}

export function detectDiagramType(source: string): DiagramType {
  const start = /^\s*@start(\w+)/m.exec(source)?.[1]?.toLowerCase();
  if (start && start !== 'uml') {
    const direct: Record<string, DiagramType> = {
      mindmap: 'mindmap',
      wbs: 'wbs',
      gantt: 'gantt',
      json: 'json',
      yaml: 'yaml',
      salt: 'salt',
    };
    return direct[start] ?? 'other';
  }

  const scores: Partial<Record<DiagramType, number>> = {};
  const add = (t: DiagramType, n = 1) => (scores[t] = (scores[t] ?? 0) + n);

  for (const line of codeLines(source)) {
    const l = line.trim();
    if (!l) continue;
    if (/^(participant|boundary|control|collections|queue)\b/i.test(l)) add('sequence', 3);
    if (
      /^(activate|deactivate|destroy|autonumber|return|ref over|alt|opt|loop|par|break|critical|group|\.\.\.|\|\|\||==)/i.test(
        l,
      )
    )
      add('sequence', 2);
    if (/^[\w"]+\s*<?-{1,2}>{1,2}[xo]?\s*[\w"]+\s*:/.test(l)) add('sequence', 1);
    if (/^(actor|entity|database)\b/i.test(l)) {
      add('sequence', 0.5);
      add('usecase', 0.5);
    }
    if (
      /^(abstract\s+class|class|interface|enum|annotation|abstract|namespace|dataclass|record|struct)\b/i.test(
        l,
      )
    )
      add('class', 3);
    if (/(<\|--|--\|>|\*--|--\*|o--|--o|\.\.\|>|<\|\.\.)/.test(l)) add('class', 2);
    if (/^\s*[+\-#~]\s*\w+\s*\(/.test(line) || /^\s*\{(static|abstract)\}/.test(l)) add('class', 1);
    if (
      /^(start|stop|end|endif|endwhile|fork|repeat|detach|kill)\s*$/i.test(l) ||
      /^:.*;?$/.test(l)
    )
      add('activity', 3);
    if (/^(if|while|elseif)\s*\(/i.test(l) || /^\|.+\|/.test(l)) add('activity', 3);
    if (/^state\b/i.test(l) || /\[\*\]/.test(l)) add('state', 3);
    if (/^(usecase)\b/i.test(l) || /^\(.+\)/.test(l)) add('usecase', 3);
    if (/^(component)\b/i.test(l) || /^\[[^\]]+\]/.test(l)) add('component', 3);
    if (/^(node|cloud|artifact|folder|frame|storage|card|agent|stack|hexagon|file)\b/i.test(l))
      add('deployment', 3);
    if (/^(object|map|json)\b/i.test(l)) add('object', 3);
    if (/^(robust|concise|clock|binary|analog)\b/i.test(l) || /^@\d+/.test(l)) add('timing', 3);
  }

  let best: DiagramType = 'sequence';
  let bestScore = 0;
  for (const [type, score] of Object.entries(scores) as [DiagramType, number][]) {
    if (score > bestScore) {
      best = type;
      bestScore = score;
    }
  }
  return best;
}

export interface DeclaredElement {
  /** Identifier usable in relations (alias if present). */
  id: string;
  /** Display label (may equal id). */
  label: string;
  /** Keyword used to declare it (participant, class, ...), or 'implicit'. */
  kind: string;
  /** 1-based line of the declaration (or first usage). */
  line: number;
  explicit: boolean;
}

const NAME = String.raw`("[^"]+"|[\w.$À-ɏ]+)`;
const NAME_NC = String.raw`(?:"[^"]+"|[\w.$À-ɏ]+)`;
const ARROW_IN_LINE = /(<?[-.=~]+(?:\[[^\]]*\])?[-.=~]*[>x\\/o*|]*|<\|[-.]+|[*o]?[-.]{2,}[*o|>]*)/;

function unquote(s: string): string {
  return s.replace(/^"|"$/g, '');
}

/**
 * Collects named elements (participants, classes, components, states, ...),
 * explicitly declared ones first. Used by autocompletion and by the style editor.
 */
export function collectElements(
  source: string,
  type: DiagramType = detectDiagramType(source),
): DeclaredElement[] {
  const result = new Map<string, DeclaredElement>();
  const put = (id: string, label: string, kind: string, line: number, explicit: boolean) => {
    id = unquote(id).trim();
    label = unquote(label).trim();
    if (!id || /^(as|of|on|over|left|right|to|end|else)$/i.test(id)) return;
    const prev = result.get(id);
    if (!prev || (!prev.explicit && explicit)) result.set(id, { id, label, kind, line, explicit });
  };

  const keywords =
    type === 'sequence'
      ? SEQUENCE_PARTICIPANT_KEYWORDS
      : type === 'state'
        ? ['state']
        : [
            ...new Set([
              ...CLASS_KEYWORDS,
              ...DEPLOYMENT_KEYWORDS,
              'object',
              'map',
              'json',
              'state',
              'usecase',
            ]),
          ];
  const kwPattern = keywords
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/\s+/g, '\\s+'))
    .join('|');
  const declRe = new RegExp(String.raw`^\s*(${kwPattern})\s+${NAME}(?:\s+as\s+${NAME})?`, 'i');
  const bracketDecl = /^\s*\[([^\]]+)\](?:\s+as\s+([\w.]+))?/;
  const parenDecl = /^\s*\(([^)]+)\)(?:\s+as\s+([\w.]+))?/;

  const lines = codeLines(source);
  lines.forEach((line, idx) => {
    const n = idx + 1;
    const d = declRe.exec(line);
    if (d) {
      const [, kw, first, second] = d;
      // `participant "Long Name" as L` or `participant L as "Long Name"`
      if (second) {
        const firstQuoted = first.startsWith('"');
        put(
          firstQuoted ? second : first,
          firstQuoted ? first : second,
          kw.toLowerCase().replace(/\s+/g, ' '),
          n,
          true,
        );
      } else {
        put(first, first, kw.toLowerCase().replace(/\s+/g, ' '), n, true);
      }
      return;
    }
    if (type !== 'sequence') {
      const b = bracketDecl.exec(line);
      if (b && !ARROW_IN_LINE.test(line.slice(b[0].length).trim().slice(0, 3))) {
        put(b[2] ?? b[1], b[1], 'component', n, true);
      }
      const p = parenDecl.exec(line);
      if (p && type === 'usecase') put(p[2] ?? p[1], p[1], 'usecase', n, true);
    }
  });

  // Implicit elements from relations / messages.
  const relRe = new RegExp(
    String.raw`^\s*(\[[^\]]+\]|\([^)]+\)|${NAME_NC}|\[\*\])\s*(?:"[^"]*"\s*)?` +
      String.raw`(<?[-.=~]*(?:\[[^\]]*\])?[-.=~]*(?:up|down|left|right|u|d|l|r)?[-.=~]*[>x\\/o*|]*>?)` +
      String.raw`\s*(?:"[^"]*"\s*)?(\[[^\]]+\]|\([^)]+\)|${NAME_NC}|\[\*\])`,
  );
  lines.forEach((line, idx) => {
    const m = relRe.exec(line);
    if (!m) return;
    const arrow = m[2];
    if (!/[-.=~]/.test(arrow) || arrow.length < 2) return;
    for (const side of [m[1], m[3]]) {
      if (side === '[*]') continue;
      if (/^[\[(]/.test(side)) {
        const inner = side.slice(1, -1);
        put(inner, inner, side.startsWith('[') ? 'component' : 'usecase', idx + 1, false);
      } else if (!/^\d/.test(side)) {
        put(side, side, 'implicit', idx + 1, false);
      }
    }
  });

  return [...result.values()];
}

/** Returns a 1-based line number where content can be inserted after `@startuml` (and the managed style block). */
export function insertionLineAfterStart(source: string): number {
  const lines = source.split(/\r\n|\r|\n/);
  let idx = lines.findIndex((l) => /^\s*@start\w+/.test(l));
  if (idx < 0) return 1;
  const endMarker = lines.findIndex((l) => l.includes(STYLE_BLOCK_END));
  if (endMarker > idx) idx = endMarker;
  return idx + 2;
}

export const STYLE_BLOCK_BEGIN = "' ⟪power-editor styles⟫";
export const STYLE_BLOCK_END = "' ⟪/power-editor styles⟫";

/** Escapes a string for use in a RegExp. */
export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

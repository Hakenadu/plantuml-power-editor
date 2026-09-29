import {
  Completion,
  CompletionContext,
  CompletionResult,
  snippetCompletion as snip,
} from '@codemirror/autocomplete';
import {
  CLASS_KEYWORDS,
  DEPLOYMENT_KEYWORDS,
  DiagramType,
  SEQUENCE_PARTICIPANT_KEYWORDS,
  collectElements,
  detectDiagramType,
} from '../core/plantuml-analysis';
import { PLANTUML_COLORS } from '../core/plantuml-colors';

/** Theme ids are provided at runtime by the engine (themes.js). */
let themeIds: string[] = [];
export function setCompletionThemes(ids: string[]): void {
  themeIds = ids;
}

const kw = (label: string, detail?: string, boost = 0): Completion => ({
  label,
  type: 'keyword',
  detail,
  boost,
});

const SEQUENCE_ARROWS: [string, string][] = [
  ['->', 'synchrone Nachricht'],
  ['-->', 'Antwort (gestrichelt)'],
  ['->>', 'asynchrone Nachricht'],
  ['-->>', 'asynchrone Antwort'],
  ['<-', 'Nachricht (rückwärts)'],
  ['<--', 'Antwort (rückwärts)'],
  ['<->', 'bidirektional'],
  ['->x', 'verlorene Nachricht'],
  ['-\\', 'obere Halbspitze'],
  ['-/', 'untere Halbspitze'],
  ['->o', 'Nachricht mit Kreis'],
  ['-[#red]>', 'farbige Nachricht'],
];

const CLASS_ARROWS: [string, string][] = [
  ['<|--', 'Vererbung'],
  ['<|..', 'Realisierung'],
  ['*--', 'Komposition'],
  ['o--', 'Aggregation'],
  ['-->', 'gerichtete Assoziation'],
  ['--', 'Assoziation'],
  ['..>', 'Abhängigkeit'],
  ['..|>', 'implementiert'],
  ['--|>', 'erweitert'],
  ['..', 'gestrichelte Linie'],
  ['-[#red]->', 'farbige Beziehung'],
  ['-up->', 'Beziehung nach oben'],
  ['-left->', 'Beziehung nach links'],
];

const GENERIC_ARROWS: [string, string][] = [
  ['-->', 'Verbindung'],
  ['->', 'kurze Verbindung'],
  ['..>', 'gestrichelt'],
  ['--', 'Linie'],
  ['<-->', 'bidirektional'],
  ['-up->', 'nach oben'],
  ['-down->', 'nach unten'],
  ['-left->', 'nach links'],
  ['-right->', 'nach rechts'],
  ['-[#red]->', 'farbig'],
];

const COMMON_LINE_START: Completion[] = [
  snip('title ${Titel}', { label: 'title', type: 'keyword', detail: 'Diagrammtitel' }),
  snip('header ${Kopfzeile}', { label: 'header', type: 'keyword' }),
  snip('footer ${Fußzeile}', { label: 'footer', type: 'keyword' }),
  snip('caption ${Beschriftung}', { label: 'caption', type: 'keyword' }),
  snip('legend\n\t${Legende}\nendlegend', { label: 'legend', type: 'keyword', detail: 'Block' }),
  kw('skinparam', 'Darstellungsparameter'),
  snip('<style>\n\t${element} {\n\t\tBackGroundColor #${FFFFFF}\n\t}\n</style>', {
    label: '<style>',
    type: 'keyword',
    detail: 'Style-Block',
  }),
  kw('hide'),
  kw('show'),
  snip('scale ${1.5}', { label: 'scale', type: 'keyword' }),
  snip('!theme ${cerulean}', { label: '!theme', type: 'keyword', detail: 'Theme' }),
  snip('!include <${C4/C4_Container}>', {
    label: '!include',
    type: 'keyword',
    detail: 'Standardbibliothek',
  }),
  snip('!define ${NAME} ${value}', { label: '!define', type: 'keyword' }),
  { label: '!option handwritten true', type: 'keyword', detail: 'Handgezeichnet' },
  snip('!procedure ${name}($${arg})\n\t${}\n!endprocedure', {
    label: '!procedure',
    type: 'keyword',
  }),
  snip('note ${left} : ${Notiz}', { label: 'note', type: 'keyword', detail: 'Notiz' }),
];

const SEQUENCE_LINE_START: Completion[] = [
  ...SEQUENCE_PARTICIPANT_KEYWORDS.map((k) =>
    snip(`${k} \${Name}`, { label: k, type: 'keyword', detail: 'Teilnehmer', boost: 2 }),
  ),
  snip('activate ${}', { label: 'activate', type: 'keyword' }),
  snip('deactivate ${}', { label: 'deactivate', type: 'keyword' }),
  snip('destroy ${}', { label: 'destroy', type: 'keyword' }),
  snip('return ${Ergebnis}', { label: 'return', type: 'keyword' }),
  kw('autonumber'),
  kw('autoactivate on'),
  snip('alt ${Bedingung}\n\t${}\nelse ${Sonst}\n\t\nend', {
    label: 'alt',
    type: 'keyword',
    detail: 'Alternative',
  }),
  snip('opt ${Bedingung}\n\t${}\nend', { label: 'opt', type: 'keyword', detail: 'Optional' }),
  snip('loop ${Wiederholung}\n\t${}\nend', { label: 'loop', type: 'keyword', detail: 'Schleife' }),
  snip('par ${}\n\t\nelse\n\t\nend', { label: 'par', type: 'keyword', detail: 'Parallel' }),
  snip('break ${}\n\t\nend', { label: 'break', type: 'keyword' }),
  snip('critical ${}\n\t\nend', { label: 'critical', type: 'keyword' }),
  snip('group ${Name}\n\t${}\nend', { label: 'group', type: 'keyword' }),
  snip('box "${Titel}" #${LightBlue}\n\t${}\nend box', { label: 'box', type: 'keyword' }),
  snip('ref over ${A}, ${B} : ${Referenz}', { label: 'ref over', type: 'keyword' }),
  kw('else'),
  kw('end'),
  snip('== ${Abschnitt} ==', { label: '==', type: 'keyword', detail: 'Trenner' }),
  snip('... ${Verzögerung} ...', { label: '...', type: 'keyword', detail: 'Verzögerung' }),
  kw('|||', 'Abstand'),
  kw('newpage'),
  snip('hnote over ${A} : ${Text}', { label: 'hnote', type: 'keyword' }),
  snip('rnote over ${A} : ${Text}', { label: 'rnote', type: 'keyword' }),
  kw('hide footbox'),
];

const CLASS_LINE_START: Completion[] = [
  ...CLASS_KEYWORDS.map((k) =>
    snip(`${k} \${Name}`, { label: k, type: 'keyword', detail: 'Klassifizierer', boost: 2 }),
  ),
  snip('class ${Name} {\n\t${+feld: Typ}\n\t+methode()\n}', {
    label: 'class {…}',
    type: 'keyword',
    detail: 'mit Body',
  }),
  snip('package ${Name} {\n\t${}\n}', { label: 'package', type: 'keyword' }),
  snip('namespace ${Name} {\n\t${}\n}', { label: 'namespace', type: 'keyword' }),
  kw('hide empty members'),
  kw('hide circle'),
  kw('left to right direction'),
  kw('top to bottom direction'),
  kw('allowmixing'),
  kw('together'),
];

const ACTIVITY_LINE_START: Completion[] = [
  kw('start', undefined, 3),
  kw('stop', undefined, 2),
  kw('end'),
  kw('kill'),
  kw('detach'),
  snip(':${Aktion};', { label: ':…;', type: 'keyword', detail: 'Aktion', boost: 3 }),
  snip('if (${Bedingung}?) then (${ja})\n\t${}\nelse (${nein})\n\t\nendif', {
    label: 'if',
    type: 'keyword',
    detail: 'Verzweigung',
    boost: 2,
  }),
  snip('elseif (${Bedingung}) then (${ja})', { label: 'elseif', type: 'keyword' }),
  snip('else (${nein})', { label: 'else', type: 'keyword' }),
  kw('endif'),
  snip('while (${Bedingung}?) is (${ja})\n\t${}\nendwhile (${nein})', {
    label: 'while',
    type: 'keyword',
    detail: 'Schleife',
  }),
  kw('endwhile'),
  snip('repeat\n\t${}\nrepeat while (${Bedingung}?)', { label: 'repeat', type: 'keyword' }),
  snip('fork\n\t${}\nfork again\n\t\nend fork', {
    label: 'fork',
    type: 'keyword',
    detail: 'Parallel',
  }),
  kw('fork again'),
  kw('end fork'),
  snip('split\n\t${}\nsplit again\n\t\nend split', { label: 'split', type: 'keyword' }),
  snip('switch (${Wert})\ncase (${A})\n\t${}\nendswitch', { label: 'switch', type: 'keyword' }),
  snip('partition ${Name} {\n\t${}\n}', { label: 'partition', type: 'keyword' }),
  snip('|${Swimlane}|', { label: '|Swimlane|', type: 'keyword', detail: 'Swimlane' }),
  snip('note right\n\t${Notiz}\nend note', { label: 'note right', type: 'keyword' }),
  kw('backward'),
];

const STATE_LINE_START: Completion[] = [
  snip('state ${Name}', { label: 'state', type: 'keyword', boost: 2 }),
  snip('state ${Name} {\n\t${}\n}', {
    label: 'state {…}',
    type: 'keyword',
    detail: 'zusammengesetzt',
  }),
  snip('[*] --> ${Start}', { label: '[*] -->', type: 'keyword', detail: 'Startzustand', boost: 2 }),
  snip('state ${Name} <<choice>>', { label: 'choice', type: 'keyword' }),
  snip('state ${Name} <<fork>>', { label: 'fork', type: 'keyword' }),
  kw('hide empty description'),
];

const USECASE_LINE_START: Completion[] = [
  snip('actor ${Name}', { label: 'actor', type: 'keyword', boost: 2 }),
  snip('usecase (${Name}) as ${UC}', { label: 'usecase', type: 'keyword', boost: 2 }),
  snip('(${Anwendungsfall})', { label: '(…)', type: 'keyword', detail: 'Use Case' }),
  snip('rectangle ${System} {\n\t${}\n}', {
    label: 'rectangle',
    type: 'keyword',
    detail: 'Systemgrenze',
  }),
  snip('package ${Name} {\n\t${}\n}', { label: 'package', type: 'keyword' }),
  kw('left to right direction'),
];

const DEPLOYMENT_LINE_START: Completion[] = [
  ...DEPLOYMENT_KEYWORDS.map((k) => snip(`${k} \${Name}`, { label: k, type: 'keyword', boost: 1 })),
  snip('[${Komponente}]', { label: '[…]', type: 'keyword', detail: 'Komponente' }),
  snip('node ${Name} {\n\t${}\n}', { label: 'node {…}', type: 'keyword' }),
  kw('left to right direction'),
];

const MINDMAP_LINE_START: Completion[] = [
  snip('* ${Wurzel}', { label: '*', type: 'keyword', detail: 'Ebene 1' }),
  snip('** ${Knoten}', { label: '**', type: 'keyword', detail: 'Ebene 2' }),
  snip('*** ${Knoten}', { label: '***', type: 'keyword', detail: 'Ebene 3' }),
  snip('left side', { label: 'left side', type: 'keyword' }),
];

const DIRECTIVES: Completion[] = [
  '@startuml',
  '@enduml',
  '@startmindmap',
  '@endmindmap',
  '@startwbs',
  '@endwbs',
  '@startgantt',
  '@endgantt',
  '@startjson',
  '@endjson',
  '@startyaml',
  '@endyaml',
  '@startsalt',
  '@endsalt',
].map((l) => ({ label: l, type: 'keyword' }));

const SKINPARAMS = [
  'monochrome true',
  'shadowing false',
  'roundCorner 15',
  'backgroundColor',
  'defaultFontName',
  'defaultFontSize',
  'defaultFontColor',
  'linetype ortho',
  'linetype polyline',
  'nodesep 60',
  'ranksep 60',
  'dpi 150',
  'ArrowColor',
  'ArrowThickness',
  'maxMessageSize 150',
  'responseMessageBelowArrow true',
  'sequenceMessageAlign center',
  'ParticipantPadding 20',
  'BoxPadding 10',
  'lifelineStrategy solid',
  'classAttributeIconSize 0',
  'packageStyle rectangle',
  'componentStyle uml2',
  'componentStyle rectangle',
  'actorStyle awesome',
  'actorStyle hollow',
  'usecaseBorderThickness 2',
  'noteBackgroundColor',
  'noteBorderColor',
  'titleFontSize 20',
  'wrapWidth 200',
].map((l) => ({ label: l, type: 'property' }) as Completion);

const STYLE_PROPS = [
  'BackGroundColor',
  'LineColor',
  'LineThickness',
  'LineStyle',
  'FontColor',
  'FontName',
  'FontSize',
  'FontStyle',
  'RoundCorner',
  'DiagonalCorner',
  'Shadowing',
  'Padding',
  'Margin',
  'HorizontalAlignment',
  'MaximumWidth',
  'MinimumWidth',
  'HyperLinkColor',
].map((l) => ({ label: l, type: 'property' }) as Completion);

const STYLE_SELECTORS = [
  'document',
  'root',
  'element',
  'arrow',
  'note',
  'title',
  'legend',
  'header',
  'footer',
  'caption',
  'sequenceDiagram',
  'classDiagram',
  'activityDiagram',
  'componentDiagram',
  'usecaseDiagram',
  'stateDiagram',
  'mindmapDiagram',
  'wbsDiagram',
  'ganttDiagram',
  'participant',
  'actor',
  'lifeLine',
  'group',
  'groupHeader',
  'reference',
  'box',
  'class',
  'interface',
  'activity',
  'diamond',
  'partition',
  'swimlane',
  'component',
  'node',
  'database',
  'usecase',
  'state',
  'node',
  'rootNode',
  'leafNode',
].map((l) => ({ label: l, type: 'type' }) as Completion);

function elementCompletions(source: string, type: DiagramType, boost = 5): Completion[] {
  return collectElements(source, type).map((e) => ({
    label: /[^\w.]/.test(e.id) ? `"${e.id}"` : e.id,
    displayLabel: e.id,
    detail: e.label !== e.id ? `${e.kind} · ${e.label}` : e.kind,
    type: type === 'class' ? 'class' : 'variable',
    boost,
  }));
}

function arrowCompletions(type: DiagramType): Completion[] {
  const list =
    type === 'sequence'
      ? SEQUENCE_ARROWS
      : type === 'class' || type === 'object'
        ? CLASS_ARROWS
        : GENERIC_ARROWS;
  return list.map(([label, detail], i) => ({
    label,
    detail,
    type: 'operator',
    boost: 10 - i / 10,
  }));
}

function lineStartCompletions(type: DiagramType): Completion[] {
  switch (type) {
    case 'sequence':
      return [...SEQUENCE_LINE_START, ...COMMON_LINE_START];
    case 'class':
    case 'object':
      return [
        ...CLASS_LINE_START,
        snip('object ${Name}', { label: 'object', type: 'keyword' }),
        ...COMMON_LINE_START,
      ];
    case 'activity':
      return [...ACTIVITY_LINE_START, ...COMMON_LINE_START];
    case 'state':
      return [...STATE_LINE_START, ...COMMON_LINE_START];
    case 'usecase':
      return [...USECASE_LINE_START, ...COMMON_LINE_START];
    case 'component':
    case 'deployment':
      return [...DEPLOYMENT_LINE_START, ...COMMON_LINE_START];
    case 'mindmap':
    case 'wbs':
      return [...MINDMAP_LINE_START, ...COMMON_LINE_START];
    default:
      return COMMON_LINE_START;
  }
}

const ARROW_AT_END =
  /(?:^|\s|[\w"\])])(<?\|?[-.=~]+(?:\[[^\]]*\])?(?:up|down|left|right|u|d|l|r)?[-.=~]*(?:\|?>{1,2}|[xo*]|\\\\?|\/\/?)?)\s*$/;

function isRightOfArrow(beforeWord: string): boolean {
  const m = ARROW_AT_END.exec(beforeWord);
  if (!m) return false;
  const left = beforeWord.slice(0, m.index + (m[0].length - m[0].trimStart().length)).trim();
  if (!left || /^(note|title|hide|show|skinparam)\b/i.test(left)) return false;
  const arrow = m[1];
  return /\s$/.test(beforeWord) || /[>xo*|\\/]$/.test(arrow);
}

function inStyleBlock(ctx: CompletionContext): boolean {
  const before = ctx.state.sliceDoc(0, ctx.pos);
  const open = before.lastIndexOf('<style>');
  return open >= 0 && before.lastIndexOf('</style>') < open;
}

/** The core completion source. Pure function of document + cursor. */
export function plantumlCompletions(ctx: CompletionContext): CompletionResult | null {
  const line = ctx.state.doc.lineAt(ctx.pos);
  const prefix = line.text.slice(0, ctx.pos - line.from);
  const source = ctx.state.doc.toString();
  const type = detectDiagramType(source);
  const word = ctx.matchBefore(/[@!]?[\w.$À-ɏ"]*$/);
  const from = word ? word.from : ctx.pos;
  const typed = word?.text ?? '';
  const beforeWord = prefix.slice(0, prefix.length - typed.length);
  const explicit = ctx.explicit;

  const result = (
    options: Completion[],
    validFor: RegExp = /^[@!]?[\w.$"À-ɏ]*$/,
  ): CompletionResult | null => (options.length ? { from, options, validFor } : null);

  // Inside a line comment -> no completion
  if (/^\s*'/.test(prefix)) return null;

  // <style> block: selectors at depth 0, properties inside braces.
  if (inStyleBlock(ctx)) {
    const before = ctx.state.sliceDoc(
      ctx.state.doc.toString().lastIndexOf('<style>', ctx.pos),
      ctx.pos,
    );
    const depth = (before.match(/\{/g) ?? []).length - (before.match(/\}/g) ?? []).length;
    if (/^\s*[\w.-]*$/.test(prefix)) {
      return depth > 0 ? result([...STYLE_PROPS, ...STYLE_SELECTORS]) : result(STYLE_SELECTORS);
    }
    if (/^\s*\w*Color\s+#?\w*$/i.test(prefix)) return colorResult(ctx);
    if (/^\s*FontStyle\s+\w*$/i.test(prefix))
      return result(
        ['plain', 'bold', 'italic', 'bold italic'].map((l) => ({ label: l, type: 'constant' })),
      );
    return null;
  }

  // Colors: `#` followed by partial name
  const color = colorResult(ctx);
  if (color) return color;

  // Directives
  if (/^\s*@\w*$/.test(prefix)) return result(DIRECTIVES);

  // !theme <name>
  if (/^\s*!theme\s+[\w-]*$/.test(prefix)) {
    return result(
      themeIds.map((id) => ({ label: id, type: 'constant', detail: 'Theme' })),
      /^[\w-]*$/,
    );
  }

  // skinparam <name>
  if (/^\s*skinparam\s+\w*$/i.test(prefix)) return result(SKINPARAMS);

  // Message / label text after ':' -> nothing to complete
  if (/[^:]:(?!:)[^>]*$/.test(beforeWord) && !/^\s*:/.test(prefix) && !/\bas\b/.test(beforeWord)) {
    return null;
  }
  // Activity label  :text  (until ;)
  if (/^\s*:[^;]*$/.test(prefix)) return null;

  const elements = elementCompletions(source, type);

  // Right-hand side of an arrow: only things that can stand there.
  if (isRightOfArrow(beforeWord)) {
    const extras: Completion[] = [];
    if (type === 'sequence') {
      extras.push({ label: ']', detail: 'nach außen (rechts)', type: 'operator' });
      extras.push({ label: '[', detail: 'nach außen (links)', type: 'operator' });
    }
    if (type === 'state')
      extras.push({ label: '[*]', detail: 'Endzustand', type: 'operator', boost: 1 });
    return result([...elements, ...extras]);
  }

  // After `Alice ` (a known element at line start) -> arrows.
  const lhs = /^\s*("[^"]+"|\[[^\]]+\]|\([^)]+\)|\[\*\]|[\w.$À-ɏ]+)\s+$/.exec(beforeWord);
  if (
    lhs &&
    !/^(participant|actor|class|interface|state|component|node|note|title|activate|deactivate|destroy|skinparam|hide|show|package|namespace|usecase|if|while|else|return|alt|opt|loop|group|ref)$/i.test(
      lhs[1],
    )
  ) {
    const known = collectElements(source, type).some(
      (e) => e.id === lhs[1].replace(/^["[(]|["\])]$/g, '') || lhs[1] === '[*]',
    );
    if (known || explicit) {
      return {
        from: ctx.pos - typed.length,
        options: arrowCompletions(type),
        validFor: /^[-.<>|*ox#\[\]\w]*$/,
      };
    }
  }

  // Arrow being typed right now (e.g. `Alice -` )
  const typingArrow = /^\s*\S+\s*([-.<][-.<>|*ox]*)$/.exec(prefix);
  if (typingArrow) {
    return {
      from: ctx.pos - typingArrow[1].length,
      options: arrowCompletions(type),
      validFor: /^[-.<>|*ox]*$/,
    };
  }

  // Keywords expecting an element name
  if (/^\s*(activate|deactivate|destroy|create)\s+\S*$/i.test(prefix)) return result(elements);
  if (
    /^\s*[hr]?note\s+(left|right)\s+of\s+[^:]*$/i.test(prefix) ||
    /^\s*[hr]?note\s+over\s+[^:]*$/i.test(prefix)
  ) {
    return result(elements);
  }
  if (/^\s*ref\s+over\s+[^:]*$/i.test(prefix)) return result(elements);
  if (/^\s*[hr]?note\s+\w*$/i.test(prefix)) {
    const opts =
      type === 'sequence'
        ? ['left of', 'right of', 'over', 'across', 'left', 'right']
        : ['left of', 'right of', 'top of', 'bottom of', 'left', 'right', 'as', 'on link'];
    return result(opts.map((l) => ({ label: l, type: 'keyword' })));
  }
  if (/^\s*(class|interface|abstract|enum)\s+\S+\s+\w*$/i.test(prefix) && type === 'class') {
    return result(['extends', 'implements', '<<', '{'].map((l) => ({ label: l, type: 'keyword' })));
  }
  if (
    /^\s*(\w+)\s+(\S+|"[^"]+")\s+\w*$/.test(prefix) &&
    SEQUENCE_PARTICIPANT_KEYWORDS.includes(/^\s*(\w+)/.exec(prefix)![1])
  ) {
    return result(['as', 'order', '<<'].map((l) => ({ label: l, type: 'keyword' })));
  }
  if (/^\s*(\w+)\s+\S+\s+as\s+\S*$/.test(prefix)) return null; // naming an alias
  if (
    new RegExp(
      `^\\s*(${[...SEQUENCE_PARTICIPANT_KEYWORDS, ...CLASS_KEYWORDS, ...DEPLOYMENT_KEYWORDS, 'state'].join('|')})\\s+\\S*$`,
      'i',
    ).test(prefix)
  ) {
    return null; // naming a new element
  }
  if (/^\s*hide\s+\w*$/i.test(prefix) || /^\s*show\s+\w*$/i.test(prefix)) {
    return result(
      [
        'footbox',
        'empty members',
        'empty methods',
        'empty fields',
        'circle',
        'stereotype',
        'unlinked',
        '@unlinked',
        'empty description',
      ].map((l) => ({
        label: l,
        type: 'keyword',
      })),
    );
  }

  // Line start
  if (/^\s*$/.test(beforeWord)) {
    if (!typed && !explicit) return null;
    return result([
      ...lineStartCompletions(type),
      ...elementCompletions(source, type, 1),
      ...DIRECTIVES.map((d) => ({ ...d, boost: -5 })),
    ]);
  }

  return null;
}

function colorResult(ctx: CompletionContext): CompletionResult | null {
  const m = ctx.matchBefore(/#[\w]*$/);
  if (!m) return null;
  return {
    from: m.from,
    options: PLANTUML_COLORS.map(([name, hex]) => ({
      label: `#${name}`,
      type: 'constant',
      detail: hex,
      info: () => {
        const el = document.createElement('div');
        el.className = 'pe-color-info';
        el.innerHTML = `<span style="display:inline-block;width:28px;height:28px;border-radius:8px;background:${hex};border:1px solid #8886;vertical-align:middle"></span> <code>${hex}</code>`;
        return el;
      },
    })),
    validFor: /^#\w*$/,
  };
}

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

/** Localizable texts used by the completion source (see `Translations['completion']`). */
export interface CompletionTexts {
  sequenceArrows: Record<string, string>;
  classArrows: Record<string, string>;
  genericArrows: Record<string, string>;
  detail: Record<string, string | ((n: number) => string)> & { level: (n: number) => string };
  placeholder: Record<string, string>;
}

type Catalog = ReturnType<typeof buildCatalog>;

/** Language-dependent completion catalogue; rebuilt whenever the UI language changes. */
function buildCatalog(texts: CompletionTexts) {
  const d = texts.detail as Record<string, string> & { level: (n: number) => string };
  const p = texts.placeholder;
  /** Snippet placeholder field, e.g. `${Titel}`. */
  const ph = (key: string) => '${' + p[key] + '}';

  const common: Completion[] = [
    snip(`title ${ph('title')}`, { label: 'title', type: 'keyword', detail: d['title'] }),
    snip(`header ${ph('header')}`, { label: 'header', type: 'keyword' }),
    snip(`footer ${ph('footer')}`, { label: 'footer', type: 'keyword' }),
    snip(`caption ${ph('caption')}`, { label: 'caption', type: 'keyword' }),
    snip(`legend\n\t${ph('legend')}\nendlegend`, {
      label: 'legend',
      type: 'keyword',
      detail: d['block'],
    }),
    kw('skinparam', d['skinparam']),
    snip('<style>\n\t${element} {\n\t\tBackGroundColor #${FFFFFF}\n\t}\n</style>', {
      label: '<style>',
      type: 'keyword',
      detail: d['styleBlock'],
    }),
    kw('hide'),
    kw('show'),
    snip('scale ${1.5}', { label: 'scale', type: 'keyword' }),
    snip('!theme ${cerulean}', { label: '!theme', type: 'keyword', detail: d['theme'] }),
    snip('!include <${C4/C4_Container}>', {
      label: '!include',
      type: 'keyword',
      detail: d['stdlib'],
    }),
    snip('!define ${NAME} ${value}', { label: '!define', type: 'keyword' }),
    { label: '!option handwritten true', type: 'keyword', detail: d['handwritten'] },
    snip('!procedure ${name}($${arg})\n\t${}\n!endprocedure', {
      label: '!procedure',
      type: 'keyword',
    }),
    snip('note ${left} : ' + ph('note'), { label: 'note', type: 'keyword', detail: d['note'] }),
  ];

  const sequence: Completion[] = [
    ...SEQUENCE_PARTICIPANT_KEYWORDS.map((k) =>
      snip(`${k} ${ph('name')}`, { label: k, type: 'keyword', detail: d['participant'], boost: 2 }),
    ),
    snip('activate ${}', { label: 'activate', type: 'keyword' }),
    snip('deactivate ${}', { label: 'deactivate', type: 'keyword' }),
    snip('destroy ${}', { label: 'destroy', type: 'keyword' }),
    snip(`return ${ph('result')}`, { label: 'return', type: 'keyword' }),
    kw('autonumber'),
    kw('autoactivate on'),
    snip(`alt ${ph('condition')}\n\t` + '${}' + `\nelse ${ph('otherwise')}\n\t\nend`, {
      label: 'alt',
      type: 'keyword',
      detail: d['alternative'],
    }),
    snip(`opt ${ph('condition')}\n\t` + '${}\nend', {
      label: 'opt',
      type: 'keyword',
      detail: d['optional'],
    }),
    snip(`loop ${ph('repetition')}\n\t` + '${}\nend', {
      label: 'loop',
      type: 'keyword',
      detail: d['loop'],
    }),
    snip('par ${}\n\t\nelse\n\t\nend', { label: 'par', type: 'keyword', detail: d['parallel'] }),
    snip('break ${}\n\t\nend', { label: 'break', type: 'keyword' }),
    snip('critical ${}\n\t\nend', { label: 'critical', type: 'keyword' }),
    snip(`group ${ph('name')}\n\t` + '${}\nend', { label: 'group', type: 'keyword' }),
    snip(`box "${ph('title')}" #` + '${LightBlue}\n\t${}\nend box', {
      label: 'box',
      type: 'keyword',
    }),
    snip('ref over ${A}, ${B} : ' + ph('reference'), { label: 'ref over', type: 'keyword' }),
    kw('else'),
    kw('end'),
    snip(`== ${ph('section')} ==`, { label: '==', type: 'keyword', detail: d['divider'] }),
    snip(`... ${ph('delay')} ...`, { label: '...', type: 'keyword', detail: d['delay'] }),
    kw('|||', d['spacing']),
    kw('newpage'),
    snip('hnote over ${A} : ${Text}', { label: 'hnote', type: 'keyword' }),
    snip('rnote over ${A} : ${Text}', { label: 'rnote', type: 'keyword' }),
    kw('hide footbox'),
  ];

  const classes: Completion[] = [
    ...CLASS_KEYWORDS.map((k) =>
      snip(`${k} ${ph('name')}`, { label: k, type: 'keyword', detail: d['classifier'], boost: 2 }),
    ),
    snip(`class ${ph('name')} {\n\t${ph('field')}\n\t${p['method']}\n}`, {
      label: 'class {…}',
      type: 'keyword',
      detail: d['withBody'],
    }),
    snip(`package ${ph('name')} {\n\t` + '${}\n}', { label: 'package', type: 'keyword' }),
    snip(`namespace ${ph('name')} {\n\t` + '${}\n}', { label: 'namespace', type: 'keyword' }),
    kw('hide empty members'),
    kw('hide circle'),
    kw('left to right direction'),
    kw('top to bottom direction'),
    kw('allowmixing'),
    kw('together'),
  ];

  const activity: Completion[] = [
    kw('start', undefined, 3),
    kw('stop', undefined, 2),
    kw('end'),
    kw('kill'),
    kw('detach'),
    snip(`:${ph('action')};`, { label: ':…;', type: 'keyword', detail: d['action'], boost: 3 }),
    snip(
      `if (${ph('condition')}?) then (${ph('yes')})\n\t` +
        '${}' +
        `\nelse (${ph('no')})\n\t\nendif`,
      { label: 'if', type: 'keyword', detail: d['branch'], boost: 2 },
    ),
    snip(`elseif (${ph('condition')}) then (${ph('yes')})`, { label: 'elseif', type: 'keyword' }),
    snip(`else (${ph('no')})`, { label: 'else', type: 'keyword' }),
    kw('endif'),
    snip(`while (${ph('condition')}?) is (${ph('yes')})\n\t` + '${}' + `\nendwhile (${ph('no')})`, {
      label: 'while',
      type: 'keyword',
      detail: d['loop'],
    }),
    kw('endwhile'),
    snip('repeat\n\t${}\nrepeat while (' + ph('condition') + '?)', {
      label: 'repeat',
      type: 'keyword',
    }),
    snip('fork\n\t${}\nfork again\n\t\nend fork', {
      label: 'fork',
      type: 'keyword',
      detail: d['parallel'],
    }),
    kw('fork again'),
    kw('end fork'),
    snip('split\n\t${}\nsplit again\n\t\nend split', { label: 'split', type: 'keyword' }),
    snip(`switch (${ph('value')})\ncase (` + '${A})\n\t${}\nendswitch', {
      label: 'switch',
      type: 'keyword',
    }),
    snip(`partition ${ph('name')} {\n\t` + '${}\n}', { label: 'partition', type: 'keyword' }),
    snip('|${Swimlane}|', { label: '|Swimlane|', type: 'keyword', detail: 'Swimlane' }),
    snip(`note right\n\t${ph('note')}\nend note`, { label: 'note right', type: 'keyword' }),
    kw('backward'),
  ];

  const state: Completion[] = [
    snip(`state ${ph('name')}`, { label: 'state', type: 'keyword', boost: 2 }),
    snip(`state ${ph('name')} {\n\t` + '${}\n}', {
      label: 'state {…}',
      type: 'keyword',
      detail: d['composite'],
    }),
    snip(`[*] --> ${ph('start')}`, {
      label: '[*] -->',
      type: 'keyword',
      detail: d['initialState'],
      boost: 2,
    }),
    snip(`state ${ph('name')} <<choice>>`, { label: 'choice', type: 'keyword' }),
    snip(`state ${ph('name')} <<fork>>`, { label: 'fork', type: 'keyword' }),
    kw('hide empty description'),
  ];

  const usecase: Completion[] = [
    snip(`actor ${ph('name')}`, { label: 'actor', type: 'keyword', boost: 2 }),
    snip(`usecase (${ph('name')}) as ` + '${UC}', { label: 'usecase', type: 'keyword', boost: 2 }),
    snip(`(${ph('useCase')})`, { label: '(…)', type: 'keyword', detail: d['useCase'] }),
    snip(`rectangle ${ph('system')} {\n\t` + '${}\n}', {
      label: 'rectangle',
      type: 'keyword',
      detail: d['systemBoundary'],
    }),
    snip(`package ${ph('name')} {\n\t` + '${}\n}', { label: 'package', type: 'keyword' }),
    kw('left to right direction'),
  ];

  const deployment: Completion[] = [
    ...DEPLOYMENT_KEYWORDS.map((k) =>
      snip(`${k} ${ph('name')}`, { label: k, type: 'keyword', boost: 1 }),
    ),
    snip(`[${ph('component')}]`, { label: '[…]', type: 'keyword', detail: d['component'] }),
    snip(`node ${ph('name')} {\n\t` + '${}\n}', { label: 'node {…}', type: 'keyword' }),
    kw('left to right direction'),
  ];

  const mindmap: Completion[] = [
    snip(`* ${ph('root')}`, { label: '*', type: 'keyword', detail: d.level(1) }),
    snip(`** ${ph('node')}`, { label: '**', type: 'keyword', detail: d.level(2) }),
    snip(`*** ${ph('node')}`, { label: '***', type: 'keyword', detail: d.level(3) }),
    snip('left side', { label: 'left side', type: 'keyword' }),
  ];

  const object = snip(`object ${ph('name')}`, { label: 'object', type: 'keyword' });

  return {
    texts,
    detail: d,
    common,
    sequence,
    classes,
    activity,
    state,
    usecase,
    deployment,
    mindmap,
    object,
  };
}

let catalog: Catalog | null = null;

/** Sets the language of completion details and snippet placeholders. */
export function setCompletionTexts(texts: CompletionTexts): void {
  if (catalog?.texts !== texts) catalog = buildCatalog(texts);
}

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

function arrowCompletions(type: DiagramType, c: CompletionTexts): Completion[] {
  const list =
    type === 'sequence'
      ? c.sequenceArrows
      : type === 'class' || type === 'object'
        ? c.classArrows
        : c.genericArrows;
  return Object.entries(list).map(([label, detail], i) => ({
    label,
    detail,
    type: 'operator',
    boost: 10 - i / 10,
  }));
}

function lineStartCompletions(type: DiagramType, cat: Catalog): Completion[] {
  switch (type) {
    case 'sequence':
      return [...cat.sequence, ...cat.common];
    case 'class':
    case 'object':
      return [...cat.classes, cat.object, ...cat.common];
    case 'activity':
      return [...cat.activity, ...cat.common];
    case 'state':
      return [...cat.state, ...cat.common];
    case 'usecase':
      return [...cat.usecase, ...cat.common];
    case 'component':
    case 'deployment':
      return [...cat.deployment, ...cat.common];
    case 'mindmap':
    case 'wbs':
      return [...cat.mindmap, ...cat.common];
    default:
      return cat.common;
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
  const cat = catalog;
  if (!cat) return null;
  const detail = cat.detail;
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
      themeIds.map((id) => ({ label: id, type: 'constant', detail: detail['theme'] })),
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
      extras.push({ label: ']', detail: detail['outRight'], type: 'operator' });
      extras.push({ label: '[', detail: detail['outLeft'], type: 'operator' });
    }
    if (type === 'state')
      extras.push({ label: '[*]', detail: detail['finalState'], type: 'operator', boost: 1 });
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
        options: arrowCompletions(type, cat.texts),
        validFor: /^[-.<>|*ox#\[\]\w]*$/,
      };
    }
  }

  // Arrow being typed right now (e.g. `Alice -` )
  const typingArrow = /^\s*\S+\s*([-.<][-.<>|*ox]*)$/.exec(prefix);
  if (typingArrow) {
    return {
      from: ctx.pos - typingArrow[1].length,
      options: arrowCompletions(type, cat.texts),
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
      ...lineStartCompletions(type, cat),
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

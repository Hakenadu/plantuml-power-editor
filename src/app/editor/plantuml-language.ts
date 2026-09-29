import {
  HighlightStyle,
  LanguageSupport,
  StreamLanguage,
  StringStream,
  syntaxHighlighting,
} from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

export const KEYWORDS = new Set(
  `participant actor boundary control entity database collections queue as order
  activate deactivate destroy create autonumber autoactivate return
  alt else opt loop par par2 break critical group end ref over box newpage
  note hnote rnote left right top bottom of on link across endnote
  class interface abstract enum annotation extends implements namespace package
  dataclass record struct exception metaclass protocol stereotype
  component node cloud artifact folder frame storage card agent stack hexagon file
  usecase rectangle person label process port portin portout circle
  state object map json
  start stop kill detach if then elseif endif while endwhile is not repeat backward
  fork again split merge partition swimlane case switch endswitch
  title header footer legend caption endlegend endheader endfooter scale
  skinparam hide show remove restore skin
  left to right direction top bottom up down
  allowmixing mainframe together
  robust concise clock binary analog highlight
  endif endwhile endfork endsplit endswitch`.split(/\s+/),
);

const DIRECTIVE_RE = /^@(start|end)\w*/;
const PREPROC_RE = /^!(\w+)/;

interface PumlState {
  inBlockComment: boolean;
  inStyle: boolean;
  inActivityLabel: boolean;
  inStyleBlock: number;
  lineStart: boolean;
  afterColon: boolean;
}

const COLOR_NAMES_RE = /^#(?:[0-9a-fA-F]{3,8}\b|[A-Za-z]+)/;

function tokenStyle(stream: StringStream, state: PumlState): string | null {
  if (stream.sol()) {
    state.lineStart = true;
    state.afterColon = false;
  }

  // Block comments  /' ... '/
  if (state.inBlockComment) {
    if (stream.skipTo("'/")) {
      stream.match("'/");
      state.inBlockComment = false;
    } else stream.skipToEnd();
    return 'comment';
  }

  // Multi-line activity labels  :foo
  //                              bar;
  if (state.inActivityLabel) {
    if (stream.skipTo(';')) {
      stream.next();
      state.inActivityLabel = false;
    } else stream.skipToEnd();
    return 'string';
  }

  if (stream.eatSpace()) return null;

  const wasLineStart = state.lineStart;
  state.lineStart = false;

  if (stream.match("/'")) {
    state.inBlockComment = true;
    return tokenStyle(stream, state) ?? 'comment';
  }

  if (wasLineStart && stream.peek() === "'") {
    stream.skipToEnd();
    return 'comment';
  }

  // <style> ... </style>
  if (stream.match(/^<\/?style>/i)) {
    state.inStyle = !stream.current().startsWith('</');
    return 'meta';
  }
  if (state.inStyle) {
    if (stream.match(/^[{}]/)) return 'brace';
    if (COLOR_NAMES_RE.test(stream.string.slice(stream.pos)) && stream.match(COLOR_NAMES_RE))
      return 'color';
    if (stream.match(/^\d+(\.\d+)?/)) return 'number';
    if (wasLineStart && stream.match(/^[.\w-]+(?=\s*\{)/)) return 'typeName';
    if (wasLineStart && stream.match(/^\w+/)) return 'propertyName';
    stream.next();
    return null;
  }

  if (wasLineStart && stream.match(DIRECTIVE_RE)) return 'meta';
  if (wasLineStart && stream.match(PREPROC_RE)) return 'processing';

  if (state.afterColon) {
    stream.skipToEnd();
    return 'string';
  }

  if (stream.peek() === '"') {
    stream.next();
    while (!stream.eol()) {
      const ch = stream.next();
      if (ch === '\\') stream.next();
      else if (ch === '"') break;
    }
    return 'string';
  }

  if (stream.match(/^<<[^>]*>>/)) return 'annotation';

  if (stream.match(COLOR_NAMES_RE)) return 'color';

  // Activity label at line start
  if (wasLineStart && stream.peek() === ':') {
    stream.next();
    if (stream.skipTo(';')) {
      stream.next();
    } else {
      stream.skipToEnd();
      state.inActivityLabel = true;
    }
    return 'string';
  }

  // Swimlanes |Lane|
  if (wasLineStart && stream.match(/^\|[^|]+\|/)) return 'typeName';

  // [Component], (UseCase), [*]
  if (stream.match(/^\[\*\]/)) return 'atom';
  if (stream.match(/^\[[^\]\-]*\](?!\s*-)/) || stream.match(/^\[[^\]]+\]/)) return 'typeName';
  if (stream.match(/^\((?!\s)[^()]*\)(?=\s*(as|-|\.|<|$|#|<<))/)) return 'typeName';

  // Arrows:  -> --> ->> <|-- ..> -[#red]-> o-- *--
  if (
    stream.match(
      /^(<\|?|[*ox}#+^])?[-.=~]+(\[[^\]]*\])?(up|down|left|right|u|d|l|r)?[-.=~]*(\|?>{1,2}|[*ox{#+^]|\\\\|\/\/|\\|\/)?(?![\w])/,
    )
  ) {
    const tok = stream.current();
    if (/[-.=~]/.test(tok) && tok.length >= 2) return 'operator';
    if (/[<>]/.test(tok)) return 'operator';
    stream.backUp(tok.length - 1);
    return null;
  }
  if (stream.match(/^<-+|^<\|/)) return 'operator';

  // Message label after ':'
  if (stream.peek() === ':') {
    stream.next();
    state.afterColon = true;
    return 'punctuation';
  }

  if (stream.match(/^[+\-#~](?=\s*\w)/)) return 'modifier';
  if (stream.match(/^\{(static|abstract|classifier|field|method)\}/)) return 'modifier';
  if (stream.match(/^\d+(\.\d+)?/)) return 'number';
  if (stream.match(/^[{}]/)) return 'brace';

  if (stream.match(/^[A-Za-z_À-ɏ][\w.$À-ɏ]*/)) {
    const word = stream.current();
    if (KEYWORDS.has(word.toLowerCase())) return 'keyword';
    return /^[A-Z]/.test(word) ? 'typeName' : 'variableName';
  }

  stream.next();
  return null;
}

export const plantumlStreamLanguage = StreamLanguage.define<PumlState>({
  name: 'plantuml',
  startState: () => ({
    inBlockComment: false,
    inStyle: false,
    inActivityLabel: false,
    inStyleBlock: 0,
    lineStart: true,
    afterColon: false,
  }),
  copyState: (s) => ({ ...s }),
  token: tokenStyle,
  blankLine: (s) => {
    s.lineStart = true;
    s.afterColon = false;
  },
  tokenTable: {
    color: t.color,
    processing: t.processingInstruction,
    annotation: t.annotation,
    modifier: t.modifier,
    brace: t.brace,
    propertyName: t.propertyName,
    punctuation: t.punctuation,
  },
  languageData: {
    commentTokens: { line: "'", block: { open: "/'", close: "'/" } },
  },
});

export const plantumlHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: 'var(--pe-syn-keyword)', fontWeight: '600' },
  { tag: t.meta, color: 'var(--pe-syn-meta)', fontWeight: '700' },
  { tag: t.processingInstruction, color: 'var(--pe-syn-meta)' },
  { tag: t.string, color: 'var(--pe-syn-string)' },
  { tag: t.comment, color: 'var(--pe-syn-comment)', fontStyle: 'italic' },
  { tag: t.operator, color: 'var(--pe-syn-operator)', fontWeight: '700' },
  { tag: t.typeName, color: 'var(--pe-syn-type)' },
  { tag: t.annotation, color: 'var(--pe-syn-meta)', fontStyle: 'italic' },
  { tag: t.color, color: 'var(--pe-syn-color)' },
  { tag: t.number, color: 'var(--pe-syn-number)' },
  { tag: t.atom, color: 'var(--pe-syn-number)', fontWeight: '700' },
  { tag: t.propertyName, color: 'var(--pe-syn-property)' },
  { tag: t.modifier, color: 'var(--pe-syn-operator)' },
  { tag: t.variableName, color: 'var(--pe-syn-variable)' },
  { tag: t.punctuation, color: 'var(--pe-syn-operator)' },
]);

export function plantuml(): LanguageSupport {
  return new LanguageSupport(plantumlStreamLanguage, [syntaxHighlighting(plantumlHighlightStyle)]);
}

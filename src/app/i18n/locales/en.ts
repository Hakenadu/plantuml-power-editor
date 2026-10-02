import type { Translations } from '../translations';

/** English UI texts. */
const en: Translations = {
  common: {
    cancel: 'Cancel',
    ok: 'OK',
    name: 'Name',
    reset: 'Reset',
    standard: 'Default',
    close: 'Close',
    rename: 'Rename',
  },

  keys: { ctrl: 'Ctrl', shift: 'Shift' },

  seo: {
    title: 'PlantUML Editor online: free, with live preview | PlantUML Power Editor',
    description:
      'Free online PlantUML editor: write UML diagrams in your browser, see them render live, style them by clicking and export PNG or SVG. No sign-up, everything stays on your device.',
    heading: 'PlantUML Editor',
    image: 'og-image.jpg',
    imageAlt:
      'PlantUML Editor: code editor with syntax highlighting next to a live-rendered UML sequence and class diagram',
  },

  app: {
    untitled: 'Untitled diagram',
    copyName: (name) => `${name} (copy)`,
    sidebarTooltip: 'Diagrams (Ctrl+B)',
    sidebarAria: 'Toggle sidebar',
    unsavedAria: 'unsaved',
    engineLoading: 'Loading engine',
    editing: 'Editing …',
    jumpToErrorTooltip: 'Jump to the faulty line',
    errorStatus: (line) => (line ? `Error · L. ${line}` : 'Error'),
    valid: 'Valid',
    newDiagram: 'New diagram',
    diagramStyle: 'Diagram style',
    export: 'Export',
    more: 'More',
    saveTooltip: 'Save in browser (Ctrl+S)',
    save: 'Save',
    saveNew: 'Save …',
    saveAs: 'Save as …',
    suggestionsTooltip: 'Suggestions (Ctrl+Space)',
    suggestionsAria: 'Show suggestions',
    undoTooltip: 'Undo (Ctrl+Z)',
    undo: 'Undo',
    redoTooltip: 'Redo (Ctrl+Y)',
    redo: 'Redo',
    wrap: 'Line wrapping',
    wrapAria: 'Toggle line wrapping',
    editorAria: 'Editor',
    resizeAria: 'Resize panes',
    previewAria: 'Preview',
    styleDockAria: 'Adjust style',
    viewNavAria: 'View',
    tabCode: 'Code',
    tabPreview: 'Preview',
    tabStyle: 'Style',
    templateCaption: 'New diagram from template',
    downloadCaption: 'Download image',
    svgVector: 'SVG (vector)',
    png: (scale) => `PNG · ${scale}×`,
    pngPrint: 'PNG · 4× (print)',
    pngTransparent: 'PNG with transparent background',
    clipboardCaption: 'Clipboard',
    copyPng: 'Copy PNG',
    copySvg: 'Copy SVG code',
    copyLink: 'Copy share link',
    sourceFile: 'Source (.puml)',
    colorScheme: (label) => `Color scheme: ${label}`,
    colorSchemes: { system: 'System', light: 'Light', dark: 'Dark' },
    language: (label) => `Language: ${label}`,
    systemLanguage: (label) => `System language (${label})`,
    editDiagramStyle: 'Adjust diagram style',
    docs: 'PlantUML documentation',
    docsUrl: 'https://plantuml.com/',
    about: 'About this project',
    aboutUrl: 'about.html',
    privacy: 'Privacy',
    privacyUrl: 'privacy.html',
    terms: 'Terms of service',
    termsUrl: 'terms.html',
    imprint: 'Legal notice',
    imprintUrl: 'imprint.html',
    jumpToEditor: 'Jump to editor',
    lineShort: (line) => `L. ${line}`,
    adjustStyle: 'Adjust style',
    diagram: 'Diagram',
    exportAsPng: 'Export as PNG',
    exportAsSvg: 'Export as SVG',
  },

  snack: {
    engineFailed: 'The PlantUML engine could not be loaded.',
    elementNotFound: 'The element could not be found in the source.',
    saved: (name) => `“${name}” saved to this browser's local storage.`,
    historyAction: 'History',
    saveFailed: (reason) => `Saving failed: ${reason}`,
    storageFull: 'The local storage is full.',
    created: (name) => `“${name}” created.`,
    deleted: (name) => `“${name}” deleted.`,
    undoAction: 'Undo',
    replaced: 'Unsaved changes were replaced.',
    restoreAction: 'Restore',
    pngFailed: (reason) => `PNG export failed: ${reason}`,
    pngCopied: 'PNG copied to the clipboard.',
    copyUnsupported: 'This browser does not support copying images.',
    svgCopied: 'SVG code copied to the clipboard.',
    copyFailed: 'Copying is not possible.',
    linkCopied: 'Link copied to the clipboard. It contains the whole diagram.',
    linkInvalid: 'The link does not contain a valid diagram.',
    themeSaved: (name) => `Theme “${name}” saved to local storage.`,
    themeDeleted: (name) => `Theme “${name}” deleted.`,
  },

  preview: {
    aria: 'Diagram preview. Clicking an element opens the context menu. Ctrl + mouse wheel zooms.',
    loading: 'Loading PlantUML engine …',
    failed: 'The PlantUML engine could not be loaded.',
    noValidRender: 'No valid rendering yet. Please fix the errors in the editor.',
    startTyping: 'Start typing in the editor …',
    syntaxError: (line) => (line ? `Syntax error in line ${line}` : 'Syntax error'),
    lastGood: 'Showing the last working version.',
    toLine: 'Go to line',
    zoomAria: 'Zoom',
    zoomOutTooltip: 'Zoom out (−)',
    zoomOut: 'Zoom out',
    actualSizeTooltip: 'Actual size (1)',
    actualSize: 'Actual size',
    zoomInTooltip: 'Zoom in (+)',
    zoomIn: 'Zoom in',
    fitTooltip: 'Fit (0 / double-click)',
    fit: 'Fit',
  },

  errors: {
    timeout: 'Rendering timed out',
    unknownType: 'Diagram type not recognized. Missing @startuml / @enduml?',
    syntax: 'Syntax error',
    engineMessages: [],
  },

  editor: {
    aria: 'PlantUML source',
    showDetails: 'Show error details',
    hideDetails: 'Hide error details',
    clickToHide: 'Click to hide',
    // CodeMirror's defaults are English already.
    phrases: {},
  },

  stylePanel: {
    diagramStyle: 'Diagram style',
    globalTitle: 'Global styles',
    link: 'Connection',
    showInEditor: 'Show in editor',
    closeAria: 'Close style panel',
    theme: 'Theme',
    noTheme: 'No theme',
    customThemes: 'Custom themes',
    builtinThemes: 'Built-in themes',
    saveTheme: 'Save as custom theme',
    saveThemeTitle: 'Save custom theme',
    themeSaved: 'Matches a saved theme',
    defaultThemeName: 'My theme',
    deleteTheme: 'Delete theme',
    deleteThemeAria: (name) => `Delete theme “${name}”`,
    handwritten: 'Hand-drawn',
    removeAllGlobal: 'Remove all diagram styles',
    lineColor: 'Line color',
    lineStyle: 'Line style',
    lineThickness: 'Line thickness',
    solid: 'Solid',
    dashed: 'Dashed',
    longDashed: 'Long dashes',
    dotted: 'Dotted',
    bold: 'Bold',
    italic: 'Italic',
    boldItalic: 'Bold & italic',
    plain: 'Normal',
    hidden: 'Hidden',
    left: 'Left',
    center: 'Center',
    right: 'Right',
    sequenceNote:
      'In sequence diagrams, PlantUML supports color and line style for messages, but no line thickness.',
    removeLinkStyle: 'Remove connection style',
    removeElementStyles: 'Remove styles of this element',
    sections: {
      document: 'Background',
      root: 'Font',
      element: 'Elements',
      arrow: 'Arrows',
      note: 'Notes',
      title: 'Title',
      legend: 'Legend',
    },
    props: {
      BackGroundColor: 'Background color',
      LineColor: 'Border / line color',
      FontColor: 'Text color',
      FontName: 'Font',
      FontSize: 'Font size',
      FontStyle: 'Font style',
      RoundCorner: 'Corner radius',
      LineThickness: 'Line thickness',
      LineStyle: 'Line style',
      Shadowing: 'Shadow',
      Padding: 'Padding',
      Margin: 'Margin',
      HorizontalAlignment: 'Alignment',
      MaximumWidth: 'Maximum width',
      HyperLinkColor: 'Link color',
    },
  },

  colorField: {
    pick: 'Pick color',
    textAria: (label) => `${label} (hex or color name)`,
  },

  sidebar: {
    title: 'My diagrams',
    count: (n) => `${n} saved · local storage`,
    closeAria: 'Close sidebar',
    newDiagram: 'New diagram',
    search: 'Search …',
    searchAria: 'Search diagrams',
    actionsAria: 'Actions',
    duplicate: 'Duplicate',
    downloadPuml: 'Download as .puml',
    delete: 'Delete',
    noMatches: (query) => `No matches for “${query}”.`,
    empty: 'No diagrams saved yet.',
    emptyHintBefore: 'Press',
    emptyHintAfter: "to save the current diagram in this browser's local storage.",
    usage: (kb) => `Data is stored locally in this browser only (${kb} KB used).`,
    justNow: 'just now',
  },

  dialogs: {
    apply: 'Apply',
    saveTitle: 'Save diagram',
    noticeTitle: "Diagrams are saved in your browser's local storage.",
    noticePoints: [
      'The data never leaves your device and is not synchronized.',
      'It is not available after clearing browser data, in private mode or in another browser.',
      'Storage is limited (typically about 5 MB), so export important diagrams as files as well.',
    ],
    dontShowAgain: "Don't show this notice again",
    saveInBrowser: 'Save in browser',
  },

  diagramTypes: {
    sequence: 'Sequence diagram',
    class: 'Class diagram',
    activity: 'Activity diagram',
    usecase: 'Use case diagram',
    component: 'Component diagram',
    state: 'State diagram',
    object: 'Object diagram',
    deployment: 'Deployment diagram',
    timing: 'Timing diagram',
    mindmap: 'Mind map',
    wbs: 'Work breakdown structure',
    gantt: 'Gantt chart',
    json: 'JSON',
    yaml: 'YAML',
    salt: 'Salt (wireframe)',
    other: 'Diagram',
  },

  targetKinds: {
    element: 'Element',
    link: 'Connection',
    message: 'Message',
    activity: 'Activity',
    text: 'Text',
    group: 'Group',
  },

  completion: {
    sequenceArrows: {
      '->': 'synchronous message',
      '-->': 'reply (dashed)',
      '->>': 'asynchronous message',
      '-->>': 'asynchronous reply',
      '<-': 'message (reverse)',
      '<--': 'reply (reverse)',
      '<->': 'bidirectional',
      '->x': 'lost message',
      '-\\': 'upper half arrowhead',
      '-/': 'lower half arrowhead',
      '->o': 'message with circle',
      '-[#red]>': 'colored message',
    },
    classArrows: {
      '<|--': 'inheritance',
      '<|..': 'realization',
      '*--': 'composition',
      'o--': 'aggregation',
      '-->': 'directed association',
      '--': 'association',
      '..>': 'dependency',
      '..|>': 'implements',
      '--|>': 'extends',
      '..': 'dashed line',
      '-[#red]->': 'colored relation',
      '-up->': 'relation upwards',
      '-left->': 'relation to the left',
    },
    genericArrows: {
      '-->': 'connection',
      '->': 'short connection',
      '..>': 'dashed',
      '--': 'line',
      '<-->': 'bidirectional',
      '-up->': 'upwards',
      '-down->': 'downwards',
      '-left->': 'to the left',
      '-right->': 'to the right',
      '-[#red]->': 'colored',
    },
    detail: {
      title: 'Diagram title',
      block: 'Block',
      skinparam: 'Display parameter',
      styleBlock: 'Style block',
      theme: 'Theme',
      stdlib: 'Standard library',
      handwritten: 'Hand-drawn',
      note: 'Note',
      participant: 'Participant',
      alternative: 'Alternative',
      optional: 'Optional',
      loop: 'Loop',
      parallel: 'Parallel',
      divider: 'Divider',
      delay: 'Delay',
      spacing: 'Spacing',
      classifier: 'Classifier',
      withBody: 'with body',
      action: 'Action',
      branch: 'Branch',
      composite: 'composite',
      initialState: 'Initial state',
      finalState: 'Final state',
      useCase: 'Use case',
      systemBoundary: 'System boundary',
      component: 'Component',
      level: (n) => `Level ${n}`,
      outRight: 'outgoing (right)',
      outLeft: 'outgoing (left)',
    },
    placeholder: {
      includePath: 'library/file',
      title: 'Title',
      header: 'Header',
      footer: 'Footer',
      caption: 'Caption',
      legend: 'Legend',
      note: 'Note',
      name: 'Name',
      result: 'result',
      condition: 'condition',
      otherwise: 'otherwise',
      repetition: 'repeat',
      reference: 'reference',
      section: 'Section',
      delay: 'delay',
      field: '+field: Type',
      method: '+method()',
      action: 'Action',
      yes: 'yes',
      no: 'no',
      value: 'value',
      start: 'Start',
      useCase: 'Use case',
      system: 'System',
      component: 'Component',
      root: 'Root',
      node: 'Node',
    },
  },

  templates: {
    sequence: {
      label: 'Sequence diagram',
      name: 'New sequence diagram',
      source: `@startuml
title Place an order
autonumber

actor Customer
participant "Web Shop" as Shop
participant "Payment Service" as Pay
database Database as DB

Customer -> Shop : check out cart
activate Shop
Shop -> DB : create order
DB --> Shop : order ID
Shop -> Pay : request payment
activate Pay

alt payment successful
  Pay --> Shop : confirmed
  Shop --> Customer : order confirmation
else payment declined
  Pay --> Shop : declined
  Shop --> Customer : error message
end

deactivate Pay
deactivate Shop
note right of Customer : Confirmation is also\\nsent by e-mail
@enduml
`,
    },
    class: {
      label: 'Class diagram',
      name: 'New class diagram',
      source: `@startuml
title Domain model

abstract class Vehicle {
  - licensePlate : String
  + drive() : void
}

class Car {
  - doors : int
}

class Motorcycle

interface Electric {
  + charge(kwh : double)
}

class Driver {
  + name : String
}

Vehicle <|-- Car
Vehicle <|-- Motorcycle
Electric <|.. Car
Driver "1" o-- "*" Vehicle : owns >
@enduml
`,
    },
    activity: {
      label: 'Activity diagram',
      name: 'New activity diagram',
      source: `@startuml
title Pull request workflow
start
:Create branch;
:Commit changes;
:Open pull request;
while (Review ok?) is (no)
  :Address feedback;
endwhile (yes)
if (CI green?) then (yes)
  :Merge;
else (no)
  :Fix build;
endif
stop
@enduml
`,
    },
    component: {
      label: 'Component diagram',
      name: 'New component diagram',
      source: `@startuml
title System architecture

package "Frontend" {
  [Angular App] as UI
}

node "Backend" {
  [API Gateway] as GW
  [Auth Service] as Auth
  [Order Service] as Orders
}

database "PostgreSQL" as PG
queue "Event Bus" as Bus

UI --> GW : HTTPS
GW --> Auth
GW --> Orders
Orders --> PG
Orders ..> Bus : publishes
@enduml
`,
    },
    state: {
      label: 'State diagram',
      name: 'New state diagram',
      source: `@startuml
title Ticket lifecycle
[*] --> Open
Open --> InProgress : assign
InProgress --> Review : done
Review --> InProgress : changes requested
Review --> Closed : accepted
Closed --> [*]
@enduml
`,
    },
    usecase: {
      label: 'Use case diagram',
      name: 'New use case diagram',
      source: `@startuml
left to right direction
actor Customer
actor Admin

rectangle Shop {
  usecase (Search products) as UC1
  usecase (Place order) as UC2
  usecase (Manage products) as UC3
}

Customer --> UC1
Customer --> UC2
Admin --> UC3
@enduml
`,
    },
    mindmap: {
      label: 'Mind map',
      name: 'New mind map',
      source: `@startmindmap
* PlantUML Power Editor
** Editor
*** Syntax highlighting
*** Autocompletion
*** Error display
** Preview
*** Live rendering
*** Zoom & pan
** Styles
*** Global
*** Per element
@endmindmap
`,
    },
  },
};

export default en;

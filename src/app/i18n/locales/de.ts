import type { DiagramType } from '../../core/plantuml-analysis';
import type { TargetKind } from '../../core/diagram-targets';
import type { SectionSelector, StylePropKey } from '../../core/plantuml-styles';
import type { TemplateId } from '../../core/templates';
import { table } from '../translations';

/** German UI texts, the reference dictionary (see `Translations`). */
const de = {
  common: {
    cancel: 'Abbrechen',
    ok: 'OK',
    name: 'Name',
    reset: 'Zurücksetzen',
    standard: 'Standard',
    close: 'Schließen',
    rename: 'Umbenennen',
  },

  keys: { ctrl: 'Strg', shift: 'Umschalt' },

  /** Texts for search engines and link previews (title, meta description, Open Graph). */
  seo: {
    title: 'PlantUML Editor online: kostenlos, mit Live-Vorschau | PlantUML Power Editor',
    description:
      'Kostenloser Online-PlantUML-Editor: UML-Diagramme im Browser schreiben, live rendern, per Klick stylen und als PNG oder SVG exportieren. Ohne Anmeldung, alles bleibt lokal.',
    heading: 'PlantUML Editor',
    /** Social card in `public/` (1200×630). */
    image: 'og-image-de.jpg',
    imageAlt:
      'PlantUML Editor: Code-Editor mit Syntax-Highlighting neben einem live gerenderten UML-Sequenz- und Klassendiagramm',
  },

  app: {
    untitled: 'Unbenanntes Diagramm',
    copyName: (name: string) => `${name} (Kopie)`,
    sidebarTooltip: 'Diagramme (Strg+B)',
    sidebarAria: 'Seitenleiste umschalten',
    unsavedAria: 'ungespeichert',
    engineLoading: 'Engine lädt',
    editing: 'Bearbeitung …',
    jumpToErrorTooltip: 'Zur fehlerhaften Zeile springen',
    errorStatus: (line: number | null) => (line ? `Fehler · Z. ${line}` : 'Fehler'),
    valid: 'Gültig',
    newDiagram: 'Neues Diagramm',
    diagramStyle: 'Diagramm-Style',
    export: 'Exportieren',
    more: 'Mehr',
    saveTooltip: 'Im Browser speichern (Strg+S)',
    save: 'Speichern',
    saveNew: 'Speichern …',
    saveAs: 'Speichern unter …',
    suggestionsTooltip: 'Vorschläge (Strg+Leertaste)',
    suggestionsAria: 'Vorschläge anzeigen',
    undoTooltip: 'Rückgängig (Strg+Z)',
    undo: 'Rückgängig',
    redoTooltip: 'Wiederholen (Strg+Y)',
    redo: 'Wiederholen',
    wrap: 'Zeilenumbruch',
    wrapAria: 'Zeilenumbruch umschalten',
    editorAria: 'Editor',
    resizeAria: 'Größe der Bereiche ändern',
    previewAria: 'Vorschau',
    styleDockAria: 'Style anpassen',
    viewNavAria: 'Ansicht',
    tabCode: 'Code',
    tabPreview: 'Vorschau',
    tabStyle: 'Style',
    templateCaption: 'Neues Diagramm aus Vorlage',
    downloadCaption: 'Bild herunterladen',
    svgVector: 'SVG (Vektor)',
    png: (scale: number) => `PNG · ${scale}×`,
    pngPrint: 'PNG · 4× (Druck)',
    pngTransparent: 'PNG mit transparentem Hintergrund',
    clipboardCaption: 'Zwischenablage',
    copyPng: 'PNG kopieren',
    copySvg: 'SVG-Code kopieren',
    copyLink: 'Link zum Teilen kopieren',
    sourceFile: 'Quelltext (.puml)',
    colorScheme: (label: string) => `Farbschema: ${label}`,
    colorSchemes: { system: 'System', light: 'Hell', dark: 'Dunkel' },
    language: (label: string) => `Sprache: ${label}`,
    systemLanguage: (label: string) => `Systemsprache (${label})`,
    editDiagramStyle: 'Diagramm-Style anpassen',
    docs: 'PlantUML-Dokumentation',
    docsUrl: 'https://plantuml.com/de/',
    about: 'Über dieses Projekt',
    aboutUrl: 'ueber.html',
    privacy: 'Datenschutz',
    privacyUrl: 'datenschutz.html',
    terms: 'Nutzungsbedingungen',
    termsUrl: 'nutzungsbedingungen.html',
    imprint: 'Impressum',
    imprintUrl: 'impressum.html',
    jumpToEditor: 'Zum Editor springen',
    lineShort: (line: number) => `Z. ${line}`,
    adjustStyle: 'Style anpassen',
    diagram: 'Diagramm',
    exportAsPng: 'Als PNG exportieren',
    exportAsSvg: 'Als SVG exportieren',
  },

  snack: {
    engineFailed: 'PlantUML-Engine konnte nicht geladen werden.',
    elementNotFound: 'Element konnte im Quelltext nicht gefunden werden.',
    saved: (name: string) => `„${name}“ im Local Storage dieses Browsers gespeichert.`,
    historyAction: 'Verlauf',
    saveFailed: (reason: string) => `Speichern fehlgeschlagen: ${reason}`,
    storageFull: 'Der Local Storage ist voll.',
    created: (name: string) => `„${name}“ erstellt.`,
    deleted: (name: string) => `„${name}“ gelöscht.`,
    undoAction: 'Rückgängig',
    replaced: 'Ungespeicherte Änderungen wurden ersetzt.',
    restoreAction: 'Wiederherstellen',
    pngFailed: (reason: string) => `PNG-Export fehlgeschlagen: ${reason}`,
    pngCopied: 'PNG in die Zwischenablage kopiert.',
    copyUnsupported: 'Kopieren wird von diesem Browser nicht unterstützt.',
    svgCopied: 'SVG-Code in die Zwischenablage kopiert.',
    copyFailed: 'Kopieren nicht möglich.',
    linkCopied: 'Link in die Zwischenablage kopiert. Er enthält das gesamte Diagramm.',
    linkInvalid: 'Der Link enthält kein gültiges Diagramm.',
    themeSaved: (name: string) => `Theme „${name}“ im Local Storage gespeichert.`,
    themeDeleted: (name: string) => `Theme „${name}“ gelöscht.`,
  },

  preview: {
    aria: 'Diagramm-Vorschau. Klick auf ein Element öffnet das Kontextmenü. Strg + Mausrad zoomt.',
    loading: 'PlantUML-Engine wird geladen …',
    failed: 'Die PlantUML-Engine konnte nicht geladen werden.',
    noValidRender: 'Noch keine gültige Darstellung. Bitte behebe die Fehler im Editor.',
    startTyping: 'Beginne im Editor zu tippen …',
    syntaxError: (line: number | null) => (line ? `Syntaxfehler in Zeile ${line}` : 'Syntaxfehler'),
    lastGood: 'Angezeigt wird der letzte funktionierende Stand.',
    toLine: 'Zur Zeile',
    zoomAria: 'Zoom',
    zoomOutTooltip: 'Verkleinern (−)',
    zoomOut: 'Verkleinern',
    actualSizeTooltip: 'Originalgröße (1)',
    actualSize: 'Originalgröße',
    zoomInTooltip: 'Vergrößern (+)',
    zoomIn: 'Vergrößern',
    fitTooltip: 'Einpassen (0 / Doppelklick)',
    fit: 'Einpassen',
  },

  errors: {
    timeout: 'Zeitüberschreitung beim Rendern',
    unknownType: 'Diagrammtyp nicht erkannt. Fehlt @startuml / @enduml?',
    syntax: 'Syntaxfehler',
    /** Replacements applied to the (English) messages reported by PlantUML. */
    engineMessages: [
      ['Syntax Error?', 'Syntaxfehler?'],
      ['Syntax Error', 'Syntaxfehler'],
      ['Assumed diagram type:', 'Vermuteter Diagrammtyp:'],
    ] as [string, string][],
  },

  editor: {
    aria: 'PlantUML Quelltext',
    showDetails: 'Fehlerdetails anzeigen',
    hideDetails: 'Fehlerdetails ausblenden',
    clickToHide: 'Klicken zum Ausblenden',
    /** CodeMirror's built-in phrases (search panel, completion, …). */
    phrases: {
      Find: 'Suchen',
      Replace: 'Ersetzen',
      next: 'weiter',
      previous: 'zurück',
      all: 'alle',
      'match case': 'Groß-/Kleinschreibung',
      regexp: 'Regex',
      'by word': 'ganzes Wort',
      replace: 'ersetzen',
      'replace all': 'alle ersetzen',
      close: 'schließen',
      'current match': 'aktueller Treffer',
      'replaced match on line $': 'Treffer in Zeile $ ersetzt',
      'replaced $ matches': '$ Treffer ersetzt',
      'on line': 'in Zeile',
      'Go to line': 'Gehe zu Zeile',
      go: 'los',
      Completions: 'Vorschläge',
    } as Record<string, string>,
  },

  stylePanel: {
    diagramStyle: 'Diagramm-Style',
    globalTitle: 'Übergreifende Styles',
    link: 'Verbindung',
    showInEditor: 'Im Editor zeigen',
    closeAria: 'Style-Panel schließen',
    theme: 'Theme',
    noTheme: 'Kein Theme',
    customThemes: 'Eigene Themes',
    builtinThemes: 'Vordefinierte Themes',
    saveTheme: 'Als eigenes Theme speichern',
    saveThemeTitle: 'Eigenes Theme speichern',
    themeSaved: 'Entspricht einem gespeicherten Theme',
    defaultThemeName: 'Mein Theme',
    deleteTheme: 'Theme löschen',
    deleteThemeAria: (name: string) => `Theme „${name}“ löschen`,
    handwritten: 'Handgezeichnet',
    removeAllGlobal: 'Alle Diagramm-Styles entfernen',
    lineColor: 'Linienfarbe',
    lineStyle: 'Linienart',
    lineThickness: 'Linienstärke',
    solid: 'Durchgezogen',
    dashed: 'Gestrichelt',
    longDashed: 'Lang gestrichelt',
    dotted: 'Gepunktet',
    bold: 'Fett',
    italic: 'Kursiv',
    boldItalic: 'Fett & kursiv',
    plain: 'Normal',
    hidden: 'Unsichtbar',
    left: 'Links',
    center: 'Zentriert',
    right: 'Rechts',
    sequenceNote:
      'In Sequenzdiagrammen unterstützt PlantUML für Nachrichten Farbe und Linienart, aber keine Linienstärke.',
    removeLinkStyle: 'Style der Verbindung entfernen',
    removeElementStyles: 'Styles dieses Elements entfernen',
    sections: table<SectionSelector>({
      document: 'Hintergrund',
      root: 'Schrift',
      element: 'Elemente',
      arrow: 'Pfeile',
      note: 'Notizen',
      title: 'Titel',
      legend: 'Legende',
    }),
    props: table<StylePropKey>({
      BackGroundColor: 'Hintergrundfarbe',
      LineColor: 'Rahmen- / Linienfarbe',
      FontColor: 'Textfarbe',
      FontName: 'Schriftart',
      FontSize: 'Schriftgröße',
      FontStyle: 'Schriftstil',
      RoundCorner: 'Eckenradius',
      LineThickness: 'Linienstärke',
      LineStyle: 'Linienart',
      Shadowing: 'Schatten',
      Padding: 'Innenabstand',
      Margin: 'Außenabstand',
      HorizontalAlignment: 'Ausrichtung',
      MaximumWidth: 'Maximale Breite',
      HyperLinkColor: 'Linkfarbe',
    }),
  },

  colorField: {
    pick: 'Farbe wählen',
    textAria: (label: string) => `${label} (Hex oder Farbname)`,
  },

  sidebar: {
    title: 'Meine Diagramme',
    count: (n: number) => `${n} gespeichert · Local Storage`,
    closeAria: 'Seitenleiste schließen',
    newDiagram: 'Neues Diagramm',
    search: 'Suchen …',
    searchAria: 'Diagramme durchsuchen',
    actionsAria: 'Aktionen',
    duplicate: 'Duplizieren',
    downloadPuml: 'Als .puml herunterladen',
    delete: 'Löschen',
    noMatches: (query: string) => `Keine Treffer für „${query}“.`,
    empty: 'Noch keine Diagramme gespeichert.',
    emptyHintBefore: 'Mit',
    emptyHintAfter: 'speicherst du das aktuelle Diagramm im Local Storage dieses Browsers.',
    usage: (kb: string) => `Daten liegen nur lokal in diesem Browser (${kb} KB belegt).`,
    justNow: 'gerade eben',
  },

  dialogs: {
    apply: 'Übernehmen',
    saveTitle: 'Diagramm speichern',
    noticeTitle: 'Gespeichert wird im Local Storage deines Browsers.',
    noticePoints: [
      'Die Daten verlassen dein Gerät nicht und werden nicht synchronisiert.',
      'Beim Löschen der Browserdaten, im privaten Modus oder in einem anderen Browser sind sie nicht verfügbar.',
      'Der Speicher ist begrenzt (typisch ca. 5 MB). Exportiere wichtige Diagramme deshalb zusätzlich als Datei.',
    ],
    dontShowAgain: 'Diesen Hinweis nicht mehr anzeigen',
    saveInBrowser: 'Im Browser speichern',
  },

  diagramTypes: table<DiagramType>({
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
  }),

  targetKinds: table<TargetKind>({
    element: 'Element',
    link: 'Verbindung',
    message: 'Nachricht',
    activity: 'Aktivität',
    text: 'Text',
    group: 'Gruppe',
  }),

  completion: {
    sequenceArrows: {
      '->': 'synchrone Nachricht',
      '-->': 'Antwort (gestrichelt)',
      '->>': 'asynchrone Nachricht',
      '-->>': 'asynchrone Antwort',
      '<-': 'Nachricht (rückwärts)',
      '<--': 'Antwort (rückwärts)',
      '<->': 'bidirektional',
      '->x': 'verlorene Nachricht',
      '-\\': 'obere Halbspitze',
      '-/': 'untere Halbspitze',
      '->o': 'Nachricht mit Kreis',
      '-[#red]>': 'farbige Nachricht',
    },
    classArrows: {
      '<|--': 'Vererbung',
      '<|..': 'Realisierung',
      '*--': 'Komposition',
      'o--': 'Aggregation',
      '-->': 'gerichtete Assoziation',
      '--': 'Assoziation',
      '..>': 'Abhängigkeit',
      '..|>': 'implementiert',
      '--|>': 'erweitert',
      '..': 'gestrichelte Linie',
      '-[#red]->': 'farbige Beziehung',
      '-up->': 'Beziehung nach oben',
      '-left->': 'Beziehung nach links',
    },
    genericArrows: {
      '-->': 'Verbindung',
      '->': 'kurze Verbindung',
      '..>': 'gestrichelt',
      '--': 'Linie',
      '<-->': 'bidirektional',
      '-up->': 'nach oben',
      '-down->': 'nach unten',
      '-left->': 'nach links',
      '-right->': 'nach rechts',
      '-[#red]->': 'farbig',
    },
    detail: {
      title: 'Diagrammtitel',
      block: 'Block',
      skinparam: 'Darstellungsparameter',
      styleBlock: 'Style-Block',
      theme: 'Theme',
      stdlib: 'Standardbibliothek',
      handwritten: 'Handgezeichnet',
      note: 'Notiz',
      participant: 'Teilnehmer',
      alternative: 'Alternative',
      optional: 'Optional',
      loop: 'Schleife',
      parallel: 'Parallel',
      divider: 'Trenner',
      delay: 'Verzögerung',
      spacing: 'Abstand',
      classifier: 'Klassifizierer',
      withBody: 'mit Body',
      action: 'Aktion',
      branch: 'Verzweigung',
      composite: 'zusammengesetzt',
      initialState: 'Startzustand',
      finalState: 'Endzustand',
      useCase: 'Use Case',
      systemBoundary: 'Systemgrenze',
      component: 'Komponente',
      level: (n: number) => `Ebene ${n}`,
      outRight: 'nach außen (rechts)',
      outLeft: 'nach außen (links)',
    },
    /** Snippet placeholders (the text pre-selected after inserting a snippet). */
    placeholder: {
      includePath: 'Bibliothek/Datei',
      title: 'Titel',
      header: 'Kopfzeile',
      footer: 'Fußzeile',
      caption: 'Beschriftung',
      legend: 'Legende',
      note: 'Notiz',
      name: 'Name',
      result: 'Ergebnis',
      condition: 'Bedingung',
      otherwise: 'Sonst',
      repetition: 'Wiederholung',
      reference: 'Referenz',
      section: 'Abschnitt',
      delay: 'Verzögerung',
      field: '+feld: Typ',
      method: '+methode()',
      action: 'Aktion',
      yes: 'ja',
      no: 'nein',
      value: 'Wert',
      start: 'Start',
      useCase: 'Anwendungsfall',
      system: 'System',
      component: 'Komponente',
      root: 'Wurzel',
      node: 'Knoten',
    },
  },

  templates: {
    sequence: {
      label: 'Sequenzdiagramm',
      name: 'Neues Sequenzdiagramm',
      source: `@startuml
title Bestellung aufgeben
autonumber

actor Kunde
participant "Web Shop" as Shop
participant Zahlungsdienst as Pay
database Datenbank as DB

Kunde -> Shop : Warenkorb bestellen
activate Shop
Shop -> DB : Bestellung anlegen
DB --> Shop : Bestell-ID
Shop -> Pay : Zahlung anfordern
activate Pay

alt Zahlung erfolgreich
  Pay --> Shop : bestätigt
  Shop --> Kunde : Bestellbestätigung
else Zahlung abgelehnt
  Pay --> Shop : abgelehnt
  Shop --> Kunde : Fehlermeldung
end

deactivate Pay
deactivate Shop
note right of Kunde : Bestätigung kommt\\nzusätzlich per E-Mail
@enduml
`,
    },
    class: {
      label: 'Klassendiagramm',
      name: 'Neues Klassendiagramm',
      source: `@startuml
title Domänenmodell

abstract class Fahrzeug {
  - kennzeichen : String
  + fahren() : void
}

class Auto {
  - tueren : int
}

class Motorrad

interface Elektrisch {
  + laden(kwh : double)
}

class Fahrer {
  + name : String
}

Fahrzeug <|-- Auto
Fahrzeug <|-- Motorrad
Elektrisch <|.. Auto
Fahrer "1" o-- "*" Fahrzeug : besitzt >
@enduml
`,
    },
    activity: {
      label: 'Aktivitätsdiagramm',
      name: 'Neues Aktivitätsdiagramm',
      source: `@startuml
title Pull Request Workflow
start
:Branch erstellen;
:Änderungen committen;
:Pull Request öffnen;
while (Review ok?) is (nein)
  :Feedback einarbeiten;
endwhile (ja)
if (CI grün?) then (ja)
  :Mergen;
else (nein)
  :Build reparieren;
endif
stop
@enduml
`,
    },
    component: {
      label: 'Komponentendiagramm',
      name: 'Neues Komponentendiagramm',
      source: `@startuml
title Systemarchitektur

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
Orders ..> Bus : publiziert
@enduml
`,
    },
    state: {
      label: 'Zustandsdiagramm',
      name: 'Neues Zustandsdiagramm',
      source: `@startuml
title Ticket-Lebenszyklus
[*] --> Offen
Offen --> InArbeit : zuweisen
InArbeit --> Review : fertig
Review --> InArbeit : Änderungen nötig
Review --> Erledigt : akzeptiert
Erledigt --> [*]
@enduml
`,
    },
    usecase: {
      label: 'Use-Case-Diagramm',
      name: 'Neues Use-Case-Diagramm',
      source: `@startuml
left to right direction
actor Kunde
actor Admin

rectangle Shop {
  usecase (Produkte suchen) as UC1
  usecase (Bestellen) as UC2
  usecase (Produkte pflegen) as UC3
}

Kunde --> UC1
Kunde --> UC2
Admin --> UC3
@enduml
`,
    },
    mindmap: {
      label: 'Mindmap',
      name: 'Neue Mindmap',
      source: `@startmindmap
* PlantUML Power Editor
** Editor
*** Syntax Highlighting
*** Autovervollständigung
*** Fehleranzeige
** Vorschau
*** Live Rendering
*** Zoom & Pan
** Styles
*** Global
*** Pro Element
@endmindmap
`,
    },
  } satisfies Record<TemplateId, { label: string; name: string; source: string }>,
};

export default de;

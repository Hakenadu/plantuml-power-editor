# PlantUML Power Editor

Moderner PlantUML-Editor auf Basis von **Angular 22**, **Angular Material 3** und der offiziellen
JavaScript-Engine der PlantUML-Entwickler ([`@plantuml/core`](https://www.npmjs.com/package/@plantuml/core),
per TeaVM nach JavaScript kompiliert). Das Rendering läuft komplett im Browser – ohne Server, Java oder Graphviz.

## Features

- **Editor mit Syntax-Highlighting** (CodeMirror 6, eigene PlantUML-Sprachdefinition)
- **Live-Rendering**: Ist die Syntax gerade kaputt, bleibt der letzte funktionierende Stand sichtbar
  (ausgegraut) und ein Fehlerbanner zeigt den Fehler an.
- **Fehler direkt in der Zeile**: Die Fehlerzeile erhält eine dezente Zeilenannotation am Zeilenende;
  erst ein Klick darauf klappt die ausführliche Meldung im Editor auf. Fehler in der gerade bearbeiteten
  Zeile erscheinen erst nach einer kurzen Tipp-Pause, behobene Fehler verschwinden sofort.
- **Kontextbasierte Autovervollständigung**: erkennt den Diagrammtyp und den Kontext der Cursorposition,
  z. B. werden rechts von einem Pfeil in Sequenzdiagrammen nur Teilnehmer vorgeschlagen, nach einem
  Teilnehmer passende Pfeiltypen, nach `note left of` Teilnehmer, nach `#` Farben, in `<style>` Properties usw.
  `Strg + Leertaste` öffnet die Vorschläge manuell.
- **Responsive**: Split-View mit verschiebbarem Trenner auf Desktop, vertikaler Split auf Tablets im
  Hochformat, Tab-Navigation und Bottom-Sheets auf dem Smartphone; Pinch-Zoom, Pan und Long-Press werden
  unterstützt.
- **Export** als SVG, PNG (1×/2×/4×, optional transparent), Kopieren in die Zwischenablage, Quelltext als `.puml`.
- **Kontextmenü in der Vorschau** (Klick/Rechtsklick/Long-Press auf ein Element):
  - _Zum Editor springen_ – markiert die zugehörige Zeile und scrollt dorthin.
  - _Style anpassen_ – Live-Styling des Elements (Hintergrund, Rahmen, Textfarbe, Schrift, Schriftgröße,
    Schriftstil, Eckenradius, Linienstärke/-art, Schatten, Innenabstand, Ausrichtung) bzw. von
    Verbindungen (Farbe, Linienart, Stärke).
  - Rechtsklick auf freie Diagrammfläche → _Diagramm-Style_: Theme, handgezeichneter Stil sowie Styles für
    Hintergrund, Schrift, Elemente, Pfeile, Notizen und Titel.
- **Persistenz im Local Storage** mit Hinweis beim Speichern, ausklappbare Seitenleiste mit allen
  gespeicherten Diagrammen (Vorschaubild, Suche, Umbenennen, Duplizieren, Löschen mit Rückgängig).
  Der aktuelle Arbeitsstand wird zusätzlich automatisch als Entwurf gesichert.

## Wie das Styling funktioniert

Styles werden als normales PlantUML in den Quelltext geschrieben, damit Diagramme auch außerhalb des
Editors identisch aussehen. Der Editor verwaltet dazu direkt nach `@startuml` einen markierten Block:

```plantuml
' ⟪power-editor styles⟫
!theme cerulean
<style>
element {
  RoundCorner 12
}
.pe_Shop {
  BackGroundColor #DDEBFF
}
</style>
hide <<pe_Shop>> stereotype
' ⟪/power-editor styles⟫
participant "Web Shop" as Shop <<pe_Shop>>
```

Einzelne Elemente erhalten einen (unsichtbaren) Stereotyp `<<pe_…>>`, der über einen `<style>`-Selektor
gestylt wird. Verbindungen werden über die Inline-Syntax `-[#color,dashed,thickness=2]->` gestylt.
Alle Änderungen landen als Editor-Transaktion im Quelltext und sind mit `Strg + Z` rückgängig zu machen.

## Tastenkürzel

| Kürzel                | Aktion                                         |
| --------------------- | ---------------------------------------------- |
| `Strg + S`            | Speichern                                      |
| `Strg + Umschalt + S` | Speichern unter …                              |
| `Strg + B`            | Seitenleiste ein-/ausblenden                   |
| `Strg + Umschalt + E` | PNG (2×) exportieren                           |
| `Strg + Leertaste`    | Autovervollständigung                          |
| `Strg + Mausrad`      | Zoom in der Vorschau                           |
| `0` / `1` / `+` / `-` | Einpassen / 100 % / Zoom (Vorschau fokussiert) |

## Entwicklung

```bash
npm install
npm start        # Dev-Server auf http://localhost:4200
npm run build    # Produktions-Build nach dist/
```

Die Engine-Dateien (`plantuml.js`, `viz-global.js`, `themes.js`, …) werden per `angular.json` aus
`node_modules/@plantuml/core` unverändert ins Build-Root kopiert und zur Laufzeit lazy geladen.
`!include <…>` aus der PlantUML-Standardbibliothek wird bei Bedarf von
`https://plantuml.github.io/plantuml/js-plantuml/` nachgeladen.

### Struktur

```
src/app
├── core/          Engine-Wrapper, Quelltextanalyse, Style-Logik, Klick→Zeile-Mapping, Persistenz, Export
├── editor/        CodeMirror-Komponente, PlantUML-Sprache & Autovervollständigung
├── preview/       Vorschau mit Pan/Zoom/Pinch und Fehler-Overlay
├── style-panel/   Style-Editor (abstrakte Controls)
├── sidebar/       Liste gespeicherter Diagramme
└── dialogs/       Speichern-Hinweis, Umbenennen
```

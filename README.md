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
  - **Eigene Themes**: Die aktuellen Diagramm-Styles lassen sich per Lesezeichen-Button neben der
    Theme-Auswahl unter einem Namen im Local Storage ablegen. Sie erscheinen danach oben in der
    Auswahl (Gruppe _Eigene Themes_, markiert mit Lesezeichen), lassen sich auf jedes Diagramm
    anwenden und dort direkt löschen (mit Rückgängig).
- **Persistenz im Local Storage** mit Hinweis beim Speichern, ausklappbare Seitenleiste mit allen
  gespeicherten Diagrammen (Vorschaubild, Suche, Umbenennen, Duplizieren, Löschen mit Rückgängig).
  Der aktuelle Arbeitsstand wird zusätzlich automatisch als Entwurf gesichert.
- **Mehrsprachig** (Deutsch, Englisch): Standard ist die Sprache des Systems/Browsers, unter
  _Mehr → Sprache_ lässt sie sich festlegen. Der Wechsel greift sofort, ohne Neuladen – inklusive
  Autovervollständigung, Vorlagen und Fehlermeldungen.

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

## Mehrsprachigkeit

Die Übersetzungen laufen zur Laufzeit über Signals (`I18nService.t()`), damit die Sprache ohne Reload
und ohne separate Builds pro Sprache umgeschaltet werden kann. Jede Sprache ist ein eigenes, lazy
geladenes Wörterbuch unter `src/app/i18n/locales/`. Deutsch (`de.ts`) ist die Referenz; alle anderen
Sprachen sind als `Translations` typisiert, sodass fehlende Schlüssel ein Compile-Fehler sind.

Neue Sprache hinzufügen:

1. `src/app/i18n/locales/<code>.ts` anlegen (z. B. `en.ts` kopieren) und übersetzen.
2. In `src/app/i18n/languages.ts` einen Eintrag in `LANGUAGES` ergänzen – bei Bedarf mit
   `ngLocale` für Angulars Zahlen-/Datumsformate.

## SEO & Deployment

Die App wird unter **https://plantuml-editor.com** bereitgestellt (Origin in `core/seo.service.ts`,
`index.html`, `public/robots.txt`, `public/sitemap.xml`).

- `index.html` enthält Title, Description, Canonical, `hreflang` (de/en/x-default), Open Graph,
  Twitter Card, JSON-LD (`WebSite` + `WebApplication`) sowie crawlbaren statischen Inhalt in
  `<app-root>`, der beim Start der App ersetzt wird.
- Sprachversionen sind über `?lang=de` / `?lang=en` erreichbar; `SeoService` aktualisiert Title,
  Description, Canonical, `og:*` und `twitter:*` passend zur UI-Sprache (Texte unter `seo` in den
  Wörterbüchern).
- `public/`: `robots.txt`, `sitemap.xml`, `site.webmanifest`, `llms.txt`, Icons (ICO/SVG/PNG,
  Apple Touch, maskable) und Social Cards (`og-image.jpg`, `og-image-de.jpg`, 1200×630).
- Nach dem Deployment: Domain in der Google Search Console und den Bing Webmaster Tools
  verifizieren und die Sitemap einreichen; Social Cards z. B. mit dem LinkedIn Post Inspector
  prüfen. Der Server sollte HTTPS erzwingen, `www` auf die Apex-Domain umleiten und gehashte
  Assets (`*.js`, `*.css`) lange cachen, `index.html` dagegen nicht.

## Datenschutz & Fonts

Die App lädt nichts von fremden Servern: Inter und JetBrains Mono kommen aus
`@fontsource-variable/*`, die Icons aus einem Subset von _Material Symbols Rounded_
(`src/fonts/material-symbols-rounded.woff2`, ~28 KB statt ~5 MB), eingebunden in `src/fonts.scss`.
Die Datenschutzerklärung liegt statisch unter `public/privacy.html` bzw. `public/datenschutz.html`
(im Menü _Mehr → Datenschutz_).

Das Icon-Subset enthält alle Icon-Namen, die im Quelltext unter `src/` vorkommen. **Nach dem Hinzufügen
neuer Icons** neu erzeugen:

```bash
pip install fonttools brotli   # einmalig
npm run icons
```

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

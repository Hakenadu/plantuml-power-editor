# PlantUML Power Editor

Angular 22 (zoneless, Signals, OnPush) + Angular Material. PlantUML rendert lokal im Browser über
`@plantuml/core`. Details zu Aufbau und Features stehen in der README.

## Schreibstil für alle Texte

- **Keine Gedankenstriche.** Weder Halbgeviertstrich (U+2013) noch Geviertstrich (U+2014), in keiner Sprache.
  Das gilt für UI-Texte (`src/app/i18n/locales/*`), `index.html`, die statischen Seiten in
  `public/`, README, Code-Kommentare, Commit-Messages und Antworten an den Nutzer.
  Stattdessen Punkt, Komma, Doppelpunkt oder Klammern verwenden oder den Satz umbauen.
  Als Trenner im Seitentitel dient `|`. Bindestriche in Wörtern (z. B. „Live-Vorschau“) sind erlaubt.
- Prüfen vor dem Commit:
  `LC_ALL=C.UTF-8 grep -rnP "[\x{2013}\x{2014}]" src public README.md CLAUDE.md --include=*.{ts,html,scss,css,md,txt,xml}`

## Konventionen

- UI-Texte nur über die Wörterbücher: `de.ts` ist die Referenz, jede andere Sprache muss dieselben
  Schlüssel haben (der Compiler meldet fehlende). Neue Texte immer in allen Sprachen ergänzen.
- Statische Seiten (`about`/`ueber`, `privacy`/`datenschutz`, `terms`/`nutzungsbedingungen`) gibt es
  immer auf Deutsch und Englisch, verlinkt per `hreflang`, und sie stehen in `public/sitemap.xml`.
- Nichts von fremden Servern laden (keine CDNs, keine Google Fonts). Ausnahme ist nur die
  PlantUML-Standardbibliothek bei `!include <…>`, die in der Datenschutzerklärung beschrieben ist.
  Vorlagen und Beispiele verwenden sie nicht.
- Nach dem Hinzufügen neuer `mat-icon`s das Icon-Subset neu erzeugen: `npm run icons`.

## Deployment

- Image: `docker build -t hakenadu/plantuml-editor:latest .` und `docker push hakenadu/plantuml-editor:latest`.
- Server: per SSH `hakenadu@mseiche.de`, im Home-Verzeichnis
  `docker compose pull plantuml-editor && docker compose up -d --no-deps plantuml-editor`.
- `plantuml-editor.com` ist die kanonische Domain; der Container leitet alle anderen Hosts
  (z. B. `plantuml.mseiche.de`) per 301 dorthin um.

export interface DiagramTemplate {
  id: string;
  label: string;
  icon: string;
  source: string;
}

export const TEMPLATES: DiagramTemplate[] = [
  {
    id: 'sequence',
    label: 'Sequenzdiagramm',
    icon: 'swap_horiz',
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
  {
    id: 'class',
    label: 'Klassendiagramm',
    icon: 'account_tree',
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
  {
    id: 'activity',
    label: 'Aktivitätsdiagramm',
    icon: 'alt_route',
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
  {
    id: 'component',
    label: 'Komponentendiagramm',
    icon: 'widgets',
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
  {
    id: 'state',
    label: 'Zustandsdiagramm',
    icon: 'radio_button_checked',
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
  {
    id: 'usecase',
    label: 'Use-Case-Diagramm',
    icon: 'person_pin',
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
  {
    id: 'mindmap',
    label: 'Mindmap',
    icon: 'hub',
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
];

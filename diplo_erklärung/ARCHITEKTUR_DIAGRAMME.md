# Skyline - Architekturdiagramme

Dieses Dokument enthaelt Diagramme fuer die schriftliche Diplomarbeit.  
Empfehlung: Jedes Diagramm in der Arbeit mit einer Abbildungsnummer und Kurzbeschreibung versehen.

---

## Diagramm 1 - Gesamtsystem (Kontext)

```mermaid
flowchart LR
  U[User auf Mobile App] --> APP[Skyline App<br/>React Native + Expo]
  APP --> STORE[State Layer<br/>Zustand]
  STORE --> SVC[Service Layer]
  SVC --> SB[(Supabase<br/>Auth + Postgres + Storage)]
  SVC --> API1[Aviationstack API]
  SVC --> API2[OCR.space API]
  SVC --> API3[Expo Notification Services]
```

---

## Diagramm 2 - Schichtenmodell intern

```mermaid
flowchart TB
  UI[Presentation Layer<br/>Screens + Components]
  ST[State Layer<br/>Store + Context]
  SV[Service Layer<br/>Business Logic]
  DB[Data Layer<br/>Supabase + SQL + RLS]
  EX[External Layer<br/>API Integrationen]

  UI --> ST
  ST --> SV
  SV --> DB
  SV --> EX
```

---

## Diagramm 3 - Flugimport End-to-End

```mermaid
sequenceDiagram
  participant User
  participant Screen as add-flight-import
  participant Parser as BCBP/OCR Parser
  participant AirportSvc as airports service
  participant Store as Zustand Store
  participant Supa as Supabase

  User->>Screen: Scan QR / waehle Bild/Dokument
  Screen->>Parser: parseBCBP / runOcrSpace
  Parser-->>Screen: extrahierte Flugdaten
  Screen->>AirportSvc: ensureAirportByCode / ensureAirportForSelection
  AirportSvc->>Supa: upsert/select airports
  AirportSvc-->>Screen: persistierte Airport-Datensaetze
  User->>Screen: bestaetigt/ergaenzt Daten
  Screen->>Store: addFlight(...)
  Store->>Supa: createFlight(...)
  Supa-->>Store: gespeicherter Flug
  Store-->>User: Erfolg + Folgeaktionen (Reminder/Stats)
```

---

## Diagramm 4 - Reminder/Notification Pipeline

```mermaid
flowchart LR
  A[Flight/Note/Checklist Event] --> B[Reminder Logic<br/>flightAutoReminderService / noteChecklistReminderService]
  B --> C[notifications.ts<br/>lokales Scheduling]
  B --> D[notificationRegistry.ts<br/>DB-Persistenz]
  D --> E[(notifications Tabelle)]
  E --> F[notificationRescheduler]
  F --> C
  C --> G[Device Notification]
```

---

## Diagramm 5 - Company Rollen und Zugriff

```mermaid
flowchart TB
  O[Owner] -->|kann| C1[Company erstellen]
  O -->|kann| C2[Invite-Code erzeugen]
  O -->|kann| C3[Mitglieder verwalten]
  O -->|kann| C4[Company-Flights ueberblicken]

  W[Worker] -->|kann| W1[Per Invite beitreten]
  W -->|kann| W2[Company-Flights sehen]
  W -->|kann| W3[Eigene Fluege im Company-Kontext anlegen]

  O --> RLS[RLS Policies]
  W --> RLS
  RLS --> DB[(Company + Flights Daten)]
```

---

## Diagramm 6 - Datenmodell (vereinfacht)

```mermaid
erDiagram
  PROFILES ||--o{ USER_FLIGHTS : owns
  AIRPORTS ||--o{ USER_FLIGHTS : from_to
  USER_FLIGHTS ||--o{ FLIGHT_DOCUMENTS : has
  USER_FLIGHTS ||--o{ USER_NOTES : has
  USER_FLIGHTS ||--o{ USER_CHECKLISTS : has
  USER_CHECKLISTS ||--o{ USER_CHECKLIST_ITEMS : contains
  COMPANIES ||--o{ COMPANY_MEMBERS : has
  COMPANIES ||--o{ USER_FLIGHTS : groups
  USERS ||--o{ COMPANY_MEMBERS : participates
```


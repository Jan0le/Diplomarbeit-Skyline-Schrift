# 03 - Datenmodell und Security

## 3.1 Datenmodell - Uebersicht

Das Datenmodell ist in funktionale Bereiche gegliedert:

- **Core User/Flight Bereich**
  - `profiles`
  - `airports`
  - `user_flights`
- **Reiseorganisation**
  - `user_notes`
  - `user_checklists`
  - `user_checklist_items`
  - `note_templates`
  - `checklist_templates`
  - `checklist_template_items`
- **Business/Team Bereich**
  - `companies`
  - `company_members`
  - `company_invites`
- **Event/Reminder Bereich**
  - `events`
  - `reminders`
  - `notifications`
- **Dokumente**
  - `flight_documents` + Storage Bucket

## 3.2 Relationale Schluesselbeziehungen

Wichtige Beziehungen:

- `profiles.id` referenziert `auth.users.id`
- `user_flights.profile_id -> profiles.id`
- `user_flights.from_airport_id/to_airport_id -> airports.id`
- `flight_documents.flight_id -> user_flights.id`
- `company_members.company_id -> companies.id`
- `company_members.user_id -> auth.users.id`

Zusatzlogik:

- `company_id` in `user_flights` markiert Team-/Firmenfluege
- Notes/Checklists haengen direkt am konkreten Flug

## 3.3 Performance-Aspekte im DB-Design

Es wurden wiederholt Optimierungen ueber SQL-Skripte eingebracht:

- Indizes fuer haeufige Filter (`profile_id`, `date`, `status`, `company_id`)
- Airport-Suchoptimierungen (inkl. trigram-basierter Suche)
- dedizierte RPCs fuer performante Suchen und Aggregationen

Beispiele:

- `autocomplete_airports_fast`
- `search_airports_fast`
- `get_user_stats`

## 3.4 Row Level Security (RLS)

RLS ist zentral fuer das Sicherheitsmodell:

- Benutzer sehen nur eigene Daten.
- Teamdaten werden rollenbasiert freigegeben.
- Owner-spezifische Operationen sind abgesichert.

Beispielmuster:

- `auth.uid() = profile_id`
- Zugriff auf Company-Daten via `EXISTS (...)` auf `company_members`

## 3.5 Storage-Security

Dokumente und Profilbilder liegen in Supabase Storage.  
Die Zugriffskontrolle erfolgt ueber:

- Bucket-Policies
- Dateipfadkonventionen (user-/flight-bezogene Pfade)
- Signierte URLs fuer kontrollierten Zugriff

## 3.6 Integritaet und Datenpflege

Um Datenqualitaet sicherzustellen, werden eingesetzt:

- Constraints (z. B. Rollen, Statuswerte)
- Trigger fuer `updated_at`
- idempotente Migrationen
- Backfills fuer neue Spalten/Funktionen

## 3.7 Sicherheitsrisiken und Harterungsbedarf

Technisch relevante Punkte fuer die Abschlussphase:

- Sensitive Konfigurationswerte strikt ueber sichere Secrets verwalten.
- Debug-/Testinstrumentierung vor Release bereinigen.
- RLS-Policies regelmaessig gegen neue Features pruefen.

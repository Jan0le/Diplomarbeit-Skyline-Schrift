# 04 - Umsetzung: Kernflows und Services

## 4.1 Auth & Session Flow

Der Auth-Flow kombiniert Supabase Auth mit lokalem Session-Persistenzverhalten:

- Sign-up/Sign-in via Supabase
- Profilaufladung aus `profiles`
- Session-Synchronisation beim App-Start
- Passwort-Reset inklusive Deep-Link Rueckfuehrung in den App-Flow

Relevante Module:

- `contexts/AuthContext.tsx`
- `services/supabase.ts`
- `app/auth/*`

## 4.2 Flight-Erfassung (manuell)

Der manuelle Flow in `add-flight-manual` deckt Validierung, Distanzberechnung und Persistierung ab:

1. Eingabe und Validierung von Flug-/Zeit-/Airportdaten
2. Airport-Auswahl ueber Autocomplete
3. optionale Distanz-/Dauerberechnung
4. Save ueber Store-Aktion und Service-Layer
5. Folgeaktionen (Stats, Reminder)

Nutzen:

- Hohe Kontrolle fuer den Nutzer
- robust gegen unvollstaendige Quelldaten

## 4.3 Flight-Import (QR/BCBP/OCR)

Importpfad in `add-flight-import`:

- QR Scan mit `expo-camera`
- BCBP Parsing (`Skyline ticket ausleser/bcbp.ts`)
- OCR-Fallback mit OCR.space
- Vorbelegung von Formularfeldern
- Nutzer korrigiert/bestaetigt und speichert final

Besonderheit:

- Airports werden bei Auswahl/API-Treffer in die DB uebernommen, damit Flights stabile Fremdschluessel besitzen.

## 4.4 Kartenlogik und Live-Progress

In `app/(tabs)/map.tsx`:

- Great-circle Route zwischen Airports
- Segmentierung in bereits geflogenen und kommenden Teil
- Live-Progress aus `departureAt`/`arrivalAt`
- Bearing-Berechnung fuer realistische Flugzeugausrichtung
- Fokus-/Follow-Mechanik fuer bessere Lesbarkeit

## 4.5 Trip Details als Integrations-Hub

`trip-details` ist die zentrale Arbeitsoberflaeche pro Flug:

- Overview
- Notes
- Checklists
- Documents
- Photos
- Company-Kontext

Damit entstehen kurze Wege fuer alle Folgeaktionen nach dem Anlegen eines Fluges.

## 4.6 Notes, Checklists und Templates

Fachlich umgesetzt mit:

- CRUD fuer Notes/Checklists inkl. Item-Ebene
- Reminder pro Note/Checklist
- Templates fuer wiederkehrende Eintraege
- Optimistische UI-Updates fuer schnelle Wahrnehmung

Relevante Module:

- `components/notes/*`
- `components/checklists/*`
- `services/noteChecklistReminderService.ts`
- Store-Aktionen in `store/index.ts`

## 4.7 Dokumentenablage (FA-02)

Implementationsumfang:

- Upload aus Datei- und Bildquellen
- Ablage im Bucket `flight-documents`
- Metadaten in `flight_documents`
- Signed URL Verwaltung
- lokale Caching-Pfade fuer schnelleren erneuten Zugriff
- Rename/Delete im UI

Relevante Module:

- `services/documentService.ts`
- `components/documents/*`

## 4.8 Company- und Rollenlogik

Company-Features wurden auf Owner/Worker Rollen abgestimmt:

- Company anlegen
- per Invite Code beitreten
- aktive Company wechseln
- Teammitglieder anzeigen/verwalten
- Company Flights aggregieren

Service:

- `services/companyService.ts`

UI:

- `app/company/index.tsx`
- `app/company/create.tsx`
- `app/company/join.tsx`
- `app/company/invite.tsx`

## 4.9 Notification-/Reminder-Architektur

Reminder-Logik ist mehrstufig:

1. Lokale Scheduling-Schicht (`notifications.ts`)
2. Persistenz in `notifications` Tabelle (`notificationRegistry.ts`)
3. Fachlogik pro Flug (`flightAutoReminderService.ts`)
4. Re-Scheduling offener Events (`notificationRescheduler.ts`)

Unterstuetzt werden u. a.:

- Check-in Reminder
- Boarding Reminder
- Dokumentencheck
- Beleg-Reminder
- Quiet Hours

---

Diese Umsetzung zeigt den Full-Stack Charakter: Jeder Nutzerflow hat Frontend-, Service-, Datenmodell- und Security-Anteile.

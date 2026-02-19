# 06 - Testing und Qualitaetssicherung

## 6.1 Zielsetzung

Qualitaetssicherung in Skyline verfolgt drei Ziele:

- funktionale Korrektheit der Kernprozesse
- stabile mobile User Experience
- sichere und nachvollziehbare Datenoperationen

## 6.2 Aktueller Teststand

Vorhandene Bausteine:

- Linting ueber `expo lint`
- Unit Tests ueber Jest (`npm test`)
- Beispielhafte Utility-Tests in `__tests__/flightMetrics.test.ts`

Abgedeckte Testfaelle (Auszug):

- Distanzberechnung (Haversine)
- Distanz-/Dauerformatierung
- Dauerberechnung aus Zeitstempeln

## 6.3 Manuelle Tests (projektpraktisch)

Fuer mobile Features sind manuelle End-to-End Tests besonders relevant:

- Authentifizierung inkl. Reset-Flow
- Flugimport mit QR/OCR
- manuelles Anlegen/Bearbeiten/Loeschen von Fluegen
- Reminder-Ausloesung (inkl. Quiet Hours)
- Dokumentenupload und Dokumentanzeige
- Company Join/Invite/Role Verhalten

## 6.4 Technische QA-Massnahmen im Code

Im Projekt sichtbar:

- defensive Fehlerbehandlung mit try/catch und Fallbacks
- idempotente Migrationsskripte
- optimistische UI mit Rollback-Strategie bei Fehlern
- Kapselung externer APIs in Service-Modulen

## 6.5 Testluecken (Ist-Stand)

Noch ausbaubar:

- Integrationstests fuer Service-Layer (mocked Supabase/API)
- E2E-Szenarien fuer kritische Nutzerpfade
- Regressionstests fuer Company-Rollen und RLS-kritische Flows

## 6.6 Konkreter Ausbauplan

1. **Unit Tests erweitern**
   - Parsing-Flows (BCBP/OCR extraction)
   - Reminder-Zeitlogik (inkl. Quiet Hours)

2. **Integrationstests**
   - `supabaseService` Methoden gegen Testdaten
   - Notification Registry und Statuswechsel

3. **E2E/Device Tests**
   - Import -> Save -> Map -> Trip Details
   - Company Join -> Company Flight Sichtbarkeit
   - Document Upload -> Viewer -> Delete

## 6.7 Fazit

Der aktuelle Stand zeigt eine solide technische Basis mit ersten automatisierten Tests und viel praxisnaher Validierung in realen App-Flows.  
Fuer einen produktionsnahen Reifegrad sollte die automatisierte Testabdeckung gezielt in den oben genannten Bereichen erweitert werden.

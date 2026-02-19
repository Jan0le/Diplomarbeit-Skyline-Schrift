# 07 - Projektverlauf und Chronologie

## 7.1 Entwicklungsmodell

Die Entwicklung verlief iterativ in mehreren Branches mit regelmaessigen Merge-Phasen.  
Der Projektverlauf zeigt typische Full-Stack Evolution:

- zuerst Grundgeruest und UI-Struktur
- danach Feature-Ausbau
- anschliessend Stabilisierung und Qualitaet

## 7.2 Teambeitraege (Git shortlog)

Commit-Historie nach Autor:

- Jan0le: 25
- BorisPlesnicar/Boris Plesnicar: 26 (zwei Namensvarianten)

Das zeigt eine kontinuierliche gemeinsame Weiterentwicklung.

## 7.3 Phasenueberblick

### Phase A - Fundament (08/2025)

- Initiale Commits und Projektsetup
- erste UI/UX Strukturen
- Basis fuer Navigation und Kernscreens

### Phase B - Feature-Aufbau (09-11/2025)

- Kartenfunktionen und Routenvisualisierung
- Import- und Flight-Handling-Ausbau
- Rollen/Company-Funktionen
- API-Integrationen (u. a. Aviationstack)

### Phase C - Vertiefung Full-Stack (12/2025-01/2026)

- Dokumentensystem (Storage + DB)
- Reminder/Notification-Logik
- Distanz-/Statistik-Features (inkl. DB-RPC)
- Verbesserte Datenmodelle und Migrationen

### Phase D - Stabilisierung (02/2026)

- UX- und Flow-Stabilisierung (Trip/Checklist)
- Notification Delivery Fixes
- Passwort-Recovery
- Merge/Conflict-Aufloesungen auf Arbeitsbranch

## 7.4 Beispielhafte Meilenstein-Commits

- FA-02 Dokumentenablage + FA-04 Live Map Tracking
- FA-05 Flight Metrics + Tests
- FA-07 Quiet Hours Reminder
- FA-09 Stats Dashboard
- Passwort-Recovery Flow

## 7.5 Lessons Learned aus dem Verlauf

1. **Migrationen frueh strukturieren**  
   SQL-first mit idempotenten Skripten vereinfacht spaetere Anpassungen.

2. **Service-Layer strikt halten**  
   Entkoppelt UI von Backenddetails und beschleunigt Feature-Erweiterung.

3. **UI-Stabilisierung ist eine eigene Phase**  
   Nach Feature-Building braucht es gezielte Iterationen fuer Reaktionszeit und Konsistenz.

4. **Team-Features erhoehen Komplexitaet stark**  
   Rollenmodell und Sichtbarkeitsregeln muessen frueh sauber definiert werden.

## 7.6 Fazit

Die Git-Chronologie zeigt ein realistisches Diplomarbeitsprojekt:  
von der prototypischen Basis ueber feature-getriebene Erweiterung bis zur produktnahen Stabilisierung mit klaren technischen Reifeschritten.

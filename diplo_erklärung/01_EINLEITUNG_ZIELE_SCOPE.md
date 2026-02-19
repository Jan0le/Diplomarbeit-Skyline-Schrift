# 01 - Einleitung, Ziele und Scope

## 1.1 Ausgangssituation

Im Projekt Skyline wurde eine mobile Full-Stack Anwendung entwickelt, die Flugreisen strukturiert verwaltet und den kompletten Reisekontext abdeckt.  
Der Fokus liegt nicht nur auf dem Speichern von Flugdaten, sondern auf einer produktiven End-to-End Loesung mit:

- Import und Erfassung von Fluegen
- Visualisierung und Fortschrittsdarstellung auf der Karte
- Reiseorganisation (Notizen, Checklisten, Dokumente)
- Team-/Firmenfunktionen
- Reminder und Nutzerfuehrung

## 1.2 Problemstellung

Viele Nutzer verwalten Flugreisen verteilt auf verschiedene Tools (Kalender, Notizen, Foto-App, Mail, Dokumentenordner). Dadurch entstehen:

- Medienbrueche
- Dateninkonsistenzen
- hoher manueller Aufwand
- fehlende Teamtransparenz im Business-Kontext

Skyline adressiert diese Punkte durch eine integrierte mobile Plattform.

## 1.3 Projektziele

### Fachliche Ziele

- Schnelle und alltagstaugliche Flugverwaltung
- Mehrwertfunktionen statt reinem CRUD
- Unterstuetzung von privaten und beruflichen Reisen

### Technische Ziele

- Saubere Trennung von UI, State und Service-Layer
- Sichere Datenhaltung mit RLS
- Skalierbare Architektur fuer weitere Features
- Mobile Performance und stabile UX

## 1.4 Abgrenzung (Scope)

### Im Scope (implementiert)

- Authentifizierung und Profilverwaltung
- Fluganlage manuell und per Import
- Airport Search via API + Persistierung
- Map-Visualisierung mit Route und Live-Progress
- Dokumentenablage (Upload, View, Rename, Delete)
- Notes, Checklisten, Templates und Reminder
- Company-Features (Owner/Worker, Invite, Join)
- Statistiken und Achievements

### Teilweise/noch offen

- Teile der Kalender-Synchronisation sind vorbereitet, aber nicht vollstaendig umgesetzt.
- Einige Methoden in der Datenzugriffsschicht sind als TODO markiert.
- Analytics ist aktuell als leichter Platzhalter implementiert.

## 1.5 Technologischer Rahmen

Skyline wurde mit einem modernen Mobile Full-Stack Stack umgesetzt:

- Frontend: React Native, Expo, TypeScript, Expo Router, Zustand
- Backend: Supabase (Auth, Postgres, Storage, RLS, RPC)
- Integrationen: Aviationstack, OCR.space, Expo Notifications

Damit wurden sowohl produktive Entwicklungsgeschwindigkeit als auch saubere Daten- und Sicherheitskonzepte erreicht.

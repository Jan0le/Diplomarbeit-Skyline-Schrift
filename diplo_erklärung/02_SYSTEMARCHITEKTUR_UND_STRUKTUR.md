# 02 - Systemarchitektur und Projektstruktur

## 2.1 Architekturüberblick

Skyline folgt einem schichtenorientierten Ansatz:

1. **Presentation Layer** (Screens und Komponenten)
2. **State Layer** (globaler Zustand und Aktionen)
3. **Service Layer** (Business-Logik, API-/DB-Zugriffe)
4. **Backend Layer** (Supabase Auth, Postgres, Storage)

Diese Trennung reduziert Kopplung und erleichtert Wartung, Testing und Erweiterung.

## 2.2 Frontend-Architektur

### Routing

- Expo Router mit file-based routing in `app/`
- Auth-Bereich und Haupt-App klar getrennt
- Tab-Navigation für Home/Map/Profile/Settings

### UI-Komponenten

- Wiederverwendbare Komponenten in `components/`
- Feature-spezifische Teilbloecke:
  - `components/documents/*`
  - `components/notes/*`
  - `components/checklists/*`
  - `components/tutorial/*`

### Auth-Kontext

- `contexts/AuthContext.tsx` verwaltet Session-nahe Informationen
- Company-Kontext (aktive Firma, Rolle, Memberships) ist in den Auth-Flow integriert

## 2.3 Backend-Architektur

### Supabase als Plattform

- **Auth**: Registrierung, Login, Passwort-Reset
- **PostgreSQL**: relationale Datenhaltung
- **Storage**: Dateiverwaltung (Dokumente, Profilbilder)
- **RLS**: Datensicherheit auf Zeilenebene

### SQL-first Ansatz

- Basisschema in `complete_working_schema.sql`
- inkrementelle Migrationsskripte in `scripts/`
- RPC-Funktionen für performancekritische oder komplexe Operationen

## 2.4 Service-Layer als Integrationspunkt

Die Services kapseln externe Abhängigkeiten und Datenzugriff:

- `services/supabase.ts` als zentrale Data-Access-Klasse
- spezialisierte Services für Airports, Dokumente, Notifications, Company, OCR

Dadurch bleiben Screens schlanker und fachlich fokussiert.

## 2.5 Projektstruktur

Wesentliche Verzeichnisse:

- `app/` - Screens und Routing
- `components/` - UI-Bausteine
- `contexts/` - Context Provider
- `services/` - Business- und Integrationslogik
- `store/` - globaler Zustand
- `types/` - zentrale Domain-Typen
- `utils/` - technische Hilfsfunktionen
- `scripts/` - SQL-Migrationen/Optimierungen

## 2.6 Architekturprinzipien

Im Projekt wurden folgende Prinzipien sichtbar umgesetzt:

- **Single Responsibility** pro Modul
- **Layered Architecture** für klare Verantwortlichkeiten
- **Defensive Fehlerbehandlung** mit Fallbacks
- **Evolvierbarkeit** über Migrationen und modulare Services
- **Mobile-first UX** mit Fokus auf responsive Bedienung

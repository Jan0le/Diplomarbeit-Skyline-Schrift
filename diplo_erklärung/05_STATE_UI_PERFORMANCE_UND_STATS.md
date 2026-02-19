# 05 - State, UI-Performance, Statistik und Achievements

## 5.1 State-Management mit Zustand

Der globale Zustand wird in `store/index.ts` verwaltet und umfasst:

- Auth- und Nutzerstatus
- Flugdaten
- Notes/Checklists nach Flug gruppiert
- Templates
- Fehler-/Loadingzustand
- Statistiken und Achievement-Aktionen

Vorteile:

- klare zentrale Aktionen
- gute Testbarkeit der Kernlogik
- einfache Persistenz mit AsyncStorage

## 5.2 Datenlade-Strategie

Um Ladezeiten zu reduzieren und UI-Reibung zu vermeiden, werden eingesetzt:

- Initiales Warmup nach Login
- selektives Nachladen nur bei Bedarf
- Datenvorbereitung fuer haeufig genutzte Screens
- defensive Fallbacks bei Teilfehlern

## 5.3 UI-Responsivitaet

Sichtbare Patterns:

- Optimistische UI Updates (save/delete zuerst lokal sichtbar)
- Debouncing bei Airport-Suche
- Animationen mit Reanimated fuer visuelle Rueckmeldung
- Floating/FAB-Muster fuer direkte Aktionen

## 5.4 Performance-Utilities

In `utils/performance.ts` befinden sich Hilfen fuer:

- stable callbacks/memoization
- Debounce Hook
- Chunk-Verarbeitung fuer grosse Datenmengen
- platform-spezifische Optimierungen

## 5.5 Distanz- und Metrikberechnungen

`utils/flightMetrics.ts` liefert:

- Haversine Distanz
- Distanz-/Dauerformatierung
- Parsing von Legacy-Textwerten
- konsistente Dauerberechnung aus Zeitstempeln

Diese Funktionen sind zentral fuer:

- Statistiken
- Kartenlogik
- Nutzwert im Profil/Home

## 5.6 Statistikmodell

Stats werden kombiniert aus:

- serverseitiger RPC-Aggregation (`get_user_stats`)
- clientseitiger Ergaenzung/Fallback

Wichtige Kennzahlen:

- Anzahl Fluege
- besuchte Laender
- Gesamtstrecke
- Favoritendestination

## 5.7 Achievements

Achievements motivieren kontinuierliche Nutzung:

- Freischaltung basierend auf messbaren Metriken
- Speicherung ueber `user_achievements`
- visuelle Darstellung mit Fortschritt in `app/achievements.tsx`

Beispiele:

- First Flight
- Frequent Flyer
- Explorer (Laender)
- Distance 10k / 50k

## 5.8 Fazit des technischen Ansatzes

Die Kombination aus zentralem Zustand, optimistischem UI-Verhalten und gezielten Performance-Massnahmen erhoeht die wahrgenommene Geschwindigkeit deutlich.  
Gerade auf mobilen Geraeten ist diese Architekturentscheidung entscheidend fuer Akzeptanz und Alltagstauglichkeit.

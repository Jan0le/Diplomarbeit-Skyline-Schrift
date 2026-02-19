# 08 - Entscheidungen, Risiken, Roadmap und Fazit

## 8.1 Zentrale Architekturentscheidungen

### Entscheidung 1: Supabase als Full-Stack Backend

**Warum:**  
Schnelle Umsetzung von Auth, Datenbank, Storage und Security (RLS) in einem konsistenten Oekosystem.

**Auswirkung:**  
Hohe Entwicklungsgeschwindigkeit und klare Security-Basis.

### Entscheidung 2: Service-Layer zwischen UI und Backend

**Warum:**  
UI soll keine DB- oder API-Details kennen.

**Auswirkung:**  
Bessere Wartbarkeit, klarere Verantwortung, sauberere Erweiterbarkeit.

### Entscheidung 3: API-first Airport Suche + DB-Persistierung

**Warum:**  
Schnelle Suche und aktuelle Daten, aber trotzdem stabile DB-Referenzen fuer Flights.

**Auswirkung:**  
Gute Balance aus Performance und Datenkonsistenz.

### Entscheidung 4: Reminder als mehrstufiges System

**Warum:**  
Lokales Scheduling fuer zuverlaessige mobile Notifications, serverseitige Registry fuer Nachvollziehbarkeit.

**Auswirkung:**  
Robuste Reminder-Logik trotz mobiler Laufzeitbedingungen.

## 8.2 Technische Risiken (aktueller Stand)

1. **Config/Security-Risiko**  
   Sensible Konfigurationswerte muessen vor produktiver Nutzung konsequent gehaertet werden.

2. **Partielle Feature-Reife**  
   Einige Module (z. B. Teile der Kalender-Synchronisation) sind vorbereitet, aber nicht final.

3. **Testabdeckung**  
   Unit-Test-Basis vorhanden, Integration/E2E aktuell noch ausbaubar.

4. **Release-Hygiene**  
   Debug- und Entwicklungsinstrumentierung sollte vor finalem Release bereinigt werden.

## 8.3 Roadmap (naechste technische Schritte)

### Kurzfristig

- Security Hardening (Secrets, Policies, Konfiguration)
- Testausbau fuer Kernflows
- Cleanup von Debug/Legacy-Resten

### Mittelfristig

- Kalender-Integrationen finalisieren
- Realtime-Features vervollstaendigen
- Monitoring/Telemetry strukturierter aufsetzen

### Langfristig

- Skalierung fuer groessere Teamnutzung
- Erweiterte Reporting-/Analysefunktionen
- Tieferes Offline/Sync-Konzept

## 8.4 Fazit der Diplomarbeit

Skyline demonstriert eine vollwertige mobile Full-Stack Umsetzung mit klarer fachlicher Zielerreichung und technisch nachvollziehbarer Architektur.  
Die Kombination aus moderner Mobile-UI, sauberem Service-Layer, SQL/RLS-gestuetztem Backend und iterativer Weiterentwicklung liefert eine belastbare Grundlage fuer die schriftliche Diplomarbeit.

Die offene Restarbeit ist klar identifizierbar und operationalisierbar, was den Projektstand realistisch und professionell macht.

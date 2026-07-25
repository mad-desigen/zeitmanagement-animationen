# Zeitmanagement

Zeitmanagement-Tool im Darkmode mit Deadline, Sendezeit, Kanban-Board,
Timeline, Vorbereitungstimer, Arbeits-Timer, Archiv und Analyse.

## Start

### Ohne Installation

Die Datei `index.html` kann direkt im Browser geöffnet werden. Das ist die
einfachste Variante für Firmenrechner ohne Administrationsrechte.

### Entwicklungsmodus

```bash
npm install
npm run dev
```

Die App läuft lokal im Browser. Der Entwicklungsserver zeigt die lokale Adresse
im Terminal, normalerweise `http://localhost:3000/`.

## Wichtige Funktionen

- Animationen werden im Kanban-Board per Drag and Drop verschoben.
- Die Timeline ist eine eigene Ansicht.
- Die Analyse-Ansicht hat Suche und zeigt Erfahrungswerte aus abgeschlossenen Aufgaben.
- Neue Aufgaben werden über den `+ Aufgabe hinzufügen` Dialog angelegt.
- Bestehende Aufgaben können über `Bearbeiten` geändert werden.
- CSV-Dateien aus Planner/Excel können importiert werden.
- Backups können als Datei gespeichert und wieder geladen werden.
- Projekttyp `ANIM`, `INFO` oder `KARTE` und Kürzel werden für den Ordnernamen erfasst.
- Die festen Sendefenster `17:45`, `19:30` und `21:45` sind als Schnellwahl hinterlegt.
- Die eigentliche Produktionsdeadline kann separat gesetzt werden.
- Das Board nutzt die Spalten `in Planung`, `in Arbeit`, `Abnahme` und `Fertig`.
- Fertige Aufgaben bleiben am aktuellen Tag sichtbar und werden beim Tageswechsel archiviert.
- Die Analyse-Ansicht zeigt abgeschlossene und archivierte Aufgaben mit erfassten Zeiten.
- Timer sind bewusst auf `Vorbereitung` und `in Arbeit` reduziert.
- Wird eine Aufgabe in `Abnahme` verschoben, stoppt eine laufende Zeiterfassung.
- Wird danach wieder ein Timer gestartet, springt die Aufgabe zur passenden Arbeitsspalte.
- Das Tool zeigt verbleibende Zeit und erfasste Arbeitszeit.
- Daten bleiben nach Reloads im Browser erhalten.
- Pro Animation kann eine ZIP-Datei nach der bestehenden Windows-Vorlage
  heruntergeladen werden: `AKT yyyy-MM-dd TYP KUERZEL` mit `Ergebnis`, `Material` und `Preview`.
- Browser-Benachrichtigungen warnen bei kritischen Aufgaben, solange die App offen ist.

## Datenspeicherung

Die App selbst wird über GitHub Pages ausgeliefert. Laufende Arbeitsdaten werden
lokal im Browser gespeichert. Für eine sichere Sicherung gibt es `Backup
speichern` und `Backup laden`.

Direktes Speichern laufender Aufgaben in GitHub ist in einer öffentlichen
Browser-App bewusst nicht eingebaut, weil dafür ein Schreibzugang im Browser
liegen müsste. Das wäre für Arbeitsdaten und ein öffentliches Repository nicht
sicher.

## Prüfen

```bash
npm run lint
npm test
```

## GitHub-Nutzung

Der Code kann im GitHub-Repo versioniert werden. Die Arbeitsdaten liegen lokal
im Browser, damit laufende Timer nicht staendig kleine GitHub-Aenderungen
erzeugen.

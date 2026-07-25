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
- Dateien aller Typen können an Aufgaben gehängt werden.
- Pro Aufgabe kann ein Titelbild gewählt und vor dem Speichern auf 21:9 zugeschnitten werden.
- Bereits hochgeladene Bilder können als Titelbild übernommen werden.
- Die Seite ist als Smartphone-Webapp installierbar und hat eine mobile Bottom-Navigation.
- CSV-Dateien aus Planner/Excel können importiert werden.
- Backups können als Datei gespeichert und wieder geladen werden.
- Projekttyp `ANIM`, `INFO` oder `KARTE` wird für den Ordnernamen erfasst; das Kürzel ist fest `PMY`.
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

Die App kann als statische `index.html` laufen und speichert lokal als Fallback
im Browser. Für globale Synchronisation nutzt sie `api.php` und speichert die
Aufgaben zentral in MySQL. Upload-Dateien werden auf dem Server abgelegt; in der
Aufgabe werden Datei-Metadaten und Titelbild-Verweise gespeichert. Die Seite ist
öffentlich nutzbar; das API ist daher ebenfalls öffentlich erreichbar.

## Prüfen

```bash
npm run lint
npm test
```

## GitHub-Nutzung

Der Code kann im GitHub-Repo versioniert werden. Laufende Arbeitsdaten gehören
auf den Server in die Datenbank, nicht in Git-Commits.

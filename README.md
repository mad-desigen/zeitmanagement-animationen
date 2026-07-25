# MDR Aktuell Produktions-Timeline

Zeitmanagement-Tool im Darkmode fuer Produktionen mit Animationsdeadline,
Sendezeit, Kanban-Board, Produktions-Timeline, Vorbereitungstimer,
Arbeits-Timer und Tagesauswertung.

## Start

```bash
npm install
npm run dev
```

Die App laeuft lokal im Browser. Der Entwicklungsserver zeigt die lokale Adresse
im Terminal, normalerweise `http://localhost:3000/`.

## Wichtige Funktionen

- Animationen werden im Kanban-Board per Drag and Drop verschoben.
- Die Produktions-Timeline ist eine eigene Ansicht.
- Neue Aufgaben werden ueber den `+ Aufgabe hinzufuegen` Dialog angelegt.
- Projekttyp `ANIM`, `INFO` oder `KARTE` und Kuerzel werden fuer den Ordnernamen erfasst.
- Die festen Sendefenster `17:45`, `19:30` und `21:45` sind als Schnellwahl hinterlegt.
- Die eigentliche Produktionsdeadline kann separat gesetzt werden.
- Timer sind bewusst auf `Vorbereitung` und `in Arbeit` reduziert.
- Wird eine Aufgabe in `Abnahme` verschoben, stoppt eine laufende Zeiterfassung.
- Wird danach wieder ein Timer gestartet, springt die Aufgabe zur passenden Arbeitsspalte.
- Das Tool zeigt verbleibende Zeit und erfasste Arbeitszeit.
- Daten bleiben nach Reloads im Browser erhalten.
- Pro Animation kann eine ZIP-Datei nach der bestehenden Windows-Vorlage
  heruntergeladen werden: `AKT yyyy-MM-dd TYP KUERZEL` mit `_MAT` und `_ERG`.
- Browser-Benachrichtigungen warnen bei kritischen Aufgaben, solange die App offen ist.

## Pruefen

```bash
npm run lint
npm test
```

## GitHub-Nutzung

Der Code kann im GitHub-Repo versioniert werden. Die Arbeitsdaten liegen lokal
im Browser, damit laufende Timer nicht staendig kleine GitHub-Aenderungen
erzeugen.

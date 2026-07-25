# Übergabe: Zeitmanagement

Stand: 25.07.2026

## Ziel des Tools

Das Tool ist ein persönliches Zeitmanagement-System für Animationsaufgaben im Produktionsalltag. Es soll schnell zeigen:

- welche Animationen aktiv sind
- welche Deadline als nächstes relevant ist
- wie viel Zeit bis zur Produktionsdeadline bleibt
- wie lange Vorbereitung und Arbeit tatsächlich gedauert haben
- welche Dateien und Titelbilder zu einer Aufgabe gehören

Die Oberfläche soll visuell schnell erfassbar, dunkel, modern und auf Desktop und Smartphone gut bedienbar sein.

## Live-Version

Öffentliche Seite:

```text
https://mad-design.de/mdr/
```

GitHub-Repo:

```text
https://github.com/mad-desigen/zeitmanagement-animationen
```

Wichtig: Zugangsdaten gehören nicht in diese Übergabe und nicht ins Git-Repo. Für Deployment oder Datenbankzugriff sichere Zugangsdaten separat verwenden.

## Aktive Architektur

Die aktuell relevante App besteht im Kern aus:

- `index.html`: komplette Frontend-App mit HTML, CSS und JavaScript
- `api.php`: Server-API für globale Synchronisierung, Datei-Uploads und Datei-Löschung
- `manifest.webmanifest`: PWA-Konfiguration
- `sw.js`: Service Worker für App-Shell-Cache
- `icon.svg`, `icon-512.png`, `apple-touch-icon.png`: App-Icons
- `tests/rendered-html.test.mjs`: Schutztests für wichtige Funktionen

Die App ist absichtlich als einfache Web-App gebaut, damit sie auch auf Firmenrechnern ohne Adminrechte funktioniert. Sie läuft öffentlich im Browser und nutzt serverseitig PHP/MySQL.

## Nicht verwechseln

Im Repo existieren auch Next/Vinext-Dateien wie:

- `app/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `worker/index.ts`
- `db/schema.ts`

Diese stammen aus früheren Entwicklungsständen. Für die live genutzte Version ist aktuell `index.html` die maßgebliche Oberfläche. Änderungen sollten zuerst dort erfolgen, solange keine bewusste Migration auf ein anderes Framework geplant ist.

## Datenspeicherung und Synchronisierung

Die App nutzt zwei Ebenen:

1. Browser-Fallback
   - Aufgaben werden lokal im Browser zwischengespeichert.
   - Das verhindert Datenverlust, falls der Server kurz nicht erreichbar ist.

2. Server-Sync
   - Die globale Synchronisierung läuft über `api.php`.
   - Aufgaben werden zentral in MySQL gespeichert.
   - Datei-Uploads werden auf dem Server abgelegt.
   - Datei-Metadaten und Titelbild-Verweise werden in den Aufgabendaten gespeichert.

Wichtig: Der Nutzer erwartet Live-Sync zwischen verschiedenen Browsern, Rechnern und Netzwerken. Änderungen sollen nicht nur lokal bleiben.

## Server-API

`api.php` enthält unter anderem:

- Tabelle `app_state` für den Aufgaben-/Board-Zustand
- Tabelle `uploaded_files` für hochgeladene Dateien
- `action=load`
- `action=save`
- `action=upload`
- `action=file`
- `action=deleteFile`

Dateien sollen beim Löschen wirklich vom Server entfernt werden, nicht nur aus der Oberfläche verschwinden.

## Hauptfunktionen

### Kanban

Ein gemeinsames Kanban, nicht nach Sendungen getrennt.

Spalten:

- `in Planung`
- `in Arbeit`
- `Abnahme`
- `Fertig`

Beim Anlegen einer Aufgabe wird die Sendung ausgewählt. Danach wird die Aufgabe im gemeinsamen Board verwaltet.

### Timer

Es gibt nur zwei bewusst einfache Zeitarten:

- `Vorbereitung`
- `in Arbeit`

Wichtiges Verhalten:

- Timer starten nur aktiv per Play-Button.
- `in Planung` misst nur Vorbereitungszeit.
- `in Arbeit` misst nur Arbeitszeit.
- Wird eine Aufgabe in `Abnahme` verschoben, stoppt die laufende Zeiterfassung.
- Wird danach ein Timer erneut gestartet, springt die Aufgabe automatisch in die passende Arbeitsspalte.

### Deadline und Sendezeit

Produktionsdeadline und Sendetermin sind unabhängig:

- Deadline: Zeitpunkt, bis wann die Animation fertig an Schnitt/CMS übergeben sein muss.
- Sendezeit: Sendetermin, zum Beispiel `17:45`, `19:30`, `21:45`.

Diese Unterscheidung ist für den Nutzer sehr wichtig.

### Timeline

Desktop:

- horizontale Produktions-Timeline
- aktive Aufgaben liegen als Balken auf einer Tageszeitleiste
- Deadline und Sendung werden als Marker gezeigt

Smartphone:

- keine gequetschte Desktop-Timeline
- eigene mobile Timeline-Ansicht
- Aufgaben werden nach Sendezeit gruppiert
- nur relevante Sendungen mit aktiven Aufgaben werden angezeigt
- innerhalb der Gruppe nach Deadline sortiert
- jede Karte zeigt Status, Deadline, Restzeit, erfasste Zeit und Fortschritt

### Mobile Web-App

Die Smartphone-Ansicht ist eine eigene mobile Variante derselben Web-App:

- mobile Bottom-Navigation
- Navigation als einfarbige Icons
- Kanban-Status als Icon-Tabs mit Zähler
- Karten full-width
- große Touch-Flächen
- kompakter Kopfbereich
- gleiche Serverdaten wie Desktop

Wichtig: Keine separate zweite Mobile-App mit eigenem Speicher bauen. Mobile ist eine angepasste Oberfläche über denselben Daten.

### Dateien und Titelbild

Pro Aufgabe:

- Upload aller Dateitypen
- Bild-Uploads können in einer Galerie/Shadowbox angesehen werden
- Galerie kann per Pfeilen durchgeklickt werden
- Dateien können heruntergeladen werden
- Dateien können mit Sicherheitsabfrage gelöscht werden
- Löschung muss Serverdatei und Datenbankeintrag entfernen
- Titelbild kann per Upload zugeschnitten werden
- Titelbild kann auch aus bereits hochgeladenen Bildern gewählt werden
- Titelbild wird im Verhältnis `21:9` angezeigt

### Projektordner

Pro Aufgabe kann ein ZIP-Projektordner erzeugt werden.

Struktur:

```text
Animationsprojekt/
Ergebnis/
Material/
Preview/
```

Das Kürzel ist fest `PMY` und braucht kein Eingabefeld.

### Archiv und Analyse

- Aufgaben in `Fertig` bleiben am Tag sichtbar.
- Am Ende beziehungsweise beim Tageswechsel werden fertige Aufgaben archiviert.
- Archivierte Aufgaben bleiben aufrufbar.
- Analyse-Seite nutzt abgeschlossene und archivierte Aufgaben.
- Ziel der Analyse: bessere eigene Zeitschätzung für künftige Animationen.

## UI-Standards und Nutzerwünsche

Der Nutzer legt starken Wert auf:

- Darkmode
- moderne, professionelle Optik
- keine überflüssigen Erklärungstexte in der Oberfläche
- lieber Icons statt lange Beschriftungen
- große, priorisierte Buttons
- klare Play/Pause-Logik
- keine blinkenden Hover-Effekte auf Touch-Geräten
- Boardkarten dürfen auf Mobile nicht abgeschnitten werden
- Desktop und Mobile dürfen sich im Layout unterscheiden, aber müssen dieselben Daten nutzen

## Deployment

Aktuell wird die Live-Version per FTP/SFTP-kompatiblem Upload in das Webverzeichnis veröffentlicht.

Der Zugang landet direkt im Zielverzeichnis:

```text
/www/mdr
```

Für einfache Frontend-Änderungen reicht normalerweise der Upload von:

```text
index.html
```

Bei PWA/Icon-Änderungen zusätzlich:

```text
manifest.webmanifest
sw.js
icon.svg
icon-512.png
apple-touch-icon.png
```

Bei API-Änderungen zusätzlich:

```text
api.php
```

Vor Deployment immer testen:

```bash
npm test
npm run build:pages
```

Nach Deployment kurz live prüfen:

```bash
curl -fsSL https://mad-design.de/mdr/ | rg "Zeitmanagement|mobile-board-tabs|mobile-timeline"
```

## Git-Workflow

Aktueller Hauptbranch:

```text
main
```

Nach Änderungen:

```bash
git status --short
npm test
npm run build:pages
git add <geänderte Dateien>
git commit -m "Kurze klare Beschreibung"
git push
```

Arbeitsdaten gehören nicht in Git. Git speichert Code und App-Dateien, nicht die laufenden Aufgaben.

## Tests

Wichtige Tests liegen in:

```text
tests/rendered-html.test.mjs
```

Sie prüfen unter anderem:

- App-Shell rendert
- keine alten Titel wie MDR-Aktuell oder Produktions-Timeline
- Server-Sync und Löschlogik
- gemeinsames Board
- Uploads, Titelbilder und Galerie
- PWA-Dateien
- mobile Board- und Timeline-Struktur
- mobile Icon-Navigation

Bei neuen Features die Tests erweitern, wenn die Funktion wichtig für den Nutzerfluss ist.

## Wichtige technische Hinweise

- `index.html` enthält viel Logik in einer Datei. Änderungen sollten gezielt und klein bleiben.
- Keine großen Refactorings ohne klaren Nutzen.
- Bestehende Nutzerlogik nicht blind umbauen.
- Mobile und Desktop sollen denselben Datenstand verwenden.
- Server-Sync darf nicht durch lokale-only Änderungen ersetzt werden.
- Upload-Löschung muss Serverdateien wirklich entfernen.
- Keine Passwörter oder Zugangsdaten in Git committen.

## Offene sinnvolle Verbesserungen

Diese Punkte wären als nächste Schritte sinnvoll:

- echte Konfliktanzeige, falls zwei Browser dieselbe Aufgabe gleichzeitig ändern
- sichtbarer Sync-Status in Mobile kompakter darstellen
- optionaler manueller Refresh-Button für Server-Sync
- mobile Analyse weiter verdichten
- bessere Fehlermeldungen bei Upload-/Serverproblemen
- langfristig: API absichern, falls die öffentliche Seite später nicht mehr offen sein soll

## Kurzbriefing für eine andere KI

Arbeite primär in `index.html` und `api.php`. Die Live-App ist eine öffentliche PHP/MySQL-gestützte Web-App unter `https://mad-design.de/mdr/`. Sie muss Desktop und Smartphone getrennt layouten, aber denselben Serverdatenstand nutzen. Keine lokale-only Speicherung als Hauptlösung einbauen. Keine Zugangsdaten ins Repo schreiben. Vor Änderungen die vorhandene Kanban-, Timer-, Upload-, Archiv- und Mobile-Logik verstehen. Nach Änderungen `npm test` und `npm run build:pages` ausführen und die geänderten Live-Dateien deployen.

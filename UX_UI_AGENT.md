# UX/UI Agent: Zeitmanagement

Diese Datei ist die dauerhafte UX/UI-Prüfinstanz für dieses Projekt. Jede KI, die an der Oberfläche arbeitet, soll diese Regeln vor Änderungen lesen und gegen die geplante Umsetzung prüfen.

## Aufgabe des UX/UI Agents

Der UX/UI Agent prüft, ob eine Änderung:

- die Bedienung schneller und verständlicher macht
- Desktop und Smartphone sinnvoll getrennt behandelt
- keine bestehende Produktionslogik gefährdet
- visuell ruhig, professionell und im Darkmode konsistent bleibt
- wichtige Aktionen größer und klarer darstellt als Nebenaktionen

## Grundsatz

Nicht jede konkrete Nutzeranweisung blind umsetzen. Erst prüfen:

- Welches Problem steckt dahinter?
- Ist die gewünschte Lösung die beste Lösung?
- Gefährdet sie Server-Sync, Timerlogik, Archiv oder Uploads?
- Wird Mobile dadurch wirklich besser oder nur dichter?

Wenn eine Anweisung technisch oder gestalterisch riskant ist, kurz erklären und eine bessere Umsetzung wählen.

## Desktop

- Desktop darf dichter sein als Mobile.
- Verwandte Formularfelder dürfen nebeneinander stehen, wenn dadurch schneller gearbeitet werden kann.
- Kanban bleibt die primäre Arbeitsansicht.
- Timeline darf horizontal und produktionsartig bleiben.
- Texte sind erlaubt, wenn sie die Bedienung klarer machen.

## Smartphone

- Keine gequetschte Desktop-Version.
- Mobile nutzt eigene Layouts über denselben Serverdaten.
- Hauptnavigation als Icon-Leiste.
- Statuswechsel und wichtige Aktionen müssen gut mit dem Daumen erreichbar sein.
- Karten dürfen nicht abgeschnitten werden.
- Keine Hover-Effekte, die auf Touch-Geräten flackern.
- Lange Texte in Navigation oder Status-Tabs vermeiden.

## Buttons und Icons

- Primäre Aktion groß und eindeutig.
- Nebenaktionen als gleichmäßige Icon-Gruppe.
- Icon-Buttons brauchen `title` und `aria-label`.
- Keine uneinheitlichen Emojis für produktive UI.
- Icons müssen einfarbig und vollständig sichtbar sein.
- Löschen darf nicht neben versehentlich leicht treffbaren Primäraktionen liegen, außer es gibt eine Sicherheitsabfrage.

## Boardkarten

Immer schnell sichtbar:

- Titel
- Restzeit
- Play/Pause
- Sendezeit
- Deadline
- erfasste Zeit

Einklappbar oder sekundär:

- Dateien
- Zeiten im Detail
- Bearbeiten
- Projektordner
- Löschen

## Formulare

- Häufig gemeinsam genutzte Felder zusammenfassen.
- Auf Desktop können `Sendung` und `Typ` nebeneinander stehen.
- Auf Mobile müssen sie untereinander lesbar bleiben.
- Bildaktionen als Icon-Gruppe, nicht als lange Textbutton-Liste.

## Farben

- Board-Farbe gehört in Board-/Einstellungen, nicht in die Hauptnavigation.
- Farbwahl muss sofort sichtbar angewendet werden.
- Farbwahl muss serverseitig synchronisiert werden.
- Farbpalette nicht dominant machen; sie ist Einstellung, nicht Hauptworkflow.

## Vor Abschluss jeder UI-Änderung

Prüfen:

- Funktioniert Desktop?
- Funktioniert Mobile?
- Sind Touch-Flächen mindestens ca. 44 px hoch?
- Gibt es keine abgeschnittenen Karten?
- Bleibt Live-Sync erhalten?
- Sind Tests angepasst, wenn wichtige Struktur geändert wurde?
- Wurde nur das Nötige deployed?

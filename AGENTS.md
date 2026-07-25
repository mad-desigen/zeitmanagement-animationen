# Projektregeln

Vor UI- oder UX-Änderungen muss `UX_UI_AGENT.md` gelesen und gegen die geplante Umsetzung geprüft werden.

Konkrete Nutzeranweisungen sind Hinweise auf ein Problem, nicht automatisch die beste Lösung. Erst prüfen, ob die Änderung zur Architektur passt und Server-Sync, Timer, Archiv, Uploads oder Mobile/Desktop-Layout gefährdet.

Aktive Live-Oberfläche ist aktuell `index.html`. `api.php` ist die Server-API. Andere Framework-Dateien im Repo nicht als Hauptoberfläche behandeln, solange keine bewusste Migration geplant ist.

Keine Zugangsdaten in Git committen.

# Liquid Wealth 2.0

## Produktionsstruktur

- `index.html` — schlanke HTML-Struktur und Boot-Watchdog
- `assets/css/app.css` — komplette Oberfläche
- `assets/js/app.js` — Anwendungslogik
- `404.html` — statische Fehlerseite
- `recovery/v18-monolith.html` — letzter vollständig eigenständiger Stand für Notfälle

## Sicherheitsnetz

Vor dieser Umstellung wurde der Branch `backup-pre-structure-2026-10-07` angelegt.
Die Strukturänderung wurde zuerst auf `refactor-resilient-structure-v18` gebaut und geprüft.
Vercel deployt weiterhin aus GitHub.

## Änderungsregel

Größere Änderungen zuerst auf einem separaten Branch testen. Erst nach erfolgreicher Prüfung in `main` übernehmen.

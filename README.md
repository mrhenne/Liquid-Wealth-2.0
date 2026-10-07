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


## v24 audit

- full static integrity pass after drag-and-drop rollout
- FIRE Pace: required monthly contribution to the FIRE milestone deadline
- crypto allocation target and drift check
- cloud/status copy corrected
- safer structuredClone fallback
- duplicate settings action and stale UI version labels cleaned up

# Webcam-Zwischenspeicher für WetterProCamera

Vorbereitet am 15.10.2026, **noch nicht online**, weil keine Erlaubnis eines Betreibers vorliegt.

## Einrichten, sobald die erste Zusage da ist
1. In `mannheim-webcams.js` die Kennung in `FREIGEGEBEN` eintragen, z. B. `['oststadt']`.
2. Im Cloudflare-Dashboard (Konto wie bei `fuerte-sync`): Workers → Create → Code einfügen.
3. D1-Datenbank anlegen (z. B. `wetterpro-webcams`) und im Worker als Binding `DB` verknüpfen.
4. Settings → Trigger Events → Cron: `5,35 * * * *`.
5. Testen: `https://<worker>.workers.dev/webcam/jetzt`, dann `/webcam?kamera=oststadt`.
6. In `WetterProCamera/app.js` die Adresse des Workers eintragen (`WEBCAM_WORKER`), Kamera in `WEBCAMS` einkommentieren.

Die App ruft Bilder nur beim Worker ab, nie beim Betreiber. Live-Bild höchstens einmal pro Minute, Archiv alle 30 Minuten, 4 Tage.

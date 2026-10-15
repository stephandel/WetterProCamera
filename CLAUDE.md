# WetterPro Glas Test

## Gestaltung (vom Design-Konfigurator, 15.10.2026)

- Lies vor jeder Arbeit an der Oberfläche `DESIGN.md` und halte jede Regel ein.
- Nutze ausschließlich die Variablen aus `tokens.css` (nach `apple-ui/base.css` einbinden). Keine Farben, Größen oder Abstände hart in den Code schreiben.
- Wettersymbole nur über `symbole.js` (`WetterSymbol('regen')`), Satz „Klassisch".
- Harte Grenzen, die nie verletzt werden: Fließtext mindestens 16 px, kein Text unter 11 px, Tippflächen mindestens 44 × 44 px, Kontrast Text mindestens 4,5:1 in hell und dunkel, Zeilenlänge höchstens 75 Zeichen, Safe Areas beachten, `prefers-reduced-motion` und `prefers-reduced-transparency` respektieren.
- Glas nur auf schwebenden Flächen, nie Glas auf Glas.
- Funktion „Wetter mit Foto teilen" genau wie in `DESIGN.md` beschrieben: Bild mit `<canvas>` zeichnen, teilen mit `navigator.share({ files })`, sonst herunterladen.
- Vor Abschluss prüfen: 390 px Breite, Dunkelmodus, 130 % Schriftgröße, Offline-Zustand.

## Projekt

- Name: **WetterPro Glas Test**, unter dem Symbol: „Glas Test".
- Art: Web-App zum Installieren (PWA).
- Ordner: `KI Projekte/WetterPro Glas Test`. Dort anlegen, nirgendwo sonst.
- Optimiert für: iPhone (390 px, Daumen unten).
- Veröffentlichen: GitHub Pages.
- App-Symbol: `app-symbol-1024.png` (Motiv Heiter), dazu `apple-touch-icon.png` (180 px). Einbinden mit `<link rel="apple-touch-icon" href="apple-touch-icon.png">` und `<link rel="manifest" href="manifest.json">`; dazu ein Service Worker für den Offline-Betrieb.

## Zusätzliche Anweisungen

Vom Auftraggeber im Konfigurator notiert. Sie gehen den Regeln oben vor, solange keine Schutzregel verletzt wird.

- **Speichern und Veröffentlichen:** Wetterdaten live von Open-Meteo (kostenlos, ohne Schlüssel). Standardort Mannheim, Ortssuche im Tab Mehr. Läuft komplett ohne Server auf GitHub Pages.

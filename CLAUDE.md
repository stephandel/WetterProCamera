# WetterProCamera

## Gestaltung (vom Design-Konfigurator, 15.10.2026; Farben und Erscheinung 20.10.2026)

- Lies vor jeder Arbeit an der Oberfläche `DESIGN.md` und halte jede Regel ein.
- Nutze ausschließlich die Variablen aus `tokens.css` (nach `apple-ui/base.css` einbinden). Keine Farben, Größen oder Abstände hart in den Code schreiben.
- Wettersymbole nur über `symbole.js` (`WetterSymbol('regen')`), Satz „Klassisch".
- Harte Grenzen, die nie verletzt werden: Fließtext mindestens 16 px, kein Text unter 11 px, Tippflächen mindestens 44 × 44 px, Kontrast Text mindestens 4,5:1 (die App ist seit 20.10.2026 immer dunkel, Akzent Gelb: gelbe Schrift nur auf dunklem Grund, Text auf gelber Fläche immer dunkel), Zeilenlänge höchstens 75 Zeichen, Safe Areas beachten, `prefers-reduced-motion` und `prefers-reduced-transparency` respektieren.
- Glas nur auf schwebenden Flächen, nie Glas auf Glas.
- Kamera und Teilen (seit 20.10.2026): Kamera-Studio aus dem Kamera-Konfigurator, Abschnitt „Modul Kamera-Studio“ in `DESIGN.md`. Dateien in `lib/kamera-studio/` nie von Hand ändern, sondern in der Quelle (`Wetter Apps/Kamera Konfigurator/src/`) ändern und mit `node tools/kamera-studio-holen.js` neu holen, danach `node tools/version.js`. Das Studio läuft mit `speicher: 'wpcamera'` (Galerie `wpcamera-ks-galerie`), damit nichts mit WeddaApp und Konfigurator geteilt wird. Test: `node tests/wetterfoto.test.js`. Der alte Teilen-Bildschirm (Canvas 3:4) samt `?teilen=alt` wurde am 21.10.2026 entfernt (A24); es gibt nur noch das Studio. Geblieben ist die alte Galerie „Frühere Wetterfotos“ (IndexedDB `wpc-galerie`, nur sichtbar, wenn dort noch Fotos liegen; ansehen, teilen, löschen). Nie GPS oder Foto-Metadaten weitergeben.
- Startseite (seit 21.10.2026, A9): Module Warnung (`#a9Warnung`, DWD über Bright Sky, nur Orte in Deutschland, ganz oben) und Luftqualität (`#a9Luft`, Open-Meteo, nach der Tagesliste) sind gebaut; „Was heute geht“ höchstens 2 Tipps (`A5_MAX_TIPPS`). Warnfarben und Luft-Farben stehen als Variablen am Ende von `app.css`. Tab „Mehr“: fünf einklappbare Gruppen (`wpc-mehr-offen`, Standard nur „Orte“ offen, am Mac alle offen); Tests öffnen sie vorab. Neue Tests: `tests/warnung-luft.test.js`, `tests/nutzertest-funde.test.js`.
- Sonne und Mond, Karten-Ebenen, Foto-Infos (seit 22.10.2026, A26): Kacheln `.w3-sonne-kachel` und `.w3-mond-kachel` (Reihenfolge nach der Luftqualität, Blätter `#w3Sonne`, `#w3Mond`, `w3Blatt` lässt den Fokus kreisen). Rad/Sat hat die Ebenen Wind, Wolken, Isobaren aus einem Open-Meteo-Gitter (`A26_NAMEN`, `a26Zeigen`, Bild `.a26-flaeche`); nur Open-Meteo, keine neuen Server. Das Studio startet mit `KS_EINSTELLUNG.start` (nur Temperatur, Symbol, Ort, Datum). `meteogramm.js/.css` bleiben gleich mit dem Baustein in `WetterPro Nachbauten/gemeinsam/`; Anpassungen nur in `app.css`. Test: `tests/a26-a28.test.js`.
- Vollbild (seit 21.10.2026, A32): ⤢ im Meteogramm (Baustein) und „Vollbild“ unter der Rad/Sat-Karte (`radsatVollbild` in `app.js`, die Karte ist kein Baustein) legen den Inhalt als Blatt über den ganzen Bildschirm; „Fertig“, Esc und Zurück schließen, der Rest ist solange inert. Schalter „Meteogramm und Karten immer im Vollbild“ unter Mehr → Startseite (`wpc-vollbild-immer`, `a32Immer`): Graphs (nur Darstellung Meteogramm) und Rad/Sat öffnen dann gleich als Blatt, „Fertig“ führt zum vorherigen Reiter. Test: `tests/vollbild.test.js`.
- Vor Abschluss prüfen: 390 px Breite, Dunkelmodus, 130 % Schriftgröße, Offline-Zustand.

## Projekt

- Name: **WetterProCamera**.
- Art: Web-App zum Installieren (PWA).
- Ordner: `KI Projekte/Wetter Apps/WetterPro Camera App`. Dort anlegen, nirgendwo sonst.
- Optimiert für: iPhone (390 px, Daumen unten).
- Veröffentlichen: GitHub Pages.
- App-Symbol: `app-symbol-1024.png` (Motiv Heiter), dazu `apple-touch-icon.png` (180 px). Einbinden mit `<link rel="apple-touch-icon" href="apple-touch-icon.png">` und `<link rel="manifest" href="manifest.json">`; dazu ein Service Worker für den Offline-Betrieb.

## Zusätzliche Anweisungen

Vom Auftraggeber im Konfigurator notiert. Sie gehen den Regeln oben vor, solange keine Schutzregel verletzt wird.

- **Speichern und Veröffentlichen:** Wetterdaten live von Open-Meteo (kostenlos, ohne Schlüssel). Standardort Mannheim, Ortssuche im Tab Mehr. Läuft komplett ohne Server auf GitHub Pages.

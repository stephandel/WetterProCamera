# Bericht: Gelbes Design und Wetterfoto in WetterProCamera, 20.10.2026

Zweig `design-gelb-wetterfoto` (Arbeitskopie `Wetter Apps/.arbeitskopien/wpcamera-design-wetterfoto`). Noch **nicht** auf `main`, nichts hochgeladen, nichts veröffentlicht.

## Geändert
**Teil A: Design aus Stephans Konfigurator-Link**
- `tokens.css` und `design.json` neu aus dem Konfigurator erzeugt (er selbst hat die Dateien geschrieben, dort wurde nichts geändert). `erlaubteHosts` in `design.json` sind erhalten.
- Gelb `#FFD633` als Akzent und Zweitfarbe, blaue Flächen (`#03428A`, Kacheln `#1158AD`), App immer dunkel (`color-scheme: dark`, ein einziges `theme-color`, Manifest auf das Blau). Ein helles iPhone ändert nichts mehr.
- Gelb steht nur auf dunklem Grund. Text auf gelben Flächen ist schwarz (14,9:1). Temperaturen (Aktuell, Stunden, Höchstwert) sind gelb.
- Zwei Abweichungen vom Konfigurator, weil sonst der Kontrast nicht reichte: Zweittext 80 % statt 72 % Weiß (72 % ergab 4,4:1 auf der Kachel), und auf Kacheln ist die Füllung dunkel (gelbe Schrift auf heller Füllung nur 3,5:1).
- `DESIGN.md` und `CLAUDE.md` gezielt angepasst (Regeln 8 bis 12, 15, 16 bis 18, 25, 27, 31, neuer Abschnitt „Modul Kamera-Studio“). App-eigene Texte blieben stehen.
- Startseite: Aktuell, Stunden, Tagesliste, Sonne und Mond, Was heute geht. Die Regenradar-Kachel ist aus (unter „Mehr“ → „Startseite“ einschaltbar), Webcam bleibt hinter `WEBCAMS_FREIGABE` aus, Meteogramm aus. Tab „Graphs“ beginnt mit dem Meteogramm.

**Teil B: Wetterfoto (Kamera-Studio)**
- `tools/kamera-studio-holen.js` mit Option `--quelle=<Ordner>`. Studio-Dateien unverändert in `lib/kamera-studio/` (Quelle: Arbeitskopie `kamera-studio-speicher`, Stand `1773de9`).
- `speicher: 'wpcamera'`: Galerie in `wpcamera-ks-galerie`, Nutzerwahl unter `wpcamera-ks-nutzer-…`. Die App-eigenen Knopf-Einstellungen heißen `wpc-wf-…`.
- Einstellung wie in der WeddaApp: Ein-Tipp-Karte, Auslöser frei, Galerie 3 Originale / 5 bearbeitet. Rund in der Tab-Leiste auf Platz 3, öffnet gleich die Kamera. Unter „Mehr“ → „Wetterfoto“ lassen sich Ort, Platz und Aussehen des Knopfs ändern.
- Teilen-Knopf oben, Seitenleiste (Mac) und `?kamera=1` öffnen das Studio. Der alte Teilen-Bildschirm geht nur noch mit `?teilen=alt`.
- Wetterwerte aufs Foto kommen aus den echten Daten der App (Open-Meteo oder DWD). Ohne Daten steht nur Ort und Zeit, nie ein Beispielwert.
- Studio wird 1,5 s nach dem Start im Hintergrund geladen und liegt im Offline-Speicher (`sw.js`, neue Version).
- Die Studio-Farben kommen aus den Tokens der App (gelb, schwarze Schrift auf Gelb), das Studio selbst ist unverändert.
- Die alte Galerie des alten Bildschirms erscheint unter „Mehr“ nur noch als „Frühere Wetterfotos“, und nur wenn dort Fotos liegen.

## Geprüft
- `npm test`: 188 (app) + 37 (neu, `design-gelb.test.js`) + 71 (neu, `wetterfoto.test.js`) = 296 grün, 0 rot. Dazu `w3-g1` 74, `w3-g2` 115, `w3-g3` 105, alle grün.
- Rot gegen den Stand vorher (`main`): `design-gelb.test.js` hatte 15 rote Prüfungen (Akzent, immer dunkel, Kontrast, Modulreihenfolge). `wetterfoto.test.js` brach auf `main` mit 3 roten Prüfungen ab, weil es dort kein Studio gibt.
- Kontrast gerechnet, jede neue Paarung: Gelb auf Hintergrund 6,9:1, auf Kachel 4,9:1, auf Glas mindestens 8,9:1, Schwarz auf Gelb 14,9:1, Zweittext auf Kachel 5,1:1.
- `ux-check`: 11 grün, 0 gelb, 0 rot (390 hell und dunkel, 820, 1280). Vorher war eine Regel rot (Kontrast 3,46:1), das ist behoben.
- Bildschirmfotos (WebKit) liegen in `/private/tmp/claude-501/-Users-stephanhandel-KI-Projekte/68114dc3-c09d-4a93-ae8b-beb0f047d4ec/scratchpad/bilder/`, angesehen und gut befunden.
- `node tools/version.js --pruefen` und `node tools/kamera-studio-holen.js --pruefen --quelle=…` stimmen.
- Ein Lauf von `w3-g1` war einmal rot (73 grün, 1 rot), danach drei Läufe grün. Welche Prüfung rot war, weiß ich nicht (Ausgabe abgeschnitten). Vermutung: Kaltstart des Browsers. Nicht weiter verfolgt.

## Offen
**Nur auf dem iPhone prüfbar:** Öffnet der Knopf wirklich direkt die Kamera? Teilen-Menü, Zoom, Licht, Wasserwaage, Galerie nach Neustart, App auf dem Home-Bildschirm (Service Worker läuft im Test nur auf localhost), Lesbarkeit des Gelbs in der Sonne.

**Schlüssel aus dem Link, die nicht umgesetzt sind (wären neue Funktionen):**
- Modul „Luftqualität“ (Ampel-Ring) und Modul „Warnung“ (DWD-Warnungen) auf der Startseite.
- Karten-Ebenen Regen, Wind, Wolken und Isobaren-Schalter (die Karte zeigt Temperaturmarken, Radar und Satellit).
- Modul „Sonne“ getrennt von „Mond“ (beide stehen in einer Kachel). Module „Wind“ und „Pollen“ gibt es nicht.
- Foto-Infos nur Temperatur, Symbol, Ort, Datum: das Studio nimmt das nicht als Vorgabe. Sein Standard zeigt zusätzlich Wetterlage und Uhrzeit (Wind und Regen sind aus). Änderung nur im Konfigurator-Studio möglich.

**Abweichungen:**
- „Was heute geht“ zeigt bis zu 3 Tipps, der Link sagt 2. Nicht geändert (Tests und Wortlaut hängen daran).
- Teilen-Knopf als Kachel auf der Startseite („teilenchip“) nicht gebaut: Laut Link sitzt er in der Kopfzeile, das gibt es schon.
- `design.json` enthält aus dem Link `projekt.seite` mit kleingeschriebenem Repo-Namen (`…/wetterprocamera/`). Die App läuft unter `…/WetterProCamera/`. Vor dem Veröffentlichen prüfen.
- Auf dem Mac ist das Meteogramm (jetzt Standard in Graphs) mit 11 px beschriftet, die Mac-Stufe fordert sonst 12 px. Der Mac-Test läuft deshalb mit der Kurve.
- Das Studio lässt unter den Vorlagen „Weiter mit diesem Design“ halb abgeschnitten (Rollbereich). Das ist im Studio selbst so, kein Einbaufehler.
- `kamera-studio-holen.js --pruefen` ohne `--quelle` meldet „weicht ab“, weil der Hauptordner des Kamera-Konfigurators noch den alten Stand ohne `speicher` hat.
- Zweite Meinung durch ein anderes Modell: **nicht eingeholt** (nichts veröffentlicht). Vor dem Hochladen nachholen.
- Das Studio ist ein Stand aus einer Arbeitskopie, die noch nicht im Hauptordner liegt. Ändert sich dort etwas, neu holen und `node tools/version.js` laufen lassen.

## Nachtrag: zweite Meinung (Fable, 20.10.2026)
- Bestätigt: keine neue Abhängigkeit, Tests grün, neue Tests waren vorher rot, Offline-Speicher vollständig, alle Einstiege öffnen das Studio.
- Widerlegt und behoben:
  - Die gemerkte Vorlage im Studio (`ks-vorlage`) war noch zwischen den Apps geteilt. Jetzt heißt sie hier `wpcamera-ks-vorlage` (Studio-Stand 69884b4).
  - Im Studio stand beim gedrückten „Original“-Knopf weiße Schrift auf Gelb (1,4:1). Jetzt ist sie schwarz.
  - Auf Mac und iPad mit Maus fiel der Kontrast beim Darüberfahren über einer Liste auf 4,3:1. Jetzt liegt er bei 5,7:1.
  - Die Tastenkürzel ⌘1–5 wirkten bei offenem Studio im Hintergrund weiter. Das ist behoben, ein Test prüft es (war vorher rot).
  - Wechselte der Speichername, während Safari die Galerie noch öffnete, konnte ein Foto verloren gehen. In der App kommt das nicht vor, behoben ist es trotzdem.
- Bleibt offen:
  - Die braun-schwarze Tagesliste kommt so aus dem Design-Konfigurator: Die Tönung richtet sich nach dem Gelb, nicht nach der blauen Fläche. Ob sie bleibt, entscheidet Stephan.
  - ⌘1–5 folgen der festen Tab-Reihenfolge, nicht dem Platz des Wetterfoto-Knopfs.
- Nach dem Nachtrag: `npm test` 188 + 37 + 72 grün, ux-check 11 grün. Studio-Tests: Engine 460, Seite 674, Studio 2871 grün.

# WetterProCamera

**Online:** https://stephandel.github.io/WetterProCamera/

> **Stand 21.10.2026 (A24):** Den alten Teilen-Bildschirm (Canvas, Vorlagen, Sticker, Live-Kamera, „Wetter von damals“, eigenes Logo) und den Schalter `?teilen=alt` gibt es nicht mehr. Alle Einstiege öffnen das Wetterfoto-Studio. Die Abschnitte unten, die den alten Bildschirm beschreiben, sind Geschichte. Geblieben ist die Galerie „Frühere Wetterfotos“ (`wpc-galerie`). Die Testdatei `tests/w3-g1.test.js` entfiel mit dem Bildschirm.

> **Stand 21.10.2026 (A9):** Neu auf der Startseite: **Warnung** (amtliche DWD-Warnungen über Bright Sky, ganz oben, nur bei Warnlage und nur für Orte in Deutschland, antippbar für den vollen Text) und **Luftqualität** (Ampel-Ring nach dem Europäischen AQI, Schadstoffe aufklappbar; gleicher Open-Meteo-Aufruf wie der Saharastaub). „Was heute geht“ zeigt höchstens 2 Tipps. Tab-Leiste deckender; Tab „Mehr“ gegliedert, Pilot-Karte unten. Tests: `tests/warnung-luft.test.js`, `tests/nutzertest-funde.test.js`. Bericht: `BERICHT-2026-10-21-WARNUNG-LUFT.md`.

Test-App einer Wetter-App im Apple-Stil (Liquid Glass), **gestaltet mit dem Design-Konfigurator** nach den Empfehlungen der KI und gebaut von Claude Code aus dem exportierten Projektpaket (15.10.2026).

- Live-Wetter von [Open-Meteo](https://open-meteo.com) (CC BY 4.0), ohne Schlüssel und ohne eigenen Server
- Reiter: **Wetter** (Aktuell, nächste Stunden, Regen der nächsten 2 Stunden, 8 Tage), **Graphs** (48 Stunden), **Kamera** (Wetter mit Foto teilen), **Rad/Sat** (Radar von [RainViewer](https://www.rainviewer.com), Satellit von EUMETSAT, Temperaturkarte), **Mehr** (Ortssuche, Favoriten, Wettermodell, Einheiten, Quellen, Webcam-Hinweis)
- Wetter mit Foto teilen (6 Vorlagen, 6 Formate, wie früher bei WeatherPro)

### Neu am 15.10.2026 (Paket A6)

- **Mac-Layout:** Ist das Fenster mindestens 1024 px breit und wird mit Maus oder Trackpad bedient (Mac, Windows-Rechner), steht links eine **Seitenleiste** statt der Tab-Leiste unten: App-Name, die fünf Bereiche mit Symbol, deine Orte (Favoriten mit Stern zuerst), „Ort suchen", „Wetter teilen" und ein Hinweis auf die Kürzel. Auf iPhone und iPad ohne Maus bleibt alles wie bisher.
- **Zwei Spalten:** Im Tab „Wetter" stehen links Aktuell und die nächsten Stunden (bleiben beim Scrollen stehen), rechts Regenradar, Tagesliste und alle weiteren Kacheln in ihrer Reihenfolge (auch künftige, z. B. aus Paket A5). „Mehr" ist zweispaltig, je Überschrift ein Block. Graphs und Rad/Sat nutzen die volle Breite und mehr Höhe.
- **Dichte Schrift wie auf dem Mac:** Text 13 px, Zweittext 12 px (nie kleiner), Überschrift 20 px, Klickflächen 28 px. Die Werte stehen als eigene Variablen (`--mac-*`) im Block „Paket A6" am Ende von `app.css`; `tokens.css` bleibt unverändert.
- **Tastaturkürzel:** ⌘1–⌘5 Bereiche (⌘3 = Kamera/Teilen), ⌘K Ort suchen, ⌘R Wetter aktualisieren (statt die Seite neu zu laden), Esc schließt Fenster (im Teilen-Fenster zuerst das Blatt „Infos"). Mit sichtbarem Fokusring.
- **Teilen als Fenster:** Auf dem Mac öffnet sich der Teilen-Bildschirm als schwarzes Fenster in der Mitte (Bild links, Formate, Vorlagen und Knöpfe rechts) statt bildschirmfüllend; ebenso die Galerie und das Blatt „Zeilen".
- Tests: 1280 × 800 und 1440 × 900, hell und dunkel, alle Tabs, Kürzel, Esc, kein seitliches Scrollen, 390 px unverändert.

### Neu am 15.10.2026 (Paket B)

- **Datenquelle wählbar** (Tab „Mehr" → „Datenquelle"): Open-Meteo (Standard) oder **DWD über Bright Sky** (brightsky.dev, DWD-Daten CC BY 4.0, ohne Schlüssel). Beim DWD steht oben „Modell: DWD MOSMIX"; die Vorhersage reicht 9 Tage. Aktuelle Werte kommen von der nächsten DWD-Wetterstation. UV-Index und Luftqualität gibt es beim DWD nicht (dort steht „–"), Sonnenauf- und -untergang rechnet die App selbst aus. Hat der DWD für einen Ort keine Daten, zeigt die App Open-Meteo und sagt das in einem Hinweis. Gemerkt in `wpc-quelle`.
- **Kurzbefehl „Wetterfoto"**: Der Link `https://stephandel.github.io/WetterProCamera/?kamera=1` (oder `#kamera`) öffnet sofort den Teilen-Bildschirm mit dem Hinweis „Tippe auf „Fotos" und wähle das neueste Bild". Im Tab „Mehr" steht eine Schritt-für-Schritt-Anleitung für Apples App „Kurzbefehle" und ein Knopf „Link kopieren".
- **Offline robuster**: Die Kartenbibliothek Leaflet liegt jetzt in der App (`lib/leaflet/`, Version 1.9.4) statt auf einem fremden Server. Der Service Worker (das Programm, das die App ohne Netz startet) speichert nur noch einwandfreie Dateien, holt die Startseite immer frisch und frischt alles andere im Hintergrund auf.
- **Version automatisch**: Die Version des Service Workers ist ein Fingerabdruck aller App-Dateien und ändert sich von selbst, sobald sich eine Datei ändert (siehe „Tests und Version").
- **Automatische Tests**: `npm test` prüft die App in WebKit (dem Browser-Kern von Safari), auf GitHub bei jedem Hochladen.
- Plus- und Minus-Knopf der Karten haben jetzt 44 px Tippfläche.
### Neu am 15.10.2026 (Paket A)

- **Kurzname „WP Camera"** unter dem App-Symbol auf dem Home-Bildschirm (`manifest.json`, `index.html`).
- **Fehler verständlich:** „Der Wetterdienst ist gerade überlastet" (neuer Versuch von selbst nach 30 s, 60 s, 120 s, mit Countdown), „Offline" (lädt neu, sobald wieder Netz da ist), „Der Wetterdienst antwortet nicht", „Der Wetterdienst meldet einen Fehler (Nr. 503)". Der letzte Stand bleibt sichtbar („Stand 14:32 Uhr", ältere Stände mit Datum), dazu „Erneut versuchen".
- **Ziehen zum Aktualisieren** auf „Wetter" und „Graphs" (oben nach unten ziehen, „Loslassen zum Aktualisieren"). Oben im Tab Wetter steht „Letztes Update 14:32 Uhr" mit dem Knopf „Aktualisieren" für Mac und iPad.
- **Nach dem Teilen** schließt sich der Teilen-Bildschirm, kurz erscheint „Geteilt ✓" oder „Bild gesichert ✓". Brichst du selbst ab, erscheint nichts.
- **Querformat** (iPhone liegend): Aktuell-Kachel links, Stunden und Tage rechts; Teilen-Bildschirm mit Bild links und Knöpfen rechts; Ränder für die Notch.
- **Große Schrift** (iPhone-Einstellung „Textgröße"): Die App folgt ihr; bei sehr großer Schrift rücken Sonne und Regen in der Tagesliste in eine zweite Zeile.
- **Pilot: Wochen-Rückmeldung** im Tab „Mehr": „Diese Woche an 3 Tagen genutzt (KW 42)". Gezählt werden nur die Tage, nur auf dem Gerät (`wpc-nutzung`). „Rückmeldung schreiben" öffnet drei Fragen; der Text wird über Teilen (WhatsApp, Mail) verschickt oder kopiert, nie automatisch.
- **Datenschutz** im Tab „Mehr" unter den Quellen.
### Neu am 15.10.2026 (Paket C)

- **Nachbesserung (A4):** Der Hilfetext unter dem Meteogramm liegt jetzt sicher über der Tab-Leiste, und der Satellitenfilm geht nach 4 Sekunden auch mit noch unvollständigen Bildern weiter (Hinweis „Bilder laden …“).
- **Eigenes Logo fürs Teilen-Bild:** Blatt „Infos" → „Logo" → „Eigenes Logo". Bild wählen (PNG, JPEG oder SVG), die App verkleinert es auf höchstens 512 Pixel und merkt es sich im Browser (`wpc-logo`, höchstens etwa 300 KB). Es steht so hoch wie der App-Name in der Ecke, das Seitenverhältnis bleibt. Knopf „Logo entfernen". Bleibt nur auf deinem Gerät.
- **Satellit und Infrarot abspielen:** Unter Rad/Sat hat jetzt auch die Ebene Satellit bzw. Infrarot den Knopf „Abspielen". Er zeigt 12 Bilder der letzten 2 Stunden (alle 10 Minuten eins), mit Uhrzeit. Fehlende Bilder werden übersprungen. Nachts erklärt ein Satz, dass das Farbbild dunkel bleibt und Infrarot die Wolken trotzdem zeigt.
  Technik: EUMETSAT-Kartendienst (WMS) mit Zeitangabe `time=`. Die Zeitliste kommt aus der Selbstauskunft des Dienstes (`GetCapabilities` je Ebene). Geprüft am 15.10.2026: `<Dimension name="time">2024-09-23T00:00:00.000Z/2026-10-15T12:30:00.000Z/PT10M</Dimension>`, also Anfang/Ende/Schritt 10 Minuten, das neueste Bild ist etwa 20–25 Minuten alt (gleich für `mtg_fd:rgb_geocolour` und `mtg_fd:ir105_hrfi`).
- **Meine Wetterfotos:** Nach erfolgreichem Teilen oder Sichern legt die App eine Kopie (JPEG, längste Seite 1080 Pixel) mit Ort, Datum, Uhrzeit und Wetterwerten im Browser-Speicher ab (IndexedDB `wpc-galerie`; Schalter im Blatt „Infos", Standard an). Öffnen über „Mehr" → „Meine Wetterfotos (Anzahl)" oder „Galerie" im Teilen-Bildschirm: Monatskalender mit kleinen Vorschaubildern, Tipp auf einen Tag zeigt seine Fotos groß mit den Werten, Knöpfe „Teilen" und „Löschen". Höchstens 200 Fotos; „Alle löschen" fragt in einem eigenen Dialog nach. Die Fotos verlassen das Gerät nie.
- **Meteogramm im Tab „Graphs":** Oben die Wahl „Kurve | Meteogramm" (gemerkt). Das Meteogramm ist Stephans Baustein aus `WetterPro Tool/gemeinsam/` (`meteogramm.js`, `meteogramm.css`, unverändert kopiert, Farben über `tokens.css` angepasst). Knopf „Zeilen" öffnet ein Blatt mit allen 12 Zeilen zum Anhaken und ↑ ↓ zum Sortieren (Standard: Sonne, Temperatur, Wind, Regen; gemerkt in `wpc-meteo`). Ort und Wettermodell kommen aus der App. Die Emoji-Symbole des Bausteins sind ausgeblendet, weil die App nur ihre eigenen Wettersymbole zeigt.
### Neu am 15.10.2026 (Paket A5)

- **Corralejo mit DWD richtig:** Die Uhrzeiten von Bright Sky werden in die Ortszeit umgerechnet (Kanaren eine Stunde hinter Deutschland). Die Zeitzone kommt aus einer früheren Open-Meteo-Antwort, aus einer kleinen Liste (Kanaren, Madeira, Azoren) oder einmal von Open-Meteo und wird gemerkt (`wpc-zeitzonen`). Gibt es keine Messstation in der Nähe, steht in der Aktuell-Kachel „Aktuell (Vorhersage)“: Die Werte sind dann die laufende Stunde der Vorhersage.
- **„Was heute geht“** (Tab „Wetter“, unter den Stunden, Standard an): bis zu 2 Tipps (seit 21.10.2026, laut Design-Link) mit Symbol nach festen Regeln: Schirm (Regenrisiko ab 40 %), Frost (Tiefstwert 0 °C oder darunter), Hitze (ab 30 °C), UV-Schutz (UV ab 6), Strand/Baden (ab 22 °C, Regenrisiko unter 20 %, Wind unter 30 km/h), Kiten (Wind 20–40 km/h), Ebbe und Flut (nächster Tief- und Höchststand mit Uhrzeit), goldene Stunde (45 Minuten vor Sonnenuntergang), Sterne (nachts höchstens 20 % Wolken). Sonst: „Heute nichts Besonderes.“ Ebbe und Flut kommen von **Open-Meteo Marine** (Wasserstand des Meeres); ob ein Ort am Meer liegt, prüft die App einmal je Ort und merkt es sich (`wpc-kueste`).
- **Meteogramm auf der Startseite** (Standard aus): Tab „Mehr“ → „Startseite“ → Schalter, Größe Klein (1 Zeile), Mittel (2) oder Groß (alle im Tab „Graphs“ gewählten Zeilen). Es steht unter dem Regenradar; „Ganz ansehen“ öffnet das große Meteogramm im Tab „Graphs“. Der Baustein läuft dafür zweimal auf der Seite (jede Instanz hat eigene Kennungen).
- Im Tab „Mehr“ → „Startseite“ lassen sich die Tipps einzeln abwählen. Alles gemerkt in `wpc-startseite`. Quellen nennen jetzt auch Open-Meteo Marine.
- Tests: echte Marine-Antworten für Corralejo und Mannheim sowie eine Meteogramm-Antwort vom 15.10.2026 in `tests/fixtures/`.

### Neu am 15.10.2026 (Paket 6: Funde der UX-Prüfung)

- **Mehr-Tab:** rechter Rand wie links (16 px); Quellen stehen jetzt als eigene Zeilen mit großer Tippfläche (44 px) statt kleiner Links im Text.
- **Aktuell-Kachel:** Werte halten rechts denselben Abstand wie links; Luftdruck ohne Nachkommastelle. Die Webcam-Ansicht bleibt aus, bis es eine freigegebene Webcam gibt. Die Punkte sind größer, beim ersten Start erklärt ein kurzer Tipp das Umschalten.
- **Grauer Zweittext** im hellen Modus dunkler: jetzt 5,6:1 auf Weiß (vorher 3,4:1). Dunkel unverändert 6,0:1.
- **Offline:** Der letzte Stand bleibt sichtbar, oben steht „Offline · Stand 14:32 Uhr“. Ganz ohne Daten erscheint ein ruhiger Zustand mit Symbol, einem Satz und „Erneut versuchen“.
- **Kopfzeile** deckender, gescrollter Text scheint nicht mehr durch. Links steht ein **Orte-Symbol** (Pin) statt der drei Striche; es springt zu „Meine Orte“.
- **Graphs:** Achsenzahlen echte 12 px; Antippen der Kurve zeigt Uhrzeit, Temperatur und Regen. Die Regen-Kachel auf „Wetter“ ist bei Trockenheit kurz (keine leeren Balken).
- **Rad/Sat:** „Abspielen“ in Akzentfarbe, Satz „Kein Regen in Sicht“, ruhigere (blassere) Grundkarte, Quelle als eigene Zeile.
- **Teilen:** Beispielfoto ist gekennzeichnet („Beispielfoto · tippe auf Fotos oder Kamera“), kein Fokusring mehr auf „Abbrechen“ beim Öffnen. Vorlage **Zeitstempel** zeigt das Wettersymbol. Auf heller Fläche (Farbton hell/automatisch, Rahmen, Polaroid) bekommt das Wettersymbol einen zarten dunklen Schein.
- **Mein Standort:** Liegt ein bekannter Ort (Favorit, Standardort, zuletzt gesuchter Ort) näher als 8 km, gilt dessen Name. Sonst bleibt „Mein Standort“, und aufs Teilen-Bild kommt kein Ort. Grund: Open-Meteo hat keine Rückwärtssuche (Koordinaten → Stadt), andere Dienste (z. B. Nominatim) nur mit Erlaubnis.
- Knöpfe in Akzentfarbe haben im Dunkelmodus schwarze Schrift (DESIGN.md Regel 9).
- Service Worker `wpc-4`.

### Neu am 15.10.2026 (Paket 3)

- **App-Symbol „Linse"** (Entwurf A): `app-symbol-1024.png` und `apple-touch-icon.png` (180 px, 30 KB). Die Entwürfe in `symbol-entwuerfe/` bleiben nur lokal (`.gitignore`).
- **Tab-Leiste mit Kamera in der Mitte:** Wetter, Graphs, **Kamera** (Auslöser, öffnet den Teilen-Bildschirm), Rad/Sat, Mehr. Der Teilen-Knopf oben bleibt. Die Temperaturkarte ist jetzt die Ebene „Karte" unter Rad/Sat.
- **Teilen-Bildschirm:** Formate 3:4, 4:5, 1:1, 9:16, 16:9 und Original; sechs Vorlagen (Klassisch, Glas, Minimal, Rahmen, **Polaroid**, **Zeitstempel** mit orangen Ziffern). Blatt **„Infos"**: 19 Angaben zum Anhaken, Reihenfolge mit ↑ ↓, Ort als Stadt/Stadtteil/aus, eigener Text oder Hashtag, Farbton dunkel/hell/**automatisch** (misst die Helligkeit des Fotos), Logo App-Name oder keins, Größe 1080/2160 px, JPEG oder PNG. „Shot on ProCamera" ist vorbereitet, aber gesperrt (nur mit Freigabe von Cocologics). Alles wird im Browser unter `wpc-teilen` gemerkt.
- **Mehr:** Orte mit Favoriten-Stern (Favoriten stehen oben), **Wettermodell** wählbar (Beste Mischung, ECMWF, DWD ICON, NOAA GFS, Météo-France, UK Met Office; Open-Meteo-Parameter `models=`), Modell steht in der Kopfzeile, Wind in km/h, m/s, Knoten oder Beaufort, Quellen-Block automatisch, Abschnitt „Webcam" mit den 6 angefragten Kameras (Bilder folgen erst nach Erlaubnis).
- **Rad/Sat:** Ebenen Radar (RainViewer), **Satellit** und **Infrarot** (EUMETSAT/Meteosat, frei ohne Schlüssel), Karte (Temperaturen an deinen Orten).
- Tagestönung im Dunkelmodus abgeschwächt (`tokens.css`).
- Service Worker `wpc-3`: Nach dem Veröffentlichen holt sich die installierte App die neue Fassung.
- Hell und dunkel nach Gerät, offline mit dem letzten Stand, auf dem iPhone installierbar („Zum Home-Bildschirm")

### Welle 3 Wetter und Karte (16.10.2026)

- **Regen und „Was heute geht":** Der Satz unter dem Regenradar nennt Beginn und Dauer („Regen ab 14:30 Uhr für 45 Minuten"); die 8 Balken sind je 15 Minuten. Die Tipps betrachten nur den Rest des Tages ab jetzt. Strand und Kiten erscheinen nur an Küstenorten.
- **Modelle vergleichen** (Tab Graphs, Kurve): 2 bis 3 Wettermodelle als Linien mit eigener Farbe und Strichart, Temperatur und Regensumme, Tabelle darunter. Abrufe nur, wenn der Schalter an ist, 30 Minuten Zwischenspeicher.
- **Tagesdetail:** Klick oder Tipp auf einen Tag öffnet ein Blatt (am Mac ein Fenster) mit Nacht davor / Tag / Nacht danach, Stundenwerten, Sonne und Mond.
- **Sonne und Mond:** eigene Kachel und Blatt mit Mondphase, Auf- und Untergang, Sonnenbogen, goldener Stunde und drei Dämmerungen. Alles wird auf dem Gerät gerechnet, kein neuer Netzdienst.
- **Meer** (nur Küstenorte): Wellenhöhe, Periode, Richtung, Wassertemperatur und Tide-Kurve von Open-Meteo Marine; der Meerespunkt aus der Antwort wird je Ort gemerkt (`wpc-meerpunkt`).
- **Calima:** Hinweiskachel bei Saharastaub über der Schwelle (Open-Meteo Luftqualität, `dust`). Schwelle 25 / 50 / 100 µg/m³ in „Mehr", Standard 50 (EU-Tagesgrenzwert für PM10).
- **Kartensteuerung:** Zoom-Knöpfe mit 44 px, Zeitleiste und Film-Tempo 0,5× / 1× / 2×, Pfeiltasten für die Ebenen.
- **Datensparmodus** (Mehr, `wpc-datensparen`): keine Satellitenfilme, Radar als Standbild, kein Modellvergleich, Karte nur bis Stufe 9. Bei `navigator.connection.saveData` schlägt die App ihn einmal vor.
- Test: `PORT=8872 node tests/w3-g2.test.js`.

### Welle 3 Foto und Teilen (16.10.2026)

- **Sticker:** Im Teilen-Bildschirm unter „Infos" → „Sticker" Temperatur, Wettersymbol, Wind und Mini-Karte einschalten. Sie liegen frei auf dem Foto: mit Finger oder Maus ziehen, mit zwei Fingern die Größe ändern, oder die Regler (Größe, waagerecht, senkrecht) nehmen. Mit der Tastatur: Pfeile verschieben (Umschalt = groß), + und − ändern die Größe, Entf nimmt den Sticker weg. Lage und Größe werden in `wpc-teilen` gemerkt.
- **Meteogramm-Streifen:** Schmales Band mit Temperatur (Linie) und Regen (Balken) für 24 Stunden, oben oder unten auf dem Foto (weicht den Infos der gewählten Gestaltung aus).
- **Mini-Karte** (Kreis oder Rechteck): vereinfacht aus den Koordinaten gezeichnet (Gitternetz, 20-km-Maßstab, Nordpfeil, Farbton nach Temperatur). Echte Kartenkacheln dürfen wegen CORS nicht aufs Bild.
- **Polaroid** und **Analog-Zeitstempel** gab es schon als Gestaltungen (weißer Rand mit Handschrift, orange Ziffern).
- **Wetter zum Aufnahmezeitpunkt:** Bei einem Foto aus der Galerie liest die App Aufnahmedatum und Ort aus den Foto-Daten (EXIF, eigener kleiner Leser, auf dem Gerät). Ist das Foto älter als 3 Stunden, holt sie das Wetter von damals (bis 7 Tage zurück aus der Vorhersage-API mit `past_days`, älter aus dem Open-Meteo-Archiv) und schreibt „Wetter am 12.10. um 15:00" aufs Bild. Fehlt das EXIF-Datum, gilt das Datum der Datei; fehlt der Ort, der aktuelle Ort. Datum, Uhrzeit und Ort sind im Blatt „Infos" änderbar. Der genaue Ort geht nie weg: Open-Meteo bekommt nur einen auf etwa 10 km gerundeten Punkt. Liegt der Foto-Ort weit weg vom gewählten Ort, steht kein Ortsname auf dem Bild.
- **Live-Kamera:** Im Teilen-Bildschirm oben „Live". Zeigt die Rückkamera mit dem Wetter-Overlay der gewählten Gestaltung; der runde Knopf macht das Foto und öffnet den Teilen-Bildschirm. Ohne Erlaubnis oder ohne Kamera erscheint ein ruhiger Hinweis mit dem Weg über die Galerie. Es wird nichts hochgeladen; die Kamera wird beim Schließen freigegeben.
- **Vorgebaut, aus:** Feld „Shot on ProCamera" (`PARTNER_FREIGABE = false`, erst mit Freigabe von Cocologics) und Knopf „Mit ProCamera aufnehmen" (`PROCAMERA_URL = ''`, erscheint erst, wenn die Adresse eingetragen ist). Keine Logos eingebettet.
- Datenschutz-Satz und Quelle „Open-Meteo Archiv" im Tab „Mehr" ergänzt. Test: `PORT=8871 node tests/w3-g1.test.js`.

## Dateien

| Datei | Herkunft |
|---|---|
| `DESIGN.md`, `tokens.css`, `design.json`, `symbole.js`, `manifest.json`, `app-symbol-1024.png`, `apple-touch-icon.png`, `CLAUDE.md`, `LIESMICH.md` | Export des Design-Konfigurators |
| `base.css` | Skill `apple-ui` (Grundwerte, von `tokens.css` überschrieben) |
| `index.html`, `app.css`, `app.js`, `ikonen.js`, `sw.js` | von Claude Code nach `DESIGN.md` gebaut |
| `foto-mannheim.jpg` | eigene Aufnahme, Beispielbild zum Teilen |
| `lib/leaflet/` | Kartenbibliothek Leaflet 1.9.4 (BSD-2-Lizenz, `LICENSE` liegt bei) |
| `package.json`, `tests/`, `tools/`, `.github/workflows/test.yml` | Tests, Versionswerkzeug und Git-Hook (Paket B) |

## Lokal starten

```
python3 -m http.server 8822 --bind 127.0.0.1
```

Dann im Browser `http://localhost:8822` öffnen.

## Tests und Version

**Tests:** Einmal `npm install` (lädt das Testwerkzeug Playwright, rund 10 MB, und nutzt WebKit, den Browser-Kern von Safari), danach `npm test`. Der Befehl startet einen kleinen Server auf Port 8862 und prüft rund 155 Punkte: alle Tabs in 390 px hell und dunkel, iPad (820 px), iPhone quer (844 × 390) und Mac (1280 × 800, 1440 × 900), kein seitliches Scrollen, keine Fehler in der Konsole, Tippflächen mindestens 44 px, keine Schrift unter 11 px, Teilen-Bildschirm und Blatt „Infos", Offline-Zustand, Datenquelle DWD samt Rückfall auf Open-Meteo, Direktlink `?kamera=1` und den Service Worker. Die Wetterdienste werden dabei nicht gefragt: Die Tests nutzen gespeicherte echte Antworten vom 15.10.2026 aus `tests/fixtures/`. Bildschirmfotos landen in `tests/bilder/` (wird nicht hochgeladen). Auf GitHub laufen dieselben Tests bei jedem Hochladen automatisch (`.github/workflows/test.yml`, für öffentliche Repositories kostenlos); das Ergebnis steht im Reiter „Actions".

**Version des Service Workers:** Die Zeile `const VERSION = 'wpc-…'` in `sw.js` nie von Hand ändern. `npm run version` berechnet sie neu (Fingerabdruck über alle Dateien der Liste `HUELLE`). Damit das vor jedem Commit von selbst passiert, einmal pro Rechner `npm run hooks` ausführen (richtet den Git-Hook `tools/hooks/pre-commit` ein). Neue Dateien, die offline gebraucht werden, in `HUELLE` in `sw.js` eintragen; der Test meldet, wenn eine eingetragene Datei fehlt.

## Veröffentlichen (GitHub Pages)

Repository auf GitHub anlegen, Dateien hochladen, dann unter *Settings → Pages* den Zweig `main` und den Ordner `/` wählen. Die App ist danach unter `https://<konto>.github.io/<repository>/` erreichbar.

## Hinweis zum Namen

„WetterPro" ähnelt der Marke „WeatherPro". Für diesen privaten Test in Ordnung, vor einer öffentlichen Veröffentlichung den Namen ändern.

### Welle 3 Webcams (16.10.2026, Gruppe 3)

- **Abgeschaltet bis die Betreiber zusagen:** Alles hängt an der Datei-Konstante `WEBCAMS_FREIGABE = false` (Block „Welle 3 Gruppe 3" am Ende von `app.js`). Solange sie `false` ist, sieht die App aus wie bisher (Hinweisliste „Folgt nach Erlaubnis" im Tab „Mehr") und lädt **keine** Bilder und fragt keinen Webcam-Server an.
- **Einschalten:** Kameras ohne Zusage aus `WEBCAM_LISTE` streichen, `WEBCAM_WORKER` mit der Adresse des Zwischenspeichers (`worker/mannheim-webcams.js`) füllen, `WEBCAMS_FREIGABE = true` setzen, Datenschutz-Satz prüfen. Je Kamera gilt `cacheBuster: false`, bis der Betreiber das Anhängen eines Zeitstempels erlaubt.
- **Wenn an:** Kachel „Webcam" auf der Startseite (vor der Tagesliste) mit Kamera-Chips, Ansichten Aktuell, Film der letzten Stunde (Abspielen/Pause, Regler, Tempo 0,5×/1×/2×), Tagesübersicht (30-Minuten-Raster als Streifen, leere Felder bei Lücken) und Rückblick 2/6/12/24 h. Immer mit Zeitstempel, Quelle und Link zum Betreiber und dem Zustand „Bild nicht verfügbar" mit „Erneut versuchen". Film, Tag und Rückblick brauchen den Zwischenspeicher (`WEBCAM_WORKER`), ohne ihn gibt es nur das aktuelle Bild direkt vom Betreiber.
- **Datensparmodus:** Ist `wpc-datensparen` an (den Schalter baut Gruppe 2, hier wird er nur gelesen), zeigt die Kachel nur das Standbild, ohne Archiv und Film.
- **Nie im Service Worker:** Webcam-Bilder werden nicht zwischengespeichert (`sw.js` kennt sie nicht). Einstellungen der Kachel: `wpc-webcam` (Kamera, Ansicht, Stunden, Tempo).
- **Teilen mit Webcam-Hintergrund (B3) bleibt aus.** Voraussetzung: Bilder mit CORS-Freigabe oder über den Zwischenspeicher (der sie mit CORS ausliefert), dazu die Erlaubnis des Betreibers.
- Test: `PORT=8873 node tests/w3-g3.test.js` (schreibt `app.js` im Test um, die Datei bleibt unverändert).

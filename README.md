# WetterProCamera

**Online:** https://stephandel.github.io/WetterProCamera/

Test-App einer Wetter-App im Apple-Stil (Liquid Glass), **gestaltet mit dem Design-Konfigurator** nach den Empfehlungen der KI und gebaut von Claude Code aus dem exportierten Projektpaket (15.10.2026).

- Live-Wetter von [Open-Meteo](https://open-meteo.com) (CC BY 4.0), ohne Schlüssel und ohne eigenen Server
- Reiter: **Wetter** (Aktuell, nächste Stunden, Regen der nächsten 2 Stunden, 8 Tage), **Graphs** (48 Stunden), **Kamera** (Wetter mit Foto teilen), **Rad/Sat** (Radar von [RainViewer](https://www.rainviewer.com), Satellit von EUMETSAT, Temperaturkarte), **Mehr** (Ortssuche, Favoriten, Wettermodell, Einheiten, Quellen, Webcam-Hinweis)
- Wetter mit Foto teilen (6 Vorlagen, 6 Formate, wie früher bei WeatherPro)

### Neu am 15.10.2026 (Paket B)

- **Datenquelle wählbar** (Tab „Mehr" → „Datenquelle"): Open-Meteo (Standard) oder **DWD über Bright Sky** (brightsky.dev, DWD-Daten CC BY 4.0, ohne Schlüssel). Beim DWD steht oben „Modell: DWD MOSMIX"; die Vorhersage reicht 9 Tage. Aktuelle Werte kommen von der nächsten DWD-Wetterstation. UV-Index und Luftqualität gibt es beim DWD nicht (dort steht „–"), Sonnenauf- und -untergang rechnet die App selbst aus. Hat der DWD für einen Ort keine Daten, zeigt die App Open-Meteo und sagt das in einem Hinweis. Gemerkt in `wpc-quelle`.
- **Kurzbefehl „Wetterfoto"**: Der Link `https://stephandel.github.io/WetterProCamera/?kamera=1` (oder `#kamera`) öffnet sofort den Teilen-Bildschirm mit dem Hinweis „Tippe auf „Fotos" und wähle das neueste Bild". Im Tab „Mehr" steht eine Schritt-für-Schritt-Anleitung für Apples App „Kurzbefehle" und ein Knopf „Link kopieren".
- **Offline robuster**: Die Kartenbibliothek Leaflet liegt jetzt in der App (`lib/leaflet/`, Version 1.9.4) statt auf einem fremden Server. Der Service Worker (das Programm, das die App ohne Netz startet) speichert nur noch einwandfreie Dateien, holt die Startseite immer frisch und frischt alles andere im Hintergrund auf.
- **Version automatisch**: Die Version des Service Workers ist ein Fingerabdruck aller App-Dateien und ändert sich von selbst, sobald sich eine Datei ändert (siehe „Tests und Version").
- **Automatische Tests**: `npm test` prüft die App in WebKit (dem Browser-Kern von Safari), auf GitHub bei jedem Hochladen.
- Plus- und Minus-Knopf der Karten haben jetzt 44 px Tippfläche.

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

**Tests:** Einmal `npm install` (lädt das Testwerkzeug Playwright, rund 10 MB, und nutzt WebKit, den Browser-Kern von Safari), danach `npm test`. Der Befehl startet einen kleinen Server auf Port 8862 und prüft rund 75 Punkte: alle Tabs in 390 px hell und dunkel, iPad (820 px) und iPhone quer (844 × 390), kein seitliches Scrollen, keine Fehler in der Konsole, Tippflächen mindestens 44 px, keine Schrift unter 11 px, Teilen-Bildschirm und Blatt „Infos", Offline-Zustand, Datenquelle DWD samt Rückfall auf Open-Meteo, Direktlink `?kamera=1` und den Service Worker. Die Wetterdienste werden dabei nicht gefragt: Die Tests nutzen gespeicherte echte Antworten vom 15.10.2026 aus `tests/fixtures/`. Bildschirmfotos landen in `tests/bilder/` (wird nicht hochgeladen). Auf GitHub laufen dieselben Tests bei jedem Hochladen automatisch (`.github/workflows/test.yml`, für öffentliche Repositories kostenlos); das Ergebnis steht im Reiter „Actions".

**Version des Service Workers:** Die Zeile `const VERSION = 'wpc-…'` in `sw.js` nie von Hand ändern. `npm run version` berechnet sie neu (Fingerabdruck über alle Dateien der Liste `HUELLE`). Damit das vor jedem Commit von selbst passiert, einmal pro Rechner `npm run hooks` ausführen (richtet den Git-Hook `tools/hooks/pre-commit` ein). Neue Dateien, die offline gebraucht werden, in `HUELLE` in `sw.js` eintragen; der Test meldet, wenn eine eingetragene Datei fehlt.

## Veröffentlichen (GitHub Pages)

Repository auf GitHub anlegen, Dateien hochladen, dann unter *Settings → Pages* den Zweig `main` und den Ordner `/` wählen. Die App ist danach unter `https://<konto>.github.io/<repository>/` erreichbar.

## Hinweis zum Namen

„WetterPro" ähnelt der Marke „WeatherPro". Für diesen privaten Test in Ordnung, vor einer öffentlichen Veröffentlichung den Namen ändern.

# WetterProCamera

**Online:** https://stephandel.github.io/WetterProCamera/

Test-App einer Wetter-App im Apple-Stil (Liquid Glass), **gestaltet mit dem Design-Konfigurator** nach den Empfehlungen der KI und gebaut von Claude Code aus dem exportierten Projektpaket (15.10.2026).

- Live-Wetter von [Open-Meteo](https://open-meteo.com) (CC BY 4.0), ohne Schlüssel und ohne eigenen Server
- Reiter: **Wetter** (Aktuell, nächste Stunden, Regen der nächsten 2 Stunden, 8 Tage), **Graphs** (48 Stunden), **Kamera** (Wetter mit Foto teilen), **Rad/Sat** (Radar von [RainViewer](https://www.rainviewer.com), Satellit von EUMETSAT, Temperaturkarte), **Mehr** (Ortssuche, Favoriten, Wettermodell, Einheiten, Quellen, Webcam-Hinweis)
- Wetter mit Foto teilen (6 Vorlagen, 6 Formate, wie früher bei WeatherPro)

### Neu am 15.10.2026 (Paket C)

- **Eigenes Logo fürs Teilen-Bild:** Blatt „Infos" → „Logo" → „Eigenes Logo". Bild wählen (PNG, JPEG oder SVG), die App verkleinert es auf höchstens 512 Pixel und merkt es sich im Browser (`wpc-logo`, höchstens etwa 300 KB). Es steht so hoch wie der App-Name in der Ecke, das Seitenverhältnis bleibt. Knopf „Logo entfernen". Bleibt nur auf deinem Gerät.
- **Satellit und Infrarot abspielen:** Unter Rad/Sat hat jetzt auch die Ebene Satellit bzw. Infrarot den Knopf „Abspielen". Er zeigt 12 Bilder der letzten 2 Stunden (alle 10 Minuten eins), mit Uhrzeit. Fehlende Bilder werden übersprungen. Nachts erklärt ein Satz, dass das Farbbild dunkel bleibt und Infrarot die Wolken trotzdem zeigt.
  Technik: EUMETSAT-Kartendienst (WMS) mit Zeitangabe `time=`. Die Zeitliste kommt aus der Selbstauskunft des Dienstes (`GetCapabilities` je Ebene). Geprüft am 15.10.2026: `<Dimension name="time">2024-09-23T00:00:00.000Z/2026-10-15T12:30:00.000Z/PT10M</Dimension>`, also Anfang/Ende/Schritt 10 Minuten, das neueste Bild ist etwa 20–25 Minuten alt (gleich für `mtg_fd:rgb_geocolour` und `mtg_fd:ir105_hrfi`).
- **Meine Wetterfotos:** Nach erfolgreichem Teilen oder Sichern legt die App eine Kopie (JPEG, längste Seite 1080 Pixel) mit Ort, Datum, Uhrzeit und Wetterwerten im Browser-Speicher ab (IndexedDB `wpc-galerie`; Schalter im Blatt „Infos", Standard an). Öffnen über „Mehr" → „Meine Wetterfotos (Anzahl)" oder „Galerie" im Teilen-Bildschirm: Monatskalender mit kleinen Vorschaubildern, Tipp auf einen Tag zeigt seine Fotos groß mit den Werten, Knöpfe „Teilen" und „Löschen". Höchstens 200 Fotos; „Alle löschen" fragt in einem eigenen Dialog nach. Die Fotos verlassen das Gerät nie.
- **Meteogramm im Tab „Graphs":** Oben die Wahl „Kurve | Meteogramm" (gemerkt). Das Meteogramm ist Stephans Baustein aus `WetterPro Tool/gemeinsam/` (`meteogramm.js`, `meteogramm.css`, unverändert kopiert, Farben über `tokens.css` angepasst). Knopf „Zeilen" öffnet ein Blatt mit allen 12 Zeilen zum Anhaken und ↑ ↓ zum Sortieren (Standard: Sonne, Temperatur, Wind, Regen; gemerkt in `wpc-meteo`). Ort und Wettermodell kommen aus der App. Die Emoji-Symbole des Bausteins sind ausgeblendet, weil die App nur ihre eigenen Wettersymbole zeigt.

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

## Lokal starten

```
python3 -m http.server 8822 --bind 127.0.0.1
```

Dann im Browser `http://localhost:8822` öffnen.

## Veröffentlichen (GitHub Pages)

Repository auf GitHub anlegen, Dateien hochladen, dann unter *Settings → Pages* den Zweig `main` und den Ordner `/` wählen. Die App ist danach unter `https://<konto>.github.io/<repository>/` erreichbar.

## Hinweis zum Namen

„WetterPro" ähnelt der Marke „WeatherPro". Für diesen privaten Test in Ordnung, vor einer öffentlichen Veröffentlichung den Namen ändern.

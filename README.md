# WetterProCamera

**Online:** https://stephandel.github.io/WetterProCamera/

> **Stand 21.10.2026 (A24):** Den alten Teilen-Bildschirm (Canvas, Vorlagen, Sticker, Live-Kamera) und den Schalter `?teilen=alt` gibt es nicht mehr. Alle Einstiege öffnen das Wetterfoto-Studio. Was früher dazu hier stand, steht gekürzt im Abschnitt „Geschichte (bis 21.10.2026)“ am Ende. Die Testdatei `tests/w3-g1.test.js` entfiel mit dem Bildschirm.

> **Stand 22.10.2026 (A26, A28):** **Sonne** und **Mond** sind zwei getrennte Kacheln mit eigenen Blättern (Sonne: Bogen, goldene Stunde, Dämmerungen; Mond: Phase, Auf-/Untergang, Voll-/Neumond). Im Reiter Rad/Sat gibt es drei neue Ebenen **Wind**, **Wolken** und **Isobaren** (Open-Meteo-Gitter, aktuelle Werte, ohne Schlüssel; Regen zeigt weiter das Radar). Das Kamera-Studio legt standardmäßig nur Temperatur, Wettersymbol, Ort und Datum aufs Foto (Mount-Option `start`). Blätter lassen den Fokus kreisen, Beschriftungen im Meteogramm und der Kartenhinweis sind 12 px, die Tagesdetail-Zusammenfassung nennt den Abschnitt. Tests: `tests/a26-a28.test.js`. **Baustein:** `meteogramm.js` und `meteogramm.css` sind seit 22.10.2026 wieder gleich mit `WetterPro Nachbauten/gemeinsam/` (die Zoom-Knöpfe unter dem Diagramm stehen jetzt auch dort, Commit 161e9fd dort). Die 12-px-Schrift steht bewusst in `app.css`, nicht im Baustein.

> **Stand 21.10.2026 (A9):** Neu auf der Startseite: **Warnung** (amtliche DWD-Warnungen über Bright Sky, ganz oben, nur bei Warnlage und nur für Orte in Deutschland, antippbar für den vollen Text) und **Luftqualität** (Ampel-Ring nach dem Europäischen AQI, Schadstoffe aufklappbar; gleicher Open-Meteo-Aufruf wie der Saharastaub). „Was heute geht“ zeigt höchstens 2 Tipps. Tab-Leiste deckender; Tab „Mehr“ gegliedert, Pilot-Karte unten. Tests: `tests/warnung-luft.test.js`, `tests/nutzertest-funde.test.js`. Bericht: `BERICHT-2026-10-21-WARNUNG-LUFT.md`.

Test-App einer Wetter-App im Apple-Stil (Liquid Glass), **gestaltet mit dem Design-Konfigurator** nach den Empfehlungen der KI und gebaut von Claude Code aus dem exportierten Projektpaket (15.10.2026).

- Live-Wetter von [Open-Meteo](https://open-meteo.com) (CC BY 4.0), ohne Schlüssel und ohne eigenen Server
- Reiter: **Wetter** (Aktuell, nächste Stunden, Regen der nächsten 2 Stunden, 8 Tage), **Graphs** (48 Stunden), **Kamera** (Wetterfoto-Studio), **Rad/Sat** (Radar von [RainViewer](https://www.rainviewer.com), Satellit von EUMETSAT, Temperaturkarte), **Mehr** (Ortssuche, Favoriten, Wettermodell, Einheiten, Quellen, Webcam-Hinweis)
- **Wetterfoto** (seit 20.10.2026): Foto machen oder wählen, Wetter drauf, teilen. Das Wetterfoto-Studio stammt aus dem Kamera-Konfigurator (siehe unten)

### Wetterfoto-Studio (seit 20.10.2026)

Das Studio kommt unverändert aus dem Kamera-Konfigurator (Dateien in `lib/kamera-studio/`, Herkunft in `HERKUNFT.txt`; nie von Hand ändern, sondern in der Quelle ändern und mit `node tools/kamera-studio-holen.js` neu holen). Die Einstellung steht als `KS_EINSTELLUNG` in `app.js`; die Studio-Beschreibung steht in `DESIGN.md` (Abschnitt „Modul Kamera-Studio“) und im Kamera Konfigurator in `EINBAU.md`.

- **Ein-Tipp-Karte:** Foto wählen oder aufnehmen, eine fertige **Vorlage** antippen, **Teilen**. Vorlagen laut Studio-Code: Empfohlen, Band, Story (9:16), Quadrat, Analog, Schwarz-Weiß, Sofortbild, dazu „Meine Vorlage“ zum Merken.
- **Bearbeiten:** Drehen, Zuschneiden, Formate, Filter, Regler, Rahmen und mehr (Liste in `DESIGN.md`). **Teilen-Optionen:** Teilen, Sichern, Kopieren; Ausgabe PNG, JPEG, PDF oder WebP in wählbarer Größe.
- **Motiv aus Fotos wählen:** Knopf im Studio mit bebildertem Hinweis in drei Schritten, wie ein freigestelltes Motiv aus der Apple-Fotos-App eingefügt wird. Apples Freistellen selbst lässt sich aus dem Web nicht aufrufen.
- **Wetterwerte** kommen aus den echten Daten der App (Open-Meteo oder DWD), nie aus Beispielwerten. Standardmäßig kommen nur Temperatur, Wettersymbol, Ort und Datum aufs Foto (`start` in `KS_EINSTELLUNG`); mehr schaltest du im Studio zu.
- **Galerie „Meine Wetterfotos“:** liegt im Studio-Speicher `wpcamera-ks-galerie` (3 Originale, 5 bearbeitete). Der eigene Speichername trennt sie von WeddaApp und Konfigurator unter derselben Adresse. Die Fotos bleiben auf dem Gerät.
- **Knopf und Einstellung:** Der runde gelbe Knopf sitzt standardmäßig in der Tab-Leiste auf Platz 3 und öffnet gleich die Kamera; Ort, Platz und Aussehen ändert man unter „Mehr“ → „Wetterfoto“ (gemerkt unter `wpc-wf-…`), Auslöser und Sucher-Knöpfe am Zahnrad im Studio. „Textvorschlag von Claude“ bleibt unsichtbar (bräuchte einen eigenen Server).
- **Frühere Galerie:** `wpc-galerie` (die Galerie des alten Teilen-Bildschirms) erscheint unter „Mehr“ als „Frühere Wetterfotos“ nur, wenn dort noch Fotos liegen (ansehen, teilen, löschen).
- Test: `node tests/wetterfoto.test.js`.

### Neu am 22.10.2026 (A26, A28, A32)

- **Sonne und Mond** sind zwei getrennte Kacheln mit eigenen Blättern; im Reiter Rad/Sat gibt es die Ebenen **Wind**, **Wolken** und **Isobaren** (Linien gleichen Luftdrucks) aus einem groben Open-Meteo-Gitter, nur aktuelle Werte (Details oben im Stand-Hinweis).
- **Vollbild** (A32): Das Meteogramm (Taste ⤢) und die Rad/Sat-Karte (Knopf „Vollbild“ unter der Karte) legen sich als Blatt über den ganzen Bildschirm; „Fertig“, Esc und Zurück schließen es. Unter Mehr → Startseite gibt es den Schalter **„Meteogramm und Karten immer im Vollbild“** (`wpc-vollbild-immer`): Graphs (in der Darstellung Meteogramm) und Rad/Sat öffnen dann gleich als Blatt. Test: `tests/vollbild.test.js`.

### Neu am 15.10.2026 (Paket A6)

- **Mac-Layout:** Ist das Fenster mindestens 1024 px breit und wird mit Maus oder Trackpad bedient (Mac, Windows-Rechner), steht links eine **Seitenleiste** statt der Tab-Leiste unten: App-Name, die fünf Bereiche mit Symbol, deine Orte (Favoriten mit Stern zuerst), „Ort suchen", „Wetter teilen" (öffnet das Wetterfoto) und ein Hinweis auf die Kürzel. Auf iPhone und iPad ohne Maus bleibt alles wie bisher.
- **Zwei Spalten:** Im Tab „Wetter" stehen links Aktuell und die nächsten Stunden (bleiben beim Scrollen stehen), rechts Regenradar, Tagesliste und alle weiteren Kacheln in ihrer Reihenfolge (auch künftige, z. B. aus Paket A5). „Mehr" ist zweispaltig, je Überschrift ein Block. Graphs und Rad/Sat nutzen die volle Breite und mehr Höhe.
- **Dichte Schrift wie auf dem Mac:** Text 13 px, Zweittext 12 px (nie kleiner), Überschrift 20 px, Klickflächen 28 px. Die Werte stehen als eigene Variablen (`--mac-*`) im Block „Paket A6" am Ende von `app.css`; `tokens.css` bleibt unverändert.
- **Tastaturkürzel:** ⌘1–⌘5 Bereiche, ⌘K Ort suchen, ⌘R Wetter aktualisieren (statt die Seite neu zu laden), Esc schließt Fenster (im Wetterfoto zuerst das, was das Studio selbst offen hat). Mit sichtbarem Fokusring.
- **Wetterfoto als Ebene darüber:** Das Studio legt sich über die ganze App; dahinter ist nichts bedienbar. Ob es am Mac als Fenster oder bildschirmfüllend erscheint, ist hier nicht geprüft.
- Tests: 1280 × 800 und 1440 × 900, alle Tabs, Kürzel, Esc, kein seitliches Scrollen, 390 px unverändert.

### Neu am 15.10.2026 (Paket B)

- **Datenquelle wählbar** (Tab „Mehr" → „Datenquelle"): Open-Meteo (Standard) oder **DWD über Bright Sky** (brightsky.dev, DWD-Daten CC BY 4.0, ohne Schlüssel). Beim DWD steht oben „Modell: DWD MOSMIX"; die Vorhersage reicht 9 Tage. Aktuelle Werte kommen von der nächsten DWD-Wetterstation. UV-Index und Luftqualität gibt es beim DWD nicht (dort steht „–"), Sonnenauf- und -untergang rechnet die App selbst aus. Hat der DWD für einen Ort keine Daten, zeigt die App Open-Meteo und sagt das in einem Hinweis. Gemerkt in `wpc-quelle`.
- **Kurzbefehl „Wetterfoto“**: Der Link `https://stephandel.github.io/WetterProCamera/?kamera=1` (oder `#kamera`) öffnet nach dem Laden der Wetterdaten (höchstens 20 s Wartezeit) das Wetterfoto-Studio, ohne die Kamera zu starten; dort wählst du das neueste Foto. Im Tab „Mehr“ steht eine Schritt-für-Schritt-Anleitung für Apples App „Kurzbefehle“ und ein Knopf „Link kopieren“.
- **Offline robuster**: Die Kartenbibliothek Leaflet liegt jetzt in der App (`lib/leaflet/`, Version 1.9.4) statt auf einem fremden Server. Der Service Worker (das Programm, das die App ohne Netz startet) speichert nur noch einwandfreie Dateien, holt die Startseite immer frisch und frischt alles andere im Hintergrund auf.
- **Version automatisch**: Die Version des Service Workers ist ein Fingerabdruck aller App-Dateien und ändert sich von selbst, sobald sich eine Datei ändert (siehe „Tests und Version").
- **Automatische Tests**: `npm test` prüft die App in WebKit (dem Browser-Kern von Safari), auf GitHub bei jedem Hochladen.
- Plus- und Minus-Knopf der Karten haben jetzt 44 px Tippfläche.
### Neu am 15.10.2026 (Paket A)

- **Kurzname „WP Camera"** unter dem App-Symbol auf dem Home-Bildschirm (`manifest.json`, `index.html`).
- **Fehler verständlich:** „Der Wetterdienst ist gerade überlastet" (neuer Versuch von selbst nach 30 s, 60 s, 120 s, mit Countdown), „Offline" (lädt neu, sobald wieder Netz da ist), „Der Wetterdienst antwortet nicht", „Der Wetterdienst meldet einen Fehler (Nr. 503)". Der letzte Stand bleibt sichtbar („Stand 14:32 Uhr", ältere Stände mit Datum), dazu „Erneut versuchen".
- **Ziehen zum Aktualisieren** auf „Wetter" und „Graphs" (oben nach unten ziehen, „Loslassen zum Aktualisieren"). Oben im Tab Wetter steht „Letztes Update 14:32 Uhr" mit dem Knopf „Aktualisieren" für Mac und iPad.
- **Querformat** (iPhone liegend): Aktuell-Kachel links, Stunden und Tage rechts; Ränder für die Notch.
- **Große Schrift** (iPhone-Einstellung „Textgröße"): Die App folgt ihr; bei sehr großer Schrift rücken Sonne und Regen in der Tagesliste in eine zweite Zeile.
- **Pilot: Wochen-Rückmeldung** im Tab „Mehr": „Diese Woche an 3 Tagen genutzt (KW 42)". Gezählt werden nur die Tage, nur auf dem Gerät (`wpc-nutzung`). „Rückmeldung schreiben" öffnet drei Fragen; der Text wird über Teilen (WhatsApp, Mail) verschickt oder kopiert, nie automatisch.
- **Datenschutz** im Tab „Mehr" unter den Quellen.
### Neu am 15.10.2026 (Paket C)

- **Nachbesserung (A4):** Der Hilfetext unter dem Meteogramm liegt jetzt sicher über der Tab-Leiste, und der Satellitenfilm geht nach 4 Sekunden auch mit noch unvollständigen Bildern weiter (Hinweis „Bilder laden …“).
- **Satellit und Infrarot abspielen:** Unter Rad/Sat hat jetzt auch die Ebene Satellit bzw. Infrarot den Knopf „Abspielen". Er zeigt 12 Bilder der letzten 2 Stunden (alle 10 Minuten eins), mit Uhrzeit. Fehlende Bilder werden übersprungen. Nachts erklärt ein Satz, dass das Farbbild dunkel bleibt und Infrarot die Wolken trotzdem zeigt.
  Technik: EUMETSAT-Kartendienst (WMS) mit Zeitangabe `time=`. Die Zeitliste kommt aus der Selbstauskunft des Dienstes (`GetCapabilities` je Ebene). Geprüft am 15.10.2026: `<Dimension name="time">2024-09-23T00:00:00.000Z/2026-10-15T12:30:00.000Z/PT10M</Dimension>`, also Anfang/Ende/Schritt 10 Minuten, das neueste Bild ist etwa 20–25 Minuten alt (gleich für `mtg_fd:rgb_geocolour` und `mtg_fd:ir105_hrfi`).
- **Meine Wetterfotos:** Die Galerie gehört jetzt zum Studio (siehe „Wetterfoto-Studio“ oben). Die damals hier gebaute Galerie (IndexedDB `wpc-galerie`) heißt heute „Frühere Wetterfotos“ und erscheint unter „Mehr“ nur noch, wenn dort Fotos liegen.
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
- **Grauer Zweittext** im hellen Modus dunkler: jetzt 5,6:1 auf Weiß (vorher 3,4:1). Dunkel unverändert 6,0:1. (Seit 20.10.2026 gibt es nur noch den dunklen Modus.)
- **Offline:** Der letzte Stand bleibt sichtbar, oben steht „Offline · Stand 14:32 Uhr“. Ganz ohne Daten erscheint ein ruhiger Zustand mit Symbol, einem Satz und „Erneut versuchen“.
- **Kopfzeile** deckender, gescrollter Text scheint nicht mehr durch. Links steht ein **Orte-Symbol** (Pin) statt der drei Striche; es springt zu „Meine Orte“.
- **Graphs:** Achsenzahlen echte 12 px; Antippen der Kurve zeigt Uhrzeit, Temperatur und Regen. Die Regen-Kachel auf „Wetter“ ist bei Trockenheit kurz (keine leeren Balken).
- **Rad/Sat:** „Abspielen“ in Akzentfarbe, Satz „Kein Regen in Sicht“, ruhigere (blassere) Grundkarte, Quelle als eigene Zeile.
- **Mein Standort:** Liegt ein bekannter Ort (Favorit, Standardort, zuletzt gesuchter Ort) näher als 8 km, gilt dessen Name. Sonst bleibt „Mein Standort“, und aufs Wetterfoto kommt kein Ortsname. Grund: Open-Meteo hat keine Rückwärtssuche (Koordinaten → Stadt), andere Dienste (z. B. Nominatim) nur mit Erlaubnis.
- Knöpfe in Akzentfarbe haben im Dunkelmodus schwarze Schrift (DESIGN.md Regel 9).
- Service Worker `wpc-4`.

### Neu am 15.10.2026 (Paket 3)

- **App-Symbol „Linse"** (Entwurf A): `app-symbol-1024.png` und `apple-touch-icon.png` (180 px, 30 KB). Die Entwürfe in `symbol-entwuerfe/` bleiben nur lokal (`.gitignore`).
- **Tab-Leiste mit Kamera in der Mitte:** Wetter, Graphs, **Kamera** (runder gelber Auslöser, öffnet das Wetterfoto-Studio gleich mit der Kamera), Rad/Sat, Mehr. Der Teilen-Knopf oben öffnet das Studio ohne Kamera. Wo der Wetterfoto-Knopf sitzt (Tab-Leiste, Kopfzeile, schwebend, in „Mehr“ oder als Kachel), stellst du unter „Mehr“ → „Wetterfoto“ ein. Die Temperaturkarte ist jetzt die Ebene „Karte" unter Rad/Sat.
- **Mehr:** Orte mit Favoriten-Stern (Favoriten stehen oben), **Wettermodell** wählbar (Beste Mischung, ECMWF, DWD ICON, NOAA GFS, Météo-France, UK Met Office; Open-Meteo-Parameter `models=`), Modell steht in der Kopfzeile, Wind in km/h, m/s, Knoten oder Beaufort, Quellen-Block automatisch, Abschnitt „Webcam" mit den 6 angefragten Kameras (Bilder folgen erst nach Erlaubnis).
- **Rad/Sat:** Ebenen Radar (RainViewer), **Satellit** und **Infrarot** (EUMETSAT/Meteosat, frei ohne Schlüssel), Karte (Temperaturen an deinen Orten).
- Tagestönung im Dunkelmodus abgeschwächt (`tokens.css`).
- Service Worker `wpc-3`: Nach dem Veröffentlichen holt sich die installierte App die neue Fassung.
- Seit 20.10.2026 immer dunkel (kein Hellmodus, auch wenn das iPhone hell eingestellt ist), offline mit dem letzten Stand, auf dem iPhone installierbar („Zum Home-Bildschirm“)

### Welle 3 Wetter und Karte (16.10.2026)

- **Regen und „Was heute geht":** Der Satz unter dem Regenradar nennt Beginn und Dauer („Regen ab 14:30 Uhr für 45 Minuten"); die 8 Balken sind je 15 Minuten. Die Tipps betrachten nur den Rest des Tages ab jetzt. Strand und Kiten erscheinen nur an Küstenorten.
- **Modelle vergleichen** (Tab Graphs, Kurve): 2 bis 3 Wettermodelle als Linien mit eigener Farbe und Strichart, Temperatur und Regensumme, Tabelle darunter. Abrufe nur, wenn der Schalter an ist, 30 Minuten Zwischenspeicher.
- **Tagesdetail:** Klick oder Tipp auf einen Tag öffnet ein Blatt (am Mac ein Fenster) mit Nacht davor / Tag / Nacht danach, Stundenwerten, Sonne und Mond.
- **Sonne und Mond** (seit 22.10.2026 zwei getrennte Kacheln mit je einem Blatt): „Sonne“ mit Sonnenbogen, Auf- und Untergang, goldener Stunde und drei Dämmerungen, „Mond“ mit Phase, Auf- und Untergang, Voll- und Neumond. Alles wird auf dem Gerät gerechnet, kein neuer Netzdienst.
- **Meer** (nur Küstenorte): Wellenhöhe, Periode, Richtung, Wassertemperatur und Tide-Kurve von Open-Meteo Marine; der Meerespunkt aus der Antwort wird je Ort gemerkt (`wpc-meerpunkt`).
- **Calima:** Hinweiskachel bei Saharastaub über der Schwelle (Open-Meteo Luftqualität, `dust`). Schwelle 25 / 50 / 100 µg/m³ in „Mehr", Standard 50 (EU-Tagesgrenzwert für PM10).
- **Kartensteuerung:** Zoom-Knöpfe mit 44 px, Zeitleiste und Film-Tempo 0,5× / 1× / 2×, Pfeiltasten für die Ebenen.
- **Datensparmodus** (Mehr, `wpc-datensparen`): keine Satellitenfilme, Radar als Standbild, kein Modellvergleich, Karte nur bis Stufe 9. Bei `navigator.connection.saveData` schlägt die App ihn einmal vor.
- Test: `PORT=8872 node tests/w3-g2.test.js`.

### Welle 3 Foto und Teilen (16.10.2026, ersetzt)

Alles, was diese Welle am alten Teilen-Bildschirm gebaut hatte (Sticker, Meteogramm-Streifen, Mini-Karte, Live-Kamera, „Shot on ProCamera“), gibt es nicht mehr; siehe „Geschichte (bis 21.10.2026)“ unten. Das Wetterfoto-Studio bringt eigene Sticker, Postkarte, Live-Sucher und „Wetter zur Aufnahmezeit“ mit (Beschreibung in `DESIGN.md`, Abschnitt „Modul Kamera-Studio“; ob jede dieser Funktionen im Alltag so läuft, ist hier nicht einzeln nachgeprüft).

## Geschichte (bis 21.10.2026)

Bis zum 21.10.2026 (A24) hatte die App einen eigenen Teilen-Bildschirm. Er ist entfernt; die Beschreibungen oben sind gekürzt. Was es gab:

- **Canvas-Bild** (eine Zeichenfläche im Browser) im Format 3:4 und fünf weiteren Formaten, mit Vorlagen Klassisch, Glas, Minimal, Rahmen, Polaroid, Zeitstempel; Blatt „Infos“ mit 19 Angaben (Reihenfolge, Ort, Farbton, Größe, JPEG/PNG), gemerkt unter `wpc-teilen`.
- **Sticker** (Temperatur, Symbol, Wind, Mini-Karte), Meteogramm-Streifen, **eigenes Logo** (`wpc-logo`), **Live-Kamera** im Bildschirm, „Wetter von damals“ aus dem Foto-Datum (Open-Meteo-Archiv), Hinweis „Geteilt ✓“ nach dem Teilen.
- **Eigene Galerie** „Meine Wetterfotos“ (`wpc-galerie`, höchstens 200 Fotos); sie heißt heute „Frühere Wetterfotos“ und zeigt sich nur noch, wenn dort Fotos liegen. Der Schalter `?teilen=alt` zum Zurückschalten ist weg.
- **Vorgebaut, aber nie an:** „Shot on ProCamera“ und „Mit ProCamera aufnehmen“ (brauchten die Freigabe von Cocologics); mit dem Bildschirm entfernt.

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

**Tests:** Einmal `npm install` (lädt das Testwerkzeug Playwright, rund 10 MB, und nutzt WebKit, den Browser-Kern von Safari), danach `npm test`. Der Befehl setzt die Version (siehe unten) und führt sieben Testdateien nacheinander aus (`app`, `design-gelb`, `wetterfoto`, `warnung-luft`, `nutzertest-funde`, `a26-a28`, `vollbild`), zusammen 548 Prüfungen (Lauf vom 21.10.2026 auf main). Jede Datei startet ihren eigenen kleinen Server auf einem festen Port (steht als `PORT=…` im Kopf der Datei, z. B. 8862 für `app`, 8823 für `wetterfoto`); mit `PORT=… node tests/<Datei>` lässt sich ein anderer wählen. Geprüft werden unter anderem: alle Tabs in 390 px, iPad (820 px), iPhone quer (844 × 390) und Mac (1280 × 800, 1440 × 900), kein seitliches Scrollen, keine Fehler in der Konsole, Tippflächen mindestens 44 px, keine Schrift unter 11 px, das Wetterfoto-Studio, Offline-Zustand, Datenquelle DWD samt Rückfall auf Open-Meteo, Direktlink `?kamera=1`, Sonne/Mond, Karten-Ebenen, Vollbild und der Service Worker. Nicht in `npm test` enthalten sind `tests/w3-g2.test.js` (Wetter und Karte, 115 Prüfungen, Port 8872) und `tests/w3-g3.test.js` (Webcams, 105 Prüfungen, Port 8873); die startest du einzeln, z. B. `node tests/w3-g2.test.js`. Die Wetterdienste werden dabei nicht gefragt: Die Tests nutzen gespeicherte Antworten aus `tests/fixtures/` (und Attrappen in `tests/hilfe.js`). Bildschirmfotos landen in `tests/bilder/` (wird nicht hochgeladen). Auf GitHub laufen dieselben Tests bei jedem Hochladen automatisch (`.github/workflows/test.yml`, für öffentliche Repositories kostenlos); das Ergebnis steht im Reiter „Actions".

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
- **Webcam als Hintergrund fürs Wetterfoto (früher „B3“) ist nicht gebaut.** Voraussetzung wäre: Bilder mit CORS-Freigabe (Erlaubnis des fremden Servers) oder über den Zwischenspeicher, dazu die Erlaubnis des Betreibers.
- Test: `PORT=8873 node tests/w3-g3.test.js` (schreibt `app.js` im Test um, die Datei bleibt unverändert).

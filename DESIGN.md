# DESIGN.md – Gestaltungsregeln

Erzeugt am 15.10.2026 mit dem Design-Konfigurator, Farben und Erscheinung neu am 20.10.2026 (gelber Akzent, immer dunkel). Gilt für alle Web-Apps der WetterPro-Familie und neue Apps (Reiseplaner, Stadtmagazin, Gesundheits-Begleiter).

**Für Claude Code:** Lies diese Datei vor jeder UI-Arbeit. Halte jede Regel ein. Die Werte stehen als CSS-Variablen in `tokens.css` (gleiche Namen wie in `apple-ui/base.css`). Ergänze in `CLAUDE.md` den Satz: „Lies DESIGN.md und nutze ausschließlich die Variablen aus tokens.css."

## Stimmung in einem Satz

Ausgewogen, normal, mit Apple-Bewegung. Akzent #FFD633 (Gelb) auf blauem, immer dunklem Grund, Schrift System (SF Pro), Rundung 16 px, Navigation: Tab-Leiste unten.

## Regeln

1. Haltung: Die App wirkt ausgewogen, normal, mit Apple-Bewegung. Inhalt zuerst, Bedienelemente schweben darüber (Liquid Glass nur auf schwebenden Elementen, nie Glas auf Glas). Eine Aufgabe pro Bildschirm.
2. Grundschrift: `-apple-system, "SF Pro Text", system-ui, sans-serif` (Systemschrift, nichts nachladen). Display-Schrift für Hero-Zahlen: keine, die Grundschrift in Gewicht 200–300.
3. Textstufen (Apple-Stufen, Basis 17 px): Large Title 34, Title 1 28, Title 2 22, Title 3 20, Body 17, Subhead 15, Footnote 13, Caption 12, Hero 101 px. Nur diese Stufen verwenden, über `--fs-*` aus tokens.css, in rem. **Vorrang:** Diese Werte gelten vor den Standardstufen in `apple-ui/base.css` (34/28/22/20/17/15/13/12). Die kleinen Stufen halten Apples Abstände zur Grundschrift ein, die großen folgen dem Faktor.
4. Kein Text unter 11 px. Tab-Beschriftung ist Caption (12 px). Zahlen in Listen mit `font-variant-numeric: tabular-nums`.
5. Zeilenhöhe Fließtext 1.36 (`--lh`), Überschriften 1,1–1,2, Hero-Zahl 1,0. Fließtext maximal 65 Zeichen breit (`max-inline-size: 65ch`), nie über 75.
6. Abstände nur aus der Skala: 4, 8, 12, 16, 20, 24, 32 px (`--s1` bis `--s8`, Dichte-Faktor 1.00). Randabstand `--rand` = 16 px, ab 768 px Breite 20 px.
7. Eckenrundung: Kacheln 16 px (`--r-kachel`), Knöpfe 12 px (`--r-button`), Chips rund (`--r-chip: 999px`), Vollbildflächen 0.
8. Akzentfarbe #FFD633 (oklch(88.6% 0.170 94)), im Dunkelmodus #FFD633. Sie markiert nur Interaktives: aktiver Tab, Knöpfe, Links, Fokusring. Niemals als Deko-Fläche. Hover: `--akzent-hover`, zarte Fläche: `--akzent-tint`, 20-%-Füllung: `--akzent-fuellung`.
9. Text auf Akzentfläche (`--auf-akzent`): dunkel schwarz (14,9:1).
10. Grundfarben: aus der Akzentfarbe abgeleitet, alle Grautöne tragen einen Hauch davon. Neutrale Farben hell: Hintergrund #DFEDFF, Kachel #F7FAFF, Text #091628. Dunkel: Hintergrund #03428A, Kachel #1158AD, Text #FFFFFF. Sekundärtext `--label-2` (in dieser App 80 % Weiß, weil die 72 % aus dem Konfigurator auf der Kachel nur 4,4:1 ergaben; jetzt 5,1:1), Tertiärtext `--label-3` (nur für Linien, nie für Text). Nie reines Grau als Text.
11. Kontrast: Text mindestens 4,5:1, Symbole 3:1. Geprüft beim Export: Akzent auf Hintergrund dunkel 6,9:1, Text auf Kachel dunkel 6,9:1, Text auf Akzentfläche dunkel 14,9:1, Zweitfarbe auf Kachel dunkel 4,9:1. Vor jedem Commit prüfen. APCA (Lc, zusätzlich zu WCAG): Text auf Kachel dunkel 88, Nebentext auf Kachel dunkel 57 (zu wenig für 15 px, nötig 90), Akzent auf Hintergrund dunkel 72 (zu wenig für 17 px, nötig 75), Text auf Akzentfläche dunkel 84, Zweitfarbe auf Kachel dunkel 65 (zu wenig für 17 px, nötig 75). Faustregel: Lc 90 sehr gut, 75 Fließtext, 60 große oder fette Schrift, 45 Überschriften.
12. Erscheinung: Die App ist immer dunkel (Dunkelmodus fest, `color-scheme: dark` in `tokens.css`). Es gibt keinen Hellmodus, auch nicht, wenn das iPhone hell eingestellt ist; die hellen Werte in den Regeln 10 und 15 stehen nur der Vollständigkeit halber da und werden nicht benutzt. Erhebung durch hellere Flächen, nicht durch Schatten. **Gelb nur auf dunklem Grund:** Gelbe Schrift und gelbe Linien nur auf `--bg`, `--bg-2`, Glas oder dunklen Tönungen, nie auf hellen Flächen. Text auf gelber Fläche ist immer dunkel (`--auf-akzent`).
13. Hintergrund: einfarbig `--bg`. Kacheln opak in `--bg-2`.
14. Kopfzeile: Leiste über die ganze Breite, Höhe 44 px (`--kopf-hoehe`) plus Safe Area oben. Tab-Leiste: schwebende Pille, voll gerundet, Tipp-Höhe 50 px (`--leiste-hoehe`) plus Safe Area unten, Beschriftung immer sichtbar, aktiver Tab in Akzentfarbe mit zarter Fläche `--fuellung` dahinter.
15. Tagesfarben: Zeilen der Tagesliste bekommen eine hauchzarte Tönung (Chroma 3 %), Modus „zwei Töne wechselnd". Variablen `--tag-a` #1158AD (Kachelblau) und `--tag-b` #0C50A1 (etwas dunkler); seit 20.10.2026 blau statt braun-schwarz (Stephans Wahl), die App ist immer dunkel. Die Tönung darf den Textkontrast nicht senken.
16. Navigation: Tab-Leiste unten mit genau diesen Tabs in dieser Reihenfolge: Wetter, Graphs, Kamera (runder gelber Wetterfoto-Knopf in der Mitte, siehe Abschnitt „Modul Kamera-Studio“ am Ende; Ort, Platz und Aussehen kann der Nutzer unter „Mehr“ ändern), Rad/Sat, Mehr. „Karten“ ist kein eigener Tab, sondern eine Ebene im Tab „Rad/Sat“, damit die Leiste bei fünf Plätzen bleibt. Glas, bleibt beim Scrollen, Safe Area unten.
17. Luftqualität: laut Konfigurator ein kleines Modul auf dem Startbildschirm („Ampel-Ring“ mit Wort, siehe Regel 31). **Seit 21.10.2026 (A9) gebaut:** Ring mit Zahl und Wort nach dem Europäischen AQI, Schadstoff-Balken aufklappbar (Konstante `A9_LUFT_GROESSE`); als Spalte der Tagesliste bleibt sie abgeschaltet. Wo sie gezeigt wird, immer mit Wort, nie nur Farbe. Wörter (UBA-Sprachgebrauch): gut, noch gut, mäßig, schlecht, sehr schlecht, extrem schlecht (0–20, 20–40, 40–60, 60–80, 80–100, über 100).
18. Mond: laut Konfigurator ein kleines Modul auf dem Startbildschirm (Phase als Text und Prozent). In dieser App übernimmt das die bestehende Kachel „Sonne und Mond“ (Sonne ist laut Konfigurator aus, steht aber in derselben Kachel); als Spalte der Tagesliste bleibt der Mond abgeschaltet. **Seit 22.10.2026 (A26):** Sonne und Mond sind zwei getrennte Kacheln („Sonne“ nach der Luftqualität, dann „Mond“), jede mit eigenem Blatt; Sonne ist damit entgegen dem Konfigurator-Link eingeschaltet, laut Entscheidung A26.
19. Symbole: eigene feine Linien im Apple-Stil als Inline-SVG mit `currentColor`, Strichstärke 1.5 (`--strich`), runde Enden. Aktiver Tab gefüllt (fill currentColor, 28 %), sonst Linie. Größen 17 / 20 / 24 px. Keine SF Symbols ausliefern.
20. Bewegung: Dauer `--dauer` 280 ms, Kurve `--ease` cubic-bezier(.32,.72,0,1). Nur transform und opacity animieren. Antippen: opacity .6 oder scale .97. Bei `prefers-reduced-motion` nur Überblenden (≤ 200 ms), kein Parallax.
21. Schatten: keine Schatten auf Kacheln, Trennung nur über Flächen und `--trenner`. Glas-Schatten `--glas-schatten` nur auf Tab-Leiste und Titelzeile.
22. Glas (`.glas` in tokens.css): nur auf Kopfzeile, Tab-Leiste, schwebenden Knöpfen und Chips. Unschärfe 20 px, Farbkraft 180 %, Deckkraft hell 70 %, dunkel 60 %, feine Lichtkante. Nie Glas auf Glas. Bei `prefers-reduced-transparency` deckend.
23. Wettersymbole: Satz „Klassisch" (wie WetterPro, feiner Umriss). Die Symbole stehen fertig in `symbole.js` (Export); Aufruf `WetterSymbol('regen')`. Keine anderen Wettersymbole mischen. 16 Wetterlagen inklusive Nacht. Größen 30 px in Listen, 34 px im Stundenstreifen, 72 px groß. Immer mit Text daneben, nie nur das Symbol.
24. Bedien-Symbole: fein gezeichnet wie in WetterPro Glas (Strich 1,6). Ein Satz für die ganze App.
25. Zweitfarbe #FFD633 (`--akzent-2`) nur für hervorgehobene Werte: Höchsttemperatur, Stundentemperatur, große Zahl. Nie für Knöpfe oder Fließtext.
26. Zustände: Laden als Skeleton in Form der echten Inhalte, nie als Drehkreisel. Offline: letzter Stand mit Uhrzeit sichtbar („Offline · Stand 14:32"), App bleibt bedienbar. Fehler: ruhiges Symbol, ein Satz, was passiert ist, und ein Knopf „Erneut versuchen". Leer: Satz plus erste Aktion.
27. Kamera und Teilen: **Seit 20.10.2026 ersetzt durch den Abschnitt „Modul Kamera-Studio“ am Ende.** Der folgende alte Teilen-Bildschirm wurde am 21.10.2026 samt `?teilen=alt` entfernt (A24); der Text bleibt nur als Geschichte stehen. Bisherige Regel (wie früher bei WeatherPro): Einstieg über Teilen-Symbol in der Kopfzeile neben der Suche. Der Teilen-Bildschirm ist immer schwarz, das Bild steht groß in der Mitte, Knöpfe wie in der Kamera-App: großer runder Teilen-Knopf in der Mitte, links „Fotos", rechts „Kamera", oben links „Abbrechen". Das Bild entsteht mit `<canvas>`: Foto aus Kamera (`<input type="file" accept="image/*" capture="environment">`) oder Mediathek (ohne `capture`), bildfüllend zugeschnitten, Format 3:4 (1080 × 1440 px, JPEG 90 %). Gestaltung „Klassisch": Wie früher bei WeatherPro: ein halbdurchsichtiges Band über die ganze Breite. Links Ort und Temperatur, in der Mitte der Wind, rechts Regen und Sonne. Lage oben. Farbton dunkel mit weißer Schrift. Im Bild: Temperatur mit Wettersymbol, Ort und Datum (TT.MM.JJ), Wind mit Richtungspfeil und km/h, Regenmenge, Sonnenstunden, App-Name klein in der Ecke. Unter dem Bild stehen alle vier Gestaltungen (Klassisch, Glas, Minimal, Rahmen) als kleine Vorschaubilder zur Wahl; die zuletzt gewählte merken. Teilen über `navigator.share({ files: [bild] })` (Web Share mit Datei, auf iPhone und iPad vorhanden); fehlt das, das Bild als JPEG herunterladen. Text nie direkt auf das Foto setzen, immer Band, Glas, Verlauf oder Rahmen darunter. Das Bild wird neu aus Pixeln gezeichnet, dadurch enthält es keinen Aufnahmeort (GPS) und keine anderen Metadaten des Fotos. Ort nur als Stadt.
28. Texte deuten statt nur Zahlen zeigen: „Gute Luft zum Lüften", „Bis 19 Uhr trocken", „Mond zu 62 % beleuchtet, zunehmend". Du-Form, Verben auf Knöpfen, keine Großbuchstaben-Sätze.
29. Abstände: alle Abstände mit Faktor 1,00 (schon in `--s1` bis `--s8`), zwischen Kacheln immer `--kachel-abstand` 16 px. Symbolgrößen über `--sym-groesse` und `--ikon-groesse`, nie fest im Code.
30. Kontrast-Stufe „Standard": Text mindestens 4,5:1. Zusätzlich `@media (prefers-contrast: more)` mit den Werten der Stufe „Maximal" anbieten.
31. Module auf dem Startbildschirm (Reihenfolge von oben, Stand 20.10.2026): Aktuell, Stunden, Tagesliste, Luftqualität, Mond, Was heute geht; die Warnung (DWD) steht nur bei Warnlage ganz oben, volle Breite, in Warnfarbe nach Schwere (gelb, orange, rot, dunkelrot), ohne Warnung fehlt sie. Ausgeschaltet und deshalb nicht gezeigt: Webcam (zusätzlich hinter dem Hauptschalter `WEBCAMS_FREIGABE`, bis die Betreiber zustimmen), Regenradar-Kachel (das Radar bleibt im Tab Rad/Sat und als Ansicht der Aktuell-Kachel), Sonne, Wind, Pollen, Meteogramm (unter „Mehr“ → „Startseite“ einschaltbar). Der Teilen-Knopf sitzt in der Kopfzeile und in der Tab-Leiste, nicht als Kachel. Spalten der Tagesliste: Tag, Symbol, Temperaturen, Sonne und Regen, Wind. Die Liste ist ein gemeinsames Raster (`display: grid` mit `subgrid`, `justify-content: space-between`), damit alle Zeilen untereinanderstehen und die Abstände zwischen den Spalten gleich sind, auch wenn Spalten fehlen.
32. Tippflächen mindestens 44 × 44 px (`--tap`). Jede Tippfläche hat einen :active-Zustand und einen sichtbaren Fokusring (2 px `--akzent`, Offset 2 px).
33. Safe Areas immer: `padding` mit `env(safe-area-inset-*)` in Titelzeile, Tab-Leiste und Inhalt. Hauptaktionen unten, mit dem Daumen erreichbar.
34. Anordnung „WetterPro" (wie WetterPro Glas, Reiter Wetter): Kopfzeile mit Menü links, Ort (Title 2, fett) und darunter „Modell: …" (Footnote), Suche rechts. Darunter drei Kacheln mit `--s4` Abstand: (1) Aktuell-Kachel zweispaltig mit Trennlinie, links „Aktuell" + Uhrzeit, Symbol 112 px, Temperatur in Large Title unten links und Regen pro Stunde unten rechts, rechts Wetterlage zentriert und die Zeilen Gefühlt, Rel. Feuchte, Luftdruck (Bezeichnung in `--label-2`, Wert rechtsbündig), unten Windrose mit km/h und Böen. (2) Drei Stundenspalten mit Uhrzeit, Symbol 60 px, Regenmenge und Temperatur. (3) Tagesliste, jede Zeile gleich aufgebaut: Tag und Datum, Symbol 40 px, Tiefst- und Höchstwert untereinander, Sonnenstunden/Regenwahrscheinlichkeit/Regenmenge, Windrose mit km/h. Hohe Dichte ist gewollt; Ordnung entsteht durch gleiche Spalten, `tabular-nums` und Trennlinien, nicht durch Leerraum.
35. Zustände: Laden als Skeleton, Leer/Fehler/Offline als ruhiger Zustand mit Symbol, einem Satz und einer Aktion. Ton freundlich, nie belehrend.
36. Werte nie hart codieren. Alles aus tokens.css über Variablen; fehlt eine, dort ergänzen. Vor Abschluss prüfen: 390 px Breite, Dunkelmodus, Dynamic Type 130 %.

## Nicht tun

- Keine Webfont für Fließtext außer der hier festgelegten Grundschrift.
- Keine Eingabefelder unter 16 px Schrift (das iPhone zoomt sonst hinein). Keine Höhe mit `100vh`, sondern `100dvh`.
- Keinen eigenen Zurück-Knopf vergessen: installierte iPhone-Web-Apps haben keinen.
- Keine Täuschungsmuster: keine versteckten Abos, keine vorab angehakten Häkchen, kein künstlicher Zeitdruck.
- Keine Wettersymbole aus fremden Apps übernehmen oder nachzeichnen.
- Keine Großbuchstaben-Labels außer Caption-Überschriften von Kacheln.
- Keine verstreuten Schatten, keine Hamburger-Menüs, kein Glas auf Glas.
- Nichts, das sich nur über Farbe unterscheidet (Luftqualität immer mit Wort).
- Keine Animation von Layout-Eigenschaften (width, height, margin, padding).

## Zusätzliche Anweisungen

Vom Auftraggeber im Konfigurator notiert. Sie gehen den Regeln oben vor, solange keine Schutzregel verletzt wird.

- **Speichern und Veröffentlichen:** Wetterdaten live von Open-Meteo (kostenlos, ohne Schlüssel). Standardort Mannheim, Ortssuche im Tab Mehr. Läuft komplett ohne Server auf GitHub Pages.

## Modul Kamera-Studio

Das Kamera-Studio verwandelt ein Wetterfoto in ein fertiges Bild, eine Datei oder eine Postkarte. Gewählte Oberfläche: „Ein-Tipp-Karte“. Foto wählen, fertige Vorlage, ein Tipp auf „Teilen“. Gedacht für: alle, die nichts einstellen wollen.

- Foto und Kamera: Das Foto kommt aus und der Sucher kann Kamera, Mediathek, Live-Sucher, Aus Zwischenablage einfügen, Ziehen und Ablegen, Kamera wechseln, Zoom, Licht, Selbstauslöser, Raster, Wasserwaage, Bildformat, Frontkamera seitenrichtig und Auslöseton.
- Bearbeiten: Beim Bearbeiten sind erlaubt Drehen, Spiegeln, Begradigen, Zuschneiden, Formate, Auto-Verbessern, Regler, Filter, Schwarz-Weiß-Knopf, Effekte, Wetter-Effekte, Rahmen und Vorher/Nachher.
- Wetter auf dem Bild: Beim Wetter auf dem Bild gilt Wetterwerte aufs Bild, Werte einzeln wählen, Ort grob oder genau, Darstellungsstile, Wetterkarte verschieben, Wetter zur Aufnahmezeit und Logo.
- Gestalten: Zum Gestalten gibt es Text, Emojis, Wetter-Sticker, Postkarte, Postkarten-Rückseite, Handschrift und Textvorschlag von Claude.
- Weitergeben: Als Ausgabe sind möglich PNG, JPEG, PDF, WebP, Größe wählen, Teilen, Sichern, Kopieren, Bildbeschreibung und Hinweis zu Foto-Daten.
- Nach dem Foto: Nach dem ersten Foto gibt es Mit diesem Design weiterfotografieren, Neues Foto und Meine Wetterfotos.
- Komfort: Für die Bequemlichkeit gibt es Rückgängig, Vorlagen merken, Große Bedienung, Hilfetexte und Vibrieren.
- Zugangsknopf: Ort Tab-Leiste, Platz 3, Aussehen „Rund, gefüllt“, beim Antippen: Apple-Kamera.
- Auslöser im eigenen Sucher: Frei verschiebbar.
- Galerie „Meine Wetterfotos“: bis zu 3 Originale und bis zu 5 bearbeitete Fotos.
- Vorschau beginnt bei: Studio.
- Der Nutzer darf selbst ändern (Ort der Einstellung in Klammern): Zugang: App-Einstellungen (Tab „Mehr“); Auslöser: Zahnrad im Studio/Sucher; Galerie: Nein; Sucher-Knöpfe: Zahnrad im Studio/Sucher.

Alles, was ausgeschaltet ist, wird nicht gezeigt: Das Bedienelement verschwindet vollständig und bleibt nicht ausgegraut stehen. Fotos bleiben auf dem Gerät, es wird nichts gesendet. Die Schutzregeln (Tippflächen ab 44 px, Kontrast 4,5:1, Mindestschrift 11 px) gelten immer.

Einbau in WetterProCamera (20.10.2026): Studio-Dateien unverändert in `lib/kamera-studio/` (holen mit `node tools/kamera-studio-holen.js --quelle=<Ordner>`, Herkunft in `HERKUNFT.txt`), Einstellung als `KS_EINSTELLUNG` in `app.js`, mit `speicher: 'wpcamera'`: Die Galerie liegt in der Datenbank `wpcamera-ks-galerie`, die Nutzerwahl des Studios unter `wpcamera-ks-nutzer-…`, damit WeddaApp und Konfigurator unter derselben Adresse stephandel.github.io nichts davon sehen. Die Einstellungen zum Wetterfoto-Knopf stehen unter „Mehr“ → „Wetterfoto“ (eigene Schlüssel `wpc-wf-zugangOrt`, `-zugangPlatz`, `-zugangAussehen`). Der Knopf in der Tab-Leiste (Beschriftung „Kamera“, runder gelber Auslöser) öffnet gleich die Kamera; der Teilen-Knopf oben und der Kurzbefehl `?kamera=1` öffnen das Studio ohne Kamera. Wetterwerte aufs Foto kommen aus den echten Daten der App (Open-Meteo oder DWD), nie aus Beispielwerten. Welche Infos aufs Foto kommen, wählt das Studio selbst (Standard Temperatur, Symbol, Wetterlage, Ort nur Stadt, Datum, Uhrzeit; Wind, Regen und Sonne aus); die Wahl im Link (Temperatur, Symbol, Ort, Datum) lässt sich im Studio nicht vorgeben. Die Farben des Studios kommen aus den Tokens der App (gelber Akzent, schwarze Schrift auf Gelb, immer dunkel); das Studio selbst bleibt unverändert. „Textvorschlag von Claude“ bleibt unsichtbar, weil er einen eigenen Server bräuchte.

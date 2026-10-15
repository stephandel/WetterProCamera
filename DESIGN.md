# DESIGN.md – Gestaltungsregeln

Erzeugt am 15.10.2026 mit dem Design-Konfigurator. Gilt für alle Web-Apps der WetterPro-Familie und neue Apps (Reiseplaner, Stadtmagazin, Gesundheits-Begleiter).

**Für Claude Code:** Lies diese Datei vor jeder UI-Arbeit. Halte jede Regel ein. Die Werte stehen als CSS-Variablen in `tokens.css` (gleiche Namen wie in `apple-ui/base.css`). Ergänze in `CLAUDE.md` den Satz: „Lies DESIGN.md und nutze ausschließlich die Variablen aus tokens.css."

## Stimmung in einem Satz

Ausgewogen, normal, mit Apple-Bewegung. Akzent #086ADC, Schrift System (SF Pro), Rundung 16 px, Navigation: Tab-Leiste unten.

## Regeln

1. Haltung: Die App wirkt ausgewogen, normal, mit Apple-Bewegung. Inhalt zuerst, Bedienelemente schweben darüber (Liquid Glass nur auf schwebenden Elementen, nie Glas auf Glas). Eine Aufgabe pro Bildschirm.
2. Grundschrift: `-apple-system, "SF Pro Text", system-ui, sans-serif` (Systemschrift, nichts nachladen). Display-Schrift für Hero-Zahlen: keine, die Grundschrift in Gewicht 200–300.
3. Textstufen (Apple-Stufen, Basis 17 px): Large Title 34, Title 1 28, Title 2 22, Title 3 20, Body 17, Subhead 15, Footnote 13, Caption 12, Hero 101 px. Nur diese Stufen verwenden, über `--fs-*` aus tokens.css, in rem. **Vorrang:** Diese Werte gelten vor den Standardstufen in `apple-ui/base.css` (34/28/22/20/17/15/13/12). Die kleinen Stufen halten Apples Abstände zur Grundschrift ein, die großen folgen dem Faktor.
4. Kein Text unter 11 px. Tab-Beschriftung ist Caption (12 px). Zahlen in Listen mit `font-variant-numeric: tabular-nums`.
5. Zeilenhöhe Fließtext 1.36 (`--lh`), Überschriften 1,1–1,2, Hero-Zahl 1,0. Fließtext maximal 65 Zeichen breit (`max-inline-size: 65ch`), nie über 75.
6. Abstände nur aus der Skala: 4, 8, 12, 16, 20, 24, 32 px (`--s1` bis `--s8`, Dichte-Faktor 1.00). Randabstand `--rand` = 16 px, ab 768 px Breite 20 px.
7. Eckenrundung: Kacheln 16 px (`--r-kachel`), Knöpfe 12 px (`--r-button`), Chips rund (`--r-chip: 999px`), Vollbildflächen 0.
8. Akzentfarbe #086ADC (oklch(54.3% 0.192 257)), im Dunkelmodus #0A84FF. Sie markiert nur Interaktives: aktiver Tab, Knöpfe, Links, Fokusring. Niemals als Deko-Fläche. Hover: `--akzent-hover`, zarte Fläche: `--akzent-tint`, 20-%-Füllung: `--akzent-fuellung`.
9. Text auf Akzentfläche (`--auf-akzent`): hell weiß (5,1:1), dunkel schwarz (5,8:1).
10. Grundfarben: exakt die Apple-Systemfarben aus `apple-ui/base.css`, wie in WetterPro Glas. Keine eigenen Grautöne erfinden. Neutrale Farben hell: Hintergrund #F2F2F7, Kachel #FFFFFF, Text #000000. Dunkel: Hintergrund #000000, Kachel #1C1C1E, Text #FFFFFF. Sekundärtext `--label-2` (60 %), Tertiärtext `--label-3` (30 %). Nie reines Grau als Text.
11. Kontrast: Text mindestens 4,5:1, Symbole 3:1. Geprüft beim Export: Akzent auf Hintergrund hell 4,6:1, Text auf Kachel hell 21,0:1, Text auf Akzentfläche hell 5,1:1, Akzent auf Hintergrund dunkel 5,8:1, Text auf Kachel dunkel 17,0:1, Text auf Akzentfläche dunkel 5,8:1. Vor jedem Commit prüfen.
12. Erscheinung: Hell und Dunkel, Umschaltung über `prefers-color-scheme`. Nie nur invertieren, beide Skalen aus tokens.css nutzen.
13. Hintergrund: einfarbig `--bg`. Kacheln opak in `--bg-2`.
14. Kopfzeile: Leiste über die ganze Breite, Höhe 44 px (`--kopf-hoehe`) plus Safe Area oben. Tab-Leiste: schwebende Pille, voll gerundet, Tipp-Höhe 50 px (`--leiste-hoehe`) plus Safe Area unten, Beschriftung immer sichtbar, aktiver Tab in Akzentfarbe mit zarter Fläche `--fuellung` dahinter.
15. Tagesfarben: Zeilen der Tagesliste bekommen eine hauchzarte Tönung (Chroma 3 %), Modus „zwei Töne wechselnd". Variablen `--tag-a` #F2F7FF und `--tag-b` #FCF3FF (hell), #1F2938 und #2F2433 (dunkel). Die Tönung darf den Textkontrast nicht senken.
16. Navigation: Tab-Leiste unten mit genau diesen Tabs in dieser Reihenfolge: Wetter, Graphs, Karten, Rad/Sat, Mehr. Glas, bleibt beim Scrollen, Safe Area unten.
17. Luftqualität: nicht auf dem Startbildschirm (Spalte abgeschaltet). Falls an anderer Stelle gezeigt, immer mit Wort, nie nur Farbe.
18. Mond: nicht auf dem Startbildschirm (Spalte abgeschaltet).
19. Symbole: eigene feine Linien im Apple-Stil als Inline-SVG mit `currentColor`, Strichstärke 1.5 (`--strich`), runde Enden. Aktiver Tab gefüllt (fill currentColor, 28 %), sonst Linie. Größen 17 / 20 / 24 px. Keine SF Symbols ausliefern.
20. Bewegung: Dauer `--dauer` 280 ms, Kurve `--ease` cubic-bezier(.32,.72,0,1). Nur transform und opacity animieren. Antippen: opacity .6 oder scale .97. Bei `prefers-reduced-motion` nur Überblenden (≤ 200 ms), kein Parallax.
21. Schatten: keine Schatten auf Kacheln, Trennung nur über Flächen und `--trenner`. Glas-Schatten `--glas-schatten` nur auf Tab-Leiste und Titelzeile.
22. Glas (`.glas` in tokens.css): nur auf Kopfzeile, Tab-Leiste, schwebenden Knöpfen und Chips. Unschärfe 20 px, Farbkraft 180 %, Deckkraft hell 70 %, dunkel 60 %, feine Lichtkante. Nie Glas auf Glas. Bei `prefers-reduced-transparency` deckend.
23. Wettersymbole: Satz „Klassisch" (wie WetterPro, feiner Umriss). Die Symbole stehen fertig in `symbole.js` (Export); Aufruf `WetterSymbol('regen')`. Keine anderen Wettersymbole mischen. 16 Wetterlagen inklusive Nacht. Größen 30 px in Listen, 34 px im Stundenstreifen, 72 px groß. Immer mit Text daneben, nie nur das Symbol.
24. Bedien-Symbole: fein gezeichnet wie in WetterPro Glas (Strich 1,6). Ein Satz für die ganze App.
25. Keine Zweitfarbe: Werte stehen in der normalen Textfarbe, hervorgehoben nur durch Gewicht.
26. Zustände: Laden als Skeleton in Form der echten Inhalte, nie als Drehkreisel. Offline: letzter Stand mit Uhrzeit sichtbar („Offline · Stand 14:32"), App bleibt bedienbar. Fehler: ruhiges Symbol, ein Satz, was passiert ist, und ein Knopf „Erneut versuchen". Leer: Satz plus erste Aktion.
27. Wetter teilen (wie früher bei WeatherPro): Einstieg über Teilen-Symbol in der Kopfzeile neben der Suche. Der Teilen-Bildschirm ist immer schwarz, das Bild steht groß in der Mitte, Knöpfe wie in der Kamera-App: großer runder Teilen-Knopf in der Mitte, links „Fotos", rechts „Kamera", oben links „Abbrechen". Das Bild entsteht mit `<canvas>`: Foto aus Kamera (`<input type="file" accept="image/*" capture="environment">`) oder Mediathek (ohne `capture`), bildfüllend zugeschnitten, Format 3:4 (1080 × 1440 px, JPEG 90 %). Gestaltung „Klassisch": Wie früher bei WeatherPro: ein halbdurchsichtiges Band über die ganze Breite. Links Ort und Temperatur, in der Mitte der Wind, rechts Regen und Sonne. Lage oben. Farbton dunkel mit weißer Schrift. Im Bild: Temperatur mit Wettersymbol, Ort und Datum (TT.MM.JJ), Wind mit Richtungspfeil und km/h, Regenmenge, Sonnenstunden, App-Name klein in der Ecke. Unter dem Bild stehen alle vier Gestaltungen (Klassisch, Glas, Minimal, Rahmen) als kleine Vorschaubilder zur Wahl; die zuletzt gewählte merken. Teilen über `navigator.share({ files: [bild] })` (Web Share mit Datei, auf iPhone und iPad vorhanden); fehlt das, das Bild als JPEG herunterladen. Text nie direkt auf das Foto setzen, immer Band, Glas, Verlauf oder Rahmen darunter. Das Bild wird neu aus Pixeln gezeichnet, dadurch enthält es keinen Aufnahmeort (GPS) und keine anderen Metadaten des Fotos. Ort nur als Stadt.
28. Texte deuten statt nur Zahlen zeigen: „Gute Luft zum Lüften", „Bis 19 Uhr trocken", „Mond zu 62 % beleuchtet, zunehmend". Du-Form, Verben auf Knöpfen, keine Großbuchstaben-Sätze.
29. Abstände: alle Abstände mit Faktor 1,00 (schon in `--s1` bis `--s8`), zwischen Kacheln immer `--kachel-abstand` 16 px. Symbolgrößen über `--sym-groesse` und `--ikon-groesse`, nie fest im Code.
30. Kontrast-Stufe „Standard": Text mindestens 4,5:1. Zusätzlich `@media (prefers-contrast: more)` mit den Werten der Stufe „Maximal" anbieten.
31. Module auf dem Startbildschirm: Aktuell, Stunden, Tagesliste, Regenradar. Spalten der Tagesliste: Tag, Symbol, Temperaturen, Sonne und Regen, Wind. Die Liste ist ein gemeinsames Raster (`display: grid` mit `subgrid`, `justify-content: space-between`), damit alle Zeilen untereinanderstehen und die Abstände zwischen den Spalten gleich sind, auch wenn Spalten fehlen.
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

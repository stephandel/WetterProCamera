# Nutzer-Durchgang WetterPro Camera App – 21.10.2026

Stand `main` d24e42f. Geprüft wie ein Nutzer mit Playwright/WebKit (Safari-Motor) in 390 × 844 (iPhone) und 1280 × 800 (Mac mit Seitenleiste), echte Daten von Open-Meteo; die DWD-Warnungen kamen aus einer Attrappe (`tests/fixtures/brightsky-alerts-mannheim.json`, Zeiten auf heute geschoben), damit die Warnkachel sichtbar ist. Keine Codeänderung, kein Commit.

Bildschirmfotos: `/private/tmp/claude-501/-Users-stephanhandel-KI-Projekte/7bc6bfd2-eb66-4bc2-ac2c-b3706f85a35d/scratchpad/durchgang-camera/` (Dateinamen unten). Protokolle dort: `protokoll-390.txt`, `protokoll-1280.txt`, `protokoll-tastatur-alt.txt`. Achtung: der Ordner ist ein Sitzungs-Zwischenspeicher und kann verschwinden; bei Bedarf Fotos in den Projektordner kopieren.

Konsole: in allen Durchgängen keine Fehler und keine Warnungen.

---

## 1. Was ein Nutzer sieht

**Start (iPhone)** – `390x844-01-start.png`, ganze Seite `390x844-01-start-voll.png`
Kopf mit Ort „Mannheim“ und „Modell: Beste Mischung“, links Orte-Knopf, rechts Teilen und Suche. Darunter einmalig der Tipp „Tippe links auf ‚Aktuell‘ …“, dann „Letztes Update 06:49 Uhr“ mit „Aktualisieren“. Die zwei Warnkacheln (orange „Markante Wetterwarnung – Amtliche WARNUNG vor FROST – jetzt bis heute 18:49 Uhr“, gelb „Wetterwarnung – WINDBÖEN – heute 08:49 bis 12:49 Uhr“) stehen gut sichtbar über der Aktuell-Kachel; schwarze Schrift auf Orange/Gelb ist gut lesbar, der Pfeil „›“ sagt, dass man tippen kann. Danach Aktuell (10 °C, Leichter Regen, Gefühlt, Feuchte, Druck, Wind), drei Stundenkacheln, acht Tage, Luftqualität, Sonne und Mond, „Was heute geht“. Verständlich, Reihenfolge logisch. Die Tab-Leiste unten ist deckend (gemessen: Hintergrund rgb(3,66,138) plus Weichzeichner), kein Durchscheinen des Inhalts. Kein seitliches Scrollen, keine Tippfläche unter 44 px, kleinste Schrift 12 px.

**Warnkachel antippen → Blatt** – `390x844-03-warnblatt.png`, Mac `1280x800-03-warnblatt.png`
Blatt „Wetterwarnung“ mit „Fertig“, oben eine orange Karte „Markante Wetterwarnung: Frost / Amtliche WARNUNG vor FROST / jetzt bis heute 18:49 Uhr“, darunter Beschreibung, „Verhaltenshinweise“ und die Quelle (DWD über Bright Sky, CC BY 4.0). Inhaltlich klar. Aber: in der orangen Karte ist die Schrift **weiß** – auf der Startkachel ist sie schwarz (Fund 1). Schließen mit „Fertig“ oder Esc bringt den Fokus zurück auf die Kachel.

**Luftqualität, „Schadstoffe“ aufklappen** – zu `390x844-04-luft-zu.png`, offen `390x844-05-luft-offen.png`
Ring mit „46“, daneben „Mittel – Europäischer Luftqualitätsindex 46 von 100“. Nach dem Aufklappen vier Balken: Feinstaub PM2,5 „20,0 µg/m³ · mittel“ (gelb), Feinstaub PM10 „21,9 µg/m³ · mäßig“ (grün), Stickstoffdioxid „mittel“ (gelb), Ozon „gut“ (türkis). Der grüne Balken heißt „mäßig“, der gelbe „mittel“ – ein Laie liest „mäßig“ als schlechter als „mittel“, die Farbe sagt das Gegenteil (Fund 2). Mit der Tastatur lässt sich „Schadstoffe“ per Enter öffnen.

**„Was heute geht“** – `390x844-06-tipps.png`
Zwei Tipps mit Symbol: „Nimm einen Schirm mit: Regenrisiko 100 %, ab etwa 07:00 Uhr.“ und „Goldene Stunde ab 17:39 Uhr: warmes, weiches Licht für Fotos.“ Kurz, konkret, verständlich. Gut.

**Tagesdetail (Tipp auf „Heute“)** – `390x844-07-tagdetail.png`
Blatt „Heute 21.10.“ mit „Fertig“, Zeile „Leichter Regen, 10 bis 12°C“, Segmente „Nacht davor / Tag / Nacht danach“ (vorgewählt „Nacht davor“, weil es 06:46 Uhr ist – Vermutung), Zusammenfassung „Tief 10°C · Hoch 11°C · Regen 1,1 mm · Wind bis 5 km/h“, Stundenzeilen 00:00–07:00, dann Sonne und Mond. Verständlich; die zwei Zahlenpaare direkt untereinander (10–12 °C oben, Tief 10/Hoch 11 darunter) irritieren kurz (Fund 14). Per Tastatur: Enter öffnet, Esc schließt, Fokus kehrt auf den Tag zurück.

**Tab Graphs** – `390x844-08-graphs.png`, Mac `1280x800-08-graphs.png`
Umschalter „Kurve / Meteogramm“, Knopf „Zeilen“. Meteogramm mit Kopf „21.10. · 06:46 jetzt | leichter Regen“, vier Zeilen Sonnenschein, Temperatur, Wind, Niederschlag, Jetzt-Linie, Sonnenauf-/-untergänge. Gut lesbar, Hilfetext unten erklärt Wischen, Antippen, Doppeltipp. Störend: die drei Zoom-Knöpfe (−, Lupe, +) liegen rechts unten **über** dem Niederschlagsdiagramm und der Zeitachse (Fund 3). Mehrere Beschriftungen sind 11 px (Fund 4).

**Tab Rad/Sat** – `390x844-08-radsat.png`
Pillen „Radar / Satellit / Infrarot / Karte“, Karte mit Regenflecken um Mannheim, Zoom + −, darunter „Abspielen“, Uhrzeit, Zeit-Regler, Tempo. Verständlich. Leaflet-Hinweis am Kartenrand 11 px (Fund 15, Standard der Kartenbibliothek).

**Tab Mehr** – Anfang `390x844-08-mehr.png`, ganze Seite `390x844-09-mehr-offen-voll.png`, Mac `1280x800-08-mehr.png`
Gegliedert in „Orte“, „Wetterdaten“, „Wetter und Karte“, „Startseite und Ansicht“, „Kamera und Webcam“, „Quellen und Info“ mit Unterüberschriften (Ort suchen, Meine Orte, Datenquelle, Wettermodell, Einheit für Wind, Datensparmodus, Meer-Kachel, Saharastaub, Was heute geht, Tipps-Regeln, Aktuell-Kachel, Wetterfoto-Knopf, Webcam, Quellen, Datenschutz, Kurzbefehl, Pilot-Rückmeldung, Über die App). Jede Einstellung hat einen Erklärsatz – sehr gut verständlich. Am Mac zweispaltig und übersichtlich. Am iPhone ist es **eine** Seite von rund 15 700 px Höhe ohne Sprungmarken; die Gruppen sind reine Überschriften, nichts lässt sich ein- oder ausklappen (Fund 10).

**Ort wechseln (Suche „Heidelberg“)** – `390x844-10-suche.png`, danach `390x844-11-neuer-ort.png`
Acht Treffer „Heidelberg“ mit Region (Baden-Württemberg, Gauteng, Mississippi …). Antippen des ersten wechselt sofort zum Wetter-Tab, Kopf zeigt „Heidelberg“, Daten sind neu (2 km/h O, 94 %), Heidelberg steht danach in „Meine Orte“ (`390x844-17-gross-mehr.png`). Rund. (Die Warnungen erschienen auch für Heidelberg – das liegt an meiner Attrappe, nicht an der App.)

**Kamera/Studio** – leer `390x844-12-studio-leer.png`, mit Foto `390x844-13-studio-foto.png`, Mac `1280x800-13-studio-foto.png`
Tipp auf den runden Kamera-Knopf öffnet sofort die Dateiauswahl mit Kamera (capture=environment) und dahinter das Studio „Wetterfoto“ mit Startkarte „Wetterfoto gestalten – Nimm ein Foto auf oder wähle eins aus … Es bleibt auf deinem Gerät“, Knöpfen „Foto aufnehmen / Foto wählen / Einfügen / Eigener Sucher mit Wetter“ und dem Hinweis „In Fotos: Motiv lange drücken → Kopieren, dann hier ‚Einfügen‘“. Mit dem Beispielfoto: Bild mit Wetterkarte („10° Leichter Regen, Heidelberg, 21. Okt. 2026 · 06:45 Uhr, WETTERPROCAMERA“), Zeile „✦ Automatisch verbessert: dunkler, wärmer“, Vorlagen „Empfohlen / Band / Story (9:16) / Quadrat / Analog / Schwarz-Weiß / Sofortbild“, großer gelber „Teilen“, Link „Dateiart und Größe“, unten „Weiter mit diesem Design“, „Neues Foto“, Zahnrad. Verständlich und hübsch. Den angekündigten Knopf „Motiv aus Fotos wählen“ habe ich nirgends gefunden (Fund 6). Am Mac sind in der Vorlagen-Spalte die Beschriftungen der zweiten Reihe abgeschnitten (Fund 5), und der Galerie-Hinweis sagt „Nur auf diesem iPhone gespeichert“ (Fund 9).

**Zahnrad im Studio** – `390x844-14-studio-zahnrad.png`
Blatt heißt „Anpassen“ – genau wie der Knopf oben rechts, der aber das Bild anpasst (Fund 7). Inhalt: Auslöser im Sucher (Mitte/Rechts/Links/Frei), Schalter für Kamera wechseln, Zoom, Licht, Timer, Raster, Waage, Format, Selfie spiegeln, Auslöseton; unten „Zurücksetzen“ und „Fertig“. Klar.

**Senden-Blatt** – `390x844-15-studio-senden.png`, Mac `1280x800-15-studio-senden.png`
Über „Dateiart und Größe“: Blatt „Senden“ mit JPEG/PNG/PDF (Erklärsatz), Normal/Groß/Original (Erklärsatz), Dateiname „Wetterfoto-Heidelberg-2026-10-21-0645.jpg · 495 KB“ (Ort und Aufnahmezeit drin – gut), Knöpfe Teilen/Sichern/Kopieren, grüner Haken „Ort und Gerätedaten werden aus dem Bild entfernt“, Bildbeschreibung mit „Beschreibung kopieren“, „Als meine Vorlage merken“. Sehr verständlich. Nur die Benennung (Zugang „Dateiart und Größe“ → Blatt „Senden“ → Knopf „Teilen“) ist dreierlei (Fund 8). Tastatur: Fokus landet auf „JPEG“, Tab läuft sauber im Blatt im Kreis, Esc schließt nur das Blatt, der Fokus kehrt auf „Dateiart und Größe“ zurück; zweites Esc schließt das Studio, Fokus auf dem Kamera-Knopf. Vorbildlich.

**Große Schrift 130 %** (`html { font-size: 130% }`) – `390x844-16-gross-start.png`, `390x844-17-gross-mehr.png`
Alles bricht sauber um: „Aktualisieren“ rutscht in eine eigene Zeile, Warnkacheln werden höher, „Rel. Feuchte 94 %“ bricht in zwei Zeilen, Tab-Leiste bleibt lesbar. Kein seitliches Scrollen, nichts abgeschnitten (gemessen), kleinste Schrift 15,6 px. Gut.

**Tastatur** (WebKit = Safari-Verhalten: Tab überspringt Knöpfe, Wahltaste+Tab nimmt alle – beides geprüft) – `390x844-21-tastatur-1tab.png`, `390x844-25-alttab-1tab.png`
Reihenfolge iPhone-Breite: Orte, Teilen, Suche, Aktualisieren, Warnung 1, Warnung 2, Aktuell-Umschalter, 8 Tage, Schadstoffe, Sonne und Mond, Tab „Wetter“. Fokusring 2–3 px gelb bzw. weiß, immer sichtbar. Pfeil rechts in der Tab-Leiste wechselt den Tab. Am Mac: Seitenleiste zuerst (Bereiche mit ⌘1–⌘5, Orte, Ort suchen ⌘K, Wetter teilen), dann Kopf, dann Inhalt. Im Studio: Fertig → Neu → Anpassen → Wetterkarte → Vorlagen → Galerie → Teilen → Dateiart → Weiter → Neues Foto → Zahnrad, der Fokus verlässt das Studio nie. Zwei Kleinigkeiten: Funde 11 und 12.

---

## 2. Funde

Schwere: **schwer** = Nutzer kommt nicht weiter oder versteht etwas falsch · **stört** = fällt auf, kostet Zeit oder Vertrauen · **klein** = Schönheitsfehler.

| Nr. | Wo | Was | Schwere | Beleg | Vorschlag |
|---|---|---|---|---|---|
| 1 | Warnblatt, orange Karte | Weiße Schrift auf Orange `#FF9F0A`, Kontrast etwa 2:1 (Mindestwert 4,5:1; `CLAUDE.md`: „Text auf gelber Fläche immer dunkel“). Auf der Startkachel ist dieselbe Warnung schwarz und gut lesbar. | stört | `390x844-03-warnblatt.png`, `1280x800-03-warnblatt.png`; `app.css:732` setzt für `.a9-blatt.a9-warn-*` keine Schriftfarbe, die Kachel nutzt `--warn-auf` (`app.css:722`) | Im Blatt dieselbe dunkle Schrift wie auf der Kachel (`color: var(--warn-auf)`), gilt auch für Gelb. |
| 2 | Luftqualität → Schadstoffe | Stufenwörter „gut · mäßig · mittel · schlecht“: „mäßig“ (grün, Stufe 2) klingt für Laien schlechter als „mittel“ (gelb, Stufe 3). | stört | `390x844-05-luft-offen.png`; `app.js:2728` | Wörter so wählen, dass die Reihenfolge hörbar ist, z. B. „gut · ordentlich · mittel · schlecht · sehr schlecht · extrem“, oder vor jedes Wort den Farbpunkt setzen. |
| 3 | Graphs, Meteogramm | Die Zoom-Knöpfe (−, Lupe, +) liegen über dem Niederschlagsdiagramm und der Zeitachse; bei 390 ist „12:00“ und ein Teil der Kurve verdeckt, bei 1280 „00:00“. | stört | `390x844-08-graphs.png`, `1280x800-08-graphs.png` | Zoom-Knöpfe in die Zeile unter dem Diagramm (neben „Jetzt“ / Vollbild) setzen oder das Diagramm unten um die Knopfhöhe freihalten. |
| 4 | Graphs | Kopfzeile („Sonne“, „min“, „Regen“, „Böen“, „km/h“, „SO“) und Zeitachse sind 11 px – genau an der harten Untergrenze aus `CLAUDE.md` („kein Text unter 11 px“), also erlaubt, aber auf dem iPhone mühsam zu lesen. | klein | `protokoll-390.txt` Zeile „[graphs] Messung“ | Auf 12 px anheben, wenn Platz ist. |
| 5 | Studio am Mac, Vorlagen-Spalte | Die zweite Vorlagen-Reihe ist abgeschnitten, Beschriftungen „Story (9:16)“ und „Quadrat“ halb sichtbar; nichts zeigt, dass es weitere Vorlagen gibt. | stört | `1280x800-13-studio-foto.png` | Vorlagenbereich in der rechten Spalte scrollbar machen und einen Rest-Rand lassen, oder einreihig querscrollend wie am iPhone. |
| 6 | Studio | „Motiv aus Fotos wählen“ (heute neu) ist im Durchgang nirgends erreichbar: nicht auf der Startkarte, nicht mit Foto, nicht im Zahnrad, nicht im vereinfachten „Anpassen“-Blatt (Format, Automatisch verbessert, Felder, Vorlage merken). Der Knopf hängt im Text-Bereich (`panelText`), den die Ein-Tipp-Variante nicht zeigt. Vermutung, aus dem Code gelesen. | stört | `390x844-29-anpassen.png`, Protokoll „Motiv-Knopf: fehlt“; `lib/kamera-studio/ks-studio.js:878` (`motivDa`), `:1309` (nur in `panelText`) | Entweder den Knopf in der Ein-Tipp-Variante neben „Einfügen“ anbieten (Startkarte und Foto-Ansicht) oder die Ankündigung streichen, bis der Weg existiert. |
| 7 | Studio | Zwei verschiedene „Anpassen“: der Knopf oben rechts (Bild anpassen) und der Titel des Zahnrad-Blatts (Einstellungen für Auslöser und Sucher). Dazu sind zeitweise drei „Fertig“ zu sehen (Studio-Kopf, Blatt-Kopf „×“, Blatt-Fuß). | klein | `390x844-14-studio-zahnrad.png` | Zahnrad-Blatt „Einstellungen“ nennen (so heißt es schon im Vorlese-Namen des Zahnrads). |
| 8 | Studio | Drei Namen für einen Weg: Link „Dateiart und Größe“ öffnet ein Blatt „Senden“, dessen Hauptknopf „Teilen“ heißt. | klein | `390x844-15-studio-senden.png` | Blatt „Dateiart und Größe“ oder Link „Senden …“ nennen – eines von beiden. |
| 9 | Studio, Galerie-Hinweis | „Nur auf diesem iPhone gespeichert“ steht auch am Mac. | klein | `1280x800-13-studio-foto.png`; `lib/kamera-studio/ks-studio.js:119` | „auf diesem Gerät“. |
| 10 | Tab „Mehr“ am iPhone | Eine einzige Seite von rund 15 700 px (etwa 19 Bildschirme) ohne Sprungmarken; die sechs Gruppen sind nur Überschriften, nichts klappt ein. Wer „Datenschutz“ oder „Über die App“ sucht, scrollt lange. | stört | `390x844-09-mehr-offen-voll.png`; Protokoll „[mehr] Gliederung“ zeigt nur H2, kein `details` | Gruppen als aufklappbare Abschnitte (nur „Orte“ offen) oder oben eine Kette von Sprungknöpfen „Orte · Wetterdaten · … · Info“. |
| 11 | Studio per Tastatur (iPhone-Breite) | Nach Enter auf dem Kamera-Knopf und nach dem Laden des Fotos liegt der Fokus auf dem Seitenkörper, nicht im Studio; erst der nächste Tab landet auf „Fertig“. Am Mac (Seitenleiste) liegt er korrekt auf „Fertig“. | klein | `protokoll-tastatur-alt.txt` „[studio] Fokus nach Foto: BODY“ | Nach dem Laden Fokus auf „Empfohlen“ oder „Teilen“ setzen. |
| 12 | Warn- und Tagesblatt per Tastatur | Tab läuft im Blatt über den Dialog-Rahmen selbst (`#a9WarnBlatt`, `#w3Tag`) und den Seitenkörper, bevor „Fertig“ wieder dran ist – wirkt, als verschwinde der Fokus. | klein | `protokoll-tastatur-alt.txt` „[warn] Tab im Blatt“, „[tag] Tab im Blatt“ | Fokus im Blatt kreisen lassen wie im Studio-Senden-Blatt. |
| 13 | Texte | Schließendes Anführungszeichen teils gerade: „Aktuell", „Beste Mischung", „Wettermodell" statt „…“. | klein | `390x844-01-start.png` (Tipp-Kasten); `app.js:252`, `app.js:453`, Mehr-Texte | Einheitlich „…“. |
| 14 | Tagesdetail „Heute“ | Kopfzeile „Leichter Regen, 10 bis 12°C“ und direkt darunter „Tief 10°C · Hoch 11°C“ (für das Segment „Nacht davor“) – zwei Zahlenpaare ohne Erklärung, welches wofür gilt. Vermutung: das vorgewählte Segment folgt der Uhrzeit. | klein | `390x844-07-tagdetail.png` | Segment-Zusammenfassung beschriften („Nacht davor: Tief …“) oder tagsüber „Tag“ vorwählen. |
| 15 | Rad/Sat | Leaflet-/OpenTopoMap-Hinweis 11 px (Standard der Kartenbibliothek, an der 11-px-Grenze, erlaubt). | klein | `390x844-08-radsat.png`, Protokoll „[radsat] Messung“ | Hinnehmen oder auf 12 px setzen. |

Zählung: schwer 0 · stört 6 (1, 2, 3, 5, 6, 10) · klein 9.

---

## 3. Was gut ist

- Warnkacheln: Farbe, DWD-Wortlaut („Wetterwarnung“ / „Markante Wetterwarnung“) und Zeitraum „jetzt bis heute 18:49 Uhr“ verstehen sich sofort; Blatt mit Verhaltenshinweis und Quelle.
- Tab-Leiste wirklich deckend, Kamera-Knopf mittig und 64 px groß.
- Jede Einstellung im Tab „Mehr“ hat einen Erklärsatz in Alltagssprache; Mac-Ansicht zweispaltig mit Seitenleiste und Kürzeln.
- Ortswechsel über die Suche: ein Tipp, sofort neuer Ort, automatisch in „Meine Orte“.
- Studio: klarer Einstieg, „Automatisch verbessert: dunkler, wärmer“ sagt, was passiert ist; Senden-Blatt erklärt JPEG/Größe, zeigt Dateiname mit Ort und Zeit, versichert „Ort und Gerätedaten werden entfernt“, liefert eine Bildbeschreibung.
- Tastatur: Fokus immer sichtbar, Esc schließt stufenweise (Blatt → Studio), Fokus kehrt an den Ausgangsknopf zurück, Studio-Blätter halten den Fokus im Kreis.
- 130 % Schrift: alles bricht um, nichts wird abgeschnitten.
- Keine Konsolenfehler in sechs Durchgängen.

---

## 4. Nicht geprüft

- Echte Kamera (Aufnahme, Sucher „Eigener Sucher mit Wetter“, Auslöser-Positionen, Blitz, Zoom) – nur Dateiauswahl mit Beispielfoto.
- Das System-Teilen-Blatt („Teilen“, „Sichern“ in Fotos, „Kopieren“ in die Zwischenablage) und ob die Datei wirklich ohne Ortsdaten ankommt.
- „Einfügen“ aus der Zwischenablage und das Freistellen in Apple Fotos.
- Haptik, Geräte-Schriftgröße (nur CSS-Zoom 130 %), Dunkel-/Hellmodus-Wechsel des Systems, Querformat, Safe-Area auf echtem iPhone (Playwright-WebKit hat keine Notch).
- Tastatur in Chromium/Firefox (nicht installiert) – nur WebKit mit Tab und Wahltaste+Tab.
- Radar-Abspielen, Satellit, Infrarot, Karte-Modus, Meteogramm-Wischen/Zoomen (nur angesehen, nicht bedient).
- Die Warnkachel mit echten DWD-Daten (heute keine Warnung für Mannheim) – nur mit Attrappe.
- „Mein Standort“, Favoriten-Stern, Webcam-Links, Kurzbefehl, Pilot-Rückmeldung.

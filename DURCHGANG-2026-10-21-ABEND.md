# Nutzer-Durchgang 2 WetterPro Camera App – 21.10.2026 abends

Stand `main` 4c05f40 (Zweig `durchgang-camera`). Geprüft wie ein Nutzer mit Playwright/WebKit (Safari-Motor) in 390 × 844 (iPhone) und 1280 × 800 (Mac mit Seitenleiste). Wetterdaten aus den Attrappen in `tests/fixtures/` (Stand 15.10.2026 14:40), DWD-Warnungen aus `brightsky-alerts-mannheim.json`, damit die Warnkachel sichtbar ist; Suche mit eigener Attrappe (Heidelberg). Vorlage: `DURCHGANG-2026-10-21.md`.

Bildschirmfotos (Sitzungs-Zwischenspeicher, nicht im Git): `/private/tmp/claude-501/-Users-stephanhandel-KI-Projekte/f6383d02-b902-4603-adb1-44563a289b95/scratchpad/durchgang-camera2/` (z. B. `390-03-warnblatt.png`, `390-08-graphs.png`, `390-13-ebene-wind.png`, `390-31-bearbeiten.png`, `1280-30-studio-foto.png`).

Konsole: in allen Durchgängen keine Fehler und keine Warnungen. Messung auf allen Hauptbildschirmen: kein seitliches Scrollen, keine Tippfläche unter 44 px (Mac 28 px), kleinste Schrift 12 px – ausgenommen die Meteogramm-Tageszeile (11 px, siehe Fund 4).

## Alte Funde 1–15: Stand

| Nr. | Thema | Stand | Beleg |
|---|---|---|---|
| 1 | Warnblatt: weiße Schrift auf Orange | weg | Karte im Blatt hat `color: rgb(0,0,0)` auf `rgb(255,159,10)` (`390x844-03-warnblatt.png`; `app.css:762`) |
| 2 | Luft: „mäßig“ grün vs. „mittel“ gelb | weg | Wörter jetzt „gut · noch gut · mäßig · schlecht · sehr schlecht · extrem schlecht“; Schadstoffe „8,1 µg/m³ · noch gut“, „14,2 µg/m³ · gut“ |
| 3 | Zoom-Knöpfe über dem Diagramm | weg | Zoom-Knöpfe liegen bei y = 690, Diagramm endet bei y = 684 (390); Mac 732 / 726 |
| 4 | Graphs-Schrift 11 px | teilweise | Kopfzeile und Achsen jetzt 12 px; nur die Tageszeile „07:47 – 18:35 · UV 3“ (`.mg-tagesinfo`) bleibt 11 px, bewusst (`app.css:470`: bei 12 px läuft sie in die Jetzt-Linie). Auf dem Mac 12 px. Erlaubt (Grenze 11 px) |
| 5 | Studio Mac: Vorlagen abgeschnitten | weg | Vorlagen jetzt zweispaltig, scrollbar, dritte Reihe schaut als Ansatz heraus (`1280-30-studio-foto.png`) |
| 6 | „Motiv aus Fotos wählen“ nicht erreichbar | weg | Knopf steht im Blatt „Bearbeiten“ unter „Motiv aufs Foto“ (sichtbar, 358 × 44); siehe aber Studio-Fund S2 |
| 7 | Zwei „Anpassen“ | weg | Knopf heißt „Bearbeiten“, Zahnrad-Blatt „Einstellungen“ |
| 8 | Drei Namen für Senden | weg | Link „Teilen-Optionen“ öffnet Blatt „Teilen-Optionen“, Hauptknopf „Teilen“ |
| 9 | „Nur auf diesem iPhone“ am Mac | noch da | Galerie-Blatt am Mac: „Nur auf diesem iPhone gespeichert“ (`ks-studio.js:121`) – Studio-Quelle, hier nicht änderbar (S1) |
| 10 | „Mehr“ eine Riesenseite | weg | fünf Gruppen mit Pfeil, beim Start nur „Orte“ offen, Seitenhöhe 992 px (vorher 15 700) |
| 11 | Studio per Tastatur: Fokus nach Foto auf Seitenkörper | noch da, behoben | iPhone und Mac `Fokus nach Foto: BODY`, Tab kam nicht ins Studio; behoben in 664205f (N1) |
| 12 | Tab im Warn-/Tagesblatt läuft über Rahmen | weg | Warnblatt: Tab bleibt auf „Fertig“ (Kreis); Tagesblatt: Nacht davor → Tag → Nacht danach → Sonne → Mond |
| 13 | Gerade Anführungszeichen | weg | auf Wetter, Graphs, Rad/Sat und Mehr (alle Gruppen offen) keine geraden schließenden Zeichen im sichtbaren Text |
| 14 | Tagesdetail zwei Zahlenpaare | weg | Segment „Tag“ vorgewählt, Zusammenfassung beschriftet: „Tag: Tief 7°C · Hoch 17°C · Regen 0,0 mm“ |
| 15 | Leaflet-Hinweis 11 px | weg | Rad/Sat kleinste Schrift 12 px |

## 1. Was ein Nutzer sieht

**Start (iPhone)** – `390-01-start.png`: Kopf mit Ort und Modell, Tipp-Kasten, „Letztes Update“, zwei Warnkacheln (Orange „Markante Wetterwarnung – FROST“, Gelb „WINDBÖEN“, schwarze Schrift, gut lesbar), Aktuell, Stunden, 8 Tage, Luftqualität, Sonne, Mond, „Was heute geht“. Reihenfolge logisch, alles verständlich. Die Tab-Leiste zeigt in der Ganzseiten-Aufnahme mitten im Bild – das ist ein Aufnahme-Effekt, keine App-Eigenschaft.

**Warnblatt** – `390-03-warnblatt.png`: orange Karte mit dunkler Schrift, Beschreibung, „Verhaltenshinweise“, Quelle DWD/Bright Sky CC BY 4.0. Esc schließt, Fokus kehrt auf die Warnkachel zurück.

**Tagesdetail, Luftqualität, Sonne, Mond, „Was heute geht“** – Tagesdetail mit Segmenten (Beschriftung 15 px, Mac 12 px), Luft mit Ring „43 – Mäßig“ und aufklappbaren Schadstoffen mit neuen Stufenwörtern; Sonne- und Mond-Blatt (`390-09-sonne-blatt.png`) zeigen Bogen, Zeiten, Goldene Stunde, Dämmerungen mit Erklärtext, alles lesbar. Tipps: „Goldene Stunde ab 17:53 Uhr: warmes, weiches Licht für Fotos.“

**Graphs** – `390-08-graphs.png`: Meteogramm gut lesbar, Zoom-Knöpfe unter dem Diagramm, Knopfleiste mit Aktualisieren, Tag zurück, Jetzt, Tag vor, Vollbild (alle 44 px). Vollbild (⤢) deckt Kopf und Tab-Leiste, „Fertig“ oben, Esc schließt, Fokus kehrt auf den Vollbild-Knopf zurück. Mit dem Schalter „Meteogramm und Karten immer im Vollbild“ (Mehr) öffnet das Meteogramm beim Antippen des Tabs gleich im Vollbild; „Fertig“ bringt zurück, Tab-Leiste wieder sichtbar.

**Rad/Sat** – `390-13-ebene-wind.png`, `390-13-ebene-druck.png`: Pillen Radar / Satellit / Infrarot / Karte und eine zweite Reihe Wind / Wolken / Isobaren (am Mac in einer Reihe). Wind: Pfeile mit „16 km/h“ in weißer Schrift mit dunkler Kontur, gut lesbar; Isobaren: Linien mit Etiketten (1016, 1020); unter der Karte steht Name der Ebene, „Vollbild“ und ein Erklärsatz (Wind: „Der Pfeil zeigt, wohin der Wind …“). Ladezeit je Ebenenwechsel rund 2,5 s mit der Attrappe (davon 2,5 s feste Wartezeit des Prüfskripts; echte Netzzeit nicht geprüft). Vollbild öffnet, Esc schließt, Fokus kehrt auf „Vollbild“ zurück. Kartenkacheln gibt es in der Attrappe nicht (grauer Grund) – echte Karte nicht geprüft.

**Mehr** – `390-15-mehr.png`: „Orte“ offen mit Suche, „Meine Orte“ mit Stern und „Mein Standort“, darunter die vier zugeklappten Gruppen. Sehr aufgeräumt. Sterne: Antippen setzt den Favoriten, Fokus bleibt auf dem Stern.

**Ortswechsel** – Suche „Heidelberg“ (zwei Treffer mit Region/Land), Antippen wechselt sofort, Kopf zeigt „Heidelberg“, Ort steht danach in den Orten. Rund.

**Studio (iPhone)** – `390-21-studio-leer.png`, `390-22-studio-foto.png`: runder Kamera-Knopf öffnet die Dateiauswahl mit Kamera und dahinter das Studio; Startkarte mit „Foto aufnehmen / Foto wählen / Einfügen / Mit Live-Sucher aufnehmen“. Mit Foto: Kopf „Anderes Foto · Bearbeiten“, Umschalter **Einfach | Profi** (alle Knöpfe 44 px), Vorschau mit Wetterkarte, „Automatisch verbessert: dunkler, wärmer“, „Meine Wetterfotos“, sieben Vorlagen, großer gelber „Teilen“, Zahnrad, „Teilen-Optionen“. Blatt „Bearbeiten“ (`390-31-bearbeiten.png`): Dein Text, Wetterdaten-Chips, Format, Automatisch verbessert, „Motiv aufs Foto“ (Einfügen / Motiv aus Fotos wählen / Wie geht das?), „Als meine Vorlage merken“, „Alle Werkzeuge (Profi) ›“. Profi zeigt die Werkzeugleiste (Zuschnitt, Anpassen, Filter, Wetter, Text, Format). Teilen-Optionen: JPEG/PNG/PDF, Größe, Dateiname mit Ort und Zeit, „GPS-Standort und Gerätedaten werden aus dem Bild entfernt“, Bildbeschreibung. Zahnrad-Blatt heißt „Einstellungen“. Galerie: nach „Teilen“ steht „Fertige Fotos – zum Teilen und Sichern“ neben „Originale – zum Neugestalten“; ein fertiges Foto bietet „Teilen · Sichern · Weiter bearbeiten“ mit Erklärsatz, ein Original „Neu gestalten“. Blätter halten den Fokus im Kreis, Esc schließt stufenweise (Blatt → Studio), Fokus kehrt auf den Ausgangsknopf zurück (iPhone: runder Kamera-Knopf; Mac: Kamera in der Seitenleiste, Tastatur geprüft).

**130 % Schrift** – Start, Radsat, Mehr: nichts abgeschnitten, kein seitliches Scrollen, kleinste Schrift 15,6 px; im Graphs-Tab bleibt die SVG-Tageszeile bei 11 px (Fund 4).  Das Studio selbst wurde mit 130 % nicht geprüft.

**Mac 1280** – Seitenleiste mit Bereichen ⌘1–⌘5, Orten, „Ort suchen ⌘K“, „Wetter teilen“, Kürzeln; Studio zweispaltig (Foto links, Vorlagen und Teilen rechts, `1280-30-studio-foto.png`). Alle Messungen sauber.

## 2. Funde

Schwere: **schwer** = Nutzer kommt nicht weiter oder versteht etwas falsch · **stört** = fällt auf, kostet Zeit oder Vertrauen · **klein** = Schönheitsfehler.

### App (Einbindung)

| Nr. | Wo | Was | Schwere | Beleg | Stand |
|---|---|---|---|---|---|
| N1 | Studio, Tastatur | Nach dem Laden eines Fotos (Dateiauswahl) liegt der Fokus auf dem Seitenkörper; Tab bleibt dort, ein Tastaturnutzer kommt nicht ins Studio. iPhone-Breite und Mac. (War alter Fund 11, durch den Umbau nicht besser geworden.) | stört | `lauf7`: „Fokus nach Foto: BODY“, „1. Tab: BODY“; `app.js` `studioMount` | behoben in 664205f (`studioEreignis` über `onEreignis('foto-geladen')`), Test `tests/durchgang2.test.js` war vorher rot |
| N2 | Graphs, Meteogramm | Tageszeile „07:47 – 18:35 · UV 3“ nur 11 px (alle anderen Beschriftungen 12 px). | klein | `app.css:470` | offen, bewusst: mit 12 px läuft die Zeile in die Jetzt-Linie; Grenze 11 px eingehalten. Lösung nur im gemeinsamen Meteogramm-Baustein sinnvoll |
| N3 | Rad/Sat, Wind | Die Zoom-Knöpfe (+/−) oben rechts decken in der Ebene „Wind“ den letzten Pfeil der ersten Reihe teilweise. | klein | `390-13-ebene-wind.png` | offen: vermutlich Attrappe (Gitter ist dichter als bei echter Karte), mit echter Karte prüfen |

### Studio-Funde (für die Quelle Kamera Konfigurator/src)

Hier nicht behoben, da `lib/kamera-studio/` nur aus der Quelle kommt.

| Nr. | Wo | Was | Schwere | Beleg |
|---|---|---|---|---|
| S1 | Galerie-Blatt am Mac | Hinweis „Nur auf diesem iPhone gespeichert“ steht auch am Mac (alter Fund 9). Vorschlag „auf diesem Gerät“. | klein | `lib/kamera-studio/ks-studio.js:121` (`GAL_HINWEIS`) |
| S2 | Startkarte und Foto-Ansicht | „Motiv aus Fotos wählen“ ist nur im Blatt „Bearbeiten“ erreichbar; die Startkarte nennt nur „Einfügen“ („In Fotos: Motiv lange drücken → Kopieren, dann hier ‚Einfügen‘“). Wer das Motiv sucht, muss auf „Bearbeiten“ kommen. | klein | `ks-studio.js:1741–1746` (nur im Blatt), `:975` (`motivDa` verlangt geladenes Foto) |
| S3 | Profi, Regler | Beschriftung „Licht“ ist ein Label mit nur 35 × 20 px (kein Tippziel, aber kleiner als die Nachbarn „Licht •“ 73 × 44). | klein | `ks-studio.js:2472` / Regler-Kopf `ks-regler-kopf` |
| S4 | Studio-Gerüst | Verstecktes Dateifeld `.ks-datei-motiv` hat keine Verstecken-Regel (nur `.ks-datei`, `.ks-datei-kamera` stehen in `ks-studio.css:93`); es liegt als 350 × 25 px großes, sichtbar gerechnetes Element im Layout. Im Bild nicht zu sehen (verdeckt), aber von Messungen als zu kleine Tippfläche erfasst. | klein | `ks-studio.js:394`, `ks-studio.css:93` |
| S5 | Fokus nach dem Laden | Ursache von N1 liegt im Studio (Neuzeichnen nach „foto-geladen“ entfernt den fokussierten Knopf); sauberer wäre, dort den Fokus zu setzen. Die App fängt es jetzt ab. | klein | `ks-studio.js:880` (`ereignis foto-geladen`) |

Zählung: schwer 0 · stört 1 (N1, behoben) · klein 7 (N2, N3, S1–S5; keine in der App behoben, weil bewusst oder Studio-Quelle).

## 3. Was gut ist

- Warn-, Sonne-, Mond-, Tages- und Luftblätter: lesbar, kontrastreich, Fokus-Rückkehr stimmt.
- Neue Karten-Ebenen mit klarer Beschriftung und Erklärsatz; Vollbild für Meteogramm und Karten samt Schalter „immer im Vollbild“ funktioniert und lässt sich verlassen.
- „Mehr“ jetzt kurz und gegliedert; Zustand der Gruppen wird gemerkt.
- Studio: Einfach/Profi klar erkennbar, „Bearbeiten“ ist ein verständliches Blatt, Namen der Blätter („Teilen-Optionen“, „Einstellungen“) passen, Galerie mit „Weiter bearbeiten“ und Erklärung, Blätter halten den Fokus.
- 130 % Schrift und Mac-Seitenleiste ohne Überlauf, keine Konsolenfehler.

## 4. Nicht geprüft

- Echte Kamera, Live-Sucher, Auslöser-Positionen, Blitz, Zoom (nur Dateiauswahl mit Beispielfoto); „Foto aufnehmen“ zeigt im Desktop-WebKit den Hinweis „Am Rechner öffnet sich hier keine Kamera“, auf dem iPhone anders.
- System-Teilen-Blatt, „Sichern“ in Fotos, „Kopieren“, ob die Datei ohne Ortsdaten ankommt (im Test eine Attrappe für `navigator.share`).
- „Einfügen“ aus der Zwischenablage, „Motiv aus Fotos wählen“ mit echtem freigestelltem Motiv.
- Echte Kartenkacheln, Ladezeit über das echte Netz (Radar/Wind/Wolken/Isobaren), Abspielen des Radars, Satellit, Infrarot.
- Meteogramm wischen/zoomen per Finger (nur Knöpfe und Ansicht), Haptik, Querformat, Safe Area mit Notch, Hell/Dunkel des Systems, Schriftgröße des Geräts (nur CSS-Zoom 130 %).
- Tastatur in Chromium/Firefox; Wahltaste+Tab nur stichprobenartig (Warnblatt, Tagesblatt, Studio-Blatt).
- „Mein Standort“, Webcam-Links, Kurzbefehl, Pilot-Rückmeldung, Favoriten über mehrere Sitzungen.
- Eigentliche Warnungen des DWD (heute nur Attrappe).

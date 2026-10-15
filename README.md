# WetterProCamera

**Online:** https://stephandel.github.io/WetterProCamera/

Test-App einer Wetter-App im Apple-Stil (Liquid Glass), **gestaltet mit dem Design-Konfigurator** nach den Empfehlungen der KI und gebaut von Claude Code aus dem exportierten Projektpaket (15.10.2026).

- Live-Wetter von [Open-Meteo](https://open-meteo.com) (CC BY 4.0), ohne Schlüssel und ohne eigenen Server
- Reiter: **Wetter** (Aktuell, nächste Stunden, Regen der nächsten 2 Stunden, 8 Tage), **Graphs** (48 Stunden), **Karten** (Temperaturen an den Orten), **Rad/Sat** (Regenradar von [RainViewer](https://www.rainviewer.com)), **Mehr** (Ortssuche, Standort, Quellen)
- Wetter mit Foto teilen (4 Gestaltungen, wie früher bei WeatherPro)
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
python3 -m http.server 8822
```

Dann im Browser `http://localhost:8822` öffnen.

## Veröffentlichen (GitHub Pages)

Repository auf GitHub anlegen, Dateien hochladen, dann unter *Settings → Pages* den Zweig `main` und den Ordner `/` wählen. Die App ist danach unter `https://<konto>.github.io/<repository>/` erreichbar.

## Hinweis zum Namen

„WetterPro" ähnelt der Marke „WeatherPro". Für diesen privaten Test in Ordnung, vor einer öffentlichen Veröffentlichung den Namen ändern.

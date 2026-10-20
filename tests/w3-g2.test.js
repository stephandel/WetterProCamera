/* tests/w3-g2.test.js – Welle 3, Gruppe 2 „Wetter und Karte" (16.10.2026). Start:  PORT=8872 node tests/w3-g2.test.js
   Gleiche Hilfsfunktionen wie tests/app.test.js (Server, Umleitung der Dienste auf tests/fixtures, Messung).
   Frühere Kopfzeile: Kern-Tests für WetterProCamera (Paket B, 15.10.2026)
   Start:  npm test   (startet einen kleinen Server auf Port 8862 und prüft die App in WebKit, dem Browser-Kern von Safari)
   Ohne Netz: Alle fremden Dienste (Open-Meteo, Bright Sky, Karten, Radar) werden auf feste Antworten aus tests/fixtures umgeleitet.
   Bildschirmfotos landen in tests/bilder/ (nicht im Repository). Exit-Code 0 = alles grün, 1 = mindestens ein Fehler. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { webkit } = require('playwright');

const WURZEL = path.join(__dirname, '..');
const PORT = +process.env.PORT || 8872;
const BASIS = 'http://127.0.0.1:' + PORT + '/';
const BILDER = process.env.BILDER || path.join(__dirname, 'bilder');
const JETZT = new Date('2026-10-15T14:40:00+02:00');   // Zeitpunkt der gespeicherten Antworten
const fixture = n => fs.readFileSync(path.join(__dirname, 'fixtures', n), 'utf8');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

let ok = 0, fehler = 0;
function pruefe(name, bedingung, detail) {
  if (bedingung) { ok++; console.log('  ✓ ' + name); }
  else { fehler++; console.log('  ✗ ' + name + (detail !== undefined ? '  → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); }
}

/* ---------- kleiner Server für die App-Dateien ---------- */
const TYPEN = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
function server() {
  return new Promise(ok => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, BASIS).pathname);
      if (p.endsWith('/')) p += 'index.html';
      const datei = path.join(WURZEL, path.normalize(p));
      if (!datei.startsWith(WURZEL) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) { res.writeHead(404); return res.end('fehlt'); }
      res.writeHead(200, { 'Content-Type': TYPEN[path.extname(datei)] || 'application/octet-stream' });
      fs.createReadStream(datei).pipe(res);
    }).listen(PORT, '127.0.0.1', () => ok(s));
  });
}

/* ---------- fremde Dienste auf feste Antworten umleiten ---------- */
async function umleiten(p, modus) {
  const json = (route, text, status) => route.fulfill({ status: status || 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: text });
  await p.route(u => !u.href.startsWith(BASIS), route => {
    const u = new URL(route.request().url());
    if (modus.offline) return route.abort('internetdisconnected');
    if (u.host === 'api.open-meteo.com') {
      const lat = u.searchParams.get('latitude') || '';
      if (lat.includes(',')) return json(route, JSON.stringify(lat.split(',').map((_, i) => ({ current: { temperature_2m: 15 + i, weather_code: 2, is_day: 1 } }))));
      if (u.searchParams.has('past_days')) return json(route, fixture('open-meteo-meteogramm.json'));   // Meteogramm-Baustein (Paket A5)
      return json(route, modus.omAendern ? JSON.stringify(modus.omAendern(JSON.parse(fixture('open-meteo.json')))) : fixture('open-meteo.json'));
    }
    // Open-Meteo Marine (Paket A5): echte Antworten vom 15.10.2026; Mannheim liefert nur leere Werte (kein Meer)
    if (u.host === 'marine-api.open-meteo.com') return json(route, fixture(+u.searchParams.get('latitude') < 40 ? 'marine-corralejo.json' : 'marine-mannheim.json'));
    if (u.host === 'air-quality-api.open-meteo.com') return json(route, fixture('air-quality.json'));
    if (u.host === 'geocoding-api.open-meteo.com') return json(route, '{"results":[]}');
    if (u.host === 'api.brightsky.dev') {
      const lat = +u.searchParams.get('lat'), nichts = fixture('brightsky-corralejo-current-404.json');
      if (modus.dwdAus) return json(route, nichts, 404);
      if (u.pathname === '/weather') return lat > 45 ? json(route, fixture('brightsky-mannheim.json')) : lat > 28 && lat < 29 ? json(route, modus.bsAendern ? JSON.stringify(modus.bsAendern(JSON.parse(fixture('brightsky-corralejo.json')))) : fixture('brightsky-corralejo.json')) : json(route, nichts, 404);
      if (u.pathname === '/current_weather') return lat > 45 ? json(route, fixture('brightsky-mannheim-current.json')) : json(route, nichts, 404);
    }
    if (u.host === 'api.rainviewer.com') return json(route, '{"host":"https://tilecache.rainviewer.com","radar":{"past":[]}}');
    if (route.request().resourceType() === 'image') return route.fulfill({ status: 200, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' }, body: PNG });
    return route.abort();
  });
}

/* ---------- Messungen im Browser ---------- */
const MESSEN = (minKlick) => {
  const g = minKlick || 43.5;   // Mindestgröße der Tippflächen; auf dem Mac mit Maus 28 px (Paket A6)
  const sichtbar = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('[hidden]'); };
  const texte = [...document.querySelectorAll('body *')].filter(e => sichtbar(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
  const klein = [...document.querySelectorAll('button, a, label, input, [role="button"]')].filter(e => {
    if (!sichtbar(e) || e.closest('.leaflet-control-attribution') || (e.tagName === 'INPUT' && e.closest('label'))) return false;
    if (e.tagName === 'INPUT' && (e.type === 'radio' || e.type === 'checkbox' || e.hidden)) return false;
    const r = e.getBoundingClientRect(); return r.height < g || r.width < g;
  }).map(e => (e.textContent.trim() || e.getAttribute('aria-label') || e.className || e.tagName).slice(0, 24) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
  return { seitlich: document.documentElement.scrollWidth - innerWidth, kleinsteSchrift: Math.min(...texte.map(e => parseFloat(getComputedStyle(e).fontSize))), klein };
};

async function neueSeite(b, opt, modus) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'de-DE', timezoneId: 'Europe/Berlin' }, opt));
  const p = await ctx.newPage();
  // Seit dem Design-Link vom 20.10.2026 ist die Regenradar-Kachel auf der Startseite standardmäßig aus; und der Tab Graphs beginnt mit dem Meteogramm; die älteren Tests prüfen Radar-Kachel und Kurve, also vorher einstellen (Standard prüft design-gelb.test.js)
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('wpc-startseite')) localStorage.setItem('wpc-startseite', JSON.stringify({ radar: true })); if (!localStorage.getItem('wpc-graphs')) localStorage.setItem('wpc-graphs', JSON.stringify('kurve')); } catch (e) { } });
  const konsole = [];
  p.on('pageerror', e => konsole.push('Seitenfehler: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') konsole.push(m.text()); });
  await p.clock.setFixedTime(JETZT);
  await umleiten(p, modus || {});
  return { ctx, p, konsole };
}
const foto = (p, name) => p.screenshot({ path: path.join(BILDER, name + '.png') });

async function tabsPruefen(p, name, bilder) {
  for (const tab of ['wetter', 'graphs', 'radsat', 'mehr']) {
    await p.click('#tb-' + tab); await p.waitForTimeout(tab === 'radsat' ? 700 : 250);
    const m = await p.evaluate(MESSEN);
    pruefe(name + ': Tab ' + tab + ' ohne seitliches Scrollen', m.seitlich <= 0, m.seitlich + ' px');
    pruefe(name + ': Tab ' + tab + ' kleinste Schrift ≥ 11 px', m.kleinsteSchrift >= 11, m.kleinsteSchrift);
    pruefe(name + ': Tab ' + tab + ' Tippflächen ≥ 44 px', m.klein.length === 0, m.klein);
    if (bilder) await foto(p, name + '-' + tab);
  }
  await p.click('#tb-wetter');
}


/* ---------- Hilfen für die Welle-3-Prüfungen ---------- */
const omJson = mod => JSON.stringify(mod(JSON.parse(fixture('open-meteo.json'))));
// Stundenwerte für Wind und UV ergänzen (die gespeicherte Antwort ist älter als die neue Abfrage)
const mitWind = (kmh, fn) => d => { d.hourly.wind_speed_10m = d.hourly.time.map((z, i) => fn ? fn(z, i) : kmh); d.hourly.wind_direction_10m = d.hourly.time.map(() => 270); d.hourly.uv_index = d.hourly.time.map(() => 1); return d; };
// zusätzliche Antworten vor die Standard-Umleitung setzen; liefert eine Liste aller angefragten Adressen
async function zusatz(p, regeln) {
  const urls = [];
  await p.route(u => !u.href.startsWith(BASIS), route => {
    const u = new URL(route.request().url()); urls.push(u.href);
    for (const r of regeln) { const a = r(u, route); if (a) return a; }
    return route.fallback();
  });
  return urls;
}
const antwort = (route, text) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: typeof text === 'string' ? text : JSON.stringify(text) });
const ortSetzen = (p, o) => p.addInitScript(o => { if (!localStorage.getItem('wpgt-ort-gesetzt')) { localStorage.setItem('wpgt-ort-gesetzt', '1'); localStorage.setItem('wpgt-ort', JSON.stringify(o)); } }, o);
const CORRALEJO = { name: 'Corralejo', land: 'Spanien', lat: 28.73, lon: -13.867 };
const speichern = (p, k, v) => p.addInitScript(([k, v]) => { if (!localStorage.getItem('w3-init-' + k)) { localStorage.setItem('w3-init-' + k, '1'); localStorage.setItem(k, JSON.stringify(v)); } }, [k, v]);
const lesen = (p, k) => p.evaluate(k => { const v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); }, k);
const warte = (p, fn, arg) => p.waitForFunction(fn, arg, { timeout: 8000 }).then(() => true, () => false);

(async () => {
  fs.mkdirSync(BILDER, { recursive: true });
  const srv = await server();
  const b = await webkit.launch();
  try {
    /* 1. Punkt 6/7: Regen-Balken und Satz, „Was heute geht" nur Resttag, Strand/Kiten nur am Meer, Hilfetexte */
    console.log('Regen, Resttag, Küste, Hilfetexte');
    let s = await neueSeite(b, { colorScheme: 'light' }, { omAendern: d => { d.minutely_15.precipitation = [0, 0, .4, .6, .5, 0, 0, 0]; return d; } });
    await s.p.goto(BASIS); await s.p.waitForSelector('.regen-balken');
    let r = await s.p.evaluate(() => ({ balken: document.querySelectorAll('.regen-balken i').length, satz: document.querySelector('.regen-satz').textContent, achse: document.querySelector('.regen-achse').textContent }));
    pruefe('Regen-Balken: 8 Balken zu je 15 Minuten', r.balken === 8, r);
    pruefe('Satz „Regen ab 15:15 Uhr für 45 Minuten."', r.satz === 'Regen ab 15:15 Uhr für 45 Minuten.', r.satz);
    pruefe('Zeitachse unter den Balken: 14:45 bis 16:30', r.achse === '14:4516:30', r.achse);
    await s.ctx.close();
    for (const [name, prec, erwartet] of [['trocken', [0, 0, 0, 0, 0, 0, 0, 0], 'Die nächsten 2 Stunden bleibt es trocken.'], ['regnet jetzt', [.5, .5, 0, 0, 0, 0, 0, 0], 'Es regnet jetzt, noch etwa 30 Minuten.'], ['regnet durchgehend', [.5, .5, .5, .5, .5, .5, .5, .5], 'Es regnet die nächsten 2 Stunden.'], ['bis zum Ende', [0, 0, 0, 0, 0, 0, .3, .3], 'Regen ab 16:15 Uhr für mindestens 30 Minuten.'], ['1 Stunde', [0, .2, .2, .2, .2, 0, 0, 0], 'Regen ab 15:00 Uhr für 1 Stunde.']]) {
      s = await neueSeite(b, {}, { omAendern: d => { d.minutely_15.precipitation = prec; return d; } });
      await s.p.goto(BASIS); await s.p.waitForSelector('.regen-satz');
      pruefe('Regensatz ' + name, (await s.p.textContent('.regen-satz')) === erwartet, await s.p.textContent('.regen-satz'));
      await s.ctx.close();
    }
    // Resttag: am Vormittag hohes Regenrisiko (Tageswert 90 %), ab jetzt kaum noch → kein Schirm-Tipp
    const regenVormittag = (vorher, nachher) => d => {
      mitWind(2)(d); d.daily.precipitation_probability_max[0] = 90;
      d.hourly.precipitation_probability = d.hourly.time.map((z, i) => z.slice(0, 10) === '2026-10-15' ? (z.slice(11, 13) < '14' ? vorher : nachher) : 5);
      return d;
    };
    const tippsLesen = p => p.evaluate(() => { const k = document.getElementById('a5Tipps'); return k ? [...k.querySelectorAll('[data-tipp]')].map(x => x.dataset.tipp) : null; });
    s = await neueSeite(b, {}, { omAendern: regenVormittag(90, 5) });
    await s.p.goto(BASIS); await s.p.waitForSelector('#a5Tipps');
    pruefe('Resttag: Regen nur am Vormittag → kein Schirm-Tipp am Nachmittag', !(await tippsLesen(s.p)).includes('schirm'), await tippsLesen(s.p));
    await s.ctx.close();
    s = await neueSeite(b, {}, { omAendern: regenVormittag(5, 80) });
    await s.p.goto(BASIS); await s.p.waitForSelector('#a5Tipps');
    pruefe('Resttag: Regen erst am Abend → Schirm-Tipp', (await tippsLesen(s.p)).includes('schirm'), await tippsLesen(s.p));
    await s.ctx.close();
    // Strand und Kiten nur an der Küste: Mannheim (Marine ohne Werte) bekommt weder Strand noch Kiten, trotz 26 °C und 25 km/h Wind
    s = await neueSeite(b, {}, { omAendern: d => { mitWind(25)(d); d.daily.temperature_2m_max[0] = 26; d.daily.precipitation_probability_max[0] = 5; d.hourly.temperature_2m = d.hourly.temperature_2m.map((v, i) => d.hourly.time[i].slice(0, 10) === '2026-10-15' ? 26 : v); return d; } });
    const marine = await zusatz(s.p, []);
    await s.p.goto(BASIS); await s.p.waitForSelector('#a5Tipps');
    await warte(s.p, () => { try { return !!JSON.parse(localStorage.getItem('wpc-kueste'))['49.49,8.47'] === false && 'wpc-kueste' in localStorage; } catch (e) { return false; } });
    pruefe('Binnenort Mannheim: keine Tipps „Strand" und „Kiten"', (await tippsLesen(s.p)).every(a => a !== 'strand' && a !== 'kiten'), await tippsLesen(s.p));
    pruefe('Mannheim: Küstenprüfung (Marine) ist gelaufen', marine.some(u => u.includes('marine-api')));
    await s.ctx.close();
    // Küstenort Corralejo: Strand und Kiten erscheinen
    s = await neueSeite(b, {}, { omAendern: d => { mitWind(25)(d); d.daily.temperature_2m_max[0] = 26; d.daily.precipitation_probability_max[0] = 5; d.hourly.temperature_2m = d.hourly.temperature_2m.map((v, i) => d.hourly.time[i].slice(0, 10) === '2026-10-15' ? 26 : v); return d; } });
    await ortSetzen(s.p, CORRALEJO);
    await s.p.goto(BASIS); await warte(s.p, () => !!document.querySelector('#a5Tipps [data-tipp="strand"]'));
    pruefe('Küstenort Corralejo: Tipps „Strand" und „Kiten"', await s.p.evaluate(() => !!document.querySelector('#a5Tipps [data-tipp="strand"]') && !!document.querySelector('#a5Tipps [data-tipp="kiten"]')), await tippsLesen(s.p));
    await s.ctx.close();
    // Hilfetexte: Maus → „Klicke", Finger → „Tippe"
    s = await neueSeite(b, {}); await s.p.goto(BASIS); await s.p.waitForSelector('.tag'); await s.p.click('#tb-graphs'); await s.p.waitForSelector('#gWert');
    const maus = await s.p.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);
    pruefe('Graphs-Hilfetext passt zum Gerät (Maus: „Klicke auf die Kurve", sonst „Tippe")', (await s.p.textContent('#gWert')).startsWith(maus ? 'Klicke' : 'Tippe'), await s.p.textContent('#gWert'));
    await s.ctx.close();
    s = await neueSeite(b, { hasTouch: true, isMobile: true });
    await s.p.goto(BASIS); await s.p.waitForSelector('.tag'); await s.p.click('#tb-graphs'); await s.p.waitForSelector('#gWert');
    pruefe('Mit Finger: „Tippe auf die Kurve"', (await s.p.textContent('#gWert')).startsWith('Tippe'), await s.p.textContent('#gWert'));
    await s.ctx.close();

    /* 2. Punkt 19: Modellvergleich */
    console.log('Modellvergleich');
    s = await neueSeite(b, { colorScheme: 'light' });
    const verz = await zusatz(s.p, [(u, route) => {
      const m = u.searchParams.get('models'), plus = { ecmwf_ifs025: 2, icon_seamless: -1.5 }[m];
      if (u.host === 'api.open-meteo.com' && plus != null && !u.searchParams.has('past_days') && u.searchParams.get('hourly') === 'temperature_2m,precipitation') return antwort(route, omJson(d => { d.hourly.temperature_2m = d.hourly.temperature_2m.map(v => v == null ? v : Math.round((v + plus) * 10) / 10); d.hourly.precipitation = d.hourly.precipitation.map((v, i) => i % 5 === 0 ? 0.3 * (plus > 0 ? 1 : 2) : 0); return d; }));
    }]);
    await s.p.goto(BASIS); await s.p.waitForSelector('.tag'); await s.p.click('#tb-graphs'); await s.p.waitForSelector('#w3VglAn');
    pruefe('Modellvergleich ist standardmäßig aus; keine Zusatzabrufe', !(await s.p.isChecked('#w3VglAn')) && !verz.some(u => u.includes('ecmwf_ifs025') || u.includes('icon_seamless')));
    await s.p.check('#w3VglAn'); await s.p.waitForSelector('#w3VglBild svg', { timeout: 8000 });
    let v = await s.p.evaluate(() => ({
      svgs: document.querySelectorAll('#w3VglBild .w3-graph svg').length, linien: [...document.querySelectorAll('#w3VglBild .w3-graph svg')].map(x => x.querySelectorAll('path.w3-linie').length),
      striche: [...document.querySelectorAll('#w3VglBild .w3-graph svg')[0].querySelectorAll('path.w3-linie')].map(x => x.getAttribute('stroke-dasharray') || ''), farben: [...document.querySelectorAll('#w3VglBild .w3-graph svg')[0].querySelectorAll('path.w3-linie')].map(x => x.style.stroke),
      legende: [...document.querySelectorAll('.w3-legende li')].map(x => x.textContent.replace(/\s+/g, ' ').trim()), zeilen: document.querySelectorAll('.w3-tabelle tbody tr').length,
      chips: document.querySelectorAll('.w3-chip').length, an: document.querySelectorAll('.w3-chip[aria-pressed="true"]').length, seite: document.documentElement.scrollWidth - innerWidth, titel: [...document.querySelectorAll('#w3VglBild .w3-titel')].map(x => x.textContent)
    }));
    pruefe('Vergleich an: zwei Diagramme (Temperatur, Regen) mit je 3 Linien', v.svgs === 2 && v.linien.join() === '3,3', v);
    pruefe('Linien unterscheiden sich in Strichart UND Farbe', new Set(v.striche).size === 3 && new Set(v.farben).size === 3, v);
    pruefe('Legende nennt Modell und Strichart (nicht nur Farbe)', v.legende.length === 3 && v.legende.every(t => /durchgezogen|gestrichelt|gepunktet/.test(t)), v.legende);
    pruefe('Tabelle mit Tief, Hoch, Regen je Modell', v.zeilen === 3 && /Temperatur im Vergleich/.test(v.titel[0]) && /Regen im Vergleich/.test(v.titel[1]), v);
    pruefe('6 Modell-Chips aus der Liste MODELLE, 3 gewählt', v.chips === 6 && v.an === 3, v);
    pruefe('Vergleich: kein seitliches Scrollen', v.seite <= 0, v.seite);
    const anz = n => verz.filter(u => u.includes('models=' + n) && u.includes('forecast_days=3')).length;
    pruefe('Zusatzabrufe nur für die gewählten Modelle (je 1×)', anz('ecmwf_ifs025') === 1 && anz('icon_seamless') === 1 && anz('best_match') === 1, [anz('ecmwf_ifs025'), anz('icon_seamless'), anz('best_match')]);
    const t1 = await s.p.evaluate(() => [...document.querySelectorAll('.w3-tabelle tbody td')].map(x => x.textContent).join('|'));
    const hoehe = await s.p.evaluate(() => { const r = [...document.querySelectorAll('.w3-chip')].map(x => x.getBoundingClientRect().height); return Math.min(...r); });
    pruefe('Modell-Chips ≥ 44 px hoch', hoehe >= 43.5, hoehe);
    await foto(s.p, 'hell-390-w3-vergleich');
    // aus und wieder an: Zwischenspeicher, keine neuen Abrufe
    await s.p.uncheck('#w3VglAn'); await s.p.waitForTimeout(150); await s.p.check('#w3VglAn'); await s.p.waitForSelector('#w3VglBild svg');
    pruefe('Zwischenspeicher: aus/an ruft die Modelle nicht noch einmal ab', anz('ecmwf_ifs025') === 1 && anz('icon_seamless') === 1);
    // Modell tauschen: GFS statt ICON → neuer Abruf nur für GFS; auf 2 Modelle verkleinern geht, auf 1 nicht
    await s.p.click('[data-w3-modell="gfs_seamless"]'); await s.p.waitForFunction(() => document.querySelectorAll('.w3-tabelle tbody tr').length === 3 && /GFS/.test(document.querySelector('.w3-tabelle').textContent), null, { timeout: 8000 });
    pruefe('Viertes Modell wählen ersetzt das älteste (weiterhin 3 Linien)', await s.p.evaluate(() => document.querySelectorAll('.w3-chip[aria-pressed="true"]').length) === 3);
    await s.p.click('[data-w3-modell="gfs_seamless"]'); await s.p.click('[data-w3-modell="icon_seamless"]').catch(() => { });
    const nach = await s.p.evaluate(() => document.querySelectorAll('.w3-chip[aria-pressed="true"]').length);
    await s.p.click('[data-w3-modell="best_match"]').catch(() => { });
    pruefe('Weniger als 2 Modelle lässt die App nicht zu', await s.p.evaluate(() => document.querySelectorAll('.w3-chip[aria-pressed="true"]').length) >= 2, nach);
    pruefe('Einstellung „wpc-vergleich" gemerkt', (await lesen(s.p, 'wpc-vergleich')).an === true);
    pruefe('Vergleich: Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
    await s.ctx.close();
    // Datensparmodus schaltet den Vergleich ab
    s = await neueSeite(b, {}); await speichern(s.p, 'wpc-datensparen', true); await speichern(s.p, 'wpc-vergleich', { an: true, modelle: ['best_match', 'ecmwf_ifs025'] });
    const v2 = await zusatz(s.p, []);
    await s.p.goto(BASIS); await s.p.waitForSelector('.tag'); await s.p.click('#tb-graphs'); await s.p.waitForSelector('#w3VglAn'); await s.p.waitForTimeout(300);
    pruefe('Datensparmodus: Vergleich gesperrt, keine Zusatzabrufe', await s.p.isDisabled('#w3VglAn') && !(await s.p.$('#w3VglBild')) && !v2.some(u => u.includes('ecmwf_ifs025')), v2.filter(u => u.includes('models=')));
    await s.ctx.close();

    /* 3. Punkt 20 und 21: Tagesdetail und Sonne/Mond */
    console.log('Tagesdetail, Sonne und Mond');
    s = await neueSeite(b, { colorScheme: 'light' }, { omAendern: mitWind(15) });
    await s.p.goto(BASIS); await s.p.waitForSelector('.tag[data-w3-tag]');
    pruefe('Tagesliste: jede Zeile ist ein Knopf', await s.p.evaluate(() => [...document.querySelectorAll('.tag')].every(t => t.getAttribute('role') === 'button' && t.tabIndex === 0)));
    pruefe('Hilfesatz unter der Tagesliste', /auf einen Tag für Stundenwerte/.test(await s.p.textContent('.w3-tag-hilfe')));
    await s.p.click('.tag[data-w3-tag="1"]'); await s.p.waitForSelector('#w3Tag[open]');
    const zeilen = () => s.p.evaluate(() => [...document.querySelectorAll('#w3Tag .w3-std-zeile .w3-z')].map(x => x.textContent));
    let tag = await s.p.evaluate(() => ({ titel: document.getElementById('w3TagT').textContent, seg: [...document.querySelectorAll('#w3Tag [data-seg="w3tag"] [data-v]')].map(x => x.textContent), aktiv: document.querySelector('#w3Tag [aria-checked="true"]').dataset.v, zeile: document.querySelector('#w3Tag .w3-std-zeile').textContent, sm: document.getElementById('w3TagInhalt').textContent }));
    pruefe('Blatt „Freitag 16.10." mit Segment Nacht davor | Tag | Nacht danach', /Fr\. 16\.10\./.test(tag.titel) && tag.seg.join('|') === 'Nacht davor|Tag|Nacht danach' && tag.aktiv === 'tag', tag);
    pruefe('Stundenzeile mit Uhrzeit, Temperatur, Regen und Wind', /\d\d:00.*°C.*mm.*km\/h/.test(tag.zeile), tag.zeile);
    pruefe('Blatt zeigt Sonne und Mond', /Sonne.*↑ 07:48/.test(tag.sm) && /Mond/.test(tag.sm), tag.sm.slice(-200));
    const tagStunden = await zeilen();
    await s.p.click('#w3Tag [data-v="n1"]'); const n1 = await zeilen();
    await s.p.click('#w3Tag [data-v="n2"]'); const n2 = await zeilen();
    pruefe('Nacht davor 00–07 Uhr, Tag 08–18 Uhr, Nacht danach 19–23 Uhr (zusammen 24 Stunden)', n1[0] === '00:00' && n1[n1.length - 1] === '07:00' && tagStunden[0] === '08:00' && tagStunden[tagStunden.length - 1] === '18:00' && n2[0] === '19:00' && n2[n2.length - 1] === '23:00' && n1.length + tagStunden.length + n2.length === 24, [n1, tagStunden, n2]);
    pruefe('Segment merkt die Wahl (aria-checked)', await s.p.evaluate(() => document.querySelector('#w3Tag [data-v="n2"]').getAttribute('aria-checked')) === 'true');
    const mass = await s.p.evaluate(() => { const d = document.getElementById('w3Tag').getBoundingClientRect(); return { b: d.width, unten: innerHeight - d.bottom, seg: Math.min(...[...document.querySelectorAll('#w3Tag [data-seg] button')].map(x => x.getBoundingClientRect().height)) }; });
    pruefe('Blatt sitzt unten, Segmentknöpfe ≥ 44 px', mass.seg >= 43.5 && mass.unten < 2, mass);
    await foto(s.p, 'hell-390-w3-tagesdetail');
    await s.p.keyboard.press('Escape'); await s.p.waitForTimeout(100);
    pruefe('Esc schließt das Blatt', !(await s.p.evaluate(() => document.getElementById('w3Tag').open)));
    await s.p.focus('.tag[data-w3-tag="2"]'); await s.p.keyboard.press('Enter'); await s.p.waitForSelector('#w3Tag[open]');
    pruefe('Per Tastatur (Enter) auf einem Tag öffnen', /17\.10\./.test(await s.p.textContent('#w3TagT')));
    // von hier zu Sonne und Mond
    await s.p.click('#w3Tag [data-w3-mond]'); await s.p.waitForSelector('#w3Mond[open]');
    const sm = await s.p.evaluate(() => ({ t: document.getElementById('w3MondInhalt').textContent.replace(/\s+/g, ' '), bogen: !!document.querySelector('#w3Mond .w3-bogen'), mond: !!document.querySelector('#w3Mond .w3-mond-bild') }));
    pruefe('Sonne-und-Mond-Blatt für den 17.10.: Aufgang 07:49–07:5x, Untergang 18:3x, Bogen, Mondbild', /Sonnenaufgang\s*07:(49|5\d) Uhr/.test(sm.t) && /Sonnenuntergang\s*18:[2-3]\d Uhr/.test(sm.t) && sm.bogen && sm.mond, sm.t.slice(0, 260));
    await s.p.keyboard.press('Escape'); await s.p.keyboard.press('Escape');
    await s.ctx.close();

    s = await neueSeite(b, { colorScheme: 'light' }, { omAendern: d => d });
    const mondUrls = await zusatz(s.p, []);
    await s.p.goto(BASIS); await s.p.waitForSelector('.w3-mond-kachel'); await s.p.waitForTimeout(500); const nachLaden = mondUrls.length;
    const kachel = await s.p.textContent('.w3-mond-kachel');
    pruefe('Kachel „Sonne und Mond" unter der Tagesliste', await s.p.evaluate(() => document.querySelector('.w3-mond-kachel').previousElementSibling.classList.contains('tage')) && /Sonne ↑ 07:4\d ↓ 18:3\d/.test(kachel), kachel);
    await s.p.click('.w3-mond-kachel [data-w3-mond]'); await s.p.waitForSelector('#w3Mond[open]');
    const mond = await s.p.evaluate(() => {
      const t = document.getElementById('w3MondInhalt').textContent.replace(/\s+/g, ' ');
      const z = n => { const m = new RegExp(n + '\\s*(\\d\\d:\\d\\d)').exec(t); return m && m[1]; };
      return { t, auf: z('Sonnenaufgang'), unter: z('Sonnenuntergang') };
    });
    const min = hm => +hm.slice(0, 2) * 60 + +hm.slice(3);
    pruefe('Sonnenaufgang stimmt mit Open-Meteo (07:47) auf 4 Minuten überein', Math.abs(min(mond.auf) - min('07:47')) <= 4, mond.auf);
    pruefe('Sonnenuntergang stimmt mit Open-Meteo (18:35) auf 4 Minuten überein', Math.abs(min(mond.unter) - min('18:35')) <= 4, mond.unter);
    const ph = /(Zunehmende Sichel|Erstes Viertel|Zunehmender Mond|Neumond|Vollmond|Abnehmender Mond|Letztes Viertel|Abnehmende Sichel)\s*(\d+) % beleuchtet/.exec(mond.t);
    pruefe('Mondphase am 15.10.2026 (5 Tage nach Neumond): zunehmend, 15–40 %', ph && /^Zunehmende Sichel|Erstes Viertel$/.test(ph[1]) && +ph[2] >= 15 && +ph[2] <= 40, ph && ph.slice(1));
    pruefe('Nächster Vollmond um den 26.10., nächster Neumond um den 9.11.', /Nächster Vollmond\s*(25|26|27)\.10\./.test(mond.t) && /Nächster Neumond\s*(8|9|10)\.11\./.test(mond.t), mond.t.slice(-260));
    pruefe('Goldene Stunde und drei Dämmerungen stehen im Blatt', /Goldene Stunde morgens/.test(mond.t) && /Goldene Stunde abends/.test(mond.t) && /Bürgerliche Dämmerung/.test(mond.t) && /Nautische Dämmerung/.test(mond.t) && /Astronomische Dämmerung/.test(mond.t));
    const gold = /Goldene Stunde abends\s*(\d\d:\d\d) bis (\d\d:\d\d)/.exec(mond.t);
    pruefe('Goldene Stunde abends endet nach Sonnenuntergang (gegen 18:50)', gold && min(gold[1]) < min(mond.unter) && min(gold[2]) > min(mond.unter) && min(gold[2]) < min('19:10'), gold && gold.slice(1));
    pruefe('Sonnenbogen zeigt den aktuellen Stand', await s.p.evaluate(() => !!document.querySelector('#w3Mond .w3-sonne-jetzt') && /Die Sonne steht jetzt \d+ Grad über dem Horizont/.test(document.getElementById('w3MondInhalt').textContent)));
    pruefe('Sonne/Mond ohne Netzdienst (Öffnen löst keine Anfrage aus)', mondUrls.length === nachLaden, [mondUrls.length, nachLaden]);
    await foto(s.p, 'hell-390-w3-sonne-mond');
    await s.p.$eval('#w3Mond .pc-blatt-inhalt', e => { e.scrollTop = 600; }); await foto(s.p, 'hell-390-w3-sonne-mond-unten');
    pruefe('Sonne/Mond: Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
    await s.ctx.close();

    /* 4. Punkt 22 Meer und 23 Calima */
    console.log('Meer und Calima');
    const marineMitWellen = () => {
      const j = JSON.parse(fixture('marine-corralejo.json')), n = j.hourly.time.length;
      j.hourly.wave_height = Array.from({ length: n }, () => 1.2); j.hourly.wave_period = Array.from({ length: n }, () => 8.4); j.hourly.wave_direction = Array.from({ length: n }, () => 315); j.hourly.sea_surface_temperature = Array.from({ length: n }, () => 21.4);
      return JSON.stringify(j);
    };
    s = await neueSeite(b, { colorScheme: 'light' });
    const mUrls = await zusatz(s.p, [(u, route) => u.host === 'marine-api.open-meteo.com' && +u.searchParams.get('latitude') < 40 ? antwort(route, marineMitWellen()) : null]);
    await ortSetzen(s.p, CORRALEJO);
    await s.p.goto(BASIS); await warte(s.p, () => !!document.getElementById('w3Meer'));
    const meer = await s.p.evaluate(() => { const k = document.getElementById('w3Meer'); return k && { t: k.innerText.replace(/\s+/g, ' '), tide: !!k.querySelector('.w3-tide-linie'), vor: k.previousElementSibling && (k.previousElementSibling.id || k.previousElementSibling.className) }; });
    pruefe('Meer-Kachel am Küstenort: Wellenhöhe 1,2 m, Periode 8 s, Wellen aus NW, Wasser 21 °C', meer && /Wellenhöhe 1,2 m/.test(meer.t) && /Wellenperiode 8 s/.test(meer.t) && /Wellen aus NW/.test(meer.t) && /Wasser 21 °C/.test(meer.t), meer);
    pruefe('Meer-Kachel: Tide-Kurve und nächste Flut/Ebbe', meer && meer.tide && /Nächste (Flut|Ebbe)/.test(meer.t), meer && meer.t);
    const pt = await lesen(s.p, 'wpc-meerpunkt');
    pruefe('Meerespunkt aus der Marine-Antwort gemerkt (28.708 / −13.958)', pt && pt['28.73,-13.87'] && Math.abs(pt['28.73,-13.87'][0] - 28.708) < .001 && /Messpunkt im Meer: 28,71° N, 13,96° W/.test(meer.t), pt);
    await foto(s.p, 'hell-390-w3-meer');
    // beim zweiten Besuch (Neuladen) kommt der Abruf vom Meerespunkt
    await s.p.reload(); await warte(s.p, () => !!document.getElementById('w3Meer'));
    pruefe('Zweiter Abruf nutzt den gemerkten Meerespunkt', mUrls.filter(u => u.includes('marine-api') && u.includes('wave_height')).some(u => u.includes('latitude=28.708')), mUrls.filter(u => u.includes('wave_height')).map(u => u.slice(0, 120)));
    pruefe('Meer: Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
    // abschaltbar
    await s.p.click('#tb-mehr'); await s.p.uncheck('#w3Liste [data-w3="meer"]'); await s.p.click('#tb-wetter'); await s.p.waitForSelector('.tag');
    pruefe('Schalter „Meer-Kachel" aus: Kachel weg', !(await s.p.$('#w3Meer')));
    await s.ctx.close();
    s = await neueSeite(b, {}); await zusatz(s.p, [(u, route) => u.host === 'marine-api.open-meteo.com' && +u.searchParams.get('latitude') < 40 ? antwort(route, marineMitWellen()) : null]);
    await s.p.goto(BASIS); await s.p.waitForSelector('.tag'); await s.p.waitForTimeout(500);
    pruefe('Binnenort Mannheim: keine Meer-Kachel (Marine liefert dort keine Werte)', !(await s.p.$('#w3Meer')) || false);
    await s.ctx.close();

    const staub = (max, zeit) => JSON.stringify({ latitude: 49.5, longitude: 8.5, hourly: { time: Array.from({ length: 72 }, (_, i) => '2026-10-' + String(15 + Math.floor(i / 24)) + 'T' + String(i % 24).padStart(2, '0') + ':00'), dust: Array.from({ length: 72 }, (_, i) => i === zeit ? max : 10) } });
    for (const [name, max, einst, soll] of [['80 µg/m³ bei Standard 50', 80, null, true], ['80 µg/m³ bei Schwelle 100', 80, { an: true, schwelle: 100 }, false], ['120 µg/m³ bei Schwelle 100', 120, { an: true, schwelle: 100 }, true], ['30 µg/m³ bei Schwelle 25', 30, { an: true, schwelle: 25 }, true], ['Hinweis ausgeschaltet', 400, { an: false, schwelle: 50 }, false], ['40 µg/m³ bei Standard 50', 40, null, false]]) {
      s = await neueSeite(b, { colorScheme: 'light' });
      await zusatz(s.p, [(u, route) => u.host === 'air-quality-api.open-meteo.com' ? antwort(route, staub(max, 40)) : null]);   // Index 40 = 16.10. um 16:00
      if (einst) await speichern(s.p, 'wpc-calima', einst);
      await s.p.goto(BASIS); await s.p.waitForSelector('.tag'); await s.p.waitForTimeout(600);
      const da = await s.p.evaluate(() => { const k = document.getElementById('w3Calima'); return k ? k.textContent.replace(/\s+/g, ' ') : null; });
      pruefe('Calima-Kachel ' + name + (soll ? ' erscheint' : ' bleibt weg'), soll ? !!da : da === null, da);
      if (soll && name.startsWith('80 µg/m³ bei Standard')) {
        pruefe('Calima-Satz nennt Wert, Tag und Uhrzeit', /bis 80 µg\/m³ morgen um 16:00 Uhr \(leichter Dunst\)/.test(da) && /Schwellenwert steht bei 50/.test(da), da);
        await foto(s.p, 'hell-390-w3-calima');
      }
      await s.ctx.close();
    }
    s = await neueSeite(b, {});   // Standardantwort der Luftqualität enthält keine Stundenwerte: keine Kachel, kein Fehler
    await s.p.goto(BASIS); await s.p.waitForSelector('.tag'); await s.p.waitForTimeout(400);
    pruefe('Luftqualität ohne Staubwerte: keine Kachel, Konsole ohne Fehler', !(await s.p.$('#w3Calima')) && s.konsole.length === 0, s.konsole);
    await s.ctx.close();

    /* 5. Punkt 24 und 27: Kartensteuerung, Datensparmodus */
    console.log('Kartensteuerung und Datensparmodus');
    const radarJson = JSON.stringify({ host: 'https://tilecache.rainviewer.com', radar: { past: [0, 1, 2, 3, 4].map(i => ({ time: 1792067400 + i * 600, path: '/v2/radar/' + i })) } });
    s = await neueSeite(b, { colorScheme: 'light' });
    const kUrls = await zusatz(s.p, [(u, route) => u.host === 'api.rainviewer.com' ? antwort(route, radarJson) : null]);
    await s.p.goto(BASIS); await s.p.waitForSelector('.tag'); await s.p.click('#tb-radsat'); await s.p.waitForSelector('#w3Zeit');
    await warte(s.p, () => !document.getElementById('w3Zeit').disabled);
    let k = await s.p.evaluate(() => ({
      zoom: [...document.querySelectorAll('.w3-zoom-knopf')].map(x => { const r = x.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }), altZoom: document.querySelectorAll('.leaflet-control-zoom').length,
      max: +document.getElementById('w3Zeit').max, wert: +document.getElementById('w3Zeit').value, tempo: [...document.querySelectorAll('[data-seg="w3tempo"] button')].map(x => x.textContent), tempoAn: document.querySelector('[data-seg="w3tempo"] [aria-checked="true"]').textContent,
      chips: document.querySelectorAll('#ebenenWahl .chip').length, zeit: document.getElementById('radarZeit').textContent, hilfe: document.getElementById('w3ZeitHilfe').textContent
    }));
    pruefe('Zoom-Knöpfe + und − mit mindestens 44 × 44 px; Leaflet-Standardknöpfe weg', k.zoom.length === 2 && k.zoom.every(z => z[0] >= 44 && z[1] >= 44) && k.altZoom === 0, k);
    pruefe('Zeitleiste hat 5 Bilder, steht auf dem neuesten', k.max === 4 && k.wert === 4, k);
    pruefe('Tempo 0,5× | 1× | 2×, Standard 1×', k.tempo.join('|') === '0,5×|1×|2×' && k.tempoAn === '1×', k);
    // Tastatur: Pfeil links am Regler geht ein Bild zurück
    const z0 = k.zeit; await s.p.focus('#w3Zeit'); await s.p.keyboard.press('ArrowLeft');
    const z1 = await s.p.evaluate(() => ({ wert: +document.getElementById('w3Zeit').value, zeit: document.getElementById('radarZeit').textContent, vt: document.getElementById('w3Zeit').getAttribute('aria-valuetext') }));
    pruefe('Regler per Pfeiltaste: Bild 3 von 5, Uhrzeit ändert sich', z1.wert === 3 && z1.zeit !== z0 && z1.vt === z1.zeit, [z0, z1]);
    // Zoom
    const zoomVor = await s.p.evaluate(() => document.querySelectorAll('.leaflet-tile-container').length);
    await s.p.click('[data-z="1"]'); await s.p.waitForTimeout(400);
    const zl = await s.p.evaluate(() => { const t = [...document.querySelectorAll('.leaflet-tile-pane img.leaflet-tile')].map(i => +(/\/(\d+)\/\d+\/\d+\.png/.exec(i.src) || [])[1]).filter(Boolean); return Math.max(...t); });
    pruefe('Zoom-Knopf „+" vergrößert die Karte (Kachelstufe 8)', zl === 8, zl);
    // Tempo wählen und Film abspielen
    await s.p.click('[data-seg="w3tempo"] [data-v="2"]');
    pruefe('Tempo 2× gemerkt (wpc-tempo)', (await lesen(s.p, 'wpc-tempo')) === '2' && (await s.p.getAttribute('[data-seg="w3tempo"] [data-v="2"]', 'aria-checked')) === 'true');
    await s.p.click('#radarPlay'); const zA = await s.p.evaluate(() => +document.getElementById('w3Zeit').value); await s.p.waitForTimeout(1500);
    const zB = await s.p.evaluate(() => +document.getElementById('w3Zeit').value);
    pruefe('Film läuft, Regler läuft mit', zA !== zB, [zA, zB]);
    await s.p.focus('#w3Zeit'); await s.p.keyboard.press('ArrowRight');
    pruefe('Regler bedienen hält den Film an', (await s.p.getAttribute('#radarPlay', 'aria-pressed')) === 'false');
    // Ebenen per Pfeiltasten
    await s.p.focus('#ebenenWahl [data-ebene="radar"]'); await s.p.keyboard.press('ArrowRight'); await s.p.waitForTimeout(200);
    const sat = await s.p.evaluate(() => ({ an: document.querySelector('#ebenenWahl [aria-checked="true"]').dataset.ebene, fokus: document.activeElement.dataset.ebene, regler: document.getElementById('w3Zeit').disabled, hilfe: document.getElementById('w3ZeitHilfe').textContent }));
    pruefe('Ebenen-Chips mit Pfeiltasten: Radar → Satellit; Regler wartet auf den Film', sat.an === 'sat' && sat.fokus === 'sat' && sat.regler && /Abspielen/.test(sat.hilfe), sat);
    await s.p.click('#ebenenWahl [data-ebene="karte"]'); await s.p.waitForTimeout(200);
    pruefe('Ebene „Karte": Zeitleiste und Tempo verschwinden, Zoom bleibt', await s.p.evaluate(() => document.getElementById('w3Steuer').hidden && !!document.querySelector('.w3-zoom-knopf')));
    await s.p.click('#ebenenWahl [data-ebene="radar"]');
    await foto(s.p, 'hell-390-w3-karte');
    const mk = await s.p.evaluate(MESSEN); pruefe('Rad/Sat: kein seitliches Scrollen, Schrift ≥ 11 px, Tippflächen ≥ 44 px', mk.seitlich <= 0 && mk.kleinsteSchrift >= 11 && mk.klein.length === 0, mk);
    pruefe('Rad/Sat: Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
    await s.ctx.close();

    // Datensparmodus
    s = await neueSeite(b, { colorScheme: 'light' });
    const sUrls = await zusatz(s.p, [(u, route) => u.host === 'api.rainviewer.com' ? antwort(route, radarJson) : null]);
    await s.p.goto(BASIS); await s.p.waitForSelector('.tag');
    await s.p.click('#tb-mehr'); await s.p.waitForSelector('#w3Liste');
    const mehrW3 = await s.p.evaluate(() => ({ titel: document.getElementById('w3Titel').textContent, schalter: [...document.querySelectorAll('#w3Liste input[role="switch"]')].map(x => x.dataset.w3), hilfe: document.getElementById('w3Liste').textContent, schwelle: [...document.querySelectorAll('[data-seg="w3schwelle"] button')].map(x => x.dataset.v), ds: document.getElementById('datenschutz').textContent, quellen: document.getElementById('quellen').textContent, vorA5: document.getElementById('w3Titel').nextElementSibling.nextElementSibling.nextElementSibling.id }));
    pruefe('Mehr: Abschnitt „Wetter und Karte" mit Sparmodus, Meer, Calima und Schwellen 25/50/100', mehrW3.titel === 'Wetter und Karte' && mehrW3.schalter.join() === 'spar,meer,calima' && mehrW3.schwelle.join() === '25,50,100', mehrW3);
    pruefe('Datenschutz und Quellen nennen Marine und Luftqualität', /Marine, Luftqualität, Vorhersage/.test(mehrW3.ds) && /Saharastaub: Open-Meteo Luftqualität/.test(mehrW3.quellen) && /Meer: Open-Meteo Marine/.test(mehrW3.quellen));
    await s.p.check('#w3Liste [data-w3="spar"]');
    pruefe('Datensparmodus gespeichert als wpc-datensparen = true', (await lesen(s.p, 'wpc-datensparen')) === true);
    await s.p.click('#tb-radsat'); await s.p.waitForSelector('#w3Steuer', { state: 'attached' }); await s.p.waitForTimeout(500);
    const sp = await s.p.evaluate(() => ({ play: getComputedStyle(document.getElementById('radarPlay')).display, steuer: document.getElementById('w3Steuer').hidden, hinweis: document.getElementById('w3SparHinweis').hidden ? '' : document.getElementById('w3SparHinweis').textContent }));
    pruefe('Datensparmodus: kein Abspielen, keine Zeitleiste, Hinweis „nur das neueste Bild"', sp.play === 'none' && sp.steuer && /nur das neueste Bild/.test(sp.hinweis), sp);
    await s.p.click('#ebenenWahl [data-ebene="sat"]'); await s.p.waitForTimeout(200);
    pruefe('Satellit im Datensparmodus: kein Film (Abspielen versteckt), kein GetCapabilities', (await s.p.evaluate(() => getComputedStyle(document.getElementById('radarPlay')).display)) === 'none' && !sUrls.some(u => /GetCapabilities/i.test(u)), sUrls.filter(u => /eumetsat/.test(u)).slice(0, 2));
    await s.p.click('#ebenenWahl [data-ebene="radar"]');
    // Zoom ist auf 9 begrenzt: Start 7 → nach 2 Klicks ist „+" gesperrt
    await s.p.click('[data-z="1"]'); await s.p.waitForTimeout(600); await s.p.click('[data-z="1"]'); await s.p.waitForTimeout(600);
    pruefe('Datensparmodus: Karte lässt sich nur bis Stufe 9 vergrößern', await s.p.isDisabled('[data-z="1"]'));
    await foto(s.p, 'hell-390-w3-sparmodus');
    await s.p.click('#tb-mehr'); await s.p.uncheck('#w3Liste [data-w3="spar"]'); await s.p.click('#tb-radsat'); await s.p.waitForTimeout(300);
    pruefe('Sparmodus aus: Abspielen und Zeitleiste kommen zurück', await s.p.evaluate(() => getComputedStyle(document.getElementById('radarPlay')).display !== 'none' && !document.getElementById('w3Steuer').hidden) && (await lesen(s.p, 'wpc-datensparen')) === false);
    pruefe('Datensparmodus: Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
    await s.ctx.close();

    // Vorschlag bei saveData
    s = await neueSeite(b, { colorScheme: 'light' });
    await s.p.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }));
    await s.p.goto(BASIS); await s.p.waitForSelector('#w3SparVorschlag');
    const vs = await s.p.evaluate(() => ({ t: document.getElementById('w3SparVorschlag').textContent, knoepfe: [...document.querySelectorAll('#w3SparVorschlag button')].map(x => Math.round(x.getBoundingClientRect().height)), seitlich: document.documentElement.scrollWidth - innerWidth }));
    pruefe('saveData: Vorschlag erscheint mit zwei Knöpfen (≥ 44 px)', /Dein Gerät spart Daten/.test(vs.t) && vs.knoepfe.length === 2 && vs.knoepfe.every(h => h >= 43.5) && vs.seitlich <= 0, vs);
    pruefe('Vorschlag schaltet nichts von selbst ein', (await lesen(s.p, 'wpc-datensparen')) == null);
    await foto(s.p, 'hell-390-w3-spar-vorschlag');
    await s.p.click('[data-w3-spar="ja"]');
    pruefe('„Sparmodus einschalten" setzt wpc-datensparen und blendet den Vorschlag aus', (await lesen(s.p, 'wpc-datensparen')) === true && !(await s.p.$('#w3SparVorschlag')));
    await s.p.reload(); await s.p.waitForSelector('.tag');
    pruefe('Nach dem Neuladen kein zweiter Vorschlag', !(await s.p.$('#w3SparVorschlag')));
    await s.ctx.close();
    s = await neueSeite(b, {});
    await s.p.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }));
    await s.p.goto(BASIS); await s.p.waitForSelector('#w3SparVorschlag'); await s.p.click('[data-w3-spar="nein"]'); await s.p.reload(); await s.p.waitForSelector('.tag');
    pruefe('„Nein, danke": Sparmodus bleibt aus und die Frage kommt nicht wieder', (await lesen(s.p, 'wpc-datensparen')) == null && !(await s.p.$('#w3SparVorschlag')) && (await lesen(s.p, 'wpc-datensparen-gefragt')) === true);
    await s.ctx.close();
    s = await neueSeite(b, {}); await s.p.goto(BASIS); await s.p.waitForSelector('.tag');
    pruefe('Ohne saveData kein Vorschlag', !(await s.p.$('#w3SparVorschlag')));
    await s.ctx.close();

    /* 6. Layouts: iPhone dunkel, iPad, Mac */
    console.log('Layouts');
    const alles = async (p, name, minKlick) => {
      for (const tab of ['wetter', 'graphs', 'radsat', 'mehr']) {
        await p.click(name.startsWith('Mac') ? '#macLeiste [data-ml-tab="' + tab + '"]' : '#tb-' + tab); await p.waitForTimeout(tab === 'radsat' ? 700 : 300);
        const m = await p.evaluate(MESSEN, minKlick);
        pruefe(name + ': Tab ' + tab + ' ohne seitliches Scrollen, Schrift ≥ 11 px, Tippflächen groß genug', m.seitlich <= 0 && m.kleinsteSchrift >= 11 && m.klein.length === 0, m);
      }
    };
    const vollesWetter = { omAendern: d => { mitWind(15)(d); d.minutely_15.precipitation = [0, 0, .4, .6, .5, 0, 0, 0]; return d; } };
    for (const [name, opt, mac] of [['dunkel 390', { colorScheme: 'dark' }, false], ['iPad 820', { viewport: { width: 820, height: 1180 }, colorScheme: 'light' }, false], ['Mac 1280', { viewport: { width: 1280, height: 800 }, colorScheme: 'light' }, true]]) {
      s = await neueSeite(b, opt, vollesWetter);
      await zusatz(s.p, [(u, route) => u.host === 'air-quality-api.open-meteo.com' ? antwort(route, staub(200, 40)) : u.host === 'marine-api.open-meteo.com' && +u.searchParams.get('latitude') < 40 ? antwort(route, marineMitWellen()) : u.host === 'api.rainviewer.com' ? antwort(route, radarJson) : null]);
      await speichern(s.p, 'wpc-vergleich', { an: true, modelle: ['best_match', 'ecmwf_ifs025', 'icon_seamless'] });
      await ortSetzen(s.p, CORRALEJO);
      await s.p.goto(BASIS); await s.p.waitForSelector('.tag'); await warte(s.p, () => !!document.getElementById('w3Meer') && !!document.getElementById('w3Calima'));
      pruefe(name + ': Calima- und Meer-Kachel sind da', await s.p.evaluate(() => !!document.getElementById('w3Meer') && !!document.getElementById('w3Calima')));
      if (mac) pruefe(name + ': Mac-Layout bleibt zweispaltig', await s.p.evaluate(() => document.getElementById('tab-wetter').classList.contains('mac-zwei') && !!document.querySelector('.mac-rechts #w3Calima, .mac-links #w3Calima')));
      await foto(s.p, name.replace(' ', '-') + '-w3-wetter');
      await s.p.click(mac ? '#macLeiste [data-ml-tab="graphs"]' : '#tb-graphs'); await s.p.waitForSelector('#w3VglBild svg', { timeout: 8000 }); await foto(s.p, name.replace(' ', '-') + '-w3-vergleich');
      await s.p.click(mac ? '#macLeiste [data-ml-tab="wetter"]' : '#tb-wetter');
      await alles(s.p, name, mac ? 27.5 : 43.5);
      // Tagesdetail im Fenster/Blatt
      await s.p.click(mac ? '#macLeiste [data-ml-tab="wetter"]' : '#tb-wetter'); await s.p.waitForSelector('.tag[data-w3-tag]');
      await s.p.click('.tag[data-w3-tag="1"]'); await s.p.waitForSelector('#w3Tag[open]');
      const bl = await s.p.evaluate(() => { const r = document.getElementById('w3Tag').getBoundingClientRect(); return { b: Math.round(r.width), h: Math.round(r.height), vb: innerWidth, vh: innerHeight, seitlich: document.documentElement.scrollWidth - innerWidth }; });
      pruefe(name + ': Tagesblatt passt in den Bildschirm' + (mac ? ' (Fenster, nicht randlos)' : ''), bl.b <= bl.vb && bl.h <= bl.vh && (!mac || bl.b < bl.vb - 100) && bl.seitlich <= 0, bl);
      await foto(s.p, name.replace(' ', '-') + '-w3-tagesdetail');
      await s.p.keyboard.press('Escape');
      await s.p.click('.w3-mond-kachel [data-w3-mond]'); await s.p.waitForSelector('#w3Mond[open]'); await foto(s.p, name.replace(' ', '-') + '-w3-sonne-mond'); await s.p.keyboard.press('Escape');
      pruefe(name + ': Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
      await s.ctx.close();
    }
    // 130 % Schrift: Tagesblatt und Vergleich brechen sauber um
    s = await neueSeite(b, { colorScheme: 'light' }, vollesWetter);
    await speichern(s.p, 'wpc-vergleich', { an: true, modelle: ['best_match', 'ecmwf_ifs025'] });
    await s.p.goto(BASIS); await s.p.waitForSelector('.tag'); await s.p.evaluate(() => { document.documentElement.style.fontSize = '130%'; });
    await s.p.click('.tag[data-w3-tag="1"]'); await s.p.waitForSelector('#w3Tag[open]'); await s.p.waitForTimeout(200);
    const gr = await s.p.evaluate(MESSEN); pruefe('130 % Schrift: Tagesblatt ohne seitliches Scrollen', gr.seitlich <= 0, gr);
    await foto(s.p, 'hell-390-w3-schrift130');
    await s.ctx.close();
  } catch (e) {
    fehler++; console.log('  ✗ Test abgebrochen: ' + (e && e.stack || e));
  } finally {
    await b.close(); srv.close();
  }
  console.log('\n' + ok + ' Prüfungen bestanden, ' + fehler + ' fehlgeschlagen. Bildschirmfotos: ' + BILDER);
  process.exit(fehler ? 1 : 0);
})();

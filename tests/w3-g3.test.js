/* tests/w3-g3.test.js – Welle 3, Gruppe 3 „Webcams" (Punkt 18). Start: PORT=8873 node tests/w3-g3.test.js
   Prüft: mit WEBCAMS_FREIGABE=false keine Anfrage an Webcam-Server und Hinweisliste wie bisher; mit true (app.js wird im Test
   umgeschrieben, die Datei bleibt unverändert) Kachel, Kameraauswahl, Aktuell, Film, Tagesübersicht, Rückblick, Fehlerzustand,
   Datensparmodus, Quellen. Webcam-Bilder sind Attrappen (kleine PNGs), Zwischenspeicher-Antworten sind feste JSON-Daten. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { webkit } = require('playwright');

const WURZEL = path.join(__dirname, '..');
const PORT = +process.env.PORT || 8873;
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

const APP_JS = fs.readFileSync(path.join(WURZEL, 'app.js'), 'utf8');
const WORKER = 'https://wc.test';
const BETREIBER = /klymiuk|mannheim-wetter|edfmcam|berghalde|ladenburg\.de|ursel-hirsch|wc\.test/;
// Zwischenspeicher-Attrappe: Raster alle 30 Minuten von gestern 12:00 bis heute 14:30 (Lücke um 03:00), dazu 13:45 und 14:15
const pad = n => String(n).padStart(2, '0');
function schuesse() {
  const l = []; let i = 0;
  for (let ms = Date.UTC(2026, 9, 14, 12, 0); ms <= Date.UTC(2026, 9, 15, 14, 30); ms += 30 * 60000) {
    const d = new Date(ms), t = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
    if (t === '2026-10-15T03:00') continue;
    l.push({ t, url: '/webcam/bild/' + (++i) });
  }
  l.push({ t: '2026-10-15T13:45', url: '/webcam/bild/' + (++i) }, { t: '2026-10-15T14:15', url: '/webcam/bild/' + (++i) });
  return l.sort((a, b) => a.t < b.t ? -1 : 1);
}
const ALLE = schuesse();
const imZeitraum = h => ALLE.filter(s => Date.UTC(+s.t.slice(0, 4), +s.t.slice(5, 7) - 1, +s.t.slice(8, 10), +s.t.slice(11, 13), +s.t.slice(14, 16)) >= Date.UTC(2026, 9, 15, 14, 40) - h * 3600000).length;
const anfragen = [];

async function webcamRoute(p, o) {
  o = o || {};
  p.on('request', r => { const u = new URL(r.url()); if (!r.url().startsWith(BASIS)) anfragen.push(u.host + u.pathname + u.search); });
  await p.route(u => u.host === 'wc.test', route => {
    const u = new URL(route.request().url()), h = { 'Access-Control-Allow-Origin': '*' };
    if (u.pathname === '/webcam/live') return o.liveFehler ? route.fulfill({ status: 404, headers: h, body: 'weg' }) : route.fulfill({ status: 200, contentType: 'image/png', headers: h, body: PNG });
    if (u.pathname === '/webcam') return o.archivFehler ? route.fulfill({ status: 500, headers: h, body: 'kaputt' }) : route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify({ kamera: u.searchParams.get('kamera'), shots: ALLE }) });
    if (u.pathname.startsWith('/webcam/bild/')) return route.fulfill({ status: 200, contentType: 'image/png', headers: h, body: PNG });
    return route.fulfill({ status: 404, body: '' });
  });
}
// app.js im Test umschreiben: Schalter und Zwischenspeicher-Adresse setzen (die Datei auf der Platte bleibt unverändert)
async function appJs(p, o) {
  let t = APP_JS;
  if (o.frei) t = t.replace('var WEBCAMS_FREIGABE = false;', 'var WEBCAMS_FREIGABE = true;');
  if (o.worker) t = t.replace("var WEBCAM_WORKER = '';", "var WEBCAM_WORKER = '" + WORKER + "';");
  if (o.buster) t = t.replace(/cacheBuster: false/g, 'cacheBuster: true');
  await p.route(BASIS + 'app.js', route => route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: t }));
}
async function oeffne(b, o, seiteOpt) {
  const s = await neueSeite(b, Object.assign({ colorScheme: 'light' }, seiteOpt || {}));
  await webcamRoute(s.p, o); await appJs(s.p, o);
  if (o.init) await s.p.addInitScript(o.init);
  await s.p.goto(BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 });
  return s;
}
const bildGeladen = p => p.waitForFunction(() => { const i = document.querySelector('#wcBuehne .wc-bild'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 8000 }).then(() => true, () => false);
const text = (p, sel) => p.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
async function layout(s, name, minKlick) {
  const m = await s.p.evaluate(MESSEN, minKlick);
  pruefe(name + ': kein seitliches Scrollen', m.seitlich <= 0, m.seitlich + ' px');
  pruefe(name + ': kleinste Schrift ≥ 11 px', m.kleinsteSchrift >= 11, m.kleinsteSchrift);
  pruefe(name + ': Tippflächen ≥ ' + (minKlick || 44) + ' px', m.klein.length === 0, m.klein);
}

(async () => {
  fs.mkdirSync(BILDER, { recursive: true });
  const srv = await server();
  const b = await webkit.launch();
  try {
    /* 1. Schalter aus: wie heute, keine Anfrage an Webcam-Server */
    console.log('Schalter AUS (WEBCAMS_FREIGABE = false)');
    pruefe('Datei-Konstante steht auf false', /var WEBCAMS_FREIGABE = false;/.test(APP_JS));
    pruefe('Zwischenspeicher-Adresse ist leer', /var WEBCAM_WORKER = '';/.test(APP_JS));
    anfragen.length = 0;
    let s = await oeffne(b, { init: () => { localStorage.setItem('wpc-rechts', '"webcam"'); localStorage.setItem('wpc-webcam', '{"kamera":"oststadt","ansicht":"film"}'); } }, {});
    pruefe('keine Webcam-Kachel auf der Startseite', await s.p.evaluate(() => !document.getElementById('wcKachel')));
    pruefe('Aktuell-Kachel zeigt keine Webcam (nur Werte)', await s.p.evaluate(() => !document.querySelector('.mk-bild') && !!document.querySelector('.akt .werte')));
    await s.p.click('#tb-mehr'); await s.p.waitForTimeout(300);
    pruefe('Mehr: Hinweis „Folgt nach Erlaubnis"', /Folgt nach Erlaubnis/.test(await text(s.p, '#tab-mehr')));
    pruefe('Mehr: Hinweisliste mit 6 Kameras als Links zu den Betreibern', await s.p.evaluate(() => document.querySelectorAll('#webcamListe a[href^="https"]').length === 6));
    pruefe('Mehr: Webcam-Ansicht nicht wählbar (ausgegraut)', await s.p.evaluate(() => { const l = [...document.querySelectorAll('#ansichtListe label')].filter(x => /Webcam/.test(x.textContent))[0]; return l && l.classList.contains('aus') && l.querySelector('input').disabled; }));
    pruefe('Mehr: keine Webcam-Zeile in den Quellen, kein Webcam-Satz im Datenschutz', await s.p.evaluate(() => !/Webcam:/.test(document.getElementById('quellen').textContent) && !document.getElementById('wcDatenschutz')));
    pruefe('KEINE Anfrage an einen Webcam-Betreiber oder Zwischenspeicher', !anfragen.some(a => BETREIBER.test(a)), anfragen.filter(a => BETREIBER.test(a)));
    pruefe('Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
    await foto(s.p, 'w3g3-aus-mehr');
    await s.ctx.close();

    /* 2. Schalter AN mit Zwischenspeicher: Kachel, Auswahl, Aktuell */
    console.log('Schalter AN, mit Zwischenspeicher: Kachel und Aktuell');
    anfragen.length = 0;
    s = await oeffne(b, { frei: true, worker: true }, {});
    pruefe('Kachel „Webcam" auf der Startseite', await s.p.evaluate(() => !!document.getElementById('wcKachel') && /Webcam/.test(document.getElementById('wcTitel').textContent)));
    pruefe('Kachel steht vor der Tagesliste', await s.p.evaluate(() => document.getElementById('wcKachel').compareDocumentPosition(document.querySelector('.tage')) & Node.DOCUMENT_POSITION_FOLLOWING));
    pruefe('aktuelles Bild geladen', await bildGeladen(s.p));
    pruefe('Zeitstempel „Abgerufen um hh:mm Uhr"', /Abgerufen um \d\d:\d\d Uhr/.test(await text(s.p, '#wcZeit')), await text(s.p, '#wcZeit'));
    pruefe('14:40 Uhr (festgesetzte Uhrzeit) im Zeitstempel', /14:40/.test(await text(s.p, '#wcZeit')));
    const q = await s.p.evaluate(() => { const a = document.querySelector('#wcQuelle a'); return { text: a.textContent, href: a.href, rel: a.rel, target: a.target, satz: document.getElementById('wcQuelle').textContent }; });
    pruefe('Quellenhinweis mit Betreiber und Link', /Wetterstation Mannheim-Oststadt/.test(q.text) && /klymiuk\.info/.test(q.href) && /noopener/.test(q.rel) && q.target === '_blank', q);
    pruefe('Quellenhinweis nennt die Rechte beim Betreiber', /Rechte am Bild liegen beim Betreiber/.test(q.satz));
    pruefe('6 Kamera-Chips (Radiogruppe)', await s.p.evaluate(() => document.querySelectorAll('.wc-chips [role="radio"]').length === 6 && document.querySelectorAll('.wc-chips [aria-checked="true"]').length === 1));
    pruefe('Ansichten-Auswahl: Aktuell, Film, Tag, Rückblick', (await s.p.$$eval('[data-seg="wcansicht"] [data-v]', e => e.map(x => x.textContent))).join() === 'Aktuell,Film,Tag,Rückblick');
    await s.p.click('[data-wc-kamera="ladenburg"]'); await bildGeladen(s.p);
    pruefe('Kamera wechseln: Quelle und Bildbeschriftung ändern sich', await s.p.evaluate(() => /Stadt Ladenburg/.test(document.getElementById('wcQuelle').textContent) && /Ladenburg Wasserturm/.test(document.querySelector('.wc-bild').alt)));
    pruefe('Fokus bleibt auf dem gewählten Chip', await s.p.evaluate(() => document.activeElement && document.activeElement.dataset.wcKamera === 'ladenburg'));
    pruefe('Auswahl gemerkt (wpc-webcam)', await s.p.evaluate(() => JSON.parse(localStorage.getItem('wpc-webcam')).kamera === 'ladenburg'));
    pruefe('Bilder kommen nur vom Zwischenspeicher, nie direkt vom Betreiber', anfragen.some(a => /^wc\.test\/webcam\/live\?kamera=/.test(a)) && !anfragen.some(a => BETREIBER.test(a) && !/^wc\.test/.test(a)), anfragen.filter(a => !/^wc\.test/.test(a) && BETREIBER.test(a)));
    pruefe('Bildadresse ohne Zeitstempel-Parameter (cacheBuster aus)', !anfragen.some(a => /live.*[?&]t=/.test(a)));
    await s.p.click('[data-wc-kamera="oststadt"]');
    await layout(s, 'iPhone 390 hell, Aktuell');
    await s.p.evaluate(() => document.getElementById('wcKachel').scrollIntoView()); await foto(s.p, 'w3g3-390-aktuell');

    /* 3. Film der letzten Stunde */
    console.log('Film der letzten Stunde');
    await s.p.click('[data-seg="wcansicht"] [data-v="film"]'); await s.p.waitForSelector('#wcPlay');
    pruefe('Film: Pause-Knopf, Regler, Tempo-Auswahl', await s.p.evaluate(() => /Pause/.test(document.getElementById('wcPlay').textContent) && !!document.getElementById('wcRegler') && document.querySelectorAll('[data-seg="wctempo"] [data-v]').length === 3));
    pruefe('Film: Regler hat 4 Bilder (13:45, 14:00, 14:15, 14:30)', await s.p.evaluate(() => document.getElementById('wcRegler').max === '3'), await s.p.evaluate(() => document.getElementById('wcRegler').max));
    const z1 = await text(s.p, '#wcZeit'); await s.p.waitForTimeout(1300);
    const z2 = await text(s.p, '#wcZeit');
    pruefe('Film spielt von selbst (Bild wechselt)', z1 !== z2 && /Aufnahme \d\d:\d\d Uhr · Bild \d von 4/.test(z2), [z1, z2]);
    await s.p.click('#wcPlay'); const z3 = await text(s.p, '#wcZeit'); await s.p.waitForTimeout(1500);
    pruefe('Pause hält das Bild an, Knopf heißt „Abspielen"', z3 === await text(s.p, '#wcZeit') && /Abspielen/.test(await text(s.p, '#wcPlay')));
    await s.p.click('#wcPlay'); await s.p.click('[data-seg="wctempo"] [data-v="2"]');
    pruefe('Tempo 2× gewählt und gemerkt', await s.p.evaluate(() => document.querySelector('[data-seg="wctempo"] [aria-checked="true"]').dataset.v === '2' && JSON.parse(localStorage.getItem('wpc-webcam')).tempo === 2));
    const a1 = await text(s.p, '#wcZeit'); await s.p.waitForTimeout(1200);
    pruefe('Tempo 2×: nach 1,2 s mindestens ein Bildwechsel', a1 !== await text(s.p, '#wcZeit'));
    await s.p.click('#wcPlay'); await s.p.fill('#wcRegler', '0'); await s.p.dispatchEvent('#wcRegler', 'input');
    pruefe('Regler springt zum ersten Bild (13:45) und hält an', /Aufnahme 13:45 Uhr · Bild 1 von 4/.test(await text(s.p, '#wcZeit')), await text(s.p, '#wcZeit'));
    await layout(s, 'iPhone 390 hell, Film');
    await s.p.evaluate(() => document.getElementById('wcKachel').scrollIntoView()); await foto(s.p, 'w3g3-390-film');

    /* 4. Tagesübersicht */
    console.log('Tagesübersicht');
    await s.p.click('[data-seg="wcansicht"] [data-v="tag"]'); await s.p.waitForSelector('.wc-streifen');
    const tag = await s.p.evaluate(() => ({ n: document.querySelectorAll('.wc-zelle').length, leer: document.querySelectorAll('.wc-zelle.leer').length, erste: document.querySelector('.wc-zelle .zahl').textContent, letzte: [...document.querySelectorAll('.wc-zelle')].pop().textContent }));
    pruefe('Tag: 30-Minuten-Raster von 00:00 bis 14:30 = 30 Felder', tag.n === 30, tag);
    pruefe('Tag: Lücke um 03:00 als leeres Feld „–"', tag.leer === 1);
    pruefe('Tag: letztes Feld ist 14:30', /14:30/.test(tag.letzte), tag.letzte);
    pruefe('Tag: Zeitstempel des großen Bildes', /Aufnahme 15\.10\. 14:30 Uhr · \d+ Bilder/.test(await text(s.p, '#wcZeit')), await text(s.p, '#wcZeit'));
    await s.p.click('.wc-zelle[data-wc-t="2026-10-15T08:00"]');
    pruefe('Klick auf ein Feld zeigt dieses Bild groß', /Aufnahme 15\.10\. 08:00 Uhr/.test(await text(s.p, '#wcZeit')), await text(s.p, '#wcZeit'));
    pruefe('Streifen per Tastatur erreichbar (tabindex) und beschriftet', await s.p.evaluate(() => { const e = document.querySelector('.wc-streifen'); return e.tabIndex === 0 && !!e.getAttribute('aria-label'); }));
    await layout(s, 'iPhone 390 hell, Tag');
    await s.p.evaluate(() => document.getElementById('wcKachel').scrollIntoView()); await foto(s.p, 'w3g3-390-tag');

    /* 5. Rückblick 2/6/12/24 h */
    console.log('Rückblick');
    await s.p.click('[data-seg="wcansicht"] [data-v="rueck"]'); await s.p.waitForSelector('[data-seg="wcstunden"]');
    pruefe('Rückblick: Auswahl 2 h, 6 h, 12 h, 24 h', (await s.p.$$eval('[data-seg="wcstunden"] [data-v]', e => e.map(x => x.textContent))).join() === '2 h,6 h,12 h,24 h');
    const zahlen = [];
    for (const h of [2, 6, 12, 24]) {
      await s.p.click('[data-seg="wcstunden"] [data-v="' + h + '"]'); await s.p.waitForSelector('.wc-streifen');
      const n = await s.p.evaluate(() => document.querySelectorAll('.wc-zelle').length); zahlen.push(n);
      pruefe('Rückblick ' + h + ' h: ' + imZeitraum(h) + ' Bilder', n === imZeitraum(h), n);
    }
    pruefe('Rückblick: mehr Stunden, mehr Bilder', zahlen[0] < zahlen[1] && zahlen[1] < zahlen[2] && zahlen[2] < zahlen[3], zahlen);
    await layout(s, 'iPhone 390 hell, Rückblick');
    await s.p.evaluate(() => document.getElementById('wcKachel').scrollIntoView()); await foto(s.p, 'w3g3-390-rueck');
    // Aktuell-Kachel (links antippen): Webcam-Ansicht über den Zwischenspeicher
    await s.p.evaluate(() => { localStorage.setItem('wpc-rechts', '"webcam"'); });
    await s.p.reload(); await s.p.waitForSelector('.tag');
    pruefe('Aktuell-Kachel, rechte Hälfte Webcam: Bild vom Zwischenspeicher', await s.p.evaluate(() => { const i = document.querySelector('.mk-bild'); return i && /^https:\/\/wc\.test\/webcam\/live/.test(i.src); }));
    // Mehr
    await s.p.click('#tb-mehr'); await s.p.waitForTimeout(300);
    const mehr = await s.p.evaluate(() => ({ hinweis: !/Folgt nach Erlaubnis/.test(document.getElementById('tab-mehr').textContent), quellen: document.querySelectorAll('#quellen a[href*="klymiuk"], #quellen a[href*="ladenburg"]').length, ds: (document.getElementById('wcDatenschutz') || {}).textContent || '', freigeschaltet: !document.querySelector('#ansichtListe label.aus') }));
    pruefe('Mehr: kein „Folgt nach Erlaubnis" mehr, Webcam-Ansicht wählbar', mehr.hinweis && mehr.freigeschaltet, mehr);
    pruefe('Mehr: Quellenzeilen der Betreiber', mehr.quellen >= 2, mehr.quellen);
    pruefe('Mehr: Datenschutz-Satz nennt Zwischenspeicher und IP-Adresse', /Zwischenspeicher/.test(mehr.ds) && /IP-Adresse/.test(mehr.ds) && /wc\.test/.test(mehr.ds), mehr.ds);
    await layout(s, 'iPhone 390 hell, Mehr');
    pruefe('Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
    await s.ctx.close();

    /* 6. dunkel, iPad, Mac */
    console.log('dunkel, iPad 820, Mac 1280');
    for (const [name, opt, klick] of [['iPhone 390 dunkel', { colorScheme: 'dark' }, 44], ['iPad 820', { viewport: { width: 820, height: 1180 } }, 44], ['Mac 1280', { viewport: { width: 1280, height: 800 } }, 28]]) {
      s = await oeffne(b, { frei: true, worker: true, init: () => localStorage.setItem('wpc-webcam', '{"kamera":"oststadt","ansicht":"tag","stunden":6,"tempo":1}') }, opt);
      await s.p.waitForSelector('.wc-streifen'); await bildGeladen(s.p);
      pruefe(name + ': Kachel und Tagesstreifen da', await s.p.evaluate(() => !!document.getElementById('wcKachel') && document.querySelectorAll('.wc-zelle').length === 30));
      if (name === 'Mac 1280') pruefe('Mac: Kachel liegt in der rechten Spalte', await s.p.evaluate(() => !!document.getElementById('wcKachel').closest('.mac-rechts')));
      await layout(s, name + ', Tag', klick);
      await s.p.evaluate(() => document.getElementById('wcKachel').scrollIntoView({ block: 'center' })); await foto(s.p, 'w3g3-' + name.replace(/ /g, '-'));
      await s.p.click('[data-seg="wcansicht"] [data-v="film"]'); await s.p.waitForSelector('#wcPlay');
      await layout(s, name + ', Film', klick);
      pruefe(name + ': Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
      await s.ctx.close();
    }

    /* 7. Fehlerzustände */
    console.log('Bild nicht verfügbar');
    s = await oeffne(b, { frei: true, worker: true, liveFehler: true }, {});
    await s.p.waitForSelector('.wc-fehler');
    pruefe('Live-Bild fehlt: „Bild nicht verfügbar" mit Knopf „Erneut versuchen"', await s.p.evaluate(() => /Bild nicht verfügbar/.test(document.getElementById('wcBuehne').textContent) && /Erneut versuchen/.test(document.querySelector('[data-wc-neu]').textContent)));
    await layout(s, 'Fehlerzustand 390');
    await foto(s.p, 'w3g3-390-fehler');
    await s.ctx.close();
    s = await oeffne(b, { frei: true, worker: true, archivFehler: true, init: () => localStorage.setItem('wpc-webcam', '{"kamera":"oststadt","ansicht":"film"}') }, {});
    await s.p.waitForSelector('.wc-fehler');
    pruefe('Archiv fehlt: Fehlerzustand statt Film, Seite bleibt ruhig', await s.p.evaluate(() => /Zwischenspeicher/.test(document.getElementById('wcBuehne').textContent) && /Bild nicht verfügbar/.test(document.getElementById('wcBuehne').textContent)));
    await s.ctx.close();

    /* 8. Datensparmodus */
    console.log('Datensparmodus');
    anfragen.length = 0;
    s = await oeffne(b, { frei: true, worker: true, init: () => { localStorage.setItem('wpc-datensparen', 'true'); localStorage.setItem('wpc-webcam', '{"kamera":"oststadt","ansicht":"film"}'); } }, {});
    await bildGeladen(s.p);
    pruefe('Datensparmodus: keine Ansichten-Auswahl, nur Standbild', await s.p.evaluate(() => !document.querySelector('[data-seg="wcansicht"]') && !!document.querySelector('#wcBuehne .wc-bild') && !document.getElementById('wcPlay')));
    pruefe('Datensparmodus: Hinweis sichtbar', /Datensparmodus ist an/.test(await text(s.p, '#wcSpar')));
    pruefe('Datensparmodus: kein Abruf des Archivs, kein Film', !anfragen.some(a => /\/webcam\?kamera=|\/webcam\/bild\//.test(a)), anfragen);
    pruefe('Datensparmodus: nur ein Live-Bild abgerufen', anfragen.filter(a => /\/webcam\/live/.test(a)).length === 1, anfragen.filter(a => /live/.test(a)));
    await s.ctx.close();

    /* 9. Ohne Zwischenspeicher: direkt beim Betreiber, cacheBuster */
    console.log('Ohne Zwischenspeicher');
    anfragen.length = 0;
    s = await oeffne(b, { frei: true }, {});
    await bildGeladen(s.p);
    pruefe('Ohne Zwischenspeicher: 5 Kameras (Flugplatz nur http, nicht direkt)', await s.p.evaluate(() => document.querySelectorAll('.wc-chips [role="radio"]').length === 5 && !document.querySelector('[data-wc-kamera="airport"]')));
    pruefe('Ohne Zwischenspeicher: nur Aktuell, Hinweis auf spätere Ansichten', await s.p.evaluate(() => !document.querySelector('[data-seg="wcansicht"]') && /Zwischenspeicher/.test(document.getElementById('wcSpar').textContent)));
    const direkt = anfragen.filter(a => /klymiuk/.test(a));
    pruefe('Direktabruf ohne Zeitstempel-Parameter (cacheBuster false)', direkt.length === 1 && !/[?&]t=/.test(direkt[0]), direkt);
    pruefe('Bild-Element sendet keinen Verweis-Absender (no-referrer)', await s.p.evaluate(() => document.querySelector('.wc-bild').referrerPolicy === 'no-referrer'));
    pruefe('Mehr: Datenschutz sagt, dass der Betreiber die IP-Adresse sieht', (await (async () => { await s.p.click('#tb-mehr'); await s.p.waitForTimeout(300); return text(s.p, '#wcDatenschutz'); })()).includes('direkt beim Betreiber'));
    await s.ctx.close();
    anfragen.length = 0;
    s = await oeffne(b, { frei: true, buster: true }, {});
    await bildGeladen(s.p);
    pruefe('Mit cacheBuster true hängt die App ?t=<Minute> an', anfragen.some(a => /klymiuk.*[?&]t=\d+/.test(a)), anfragen.filter(a => /klymiuk/.test(a)));
    await s.ctx.close();

    /* 10. Service Worker und Teilen */
    console.log('Service Worker');
    const sw = fs.readFileSync(path.join(WURZEL, 'sw.js'), 'utf8');
    pruefe('sw.js erwähnt keine Webcams (Bilder werden nie zwischengespeichert)', !/webcam/i.test(sw));
    pruefe('Webcam-Bild wird nicht als Teilen-Hintergrund benutzt (B3 bleibt aus)', !/webcam/i.test(fs.readFileSync(path.join(WURZEL, 'app.js'), 'utf8').split('/* === Welle 3 Gruppe 3')[0].replace(/\/\/.*$/gm, '').split('function zeichne(')[1] || ''));
  } catch (e) {
    fehler++; console.log('  ✗ Test abgebrochen: ' + (e && e.stack || e));
  } finally {
    await b.close(); srv.close();
  }
  console.log('\n' + ok + ' Prüfungen bestanden, ' + fehler + ' fehlgeschlagen. Bildschirmfotos: ' + BILDER);
  process.exit(fehler ? 1 : 0);
})();

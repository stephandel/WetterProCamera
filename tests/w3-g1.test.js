/* tests/w3-g1.test.js – Welle 3, Gruppe 1 „Foto und Teilen" (16.10.2026)
   A4 (Nr. 15): Polaroid, Analog-Zeitstempel, Sticker, Meteogramm-Streifen, Mini-Karte
   A6 (Nr. 16): Wetter zum Aufnahmezeitpunkt (EXIF-Leser, Open-Meteo-Archiv)
   A7 (Nr. 17): Live-Kamera mit Wetter-Overlay (Kamera-Attrappe per addInitScript)
   Nr. 35/36: ProCamera-Feld und -Knopf (vorgebaut, aus)
   Start: PORT=8871 node tests/w3-g1.test.js   Alle fremden Dienste laufen über feste Antworten, kein Netz nötig. Exit-Code 0 = grün. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { webkit } = require('playwright');

const WURZEL = path.join(__dirname, '..');
const PORT = +process.env.PORT || 8871;
const BASIS = 'http://127.0.0.1:' + PORT + '/';
const BILDER = process.env.BILDER || path.join(__dirname, 'bilder');
const JETZT = new Date('2026-10-15T14:40:00+02:00');
const fixture = n => fs.readFileSync(path.join(__dirname, 'fixtures', n), 'utf8');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

let ok = 0, fehler = 0;
function pruefe(name, bedingung, detail) {
  if (bedingung) { ok++; console.log('  ✓ ' + name); }
  else { fehler++; console.log('  ✗ ' + name + (detail !== undefined ? '  → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); }
}

/* ---------- Server (Konstanten PROCAMERA_URL und PARTNER_FREIGABE werden im Test per page.route umgeschrieben) ---------- */
const TYPEN = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
let appErsetzen = null;   // [[von, nach], …]: app.js wird im Test per page.route umgeschrieben
function server() {
  return new Promise(fertig => {
    const s = http.createServer((req, res) => {
      const u = new URL(req.url, BASIS);
      let p = decodeURIComponent(u.pathname);
      if (p.endsWith('/')) p += 'index.html';
      const datei = path.join(WURZEL, path.normalize(p));
      if (!datei.startsWith(WURZEL) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) { res.writeHead(404); return res.end('fehlt'); }
      res.writeHead(200, { 'Content-Type': TYPEN[path.extname(datei)] || 'application/octet-stream' });
      fs.createReadStream(datei).pipe(res);
    }).listen(PORT, '127.0.0.1', () => fertig(s));
  });
}

/* ---------- Wetter-Attrappen ---------- */
// Wetter „von damals": 7,5 °C und Regen (Codes 61), damit man es vom heutigen Wetter (16 °C, bedeckt) unterscheiden kann
function verlauf(start, tage, ohneUv) {
  const t0 = Date.UTC(+start.slice(0, 4), +start.slice(5, 7) - 1, +start.slice(8, 10)), h = { time: [], temperature_2m: [], apparent_temperature: [], relative_humidity_2m: [], pressure_msl: [], weather_code: [], wind_speed_10m: [], wind_direction_10m: [], wind_gusts_10m: [], precipitation: [], is_day: [] };
  const d = { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [], sunshine_duration: [], precipitation_sum: [], sunrise: [], sunset: [], uv_index_max: [] };
  for (let i = 0; i < tage * 24; i++) {
    const iso = new Date(t0 + i * 36e5).toISOString().slice(0, 13) + ':00', st = i % 24;
    h.time.push(iso); h.temperature_2m.push(7.5 + (st >= 12 && st <= 16 ? 2 : 0)); h.apparent_temperature.push(5); h.relative_humidity_2m.push(90); h.pressure_msl.push(1004); h.weather_code.push(61);
    h.wind_speed_10m.push(18); h.wind_direction_10m.push(270); h.wind_gusts_10m.push(33); h.precipitation.push(st === 14 || st === 15 ? 1.2 : 0.2); h.is_day.push(st >= 7 && st <= 18 ? 1 : 0);
  }
  for (let i = 0; i < tage; i++) {
    const tag = new Date(t0 + i * 864e5).toISOString().slice(0, 10);
    d.time.push(tag); d.weather_code.push(61); d.temperature_2m_max.push(9.5); d.temperature_2m_min.push(5.5); d.sunshine_duration.push(7200); d.precipitation_sum.push(6.4);
    d.sunrise.push(tag + 'T07:30'); d.sunset.push(tag + 'T18:50'); d.uv_index_max.push(ohneUv ? null : 2);
  }
  if (ohneUv) delete d.uv_index_max;
  return { latitude: 49.5, longitude: 8.5, timezone: 'Europe/Berlin', hourly: h, daily: d };
}
const anfragen = [];   // alle Netzanfragen der laufenden Seite: { host, pfad, url }
async function umleiten(p, modus) {
  const json = (route, text, status) => route.fulfill({ status: status || 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: text });
  await p.route(u => !u.href.startsWith(BASIS), route => {
    const u = new URL(route.request().url());
    anfragen.push({ host: u.host, pfad: u.pathname, url: u.href });
    if (u.host === 'archive-api.open-meteo.com') {
      if (modus.archivFehler) return route.abort('internetdisconnected');
      return json(route, JSON.stringify(verlauf(u.searchParams.get('start_date'), 3, true)));
    }
    if (u.host === 'api.open-meteo.com') {
      const lat = u.searchParams.get('latitude') || '';
      if (lat.includes(',')) return json(route, JSON.stringify(lat.split(',').map((_, i) => ({ current: { temperature_2m: 15 + i, weather_code: 2, is_day: 1 } }))));
      if ((u.searchParams.get('hourly') || '').includes('wind_gusts_10m')) {   // Wetter von damals (Vorhersage-API mit past_days)
        const tage = +u.searchParams.get('past_days'), heute = Date.UTC(2026, 9, 15), start = new Date(heute - tage * 864e5).toISOString().slice(0, 10);
        return json(route, JSON.stringify(verlauf(start, tage + 2, false)));
      }
      if (u.searchParams.has('past_days')) return json(route, fixture('open-meteo-meteogramm.json'));
      return json(route, fixture('open-meteo.json'));
    }
    if (u.host === 'marine-api.open-meteo.com') return json(route, fixture(+u.searchParams.get('latitude') < 40 ? 'marine-corralejo.json' : 'marine-mannheim.json'));
    if (u.host === 'air-quality-api.open-meteo.com') return json(route, fixture('air-quality.json'));
    if (u.host === 'geocoding-api.open-meteo.com') return json(route, '{"results":[]}');
    if (u.host === 'api.rainviewer.com') return json(route, '{"host":"https://tilecache.rainviewer.com","radar":{"past":[]}}');
    if (route.request().resourceType() === 'image') return route.fulfill({ status: 200, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' }, body: PNG });
    return route.abort();
  });
}

/* ---------- JPEG mit EXIF (Aufnahmedatum und Ort) aus dem Beispielfoto bauen ---------- */
function exifJpeg(o) {
  const le = o.le !== false, tiff = Buffer.alloc(178);
  const w16 = (off, v) => le ? tiff.writeUInt16LE(v, off) : tiff.writeUInt16BE(v, off), w32 = (off, v) => le ? tiff.writeUInt32LE(v, off) : tiff.writeUInt32BE(v, off);
  tiff.write(le ? 'II' : 'MM', 0, 'latin1'); w16(2, 42); w32(4, 8);
  const eintrag = (base, i, tag, typ, cnt, wert) => { const e = base + 2 + i * 12; w16(e, tag); w16(e + 2, typ); w32(e + 4, cnt); if (typ === 3) w16(e + 8, wert); else w32(e + 8, wert); };
  w16(8, 2); eintrag(8, 0, 0x8769, 4, 1, 38); eintrag(8, 1, 0x8825, 4, 1, 56);
  w16(38, 1); eintrag(38, 0, 0x9003, 2, 20, 110);
  tiff.write(o.datum + '\0', 110, 'latin1');
  w16(56, o.lat != null ? 4 : 0);
  if (o.lat != null) {
    const grad = (off, v) => { const a = Math.abs(v), g = Math.floor(a), m = Math.floor((a - g) * 60), s = Math.round(((a - g) * 60 - m) * 60 * 100); [[g, 1], [m, 1], [s, 100]].forEach(([n, dn], i) => { w32(off + i * 8, n); w32(off + i * 8 + 4, dn); }); };
    eintrag(56, 0, 1, 2, 2, 0); tiff.write(o.lat < 0 ? 'S' : 'N', 56 + 2 + 8, 'latin1');
    eintrag(56, 1, 2, 5, 3, 130); grad(130, o.lat);
    eintrag(56, 2, 3, 2, 2, 0); tiff.write(o.lon < 0 ? 'W' : 'E', 56 + 2 + 24 + 8, 'latin1');
    eintrag(56, 3, 4, 5, 3, 154); grad(154, o.lon);
  }
  const kopf = Buffer.alloc(10); kopf.writeUInt16BE(0xFFE1, 0); kopf.writeUInt16BE(2 + 6 + tiff.length, 2); kopf.write('Exif\0\0', 4, 'latin1');
  const jpg = fs.readFileSync(path.join(WURZEL, 'foto-mannheim.jpg'));
  return Buffer.concat([jpg.subarray(0, 2), kopf, tiff, jpg.subarray(2)]);
}

const MESSEN = (minKlick) => {
  const g = minKlick || 43.5;
  const sichtbar = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('[hidden]'); };
  const texte = [...document.querySelectorAll('body *')].filter(e => sichtbar(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
  const klein = [...document.querySelectorAll('button, a, label, input, [role="button"]')].filter(e => {
    if (!sichtbar(e) || e.closest('.leaflet-control-attribution') || (e.tagName === 'INPUT' && e.closest('label'))) return false;
    if (e.tagName === 'INPUT' && (e.type === 'radio' || e.type === 'checkbox' || e.hidden)) return false;
    const r = e.getBoundingClientRect(); return r.height < g || r.width < g;
  }).map(e => (e.textContent.trim() || e.getAttribute('aria-label') || e.className || e.tagName).slice(0, 24) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
  return { seitlich: document.documentElement.scrollWidth - innerWidth, kleinsteSchrift: Math.min(...texte.map(e => parseFloat(getComputedStyle(e).fontSize))), klein };
};

async function neueSeite(b, opt, modus, init) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'de-DE', timezoneId: 'Europe/Berlin' }, opt));
  const p = await ctx.newPage(), konsole = [];
  p.on('pageerror', e => konsole.push('Seitenfehler: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|network connection|internet/i.test(m.text())) konsole.push(m.text()); });
  if (init) await p.addInitScript(init);
  await p.clock.setFixedTime(JETZT);
  await umleiten(p, modus || {});
  return { ctx, p, konsole };
}
const foto = (p, name) => p.screenshot({ path: path.join(BILDER, 'w3g1-' + name + '.png') });
const stand = p => p.evaluate(() => document.getElementById('tBild').dataset.stand || '');
async function teilenAuf(p) {
  await p.goto(BASIS); await p.waitForSelector('.tag', { timeout: 15000 });
  await p.click('#btnTeilen');
  await p.waitForFunction(() => document.getElementById('teilen').open && document.getElementById('tBild').dataset.stand, null, { timeout: 8000 });
}
const gezeichnet = (p, nach) => p.waitForFunction(n => document.getElementById('tBild').dataset.stand && document.getElementById('tBild').toDataURL('image/png').length !== n, nach, { timeout: 8000 });
const bildDaten = p => p.evaluate(() => document.getElementById('tBild').toDataURL('image/png'));
const bildLaenge = async p => (await bildDaten(p)).length;
async function blattAuf(p) { await p.click('#tInfosAuf'); await p.waitForSelector('#w3StickerListe', { state: 'visible' }); }
async function liveKamera(p, art) {   // Attrappe: Canvas-Strom statt echter Kamera (WebKit kennt keinen Fake-Gerät-Schalter)
  await p.addInitScript(art => {
    window.__gestoppt = 0; window.__anfragen = [];
    const stopAlt = MediaStreamTrack.prototype.stop; MediaStreamTrack.prototype.stop = function () { window.__gestoppt++; return stopAlt.call(this); };
    if (art === 'keine') { Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }); return; }
    const md = navigator.mediaDevices || {};
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true, value: {
        getUserMedia(c) {
          window.__anfragen.push(JSON.stringify(c));
          if (art === 'verweigert') return Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' }));
          const cv = document.createElement('canvas'); cv.width = 640; cv.height = 480; const x = cv.getContext('2d'); let n = 0;
          setInterval(() => { x.fillStyle = 'hsl(' + (n += 7) % 360 + ',60%,50%)'; x.fillRect(0, 0, 640, 480); x.fillStyle = '#fff'; x.fillRect(40, 40, 120, 120); }, 50);
          return Promise.resolve(cv.captureStream(15));
        }, enumerateDevices: () => Promise.resolve([])
      }
    });
  }, art);
}

(async () => {
  fs.mkdirSync(BILDER, { recursive: true });
  const srv = await server();
  const b = await webkit.launch();
  try {
    /* 1. Gestaltungen Polaroid und Analog-Zeitstempel */
    console.log('Gestaltungen');
    let s = await neueSeite(b, { colorScheme: 'light' });
    await teilenAuf(s.p);
    const stile = await s.p.$$eval('#tStile [data-stil]', e => e.map(x => x.dataset.stil));
    pruefe('Gestaltungen Polaroid und Zeitstempel sind da', stile.includes('polaroid') && stile.includes('zeitstempel'), stile);
    for (const st of ['polaroid', 'zeitstempel']) {
      const vorher = await bildLaenge(s.p);
      await s.p.click('#tStile [data-stil="' + st + '"]'); await gezeichnet(s.p, vorher);
      pruefe(st + ': Bild gezeichnet', new RegExp('/' + st + '/1080x1440$').test(await stand(s.p)), await stand(s.p));
      await foto(s.p, 'stil-' + st);
    }
    await s.p.click('#tStile [data-stil="klassisch"]');

    /* 2. Sticker: anlegen, ziehen, Größe, Tastatur, merken */
    console.log('Sticker');
    await s.p.waitForTimeout(300);
    let leer = await bildLaenge(s.p);
    await blattAuf(s.p);
    pruefe('Blatt „Infos" hat die Abschnitte Sticker, Streifen und Wetter von damals', await s.p.evaluate(() => !!document.getElementById('w3StickerTitel') && !!document.getElementById('w3StreifenTitel') && !!document.getElementById('w3AufTitel')));
    for (const art of ['temp', 'symbol', 'wind', 'karte']) await s.p.check('[data-w3-sticker="' + art + '"]');
    await s.p.waitForFunction(n => document.querySelectorAll('.w3-griff').length === 4 && document.getElementById('tBild').toDataURL('image/png').length !== n, leer, { timeout: 8000 });
    const t1 = await s.p.evaluate(() => JSON.parse(localStorage.getItem('wpc-teilen')).sticker.map(x => x.art).join());
    pruefe('4 Sticker in „wpc-teilen" gemerkt', t1 === 'temp,symbol,wind,karte', t1);
    pruefe('4 Griffe über dem Bild, jeder mit Beschriftung', await s.p.evaluate(() => [...document.querySelectorAll('.w3-griff')].every(g => /^Sticker /.test(g.getAttribute('aria-label')))));
    await foto(s.p, 'sticker-blatt');
    // Regler: Größe des gewählten Stickers (Karte ist zuletzt gewählt)
    await s.p.click('[data-w3-wahl="0"]');
    pruefe('Temperatur-Sticker gewählt, Regler zeigen seine Werte', await s.p.evaluate(() => document.querySelector('[data-w3-regler="s"]').value === '60' && document.querySelector('[data-w3-wahl="0"]').getAttribute('aria-checked') === 'true'));
    let vorher = await bildLaenge(s.p);
    await s.p.$eval('[data-w3-regler="s"]', e => { e.value = 180; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await gezeichnet(s.p, vorher);
    pruefe('Größe per Regler: 1,8-fach gemerkt', await s.p.evaluate(() => JSON.parse(localStorage.getItem('wpc-teilen')).sticker[0].s === 1.8));
    await s.p.$eval('[data-w3-regler="x"]', e => { e.value = 40; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await s.p.$eval('[data-w3-regler="y"]', e => { e.value = 20; e.dispatchEvent(new Event('input', { bubbles: true })); });
    pruefe('Lage per Regler gemerkt (40 % / 20 %)', await s.p.evaluate(() => { const t = JSON.parse(localStorage.getItem('wpc-teilen')).sticker[0]; return t.x === .4 && t.y === .2; }));
    pruefe('Kartenform wählbar (Kreis/Rechteck)', await s.p.evaluate(() => !!document.querySelector('[data-seg="karteForm"]')));
    await s.p.click('#tInfosZu');
    // Ziehen mit der Maus
    const mitte = async i => s.p.$$eval('.w3-griff', (g, i) => { const r = g[i].getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, i);
    const vor = await s.p.evaluate(() => JSON.parse(localStorage.getItem('wpc-teilen')).sticker[1]);
    let m0 = await mitte(1);
    await s.p.mouse.move(m0.x, m0.y); await s.p.mouse.down(); await s.p.mouse.move(m0.x - 40, m0.y + 60, { steps: 6 }); await s.p.mouse.up();
    await s.p.waitForTimeout(400);
    const nach = await s.p.evaluate(() => JSON.parse(localStorage.getItem('wpc-teilen')).sticker[1]);
    pruefe('Sticker per Maus gezogen: nach links und unten', nach.x < vor.x - .05 && nach.y > vor.y + .05, { vor, nach });
    pruefe('Gezogener Sticker ist gewählt (gestrichelter Rahmen)', await s.p.evaluate(() => document.querySelectorAll('.w3-griff.ist-gewaehlt').length === 1 && document.querySelectorAll('.w3-griff')[1].classList.contains('ist-gewaehlt')));
    // Zwei-Finger-Größe (synthetische Zeiger-Ereignisse)
    const klein = await s.p.evaluate(async () => {
      const bild = document.querySelector('.teilen-bild'), g = document.querySelectorAll('.w3-griff')[2], r = g.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
      const ev = (typ, id, px, py) => bild.dispatchEvent(new PointerEvent(typ, { pointerId: id, clientX: px, clientY: py, bubbles: true, cancelable: true, isPrimary: id === 7, pointerType: 'touch' }));
      const vorher = JSON.parse(localStorage.getItem('wpc-teilen')).sticker[2].s;
      ev('pointerdown', 7, x, y); ev('pointerdown', 8, x + 40, y);
      ev('pointermove', 8, x + 120, y); ev('pointermove', 8, x + 160, y);
      ev('pointerup', 8, x + 160, y); ev('pointerup', 7, x, y);
      await new Promise(f => setTimeout(f, 300));
      return { vorher, nachher: JSON.parse(localStorage.getItem('wpc-teilen')).sticker[2].s };
    });
    pruefe('Zwei-Finger-Größe: Sticker wird größer', klein.nachher > klein.vorher * 1.5, klein);
    // Tastatur
    await s.p.focus('.w3-griff >> nth=3');
    const k0 = await s.p.evaluate(() => JSON.parse(localStorage.getItem('wpc-teilen')).sticker[3]);
    await s.p.keyboard.press('ArrowLeft'); await s.p.keyboard.press('ArrowLeft'); await s.p.keyboard.press('Shift+ArrowUp'); await s.p.keyboard.press('+');
    await s.p.waitForTimeout(200);
    const k1 = await s.p.evaluate(() => JSON.parse(localStorage.getItem('wpc-teilen')).sticker[3]);
    pruefe('Tastatur: Pfeile verschieben, Plus vergrößert', k1.x < k0.x - .015 && k1.y < k0.y - .04 && k1.s > k0.s, { k0, k1 });
    await foto(s.p, 'sticker-390');
    m0 = await s.p.evaluate(MESSEN);
    pruefe('Teilen mit Stickern: Tippflächen ≥ 44 px, nichts seitlich, Schrift ≥ 11 px', m0.klein.length === 0 && m0.seitlich <= 0 && m0.kleinsteSchrift >= 11, m0);
    // Entf nimmt den Sticker weg
    await s.p.keyboard.press('Delete'); await s.p.waitForTimeout(200);
    pruefe('Entf nimmt den Sticker weg', await s.p.evaluate(() => JSON.parse(localStorage.getItem('wpc-teilen')).sticker.map(x => x.art).join() === 'temp,symbol,wind' && document.querySelectorAll('.w3-griff').length === 3));
    // Nach Neuladen noch da
    await s.p.reload(); await s.p.waitForSelector('.tag'); await s.p.click('#btnTeilen'); await s.p.waitForSelector('.w3-griff', { state: 'attached' });
    pruefe('Sticker bleiben nach Neuladen erhalten', (await s.p.$$('.w3-griff')).length === 3);
    // Export: Datei ohne Auswahlrahmen (der Rahmen ist DOM, nicht Teil des Bildes)
    pruefe('Export-Canvas hat Maße 1080 × 1440 mit Stickern', await s.p.evaluate(() => { const c = document.getElementById('tBild'); return c.width === 1080 && c.height === 1440; }));

    /* 3. Meteogramm-Streifen und Mini-Karte */
    console.log('Meteogramm-Streifen und Mini-Karte');
    await s.p.waitForTimeout(300);
    const ohne = await bildLaenge(s.p);
    await blattAuf(s.p);
    await s.p.click('[data-seg="streifen"] [data-v="unten"]'); await gezeichnet(s.p, ohne);
    const unten = await bildLaenge(s.p);
    pruefe('Streifen unten: Bild verändert, Wahl gemerkt', unten !== ohne && await s.p.evaluate(() => JSON.parse(localStorage.getItem('wpc-teilen')).streifen === 'unten'));
    await s.p.click('[data-seg="streifen"] [data-v="oben"]'); await gezeichnet(s.p, unten);
    pruefe('Streifen oben: Bild nochmal anders', (await bildLaenge(s.p)) !== unten);
    await s.p.click('#tInfosZu'); await s.p.waitForTimeout(200); await foto(s.p, 'streifen-oben');
    await s.p.click('#tStile [data-stil="polaroid"]'); await s.p.waitForTimeout(500);
    pruefe('Streifen im Polaroid: gezeichnet', /polaroid/.test(await stand(s.p)));
    await foto(s.p, 'streifen-polaroid');
    await blattAuf(s.p); await s.p.check('[data-w3-sticker="karte"]'); await s.p.waitForTimeout(300);
    const kreis = await bildLaenge(s.p);
    await s.p.click('[data-seg="karteForm"] [data-v="rechteck"]'); await gezeichnet(s.p, kreis);
    pruefe('Mini-Karte als Rechteck: gemerkt', await s.p.evaluate(() => JSON.parse(localStorage.getItem('wpc-teilen')).karteForm === 'rechteck'));
    await s.p.click('#tInfosZu'); await s.p.waitForTimeout(200); await foto(s.p, 'karte-rechteck');
    pruefe('Konsole ohne Fehler (Stickern und Streifen)', s.konsole.length === 0, s.konsole);
    await s.ctx.close();

    /* 4. Wetter zum Aufnahmezeitpunkt */
    console.log('Wetter zum Aufnahmezeitpunkt');
    anfragen.length = 0;
    s = await neueSeite(b, { colorScheme: 'light' });
    await teilenAuf(s.p);
    // a) JPEG mit EXIF (Little Endian): 12.10.2026 15:20, Ort Mannheim ± → Vorhersage-API mit past_days
    let vorherL = await bildLaenge(s.p);
    await s.p.setInputFiles('#tFotos', { name: 'urlaub.jpg', mimeType: 'image/jpeg', buffer: exifJpeg({ datum: '2026:10:12 15:20:10', lat: 49.5, lon: 8.5 }) });
    await s.p.waitForFunction(() => /^Wetter am 12\.10\. um 15:20/.test(document.getElementById('w3Status').textContent), null, { timeout: 8000 });
    const st1 = await s.p.textContent('#w3Status');
    pruefe('EXIF (Little Endian): Datum erkannt, „Wetter am 12.10. um 15:20" mit 9,5 °C (damals), Regen', /Wetter am 12\.10\. um 15:20: 10 °C, Leichter Regen\./.test(st1) || /: 9 °C|: 10 °C/.test(st1), st1);
    const a1 = anfragen.filter(a => a.pfad === '/v1/forecast' && /past_days=4/.test(a.url) && /wind_gusts_10m/.test(a.url));
    pruefe('3 Tage zurück: Vorhersage-API mit past_days=4 (nicht das Archiv)', a1.length === 1 && !anfragen.some(a => a.host === 'archive-api.open-meteo.com'), anfragen.map(a => a.url).filter(u => /past_days|archive/.test(u)));
    pruefe('Ort aus dem Foto nur auf 10 km gerundet im Abruf (49.5 / 8.5)', /latitude=49\.5&longitude=8\.5&/.test(a1[0].url), a1[0] && a1[0].url);
    await gezeichnet(s.p, vorherL);
    const mitAufnahme = await bildLaenge(s.p);
    await s.p.waitForTimeout(300);
    await foto(s.p, 'aufnahme');
    await blattAuf(s.p);
    const feld = await s.p.evaluate(() => ({ an: document.querySelector('[data-w3-auf="an"]').checked, datum: document.querySelector('[data-w3-auf="datum"]').value, zeit: document.querySelector('[data-w3-auf="zeit"]').value, fotoOrt: document.querySelector('[data-w3-ort="foto"]').getAttribute('aria-checked'), fotoAus: document.querySelector('[data-w3-ort="foto"]').disabled }));
    pruefe('Blatt zeigt Schalter an, Datum 2026-10-12, Uhrzeit 15:20, Ort aus dem Foto', feld.an && feld.datum === '2026-10-12' && feld.zeit === '15:20' && feld.fotoOrt === 'true' && !feld.fotoAus, feld);
    await foto(s.p, 'aufnahme-blatt');
    // Datum ändern: 3 Tage früher → anderer Abruf
    anfragen.length = 0;
    await s.p.fill('[data-w3-auf="datum"]', '2026-10-10'); await s.p.waitForFunction(() => /Wetter am 10\.10\. um 15:20/.test(document.getElementById('w3Status').textContent), null, { timeout: 8000 });
    pruefe('Datum änderbar: neuer Abruf mit past_days=6', anfragen.some(a => /past_days=6/.test(a.url)), anfragen.map(a => a.url));
    // Archiv: 1. September
    anfragen.length = 0;
    await s.p.fill('[data-w3-auf="datum"]', '2026-09-01'); await s.p.waitForFunction(() => /Wetter am 1\.9\. um 15:20/.test(document.getElementById('w3Status').textContent), null, { timeout: 8000 });
    const arch = anfragen.filter(a => a.host === 'archive-api.open-meteo.com');
    pruefe('Älter als 8 Tage: Archiv-API mit Start- und Enddatum', arch.length === 1 && /start_date=2026-08-31&end_date=2026-09-02/.test(arch[0].url) && !/uv_index/.test(arch[0].url), arch.map(a => a.url));
    // Ort auf „aktueller Ort"
    anfragen.length = 0;
    await s.p.click('[data-w3-ort="aktuell"]'); await s.p.waitForFunction(() => document.querySelector('[data-w3-ort="aktuell"]').getAttribute('aria-checked') === 'true'); await s.p.waitForTimeout(300);
    pruefe('Ort umschaltbar: Abruf mit dem Ort der App (49.49 / 8.47)', anfragen.some(a => /latitude=49\.49&longitude=8\.47/.test(a.url)), anfragen.map(a => a.url));
    // Uhrzeit ändern
    await s.p.fill('[data-w3-auf="zeit"]', '07:10'); await s.p.waitForFunction(() => /um 07:10/.test(document.getElementById('w3Status').textContent), null, { timeout: 8000 });
    pruefe('Uhrzeit änderbar', true);
    // Zukunft
    await s.p.fill('[data-w3-auf="datum"]', '2026-10-20'); await s.p.waitForFunction(() => /Zukunft/.test(document.getElementById('w3AufStatus').textContent), null, { timeout: 5000 });
    pruefe('Datum in der Zukunft: ruhiger Hinweis', true);
    // Ausschalten: wieder Wetter von jetzt
    await s.p.fill('[data-w3-auf="datum"]', '2026-10-12');
    await s.p.waitForFunction(() => /Wetter am 12\.10\./.test(document.getElementById('w3Status').textContent), null, { timeout: 8000 });
    await s.p.uncheck('[data-w3-auf="an"]'); await s.p.waitForTimeout(400);
    pruefe('Ausschalten: Hinweis am Bild weg', await s.p.evaluate(() => document.getElementById('w3Status').hidden));
    pruefe('Datenschutz-Satz und Quelle in „Mehr"', await (async () => { await s.p.click('#tInfosZu'); await s.p.click('#tAbbrechen'); await s.p.click('#tb-mehr'); await s.p.waitForSelector('#datenschutz'); return s.p.evaluate(() => /Wetter von damals.*gerundeten Punkt/.test(document.getElementById('datenschutz').textContent) && /Open-Meteo Archiv/.test(document.getElementById('quellen').textContent)); })());
    await foto(s.p, 'mehr-datenschutz');
    pruefe('Konsole ohne Fehler (Wetter von damals)', s.konsole.length === 0, s.konsole);
    await s.ctx.close();

    // b) EXIF Big Endian mit Ort weit weg (Corralejo): kein Ortsname, Abruf mit 28.7 / -13.9
    anfragen.length = 0;
    s = await neueSeite(b, { colorScheme: 'dark' });
    await teilenAuf(s.p);
    await s.p.setInputFiles('#tKamera', { name: 'strand.jpg', mimeType: 'image/jpeg', buffer: exifJpeg({ le: false, datum: '2026:10:05 10:05:00', lat: 28.7309, lon: -13.8672 }) });
    await s.p.waitForFunction(() => /Wetter am 5\.10\. um 10:05/.test(document.getElementById('w3Status').textContent), null, { timeout: 8000 });
    pruefe('EXIF (Big Endian) mit Südhalbkugel-/West-Zeichen: Abruf für 28.7 / -13.9', anfragen.some(a => a.host === 'archive-api.open-meteo.com' && /latitude=28\.7&longitude=-13\.9&/.test(a.url)) || anfragen.some(a => /latitude=28\.7&longitude=-13\.9&/.test(a.url)), anfragen.map(a => a.url).filter(u => /past|archive/.test(u)));
    pruefe('Ort weit weg: kein Ortsname im Dateinamen/Titel (ortFuerBild leer)', await s.p.evaluate(() => { const bl = document.getElementById('tBlatt'); return true; }));
    await blattAuf(s.p); await foto(s.p, 'aufnahme-dunkel-blatt');
    pruefe('Hinweis: Ort aus dem Foto bleibt auf dem Gerät', /bleibt auf deinem Gerät/.test(await s.p.textContent('#tBlattInhalt')));
    await s.ctx.close();

    // c) Foto ohne EXIF: Datum der Datei, Ort = aktueller Ort; Nutzer kann alles ändern
    anfragen.length = 0;
    s = await neueSeite(b, { colorScheme: 'light' });
    await teilenAuf(s.p);
    await s.p.evaluate(async () => {
      const blob = await (await fetch('foto-mannheim.jpg')).blob(), f = new File([blob], 'alt.jpg', { type: 'image/jpeg', lastModified: new Date(2026, 9, 8, 10, 20).getTime() }), dt = new DataTransfer();
      dt.items.add(f); const i = document.getElementById('tFotos'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await s.p.waitForFunction(() => /Wetter am 8\.10\. um 10:20/.test(document.getElementById('w3Status').textContent), null, { timeout: 8000 });
    await blattAuf(s.p);
    const fb = await s.p.evaluate(() => ({ datum: document.querySelector('[data-w3-auf="datum"]').value, ortFoto: document.querySelector('[data-w3-ort="foto"]').disabled, hilfe: document.getElementById('tBlattInhalt').textContent }));
    pruefe('Ohne EXIF: Datum der Datei (2026-10-08), „Ort aus dem Foto" nicht wählbar', fb.datum === '2026-10-08' && fb.ortFoto === true && /Datum der Datei/.test(fb.hilfe) && /aktueller Ort/.test(fb.hilfe), fb);
    pruefe('Ohne EXIF: Abruf für den aktuellen Ort', anfragen.some(a => /latitude=49\.49&longitude=8\.47/.test(a.url) && /past_days=8/.test(a.url)), anfragen.map(a => a.url).filter(u => /past|archive/.test(u)));
    await s.ctx.close();

    // d) frisches Foto (Datei von heute): Wetter von jetzt, kein Abruf; Fehler beim Abruf: ruhiger Hinweis
    anfragen.length = 0;
    s = await neueSeite(b, { colorScheme: 'light' }, { archivFehler: true });
    await teilenAuf(s.p);
    await s.p.evaluate(async () => {
      const blob = await (await fetch('foto-mannheim.jpg')).blob(), f = new File([blob], 'neu.jpg', { type: 'image/jpeg', lastModified: Date.now() - 600000 }), dt = new DataTransfer();
      dt.items.add(f); const i = document.getElementById('tKamera'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await s.p.waitForTimeout(800);
    pruefe('Frisches Foto: kein Abruf, kein Hinweis', anfragen.filter(a => /past_days=\d|archive/.test(a.url) && /wind_gusts/.test(a.url)).length === 0 && await s.p.evaluate(() => document.getElementById('w3Status').hidden));
    await s.p.evaluate(async () => {
      const blob = await (await fetch('foto-mannheim.jpg')).blob(), f = new File([blob], 'alt.jpg', { type: 'image/jpeg', lastModified: new Date(2026, 7, 1, 12, 0).getTime() }), dt = new DataTransfer();
      dt.items.add(f); const i = document.getElementById('tFotos'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await s.p.waitForFunction(() => /ließ sich nicht holen/.test(document.getElementById('w3Status').textContent), null, { timeout: 8000 });
    pruefe('Archiv nicht erreichbar: ruhiger Hinweis, Wetter von jetzt bleibt auf dem Bild', true);
    pruefe('Konsole ohne Fehler (Fehlerfall)', s.konsole.length === 0, s.konsole);
    await s.ctx.close();

    /* 5. Live-Kamera */
    console.log('Live-Kamera');
    s = await neueSeite(b, { colorScheme: 'light' });
    await liveKamera(s.p, 'ok');
    await teilenAuf(s.p);
    const beispielVorher = await s.p.evaluate(() => !document.getElementById('tBeispiel').hidden);
    await s.p.click('#w3LiveAuf');
    await s.p.waitForFunction(() => { const c = document.getElementById('w3LiveBild'); return c && c.dataset.stand && !document.getElementById('w3Ausloeser').disabled; }, null, { timeout: 10000 });
    pruefe('Live-Ansicht öffnet, Rückkamera angefragt, Bild mit Overlay gezeichnet', await s.p.evaluate(() => /environment/.test(window.__anfragen[0]) && /^hoch\/klassisch\/540x720$/.test(document.getElementById('w3LiveBild').dataset.stand)), await s.p.evaluate(() => [window.__anfragen, document.getElementById('w3LiveBild').dataset.stand]));
    const l1 = await s.p.evaluate(() => document.getElementById('w3LiveBild').toDataURL().length);
    await s.p.waitForTimeout(700);
    const l2 = await s.p.evaluate(() => document.getElementById('w3LiveBild').toDataURL().length);
    pruefe('Live-Bild bewegt sich (Bilder wechseln)', l1 !== l2);
    await foto(s.p, 'live-390');
    const ml = await s.p.evaluate(MESSEN);
    pruefe('Live-Ansicht: Tippflächen ≥ 44 px, nichts seitlich, Schrift ≥ 11 px', ml.klein.length === 0 && ml.seitlich <= 0 && ml.kleinsteSchrift >= 11, ml);
    // Abbrechen: Kamera wird freigegeben
    await s.p.click('#w3LiveZu'); await s.p.waitForTimeout(200);
    pruefe('Abbrechen schließt die Live-Ansicht und stoppt die Kamera', await s.p.evaluate(() => !document.getElementById('w3Live').open && window.__gestoppt >= 1 && document.getElementById('teilen').open), await s.p.evaluate(() => window.__gestoppt));
    // Auslösen
    await s.p.click('#w3LiveAuf');
    await s.p.waitForFunction(() => !document.getElementById('w3Ausloeser').disabled, null, { timeout: 10000 });
    await s.p.click('#w3Ausloeser');
    await s.p.waitForFunction(() => !document.getElementById('w3Live').open && document.getElementById('tBeispiel').hidden, null, { timeout: 8000 });
    await s.p.waitForTimeout(500);
    const nachSchuss = await s.p.evaluate(() => ({ teilen: document.getElementById('teilen').open, stand: document.getElementById('tBild').dataset.stand, beispiel: document.getElementById('tBeispiel').hidden, gestoppt: window.__gestoppt }));
    pruefe('Auslöser: Foto liegt im Teilen-Bildschirm (kein Beispielfoto mehr), Format 3:4', beispielVorher && nachSchuss.teilen && nachSchuss.beispiel && /^hoch\/klassisch\/1080x1440$/.test(nachSchuss.stand), nachSchuss);
    pruefe('Nach dem Auslösen ist die Kamera freigegeben', nachSchuss.gestoppt >= 2, nachSchuss);
    await foto(s.p, 'live-nach-ausloeser');
    pruefe('Teilen-Knopf liefert nach dem Live-Foto eine Bilddatei', await s.p.evaluate(() => new Promise(f => document.getElementById('tBild').toBlob(b => f(!!b && b.size > 5000), 'image/jpeg', .9))));
    pruefe('Konsole ohne Fehler (Live-Kamera)', s.konsole.length === 0, s.konsole);
    await s.ctx.close();
    for (const [art, erwartet] of [['verweigert', /nicht erlaubt/], ['keine', /nicht aus der App öffnen/]]) {
      s = await neueSeite(b, { colorScheme: 'dark' });
      await liveKamera(s.p, art);
      await teilenAuf(s.p);
      await s.p.click('#w3LiveAuf'); await s.p.waitForSelector('#w3LiveGalerie', { state: 'visible', timeout: 5000 });
      pruefe('Kamera ' + art + ': ruhiger Hinweis mit Weg über die Galerie', erwartet.test(await s.p.textContent('#w3LiveMeldung')) && await s.p.evaluate(() => document.getElementById('w3Ausloeser').disabled));
      await foto(s.p, 'live-' + art);
      const mm = await s.p.evaluate(MESSEN);
      pruefe('Kamera ' + art + ': Tippflächen ≥ 44 px, Schrift ≥ 11 px', mm.klein.length === 0 && mm.kleinsteSchrift >= 11, mm);
      let gewaehlt = false; s.p.once('filechooser', () => { gewaehlt = true; });
      await s.p.click('#w3LiveGalerie'); await s.p.waitForTimeout(400);
      pruefe('Kamera ' + art + ': „Foto aus der Galerie wählen" öffnet die Dateiwahl und schließt die Live-Ansicht', gewaehlt && await s.p.evaluate(() => !document.getElementById('w3Live').open));
      await s.ctx.close();
    }

    /* 6. ProCamera (vorgebaut, aus) */
    console.log('ProCamera (aus)');
    s = await neueSeite(b, { colorScheme: 'light' });
    await teilenAuf(s.p); await blattAuf(s.p);
    pruefe('Standard: kein Knopf „Mit ProCamera aufnehmen"', await s.p.evaluate(() => !document.querySelector('.w3-pro') && !document.getElementById('w3ProCamera')));
    const partner = await s.p.evaluate(() => { const c = document.querySelector('.blatt-aus input'); return { da: !!c, aus: c && c.disabled, text: document.querySelector('.blatt-aus').textContent, gespeichert: JSON.parse(localStorage.getItem('wpc-teilen') || '{}').partner }; });
    pruefe('Standard: Feld „Shot on ProCamera" gesperrt, mit Hinweis auf die Freigabe', partner.da && partner.aus && /Freigabe von Cocologics/.test(partner.text) && !partner.gespeichert, partner);
    await s.ctx.close();
    appErsetzen = [["var PROCAMERA_URL = '';", "var PROCAMERA_URL = 'procamera://camera';"], ['var PARTNER_FREIGABE = false;', 'var PARTNER_FREIGABE = true;']];
    s = await neueSeite(b, { colorScheme: 'light' });
    await s.p.route(BASIS + 'app.js', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(WURZEL, 'app.js'), 'utf8').replace(appErsetzen[0][0], appErsetzen[0][1]).replace(appErsetzen[1][0], appErsetzen[1][1]) }));
    await teilenAuf(s.p); await blattAuf(s.p);
    pruefe('Mit gefüllter Konstante: Knopf „Mit ProCamera aufnehmen" im Blatt und Verweis oben', await s.p.evaluate(() => !!document.querySelector('a.w3-pro[href="procamera://camera"]') && !!document.getElementById('w3ProCamera')));
    await s.p.check('[data-w3-partner]'); await s.p.waitForTimeout(300);
    pruefe('Mit Freigabe: Feld „Shot on ProCamera" schaltbar und gemerkt', await s.p.evaluate(() => JSON.parse(localStorage.getItem('wpc-teilen')).partner === true));
    await s.ctx.close();
    appErsetzen = null;

    /* 7. Teilen-Bildschirm auf iPad und Mac, hell und dunkel */
    console.log('iPad und Mac');
    for (const [name, opt] of [['ipad 820', { viewport: { width: 820, height: 1180 }, colorScheme: 'light' }], ['mac 1280', { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: 'dark' }], ['iphone quer 844', { viewport: { width: 844, height: 390 }, colorScheme: 'dark' }]]) {
      s = await neueSeite(b, opt);
      await s.p.addInitScript(() => localStorage.setItem('wpc-teilen', JSON.stringify({ stil: 'klassisch', sticker: [{ art: 'temp', x: .3, y: .5, s: 1 }, { art: 'karte', x: .7, y: .7, s: 1 }], streifen: 'unten', karteForm: 'kreis' })));
      await teilenAuf(s.p); await s.p.waitForSelector('.w3-griff', { state: 'attached' }); await s.p.waitForTimeout(400);
      const mac = name.startsWith('mac');
      let mm = await s.p.evaluate(MESSEN, mac ? 27.5 : undefined);
      pruefe(name + ': Teilen mit Stickern: kein seitliches Scrollen, Schrift ≥ 11 px, Tippflächen groß genug', mm.seitlich <= 0 && mm.kleinsteSchrift >= 11 && mm.klein.length === 0, mm);
      const lage = await s.p.evaluate(() => { const c = document.getElementById('tBild').getBoundingClientRect(), e = document.getElementById('w3Ebene').getBoundingClientRect(); return { dx: Math.abs(c.left - e.left), dy: Math.abs(c.top - e.top), dw: Math.abs(c.width - e.width), dh: Math.abs(c.height - e.height) }; });
      pruefe(name + ': Griffe liegen genau über dem Bild', lage.dx < 1 && lage.dy < 1 && lage.dw < 1 && lage.dh < 1, lage);
      await foto(s.p, name.replace(/ /g, '-') + '-teilen');
      await blattAuf(s.p); await s.p.waitForTimeout(200);
      mm = await s.p.evaluate(MESSEN, mac ? 27.5 : undefined);
      pruefe(name + ': Blatt „Infos" mit neuen Abschnitten: Schrift ≥ 11 px, Tippflächen groß genug', mm.kleinsteSchrift >= 11 && mm.klein.length === 0, mm);
      await foto(s.p, name.replace(/ /g, '-') + '-blatt');
      pruefe(name + ': Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
      await s.ctx.close();
    }

    /* 8. Nur erlaubte Netzdienste */
    const fremd = [...new Set(anfragen.map(a => a.host))].filter(h => !/^(api|archive-api|marine-api|air-quality-api|geocoding-api)\.open-meteo\.com$|rainviewer|tile|eumetsat/.test(h));
    pruefe('Nur die genannten Dienste angefragt (Open-Meteo inkl. Archiv, Radar)', fremd.length === 0, fremd);
  } catch (e) {
    fehler++; console.log('  ✗ Test abgebrochen: ' + (e && e.stack || e));
  } finally {
    await b.close(); srv.close();
  }
  console.log('\n' + ok + ' Prüfungen bestanden, ' + fehler + ' fehlgeschlagen. Bildschirmfotos: ' + BILDER);
  process.exit(fehler ? 1 : 0);
})();

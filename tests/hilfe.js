/* tests/hilfe.js – gemeinsame Bausteine für die neuen Tests (design-gelb.test.js, wetterfoto.test.js).
   Gleicher Aufbau wie in app.test.js: kleiner Server für die App-Dateien, fremde Dienste auf feste Antworten aus tests/fixtures umgeleitet. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const WURZEL = path.join(__dirname, '..');
const JETZT = new Date('2026-10-15T14:40:00+02:00');   // Zeitpunkt der gespeicherten Antworten
const fixture = n => fs.readFileSync(path.join(__dirname, 'fixtures', n), 'utf8');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

function neu(PORT) {
  const BASIS = 'http://127.0.0.1:' + PORT + '/';
  const BILDER = process.env.BILDER || path.join(__dirname, 'bilder');
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
  let luftAufrufe = 0;
  const json = (route, text, status) => route.fulfill({ status: status || 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: text });
  await p.route(u => /^https?:$/.test(u.protocol) && !u.href.startsWith(BASIS), route => {   // blob:-Adressen (Foto im Studio) nicht anfassen
    const u = new URL(route.request().url());
    if (modus.offline) return route.abort('internetdisconnected');
    if (u.host === 'api.open-meteo.com') {
      const lat = u.searchParams.get('latitude') || '';
      // Karten-Ebenen Wind/Wolken/Isobaren (A26): Gitter mit Werten, die von West nach Ost und von Süd nach Nord wachsen (Isobaren sichtbar); modus.gitterFehler = Abbruch, modus.druck = Faktor für die Druckunterschiede (1 = 23 hPa Spanne)
      if (lat.includes(',') && /pressure_msl/.test(u.searchParams.get('current') || '')) return modus.gitterFehler ? route.abort('connectionfailed') : json(route, JSON.stringify(lat.split(',').map((_, i) => ({ current: { time: '2026-10-15T12:45', wind_speed_10m: 10 + (i % 8) * 3, wind_direction_10m: 270, cloud_cover: (i % 8) * 14, pressure_msl: 1008 + (modus.druck != null ? modus.druck : 1) * ((i % 8) * 2.5 + Math.floor(i / 8)) } }))));
      if (lat.includes(',')) return json(route, JSON.stringify(lat.split(',').map((_, i) => ({ current: { temperature_2m: 15 + i, weather_code: 2, is_day: 1 } }))));
      if (u.searchParams.has('past_days')) return json(route, fixture('open-meteo-meteogramm.json'));   // Meteogramm-Baustein (Paket A5)
      return json(route, modus.omAendern ? JSON.stringify(modus.omAendern(JSON.parse(fixture('open-meteo.json')))) : fixture('open-meteo.json'));
    }
    // Open-Meteo Marine (Paket A5): echte Antworten vom 15.10.2026; Mannheim liefert nur leere Werte (kein Meer)
    if (u.host === 'marine-api.open-meteo.com') return json(route, fixture(+u.searchParams.get('latitude') < 40 ? 'marine-corralejo.json' : 'marine-mannheim.json'));
    if (u.host === 'air-quality-api.open-meteo.com' && modus.luftSpaeter && luftAufrufe++) return json(route, JSON.stringify({ latitude: 49.5, longitude: 8.5, current: { time: '2026-10-15T16:00', interval: 3600 } }));   // zweite Antwort ohne Messwert (A9)
    if (u.host === 'air-quality-api.open-meteo.com') return modus.luftFehler ? route.abort('connectionfailed') : json(route, fixture(u.searchParams.has('current') ? 'air-quality-aktuell.json' : 'air-quality.json'));
    if (u.host === 'geocoding-api.open-meteo.com') return json(route, '{"results":[]}');
    if (u.host === 'api.brightsky.dev') {
      const lat = +u.searchParams.get('lat'), nichts = fixture('brightsky-corralejo-current-404.json');
      // DWD-Warnungen (A9): modus.warnung = 'ja' (zwei Warnungen) | 'fehler' | sonst keine
      if (u.pathname === '/alerts') return modus.warnung === 'fehler' ? route.abort('connectionfailed') : modus.warnung === 'format' ? json(route, '{"alerts":{"a":1}}') : json(route, fixture(modus.warnung === 'ja' ? 'brightsky-alerts-mannheim.json' : modus.warnung === 'test' ? 'brightsky-alerts-test.json' : modus.warnung === 'vier' ? 'brightsky-alerts-vier.json' : 'brightsky-alerts-leer.json'));
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
  // Tab „Mehr“: alle Gruppen offen, damit die Prüfungen an Einstellungen nicht an zugeklappten Gruppen scheitern (Standard ist nur „Orte“ offen, siehe nutzertest-funde.test.js)
  if (!(modus && modus.mehrZu)) await ctx.addInitScript(() => { try { if (!localStorage.getItem('wpc-mehr-offen')) localStorage.setItem('wpc-mehr-offen', '[0,1,2,3,4]'); } catch (e) { } });
  const p = await ctx.newPage();
  const konsole = [];
  p.on('pageerror', e => konsole.push('Seitenfehler: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') konsole.push(m.text()); });
  await p.clock.setFixedTime(JETZT);
  await umleiten(p, modus || {});
  return { ctx, p, konsole };
}

  const foto = (p, name) => p.screenshot({ path: path.join(BILDER, name + '.png') });
  const ergebnis = () => ({ ok, fehler });
  return { BASIS, BILDER, pruefe, server, umleiten, MESSEN, neueSeite, foto, ergebnis };
}
module.exports = { neu, WURZEL, JETZT, fixture, PNG };

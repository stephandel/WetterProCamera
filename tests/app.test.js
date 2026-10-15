/* tests/app.test.js – Kern-Tests für WetterProCamera (Paket B, 15.10.2026)
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
const PORT = +process.env.PORT || 8862;
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
const MESSEN = () => {
  const sichtbar = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('[hidden]'); };
  const texte = [...document.querySelectorAll('body *')].filter(e => sichtbar(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
  const klein = [...document.querySelectorAll('button, a, label, input, [role="button"]')].filter(e => {
    if (!sichtbar(e) || e.closest('.leaflet-control-attribution') || (e.tagName === 'INPUT' && e.closest('label'))) return false;
    if (e.tagName === 'INPUT' && (e.type === 'radio' || e.type === 'checkbox' || e.hidden)) return false;
    const r = e.getBoundingClientRect(); return r.height < 43.5 || r.width < 43.5;
  }).map(e => (e.textContent.trim() || e.getAttribute('aria-label') || e.className || e.tagName).slice(0, 24) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
  return { seitlich: document.documentElement.scrollWidth - innerWidth, kleinsteSchrift: Math.min(...texte.map(e => parseFloat(getComputedStyle(e).fontSize))), klein };
};

async function neueSeite(b, opt, modus) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'de-DE', timezoneId: 'Europe/Berlin' }, opt));
  const p = await ctx.newPage();
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

(async () => {
  fs.mkdirSync(BILDER, { recursive: true });
  const srv = await server();
  const b = await webkit.launch();
  try {
    /* 1. Service Worker und Version (ohne Browser) */
    console.log('Service Worker');
    const swText = fs.readFileSync(path.join(WURZEL, 'sw.js'), 'utf8');
    let syntaxOk = true; try { new vm.Script(swText, { filename: 'sw.js' }); } catch (e) { syntaxOk = e.message; }
    pruefe('sw.js ist gültiges JavaScript', syntaxOk === true, syntaxOk);
    const { huelleLesen, berechnen } = require('../tools/version.js');
    const huelle = huelleLesen(swText), fehlend = huelle.filter(d => d !== './' && !fs.existsSync(path.join(WURZEL, d)));
    pruefe('alle ' + huelle.length + ' Dateien aus HUELLE sind vorhanden', fehlend.length === 0, fehlend);
    pruefe('Leaflet liegt lokal in HUELLE', huelle.includes('lib/leaflet/leaflet.min.js') && huelle.includes('lib/leaflet/leaflet.css'));
    const v = berechnen(); pruefe('VERSION in sw.js passt zu den Dateien (' + v.version + ')', v.sw === v.neu);
    const html = fs.readFileSync(path.join(WURZEL, 'index.html'), 'utf8');
    pruefe('index.html lädt nichts von fremden Servern', !/(src|href)="https?:\/\//.test(html));

    /* 2. iPhone 390 px hell: alle Tabs, Teilen, Blatt „Infos", Offline */
    console.log('iPhone 390 px, hell');
    let s = await neueSeite(b, { colorScheme: 'light' });
    await s.p.goto(BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 });
    pruefe('Wetter-Tab zeigt die Tagesliste', (await s.p.$$('.tag')).length >= 7);
    pruefe('Kopfzeile zeigt das Modell von Open-Meteo', /Beste Mischung/.test(await s.p.textContent('#ortZeile')));
    await foto(s.p, 'hell-390-start');
    await tabsPruefen(s.p, 'hell 390', true);
    // Kamera-Tab öffnet den Teilen-Bildschirm und zeichnet das Bild
    await s.p.click('#tb-kamera');
    await s.p.waitForFunction(() => document.getElementById('teilen').open && document.getElementById('tBild').dataset.stand, null, { timeout: 8000 }).catch(() => { });
    const bild = await s.p.evaluate(() => ({ offen: document.getElementById('teilen').open, stand: document.getElementById('tBild').dataset.stand || '', breite: document.getElementById('tBild').width }));
    pruefe('Teilen-Bildschirm öffnet und zeichnet (3:4, 1080 px)', bild.offen && /^hoch\/klassisch\/1080x1440$/.test(bild.stand), bild);
    let m = await s.p.evaluate(MESSEN);
    pruefe('Teilen-Bildschirm: Tippflächen ≥ 44 px', m.klein.length === 0, m.klein);
    await foto(s.p, 'hell-390-teilen');
    await s.p.click('#tInfosAuf'); await s.p.waitForTimeout(200);
    pruefe('Blatt „Infos" öffnet mit allen Angaben', await s.p.evaluate(() => !document.getElementById('tBlatt').hidden && document.querySelectorAll('#tInfoListe li').length >= 19));
    m = await s.p.evaluate(MESSEN);
    pruefe('Blatt „Infos": kleinste Schrift ≥ 11 px', m.kleinsteSchrift >= 11, m.kleinsteSchrift);
    await foto(s.p, 'hell-390-infos');
    await s.p.click('#tInfosZu'); await s.p.click('#tAbbrechen');
    // Offline: Neu laden ohne Netz zeigt den letzten Stand mit Uhrzeit
    await s.p.unrouteAll({ behavior: 'ignoreErrors' }); await umleiten(s.p, { offline: true });
    s.konsole.length = 0;
    await s.p.reload(); await s.p.waitForSelector('.tag', { timeout: 10000 }).catch(() => { });
    await s.p.waitForFunction(() => !document.getElementById('hinweis').hidden, null, { timeout: 15000 }).catch(() => { });
    const off = await s.p.evaluate(() => ({ tage: document.querySelectorAll('.tag').length, hinweis: document.getElementById('hinweis').hidden ? '' : document.getElementById('hinweis').textContent }));
    pruefe('Offline: letzter Stand bleibt sichtbar', off.tage >= 7, off);
    pruefe('Offline: Hinweis mit Uhrzeit des Stands', /Stand \d\d:\d\d/.test(off.hinweis), off.hinweis);
    await foto(s.p, 'hell-390-offline');
    const offKonsole = s.konsole.filter(t => !/Wetterdaten|Failed to load resource|network connection|internet/i.test(t));
    pruefe('Offline: keine unerwarteten Fehler in der Konsole', offKonsole.length === 0, offKonsole);
    await s.ctx.close();

    /* 3. iPhone 390 px dunkel */
    console.log('iPhone 390 px, dunkel');
    s = await neueSeite(b, { colorScheme: 'dark' });
    await s.p.goto(BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 });
    await tabsPruefen(s.p, 'dunkel 390', true);
    await s.p.click('#tb-kamera'); await s.p.waitForTimeout(600); await foto(s.p, 'dunkel-390-teilen'); await s.p.click('#tAbbrechen');
    pruefe('dunkel 390: Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
    await s.ctx.close();

    /* 4. iPad 820 px und iPhone quer 844 × 390 */
    for (const [name, opt] of [['ipad 820', { viewport: { width: 820, height: 1180 }, colorScheme: 'light' }], ['quer 844', { viewport: { width: 844, height: 390 }, colorScheme: 'dark' }]]) {
      console.log(name);
      s = await neueSeite(b, opt);
      await s.p.goto(BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 });
      for (const tab of ['wetter', 'graphs', 'radsat', 'mehr']) {
        await s.p.click('#tb-' + tab); await s.p.waitForTimeout(250);
        const mm = await s.p.evaluate(MESSEN);
        pruefe(name + ': Tab ' + tab + ' ohne seitliches Scrollen', mm.seitlich <= 0, mm.seitlich + ' px');
      }
      await s.p.click('#tb-wetter'); await foto(s.p, name.replace(' ', '-') + '-wetter');
      pruefe(name + ': Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
      await s.ctx.close();
    }

    /* 5. Datenquelle DWD über Bright Sky */
    console.log('Datenquelle DWD');
    s = await neueSeite(b, { colorScheme: 'light' });
    await s.p.goto(BASIS); await s.p.waitForSelector('.tag');
    await s.p.click('#tb-mehr');
    pruefe('Mehr: Abschnitt „Datenquelle" mit 2 Wahlmöglichkeiten', (await s.p.$$('#quelleListe input[name="quelle"]')).length === 2);
    await s.p.check('#quelleListe input[value="dwd"]');
    await s.p.waitForFunction(() => /DWD MOSMIX/.test(document.getElementById('ortZeile').textContent), null, { timeout: 8000 }).catch(() => { });
    pruefe('Kopfzeile „Modell: DWD MOSMIX"', (await s.p.textContent('#ortZeile')).trim() === 'Modell: DWD MOSMIX', await s.p.textContent('#ortZeile'));
    pruefe('Quellen nennen Bright Sky und CC BY 4.0', /Bright Sky \(brightsky\.dev\)[\s\S]*CC BY 4\.0/.test(await s.p.textContent('#quellen')));
    pruefe('Datenschutz-Satz zu brightsky.dev', /Bei Datenquelle DWD sieht brightsky\.dev deine IP-Adresse und den Ort/.test(await s.p.textContent('#tab-mehr')));
    await foto(s.p, 'hell-390-mehr-dwd');
    await s.p.click('#tb-wetter'); await s.p.waitForSelector('.tag');
    const dwd = await s.p.evaluate(() => ({
      tage: document.querySelectorAll('.tag').length, temp: document.querySelector('.akt-temp').textContent,
      werte: [...document.querySelectorAll('.werte dd')].map(e => e.textContent), regenKachel: !!document.getElementById('regenTitel'), lage: document.querySelector('.akt-lage') && document.querySelector('.akt-lage').textContent
    }));
    pruefe('DWD: 9 Tage in der Tagesliste (MOSMIX reicht weiter als Open-Meteo)', dwd.tage === 9, dwd.tage);
    pruefe('DWD: Aktuell aus der Station Mannheim (18 °C)', dwd.temp === '18°C', dwd.temp);
    pruefe('DWD: gefühlt, Feuchte (57 %), Luftdruck (1027 hPa) übersetzt', dwd.werte.length === 3 && !dwd.werte[0].includes('–') && dwd.werte[1] === '57 %' && dwd.werte[2] === '1027 hPa', dwd.werte);
    pruefe('DWD: Wetterlage „Sonnig" (Symbol clear-day)', dwd.lage === 'Sonnig', dwd.lage);
    const sonne = await s.p.evaluate(() => { const k = Object.keys(localStorage).filter(x => /^wpgt-daten-49\.48\d,8\.466-dwd$/.test(x))[0], d = JSON.parse(localStorage.getItem(k)).d.daily; return { auf: d.sunrise[0], unter: d.sunset[0], uv: d.uv_index_max[0], regenrisiko: d.precipitation_probability_max[1] }; });
    pruefe('DWD: Sonnenaufgang selbst berechnet (07:47 ± 3 min, wie Open-Meteo)', /^2026-10-15T07:(4[4-9]|50)$/.test(sonne.auf), sonne);
    pruefe('DWD: Sonnenuntergang selbst berechnet (18:3x)', /^2026-10-15T18:[2-4]\d$/.test(sonne.unter), sonne);
    pruefe('DWD: UV fehlt (null), Regenrisiko aus MOSMIX', sonne.uv === null && typeof sonne.regenrisiko === 'number', sonne);
    await foto(s.p, 'hell-390-wetter-dwd');
    await s.p.click('#tb-kamera'); await s.p.waitForTimeout(800);
    pruefe('DWD: Teilen-Bild wird gezeichnet', /1080x1440/.test(await s.p.evaluate(() => document.getElementById('tBild').dataset.stand || '')));
    await s.p.click('#tAbbrechen');
    pruefe('DWD Mannheim: Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
    s.konsole.length = 0;
    // Corralejo: Bright Sky hat dort eine MOSMIX-Vorhersage (Station Fuerteventura), aber keine aktuelle Messung
    await s.p.evaluate(() => { localStorage.setItem('wpgt-ort', JSON.stringify({ name: 'Corralejo', land: 'Spanien', lat: 28.73, lon: -13.867 })); });
    await s.p.reload(); await s.p.waitForSelector('.tag');
    await s.p.waitForFunction(() => /Modell:/.test(document.getElementById('ortZeile').textContent));
    const cor = await s.p.evaluate(() => ({ kopf: document.getElementById('ortZeile').textContent, tage: document.querySelectorAll('.tag').length, temp: document.querySelector('.akt-temp').textContent }));
    pruefe('Corralejo: Vorhersage von DWD (ohne aktuelle Messung, Wert aus der Vorhersage)', cor.kopf === 'Modell: DWD MOSMIX' && cor.tage >= 8 && /^\d+°C$/.test(cor.temp), cor);
    // Bright Sky meldet für Corralejo bei /current_weather „404 keine Station"; das ist gewollt und wird abgefangen
    const corKonsole = s.konsole.filter(t => !/status of 404/.test(t));
    pruefe('DWD Corralejo: keine weiteren Fehler in der Konsole', corKonsole.length === 0, corKonsole);
    // Rückfall: Bright Sky ohne Daten → Open-Meteo und Hinweis
    await s.p.unrouteAll({ behavior: 'ignoreErrors' }); await umleiten(s.p, { dwdAus: true });
    s.konsole.length = 0;
    await s.p.evaluate(() => { Object.keys(localStorage).filter(x => /-dwd$/.test(x)).forEach(x => localStorage.removeItem(x)); });
    await s.p.reload();
    await s.p.waitForFunction(() => /keine Daten/.test(document.getElementById('hinweis').textContent), null, { timeout: 8000 }).catch(() => { });
    const rf = await s.p.evaluate(() => ({ hinweis: document.getElementById('hinweis').textContent, kopf: document.getElementById('ortZeile').textContent, tage: document.querySelectorAll('.tag').length }));
    pruefe('Rückfall: Hinweis „DWD hat für diesen Ort keine Daten, Open-Meteo wird gezeigt"', /DWD hat für diesen Ort keine Daten, Open-Meteo wird gezeigt/.test(rf.hinweis), rf);
    pruefe('Rückfall: Open-Meteo-Daten und Modell in der Kopfzeile', rf.tage >= 7 && /Beste Mischung/.test(rf.kopf), rf);
    await foto(s.p, 'hell-390-dwd-rueckfall');
    const rfKonsole = s.konsole.filter(t => !/Failed to load resource/.test(t));   // die 404 von Bright Sky ist gewollt
    pruefe('Rückfall: keine weiteren Fehler in der Konsole', rfKonsole.length === 0, rfKonsole);
    await s.ctx.close();

    /* 6. Kurzbefehl „Wetterfoto" */
    console.log('Kurzbefehl');
    for (const [name, url, schema] of [['?kamera=1', BASIS + '?kamera=1', 'light'], ['#kamera', BASIS + '#kamera', 'dark']]) {
      s = await neueSeite(b, { colorScheme: schema });
      await s.p.goto(url);
      await s.p.waitForFunction(() => document.getElementById('teilen').open && document.getElementById('tTipp'), null, { timeout: 10000 }).catch(() => { });
      const k = await s.p.evaluate(() => ({ offen: document.getElementById('teilen').open, tipp: (document.getElementById('tTipp') || {}).textContent || '', adresse: location.search + location.hash }));
      pruefe('Direktlink ' + name + ' öffnet den Teilen-Bildschirm mit Hinweis', k.offen && /Tippe auf „Fotos“ und wähle das neueste Bild/.test(k.tipp), k);
      pruefe('Direktlink ' + name + ': Adresse danach ohne Zusatz (Neuladen öffnet nicht erneut)', k.adresse === '', k.adresse);
      await foto(s.p, (schema === 'light' ? 'hell' : 'dunkel') + '-390-kurzbefehl-teilen');
      if (schema === 'light') {
        await s.p.click('#tAbbrechen'); await s.p.click('#tb-mehr');
        const kb = await s.p.evaluate(() => ({ schritte: document.querySelectorAll('.kb-schritte li').length, link: document.querySelector('.kb-link').textContent }));
        pruefe('Mehr: Anleitung „Wetterfoto" mit 6 Schritten und Link', kb.schritte === 6 && kb.link === 'https://stephandel.github.io/WetterProCamera/?kamera=1', kb);
        await s.ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => { });
        await s.p.click('#kbKopieren'); await s.p.waitForTimeout(300);
        pruefe('Knopf „Link kopieren" meldet das Ergebnis', /Link kopiert|Kopieren ging nicht/.test(await s.p.textContent('#kbStatus')), await s.p.textContent('#kbStatus'));
        await s.p.$eval('.kurzbefehl', e => e.scrollIntoView({ block: 'center' })); await foto(s.p, 'hell-390-kurzbefehl-mehr');
        const mm = await s.p.evaluate(MESSEN);
        pruefe('Mehr mit Kurzbefehl: kein seitliches Scrollen, Tippflächen ≥ 44 px', mm.seitlich <= 0 && mm.klein.length === 0, mm);
      }
      pruefe('Kurzbefehl ' + name + ': Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
      await s.ctx.close();
    }

    /* 7. Paket A5: „Was heute geht", Corralejo mit DWD (Zeitzone, „Vorhersage"), Meteogramm auf der Startseite */
    console.log('Paket A5');
    const tipps = p => p.evaluate(() => { const k = document.getElementById('a5Tipps'); return k ? { arten: [...k.querySelectorAll('[data-tipp]')].map(x => x.dataset.tipp), saetze: [...k.querySelectorAll('.a5-tipp-satz')].map(x => x.textContent), leer: (k.querySelector('.a5-leer p') || {}).textContent || '' } : null; });
    const warteTipps = (p, art) => p.waitForFunction(a => !!document.querySelector('#a5Tipps [data-tipp="' + a + '"]'), art, { timeout: 8000 }).catch(() => { });
    // a) Mannheim, Open-Meteo, echte Antwort: nur die goldene Stunde (Sonnenuntergang 18:35), kein Meer
    s = await neueSeite(b, { colorScheme: 'light' });
    await s.p.goto(BASIS); await s.p.waitForSelector('#a5Tipps');
    await s.p.waitForFunction(() => /"49\.49,8\.47":false/.test(localStorage.getItem('wpc-kueste') || ''), null, { timeout: 8000 }).catch(() => { });
    let t = await tipps(s.p);
    pruefe('Mannheim: Kachel „Was heute geht" steht unter den Stunden', await s.p.evaluate(() => document.getElementById('a5Tipps').previousElementSibling.classList.contains('std')));
    pruefe('Mannheim: nur „Goldene Stunde ab 17:50 Uhr"', t && t.arten.join() === 'gold' && /Goldene Stunde ab 17:50 Uhr/.test(t.saetze[0]), t);
    pruefe('Mannheim: Marine-API ohne Werte → kein Küstenort (gemerkt in wpc-kueste)', await s.p.evaluate(() => JSON.parse(localStorage.getItem('wpc-kueste'))['49.49,8.47'] === false));
    pruefe('Mannheim: Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
    // Mehr → Startseite: Schalter, Haken und Quelle Marine-API
    await s.p.click('#tb-mehr');
    const mehr = await s.p.evaluate(() => ({ schalter: document.querySelectorAll('#a5Start input[role="switch"]').length, arten: document.querySelectorAll('#a5Arten input').length, groesseVersteckt: document.getElementById('a5Groesse').hidden, quelle: /Ebbe und Flut: Open-Meteo Marine/.test(document.getElementById('quellen').textContent) }));
    pruefe('Mehr: Abschnitt „Startseite" mit 2 Schaltern, 9 Tipp-Haken, Größe erst bei Meteogramm an', mehr.schalter === 2 && mehr.arten === 9 && mehr.groesseVersteckt, mehr);
    pruefe('Quellen nennen Open-Meteo Marine', mehr.quelle);
    // Leerzustand: goldene Stunde und Sterne abwählen
    await s.p.uncheck('#a5Arten input[value="gold"]'); await s.p.uncheck('#a5Arten input[value="sterne"]');
    await s.p.click('#tb-wetter'); t = await tipps(s.p);
    pruefe('Leerzustand „Heute nichts Besonderes." mit Knopf', t && t.arten.length === 0 && t.leer === 'Heute nichts Besonderes.' && !!(await s.p.$('[data-a5-zu-start]')), t);
    await s.p.click('[data-a5-zu-start]'); await s.p.waitForTimeout(200);
    pruefe('Knopf „Tipps auswählen" führt zu „Mehr" → „Startseite"', await s.p.evaluate(() => !document.getElementById('tab-mehr').hidden && document.activeElement && document.activeElement.closest('#a5Arten') !== null));
    // Schalter „Was heute geht" aus
    await s.p.uncheck('#a5Start input[data-a5="tipps"]'); await s.p.click('#tb-wetter');
    pruefe('Schalter aus: keine Kachel „Was heute geht"', !(await s.p.$('#a5Tipps')));
    // Meteogramm auf der Startseite: an, Größe „Klein" (1 Zeile), dann „Groß" (alle 4 Standardzeilen)
    await s.p.click('#tb-mehr'); await s.p.check('#a5Start input[data-a5="meteo"]');
    pruefe('Meteogramm an: Wahl der Größe erscheint', await s.p.evaluate(() => !document.getElementById('a5Groesse').hidden));
    await s.p.click('[data-seg="a5groesse"] [data-v="klein"]');
    await s.p.click('#tb-wetter'); await s.p.waitForSelector('#a5Mg .mg-ax-titel', { timeout: 8000 }).catch(() => { });
    let mgs = await s.p.evaluate(() => { const k = document.querySelector('.a5-mg-kachel'); return k && { zeilen: k.querySelectorAll('.mg-ax-titel').length, unterRegen: !!(k.previousElementSibling && k.previousElementSibling.querySelector('#regenTitel')) }; });
    pruefe('Meteogramm „Klein": 1 Zeile, direkt unter dem Regenradar', mgs && mgs.zeilen === 1 && mgs.unterRegen, mgs);
    let m5 = await s.p.evaluate(MESSEN);
    pruefe('Wetter mit Meteogramm 390 px: kein seitliches Scrollen, Tippflächen ≥ 44 px, Schrift ≥ 11 px', m5.seitlich <= 0 && m5.klein.length === 0 && m5.kleinsteSchrift >= 11, m5);
    await s.p.$eval('.a5-mg-kachel', e => e.scrollIntoView({ block: 'center' })); await foto(s.p, 'hell-390-a5-meteogramm');
    await s.p.evaluate(() => window.scrollTo(0, 0));
    await s.p.click('#tb-mehr'); await s.p.click('[data-seg="a5groesse"] [data-v="gross"]'); await s.p.click('#tb-wetter');
    await s.p.waitForFunction(() => document.querySelectorAll('#a5Mg .mg-ax-titel').length === 4, null, { timeout: 8000 }).catch(() => { });
    pruefe('Meteogramm „Groß": alle 4 gewählten Zeilen', await s.p.evaluate(() => document.querySelectorAll('#a5Mg .mg-ax-titel').length) === 4);
    // Zweites Meteogramm im Tab „Graphs" gleichzeitig: eigene IDs, beide bleiben heil
    await s.p.click('[data-a5-mg-ganz]'); await s.p.waitForSelector('#pcMg .mg-ax-titel', { timeout: 8000 }).catch(() => { });
    const zwei = await s.p.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map(e => e.id); return { graphs: document.querySelectorAll('#pcMg .mg-ax-titel').length, start: document.querySelectorAll('#a5Mg .mg-ax-titel').length, doppelt: ids.filter((x, i) => ids.indexOf(x) !== i) }; });
    pruefe('„Ganz ansehen" öffnet Graphs als Meteogramm; beide Bausteine laufen nebeneinander (keine doppelten IDs)', zwei.graphs >= 1 && zwei.start === 4 && zwei.doppelt.length === 0, zwei);
    await s.p.click('#tb-wetter');
    pruefe('Zurück auf Wetter: Startseiten-Meteogramm wieder da, ohne neu zu laden', await s.p.evaluate(() => document.querySelectorAll('#tab-wetter #a5Mg .mg-ax-titel').length) === 4);
    pruefe('Meteogramm Startseite: Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
    await s.ctx.close();
    // b) Mannheim mit Regen und Frost (geänderte Antwort): Schirm mit Uhrzeit, Frost
    s = await neueSeite(b, { colorScheme: 'dark' }, { omAendern: d => { d.daily.precipitation_probability_max[0] = 70; d.daily.temperature_2m_min[0] = -2; d.hourly.time.forEach((z, i) => { if (z >= '2026-10-15T16:00') d.hourly.precipitation_probability[i] = 60; }); return d; } });
    await s.p.goto(BASIS); await warteTipps(s.p, 'schirm'); t = await tipps(s.p);
    pruefe('Mannheim Regen/Frost: Tipps Schirm, Frost (in dieser Reihenfolge)', t && t.arten[0] === 'schirm' && t.arten[1] === 'frost', t);
    pruefe('Schirm-Satz mit Risiko und Uhrzeit', t && /Regenrisiko 70 %, ab etwa 16:00 Uhr/.test(t.saetze[0]), t && t.saetze[0]);
    pruefe('Frost-Satz mit Tiefstwert', t && /Frost bis −2 °C/.test(t.saetze[1]), t && t.saetze[1]);
    await s.p.$eval('#a5Tipps', e => e.scrollIntoView({ block: 'center' })); await foto(s.p, 'dunkel-390-a5-schirm-frost');
    m5 = await s.p.evaluate(MESSEN);
    pruefe('dunkel 390 mit Tipps: kein seitliches Scrollen, Tippflächen ≥ 44 px', m5.seitlich <= 0 && m5.klein.length === 0, m5);
    pruefe('Mannheim Regen/Frost: Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
    await s.ctx.close();
    // c) Corralejo mit DWD: Uhrzeit auf Kanaren-Zeit, „(Vorhersage)", Strand, Ebbe/Flut aus der gespeicherten Marine-Antwort
    for (const [name, modus] of [['Corralejo DWD', {}], ['Corralejo DWD mit mehr Wind', { bsAendern: d => { d.weather.forEach(x => { if (x.wind_speed != null) x.wind_speed = Math.round(x.wind_speed * 1.5 * 10) / 10; }); return d; } }]]) {
      s = await neueSeite(b, { colorScheme: 'light' }, modus);
      await s.p.addInitScript(() => { if (!localStorage.getItem('wpc-quelle')) { localStorage.setItem('wpc-quelle', '"dwd"'); localStorage.setItem('wpgt-ort', JSON.stringify({ name: 'Corralejo', land: 'Spanien', lat: 28.73, lon: -13.867 })); } });
      await s.p.goto(BASIS); await s.p.waitForSelector('.tag'); await warteTipps(s.p, 'gezeiten');
      const c = await s.p.evaluate(() => {
        const k = Object.keys(localStorage).filter(x => /-dwd$/.test(x))[0], d = JSON.parse(localStorage.getItem(k)).d;
        return { kopf: document.querySelector('.akt-kopf').textContent.replace(/\s+/g, ' ').trim(), tz: d.timezone, zeit: d.current.time, unter: d.daily.sunset[0], auf: d.daily.sunrise[0], erste: d.hourly.time[0], temp: document.querySelector('.akt-temp').textContent };
      });
      t = await tipps(s.p);
      if (!modus.bsAendern) {
        pruefe(name + ': Zeitzone Atlantic/Canary, „Aktuell (Vorhersage) 13:00" (14:40 in Berlin = 13:40 auf den Kanaren)', c.tz === 'Atlantic/Canary' && c.kopf === 'Aktuell (Vorhersage) 13:00' && c.temp === '26°C', c);
        pruefe(name + ': Stunden in Ortszeit (erste Stunde 01:00 statt 02:00)', c.erste === '2026-10-15T01:00', c.erste);
        pruefe(name + ': Sonnenaufgang 08:0x, Sonnenuntergang 19:1x–19:3x Ortszeit', /^2026-10-15T0(7:5|8:0|8:1)\d$/.test(c.auf) && /^2026-10-15T19:[1-3]\d$/.test(c.unter), c);
        pruefe(name + ': Tipps Strand, Ebbe/Flut, goldene Stunde', t && t.arten.join() === 'strand,gezeiten,gold', t);
        pruefe(name + ': „Strandwetter" (Küstenort), Wind bis 18 km/h', t && /^Strandwetter: bis 26 °C, kaum Regen, Wind bis 18 km\/h\.$/.test(t.saetze[0]), t && t.saetze[0]);
        pruefe(name + ': nächste Flut gegen 16:25, danach Ebbe gegen 22:20 Uhr', t && t.saetze[1] === 'Nächste Flut gegen 16:25 Uhr, danach Ebbe gegen 22:20 Uhr.', t && t.saetze[1]);
        pruefe(name + ': Küstenort gemerkt', await s.p.evaluate(() => JSON.parse(localStorage.getItem('wpc-kueste'))['28.73,-13.87'] === true));
        await s.p.$eval('#a5Tipps', e => e.scrollIntoView({ block: 'center' })); await foto(s.p, 'hell-390-a5-corralejo');
      } else {
        pruefe(name + ': Tipps Strand, Kiten, Ebbe/Flut (höchstens 3)', t && t.arten.join() === 'strand,kiten,gezeiten', t);
        pruefe(name + ': Kiten-Satz mit Wind und Richtung', t && /^Gut zum Kiten: Wind bis 27 km\/h aus (N|NO)\.$/.test(t.saetze[1]), t && t.saetze[1]);
      }
      const ck = s.konsole.filter(x => !/status of 404/.test(x));   // Bright Sky: keine Station für Corralejo, gewollt
      pruefe(name + ': Konsole ohne weitere Fehler', ck.length === 0, ck);
      await s.ctx.close();
    }
    // d) Mannheim mit DWD: Messung der Station, kein Zusatz „(Vorhersage)"
    s = await neueSeite(b, { colorScheme: 'light' });
    await s.p.addInitScript(() => localStorage.setItem('wpc-quelle', '"dwd"'));
    await s.p.goto(BASIS); await s.p.waitForFunction(() => /DWD MOSMIX/.test(document.getElementById('ortZeile').textContent)); await s.p.waitForSelector('.tag');
    pruefe('Mannheim DWD: Aktuell aus der Station, ohne „(Vorhersage)"', await s.p.evaluate(() => !document.querySelector('.a5-vorhersage') && /^Aktuell 14:\d\d$/.test(document.querySelector('.akt-kopf').textContent.replace(/\s+/g, ' ').trim())), await s.p.textContent('.akt-kopf'));
    await s.ctx.close();
  } catch (e) {
    fehler++; console.log('  ✗ Test abgebrochen: ' + (e && e.stack || e));
  } finally {
    await b.close(); srv.close();
  }
  console.log('\n' + ok + ' Prüfungen bestanden, ' + fehler + ' fehlgeschlagen. Bildschirmfotos: ' + BILDER);
  process.exit(fehler ? 1 : 0);
})();

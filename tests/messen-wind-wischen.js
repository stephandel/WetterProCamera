/* tests/messen-wind-wischen.js – Messung zu W2 (03.11.2026), kein Teil von npm test, braucht echtes Netz (Open-Meteo, OpenTopoMap).
   Misst in WebKit 390 px: Zeit bis die Wind-Ebene erscheint, ob sie beim Wischen die Karte deckt, wie lange nach dem Loslassen
   bis sie wieder die ganze Karte deckt, und nach einem Zoom-Knopf. Vorher (main, PNG-Bild): ~3 s nach dem Wischen; nachher 2–22 ms.
   Aufruf:  node tests/messen-wind-wischen.js [Ordner der App, Standard: dieser] [Port, Standard 8993] [Bildschirmfoto.png]  */
const path = require('path');
const WURZEL = path.resolve(process.argv[2] || path.join(__dirname, '..')), PORT = +process.argv[3] || 8993, BILD = process.argv[4];
process.chdir(WURZEL);
const { webkit } = require(WURZEL + '/node_modules/playwright');
const H = require(WURZEL + '/tests/hilfe.js').neu(PORT);
const DECKT = () => { const f = document.querySelector('#radarKarte .a26-flaeche'), k = document.getElementById('radarKarte'); if (!f) return false; const a = f.getBoundingClientRect(), m = k.getBoundingClientRect(); return getComputedStyle(f).visibility !== 'hidden' && a.left <= m.left + 1 && a.top <= m.top + 1 && a.right >= m.right - 1 && a.bottom >= m.bottom - 1; };
(async () => {
  const srv = await H.server(), b = await webkit.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'de-DE', hasTouch: false });
  await ctx.addInitScript(() => localStorage.setItem('wpc-ebene', '"radar"'));
  const p = await ctx.newPage(), aus = {}; p.on('response', async r => { if (r.status() === 400) console.log('400', decodeURIComponent(r.url()).slice(0, 400), (await r.text()).slice(0, 200)); }); p.on('pageerror', e => console.log('Seitenfehler', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('Konsole', m.text()); });
  await p.goto(H.BASIS); await p.waitForSelector('.tag', { timeout: 20000 });
  await p.click('#tb-radsat'); await p.waitForSelector('#radarKarte .leaflet-tile-pane', { state: 'attached' }); await p.waitForTimeout(1500);
  let t = Date.now(); await p.click('#ebenenWahl [data-ebene="wind"]'); await p.waitForFunction(DECKT, null, { timeout: 15000, polling: 16 }); aus.erstesBild = Date.now() - t;
  await p.waitForTimeout(2500); if (BILD) await p.screenshot({ path: BILD });
  const bx = await p.$eval('#radarKarte', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  for (const n of [1, 2]) {
    await p.mouse.move(bx.x, bx.y); await p.mouse.down(); await p.mouse.move(bx.x - 200, bx.y + 60, { steps: 30 });
    aus['waehrendWischen' + n + 'Deckt'] = await p.evaluate(DECKT);
    t = Date.now(); await p.mouse.up();
    aus['nachWischen' + n] = await p.waitForFunction(DECKT, null, { timeout: 12000, polling: 16 }).then(() => Date.now() - t, () => 'nie (12 s)');
    await p.waitForTimeout(2500);
  }
  t = Date.now(); await p.click('#radarKarte [data-z="1"]'); await p.waitForTimeout(50);
  aus.nachZoom = await p.waitForFunction(DECKT, null, { timeout: 12000, polling: 16 }).then(() => Date.now() - t, () => 'nie');
  aus.zeit = await p.textContent('#radarZeit'); aus.diag = await p.evaluate(() => { const f = document.querySelector('#radarKarte .a26-flaeche'), k = document.getElementById('radarKarte'); if (!f) return 'keine Ebene'; const a = f.getBoundingClientRect(), m = k.getBoundingClientRect(); return { vis: getComputedStyle(f).visibility, a: [a.left, a.top, a.right, a.bottom].map(Math.round), m: [m.left, m.top, m.right, m.bottom].map(Math.round), n: document.querySelectorAll('#radarKarte .a26-flaeche').length, anim: document.querySelector('#radarKarte').className }; });
  console.log(JSON.stringify(aus));
  await b.close(); srv.close();
})();

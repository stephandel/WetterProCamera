/* tests/w2-w3.test.js – iPhone-Wünsche W2 (Karten-Ebene Wind: schönere Pfeile, flüssiges Laden) und W3 (Fahne über dem
   Auswahl-Strich im Meteogramm springt nicht mehr je nach Textlänge). Start:  PORT=8981 node tests/w2-w3.test.js   (Exit-Code 0 = grün).
   Fremde Dienste sind auf Antworten aus tests/fixtures umgeleitet (tests/hilfe.js); Gitter-Wind 10 bis 31 km/h aus Westen. */
'use strict';
const fs = require('fs');
const { webkit } = require('playwright');
const { neu } = require('./hilfe.js');
const H = neu(+process.env.PORT || 8981);
const { pruefe } = H;
fs.mkdirSync(H.BILDER, { recursive: true });

async function start(b, opt, modus) {
  const s = await H.neueSeite(b, opt || {}, modus || {});
  await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 }); await s.p.waitForTimeout(700);
  return s;
}
// Lage der Wind-Ebene gegenüber der Karte (Bildschirm-Pixel) und kräftige Farbtöne in ihr (30°-Stufen mit mind. 40 Pixeln)
const EBENE = () => {
  const f = document.querySelector('#radarKarte .a26-flaeche'), k = document.getElementById('radarKarte');
  if (!f) return null;
  const a = f.getBoundingClientRect(), m = k.getBoundingClientRect();
  let toene = null;
  if (f.tagName === 'CANVAS') {
    const d = f.getContext('2d').getImageData(0, 0, f.width, f.height).data, stufen = {};
    for (let q = 0; q < d.length; q += 16) {
      if (d[q + 3] < 200) continue;
      const r = d[q] / 255, g = d[q + 1] / 255, bl = d[q + 2] / 255, mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), l = (mx + mn) / 2, s = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
      if (l < 0.45 || s < 0.5) continue;
      let h = mx === r ? ((g - bl) / (mx - mn)) % 6 : mx === g ? (bl - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4; h = (h * 60 + 360) % 360;
      stufen[Math.floor(h / 30)] = (stufen[Math.floor(h / 30)] || 0) + 1;
    }
    toene = Object.keys(stufen).filter(x => stufen[x] >= 40).length;
  }
  return { art: f.tagName, deckt: a.left <= m.left + 1 && a.top <= m.top + 1 && a.right >= m.right - 1 && a.bottom >= m.bottom - 1, a: [a.left, a.top, a.right, a.bottom].map(Math.round), m: [m.left, m.top, m.right, m.bottom].map(Math.round), toene };
};

(async () => {
  const srv = await H.server();
  const b = await webkit.launch();
  try {
    console.log('1) W2: Wind-Ebene');
    {
      const s = await start(b);
      const gitter = [];
      s.p.on('request', r => { if (/api\.open-meteo\.com/.test(r.url()) && /pressure_msl/.test(r.url()) && /latitude=[^&]*,/.test(r.url())) gitter.push(r.url()); });
      await s.p.click('#tb-radsat'); await s.p.waitForSelector('#radarKarte .leaflet-tile-pane', { state: 'attached' }); await s.p.waitForTimeout(400);
      await s.p.click('#ebenenWahl [data-ebene="wind"]'); await s.p.waitForSelector('#radarKarte .a26-flaeche', { timeout: 8000 }); await s.p.waitForTimeout(500);
      const e0 = await s.p.evaluate(EBENE);
      pruefe('Wind: Pfeile nach Stärke gefärbt (mind. 2 kräftige Farbtöne bei 10 bis 31 km/h)', !!e0 && e0.toene >= 2, e0);
      await H.foto(s.p, 'w2-390-wind');
      // Verschieben: noch während der Finger auf der Karte liegt, muss die Ebene die ganze Karte decken (vorher: leere Streifen bis zum Neuzeichnen)
      const box = await s.p.$eval('#radarKarte', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      await s.p.mouse.move(box.x, box.y); await s.p.mouse.down(); await s.p.mouse.move(box.x - 140, box.y - 90, { steps: 12 }); await s.p.waitForTimeout(80);
      const e1 = await s.p.evaluate(EBENE);
      await s.p.mouse.up();
      pruefe('Wind: beim Verschieben (Finger noch auf der Karte) deckt die Ebene die ganze Karte', !!e1 && e1.deckt, e1);
      await s.p.waitForTimeout(1500);
      const e2 = await s.p.evaluate(EBENE);
      pruefe('Wind: nach dem Verschieben deckt die Ebene die Karte, ohne neuen Abruf', !!e2 && e2.deckt && gitter.length === 1, [e2, gitter.length]);
      // Zoomen: Ebene ist sofort nach dem Zoom wieder da und deckt die Karte
      await s.p.click('#radarKarte [data-z="1"]'); await s.p.waitForTimeout(600);
      const e3 = await s.p.evaluate(EBENE);
      pruefe('Wind: 600 ms nach dem Zoomen deckt die Ebene die Karte', !!e3 && e3.deckt, e3);
      pruefe('Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
      await s.ctx.close();
    }

    console.log('2) W3: Fahne über dem Auswahl-Strich');
    for (const [name, opt, voll] of [['390 px', {}, false], ['390 px Vollbild', {}, true], ['320 px', { viewport: { width: 320, height: 700 } }, false]]) {
      const s = await start(b, opt);
      await s.p.click('#tb-graphs'); await s.p.waitForSelector('#tab-graphs .mg-scroll', { timeout: 15000 }); await s.p.waitForTimeout(900);
      if (voll) { await s.p.click('#tab-graphs .mg-btn-voll'); await s.p.waitForTimeout(700); }
      const m = [];
      for (let k = 0; k < 10; k++) {
        await s.p.evaluate(k => { document.querySelector('#tab-graphs .mg-scroll').scrollLeft = 260 + k * 131; }, k); await s.p.waitForTimeout(250);
        m.push(await s.p.evaluate(() => {
          const z = document.querySelector('#tab-graphs .mg-zeit'), c = document.querySelector('#tab-graphs .mg-cursor'), l = z.querySelector('.mg-lage');
          const a = z.getBoundingClientRect(), cr = c.getBoundingClientRect();
          return { t: z.textContent.replace(/\s+/g, ' ').trim(), b: Math.round(a.width), h: Math.round(a.height), x: Math.round(a.left), spitze: Math.round(cr.top - z.closest('.mg').getBoundingClientRect().top), fs: Math.min(...[...z.querySelectorAll('*')].concat(z).map(e => parseFloat(getComputedStyle(e).fontSize))), lageVoll: !l || l.textContent.trim() === '' || l.scrollWidth <= l.clientWidth + 1 };
        }));
      }
      const spanne = k => Math.max(...m.map(x => x[k])) - Math.min(...m.map(x => x[k]));
      const texte = new Set(m.map(x => x.t.length));
      pruefe('W3 ' + name + ': Fahne bleibt gleich breit, hoch und an derselben Stelle bei ' + texte.size + ' Textlängen', texte.size >= 3 && spanne('b') <= 1 && spanne('h') <= 1 && spanne('x') <= 1, m.map(x => [x.b, x.h, x.x, x.t]));
      pruefe('W3 ' + name + ': Pfeilspitze und Diagramm bleiben auf gleicher Höhe', spanne('spitze') <= 1, m.map(x => x.spitze));
      pruefe('W3 ' + name + ': Schrift in der Fahne mind. 10,5 px', m.every(x => x.fs >= 10.5), m.map(x => x.fs));
      if (!voll && name === '390 px') pruefe('W3 ' + name + ': Wetterlage nicht abgeschnitten (auch „überwiegend klar“)', m.every(x => x.lageVoll), m.filter(x => !x.lageVoll).map(x => x.t));
      await H.foto(s.p, 'w3-' + name.replace(/\s+/g, '-'));
      await s.ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  const e = H.ergebnis();
  console.log('\n' + e.ok + ' Prüfungen bestanden, ' + e.fehler + ' fehlgeschlagen.');
  process.exit(e.fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

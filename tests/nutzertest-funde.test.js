/* tests/nutzertest-funde.test.js – Funde des Nutzertests vom 19.10.2026, die die App betreffen (Paket A9, 21.10.2026):
   Tab-Leiste deckend, Inhalt endet über der Leiste, Kamera-Knopf beschriftet, „Mehr“ gegliedert mit Pilot-Karte unten.
   Start:  PORT=8947 node tests/nutzertest-funde.test.js   (Exit-Code 0 = grün). */
'use strict';
const { webkit } = require('playwright');
const { neu } = require('./hilfe.js');
const H = neu(+process.env.PORT || 8947);
const { pruefe } = H;

(async () => {
  const srv = await H.server();
  const b = await webkit.launch();
  try {
    let s = await H.neueSeite(b, {}, {});
    await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 }); await s.p.waitForTimeout(800);
    const leiste = await s.p.evaluate(() => {
      const t = document.getElementById('tabbar'), c = getComputedStyle(t).backgroundColor, a = (c.match(/[\d.]+/g) || []).map(Number)[3];
      const k = document.getElementById('tb-kamera'), svg = k.querySelector('svg');
      window.scrollTo(0, document.documentElement.scrollHeight); return { alpha: a == null ? 1 : a, aria: k.getAttribute('aria-label'), svgPfad: svg && svg.innerHTML.slice(0, 40), kamSym: document.querySelector('#tabbar .tab-kamera .ausloeser svg') ? 1 : 0, text: k.textContent.trim() };
    });
    await s.p.waitForTimeout(300);
    const ende = await s.p.evaluate(() => {
      const t = document.getElementById('tabbar').getBoundingClientRect(), kinder = [...document.getElementById('tab-wetter').children].filter(e => e.getBoundingClientRect().height > 0), l = kinder[kinder.length - 1].getBoundingClientRect();
      return { letzteUnten: Math.round(l.bottom), leisteOben: Math.round(t.top) };
    });
    pruefe('Tab-Leiste voll deckend (Hintergrund mind. 99 % Deckkraft), damit kein Text durchscheint', leiste.alpha >= .99, leiste.alpha);
    const kopf = await s.p.evaluate(() => (getComputedStyle(document.getElementById('titelzeile')).backgroundColor.match(/[\d.]+/g) || []).map(Number)[3]);
    pruefe('Kopfzeile mind. 95 % deckend', kopf >= .95, kopf);
    // Bildvergleich: Leistenbereich mit und ohne langen hellen Text darunter muss gleich aussehen
    await s.p.evaluate(() => window.scrollTo(0, 0));
    const r = await s.p.evaluate(() => { const x = document.getElementById('tabbar').getBoundingClientRect(); return { x: x.left + 30, y: x.top + 6, width: x.width - 60, height: x.height - 12 }; });
    const ohne = await s.p.screenshot({ clip: r });
    await s.p.evaluate(() => { const d = document.createElement('div'); d.id = 'langerText'; d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:160px;background:#fff;color:#000;z-index:1;font:700 28px/1.2 sans-serif;overflow:hidden'; d.textContent = 'Radar ansehen Graphs Wetter Mehr Kamera Radar ansehen Graphs Wetter Mehr Kamera Radar ansehen Graphs Wetter Mehr Kamera Radar ansehen Graphs'; document.body.appendChild(d); });
    await s.p.waitForTimeout(200);
    const mit = await s.p.screenshot({ clip: r });
    pruefe('Bildvergleich: Leistenbereich mit und ohne Text darunter ist pixelgleich', ohne.equals(mit));
    await s.p.evaluate(() => document.getElementById('langerText').remove());
    pruefe('Ganz nach unten gerollt endet der Inhalt über der Tab-Leiste', ende.letzteUnten <= ende.leisteOben, ende);
    pruefe('Runder Knopf: Beschriftung „Kamera: Wetterfoto aufnehmen“, Kamera-Symbol (kein Teilen-Pfeil)', /^Kamera/.test(leiste.aria || '') && leiste.kamSym === 1 && /Kamera/.test(leiste.text) && !/m16 6-4-4-4 4/.test(leiste.svgPfad || ''), leiste);
    await s.p.evaluate(() => window.scrollTo(0, 0));
    await s.p.click('#tb-mehr'); await s.p.waitForTimeout(500);
    const m = await s.p.evaluate(() => {
      const k = [...document.getElementById('tab-mehr').children], i = f => k.findIndex(e => f(e));
      const g = k.filter(e => e.classList.contains('mehr-gruppe'));
      return { pilot: i(e => e.id === 'pilotTitel'), quellen: i(e => e.tagName === 'H2' && e.textContent.trim() === 'Quellen'), ueber: i(e => e.tagName === 'H2' && /Über die App/.test(e.textContent)), erste: k[0].className + ':' + k[0].textContent.trim(), n: k.length, gruppen: g.map(e => e.textContent.trim()), schrift: g.length ? parseFloat(getComputedStyle(g[0]).fontSize) : 0, pilotAlsZweites: k[1] && k[1].classList.contains('pilot') };
    });
    pruefe('Mehr: Pilot-Karte steht unten (nach den Quellen), nicht mehr ganz oben', m.pilot > m.quellen && m.erste.indexOf('pilot') < 0, m);
    pruefe('Mehr: Einstellungen in Gruppen mit Zwischenüberschriften (Orte, Wetterdaten, Startseite, Kamera und Webcam, Info)', ['Orte', 'Wetterdaten', 'Startseite und Ansicht', 'Kamera und Webcam', 'Quellen und Info'].every(t => m.gruppen.includes(t)), m.gruppen);
    pruefe('Zwischenüberschriften mind. 20 px groß, Mehr beginnt mit „Orte“', m.schrift >= 20 && m.erste === 'mehr-gruppe:Orte', m);
    await H.foto(s.p, 'a9-mehr-390');
    pruefe('Rückmeldung-Knopf funktioniert weiter (Blatt öffnet)', await (async () => { await s.p.click('#btnRueckmeldung'); await s.p.waitForTimeout(300); const o = await s.p.evaluate(() => !!document.querySelector('dialog[open]')); return o; })());
    await s.ctx.close();
    s = await H.neueSeite(b, { viewport: { width: 1280, height: 800 } }, {});
    await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 });
    await s.p.click('#macLeiste [data-ml-tab="mehr"]'); await s.p.waitForTimeout(500);
    const mac = await s.p.evaluate(() => ({ versteckt: [...document.querySelectorAll('.mehr-gruppe')].every(e => e.getBoundingClientRect().height === 0), seitlich: document.documentElement.scrollWidth - innerWidth, gruppiert: document.getElementById('tab-mehr').classList.contains('mac-gruppiert') }));
    pruefe('Mac 1280: Mehr bleibt zweispaltig gruppiert, ohne die Zwischenüberschriften, ohne seitliches Scrollen', mac.versteckt && mac.gruppiert && mac.seitlich <= 0, mac);
    await H.foto(s.p, 'a9-mehr-mac-1280');
    await s.ctx.close();
  } finally { await b.close(); srv.close(); }
  const e = H.ergebnis();
  console.log('\n' + e.ok + ' Prüfungen bestanden, ' + e.fehler + ' fehlgeschlagen.');
  process.exit(e.fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

/* tests/warnung-luft.test.js – Module „Warnung“ (DWD über Bright Sky) und „Luftqualität“ (Ampel-Ring) auf der Startseite (Paket A9, 21.10.2026)
   Start:  PORT=8942 node tests/warnung-luft.test.js   (Exit-Code 0 = grün). Alle fremden Dienste sind auf Antworten aus tests/fixtures umgeleitet (tests/hilfe.js). */
'use strict';
const { webkit } = require('playwright');
const { neu } = require('./hilfe.js');
const H = neu(+process.env.PORT || 8942);
const { pruefe } = H;

const hex = c => (c.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
const lin = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
const lum = ([r, g, b]) => .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b);
const kontrast = (a, b) => { const x = lum(hex(a)), y = lum(hex(b)); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

async function start(b, modus, opt) {
  const s = await H.neueSeite(b, opt || {}, modus);
  s.anfragen = [];
  s.p.on('request', r => { if (/brightsky\.dev\/alerts|air-quality-api/.test(r.url())) s.anfragen.push(r.url()); });
  await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 }); await s.p.waitForTimeout(900);
  return s;
}

(async () => {
  const srv = await H.server();
  const b = await webkit.launch();
  try {
    console.log('Warnung (DWD)');
    let s = await start(b, { warnung: 'ja' });
    const w = await s.p.evaluate(() => {
      const k = document.getElementById('a9Warnung'), e = [...document.getElementById('tab-wetter').children].filter(x => !x.classList.contains('update-zeile'));
      if (!k) return null;
      const knoepfe = [...k.querySelectorAll('button')], cs = getComputedStyle(k), r = knoepfe[0] && knoepfe[0].getBoundingClientRect();
      return { erste: e[0] === k, text: k.textContent, n: knoepfe.length, farbe: cs.color, hoehe: r && r.height, bgs: knoepfe.map(x => getComputedStyle(x).backgroundColor), farben: knoepfe.map(x => getComputedStyle(x).color) };
    });
    pruefe('Mit Warnung: Kachel „Warnung“ steht ganz oben auf der Startseite', !!w && w.erste, w);
    pruefe('Kachel nennt die Überschrift des DWD und den Zeitraum', !!w && /Amtliche WARNUNG vor FROST/.test(w.text) && /heute 18:00 bis morgen 08:00 Uhr/.test(w.text), w && w.text);
    pruefe('Zwei Warnungen, die schwerere (moderate) zuerst', !!w && w.n === 2 && w.text.indexOf('FROST') < w.text.indexOf('WINDBÖEN'), w);
    pruefe('Kachel in Warnfarbe nach Schwere (moderate = Orange, minor = Gelb)', !!w && w.bgs[0] === 'rgb(255, 159, 10)' && w.bgs[1] === 'rgb(255, 214, 51)', w && w.bgs);
    pruefe('Text auf der Warnfarbe mind. 4,5:1', !!w && w.bgs.every((g, i) => kontrast(w.farben[i], g) >= 4.5), w && [w.farben, w.bgs]);
    pruefe('Tippfläche mind. 44 px hoch', !!w && w.hoehe >= 43.5, w && w.hoehe);
    pruefe('Bright-Sky-Aufruf mit Ort', s.anfragen.some(u => /brightsky\.dev\/alerts\?/.test(u) && /lat=49\.4/.test(u) && /lon=8\.4/.test(u)), s.anfragen);
    await H.foto(s.p, 'a9-warnung-390');
    if (w) { await s.p.click('#a9Warnung button'); await s.p.waitForTimeout(300); }
    const d = await s.p.evaluate(() => { const d = document.querySelector('dialog[open]'); return d ? { text: d.textContent } : null; });
    pruefe('Antippen öffnet das Blatt mit vollem Text (Beschreibung, Hinweis, Zeitraum, Quelle DWD)', !!d && /Tiefstwerte zwischen -2 und -4 Grad/.test(d.text) && /Empfindliche Pflanzen abdecken/.test(d.text) && /heute 18:00 bis morgen 08:00 Uhr/.test(d.text) && /Deutscher Wetterdienst/.test(d.text), d && d.text);
    await H.foto(s.p, 'a9-warnung-blatt-390');
    if (d) { await s.p.click('dialog[open] [data-zu]'); await s.p.waitForTimeout(200); }
    pruefe('Blatt schließt mit „Fertig“', !(await s.p.$('dialog[open]')));
    await s.p.click('#tb-mehr'); await s.p.waitForTimeout(300);
    const m = await s.p.textContent('#tab-mehr');
    pruefe('Quellen nennen die DWD-Warnungen über Bright Sky (CC BY 4.0)', /Warnungen: DWD über Bright Sky[\s\S]*CC BY 4\.0/.test(await s.p.textContent('#quellen')));
    pruefe('Datenschutz-Satz zu den Warnungen', /Für Warnungen sieht brightsky\.dev deine IP-Adresse und den Ort/.test(m));
    pruefe('Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
    await s.ctx.close();

    s = await start(b, { warnung: 'keine' });
    pruefe('Ohne Warnung: keine Kachel, keine leere Fläche', !(await s.p.$('#a9Warnung')) && !!(await s.p.$('.akt')) && s.anfragen.some(u => /alerts/.test(u)), s.anfragen);
    await s.ctx.close();
    s = await start(b, { warnung: 'fehler' });
    pruefe('Warnung-Abruf scheitert (offline/Fehler): still ausgeblendet, Startseite lädt normal', !(await s.p.$('#a9Warnung')) && !!(await s.p.$('.tage')) && !(await s.p.$('.leer-zustand')));
    await s.ctx.close();
    s = await start(b, { warnung: 'ja' }, { viewport: { width: 1280, height: 800 } });
    const mac = await s.p.evaluate(() => { const k = document.getElementById('a9Warnung'), l = document.querySelector('.mac-links'); return k ? { oben: k.parentNode.id === 'tab-wetter' && k.getBoundingClientRect().bottom <= l.getBoundingClientRect().top, b: k.getBoundingClientRect().width, h: document.documentElement.scrollWidth - innerWidth } : null; });
    pruefe('Mac 1280: Warnung über beiden Spalten, volle Breite, kein seitliches Scrollen', !!mac && mac.oben && mac.b > 600 && mac.h <= 0, mac);
    await H.foto(s.p, 'a9-warnung-mac-1280');
    await s.ctx.close();
  } finally { await b.close(); srv.close(); }
  const e = H.ergebnis();
  console.log('\n' + e.ok + ' Prüfungen bestanden, ' + e.fehler + ' fehlgeschlagen.');
  process.exit(e.fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

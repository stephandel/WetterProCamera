/* tests/warnung-luft.test.js – Module „Warnung“ (DWD über Bright Sky) und „Luftqualität“ (Ampel-Ring) auf der Startseite (Paket A9, 21.10.2026)
   Start:  PORT=8946 node tests/warnung-luft.test.js   (Exit-Code 0 = grün). Alle fremden Dienste sind auf Antworten aus tests/fixtures umgeleitet (tests/hilfe.js). */
'use strict';
const { webkit } = require('playwright');
const { neu, JETZT } = require('./hilfe.js');
const H = neu(+process.env.PORT || 8946);
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
    s = await start(b, { warnung: 'format' });
    pruefe('Warnung-Antwort im falschen Format (alerts ist kein Array): keine Kachel, keine Konsolenfehler', !(await s.p.$('#a9Warnung')) && !!(await s.p.$('.tage')) && s.konsole.length === 0, s.konsole);
    await s.ctx.close();
    s = await start(b, { warnung: 'test' });
    const ft = await s.p.evaluate(() => { const k = document.getElementById('a9Warnung'); return k ? k.textContent : ''; });
    pruefe('Testwarnungen (status „test“) und Entwarnungen (response_type „allclear“) werden nicht gezeigt, echte Warnung schon', /NEBEL/.test(ft) && !/TESTWARNUNG/.test(ft) && !/ENTWARNUNG/.test(ft), ft);
    await s.ctx.close();
    s = await H.neueSeite(b, {}, { warnung: 'ja' });
    s.anfragen = []; s.p.on('request', r => { if (/brightsky\.dev\/alerts/.test(r.url())) s.anfragen.push(r.url()); });
    await s.p.addInitScript(() => { if (!localStorage.getItem('wpgt-ort')) localStorage.setItem('wpgt-ort', JSON.stringify({ name: 'Corralejo', land: 'Spanien', lat: 28.73, lon: -13.867 })); });
    await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 }); await s.p.waitForTimeout(900);
    pruefe('Ort außerhalb Deutschlands (Corralejo): kein Warnungs-Abruf, keine Kachel', s.anfragen.length === 0 && !(await s.p.$('#a9Warnung')) && /Corralejo/.test(await s.p.textContent('#titelzeile')), s.anfragen);
    await s.ctx.close();
    s = await start(b, { warnung: 'ja' }, { viewport: { width: 1280, height: 800 } });
    const mac = await s.p.evaluate(() => { const k = document.getElementById('a9Warnung'), l = document.querySelector('.mac-links'); return k ? { oben: k.parentNode.id === 'tab-wetter' && k.getBoundingClientRect().bottom <= l.getBoundingClientRect().top, b: k.getBoundingClientRect().width, h: document.documentElement.scrollWidth - innerWidth } : null; });
    pruefe('Mac 1280: Warnung über beiden Spalten, volle Breite, kein seitliches Scrollen', !!mac && mac.oben && mac.b > 600 && mac.h <= 0, mac);
    await H.foto(s.p, 'a9-warnung-mac-1280');
    await s.ctx.close();

    console.log('Luftqualität (Ampel-Ring)');
    s = await start(b, {});
    const l = await s.p.evaluate(() => {
      const k = document.getElementById('a9Luft'); if (!k) return null;
      const w = [...document.getElementById('tab-wetter').children].map(e => e.id || (e.className.match(/\b(akt|std|tage|w3-mond-kachel)\b/) || [''])[0]);
      const cs = getComputedStyle(k), bogen = getComputedStyle(k.querySelector('.a9-ring-bogen')), sum = k.querySelector('summary').getBoundingClientRect();
      const tx = [...k.querySelectorAll('.a9-luft-kopf *, .kachel-titel, summary')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(e => getComputedStyle(e).color);
      return { reihe: w, text: k.textContent, zahl: k.querySelector('.a9-ring-zahl').textContent, bg: cs.backgroundColor, bogen: bogen.stroke, textfarben: tx, sumH: sum.height, offen: k.querySelector('details').open, balkenSichtbar: k.querySelector('.a9-stoffe').checkVisibility ? k.querySelector('.a9-stoffe').checkVisibility() : k.querySelector('.a9-balken').getBoundingClientRect().height > 0, anz: k.querySelectorAll('.a9-stoffe li').length, stoffe: k.querySelector('.a9-stoffe').textContent };
    });
    pruefe('Kachel Luftqualität steht nach der Tagesliste, vor Sonne und Mond', !!l && l.reihe.indexOf('a9Luft') === l.reihe.indexOf('tage') + 1 && l.reihe.indexOf('w3-mond-kachel') === l.reihe.indexOf('a9Luft') + 1, l && l.reihe);
    pruefe('Ring zeigt Zahl 43 und das Wort „Mittel“ (Europäischer AQI 40–60)', !!l && l.zahl === '43' && /Mittel/.test(l.text) && /Luftqualitätsindex 43/.test(l.text), l && l.text);
    pruefe('Ring-Farbe: Stufe „mittel“ = Gelb #FFD633', !!l && l.bogen === 'rgb(255, 214, 51)', l && l.bogen);
    pruefe('Text auf der Kachel mind. 4,5:1, Ringfarbe mind. 3:1', !!l && l.textfarben.every(c => kontrast(c, l.bg) >= 4.5) && kontrast(l.bogen, l.bg) >= 3, l && [l.textfarben, l.bg, l.bogen]);
    pruefe('Klein: Schadstoffe zugeklappt, Knopf mind. 44 px hoch', !!l && !l.offen && !l.balkenSichtbar && l.sumH >= 43.5, l && [l.offen, l.sumH]);
    await s.p.click('#a9Luft summary'); await s.p.waitForTimeout(200);
    const l2 = await s.p.evaluate(() => { const k = document.getElementById('a9Luft'); return { sicht: k.querySelector('.a9-stoffe').checkVisibility ? k.querySelector('.a9-stoffe').checkVisibility() : k.querySelector('.a9-balken').getBoundingClientRect().height > 0, text: k.querySelector('.a9-stoffe').textContent, n: k.querySelectorAll('.a9-stoffe li').length }; });
    pruefe('Antippen zeigt vier Schadstoff-Balken mit Wert und Wort', l2.sicht && l2.n === 4 && /Feinstaub PM2,5[\s\S]*8,1 µg\/m³ · mäßig/.test(l2.text) && /Ozon[\s\S]*58,0 µg\/m³ · gut/.test(l2.text), l2.text);
    await H.foto(s.p, 'a9-luft-390');
    pruefe('Ein einziger Aufruf bei Open-Meteo Luftqualität (Staub und aktuelle Werte zusammen)', s.anfragen.filter(u => /air-quality/.test(u)).length === 1 && /current=european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone/.test(s.anfragen.join(' ')) && /hourly=dust/.test(s.anfragen.join(' ')), s.anfragen);
    await s.p.click('#tb-mehr'); await s.p.waitForTimeout(300);
    pruefe('Quellen und Datenschutz nennen die Luftqualität', /Luftqualität: Open-Meteo Air Quality[\s\S]*CAMS/.test(await s.p.textContent('#quellen')) && /Für Luftqualität und Saharastaub sieht Open-Meteo deine IP-Adresse und den Ort/.test(await s.p.textContent('#tab-mehr')));
    pruefe('Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
    await s.ctx.close();
    s = await start(b, { luftSpaeter: true });
    await s.p.clock.setFixedTime(new Date(JETZT.getTime() + 4 * 3600e3));
    await s.p.click('[data-aktualisieren]'); await s.p.waitForTimeout(1500);
    pruefe('Spätere Luft-Antwort ohne Messwert überschreibt den guten Wert nicht (Kachel zeigt weiter 43)', s.anfragen.filter(u => /air-quality/.test(u)).length >= 2 && (await s.p.textContent('#a9Luft .a9-ring-zahl').catch(() => '')) === '43', s.anfragen.length);
    await s.ctx.close();
    s = await start(b, { luftFehler: true });
    pruefe('Luftqualität-Abruf scheitert: Kachel fehlt still, Startseite lädt normal', !(await s.p.$('#a9Luft')) && !!(await s.p.$('.tage')) && !(await s.p.$('.leer-zustand')));
    await s.ctx.close();
    s = await start(b, { warnung: 'ja' }, { viewport: { width: 1280, height: 800 } });
    const lm = await s.p.evaluate(() => { const k = document.getElementById('a9Luft'); return k ? { r: k.getBoundingClientRect().width, h: document.documentElement.scrollWidth - innerWidth } : null; });
    pruefe('Mac 1280: Luftqualität sichtbar, kein seitliches Scrollen', !!lm && lm.r > 200 && lm.h <= 0, lm);
    await H.foto(s.p, 'a9-luft-mac-1280');
    await s.ctx.close();
  } finally { await b.close(); srv.close(); }
  const e = H.ergebnis();
  console.log('\n' + e.ok + ' Prüfungen bestanden, ' + e.fehler + ' fehlgeschlagen.');
  process.exit(e.fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

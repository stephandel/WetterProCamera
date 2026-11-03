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
    console.log('Warnung (DWD), seit W1 (Ansatz F, 04.11.2026): Dreieck neben dem Ortsnamen, Block nur bei „extrem“');
    let s = await start(b, { warnung: 'ja' });
    const SYM = () => {
      const k = document.getElementById('a9Symbol'); if (!k || k.hidden) return null;
      const r = k.getBoundingClientRect(), n = document.getElementById('ortName').getBoundingClientRect(), f = k.querySelector('.a9-f'), z = k.querySelector('.a9-symbol-zahl');
      const kopf = document.getElementById('titelzeile').getBoundingClientRect();
      return { label: k.getAttribute('aria-label'), w: r.width, h: r.height, rechtsVomNamen: r.left >= n.right - 1, mitteY: Math.abs((r.top + r.height / 2) - (n.top + n.height / 2)), fuell: getComputedStyle(f).fill, zahl: z ? z.textContent : '', zahlFarbe: z && getComputedStyle(z).color, zahlBg: z && getComputedStyle(z).backgroundColor, kopfH: kopf.height, block: !!document.getElementById('a9Warnung') };
    };
    let w = await s.p.evaluate(SYM);
    pruefe('Zwei gewöhnliche Warnungen (markant + gering): kein großer Block mehr oben im Reiter Wetter', !!w && !w.block, w);
    pruefe('Dreieck steht rechts neben dem Ortsnamen, auf gleicher Höhe', !!w && w.rechtsVomNamen && w.mitteY <= 3, w);
    pruefe('Dreieck gefüllt in der Farbe der höchsten Stufe (markant = Orange)', !!w && w.fuell === 'rgb(255, 159, 10)', w && w.fuell);
    pruefe('Tippfläche mind. 44 × 44 px', !!w && w.w >= 43.5 && w.h >= 43.5, w);
    pruefe('Zahl „2“ am Dreieck, Kontrast mind. 4,5:1', !!w && w.zahl === '2' && kontrast(w.zahlFarbe, w.zahlBg) >= 4.5, w);
    pruefe('VoiceOver: „2 Wetterwarnungen, höchste Stufe: Markante Wetterwarnung. Details“', !!w && w.label === '2 Wetterwarnungen, höchste Stufe: Markante Wetterwarnung. Details', w && w.label);
    pruefe('Kopfzeile wird durch das Dreieck nicht höher (wie ohne Warnung)', !!w && w.kopfH <= await s.p.evaluate(() => { const k = document.getElementById('a9Symbol'); k.hidden = true; const h = document.getElementById('titelzeile').getBoundingClientRect().height; k.hidden = false; return h; }) + 0.5, w && w.kopfH);
    pruefe('Bright-Sky-Aufruf mit Ort', s.anfragen.some(u => /brightsky\.dev\/alerts\?/.test(u) && /lat=49\.4/.test(u) && /lon=8\.4/.test(u)), s.anfragen);
    await H.foto(s.p, 'w1-symbol-390');
    if (w) { await s.p.click('#a9Symbol'); await s.p.waitForTimeout(300); }
    const d = await s.p.evaluate(() => { const d = document.querySelector('dialog[open]'); return d ? { text: d.textContent, titel: d.querySelector('h2').textContent, n: d.querySelectorAll('.a9-blatt').length, quellen: (d.textContent.match(/Deutscher Wetterdienst/g) || []).length } : null; });
    pruefe('Antippen öffnet das Blatt mit beiden Warnungen, die schwerere zuerst', !!d && d.n === 2 && d.titel === 'Wetterwarnungen' && d.text.indexOf('FROST') < d.text.indexOf('WINDBÖEN'), d && [d.n, d.titel]);
    pruefe('Blatt mit vollem Text (Beschreibung, Hinweis, Zeitraum, Quelle DWD einmal)', !!d && /Tiefstwerte zwischen -2 und -4 Grad/.test(d.text) && /Empfindliche Pflanzen abdecken/.test(d.text) && /heute 18:00 bis morgen 08:00 Uhr/.test(d.text) && d.quellen === 1, d && d.text);
    await H.foto(s.p, 'w1-symbol-blatt-390');
    if (d) { await s.p.click('dialog[open] [data-zu]'); await s.p.waitForTimeout(200); }
    pruefe('Blatt schließt mit „Fertig“, Fokus wieder auf dem Dreieck', !(await s.p.$('dialog[open]')) && await s.p.evaluate(() => document.activeElement && document.activeElement.id === 'a9Symbol'));
    await s.p.click('#tb-graphs'); await s.p.waitForTimeout(300);
    pruefe('Dreieck bleibt auf anderen Reitern sichtbar (Graphs)', !!(await s.p.evaluate(SYM)));
    await s.p.click('#tb-mehr'); await s.p.waitForTimeout(300);
    const m = await s.p.textContent('#tab-mehr');
    pruefe('Quellen nennen die DWD-Warnungen über Bright Sky (CC BY 4.0)', /Warnungen: DWD über Bright Sky[\s\S]*CC BY 4\.0/.test(await s.p.textContent('#quellen')));
    pruefe('Datenschutz-Satz zu den Warnungen', /Für Warnungen sieht brightsky\.dev deine IP-Adresse und den Ort/.test(m));
    pruefe('Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
    await s.ctx.close();

    s = await start(b, { warnung: 'vier' });
    const v = await s.p.evaluate(() => {
      const k = document.getElementById('a9Warnung'), e = [...document.getElementById('tab-wetter').children].filter(x => !x.classList.contains('update-zeile'));
      if (!k) return null;
      const knoepfe = [...k.querySelectorAll('button')], r = knoepfe[0] && knoepfe[0].getBoundingClientRect(), sy = document.getElementById('a9Symbol');
      return { erste: e[0] === k, text: k.textContent, n: knoepfe.length, hoehe: r && r.height, bgs: knoepfe.map(x => getComputedStyle(x).backgroundColor), farben: knoepfe.map(x => getComputedStyle(x).color), sym: !sy.hidden && sy.className, symRand: getComputedStyle(sy.querySelector('.a9-f')).stroke };
    });
    pruefe('Mit „extrem“: zusätzlich der große Block ganz oben auf der Startseite', !!v && v.erste, v);
    pruefe('Block nennt Überschrift und Zeitraum, alle vier Warnungen, die schwerste (ORKAN) zuerst', !!v && v.n === 4 && /ORKAN/.test(v.text) && v.text.indexOf('ORKAN') < v.text.indexOf('FROST'), v && v.text);
    pruefe('Block in Warnfarbe nach Schwere (extrem dunkelrot … gering gelb)', !!v && v.bgs[0] === 'rgb(168, 20, 46)' && v.bgs[3] === 'rgb(255, 214, 51)', v && v.bgs);
    pruefe('Text auf der Warnfarbe mind. 4,5:1', !!v && v.bgs.every((g, i) => kontrast(v.farben[i], g) >= 4.5), v && [v.farben, v.bgs]);
    pruefe('Tippfläche im Block mind. 44 px hoch', !!v && v.hoehe >= 43.5, v && v.hoehe);
    pruefe('Dreieck daneben dunkelrot mit weißem Rand', !!v && /a9-s-extreme/.test(v.sym) && v.symRand === 'rgb(255, 255, 255)', v && [v.sym, v.symRand]);
    await H.foto(s.p, 'w1-extrem-390');
    const blaetter = [];
    for (let i = 0; i < 4; i++) {
      await s.p.click('#a9Warnung [data-a9-warn="' + i + '"]'); await s.p.waitForTimeout(250);
      blaetter.push(await s.p.evaluate(() => { const k = document.querySelector('dialog[open] .a9-blatt'); if (!k) return null; const c = getComputedStyle(k); return { klasse: k.className, n: document.querySelectorAll('dialog[open] .a9-blatt').length, bg: c.backgroundColor, farbe: c.color, texte: [...k.querySelectorAll('p, h3')].map(e => getComputedStyle(e).color) }; }));
      await s.p.click('dialog[open] [data-zu]'); await s.p.waitForTimeout(150);
    }
    pruefe('Block: jede Kachel öffnet das Blatt mit genau ihrer Warnung', blaetter.every(x => x && x.n === 1), blaetter.map(x => x && x.n));
    pruefe('Warnblatt: Schrift auf der Warnfarbe mind. 4,5:1 bei allen vier Schweregraden', blaetter.length === 4 && blaetter.every(x => x && x.texte.every(c => kontrast(c, x.bg) >= 4.5)), blaetter);
    await s.ctx.close();
    s = await start(b, { warnung: 'keine' });
    pruefe('Ohne Warnung: keine Kachel, kein Dreieck, keine leere Fläche', !(await s.p.$('#a9Warnung')) && await s.p.evaluate(() => document.getElementById('a9Symbol').hidden) && !!(await s.p.$('.akt')) && s.anfragen.some(u => /alerts/.test(u)), s.anfragen);
    await s.ctx.close();
    s = await start(b, { warnung: 'fehler' });
    pruefe('Warnung-Abruf scheitert (offline/Fehler): still ausgeblendet, Startseite lädt normal', !(await s.p.$('#a9Warnung')) && !!(await s.p.$('.tage')) && !(await s.p.$('.leer-zustand')));
    await s.ctx.close();
    s = await start(b, { warnung: 'format' });
    pruefe('Warnung-Antwort im falschen Format (alerts ist kein Array): keine Kachel, keine Konsolenfehler', !(await s.p.$('#a9Warnung')) && !!(await s.p.$('.tage')) && s.konsole.length === 0, s.konsole);
    await s.ctx.close();
    s = await start(b, { warnung: 'test' });
    await s.p.click('#a9Symbol'); await s.p.waitForTimeout(250);
    const ft = await s.p.evaluate(() => { const k = document.querySelector('dialog[open]'); return k ? k.textContent : ''; });
    pruefe('Testwarnungen (status „test“) und Entwarnungen (response_type „allclear“) werden nicht gezeigt, echte Warnung schon', /NEBEL/.test(ft) && !/TESTWARNUNG/.test(ft) && !/ENTWARNUNG/.test(ft), ft);
    await s.ctx.close();
    s = await H.neueSeite(b, {}, { warnung: 'ja' });
    s.anfragen = []; s.p.on('request', r => { if (/brightsky\.dev\/alerts/.test(r.url())) s.anfragen.push(r.url()); });
    await s.p.addInitScript(() => { if (!localStorage.getItem('wpgt-ort')) localStorage.setItem('wpgt-ort', JSON.stringify({ name: 'Corralejo', land: 'Spanien', lat: 28.73, lon: -13.867 })); });
    await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 }); await s.p.waitForTimeout(900);
    pruefe('Ort außerhalb Deutschlands (Corralejo): kein Warnungs-Abruf, keine Kachel, kein Dreieck', s.anfragen.length === 0 && !(await s.p.$('#a9Warnung')) && await s.p.evaluate(() => document.getElementById('a9Symbol').hidden) && /Corralejo/.test(await s.p.textContent('#titelzeile')), s.anfragen);
    await s.ctx.close();
    s = await start(b, { warnung: 'vier' }, { viewport: { width: 1280, height: 800 } });
    const mac = await s.p.evaluate(() => { const k = document.getElementById('a9Warnung'), l = document.querySelector('.mac-links'); return k ? { oben: k.parentNode.id === 'tab-wetter' && k.getBoundingClientRect().bottom <= l.getBoundingClientRect().top, b: k.getBoundingClientRect().width, h: document.documentElement.scrollWidth - innerWidth } : null; });
    pruefe('Mac 1280 (extrem): Warnung über beiden Spalten, volle Breite, kein seitliches Scrollen', !!mac && mac.oben && mac.b > 600 && mac.h <= 0, mac);
    await H.foto(s.p, 'a9-warnung-mac-1280');
    await s.ctx.close();

    console.log('Luftqualität (Ampel-Ring)');
    s = await start(b, {});
    const l = await s.p.evaluate(() => {
      const k = document.getElementById('a9Luft'); if (!k) return null;
      const w = [...document.getElementById('tab-wetter').children].map(e => e.id || (e.className.match(/\b(akt|std|tage|w3-sonne-kachel|w3-mond-kachel)\b/) || [''])[0]);
      const cs = getComputedStyle(k), bogen = getComputedStyle(k.querySelector('.a9-ring-bogen')), sum = k.querySelector('summary').getBoundingClientRect();
      const tx = [...k.querySelectorAll('.a9-luft-kopf *, .kachel-titel, summary')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(e => getComputedStyle(e).color);
      return { reihe: w, text: k.textContent, zahl: k.querySelector('.a9-ring-zahl').textContent, bg: cs.backgroundColor, bogen: bogen.stroke, textfarben: tx, sumH: sum.height, offen: k.querySelector('details').open, balkenSichtbar: k.querySelector('.a9-stoffe').checkVisibility ? k.querySelector('.a9-stoffe').checkVisibility() : k.querySelector('.a9-balken').getBoundingClientRect().height > 0, anz: k.querySelectorAll('.a9-stoffe li').length, stoffe: k.querySelector('.a9-stoffe').textContent };
    });
    pruefe('Kachel Luftqualität steht nach der Tagesliste, vor Sonne und Mond', !!l && l.reihe.indexOf('a9Luft') === l.reihe.indexOf('tage') + 1 && l.reihe.indexOf('w3-sonne-kachel') === l.reihe.indexOf('a9Luft') + 1 && l.reihe.indexOf('w3-mond-kachel') === l.reihe.indexOf('a9Luft') + 2, l && l.reihe);
    pruefe('Ring zeigt Zahl 43 und das Wort „Mäßig“ (Europäischer AQI 40–60)', !!l && l.zahl === '43' && /Mäßig/.test(l.text) && /Luftqualitätsindex 43/.test(l.text), l && l.text);
    pruefe('Ring-Farbe: Stufe „mäßig“ = Gelb #FFD633', !!l && l.bogen === 'rgb(255, 214, 51)', l && l.bogen);
    pruefe('Text auf der Kachel mind. 4,5:1, Ringfarbe mind. 3:1', !!l && l.textfarben.every(c => kontrast(c, l.bg) >= 4.5) && kontrast(l.bogen, l.bg) >= 3, l && [l.textfarben, l.bg, l.bogen]);
    pruefe('Klein: Schadstoffe zugeklappt, Knopf mind. 44 px hoch', !!l && !l.offen && !l.balkenSichtbar && l.sumH >= 43.5, l && [l.offen, l.sumH]);
    await s.p.click('#a9Luft summary'); await s.p.waitForTimeout(200);
    const l2 = await s.p.evaluate(() => { const k = document.getElementById('a9Luft'); return { sicht: k.querySelector('.a9-stoffe').checkVisibility ? k.querySelector('.a9-stoffe').checkVisibility() : k.querySelector('.a9-balken').getBoundingClientRect().height > 0, text: k.querySelector('.a9-stoffe').textContent, n: k.querySelectorAll('.a9-stoffe li').length }; });
    pruefe('Antippen zeigt vier Schadstoff-Balken mit Wert und Wort', l2.sicht && l2.n === 4 && /Feinstaub PM2,5[\s\S]*8,1 µg\/m³ · noch gut/.test(l2.text) && /Ozon[\s\S]*58,0 µg\/m³ · gut/.test(l2.text), l2.text);
    await H.foto(s.p, 'a9-luft-390');
    pruefe('Stufenwörter nach UBA-Sprachgebrauch, ohne „mittel“ (gut, noch gut, mäßig, schlecht, sehr schlecht, extrem schlecht)', await s.p.evaluate(() => /noch gut/.test(document.querySelector('#a9Luft').textContent) && !/mittel/i.test(document.querySelector('#a9Luft').textContent)));
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

/* tests/design-gelb.test.js – Design vom 20.10.2026 (Link aus dem Design-Konfigurator): gelber Akzent, immer dunkel, Modulreihenfolge der Startseite.
   Start:  PORT=8822 node tests/design-gelb.test.js   (Exit-Code 0 = grün). Teil 1 rechnet nur mit tokens.css, Teil 2 prüft die App in WebKit. */
'use strict';
const fs = require('fs');
const path = require('path');
const { webkit } = require('playwright');
const { neu, WURZEL } = require('./hilfe.js');
const H = neu(+process.env.PORT || 8822);
const { pruefe } = H;

/* ---------- Farbrechnung (WCAG 2.x) ---------- */
const hex = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const lin = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
const lum = ([r, g, b]) => .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b);
const kontrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const ueber = (vorn, alpha, hinten) => vorn.map((v, i) => v * alpha + hinten[i] * (1 - alpha));
const css = fs.readFileSync(path.join(WURZEL, 'tokens.css'), 'utf8');
const tok = n => { const m = new RegExp('--' + n + ':\\s*([^;]+);').exec(css); return m && m[1].trim().replace(/\s*\/\*.*$/, ''); };
const farbe = n => hex(tok(n));
const rgba = n => { const m = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(tok(n)); return { rgb: [+m[1], +m[2], +m[3]], a: +m[4] }; };

(async () => {
  console.log('Tokens und Kontrast');
  pruefe('Akzent ist Gelb #FFD633', tok('akzent').toUpperCase() === '#FFD633', tok('akzent'));
  pruefe('Zweitfarbe für hervorgehobene Werte ist Gelb', tok('akzent-2').toUpperCase() === '#FFD633', tok('akzent-2'));
  pruefe('tokens.css setzt color-scheme: dark', /color-scheme:\s*dark/.test(css));
  pruefe('tokens.css kennt keinen Hellmodus mehr (kein prefers-color-scheme)', !/prefers-color-scheme/.test(css));
  pruefe('Hintergrund und Kachel sind das Blau aus dem Link (#03428A, #1158AD)', tok('bg').toUpperCase() === '#03428A' && tok('bg-2').toUpperCase() === '#1158AD', [tok('bg'), tok('bg-2')]);
  pruefe('Text auf gelber Fläche ist dunkel (--auf-akzent)', lum(farbe('auf-akzent')) < .05, tok('auf-akzent'));
  const bg = farbe('bg'), bg2 = farbe('bg-2'), gelb = farbe('akzent'), tagA = farbe('tag-a'), tagB = farbe('tag-b');
  pruefe('Tagesliste im Blau der Kacheln (#1158AD und #0C50A1 wechselnd, nicht mehr braun-schwarz)', tok('tag-a').toUpperCase() === '#1158AD' && tok('tag-b').toUpperCase() === '#0C50A1', [tok('tag-a'), tok('tag-b')]);
  const glas = rgba('glas-bg'), glasAufBg = ueber(glas.rgb, glas.a, bg), glasAufBg2 = ueber(glas.rgb, glas.a, bg2);
  const paare = [
    ['--auf-akzent auf Gelb', kontrast(farbe('auf-akzent'), gelb), 4.5],
    ['Gelb auf --bg', kontrast(gelb, bg), 4.5], ['Gelb auf --bg-2 (Kachel)', kontrast(gelb, bg2), 4.5],
    ['Gelb auf Glas über --bg', kontrast(gelb, glasAufBg), 4.5], ['Gelb auf Glas über --bg-2', kontrast(gelb, glasAufBg2), 4.5],
    ['Gelb auf Tagestönung A', kontrast(gelb, tagA), 4.5], ['Gelb auf Tagestönung B', kontrast(gelb, tagB), 4.5],
    ['Gelb auf --akzent-tint', kontrast(gelb, farbe('akzent-tint')), 4.5],
    ['--label auf --bg', kontrast(farbe('label'), bg), 4.5], ['--label auf --bg-2', kontrast(farbe('label'), bg2), 4.5],
    ['--label auf Tagestönung A', kontrast(farbe('label'), tagA), 4.5], ['--label auf Tagestönung B', kontrast(farbe('label'), tagB), 4.5]
  ];
  const l2 = rgba('label-2');
  [['--bg', bg], ['--bg-2', bg2], ['Tagestönung A', tagA], ['Tagestönung B', tagB]].forEach(([n, g]) => paare.push(['--label-2 auf ' + n, kontrast(ueber(l2.rgb, l2.a, g), g), 4.5]));
  // Zweitfarbe/Akzent auf der Tönung über der Füllung (aktiver Tab: Gelb auf --fuellung über Glas)
  const fu = rgba('fuellung'); paare.push(['Gelb auf --fuellung über Glas', kontrast(gelb, ueber(fu.rgb, fu.a, glasAufBg)), 4.5]);
  paare.forEach(([n, k, min]) => pruefe('Kontrast ' + n + ': ' + k.toFixed(1).replace('.', ',') + ':1 (mind. ' + min + ':1)', k >= min, k.toFixed(2)));

  console.log('App in WebKit');
  const srv = await H.server();
  const b = await webkit.launch();
  try {
    // Gerät auf „hell" gestellt: die App bleibt trotzdem dunkel
    let s = await H.neueSeite(b, { colorScheme: 'light' });
    await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 }); await s.p.waitForTimeout(600);
    const d = await s.p.evaluate(() => {
      const cs = e => getComputedStyle(e), w = document.querySelector('#tab-wetter');
      const kinder = [...w.children].map(e => e.id || (e.className.match(/\b(akt|std|tage|w3-mond-kachel|update-zeile|a5-mg-kachel)\b/) || [e.className])[0]);
      return {
        scheme: cs(document.documentElement).colorScheme, bg: cs(document.body).backgroundColor, akzent: cs(document.documentElement).getPropertyValue('--akzent').trim(),
        akzentText: cs(document.documentElement).getPropertyValue('--akzent-text').trim(),
        tab: cs(document.querySelector('#tabbar [aria-selected="true"]')).color,
        aktTemp: cs(document.querySelector('.akt-temp')).color, stdTemp: cs(document.querySelector('.std-temp')).color, tagMax: cs(document.querySelector('.tag-temp .max')).color,
        knopf: (b => ({ f: cs(b).backgroundColor, c: cs(b).color }))(document.querySelector('.tab-kamera .ausloeser')),
        theme: [...document.querySelectorAll('meta[name="theme-color"]')].map(m => m.content + '|' + (m.media || '')),
        kinder, regen: !!document.getElementById('regenTitel'), webcam: !!document.querySelector('[id^="wc"], .webcam'), tipps: !!document.getElementById('a5Tipps')
      };
    });
    pruefe('Gerät hell: App bleibt dunkel (color-scheme dark, Hintergrund #03428A)', d.scheme === 'dark' && d.bg === 'rgb(3, 66, 138)', d);
    pruefe('Akzent ist Gelb, auch bei hellem Gerät', d.akzent.toUpperCase() === '#FFD633', d.akzent);
    pruefe('Akzentschrift (Tab-Leiste, Knöpfe auf Glas) ist unverändert Gelb, nicht abgedunkelt', d.akzentText.toUpperCase() === '#FFD633' && d.tab === 'rgb(255, 214, 51)', [d.akzentText, d.tab]);
    pruefe('Temperaturen (Aktuell, Stunden, Höchstwert) in der Zweitfarbe Gelb', [d.aktTemp, d.stdTemp, d.tagMax].every(c => c === 'rgb(255, 214, 51)'), [d.aktTemp, d.stdTemp, d.tagMax]);
    pruefe('Kamera-Auslöser: gelbe Fläche mit dunklem Symbol', d.knopf.f === 'rgb(255, 214, 51)' && d.knopf.c === 'rgb(0, 0, 0)', d.knopf);
    pruefe('Browser-Leiste: ein einziges theme-color #03428A, keine Hell-Variante', d.theme.length === 1 && /^#03428A\|$/i.test(d.theme[0]), d.theme);
    pruefe('Startseite: Reihenfolge Aktuell, Stunden, Tagesliste, Mond, Was heute geht', JSON.stringify(d.kinder.filter(k => k !== 'update-zeile')) === JSON.stringify(['akt', 'std', 'tage', 'w3-mond-kachel', 'a5Tipps']), d.kinder);
    pruefe('Startseite: Regenradar-Kachel aus, keine Webcam-Kachel', !d.regen && !d.webcam, d);
    pruefe('Startseite: Meteogramm aus', !d.kinder.includes('a5-mg-kachel'), d.kinder);
    await H.foto(s.p, 'design-gelb-start-390');
    // Radar-Kachel lässt sich unter „Mehr" einschalten, steht dann nach den Stunden
    await s.p.click('#tb-mehr'); await s.p.check('#a5Start input[data-a5="radar"]'); await s.p.click('#tb-wetter'); await s.p.waitForTimeout(300);
    const r = await s.p.evaluate(() => [...document.querySelector('#tab-wetter').children].map(e => e.className.split(' ').filter(c => c !== 'kachel')[0] || e.id));
    pruefe('Schalter „Regenradar-Kachel" bringt sie zurück, direkt nach den Stunden', r.indexOf('std') >= 0 && !!(await s.p.$('#regenTitel')) && (await s.p.evaluate(() => document.querySelector('.std').nextElementSibling.querySelector('#regenTitel') != null)), r);
    // Tab Graphs beginnt mit dem Meteogramm
    await s.p.click('#tb-graphs'); await s.p.waitForTimeout(400);
    pruefe('Tab Graphs: Meteogramm ist vorgewählt', await s.p.evaluate(() => { const e = document.querySelector('[data-seg="graphs"] [data-v="meteo"]'); return !!e && e.getAttribute('aria-checked') === 'true'; }));
    pruefe('Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
    await s.ctx.close();
    // Orte aus dem Link: 6 Standardorte, 8 Tage, 3 Stundenspalten
    s = await H.neueSeite(b, {});
    await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 });
    const z = await s.p.evaluate(() => ({ tage: document.querySelectorAll('.tage .tag').length, std: document.querySelectorAll('.std > div').length }));
    pruefe('8 Vorhersagetage und 3 Stundenspalten (Link: vorhersageTage 8, stundenSpalten 3)', z.tage === 8 && z.std === 3, z);
    await s.p.click('#tb-mehr'); await s.p.waitForTimeout(200);
    pruefe('Mehr: 6 Orte aus dem Link (Mannheim, Mengerschied, Corralejo, El Cotillo, Costa Calma, Morro Jable)', (await s.p.$$('#orteListe .ort-wahl')).length === 6);
    await s.ctx.close();
  } finally { await b.close(); srv.close(); }
  const e = H.ergebnis();
  console.log('\n' + e.ok + ' Prüfungen bestanden, ' + e.fehler + ' fehlgeschlagen.');
  process.exit(e.fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

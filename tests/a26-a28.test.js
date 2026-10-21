/* tests/a26-a28.test.js – Rest aus A9 (A26) und Durchgang-Funde (A28): Foto-Infos als Studio-Vorgabe, Karten-Ebenen Wind/Wolken/Isobaren,
   Sonne getrennt von Mond, Fokus im Blatt, Beschriftungen. Start:  PORT=8952 node tests/a26-a28.test.js   (Exit-Code 0 = grün).
   Fremde Dienste sind auf Antworten aus tests/fixtures umgeleitet (tests/hilfe.js). */
'use strict';
const fs = require('fs');
const { webkit } = require('playwright');
const { neu } = require('./hilfe.js');
const H = neu(+process.env.PORT || 8952);
const { pruefe } = H;
fs.mkdirSync(H.BILDER, { recursive: true });

async function start(b, opt, modus) {
  const s = await H.neueSeite(b, opt || {}, modus || {});
  await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 }); await s.p.waitForTimeout(700);
  return s;
}

(async () => {
  const srv = await H.server();
  const b = await webkit.launch();
  try {
    console.log('1) Foto-Infos als Studio-Vorgabe (A26)');
    {
      const s = await start(b);
      await s.p.waitForFunction(() => window.KSStudio, null, { timeout: 8000 });
      await s.p.click('#btnTeilen'); await s.p.waitForTimeout(800);
      const z = await s.p.evaluate(() => { const i = document.querySelector('#ksWurzel .ks')._ksInst; return i.Z.daten; });
      const an = Object.keys(z).filter(k => z[k] === true || (typeof z[k] === 'string' && z[k] !== 'aus')).sort();
      pruefe('Studio legt standardmäßig nur Temperatur, Wettersymbol, Ort und Datum aufs Foto', JSON.stringify(an) === JSON.stringify(['datum', 'ort', 'symbol', 'temperatur']), z);
      pruefe('Ort bleibt „genau“ (Stadt, Stadtteil)', z.ort === 'genau', z.ort);
      pruefe('Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
      await s.ctx.close();
    }

    console.log('2) Sonne getrennt von Mond (A26)');
    {
      const s = await start(b);
      const k = await s.p.evaluate(() => {
        const so = document.querySelector('.w3-sonne-kachel'), mo = document.querySelector('.w3-mond-kachel');
        const reihe = [...document.getElementById('tab-wetter').children].map(e => e.id || e.className.split(' ').find(c => /^(tage|w3-sonne-kachel|w3-mond-kachel)$/.test(c)) || '');
        return { so: so && so.textContent.replace(/\s+/g, ' '), mo: mo && mo.textContent.replace(/\s+/g, ' '), reihe, soT: so && so.querySelector('h2').textContent, moT: mo && mo.querySelector('h2').textContent,
          soK: so && so.querySelector('[data-w3-sonne]') && so.querySelector('[data-w3-sonne]').getBoundingClientRect().height, moK: mo && mo.querySelector('[data-w3-mond]') && mo.querySelector('[data-w3-mond]').getBoundingClientRect().height, bogen: !!(so && so.querySelector('.w3-bogen')) };
      });
      pruefe('Zwei getrennte Kacheln: „Sonne“ und „Mond“', k.soT === 'Sonne' && k.moT === 'Mond', [k.soT, k.moT]);
      pruefe('Reihenfolge: Tagesliste, Luftqualität, Sonne, Mond, Was heute geht', k.reihe.join(',').includes('tage,a9Luft,w3-sonne-kachel,w3-mond-kachel,a5Tipps'), k.reihe);
      pruefe('Sonne-Kachel: Auf- und Untergang, Tageslänge, goldene Stunde, Sonnenbogen; nichts vom Mond', !!k.so && /↑ 07:4\d ↓ 18:3\d/.test(k.so) && /Tageslänge/.test(k.so) && /Goldene Stunde/.test(k.so) && k.bogen && !/Mond|beleuchtet/.test(k.so), k.so);
      pruefe('Mond-Kachel: Phase in Prozent, Auf- und Untergang; nichts von der Sonne', !!k.mo && /\d+ %/.test(k.mo) && /Mondaufgang/.test(k.mo) && /Monduntergang/.test(k.mo) && !/Sonne|Dämmerung/.test(k.mo), k.mo);
      pruefe('Knöpfe „Sonne ausführlich“ und „Mond ausführlich“ mind. 44 px', k.soK >= 43.5 && k.moK >= 43.5, [k.soK, k.moK]);
      await s.p.click('.w3-sonne-kachel [data-w3-sonne]'); await s.p.waitForSelector('#w3Sonne[open]');
      const bs = await s.p.evaluate(() => ({ t: document.getElementById('w3SonneInhalt').textContent.replace(/\s+/g, ' '), titel: document.getElementById('w3SonneT').textContent, bogen: !!document.querySelector('#w3Sonne .w3-bogen'), jetzt: !!document.querySelector('#w3Sonne .w3-sonne-jetzt'), mondbild: !!document.querySelector('#w3Sonne .w3-mond-bild') }));
      pruefe('Sonne-Blatt: Titel „Sonne“, Bogen mit Jetzt-Punkt, Aufgang, goldene Stunde, drei Dämmerungen, kein Mond', bs.titel === 'Sonne' && bs.bogen && bs.jetzt && /Sonnenaufgang\s*07:/.test(bs.t) && /Goldene Stunde abends/.test(bs.t) && /Bürgerliche Dämmerung/.test(bs.t) && /Nautische Dämmerung/.test(bs.t) && /Astronomische Dämmerung/.test(bs.t) && !bs.mondbild && !/Mondaufgang|beleuchtet/.test(bs.t), bs);
      await H.foto(s.p, 'a26-390-sonne-blatt');
      await s.p.keyboard.press('Escape'); await s.p.waitForTimeout(150);
      pruefe('Fokus kehrt auf den Sonne-Knopf zurück', await s.p.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-w3-sonne')));
      await s.p.click('.w3-mond-kachel [data-w3-mond]'); await s.p.waitForSelector('#w3Mond[open]');
      const bm = await s.p.evaluate(() => ({ t: document.getElementById('w3MondInhalt').textContent.replace(/\s+/g, ' '), titel: document.getElementById('w3MondT').textContent, mondbild: !!document.querySelector('#w3Mond .w3-mond-bild'), bogen: !!document.querySelector('#w3Mond .w3-bogen') }));
      pruefe('Mond-Blatt: Titel „Mond“, Mondbild, Phase, Auf- und Untergang, Voll- und Neumond; kein Sonnenbogen, keine Dämmerung', bm.titel === 'Mond' && bm.mondbild && /beleuchtet/.test(bm.t) && /Mondaufgang/.test(bm.t) && /Monduntergang/.test(bm.t) && /Nächster Vollmond/.test(bm.t) && /Nächster Neumond/.test(bm.t) && !bm.bogen && !/Dämmerung|Sonnenaufgang/.test(bm.t), bm);
      await H.foto(s.p, 'a26-390-mond-blatt');
      await s.p.keyboard.press('Escape'); await s.p.waitForTimeout(150);
      await s.p.click('.tag[data-w3-tag="1"]'); await s.p.waitForSelector('#w3Tag[open]');
      const td = await s.p.evaluate(() => ({ h3: [...document.querySelectorAll('#w3TagInhalt h3')].map(x => x.textContent), knoepfe: [...document.querySelectorAll('#w3TagInhalt [data-w3-sonne], #w3TagInhalt [data-w3-mond]')].map(x => x.textContent.trim()) }));
      pruefe('Tagesdetail: getrennte Abschnitte „Sonne“ und „Mond“ mit je einem Knopf', JSON.stringify(td.h3) === JSON.stringify(['Sonne', 'Mond']) && td.knoepfe.join('|') === 'Sonne ausführlich|Mond ausführlich', td);
      await s.p.click('#w3Tag [data-w3-sonne]'); await s.p.waitForSelector('#w3Sonne[open]');
      pruefe('Vom Tagesdetail öffnet „Sonne ausführlich“ das Sonne-Blatt für den gewählten Tag', /Sonnenaufgang\s*07:/.test(await s.p.textContent('#w3SonneInhalt')));
      pruefe('Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
      await s.ctx.close();
    }

    console.log('3) Karten-Ebenen Wind, Wolken, Isobaren (A26)');
    {
      const s = await start(b);
      const gitter = [];
      s.p.on('request', r => { if (/api\.open-meteo\.com/.test(r.url()) && /pressure_msl/.test(r.url())) gitter.push(r.url()); });
      await s.p.click('#tb-radsat'); await s.p.waitForSelector('#ebenenWahl [data-ebene]'); await s.p.waitForSelector('#radarKarte .leaflet-tile-pane', { state: 'attached' }); await s.p.waitForTimeout(500);
      const pillen = await s.p.$$eval('#ebenenWahl [data-ebene]', bs => bs.map(x => ({ id: x.dataset.ebene, t: x.textContent.trim(), h: x.getBoundingClientRect().height })));
      pruefe('Pillen: Radar, Satellit, Infrarot, Karte, Wind, Wolken, Isobaren', pillen.map(x => x.t).join(',') === 'Radar,Satellit,Infrarot,Karte,Wind,Wolken,Isobaren', pillen);
      pruefe('Alle Pillen mind. 44 px hoch', pillen.every(x => x.h >= 43.5), pillen.map(x => x.h));
      const flaeche = () => s.p.evaluate(async () => {
        const i = document.querySelector('#radarKarte img.a26-flaeche'); if (!i) return null;
        if (!i.complete) await new Promise(r => { i.onload = r; });
        const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const x = c.getContext('2d'); x.drawImage(i, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let k = 3; k < d.length; k += 4) if (d[k] > 40) n++;
        return { n, gesamt: d.length / 4, breite: c.width };
      });
      for (const [id, name, saetze] of [['wind', 'Wind', /Pfeil/], ['wolken', 'Wolken', /Bewölkung|bedeckt/], ['druck', 'Isobaren', /Luftdruck|hPa/]]) {
        await s.p.click('#ebenenWahl [data-ebene="' + id + '"]'); await s.p.waitForFunction(() => document.querySelector('#radarKarte img.a26-flaeche'), null, { timeout: 8000 }).catch(() => { });
        await s.p.waitForTimeout(500);
        const f = await flaeche(), ui = await s.p.evaluate(() => ({ play: document.getElementById('radarPlay').hidden, steuer: document.getElementById('w3Steuer').hidden, text: document.getElementById('ebeneQuelle').textContent, zeit: document.getElementById('radarZeit').textContent, checked: document.querySelector('#ebenenWahl [aria-checked="true"]').dataset.ebene }));
        pruefe(name + ': Fläche liegt über der Karte (Bild mit sichtbaren Pixeln)', !!f && f.n > 200, f);
        pruefe(name + ': Abspielen und Zeitleiste ausgeblendet, Pille gewählt, Erklärung und Quelle Open-Meteo', ui.play && ui.steuer && ui.checked === id && saetze.test(ui.text) && /Open-Meteo/.test(ui.text), ui);
        await H.foto(s.p, 'a26-390-karte-' + id);
      }
      pruefe('Ein Abruf an Open-Meteo für das Gitter (mind. 40 Punkte, Wind, Wolken, Druck), gleicher Ausschnitt wird nicht neu geholt', gitter.length === 1 && decodeURIComponent(gitter[0]).split('latitude=')[1].split('&')[0].split(',').length >= 40 && /wind_speed_10m/.test(gitter[0]) && /cloud_cover/.test(gitter[0]), gitter.length + ' ' + (gitter[0] || '').slice(0, 200));
      await s.p.click('#ebenenWahl [data-ebene="radar"]'); await s.p.waitForTimeout(500);
      pruefe('Zurück auf Radar: Fläche entfernt, Abspielen wieder da', !(await s.p.$('#radarKarte img.a26-flaeche')) && await s.p.evaluate(() => !document.getElementById('radarPlay').hidden));
      await s.p.focus('#ebenenWahl [data-ebene="radar"]');
      for (let i = 0; i < 6; i++) await s.p.keyboard.press('ArrowRight');
      pruefe('Pfeiltaste wechselt bis „Isobaren“', await s.p.evaluate(() => document.querySelector('#ebenenWahl [aria-checked="true"]').dataset.ebene) === 'druck');
      await s.p.click('#tb-mehr'); await s.p.waitForTimeout(300);
      pruefe('Datenschutz nennt die Karten-Ebenen', /Wind, Wolken und Isobaren[\s\S]*Open-Meteo/.test(await s.p.textContent('#datenschutz')));
      pruefe('Quellen nennen weiter nur bekannte Server (Open-Meteo, RainViewer, EUMETSAT, OpenTopoMap)', !/windy|openweathermap|mapbox/i.test(await s.p.textContent('#tab-mehr')));
      pruefe('Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
      await s.ctx.close();
      const f = await start(b, {}, { gitterFehler: true });
      await f.p.click('#tb-radsat'); await f.p.waitForSelector('#radarKarte .leaflet-tile-pane', { state: 'attached' }); await f.p.waitForTimeout(400);
      await f.p.click('#ebenenWahl [data-ebene="wind"]'); await f.p.waitForTimeout(1200);
      pruefe('Gitter nicht erreichbar: ruhiger Satz, keine Fläche, keine Seitenfehler', /nicht erreichbar/.test(await f.p.textContent('#radarZeit')) && !(await f.p.$('#radarKarte img.a26-flaeche')) && !f.konsole.some(k => /Seitenfehler/.test(k)), [await f.p.textContent('#radarZeit'), f.konsole]);
      await f.ctx.close();
    }

    console.log('4) Durchgang-Funde 4, 12, 14, 15 (A28; Tagesinfo-Zeile bleibt bei 11 px, siehe Abschnitt 5)');
    {
      const s = await start(b, {}, { warnung: 'ja' });
      // Fund 14: Zusammenfassung im Tagesdetail nennt den Abschnitt
      await s.p.click('.tag[data-w3-tag="1"]'); await s.p.waitForSelector('#w3Tag[open]');
      const sum = () => s.p.textContent('#w3Tag .w3-summe');
      pruefe('Fund 14: Zusammenfassung beginnt mit dem Abschnitt („Tag: Tief …“)', /^Tag: Tief \d+/.test(await sum()), await sum());
      await s.p.click('#w3Tag [data-v="n1"]');
      pruefe('Fund 14: nach dem Wechsel „Nacht davor: Tief …“', /^Nacht davor: Tief \d+/.test(await sum()), await sum());
      await s.p.click('#w3Tag [data-v="n2"]');
      pruefe('Fund 14: „Nacht danach: Tief …“', /^Nacht danach: Tief \d+/.test(await sum()), await sum());
      // Fund 12: Fokus kreist im Blatt (Tagesblatt und Warnblatt)
      const kreist = async (id, n) => {
        const aus = [];
        for (let i = 0; i < n; i++) { await s.p.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab'); aus.push(await s.p.evaluate(i2 => { const d = document.getElementById(i2), a = document.activeElement; return !!d && d.contains(a) && a !== d ? (a.textContent.trim() || a.getAttribute('aria-label') || a.tagName).slice(0, 14) : 'DRAUSSEN:' + (a && a.tagName); }, id)); }
        for (let i = 0; i < 9; i++) await s.p.keyboard.press('Tab');
        aus.push(await s.p.evaluate(i2 => document.getElementById(i2).contains(document.activeElement) && document.activeElement !== document.getElementById(i2) ? 'innen' : 'DRAUSSEN', id));
        return aus;
      };
      let k = await kreist('w3Tag', 14);
      pruefe('Fund 12: Tab und Umschalt+Tab bleiben im Tagesblatt (nie auf Rahmen oder Seitenkörper)', k.every(x => !/DRAUSSEN/.test(x)), k);
      await s.p.keyboard.press('Escape'); await s.p.waitForTimeout(150);
      await s.p.click('#a9Warnung button'); await s.p.waitForSelector('#a9WarnBlatt[open]');
      k = await kreist('a9WarnBlatt', 8);
      pruefe('Fund 12: Tab bleibt im Warnblatt', k.every(x => !/DRAUSSEN/.test(x)), k);
      await s.p.keyboard.press('Escape'); await s.p.waitForTimeout(150);
      // Fund 4: Beschriftungen im Meteogramm mind. 12 px
      await s.p.click('#tb-graphs'); await s.p.waitForTimeout(400);
      await s.p.evaluate(() => { const m = [...document.querySelectorAll('#tab-graphs [data-seg] [data-v]')].find(x => /Meteogramm/.test(x.textContent)); if (m) m.click(); });
      await s.p.waitForSelector('#tab-graphs .mg-svg, #tab-graphs .mg-wrap', { timeout: 10000 }).catch(() => { });
      await s.p.waitForTimeout(800);
      const mg = await s.p.evaluate(() => {
        const sichtbar = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden'; };
        const el = [...document.querySelectorAll('#tab-graphs .pc-mg *')].filter(e => sichtbar(e) && ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || e.tagName === 'text'));
        const klein = el.filter(e => parseFloat(getComputedStyle(e).fontSize) < (e.classList && e.classList.contains('mg-tagesinfo') ? 11 : 12)).map(e => (e.className.baseVal != null ? e.className.baseVal : e.className) + ' ' + getComputedStyle(e).fontSize + ' ' + e.textContent.trim().slice(0, 12));
        return { n: el.length, klein: klein.slice(0, 8), seitlich: document.documentElement.scrollWidth - innerWidth };
      });
      pruefe('Fund 4: Meteogramm in 390 px: Kopfzeile, Zeitachse und Werte mind. 12 px', mg.n > 10 && mg.klein.length === 0, mg);
      pruefe('Fund 4: kein seitliches Scrollen', mg.seitlich <= 0, mg.seitlich);
      await H.foto(s.p, 'a28-390-graphs-meteogramm');
      // Fund 15: Leaflet-Hinweis 12 px
      await s.p.click('#tb-radsat'); await s.p.waitForSelector('#radarKarte .leaflet-control-attribution', { state: 'attached' });
      const at = await s.p.$eval('#radarKarte .leaflet-control-attribution', e => parseFloat(getComputedStyle(e).fontSize));
      pruefe('Fund 15: Kartenhinweis (Leaflet) mind. 12 px', at >= 12, at);
      pruefe('Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
      await s.ctx.close();
    }

    console.log('5) Zweite Meinung (22.10.2026)');
    {
      // F1: Gitterabrufe zählen, Antwort verzögert (langsames Netz)
      const s = await H.neueSeite(b, {}, {});
      await s.ctx.addInitScript(() => localStorage.setItem('wpc-ebene', '"wind"'));
      const gitter = [];
      await s.p.route(u => u.host === 'api.open-meteo.com' && /pressure_msl/.test(u.search) && (u.searchParams.get('latitude') || '').includes(','), async route => { gitter.push(Date.now()); await new Promise(r => setTimeout(r, 1500)); await route.fallback(); });
      await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 }); await s.p.waitForTimeout(500);
      await s.p.click('#tb-radsat'); await s.p.waitForTimeout(3500);
      pruefe('Abrufe: Rad/Sat mit gemerkter Ebene Wind öffnen (langsames Netz) = genau 1 Gitterabruf', gitter.length === 1, gitter.length);
      const box = await s.p.$eval('#radarKarte', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      for (let i = 0; i < 5; i++) { await s.p.mouse.move(box.x, box.y); await s.p.mouse.down(); await s.p.mouse.move(box.x + 25, box.y + 10, { steps: 5 }); await s.p.mouse.up(); await s.p.waitForTimeout(700); }
      await s.p.waitForTimeout(2200);
      pruefe('Abrufe: 5 kleine Verschiebungen holen nichts Neues', gitter.length === 1, gitter.length);
      await s.p.click('#ebenenWahl [data-ebene="radar"]'); await s.p.waitForTimeout(300);
      await s.p.click('#ebenenWahl [data-ebene="wolken"]'); await s.p.waitForTimeout(2200);
      await s.p.click('#tb-wetter'); await s.p.waitForTimeout(300); await s.p.click('#tb-radsat'); await s.p.waitForTimeout(2200);
      pruefe('Abrufe: Pillenwechsel und Tabwechsel holen nichts Neues', gitter.length === 1, gitter.length);
      // F2: Wolken sichtbar auf heller Karte: Bild über hellem Grund, linker Rand (wenig Wolken) gegen rechten Rand (viel Wolken)
      await s.p.click('#ebenenWahl [data-ebene="wolken"]'); await s.p.waitForTimeout(800);
      const kon = await s.p.evaluate(async () => {
        const i = document.querySelector('#radarKarte img.a26-flaeche'); if (!i.complete) await new Promise(r => { i.onload = r; });
        const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const x = c.getContext('2d'); x.fillStyle = 'rgb(221,221,221)'; x.fillRect(0, 0, c.width, c.height); x.drawImage(i, 0, 0);
        const lum = px => { const d = x.getImageData(px, Math.round(c.height / 2), 1, 1).data; return .2126 * d[0] + .7152 * d[1] + .0722 * d[2]; };
        return { links: lum(2), rechts: lum(c.width - 3) };
      });
      pruefe('Wolken: auf heller Karte klarer Unterschied zwischen wenig und viel Bewölkung (Helligkeit mind. 50 von 255)', Math.abs(kon.rechts - kon.links) >= 50, kon);
      pruefe('Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
      await s.ctx.close();

      // F3: goldene Stunde in „Was heute geht“ = Kachel „Sonne“
      const t = await start(b);
      const gold = await t.p.evaluate(() => ({ tipp: (/Goldene Stunde ab (\d\d:\d\d)/.exec(document.getElementById('a5Tipps').textContent) || [])[1], sonne: (/Goldene Stunde abends (\d\d:\d\d) bis (\d\d:\d\d)/.exec(document.querySelector('.w3-sonne-kachel').textContent) || [])[1] }));
      pruefe('Goldene Stunde: „Was heute geht“ und Kachel „Sonne“ nennen denselben Beginn', !!gold.tipp && gold.tipp === gold.sonne, gold);
      await t.ctx.close();

      // F5/F6/F4: Wind mit Einheit, Isobaren bei kleinen Unterschieden
      const w = await start(b);
      await w.p.click('#tb-radsat'); await w.p.waitForSelector('#radarKarte .leaflet-tile-pane', { state: 'attached' }); await w.p.waitForTimeout(400);
      await w.p.click('#ebenenWahl [data-ebene="wind"]'); await w.p.waitForTimeout(900);
      pruefe('Wind: Erklärung nennt die gewählte Einheit (km/h)', /km\/h/.test(await w.p.textContent('#ebeneQuelle')), await w.p.textContent('#ebeneQuelle'));
      await w.ctx.close();
      for (const [k, erw, name] of [[0.25, /alle 2 hPa/, 'geringe Unterschiede: 2-hPa-Schritt'], [0.01, /kaum Druckunterschiede/i, 'fast kein Unterschied: Hinweis statt leerer Karte'], [1, /alle 4 hPa/, 'normal: 4-hPa-Schritt']]) {
        const d = await start(b, {}, { druck: k });
        await d.p.click('#tb-radsat'); await d.p.waitForSelector('#radarKarte .leaflet-tile-pane', { state: 'attached' }); await d.p.waitForTimeout(400);
        await d.p.click('#ebenenWahl [data-ebene="druck"]'); await d.p.waitForTimeout(900);
        const z = await d.p.textContent('#radarZeit');
        pruefe('Isobaren, ' + name, erw.test(z), z);
        if (k === 1) await H.foto(d.p, 'a26-390-isobaren-etikett');
        await d.ctx.close();
      }

      // F9: Fokus-Kreis nimmt summary auf und lässt tabindex=-1 aus
      const f = await start(b);
      await f.p.click('.w3-sonne-kachel [data-w3-sonne]'); await f.p.waitForSelector('#w3Sonne[open]');
      await f.p.evaluate(() => { document.getElementById('w3SonneInhalt').insertAdjacentHTML('beforeend', '<details id="fkD"><summary id="fkS">Mehr</summary><p>x</p></details><button id="fkM" tabindex="-1">nie</button>'); });
      const besucht = [];
      for (let i = 0; i < 8; i++) { await f.p.keyboard.press('Tab'); besucht.push(await f.p.evaluate(() => document.activeElement.id || document.activeElement.textContent.trim().slice(0, 8))); }
      pruefe('Fokus-Kreis: „summary“ wird erreicht, Knopf mit tabindex=-1 nie', besucht.includes('fkS') && !besucht.includes('fkM'), besucht);
      await f.ctx.close();

      // F8: UV-Zeile im Meteogramm (390 px) berührt die Jetzt-Linie nicht
      const m = await start(b);
      await m.p.click('#tb-graphs'); await m.p.waitForTimeout(400);
      await m.p.evaluate(() => { const x = [...document.querySelectorAll('#tab-graphs [data-seg] [data-v]')].find(e => /Meteogramm/.test(e.textContent)); if (x) x.click(); });
      await m.p.waitForSelector('#tab-graphs .mg-jetzt', { state: 'attached', timeout: 10000 }); await m.p.waitForTimeout(500);
      const uv = await m.p.evaluate(() => { const l = document.querySelector('#tab-graphs .mg-jetzt').getBoundingClientRect().x; return [...document.querySelectorAll('#tab-graphs .mg-tagesinfo')].map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent.slice(0, 20), links: Math.round(r.left), rechts: Math.round(r.right), linie: Math.round(l), fs: getComputedStyle(e).fontSize }; }).filter(x => !(x.rechts < x.linie - 3 || x.links > x.linie + 3)); });
      pruefe('Meteogramm: keine Tagesinfo-Zeile läuft in die Jetzt-Linie', uv.length === 0, uv);
      await m.ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  const e = H.ergebnis();
  console.log('\n' + e.ok + ' Prüfungen bestanden, ' + e.fehler + ' fehlgeschlagen.');
  process.exit(e.fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

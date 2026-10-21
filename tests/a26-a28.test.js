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
  } finally { await b.close(); srv.close(); }
  const e = H.ergebnis();
  console.log('\n' + e.ok + ' Prüfungen bestanden, ' + e.fehler + ' fehlgeschlagen.');
  process.exit(e.fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

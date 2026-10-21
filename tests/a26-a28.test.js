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
  } finally { await b.close(); srv.close(); }
  const e = H.ergebnis();
  console.log('\n' + e.ok + ' Prüfungen bestanden, ' + e.fehler + ' fehlgeschlagen.');
  process.exit(e.fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

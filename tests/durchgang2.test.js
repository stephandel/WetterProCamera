/* tests/durchgang2.test.js – Fund des zweiten Nutzer-Durchgangs vom 21.10.2026 abends (DURCHGANG-2026-10-21-ABEND.md)
   Start:  PORT=8964 node tests/durchgang2.test.js   (Exit-Code 0 = grün). */
'use strict';
const path = require('path');
const { webkit } = require('playwright');
const { neu, WURZEL } = require('./hilfe.js');
const H = neu(+process.env.PORT || 8964);
const { pruefe } = H;
const FOTO = path.join(WURZEL, 'foto-mannheim.jpg');

(async () => {
  const srv = await H.server(), b = await webkit.launch();
  try {
    // Fund N1 (alter Fund 11): nach dem Laden des Fotos liegt der Fokus im Studio, nicht auf dem Seitenkörper
    for (const [name, opt, knopf] of [['390', {}, '#tb-kamera'], ['1280', { viewport: { width: 1280, height: 800 } }, '#macLeiste button:has-text("Kamera")']]) {
      const s = await H.neueSeite(b, opt, {});
      await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 }); await s.p.waitForFunction(() => window.KSStudio, null, { timeout: 8000 });
      const [fc] = await Promise.all([s.p.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null), s.p.click(knopf)]);
      if (fc) await fc.setFiles(FOTO);
      else { const [f2] = await Promise.all([s.p.waitForEvent('filechooser', { timeout: 4000 }), s.p.click('#ksWurzel button:has-text("Foto wählen")')]); await f2.setFiles(FOTO); }
      await s.p.waitForFunction(() => { const r = document.querySelector('#ksWurzel .ks'); return r && r._ksInst && r._ksInst.quelle; }, null, { timeout: 10000 });
      await s.p.waitForTimeout(800);
      const f = await s.p.evaluate(() => { const a = document.activeElement; return { imStudio: !!a.closest('#studio'), tag: a.tagName, text: (a.textContent || '').trim().slice(0, 20) }; });
      pruefe('Studio ' + name + ': nach dem Laden des Fotos liegt der Fokus im Studio (nicht auf dem Seitenkörper)', f.imStudio && f.tag !== 'BODY', f);
      await s.ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  const e = H.ergebnis(); console.log('\n' + e.ok + ' bestanden, ' + e.fehler + ' fehlgeschlagen'); process.exit(e.fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

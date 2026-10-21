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
    // Fund N1 (alter Fund 11); Ziel „Teilen“ erst nach Rückmeldung der zweiten Meinung: der Knopf entsteht erst nach dem Neuzeichnen: nach dem Laden des Fotos liegt der Fokus im Studio, nicht auf dem Seitenkörper
    for (const [name, opt, knopf] of [['390', {}, '#tb-kamera'], ['1280', { viewport: { width: 1280, height: 800 } }, '#macLeiste button:has-text("Kamera")']]) {
      const s = await H.neueSeite(b, opt, {});
      await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 }); await s.p.waitForFunction(() => window.KSStudio, null, { timeout: 8000 });
      const [fc] = await Promise.all([s.p.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null), s.p.click(knopf)]);
      if (fc) await fc.setFiles(FOTO);
      else { const [f2] = await Promise.all([s.p.waitForEvent('filechooser', { timeout: 4000 }), s.p.click('#ksWurzel button:has-text("Foto wählen")')]); await f2.setFiles(FOTO); }
      await s.p.waitForFunction(() => { const r = document.querySelector('#ksWurzel .ks'); return r && r._ksInst && r._ksInst.quelle; }, null, { timeout: 10000 });
      await s.p.waitForTimeout(800);
      const f = await s.p.evaluate(() => { const a = document.activeElement; return { imStudio: !!a.closest('#studio'), tag: a.tagName, text: (a.textContent || '').trim().slice(0, 20) }; });
      pruefe('Studio ' + name + ': nach dem Laden des Fotos liegt der Fokus auf „Teilen“ (nicht auf dem Seitenkörper, nicht „Fertig“)', f.imStudio && f.text === 'Teilen', f);
      await s.ctx.close();
    }
    // Fund N2 (zweite Meinung): Warnblatt per Antippen/Klick (Safari fokussiert den Knopf nicht), dann Esc: Fokus zurück auf die Warnkachel
    {
      const s = await H.neueSeite(b, {}, { warnung: 'ja' });
      await s.p.goto(H.BASIS); await s.p.waitForSelector('#a9Warnung button', { timeout: 15000 });
      await s.p.click('#a9Warnung button'); await s.p.waitForSelector('#a9WarnBlatt[open]', { timeout: 4000 });
      await s.p.keyboard.press('Escape'); await s.p.waitForTimeout(400);
      const f = await s.p.evaluate(() => { const a = document.activeElement; return { tag: a.tagName, kachel: !!a.closest('#a9Warnung') }; });
      pruefe('Warnblatt: nach Klick und Esc liegt der Fokus wieder auf der Warnkachel', f.kachel, f);
      await s.ctx.close();
    }
    // Fund N2/N3 (zweite Meinung): jeder Text im Meteogramm mit der GEZEICHNETEN Größe (font-size × SVG-Skalierung) mindestens 11 px, Ziel 12 px (Muster wedda-durchgang)
    const GROESSEN = () => {
      const aus = [];
      document.querySelectorAll('#tab-graphs *, .mg-vollbild *').forEach(e => {
        if (!e.getClientRects().length || e.closest('[hidden]') || !e.matches('text, small, span, div, button, b, label, p, h2, h3, h4')) return;
        if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
        let px = parseFloat(getComputedStyle(e).fontSize);
        if (e instanceof SVGElement) { const m = e.getScreenCTM(); px *= Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)); }
        aus.push({ t: e.textContent.trim().slice(0, 16), cls: e.getAttribute('class') || e.tagName, px: Math.round(px * 100) / 100 });
      });
      return aus;
    };
    for (const [breite, opt, tab] of [[390, {}, '#tb-graphs'], [1280, { viewport: { width: 1280, height: 800 } }, '#macLeiste [data-ml-tab="graphs"]']]) for (const voll of [false, true]) {
      const s = await H.neueSeite(b, opt, {});
      await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 });
      await s.p.click(tab); await s.p.waitForSelector('#tab-graphs .mg-svg text', { timeout: 15000 });
      if (voll) await s.p.click('#tab-graphs .mg-btn-voll');
      await s.p.waitForTimeout(700);
      await s.p.evaluate(() => { const w = document.querySelector('.mg-ax-wert'); if (w) w.hidden = false; });   // die Marke zeigt sich sonst nur beim Antippen
      const l = await s.p.evaluate(GROESSEN), name = 'Graphs ' + breite + (voll ? ' Vollbild' : '');
      const klein = l.filter(x => x.px < 10.95), unter12 = l.filter(x => x.px < 11.95);
      pruefe(name + ': ' + l.length + ' Texte, keiner unter 11 px gezeichnet', l.length > 20 && !klein.length, klein.slice(0, 6));
      pruefe(name + ': Ziel 12 px gezeichnet (Tageszeile, Marken)', !unter12.length, unter12.slice(0, 6));
      await s.ctx.close();
    }
    // Fund N4: Windpfeile nicht unter den Zoom-Knöpfen (rechts oben)
    {
      const s = await H.neueSeite(b, {}, {});
      await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 });
      await s.p.click('#tb-radsat'); await s.p.waitForSelector('#ebenenWahl [data-ebene="wind"]', { timeout: 15000 });
      await s.p.click('#ebenenWahl [data-ebene="wind"]'); await s.p.waitForSelector('#radarKarte img.a26-flaeche', { timeout: 8000 }); await s.p.waitForTimeout(500);
      const z = await s.p.evaluate(async () => {
        const i = document.querySelector('#radarKarte img.a26-flaeche'); if (!i.complete) await new Promise(r => { i.onload = r; });
        const W = i.getBoundingClientRect().width, k = i.naturalWidth / W, c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight;
        const x = c.getContext('2d'); x.drawImage(i, 0, 0);
        const d = x.getImageData(Math.round((W - 80) * k), 0, Math.round(80 * k), Math.round(130 * k)).data; let n = 0; for (let q = 3; q < d.length; q += 4) if (d[q] > 40) n++;
        return { n, W };
      });
      pruefe('Wind: unter den Zoom-Knöpfen (rechts oben, 80 × 130 px) ist kein Pfeil gezeichnet', z.n === 0, z);
      await s.ctx.close();
    }
    // Fund N5: Mac, Studio per Mausklick über die Seitenleiste (Safari fokussiert den Knopf nicht): nach Esc zurück auf den Knopf
    {
      const s = await H.neueSeite(b, { viewport: { width: 1280, height: 800 } }, {});
      await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 });
      for (const [name, sel] of [['Kamera', '#macLeiste button:has-text("Kamera")'], ['Wetter teilen', '#mlTeilen']]) {
        await s.p.click(sel); await s.p.waitForTimeout(500); await s.p.keyboard.press('Escape'); await s.p.waitForTimeout(500);
        const f = await s.p.evaluate(() => { const a = document.activeElement; return { tag: a.tagName, id: a.id, mac: !!a.closest('#macLeiste') }; });
        pruefe('Mac: Seitenleiste „' + name + '“ per Klick, Esc schließt das Studio, Fokus zurück auf den Knopf', f.mac && f.tag === 'BUTTON', f);
      }
      await s.ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  const e = H.ergebnis(); console.log('\n' + e.ok + ' bestanden, ' + e.fehler + ' fehlgeschlagen'); process.exit(e.fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

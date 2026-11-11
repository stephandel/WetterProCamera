/* tests/verkleinern.test.js – „Fertig“ bleibt im Reiter (F1, P-cff6) und ‹ Jetzt › liegt über der Tab-Leiste (B3, P-ecd6); 11.11.2026
   Start:  PORT=8899 node tests/verkleinern.test.js   (Exit-Code 0 = grün)
   Prüft in WebKit bei 402 × 874 (System dunkel und hell), 375 × 667 und 320 × 568, dazu einmal am Mac 1280 × 800:
   1) Schalter „Meteogramm und Karten immer im Vollbild“ an: „Fertig“, Esc und Zurück schließen das Blatt, die App bleibt im Reiter
      Graphs bzw. Rad/Sat und zeigt die kleine Ansicht; erst der nächste Besuch des Reiters öffnet wieder das Blatt.
   2) „Tag zurück / Jetzt / Tag vor“ unter dem Meteogramm liegen beim Öffnen von Graphs ganz über der Tab-Leiste und lassen sich antippen
      (Nachmessung: war in dieser App schon vor dem 11.11.2026 in Ordnung, der Test hält es fest).
   Fremde Dienste sind auf Antworten aus tests/fixtures umgeleitet (tests/hilfe.js). Der Name der Bilder beginnt mit BILDNAME (z. B. „vorher-“). */
'use strict';
const fs = require('fs');
const { webkit } = require('playwright');
const { neu } = require('./hilfe.js');
const H = neu(+process.env.PORT || 8899);
const { pruefe } = H;
const BILDNAME = process.env.BILDNAME || '';
const GROESSEN = [[402, 874, 'dark'], [402, 874, 'light'], [375, 667, 'dark'], [320, 568, 'dark']];
fs.mkdirSync(H.BILDER, { recursive: true });

async function start(b, o) {
  o = o || {};
  const s = await H.neueSeite(b, { viewport: { width: o.breite || 402, height: o.hoehe || 874 }, colorScheme: o.farbe || 'dark' }, {});
  if (o.speicher) await s.p.addInitScript(sp => { Object.keys(sp).forEach(k => { if (localStorage.getItem(k) === null) localStorage.setItem(k, sp[k]); }); }, o.speicher);
  await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 });
  if (o.schrift) await s.p.addStyleTag({ content: 'html { font-size: 130% !important; }' });
  await s.p.waitForTimeout(500);
  return s;
}
const foto = (p, name) => H.foto(p, BILDNAME + name);
const kuerzel = g => g[0] + '-' + (g[2] === 'dark' ? 'dunkel' : 'hell');
const IMMER = { 'wpc-vollbild-immer': 'true' };

const reiter = p => p.evaluate(() => ['wetter', 'graphs', 'radsat', 'mehr'].filter(t => !document.getElementById('tab-' + t).hidden)[0]);
const blatt = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); return Math.round(r.width) === innerWidth && Math.round(r.height) === innerHeight && !!document.querySelector('#tabbar').closest('[inert]'); }, sel);
// Kleine Ansicht: welcher Reiter steht, liegt ein Blatt darüber, ist die Seite frei, ist der Vollbild-Knopf da und hat den Fokus
const KLEIN = (a) => {
  const w = document.querySelector(a.sel), r = w ? w.getBoundingClientRect() : null;
  const voll = document.querySelector(a.voll), vr = voll && voll.getBoundingClientRect(), markiert = document.querySelector('#tabbar [aria-selected="true"]');
  return {
    reiter: ['wetter', 'graphs', 'radsat', 'mehr'].filter(t => !document.getElementById('tab-' + t).hidden)[0],
    blatt: !!document.querySelector('.mg-vollbild, .rs-vollbild'),
    groesse: r ? [Math.round(r.width), Math.round(r.height)] : [0, 0], bild: [innerWidth, innerHeight], inhalt: !!document.querySelector(a.inhalt),
    gesperrt: ['#tabbar', '#titelzeile'].filter(s => document.querySelector(s).closest('[inert]')), overflow: getComputedStyle(document.documentElement).overflow,
    markiert: markiert ? markiert.id.slice(3) : null,
    vollKnopf: !!vr && vr.width > 0 && vr.height > 0, fokusAufVoll: !!voll && document.activeElement === voll,
    zustand: (history.state && history.state.wpVollbild) || null
  };
};
const istKlein = (k, name) => k.reiter === name && !k.blatt && k.groesse[0] > 0 && !(k.groesse[0] === k.bild[0] && k.groesse[1] === k.bild[1]) && k.inhalt &&
  !k.gesperrt.length && k.overflow !== 'hidden' && k.markiert === name && k.vollKnopf && !k.zustand;
const G = { sel: '#pcMg', voll: '#pcMg .mg-btn-voll', inhalt: '#pcMg .mg-svg text' }, R = { sel: '#tab-radsat', voll: '#radsatVoll', inhalt: '#radarKarte .leaflet-tile-pane' };
const zuGraphs = async p => { await p.click('#tb-graphs'); await p.waitForSelector('#pcMg .mg-svg text', { timeout: 15000 }); await p.waitForTimeout(700); };
const zuRadsat = async p => { await p.click('#tb-radsat'); await p.waitForSelector('#radarKarte .leaflet-tile-pane', { state: 'attached', timeout: 15000 }); await p.waitForTimeout(800); };
// Blatt öffnen: steht die App nicht (mehr) im Reiter, führt der Tipp auf den Reiter hin; in der kleinen Ansicht öffnet der Vollbild-Knopf
async function blattAuf(p, name, a) {
  if (await reiter(p) !== name) { await p.click('#tb-' + name); await p.waitForTimeout(900); }
  if (!(await blatt(p, a.sel))) { await p.click(a.voll); await p.waitForTimeout(600); }
  return blatt(p, a.sel);
}
// Knöpfe ‹ Jetzt › unter dem Meteogramm gegen die Tab-Leiste: ganz darüber, ganz im Bild, mind. 44 × 44, in der Mitte liegt der Knopf selbst
const KNOEPFE = () => {
  const leiste = document.querySelector('#tabbar').getBoundingClientRect(), vh = document.documentElement.clientHeight, mg = document.querySelector('#pcMg');
  const verstoesse = [], werte = [];
  ['[aria-label="Einen Tag zurück"]', '.mg-btn-jetzt', '[aria-label="Einen Tag vor"]'].forEach(s => {
    const k = mg.querySelector(s); if (!k) { verstoesse.push(s + ' fehlt'); return; }
    const r = k.getBoundingClientRect(), n = k.getAttribute('aria-label') || k.textContent.trim();
    werte.push(n + ' ' + Math.round(r.top) + '–' + Math.round(r.bottom));
    if (r.bottom > leiste.top + 0.5) verstoesse.push(n + ': unten ' + Math.round(r.bottom) + ' > Leiste oben ' + Math.round(leiste.top));
    if (r.top < 0 || r.bottom > vh + 0.5) verstoesse.push(n + ': nicht ganz im Bild');
    if (r.width < 43.5 || r.height < 43.5) verstoesse.push(n + ': nur ' + Math.round(r.width) + ' × ' + Math.round(r.height));
    const oben = document.elementFromPoint(r.left + r.width / 2, Math.min(r.top + r.height / 2, vh - 1)), wer = oben && (oben.closest('button, nav') || oben);
    if (!oben || !(k === oben || k.contains(oben))) verstoesse.push(n + ': verdeckt von ' + (wer ? (wer.id || wer.className || wer.tagName) : 'nichts'));
  });
  return { leiste: Math.round(leiste.top) + '–' + Math.round(leiste.bottom), hoehe: vh, knoepfe: werte, verstoesse };
};

// 1) F1: ganz = alle Wege (Fertig, Esc, Zurück, Ebenen, nächster Besuch, Neustart); sonst nur „Fertig“ in beiden Reitern
async function f1(b, g, ganz) {
  const kz = kuerzel(g);
  const s = await start(b, { breite: g[0], hoehe: g[1], farbe: g[2], speicher: IMMER }), p = s.p;
  await zuGraphs(p);
  pruefe(kz + ': Tipp auf Graphs öffnet das Meteogramm als Blatt (Schalter an)', await blatt(p, '#pcMg'));
  await foto(p, 'f1-graphs-1-blatt-' + kz);
  await p.click('#pcMg .mg-vb-fertig'); await p.waitForTimeout(600);
  let k = await p.evaluate(KLEIN, G);
  pruefe(kz + ': „Fertig“ bleibt im Reiter Graphs und zeigt das kleine Meteogramm, Seite frei', istKlein(k, 'graphs'), k);
  pruefe(kz + ': Fokus liegt danach auf ⤢ im kleinen Meteogramm', k.fokusAufVoll, k);
  await foto(p, 'f1-graphs-2-nach-fertig-' + kz);
  if (ganz) {
    await p.click('#tb-graphs'); await p.waitForTimeout(600);
    k = await p.evaluate(KLEIN, G);
    pruefe(kz + ': Tipp auf den schon offenen Reiter Graphs lässt die kleine Ansicht stehen', istKlein(k, 'graphs'), k);
    pruefe(kz + ': ⤢ in der kleinen Ansicht öffnet das Blatt wieder', await blattAuf(p, 'graphs', G));
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    k = await p.evaluate(KLEIN, G);
    pruefe(kz + ': Esc bleibt im Reiter Graphs (kleine Ansicht)', istKlein(k, 'graphs'), k);
    await blattAuf(p, 'graphs', G);
    await p.evaluate(() => history.back()); await p.waitForTimeout(700);
    k = await p.evaluate(KLEIN, G);
    pruefe(kz + ': Zurück bleibt im Reiter Graphs (kleine Ansicht)', istKlein(k, 'graphs'), k);
    await p.click('#tb-mehr'); await p.waitForTimeout(300);
    await p.click('#tb-graphs'); await p.waitForTimeout(800);
    pruefe(kz + ': der nächste Besuch von Graphs öffnet wieder das Blatt', await reiter(p) === 'graphs' && await blatt(p, '#pcMg'));
    if (await blatt(p, '#pcMg')) { await p.click('#pcMg .mg-vb-fertig'); await p.waitForTimeout(600); }
  }
  if (await reiter(p) !== 'wetter') { await p.click('#tb-wetter'); await p.waitForTimeout(300); }
  await zuRadsat(p);
  pruefe(kz + ': Tipp auf Rad/Sat öffnet die Karte als Blatt (Schalter an)', await blatt(p, '#tab-radsat'));
  await foto(p, 'f1-radsat-1-blatt-' + kz);
  await p.click('#radsatFertig'); await p.waitForTimeout(700);
  k = await p.evaluate(KLEIN, R);
  pruefe(kz + ': „Fertig“ bleibt im Reiter Rad/Sat und zeigt die kleine Karte, Seite frei', istKlein(k, 'radsat'), k);
  pruefe(kz + ': Fokus liegt danach auf „Vollbild“ unter der kleinen Karte', k.fokusAufVoll, k);
  await foto(p, 'f1-radsat-2-nach-fertig-' + kz);
  if (ganz) {
    if (await reiter(p) === 'radsat') { await p.click('#ebenenWahl [data-ebene="sat"]'); await p.waitForTimeout(700); }
    k = await p.evaluate(KLEIN, R);
    pruefe(kz + ': „Satellit“ in der kleinen Ansicht wechselt die Ebene, ohne das Blatt wieder zu öffnen', istKlein(k, 'radsat') && await p.evaluate(() => document.querySelector('#ebenenWahl [data-ebene="sat"]').getAttribute('aria-checked')) === 'true', k);
    pruefe(kz + ': „Vollbild“ unter der kleinen Karte öffnet das Blatt wieder', await blattAuf(p, 'radsat', R));
    await p.evaluate(() => history.back()); await p.waitForTimeout(700);
    k = await p.evaluate(KLEIN, R);
    pruefe(kz + ': Zurück bleibt im Reiter Rad/Sat (kleine Ansicht)', istKlein(k, 'radsat'), k);
    await blattAuf(p, 'radsat', R);
    await p.keyboard.press('Escape'); await p.waitForTimeout(700);
    k = await p.evaluate(KLEIN, R);
    pruefe(kz + ': Esc bleibt im Reiter Rad/Sat (kleine Ansicht)', istKlein(k, 'radsat'), k);
    await p.click('#tb-mehr'); await p.waitForTimeout(300);
    await p.click('#tb-radsat'); await p.waitForTimeout(1000);
    pruefe(kz + ': der nächste Besuch von Rad/Sat öffnet wieder das Blatt', await reiter(p) === 'radsat' && await blatt(p, '#tab-radsat'));
    if (await blatt(p, '#tab-radsat')) { await p.click('#radsatFertig'); await p.waitForTimeout(600); }
    // Neustart mit gemerktem Reiter Graphs: Blatt offen, „Fertig“ bleibt in Graphs
    if (await reiter(p) !== 'wetter') { await p.click('#tb-wetter'); await p.waitForTimeout(300); }
    await p.click('#tb-graphs'); await p.waitForTimeout(500);
    await p.reload(); await p.waitForSelector('#pcMg .mg-svg text', { timeout: 15000 }); await p.waitForTimeout(700);
    pruefe(kz + ': nach einem Neustart im Reiter Graphs ist das Blatt offen', await blatt(p, '#pcMg'));
    await p.click('#pcMg .mg-vb-fertig'); await p.waitForTimeout(600);
    k = await p.evaluate(KLEIN, G);
    pruefe(kz + ': „Fertig“ nach dem Neustart bleibt in Graphs', istKlein(k, 'graphs'), k);
  }
  pruefe(kz + ': Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
  await s.ctx.close();
}
// Startseite mit Meteogramm-Kachel: „Ganz ansehen“ öffnet das Blatt, „Fertig“ bleibt in Graphs (nicht zurück zur Startseite)
async function f1Startseite(b) {
  const s = await start(b, { speicher: Object.assign({ 'wpc-startseite': '{"meteo":true}' }, IMMER) }), p = s.p;
  await p.waitForSelector('[data-a5-mg-ganz]', { timeout: 15000 });
  await p.click('[data-a5-mg-ganz]'); await p.waitForSelector('#pcMg .mg-svg text', { timeout: 15000 }); await p.waitForTimeout(700);
  pruefe('Startseite: „Ganz ansehen“ öffnet Graphs als Blatt', await reiter(p) === 'graphs' && await blatt(p, '#pcMg'));
  await p.click('#pcMg .mg-vb-fertig'); await p.waitForTimeout(600);
  const k = await p.evaluate(KLEIN, G);
  pruefe('Startseite: „Fertig“ bleibt danach in Graphs (kleine Ansicht)', istKlein(k, 'graphs'), k);
  pruefe('Startseite: Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
  await s.ctx.close();
}
// Mac 1280 × 800: Seitenleiste statt Tab-Leiste
async function f1Mac(b) {
  const s = await start(b, { breite: 1280, hoehe: 800, speicher: IMMER }), p = s.p;
  const lage = () => p.evaluate(() => ({ reiter: ['wetter', 'graphs', 'radsat', 'mehr'].filter(t => !document.getElementById('tab-' + t).hidden)[0], blatt: !!document.querySelector('.mg-vollbild, .rs-vollbild'),
    markiert: (document.querySelector('#macLeiste [aria-current="page"]') || { dataset: {} }).dataset.mlTab || null, leisteFrei: !document.querySelector('#macLeiste').closest('[inert]'), overflow: getComputedStyle(document.documentElement).overflow, zustand: (history.state && history.state.wpVollbild) || null }));
  const klein = (l, name) => l.reiter === name && !l.blatt && l.markiert === name && l.leisteFrei && l.overflow !== 'hidden' && !l.zustand;
  await p.click('#macLeiste [data-ml-tab="graphs"]'); await p.waitForSelector('#pcMg .mg-svg text', { timeout: 15000 }); await p.waitForTimeout(700);
  pruefe('Mac 1280: Graphs öffnet als Blatt (Schalter an)', (await lage()).blatt);
  await p.click('#pcMg .mg-vb-fertig'); await p.waitForTimeout(600);
  let l = await lage();
  pruefe('Mac 1280: „Fertig“ bleibt im Reiter Graphs, Seitenleiste markiert Graphs', klein(l, 'graphs'), l);
  await p.click('#macLeiste [data-ml-tab="radsat"]'); await p.waitForSelector('#radarKarte .leaflet-tile-pane', { state: 'attached', timeout: 15000 }); await p.waitForTimeout(800);
  pruefe('Mac 1280: Rad/Sat öffnet als Blatt (Schalter an)', (await lage()).blatt);
  await p.click('#radsatFertig'); await p.waitForTimeout(700);
  l = await lage();
  pruefe('Mac 1280: „Fertig“ bleibt im Reiter Rad/Sat, Seitenleiste markiert Rad/Sat', klein(l, 'radsat'), l);
  pruefe('Mac 1280: Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
  await s.ctx.close();
}

// 2) B3: Knöpfe unter dem Meteogramm beim Öffnen, nach einem Tipp und ganz unten auf der Seite
async function b3(b, g, o) {
  o = o || {};
  const kz = kuerzel(g) + (o.schrift ? '-schrift130' : '') + (o.immer ? '-nach-fertig' : '');
  const s = await start(b, { breite: g[0], hoehe: g[1], farbe: g[2], schrift: o.schrift, speicher: o.immer ? IMMER : null }), p = s.p;
  await zuGraphs(p);
  if (o.immer) { await p.click('#pcMg .mg-vb-fertig'); await p.waitForTimeout(600); }
  const m = await p.evaluate(KNOEPFE);
  pruefe(kz + ': „Tag zurück / Jetzt / Tag vor“ liegen beim Öffnen von Graphs frei über der Tab-Leiste', await reiter(p) === 'graphs' && m.verstoesse.length === 0, m);
  await foto(p, 'b3-graphs-' + kz);
  if (!o.schrift && !o.immer) {
    const vor = await p.evaluate(() => { const r = document.querySelector('#pcMg [aria-label="Einen Tag vor"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, zeit: document.querySelector('#pcMg .mg-zeit').textContent.trim() }; });
    await p.mouse.click(vor.x, vor.y); await p.waitForTimeout(900);
    const nach = { reiter: await reiter(p), zeit: await p.evaluate(() => document.querySelector('#pcMg .mg-zeit').textContent.trim()) };
    pruefe(kz + ': Tipp auf „Tag vor“ blättert einen Tag weiter, die App bleibt in Graphs', nach.reiter === 'graphs' && nach.zeit !== vor.zeit, [vor.zeit, nach]);
    if (nach.reiter !== 'graphs') { await p.click('#tb-graphs'); await p.waitForTimeout(500); }
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(400);
    const u = await p.evaluate(KNOEPFE);
    pruefe(kz + ': auch ganz unten auf der Seite liegen die Knöpfe frei', u.verstoesse.length === 0, u);
  }
  pruefe(kz + ': Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
  await s.ctx.close();
}

(async () => {
  const srv = await H.server();
  const b = await webkit.launch();
  try {
    console.log('1) „Fertig“, Esc und Zurück bleiben im Reiter (F1)');
    for (const g of GROESSEN) await f1(b, g, g === GROESSEN[0]);
    await f1Startseite(b);
    await f1Mac(b);
    console.log('2) ‹ Jetzt › unter dem Meteogramm über der Tab-Leiste (B3, Nachmessung)');
    for (const g of GROESSEN) await b3(b, g);
    await b3(b, GROESSEN[0], { schrift: true });
    await b3(b, GROESSEN[2], { immer: true });
  } finally { await b.close(); srv.close(); }
  const e = H.ergebnis();
  console.log('\n' + e.ok + ' Prüfungen bestanden, ' + e.fehler + ' fehlgeschlagen.');
  process.exit(e.fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

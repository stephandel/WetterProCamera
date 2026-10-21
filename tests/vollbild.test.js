/* tests/vollbild.test.js – Vollbild für Meteogramm (A32, 21.10.2026): ⤢ legt den Baustein als Blatt über den ganzen Bildschirm,
   „Fertig“, Esc und Zurück schließen, der Rest der Seite ist solange gesperrt. Start:  PORT=8897 node tests/vollbild.test.js
   (Exit-Code 0 = grün). Fremde Dienste sind auf Antworten aus tests/fixtures umgeleitet (tests/hilfe.js). */
'use strict';
const fs = require('fs');
const { webkit } = require('playwright');
const { neu } = require('./hilfe.js');
const H = neu(+process.env.PORT || 8897);
const { pruefe } = H;
fs.mkdirSync(H.BILDER, { recursive: true });

async function start(b, opt, modus) {
  const s = await H.neueSeite(b, opt || {}, modus || {});
  await s.p.goto(H.BASIS); await s.p.waitForSelector('.tag', { timeout: 15000 }); await s.p.waitForTimeout(500);
  return s;
}
async function graphs(s, mac) {
  await s.p.click(mac ? '#macLeiste [data-ml-tab="graphs"]' : '#tb-graphs');
  await s.p.waitForSelector('#pcMg .mg-svg text', { timeout: 15000 }); await s.p.waitForTimeout(400);
}

// Zustand des Blatts: Größe, wer oben liegt, Sperre, Fokus, Fertig-Knopf
const ZUSTAND = (sel) => {
  const w = document.querySelector(sel), r = w.getBoundingClientRect();
  const fertig = w.querySelector('.mg-vb-fertig'), fr = fertig && fertig.getBoundingClientRect();
  const oben = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && w.contains(e); };
  const fs2 = fertig && getComputedStyle(fertig);
  return {
    r: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], vw: innerWidth, vh: innerHeight,
    deckt: oben(8, 8) && oben(innerWidth - 8, innerHeight - 8) && oben(8, innerHeight - 8) && oben(innerWidth / 2, innerHeight / 2),
    rolle: w.getAttribute('role'), modal: w.getAttribute('aria-modal'), label: w.getAttribute('aria-label'),
    fertig: fertig && !fertig.closest('[hidden]') && fr.width > 0 ? { t: fertig.textContent.trim(), w: Math.round(fr.width), h: Math.round(fr.height), top: Math.round(fr.top), right: Math.round(innerWidth - fr.right), schrift: parseFloat(fs2.fontSize) } : null,
    fokus: document.activeElement === fertig ? 'fertig' : (document.activeElement && (document.activeElement.className || document.activeElement.tagName)),
    gesperrt: [...document.body.children].filter(e => e !== w && !e.contains(w) && !/^(SCRIPT|STYLE|LINK)$/.test(e.tagName) && !e.hasAttribute('inert') && !e.hidden).map(e => e.id || e.className),
    tabbarInert: !!document.querySelector('#tabbar').closest('[inert]'),
    overflow: getComputedStyle(document.documentElement).overflow,
    zustand: history.state, laenge: history.length
  };
};
const voll = z => Math.abs(z.r[0]) <= 1 && Math.abs(z.r[1]) <= 1 && Math.abs(z.r[2] - z.vw) <= 1 && Math.abs(z.r[3] - z.vh) <= 1;
// Tippflächen und Schrift im Blatt: alle sichtbaren Knöpfe ≥ 44 px (Mac mit Maus 28 px, Paket A6), kein Text unter 11 px
const MASSE_BLATT = (a) => {
  const sel = a.sel, g = a.min || 43.5, w = document.querySelector(sel), klein = [], schrift = [];
  w.querySelectorAll('button, a, label, input, [role="button"]').forEach(e => {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    if (!r.width || !r.height || s.visibility === 'hidden' || e.closest('[hidden]') || (e.tagName === 'INPUT' && e.closest('label'))) return;
    if (r.width < g || r.height < g) klein.push((e.getAttribute('aria-label') || e.textContent.trim() || e.className).slice(0, 24) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });
  w.querySelectorAll('*').forEach(e => {
    const r = e.getBoundingClientRect(); if (!r.width || e.closest('[hidden]') || getComputedStyle(e).visibility === 'hidden') return;
    if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11) schrift.push(e.className + ' ' + getComputedStyle(e).fontSize);
  });
  return { klein, schrift, seitlich: w.scrollWidth - w.clientWidth };
};
// Kontrast zweier CSS-Farben (rgb/rgba, deckend angenommen)
const KONTRAST = (sel) => {
  const e = document.querySelector(sel); if (!e) return 0;
  const farbe = c => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  let g = e, bg = 'rgba(0, 0, 0, 0)';
  while (g && /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { bg = getComputedStyle(g).backgroundColor; g = g.parentElement; }
  const L = c => { const [r, gg, b] = farbe(c).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * gg + 0.0722 * b; };
  const a = L(getComputedStyle(e).color), b2 = L(bg);
  return Math.round((Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05) * 100) / 100;
};

async function mgVollbild(s, name, w, h) {
  const p = s.p, sel = '#pcMg';
  const vorher = await p.evaluate(ZUSTAND, sel);
  pruefe(name + ': vor dem Öffnen kein Blatt (Meteogramm kleiner als der Bildschirm)', !voll(vorher), vorher.r);
  await p.click(sel + ' .mg-btn-voll'); await p.waitForTimeout(400);
  const z = await p.evaluate(ZUSTAND, sel);
  pruefe(name + ': ⤢ legt das Meteogramm über den ganzen Bildschirm (' + w + ' × ' + h + ')', voll(z), [z.r, z.vw, z.vh]);
  pruefe(name + ': das Blatt liegt oben, auch über Kopfzeile und Tab-Leiste bzw. Seitenleiste', z.deckt);
  pruefe(name + ': role="dialog", aria-modal, Name „Meteogramm im Vollbild“', z.rolle === 'dialog' && z.modal === 'true' && z.label === 'Meteogramm im Vollbild', [z.rolle, z.modal, z.label]);
  pruefe(name + ': „Fertig“ oben rechts, mind. 44 × 44 px, Text', !!z.fertig && z.fertig.t === 'Fertig' && z.fertig.w >= 44 && z.fertig.h >= 44 && z.fertig.top < 60 && z.fertig.right < 40, z.fertig);
  pruefe(name + ': Fokus steht auf „Fertig“', z.fokus === 'fertig', z.fokus);
  if (!z.fertig) { await H.foto(p, 'vollbild-' + name + '-ohne-fertig'); return; }   // ohne Blatt-Kopf lässt sich der Rest nicht prüfen
  pruefe(name + ': Rest der Seite gesperrt (inert), Seite scrollt nicht mit', z.gesperrt.length === 0 && z.tabbarInert && z.overflow === 'hidden', z);
  pruefe(name + ': ein Verlaufseintrag für die Zurück-Geste', !!z.zustand && z.zustand.wpVollbild === 'mg' && z.laenge === vorher.laenge + 1, [vorher.laenge, z.laenge, z.zustand]);
  const m = await p.evaluate(MASSE_BLATT, { sel, min: w >= 1024 ? 27.5 : 43.5 });
  pruefe(name + ': im Blatt alle Knöpfe ≥ ' + (w >= 1024 ? '28 px (Maus)' : '44 px') + ', kein Text unter 11 px, nichts ragt seitlich heraus', !m.klein.length && !m.schrift.length && m.seitlich <= 0, m);
  pruefe(name + ': Kontrast „Fertig“ mind. 4,5:1', (await p.evaluate(KONTRAST, sel + ' .mg-vb-fertig')) >= 4.5, await p.evaluate(KONTRAST, sel + ' .mg-vb-fertig'));
  // Haftende Leisten: oben im Blatt ist die Knopfleiste schon unten im Bild; ganz unten haftet die Datumsfahne unter „Fertig“
  const haft = await p.evaluate((sel) => new Promise(ok => {
    const w = document.querySelector(sel), m = () => { const k = w.querySelector('.mg-vb-kopf').getBoundingClientRect(), f = w.querySelector('.mg-readout').getBoundingClientRect(), l = w.querySelector('.mg-knoepfe').getBoundingClientRect(); return { scroll: w.scrollTop, kopfUnten: Math.round(k.bottom), fahneOben: Math.round(f.top), leisteUnten: Math.round(l.bottom) }; };
    w.scrollTop = 0;
    setTimeout(() => { const a = m(); w.scrollTop = w.scrollHeight; setTimeout(() => ok({ oben: a, unten: m(), vh: innerHeight }), 250); }, 250);
  }), sel);
  pruefe(name + ': Knopfleiste oben im Blatt sichtbar, Datumsfahne haftet beim Scrollen unter „Fertig“', haft.oben.leisteUnten <= haft.vh && haft.oben.fahneOben >= haft.oben.kopfUnten - 1 && (haft.unten.scroll === 0 || Math.abs(haft.unten.fahneOben - haft.unten.kopfUnten) <= 2), haft);
  await p.evaluate((sel) => { document.querySelector(sel).scrollTop = 0; }, sel);
  await H.foto(p, 'vollbild-' + name + '-offen');
  // Fertig schließt, Fokus zurück auf ⤢, Verlauf wieder auf dem alten Eintrag
  await p.click(sel + ' .mg-vb-fertig'); await p.waitForTimeout(400);
  const zu = await p.evaluate(ZUSTAND, sel);
  pruefe(name + ': „Fertig“ schließt, Fokus wieder auf ⤢, Sperre aufgehoben', !voll(zu) && /mg-btn-voll/.test(zu.fokus || '') && !zu.tabbarInert && zu.overflow !== 'hidden', [zu.r, zu.fokus, zu.tabbarInert, zu.overflow]);
  pruefe(name + ': nach „Fertig“ steht der Verlauf wieder vor dem Blatt', !(zu.zustand && zu.zustand.wpVollbild), zu.zustand);
  await H.foto(p, 'vollbild-' + name + '-zu');
  // Esc schließt, erneutes Öffnen legt keinen weiteren Verlaufseintrag an
  await p.click(sel + ' .mg-btn-voll'); await p.waitForTimeout(300);
  const z2 = await p.evaluate(ZUSTAND, sel);
  pruefe(name + ': zweites Öffnen: Verlauf wächst nicht weiter', z2.laenge === z.laenge, [z.laenge, z2.laenge]);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  const z3 = await p.evaluate(ZUSTAND, sel);
  pruefe(name + ': Esc schließt das Blatt', voll(z2) && !voll(z3) && !z3.tabbarInert, [z2.r, z3.r]);
  // Zurück (Browser, Wischgeste, Android-Taste) schließt das Blatt, die App bleibt im Reiter
  await p.click(sel + ' .mg-btn-voll'); await p.waitForTimeout(300);
  await p.evaluate(() => history.back()); await p.waitForTimeout(500);
  const z4 = await p.evaluate(ZUSTAND, sel);
  pruefe(name + ': Zurück schließt das Blatt, Seite bleibt (Graphs sichtbar)', !voll(z4) && !z4.tabbarInert && await p.evaluate(() => !document.getElementById('tab-graphs').hidden), z4.r);
}

(async () => {
  const srv = await H.server();
  const b = await webkit.launch();
  try {
    console.log('1) Meteogramm im Vollbild, iPhone 390 × 844');
    {
      const s = await start(b);
      await graphs(s);
      await mgVollbild(s, '390', 390, 844);
      pruefe('Konsole ohne Fehler', s.konsole.length === 0, s.konsole);
      await s.ctx.close();
    }
    console.log('2) Querformat 844 × 390 und 130 % Schrift');
    {
      const s = await start(b, { viewport: { width: 844, height: 390 } });
      await graphs(s);
      await mgVollbild(s, '844-quer', 844, 390);
      await s.ctx.close();
      const g = await start(b);
      await g.p.addStyleTag({ content: 'html { font-size: 130% !important; }' });
      await graphs(g);
      await mgVollbild(g, '390-130', 390, 844);
      await g.ctx.close();
    }
    console.log('3) Mac 1280 × 800: Blatt verdeckt auch die Seitenleiste');
    {
      const s = await start(b, { viewport: { width: 1280, height: 800 } });
      await graphs(s, true);
      await mgVollbild(s, 'mac-1280', 1280, 800);
      await s.ctx.close();
    }
    console.log('4) Reduzierte Bewegung: Blatt erscheint ohne Animation');
    {
      const s = await start(b, { reducedMotion: 'reduce' });
      await graphs(s);
      await s.p.click('#pcMg .mg-btn-voll');
      const a = await s.p.evaluate(() => { const st = getComputedStyle(document.getElementById('pcMg')); return { name: st.animationName, dauer: st.animationDuration }; });
      pruefe('prefers-reduced-motion: keine Wachs-Animation', a.name === 'none' || a.dauer === '0s', a);
      await s.ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  const e = H.ergebnis();
  console.log('\n' + e.ok + ' Prüfungen bestanden, ' + e.fehler + ' fehlgeschlagen.');
  process.exit(e.fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

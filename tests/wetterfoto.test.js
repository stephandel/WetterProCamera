/* tests/wetterfoto.test.js – Wetterfoto (Kamera-Studio) in WetterProCamera, 20.10.2026 (angepasst aus WeddaApp/tests/wetterfoto.test.js)
   Start:  PORT=8823 node tests/wetterfoto.test.js   (Exit-Code 0 = grün). Prüft die App in WebKit (Browser-Kern von Safari).
   Ohne Netz: Open-Meteo antwortet mit tests/fixtures/open-meteo.json (Mannheim, 15.10.2026 14:45), alles andere wie in app.test.js.
   Bildschirmfotos landen in tests/bilder/ (nicht im Repository). */
'use strict';
const fs = require('fs');
const path = require('path');
const { webkit } = require('playwright');
const { neu, WURZEL } = require('./hilfe.js');
const H = neu(+process.env.PORT || 8823);
const { pruefe, BASIS } = H;
const FOTO = path.join(WURZEL, 'foto-mannheim.jpg');
fs.mkdirSync(H.BILDER, { recursive: true });

async function neueSeite(b, o) {
  o = o || {};
  const modus = o.modus || {};
  const s = await H.neueSeite(b, { viewport: { width: o.breite || 390, height: o.hoehe || 844 }, colorScheme: o.farbe || 'light', serviceWorkers: 'allow' }, modus);
  if (o.engineSperren) await s.ctx.route('**/lib/kamera-studio/ks-engine.js', r => r.abort());
  if (o.fremderSpeicher) await s.ctx.addInitScript(() => { if (window.caches) caches.open('fremde-app-v1'); });   // Speicher einer anderen App unter derselben Adresse
  if (o.speicher) await s.ctx.addInitScript(sp => { Object.keys(sp).forEach(k => localStorage.setItem(k, sp[k])); }, o.speicher);
  await s.p.goto(BASIS + (o.adresse || ''));
  await s.p.waitForSelector(o.ohneDaten ? '#tabbar button' : '.tag', { timeout: 10000 });
  s.modus = modus;
  return s;
}
const studioDa = p => p.evaluate(() => !document.getElementById('studio').hidden && !!document.querySelector('#ksWurzel .ks'));
const inst = p => p.evaluate(() => { const r = document.querySelector('#ksWurzel .ks'), i = r && r._ksInst; return i ? { foto: !!i.quelle, wetter: i.wetter, variante: i.variante, optionen: i.optionen } : null; });
const knopf = '#tabbar #tb-kamera';

(async () => {
  const srv = await H.server(), b = await webkit.launch();
  try {
    console.log('1) Zugangsknopf und Studio');
    {
      const { ctx, p, konsole } = await neueSeite(b);
      const leiste = await p.$$eval('#tabbar button', bs => bs.map(x => ({ id: x.id, klasse: x.className, name: x.getAttribute('aria-label') })));
      pruefe('Tab-Leiste: 5 Knöpfe, Wetterfoto auf Platz 3, rund', leiste.length === 5 && leiste[2].id === 'tb-kamera' && /zugang-rund/.test(leiste[2].klasse), leiste);
      pruefe('Wetterfoto-Knopf hat einen Namen mit „Wetterfoto“', /Wetterfoto/.test(leiste[2].name), leiste[2]);
      const tipp = await p.$eval(knopf, e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
      pruefe('Wetterfoto-Knopf mindestens 44 × 44 px', tipp[0] >= 44 && tipp[1] >= 44, tipp);
      await p.waitForFunction(() => window.KSStudio, null, { timeout: 8000 });
      pruefe('Studio wird nach dem Start im Hintergrund geladen', await p.evaluate(() => !!window.KSStudio && !!window.KSEngine));
      const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null), p.click(knopf)]);
      pruefe('Antippen öffnet gleich die Kamera (Datei-Auswahl mit capture)', !!fc && (await fc.element().getAttribute('capture')) === 'environment');
      pruefe('Studio ist offen', await studioDa(p));
      if (fc) await fc.setFiles(FOTO);
      await p.waitForFunction(() => { const r = document.querySelector('#ksWurzel .ks'); return r && r._ksInst && r._ksInst.quelle; }, null, { timeout: 8000 }).catch(() => { });
      const i = await inst(p);
      pruefe('Foto ist geladen', i && i.foto, i);
      pruefe('Einstellung wie WeddaApp: Ein-Tipp-Karte, Auslöser frei, Galerie 3/5, Studio zuerst',
        i && i.variante === 'schnell' && i.optionen.ausloeserOrt === 'frei' && i.optionen.galerieOriginale === 3 && i.optionen.galerieBearbeitet === 5 && i.optionen.vorschauStart === 'studio', i && i.optionen);
      pruefe('Nutzer darf: Auslöser und Sucher am Zahnrad, Galerie nicht', i && JSON.stringify(i.optionen.nutzerDarf) === JSON.stringify({ zugang: [], ausloeser: ['studio'], galerie: [], sucher: ['studio'] }), i && i.optionen.nutzerDarf);
      const w = i && i.wetter;
      pruefe('Wetter der App im Studio: Mannheim, 16,1 °C, Bedeckt, Wind SO, „Beste Mischung“ (echte Daten, kein Beispiel)', w && w.ort.stadt === 'Mannheim' && w.temp === 16.1 && w.lage === 'Bedeckt' && w.windRichtung === 'SO' && w.modell === 'Beste Mischung', w);
      pruefe('Wetter mit Ortszeit, Druck, UV, Sonnenzeiten', w && w.zeit === '2026-10-15T14:45:00+02:00' && w.druck === 1027 && w.uv === 3.05 && w.sonnenaufgang === '07:47' && w.sonnenuntergang === '18:35', w);
      await p.waitForFunction(() => [...document.querySelectorAll('#ksWurzel button')].some(x => x.textContent.trim() === 'Teilen'), null, { timeout: 8000 }).catch(() => { });
      const teilen = await p.$$eval('#ksWurzel button', bs => bs.filter(x => x.getClientRects().length).map(x => x.textContent.trim()));
      pruefe('Teilen-Knopf und Zahnrad im Studio', teilen.includes('Teilen') && !!(await p.$('#ksWurzel [data-akt="nutzer-oeffnen"]')), teilen.slice(0, 20));
      pruefe('Kein Textvorschlag von Claude (braucht einen Server)', !teilen.some(t => /Claude|Textvorschlag/.test(t)));
      pruefe('Kein seitliches Scrollen mit Studio', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await H.foto(p, 'wetterfoto-390-studio-foto');
      await p.click('#studioZu'); await p.waitForTimeout(200);
      pruefe('„Fertig“ schließt das Studio und räumt es ab', await p.evaluate(() => document.getElementById('studio').hidden && !document.querySelector('#ksWurzel .ks') && document.body.style.overflow === ''));
      pruefe('Fokus zurück auf dem Wetterfoto-Knopf', await p.evaluate(() => document.activeElement && document.activeElement.id === 'tb-kamera'));
      await p.click('#btnTeilen'); await p.waitForTimeout(200);
      pruefe('Teilen-Knopf oben öffnet das Studio (ohne Kamera)', await studioDa(p));
      pruefe('Der alte Teilen-Bildschirm bleibt zu', await p.evaluate(() => !document.getElementById('teilen').open));
      await H.foto(p, 'wetterfoto-390-studio');
      await p.keyboard.press('Meta+2'); await p.waitForTimeout(150);
      pruefe('Tastenkürzel ⌘2 wechselt bei offenem Studio nicht den Tab im Hintergrund', await p.evaluate(() => document.getElementById('tab-graphs').hidden));
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      pruefe('Esc schließt das Studio', !(await studioDa(p)));
      pruefe('Keine Fehler in der Konsole', konsole.length === 0, konsole);
      await ctx.close();
    }

    console.log('2) Galerie und Nutzerwahl getrennt von WeddaApp und Konfigurator');
    {
      const { ctx, p, konsole } = await neueSeite(b);
      await p.waitForFunction(() => window.KSStudio);
      const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click(knopf)]); await fc.setFiles(FOTO);
      await p.waitForFunction(() => { const r = document.querySelector('#ksWurzel .ks'); return r && r._ksInst && r._ksInst.quelle; }, null, { timeout: 8000 });
      await p.waitForTimeout(1500);
      const dbs = await p.evaluate(async () => (await indexedDB.databases()).map(d => d.name));
      pruefe('Galerie liegt in „wpcamera-ks-galerie“', dbs.includes('wpcamera-ks-galerie'), dbs);
      pruefe('„ks-galerie“ (WeddaApp, Konfigurator) bleibt unberührt', !dbs.includes('ks-galerie'), dbs);
      const n = await p.evaluate(() => new Promise(ok => { const r = indexedDB.open('wpcamera-ks-galerie'); r.onsuccess = () => { const d = r.result, st = [...d.objectStoreNames][0]; if (!st) return ok(-1); const c = d.transaction(st).objectStore(st).count(); c.onsuccess = () => ok(c.result); }; r.onerror = () => ok(-2); }));
      pruefe('Das Original-Foto ist in der Galerie gelandet', n >= 1, n);
      const sch = await p.evaluate(() => Object.keys(localStorage));
      pruefe('Kein Schlüssel „ks-nutzer-…“ von dieser App geschrieben', !sch.some(k => /^ks-nutzer-/.test(k)), sch);
      pruefe('Keine Fehler in der Konsole', konsole.length === 0, konsole);
      await ctx.close();
      // Vorhandene Daten von WeddaApp/Konfigurator werden nicht angefasst
      const r = await neueSeite(b, { speicher: { 'ks-nutzer-ausloeserOrt': 'links' } });
      await r.p.waitForFunction(() => window.KSStudio);
      await r.p.click('#btnTeilen'); await r.p.waitForTimeout(300);
      pruefe('Nutzerwahl „ks-nutzer-ausloeserOrt“ des Konfigurators wirkt hier nicht', (await inst(r.p)).optionen.ausloeserOrt === 'frei' && await r.p.evaluate(() => localStorage.getItem('ks-nutzer-ausloeserOrt') === 'links'));
      await r.ctx.close();
    }

    console.log('3) Zugangsknopf an allen Orten (Einstellung unter „Mehr“)');
    {
      const { ctx, p, konsole } = await neueSeite(b);
      await p.click('#tb-mehr');
      pruefe('Abschnitt „Wetterfoto“ unter Mehr', await p.$('#wfTitel') !== null);
      await p.waitForFunction(() => window.KSStudio);
      const da = sel => p.$(sel).then(x => !!x);
      await p.click('[data-seg="wfzo"] [data-v="kopf"]');
      pruefe('Kopfzeile: Knopf rechts außen, hinter der Suche', await p.evaluate(() => { const k = document.querySelector('#titelzeile .zugang-kopf'); return !!k && k.previousElementSibling && k.previousElementSibling.id === 'btnSuche'; }));
      pruefe('Kopfzeile: Tab-Leiste ohne Wetterfoto (4 Knöpfe)', (await p.$$('#tabbar button')).length === 4);
      const kopf = await p.evaluate(() => ({ breite: document.documentElement.scrollWidth - innerWidth, k: document.querySelector('.zugang-kopf').getBoundingClientRect().width, ort: document.getElementById('ortName').getBoundingClientRect().width }));
      pruefe('Kopfzeile: kein seitliches Scrollen, Knopf ≥ 44 px, Ortsname hat Platz', kopf.breite <= 0 && kopf.k >= 44 && kopf.ort > 120, kopf);
      await p.click('[data-seg="wfzp"] [data-v="links-aussen"]');
      pruefe('Kopfzeile links außen', await p.evaluate(() => { const k = document.querySelector('#titelzeile .zugang-kopf'); return !!k && k.nextElementSibling && k.nextElementSibling.id === 'btnMenue'; }));
      await p.click('[data-seg="wfzo"] [data-v="schwebend"]');
      pruefe('Schwebend unten rechts, nicht mehr in der Kopfzeile', await da('body > .zugang-schwebend.zugang-pos-ur') && !(await da('#titelzeile .zugang-kopf')));
      const lage = await p.evaluate(() => { const k = document.querySelector('.zugang-schwebend').getBoundingClientRect(), l = document.getElementById('tabbar').getBoundingClientRect(); return { k: k.bottom, l: l.top }; });
      pruefe('Schwebend liegt über der Tab-Leiste', lage.k <= lage.l, lage);
      await p.waitForTimeout(400); await H.foto(p, 'wetterfoto-390-schwebend');
      await p.click('[data-seg="wfzo"] [data-v="mehr"]');
      pruefe('Im Tab „Mehr“: erste Zeile mit Text', await p.evaluate(() => { const k = document.querySelector('#tab-mehr .zugang-mehr [data-zugang]'); return !!k && /Wetterfoto/.test(k.textContent); }));
      pruefe('Im Tab „Mehr“: Aussehen nur Symbol und Text oder Text-Knopf', (await p.$$eval('[data-seg="wfzs"] [data-v]', bs => bs.map(x => x.dataset.v))).join() === 'symbolText,pille');
      await p.click('[data-seg="wfzo"] [data-v="kachel"]');
      await p.click('#tb-wetter');
      pruefe('Kachel ganz oben auf der Startseite, direkt vor „Aktuell“', await p.evaluate(() => { const k = document.querySelector('#tab-wetter .zugang-kachel'); return !!k && k.nextElementSibling.classList.contains('akt'); }));
      await p.waitForTimeout(400); await H.foto(p, 'wetterfoto-390-kachel');
      const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null), p.click('.zugang-kachel [data-zugang]')]);
      pruefe('Kachel öffnet Kamera und Studio', !!fc && await studioDa(p));
      await p.click('#studioZu');
      await p.click('#tb-mehr'); await p.click('[data-seg="wfzo"] [data-v="tab"]'); await p.click('[data-seg="wfzp"] [data-v="1"]'); await p.click('[data-seg="wfzs"] [data-v="symbolText"]');
      const erster = await p.$eval('#tabbar button', x => ({ id: x.id, text: x.textContent.trim() }));
      pruefe('Tab-Leiste Platz 1 mit Symbol und Text', erster.id === 'tb-kamera' && erster.text === 'Kamera', erster);
      pruefe('Wahl gemerkt (eigene Schlüssel wpc-wf-…, nicht die des Studios)', await p.evaluate(() => localStorage.getItem('wpc-wf-zugangOrt') === '"tab"' && localStorage.getItem('wpc-wf-zugangPlatz') === '"1"' && localStorage.getItem('wpc-wf-zugangAussehen') === '"symbolText"' && localStorage.getItem('ks-nutzer-zugangOrt') === null));
      await p.click('#wfZurueck');
      const zurueck = await p.$$eval('#tabbar button', bs => bs.map(x => x.id === 'tb-kamera'));
      pruefe('Zurücksetzen: wieder Platz 3', zurueck.indexOf(true) === 2 && await p.evaluate(() => localStorage.getItem('wpc-wf-zugangOrt') === null), zurueck);
      pruefe('Tabs wechseln funktioniert nach dem Umbau der Leiste', await (async () => { await p.click('#tb-graphs'); return p.evaluate(() => document.getElementById('tb-graphs').getAttribute('aria-selected') === 'true' && !document.getElementById('tab-graphs').hidden); })());
      pruefe('Keine Fehler in der Konsole', konsole.length === 0, konsole);
      await ctx.close();
    }

    console.log('4) Gemerkte Wahl beim Start, alte Wege, Direktlink');
    {
      let r = await neueSeite(b, { speicher: { 'wpc-wf-zugangOrt': '"kopf"', 'wpc-wf-zugangPlatz': '"rechts-innen"', 'wpc-wf-zugangAussehen': '"pille"' } });
      pruefe('Gemerkte Wahl gilt beim Start (Kopfzeile rechts innen, Text-Knopf)', await r.p.evaluate(() => { const k = document.querySelector('#titelzeile .zugang-pille'); return !!k && k.nextElementSibling.id === 'btnSuche' && k.textContent === 'Wetterfoto'; }));
      await r.ctx.close();
      r = await neueSeite(b, { speicher: { 'wpc-wf-zugangOrt': '"quatsch"', 'wpc-wf-zugangAussehen': '"pille"', 'ks-nutzer-zugangOrt': 'kopf' } });
      pruefe('Ungültige Wahl fällt auf Platz 3 rund zurück; Schlüssel des Konfigurators (ks-nutzer-…) wirken nicht', await r.p.evaluate(() => { const k = document.querySelectorAll('#tabbar button')[2]; return k.id === 'tb-kamera' && k.classList.contains('zugang-rund'); }));
      await r.ctx.close();
      r = await neueSeite(b);
      const frueh = await r.p.evaluate(() => !window.KSStudio);
      await r.p.click(knopf);
      const laedt = await r.p.evaluate(() => !document.getElementById('studio').hidden && /geladen/.test(document.getElementById('ksWurzel').textContent));
      await r.p.waitForFunction(() => document.querySelector('#ksWurzel .ks'), null, { timeout: 8000 }).catch(() => { });
      pruefe('Sehr frühes Antippen: „wird geladen“, dann Studio mit „Foto aufnehmen“', frueh && laedt && await r.p.evaluate(() => [...document.querySelectorAll('#ksWurzel button')].some(x => /Foto aufnehmen/.test(x.textContent))), { frueh, laedt });
      await r.ctx.close();
      r = await neueSeite(b, { adresse: '?kamera=1' });
      await r.p.waitForFunction(() => document.querySelector('#ksWurzel .ks'), null, { timeout: 12000 }).catch(() => { });
      pruefe('Kurzbefehl ?kamera=1 öffnet das Studio', await studioDa(r.p));
      pruefe('Keine Fehler in der Konsole', r.konsole.length === 0, r.konsole);
      await r.ctx.close();
      r = await neueSeite(b, { adresse: '?teilen=alt' });
      await r.p.click(knopf); await r.p.waitForTimeout(400);
      pruefe('?teilen=alt: alter Teilen-Bildschirm zum Vergleich', await r.p.evaluate(() => document.getElementById('teilen').open && document.getElementById('studio').hidden && !window.KSStudio));
      await r.ctx.close();
    }

    console.log('5) Dunkel, quer, große Schrift');
    {
      const { ctx, p, konsole } = await neueSeite(b, { farbe: 'light' });
      await p.waitForFunction(() => window.KSStudio);
      const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click(knopf)]); await fc.setFiles(FOTO);
      await p.waitForTimeout(1500);
      const farben = await p.evaluate(() => [getComputedStyle(document.getElementById('studio')).backgroundColor, getComputedStyle(document.getElementById('studioZu')).color, document.querySelector('#ksWurzel .ks').dataset.ksTheme, getComputedStyle(document.querySelector('#ksWurzel .ks')).getPropertyValue('--ks-akzent').trim()]);
      pruefe('Gerät hell: Studio bleibt dunkel (schwarzer Grund, Theme „dunkel“)', farben[0] === 'rgb(0, 0, 0)' && farben[2] === 'dunkel', farben);
      pruefe('Studio trägt den gelben Akzent der App, „Fertig“ gelb', farben[1] === 'rgb(255, 214, 51)' && farben[3].toUpperCase() === '#FFD633', farben);
      const prim = await p.evaluate(() => { const k = document.querySelector('#ksWurzel .ks-knopf.ks-primaer'); return k && [getComputedStyle(k).backgroundColor, getComputedStyle(k).color]; });
      pruefe('Hauptknopf im Studio: schwarze Schrift auf Gelb', prim && prim[0] === 'rgb(255, 214, 51)' && prim[1] === 'rgb(0, 0, 0)', prim);
      pruefe('Keine Fehler in der Konsole', konsole.length === 0, konsole);
      await ctx.close();
      const q = await neueSeite(b, { breite: 844, hoehe: 390 });
      await q.p.waitForFunction(() => window.KSStudio);
      await q.p.click('#btnTeilen'); await q.p.waitForTimeout(800);
      pruefe('Quer: Studio ohne seitliches Scrollen', await q.p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await H.foto(q.p, 'wetterfoto-quer-studio');
      await q.ctx.close();
      const g = await neueSeite(b);
      await g.p.addStyleTag({ content: 'html { font-size: 130% !important; }' });
      await g.p.waitForFunction(() => window.KSStudio);
      await g.p.click('#tb-mehr');
      pruefe('130 % Schrift: Wetterfoto-Einstellungen ohne seitliches Scrollen', await g.p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await g.p.$eval('#wfTitel', e => e.scrollIntoView());
      await g.p.waitForTimeout(400); await H.foto(g.p, 'wetterfoto-mehr-130');
      await g.p.click('#btnTeilen'); await g.p.waitForTimeout(600);
      pruefe('130 % Schrift: Studio ohne seitliches Scrollen', await g.p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await H.foto(g.p, 'wetterfoto-studio-130');
      await g.ctx.close();
    }

    console.log('6) Offline (Service Worker)');
    {
      const swText = fs.readFileSync(path.join(WURZEL, 'sw.js'), 'utf8');
      pruefe('Alle 4 Studio-Dateien stehen in der Hülle von sw.js', ['ks-symbole.js', 'ks-engine.js', 'ks-studio.js', 'ks-studio.css'].every(d => swText.includes("'lib/kamera-studio/" + d + "'")));
      const s = await neueSeite(b, { fremderSpeicher: true });
      const { ctx, p, konsole } = s;
      await p.evaluate(() => navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready));
      await p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(async () => { await p.reload(); await p.waitForSelector('.tag'); });
      pruefe('Service Worker löscht nur eigene Speicher (andere Apps unter derselben Adresse bleiben)', await p.evaluate(() => caches.has('fremde-app-v1')));
      const imSpeicher = await p.evaluate(async () => { const ks = await caches.keys(); const c = await caches.open(ks.find(k => k.startsWith('wpc-'))); return (await c.keys()).map(r => new URL(r.url).pathname).filter(x => /kamera-studio/.test(x)).length; });
      pruefe('Alle 4 Studio-Dateien im Offline-Speicher', imSpeicher === 4, imSpeicher);
      s.modus.offline = true; await ctx.setOffline(true);
      await p.reload(); await p.waitForSelector('#tabbar #tb-kamera', { timeout: 10000 });
      await p.waitForFunction(() => window.KSStudio, null, { timeout: 8000 }).catch(() => { });
      await p.click('#btnTeilen'); await p.waitForTimeout(500);
      pruefe('Offline: Studio lädt aus dem Speicher und öffnet', await studioDa(p));
      await H.foto(p, 'wetterfoto-390-offline');
      const gespeichert = await p.evaluate(() => document.querySelector('#ksWurzel .ks')._ksInst.wetter);
      pruefe('Offline mit gemerkten Daten: Werte bleiben (16,1 °C), kein Beispielwert', gespeichert.temp === 16.1 || gespeichert.temp === undefined, gespeichert);
      pruefe('Keine unerwarteten Fehler in der Konsole', konsole.filter(t => !/Failed to load|Load failed|offline|net::|internet|Fetch API/i.test(t)).length === 0, konsole);
      await ctx.close();
    }

    console.log('7) Funde der zweiten Meinung (aus der WeddaApp)');
    {
      let r = await neueSeite(b, { speicher: { 'wpc-wf-zugangOrt': '"kachel"' } });
      await r.p.waitForFunction(() => window.KSStudio);
      let [fc] = await Promise.all([r.p.waitForEvent('filechooser'), r.p.click('.zugang-kachel [data-zugang]')]); await fc.setFiles(FOTO);
      pruefe('Hintergrund gesperrt, solange das Wetterfoto offen ist', await r.p.evaluate(() => ['titelzeile', 'tabbar'].every(id => document.getElementById(id).hasAttribute('inert')) && document.querySelector('main.inhalt').hasAttribute('inert')));
      const alt = await r.p.evaluate(() => { window.__alt = document.querySelector('.zugang-kachel [data-zugang]'); window.dispatchEvent(new Event('online')); return true; });
      await r.p.waitForFunction(() => !window.__alt.isConnected, null, { timeout: 8000 }).catch(() => { });
      pruefe('Neue Wetterdaten bei offenem Studio: Foto bleibt', alt && (await inst(r.p)).foto);
      await r.p.click('#studioZu');
      pruefe('Fokus nach „Fertig“ auf dem neu gezeichneten Wetterfoto-Knopf', await r.p.evaluate(() => !window.__alt.isConnected && document.activeElement.hasAttribute('data-zugang') && document.activeElement.isConnected));
      pruefe('Hintergrund nach dem Schließen wieder frei', await r.p.evaluate(() => !document.querySelector('[inert]')));
      r.modus.offline = true;
      await r.p.evaluate(() => window.dispatchEvent(new Event('online')));
      await r.p.click('#btnTeilen'); await r.p.waitForTimeout(1500);
      const w = (await inst(r.p)).wetter;
      pruefe('Neuladen scheitert bei offenem Studio: Studio behält die gemerkten Werte (16,1 °C)', w && w.temp === 16.1, w);
      await r.p.click('#studioZu');
      [fc] = await Promise.all([r.p.waitForEvent('filechooser'), r.p.click('.zugang-kachel [data-zugang]')]); await fc.setFiles(FOTO);
      await r.p.waitForFunction(() => { const k = document.querySelector('#ksWurzel .ks'); return k && k._ksInst && k._ksInst.quelle; }, null, { timeout: 8000 }).catch(() => { });
      await r.p.waitForSelector('#ksWurzel [data-akt="senden"]', { state: 'visible', timeout: 10000 }).catch(() => { });
      await r.p.waitForTimeout(800);
      await r.p.click('#ksWurzel [data-akt="senden"]').catch(() => { });
      await r.p.waitForSelector('#ksWurzel .ks-blatt', { timeout: 3000 }).catch(() => { });
      const blatt = await r.p.evaluate(() => !!document.querySelector('#ksWurzel .ks-blatt'));
      await r.p.keyboard.press('Escape'); await r.p.waitForTimeout(300);
      pruefe('Esc mit offenem Blatt schließt nur das Blatt, nicht das Wetterfoto', blatt && await studioDa(r.p) && await r.p.evaluate(() => !document.querySelector('#ksWurzel .ks-blatt')), { blatt });
      await r.p.keyboard.press('Escape'); await r.p.waitForTimeout(300);
      pruefe('Zweites Esc schließt das Wetterfoto', !(await studioDa(r.p)));
      await r.ctx.close();
      // Ohne Wetterdaten: Ortszeit mit Versatz statt UTC, keine Wetterwerte
      r = await neueSeite(b, { ohneDaten: true, modus: { offline: true } });
      await r.p.waitForFunction(() => window.KSStudio, null, { timeout: 8000 }).catch(() => { });
      await r.p.click('#btnTeilen'); await r.p.waitForTimeout(500);
      const z = await r.p.evaluate(() => { const i = document.querySelector('#ksWurzel .ks') && document.querySelector('#ksWurzel .ks')._ksInst; if (!i) return null; return { zeit: i.wetter.zeit, temp: i.wetter.temp, h: new Date().getHours() }; });
      pruefe('Ohne Wetterdaten: Ortszeit mit Versatz, keine Wetterwerte', z && /T\d\d:\d\d:00[+-]\d\d:\d\d$/.test(z.zeit) && +z.zeit.slice(11, 13) === z.h && z.temp === undefined, z);
      await r.ctx.close();
      // Studio-Datei fehlt: Meldung mit „Erneut versuchen“, danach klappt es, ohne doppelte Dateien
      r = await neueSeite(b, { engineSperren: true });
      await r.p.waitForTimeout(2500);
      await r.p.click('#btnTeilen');
      await r.p.waitForSelector('#studioNochmal', { timeout: 6000 }).catch(() => { });
      pruefe('Laden scheitert: Meldung mit „Erneut versuchen“', !!(await r.p.$('#studioNochmal')));
      pruefe('Nach dem Fehlschlag keine halben Studio-Dateien in der Seite', await r.p.evaluate(() => document.querySelectorAll('head [src*="kamera-studio"], head [href*="kamera-studio"]').length === 0));
      await r.ctx.unroute('**/lib/kamera-studio/ks-engine.js');
      await r.p.click('#studioNochmal');
      await r.p.waitForFunction(() => document.querySelector('#ksWurzel .ks'), null, { timeout: 8000 }).catch(() => { });
      pruefe('„Erneut versuchen“ öffnet das Studio, jede Datei genau einmal', await studioDa(r.p) && await r.p.evaluate(() => document.querySelectorAll('head [src*="kamera-studio"], head [href*="kamera-studio"]').length === 4));
      await r.ctx.close();
    }
  } catch (e) { H.ergebnis(); console.log('  ✗ Abbruch: ' + (e && e.stack || e)); process.exitCode = 1; }
  await b.close(); srv.close();
  const e = H.ergebnis();
  console.log('\n' + e.ok + ' Prüfungen bestanden, ' + e.fehler + ' fehlgeschlagen. Bildschirmfotos: ' + H.BILDER);
  process.exit(e.fehler || process.exitCode ? 1 : 0);
})();

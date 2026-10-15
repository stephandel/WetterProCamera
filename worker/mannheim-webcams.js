// Webcam-Zwischenspeicher für WetterProCamera (Mannheim), nach dem Muster von fuerte-sync.
//
// Was er tut: Alle 30 Minuten holt er von jeder freigegebenen Kamera ein Bild und legt es
// in einer D1-Datenbank ab (4 Tage). Die App holt Bilder nur von hier, nie direkt beim
// Betreiber. Das entlastet dessen Server und löst das CORS-Problem (die App darf die Bilder
// ins Canvas zeichnen und als Grafik teilen).
//
// Wege hinein:
//   GET /webcam/kameras       -> Liste der freigegebenen Kameras (id, name, quelle, link)
//   GET /webcam/live?kamera=x -> aktuelles Bild direkt durchgereicht (höchstens 1 Abruf pro Minute, danach aus dem Cache)
//   GET /webcam?kamera=x      -> gespeicherte Bilder der letzten 4 Tage [{ t, url }]
//   GET /webcam/bild/7        -> ein gespeichertes Bild
//   GET /webcam/jetzt         -> von Hand ein Bild je Kamera holen (zum Testen)
//
// Einrichten (einmalig, im Cloudflare-Dashboard): Worker anlegen, D1-Datenbank als Binding "DB",
// Cron-Trigger "5,35 * * * *". Die Tabelle legt der Worker selbst an.
//
// WICHTIG: Eine Kamera erst in FREIGEGEBEN aufnehmen, wenn die schriftliche Erlaubnis des
// Betreibers vorliegt (Stand 15.10.2026: keine). Bis dahin liefert der Worker leere Listen.

const ERLAUBTE_HERKUNFT = [
  'https://stephandel.github.io',
  'http://127.0.0.1:8822',
  'http://localhost:8822'
];

// Alle geprüften Kandidaten (15.10.2026). Nur die in FREIGEGEBEN genannten Kennungen werden abgerufen.
const KAMERAS = {
  oststadt:   { name: 'Mannheim-Oststadt (Himmel)',        url: 'https://klymiuk.info/wetter/webcam/webcam/current.jpg',          quelle: 'Wetterstation Mannheim-Oststadt, Dr. M. Klymiuk', link: 'https://www.klymiuk.info/wetter/webcam.html', takt: 15 },
  seckenheim: { name: 'Mannheim-Seckenheim (Skycam)',      url: 'https://www.mannheim-wetter.info/cam/cam1/mannheim-himmel-0.jpg', quelle: 'mannheim-wetter.info, G. Rabitsch',               link: 'https://www.mannheim-wetter.info/cam/',       takt: 5 },
  airport:    { name: 'City Airport Mannheim',             url: 'http://edfmcam.dyndns.org/record/current.jpg',                   quelle: 'City Airport Mannheim',                            link: 'https://www.flugplatz-mannheim.de/',          takt: 1 },
  boxberg:    { name: 'Heidelberg-Boxberg, Blick Rheinebene', url: 'https://www.berghalde.com/picam/capt0001.jpg',                quelle: 'berghalde.com',                                    link: 'https://www.berghalde.com/',                  takt: 5 },
  ladenburg:  { name: 'Ladenburg Wasserturm',              url: 'https://www.stadt-ladenburg.de/webcam/fetch.php',                quelle: 'Stadt Ladenburg',                                  link: 'https://www.ladenburg.de/de/Aktuelles/Webcam', takt: 1 },
  edingen:    { name: 'Edingen-Neckarhausen (Neckar)',     url: 'https://ursel-hirsch-woelfl.de/edingen-neckarhausen.webcam.ftp/ftpData/current.jpg', quelle: 'Gemeinde Edingen-Neckarhausen', link: 'https://www.edingen-neckarhausen.de/gemeinde/webcam', takt: 1 }
};
const FREIGEGEBEN = [];           // z. B. ['oststadt', 'seckenheim'] nach Erlaubnis
const WEBCAM_TAGE = 4;
const WEBCAM_MAX_BYTES = 900000;  // Ladenburg liefert Full HD, ca. 370 KB

function kopfzeilen(herkunft) {
  return {
    'Access-Control-Allow-Origin': ERLAUBTE_HERKUNFT.includes(herkunft) ? herkunft : ERLAUBTE_HERKUNFT[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  };
}
const antwort = (daten, herkunft, status) => new Response(JSON.stringify(daten), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, kopfzeilen(herkunft)) });

let tabelleGeprueft = false;
async function tabelleSicherstellen(env) {
  if (tabelleGeprueft) return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS webcam_shots (id INTEGER PRIMARY KEY AUTOINCREMENT, kamera TEXT NOT NULL, t TEXT NOT NULL, taken_at INTEGER NOT NULL, mime TEXT, bytes BLOB, UNIQUE (kamera, t))').run();
  tabelleGeprueft = true;
}

// Halbe Stunde in deutscher Ortszeit als "JJJJ-MM-TTTHH:00" oder "…:30"
function ortsHalbstunde(d) {
  const f = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const t = f.formatToParts(d).reduce((o, p) => (o[p.type] = p.value, o), {});
  return `${t.year}-${t.month}-${t.day}T${t.hour === '24' ? '00' : t.hour}:${Number(t.minute) < 30 ? '00' : '30'}`;
}

async function bildAbrufen(id) {
  const cfg = KAMERAS[id];
  if (!cfg || !FREIGEGEBEN.includes(id)) return { fehler: 'nicht freigegeben' };
  const r = await fetch(cfg.url + (cfg.url.includes('?') ? '&' : '?') + 'wpc=' + Date.now(), { headers: { 'User-Agent': 'WetterProCamera/1.0 (+https://stephandel.github.io/WetterProCamera/)' } });
  if (!r.ok) return { fehler: 'Bild ' + r.status };
  const bytes = await r.arrayBuffer();
  if (bytes.byteLength < 2000) return { fehler: 'Bild zu klein' };
  if (bytes.byteLength > WEBCAM_MAX_BYTES) return { fehler: 'Bild zu groß' };
  // Ladenburg meldet "image/jpg", der Flughafen einen falschen Zeitstempel: beides selbst setzen
  const mime = (r.headers.get('Content-Type') || '').startsWith('image/png') ? 'image/png' : 'image/jpeg';
  return { bytes, mime };
}

async function bildSpeichern(id, env) {
  const b = await bildAbrufen(id);
  if (b.fehler) return { kamera: id, fehler: b.fehler };
  const t = ortsHalbstunde(new Date());
  await env.DB.prepare('INSERT OR REPLACE INTO webcam_shots (kamera, t, taken_at, mime, bytes) VALUES (?, ?, ?, ?, ?)').bind(id, t, Date.now(), b.mime, b.bytes).run();
  return { kamera: id, t, bytes: b.bytes.byteLength };
}

async function alleSpeichern(env) {
  await tabelleSicherstellen(env);
  const out = [];
  for (const id of FREIGEGEBEN) { try { out.push(await bildSpeichern(id, env)); } catch (e) { out.push({ kamera: id, fehler: String(e && e.message || e) }); } }
  await env.DB.prepare('DELETE FROM webcam_shots WHERE taken_at < ?').bind(Date.now() - WEBCAM_TAGE * 86400000).run();
  return out;
}

export default {
  async scheduled(event, env, ctx) { if (env.DB) ctx.waitUntil(alleSpeichern(env)); },

  async fetch(request, env, ctx) {
    const herkunft = request.headers.get('Origin') || '';
    const url = new URL(request.url), pfad = url.pathname.replace(/\/+$/, '') || '/';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: kopfzeilen(herkunft) });
    if (request.method !== 'GET') return antwort({ fehler: 'nur GET' }, herkunft, 405);

    // Gespeichertes Bild: für alle lesbar, lange cachebar
    const treffer = pfad.match(/^\/webcam\/bild\/(\d+)$/);
    if (treffer && env.DB) {
      await tabelleSicherstellen(env);
      const z = await env.DB.prepare('SELECT mime, bytes FROM webcam_shots WHERE id = ?').bind(Number(treffer[1])).first();
      if (!z || !z.bytes) return new Response('kein Bild', { status: 404 });
      const roh = Array.isArray(z.bytes) ? new Uint8Array(z.bytes) : z.bytes;
      return new Response(roh, { headers: Object.assign({ 'Content-Type': z.mime || 'image/jpeg', 'Cache-Control': 'public, max-age=86400, immutable' }, kopfzeilen(herkunft)) });
    }

    if (pfad === '/webcam/kameras') return antwort(FREIGEGEBEN.map(id => ({ id, name: KAMERAS[id].name, quelle: KAMERAS[id].quelle, link: KAMERAS[id].link, takt: KAMERAS[id].takt })), herkunft);

    // Live-Bild durchreichen, höchstens einmal pro Minute beim Betreiber abrufen (Cloudflare-Cache)
    if (pfad === '/webcam/live') {
      const id = url.searchParams.get('kamera') || '';
      if (!FREIGEGEBEN.includes(id)) return antwort({ fehler: 'nicht freigegeben' }, herkunft, 404);
      const cache = caches.default, schluessel = new Request(url.origin + '/webcam/live-cache/' + id + '/' + Math.floor(Date.now() / 60000));
      let r = await cache.match(schluessel);
      if (!r) {
        const b = await bildAbrufen(id);
        if (b.fehler) return antwort({ fehler: b.fehler }, herkunft, 502);
        r = new Response(b.bytes, { headers: { 'Content-Type': b.mime, 'Cache-Control': 'public, max-age=60' } });
        ctx.waitUntil(cache.put(schluessel, r.clone()));
      }
      return new Response(r.body, { headers: Object.assign({ 'Content-Type': r.headers.get('Content-Type') || 'image/jpeg', 'Cache-Control': 'public, max-age=60' }, kopfzeilen(herkunft)) });
    }

    if (pfad === '/webcam' && env.DB) {
      const id = url.searchParams.get('kamera') || '';
      if (!KAMERAS[id]) return antwort({ fehler: 'unbekannte Kamera' }, herkunft, 400);
      await tabelleSicherstellen(env);
      const z = await env.DB.prepare('SELECT id, t FROM webcam_shots WHERE kamera = ? ORDER BY t ASC').bind(id).all();
      return antwort({ kamera: id, name: KAMERAS[id].name, quelle: KAMERAS[id].quelle, link: KAMERAS[id].link, shots: z.results.map(r => ({ t: r.t, url: '/webcam/bild/' + r.id })) }, herkunft);
    }

    if (pfad === '/webcam/jetzt' && env.DB) return antwort(await alleSpeichern(env), herkunft);

    return antwort({ fehler: 'unbekannter Weg' }, herkunft, 404);
  }
};

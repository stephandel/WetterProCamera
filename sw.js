/* sw.js – Offline-Betrieb: App-Hülle aus dem Speicher, Wetterdaten immer frisch (Ersatz: letzter Stand in localStorage) */
const VERSION = 'wpc-3';
const HUELLE = ['./', 'index.html', 'app.css', 'app.js', 'base.css', 'tokens.css', 'symbole.js', 'ikonen.js', 'manifest.json', 'apple-touch-icon.png', 'app-symbol-1024.png', 'foto-mannheim.jpg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(HUELLE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;   // Wetterdaten, Karten, Radar: direkt aus dem Netz
  e.respondWith(fetch(e.request).then(r => { const kopie = r.clone(); caches.open(VERSION).then(c => c.put(e.request, kopie)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});

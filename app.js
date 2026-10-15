/* app.js – WetterProCamera. Gestaltung nach DESIGN.md (Design-Konfigurator, 15.10.2026).
   Daten: Open-Meteo (CC BY 4.0), Radar: RainViewer, Karte: OpenTopoMap/OpenStreetMap. Ohne Server, läuft auf GitHub Pages. */
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = function (t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var dez = function (v, n) { return v == null || isNaN(v) ? '–' : Number(v).toFixed(n == null ? 1 : n).replace('.', ','); };
  var rund = function (v) { return v == null || isNaN(v) ? '–' : String(Math.round(v)); };
  var speicher = {
    lesen: function (k, ersatz) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : ersatz; } catch (e) { return ersatz; } },
    schreiben: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };

  /* ---------- Orte ---------- */
  var STANDARDORTE = [
    { name: 'Mannheim', land: 'Deutschland', lat: 49.4875, lon: 8.466 },
    { name: 'Mengerschied', land: 'Deutschland', lat: 49.97, lon: 7.56 },
    { name: 'Corralejo', land: 'Spanien', lat: 28.73, lon: -13.867 },
    { name: 'El Cotillo', land: 'Spanien', lat: 28.683, lon: -14.011 },
    { name: 'Costa Calma', land: 'Spanien', lat: 28.161, lon: -14.228 },
    { name: 'Morro Jable', land: 'Spanien', lat: 28.051, lon: -14.354 }
  ];
  var ort = speicher.lesen('wpgt-ort', STANDARDORTE[0]);
  var ortKey = function (o) { return o.name + '|' + Number(o.lat).toFixed(2) + ',' + Number(o.lon).toFixed(2); };
  var favoriten = speicher.lesen('wpc-favoriten', []);

  /* ---------- Wettermodell (Open-Meteo, Parameter models=) und Einheiten ---------- */
  var MODELLE = [
    ['best_match', 'Beste Mischung', 'Open-Meteo wählt je Ort das passende Modell'],
    ['ecmwf_ifs025', 'ECMWF IFS', 'Europäisches Zentrum für mittelfristige Wettervorhersage'],
    ['icon_seamless', 'DWD ICON', 'Deutscher Wetterdienst'],
    ['gfs_seamless', 'NOAA GFS', 'US-Wetterdienst NOAA'],
    ['meteofrance_seamless', 'Météo-France', 'Französischer Wetterdienst (ARPEGE, AROME)'],
    ['ukmo_seamless', 'UK Met Office', 'Britischer Wetterdienst']
  ];
  var modell = speicher.lesen('wpc-modell', 'best_match');
  if (!MODELLE.some(function (m) { return m[0] === modell; })) modell = 'best_match';
  var modellInfo = function () { return MODELLE.filter(function (m) { return m[0] === modell; })[0] || MODELLE[0]; };
  var EINHEITEN = { kmh: 'km/h', ms: 'm/s', kn: 'kn', bft: 'Bft' };
  var windEinheit = speicher.lesen('wpc-wind', 'kmh'); if (!EINHEITEN[windEinheit]) windEinheit = 'kmh';
  // Daten kommen immer in km/h; umgerechnet wird hier
  var BFT = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  var windWert = function (kmh) {
    if (kmh == null || isNaN(kmh)) return '–';
    if (windEinheit === 'ms') return rund(kmh / 3.6);
    if (windEinheit === 'kn') return rund(kmh / 1.852);
    if (windEinheit === 'bft') { var b = 0; while (b < BFT.length && kmh >= BFT[b]) b++; return String(b); }
    return rund(kmh);
  };
  var windTxt = function (kmh) { return windWert(kmh) + ' ' + EINHEITEN[windEinheit]; };

  /* ---------- Wettercodes (WMO) → Text und Symbol, Tag und Nacht ---------- */
  var CODES = {
    0: ['Sonnig', 'sonne', 'Klar', 'mond'], 1: ['Heiter', 'sonne', 'Klar', 'mond'], 2: ['Wolkig', 'sonnewolke', 'Wolkig', 'mondwolke'], 3: ['Bedeckt', 'bedeckt', 'Bedeckt', 'bedeckt'],
    45: ['Nebel', 'nebel', 'Nebel', 'nebel'], 48: ['Nebel mit Reif', 'nebel', 'Nebel mit Reif', 'nebel'],
    51: ['Leichter Niesel', 'niesel', 'Leichter Niesel', 'niesel'], 53: ['Nieselregen', 'niesel', 'Nieselregen', 'niesel'], 55: ['Starker Niesel', 'niesel', 'Starker Niesel', 'niesel'],
    56: ['Gefrierender Niesel', 'schneeregen', 'Gefrierender Niesel', 'schneeregen'], 57: ['Gefrierender Niesel', 'schneeregen', 'Gefrierender Niesel', 'schneeregen'],
    61: ['Leichter Regen', 'regen', 'Leichter Regen', 'regen'], 63: ['Regen', 'regen', 'Regen', 'regen'], 65: ['Starker Regen', 'regen', 'Starker Regen', 'regen'],
    66: ['Gefrierender Regen', 'schneeregen', 'Gefrierender Regen', 'schneeregen'], 67: ['Gefrierender Regen', 'schneeregen', 'Gefrierender Regen', 'schneeregen'],
    71: ['Leichter Schneefall', 'schnee', 'Leichter Schneefall', 'schnee'], 73: ['Schneefall', 'schnee', 'Schneefall', 'schnee'], 75: ['Starker Schneefall', 'schnee', 'Starker Schneefall', 'schnee'], 77: ['Schneegriesel', 'schnee', 'Schneegriesel', 'schnee'],
    80: ['Regenschauer', 'schauer', 'Regenschauer', 'mondschauer'], 81: ['Regenschauer', 'schauer', 'Regenschauer', 'mondschauer'], 82: ['Kräftige Schauer', 'regen', 'Kräftige Schauer', 'regen'],
    85: ['Schneeschauer', 'schnee', 'Schneeschauer', 'schnee'], 86: ['Starke Schneeschauer', 'schnee', 'Starke Schneeschauer', 'schnee'],
    95: ['Gewitter', 'gewitter', 'Gewitter', 'gewitter'], 96: ['Gewitter mit Hagel', 'hagel', 'Gewitter mit Hagel', 'hagel'], 99: ['Gewitter mit Hagel', 'hagel', 'Gewitter mit Hagel', 'hagel']
  };
  var wText = function (code, tag) { var c = CODES[code] || CODES[3]; return tag === 0 ? c[2] : c[0]; };
  var wArt = function (code, tag) { var c = CODES[code] || CODES[3]; return tag === 0 ? c[3] : c[1]; };
  var sym = function (art, klasse, titel) { return WetterSymbol(art).replace('class="wsym"', 'class="wsym ' + (klasse || '') + '"' + (titel ? ' role="img" aria-label="' + esc(titel) + '"' : '')).replace(' aria-hidden="true"', titel ? '' : ' aria-hidden="true"'); };

  /* ---------- Zeit (Ortszeit des Orts, aus den Daten) ---------- */
  var WT = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
  var teile = function (iso) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso || ''); if (!m) return null; var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return { tag: +m[3], monat: +m[2], st: m[4] || '00', mi: m[5] || '00', wt: WT[d.getUTCDay()] }; };
  var hm = function (iso) { var t = teile(iso); return t ? t.st + ':' + t.mi : ''; };
  var datumKurz = function (iso) { var t = teile(iso); return t ? t.tag + '.' + t.monat + '.' : ''; };

  /* ---------- Wind ---------- */
  var RICHTUNG = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  var richtung = function (deg) { return deg == null ? '' : RICHTUNG[Math.round(deg / 45) % 8]; };
  // Pfeil zeigt, wohin der Wind weht (Richtungsangabe ist die Herkunft)
  var windrose = function (deg) {
    return '<svg class="windrose" viewBox="0 0 32 32" role="img" aria-label="Wind aus ' + richtung(deg) + '"><circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2.5 2.5"/>' +
      '<path d="M16 6 L21 22 L16 18.5 L11 22 Z" fill="currentColor" transform="rotate(' + (((deg || 0) + 180) % 360) + ' 16 16)"/></svg>';
  };

  /* ---------- Daten holen ---------- */
  var daten = null, stand = null, laeuft = false, ladeFehler = false;
  var cacheKey = function (o) { return 'wpgt-daten-' + Number(o.lat).toFixed(3) + ',' + Number(o.lon).toFixed(3) + (modell === 'best_match' ? '' : '-' + modell); };
  function urlVorhersage(o) {
    return 'https://api.open-meteo.com/v1/forecast?latitude=' + o.lat + '&longitude=' + o.lon +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,is_day' +
      '&hourly=temperature_2m,precipitation,precipitation_probability,weather_code,is_day' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunshine_duration,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,sunrise,sunset,uv_index_max' +
      '&minutely_15=precipitation&forecast_minutely_15=8&timezone=auto&forecast_days=8&wind_speed_unit=kmh&models=' + modell;
  }
  function kopfModell() { $('#ortZeile').textContent = 'Modell: ' + modellInfo()[1]; }
  function holeJson(url) {
    var steuer = 'AbortController' in window ? new AbortController() : null;
    var t = setTimeout(function () { if (steuer) steuer.abort(); }, 12000);
    return fetch(url, steuer ? { signal: steuer.signal } : {}).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  function laden() {
    if (laeuft) return; laeuft = true;
    var alt = speicher.lesen(cacheKey(ort), null);
    if (alt && !daten) { daten = alt.d; stand = alt.zeit; render(); }
    else if (!daten) renderSkeleton();
    holeJson(urlVorhersage(ort)).then(function (d) {
      daten = d; ladeFehler = false; stand = Date.now(); speicher.schreiben(cacheKey(ort), { d: d, zeit: stand }); hinweis(null);
      try { render(); } catch (e) { console.error('Darstellung', e); }   // Zeichenfehler nicht als Netzfehler melden
    }, function (e) {
      console.warn('Wetterdaten', e);
      laeuft = false; ladeFehler = !daten; hinweis(daten ? 'offline' : 'fehler');
    }).then(function () { laeuft = false; });
  }
  function hinweis(art) {
    var h = $('#hinweis');
    if (!art) { h.hidden = true; h.innerHTML = ''; return; }
    var uhr = stand ? new Date(stand).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
    if (art === 'fehler') { h.hidden = true; h.innerHTML = ''; render(); return; }   // ohne Daten: ruhiger Zustand im Inhalt (UX-Prüfung A4)
    // Mit Daten: letzter Stand bleibt sichtbar, oben ein Band mit Uhrzeit (DESIGN.md Regel 26)
    h.innerHTML = Ikon('cloud') + '<span class="hinweis-text"><b>Offline · Stand ' + uhr + ' Uhr</b><br>Du siehst den letzten Stand.</span><button class="button leise" id="btnNeu">Erneut versuchen</button>';
    h.hidden = false; $('#btnNeu').addEventListener('click', laden);
  }
  // Leer- und Fehlerzustand: Symbol, ein Satz, eine Aktion (DESIGN.md Regel 35)
  function keineDaten(ziel) {
    ziel.innerHTML = '<section class="kachel leer-zustand" aria-live="polite">' + Ikon('cloud') +
      '<p><b>Keine Verbindung.</b><br>Die Wetterdaten ließen sich nicht laden. Sobald du wieder online bist, geht es weiter.</p>' +
      '<button class="button" data-neu="1">Erneut versuchen</button></section>';
    $('[data-neu]', ziel).addEventListener('click', function () { if (aktiv === 'wetter') renderSkeleton(); laden(); });
  }

  function hinweisKurz(t) { var h = $('#hinweis'); if (!h.hidden && h.querySelector('button')) return; h.textContent = t; h.hidden = false; clearTimeout(hinweisKurz.t); hinweisKurz.t = setTimeout(function () { if (h.textContent === t) h.hidden = true; }, 3000); }

  /* ---------- Wetter-Reiter ---------- */
  function renderSkeleton() {
    $('#tab-wetter').innerHTML = '<div class="kachel sk skeleton" aria-label="Lädt"></div><div class="kachel sk klein skeleton"></div><div class="kachel sk skeleton"></div>';
  }
  function stundenIndex() {
    var h = daten.hourly.time, jetzt = daten.current.time.slice(0, 13);
    for (var i = 0; i < h.length; i++) if (h[i].slice(0, 13) >= jetzt) return i;
    return 0;
  }
  function regenSatz(q) {
    var t = q.time, p = q.precipitation, schwelle = 0.1;
    var erster = p.findIndex(function (x) { return x >= schwelle; });
    if (erster < 0) return 'Die nächsten 2 Stunden bleibt es trocken.';
    if (erster === 0) { var ende = p.findIndex(function (x, i) { return i > 0 && x < schwelle; }); return ende < 0 ? 'Es regnet die nächsten 2 Stunden.' : 'Regen bis etwa ' + hm(t[ende]) + ' Uhr.'; }
    return 'Bis ' + hm(t[erster]) + ' Uhr trocken, danach Regen.';
  }
  /* ---------- Aktuell-Kachel: rechte Hälfte umschaltbar wie bei WeatherPro (links antippen) ---------- */
  // Webcams: erst nach Erlaubnis des Betreibers eintragen (siehe KONZEPT-KAMERA-WEBCAM.md im Konfigurator)
  // Geprüft am 15.10.2026. ALLE erst nach schriftlicher Erlaubnis des Betreibers einkommentieren.
  // Keine liefert CORS: Zum Teilen als Bild und für den Rückblick braucht es einen Worker wie bei Fuerte (fuerte-sync).
  var WEBCAMS = [
    // { name: 'Mannheim-Oststadt (Himmel)', live: 'https://klymiuk.info/wetter/webcam/webcam/current.jpg', quelle: 'Wetterstation Mannheim-Oststadt', seite: 'https://www.klymiuk.info/wetter/webcam.html' },
    // { name: 'Mannheim-Seckenheim (Skycam)', live: 'https://www.mannheim-wetter.info/cam/cam1/mannheim-himmel-0.jpg', quelle: 'mannheim-wetter.info', seite: 'https://www.mannheim-wetter.info/cam/' },
    // { name: 'City Airport Mannheim', live: 'http://edfmcam.dyndns.org/record/current.jpg', quelle: 'City Airport Mannheim', seite: 'https://www.flugplatz-mannheim.de/' },   // nur http: braucht Worker
    // { name: 'Heidelberg-Boxberg, Blick Rheinebene', live: 'https://www.berghalde.com/picam/capt0001.jpg', quelle: 'berghalde.com', seite: 'https://www.berghalde.com/' },
    // { name: 'Ladenburg Wasserturm', live: 'https://www.stadt-ladenburg.de/webcam/fetch.php', quelle: 'Stadt Ladenburg', seite: 'https://www.ladenburg.de/de/Aktuelles/Webcam' },
    // { name: 'Edingen-Neckarhausen (Neckar)', live: 'https://ursel-hirsch-woelfl.de/edingen-neckarhausen.webcam.ftp/ftpData/current.jpg', quelle: 'Gemeinde Edingen-Neckarhausen', seite: 'https://www.edingen-neckarhausen.de/gemeinde/webcam' }
  ];
  var ANSICHT_NAMEN = { werte: 'Werte', radar: 'Radar', webcam: 'Webcam' };
  // Webcam-Ansicht bleibt aus, bis es eine freigegebene Webcam gibt (UX-Prüfung A5)
  var ansichtMoeglich = function (x) { return ANSICHT_NAMEN[x] && (x !== 'webcam' || WEBCAMS.length > 0); };
  var ansichten = function () { var a = speicher.lesen('wpc-ansichten', ['werte', 'radar', 'webcam']).filter(ansichtMoeglich); return a.length ? a : ['werte']; };
  var rechtsAnsicht = function () { var a = ansichten(), x = speicher.lesen('wpc-rechts', 'werte'); return a.indexOf(x) >= 0 ? x : a[0]; };
  var punkte = function (an) { var a = ansichten(); return a.length < 2 ? '' : '<div class="akt-punkte" aria-hidden="true">' + a.map(function (x) { return '<i class="' + (x === an ? 'an' : '') + '"></i>'; }).join('') + '</div>'; };
  var miniKarte = null;
  function rechtsMedien(ansicht) {
    var inhalt;
    if (ansicht === 'radar') inhalt = '<div class="mini-karte" id="miniKarte" aria-label="Regenradar um ' + esc(ort.name) + '"></div><span class="mk-zeit zahl" id="mkZeit"></span><span class="mk-label">Radar</span>';
    else if (WEBCAMS.length) { var w = WEBCAMS[0]; inhalt = '<img class="mk-bild" src="' + esc(w.live) + '?t=' + Math.floor(Date.now() / 60000) + '" alt="Webcam ' + esc(w.name) + '"><span class="mk-zeit">LIVE</span><a class="mk-label" href="' + esc(w.seite) + '" target="_blank" rel="noopener">' + esc(w.quelle) + ' ↗</a>'; }
    else inhalt = '<div class="mk-leer"><div>' + Ikon('camera') + '</div><p>Webcam für ' + esc(ort.name) + ' folgt, sobald der Betreiber zugestimmt hat.</p></div><span class="mk-label">Webcam</span>';
    return '<div class="akt-r medien">' + inhalt + punkte(ansicht) + '</div>';
  }
  function bindUmschalter(ansicht) {
    var u = $('#aktUmschalter'); if (!u) return;
    var weiter = function () { var a = ansichten(), i = a.indexOf(ansicht); speicher.schreiben('wpc-rechts', a[(i + 1) % a.length]); renderWetter(); var n = $('#aktUmschalter'); if (n) n.focus(); };
    u.addEventListener('click', weiter);
    u.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); weiter(); } });
    if (miniKarte) { miniKarte.remove(); miniKarte = null; }
    if (ansicht !== 'radar') return;
    leafletBereit(function () {
      var el = $('#miniKarte'); if (!el) return;
      miniKarte = L.map(el, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, tap: false }).setView([ort.lat, ort.lon], 7);
      L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 10, className: 'mk-grund' }).addTo(miniKarte);   // CARTO verlangt inzwischen einen Schlüssel
      L.circleMarker([ort.lat, ort.lon], { radius: 7, color: '#fff', weight: 2, fillColor: '#0A84FF', fillOpacity: 1 }).addTo(miniKarte);
      holeJson('https://api.rainviewer.com/public/weather-maps.json').then(function (m) {
        var f = m.radar && m.radar.past && m.radar.past[m.radar.past.length - 1]; if (!f || !miniKarte) return;
        L.tileLayer(m.host + f.path + '/256/{z}/{x}/{y}/2/1_1.png', { opacity: .8, maxNativeZoom: 7, maxZoom: 10 }).addTo(miniKarte);
        var z = $('#mkZeit'); if (z) z.textContent = new Date(f.time * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      }).catch(function () { });
    });
  }

  function renderWetter() {
    var c = daten.current, d = daten.daily, h = daten.hourly, i0 = stundenIndex();
    var ansicht = rechtsAnsicht(), name = ANSICHT_NAMEN[ansicht];
    var akt = '<section class="kachel akt" aria-label="Aktuelles Wetter">' +
      '<div class="akt-l tippbar" id="aktUmschalter" role="button" tabindex="0" aria-label="Rechte Hälfte umschalten, jetzt: ' + name + '"><div class="akt-kopf"><b>Aktuell</b> <span class="leise zahl">' + hm(c.time) + '</span></div>' +
      sym(wArt(c.weather_code, c.is_day), 'akt-sym', wText(c.weather_code, c.is_day)) +
      '<div class="akt-fuss"><span class="akt-temp zahl">' + rund(c.temperature_2m) + '°C</span><span class="akt-regen zahl">' + dez(c.precipitation) + ' mm/h</span></div></div>' +
      (ansicht === 'werte' ? '<div class="akt-r"><div class="akt-lage">' + esc(wText(c.weather_code, c.is_day)) + '</div><dl class="werte">' +
      '<div><dt>Gefühlt</dt><dd>' + rund(c.apparent_temperature) + '°C</dd></div>' +
      '<div><dt>Rel. Feuchte</dt><dd>' + rund(c.relative_humidity_2m) + ' %</dd></div>' +
      '<div><dt>Luftdruck</dt><dd>' + rund(c.pressure_msl) + ' hPa</dd></div></dl>' +
      '<div class="windzeile">' + windrose(c.wind_direction_10m) + '<div class="wind-wert"><b>' + windWert(c.wind_speed_10m) + '</b><small>' + EINHEITEN[windEinheit] + ' ' + richtung(c.wind_direction_10m) + '</small></div><div class="boeen">Böen<br><span class="zahl">' + windTxt(c.wind_gusts_10m) + '</span></div></div>' + punkte(ansicht) +
      '</div>' : rechtsMedien(ansicht)) + '</section>';
    // Drei Stundenspalten im Abstand von 6 Stunden
    var spalten = [i0 + 5, i0 + 11, i0 + 17].map(function (i) {
      if (!h.time[i]) return '';
      return '<div><div class="std-zeit zahl">' + hm(h.time[i]) + '</div>' + sym(wArt(h.weather_code[i], h.is_day[i]), 'std-sym', wText(h.weather_code[i], h.is_day[i])) +
        '<div class="std-fuss"><span class="std-regen zahl">' + dez(h.precipitation[i]) + ' mm</span><span class="std-temp">' + rund(h.temperature_2m[i]) + '°C</span></div></div>';
    }).join('');
    var std = '<section class="kachel std" aria-label="Die nächsten Stunden">' + spalten + '</section>';
    // Regen in den nächsten 2 Stunden
    var q = daten.minutely_15, regen = '';
    if (q && q.time && q.time.length) {
      var max = Math.max(1, Math.max.apply(null, q.precipitation));
      var trocken = !q.precipitation.slice(0, 8).some(function (x) { return x >= 0.1; });
      regen = '<section class="kachel" aria-labelledby="regenTitel"><h2 class="kachel-titel" id="regenTitel">' + Ikon('radar') + 'Regenradar · nächste 2 Stunden</h2>' +
        '<p class="regen-satz">' + regenSatz(q) + '</p>' + (trocken ? '' :   // trocken: keine leeren Balken, Kachel bleibt kurz
        '<div class="regen-balken" aria-hidden="true">' + q.precipitation.slice(0, 8).map(function (x) { return '<i class="' + (x < 0.1 ? 'trocken' : '') + '" style="height:' + Math.max(6, x / max * 100) + '%"></i>'; }).join('') + '</div>' +
        '<div class="regen-achse zahl" aria-hidden="true"><span>' + hm(q.time[0]) + '</span><span>' + hm(q.time[Math.min(7, q.time.length - 1)]) + '</span></div>') +
        '<button class="button leise mehr-link" data-gehe="radsat">Radar ansehen</button></section>';
    }
    // Tagesliste
    var std3600 = function (s) { return s == null ? null : s / 3600; };
    var zeilen = d.time.map(function (t, i) {
      if (d.temperature_2m_max[i] == null) return '';   // manche Modelle rechnen nicht so weit voraus
      var name = i === 0 ? 'Heute' : teile(t).wt;
      return '<div class="tag"><div class="tag-name"><b>' + name + '</b><small class="zahl">' + datumKurz(t) + '</small></div>' +
        sym(wArt(d.weather_code[i], 1), 'tag-sym', wText(d.weather_code[i], 1)) +
        '<div class="tag-temp"><span class="min">' + rund(d.temperature_2m_min[i]) + '°C</span><span class="max">' + rund(d.temperature_2m_max[i]) + '°C</span></div>' +
        '<div class="tag-zusatz" aria-label="Sonne ' + dez(std3600(d.sunshine_duration[i])) + ' Stunden, Regenrisiko ' + rund(d.precipitation_probability_max[i]) + ' Prozent, ' + dez(d.precipitation_sum[i]) + ' Millimeter"><span>' + Ikon('sun') + dez(std3600(d.sunshine_duration[i])) + ' h</span><span>' + Ikon('tropfen') + rund(d.precipitation_probability_max[i]) + ' %</span><span>' + Ikon('tropfen') + dez(d.precipitation_sum[i]) + ' mm</span></div>' +
        '<div class="tag-wind">' + windrose(d.wind_direction_10m_dominant[i]) + '<span><b>' + windWert(d.wind_speed_10m_max[i]) + '</b><small>' + EINHEITEN[windEinheit] + '</small></span></div></div>';
    }).join('');
    var tage = '<section class="kachel tage" aria-label="Vorhersage für die nächsten Tage">' + zeilen + '</section>';
    $('#tab-wetter').innerHTML = akt + std + regen + tage;
    bindUmschalter(ansicht);
    // Einmaliger Hinweis, dass die linke Hälfte umschaltet (UX-Prüfung A5)
    if (ansichten().length > 1 && !speicher.lesen('wpc-tipp-akt', false)) { speicher.schreiben('wpc-tipp-akt', true); hinweisKurz('Tipp: Tippe links auf „Aktuell", dann zeigt die rechte Hälfte ' + ansichten().map(function (x) { return ANSICHT_NAMEN[x]; }).join(' oder ') + '.'); }
  }

  /* ---------- Graphs: Temperatur und Regen, 48 Stunden ---------- */
  function renderGraphs() {
    // Breite in echten Pixeln (1 Einheit = 1 px), damit die Achsenzahlen wirklich 12 px groß sind (UX-Prüfung A7)
    var seite = $('#tab-graphs'), breite = Math.round((seite.clientWidth || 358) - 32);
    var h = daten.hourly, i0 = stundenIndex(), n = 48, B = Math.max(280, breite), H = Math.round(Math.min(300, Math.max(200, B * .62))), l = 34, r = 10, o = 14, u = 30;
    var temp = h.temperature_2m.slice(i0, i0 + n), regen = h.precipitation.slice(i0, i0 + n), zeit = h.time.slice(i0, i0 + n);
    var leer = temp.indexOf(null); if (leer > 1) { n = leer; temp = temp.slice(0, n); regen = regen.slice(0, n); zeit = zeit.slice(0, n); }   // Modelle mit kürzerer Reichweite
    regen = regen.map(function (v) { return v || 0; });
    var tmin = Math.floor(Math.min.apply(null, temp) - 1), tmax = Math.ceil(Math.max.apply(null, temp) + 1), rmax = Math.max(2, Math.max.apply(null, regen));
    var x = function (i) { return l + i * (B - l - r) / (n - 1); }, y = function (t) { return o + (tmax - t) * (H - o - u) / (tmax - tmin); };
    var gitter = '', schritt = Math.max(1, Math.round((tmax - tmin) / 4));
    for (var t = Math.ceil(tmin); t <= tmax; t += schritt) gitter += '<line class="gitter" x1="' + l + '" x2="' + (B - r) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text x="' + (l - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t + '°</text>';
    var takt = B < 520 ? 12 : 6;
    var achse = zeit.map(function (z, i) { return i % takt === 0 ? '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle">' + hm(z) + '</text>' : ''; }).join('');
    var bb = Math.max(2, Math.min(8, (B - l - r) / n - 1));
    var balken = regen.map(function (v, i) { var hh = v / rmax * (H - o - u) * .5; return v > 0 ? '<rect class="regen" x="' + (x(i) - bb / 2) + '" y="' + (H - u - hh) + '" width="' + bb + '" height="' + hh + '" rx="1"/>' : ''; }).join('');
    var pfad = temp.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
    var flaeche = pfad + ' L' + x(n - 1) + ' ' + (H - u) + ' L' + x(0) + ' ' + (H - u) + ' Z';
    var tMaxI = temp.indexOf(Math.max.apply(null, temp)), tMinI = temp.indexOf(Math.min.apply(null, temp));
    var summe = regen.reduce(function (a, b) { return a + b; }, 0);
    $('#tab-graphs').innerHTML = '<section class="kachel graph" aria-labelledby="gTitel"><h2 class="kachel-titel" id="gTitel">' + Ikon('chart') + 'Temperatur und Regen · 48 Stunden</h2>' +
      '<svg viewBox="0 0 ' + B + ' ' + H + '" role="img" aria-label="Temperatur zwischen ' + rund(Math.min.apply(null, temp)) + ' und ' + rund(Math.max.apply(null, temp)) + ' Grad, Regen insgesamt ' + dez(summe) + ' Millimeter">' +
      gitter + balken + '<path class="flaeche" d="' + flaeche + '"/><path class="linie" d="' + pfad + '"/>' +
      '<line class="jetzt" x1="' + x(0) + '" x2="' + x(0) + '" y1="' + o + '" y2="' + (H - u) + '"/>' + achse +
      '<g id="gWahl" hidden><line class="wahl-linie" y1="' + o + '" y2="' + (H - u) + '"/><circle class="wahl-punkt" r="5"/></g></svg>' +
      '<p class="graph-wert zahl" id="gWert" aria-live="polite">Tippe auf die Kurve, um einen Wert zu sehen.</p>' +
      '<div class="graph-legende"><span>Temperatur</span><span class="r">Regen pro Stunde</span></div></section>' +
      '<section class="kachel"><p class="regen-satz">Höchstwert ' + rund(temp[tMaxI]) + '°C um ' + hm(zeit[tMaxI]) + ' Uhr, Tiefstwert ' + rund(temp[tMinI]) + '°C um ' + hm(zeit[tMinI]) + ' Uhr.</p>' +
      '<p class="info">' + (summe < 0.2 ? 'In den nächsten zwei Tagen fällt kaum Regen.' : 'In den nächsten zwei Tagen fallen etwa ' + dez(summe) + ' mm Regen.') + '</p></section>';
    // Antippen oder Ziehen zeigt Uhrzeit, Temperatur und Regen der nächsten Stunde
    var svg = $('#tab-graphs svg'), wahl = $('#gWahl'), wert = $('#gWert');
    var zeige = function (ev) {
      var rc = svg.getBoundingClientRect(), px = (ev.clientX - rc.left) * B / rc.width;
      var i = Math.max(0, Math.min(n - 1, Math.round((px - l) * (n - 1) / (B - l - r))));
      wahl.hidden = false; $('line', wahl).setAttribute('x1', x(i)); $('line', wahl).setAttribute('x2', x(i));
      $('circle', wahl).setAttribute('cx', x(i)); $('circle', wahl).setAttribute('cy', y(temp[i]));
      wert.classList.add('an'); wert.textContent = teile(zeit[i]).wt + ' ' + hm(zeit[i]) + ' Uhr · ' + rund(temp[i]) + '°C · Regen ' + dez(regen[i]) + ' mm';
    };
    svg.addEventListener('pointerdown', function (ev) { zeige(ev); svg.setPointerCapture && svg.setPointerCapture(ev.pointerId); });
    svg.addEventListener('pointermove', function (ev) { if (ev.buttons || ev.pointerType === 'mouse') zeige(ev); });
  }
  var groesseT = null;
  window.addEventListener('resize', function () { clearTimeout(groesseT); groesseT = setTimeout(function () { if (aktiv === 'graphs' && daten) renderGraphs(); }, 200); });

  /* ---------- Rad/Sat mit Ebenen: Radar, Satellit, Infrarot, Karte (Leaflet, erst beim Öffnen laden) ---------- */
  // Satellit: EUMETSAT (Meteosat, frei ohne Schlüssel, WMS wie in WetterPro Tool/gemeinsam/wpkarte.js), jeweils das neueste Bild
  var EUMETSAT_WMS = 'https://view.eumetsat.int/geoserver/wms';
  var EBENEN = [['radar', 'Radar'], ['sat', 'Satellit'], ['ir', 'Infrarot'], ['karte', 'Karte']];
  var ebene = speicher.lesen('wpc-ebene', 'radar'); if (!EBENEN.some(function (e) { return e[0] === ebene; })) ebene = 'radar';
  var radarKarte = null, radar = { frames: [], i: 0, ebene: null, timer: null, host: '' }, satEbenen = {}, marken = null, markenOrt = '';
  function leafletBereit(fn, n) { if (window.L) return fn(); if ((n || 0) > 50) return; setTimeout(function () { leafletBereit(fn, (n || 0) + 1); }, 100); }
  function grundKarte(el, zoom) {
    var k = L.map(el, { zoomControl: true, attributionControl: true }).setView([ort.lat, ort.lon], zoom);
    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 15, className: 'grund-ruhig', attribution: 'Karte: © <a href="https://opentopomap.org">OpenTopoMap</a>, Daten © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(k);
    return k;
  }
  // Erklärung und Quelle je Ebene; die Quelle als eigene Zeile mit 44 px Tippfläche statt Inline-Link
  var EBENEN_QUELLE = {
    radar: ['Regenradar der letzten 2 Stunden. Regen erscheint als blaue bis rote Flecken.', 'RainViewer', 'https://www.rainviewer.com'],
    sat: ['Satellitenbild in Farbe (Meteosat), neuestes Bild. Nachts dunkel.', 'EUMETSAT', 'https://view.eumetsat.int'],
    ir: ['Infrarot-Satellitenbild (Meteosat): weiß sind hohe, kalte Wolken, auch nachts.', 'EUMETSAT', 'https://view.eumetsat.int'],
    karte: ['Aktuelle Temperaturen an deinen Orten.', 'Open-Meteo', 'https://open-meteo.com']
  };
  // Regnet es gerade oder in den nächsten 2 Stunden am Ort? (aus der Vorhersage, nicht aus dem Radarbild)
  function regenInSicht() {
    if (!daten) return true;
    var q = daten.minutely_15, jetzt = daten.current && daten.current.precipitation >= 0.1;
    return jetzt || !!(q && q.precipitation && q.precipitation.some(function (x) { return x >= 0.1; }));
  }
  function renderRadsat() {
    var s = $('#tab-radsat');
    if (!s.dataset.gebaut) {
      s.innerHTML = '<div class="chips ebenen" id="ebenenWahl" role="radiogroup" aria-label="Ebene der Karte">' +
        EBENEN.map(function (e) { return '<button class="chip tippbar" role="radio" data-ebene="' + e[0] + '">' + e[1] + '</button>'; }).join('') + '</div>' +
        '<div class="karte" id="radarKarte" role="region" aria-label="Karte"></div>' +
        '<div class="karte-fuss"><button class="button tippbar" id="radarPlay" aria-pressed="false">' + Ikon('chevron') + '<span>Abspielen</span></button><span id="radarZeit" class="zahl" aria-live="polite"></span></div>' +
        '<p class="regen-satz radar-satz" id="radarSatz" hidden></p>' +
        '<div id="ebeneQuelle"></div>';
      s.dataset.gebaut = '1';
      $('#radarPlay').addEventListener('click', radarAbspielen);
      $('#ebenenWahl').addEventListener('click', function (e) { var b = e.target.closest('[data-ebene]'); if (!b) return; ebene = b.dataset.ebene; speicher.schreiben('wpc-ebene', ebene); ebeneZeigen(); });
    }
    leafletBereit(function () {
      if (!radarKarte) radarKarte = grundKarte($('#radarKarte'), 7);
      radarKarte.invalidateSize(); radarKarte.setView([ort.lat, ort.lon], radarKarte.getZoom());
      ebeneZeigen();
    });
  }
  function ebeneZeigen() {
    $$('#ebenenWahl [data-ebene]').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.ebene === ebene)); });
    var eq = EBENEN_QUELLE[ebene];
    $('#ebeneQuelle').innerHTML = '<p class="info">' + eq[0] + '</p><div class="liste quellen-liste"><a class="tippbar" href="' + eq[2] + '" target="_blank" rel="noopener"><span>Quelle: ' + eq[1] + '</span><span aria-hidden="true">↗</span></a></div>';
    $('#radarPlay').hidden = ebene !== 'radar';
    var rs = $('#radarSatz'); rs.hidden = ebene !== 'radar' || regenInSicht();
    rs.textContent = 'Kein Regen in Sicht um ' + ort.name + '. Deshalb zeigt das Radar dort gerade keine Flecken.';
    if (!radarKarte) return;
    // Radar
    if (ebene !== 'radar') { if (radar.ebene) { radarKarte.removeLayer(radar.ebene); radar.ebene = null; } clearInterval(radar.timer); var p = $('#radarPlay'); p.setAttribute('aria-pressed', 'false'); $('span', p).textContent = 'Abspielen'; }
    // Satellit
    ['sat', 'ir'].forEach(function (k) { if (satEbenen[k] && k !== ebene) radarKarte.removeLayer(satEbenen[k]); });
    if (marken && ebene !== 'karte') radarKarte.removeLayer(marken);
    var z = $('#radarZeit'); z.textContent = '';
    if (ebene === 'radar') {
      holeJson('https://api.rainviewer.com/public/weather-maps.json').then(function (m) {
        if (ebene !== 'radar') return;
        radar.host = m.host; radar.frames = (m.radar && m.radar.past) || []; radar.i = radar.frames.length - 1; radarZeigen();
      }).catch(function () { z.textContent = 'Radar gerade nicht erreichbar.'; });
    } else if (ebene === 'sat' || ebene === 'ir') {
      if (!satEbenen[ebene]) {
        satEbenen[ebene] = L.tileLayer.wms(EUMETSAT_WMS, { layers: ebene === 'sat' ? 'mtg_fd:rgb_geocolour' : 'mtg_fd:ir105_hrfi', styles: ebene === 'sat' ? '' : 'mtg_fd:mtg_fd_ir105_hrfi_grayscale',
          format: 'image/jpeg', transparent: false, version: '1.3.0', crs: L.CRS.EPSG3857, opacity: .9, attribution: '© EUMETSAT' });
        satEbenen[ebene].on('tileerror', function () { z.textContent = 'Satellitenbild gerade nicht erreichbar.'; });
      }
      satEbenen[ebene].addTo(radarKarte);
      z.textContent = ebene === 'sat' ? 'Satellit · neuestes Bild' : 'Infrarot · neuestes Bild';
    } else {
      if (!marken) marken = L.layerGroup();
      marken.addTo(radarKarte);
      if (markenOrt !== ortKey(ort)) temperaturMarken();
    }
  }
  function temperaturMarken() {
    var orte = favoriten.concat(STANDARDORTE).concat([ort]).filter(function (o, i, a) { return a.findIndex(function (x) { return ortKey(x) === ortKey(o); }) === i; });
    holeJson('https://api.open-meteo.com/v1/forecast?latitude=' + orte.map(function (o) { return o.lat; }).join(',') + '&longitude=' + orte.map(function (o) { return o.lon; }).join(',') + '&current=temperature_2m,weather_code,is_day&timezone=auto')
      .then(function (antw) {
        marken.clearLayers(); markenOrt = ortKey(ort);
        [].concat(antw).forEach(function (a, i) {
          var o = orte[i], c = a.current;
          L.marker([o.lat, o.lon], { icon: L.divIcon({ className: '', html: '<span class="temp-marke">' + sym(wArt(c.weather_code, c.is_day)) + rund(c.temperature_2m) + '°</span>', iconAnchor: [28, 16] }), title: o.name + ': ' + rund(c.temperature_2m) + ' Grad' }).addTo(marken);
        });
      }).catch(function () { $('#radarZeit').textContent = 'Temperaturen gerade nicht erreichbar.'; });
  }
  function radarZeigen() {
    var f = radar.frames[radar.i]; if (!f || !radarKarte || ebene !== 'radar') return;
    var neu = L.tileLayer(radar.host + f.path + '/256/{z}/{x}/{y}/2/1_1.png', { opacity: .75, maxNativeZoom: 7, maxZoom: 15 });
    neu.addTo(radarKarte); if (radar.ebene) radarKarte.removeLayer(radar.ebene); radar.ebene = neu;
    $('#radarZeit').textContent = new Date(f.time * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  }
  function radarAbspielen() {
    var b = $('#radarPlay'), an = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(an)); $('span', b).textContent = an ? 'Anhalten' : 'Abspielen';
    clearInterval(radar.timer);
    if (an) radar.timer = setInterval(function () { if (!radar.frames.length) return; radar.i = (radar.i + 1) % radar.frames.length; radarZeigen(); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 1500 : 700);
  }

  /* ---------- Mehr: Ortssuche, Orte mit Favoriten, Modell, Einheiten, Quellen, Webcam ---------- */
  // Webcam-Kandidaten: nur Hinweisliste. Bilder erst nach schriftlicher Erlaubnis des Betreibers (siehe WEBCAMS oben).
  var WEBCAM_KANDIDATEN = [
    ['oststadt', 'Mannheim-Oststadt (Himmel)', 'Wetterstation Mannheim-Oststadt', 'https://www.klymiuk.info/wetter/webcam.html'],
    ['seckenheim', 'Mannheim-Seckenheim (Skycam)', 'mannheim-wetter.info', 'https://www.mannheim-wetter.info/cam/'],
    ['airport', 'City Airport Mannheim', 'City Airport Mannheim', 'https://www.flugplatz-mannheim.de/'],
    ['boxberg', 'Heidelberg-Boxberg, Blick Rheinebene', 'berghalde.com', 'https://www.berghalde.com/'],
    ['ladenburg', 'Ladenburg Wasserturm', 'Stadt Ladenburg', 'https://www.ladenburg.de/de/Aktuelles/Webcam'],
    ['edingen', 'Edingen-Neckarhausen (Neckar)', 'Gemeinde Edingen-Neckarhausen', 'https://www.edingen-neckarhausen.de/gemeinde/webcam']
  ];
  var sternSvg = function () { return '<svg class="ikon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.2l2.7 5.5 6 .9-4.35 4.25 1 6L12 17l-5.35 2.85 1-6L3.3 9.6l6-.9Z"/></svg>'; };
  var istFavorit = function (o) { return favoriten.some(function (f) { return ortKey(f) === ortKey(o); }); };
  function meineOrte() {
    var liste = favoriten.concat(STANDARDORTE.filter(function (o) { return !istFavorit(o); }));
    if (!liste.some(function (o) { return ortKey(o) === ortKey(ort); }) && !ort.standort && ort.name !== 'Mein Standort') liste.push(ort);
    return liste;
  }
  function seg(name, wert, optionen, label) {
    return '<div class="seg" role="radiogroup" aria-label="' + esc(label) + '" data-seg="' + name + '">' + optionen.map(function (o) { return '<button type="button" role="radio" class="tippbar" data-v="' + o[0] + '" aria-checked="' + (String(o[0]) === String(wert)) + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  // Quellen als Listenzeilen mit 44 px Tippfläche statt Inline-Links (offener Punkt aus Paket 3)
  function quellenHtml() {
    var m = modellInfo();
    var zeile = function (titel, text, url) {
      var inhalt = '<span class="modell-text"><span>' + titel + '</span><small class="leise">' + text + '</small></span>';
      return url ? '<a class="tippbar" href="' + url + '" target="_blank" rel="noopener">' + inhalt + '<span aria-hidden="true">↗</span></a>' : '<div>' + inhalt + '</div>';
    };
    return zeile('Wetterdaten: Open-Meteo', 'Lizenz CC BY 4.0', 'https://open-meteo.com') +
      zeile('Wettermodell: ' + esc(m[1]), esc(m[2]) + ', über Open-Meteo') +
      zeile('Regenradar: RainViewer', 'Radarbilder der letzten 2 Stunden', 'https://www.rainviewer.com') +
      zeile('Satellit: EUMETSAT', 'Meteosat, Farbe und Infrarot', 'https://view.eumetsat.int') +
      zeile('Karte: OpenTopoMap', '© OpenStreetMap-Mitwirkende', 'https://opentopomap.org') +
      zeile('Ortssuche: Open-Meteo Geocoding', 'GeoNames, CC BY 4.0', 'https://open-meteo.com/en/docs/geocoding-api') +
      zeile('Luftqualität beim Teilen', 'Open-Meteo Air Quality (CAMS)', 'https://open-meteo.com/en/docs/air-quality-api') +
      zeile('Wettersymbole und Beispielfoto', 'Eigene Zeichnung „Klassisch", eigene Aufnahme aus Mannheim');
  }
  function renderMehr() {
    var s = $('#tab-mehr');
    var orteHtml = meineOrte().map(function (o, i) {
      var fav = istFavorit(o);
      return '<div class="ort-zeile"><button class="tippbar ort-wahl" data-ort="' + i + '"' + (ortKey(o) === ortKey(ort) ? ' aria-current="true"' : '') + '><span>' + esc(o.name) + '</span><span class="leise">' + esc(o.land || '') + '</span></button>' +
        '<button class="tippbar stern" data-stern="' + i + '" aria-pressed="' + fav + '" aria-label="' + esc(o.name) + (fav ? ' aus den Favoriten nehmen' : ' als Favorit merken') + '">' + sternSvg() + '</button></div>';
    }).join('');
    s.innerHTML = '<section class="kachel" aria-labelledby="sTitel"><h2 class="kachel-titel" id="sTitel">' + Ikon('search') + 'Ort suchen</h2>' +
      '<form class="suche" id="sucheForm" role="search"><input id="sucheFeld" type="search" placeholder="Stadt oder Ort" autocomplete="off" enterkeyhint="search" aria-label="Ort suchen"><button class="button">Suchen</button></form></section>' +
      '<div class="liste" id="sucheErgebnis" aria-live="polite"></div>' +
      '<h2 class="abschnitt-titel">Meine Orte · Stern = Favorit, steht oben</h2><div class="liste" id="orteListe">' + orteHtml +
      '<button class="tippbar" id="btnStandort"><span>' + Ikon('pin') + ' Mein Standort</span><span class="leise">fragt einmal nach</span></button></div>' +
      '<h2 class="abschnitt-titel">Wettermodell</h2><div class="liste" id="modellListe">' +
      MODELLE.map(function (m) { return '<label class="tippbar"><span class="modell-text"><span>' + m[1] + '</span><small class="leise">' + m[2] + '</small></span><input type="radio" name="modell" value="' + m[0] + '"' + (m[0] === modell ? ' checked' : '') + '></label>'; }).join('') + '</div>' +
      '<p class="info hilfe">Das Modell steht oben unter dem Ort. „Beste Mischung" passt fast immer; andere Modelle zum Vergleichen.</p>' +
      '<h2 class="abschnitt-titel">Einheit für Wind</h2><div class="kachel">' + seg('wind', windEinheit, [['kmh', 'km/h'], ['ms', 'm/s'], ['kn', 'Knoten'], ['bft', 'Beaufort']], 'Einheit für Wind') + '</div>' +
      '<h2 class="abschnitt-titel">Aktuell-Kachel: links antippen wechselt rechts zu</h2><div class="liste" id="ansichtListe">' +
      Object.keys(ANSICHT_NAMEN).map(function (k) {
        var geht = ansichtMoeglich(k);
        return '<label class="tippbar' + (geht ? '' : ' aus') + '"><span class="modell-text"><span>' + ANSICHT_NAMEN[k] + '</span>' + (geht ? '' : '<small class="leise">folgt nach Erlaubnis des Betreibers</small>') + '</span><input type="checkbox" value="' + k + '"' + (geht && ansichten().indexOf(k) >= 0 ? ' checked' : '') + (geht ? '' : ' disabled') + '></label>';
      }).join('') + '</div>' +
      '<h2 class="abschnitt-titel">Webcam</h2><section class="kachel info"><p><b>Folgt nach Erlaubnis.</b> Webcam-Bilder zeigt die App erst, wenn der Betreiber schriftlich zugestimmt hat. Angefragt sind diese Kameras:</p></section>' +
      '<div class="liste" id="webcamListe">' + WEBCAM_KANDIDATEN.map(function (w) { return '<a class="tippbar" href="' + esc(w[3]) + '" target="_blank" rel="noopener"><span class="modell-text"><span>' + esc(w[1]) + '</span><small class="leise">' + esc(w[2]) + '</small></span><span aria-hidden="true">↗</span></a>'; }).join('') + '</div>' +
      '<h2 class="abschnitt-titel">Quellen</h2><p class="info hilfe">Diese Liste entsteht automatisch aus den Diensten, die die App gerade nutzt.</p><div class="liste" id="quellen">' + quellenHtml() + '</div>' +
      '<h2 class="abschnitt-titel">Über die App</h2><section class="kachel info">' +
      '<p><b>WetterProCamera</b> ist eine Test-App, gestaltet mit dem Design-Konfigurator nach den Empfehlungen der KI.</p></section>';
    $('#sucheForm').addEventListener('submit', function (e) { e.preventDefault(); suchen($('#sucheFeld').value); });
    $('#orteListe').addEventListener('click', function (e) {
      var liste = meineOrte(), st = e.target.closest('[data-stern]'), b = e.target.closest('[data-ort]');
      if (st) {
        var o = liste[+st.dataset.stern];
        favoriten = istFavorit(o) ? favoriten.filter(function (f) { return ortKey(f) !== ortKey(o); }) : favoriten.concat([o]);
        speicher.schreiben('wpc-favoriten', favoriten); markenOrt = ''; renderMehr();
        var neu = $('[data-stern]', $('#orteListe')); var ziel = $$('#orteListe [data-stern]').filter(function (x) { return x.getAttribute('aria-label').indexOf(o.name) === 0; })[0] || neu; if (ziel) ziel.focus();
        return;
      }
      if (b) ortSetzen(liste[+b.dataset.ort]);
    });
    $('#btnStandort').addEventListener('click', standort);
    $('#ansichtListe').addEventListener('change', function () { var a = $$('#ansichtListe input:checked').map(function (c) { return c.value; }); var alt = speicher.lesen('wpc-ansichten', ['werte', 'radar', 'webcam']); if (!WEBCAMS.length && alt.indexOf('webcam') >= 0) a.push('webcam');   // Wunsch merken, bis es eine Webcam gibt
      speicher.schreiben('wpc-ansichten', a.some(ansichtMoeglich) ? a : ['werte']); });
    $('#modellListe').addEventListener('change', function (e) {
      modell = e.target.value; speicher.schreiben('wpc-modell', modell); kopfModell(); $('#quellen').innerHTML = quellenHtml();
      daten = null; laden(); hinweisKurz('Lade Vorhersage von ' + modellInfo()[1] + ' …');
    });
    $('[data-seg="wind"]').addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      windEinheit = b.dataset.v; speicher.schreiben('wpc-wind', windEinheit);
      $$('[data-seg="wind"] [data-v]').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
    });
  }
  function suchen(text) {
    var ziel = $('#sucheErgebnis'); text = (text || '').trim(); if (text.length < 2) return;
    ziel.innerHTML = '<div class="leise">Suche läuft …</div>';
    holeJson('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(text) + '&count=8&language=de&format=json').then(function (r) {
      var t = r.results || [];
      ziel.innerHTML = t.length ? t.map(function (o, i) { return '<button class="tippbar" data-treffer="' + i + '"><span>' + esc(o.name) + '</span><span class="leise">' + esc([o.admin1, o.country].filter(Boolean).join(', ')) + '</span></button>'; }).join('') : '<div class="leise">Kein Ort gefunden. Anders schreiben?</div>';
      $$('[data-treffer]', ziel).forEach(function (b) {
        b.addEventListener('click', function () {
          var o = t[+b.dataset.treffer];
          // Stadtteil (PPLX): als Stadt die Gemeinde merken, damit das Teilen-Bild „nur Stadt" zeigen kann
          var stadt = /^PPLX/.test(o.feature_code || '') ? (o.admin4 || o.admin3 || o.name) : o.name;
          ortSetzen({ name: o.name, land: o.country || '', lat: o.latitude, lon: o.longitude, stadt: stadt });
        });
      });
    }).catch(function () { ziel.innerHTML = '<div class="leise">Suche gerade nicht möglich. Bitte Internetverbindung prüfen.</div>'; });
  }
  function naechsterOrt(lat, lon) {
    var km = function (o) { var dl = (o.lat - lat) * 111.2, dk = (o.lon - lon) * 111.2 * Math.cos(lat * Math.PI / 180); return Math.sqrt(dl * dl + dk * dk); };
    var bekannt = favoriten.concat(STANDARDORTE, ort.standort || ort.name === 'Mein Standort' ? [] : [ort]).map(function (o) { return { o: o, d: km(o) }; }).sort(function (a, b) { return a.d - b.d; })[0];
    return bekannt && bekannt.d < 8 ? bekannt.o : null;
  }
  function standort() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(function (p) {
      var lat = +p.coords.latitude.toFixed(3), lon = +p.coords.longitude.toFixed(3);
      // Stadtname ohne fremden Dienst: liegt ein bekannter Ort (Favorit, Standardort, zuletzt gesuchter Ort) näher als 8 km,
      // gilt dessen Name. Sonst bleibt „Mein Standort" (Open-Meteo hat keine Rückwärtssuche; Nominatim nur mit Erlaubnis).
      var naechster = naechsterOrt(lat, lon);
      if (naechster) ortSetzen({ name: naechster.stadt || naechster.name, land: naechster.land || '', lat: lat, lon: lon, stadt: naechster.stadt || naechster.name, standort: true });
      else ortSetzen({ name: 'Mein Standort', land: '', lat: lat, lon: lon, standort: true });
    }, function () { var b = $('#btnStandort .leise'); if (b) b.textContent = 'nicht erlaubt'; });
  }
  function ortSetzen(o) { ort = o; speicher.schreiben('wpgt-ort', o); daten = null; luft = null; $('#ortName').textContent = o.name; zeigeTab('wetter'); laden(); }

  /* ---------- Tabs: Wetter, Graphs, Kamera (Mitte, öffnet Teilen), Rad/Sat, Mehr ---------- */
  var TABS = [['wetter', 'Wetter', 'cloudsun'], ['graphs', 'Graphs', 'chart'], ['kamera', 'Kamera', 'camera'], ['radsat', 'Rad/Sat', 'radar'], ['mehr', 'Mehr', 'more']];
  var SEITEN = TABS.filter(function (t) { return t[0] !== 'kamera'; });
  var aktiv = 'wetter';
  function baueTabs() {
    $('#tabbar').innerHTML = TABS.map(function (t) {
      if (t[0] === 'kamera') return '<button role="tab" aria-selected="false" tabindex="-1" id="tb-kamera" data-kamera="1" class="tippbar tab-kamera" aria-haspopup="dialog" aria-label="Kamera: Wetter mit Foto teilen"><span class="ausloeser">' + Ikon('camera') + '</span><span aria-hidden="true">Kamera</span></button>';
      return '<button role="tab" id="tb-' + t[0] + '" aria-controls="tab-' + t[0] + '" data-tab="' + t[0] + '" class="tippbar">' + Ikon(t[2]) + '<span>' + t[1] + '</span></button>';
    }).join('');
    $('#tabbar').addEventListener('click', function (e) {
      if (e.target.closest('[data-kamera]')) return teilenOeffnen();
      var b = e.target.closest('[data-tab]'); if (b) zeigeTab(b.dataset.tab);
    });
    $('#tabbar').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var ids = TABS.map(function (t) { return t[0]; }), i = ids.indexOf(document.activeElement && document.activeElement.id ? document.activeElement.id.slice(3) : aktiv);
      if (i < 0) i = ids.indexOf(aktiv);
      var n = ids[(i + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
      if (n !== 'kamera') zeigeTab(n);
      $('#tb-' + n).focus();
    });
  }
  function zeigeTab(id) {
    aktiv = id;
    SEITEN.forEach(function (t) { var an = t[0] === id, b = $('#tb-' + t[0]); b.setAttribute('aria-selected', String(an)); b.tabIndex = an ? 0 : -1; $('#tab-' + t[0]).hidden = !an; });
    try { sessionStorage.setItem('wpgt-tab', id); } catch (e) { }
    window.scrollTo(0, 0); render();
  }
  function render() {
    if (aktiv === 'mehr') return renderMehr();
    if (aktiv === 'radsat') return renderRadsat();
    if (!daten) { if (ladeFehler) keineDaten($('#tab-' + aktiv)); return; }
    $('#ortName').textContent = ort.name;
    if (aktiv === 'wetter') renderWetter();
    if (aktiv === 'graphs') renderGraphs();
  }
  document.addEventListener('click', function (e) { var g = e.target.closest('[data-gehe]'); if (g) zeigeTab(g.dataset.gehe); });

  /* ---------- Wetter mit Foto teilen (Canvas). Einstellungen in localStorage „wpc-teilen", Schema wie im Konfigurator ---------- */
  var TEILEN_STANDARD = { format: 'hoch', stil: 'klassisch', infos: ['temp', 'symbol', 'ort', 'datum', 'wind', 'regen', 'sonne'], ortStufe: 'stadt', text: '', ton: 'dunkel', logo: 'appname', partner: false, groesse: 1080, datei: 'jpeg', qualitaet: 90 };
  var T = (function () {
    var gespeichert = speicher.lesen('wpc-teilen', null), t = Object.assign({}, TEILEN_STANDARD, gespeichert || {});
    if (!gespeichert) { var alt = speicher.lesen('wpgt-stil', null); if (alt) t.stil = alt; }
    t.partner = false;   // „Shot on ProCamera" nur mit Freigabe von Cocologics
    return t;
  })();
  var FORMATE = [['hoch', '3:4', 3, 4], ['portrait', '4:5', 4, 5], ['quadrat', '1:1', 1, 1], ['story', '9:16', 9, 16], ['quer', '16:9', 16, 9], ['original', 'Original', 0, 0]];
  var STILE = [['klassisch', 'Klassisch'], ['glas', 'Glas'], ['minimal', 'Minimal'], ['rahmen', 'Rahmen'], ['polaroid', 'Polaroid'], ['zeitstempel', 'Zeitstempel']];
  var INFOS = { temp: 'Temperatur', symbol: 'Wettersymbol', lage: 'Wetterlage', ort: 'Ort', datum: 'Datum', zeit: 'Uhrzeit', wind: 'Wind', boeen: 'Böen', regen: 'Regenmenge heute', regenrisiko: 'Regenrisiko', sonne: 'Sonnenstunden', sonnenzeiten: 'Sonnenaufgang und -untergang', uv: 'UV-Index', feuchte: 'Luftfeuchte', druck: 'Luftdruck', luft: 'Luftqualität', mond: 'Mond', vorhersage: 'Vorhersage für morgen', text: 'Eigener Text' };
  if (!FORMATE.some(function (f) { return f[0] === T.format; })) T.format = 'hoch';
  if (!STILE.some(function (s) { return s[0] === T.stil; })) T.stil = 'klassisch';
  T.infos = (T.infos || []).filter(function (k) { return INFOS[k]; });
  var tSpeichern = function () { speicher.schreiben('wpc-teilen', T); };
  var foto = null, luft = null;

  function ladeBild(src) { return new Promise(function (ok, f) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = f; i.src = src; }); }
  function symbolBild(art) { var defs = (document.getElementById('ws-defs') || {}).outerHTML || ''; var m = defs.match(/<defs>[\s\S]*<\/defs>/); var svg = WetterSymbol(art).replace(/^<svg([^>]*)>/, function (a, b) { return '<svg' + b.replace(/\s(class|aria-hidden|data-art)="[^"]*"/g, '') + ' xmlns="http://www.w3.org/2000/svg" width="256" height="256">' + (m ? m[0] : ''); }); return ladeBild('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)); }
  function fuellen(ctx, img, x, y, w, h) { var s = Math.max(w / img.width, h / img.height), bw = img.width * s, bh = img.height * s; ctx.drawImage(img, x + (w - bw) / 2, y + (h - bh) / 2, bw, bh); }
  var SCHRIFT = function () { return getComputedStyle(document.body).fontFamily; };
  var HAND = '"Noteworthy", "Marker Felt", "Bradley Hand", "Segoe Print", cursive';
  var MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  function schrift(ctx, px, gewicht, familie) { ctx.font = gewicht + ' ' + Math.round(px) + 'px ' + (familie || SCHRIFT()); }
  // Text schreiben; zu lange Zeilen werden kleiner gesetzt (höchstens bis 70 %), danach gestaucht
  function text(ctx, t, x, y, px, gewicht, farbe, ausr, maxB, familie) {
    schrift(ctx, px, gewicht, familie); ctx.fillStyle = farbe; ctx.textAlign = ausr || 'left'; ctx.textBaseline = 'alphabetic';
    if (maxB) { var w = ctx.measureText(t).width; if (w > maxB) { schrift(ctx, Math.max(px * .7, px * maxB / w), gewicht, familie); } }
    if (maxB) ctx.fillText(t, x, y, maxB); else ctx.fillText(t, x, y);
  }
  function umbrechen(ctx, t, maxB) {
    var woerter = t.split(' '), zeilen = [], z = '';
    woerter.forEach(function (w) { var probe = z ? z + ' ' + w : w; if (ctx.measureText(probe).width > maxB && z) { zeilen.push(z); z = w; } else z = probe; });
    if (z) zeilen.push(z); return zeilen;
  }
  // Mittlere Helligkeit eines Bildbereichs (0 = schwarz, 1 = weiß) für den Farbton „automatisch"
  function helligkeit(ctx, x, y, w, h) {
    try {
      var d = ctx.getImageData(Math.max(0, x | 0), Math.max(0, y | 0), Math.max(1, w | 0), Math.max(1, h | 0)).data, s = 0, n = 0, schritt = 4 * Math.max(1, Math.floor(d.length / 4 / 4000));
      for (var i = 0; i < d.length; i += schritt) { s += (.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]) / 255; n++; }
      return n ? s / n : .3;
    } catch (e) { return .3; }
  }
  var FARBEN = { dunkel: { flaeche: 'rgba(0,0,0,.55)', text: '#fff', leise: 'rgba(255,255,255,.85)' }, hell: { flaeche: 'rgba(255,255,255,.75)', text: '#111', leise: 'rgba(0,0,0,.72)' } };
  function tonFuer(ctx, x, y, w, h) { return T.ton === 'auto' ? (helligkeit(ctx, x, y, w, h) > .58 ? 'hell' : 'dunkel') : T.ton === 'hell' ? 'hell' : 'dunkel'; }

  // Mondphase aus dem bekannten Neumond am 6.1.2000, 18:14 UTC
  function mondText() {
    var syn = 29.530588853, alter = ((Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % syn; if (alter < 0) alter += syn;
    var licht = Math.round((1 - Math.cos(2 * Math.PI * alter / syn)) / 2 * 100);
    return 'Mond ' + licht + ' %, ' + (licht > 97 ? 'Vollmond' : licht < 3 ? 'Neumond' : alter < syn / 2 ? 'zunehmend' : 'abnehmend');
  }
  var uvWort = function (u) { return u == null ? '' : u < 3 ? 'niedrig' : u < 6 ? 'mäßig' : u < 8 ? 'hoch' : u < 11 ? 'sehr hoch' : 'extrem'; };
  var luftWort = function (a) { return a < 20 ? 'sehr gut' : a < 40 ? 'gut' : a < 60 ? 'mäßig' : a < 80 ? 'schlecht' : a < 100 ? 'sehr schlecht' : 'extrem schlecht'; };
  function luftHolen() {
    if (luft || T.infos.indexOf('luft') < 0) return;
    luft = { text: '' };
    holeJson('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + ort.lat + '&longitude=' + ort.lon + '&current=european_aqi').then(function (r) {
      var a = r.current && r.current.european_aqi; if (a == null) return;
      luft.text = 'Luft ' + luftWort(a) + ' (AQI ' + Math.round(a) + ')'; teilenZeichnen();
    }).catch(function () { });
  }
  function ortFuerBild() {
    if (T.ortStufe === 'aus' || ort.name === 'Mein Standort') return '';   // ohne bekannte Stadt kein Ort aufs Bild
    return T.ortStufe === 'stadtteil' ? ort.name : (ort.stadt || ort.name);
  }
  // Alle gewählten Infos als fertige Texte, getrennt nach Kopf (Symbol/Temperatur), Titelzeile (Ort/Datum/Zeit) und Details
  function infoTexte() {
    var c = daten.current, d = daten.daily, jetzt = new Date();
    var w = {
      lage: wText(c.weather_code, c.is_day), ort: ortFuerBild(),
      datum: jetzt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }),
      zeit: jetzt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr',
      wind: 'Wind ' + windTxt(c.wind_speed_10m) + ' ' + richtung(c.wind_direction_10m), boeen: 'Böen ' + windTxt(c.wind_gusts_10m),
      regen: 'Regen ' + dez(d.precipitation_sum[0]) + ' mm', regenrisiko: 'Regenrisiko ' + rund(d.precipitation_probability_max[0]) + ' %',
      sonne: 'Sonne ' + (d.sunshine_duration[0] == null ? '–' : dez(d.sunshine_duration[0] / 3600)) + ' h', sonnenzeiten: '↑ ' + hm(d.sunrise[0]) + '  ↓ ' + hm(d.sunset[0]),
      uv: d.uv_index_max && d.uv_index_max[0] != null ? 'UV ' + rund(d.uv_index_max[0]) + ' ' + uvWort(d.uv_index_max[0]) : '',
      feuchte: 'Feuchte ' + rund(c.relative_humidity_2m) + ' %', druck: rund(c.pressure_msl) + ' hPa', luft: luft ? luft.text : '', mond: mondText(),
      vorhersage: d.temperature_2m_max[1] == null ? '' : 'Morgen ' + wText(d.weather_code[1], 1) + ' ' + rund(d.temperature_2m_max[1]) + '°/' + rund(d.temperature_2m_min[1]) + '°',
      text: (T.text || '').trim()
    };
    var an = function (k) { return T.infos.indexOf(k) >= 0; };
    return {
      temp: an('temp') ? rund(c.temperature_2m) + '°' : '', symbol: an('symbol'),
      titel: T.infos.filter(function (k) { return k === 'ort' || k === 'datum' || k === 'zeit'; }).map(function (k) { return w[k]; }).filter(Boolean).join(' · '),
      details: T.infos.filter(function (k) { return ['temp', 'symbol', 'ort', 'datum', 'zeit'].indexOf(k) < 0; }).map(function (k) { return w[k]; }).filter(Boolean),
      datum: w.datum, zeit: w.zeit
    };
  }
  function masse(format, kurz, img) {
    var f = FORMATE.filter(function (x) { return x[0] === format; })[0] || FORMATE[0], a = f[2], b = f[3];
    if (!a) { a = img.width; b = img.height; var r = a / b; if (r > 16 / 9) { a = 16; b = 9; } else if (r < 9 / 16) { a = 9; b = 16; } }
    return a <= b ? [kurz, Math.round(kurz * b / a)] : [Math.round(kurz * a / b), kurz];
  }
  // Tafel: links Symbol + Temperatur und darunter die Titelzeile, rechts die Details untereinander
  function tafelHoehe(inf, k) {
    var hero = inf.temp || inf.symbol, links = 30 * k + (hero ? 150 * k : 0) + (inf.titel ? (hero ? 28 : 40) * k + 20 * k : 0) + 30 * k;
    return Math.max(links, 40 * k + inf.details.length * 50 * k + 20 * k, 140 * k);
  }
  // Wettersymbol zeichnen; auf heller Fläche mit zartem dunklem Schein, damit die weißen Wolken lesbar bleiben (Paket 3)
  var hellerGrund = function (f) { return f && f.text !== '#fff'; };
  function symbolZeichnen(ctx, s, x, y, gr, hell, k) {
    ctx.save();
    if (hell) { ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 14 * k; ctx.shadowOffsetY = 2 * k; }
    ctx.drawImage(s, x, y, gr, gr);
    ctx.restore();
  }
  function tafel(ctx, inf, s, x, y, w, h, k, f, familie) {
    var hero = inf.temp || inf.symbol, sx = x + 36 * k, links = 0;
    var heroY = y + (h - tafelHoehe(inf, k)) / 2;
    if (inf.symbol) { symbolZeichnen(ctx, s, sx, heroY + 30 * k, 150 * k, hellerGrund(f), k); sx += 164 * k; }
    if (inf.temp) { text(ctx, inf.temp, sx, heroY + 140 * k, 110 * k, 300, f.text, 'left', null, familie); sx += ctx.measureText(inf.temp).width; }
    links = sx - x;
    var rechtsB = w - 40 * k - Math.max(links, 0) - 40 * k;
    if (inf.titel) {
      var titelB = inf.details.length ? Math.max(w * .5, w - 80 * k - 300 * k) : w - 80 * k;
      text(ctx, inf.titel, x + 44 * k, hero ? heroY + 208 * k : y + h / 2 + 12 * k, 34 * k, 600, f.text, 'left', titelB, familie);
      links = Math.max(links, Math.min(ctx.measureText(inf.titel).width, titelB) + 44 * k);
      rechtsB = w - 40 * k - links - 40 * k;
    }
    var n = inf.details.length, start = y + (h - n * 50 * k) / 2 + 38 * k;
    inf.details.forEach(function (t, i) { text(ctx, t, x + w - 40 * k, start + i * 50 * k, 34 * k, 500, f.text, 'right', Math.max(rechtsB, w * .35), familie); });
  }
  function logo(ctx, W, H, k, farbe, links) {
    if (T.logo !== 'appname') return;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = farbe === '#fff' || /255,255,255/.test(farbe) ? 6 * k : 0;
    text(ctx, 'WetterProCamera', links ? links : W - 40 * k, H - 36 * k, 26 * k, 600, farbe, links ? 'left' : 'right');
    if (T.partner) text(ctx, 'Shot on ProCamera', links ? links : W - 40 * k, H - 70 * k, 22 * k, 500, farbe, links ? 'left' : 'right');   // nur mit Freigabe von Cocologics
    ctx.restore();
  }
  var zeichenNr = 0;
  function zeichne(cv, welcher, kurz, format) {
    if (!daten) return Promise.resolve();
    var nr = ++zeichenNr; cv._nr = nr;
    var c = daten.current;
    return Promise.all([foto ? Promise.resolve(foto) : ladeBild('foto-mannheim.jpg'), symbolBild(wArt(c.weather_code, c.is_day))]).then(function (b) {
      if (cv._nr !== nr) return;
      var img = b[0], s = b[1], m = masse(format, kurz, img), W = m[0], H = m[1], k = Math.min(W, H) / 1080, ctx = cv.getContext('2d');
      cv.width = W; cv.height = H;
      var inf = infoTexte(), th = tafelHoehe(inf, k), f;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      if (welcher === 'klassisch') {
        fuellen(ctx, img, 0, 0, W, H); f = FARBEN[tonFuer(ctx, 0, 0, W, th)];
        ctx.fillStyle = f.flaeche; ctx.fillRect(0, 0, W, th);
        tafel(ctx, inf, s, 0, 0, W, th, k, f);
        logo(ctx, W, H, k, 'rgba(255,255,255,.9)');
      } else if (welcher === 'glas') {
        fuellen(ctx, img, 0, 0, W, H);
        var gb = Math.min(W - 80 * k, 1400 * k), gx = (W - gb) / 2, gy = H - th - 90 * k; f = FARBEN[tonFuer(ctx, gx, gy, gb, th)];
        ctx.fillStyle = f === FARBEN.hell ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.2)'; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2 * k;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(gx, gy, gb, th, 40 * k); else ctx.rect(gx, gy, gb, th); ctx.fill(); ctx.stroke();
        if (f === FARBEN.dunkel) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill(); }
        tafel(ctx, inf, s, gx, gy, gb, th, k, f);
        logo(ctx, W, H, k, 'rgba(255,255,255,.9)');
      } else if (welcher === 'minimal') {
        fuellen(ctx, img, 0, 0, W, H);
        schrift(ctx, 30 * k, 500); var dz = umbrechen(ctx, inf.details.join(' · '), W - 130 * k);
        var hoehe = (inf.temp || inf.symbol ? 190 * k : 0) + (inf.titel ? 56 * k : 0) + dz.length * 42 * k + 120 * k;
        var ton = tonFuer(ctx, 0, H - hoehe, W, hoehe); f = FARBEN[ton];
        var g = ctx.createLinearGradient(0, H - hoehe - 120 * k, 0, H), farbe = ton === 'hell' ? '255,255,255' : '0,0,0';
        g.addColorStop(0, 'rgba(' + farbe + ',0)'); g.addColorStop(1, 'rgba(' + farbe + ',.7)'); ctx.fillStyle = g; ctx.fillRect(0, H - hoehe - 120 * k, W, hoehe + 120 * k);
        var y = H - 90 * k;
        if (inf.titel) { text(ctx, inf.titel, 66 * k, y, 36 * k, 600, f.text, 'left', W - 360 * k); y -= 56 * k; }
        dz.slice().reverse().forEach(function (z) { text(ctx, z, 66 * k, y, 30 * k, 500, f.leise); y -= 42 * k; });
        if (inf.temp || inf.symbol) {
          var hx = 60 * k;
          if (inf.symbol) { symbolZeichnen(ctx, s, hx, y - 150 * k, 150 * k, ton === 'hell', k); hx += 166 * k; }
          if (inf.temp) text(ctx, inf.temp, hx, y - 6 * k, 180 * k, 200, f.text);
        }
        logo(ctx, W, H, k, f.leise);
      } else if (welcher === 'rahmen' || welcher === 'polaroid') {
        var pol = welcher === 'polaroid', rand = (pol ? 56 : 48) * k, fuss = Math.max(th + (pol ? 40 : 20) * k, H * (pol ? .2 : .16));
        ctx.fillStyle = pol ? '#FBFAF6' : '#fff'; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.beginPath(); ctx.rect(rand, rand, W - 2 * rand, H - rand - fuss); ctx.clip(); fuellen(ctx, img, rand, rand, W - 2 * rand, H - rand - fuss); ctx.restore();
        f = { text: pol ? '#26221C' : '#111', leise: '#555' };
        tafel(ctx, inf, s, rand - 36 * k + 16 * k, H - fuss, W - 2 * rand + 40 * k, fuss - (T.logo === 'appname' ? 30 * k : 0), k, f, pol ? HAND : null);
        if (T.logo === 'appname') text(ctx, 'WetterProCamera', rand, H - 24 * k, 22 * k, 600, '#6B6B6B');
      } else {
        // Zeitstempel: orange Ziffern unten rechts wie bei Analogkameras, mit leichtem Leuchten
        fuellen(ctx, img, 0, 0, W, H);
        var zeilen = (inf.temp ? [inf.temp + (inf.titel ? '  ' + inf.titel.split(' · ').filter(function (t) { return t !== inf.datum && t !== inf.zeit; }).join(' ') : '')] : (inf.titel ? [inf.titel.split(' · ').filter(function (t) { return t !== inf.datum && t !== inf.zeit; }).join(' ')] : [])).concat(inf.details);
        var d0 = new Date(), stempel = String(d0.getDate()).padStart(2, '0') + ' ' + String(d0.getMonth() + 1).padStart(2, '0') + " '" + String(d0.getFullYear()).slice(2);
        if (T.infos.indexOf('zeit') >= 0) stempel += '  ' + inf.zeit.replace(' Uhr', '');
        ctx.save(); ctx.shadowColor = 'rgba(255,80,0,.75)'; ctx.shadowBlur = 10 * k;
        var yy = H - 60 * k; text(ctx, stempel, W - 60 * k, yy, 64 * k, 700, '#FF8A1F', 'right', W - 120 * k, MONO);
        zeilen.filter(Boolean).reverse().forEach(function (z) { yy -= 54 * k; text(ctx, z, W - 60 * k, yy, 38 * k, 700, '#FF8A1F', 'right', W - 120 * k, MONO); });
        ctx.restore();
        // Wettersymbol über den Ziffern, rechtsbündig, mit dunklem Schein für helle Fotos (Paket 3)
        if (inf.symbol) symbolZeichnen(ctx, s, W - 60 * k - 120 * k, yy - 54 * k - 120 * k, 120 * k, helligkeit(ctx, W - 180 * k, yy - 174 * k, 120 * k, 120 * k) > .45, k);
        if (T.logo === 'appname') { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 6 * k; text(ctx, 'WetterProCamera', 40 * k, H - 36 * k, 24 * k, 600, 'rgba(255,255,255,.9)'); ctx.restore(); }
      }
      cv.dataset.stand = format + '/' + welcher + '/' + W + 'x' + H;
    });
  }
  function teilenZeichnen() {
    if (!$('#teilen').open) return Promise.resolve();
    $$('#tStile canvas').forEach(function (cv, i) { zeichne(cv, STILE[i][0], 216, 'hoch'); });
    return zeichne($('#tBild'), T.stil, T.groesse, T.format);
  }
  function teilenOeffnen() {
    if (!daten) { hinweisKurz('Die Wetterdaten laden noch. Gleich noch einmal tippen.'); return; }
    var dlg = $('#teilen');
    $('#tFormate').innerHTML = FORMATE.map(function (f) { return '<button type="button" role="radio" class="t-chip tippbar" data-format="' + f[0] + '" aria-checked="' + (f[0] === T.format) + '"' + (f[0] === 'original' ? ' aria-label="Original: Seitenverhältnis des Fotos"' : '') + '>' + f[1] + '</button>'; }).join('');
    $('#tStile').innerHTML = STILE.map(function (s) { return '<button type="button" role="radio" aria-checked="' + (s[0] === T.stil) + '" data-stil="' + s[0] + '" class="tippbar"><canvas width="54" height="72"></canvas><span>' + s[1] + '</span></button>'; }).join('');
    $('#tBeispiel').hidden = !!foto;   // Beispielfoto kennzeichnen, damit es nicht versehentlich geteilt wird (A8)
    if (!dlg.open) { dlg.showModal(); $('#tBild').focus({ preventScroll: true }); }   // Fokus auf die Vorschau statt Fokusring auf „Abbrechen"
    luftHolen(); teilenZeichnen();
    var akt = $('#tStile [aria-checked="true"]'); if (akt && akt.scrollIntoView) akt.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  /* Blatt „Infos": Haken-Liste mit Reihenfolge (↑ ↓) und weitere Einstellungen */
  function blattBauen() {
    var reihe = T.infos.concat(Object.keys(INFOS).filter(function (k) { return T.infos.indexOf(k) < 0; }));
    var zeilen = reihe.map(function (k) {
      var an = T.infos.indexOf(k) >= 0, i = T.infos.indexOf(k);
      return '<li><label class="tippbar"><input type="checkbox" data-info="' + k + '"' + (an ? ' checked' : '') + '><span>' + INFOS[k] + '</span></label>' +
        '<button type="button" class="pfeil tippbar" data-hoch="' + k + '"' + (!an || i === 0 ? ' disabled' : '') + ' aria-label="' + INFOS[k] + ' nach oben">↑</button>' +
        '<button type="button" class="pfeil tippbar" data-runter="' + k + '"' + (!an || i === T.infos.length - 1 ? ' disabled' : '') + ' aria-label="' + INFOS[k] + ' nach unten">↓</button></li>';
    }).join('');
    $('#tBlattInhalt').innerHTML =
      '<p class="blatt-hilfe">Hake an, was aufs Foto soll. Mit ↑ und ↓ legst du die Reihenfolge fest.</p><ul class="blatt-liste" id="tInfoListe">' + zeilen + '</ul>' +
      '<h3>Ort auf dem Foto</h3>' + seg('ortStufe', T.ortStufe, [['stadt', 'Stadt'], ['stadtteil', 'Stadtteil'], ['aus', 'Aus']], 'Ort auf dem Foto') +
      '<p class="blatt-hilfe">„Stadt" verrät am wenigsten über dich. Stadtteil gibt es nur, wenn du einen Stadtteil gesucht hast.</p>' +
      '<h3 id="tTextTitel">Eigener Text oder Hashtag</h3><input id="tText" aria-labelledby="tTextTitel" class="blatt-feld" type="text" maxlength="60" placeholder="z. B. #Mannheim" value="' + esc(T.text) + '">' +
      '<h3>Farbton der Fläche</h3>' + seg('ton', T.ton, [['dunkel', 'Dunkel'], ['hell', 'Hell'], ['auto', 'Automatisch']], 'Farbton der Fläche') +
      '<p class="blatt-hilfe">Automatisch misst die Helligkeit des Fotos dort, wo die Infos stehen.</p>' +
      '<h3>Logo</h3>' + seg('logo', T.logo, [['appname', 'App-Name'], ['keins', 'Keins']], 'Logo') +
      '<label class="blatt-aus"><input type="checkbox" disabled><span>Shot on ProCamera<small>Nur mit Freigabe von Cocologics, deshalb noch aus.</small></span></label>' +
      '<h3>Größe</h3>' + seg('groesse', T.groesse, [[1080, '1080 px'], [2160, '2160 px']], 'Größe') +
      '<h3>Dateityp</h3>' + seg('datei', T.datei, [['jpeg', 'JPEG (klein)'], ['png', 'PNG (verlustfrei)']], 'Dateityp') +
      '<p class="blatt-hilfe">Datenschutz: Das Bild wird neu aus Pixeln gezeichnet. Es enthält keinen Aufnahmeort (GPS) und keine anderen Daten des Fotos.</p>';
  }
  function blattAuf() { blattBauen(); $('#tBlatt').hidden = false; $('#tInfosAuf').setAttribute('aria-expanded', 'true'); var e = $('#tInfosZu'); if (e) e.focus(); }
  function blattZu() { $('#tBlatt').hidden = true; $('#tInfosAuf').setAttribute('aria-expanded', 'false'); $('#tInfosAuf').focus(); }
  function bindTeilen() {
    $('#tAbbrechen').addEventListener('click', function () { $('#tBlatt').hidden = true; $('#teilen').close(); });
    $('#tInfosAuf').addEventListener('click', blattAuf);
    $('#tInfosZu').addEventListener('click', blattZu);
    $('#tFormate').addEventListener('click', function (e) { var b = e.target.closest('[data-format]'); if (!b) return; T.format = b.dataset.format; tSpeichern(); $$('#tFormate [data-format]').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); }); teilenZeichnen(); });
    $('#tStile').addEventListener('click', function (e) { var b = e.target.closest('[data-stil]'); if (!b) return; T.stil = b.dataset.stil; tSpeichern(); $$('#tStile [data-stil]').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); }); zeichne($('#tBild'), T.stil, T.groesse, T.format); });
    var blatt = $('#tBlattInhalt');
    blatt.addEventListener('change', function (e) {
      var k = e.target.dataset.info; if (!k) return;
      if (e.target.checked) { if (T.infos.indexOf(k) < 0) T.infos.push(k); } else T.infos = T.infos.filter(function (x) { return x !== k; });
      tSpeichern(); blattBauen(); var neu = $('[data-info="' + k + '"]', blatt); if (neu) neu.focus(); luftHolen(); teilenZeichnen();
    });
    blatt.addEventListener('click', function (e) {
      var h = e.target.closest('[data-hoch],[data-runter]'), sg = e.target.closest('[data-seg] [data-v]');
      if (h) {
        var k = h.dataset.hoch || h.dataset.runter, i = T.infos.indexOf(k), j = i + (h.dataset.hoch ? -1 : 1);
        if (i < 0 || j < 0 || j >= T.infos.length) return;
        T.infos[i] = T.infos[j]; T.infos[j] = k; tSpeichern(); blattBauen();
        var f = $('[data-' + (h.dataset.hoch ? 'hoch' : 'runter') + '="' + k + '"]', blatt); if (f && !f.disabled) f.focus(); else { f = $('[data-info="' + k + '"]', blatt); if (f) f.focus(); }
        teilenZeichnen(); return;
      }
      if (sg) {
        var name = sg.parentNode.dataset.seg, v = sg.dataset.v;
        T[name] = name === 'groesse' ? +v : v; tSpeichern();
        $$('[data-v]', sg.parentNode).forEach(function (x) { x.setAttribute('aria-checked', String(x === sg)); });
        teilenZeichnen();
      }
    });
    blatt.addEventListener('input', function (e) {
      if (e.target.id !== 'tText') return;
      T.text = e.target.value; if (T.text.trim() && T.infos.indexOf('text') < 0) { T.infos.push('text'); var cb = $('[data-info="text"]', blatt); if (cb) cb.checked = true; }
      tSpeichern(); clearTimeout(blattBauen.t); blattBauen.t = setTimeout(teilenZeichnen, 250);
    });
    ['#tFotos', '#tKamera'].forEach(function (id) {
      $(id).addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0]; if (!f) return;
        var r = new FileReader(); r.onload = function () { ladeBild(r.result).then(function (i) { foto = i; teilenOeffnen(); }); }; r.readAsDataURL(f);
      });
    });
    $('#tTeilen').addEventListener('click', function () {
      var typ = T.datei === 'png' ? 'image/png' : 'image/jpeg';
      $('#tBild').toBlob(function (blob) {
        if (!blob) return;
        var datei = new File([blob], 'wetter-' + (ortFuerBild() || 'foto').toLowerCase().replace(/[^a-z0-9]+/g, '-') + (T.datei === 'png' ? '.png' : '.jpg'), { type: typ });
        if (navigator.canShare && navigator.canShare({ files: [datei] })) { navigator.share({ files: [datei], title: 'Wetter' + (ortFuerBild() ? ' in ' + ortFuerBild() : '') }).catch(function () { }); return; }
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = datei.name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      }, typ, T.qualitaet / 100);
    });
  }

  /* ---------- Start ---------- */
  $('#btnMenue').innerHTML = Ikon('pin'); $('#btnTeilen').innerHTML = Ikon('share'); $('#btnSuche').innerHTML = Ikon('search');
  $('#tTeilen').innerHTML = Ikon('share'); $('#tFotosIkon').innerHTML = Ikon('image'); $('#tKameraIkon').innerHTML = Ikon('camera');
  // Orte-Symbol (Pin) statt Menü-Symbol, führt direkt zu „Meine Orte" (UX-Prüfung A10)
  $('#btnMenue').addEventListener('click', function () { zeigeTab('mehr'); var l = $('#orteListe'); if (l) { var t = l.previousElementSibling || l; window.scrollTo(0, Math.max(0, t.getBoundingClientRect().top + window.scrollY - $('#titelzeile').offsetHeight - 16)); var e = $('#orteListe [aria-current="true"]') || $('#orteListe button'); if (e) e.focus({ preventScroll: true }); } });
  $('#btnSuche').addEventListener('click', function () { zeigeTab('mehr'); setTimeout(function () { var f = $('#sucheFeld'); if (f) f.focus(); }, 50); });
  $('#btnTeilen').addEventListener('click', teilenOeffnen);
  baueTabs(); bindTeilen(); kopfModell();
  var start = 'wetter'; try { start = sessionStorage.getItem('wpgt-tab') || 'wetter'; } catch (e) { }
  zeigeTab(SEITEN.some(function (t) { return t[0] === start; }) ? start : 'wetter');
  laden();
  window.addEventListener('online', laden);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && stand && Date.now() - stand > 15 * 60 * 1000) laden(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { });
})();

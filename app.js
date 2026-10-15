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
  // Fehler bekommen eine Art (Paket A): 'ueberlastet' (429), 'http' (andere Nummer), 'zeit' (keine Antwort), 'offline' (kein Netz)
  function holeJson(url) {
    var steuer = 'AbortController' in window ? new AbortController() : null, zeitUm = false;
    var t = setTimeout(function () { zeitUm = true; if (steuer) steuer.abort(); }, 12000);
    return fetch(url, steuer ? { signal: steuer.signal } : {}).then(function (r) { clearTimeout(t); if (!r.ok) throw fehlerArt('http', r.status); return r.json(); },
      function (e) { clearTimeout(t); throw fehlerArt(zeitUm ? 'zeit' : 'offline', 0, e); });
  }
  function laden() {
    if (laeuft) return; laeuft = true;
    var alt = speicher.lesen(cacheKey(ort), null);
    if (alt && !daten) { daten = alt.d; stand = alt.zeit; render(); }
    else if (!daten) renderSkeleton();
    holeJson(urlVorhersage(ort)).then(function (d) {
      daten = d; ladeFehler = false; stand = Date.now(); speicher.schreiben(cacheKey(ort), { d: d, zeit: stand }); ladeErgebnis(null); hinweis(null);
      try { render(); } catch (e) { console.error('Darstellung', e); }   // Zeichenfehler nicht als Netzfehler melden
    }, function (e) {
      console.warn('Wetterdaten', e);
      laeuft = false; ladeFehler = !daten; ladeErgebnis(e); hinweis(daten ? 'offline' : 'fehler');
    }).then(function () { laeuft = false; ladeEnde(); });
  }
  function hinweis(art) {
    var h = $('#hinweis');
    if (!art) { h.hidden = true; h.innerHTML = ''; return; }
    if (art === 'fehler') { h.hidden = true; h.innerHTML = ''; render(); return; }   // ohne Daten: ruhiger Zustand im Inhalt (UX-Prüfung A4)
    // Mit Daten: letzter Stand bleibt sichtbar, oben ein Band mit Grund und Uhrzeit (DESIGN.md Regel 26, Fehlerarten: Paket A)
    var f = fehlerText();
    h.innerHTML = Ikon('cloud') + '<span class="hinweis-text"><b>' + f.titel + ' · ' + standText() + '</b><br>' + f.satz + ' Du siehst den letzten Stand.</span><button class="button leise" id="btnNeu">Erneut versuchen</button>';
    h.hidden = false; $('#btnNeu').addEventListener('click', neuVersuchen);
  }
  // Leer- und Fehlerzustand: Symbol, ein Satz, eine Aktion (DESIGN.md Regel 35)
  function keineDaten(ziel) {
    var f = fehlerText();
    ziel.innerHTML = '<section class="kachel leer-zustand" aria-live="polite">' + Ikon('cloud') +
      '<p><b>' + f.titel + '.</b><br>' + f.satz + '</p>' +
      '<button class="button" data-neu="1">Erneut versuchen</button></section>';
    $('[data-neu]', ziel).addEventListener('click', function () { if (aktiv === 'wetter') renderSkeleton(); neuVersuchen(); });
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
    $('#tab-wetter').innerHTML = updateZeile() + akt + std + regen + tage;
    bindUmschalter(ansicht);
    // Einmaliger Hinweis, dass die linke Hälfte umschaltet (UX-Prüfung A5)
    if (ansichten().length > 1 && !speicher.lesen('wpc-tipp-akt', false)) { speicher.schreiben('wpc-tipp-akt', true); hinweisKurz('Tipp: Tippe links auf „Aktuell", dann zeigt die rechte Hälfte ' + ansichten().map(function (x) { return ANSICHT_NAMEN[x]; }).join(' oder ') + '.'); }
  }

  /* ---------- Graphs: Temperatur und Regen, 48 Stunden ---------- */
  function renderGraphs() {
    if (graphsModus() === 'meteo') return renderMeteo();   // Paket C: Meteogramm
    // Breite in echten Pixeln (1 Einheit = 1 px), damit die Achsenzahlen wirklich 12 px groß sind (UX-Prüfung A7)
    var seite = $('#tab-graphs'), breite = Math.round((seite.clientWidth || 358) - 32);
    var h = daten.hourly, i0 = stundenIndex(), n = 48, B = Math.max(280, breite), H = Math.round(Math.min(grafHoeheMax(), Math.max(200, B * .62))), l = 34, r = 10, o = 14, u = 30;
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
    $('#tab-graphs').innerHTML = graphsKopf() + '<section class="kachel graph" aria-labelledby="gTitel"><h2 class="kachel-titel" id="gTitel">' + Ikon('chart') + 'Temperatur und Regen · 48 Stunden</h2>' +
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
    sat: ['Satellitenbild in Farbe (Meteosat). „Abspielen" zeigt die letzten 2 Stunden. Nachts dunkel.', 'EUMETSAT', 'https://view.eumetsat.int'],
    ir: ['Infrarot-Satellitenbild (Meteosat): weiß sind hohe, kalte Wolken, auch nachts. „Abspielen" zeigt die letzten 2 Stunden.', 'EUMETSAT', 'https://view.eumetsat.int'],
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
    satStopp();   // Paket C: Satellitenfilm beenden
    $$('#ebenenWahl [data-ebene]').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.ebene === ebene)); });
    var eq = EBENEN_QUELLE[ebene];
    $('#ebeneQuelle').innerHTML = '<p class="info">' + eq[0] + '</p><div class="liste quellen-liste"><a class="tippbar" href="' + eq[2] + '" target="_blank" rel="noopener"><span>Quelle: ' + eq[1] + '</span><span aria-hidden="true">↗</span></a></div>';
    $('#radarPlay').hidden = ebene === 'karte';   // Paket C: auch Satellit und Infrarot spielen ab
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
      satHinweis();
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
    if (ebene === 'sat' || ebene === 'ir') return satAbspielen();   // Paket C
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
    galerieZeileMehr(s);   // Paket C
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
    if (T.logo === 'eigen') return eigenesLogo(ctx, W, H, k, links);   // Paket C
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
        tafel(ctx, inf, s, rand - 36 * k + 16 * k, H - fuss, W - 2 * rand + 40 * k, fuss - (T.logo === 'appname' ? 30 * k : T.logo === 'eigen' ? 40 * k : 0), k, f, pol ? HAND : null);
        if (T.logo === 'appname') text(ctx, 'WetterProCamera', rand, H - 24 * k, 22 * k, 600, '#6B6B6B');
        else if (T.logo === 'eigen') eigenesLogo(ctx, W, H, k, rand, 22, 14);
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
        else if (T.logo === 'eigen') eigenesLogo(ctx, W, H, k, 40 * k);
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
      '<h3>Logo</h3>' + seg('logo', T.logo, [['appname', 'App-Name'], ['keins', 'Keins'], ['eigen', 'Eigenes Logo']], 'Logo') + logoBereich() +
      '<label class="blatt-aus"><input type="checkbox" disabled><span>Shot on ProCamera<small>Nur mit Freigabe von Cocologics, deshalb noch aus.</small></span></label>' +
      '<h3>Größe</h3>' + seg('groesse', T.groesse, [[1080, '1080 px'], [2160, '2160 px']], 'Größe') +
      '<h3>Dateityp</h3>' + seg('datei', T.datei, [['jpeg', 'JPEG (klein)'], ['png', 'PNG (verlustfrei)']], 'Dateityp') +
      galerieSchalter() +
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
        var sichern = function () { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = datei.name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); galerieSichern(); teilenErfolg('gesichert'); };   // Paket C: Kopie in „Meine Wetterfotos"
        // Erfolg: Bildschirm schließen und kurz bestätigen; Abbruch durch dich (AbortError) ohne Hinweis (Paket A)
        if (navigator.canShare && navigator.canShare({ files: [datei] })) { navigator.share({ files: [datei], title: 'Wetter' + (ortFuerBild() ? ' in ' + ortFuerBild() : '') }).then(function () { galerieSichern(); teilenErfolg('geteilt'); }, function (e) { if (!e || e.name !== 'AbortError') sichern(); }); return; }
        sichern();
      }, typ, T.qualitaet / 100);
    });
  }

  /* === Paket B: App-Technik (15.10.2026) === */
  // Datenquelle wählbar: Open-Meteo (Standard) oder DWD über Bright Sky (brightsky.dev, DWD-Daten CC BY 4.0, ohne Schlüssel).
  // laden() bleibt unverändert. Dafür werden hier urlVorhersage, holeJson, cacheKey, kopfModell, quellenHtml und renderMehr
  // umhüllt: Bei „DWD" liefert urlVorhersage eine Marke „dwd:lat,lon", holeJson erkennt sie und holt die Daten bei Bright Sky.
  var QUELLEN = [['open-meteo', 'Open-Meteo', 'Standard: viele Wettermodelle, ganze Welt'], ['dwd', 'DWD über Bright Sky', 'Deutscher Wetterdienst, Vorhersage MOSMIX bis 10 Tage, Stationen in Deutschland und Umgebung']];
  var quelle = speicher.lesen('wpc-quelle', 'open-meteo'); if (quelle !== 'dwd') quelle = 'open-meteo';
  var dwdLaeuft = null;   // null: noch nicht geladen, true: DWD-Daten sichtbar, false: Rückfall auf Open-Meteo
  var DWD_MARKE = 'dwd:', BRIGHTSKY = 'https://api.brightsky.dev/';
  var KURZBEFEHL_URL = 'https://stephandel.github.io/WetterProCamera/?kamera=1';
  var urlOpenMeteo = urlVorhersage, cacheKeyOpenMeteo = cacheKey;

  urlVorhersage = (function (alt) { return function (o) { return quelle === 'dwd' ? DWD_MARKE + o.lat + ',' + o.lon : alt(o); }; })(urlVorhersage);
  cacheKey = (function (alt) { return function (o) { return alt(o) + (quelle === 'dwd' ? '-dwd' : ''); }; })(cacheKey);
  holeJson = (function (alt) {
    return function (url) {
      if (typeof url !== 'string' || url.indexOf(DWD_MARKE) !== 0) return alt.apply(this, arguments);
      var p = url.slice(DWD_MARKE.length).split(','), o = { lat: +p[0], lon: +p[1] }, rest = [].slice.call(arguments, 1), selbst = this;
      return dwdHolen(o).then(function (d) { dwdLaeuft = true; kopfModell(); return d; }, function (e) {
        // Kein DWD für diesen Ort (oder Bright Sky gestört): Open-Meteo zeigen und das sagen
        console.warn('DWD über Bright Sky', e && e.message);
        dwdLaeuft = false;
        return alt.apply(selbst, [urlOpenMeteo(o)].concat(rest)).then(function (d) {
          kopfModell(); var q = $('#quellen'); if (q) q.innerHTML = quellenHtml();
          dwdMeldung(e && e.keineDaten ? 'DWD hat für diesen Ort keine Daten, Open-Meteo wird gezeigt.' : 'DWD ist gerade nicht erreichbar, Open-Meteo wird gezeigt.');
          return d;
        });
      });
    };
  })(holeJson);
  kopfModell = (function (alt) { return function () { alt(); if (quelle === 'dwd' && dwdLaeuft !== false) $('#ortZeile').textContent = 'Modell: DWD MOSMIX'; }; })(kopfModell);
  quellenHtml = (function (alt) {
    return function () {
      if (quelle !== 'dwd') return alt();
      return '<a class="tippbar" href="https://brightsky.dev" target="_blank" rel="noopener"><span class="modell-text"><span>Daten: DWD über Bright Sky (brightsky.dev)</span><small class="leise">DWD-Daten CC BY 4.0, Modell MOSMIX' +
        (dwdLaeuft === false ? '. Für diesen Ort ohne Daten, deshalb Open-Meteo' : '') + '</small></span><span aria-hidden="true">↗</span></a>' + alt();
    };
  })(quellenHtml);

  function dwdMeldung(t) {
    // nach laden(): dort blendet hinweis(null) den Hinweis aus, deshalb erst im nächsten Takt zeigen
    setTimeout(function () {
      var h = $('#hinweis'); if (!h.hidden && h.querySelector('button')) return;   // Offline-Hinweis hat Vorrang
      h.innerHTML = Ikon('cloud') + '<span class="hinweis-text">' + esc(t) + '</span>'; h.dataset.dwd = '1'; h.hidden = false;
      clearTimeout(dwdMeldung.t); dwdMeldung.t = setTimeout(function () { if (h.dataset.dwd) { h.hidden = true; delete h.dataset.dwd; } }, 8000);
    }, 0);
  }
  var zwei = function (n) { return (n < 10 ? '0' : '') + n; };
  var isoDatum = function (d) { return d.getFullYear() + '-' + zwei(d.getMonth() + 1) + '-' + zwei(d.getDate()); };
  // Zeitzone des Orts: aus einer früheren Open-Meteo-Antwort für diesen Ort, sonst deutsche Zeit
  function dwdZeitzone(o) { var alt = speicher.lesen(cacheKeyOpenMeteo(o), null); return (alt && alt.d && alt.d.timezone) || 'Europe/Berlin'; }
  function brightSkyJson(url) {
    var steuer = 'AbortController' in window ? new AbortController() : null;
    var t = setTimeout(function () { if (steuer) steuer.abort(); }, 12000);
    return fetch(url, steuer ? { signal: steuer.signal } : {}).then(function (r) {
      clearTimeout(t);
      if (r.status === 404) { var f = new Error('Bright Sky: keine Daten (404)'); f.keineDaten = true; throw f; }
      if (!r.ok) throw new Error('Bright Sky: HTTP ' + r.status);
      return r.json();
    });
  }
  function dwdHolen(o) {
    var tz = dwdZeitzone(o), q = 'lat=' + o.lat + '&lon=' + o.lon + '&tz=' + encodeURIComponent(tz);
    var vorhersage = brightSkyJson(BRIGHTSKY + 'weather?' + q + '&date=' + isoDatum(new Date()) + '&last_date=' + isoDatum(new Date(Date.now() + 9 * 864e5)));
    var aktuell = brightSkyJson(BRIGHTSKY + 'current_weather?' + q).catch(function () { return null; });   // fehlt außerhalb Deutschlands oft
    return Promise.all([vorhersage, aktuell]).then(function (r) { var d = brightSkyUmwandeln(r[0], r[1], o); d.timezone = tz; return d; });
  }
  // Bright Sky (condition, icon) → WMO-Code wie in CODES
  function wmoAusBrightSky(bed, ikon, wolken, nied) {
    var c = bed || '', i = ikon || '', n = nied || 0;
    if (c === 'thunderstorm' || i === 'thunderstorm') return 95;
    if (c === 'hail' || i === 'hail') return 96;
    if (c === 'snow' || i === 'snow') return n >= 1.5 ? 75 : n >= 0.5 ? 73 : 71;
    if (c === 'sleet' || i === 'sleet') return 66;
    if (c === 'rain' || i === 'rain') return n >= 4 ? 65 : n >= 1 ? 63 : 61;
    if (c === 'fog' || i === 'fog') return 45;
    if (i.indexOf('clear') === 0) return wolken != null && wolken > 12 ? 1 : 0;
    if (i.indexOf('partly-cloudy') === 0) return 2;
    if (i === 'cloudy') return 3;
    return wolken == null ? 3 : wolken < 15 ? 0 : wolken < 40 ? 1 : wolken < 75 ? 2 : 3;
  }
  // Gefühlte Temperatur (Formel des australischen Wetterdienstes: Temperatur, Feuchte, Wind)
  function gefuehlt(t, feuchte, kmh) {
    if (t == null || feuchte == null || kmh == null) return null;
    var e = feuchte / 100 * 6.105 * Math.exp(17.27 * t / (237.7 + t));
    return t + .33 * e - .7 * (kmh / 3.6) - 4;
  }
  // Sonnenauf- und -untergang ohne Dienst (Sonnenstand-Formel nach NOAA, vereinfacht, genau auf etwa 1–2 Minuten).
  // datum 'JJJJ-MM-TT', versatz = Minuten zur Weltzeit (aus dem Zeitstempel). Ergebnis als Ortszeit 'JJJJ-MM-TTTHH:MM'.
  function sonnenzeiten(datum, lat, lon, versatz) {
    var g = Math.PI / 180, p = datum.split('-');
    var jdMittag = Date.UTC(+p[0], +p[1] - 1, +p[2], 12) / 864e5 + 2440587.5;
    var n = Math.round(jdMittag - 2451545 + .0008), js = n - lon / 360;
    var M = (357.5291 + .98560028 * js) % 360, C = 1.9148 * Math.sin(M * g) + .02 * Math.sin(2 * M * g) + .0003 * Math.sin(3 * M * g);
    var lambda = (M + C + 180 + 102.9372) % 360, transit = 2451545 + js + .0053 * Math.sin(M * g) - .0069 * Math.sin(2 * lambda * g);
    var sinD = Math.sin(lambda * g) * Math.sin(23.4397 * g), cosD = Math.cos(Math.asin(sinD));
    var cosW = (Math.sin(-.833 * g) - Math.sin(lat * g) * sinD) / (Math.cos(lat * g) * cosD);
    if (cosW > 1) return { auf: null, unter: null, polartag: false };   // Polarnacht
    if (cosW < -1) return { auf: null, unter: null, polartag: true };   // Mitternachtssonne
    var w = Math.acos(cosW) / g / 360;
    var ortszeit = function (jd) { return new Date((jd - 2440587.5) * 864e5 + versatz * 60000).toISOString().slice(0, 16); };
    return { auf: ortszeit(transit - w), unter: ortszeit(transit + w) };
  }
  // Antwort von Bright Sky in das Datenformat der App (wie Open-Meteo: current, hourly, daily) übersetzen
  function brightSkyUmwandeln(antw, akt, o) {
    var w = ((antw && antw.weather) || []).filter(function (x) { return x.temperature != null; }), jetzt = Date.now();
    if (w.length < 24 || !w.some(function (x) { return Date.parse(x.timestamp) > jetzt + 6 * 3600e3; })) { var f = new Error('Bright Sky: keine Vorhersage für diesen Ort'); f.keineDaten = true; throw f; }
    var zeit = function (ts) { return ts.slice(0, 16); };
    var versatz = function (ts) { var m = /([+-])(\d{2}):(\d{2})$/.exec(ts); return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +m[3]) : 0; };
    var tage = [], proTag = {}, sonne = {};
    w.forEach(function (x) { var t = x.timestamp.slice(0, 10); if (!proTag[t]) { proTag[t] = []; tage.push(t); } proTag[t].push(x); });
    tage.forEach(function (t) { sonne[t] = sonnenzeiten(t, o.lat, o.lon, versatz(proTag[t][0].timestamp)); });
    var istTag = function (x) { var s = sonne[x.timestamp.slice(0, 10)], z = zeit(x.timestamp); return s.auf ? (z >= s.auf && z < s.unter ? 1 : 0) : (s.polartag ? 1 : 0); };
    var hourly = { time: [], temperature_2m: [], precipitation: [], precipitation_probability: [], weather_code: [], is_day: [] };
    w.forEach(function (x) {
      hourly.time.push(zeit(x.timestamp)); hourly.temperature_2m.push(x.temperature); hourly.precipitation.push(x.precipitation == null ? 0 : x.precipitation);
      hourly.precipitation_probability.push(x.precipitation_probability); hourly.weather_code.push(wmoAusBrightSky(x.condition, x.icon, x.cloud_cover, x.precipitation)); hourly.is_day.push(istTag(x));
    });
    // Aktuell: Messung der nächsten DWD-Station; fehlt sie (außerhalb Deutschlands), die laufende Stunde der Vorhersage
    var iJ = 0; w.forEach(function (x, i) { if (Date.parse(x.timestamp) <= jetzt) iJ = i; });
    var h = w[iJ], a = (akt && akt.weather) || {}, wert = function (v, ersatz) { return v == null ? ersatz : v; };
    var temp = wert(a.temperature, h.temperature), feuchte = wert(a.relative_humidity, h.relative_humidity), wind = wert(a.wind_speed_10, h.wind_speed);
    var current = {
      time: zeit(a.timestamp || h.timestamp), temperature_2m: temp, apparent_temperature: gefuehlt(temp, feuchte, wind), relative_humidity_2m: feuchte,
      pressure_msl: wert(a.pressure_msl, h.pressure_msl), weather_code: a.icon || a.condition ? wmoAusBrightSky(a.condition, a.icon, a.cloud_cover, a.precipitation_60) : hourly.weather_code[iJ],
      wind_speed_10m: wind, wind_direction_10m: wert(a.wind_direction_10, h.wind_direction), wind_gusts_10m: wert(a.wind_gust_speed_10, h.wind_gust_speed),
      precipitation: wert(a.precipitation_60, h.precipitation), cloud_cover: wert(a.cloud_cover, h.cloud_cover), visibility: wert(a.visibility, h.visibility),
      is_day: a.icon ? (/night/.test(a.icon) ? 0 : 1) : hourly.is_day[iJ]
    };
    var daily = { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [], sunshine_duration: [], precipitation_probability_max: [], precipitation_sum: [], wind_speed_10m_max: [], wind_direction_10m_dominant: [], sunrise: [], sunset: [], uv_index_max: [] };
    tage.forEach(function (t, i) {
      var xs = proTag[t]; if (i > 0 && xs.length < 12) return;   // angebrochener letzter Tag
      var zahlen = function (k, liste) { return (liste || xs).map(function (x) { return x[k]; }).filter(function (v) { return v != null; }); };
      var summe = function (k) { var z = zahlen(k); return z.length ? z.reduce(function (s, v) { return s + v; }, 0) : null; };
      var max = function (k) { var z = zahlen(k); return z.length ? Math.max.apply(null, z) : null; };
      // Tagessymbol: kräftigstes Niederschlagswetter am Tag, sonst Nebel (ab 3 Stunden), sonst mittlere Bewölkung
      var hell = xs.filter(function (x) { return istTag(x); }); if (!hell.length) hell = xs;
      var codes = hell.map(function (x) { return wmoAusBrightSky(x.condition, x.icon, x.cloud_cover, x.precipitation); });
      var nass = codes.filter(function (c) { return c >= 51; }), wolken = zahlen('cloud_cover', hell), mittel = wolken.length ? wolken.reduce(function (s, v) { return s + v; }, 0) / wolken.length : null;
      var code = nass.length ? Math.max.apply(null, nass) : codes.filter(function (c) { return c === 45; }).length >= 3 ? 45 : wmoAusBrightSky(null, null, mittel, 0);
      // Hauptwindrichtung als Mittel der Richtungen, gewichtet mit der Windstärke
      var vx = 0, vy = 0; xs.forEach(function (x) { if (x.wind_direction == null || x.wind_speed == null) return; vx += Math.sin(x.wind_direction * Math.PI / 180) * x.wind_speed; vy += Math.cos(x.wind_direction * Math.PI / 180) * x.wind_speed; });
      var sonnenMin = summe('sunshine');
      daily.time.push(t); daily.weather_code.push(code); daily.temperature_2m_max.push(max('temperature'));
      daily.temperature_2m_min.push(Math.min.apply(null, zahlen('temperature'))); daily.sunshine_duration.push(sonnenMin == null ? null : sonnenMin * 60);
      daily.precipitation_probability_max.push(max('precipitation_probability')); daily.precipitation_sum.push(summe('precipitation') || 0);
      daily.wind_speed_10m_max.push(max('wind_speed')); daily.wind_direction_10m_dominant.push(vx || vy ? (Math.atan2(vx, vy) * 180 / Math.PI + 360) % 360 : null);
      daily.sunrise.push(sonne[t].auf || ''); daily.sunset.push(sonne[t].unter || ''); daily.uv_index_max.push(null);   // UV hat Bright Sky nicht
    });
    return { _quelle: 'dwd', latitude: o.lat, longitude: o.lon, current: current, hourly: hourly, daily: daily };
  }

  // Tab „Mehr": Abschnitte Datenquelle und Kurzbefehl, Datenschutz-Satz (ohne bestehende Zeilen zu ändern: renderMehr wird umhüllt)
  renderMehr = (function (alt) { return function () { alt(); mehrPaketB(); }; })(renderMehr);
  function mehrPaketB() {
    var s = $('#tab-mehr'), titel = function (t) { return $$('h2.abschnitt-titel', s).filter(function (h) { return h.textContent.trim() === t; })[0]; };
    var vor = function (el, html) { var tmp = document.createElement('div'); tmp.innerHTML = html; while (tmp.firstChild) el.parentNode.insertBefore(tmp.firstChild, el); };
    var nach = function (el, html) { el.insertAdjacentHTML('afterend', html); };
    // Datenquelle vor dem Abschnitt „Wettermodell"
    var quelleHtml = '<h2 class="abschnitt-titel" id="quelleTitel">Datenquelle</h2><div class="liste" id="quelleListe" role="radiogroup" aria-labelledby="quelleTitel">' +
      QUELLEN.map(function (q) { return '<label class="tippbar"><span class="modell-text"><span>' + q[1] + '</span><small class="leise">' + q[2] + '</small></span><input type="radio" name="quelle" value="' + q[0] + '"' + (q[0] === quelle ? ' checked' : '') + '></label>'; }).join('') + '</div>' +
      '<p class="info hilfe">Beim DWD fehlen UV-Index und Luftqualität (dort steht „–"). Sonnenauf- und -untergang rechnet die App selbst aus. Die Wahl „Wettermodell" darunter gilt nur für Open-Meteo.</p>';
    var wm = titel('Wettermodell'); if (wm) vor(wm, quelleHtml); else s.insertAdjacentHTML('beforeend', quelleHtml);
    // Datenschutz-Satz: unter „Datenschutz" (falls vorhanden), sonst unter den Quellen
    var satz = '<p class="info hilfe" id="datenschutzDwd">Bei Datenquelle DWD sieht brightsky.dev deine IP-Adresse und den Ort.</p>';
    var ds = titel('Datenschutz'), ql = $('#quellen', s);
    if (ds && ds.nextElementSibling) nach(ds.nextElementSibling, satz); else if (ql) nach(ql, '<p class="info hilfe" id="datenschutzDwd"><b>Datenschutz:</b> Bei Datenquelle DWD sieht brightsky.dev deine IP-Adresse und den Ort.</p>');
    // Kurzbefehl „Wetterfoto" vor „Über die App"
    var kb = '<h2 class="abschnitt-titel" id="kbTitel">Kurzbefehl „Wetterfoto“</h2><section class="kachel kurzbefehl" aria-labelledby="kbTitel">' +
      '<p>Mit Apples App „Kurzbefehle“ fotografierst du mit einem Tipp und landest danach direkt im Teilen-Bildschirm dieser App.</p><ol class="kb-schritte">' +
      '<li>Öffne die App <b>Kurzbefehle</b> und tippe oben rechts auf <b>+</b>.</li>' +
      '<li>Füge die Aktion <b>App öffnen</b> hinzu und wähle <b>ProCamera</b> (oder <b>Kamera</b>).</li>' +
      '<li>Füge die Aktion <b>Warten bis Rückkehr</b> hinzu. Der Kurzbefehl wartet dann, bis du fotografiert hast und zurückwechselst.</li>' +
      '<li>Füge die Aktion <b>URL öffnen</b> hinzu und setze diesen Link ein:<code class="kb-link">' + esc(KURZBEFEHL_URL) + '</code></li>' +
      '<li>Nenne den Kurzbefehl <b>Wetterfoto</b>. Über <b>Zum Home-Bildschirm</b> bekommt er ein eigenes Symbol, oder du sagst „Hey Siri, Wetterfoto“.</li>' +
      '<li>Weitergeben: Kurzbefehle lassen sich seit iOS 15 nur über einen iCloud-Link teilen. Den Link erzeugst du selbst, wenn der Kurzbefehl fertig ist (Kurzbefehl lange drücken, „Teilen“, „iCloud-Link kopieren“).</li></ol>' +
      '<p class="info">Der Link öffnet die App in Safari und zeigt gleich den Teilen-Bildschirm. Tippe dort auf „Fotos“ und wähle das neueste Bild.</p>' +
      '<div class="kb-fuss"><button class="button" id="kbKopieren" aria-label="Link für den Kurzbefehl kopieren">Link kopieren</button><span class="leise" id="kbStatus" role="status" aria-live="polite"></span></div></section>';
    var ueber = titel('Über die App'); if (ueber) vor(ueber, kb); else s.insertAdjacentHTML('beforeend', kb);

    $('#quelleListe').addEventListener('change', function (e) {
      quelle = e.target.value === 'dwd' ? 'dwd' : 'open-meteo'; speicher.schreiben('wpc-quelle', quelle); dwdLaeuft = null;
      kopfModell(); var q = $('#quellen'); if (q) q.innerHTML = quellenHtml();
      daten = null; laden(); hinweisKurz('Lade Vorhersage von ' + (quelle === 'dwd' ? 'DWD über Bright Sky' : 'Open-Meteo') + ' …');
    });
    $('#kbKopieren').addEventListener('click', function () {
      var st = $('#kbStatus'), fertig = function (ok) { st.textContent = ok ? 'Link kopiert ✓' : 'Kopieren ging nicht. Halte den Link oben gedrückt und wähle „Kopieren“.'; clearTimeout(fertig.t); fertig.t = setTimeout(function () { st.textContent = ''; }, 4000); };
      var ersatz = function () { try { var f = document.createElement('textarea'); f.value = KURZBEFEHL_URL; f.setAttribute('readonly', ''); f.style.position = 'fixed'; f.style.opacity = '0'; document.body.appendChild(f); f.select(); var ok = document.execCommand('copy'); f.remove(); fertig(ok); } catch (x) { fertig(false); } };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(KURZBEFEHL_URL).then(function () { fertig(true); }, ersatz); else ersatz();
    });
  }

  // Direktlink für den Kurzbefehl: index.html?kamera=1 (oder #kamera) öffnet nach dem Laden sofort den Teilen-Bildschirm
  function kameraDirekt() {
    if (!/[?&]kamera=1(&|$)/.test(location.search) && location.hash !== '#kamera') return;
    try { history.replaceState(null, '', location.pathname); } catch (e) { }   // beim Neuladen nicht noch einmal öffnen
    var versuche = 0;
    (function warten() {
      if (!daten) { if (++versuche < 100) setTimeout(warten, 200); return; }   // höchstens 20 s auf die Wetterdaten warten
      teilenOeffnen();
      var tipp = $('#tTipp');
      if (!tipp) { $('.teilen-bild').insertAdjacentHTML('beforeend', '<p class="teilen-tipp" id="tTipp" role="status">Tippe auf „Fotos“ und wähle das neueste Bild.</p>'); tipp = $('#tTipp'); }
      tipp.hidden = !!foto;
      var weg = function () { tipp.hidden = true; };
      $('#tFotos').addEventListener('change', weg, { once: true }); $('#tKamera').addEventListener('change', weg, { once: true }); $('#teilen').addEventListener('close', weg, { once: true });
    })();
  }
  kameraDirekt();
  /* === Paket A: App-Grundlagen (15.10.2026) === */
  // Inhalt: Fehlerarten mit automatischem neuem Versuch, „Letztes Update" und Ziehen zum Aktualisieren,
  // Erfolgshinweis nach dem Teilen, Nutzungszähler mit Wochen-Rückmeldung (Pilot), Datenschutz im Tab „Mehr".
  // Kurzname „WP Camera" steht in manifest.json und index.html, Querformat und große Schrift in app.css.

  /* --- A2: Fehlerarten trennen, letzter Stand bleibt sichtbar --- */
  var letzterFehler = null;
  var NEU_WARTEN = [30, 60, 120];   // Sekunden bis zum nächsten Versuch, wenn der Dienst überlastet ist (HTTP 429)
  var neuVersuch = { stufe: 0, timer: null, takt: null, bis: 0 };
  function fehlerArt(art, nr, ursache) {
    var e = new Error(art === 'http' ? 'HTTP ' + nr : art);
    e.art = art === 'http' && nr === 429 ? 'ueberlastet' : art; e.nr = nr || 0;
    if (ursache) e.ursache = ursache;
    return e;
  }
  function neuVersuchStopp() { clearTimeout(neuVersuch.timer); clearInterval(neuVersuch.takt); neuVersuch.timer = neuVersuch.takt = null; neuVersuch.bis = 0; }
  function countdownText() { var s = Math.max(0, Math.ceil((neuVersuch.bis - Date.now()) / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  // Wird von laden() nach jedem Versuch aufgerufen: null = geklappt, sonst der Fehler
  function ladeErgebnis(e) {
    letzterFehler = e || null;
    neuVersuchStopp();
    if (!e) { neuVersuch.stufe = 0; return; }
    if (e.art === 'ueberlastet' && neuVersuch.stufe < NEU_WARTEN.length) {
      var s = NEU_WARTEN[neuVersuch.stufe++];
      neuVersuch.bis = Date.now() + s * 1000;
      neuVersuch.timer = setTimeout(function () { neuVersuchStopp(); laden(); }, s * 1000);
      neuVersuch.takt = setInterval(function () { $$('[data-countdown]').forEach(function (el) { el.textContent = countdownText(); }); }, 1000);
    }
  }
  function neuVersuchen() { neuVersuchStopp(); laden(); }
  // Titel und ein Satz je Fehlerart (ruhig, ohne Fachwörter)
  function fehlerText() {
    var e = letzterFehler, art = navigator.onLine === false ? 'offline' : (e && e.art) || 'offline';
    if (art === 'ueberlastet') return { titel: 'Der Wetterdienst ist gerade überlastet', satz: neuVersuch.timer ? 'Neuer Versuch in <span class="zahl" data-countdown>' + countdownText() + '</span> Minuten.' : 'Versuch es in ein paar Minuten noch einmal.' };
    if (art === 'zeit') return { titel: 'Der Wetterdienst antwortet nicht', satz: 'Vielleicht ist die Verbindung gerade langsam.' };
    if (art === 'http') return { titel: 'Der Wetterdienst meldet einen Fehler (Nr. ' + e.nr + ')', satz: 'Meist ist das nach kurzer Zeit vorbei.' };
    return { titel: 'Offline', satz: 'Sobald du wieder online bist, lädt die App von selbst neu.' };
  }
  // „Stand 14:32 Uhr", bei älterem Stand mit Datum: „Stand 14.10. 14:32 Uhr"
  function standText(praefix) {
    if (!stand) return (praefix || 'Stand') + ' unbekannt';
    var d = new Date(stand), h = new Date(), uhr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    var heute = d.toDateString() === h.toDateString();
    return (praefix || 'Stand') + ' ' + (heute ? '' : d.getDate() + '.' + (d.getMonth() + 1) + '. ') + uhr + ' Uhr';
  }

  /* --- A3: „Letztes Update" oben im Tab Wetter, Knopf „Aktualisieren", Ziehen zum Aktualisieren --- */
  function updateText() { return laeuft ? 'Aktualisiere …' : standText('Letztes Update'); }
  function updateZeile() {
    return '<div class="update-zeile"><span class="update-text" id="updateText" aria-live="polite">' + updateText() + '</span>' +
      '<button type="button" class="button leise tippbar update-knopf" data-aktualisieren="1" aria-label="Wetter aktualisieren">Aktualisieren</button></div>';
  }
  function updateZeileSetzen() { var t = $('#updateText'); if (t) t.textContent = updateText(); }
  function aktualisieren() { zugLaden(true); neuVersuchen(); updateZeileSetzen(); if (!laeuft) zugLaden(false); }
  // Nach jedem Ladeversuch (Erfolg oder Fehler): Dreh-Anzeige weg, Zeile neu
  function ladeEnde() { zugLaden(false); updateZeileSetzen(); }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-aktualisieren]')) aktualisieren(); });

  // Zieh-Anzeige: schwebt unter der Kopfzeile. Nur transform und opacity bewegen sich (DESIGN.md Regel 20).
  var ZUG_SCHWELLE = 72, zug = { y0: null, dy: 0, aktiv: false };
  var zugEl = document.createElement('div');
  zugEl.className = 'zug-anzeige glas'; zugEl.setAttribute('aria-hidden', 'true');
  zugEl.innerHTML = '<span class="zug-pfeil">' + Ikon('chevdown') + '</span><span class="zug-dreh"></span><span class="zug-text">Zum Aktualisieren ziehen</span>';
  document.body.appendChild(zugEl);
  function zugZeigen(dy) {
    var weg = Math.min(dy * .5, 90), bereit = dy >= ZUG_SCHWELLE;
    zugEl.classList.add('sichtbar'); zugEl.classList.toggle('bereit', bereit);
    zugEl.style.transform = 'translate(-50%, ' + weg + 'px)'; zugEl.style.opacity = String(Math.min(1, dy / ZUG_SCHWELLE));
    $('.zug-text', zugEl).textContent = bereit ? 'Loslassen zum Aktualisieren' : 'Zum Aktualisieren ziehen';
  }
  function zugLaden(an) {
    if (an) { zugEl.classList.add('sichtbar', 'laedt'); zugEl.classList.remove('bereit'); zugEl.style.transform = 'translate(-50%, 36px)'; zugEl.style.opacity = '1'; $('.zug-text', zugEl).textContent = 'Aktualisiere …'; return; }
    if (!zugEl.classList.contains('laedt') && zug.aktiv) return;
    zugEl.classList.remove('laedt', 'sichtbar', 'bereit'); zugEl.style.transform = ''; zugEl.style.opacity = '';
  }
  function zugStart(y, ziel) {
    zug.y0 = null; zug.aktiv = false;
    if (aktiv !== 'wetter' && aktiv !== 'graphs') return;
    if (window.scrollY > 0 || $('#teilen').open || (rmDialog && rmDialog.open)) return;
    if (!ziel || !ziel.closest || !ziel.closest('.inhalt') || ziel.closest('svg, input, textarea, .leaflet-container')) return;   // Graph-Kurve behält ihr Ziehen
    zug.y0 = y; zug.dy = 0;
  }
  function zugBewegen(y) {
    if (zug.y0 == null) return false;
    zug.dy = y - zug.y0;
    if (!zug.aktiv && zug.dy > 10 && window.scrollY <= 0) zug.aktiv = true;
    if (!zug.aktiv) { if (zug.dy < -4) zug.y0 = null; return false; }   // nach oben: normal scrollen
    if (zug.dy <= 0) { zugLaden(false); zugEl.classList.remove('sichtbar'); return true; }
    zugZeigen(zug.dy); return true;
  }
  function zugEnde() {
    if (zug.y0 == null) return;
    var los = zug.aktiv && zug.dy >= ZUG_SCHWELLE;
    zug.y0 = null; zug.aktiv = false;
    if (los) aktualisieren(); else zugLaden(false);
  }
  // Pointer-Events für Finger und Stift; Touch-Ereignisse nur, um das Scrollen der Seite während des Ziehens anzuhalten
  // (sonst bricht Safari die Geste mit pointercancel ab, auch in der installierten App).
  document.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' && e.isPrimary) zugStart(e.clientY, e.target); });
  document.addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse' && e.isPrimary) zugBewegen(e.clientY); });
  document.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') zugEnde(); });
  document.addEventListener('touchstart', function (e) { if (zug.y0 == null && e.touches.length === 1) zugStart(e.touches[0].clientY, e.target); }, { passive: true });
  document.addEventListener('touchmove', function (e) { if (e.touches.length !== 1) return; if (zugBewegen(e.touches[0].clientY) && e.cancelable) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchend', zugEnde);
  document.addEventListener('touchcancel', function () { zug.y0 = null; zug.aktiv = false; zugLaden(false); });

  /* --- A4: Erfolgshinweis nach dem Teilen --- */
  var toastEl = document.createElement('div');
  toastEl.className = 'toast glas'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); toastEl.hidden = true;
  document.body.appendChild(toastEl);
  function toast(t) {
    toastEl.textContent = t; toastEl.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.hidden = true; toastEl.textContent = ''; }, 3000);
  }
  function teilenErfolg(art) {
    $('#tBlatt').hidden = true; if ($('#teilen').open) $('#teilen').close();
    toast(art === 'geteilt' ? 'Geteilt ✓' : 'Bild gesichert ✓');
  }

  /* --- A7: Nutzungszähler für den Pilot (nur auf dem Gerät, je ISO-Kalenderwoche die Tage, kein Zeitpunkt) --- */
  var zwei = function (n) { return String(n).padStart(2, '0'); };
  function isoWoche(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), wt = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - wt);
    var j0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return { jahr: t.getUTCFullYear(), kw: Math.ceil(((t - j0) / 864e5 + 1) / 7) };
  }
  var wocheSchluessel = function (w) { return w.jahr + '-W' + zwei(w.kw); };
  var tagIso = function (d) { return d.getFullYear() + '-' + zwei(d.getMonth() + 1) + '-' + zwei(d.getDate()); };
  function nutzungLesen() { var n = speicher.lesen('wpc-nutzung', {}); return n && typeof n === 'object' && !Array.isArray(n) ? n : {}; }
  function nutzungZaehlen() {
    var n = nutzungLesen(), jetzt = new Date(), k = wocheSchluessel(isoWoche(jetzt)), heute = tagIso(jetzt);
    var tage = Array.isArray(n[k]) ? n[k] : [];
    if (tage.indexOf(heute) < 0) tage.push(heute);
    n[k] = tage.sort();
    Object.keys(n).sort().slice(0, -12).forEach(function (alt) { delete n[alt]; });   // höchstens 12 Wochen aufheben
    speicher.schreiben('wpc-nutzung', n);
  }
  function dieseWoche() {
    var w = isoWoche(new Date()), tage = nutzungLesen()[wocheSchluessel(w)] || [];
    return { kw: w.kw, jahr: w.jahr, tage: tage, n: tage.length, satz: 'Diese Woche an ' + tage.length + (tage.length === 1 ? ' Tag' : ' Tagen') + ' genutzt (KW ' + w.kw + ')' };
  }
  nutzungZaehlen();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) nutzungZaehlen(); });   // App aus dem Hintergrund an einem neuen Tag

  // Gerät kurz und ohne Kennung: z. B. „iPhone · iOS 18.1 · Safari · installiert"
  function geraetKurz() {
    var ua = navigator.userAgent || '';
    var g = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Gerät';
    var ios = /(?:iPhone|iPad|CPU) OS (\d+)[_.](\d+)/.exec(ua), andr = /Android (\d+(?:\.\d+)?)/.exec(ua);
    var sys = ios ? 'iOS ' + ios[1] + '.' + ios[2] : andr ? 'Android ' + andr[1] : '';
    var br = /CriOS|Chrome\//.test(ua) && !/Edg/.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Edg/.test(ua) ? 'Edge' : /Safari\//.test(ua) ? 'Safari' : '';
    var inst = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone ? 'installiert' : 'im Browser';
    return [g, sys, br, inst].filter(Boolean).join(' · ');
  }
  // App-Version aus sw.js (dort pflegt sie der Service Worker), ohne eigenen Zähler
  var appVersion = '';
  function versionHolen() {
    if (appVersion) return Promise.resolve(appVersion);
    return fetch('sw.js').then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) { var m = /VERSION\s*=\s*['"]([^'"]+)['"]/.exec(t); appVersion = m ? m[1] : 'unbekannt'; return appVersion; }, function () { return 'unbekannt'; });
  }

  // Blatt „Rückmeldung": drei Fragen, Name freiwillig; Text wird geteilt oder kopiert, nie automatisch gesendet
  var rmDialog = null;
  var RM_FRAGEN = [['rmGut', 'Was war gut?'], ['rmFehlt', 'Was hat gefehlt?'], ['rmKaputt', 'Hat etwas nicht funktioniert?']];
  function rmBauen() {
    if (rmDialog) return rmDialog;
    rmDialog = document.createElement('dialog');
    rmDialog.className = 'rm-blatt'; rmDialog.id = 'rmBlatt'; rmDialog.setAttribute('aria-labelledby', 'rmTitel');
    rmDialog.innerHTML = '<div class="rm-kopf"><button type="button" class="rm-text tippbar" id="rmAbbrechen">Abbrechen</button><h2 id="rmTitel">Rückmeldung</h2><span class="rm-platz" aria-hidden="true"></span></div>' +
      '<div class="rm-inhalt"><p class="rm-woche" id="rmWoche"></p>' +
      RM_FRAGEN.map(function (f) { return '<label class="rm-feld" for="' + f[0] + '">' + f[1] + '</label><textarea id="' + f[0] + '" rows="3"></textarea>'; }).join('') +
      '<label class="rm-feld" for="rmName">Dein Name (freiwillig)</label><input id="rmName" type="text" autocomplete="given-name" enterkeyhint="done">' +
      '<p class="info">Nichts wird automatisch gesendet. Mit „Teilen" wählst du selbst, wohin der Text geht, zum Beispiel WhatsApp oder Mail. Mitgeschickt werden die Woche, die Zahl der Nutzungstage, das Gerät (z. B. iPhone, iOS-Version) und die App-Version.</p>' +
      '<div class="rm-knoepfe"><button type="button" class="button tippbar" id="rmTeilen">Teilen</button><button type="button" class="button leise tippbar" id="rmKopieren">Text kopieren</button></div>' +
      '<p class="rm-status" id="rmStatus" role="status" aria-live="polite"></p>' +
      '<textarea class="rm-ersatz" id="rmErsatz" readonly hidden aria-label="Text der Rückmeldung zum Kopieren"></textarea></div>';
    document.body.appendChild(rmDialog);
    $('#rmAbbrechen').addEventListener('click', function () { rmDialog.close(); });
    $('#rmTeilen').addEventListener('click', function () { rmText().then(rmTeilen); });
    $('#rmKopieren').addEventListener('click', function () { rmText().then(rmKopieren); });
    return rmDialog;
  }
  function rmText() {
    var w = dieseWoche();
    return versionHolen().then(function (v) {
      var antwort = function (id) { var t = $('#' + id).value.trim(); return t || '–'; }, name = $('#rmName').value.trim();
      return ['WetterProCamera – Rückmeldung KW ' + w.kw + '/' + w.jahr,
        'Genutzt: an ' + w.n + (w.n === 1 ? ' Tag' : ' Tagen') + (w.n ? ' (' + w.tage.map(function (t) { var p = t.split('-'); return +p[2] + '.' + +p[1] + '.'; }).join(', ') + ')' : ''),
        name ? 'Name: ' + name : '', '',
        RM_FRAGEN.map(function (f) { return f[1] + '\n' + antwort(f[0]); }).join('\n\n'), '',
        'Gerät: ' + geraetKurz(), 'App-Version: ' + v].filter(function (z, i) { return z !== '' || i > 2; }).join('\n');
    });
  }
  function rmStatus(t) { $('#rmStatus').textContent = t; }
  function rmTeilen(text) {
    if (navigator.share) {
      navigator.share({ title: 'Rückmeldung WetterProCamera', text: text }).then(function () { rmDialog.close(); toast('Geteilt ✓'); }, function (e) { if (!e || e.name !== 'AbortError') rmKopieren(text); });
      return;
    }
    rmKopieren(text);
  }
  function rmKopieren(text) {
    var ersatz = function () { var f = $('#rmErsatz'); f.value = text; f.hidden = false; f.focus(); f.select(); rmStatus('Markiere den Text und kopiere ihn, dann füge ihn in WhatsApp oder eine Mail ein.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { rmStatus('Text kopiert ✓ Füge ihn in WhatsApp oder eine Mail ein.'); }, ersatz);
    else ersatz();
  }
  function rmOeffnen() {
    var d = rmBauen(), w = dieseWoche();
    $('#rmTitel').textContent = 'Rückmeldung KW ' + w.kw;
    $('#rmWoche').textContent = w.satz + '. Drei kurze Fragen, alles freiwillig.';
    rmStatus(''); $('#rmErsatz').hidden = true;
    if (!d.open) d.showModal();
  }

  /* --- A7 und A8: Abschnitte im Tab „Mehr" (Pilot oben, Datenschutz unter den Quellen) --- */
  // renderMehr() bleibt unverändert; die Abschnitte werden danach eingesetzt (konfliktarm, siehe AUFTRAG-AGENTEN-2.md)
  function pilotHtml() {
    return '<h2 class="abschnitt-titel" id="pilotTitel">Pilot: Wochen-Rückmeldung</h2><section class="kachel pilot" aria-labelledby="pilotTitel">' +
      '<p class="pilot-satz" id="pilotSatz">' + esc(dieseWoche().satz) + '</p>' +
      '<p class="info">Die App zählt nur, an welchen Tagen du sie öffnest, und nur auf deinem Gerät. Nichts wird automatisch gesendet.</p>' +
      '<button type="button" class="button tippbar" id="btnRueckmeldung">Rückmeldung schreiben</button></section>';
  }
  function datenschutzHtml() {
    return '<h2 class="abschnitt-titel" id="datenschutzTitel">Datenschutz</h2><section class="kachel datenschutz" id="datenschutz" aria-labelledby="datenschutzTitel">' +
      '<p>Diese App speichert Orte, Einstellungen, Zähler und Fotos nur auf deinem Gerät. Wetterdaten holt sie bei Open-Meteo, Radar bei RainViewer, Satellitenbilder bei EUMETSAT, Karten bei OpenTopoMap. Diese Dienste sehen dabei deine IP-Adresse und die Koordinaten des gewählten Orts. Keine Schriften von Google, keine Zähler im Netz, keine Werbung.</p></section>';
  }
  function mehrErgaenzen() {
    var s = $('#tab-mehr'), q = $('#quellen');
    if (!$('#pilotTitel', s)) s.insertAdjacentHTML('afterbegin', pilotHtml());
    if (q && !$('#datenschutz', s)) q.insertAdjacentHTML('afterend', datenschutzHtml());
    var b = $('#btnRueckmeldung'); if (b) b.addEventListener('click', rmOeffnen);
  }
  var renderMehrOhneA = renderMehr;
  renderMehr = function () { renderMehrOhneA(); mehrErgaenzen(); };
  /* === Paket C: App-Funktionen (15.10.2026) === */
  // Gemeinsame Helfer: kurze Meldung im obersten offenen Dialog (sonst im Hinweisband oben)
  function pcMeldung(t) {
    var offen = $$('dialog[open]'), ziel = offen.length ? offen[offen.length - 1] : null;
    if (!ziel) return hinweisKurz(t);
    var m = $('.pc-meldung', ziel);
    if (!m) { m = document.createElement('div'); m.className = 'pc-meldung'; m.setAttribute('role', 'status'); m.setAttribute('aria-live', 'polite'); ziel.appendChild(m); }
    m.textContent = t; m.hidden = false; clearTimeout(pcMeldung.t); pcMeldung.t = setTimeout(function () { m.hidden = true; }, 3500);
  }
  // Rückfrage im eigenen Dialog statt confirm(): Promise mit true (ja) oder false (abbrechen)
  function pcFrage(text, ja) {
    return new Promise(function (fertig) {
      var d = document.createElement('dialog'); d.className = 'pc-frage'; d.setAttribute('aria-labelledby', 'pcFrageText');
      d.innerHTML = '<p id="pcFrageText">' + esc(text) + '</p><div class="pc-frage-knoepfe"><button type="button" class="button leise tippbar" data-a="0">Abbrechen</button><button type="button" class="button pc-gefahr tippbar" data-a="1">' + esc(ja) + '</button></div>';
      document.body.appendChild(d);
      var ende = function (w) { if (d.open) d.close(); d.remove(); fertig(w); };
      d.addEventListener('click', function (e) { var b = e.target.closest('[data-a]'); if (b) ende(b.dataset.a === '1'); });
      d.addEventListener('cancel', function (e) { e.preventDefault(); ende(false); });
      d.showModal(); $('[data-a="0"]', d).focus();
    });
  }
  var tagSchluessel = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var WT_LANG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  /* --- (1) Eigenes Logo fürs Teilen-Bild: Daten-URL in localStorage „wpc-logo", höchstens 512 px, ca. 300 KB --- */
  var LOGO_GRENZE = 300 * 1024, eigenLogo = null;
  function eigenLogoLaden() {
    var d = speicher.lesen('wpc-logo', null); eigenLogo = null;
    if (!d) return Promise.resolve();
    return ladeBild(d).then(function (i) { eigenLogo = i; }, function () { });
  }
  // Höhe wie die Textzeile des App-Namens (Schriftgröße × 1,4), Seitenverhältnis bleibt, höchstens 40 % der Bildbreite
  function eigenesLogo(ctx, W, H, k, links, schriftPx, untenPx) {
    if (!eigenLogo) return;
    var iw = eigenLogo.naturalWidth || eigenLogo.width || 1, ih = eigenLogo.naturalHeight || eigenLogo.height || 1;
    var h = (schriftPx || 26) * 1.4 * k, w = h * iw / ih;
    if (w > W * .4) { w = W * .4; h = w * ih / iw; }
    var x = links ? links : W - 40 * k - w, y = H - (untenPx == null ? 30 : untenPx) * k - h;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 6 * k; ctx.drawImage(eigenLogo, x, y, w, h); ctx.restore();
  }
  function logoBereich() {
    var d = speicher.lesen('wpc-logo', null);
    return '<div class="pc-logo" id="pcLogo"' + (T.logo === 'eigen' ? '' : ' hidden') + '>' +
      (d ? '<img class="pc-logo-bild" src="' + esc(d) + '" alt="Dein Logo">' : '<p class="blatt-hilfe">Noch kein Logo gewählt. Ohne Logo bleibt die Ecke leer.</p>') +
      '<div class="pc-logo-knoepfe"><label class="t-chip tippbar pc-datei" tabindex="0" role="button"><input type="file" id="pcLogoDatei" accept="image/png,image/jpeg,image/svg+xml,.svg" hidden>' + (d ? 'Anderes Logo wählen' : 'Logo wählen') + '</label>' +
      (d ? '<button type="button" class="t-chip tippbar" id="pcLogoWeg">Logo entfernen</button>' : '') + '</div>' +
      '<p class="blatt-hilfe">PNG, JPEG oder SVG. Die App verkleinert es auf höchstens 512 Pixel. Bleibt nur auf deinem Gerät.</p></div>';
  }
  function logoDatei(f) {
    if (!f) return;
    if (!/^image\/(png|jpeg|svg\+xml)$/.test(f.type) && !/\.(png|jpe?g|svg)$/i.test(f.name || '')) { pcMeldung('Bitte ein Bild als PNG, JPEG oder SVG wählen.'); return; }
    var r = new FileReader();
    r.onload = function () {
      ladeBild(r.result).then(function (img) {
        var w0 = img.naturalWidth || img.width || 512, h0 = img.naturalHeight || img.height || 512, url = null;
        try {
          // Erst 512 px; wird die Datei zu groß, kleiner rechnen
          [512, 384, 256].some(function (max) {
            var s = Math.min(1, max / Math.max(w0, h0)), cv = document.createElement('canvas');
            cv.width = Math.max(1, Math.round(w0 * s)); cv.height = Math.max(1, Math.round(h0 * s));
            cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
            var png = cv.toDataURL('image/png');
            if (png.length * .75 <= LOGO_GRENZE) url = png;
            else if (/jpeg/.test(f.type)) { var jpg = cv.toDataURL('image/jpeg', .85); if (jpg.length * .75 <= LOGO_GRENZE) url = jpg; }
            return !!url;
          });
        } catch (e) { pcMeldung('Dieses Bild ließ sich nicht verarbeiten. Bitte ein PNG oder JPEG wählen.'); return; }
        if (!url) { pcMeldung('Das Logo ist zu groß (über 300 KB). Bitte ein einfacheres Bild wählen.'); return; }
        try { localStorage.setItem('wpc-logo', JSON.stringify(url)); } catch (e) { pcMeldung('Der Speicher ist voll. Das Logo ließ sich nicht sichern.'); return; }
        T.logo = 'eigen'; tSpeichern();
        eigenLogoLaden().then(function () { blattBauen(); teilenZeichnen(); pcMeldung('Logo gesichert.'); var z = $('#pcLogoWeg'); if (z) z.focus(); });
      }, function () { pcMeldung('Dieses Bild ließ sich nicht öffnen.'); });
    };
    r.readAsDataURL(f);
  }

  /* --- (2) Satellit und Infrarot abspielen: 12 Bilder der letzten 2 Stunden (EUMETSAT-WMS mit time=) ---
     GetCapabilities am 15.10.2026, 12:52 UTC geprüft (je Ebene: /geoserver/mtg_fd/<ebene>/wms?request=GetCapabilities, CORS offen):
     <Dimension name="time" default="2026-10-15T12:30:00Z" units="ISO8601" nearestValue="1">2024-09-23T00:00:00.000Z/2026-10-15T12:30:00.000Z/PT10M</Dimension>
     Also ein Bereich „Anfang/Ende/Schritt" mit 10 Minuten Schritt; das neueste Bild ist etwa 20–25 Minuten alt.
     Gleich für mtg_fd:rgb_geocolour und mtg_fd:ir105_hrfi. Eine Liste mit Kommas wird ebenfalls verstanden. */
  var SAT_LAYER = { sat: ['mtg_fd:rgb_geocolour', ''], ir: ['mtg_fd:ir105_hrfi', 'mtg_fd:mtg_fd_ir105_hrfi_grayscale'] };
  var SAT_BILDER = 12;
  var satFilm = { ebene: null, frames: [], i: 0, timer: null, zeiten: {} };
  function satZeitListe(wert, n) {
    var teil = String(wert || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean), letzt = teil[teil.length - 1] || '', liste = [];
    if (letzt.indexOf('/') > 0) {
      var p = letzt.split('/'), anfang = Date.parse(p[0]), ende = Date.parse(p[1]), m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(p[2] || '');
      var schritt = m && (m[1] || m[2]) ? ((+m[1] || 0) * 60 + (+m[2] || 0)) * 60000 : 600000;
      for (var i = n - 1; i >= 0; i--) { var t = ende - i * schritt; if (!(t < anfang)) liste.push(new Date(t).toISOString()); }
    } else liste = teil.slice(-n).map(function (x) { var t = Date.parse(x); return isNaN(t) ? null : new Date(t).toISOString(); });
    return liste.filter(Boolean);
  }
  function satZeiten(k) {
    var c = satFilm.zeiten[k]; if (c && Date.now() - c.at < 5 * 60000) return Promise.resolve(c.liste);
    var name = SAT_LAYER[k][0].split(':');
    var steuer = 'AbortController' in window ? new AbortController() : null, uhr = setTimeout(function () { if (steuer) steuer.abort(); }, 15000);
    return fetch('https://view.eumetsat.int/geoserver/' + name[0] + '/' + name[1] + '/wms?service=WMS&version=1.3.0&request=GetCapabilities', steuer ? { signal: steuer.signal } : {})
      .then(function (r) { clearTimeout(uhr); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (xml) {
        var dims = new DOMParser().parseFromString(xml, 'text/xml').getElementsByTagName('Dimension'), wert = '';
        for (var i = 0; i < dims.length; i++) if (dims[i].getAttribute('name') === 'time') wert = dims[i].textContent;
        var liste = satZeitListe(wert, SAT_BILDER); if (!liste.length) throw new Error('keine Zeitangaben');
        satFilm.zeiten[k] = { at: Date.now(), liste: liste }; return liste;
      });
  }
  function playKnopf(an) { var b = $('#radarPlay'); if (!b) return; b.setAttribute('aria-pressed', String(an)); $('span', b).textContent = an ? 'Anhalten' : 'Abspielen'; }
  function satFrameZeigen() {
    var n = satFilm.frames.length, f = satFilm.frames[satFilm.i]; if (!f) return;
    satFilm.frames.forEach(function (x, j) { x.lage.setOpacity(j === satFilm.i ? .9 : 0); });
    var z = $('#radarZeit'); if (z) z.textContent = (satFilm.ebene === 'sat' ? 'Satellit' : 'Infrarot') + ' · ' + new Date(f.zeit).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr (' + (satFilm.i + 1) + ' von ' + n + ')' + (satFilm.frames.some(function (x) { return !x.geladen && !x.fehler; }) ? ' · Bilder laden …' : '');
  }
  // Nächstes fertig geladenes Bild; Bilder mit Fehlern werden übersprungen
  function satWeiter() {
    var n = satFilm.frames.length; if (!n) return;
    for (var s = 1; s <= n; s++) { var j = (satFilm.i + s) % n, f = satFilm.frames[j]; if ((f.geladen || Date.now() - f.t0 > 4000) && !f.fehler) { satFilm.i = j; break; } }
    satFrameZeigen();
  }
  function satLos() { clearInterval(satFilm.timer); satFilm.timer = setInterval(satWeiter, matchMedia('(prefers-reduced-motion: reduce)').matches ? 1500 : 700); }
  function satAbspielen() {
    var an = $('#radarPlay').getAttribute('aria-pressed') !== 'true', k = ebene, z = $('#radarZeit');
    playKnopf(an); clearInterval(satFilm.timer); satFilm.timer = null;
    if (!an) return;
    if (satFilm.ebene === k && satFilm.frames.length) return satLos();
    z.textContent = 'Lade Satellitenbilder der letzten 2 Stunden …';
    satZeiten(k).then(function (liste) {
      if (ebene !== k || !radarKarte) return;
      satAufraeumen(); satFilm.ebene = k;
      satFilm.frames = liste.map(function (iso) {
        var f = { zeit: iso, geladen: false, fehler: false, t0: Date.now() };   // t0: nach 4 s gilt das Bild auch unvollständig als zeigbar
        f.lage = L.tileLayer.wms(EUMETSAT_WMS, { layers: SAT_LAYER[k][0], styles: SAT_LAYER[k][1], format: 'image/jpeg', transparent: false, version: '1.3.0', crs: L.CRS.EPSG3857, opacity: 0, time: iso, attribution: '© EUMETSAT' });
        f.lage.on('load', function () { f.geladen = true; });
        f.lage.on('tileerror', function () { f.fehler = true; });
        f.lage.addTo(radarKarte);   // unsichtbar vorladen
        return f;
      });
      satFilm.i = satFilm.frames.length - 1;
      if (satEbenen[k]) radarKarte.removeLayer(satEbenen[k]);
      satFrameZeigen();
      if ($('#radarPlay').getAttribute('aria-pressed') === 'true') satLos();
    }).catch(function (e) {
      console.warn('Satellitenfilm', e);
      if (ebene !== k) return;
      playKnopf(false); z.textContent = 'Satellitenfilm gerade nicht erreichbar. Du siehst das neueste Bild.';
    });
  }
  function satAufraeumen() {
    clearInterval(satFilm.timer); satFilm.timer = null;
    if (radarKarte) satFilm.frames.forEach(function (f) { radarKarte.removeLayer(f.lage); });
    satFilm.frames = []; satFilm.ebene = null;
  }
  function satStopp() {
    var lief = satFilm.timer || satFilm.frames.length;
    satAufraeumen();
    if (lief) playKnopf(false);
  }
  function satHinweis() {
    var rs = $('#radarSatz'), nacht = daten && daten.current && daten.current.is_day === 0;
    if (!rs || ebene !== 'sat' || !nacht) return;
    rs.hidden = false; rs.textContent = 'Bei ' + ort.name + ' ist gerade Nacht: Das Farbbild bleibt dort dunkel. Infrarot zeigt die Wolken auch nachts.';
  }

  /* --- (3) „Meine Wetterfotos": IndexedDB „wpc-galerie", Store „fotos", höchstens 200 Fotos, nur auf dem Gerät --- */
  var GALERIE_MAX = 200, galerieDb = null, gal = { monat: null, tag: null, fotos: [], urls: [] };
  function dbOeffnen() {
    if (galerieDb) return galerieDb;
    galerieDb = new Promise(function (ok, f) {
      if (!window.indexedDB) return f(new Error('IndexedDB fehlt'));
      // Fehlt der Store (z. B. leere Datenbank aus einem Abbruch), mit höherer Version neu öffnen
      var auf = function (version) {
        var r = version ? indexedDB.open('wpc-galerie', version) : indexedDB.open('wpc-galerie');
        r.onupgradeneeded = function () { if (!r.result.objectStoreNames.contains('fotos')) r.result.createObjectStore('fotos', { keyPath: 'id', autoIncrement: true }).createIndex('tag', 'tag'); };
        r.onsuccess = function () { var db = r.result; if (db.objectStoreNames.contains('fotos')) return ok(db); var v = db.version + 1; db.close(); auf(v); };
        r.onerror = function () { f(r.error); };
      };
      auf(0);
    });
    galerieDb.catch(function () { galerieDb = null; });
    return galerieDb;
  }
  function dbAktion(modus, fn) {
    return dbOeffnen().then(function (db) {
      return new Promise(function (ok, f) {
        var tx = db.transaction('fotos', modus), q = fn(tx.objectStore('fotos')), erg;
        if (q) q.onsuccess = function () { erg = q.result; };
        tx.oncomplete = function () { ok(erg); }; tx.onerror = tx.onabort = function () { f(tx.error); };
      });
    });
  }
  var galerieAlle = function () { return dbAktion('readonly', function (s) { return s.getAll(); }); };
  var galerieZahl = function () { return dbAktion('readonly', function (s) { return s.count(); }); };
  var galerieAn = function () { return speicher.lesen('wpc-galerie-an', true) !== false; };
  function galerieSchalter() {
    return '<h3>Meine Wetterfotos</h3><label class="pc-schalter tippbar"><span>In „Meine Wetterfotos" sichern<small>Nach dem Teilen oder Sichern kommt eine Kopie in deine Galerie (Tab „Mehr"). Nur auf deinem Gerät.</small></span>' +
      '<input type="checkbox" role="switch" id="pcGalerieAn"' + (galerieAn() ? ' checked' : '') + '></label>';
  }
  // Fertiges Bild (längste Seite 1080 px, JPEG 0,8) mit Wetterwerten, Ort, Datum und Uhrzeit ablegen
  function galerieSichern() {
    if (!galerieAn() || !daten) return Promise.resolve();
    var quelle = $('#tBild'); if (!quelle || !quelle.width) return Promise.resolve();
    var klein = function (max, q) {
      return new Promise(function (ok) {
        var s = Math.min(1, max / Math.max(quelle.width, quelle.height)), cv = document.createElement('canvas');
        cv.width = Math.round(quelle.width * s); cv.height = Math.round(quelle.height * s);
        cv.getContext('2d').drawImage(quelle, 0, 0, cv.width, cv.height);
        cv.toBlob(function (b) { ok({ b: b, w: cv.width, h: cv.height }); }, 'image/jpeg', q);
      });
    };
    var c = daten.current, d = daten.daily, jetzt = new Date();
    var eintrag = {
      zeit: jetzt.getTime(), tag: tagSchluessel(jetzt), ort: ortFuerBild() || ort.name, art: wArt(c.weather_code, c.is_day), lage: wText(c.weather_code, c.is_day),
      werte: [rund(c.temperature_2m) + ' °C', wText(c.weather_code, c.is_day), 'Wind ' + windTxt(c.wind_speed_10m) + ' ' + richtung(c.wind_direction_10m), 'Regen heute ' + dez(d.precipitation_sum[0]) + ' mm', 'Sonne ' + (d.sunshine_duration[0] == null ? '–' : dez(d.sunshine_duration[0] / 3600)) + ' h']
    };
    return galerieZahl().then(function (n) {
      if (n >= GALERIE_MAX) { pcMeldung('„Meine Wetterfotos" ist voll (200 Fotos). Lösche alte Fotos, dann sichert die App wieder.'); return; }
      return Promise.all([klein(1080, .8), klein(200, .7)]).then(function (b) {
        if (!b[0].b) throw new Error('Bild leer');
        eintrag.w = b[0].w; eintrag.h = b[0].h;
        // Als ArrayBuffer ablegen: WebKit speichert Blobs in manchen Fällen nicht (privates Surfen, Testbrowser)
        return Promise.all([b[0].b.arrayBuffer(), b[1].b ? b[1].b.arrayBuffer() : null]);
      }).then(function (ab) {
        eintrag.bild = ab[0]; eintrag.mini = ab[1];
        return dbAktion('readwrite', function (s) { return s.add(eintrag); });
      }).then(function () { pcMeldung('In „Meine Wetterfotos" gesichert (' + (n + 1) + ' von ' + GALERIE_MAX + ').'); });
    }).catch(function (e) { console.warn('Galerie', e); });
  }
  function galerieZeileMehr(s) {
    var liste = $('#orteListe', s); if (!liste) return;
    var vor = liste.previousElementSibling || liste;
    var titel = document.createElement('h2'); titel.className = 'abschnitt-titel'; titel.textContent = 'Meine Wetterfotos';
    var box = document.createElement('div'); box.className = 'liste';
    box.innerHTML = '<button class="tippbar" id="pcGalMehr" aria-haspopup="dialog"><span class="pc-zeile-text">' + Ikon('image') + '<span>Meine Wetterfotos <span class="zahl leise" id="pcGalZahl"></span></span></span><span class="leise" aria-hidden="true">›</span></button>';
    s.insertBefore(titel, vor); s.insertBefore(box, vor);
    $('#pcGalMehr', s).addEventListener('click', galerieOeffnen);
    galerieZahl().then(function (n) { var z = $('#pcGalZahl'); if (z) z.textContent = '(' + n + ')'; }, function () { var z = $('#pcGalZahl'); if (z) z.textContent = '(nicht verfügbar)'; });
  }
  function urlsFrei() { gal.urls.forEach(function (u) { URL.revokeObjectURL(u); }); gal.urls = []; }
  var alsBlob = function (x) { return x instanceof Blob ? x : new Blob([x], { type: 'image/jpeg' }); };
  function objUrl(b) { var u = URL.createObjectURL(alsBlob(b)); gal.urls.push(u); return u; }
  function galerieOeffnen() {
    var d = $('#pcGalerie');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'pcGalerie'; d.className = 'pc-voll'; d.setAttribute('aria-labelledby', 'pcGalTitel');
      d.innerHTML = '<div class="pc-voll-kopf"><button type="button" class="pc-kopf-knopf tippbar" data-zu="1">Schließen</button><h2 id="pcGalTitel">Meine Wetterfotos</h2>' +
        '<button type="button" class="pc-kopf-knopf tippbar" id="pcAlleWeg">Alle löschen</button></div><div class="pc-voll-inhalt" id="pcGalInhalt"></div>';
      document.body.appendChild(d);
      d.addEventListener('close', function () { urlsFrei(); var z = $('#pcGalZahl'); if (z) z.textContent = '(' + gal.fotos.length + ')'; });
      d.addEventListener('click', galerieKlick);
    }
    gal.monat = null; gal.tag = null;
    if (!d.open) d.showModal();
    galerieZeichnen().then(function () { var f = $('[data-tag][aria-pressed="true"]', d) || $('[data-zu]', d); if (f) f.focus(); });
  }
  function galerieZeichnen() {
    return galerieAlle().then(function (fotos) {
      fotos.sort(function (a, b) { return b.zeit - a.zeit; }); gal.fotos = fotos; urlsFrei();
      var inhalt = $('#pcGalInhalt'); $('#pcAlleWeg').hidden = !fotos.length;
      if (!fotos.length) {
        inhalt.innerHTML = '<section class="kachel leer-zustand">' + Ikon('image') + '<p><b>Noch keine Wetterfotos.</b><br>Teile ein Foto mit dem Wetter, dann landet es hier, mit Ort, Datum und Werten.</p>' +
          '<button type="button" class="button tippbar" data-kamera-auf="1">Foto mit Wetter machen</button></section>';
        return;
      }
      if (!gal.monat) { var n0 = new Date(fotos[0].zeit); gal.monat = [n0.getFullYear(), n0.getMonth()]; gal.tag = fotos[0].tag; }
      var nachTag = {}; fotos.forEach(function (f) { (nachTag[f.tag] = nachTag[f.tag] || []).push(f); });
      var j = gal.monat[0], m = gal.monat[1], versatz = (new Date(j, m, 1).getDay() + 6) % 7, tage = new Date(j, m + 1, 0).getDate(), heute = tagSchluessel(new Date());
      var zellen = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(function (w) { return '<span class="pc-wt" aria-hidden="true">' + w + '</span>'; }).join('');
      for (var v = 0; v < versatz; v++) zellen += '<span aria-hidden="true"></span>';
      for (var t = 1; t <= tage; t++) {
        var key = j + '-' + String(m + 1).padStart(2, '0') + '-' + String(t).padStart(2, '0'), liste = nachTag[key], kl = key === heute ? ' heute' : '';
        zellen += liste ? '<button type="button" class="pc-kal-tag hat tippbar' + kl + '" data-tag="' + key + '" aria-pressed="' + (key === gal.tag) + '" aria-label="' + t + '. ' + MONATE[m] + ', ' + liste.length + (liste.length === 1 ? ' Foto' : ' Fotos') + '">' +
          '<img src="' + objUrl(liste[0].mini || liste[0].bild) + '" alt=""><span class="zahl">' + t + '</span></button>'
          : '<span class="pc-kal-tag zahl' + kl + '">' + t + '</span>';
      }
      var tagFotos = nachTag[gal.tag] || [], td = gal.tag ? new Date(gal.tag + 'T12:00:00') : null;
      var tagHtml = !gal.tag || gal.tag.slice(0, 7) !== j + '-' + String(m + 1).padStart(2, '0') ? '<p class="info pc-gal-hilfe">Tippe auf einen Tag mit Bild, um seine Fotos zu sehen.</p>' :
        '<h3 class="abschnitt-titel pc-tag-titel" id="pcTagTitel" tabindex="-1">' + WT_LANG[td.getDay()] + ', ' + td.getDate() + '. ' + MONATE[td.getMonth()] + '</h3>' +
        (tagFotos.length ? tagFotos.map(function (f) {
          var z = new Date(f.zeit), uhr = z.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
          return '<section class="kachel pc-foto"><img src="' + objUrl(f.bild) + '" width="' + (f.w || 1080) + '" height="' + (f.h || 1440) + '" alt="Wetterfoto vom ' + z.toLocaleDateString('de-DE') + ', ' + uhr + (f.ort ? ', ' + esc(f.ort) : '') + '">' +
            '<div class="pc-foto-text"><b>' + uhr + (f.ort ? ' · ' + esc(f.ort) : '') + '</b><p class="pc-foto-werte">' + (f.art ? sym(f.art, 'pc-foto-sym') : '') + '<span>' + (f.werte || []).map(esc).join(' · ') + '</span></p></div>' +
            '<div class="pc-foto-knoepfe"><button type="button" class="button tippbar" data-teilen="' + f.id + '">' + Ikon('share') + '<span>Teilen</span></button>' +
            '<button type="button" class="button leise tippbar" data-loeschen="' + f.id + '">Löschen</button></div></section>';
        }).join('') : '<p class="info pc-gal-hilfe">An diesem Tag gibt es keine Fotos mehr.</p>');
      inhalt.innerHTML = '<section class="kachel pc-kalender" aria-labelledby="pcMonat"><div class="pc-kal-kopf"><button type="button" class="pc-rund tippbar" data-monat="-1" aria-label="Voriger Monat">‹</button>' +
        '<h3 id="pcMonat" aria-live="polite">' + MONATE[m] + ' ' + j + '</h3><button type="button" class="pc-rund tippbar" data-monat="1" aria-label="Nächster Monat">›</button></div>' +
        '<div class="pc-kal">' + zellen + '</div></section>' + tagHtml +
        '<p class="info pc-gal-hilfe">' + fotos.length + ' von ' + GALERIE_MAX + ' Fotos · gespeichert nur auf diesem Gerät.' + (fotos.length >= GALERIE_MAX ? ' Die Galerie ist voll: Lösche Fotos, damit neue dazukommen.' : '') + '</p>';
    }).catch(function (e) {
      console.warn('Galerie', e);
      $('#pcGalInhalt').innerHTML = '<section class="kachel leer-zustand">' + Ikon('image') + '<p><b>Galerie nicht verfügbar.</b><br>Der Browser erlaubt hier keinen Speicher, zum Beispiel im privaten Modus.</p></section>';
    });
  }
  function galerieKlick(e) {
    var b = e.target.closest('button'); if (!b) return;
    var d = $('#pcGalerie');
    if (b.dataset.zu) return d.close();
    if (b.dataset.kameraAuf) { d.close(); return teilenOeffnen(); }
    if (b.dataset.monat) {
      var m = gal.monat[1] + +b.dataset.monat, j = gal.monat[0] + Math.floor(m / 12); gal.monat = [j, (m + 12) % 12];
      return galerieZeichnen().then(function () { var n = $('[data-monat="' + b.dataset.monat + '"]', d); if (n) n.focus(); });
    }
    if (b.dataset.tag) { gal.tag = b.dataset.tag; return galerieZeichnen().then(function () { var t = $('#pcTagTitel'); if (t) { t.focus({ preventScroll: true }); t.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } }); }
    var foto = function (id) { return gal.fotos.filter(function (f) { return String(f.id) === String(id); })[0]; };
    if (b.dataset.teilen) { var f = foto(b.dataset.teilen); if (f) galerieTeilen(f); return; }
    if (b.dataset.loeschen) {
      var id = +b.dataset.loeschen;
      return pcFrage('Dieses Foto löschen? Das lässt sich nicht rückgängig machen.', 'Löschen').then(function (ja) {
        if (!ja) return b.focus();
        return dbAktion('readwrite', function (s) { return s.delete(id); }).then(galerieZeichnen).then(function () { pcMeldung('Foto gelöscht.'); var z = $('#pcTagTitel') || $('[data-zu]', d); if (z) z.focus(); });
      });
    }
    if (b.id === 'pcAlleWeg') {
      return pcFrage('Alle ' + gal.fotos.length + ' Wetterfotos löschen? Das lässt sich nicht rückgängig machen.', 'Alle löschen').then(function (ja) {
        if (!ja) return b.focus();
        return dbAktion('readwrite', function (s) { return s.clear(); }).then(function () { gal.monat = null; gal.tag = null; return galerieZeichnen(); }).then(function () { pcMeldung('Alle Fotos gelöscht.'); $('[data-zu]', d).focus(); });
      });
    }
  }
  function galerieTeilen(f) {
    var datei = new File([alsBlob(f.bild)], 'wetterfoto-' + f.tag + '.jpg', { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [datei] })) { navigator.share({ files: [datei], title: 'Wetterfoto' + (f.ort ? ' aus ' + f.ort : '') }).catch(function () { }); return; }
    var a = document.createElement('a'); a.href = URL.createObjectURL(datei); a.download = datei.name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    pcMeldung('Bild gesichert.');
  }

  /* --- (4) Meteogramm im Tab „Graphs" (Baustein meteogramm.js/.css unverändert aus WetterPro Tool/gemeinsam) ---
     Wahl „Kurve | Meteogramm" in wpc-graphs, Zeilen in wpc-meteo (Reihenfolge = Reihenfolge im Meteogramm). */
  var METEO_STANDARD = ['sonne', 'temp', 'wind', 'regen'];
  var mg = { instanz: null, schluessel: '' };
  var graphsModus = function () { return speicher.lesen('wpc-graphs', 'kurve') === 'meteo' ? 'meteo' : 'kurve'; };
  var meteoKatalog = function () { return (window.Meteogramm && window.Meteogramm.zeilen) || {}; };
  function meteoZeilen() {
    var k = meteoKatalog(), z = speicher.lesen('wpc-meteo', METEO_STANDARD);
    z = Array.isArray(z) ? z.filter(function (id) { return k[id]; }) : [];
    return z.length ? z : METEO_STANDARD.filter(function (id) { return k[id]; });
  }
  function graphsKopf() {
    var m = graphsModus();
    return '<div class="pc-graphs-kopf">' + seg('graphs', m, [['kurve', 'Kurve'], ['meteo', 'Meteogramm']], 'Darstellung') +
      (m === 'meteo' ? '<button type="button" class="button leise tippbar pc-zeilen-knopf" id="pcZeilenAuf" aria-haspopup="dialog">' + Ikon('sliders') + '<span>Zeilen</span></button>' : '') + '</div>';
  }
  function mgAbbauen() {
    if (mg.instanz) { try { mg.instanz.abbauen(); } catch (e) { console.warn('Meteogramm', e); } }
    mg.instanz = null; mg.schluessel = ''; document.documentElement.classList.remove('pc-mg-voll');
  }
  function renderMeteo() {
    var seite = $('#tab-graphs');
    if (!window.Meteogramm) { mgAbbauen(); seite.innerHTML = graphsKopf() + '<section class="kachel leer-zustand">' + Ikon('chart') + '<p><b>Meteogramm fehlt.</b><br>Der Baustein ließ sich nicht laden. Lade die App neu.</p></section>'; return; }
    var zeilen = meteoZeilen(), schl = [ort.lat, ort.lon, modell, zeilen.join(',')].join('|');
    if (mg.instanz && mg.schluessel === schl && $('#pcMg', seite)) return;   // gleicher Ort, gleiches Modell, gleiche Zeilen: stehen lassen
    mgAbbauen();
    seite.innerHTML = graphsKopf() + '<div class="pc-mg" id="pcMg"></div>';
    var ziel = $('#pcMg', seite), m = modellInfo();
    ziel.style.setProperty('--mg-haft-oben', $('#titelzeile').offsetHeight + 'px');
    // Die Zeilenwahl gehört der App (wpc-meteo): gemerkte Wahl des Bausteins löschen, damit cfg.zeilen gilt
    try { localStorage.removeItem('wpc-mg-zeilen'); localStorage.removeItem('wpc-mg-reihenfolge'); } catch (e) { }
    mg.instanz = Meteogramm.einbauen({
      ziel: ziel, orte: [{ id: 'app', name: ort.name, lat: ort.lat, lon: ort.lon }],
      modelle: [{ id: modell, name: m[1], lang: m[1], hinweis: m[2] }],
      karte: false, zeilen: zeilen, zeilenStandard: zeilen, werteKlug: false,
      merkschluessel: 'wpc-mg', zeitzone: (daten && daten.timezone) || 'auto',
      vollbild: function (an) { document.documentElement.classList.toggle('pc-mg-voll', !!an); }
    });
    mg.schluessel = schl;
  }
  // Blatt „Zeilen": Haken für alle Zeilen aus dem Katalog, ↑ ↓ zum Sortieren
  function zeilenListe() {
    var k = meteoKatalog(), an = meteoZeilen(), reihe = an.concat(Object.keys(k).filter(function (id) { return an.indexOf(id) < 0; }));
    var MEER = { welle: 1, tide: 1, wasser: 1 };
    return reihe.map(function (id) {
      var i = an.indexOf(id), titel = k[id].titel;
      return '<li><label class="tippbar"><input type="checkbox" data-zeile="' + id + '"' + (i >= 0 ? ' checked' : '') + '><span>' + esc(titel) + (MEER[id] ? '<small>nur an der Küste</small>' : '') + '</span></label>' +
        '<button type="button" class="pfeil tippbar" data-z-hoch="' + id + '"' + (i <= 0 ? ' disabled' : '') + ' aria-label="' + esc(titel) + ' nach oben">↑</button>' +
        '<button type="button" class="pfeil tippbar" data-z-runter="' + id + '"' + (i < 0 || i === an.length - 1 ? ' disabled' : '') + ' aria-label="' + esc(titel) + ' nach unten">↓</button></li>';
    }).join('');
  }
  function zeilenBlattAuf() {
    var d = $('#pcZeilen');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'pcZeilen'; d.className = 'pc-blatt'; d.setAttribute('aria-labelledby', 'pcZeilenTitel');
      d.innerHTML = '<div class="pc-blatt-kopf"><h2 id="pcZeilenTitel">Zeilen im Meteogramm</h2><button type="button" class="pc-kopf-knopf tippbar" data-zu="1">Fertig</button></div>' +
        '<div class="pc-blatt-inhalt"><p class="info">Hake an, was das Meteogramm zeigt. Mit ↑ und ↓ legst du die Reihenfolge fest.</p><ul class="pc-liste" id="pcZeilenListe"></ul></div>';
      document.body.appendChild(d);
      d.addEventListener('click', function (e) {
        if (e.target.closest('[data-zu]')) return d.close();
        var h = e.target.closest('[data-z-hoch],[data-z-runter]'); if (!h) return;
        var id = h.dataset.zHoch || h.dataset.zRunter, an = meteoZeilen(), i = an.indexOf(id), j = i + (h.dataset.zHoch ? -1 : 1);
        if (i < 0 || j < 0 || j >= an.length) return;
        an[i] = an[j]; an[j] = id; speicher.schreiben('wpc-meteo', an); $('#pcZeilenListe').innerHTML = zeilenListe();
        var f = $('[data-z-' + (h.dataset.zHoch ? 'hoch' : 'runter') + '="' + id + '"]', d); if (!f || f.disabled) f = $('[data-zeile="' + id + '"]', d); if (f) f.focus();
      });
      d.addEventListener('change', function (e) {
        var id = e.target.dataset.zeile; if (!id) return;
        var an = meteoZeilen().filter(function (x) { return x !== id; });
        if (e.target.checked) an.push(id);
        if (!an.length) { e.target.checked = true; pcMeldung('Mindestens eine Zeile bleibt an.'); return; }
        speicher.schreiben('wpc-meteo', an); $('#pcZeilenListe').innerHTML = zeilenListe(); var f = $('[data-zeile="' + id + '"]', d); if (f) f.focus();
      });
      d.addEventListener('close', function () { if (aktiv === 'graphs' && daten) renderGraphs(); var k = $('#pcZeilenAuf'); if (k) k.focus(); });
    }
    $('#pcZeilenListe').innerHTML = zeilenListe();
    d.showModal(); $('[data-zu]', d).focus();
  }

  function paketCStart() {
    eigenLogoLaden().then(function () { if ($('#teilen').open) teilenZeichnen(); });
    var blatt = $('#tBlattInhalt');
    blatt.addEventListener('click', function (e) {
      if (e.target.closest('[data-seg="logo"] [data-v]')) { var l = $('#pcLogo'); if (l) l.hidden = T.logo !== 'eigen'; }
      if (e.target.closest('#pcLogoWeg')) {
        try { localStorage.removeItem('wpc-logo'); } catch (x) { }
        eigenLogo = null; if (T.logo === 'eigen') { T.logo = 'appname'; tSpeichern(); }
        blattBauen(); teilenZeichnen(); pcMeldung('Logo entfernt. Jetzt steht wieder der App-Name auf dem Bild.');
        var z = $('[data-seg="logo"] [aria-checked="true"]'); if (z) z.focus();
      }
    });
    blatt.addEventListener('keydown', function (e) { var l = e.target.closest && e.target.closest('.pc-datei'); if (l && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); $('#pcLogoDatei').click(); } });
    blatt.addEventListener('change', function (e) {
      if (e.target.id === 'pcLogoDatei') { logoDatei(e.target.files && e.target.files[0]); e.target.value = ''; }
      if (e.target.id === 'pcGalerieAn') speicher.schreiben('wpc-galerie-an', e.target.checked);
    });
    var g = $('#tGalerie'); if (g) g.addEventListener('click', galerieOeffnen);
    $('#tab-graphs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-seg="graphs"] [data-v]');
      if (b) {
        if (b.getAttribute('aria-checked') === 'true') return;
        speicher.schreiben('wpc-graphs', b.dataset.v); if (b.dataset.v === 'kurve') mgAbbauen();
        if (daten) renderGraphs();
        var n = $('[data-seg="graphs"] [data-v="' + b.dataset.v + '"]'); if (n) n.focus();
        return;
      }
      if (e.target.closest('#pcZeilenAuf')) zeilenBlattAuf();
    });
  }

  /* === Paket A6: Mac-Layout (15.10.2026) === */
  // Ab 1024 px Breite mit Maus oder Trackpad (hover: hover): Seitenleiste links statt Tab-Leiste unten,
  // Wetter und Mehr zweispaltig, dichte Schriftstufen (CSS-Block „Mac" am Ende von app.css),
  // Tastaturkürzel ⌘1–⌘5, ⌘K, ⌘R, Esc. Auf iPhone und iPad bleibt alles, wie es war.
  var MAC_MQ = '(min-width: 1024px) and (hover: hover)';
  function macAn() { return !!(window.matchMedia && matchMedia(MAC_MQ).matches); }
  // Graphs auf dem Mac höher (renderGraphs fragt hier nach der größten Höhe)
  function grafHoeheMax() { return macAn() ? Math.max(300, Math.min(520, window.innerHeight - 300)) : 300; }

  /* --- Seitenleiste: App-Name, Bereiche, Orte mit Favoriten, Teilen, Kürzel --- */
  var KUERZEL_TASTE = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Strg+';
  var macLeiste = document.createElement('aside');
  macLeiste.className = 'mac-leiste'; macLeiste.id = 'macLeiste'; macLeiste.setAttribute('aria-label', 'Seitenleiste');
  macLeiste.innerHTML = '<div class="ml-name">WetterProCamera</div>' +
    '<nav aria-labelledby="mlBereicheTitel"><h2 class="ml-titel" id="mlBereicheTitel">Bereiche</h2><div class="ml-liste" id="mlBereiche">' +
    TABS.map(function (t, i) {
      var kamera = t[0] === 'kamera';
      return '<button type="button" class="ml-knopf tippbar" data-ml-tab="' + t[0] + '"' + (kamera ? ' aria-haspopup="dialog" aria-label="Kamera: Wetter mit Foto teilen (' + KUERZEL_TASTE + (i + 1) + ')"' : ' aria-label="' + t[1] + ' (' + KUERZEL_TASTE + (i + 1) + ')"') + '>' +
        Ikon(t[2]) + '<span class="ml-text">' + t[1] + '</span><kbd class="ml-kbd" aria-hidden="true">' + KUERZEL_TASTE + (i + 1) + '</kbd></button>';
    }).join('') + '</div></nav>' +
    '<section aria-labelledby="mlOrteTitel"><h2 class="ml-titel" id="mlOrteTitel">Orte · Stern = Favorit</h2><div class="ml-liste" id="mlOrte"></div>' +
    '<button type="button" class="ml-knopf ml-leise tippbar" id="mlSuche" aria-label="Ort suchen (' + KUERZEL_TASTE + 'K)">' + Ikon('search') + '<span class="ml-text">Ort suchen</span><kbd class="ml-kbd" aria-hidden="true">' + KUERZEL_TASTE + 'K</kbd></button></section>' +
    '<div class="ml-fuss"><button type="button" class="button ml-teilen tippbar" id="mlTeilen">' + Ikon('share') + '<span>Wetter teilen</span></button>' +
    '<p class="ml-kuerzel" id="mlKuerzel"><b>Kürzel</b><br>' + KUERZEL_TASTE + '1–' + KUERZEL_TASTE + '5 Bereiche · ' + KUERZEL_TASTE + 'K Ort suchen · ' + KUERZEL_TASTE + 'R Aktualisieren · Esc schließt Fenster</p></div>';
  document.body.insertBefore(macLeiste, document.body.firstChild);
  var mlOrteSchluessel = '';
  function macOrte() {
    var liste = meineOrte(), schluessel = liste.map(ortKey).join(';') + '#' + ortKey(ort) + '#' + favoriten.length;
    if (schluessel === mlOrteSchluessel) return;
    var fokus = document.activeElement && document.activeElement.closest && document.activeElement.closest('#mlOrte [data-ml-ort]');
    var fokusName = fokus ? fokus.dataset.name : '';
    mlOrteSchluessel = schluessel;
    $('#mlOrte').innerHTML = liste.map(function (o, i) {
      var fav = istFavorit(o), hier = ortKey(o) === ortKey(ort);
      return '<button type="button" class="ml-knopf tippbar" data-ml-ort="' + i + '" data-name="' + esc(o.name) + '"' + (hier ? ' aria-current="true"' : '') + ' aria-label="' + esc(o.name) + (fav ? ', Favorit' : '') + (hier ? ', gerade gewählt' : '') + '">' +
        (fav ? sternSvg().replace('class="ikon"', 'class="ikon ml-stern"') : Ikon('pin')) + '<span class="ml-text">' + esc(o.name) + '</span></button>';
    }).join('');
    if (fokusName) { var neu = $$('#mlOrte [data-ml-ort]').filter(function (b) { return b.dataset.name === fokusName; })[0]; if (neu) neu.focus(); }
  }
  function macBereiche() {
    $$('#mlBereiche [data-ml-tab]').forEach(function (b) { if (b.dataset.mlTab === 'kamera') return; if (b.dataset.mlTab === aktiv) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  }
  function macLeisteAktualisieren() { macBereiche(); macOrte(); }
  macLeiste.addEventListener('click', function (e) {
    var t = e.target.closest('[data-ml-tab]'), o = e.target.closest('[data-ml-ort]');
    if (t) { if (t.dataset.mlTab === 'kamera') teilenOeffnen(); else zeigeTab(t.dataset.mlTab); return; }
    if (o) { ortSetzen(meineOrte()[+o.dataset.mlOrt]); return; }
    if (e.target.closest('#mlSuche')) return ortSucheOeffnen();
    if (e.target.closest('#mlTeilen')) teilenOeffnen();
  });
  // Tab-Wechsel und Ortswechsel halten die Seitenleiste aktuell (ortSetzen ruft zeigeTab)
  zeigeTab = (function (alt) { return function (id) { alt(id); macLeisteAktualisieren(); }; })(zeigeTab);

  /* --- Zweispaltiger Inhalt: Wetter (links Aktuell und Stunden, rechts alles andere in DOM-Reihenfolge) und Mehr --- */
  // Die Kacheln werden nur auf dem Mac in zwei Spalten-Hüllen verschoben; schmaler als 1024 px wird das wieder aufgelöst.
  var ordnetGerade = false;
  function spalteNeu(klasse) { var d = document.createElement('div'); d.className = 'mac-spalte ' + klasse; return d; }
  function wetterOrdnen() {
    var s = $('#tab-wetter'), links = $(':scope > .mac-links', s), rechts = $(':scope > .mac-rechts', s);
    if (!macAn() || !$('.akt', s)) {   // kein Mac oder noch keine Daten (Skeleton, Fehler): Hüllen auflösen
      [links, rechts].forEach(function (h) { if (!h) return; while (h.firstChild) s.insertBefore(h.firstChild, h); h.remove(); });
      s.classList.remove('mac-zwei'); return;
    }
    if (!links) { links = spalteNeu('mac-links'); rechts = spalteNeu('mac-rechts'); s.appendChild(links); s.appendChild(rechts); }
    var karte = false;
    Array.prototype.slice.call(s.children).forEach(function (k) {
      if (k === links || k === rechts || k.classList.contains('update-zeile')) return;
      if (k.querySelector('.leaflet-container')) karte = true;
      (k.classList.contains('akt') || k.classList.contains('std') ? links : rechts).appendChild(k);
    });
    // Reihenfolge links: Aktuell vor Stunden; Update-Zeile bleibt oben über beiden Spalten
    var akt = $(':scope > .akt', links); if (akt && akt !== links.firstChild) links.insertBefore(akt, links.firstChild);
    var upd = $(':scope > .update-zeile', s); if (upd && upd !== s.firstChild) s.insertBefore(upd, s.firstChild);
    s.appendChild(links); s.appendChild(rechts);
    s.classList.add('mac-zwei');
    if (karte) setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 0);   // Mini-Radar misst sich neu
  }
  function mehrOrdnen() {
    var s = $('#tab-mehr'), gruppen = $$(':scope > .mac-gruppe', s);
    // erst auflösen (Pakete ergänzen „Mehr" nachträglich), dann neu gruppieren: je Überschrift eine Gruppe
    gruppen.forEach(function (g) { while (g.firstChild) s.insertBefore(g.firstChild, g); g.remove(); });
    s.classList.remove('mac-gruppiert');
    if (!macAn() || !s.children.length) return;
    var g = null;
    Array.prototype.slice.call(s.children).forEach(function (k) {
      if (!g || (k.matches('h2.abschnitt-titel'))) { g = document.createElement('div'); g.className = 'mac-gruppe'; s.insertBefore(g, k); }
      g.appendChild(k);
    });
    s.classList.add('mac-gruppiert');
  }
  function macOrdnen() {
    if (ordnetGerade) return;
    ordnetGerade = true;
    var fokus = document.activeElement;
    try { wetterOrdnen(); mehrOrdnen(); macLeisteAktualisieren(); } finally {
      if (fokus && fokus !== document.activeElement && document.contains(fokus) && fokus.focus) fokus.focus({ preventScroll: true });   // Verschieben nimmt den Fokus weg
      beobachter.takeRecords(); ordnetGerade = false;
    }
  }
  // Beobachtet Wetter und Mehr: neue Kacheln anderer Pakete (z. B. Paket A5) landen so automatisch in der rechten Spalte
  var beobachter = new MutationObserver(function () { macOrdnen(); });
  ['#tab-wetter', '#tab-mehr'].forEach(function (sel) { beobachter.observe($(sel), { childList: true }); });
  if (window.matchMedia) { var macMq = matchMedia(MAC_MQ); var wechsel = function () { macOrdnen(); }; if (macMq.addEventListener) macMq.addEventListener('change', wechsel); else if (macMq.addListener) macMq.addListener(wechsel); }

  /* --- Tastaturkürzel: ⌘1–⌘5 Bereiche, ⌘K Ortssuche, ⌘R Aktualisieren, Esc schließt --- */
  function ortSucheOeffnen() {
    zeigeTab('mehr');
    setTimeout(function () { var f = $('#sucheFeld'); if (f) { f.focus(); f.select(); } }, 50);
  }
  function dialogOffen() { return $$('dialog').some(function (d) { return d.open; }); }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') return;   // Fenster (<dialog>) schließt der Browser selbst mit Esc, siehe „cancel" unten
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
    var k = (e.key || '').toLowerCase();
    if (/^[1-5]$/.test(k)) {
      if (dialogOffen()) return;
      e.preventDefault();
      var t = TABS[+k - 1][0];
      if (t === 'kamera') teilenOeffnen(); else { zeigeTab(t); var b = $('#macLeiste [data-ml-tab="' + t + '"]'); if (b && macAn()) b.focus({ preventScroll: true }); }
    } else if (k === 'k') {
      if (dialogOffen()) return;
      e.preventDefault(); ortSucheOeffnen();
    } else if (k === 'r') {
      if (dialogOffen()) return;
      e.preventDefault(); aktualisieren();   // statt die Seite neu zu laden: nur das Wetter neu holen
    }
  });
  // Esc im Teilen-Fenster: ein offenes Blatt „Infos" schließt zuerst, nicht gleich das ganze Fenster
  $('#teilen').addEventListener('cancel', function (e) { if (!$('#tBlatt').hidden) { e.preventDefault(); blattZu(); } });

  /* ---------- Start ---------- */
  $('#btnMenue').innerHTML = Ikon('pin'); $('#btnTeilen').innerHTML = Ikon('share'); $('#btnSuche').innerHTML = Ikon('search');
  $('#tTeilen').innerHTML = Ikon('share'); $('#tFotosIkon').innerHTML = Ikon('image'); $('#tKameraIkon').innerHTML = Ikon('camera');
  // Orte-Symbol (Pin) statt Menü-Symbol, führt direkt zu „Meine Orte" (UX-Prüfung A10)
  $('#btnMenue').addEventListener('click', function () { zeigeTab('mehr'); var l = $('#orteListe'); if (l) { var t = l.previousElementSibling || l; window.scrollTo(0, Math.max(0, t.getBoundingClientRect().top + window.scrollY - $('#titelzeile').offsetHeight - 16)); var e = $('#orteListe [aria-current="true"]') || $('#orteListe button'); if (e) e.focus({ preventScroll: true }); } });
  $('#btnSuche').addEventListener('click', function () { zeigeTab('mehr'); setTimeout(function () { var f = $('#sucheFeld'); if (f) f.focus(); }, 50); });
  $('#btnTeilen').addEventListener('click', teilenOeffnen);
  baueTabs(); bindTeilen(); kopfModell(); paketCStart();
  var start = 'wetter'; try { start = sessionStorage.getItem('wpgt-tab') || 'wetter'; } catch (e) { }
  zeigeTab(SEITEN.some(function (t) { return t[0] === start; }) ? start : 'wetter');
  laden();
  window.addEventListener('online', laden);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && stand && Date.now() - stand > 15 * 60 * 1000) laden(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { });
})();

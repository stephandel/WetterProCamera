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
      '&hourly=temperature_2m,precipitation,precipitation_probability,weather_code,is_day,cloud_cover,wind_speed_10m,wind_direction_10m,uv_index' +
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

  // Hilfetexte: bei Maus oder Trackpad „Klicke“, sonst „Tippe“
  function tippe() { return window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches ? 'Klicke' : 'Tippe'; }
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
  // Satz zu den 8 Balken (8 × 15 Minuten = 2 Stunden), Welle 3: „Regen ab 14:30 Uhr für 45 Minuten"
  function regenSatz(q) {
    var t = q.time, p = q.precipitation.slice(0, 8), schwelle = 0.1;
    var erster = p.findIndex(function (x) { return x >= schwelle; });
    if (erster < 0) return 'Die nächsten 2 Stunden bleibt es trocken.';
    var ende = erster; while (ende < p.length && p[ende] >= schwelle) ende++;
    var bis = ende >= p.length, min = (ende - erster) * 15;
    if (erster === 0) return bis ? 'Es regnet die nächsten 2 Stunden.' : 'Es regnet jetzt, noch etwa ' + w3Dauer(min) + '.';
    return 'Regen ab ' + hm(t[erster]) + ' Uhr für ' + (bis ? 'mindestens ' : '') + w3Dauer(min) + '.';
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
  // Webcam-Auswahl und Bildadresse: Gruppe 3 (Welle 3) setzt sie, sobald WEBCAMS_FREIGABE an ist; bis dahin unbenutzt
  var webcamWahl = function () { return WEBCAMS[0]; }, webcamBildUrl = function (w) { return w.live; };
  var miniKarte = null;
  function rechtsMedien(ansicht) {
    var inhalt;
    if (ansicht === 'radar') inhalt = '<div class="mini-karte" id="miniKarte" aria-label="Regenradar um ' + esc(ort.name) + '"></div><span class="mk-zeit zahl" id="mkZeit"></span><span class="mk-label">Radar</span>';
    else if (WEBCAMS.length) { var w = webcamWahl(); inhalt = '<img class="mk-bild" referrerpolicy="no-referrer" src="' + esc(webcamBildUrl(w)) + '" alt="Webcam ' + esc(w.name) + '"><span class="mk-zeit">LIVE</span><a class="mk-label" href="' + esc(w.seite) + '" target="_blank" rel="noopener">' + esc(w.quelle) + ' ↗</a>'; }
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
      L.circleMarker([ort.lat, ort.lon], { radius: 7, color: '#fff', weight: 2, fillColor: (getComputedStyle(document.documentElement).getPropertyValue('--akzent') || '').trim() || '#FFD633', fillOpacity: 1 }).addTo(miniKarte);
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
    if (ansichten().length > 1 && !speicher.lesen('wpc-tipp-akt', false)) { speicher.schreiben('wpc-tipp-akt', true); hinweisKurz('Tipp: ' + tippe() + ' links auf „Aktuell“, dann zeigt die rechte Hälfte ' + ansichten().map(function (x) { return ANSICHT_NAMEN[x]; }).join(' oder ') + '.'); }
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
      '<p class="graph-wert zahl" id="gWert" aria-live="polite">' + tippe() + ' auf die Kurve, um einen Wert zu sehen.</p>' +
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
  var EBENEN = [['radar', 'Radar'], ['sat', 'Satellit'], ['ir', 'Infrarot'], ['karte', 'Karte'], ['wind', 'Wind'], ['wolken', 'Wolken'], ['druck', 'Isobaren']];
  var A26_NAMEN = { wind: 'Wind', wolken: 'Wolken', druck: 'Isobaren' };   // Gitter-Ebenen aus Open-Meteo (A26), ohne Film
  function ohneFilm() { return ebene === 'karte' || !!A26_NAMEN[ebene]; }
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
    sat: ['Satellitenbild in Farbe (Meteosat). „Abspielen“ zeigt die letzten 2 Stunden. Nachts dunkel.', 'EUMETSAT', 'https://view.eumetsat.int'],
    ir: ['Infrarot-Satellitenbild (Meteosat): weiß sind hohe, kalte Wolken, auch nachts. „Abspielen“ zeigt die letzten 2 Stunden.', 'EUMETSAT', 'https://view.eumetsat.int'],
    karte: ['Aktuelle Temperaturen an deinen Orten.', 'Open-Meteo', 'https://open-meteo.com'],
    wind: ['Aktueller Wind in 10 m Höhe. Der Pfeil zeigt, wohin der Wind weht, die Zahl ist die Geschwindigkeit in der gewählten Einheit (aktuell: ' + EINHEITEN[windEinheit] + '). Regen zeigt das Radar.', 'Open-Meteo', 'https://open-meteo.com'],
    wolken: ['Aktuelle Bewölkung: je weißer die Fläche, desto dichter die Wolken. Das Satellitenbild zeigt die echten Wolken.', 'Open-Meteo', 'https://open-meteo.com'],
    druck: ['Linien gleichen Luftdrucks auf Meereshöhe, meist alle 4 hPa, bei geringen Unterschieden alle 2 hPa. Enge Linien bedeuten starken Wind.', 'Open-Meteo', 'https://open-meteo.com']
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
      s.innerHTML = '<div class="pc-blatt-kopf rs-vb-kopf" hidden><h2>Rad/Sat</h2><button type="button" class="pc-kopf-knopf tippbar" id="radsatFertig">Fertig</button></div>' +
        '<div class="chips ebenen" id="ebenenWahl" role="radiogroup" aria-label="Ebene der Karte">' +
        EBENEN.map(function (e) { return '<button class="chip tippbar" role="radio" data-ebene="' + e[0] + '">' + e[1] + '</button>'; }).join('') + '</div>' +
        '<div class="karte" id="radarKarte" role="region" aria-label="Karte"></div>' +
        '<div class="karte-fuss"><button class="button tippbar" id="radarPlay" aria-pressed="false">' + Ikon('chevron') + '<span>Abspielen</span></button><span id="radarZeit" class="zahl" aria-live="polite"></span>' +
        '<button type="button" class="button leise tippbar rs-voll" id="radsatVoll" aria-pressed="false">Vollbild</button></div>' +
        '<p class="regen-satz radar-satz" id="radarSatz" hidden></p>' +
        '<div id="ebeneQuelle"></div>';
      s.dataset.gebaut = '1';
      $('#radarPlay').addEventListener('click', radarAbspielen);
      $('#radsatVoll').addEventListener('click', function () { radsatVollbild(!rsVoll.an); });
      $('#radsatFertig').addEventListener('click', function () { radsatVollbild(false); });
      $('#ebenenWahl').addEventListener('click', function (e) { var b = e.target.closest('[data-ebene]'); if (!b) return; ebene = b.dataset.ebene; speicher.schreiben('wpc-ebene', ebene); ebeneZeigen(); });
    }
    leafletBereit(function () {
      if (!radarKarte) { radarKarte = grundKarte($('#radarKarte'), 7); radarKarte.on('moveend', a26Bewegt); }
      radarKarte.invalidateSize(); radarKarte.setView([ort.lat, ort.lon], radarKarte.getZoom());
      ebeneZeigen();
    });
  }
  /* A32 (21.10.2026): Vollbild-Blatt für Rad/Sat. Die Karte ist kein Baustein (nicht wpkarte.js), deshalb macht die App es selbst,
     nach dem Muster von meteogramm.js: der ganze Reiter (Ebenen, Karte, Abspielen) liegt über dem Bildschirm, „Fertig“, Esc und
     Zurück schließen, der Rest der Seite ist inert, ein Verlaufseintrag fängt die Zurück-Geste. Leaflet rechnet danach die neue Größe nach. */
  var rsVoll = { an: false, gesperrt: [], overflow: '', gepusht: false };
  function radsatVollbild(an, ausVerlauf) {
    var s = $('#tab-radsat'), k = $('#radsatVoll'); an = !!an;
    if (!s || !k || an === rsVoll.an) return;
    rsVoll.an = an;
    s.classList.toggle('rs-vollbild', an); $('.rs-vb-kopf', s).hidden = !an;
    k.setAttribute('aria-pressed', String(an)); k.textContent = an ? 'Vollbild beenden' : 'Vollbild';
    if (an) {
      s.setAttribute('role', 'dialog'); s.setAttribute('aria-modal', 'true'); s.setAttribute('aria-label', 'Rad/Sat im Vollbild');
      rsVoll.gesperrt = [];
      for (var e = s; e && e !== document.body && e.parentNode; e = e.parentNode) {
        Array.prototype.forEach.call(e.parentNode.children, function (g) { if (g === e || g.hasAttribute('inert') || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(g.tagName)) return; g.setAttribute('inert', ''); rsVoll.gesperrt.push(g); });
      }
      rsVoll.overflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
      try { if (history.state && history.state.wpVollbild === 'radsat') rsVoll.gepusht = true; else { history.pushState({ wpVollbild: 'radsat' }, ''); rsVoll.gepusht = true; } } catch (e2) { }
      $('#radsatFertig').focus({ preventScroll: true });
    } else {
      s.removeAttribute('role'); s.removeAttribute('aria-modal'); s.removeAttribute('aria-label');
      rsVoll.gesperrt.forEach(function (g) { g.removeAttribute('inert'); }); rsVoll.gesperrt = [];
      document.documentElement.style.overflow = rsVoll.overflow || '';
      if (rsVoll.gepusht) { rsVoll.gepusht = false; if (!ausVerlauf && history.state && history.state.wpVollbild === 'radsat') { try { history.back(); } catch (e3) { } } }
      k.focus({ preventScroll: true });
    }
    var neu = function () { if (radarKarte) { radarKarte.invalidateSize({ animate: false }); a26Bewegt(); } };
    neu(); setTimeout(neu, 280);
    if (!an) radsatVollbildZu();
  }
  var radsatVollbildZu = function () { };   // Paket A32 P3 hängt hier den Rückweg zum vorherigen Reiter an
  document.addEventListener('keydown', function (e) { if (rsVoll.an && e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); radsatVollbild(false); } });
  window.addEventListener('popstate', function () { if (rsVoll.an && rsVoll.gepusht) { rsVoll.gepusht = false; radsatVollbild(false, true); } });
  try { if (history.state && history.state.wpVollbild === 'radsat') history.replaceState(null, ''); } catch (e) { }   // neu geladen im offenen Blatt

  function ebeneZeigen() {
    satStopp();   // Paket C: Satellitenfilm beenden
    $$('#ebenenWahl [data-ebene]').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.ebene === ebene)); });
    var eq = EBENEN_QUELLE[ebene];
    $('#ebeneQuelle').innerHTML = '<p class="info">' + eq[0] + '</p><div class="liste quellen-liste"><a class="tippbar" href="' + eq[2] + '" target="_blank" rel="noopener"><span>Quelle: ' + eq[1] + '</span><span aria-hidden="true">↗</span></a></div>';
    $('#radarPlay').hidden = ohneFilm();   // Paket C: auch Satellit und Infrarot spielen ab
    var rs = $('#radarSatz'); rs.hidden = ebene !== 'radar' || regenInSicht();
    rs.textContent = 'Kein Regen in Sicht um ' + ort.name + '. Deshalb zeigt das Radar dort gerade keine Flecken.';
    if (!radarKarte) return;
    // Radar
    if (ebene !== 'radar') { if (radar.ebene) { radarKarte.removeLayer(radar.ebene); radar.ebene = null; } clearInterval(radar.timer); var p = $('#radarPlay'); p.setAttribute('aria-pressed', 'false'); $('span', p).textContent = 'Abspielen'; }
    // Satellit
    ['sat', 'ir'].forEach(function (k) { if (satEbenen[k] && k !== ebene) radarKarte.removeLayer(satEbenen[k]); });
    if (marken && ebene !== 'karte') radarKarte.removeLayer(marken);
    if (!A26_NAMEN[ebene]) a26Weg();
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
    } else if (ebene === 'karte') {
      if (!marken) marken = L.layerGroup();
      marken.addTo(radarKarte);
      if (markenOrt !== ortKey(ort)) temperaturMarken();
    } else a26Zeigen();
  }

  /* ---------- A26: Karten-Ebenen Wind, Wolken, Isobaren ----------
     Kostenlose Quelle ohne Schlüssel: Open-Meteo, aktuelle Werte für ein Gitter (8 × 7 Punkte, eine Anfrage) rund um den Kartenausschnitt.
     Die Fläche wird auf ein Bild gezeichnet und über die Karte gelegt (wie im Baustein wpkarte.js, Isobaren per Marching Squares); neu gezeichnet nach dem Verschieben oder Zoomen.
     Nicht gebaut: Regen als eigene Ebene (das Radar zeigt Regen), Zeitleiste für Vorhersage-Bilder, Wind als Strömungs-Animation (brauchen Dienste mit Schlüssel oder viel mehr Daten). */
  var A26_NX = 8, A26_NY = 7, a26 = { g: null, laeuft: null, bild: null, nr: 0, uhr: null };
  function a26Weg() { if (a26.bild && radarKarte) radarKarte.removeLayer(a26.bild); a26.bild = null; a26.nr++; }
  function a26Bewegt() { clearTimeout(a26.uhr); if (A26_NAMEN[ebene]) a26.uhr = setTimeout(a26Zeigen, 400); }
  function a26Holen() {
    // Open-Meteo zählt jeden Gitterpunkt als eigenen Abruf: Gitter weiterverwenden, solange die Kartenmitte darin liegt, der Zoom höchstens 1 Stufe anders ist und die Werte jünger als 30 Minuten sind (Prüfung 22.10.2026).
    // Am Rand des Kartenbilds gelten die Randwerte weiter (a26Wert), sonst würde schon eine kleine Verschiebung neu laden.
    var b = radarKarte.getBounds(), zoom = radarKarte.getZoom(), g = a26.g, mitte = b.getCenter();
    if (g && Math.abs(g.zoom - zoom) <= 1 && Date.now() - g.zeit < 30 * 60000 && mitte.lat >= g.lats[0] && mitte.lat <= g.lats[A26_NY - 1] && mitte.lng >= g.lons[0] && mitte.lng <= g.lons[A26_NX - 1]) return Promise.resolve(g);
    if (a26.laeuft) return a26.laeuft.then(a26Holen);   // läuft schon ein Abruf: abwarten, danach neu entscheiden (sonst doppelte Abrufe beim Öffnen)
    var dLat = (b.getNorth() - b.getSouth()) * .3, dLon = (b.getEast() - b.getWest()) * .3;
    var sued = Math.max(-85, b.getSouth() - dLat), nord = Math.min(85, b.getNorth() + dLat), west = Math.max(-180, b.getWest() - dLon), ost = Math.min(180, b.getEast() + dLon);
    var lats = [], lons = [], la = [], lo = [], i, j;
    for (j = 0; j < A26_NY; j++) lats.push(+(sued + (nord - sued) * j / (A26_NY - 1)).toFixed(3));
    for (i = 0; i < A26_NX; i++) lons.push(+(west + (ost - west) * i / (A26_NX - 1)).toFixed(3));
    for (j = 0; j < A26_NY; j++) for (i = 0; i < A26_NX; i++) { la.push(lats[j]); lo.push(lons[i]); }
    a26.laeuft = holeJson('https://api.open-meteo.com/v1/forecast?latitude=' + la.join(',') + '&longitude=' + lo.join(',') + '&current=wind_speed_10m,wind_direction_10m,cloud_cover,pressure_msl&timezone=GMT').then(function (antw) {
      a26.laeuft = null;
      var liste = [].concat(antw), f = { wind: [], dir: [], wolken: [], druck: [] };
      if (liste.length < A26_NX * A26_NY) throw new Error('Gitter unvollständig');
      liste.forEach(function (a) { var c = a.current || {}; f.wind.push(c.wind_speed_10m); f.dir.push(c.wind_direction_10m); f.wolken.push(c.cloud_cover); f.druck.push(c.pressure_msl); });
      a26.g = { lats: lats, lons: lons, f: f, zoom: zoom, zeit: Date.now() };
      return a26.g;
    }, function (e) { a26.laeuft = null; throw e; });
    return a26.laeuft;
  }
  // Wert an einer Stelle: bilinear zwischen den vier Gitterpunkten, null außerhalb oder bei Lücken
  function a26Wert(g, feld, lat, lon) {
    var fx = (lon - g.lons[0]) / (g.lons[A26_NX - 1] - g.lons[0]) * (A26_NX - 1), fy = (lat - g.lats[0]) / (g.lats[A26_NY - 1] - g.lats[0]) * (A26_NY - 1);
    fx = Math.max(0, Math.min(A26_NX - 1, fx)); fy = Math.max(0, Math.min(A26_NY - 1, fy));   // außerhalb: Randwert
    var i = Math.min(A26_NX - 2, Math.floor(fx)), j = Math.min(A26_NY - 2, Math.floor(fy)), dx = fx - i, dy = fy - j, w = g.f[feld], k = j * A26_NX + i;
    var a = w[k], b = w[k + 1], c = w[k + A26_NX], d = w[k + A26_NX + 1];
    if ([a, b, c, d].some(function (v) { return v == null; })) return null;
    return (a * (1 - dx) + b * dx) * (1 - dy) + (c * (1 - dx) + d * dx) * dy;
  }
  // Wind: Richtung über die Komponenten mitteln, sonst springt 350°/10° auf 180°
  function a26Wind(g, lat, lon) {
    var s = a26Wert(g, 'wind', lat, lon);
    if (s == null) return null;
    var fx = (lon - g.lons[0]) / (g.lons[A26_NX - 1] - g.lons[0]) * (A26_NX - 1), fy = (lat - g.lats[0]) / (g.lats[A26_NY - 1] - g.lats[0]) * (A26_NY - 1);
    fx = Math.max(0, Math.min(A26_NX - 1, fx)); fy = Math.max(0, Math.min(A26_NY - 1, fy));
    var i = Math.min(A26_NX - 2, Math.floor(fx)), j = Math.min(A26_NY - 2, Math.floor(fy)), dx = fx - i, dy = fy - j, x = 0, y = 0;
    [[i, j, (1 - dx) * (1 - dy)], [i + 1, j, dx * (1 - dy)], [i, j + 1, (1 - dx) * dy], [i + 1, j + 1, dx * dy]].forEach(function (e) {
      var k = e[1] * A26_NX + e[0], r = g.f.dir[k] * Math.PI / 180; x += Math.sin(r) * g.f.wind[k] * e[2]; y += Math.cos(r) * g.f.wind[k] * e[2];
    });
    return { v: s, dir: (Math.atan2(x, y) * 180 / Math.PI + 360) % 360 };
  }
  // Linien gleichen Werts (Marching Squares) auf einem Raster; Ergebnis je Stufe: Liste von Strecken [[x1,y1],[x2,y2]]
  function a26Linien(feld, w, h, stufe) {
    var min = Infinity, max = -Infinity, i, aus = [];
    for (i = 0; i < feld.length; i++) { var v = feld[i]; if (v != null && !isNaN(v)) { if (v < min) min = v; if (v > max) max = v; } }
    if (!isFinite(min)) return aus;
    for (var lv = Math.ceil(min / stufe) * stufe; lv <= max; lv += stufe) {
      var seg = [];
      for (var y = 0; y < h - 1; y++) for (var x = 0; x < w - 1; x++) {
        var a = feld[y * w + x], b = feld[y * w + x + 1], c = feld[(y + 1) * w + x + 1], d = feld[(y + 1) * w + x];
        if ([a, b, c, d].some(function (q) { return q == null || isNaN(q); })) continue;
        var idx = (a >= lv ? 8 : 0) | (b >= lv ? 4 : 0) | (c >= lv ? 2 : 0) | (d >= lv ? 1 : 0); if (idx === 0 || idx === 15) continue;
        var t = function (p, q) { return (lv - p) / (q - p); };
        var o = [x + t(a, b), y], re = [x + 1, y + t(b, c)], un = [x + t(d, c), y + 1], li = [x, y + t(a, d)], paare;
        switch (idx) {
          case 1: case 14: paare = [[li, un]]; break; case 2: case 13: paare = [[un, re]]; break; case 3: case 12: paare = [[li, re]]; break;
          case 4: case 11: paare = [[o, re]]; break; case 5: paare = [[o, li], [un, re]]; break; case 6: case 9: paare = [[o, un]]; break;
          case 7: case 8: paare = [[o, li]]; break; default: paare = [[o, re], [li, un]];
        }
        paare.forEach(function (p) { seg.push(p); });
      }
      if (seg.length) aus.push({ wert: lv, seg: seg });
    }
    return aus;
  }
  function a26Zeichnen(g) {
    var gr = radarKarte.getSize(), W = gr.x, H = gr.y, dpr = Math.min(2, window.devicePixelRatio || 1), cv = document.createElement('canvas');
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var ctx = cv.getContext('2d'), css = getComputedStyle(document.documentElement), hell = css.getPropertyValue('--label').trim(), dunkel = css.getPropertyValue('--bg').trim();
    var latBei = function (y) { return radarKarte.containerPointToLatLng([0, y]).lat; }, lonBei = function (x) { return radarKarte.containerPointToLatLng([x, 0]).lng; };
    ctx.scale(dpr, dpr); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 12px -apple-system, "SF Pro Text", system-ui, sans-serif';
    var x, y, stufe = 0, anzahl = 0;
    if (ebene === 'wolken') {
      var w = Math.ceil(W / 8), h = Math.ceil(H / 8), kl = document.createElement('canvas'); kl.width = w; kl.height = h;
      ctx.globalAlpha = .5; ctx.fillStyle = dunkel; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;   // dunkler Schleier, damit die weißen Wolken auch auf der hellen Karte zu sehen sind
      var kc = kl.getContext('2d'); kc.fillStyle = hell;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) { var c = a26Wert(g, 'wolken', latBei(y * 8 + 4), lonBei(x * 8 + 4)); if (c != null) { kc.globalAlpha = Math.max(0, Math.min(1, c / 100)) * .9; kc.fillRect(x, y, 1, 1); } }
      ctx.imageSmoothingEnabled = true; ctx.drawImage(kl, 0, 0, w * 8, h * 8);
    } else if (ebene === 'wind') {
      for (y = 44; y < H; y += 84) for (x = 44; x < W; x += 84) {
        var wi = a26Wind(g, latBei(y), lonBei(x)); if (!wi) continue;
        var len = Math.min(36, 14 + wi.v * .6), r = (wi.dir + 180) * Math.PI / 180, dx = Math.sin(r), dy = -Math.cos(r);
        var x1 = x - dx * len / 2, y1 = y - dy * len / 2, x2 = x + dx * len / 2, y2 = y + dy * len / 2, kopf = function () { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.moveTo(x2 - dx * 8 - dy * 5, y2 - dy * 8 + dx * 5); ctx.lineTo(x2, y2); ctx.lineTo(x2 - dx * 8 + dy * 5, y2 - dy * 8 - dx * 5); ctx.stroke(); };
        ctx.strokeStyle = dunkel; ctx.lineWidth = 5.5; kopf(); ctx.strokeStyle = hell; ctx.lineWidth = 2.5; kopf();
        var zahl = windTxt(wi.v), ty = y + Math.max(len / 2, 12) + 10; ctx.lineWidth = 4; ctx.strokeStyle = dunkel; ctx.strokeText(zahl, x, ty); ctx.fillStyle = hell; ctx.fillText(zahl, x, ty);
      }
    } else {
      var rw = Math.max(24, Math.round(W / 6)), rh = Math.max(18, Math.round(H / 6)), feld = [];
      for (y = 0; y < rh; y++) for (x = 0; x < rw; x++) feld.push(a26Wert(g, 'druck', latBei(y / (rh - 1) * H), lonBei(x / (rw - 1) * W)));
      stufe = 4; var linien = a26Linien(feld, rw, rh, stufe);
      if (linien.length < 2) { stufe = 2; linien = a26Linien(feld, rw, rh, stufe); }   // ruhiges Wetter: feinere Stufe
      var sx = W / (rw - 1), sy = H / (rh - 1), anzahl = linien.length;
      var strecken = function (l) { ctx.beginPath(); l.seg.forEach(function (sg) { ctx.moveTo(sg[0][0] * sx, sg[0][1] * sy); ctx.lineTo(sg[1][0] * sx, sg[1][1] * sy); }); ctx.stroke(); };
      linien.forEach(function (l) { ctx.strokeStyle = dunkel; ctx.lineWidth = 5; strecken(l); ctx.strokeStyle = hell; ctx.lineWidth = 2; strecken(l); });
      // Beschriftung nur im Inneren: nicht am Rand und nicht unter den Zoom-Knöpfen (rechts oben)
      var frei = function (mx, my) { return mx > 30 && my > 20 && mx < W - 30 && my < H - 30 && !(mx > W - 80 && my < 130); };
      linien.forEach(function (l) {
        var n = l.seg.length, k = Math.max(1, Math.floor(n / 2));
        for (var q = Math.floor(k / 2); q < n; q += k) {
          var sg = l.seg[q], mx = (sg[0][0] + sg[1][0]) / 2 * sx, my = (sg[0][1] + sg[1][1]) / 2 * sy, txt = String(Math.round(l.wert));
          if (!frei(mx, my)) continue;
          ctx.fillStyle = dunkel; ctx.fillRect(mx - 20, my - 10, 40, 20); ctx.fillStyle = hell; ctx.fillText(txt, mx, my);
        }
      });
    }
    var mb = radarKarte.getBounds(), bounds = [[mb.getSouth(), mb.getWest()], [mb.getNorth(), mb.getEast()]], url = cv.toDataURL('image/png');
    if (a26.bild) radarKarte.removeLayer(a26.bild);
    a26.bild = L.imageOverlay(url, bounds, { interactive: false, className: 'a26-flaeche', zIndex: 5 }).addTo(radarKarte);
    return { stufe: stufe, anzahl: anzahl };
  }
  function a26Zeigen() {
    if (!A26_NAMEN[ebene] || !radarKarte) return;
    var gr = radarKarte.getSize(); if (!gr.x || !gr.y) return;   // Karte noch nicht gemessen: nichts holen, das nächste moveend kommt
    var nr = ++a26.nr, z = $('#radarZeit'), name = A26_NAMEN[ebene];
    z.textContent = name + ' · wird geladen …';
    a26Holen().then(function (g) {
      if (nr !== a26.nr || !A26_NAMEN[ebene]) return;
      var info = a26Zeichnen(g);
      z.textContent = name + ' · ' + (ebene !== 'druck' ? 'aktuell' : info.anzahl ? 'alle ' + info.stufe + ' hPa' : 'kaum Druckunterschiede im Ausschnitt, deshalb keine Linien');
    }).catch(function () { if (nr !== a26.nr) return; if (a26.bild) { radarKarte.removeLayer(a26.bild); a26.bild = null; } z.textContent = name + ': Wetterdaten für die Karte gerade nicht erreichbar.'; });
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
    if (an) radar.timer = setInterval(function () { if (!radar.frames.length) return; radar.i = (radar.i + 1) % radar.frames.length; radarZeigen(); }, Math.round((matchMedia('(prefers-reduced-motion: reduce)').matches ? 1500 : 700) * w3TempoFaktor()));
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
      zeile('Saharastaub (Calima): Open-Meteo Air Quality', 'CAMS', 'https://open-meteo.com/en/docs/air-quality-api') +
      zeile('Wettersymbole und Beispielfoto', 'Eigene Zeichnung „Klassisch“, eigene Aufnahme aus Mannheim');
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
      '<p class="info hilfe">Das Modell steht oben unter dem Ort. „Beste Mischung“ passt fast immer; andere Modelle zum Vergleichen.</p>' +
      '<h2 class="abschnitt-titel">Einheit für Wind</h2><div class="kachel">' + seg('wind', windEinheit, [['kmh', 'km/h'], ['ms', 'm/s'], ['kn', 'Knoten'], ['bft', 'Beaufort']], 'Einheit für Wind') + '</div>' +
      '<h2 class="abschnitt-titel">Aktuell-Kachel: links ' + (tippe() === 'Klicke' ? 'anklicken' : 'antippen') + ' wechselt rechts zu</h2><div class="liste" id="ansichtListe">' +
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
  function ortSetzen(o) { ort = o; speicher.schreiben('wpgt-ort', o); daten = null; $('#ortName').textContent = o.name; zeigeTab('wetter'); laden(); }

  /* ---------- Tabs: Wetter, Graphs, Kamera (Mitte, öffnet Teilen), Rad/Sat, Mehr ---------- */
  var TABS = [['wetter', 'Wetter', 'cloudsun'], ['graphs', 'Graphs', 'chart'], ['kamera', 'Kamera', 'camera'], ['radsat', 'Rad/Sat', 'radar'], ['mehr', 'Mehr', 'more']];
  var SEITEN = TABS.filter(function (t) { return t[0] !== 'kamera'; });
  var aktiv = 'wetter';
  // Die Tab-Leiste hat die vier Seiten; der Wetterfoto-Knopf sitzt dort nur, wenn die Einstellung „Tab-Leiste“ gilt (Platz 1 bis 5, Standard 3)
  function tabsListe() {
    var l = SEITEN.slice(), z = zugang();
    if (z.ort === 'tab') l.splice(Math.min(+z.platz - 1, l.length), 0, TABS[2]);
    return l;
  }
  function tabsMarkieren() {
    SEITEN.forEach(function (t) { var an = t[0] === aktiv, b = $('#tb-' + t[0]); if (!b) return; b.setAttribute('aria-selected', String(an)); b.tabIndex = an ? 0 : -1; });
  }
  function baueTabs() {
    var z = zugang(), rund = z.aus === 'rund';
    $('#tabbar').innerHTML = tabsListe().map(function (t) {
      if (t[0] === 'kamera') return '<button role="tab" aria-selected="false" tabindex="-1" id="tb-kamera" data-kamera="1" class="tippbar tab-kamera zugang-' + z.aus + '" aria-haspopup="dialog" aria-label="Kamera: Wetterfoto aufnehmen"><span class="ausloeser">' + Ikon('camera') + '</span><span' + (z.aus === 'symbol' ? ' class="nur-vorlesen"' : ' aria-hidden="true"') + '>Kamera</span></button>';
      return '<button role="tab" id="tb-' + t[0] + '" aria-controls="tab-' + t[0] + '" data-tab="' + t[0] + '" class="tippbar">' + Ikon(t[2]) + '<span>' + t[1] + '</span></button>';
    }).join('');
    tabsMarkieren();
  }
  function bindTabs() {
    $('#tabbar').addEventListener('click', function (e) {
      if (e.target.closest('[data-kamera]')) return studioAuf(true, e.target.closest('[data-kamera]'));
      var b = e.target.closest('[data-tab]'); if (b) zeigeTab(b.dataset.tab);
    });
    $('#tabbar').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var ids = $$('#tabbar [role="tab"]').map(function (b) { return b.id.slice(3); }), i = ids.indexOf(document.activeElement && document.activeElement.id ? document.activeElement.id.slice(3) : aktiv);
      if (i < 0) i = ids.indexOf(aktiv);
      var n = ids[(i + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
      if (n !== 'kamera') zeigeTab(n);
      $('#tb-' + n).focus();
    });
  }
  function zeigeTab(id) {
    aktiv = id;
    SEITEN.forEach(function (t) { var an = t[0] === id, b = $('#tb-' + t[0]); b.setAttribute('aria-selected', String(an)); b.tabIndex = an ? 0 : -1; $('#tab-' + t[0]).hidden = !an; });
    if ($('#tb-kamera')) tabsMarkieren();
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
      '<p class="info hilfe">Beim DWD fehlen UV-Index und Luftqualität (dort steht „–“). Sonnenauf- und -untergang rechnet die App selbst aus. Die Wahl „Wettermodell“ darunter gilt nur für Open-Meteo.</p>';
    var wm = titel('Wettermodell'); if (wm) vor(wm, quelleHtml); else s.insertAdjacentHTML('beforeend', quelleHtml);
    // Datenschutz-Satz: unter „Datenschutz" (falls vorhanden), sonst unter den Quellen
    var satz = '<p class="info hilfe" id="datenschutzDwd">Bei Datenquelle DWD sieht brightsky.dev deine IP-Adresse und den Ort.</p>';
    var ds = titel('Datenschutz'), ql = $('#quellen', s);
    if (ds && ds.nextElementSibling) nach(ds.nextElementSibling, satz); else if (ql) nach(ql, '<p class="info hilfe" id="datenschutzDwd"><b>Datenschutz:</b> Bei Datenquelle DWD sieht brightsky.dev deine IP-Adresse und den Ort.</p>');
    // Kurzbefehl „Wetterfoto" vor „Über die App"
    var kb = '<h2 class="abschnitt-titel" id="kbTitel">Kurzbefehl „Wetterfoto“</h2><section class="kachel kurzbefehl" aria-labelledby="kbTitel">' +
      '<p>Mit Apples App „Kurzbefehle“ fotografierst du mit einem Tipp und landest danach direkt im Wetterfoto dieser App.</p><ol class="kb-schritte">' +
      '<li>Öffne die App <b>Kurzbefehle</b> und tippe oben rechts auf <b>+</b>.</li>' +
      '<li>Füge die Aktion <b>App öffnen</b> hinzu und wähle <b>ProCamera</b> (oder <b>Kamera</b>).</li>' +
      '<li>Füge die Aktion <b>Warten bis Rückkehr</b> hinzu. Der Kurzbefehl wartet dann, bis du fotografiert hast und zurückwechselst.</li>' +
      '<li>Füge die Aktion <b>URL öffnen</b> hinzu und setze diesen Link ein:<code class="kb-link">' + esc(KURZBEFEHL_URL) + '</code></li>' +
      '<li>Nenne den Kurzbefehl <b>Wetterfoto</b>. Über <b>Zum Home-Bildschirm</b> bekommt er ein eigenes Symbol, oder du sagst „Hey Siri, Wetterfoto“.</li>' +
      '<li>Weitergeben: Kurzbefehle lassen sich seit iOS 15 nur über einen iCloud-Link teilen. Den Link erzeugst du selbst, wenn der Kurzbefehl fertig ist (Kurzbefehl lange drücken, „Teilen“, „iCloud-Link kopieren“).</li></ol>' +
      '<p class="info">Der Link öffnet die App in Safari und zeigt gleich das Wetterfoto. Tippe dort auf „Foto wählen“ und wähle das neueste Bild.</p>' +
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

  // Direktlink für den Kurzbefehl: index.html?kamera=1 (oder #kamera) öffnet nach dem Laden sofort das Wetterfoto-Studio
  function kameraDirekt() {
    if (!/[?&]kamera=1(&|$)/.test(location.search) && location.hash !== '#kamera') return;
    try { history.replaceState(null, '', location.pathname); } catch (e) { }   // beim Neuladen nicht noch einmal öffnen
    var versuche = 0;
    (function warten() {
      if (!daten) { if (++versuche < 100) setTimeout(warten, 200); return; }   // höchstens 20 s auf die Wetterdaten warten
      studioAuf(false);
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
    if (window.scrollY > 0 || (rmDialog && rmDialog.open)) return;
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
      '<p class="info">Nichts wird automatisch gesendet. Mit „Teilen“ wählst du selbst, wohin der Text geht, zum Beispiel WhatsApp oder Mail. Mitgeschickt werden die Woche, die Zahl der Nutzungstage, das Gerät (z. B. iPhone, iOS-Version) und die App-Version.</p>' +
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

  /* --- (2) Satellit und Infrarot abspielen: 12 Bilder der letzten 2 Stunden (EUMETSAT-WMS mit time=) ---
     GetCapabilities am 15.10.2026, 12:52 UTC geprüft (je Ebene: /geoserver/mtg_fd/<ebene>/wms?request=GetCapabilities, CORS offen):
     <Dimension name="time" default="2026-10-15T12:30:00Z" units="ISO8601" nearestValue="1">2024-09-23T00:00:00.000Z/2026-10-15T12:30:00.000Z/PT10M</Dimension>
     Also ein Bereich „Anfang/Ende/Schritt“ mit 10 Minuten Schritt; das neueste Bild ist etwa 20–25 Minuten alt.
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
  function satLos() { clearInterval(satFilm.timer); satFilm.timer = setInterval(satWeiter, Math.round((matchMedia('(prefers-reduced-motion: reduce)').matches ? 1500 : 700) * w3TempoFaktor())); }
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
        inhalt.innerHTML = '<section class="kachel leer-zustand">' + Ikon('image') + '<p><b>Keine früheren Wetterfotos.</b><br>Neue Wetterfotos findest du im Wetterfoto unter „Meine Wetterfotos“.</p>' +
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
      var tagHtml = !gal.tag || gal.tag.slice(0, 7) !== j + '-' + String(m + 1).padStart(2, '0') ? '<p class="info pc-gal-hilfe">' + tippe() + ' auf einen Tag mit Bild, um seine Fotos zu sehen.</p>' :
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
    if (b.dataset.kameraAuf) { d.close(); return studioAuf(false); }
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
     Wahl „Kurve | Meteogramm“ in wpc-graphs, Zeilen in wpc-meteo (Reihenfolge = Reihenfolge im Meteogramm). */
  var METEO_STANDARD = ['sonne', 'temp', 'wind', 'regen'];
  var mg = { instanz: null, schluessel: '' };
  var graphsModus = function () { return speicher.lesen('wpc-graphs', 'meteo') === 'kurve' ? 'kurve' : 'meteo'; };   // Link vom 20.10.2026: Tab Graphs beginnt mit dem Meteogramm
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
      vollbild: function (an) { document.documentElement.classList.toggle('pc-mg-voll', !!an); },
      vollbildStart: a32Immer() && aktiv === 'graphs', beiVollbildZu: a32Zurueck   // A32 P3: „immer im Vollbild“
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
    if (t) { if (t.dataset.mlTab === 'kamera') studioAuf(false); else zeigeTab(t.dataset.mlTab); return; }
    if (o) { ortSetzen(meineOrte()[+o.dataset.mlOrt]); return; }
    if (e.target.closest('#mlSuche')) return ortSucheOeffnen();
    if (e.target.closest('#mlTeilen')) studioAuf(false);
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
      if (k === links || k === rechts || k.classList.contains('update-zeile') || k.id === 'a9Warnung') return;   // Warnung steht über beiden Spalten
      if (k.querySelector('.leaflet-container')) karte = true;
      (k.classList.contains('akt') || k.classList.contains('std') ? links : rechts).appendChild(k);
    });
    // Reihenfolge links: Aktuell vor Stunden; Update-Zeile bleibt oben über beiden Spalten
    var akt = $(':scope > .akt', links); if (akt && akt !== links.firstChild) links.insertBefore(akt, links.firstChild);
    var upd = $(':scope > .update-zeile', s); if (upd && upd !== s.firstChild) s.insertBefore(upd, s.firstChild);
    var wa = $(':scope > #a9Warnung', s); if (wa && upd) upd.insertAdjacentElement('afterend', wa);
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
    zeigeTab('mehr'); a9MehrOeffnen(0);
    setTimeout(function () { var f = $('#sucheFeld'); if (f) { f.focus(); f.select(); } }, 50);
  }
  function dialogOffen() { var st = $('#studio'); return (st && !st.hidden) || $$('dialog').some(function (d) { return d.open; }); }   // das Studio ist kein <dialog>
  // Ein offenes Vollbild-Blatt (A32) schließt ein Kürzel zuerst, danach wirkt es wie sonst (wie „Fertig“ und dann die Tab-Leiste).
  // Sonst bliebe die Seite nach dem Reiterwechsel gesperrt (zweite Meinung 21.10.2026).
  function vollbilderSchliessen() {
    $$('.mg-vollbild .mg-vb-fertig').forEach(function (f) { f.click(); });
    if (rsVoll.an) radsatVollbild(false);
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') return;   // Fenster (<dialog>) schließt der Browser selbst mit Esc, siehe „cancel“ unten
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
    var k = (e.key || '').toLowerCase();
    if (/^[1-5kr]$/.test(k) && !dialogOffen()) vollbilderSchliessen();
    if (/^[1-5]$/.test(k)) {
      if (dialogOffen()) return;
      e.preventDefault();
      var t = TABS[+k - 1][0];
      if (t === 'kamera') studioAuf(false); else { zeigeTab(t); var b = $('#macLeiste [data-ml-tab="' + t + '"]'); if (b && macAn()) b.focus({ preventScroll: true }); }
    } else if (k === 'k') {
      if (dialogOffen()) return;
      e.preventDefault(); ortSucheOeffnen();
    } else if (k === 'r') {
      if (dialogOffen()) return;
      e.preventDefault(); aktualisieren();   // statt die Seite neu zu laden: nur das Wetter neu holen
    }
  });
  /* === Paket A5: Corralejo mit DWD, Meteogramm auf der Startseite, „Was heute geht" (15.10.2026) === */
  // Bestehende Funktionen bleiben unverändert; umhüllt werden dwdZeitzone, dwdHolen, brightSkyUmwandeln (Paket B),
  // renderWetter, renderMehr und quellenHtml. Einstellungen in wpc-startseite, Küsten-Prüfung je Ort in wpc-kueste.
  var a5Zwei = function (n) { return (n < 10 ? '0' : '') + n; };
  var a5PosKey = function (o) { return Number(o.lat).toFixed(2) + ',' + Number(o.lon).toFixed(2); };

  /* --- 1. Zeitzone des Orts für Bright Sky (sonst liegen die Kanaren eine Stunde daneben) --- */
  // Reihenfolge: gemerkt (wpc-zeitzonen) → frühere Open-Meteo-Antwort → bekannte Gebiete → einmal Open-Meteo fragen
  var A5_GEBIETE = [{ tz: 'Atlantic/Canary', lat: [27.4, 29.6], lon: [-18.4, -13.1] }, { tz: 'Atlantic/Madeira', lat: [32.3, 33.2], lon: [-17.4, -16.2] }, { tz: 'Atlantic/Azores', lat: [36.8, 39.8], lon: [-31.4, -24.9] }];
  var a5Zeitzonen = speicher.lesen('wpc-zeitzonen', {}) || {};
  function a5Zeitzone(o) {
    var k = a5PosKey(o); if (a5Zeitzonen[k]) return a5Zeitzonen[k];
    var alt = speicher.lesen(cacheKeyOpenMeteo(o), null); if (alt && alt.d && alt.d.timezone && alt.d._quelle !== 'dwd') return alt.d.timezone;
    var g = A5_GEBIETE.filter(function (x) { return o.lat >= x.lat[0] && o.lat <= x.lat[1] && o.lon >= x.lon[0] && o.lon <= x.lon[1]; })[0];
    return g ? g.tz : null;
  }
  dwdZeitzone = function (o) { return a5Zeitzone(o) || 'Europe/Berlin'; };
  dwdHolen = (function (alt) {
    return function (o) {
      if (a5Zeitzone(o)) return alt(o);
      return holeJson('https://api.open-meteo.com/v1/forecast?latitude=' + o.lat + '&longitude=' + o.lon + '&current=is_day&forecast_days=1&timezone=auto')
        .then(function (r) { if (r && r.timezone) { a5Zeitzonen[a5PosKey(o)] = r.timezone; speicher.schreiben('wpc-zeitzonen', a5Zeitzonen); } }, function () { })
        .then(function () { return alt(o); });
    };
  })(dwdHolen);
  // Zeitstempel in die Ortszeit umrechnen, z. B. '2026-10-15T14:00:00+02:00' → '2026-10-15T13:00:00+01:00' (Kanaren)
  var a5Formate = {};
  function a5Ortszeit(ts, tz) {
    var ms = Date.parse(ts); if (isNaN(ms)) return ts;
    try {
      var f = a5Formate[tz] || (a5Formate[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      var p = {}; f.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
      var st = p.hour === '24' ? '00' : p.hour, versatz = Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +st, +p.minute, +p.second) - ms) / 60000), b = Math.abs(versatz);
      return p.year + '-' + p.month + '-' + p.day + 'T' + st + ':' + p.minute + ':' + p.second + (versatz < 0 ? '-' : '+') + a5Zwei(Math.floor(b / 60)) + ':' + a5Zwei(b % 60);
    } catch (e) { return ts; }
  }
  brightSkyUmwandeln = (function (alt) {
    return function (antw, akt, o) {
      var tz = dwdZeitzone(o), umw = function (x) { return x && x.timestamp ? Object.assign({}, x, { timestamp: a5Ortszeit(x.timestamp, tz) }) : x; };
      var a2 = antw && antw.weather ? Object.assign({}, antw, { weather: antw.weather.map(umw) }) : antw;
      var k2 = akt && akt.weather ? Object.assign({}, akt, { weather: umw(akt.weather) }) : akt;
      var d = alt(a2, k2, o);
      // Bewölkung je Stunde (für „Sterne") und Kennzeichen, ob „Aktuell" gemessen oder aus der Vorhersage ist
      d.hourly.cloud_cover = a2.weather.filter(function (x) { return x.temperature != null; }).map(function (x) { return x.cloud_cover == null ? null : x.cloud_cover; });
      d.current._vorhersage = !(k2 && k2.weather && k2.weather.temperature != null);
      return d;
    };
  })(brightSkyUmwandeln);

  /* --- Einstellungen „Startseite" (wpc-startseite) --- */
  var A5_ARTEN = [
    ['schirm', 'Schirm', 'Regenrisiko ab 40 %'], ['frost', 'Frost', 'Tiefstwert 0 °C oder darunter'], ['hitze', 'Hitze', 'Höchstwert ab 30 °C'],
    ['uv', 'UV-Schutz', 'UV-Index ab 6'], ['strand', 'Strand und Baden', 'nur am Meer: ab 22 °C, Regenrisiko unter 20 %, Wind unter 30 km/h'], ['kiten', 'Kiten', 'nur am Meer: Wind 20 bis 40 km/h'],
    ['gezeiten', 'Ebbe und Flut', 'nur an der Küste, nächster Tief- und Höchststand'], ['gold', 'Goldene Stunde', '45 Minuten vor Sonnenuntergang'], ['sterne', 'Sterne', 'nachts höchstens 20 % Wolken']
  ];
  var A5_GROESSEN = ['klein', 'mittel', 'gross'];
  function startLesen() {
    var s = speicher.lesen('wpc-startseite', {}) || {}, ids = A5_ARTEN.map(function (a) { return a[0]; });
    return { tipps: s.tipps !== false, meteo: s.meteo === true, radar: s.radar === true, groesse: A5_GROESSEN.indexOf(s.groesse) >= 0 ? s.groesse : 'mittel',
      arten: Array.isArray(s.arten) ? s.arten.filter(function (a) { return ids.indexOf(a) >= 0; }) : ids };
  }
  function startSchreiben(s) { speicher.schreiben('wpc-startseite', s); }

  /* --- Zeit als Ortszeit-Text 'JJJJ-MM-TTTHH:MM' rechnen (unabhängig von der Zeitzone des Geräts) --- */
  var a5Ms = function (iso) { var t = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || ''); return t ? Date.UTC(+t[1], +t[2] - 1, +t[3], +t[4], +t[5]) : NaN; };
  var a5Plus = function (iso, min) { return new Date(a5Ms(iso) + min * 60000).toISOString().slice(0, 16); };
  var a5Grad = function (v) { return rund(v).replace('-', '−') + ' °C'; };

  /* --- 3. Ebbe und Flut: Open-Meteo Marine (sea_level_height_msl). Küstenort = die Abfrage liefert Werte --- */
  var a5Kueste = speicher.lesen('wpc-kueste', {}) || {}, a5Meer = {};
  function a5MeerHolen(o, fertig) {
    var k = a5PosKey(o), m = a5Meer[k];
    if (a5Kueste[k] === false || (m && (m.laedt || Date.now() - m.zeit < 3 * 3600e3))) return;
    a5Meer[k] = { laedt: true, zeit: 0, d: m && m.d };
    holeJson('https://marine-api.open-meteo.com/v1/marine?latitude=' + o.lat + '&longitude=' + o.lon + '&hourly=sea_level_height_msl&timezone=auto&forecast_days=3').then(function (r) {
      var h = r && r.hourly && r.hourly.sea_level_height_msl, hat = !!(h && h.some(function (v) { return v != null; }));
      a5Kueste[k] = hat; speicher.schreiben('wpc-kueste', a5Kueste);   // einmal je Ort prüfen, Ergebnis merken
      a5Meer[k] = { zeit: Date.now(), d: hat ? r.hourly : null };
      fertig();
    }, function () { a5Meer[k] = { zeit: Date.now() - 2.5 * 3600e3, d: m && m.d }; });   // ohne Netz: in 30 Minuten wieder versuchen
  }
  // Nächster Höchst- (Flut) und Tiefststand (Ebbe) nach „jetzt"; Zeitpunkt zwischen den Stundenwerten per Parabel, auf 5 Minuten gerundet
  function a5Gezeiten(meer, jetzt) {
    var z = meer.time, h = meer.sea_level_height_msl, hoch = null, tief = null;
    for (var k = 1; k < h.length - 1 && !(hoch && tief); k++) {
      if (h[k - 1] == null || h[k] == null || h[k + 1] == null) continue;
      var istHoch = h[k] > h[k - 1] && h[k] >= h[k + 1], istTief = h[k] < h[k - 1] && h[k] <= h[k + 1];
      if (!istHoch && !istTief) continue;
      var nenner = h[k - 1] - 2 * h[k] + h[k + 1], dx = nenner ? .5 * (h[k - 1] - h[k + 1]) / nenner : 0;
      var zeit = a5Plus(z[k], Math.round(dx * 12) * 5);
      if (zeit <= jetzt) continue;
      if (istHoch && !hoch) hoch = { flut: true, zeit: zeit };
      if (istTief && !tief) tief = { flut: false, zeit: zeit };
    }
    return [hoch, tief].filter(Boolean).sort(function (a, b) { return a.zeit < b.zeit ? -1 : 1; });
  }

  var uvWort = function (u) { return u == null ? '' : u < 3 ? 'niedrig' : u < 6 ? 'mäßig' : u < 8 ? 'hoch' : u < 11 ? 'sehr hoch' : 'extrem'; };
  /* --- „Was heute geht": feste Regeln, höchstens A5_MAX_TIPPS (laut Design-Link 2) Tipps in der Reihenfolge von A5_ARTEN --- */
  var A5_MAX_TIPPS = 2;   // design.json tippsModul.hoechstens
  function a5Tipps(d, meer, kueste, arten) {
    var c = d.current || {}, t = d.daily, h = d.hourly || {}, jetzt = (c.time || '').slice(0, 16), heute = jetzt.slice(0, 10), liste = [];
    if (!t || !t.time) return liste;
    var i = t.time.indexOf(heute); if (i < 0) i = 0;
    var wert = function (k) { return t[k] && t[k][i] != null ? t[k][i] : null;  };
    var rest = w3Rest(d, jetzt, heute, i);   // Welle 3: nur der Rest des Tages ab jetzt, nicht der ganze Tag
    var max = rest.max, min = rest.min, risiko = rest.risiko, summe = rest.summe;
    var wind = rest.wind, dir = rest.dir, uv = rest.uv, unter = wert('sunset');
    var trocken = risiko != null ? risiko < 20 : summe != null && summe < 0.5;
    var dazu = function (art, symbol, satz) { if (arten.indexOf(art) >= 0) liste.push({ art: art, sym: symbol, satz: satz }); };
    if (risiko != null && risiko >= 40) {
      var ab = '';
      (h.time || []).some(function (z, k) { if (z.slice(0, 10) === heute && z.slice(0, 13) > jetzt.slice(0, 13) && h.precipitation_probability && h.precipitation_probability[k] >= 40) { ab = z; return true; } return false; });
      dazu('schirm', sym('regen', 'a5-sym'), 'Nimm einen Schirm mit: Regenrisiko ' + rund(risiko) + ' %' + (ab ? ', ab etwa ' + hm(ab) + ' Uhr' : '') + '.');
    }
    if (min != null && min <= 0) dazu('frost', sym('schnee', 'a5-sym'), 'Frost bis ' + a5Grad(min) + ': Scheiben kratzen, empfindliche Pflanzen schützen.');
    if (max != null && max >= 30) dazu('hitze', sym('sonne', 'a5-sym'), 'Heiß, bis ' + a5Grad(max) + ': viel trinken, die Mittagssonne meiden.');
    if (uv != null && uv >= 6) dazu('uv', Ikon('sun'), 'UV-Index ' + rund(uv) + ' (' + uvWort(uv) + '): Sonnencreme, Hut und Sonnenbrille.');
    if (kueste && max != null && max >= 22 && trocken && wind != null && wind < 30) dazu('strand', sym('sonne', 'a5-sym'), (kueste ? 'Strandwetter' : 'Badewetter') + ': bis ' + a5Grad(max) + ', kaum Regen, Wind bis ' + windTxt(wind) + '.');
    if (kueste && wind != null && wind >= 20 && wind <= 40) dazu('kiten', sym('wind', 'a5-sym'), 'Gut zum Kiten: Wind bis ' + windTxt(wind) + (dir != null ? ' aus ' + richtung(dir) : '') + '.');
    if (meer && meer.time) {
      var g = a5Gezeiten(meer, jetzt);
      if (g.length) dazu('gezeiten', Ikon('tropfen'), 'Nächste ' + g.map(function (x) { return (x.flut ? 'Flut' : 'Ebbe') + ' gegen ' + hm(x.zeit) + ' Uhr'; }).join(', danach ') + '.');
    }
    var ga = w3SonneMond(heute), gv = ga.versatz, g0 = ga.gold.abends[0] != null ? heute + 'T' + w3Uhr(ga.gold.abends[0], gv) : null, g1 = ga.gold.abends[1] != null ? heute + 'T' + w3Uhr(ga.gold.abends[1], gv) : null;   // dieselbe goldene Stunde wie in der Kachel „Sonne“
    if (unter && jetzt < (g1 || unter)) {
      var gold = g0 || a5Plus(unter, -45), goldEnde = g1 || unter;
      dazu('gold', Ikon('sunset'), jetzt < gold ? 'Goldene Stunde ab ' + hm(gold) + ' Uhr: warmes, weiches Licht für Fotos.' : 'Goldene Stunde jetzt, bis ' + hm(goldEnde) + ' Uhr: warmes Licht für Fotos.');
    }
    if (unter && h.time) {
      // Nacht = Sonnenuntergang bis 3 Uhr; ohne Bewölkungswerte zählt das Wettersymbol (klar = 0 %, heiter = 15 %)
      var bis = a5Plus(heute + 'T03:00', 24 * 60), wolken = [];
      h.time.forEach(function (z, k) {
        if (z < unter || z > bis) return;
        var w = h.cloud_cover && h.cloud_cover[k] != null ? h.cloud_cover[k] : h.weather_code ? ({ 0: 0, 1: 15, 2: 50 })[h.weather_code[k]] : null;
        wolken.push(w == null ? 100 : w);
      });
      if (wolken.length >= 3 && wolken.reduce(function (s, v) { return s + v; }, 0) / wolken.length <= 20) dazu('sterne', sym('mond', 'a5-sym'), 'Klare Nacht: Sterne gut zu sehen ab etwa ' + hm(a5Plus(unter, 60)) + ' Uhr.');
    }
    return liste;
  }
  function a5TippsHtml() {
    var st = startLesen(), k = a5PosKey(ort), m = a5Meer[k];
    var tipps = a5Tipps(daten, m && m.d, a5Kueste[k] === true, st.arten).slice(0, A5_MAX_TIPPS);
    return '<section class="kachel a5-tipps" id="a5Tipps" aria-labelledby="a5TippsTitel"><h2 class="kachel-titel" id="a5TippsTitel">' + Ikon('sun') + 'Was heute geht</h2>' +
      (tipps.length ? '<ul class="a5-tipp-liste">' + tipps.map(function (x) { return '<li data-tipp="' + x.art + '"><span class="a5-tipp-sym" aria-hidden="true">' + x.sym + '</span><span class="a5-tipp-satz">' + esc(x.satz) + '</span></li>'; }).join('') + '</ul>'
        : '<div class="a5-leer"><p>Heute nichts Besonderes.</p><button type="button" class="button leise tippbar" data-a5-zu-start="1">Tipps auswählen</button></div>') + '</section>';
  }
  function a5TippsNeu() { var alt = $('#a5Tipps'); if (alt && daten) alt.outerHTML = a5TippsHtml(); }

  /* --- 2. Meteogramm auf der Startseite (eigene Instanz des Bausteins; die Ziel-IDs zählt der Baustein selbst hoch) --- */
  var a5Mg = { el: null, instanz: null, schl: '', breite: 0 };
  function a5MgZeilen(gr) { var z = meteoZeilen(); return gr === 'klein' ? z.slice(0, 1) : gr === 'mittel' ? z.slice(0, 2) : z; }
  function a5MgAbbauen() {
    if (a5Mg.instanz) { try { a5Mg.instanz.abbauen(); } catch (e) { console.warn('Meteogramm', e); } }
    if (a5Mg.el && a5Mg.el.parentNode) a5Mg.el.parentNode.removeChild(a5Mg.el);
    a5Mg.instanz = null; a5Mg.el = null; a5Mg.schl = '';
  }
  function a5MgEinsetzen(anker) {
    if (!window.Meteogramm || !anker) return;
    var z = a5MgZeilen(startLesen().groesse), m = modellInfo(), schl = [ort.lat, ort.lon, modell, z.join(','), (daten && daten.timezone) || ''].join('|');
    if (a5Mg.el && a5Mg.schl === schl) {   // gleiche Einstellung: dieselbe Instanz wieder einhängen, nichts neu laden
      anker.insertAdjacentElement('afterend', a5Mg.el);
      var b = a5Mg.el.clientWidth; if (b && b !== a5Mg.breite) { a5Mg.breite = b; window.dispatchEvent(new Event('resize')); }
      return;
    }
    a5MgAbbauen();
    var el = document.createElement('section');
    el.className = 'kachel a5-mg-kachel'; el.setAttribute('aria-labelledby', 'a5MgTitel');
    el.innerHTML = '<div class="a5-mg-kopf"><h2 class="kachel-titel" id="a5MgTitel">' + Ikon('chart') + 'Meteogramm</h2><button type="button" class="button leise tippbar" data-a5-mg-ganz="1" aria-label="Meteogramm im Tab Graphs ganz ansehen">Ganz ansehen</button></div><div class="pc-mg a5-mg" id="a5Mg"></div>';
    anker.insertAdjacentElement('afterend', el);
    a5Mg.el = el; a5Mg.breite = el.clientWidth;
    var ziel = $('#a5Mg', el);
    ziel.style.setProperty('--mg-haft-oben', $('#titelzeile').offsetHeight + 'px');
    try { localStorage.removeItem('wpc-mg-start-zeilen'); localStorage.removeItem('wpc-mg-start-reihenfolge'); } catch (e) { }   // Zeilen bestimmt die App
    a5Mg.instanz = Meteogramm.einbauen({
      ziel: ziel, orte: [{ id: 'start', name: ort.name, lat: ort.lat, lon: ort.lon }],
      modelle: [{ id: modell, name: m[1], lang: m[1], hinweis: m[2] }],
      karte: false, zeilen: z, zeilenStandard: z, werteKlug: false, merkschluessel: 'wpc-mg-start', zeitzone: (daten && daten.timezone) || 'auto',
      vollbild: function (an) { document.documentElement.classList.toggle('pc-mg-voll', !!an); }
    });
    a5Mg.schl = schl;
  }

  /* --- Wetter-Tab: Zusatz „(Vorhersage)", Kachel „Was heute geht" unter den Stunden, Meteogramm unter dem Regenradar --- */
  renderWetter = (function (alt) {
    return function () {
      if (a5Mg.el && a5Mg.el.parentNode) a5Mg.el.parentNode.removeChild(a5Mg.el);   // Meteogramm bleibt erhalten, wird nur umgehängt
      alt();
      var s = $('#tab-wetter'), st = startLesen();
      if (daten.current && daten.current._vorhersage) {
        var kopf = $('.akt-kopf', s), u = $('#aktUmschalter', s);
        if (kopf) $('b', kopf).insertAdjacentHTML('afterend', ' <span class="a5-vorhersage">(Vorhersage)</span>');
        if (u) u.setAttribute('aria-label', u.getAttribute('aria-label') + '. Aktuelle Werte aus der Vorhersage, keine Messung');
      }
      var std = $('.std', s) || $('.akt', s);
      if (st.tipps && std) {
        std.insertAdjacentHTML('afterend', a5TippsHtml());
        if (st.arten.indexOf('gezeiten') >= 0 || st.arten.indexOf('strand') >= 0 || st.arten.indexOf('kiten') >= 0) a5MeerHolen(ort, a5TippsNeu);
      }
      if (st.meteo) { var r = $('#regenTitel', s); a5MgEinsetzen(r ? r.closest('section') : $('#a5Tipps', s) || std); }
      else if (a5Mg.el) a5MgAbbauen();
    };
  })(renderWetter);
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-a5-mg-ganz]')) { speicher.schreiben('wpc-graphs', 'meteo'); zeigeTab('graphs'); return; }
    if (e.target.closest('[data-a5-zu-start]')) {
      zeigeTab('mehr'); var t = $('#a5StartTitel');
      if (t) { window.scrollTo(0, Math.max(0, t.getBoundingClientRect().top + window.scrollY - $('#titelzeile').offsetHeight - 16)); var f = $('#a5Arten input'); if (f) f.focus({ preventScroll: true }); }
    }
  });

  /* --- Tab „Mehr": Abschnitt „Startseite" vor „Aktuell-Kachel", Quelle Marine-API --- */
  quellenHtml = (function (alt) {
    return function () {
      return alt() + '<a class="tippbar" href="https://open-meteo.com/en/docs/marine-weather-api" target="_blank" rel="noopener"><span class="modell-text"><span>Meer: Open-Meteo Marine</span><small class="leise">Wellen, Wassertemperatur, Ebbe und Flut, CC BY 4.0, nur an der Küste</small></span><span aria-hidden="true">↗</span></a>';
    };
  })(quellenHtml);
  renderMehr = (function (alt) { return function () { alt(); a5Mehr(); }; })(renderMehr);
  function a5Mehr() {
    var s = $('#tab-mehr'), st = startLesen();
    var schalter = function (k, titel, text, an) { return '<label class="tippbar"><span class="modell-text"><span>' + titel + '</span><small class="leise">' + text + '</small></span><input type="checkbox" role="switch" data-a5="' + k + '"' + (an ? ' checked' : '') + '></label>'; };
    var html = '<h2 class="abschnitt-titel" id="a5StartTitel">Startseite</h2><div class="liste a5-liste" id="a5Start">' +
      schalter('tipps', 'Was heute geht', 'Bis zu ' + A5_MAX_TIPPS + ' Tipps für heute, nach festen Regeln', st.tipps) +
      schalter('radar', 'Regenradar-Kachel', 'Regen der nächsten 2 Stunden auf der Startseite, im Link vom 20.10.2026 aus', st.radar) +
      schalter('meteo', 'Meteogramm auf der Startseite', 'Zeilen wie im Tab „Graphs“, ganz unten auf der Startseite', st.meteo) + '</div>' +
      '<div class="kachel a5-groesse" id="a5Groesse"' + (st.meteo ? '' : ' hidden') + '><p class="a5-groesse-titel" id="a5GroesseTitel">Größe des Meteogramms</p>' +
      seg('a5groesse', st.groesse, [['klein', 'Klein'], ['mittel', 'Mittel'], ['gross', 'Groß']], 'Größe des Meteogramms') +
      '<p class="info">Klein zeigt 1 Zeile, Mittel 2 Zeilen, Groß alle Zeilen, die du im Tab „Graphs“ unter „Zeilen“ gewählt hast.</p></div>' +
      '<h2 class="abschnitt-titel" id="a5ArtenTitel"' + (st.tipps ? '' : ' hidden') + '>Welche Tipps dürfen erscheinen?</h2>' +
      '<div class="liste a5-liste" id="a5Arten" role="group" aria-labelledby="a5ArtenTitel"' + (st.tipps ? '' : ' hidden') + '>' +
      A5_ARTEN.map(function (a) { return '<label class="tippbar"><span class="modell-text"><span>' + a[1] + '</span><small class="leise">' + a[2] + '</small></span><input type="checkbox" value="' + a[0] + '"' + (st.arten.indexOf(a[0]) >= 0 ? ' checked' : '') + '></label>'; }).join('') + '</div>' +
      '<p class="info hilfe" id="a5ArtenHilfe"' + (st.tipps ? '' : ' hidden') + '>Die App zeigt höchstens ' + A5_MAX_TIPPS + ' Tipps, in dieser Reihenfolge, und betrachtet nur den Rest des Tages ab jetzt. Strand, Kiten sowie Ebbe und Flut kommen von Open-Meteo Marine und erscheinen nur an Orten am Meer.</p>';
    var vor = $$('h2.abschnitt-titel', s).filter(function (h) { return /^Aktuell-Kachel/.test(h.textContent.trim()); })[0];
    if (vor) vor.insertAdjacentHTML('beforebegin', html); else s.insertAdjacentHTML('beforeend', html);
    var sichtbar = function () { var x = startLesen(); $('#a5Groesse').hidden = !x.meteo; ['#a5ArtenTitel', '#a5Arten', '#a5ArtenHilfe'].forEach(function (id) { $(id).hidden = !x.tipps; }); };
    $('#a5Start').addEventListener('change', function (e) {
      var k = e.target.dataset.a5; if (!k) return;
      var x = startLesen(); x[k] = e.target.checked; startSchreiben(x); sichtbar();
      if (k === 'meteo' && !x.meteo) a5MgAbbauen();
    });
    $('[data-seg="a5groesse"]').addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      var x = startLesen(); x.groesse = b.dataset.v; startSchreiben(x);
      $$('[data-seg="a5groesse"] [data-v]').forEach(function (y) { y.setAttribute('aria-checked', String(y === b)); });
    });
    $('#a5Arten').addEventListener('change', function () { var x = startLesen(); x.arten = $$('#a5Arten input:checked').map(function (c) { return c.value; }); startSchreiben(x); });
  }

  /* === Welle 3 Gruppe 3: Webcams (18, B2/B4). ABGESCHALTET, bis die Betreiber schriftlich zusagen === */
  // Hauptschalter (Datei-Konstante, keine Nutzer-Einstellung). Solange false: Aussehen wie bisher (Hinweisliste „folgt nach Erlaubnis"),
  // KEINE Anfrage an fremde Server wegen Webcams. Vor dem Einschalten Kameras ohne Zusage aus WEBCAM_LISTE streichen.
  var WEBCAMS_FREIGABE = false;
  // Adresse des Zwischenspeichers (worker/mannheim-webcams.js), z. B. 'https://wpc-webcams.<konto>.workers.dev'. Leer: kein Film, keine Tagesübersicht, kein Rückblick.
  var WEBCAM_WORKER = '';
  // cacheBuster: true nur, wenn der Betreiber ausdrücklich erlaubt, ?t=<Minute> an die Bildadresse zu hängen. nurWorker: nur http, geht nicht direkt.
  var WEBCAM_LISTE = [
    { id: 'oststadt', name: 'Mannheim-Oststadt (Himmel)', kurz: 'Oststadt', live: 'https://klymiuk.info/wetter/webcam/webcam/current.jpg', quelle: 'Wetterstation Mannheim-Oststadt', seite: 'https://www.klymiuk.info/wetter/webcam.html', cacheBuster: false, takt: 15 },
    { id: 'seckenheim', name: 'Mannheim-Seckenheim (Skycam)', kurz: 'Seckenheim', live: 'https://www.mannheim-wetter.info/cam/cam1/mannheim-himmel-0.jpg', quelle: 'mannheim-wetter.info', seite: 'https://www.mannheim-wetter.info/cam/', cacheBuster: false, takt: 5 },
    { id: 'airport', name: 'City Airport Mannheim', kurz: 'Flugplatz', live: 'http://edfmcam.dyndns.org/record/current.jpg', quelle: 'City Airport Mannheim', seite: 'https://www.flugplatz-mannheim.de/', cacheBuster: false, takt: 1, nurWorker: true },
    { id: 'boxberg', name: 'Heidelberg-Boxberg, Blick Rheinebene', kurz: 'Boxberg', live: 'https://www.berghalde.com/picam/capt0001.jpg', quelle: 'berghalde.com', seite: 'https://www.berghalde.com/', cacheBuster: false, takt: 5 },
    { id: 'ladenburg', name: 'Ladenburg Wasserturm', kurz: 'Ladenburg', live: 'https://www.stadt-ladenburg.de/webcam/fetch.php', quelle: 'Stadt Ladenburg', seite: 'https://www.ladenburg.de/de/Aktuelles/Webcam', cacheBuster: false, takt: 1 },
    { id: 'edingen', name: 'Edingen-Neckarhausen (Neckar)', kurz: 'Edingen', live: 'https://ursel-hirsch-woelfl.de/edingen-neckarhausen.webcam.ftp/ftpData/current.jpg', quelle: 'Gemeinde Edingen-Neckarhausen', seite: 'https://www.edingen-neckarhausen.de/gemeinde/webcam', cacheBuster: false, takt: 1 }
  ];
  if (WEBCAMS_FREIGABE) WEBCAMS = WEBCAM_LISTE.filter(function (w) { return WEBCAM_WORKER || !w.nurWorker; });

  if (WEBCAMS_FREIGABE && WEBCAMS.length) (function () {
    var WC_ANSICHTEN = [['aktuell', 'Aktuell'], ['film', 'Film'], ['tag', 'Tag'], ['rueck', 'Rückblick']];
    var WC_STUNDEN = [[2, '2 h'], [6, '6 h'], [12, '12 h'], [24, '24 h']];
    var WC_TEMPO = [[0.5, '0,5×'], [1, '1×'], [2, '2×']];
    var wc = Object.assign({ kamera: WEBCAMS[0].id, ansicht: 'aktuell', stunden: 6, tempo: 1 }, speicher.lesen('wpc-webcam', {}));
    var wcArchiv = {}, wcTimer = null, wcNr = 0, wcSpielt = false;
    var wcSparen = function () { var v = speicher.lesen('wpc-datensparen', false); return !!v && v !== 'aus' && v !== 'false'; };   // Schalter baut Gruppe 2, hier nur lesen
    var wcKam = function () { return WEBCAMS.filter(function (w) { return w.id === wc.kamera; })[0] || WEBCAMS[0]; };
    webcamWahl = wcKam;
    var wcSichern = function () { speicher.schreiben('wpc-webcam', { kamera: wc.kamera, ansicht: wc.ansicht, stunden: wc.stunden, tempo: wc.tempo }); };
    var wcAnsicht = function () { return wcSparen() || (!WEBCAM_WORKER && wc.ansicht !== 'aktuell') ? 'aktuell' : wc.ansicht; };
    // Zeiten des Zwischenspeichers sind deutsche Ortszeit „JJJJ-MM-TTTHH:MM"; wir rechnen mit der Ortszeit als UTC-Zahl
    var wcMs = function (t) { var m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(t || ''); return m ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) : NaN; };
    var wcJetzt = function () { return wcMs(new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Berlin' }).replace(' ', 'T')); };
    var wcUhr = function (t) { return String(t).slice(11, 16); };
    var wcDatum = function (t) { return String(t).slice(8, 10) + '.' + String(t).slice(5, 7) + '.'; };
    // Live-Bild: über den Zwischenspeicher, sonst direkt beim Betreiber. Zeitstempel nur, wenn der Betreiber es erlaubt.
    function wcLiveUrl(w) {
      if (WEBCAM_WORKER) return WEBCAM_WORKER + '/webcam/live?kamera=' + encodeURIComponent(w.id);
      return w.live + (w.cacheBuster ? (w.live.indexOf('?') >= 0 ? '&' : '?') + 't=' + Math.floor(Date.now() / 60000) : '');
    }
    webcamBildUrl = wcLiveUrl;
    function wcHolen(w) {
      var a = wcArchiv[w.id];
      if (a && Date.now() - a.zeit < 5 * 60000) return a.versprechen;
      var v = fetch(WEBCAM_WORKER + '/webcam?kamera=' + encodeURIComponent(w.id)).then(function (r) { if (!r.ok) throw new Error('Archiv ' + r.status); return r.json(); }).then(function (j) {
        return (j.shots || []).map(function (s) { return { t: s.t, ms: wcMs(s.t), url: /^https?:/.test(s.url) ? s.url : WEBCAM_WORKER + s.url }; }).filter(function (s) { return !isNaN(s.ms); }).sort(function (x, y) { return x.ms - y.ms; });
      });
      wcArchiv[w.id] = { zeit: Date.now(), versprechen: v };
      v.catch(function () { delete wcArchiv[w.id]; });
      return v;
    }
    function wcStop() { if (wcTimer) { clearInterval(wcTimer); wcTimer = null; } }
    function wcFehler(text, neuKnopf) {
      return '<div class="wc-fehler" role="status">' + Ikon('camera') + '<p><b>Bild nicht verfügbar.</b><br>' + esc(text || 'Die Kamera antwortet gerade nicht.') + '</p>' + (neuKnopf === false ? '' : '<button type="button" class="button tippbar" data-wc-neu="1">Erneut versuchen</button>') + '</div>';
    }
    function wcKopfHtml() {
      var an = wcAnsicht(), w = wcKam();
      var chips = WEBCAMS.length > 1 ? '<div class="chips wc-chips" role="radiogroup" aria-label="Kamera wählen">' + WEBCAMS.map(function (k) {
        return '<button type="button" role="radio" class="chip tippbar" data-wc-kamera="' + esc(k.id) + '" aria-checked="' + (k.id === w.id) + '">' + esc(k.kurz || k.name) + '</button>'; }).join('') + '</div>' : '';
      var ansichtSeg = wcSparen() || !WEBCAM_WORKER ? '' : seg('wcansicht', an, WC_ANSICHTEN, 'Ansicht der Webcam');
      var sparHinweis = wcSparen() ? '<p class="info hilfe" id="wcSpar">Datensparmodus ist an: Die App zeigt nur das aktuelle Standbild.</p>' : (!WEBCAM_WORKER ? '<p class="info hilfe" id="wcSpar">Film, Tagesübersicht und Rückblick folgen, sobald der Zwischenspeicher für die Bilder läuft.</p>' : '');
      var stdSeg = an === 'rueck' ? seg('wcstunden', wc.stunden, WC_STUNDEN, 'Zeitraum des Rückblicks') : '';
      return chips + ansichtSeg + stdSeg + sparHinweis;
    }
    function wcKachelHtml() {
      var w = wcKam();
      return '<section class="kachel wc" id="wcKachel" aria-labelledby="wcTitel"><h2 class="kachel-titel" id="wcTitel">' + Ikon('camera') + 'Webcam</h2>' +
        '<div id="wcKopf">' + wcKopfHtml() + '</div><div class="wc-buehne" id="wcBuehne" aria-live="polite"></div><div id="wcSteuerung"></div>' +
        '<p class="wc-zeit zahl" id="wcZeit" aria-live="polite"></p>' +
        '<p class="wc-quelle" id="wcQuelle">Bild: <a href="' + esc(w.seite) + '" target="_blank" rel="noopener">' + esc(w.quelle) + ' ↗</a>. Die Rechte am Bild liegen beim Betreiber.</p></section>';
    }
    function wcQuelleAktualisieren() { var q = $('#wcQuelle'), w = wcKam(); if (q) q.innerHTML = 'Bild: <a href="' + esc(w.seite) + '" target="_blank" rel="noopener">' + esc(w.quelle) + ' ↗</a>. Die Rechte am Bild liegen beim Betreiber.'; }
    function wcZeit(t) { var z = $('#wcZeit'); if (z) z.textContent = t || ''; }
    // --- Ansicht „Aktuell": ein Standbild ---
    function wcAktuell() {
      var w = wcKam(), b = $('#wcBuehne'); $('#wcSteuerung').innerHTML = '';
      b.innerHTML = '<img class="wc-bild" referrerpolicy="no-referrer" decoding="async" alt="Webcam ' + esc(w.name) + ', aktuelles Bild" src="' + esc(wcLiveUrl(w)) + '">';
      wcZeit('Wird geladen …');
      var img = $('.wc-bild', b); img.addEventListener('load', function () { wcZeit('Abgerufen um ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }) + ' Uhr · neues Bild etwa alle ' + w.takt + ' Min.'); });
    }
    // --- Archiv laden, dann Ansicht zeichnen ---
    function wcMitArchiv(zeichne) {
      var w = wcKam(), nr = ++wcNr, b = $('#wcBuehne');
      b.innerHTML = '<p class="wc-lade">Bilder werden geladen …</p>'; $('#wcSteuerung').innerHTML = ''; wcZeit('');
      wcHolen(w).then(function (shots) { if (nr === wcNr && $('#wcBuehne')) zeichne(shots, w); }).catch(function () { if (nr === wcNr && $('#wcBuehne')) { $('#wcBuehne').innerHTML = wcFehler('Der Zwischenspeicher mit den älteren Bildern antwortet nicht.'); wcZeit(''); } });
    }
    // --- Film der letzten Stunde ---
    function wcFilm(shots, w) {
      var ab = wcJetzt() - 60 * 60000, f = shots.filter(function (s) { return s.ms >= ab; });
      var b = $('#wcBuehne');
      if (f.length < 2) { b.innerHTML = wcFehler('Für die letzte Stunde gibt es noch zu wenige Bilder (mindestens 2 nötig).', false); return; }
      f.forEach(function (s) { var i = new Image(); i.referrerPolicy = 'no-referrer'; i.src = s.url; });   // vorladen
      var nr = 0, reduziert = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      b.innerHTML = '<img class="wc-bild" referrerpolicy="no-referrer" decoding="async" alt="Webcam ' + esc(w.name) + ', Film der letzten Stunde" src="' + esc(f[0].url) + '">';
      $('#wcSteuerung').innerHTML = '<div class="wc-film"><button type="button" class="button tippbar" id="wcPlay" aria-label="Film pausieren">Pause</button>' +
        '<input type="range" id="wcRegler" min="0" max="' + (f.length - 1) + '" value="0" step="1" aria-label="Bild im Film wählen"></div>' + seg('wctempo', wc.tempo, WC_TEMPO, 'Tempo des Films');
      var zeige = function (i) { nr = i; var img = $('.wc-bild', b); if (img) img.src = f[i].url; $('#wcRegler').value = i; wcZeit('Aufnahme ' + wcUhr(f[i].t) + ' Uhr · Bild ' + (i + 1) + ' von ' + f.length); };
      var takt = function () { wcStop(); if (!wcSpielt) return; wcTimer = setInterval(function () { if (!$('#wcRegler') || document.hidden) return; zeige((nr + 1) % f.length); }, 900 / wc.tempo); };
      var spiele = function (an) { wcSpielt = an; var p = $('#wcPlay'); p.textContent = an ? 'Pause' : 'Abspielen'; p.setAttribute('aria-label', an ? 'Film pausieren' : 'Film abspielen'); takt(); };
      $('#wcPlay').addEventListener('click', function () { spiele(!wcSpielt); });
      $('#wcRegler').addEventListener('input', function (e) { zeige(+e.target.value); spiele(false); });
      b.wcTakt = takt;
      zeige(0); spiele(!reduziert);
    }
    // --- Streifen: Tagesübersicht (30-Minuten-Raster) und Rückblick ---
    function wcStreifen(f, raster, w, titel) {
      var b = $('#wcBuehne');
      if (!f.length) { b.innerHTML = wcFehler('Für diesen Zeitraum liegen noch keine Bilder vor.', false); return; }
      var zellen = raster || f.map(function (s) { return { t: s.t, s: s }; });
      var letzte = f[f.length - 1];
      b.innerHTML = '<img class="wc-bild" referrerpolicy="no-referrer" decoding="async" alt="Webcam ' + esc(w.name) + ', ' + esc(titel) + '" src="' + esc(letzte.url) + '">';
      $('#wcSteuerung').innerHTML = '<div class="wc-streifen" role="list" tabindex="0" aria-label="' + esc(titel) + ', nach rechts scrollen">' + zellen.map(function (z) {
        return z.s ? '<button type="button" role="listitem" class="wc-zelle tippbar" data-wc-url="' + esc(z.s.url) + '" data-wc-t="' + esc(z.s.t) + '" aria-label="Bild von ' + wcUhr(z.t) + ' Uhr"><img loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="" src="' + esc(z.s.url) + '"><span class="zahl">' + wcUhr(z.t) + '</span></button>'
          : '<div role="listitem" class="wc-zelle leer" aria-label="Kein Bild um ' + wcUhr(z.t) + ' Uhr"><span class="zahl">–</span><span class="zahl">' + wcUhr(z.t) + '</span></div>'; }).join('') + '</div>';
      wcZeit('Aufnahme ' + wcDatum(letzte.t) + ' ' + wcUhr(letzte.t) + ' Uhr · ' + f.length + ' Bilder');
      var str = $('.wc-streifen'); if (str) str.scrollLeft = str.scrollWidth;
    }
    function wcTag(shots, w) {
      var jetzt = wcJetzt(), d = new Date(jetzt).toISOString().slice(0, 10);
      var heute = shots.filter(function (s) { return s.t.slice(0, 10) === d; }), nach = {};
      heute.forEach(function (s) { nach[s.t.slice(11, 16)] = s; });
      var raster = [], ende = new Date(jetzt).getUTCHours() * 60 + (new Date(jetzt).getUTCMinutes() >= 30 ? 30 : 0);
      for (var m = 0; m <= ende; m += 30) { var k = ('0' + Math.floor(m / 60)).slice(-2) + ':' + (m % 60 ? '30' : '00'); raster.push({ t: d + 'T' + k, s: nach[k] }); }
      wcStreifen(heute, raster, w, 'Tagesübersicht heute in 30-Minuten-Schritten');
    }
    function wcRueck(shots, w) {
      var ab = wcJetzt() - wc.stunden * 3600000;
      wcStreifen(shots.filter(function (s) { return s.ms >= ab; }), null, w, 'Rückblick der letzten ' + wc.stunden + ' Stunden');
    }
    function wcZeichnen() {
      wcStop(); wcNr++; wcSpielt = false;
      var k = $('#wcKopf'); if (!k) return;
      k.innerHTML = wcKopfHtml(); wcQuelleAktualisieren();
      var an = wcAnsicht();
      if (an === 'aktuell') wcAktuell(); else wcMitArchiv(an === 'film' ? wcFilm : an === 'tag' ? wcTag : wcRueck);
    }
    function wcBinden() {
      var k = $('#wcKachel'); if (!k) return;
      k.addEventListener('click', function (e) {
        var c = e.target.closest('[data-wc-kamera]'), s = e.target.closest('[data-seg] [data-v]'), n = e.target.closest('[data-wc-neu]'), z = e.target.closest('[data-wc-url]');
        var fokus = function () { var f = c ? '[data-wc-kamera="' + c.dataset.wcKamera + '"]' : s ? '[data-seg="' + s.parentNode.dataset.seg + '"] [data-v="' + s.dataset.v + '"]' : null; var el = f && $(f, k); if (el) el.focus(); };
        if (c) { wc.kamera = c.dataset.wcKamera; wcSichern(); wcZeichnen(); fokus(); }
        else if (s) { var g = s.parentNode.dataset.seg; if (g === 'wcansicht') wc.ansicht = s.dataset.v; else if (g === 'wcstunden') wc.stunden = +s.dataset.v; else if (g === 'wctempo') { wc.tempo = +s.dataset.v; $$('[data-seg="wctempo"] [data-v]', k).forEach(function (y) { y.setAttribute('aria-checked', String(y === s)); }); wcSichern(); var bu = $('#wcBuehne'); if (bu && bu.wcTakt) bu.wcTakt(); return; } else return; wcSichern(); wcZeichnen(); fokus(); }
        else if (n) { delete wcArchiv[wcKam().id]; wcZeichnen(); }
        else if (z) { var im = $('#wcBuehne .wc-bild'); if (im) im.src = z.dataset.wcUrl; wcZeit('Aufnahme ' + wcDatum(z.dataset.wcT) + ' ' + wcUhr(z.dataset.wcT) + ' Uhr'); }
      });
      // Bilder, die nicht laden: ruhiger Zustand mit Wiederholen (Fehlerereignisse steigen nicht auf, deshalb in der Erfassungsphase)
      k.addEventListener('error', function (e) {
        var t = e.target; if (!t || t.tagName !== 'IMG') return;
        if (t.classList.contains('wc-bild')) { wcStop(); $('#wcBuehne').innerHTML = wcFehler(); wcZeit(''); }
        else { var z = t.closest('.wc-zelle'); if (z) { z.classList.add('leer'); t.remove(); } }
      }, true);
      wcZeichnen();
    }
    // Kachel in den Wetter-Tab setzen, vor die Tagesliste
    renderWetter = (function (alt) {
      return function () {
        wcStop(); wcSpielt = false; alt();
        var mk = $('#tab-wetter .mk-bild'); if (mk) mk.addEventListener('error', function () { var h = mk.parentNode; mk.remove(); h.insertAdjacentHTML('afterbegin', '<div class="mk-leer"><div>' + Ikon('camera') + '</div><p>Bild nicht verfügbar</p></div>'); });
        var s = $('#tab-wetter'), t = $('.tage', s); if (!s || !t || $('#wcKachel', s)) return;
        t.insertAdjacentHTML('beforebegin', wcKachelHtml()); wcBinden();
      };
    })(renderWetter);
    // Quellen und Datenschutz im Tab „Mehr"
    var wcQuellenZeilen = function () {
      return WEBCAMS.map(function (w) { return '<a class="tippbar" href="' + esc(w.seite) + '" target="_blank" rel="noopener"><span class="modell-text"><span>Webcam: ' + esc(w.quelle) + '</span><small class="leise">' + esc(w.name) + ', Rechte beim Betreiber</small></span><span aria-hidden="true">↗</span></a>'; }).join('');
    };
    quellenHtml = (function (alt) { return function () { return alt() + wcQuellenZeilen(); }; })(quellenHtml);
    renderMehr = (function (alt) {
      return function () {
        alt();
        var s = $('#tab-mehr'), t = $$('h2.abschnitt-titel', s).filter(function (h) { return h.textContent.trim() === 'Webcam'; })[0];
        var p = t && t.nextElementSibling && $('p', t.nextElementSibling);
        if (p) p.innerHTML = '<b>Mit Erlaubnis der Betreiber.</b> Auf der Startseite gibt es die Kachel „Webcam“. Die Bilder gehören den Betreibern; diese Kameras sind dabei:';
        var d = $('#datenschutz p', s);
        if (d && !$('#wcDatenschutz', s)) d.insertAdjacentHTML('afterend', '<p id="wcDatenschutz"><b>Webcam:</b> ' + (WEBCAM_WORKER ? 'Die Bilder holt die App über einen Zwischenspeicher bei Cloudflare (' + esc(WEBCAM_WORKER.replace(/^https?:\/\//, '')) + '). Der sieht deine IP-Adresse, und der Betreiber der Kamera sieht sie nicht.' : 'Die Bilder holt die App direkt beim Betreiber der Kamera. Der sieht deine IP-Adresse.') + ' Die App selbst speichert keine Webcam-Bilder.</p>');
      };
    })(renderMehr);
  })();

  /* === Welle 3 Wetter und Karte: Resttag-Tipps, Modellvergleich, Tagesdetail, Sonne und Mond, Meer, Calima, Kartensteuerung, Datensparmodus (16.10.2026) === */
  // Neue Einstellungen: wpc-datensparen (true/false, auch von der Webcam-Gruppe gelesen), wpc-calima {an, schwelle}, wpc-meer {an},
  // wpc-vergleich {an, modelle}, wpc-tempo ('0.5' | '1' | '2'), wpc-meerpunkt {Ort: [lat, lon]}, wpc-datensparen-gefragt.
  var w3Ikonen = {
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    wellen: '<path d="M2 8c2.5-2 4.5 2 7 0s4.5 2 7 0 4.5 2 6 0M2 14c2.5-2 4.5 2 7 0s4.5 2 7 0 4.5 2 6 0M2 20c2.5-2 4.5 2 7 0s4.5 2 7 0 4.5 2 6 0"/>'
  };
  var w3Ikon = function (n) { return w3Ikonen[n] ? '<svg class="ikon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + w3Ikonen[n] + '</svg>' : Ikon(n); };

  /* --- Einstellungen lesen --- */
  var w3Spar = function () { return speicher.lesen('wpc-datensparen', false) === true; };
  var w3Calima = function () { var s = speicher.lesen('wpc-calima', {}) || {}; return { an: s.an !== false, schwelle: [25, 50, 100].indexOf(+s.schwelle) >= 0 ? +s.schwelle : 50 }; };
  var w3MeerEinst = function () { var s = speicher.lesen('wpc-meer', {}) || {}; return { an: s.an !== false }; };
  var W3_VGL_STANDARD = ['best_match', 'ecmwf_ifs025', 'icon_seamless'];
  var w3Vgl = function () {
    var s = speicher.lesen('wpc-vergleich', {}) || {}, ids = MODELLE.map(function (m) { return m[0]; });
    var m = Array.isArray(s.modelle) ? s.modelle.filter(function (x, i, a) { return ids.indexOf(x) >= 0 && a.indexOf(x) === i; }).slice(0, 3) : [];
    return { an: s.an === true, modelle: m.length >= 2 ? m : W3_VGL_STANDARD };
  };
  var w3Tempo = function () { var t = String(speicher.lesen('wpc-tempo', '1')); return ['0.5', '1', '2'].indexOf(t) >= 0 ? t : '1'; };
  function w3TempoFaktor() { return 1 / +w3Tempo(); }
  function w3Dauer(min) { return min < 60 ? min + ' Minuten' : min === 60 ? '1 Stunde' : min % 60 === 0 ? (min / 60) + ' Stunden' : Math.floor(min / 60) + ' Std. ' + (min % 60) + ' Min.'; }

  /* --- Zeit-Helfer (Ortszeit der Daten) --- */
  var w3Jetzt = function () { return ((daten && daten.current && daten.current.time) || '').slice(0, 16); };
  function w3Idx(zeiten) { var j = w3Jetzt().slice(0, 13); for (var i = 0; i < zeiten.length; i++) if (zeiten[i].slice(0, 13) >= j) return i; return 0; }
  function w3TagWort(datum) {
    var diff = Math.round((a5Ms(datum + 'T00:00') - a5Ms(w3Jetzt().slice(0, 10) + 'T00:00')) / 864e5);
    return diff === 0 ? 'heute' : diff === 1 ? 'morgen' : teile(datum).wt;
  }
  var w3Nur = function (liste) { return liste.filter(function (v) { return v != null; }); };
  var w3Max = function (l) { l = w3Nur(l); return l.length ? Math.max.apply(null, l) : null; };
  var w3Min = function (l) { l = w3Nur(l); return l.length ? Math.min.apply(null, l) : null; };

  /* --- 1. „Was heute geht" nur für den Rest des Tages (ab der laufenden Stunde bis 24 Uhr); fehlen Stundenwerte, gelten die Tageswerte --- */
  function w3Rest(d, jetzt, heute, i) {
    var t = d.daily, h = d.hourly || {}, stunde = jetzt.slice(0, 13), idx = [];
    (h.time || []).forEach(function (z, k) { if (z.slice(0, 10) === heute && z.slice(0, 13) >= stunde) idx.push(k); });
    var tag = function (k) { return t[k] && t[k][i] != null ? t[k][i] : null; };
    var reihe = function (k) { if (!h[k] || !idx.length) return []; return w3Nur(idx.map(function (j) { return h[k][j]; })); };
    var temp = reihe('temperature_2m'), p = reihe('precipitation'), prob = reihe('precipitation_probability'), wind = reihe('wind_speed_10m'), uv = reihe('uv_index');
    var dir = null;
    if (wind.length && h.wind_direction_10m) {
      var best = -1; idx.forEach(function (j) { if (h.wind_speed_10m[j] != null && (best < 0 || h.wind_speed_10m[j] > h.wind_speed_10m[best])) best = j; });
      if (best >= 0) dir = h.wind_direction_10m[best];
    }
    var maxOr = function (l, ersatz) { return l.length ? Math.max.apply(null, l) : ersatz; };
    return {
      max: temp.length ? Math.max.apply(null, temp) : tag('temperature_2m_max'), min: temp.length ? Math.min.apply(null, temp) : tag('temperature_2m_min'),
      risiko: prob.length ? Math.max.apply(null, prob) : tag('precipitation_probability_max'),
      summe: p.length ? p.reduce(function (a, b) { return a + b; }, 0) : tag('precipitation_sum'),
      wind: maxOr(wind, tag('wind_speed_10m_max')), dir: wind.length ? dir : tag('wind_direction_10m_dominant'),
      uv: uv.length ? Math.max.apply(null, uv) : tag('uv_index_max')
    };
  }

  /* --- 2. Datensparmodus --- */
  function w3SparAnwenden() {
    var an = w3Spar();
    if (radarKarte) { radarKarte.setMaxZoom(an ? 9 : 15); if (an && radarKarte.getZoom() > 9) radarKarte.setZoom(9); }
    if (an) { satStopp(); clearInterval(radar.timer); playKnopf(false); }
    w3SteuerStand();
    if (aktiv === 'graphs' && daten) renderGraphs();
  }
  function w3SparSetzen(an) { speicher.schreiben('wpc-datensparen', !!an); w3SparAnwenden(); var c = $('#w3Liste [data-w3="spar"]'); if (c) c.checked = !!an; }
  function w3SparVorschlag() {
    var v = navigator.connection && navigator.connection.saveData;
    if (!v || w3Spar() || speicher.lesen('wpc-datensparen-gefragt', false) === true || $('#w3SparVorschlag')) return;
    var el = document.createElement('section');
    el.className = 'kachel w3-spar-vorschlag'; el.id = 'w3SparVorschlag'; el.setAttribute('aria-labelledby', 'w3SparT');
    el.innerHTML = '<p id="w3SparT"><b>Dein Gerät spart Daten.</b> Soll die App auch sparen? Dann zeigt sie keine Satellitenfilme, das Radar nur als Standbild und lädt weniger Kartenkacheln.</p>' +
      '<div class="w3-knoepfe"><button type="button" class="button tippbar" data-w3-spar="ja">Sparmodus einschalten</button><button type="button" class="button leise tippbar" data-w3-spar="nein">Nein, danke</button></div>';
    var haupt = $('main.inhalt'); haupt.insertBefore(el, haupt.firstChild);
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-w3-spar]'); if (!b) return;
      speicher.schreiben('wpc-datensparen-gefragt', true); if (b.dataset.w3Spar === 'ja') w3SparSetzen(true);
      el.remove(); toast(b.dataset.w3Spar === 'ja' ? 'Datensparmodus an' : 'Wie bisher, ohne Sparmodus');
    });
  }

  /* --- 3. Saharastaub (Calima) und Luftqualität (A9): ein Aufruf bei Open-Meteo Luftqualität, Felder dust (stündlich) und european_aqi, pm10, pm2_5, nitrogen_dioxide, ozone (aktuell) --- */
  var w3Staub = {};
  function w3StaubHolen(o) {
    var k = a5PosKey(o), m = w3Staub[k];
    if (m && (m.laedt || Date.now() - m.zeit < 3 * 3600e3)) return;
    w3Staub[k] = { laedt: true, zeit: 0, d: m && m.d, c: m && m.c };
    holeJson('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + o.lat + '&longitude=' + o.lon + '&current=european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone&hourly=dust&forecast_days=3&timezone=auto').then(function (r) {
      var h = r && r.hourly; w3Staub[k] = { zeit: Date.now(), d: h && h.dust && h.time ? h : null, c: r && r.current && r.current.european_aqi != null ? r.current : m && m.c }; w3ZusatzNeu(); a9LuftNeu();   // ohne neuen Messwert bleibt der alte
    }, function () { w3Staub[k] = { zeit: Date.now() - 2.5 * 3600e3, d: m && m.d, c: m && m.c }; });
  }
  var w3StaubWort = function (v) { return v < 50 ? 'klare Luft' : v < 150 ? 'leichter Dunst' : v < 300 ? 'Calima' : 'starke Calima'; };
  function w3CalimaHtml() {
    var e = w3Calima(), m = w3Staub[a5PosKey(ort)]; if (!e.an || !m || !m.d) return '';
    var h = m.d, i0 = w3Idx(h.time), ende = Math.min(h.time.length, i0 + 48), max = null, mi = -1;
    for (var i = i0; i < ende; i++) { var v = h.dust[i]; if (v != null && (max == null || v > max)) { max = v; mi = i; } }
    if (max == null || max < e.schwelle) return '';
    var jetzt = h.dust[i0], tag = h.time[mi].slice(0, 10);
    return '<section class="kachel w3-calima" id="w3Calima" aria-labelledby="w3CalimaT"><h2 class="kachel-titel" id="w3CalimaT">' + Ikon('cloud') + 'Saharastaub (Calima)</h2>' +
      '<p class="regen-satz">Staub in der Luft: bis ' + rund(max) + ' µg/m³ ' + w3TagWort(tag) + ' um ' + hm(h.time[mi]) + ' Uhr (' + w3StaubWort(max) + ').</p>' +
      '<p class="info">' + (jetzt != null ? 'Jetzt: ' + rund(jetzt) + ' µg/m³. ' : '') + 'Dein Schwellenwert steht bei ' + e.schwelle + ' µg/m³, du kannst ihn unter „Mehr“ ändern. Der Staub kann die Sicht trüben und Augen und Atemwege reizen.</p></section>';
  }

  /* --- 4. Meer: Wellen, Wassertemperatur, Gezeiten (Open-Meteo Marine); der Meerespunkt aus der Antwort wird je Ort gemerkt --- */
  var w3MeerD = {}, w3MeerPunkte = speicher.lesen('wpc-meerpunkt', {}) || {};
  function w3MeerHolen(o) {
    var k = a5PosKey(o), m = w3MeerD[k];
    if (!w3MeerEinst().an || a5Kueste[k] === false || (m && (m.laedt || Date.now() - m.zeit < 3 * 3600e3))) return;
    w3MeerD[k] = { laedt: true, zeit: 0, d: m && m.d };
    var p = w3MeerPunkte[k] || [o.lat, o.lon], felder = ['wave_height', 'wave_period', 'wave_direction', 'sea_surface_temperature', 'sea_level_height_msl'];
    holeJson('https://marine-api.open-meteo.com/v1/marine?latitude=' + p[0] + '&longitude=' + p[1] + '&hourly=' + felder.join(',') + '&timezone=auto&forecast_days=3').then(function (r) {
      var h = r && r.hourly, hat = !!h && h.time && felder.some(function (f) { return h[f] && h[f].some(function (v) { return v != null; }); });
      if (hat && r.latitude != null && r.longitude != null && !w3MeerPunkte[k]) { w3MeerPunkte[k] = [+Number(r.latitude).toFixed(3), +Number(r.longitude).toFixed(3)]; speicher.schreiben('wpc-meerpunkt', w3MeerPunkte); }
      w3MeerD[k] = { zeit: Date.now(), d: hat ? h : null }; w3ZusatzNeu();
    }, function () { w3MeerD[k] = { zeit: Date.now() - 2.5 * 3600e3, d: m && m.d }; });
  }
  var w3Breite = function (v, pos, neg) { return dez(Math.abs(v), 2) + '° ' + (v >= 0 ? pos : neg); };
  function w3MeerHtml() {
    var k = a5PosKey(ort), m = w3MeerD[k]; if (!w3MeerEinst().an || !m || !m.d) return '';
    var h = m.d, i0 = w3Idx(h.time), wert = function (f, i) { return h[f] && h[f][i] != null ? h[f][i] : null; };
    var wh = wert('wave_height', i0), wp = wert('wave_period', i0), wr = wert('wave_direction', i0), wt = wert('sea_surface_temperature', i0);
    var werte = '<dl class="w3-werte"><div><dt>Wellenhöhe</dt><dd>' + (wh == null ? '–' : dez(wh) + ' m') + '</dd></div><div><dt>Wellenperiode</dt><dd>' + (wp == null ? '–' : rund(wp) + ' s') + '</dd></div>' +
      '<div><dt>Wellen aus</dt><dd>' + (wr == null ? '–' : richtung(wr)) + '</dd></div><div><dt>Wasser</dt><dd>' + (wt == null ? '–' : rund(wt) + ' °C') + '</dd></div></dl>';
    var tide = '', sl = (h.sea_level_height_msl || []).slice(i0, i0 + 48);
    if (w3Nur(sl).length > 6) {
      var lo = w3Min(sl), hi = w3Max(sl), B = 320, H = 90, span = Math.max(.2, hi - lo), n = sl.length;
      var y = function (v) { return 8 + (hi - v) * (H - 16) / span; }, x = function (i) { return i * B / (n - 1); };
      var pfad = sl.map(function (v, i) { return v == null ? '' : (i && sl[i - 1] != null ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
      var g = a5Gezeiten({ time: h.time, sea_level_height_msl: h.sea_level_height_msl }, w3Jetzt());
      tide = '<svg class="w3-tide" viewBox="0 0 ' + B + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Wasserstand der nächsten 48 Stunden zwischen ' + dez(lo) + ' und ' + dez(hi) + ' Metern">' +
        (lo < 0 && hi > 0 ? '<line class="w3-null" x1="0" x2="' + B + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '"/>' : '') +
        '<path class="w3-tide-linie" d="' + pfad + '"/><line class="jetzt" x1="0" x2="0" y1="0" y2="' + H + '"/></svg>' +
        '<div class="w3-achse zahl" aria-hidden="true"><span>jetzt</span><span>' + teile(h.time[i0 + 24] || h.time[i0]).wt + ' ' + hm(h.time[i0 + 24] || h.time[i0]) + '</span><span>' + teile(h.time[i0 + n - 1]).wt + ' ' + hm(h.time[i0 + n - 1]) + '</span></div>' +
        '<p class="info">Wasserstand (Tide), ' + dez(lo).replace('-', '−') + ' bis ' + dez(hi).replace('-', '−') + ' m.' + (g.length ? ' Nächste ' + g.map(function (x) { return (x.flut ? 'Flut' : 'Ebbe') + ' gegen ' + hm(x.zeit) + ' Uhr'; }).join(', danach ') + '.' : '') + '</p>';
    }
    var pt = w3MeerPunkte[k];
    return '<section class="kachel w3-meer" id="w3Meer" aria-labelledby="w3MeerT"><h2 class="kachel-titel" id="w3MeerT">' + w3Ikon('wellen') + 'Meer</h2>' + werte + tide +
      (pt ? '<p class="info">Messpunkt im Meer: ' + w3Breite(pt[0], 'N', 'S') + ', ' + w3Breite(pt[1], 'O', 'W') + '. Quelle: Open-Meteo Marine.</p>' : '') + '</section>';
  }

  /* Calima- und Meer-Kachel unter „Was heute geht" (oder unter den Stunden) einsetzen; wird auch aufgerufen, wenn Daten nachträglich ankommen */
  function w3ZusatzNeu() {
    if (aktiv !== 'wetter' || !daten) return;
    var s = $('#tab-wetter'); if (!s) return;
    ['w3Calima', 'w3Meer'].forEach(function (id) { var e = document.getElementById(id); if (e) e.remove(); });
    var anker = $('#a5Tipps', s) || $('.w3-mond-kachel', s) || $('.tage', s) || $('.std', s), html = w3CalimaHtml() + w3MeerHtml();
    if (anker && html) anker.insertAdjacentHTML('afterend', html);
  }

  /* --- 5. Sonne und Mond lokal rechnen (Formeln nach SunCalc/Meeus, Genauigkeit wenige Minuten) --- */
  var W3G = Math.PI / 180, W3E = W3G * 23.4397;
  var w3Ra = function (l, b) { return Math.atan2(Math.sin(l) * Math.cos(W3E) - Math.tan(b) * Math.sin(W3E), Math.cos(l)); };
  var w3Dek = function (l, b) { return Math.asin(Math.sin(b) * Math.cos(W3E) + Math.cos(b) * Math.sin(W3E) * Math.sin(l)); };
  function w3SonnePos(d) {
    var M = W3G * (357.5291 + .98560028 * d), L = M + W3G * (1.9148 * Math.sin(M) + .02 * Math.sin(2 * M) + .0003 * Math.sin(3 * M)) + W3G * 102.9372 + Math.PI;
    return { dec: w3Dek(L, 0), ra: w3Ra(L, 0), dist: 149598000 };
  }
  function w3MondPos(d) {
    var L = W3G * (218.316 + 13.176396 * d), M = W3G * (134.963 + 13.064993 * d), F = W3G * (93.272 + 13.22935 * d);
    var l = L + W3G * 6.289 * Math.sin(M), b = W3G * 5.128 * Math.sin(F);
    return { ra: w3Ra(l, b), dec: w3Dek(l, b), dist: 385001 - 20905 * Math.cos(M) };
  }
  var w3Tage = function (ms) { return ms / 864e5 + 2440587.5 - 2451545; };
  function w3Hoehe(c, d, lat, lon) {   // Höhe über dem Horizont in Grad
    var H = W3G * (280.16 + 360.9856235 * d) + W3G * lon - c.ra, phi = W3G * lat;
    return Math.asin(Math.sin(phi) * Math.sin(c.dec) + Math.cos(phi) * Math.cos(c.dec) * Math.cos(H)) / W3G;
  }
  // Mondphase 0 (Neumond) … 0,5 (Vollmond) … 1; beleuchteter Anteil 0 … 1
  function w3MondPhase(ms) {
    var d = w3Tage(ms), s = w3SonnePos(d), m = w3MondPos(d);
    var phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
    var inc = Math.atan2(s.dist * Math.sin(phi), m.dist - s.dist * Math.cos(phi));
    var winkel = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
    return { phase: .5 + .5 * inc * (winkel < 0 ? -1 : 1) / Math.PI, anteil: (1 + Math.cos(inc)) / 2 };
  }
  var W3_PHASEN = ['Neumond', 'Zunehmende Sichel', 'Erstes Viertel', 'Zunehmender Mond', 'Vollmond', 'Abnehmender Mond', 'Letztes Viertel', 'Abnehmende Sichel'];
  var w3PhaseName = function (p) { return W3_PHASEN[Math.round(p * 8) % 8]; };
  function w3Versatz() {
    if (daten && isFinite(daten.utc_offset_seconds)) return daten.utc_offset_seconds / 60;
    var c = a5Ms(w3Jetzt()); return isNaN(c) ? 0 : Math.round((c - Date.now()) / 900000) * 15;
  }
  var w3Uhr = function (ms, versatz) { return ms == null ? '–' : new Date(ms + versatz * 60000).toISOString().slice(11, 16); };
  // Verlauf eines Tages (Ortszeit 0–24 Uhr) in 2-Minuten-Schritten: Höhe von Sonne und Mond
  function w3Verlauf(datum, versatz, lat, lon) {
    var p = datum.split('-'), start = Date.UTC(+p[0], +p[1] - 1, +p[2]) - versatz * 60000, ts = [], sonne = [], mond = [];
    for (var i = 0; i <= 720; i++) {
      var ms = start + i * 120000, d = w3Tage(ms);
      ts.push(ms); sonne.push(w3Hoehe(w3SonnePos(d), d, lat, lon)); mond.push(w3Hoehe(w3MondPos(d), d, lat, lon));
    }
    return { start: start, ts: ts, sonne: sonne, mond: mond };
  }
  // Zeitpunkte, an denen die Kurve die Schwelle nach oben (auf) oder nach unten (ab) kreuzt
  function w3Quer(ts, v, schwelle) {
    var auf = [], ab = [];
    for (var i = 1; i < v.length; i++) {
      var a = v[i - 1] - schwelle, b = v[i] - schwelle;
      if (a < 0 && b >= 0) auf.push(ts[i - 1] + (ts[i] - ts[i - 1]) * (-a) / (b - a));
      else if (a >= 0 && b < 0) ab.push(ts[i - 1] + (ts[i] - ts[i - 1]) * a / (a - b));
    }
    return { auf: auf.length ? auf[0] : null, ab: ab.length ? ab[ab.length - 1] : null };
  }
  function w3SonneMond(datum) {
    var lat = ort.lat, lon = ort.lon, versatz = w3Versatz(), v = w3Verlauf(datum, versatz, lat, lon);
    var noon = v.start + 12 * 3600e3, mp = w3MondPhase(noon);
    var hoechst = 0; v.sonne.forEach(function (h, i) { if (h > v.sonne[hoechst]) hoechst = i; });
    var weiter = function (kind) {   // nächster Voll- oder Neumond (Datum) in den nächsten 32 Tagen
      var vor = mp.phase;
      for (var n = 1; n <= 32; n++) {
        var q = w3MondPhase(noon + n * 864e5).phase;
        if (kind === 'voll' ? (vor < .5 && q >= .5) : q < vor - .5) return a5Plus(datum + 'T12:00', n * 1440).slice(0, 10);
        vor = q;
      }
      return null;
    };
    return {
      versatz: versatz, v: v, phase: mp, name: w3PhaseName(mp.phase), prozent: Math.round(mp.anteil * 100),
      sonne: w3Quer(v.ts, v.sonne, -.833), gold: { morgens: [w3Quer(v.ts, v.sonne, -4).auf, w3Quer(v.ts, v.sonne, 6).auf], abends: [w3Quer(v.ts, v.sonne, 6).ab, w3Quer(v.ts, v.sonne, -4).ab] },
      buerger: w3Quer(v.ts, v.sonne, -6), nautisch: w3Quer(v.ts, v.sonne, -12), astro: w3Quer(v.ts, v.sonne, -18),
      mond: w3Quer(v.ts, v.mond, .133), hoechst: { ms: v.ts[hoechst], grad: v.sonne[hoechst] }, voll: weiter('voll'), neu: weiter('neu')
    };
  }
  // Mondsymbol: beleuchteter Teil als Fläche (zunehmend rechts, abnehmend links)
  function w3MondSvg(phase) {
    var r = 18, k = Math.cos(2 * Math.PI * phase), rx = Math.abs(k) * r, zun = phase < .5;
    var lit = 'M0 ' + (-r) + ' A' + r + ' ' + r + ' 0 0 1 0 ' + r + ' A' + rx.toFixed(2) + ' ' + r + ' 0 0 ' + (k > 0 ? 0 : 1) + ' 0 ' + (-r) + ' Z';
    return '<svg class="w3-mond-bild" viewBox="-22 -22 44 44" role="img" aria-label="Mondphase"><circle class="w3-mond-dunkel" r="' + r + '"/><path class="w3-mond-hell" d="' + lit + '" transform="' + (zun ? '' : 'scale(-1 1)') + '"/></svg>';
  }
  var w3Zeitraum = function (a, b, vers) { return a == null || b == null ? '–' : w3Uhr(a, vers) + ' bis ' + w3Uhr(b, vers) + ' Uhr'; };
  // Sonnenbogen eines Tages als SVG (gemeinsam für Kachel und Blatt „Sonne“); jetztGrad ist nur für den heutigen Tag gesetzt
  function w3Bogen(m) {
    var v = m.v, vers = m.versatz, B = 320, H = 110, hmax = Math.max(20, m.hoechst.grad), jetzt = Date.now();
    var x = function (ms) { return (ms - v.start) / 864e5 * B; }, y = function (g) { return H - 14 - (g + 5) / (hmax + 5) * (H - 24); };
    var pfad = v.ts.map(function (ms, i) { return i % 3 ? '' : (i ? 'L' : 'M') + x(ms).toFixed(1) + ' ' + y(v.sonne[i]).toFixed(1); }).join(' ');
    var jetztHeute = jetzt >= v.start && jetzt < v.start + 864e5, jetztGrad = jetztHeute ? v.sonne[Math.round((jetzt - v.start) / 120000)] : null;
    return { jetztGrad: jetztGrad, svg: '<svg class="w3-bogen" viewBox="0 0 ' + B + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Sonnenbogen: Aufgang ' + w3Uhr(m.sonne.auf, vers) + ' Uhr, Untergang ' + w3Uhr(m.sonne.ab, vers) + ' Uhr' + (jetztGrad != null ? ', jetzt ' + rund(jetztGrad) + ' Grad über dem Horizont' : '') + '">' +
      '<line class="w3-horizont" x1="0" x2="' + B + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '"/><path class="w3-sonne-linie" d="' + pfad + '"/>' +
      (jetztGrad != null ? '<circle class="w3-sonne-jetzt" cx="' + x(jetzt).toFixed(1) + '" cy="' + y(jetztGrad).toFixed(1) + '" r="7"/>' : '') + '</svg>' };
  }
  var w3Lang = function (m) { var l = m.sonne.auf != null && m.sonne.ab != null ? Math.round((m.sonne.ab - m.sonne.auf) / 60000) : null; return l == null ? '–' : Math.floor(l / 60) + ' Std. ' + (l % 60) + ' Min.'; };
  var w3ZeileHtml = function (t, w) { return '<div><dt>' + t + '</dt><dd>' + w + '</dd></div>'; };
  function w3SonneHtml(datum) {
    var m = w3SonneMond(datum), vers = m.versatz, bo = w3Bogen(m), jetztGrad = bo.jetztGrad, zeile = w3ZeileHtml;
    return bo.svg +
      '<p class="info zahl">' + (jetztGrad != null ? 'Die Sonne steht jetzt ' + (jetztGrad >= 0 ? rund(jetztGrad) + ' Grad über dem Horizont.' : (rund(-jetztGrad) + ' Grad unter dem Horizont.')) : 'Sonnenbogen für ' + teile(datum).wt + ' ' + datumKurz(datum)) + '</p>' +
      '<dl class="werte w3-liste-werte">' + zeile('Sonnenaufgang', w3Uhr(m.sonne.auf, vers) + ' Uhr') + zeile('Sonnenuntergang', w3Uhr(m.sonne.ab, vers) + ' Uhr') +
      zeile('Tageslänge', w3Lang(m)) + zeile('Höchster Stand', w3Uhr(m.hoechst.ms, vers) + ' Uhr, ' + rund(m.hoechst.grad) + '°') +
      zeile('Goldene Stunde morgens', w3Zeitraum(m.gold.morgens[0], m.gold.morgens[1], vers)) + zeile('Goldene Stunde abends', w3Zeitraum(m.gold.abends[0], m.gold.abends[1], vers)) +
      zeile('Bürgerliche Dämmerung', 'ab ' + w3Uhr(m.buerger.auf, vers) + ' · bis ' + w3Uhr(m.buerger.ab, vers) + ' Uhr') +
      zeile('Nautische Dämmerung', 'ab ' + w3Uhr(m.nautisch.auf, vers) + ' · bis ' + w3Uhr(m.nautisch.ab, vers) + ' Uhr') +
      zeile('Astronomische Dämmerung', 'ab ' + w3Uhr(m.astro.auf, vers) + ' · bis ' + w3Uhr(m.astro.ab, vers) + ' Uhr') + '</dl>' +
      '<p class="info">Goldene Stunde: Die Sonne steht zwischen 6 Grad über und 4 Grad unter dem Horizont, das Licht ist warm und weich. Bei der astronomischen Dämmerung ist der Himmel ganz dunkel; im Sommer wird er in Deutschland nie so dunkel (dann steht „–“).</p>' +
      '<p class="info">Alles wird auf deinem Gerät berechnet, es ist kein Netzdienst nötig. Die Zeiten stimmen auf wenige Minuten. „–“ heißt: An diesem Tag gibt es das Ereignis nicht.</p>';
  }
  function w3MondHtml(datum) {
    var m = w3SonneMond(datum), vers = m.versatz, zeile = w3ZeileHtml;
    var d2 = function (a) { return a == null ? '–' : (+a.slice(8, 10)) + '.' + (+a.slice(5, 7)) + '.'; };
    return '<div class="w3-mond-kopf">' + w3MondSvg(m.phase.phase) + '<p class="regen-satz">' + m.name + '<br><span class="w3-leise">' + m.prozent + ' % beleuchtet</span></p></div>' +
      '<dl class="werte w3-liste-werte">' + zeile('Mondaufgang', w3Uhr(m.mond.auf, vers) + (m.mond.auf == null ? '' : ' Uhr')) + zeile('Monduntergang', w3Uhr(m.mond.ab, vers) + (m.mond.ab == null ? '' : ' Uhr')) +
      zeile('Nächster Vollmond', d2(m.voll)) + zeile('Nächster Neumond', d2(m.neu)) + '</dl>' +
      '<p class="info">Alles wird auf deinem Gerät berechnet, es ist kein Netzdienst nötig. Die Zeiten stimmen auf wenige Minuten. „–“ heißt: An diesem Tag gibt es das Ereignis nicht.</p>';
  }
  var w3Fokus = null;
  function w3Blatt(id, titel) {
    var d = document.getElementById(id);
    if (d) return d;
    d = document.createElement('dialog'); d.id = id; d.className = 'pc-blatt'; d.setAttribute('aria-labelledby', id + 'T');
    d.innerHTML = '<div class="pc-blatt-kopf"><h2 id="' + id + 'T">' + titel + '</h2><button type="button" class="pc-kopf-knopf tippbar" data-zu="1">Fertig</button></div><div class="pc-blatt-inhalt" id="' + id + 'Inhalt"></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) { if (e.target.closest('[data-zu]')) d.close(); });
    d.addEventListener('keydown', function (e) {   // Fokus kreist im Blatt (Durchgang 21.10.2026, Fund 12); Safari überspringt Knöpfe beim Tab, deshalb selbst weiterschalten
      if (e.key !== 'Tab') return;
      var f = $$('button:not([tabindex="-1"]), a[href], input, select, textarea, summary, [tabindex="0"]', d).filter(function (x) { return !x.disabled && x.getClientRects().length; }); if (!f.length) return;
      var i = f.indexOf(document.activeElement), n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i < 0 || i === f.length - 1 ? 0 : i + 1);
      e.preventDefault(); f[n].focus();
    });
    d.addEventListener('close', function () { if (w3Fokus && document.contains(w3Fokus) && !dialogOffen()) { try { w3Fokus.focus({ preventScroll: true }); } catch (x) { } } });
    return d;
  }
  function w3ModulBlatt(id, titel, html) {
    var d = w3Blatt(id, titel);
    if (!d.open && document.activeElement !== document.body) w3Fokus = document.activeElement;   // Safari fokussiert angetippte Knöpfe nicht: dann bleibt der Knopf aus dem Klick
    $('#' + id + 'Inhalt').innerHTML = html;
    if (!d.open) d.showModal();
    $('[data-zu]', d).focus();
  }
  function w3SonneBlatt(datum) { w3ModulBlatt('w3Sonne', 'Sonne', w3SonneHtml(datum)); }
  function w3MondBlatt(datum) { w3ModulBlatt('w3Mond', 'Mond', w3MondHtml(datum)); }
  function w3SonneKachel() {
    var heute = w3Jetzt().slice(0, 10); if (!heute) return '';
    var m = w3SonneMond(heute), bo = w3Bogen(m);
    return '<section class="kachel w3-sonne-kachel" aria-labelledby="w3SonneKachelT"><h2 class="kachel-titel" id="w3SonneKachelT">' + Ikon('sun') + 'Sonne</h2>' + bo.svg +
      '<p class="regen-satz">Sonne ↑ ' + w3Uhr(m.sonne.auf, m.versatz) + ' ↓ ' + w3Uhr(m.sonne.ab, m.versatz) + '<br><span class="w3-leise zahl">Tageslänge ' + w3Lang(m) + ' · Goldene Stunde abends ' + w3Zeitraum(m.gold.abends[0], m.gold.abends[1], m.versatz) + '</span></p>' +
      '<button type="button" class="button leise tippbar mehr-link" data-w3-sonne="' + heute + '" aria-haspopup="dialog">Sonne ausführlich</button></section>';
  }
  function w3MondKachel() {
    var heute = w3Jetzt().slice(0, 10); if (!heute) return '';
    var m = w3SonneMond(heute);
    return '<section class="kachel w3-mond-kachel" aria-labelledby="w3MondKachelT"><h2 class="kachel-titel" id="w3MondKachelT">' + Ikon('moon') + 'Mond</h2>' +
      '<div class="w3-mond-kopf">' + w3MondSvg(m.phase.phase) + '<p class="regen-satz">' + m.name + ', ' + m.prozent + '\u00a0%<br><span class="w3-leise zahl">Mondaufgang ' + w3Uhr(m.mond.auf, m.versatz) + ' · Monduntergang ' + w3Uhr(m.mond.ab, m.versatz) + '</span></p></div>' +
      '<button type="button" class="button leise tippbar mehr-link" data-w3-mond="' + heute + '" aria-haspopup="dialog">Mond ausführlich</button></section>';
  }

  /* --- 6. Tagesdetail: Blatt (am Mac Fenster) mit Nacht davor / Tag / Nacht danach, Stundenwerte, Sonne und Mond --- */
  var w3Seg = 'tag', w3TagNr = 0;
  var W3_SEGMENTE = [['n1', 'Nacht davor'], ['tag', 'Tag'], ['n2', 'Nacht danach']];
  function w3TagIndizes() { var t = daten.daily; return t.time.map(function (z, i) { return t.temperature_2m_max[i] == null ? -1 : i; }).filter(function (i) { return i >= 0; }); }
  function w3TageMarkieren() {
    var s = $('#tab-wetter'), idx = w3TagIndizes(), kachel = $('.tage', s); if (!kachel) return;
    $$('.tag', kachel).forEach(function (el, n) {
      if (idx[n] == null) return;
      el.setAttribute('role', 'button'); el.tabIndex = 0; el.dataset.w3Tag = idx[n]; el.setAttribute('aria-haspopup', 'dialog');
    });
    if (!$('.w3-tag-hilfe', kachel)) kachel.insertAdjacentHTML('beforeend', '<p class="info w3-tag-hilfe">' + tippe() + ' auf einen Tag für Stundenwerte, Sonne und Mond.</p>');
  }
  function w3SegFuer(zeit, auf, unter) {   // zu welchem Abschnitt gehört die Stunde?
    var s = zeit.slice(0, 13) + ':30';   // eine Stunde zählt zum Tag, wenn ihre Mitte zwischen Aufgang und Untergang liegt
    if (auf && s < auf) return 'n1';
    if (unter && s >= unter) return 'n2';
    return 'tag';
  }
  function w3TagFuellen() {
    var i = w3TagNr, t = daten.daily, h = daten.hourly, datum = t.time[i], auf = t.sunrise && t.sunrise[i], unter = t.sunset && t.sunset[i];
    var jetzt = w3Jetzt().slice(0, 13), zeilen = [];
    h.time.forEach(function (z, k) { if (z.slice(0, 10) === datum && w3SegFuer(z, auf, unter) === w3Seg) zeilen.push(k); });
    var wortTag = i === 0 ? 'Heute' : teile(datum).wt;
    var segName = W3_SEGMENTE.filter(function (x) { return x[0] === w3Seg; })[0][1];
    var summe = zeilen.length ? segName + ': Tief ' + rund(w3Min(zeilen.map(function (k) { return h.temperature_2m[k]; }))) + '°C · Hoch ' + rund(w3Max(zeilen.map(function (k) { return h.temperature_2m[k]; }))) + '°C · Regen ' + dez(zeilen.reduce(function (a, k) { return a + (h.precipitation[k] || 0); }, 0)) + ' mm' +
      (h.wind_speed_10m ? ' · Wind bis ' + windTxt(w3Max(zeilen.map(function (k) { return h.wind_speed_10m[k]; }))) : '') : 'Für diesen Abschnitt gibt es keine Stundenwerte.';
    var sm = w3SonneMond(datum);
    var liste = zeilen.map(function (k) {
      var vorbei = h.time[k].slice(0, 13) < jetzt;
      return '<li class="w3-std-zeile' + (vorbei ? ' vorbei' : '') + '"><span class="zahl w3-z">' + hm(h.time[k]) + '</span>' + sym(wArt(h.weather_code[k], h.is_day[k]), 'w3-sym', wText(h.weather_code[k], h.is_day[k])) +
        '<span class="zahl w3-t">' + rund(h.temperature_2m[k]) + '°C</span><span class="zahl w3-r">' + dez(h.precipitation[k]) + ' mm' + (h.precipitation_probability && h.precipitation_probability[k] != null ? ' · ' + rund(h.precipitation_probability[k]) + ' %' : '') + '</span>' +
        '<span class="zahl w3-w">' + (h.wind_speed_10m && h.wind_speed_10m[k] != null ? windTxt(h.wind_speed_10m[k]) + ' ' + richtung(h.wind_direction_10m && h.wind_direction_10m[k]) : '–') + '</span></li>';
    }).join('');
    $('#w3TagT').textContent = wortTag + ' ' + datumKurz(datum);
    $('#w3TagInhalt').innerHTML = '<p class="regen-satz">' + esc(wText(t.weather_code[i], 1)) + ', ' + rund(t.temperature_2m_min[i]) + ' bis ' + rund(t.temperature_2m_max[i]) + '°C</p>' +
      seg('w3tag', w3Seg, W3_SEGMENTE, 'Abschnitt des Tages') + '<p class="info zahl w3-summe" aria-live="polite">' + summe + '</p>' +
      '<ul class="w3-std-liste" aria-label="Stundenwerte">' + liste + '</ul>' +
      '<h3 class="w3-h3">Sonne</h3><dl class="werte w3-liste-werte"><div><dt>Auf und unter</dt><dd class="zahl">↑ ' + (auf ? hm(auf) : '–') + ' ↓ ' + (unter ? hm(unter) : '–') + '</dd></div></dl>' +
      '<button type="button" class="button leise tippbar mehr-link" data-w3-sonne="' + datum + '" aria-haspopup="dialog">Sonne ausführlich</button>' +
      '<h3 class="w3-h3">Mond</h3><dl class="werte w3-liste-werte"><div><dt>Phase</dt><dd>' + sm.name + ', ' + sm.prozent + ' %</dd></div>' +
      '<div><dt>Auf und unter</dt><dd class="zahl">↑ ' + w3Uhr(sm.mond.auf, sm.versatz) + ' ↓ ' + w3Uhr(sm.mond.ab, sm.versatz) + '</dd></div></dl>' +
      '<button type="button" class="button leise tippbar mehr-link" data-w3-mond="' + datum + '" aria-haspopup="dialog">Mond ausführlich</button>';
  }
  function w3TagBlatt(i) {
    if (!daten) return;
    var d = w3Blatt('w3Tag', 'Tag');
    if (!d.dataset.gebunden) {
      d.dataset.gebunden = '1';
      d.addEventListener('click', function (e) {
        var b = e.target.closest('[data-seg="w3tag"] [data-v]');
        if (b) { w3Seg = b.dataset.v; w3TagFuellen(); var n = $('[data-seg="w3tag"] [aria-checked="true"]', d); if (n) n.focus(); return; }
        var so = e.target.closest('[data-w3-sonne]'); if (so) return w3SonneBlatt(so.dataset.w3Sonne);
        var m = e.target.closest('[data-w3-mond]'); if (m) w3MondBlatt(m.dataset.w3Mond);
      });
    }
    w3Fokus = document.activeElement; w3TagNr = i;
    // Standard: bei „heute" der Abschnitt, in dem jetzt ist; sonst der Tag
    var t = daten.daily; w3Seg = i === 0 ? w3SegFuer(w3Jetzt(), t.sunrise && t.sunrise[0], t.sunset && t.sunset[0]) : 'tag';
    w3TagFuellen(); d.showModal(); $('[data-zu]', d).focus();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-w3-tag]'); if (t && daten) return w3TagBlatt(+t.dataset.w3Tag);
    var so = e.target.closest('#tab-wetter [data-w3-sonne]'); if (so) { w3Fokus = so; return w3SonneBlatt(so.dataset.w3Sonne); }
    var m = e.target.closest('#tab-wetter [data-w3-mond]'); if (m) { w3Fokus = m; w3MondBlatt(m.dataset.w3Mond); }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.tag[data-w3-tag]')) { e.preventDefault(); e.target.click(); }
  });

  /* --- Wetter-Tab: Tage antippbar, Calima/Meer unter „Was heute geht", Kacheln „Sonne“ und „Mond“ --- */
  renderWetter = (function (alt) {
    return function () {
      alt();
      var s = $('#tab-wetter'); if (!s || !daten) return;
      try {
        w3TageMarkieren();
        var tage = $('.tage', s); if (tage && !$('.w3-mond-kachel', s)) tage.insertAdjacentHTML('afterend', w3SonneKachel() + w3MondKachel());
        w3StaubHolen(ort); w3MeerHolen(ort); w3ZusatzNeu();
      } catch (e) { console.error('Welle 3 Wetter', e); }
    };
  })(renderWetter);

  /* --- 7. Modellvergleich im Tab „Graphs" (Kurve): 2–3 Modelle, Linien mit Farbe und Strichart --- */
  var w3VglCache = {}, w3VglNr = 0;
  var W3_LINIEN = [['var(--akzent)', '', 'durchgezogen'], ['var(--w3-linie-2)', '9 5', 'gestrichelt'], ['var(--w3-linie-3)', '2 5', 'gepunktet']];
  function w3VglHole(id) {
    var k = a5PosKey(ort) + '|' + id, c = w3VglCache[k];
    if (c && Date.now() - c.zeit < 30 * 60000) return Promise.resolve(c.d);
    return holeJson('https://api.open-meteo.com/v1/forecast?latitude=' + ort.lat + '&longitude=' + ort.lon + '&hourly=temperature_2m,precipitation&forecast_days=3&timezone=auto&models=' + id).then(function (r) {
      var h = r && r.hourly; if (!h || !h.time || !h.temperature_2m) throw new Error('keine Werte');
      w3VglCache[k] = { zeit: Date.now(), d: h }; return h;
    });
  }
  function w3Kurven(serien, zeit, B, H, ganzNull, einheit) {
    var l = 34, r = 10, o = 10, u = 26, n = zeit.length, alle = [];
    serien.forEach(function (s) { s.werte.forEach(function (v) { if (v != null) alle.push(v); }); });
    var lo = Math.floor(Math.min.apply(null, alle) - (ganzNull ? 0 : 1)), hi = Math.ceil(Math.max.apply(null, alle) + (ganzNull ? 0 : 1));
    if (ganzNull) { lo = 0; hi = Math.max(2, hi); }
    var x = function (i) { return l + i * (B - l - r) / (n - 1); }, y = function (v) { return o + (hi - v) * (H - o - u) / (hi - lo); };
    var schritt = Math.max(1, Math.round((hi - lo) / 4)), gitter = '';
    for (var t = Math.ceil(lo); t <= hi; t += schritt) gitter += '<line class="gitter" x1="' + l + '" x2="' + (B - r) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text x="' + (l - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t + einheit + '</text>';
    var takt = B < 520 ? 12 : 6, achse = zeit.map(function (z, i) { return i % takt === 0 ? '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + hm(z) + '</text>' : ''; }).join('');
    var linien = serien.map(function (s, si0) {
      var si = s.stil != null ? s.stil : si0;
      var pfad = s.werte.map(function (v, i) { return v == null ? '' : (i && s.werte[i - 1] != null ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
      return '<path class="w3-linie" d="' + pfad + '" style="stroke:' + W3_LINIEN[si][0] + '" stroke-dasharray="' + W3_LINIEN[si][1] + '"/>';
    }).join('');
    return { svg: gitter + linien + '<line class="jetzt" x1="' + x(0) + '" x2="' + x(0) + '" y1="' + o + '" y2="' + (H - u) + '"/>' + achse };
  }
  function w3VglHtml() {
    var v = w3Vgl(), spar = w3Spar();
    var kopf = '<label class="tippbar w3-schalter"><span class="modell-text"><span id="w3VglT">Modelle vergleichen</span><small class="leise">' + (spar ? 'Im Datensparmodus aus. Du kannst ihn unter „Mehr“ ausschalten.' : 'Zeigt 2 bis 3 Wettermodelle als eigene Linien, für Temperatur und Regen') + '</small></span>' +
      '<input type="checkbox" role="switch" id="w3VglAn"' + (v.an && !spar ? ' checked' : '') + (spar ? ' disabled' : '') + ' aria-labelledby="w3VglT"></label>';
    if (!v.an || spar) return '<section class="kachel w3-vgl" id="w3Vgl">' + kopf + '</section>';
    var chips = MODELLE.map(function (m) {
      var pos = v.modelle.indexOf(m[0]);
      return '<button type="button" class="chip tippbar w3-chip" data-w3-modell="' + m[0] + '" aria-pressed="' + (pos >= 0) + '">' + (pos >= 0 ? '<svg class="w3-chip-linie" viewBox="0 0 28 10" aria-hidden="true"><line x1="2" x2="26" y1="5" y2="5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="' + W3_LINIEN[pos][1] + '"/></svg>' : '') + esc(m[1]) + '</button>';
    }).join('');
    return '<section class="kachel w3-vgl" id="w3Vgl">' + kopf + '<div class="chips w3-chips" role="group" aria-label="Modelle zum Vergleichen">' + chips + '</div>' +
      '<p class="info">Wähle 2 bis 3 Modelle. Die Reihenfolge der Wahl bestimmt Farbe und Strichart.</p><div id="w3VglBild" aria-live="polite"><p class="info">Lade Modelle …</p></div></section>';
  }
  function w3VglEinsetzen() {
    var seite = $('#tab-graphs'), karte = $('.kachel.graph', seite); if (!karte) return;
    var alt = $('#w3Vgl', seite); if (alt) alt.remove();
    karte.insertAdjacentHTML('afterend', w3VglHtml());
    var v = w3Vgl(); if (!v.an || w3Spar()) return;
    var nr = ++w3VglNr, ziel = $('#w3VglBild', seite);
    Promise.all(v.modelle.map(function (id) { return w3VglHole(id).then(function (h) { return { id: id, h: h }; }, function (e) { return { id: id, fehler: e }; }); })).then(function (erg) {
      if (nr !== w3VglNr || !document.contains(ziel)) return;
      var start = daten.hourly.time[stundenIndex()], ok = [], fehler = [];
      erg.forEach(function (x) {
        var name = (MODELLE.filter(function (m) { return m[0] === x.id; })[0] || [x.id, x.id])[1];
        if (x.fehler) return fehler.push(name);
        var i0 = x.h.time.indexOf(start); if (i0 < 0) i0 = w3Idx(x.h.time);
        var temp = x.h.temperature_2m.slice(i0, i0 + 48), regen = x.h.precipitation.slice(i0, i0 + 48), zeit = x.h.time.slice(i0, i0 + 48), sum = 0;
        var n = temp.indexOf(null); if (n > 1) { temp = temp.slice(0, n); regen = regen.slice(0, n); zeit = zeit.slice(0, n); }
        var kum = regen.map(function (r) { sum += r || 0; return Math.round(sum * 10) / 10; });
        ok.push({ id: x.id, name: name, temp: temp, kum: kum, zeit: zeit, stil: v.modelle.indexOf(x.id) });
      });
      if (!ok.length) { ziel.innerHTML = '<p class="info">Die Modelle sind gerade nicht erreichbar. Bitte später noch einmal versuchen.</p>'; return; }
      var n = Math.min.apply(null, ok.map(function (o) { return o.temp.length; })), B = Math.max(280, Math.round(($('#w3Vgl', seite).clientWidth || 358) - 32)), H = Math.round(Math.min(grafHoeheMax(), Math.max(190, B * .55)));
      var zeit = ok[0].zeit.slice(0, n);
      // die Strichart folgt der Reihenfolge der Wahl, auch wenn ein Modell ausfällt
      var kT = w3Kurven(ok.map(function (o) { return { werte: o.temp.slice(0, n), stil: o.stil }; }), zeit, B, H, false, '°'), kR = w3Kurven(ok.map(function (o) { return { werte: o.kum.slice(0, n), stil: o.stil }; }), zeit, B, H, true, '');
      var legende = '<ul class="w3-legende" aria-label="Legende">' + ok.map(function (o) {
        return '<li><svg viewBox="0 0 30 10" width="30" height="10" aria-hidden="true"><line x1="2" x2="28" y1="5" y2="5" style="stroke:' + W3_LINIEN[o.stil][0] + '" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="' + W3_LINIEN[o.stil][1] + '"/></svg><span>' + esc(o.name) + ' <small>(' + W3_LINIEN[o.stil][2] + ')</small></span></li>';
      }).join('') + '</ul>';
      var tabelle = '<table class="w3-tabelle"><caption>Die nächsten ' + n + ' Stunden</caption><thead><tr><th scope="col">Modell</th><th scope="col">Tief</th><th scope="col">Hoch</th><th scope="col">Regen</th></tr></thead><tbody>' + ok.map(function (o) {
        return '<tr><th scope="row">' + esc(o.name) + '</th><td class="zahl">' + rund(w3Min(o.temp.slice(0, n))) + '°C</td><td class="zahl">' + rund(w3Max(o.temp.slice(0, n))) + '°C</td><td class="zahl">' + dez(o.kum[n - 1]) + ' mm</td></tr>';
      }).join('') + '</tbody></table>';
      ziel.innerHTML = '<h2 class="kachel-titel w3-titel">' + Ikon('chart') + 'Temperatur im Vergleich</h2><div class="graph w3-graph"><svg viewBox="0 0 ' + B + ' ' + H + '" role="img" aria-label="Temperatur der Modelle im Vergleich, ' + ok.map(function (o) { return o.name + ' ' + rund(w3Min(o.temp.slice(0, n))) + ' bis ' + rund(w3Max(o.temp.slice(0, n))) + ' Grad'; }).join('; ') + '">' + kT.svg + '</svg></div>' +
        '<h2 class="kachel-titel w3-titel">' + Ikon('tropfen') + 'Regen im Vergleich (aufsummiert, mm)</h2><div class="graph w3-graph"><svg viewBox="0 0 ' + B + ' ' + H + '" role="img" aria-label="Regensumme der Modelle im Vergleich, ' + ok.map(function (o) { return o.name + ' ' + dez(o.kum[n - 1]) + ' Millimeter'; }).join('; ') + '">' + kR.svg + '</svg></div>' +
        legende + tabelle + (fehler.length ? '<p class="info">Gerade nicht erreichbar: ' + esc(fehler.join(', ')) + '.</p>' : '') +
        '<p class="info">Modelle rechnen unterschiedlich. Liegen die Linien nah beieinander, ist die Vorhersage sicher; gehen sie auseinander, ist sie unsicher.</p>';
    });
  }
  renderGraphs = (function (alt) { return function () { alt(); if (daten && graphsModus() === 'kurve') { try { w3VglEinsetzen(); } catch (e) { console.error('Welle 3 Modellvergleich', e); } } }; })(renderGraphs);
  $('#tab-graphs').addEventListener('change', function (e) {
    if (e.target.id !== 'w3VglAn') return;
    var v = w3Vgl(); speicher.schreiben('wpc-vergleich', { an: e.target.checked, modelle: v.modelle });
    renderGraphs(); var n = $('#w3VglAn'); if (n) n.focus();
  });
  $('#tab-graphs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-w3-modell]'); if (!b) return;
    var v = w3Vgl(), id = b.dataset.w3Modell, m = v.modelle.slice(), i = m.indexOf(id);
    if (i >= 0) { if (m.length <= 2) return hinweisKurz('Mindestens 2 Modelle bleiben zum Vergleichen.'); m.splice(i, 1); }
    else { if (m.length >= 3) m.shift(); m.push(id); }
    speicher.schreiben('wpc-vergleich', { an: true, modelle: m });
    renderGraphs(); var n = $('[data-w3-modell="' + id + '"]'); if (n) n.focus();
  });

  /* --- 8. Kartensteuerung (Rad/Sat und Karte): Ebenen-Chips mit Pfeiltasten, Zoom-Knöpfe 44 px, Zeitleiste, Film-Tempo --- */
  function w3ZoomSteuerung() {
    var C = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function (karte) {
        var div = L.DomUtil.create('div', 'w3-zoom'); div.setAttribute('role', 'group'); div.setAttribute('aria-label', 'Zoom der Karte');
        div.innerHTML = '<button type="button" class="w3-zoom-knopf tippbar" data-z="1" aria-label="Karte vergrößern">' + w3Ikon('plus') + '</button><button type="button" class="w3-zoom-knopf tippbar" data-z="-1" aria-label="Karte verkleinern">' + w3Ikon('minus') + '</button>';
        L.DomEvent.disableClickPropagation(div); L.DomEvent.disableScrollPropagation(div);
        var plus = $('[data-z="1"]', div), minus = $('[data-z="-1"]', div);
        var stand = function () { plus.disabled = karte.getZoom() >= karte.getMaxZoom(); minus.disabled = karte.getZoom() <= karte.getMinZoom(); };
        div.addEventListener('click', function (e) { var b = e.target.closest('[data-z]'); if (!b || b.disabled) return; if (b.dataset.z === '1') karte.zoomIn(); else karte.zoomOut(); });
        karte.on('zoomend zoomlevelschange', stand); stand();
        return div;
      }
    });
    return new C();
  }
  grundKarte = (function (alt) {
    return function (el, zoom) {
      var k = alt(el, zoom);
      if (el && el.id === 'radarKarte') {
        if (k.zoomControl) k.zoomControl.remove();
        if (w3Spar()) k.setMaxZoom(9);   // Datensparmodus: weniger Zoomstufen, weniger Kartenkacheln
        w3ZoomSteuerung().addTo(k);
      }
      return k;
    };
  })(grundKarte);
  function w3SteuerStand() {
    var st = $('#w3Steuer'); if (!st) return;
    var spar = w3Spar(), film = ebene === 'radar' ? radar.frames : ohneFilm() ? [] : satFilm.frames, z = $('#w3Zeit'), n = film.length;
    st.hidden = ohneFilm() || spar;
    var hinweis = $('#w3SparHinweis'); if (hinweis) hinweis.hidden = !spar || ohneFilm();
    var p = $('#radarPlay'); if (p && (spar || ohneFilm())) p.hidden = true;   // Standbild statt Film
    z.max = Math.max(0, n - 1); z.disabled = n < 2; z.value = ebene === 'radar' ? radar.i : satFilm.i;
    var zeit = $('#radarZeit'); z.setAttribute('aria-valuetext', zeit && zeit.textContent ? zeit.textContent : 'Bild ' + (+z.value + 1) + ' von ' + n);
    $('#w3ZeitHilfe').textContent = ebene === 'radar' ? (n > 1 ? 'Ziehe den Regler oder nutze die Pfeiltasten, um Bild für Bild durch die letzten 2 Stunden zu gehen.' : 'Das Radar lädt noch.') :
      (n > 1 ? 'Ziehe den Regler, um Bild für Bild durch die letzten 2 Stunden zu gehen.' : '„Abspielen“ lädt zuerst die Bilder der letzten 2 Stunden, danach kannst du hier Bild für Bild schauen.');
  }
  function w3SteuerBauen() {
    var s = $('#tab-radsat'); if (!s) return;
    if (!$('#w3Steuer', s)) {
      var fuss = $('.karte-fuss', s); if (!fuss) return;
      fuss.insertAdjacentHTML('afterend', '<div class="w3-steuer" id="w3Steuer"><div class="w3-zeile"><span class="w3-label" id="w3ZeitL">Zeit</span><input type="range" id="w3Zeit" min="0" max="0" value="0" step="1" disabled aria-labelledby="w3ZeitL" aria-describedby="w3ZeitHilfe"></div>' +
        '<div class="w3-zeile"><span class="w3-label" id="w3TempoL">Tempo</span>' + seg('w3tempo', w3Tempo(), [['0.5', '0,5×'], ['1', '1×'], ['2', '2×']], 'Tempo des Films') + '</div><p class="info" id="w3ZeitHilfe"></p></div>' +
        '<p class="info w3-spar-hinweis" id="w3SparHinweis" hidden>Datensparmodus: Radar und Satellit zeigen nur das neueste Bild. Du kannst ihn unter „Mehr“ ausschalten.</p>');
      $('#w3Zeit').addEventListener('input', function (e) {
        var wert = +e.target.value, spielt = $('#radarPlay').getAttribute('aria-pressed') === 'true';
        if (spielt) radarAbspielen();   // Ziehen hält den Film an
        if (ebene === 'radar') { radar.i = wert; radarZeigen(); } else if (satFilm.frames.length) { satFilm.i = wert; satFrameZeigen(); }
        w3SteuerStand();
      });
      $('[data-seg="w3tempo"]').addEventListener('click', function (e) {
        var b = e.target.closest('[data-v]'); if (!b) return;
        speicher.schreiben('wpc-tempo', b.dataset.v);
        $$('[data-seg="w3tempo"] [data-v]').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
        if ($('#radarPlay').getAttribute('aria-pressed') === 'true') { radarAbspielen(); radarAbspielen(); }   // Film mit neuem Tempo neu starten
      });
      $('#ebenenWahl').addEventListener('keydown', function (e) {   // Pfeiltasten wechseln die Ebene
        var pfeil = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!pfeil) return;
        var chips = $$('#ebenenWahl [data-ebene]'), i = chips.findIndex(function (c) { return c === document.activeElement; });
        if (i < 0) i = chips.findIndex(function (c) { return c.dataset.ebene === ebene; });
        var n = chips[(i + pfeil + chips.length) % chips.length]; e.preventDefault(); n.click(); n.focus();
      });
    }
    w3SteuerStand();
  }
  renderRadsat = (function (alt) { return function () { alt(); w3SteuerBauen(); }; })(renderRadsat);
  ebeneZeigen = (function (alt) { return function () { alt(); w3SteuerStand(); }; })(ebeneZeigen);
  radarZeigen = (function (alt) { return function () { alt(); w3SteuerStand(); }; })(radarZeigen);
  satFrameZeigen = (function (alt) { return function () { alt(); w3SteuerStand(); }; })(satFrameZeigen);

  /* --- 9. Tab „Mehr": Abschnitt „Wetter und Karte" mit Datensparmodus, Meer und Calima; Quelle und Datenschutz --- */
  renderMehr = (function (alt) { return function () { alt(); w3Mehr(); }; })(renderMehr);
  quellenHtml = (function (alt) {
    return function () {
      return alt() + '<a class="tippbar" href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noopener"><span class="modell-text"><span>Saharastaub: Open-Meteo Luftqualität</span><small class="leise">Staub in der Luft (CAMS), CC BY 4.0</small></span><span aria-hidden="true">↗</span></a>';
    };
  })(quellenHtml);
  function w3Mehr() {
    var s = $('#tab-mehr'), c = w3Calima(), m = w3MeerEinst();
    var schalter = function (k, titel, text, an) { return '<label class="tippbar"><span class="modell-text"><span>' + titel + '</span><small class="leise">' + text + '</small></span><input type="checkbox" role="switch" data-w3="' + k + '"' + (an ? ' checked' : '') + '></label>'; };
    var html = '<h2 class="abschnitt-titel" id="w3Titel">Wetter und Karte</h2><div class="liste a5-liste" id="w3Liste">' +
      schalter('spar', 'Datensparmodus', 'Weniger und kleinere Abrufe: keine Satellitenfilme, Radar nur als Standbild, kein Modellvergleich, weniger Kartenkacheln', w3Spar()) +
      schalter('meer', 'Meer-Kachel', 'Wellen, Wassertemperatur und Gezeiten auf der Startseite, nur an Küstenorten', m.an) +
      schalter('calima', 'Saharastaub-Hinweis (Calima)', 'Eine Kachel auf der Startseite, wenn in den nächsten 48 Stunden viel Staub erwartet wird', c.an) + '</div>' +
      '<div class="kachel a5-groesse" id="w3Schwelle"' + (c.an ? '' : ' hidden') + '><p class="a5-groesse-titel">Schwelle für den Staub-Hinweis in µg/m³</p>' +
      seg('w3schwelle', c.schwelle, [['25', '25 früh'], ['50', '50 Standard'], ['100', '100 stark']], 'Schwelle für den Staub-Hinweis') +
      '<p class="info">Vorschlag 50: Das ist der EU-Grenzwert für Feinstaub (PM10) im Tagesmittel, ab hier ist der Himmel meist merklich milchig. 25 meldet früher, 100 nur bei deutlicher Calima.</p></div>';
    var vor = $('#a5StartTitel', s) || $$('h2.abschnitt-titel', s).filter(function (h) { return /^Aktuell-Kachel/.test(h.textContent.trim()); })[0];
    if (vor) vor.insertAdjacentHTML('beforebegin', html); else s.insertAdjacentHTML('beforeend', html);
    var ds = $('#datenschutz', s); if (ds && !$('.w3-datenschutz', ds)) ds.insertAdjacentHTML('beforeend', '<p class="w3-datenschutz">Meer-, Staub- und Modellvergleichsdaten holt die App ebenfalls bei Open-Meteo (Marine, Luftqualität, Vorhersage); Open-Meteo sieht dabei deine IP-Adresse und die Koordinaten des Orts. Sonne und Mond rechnet die App auf deinem Gerät aus. Für die Karten-Ebenen Wind, Wolken und Isobaren holt die App bei Open-Meteo Werte für ein Gitter von Punkten rund um den Kartenausschnitt; Open-Meteo sieht dabei deine IP-Adresse und diese Koordinaten.</p>');
    $('#w3Liste').addEventListener('change', function (e) {
      var k = e.target.dataset.w3; if (!k) return;
      if (k === 'spar') w3SparSetzen(e.target.checked);
      if (k === 'meer') speicher.schreiben('wpc-meer', { an: e.target.checked });
      if (k === 'calima') { speicher.schreiben('wpc-calima', { an: e.target.checked, schwelle: w3Calima().schwelle }); $('#w3Schwelle').hidden = !e.target.checked; }
    });
    $('[data-seg="w3schwelle"]').addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      speicher.schreiben('wpc-calima', { an: w3Calima().an, schwelle: +b.dataset.v });
      $$('[data-seg="w3schwelle"] [data-v]').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
    });
  }
  w3SparVorschlag();

  /* === Wetterfoto: Kamera-Studio (lib/kamera-studio/, unverändert aus dem Kamera-Konfigurator, 20.10.2026) ===
     Einstellung wie in der WeddaApp: Oberfläche „Ein-Tipp-Karte“, alle Funktionen an, Auslöser frei verschiebbar, Galerie 3 Originale / 5 bearbeitete.
     Der Zugangsknopf sitzt rund in der Tab-Leiste auf Platz 3 und öffnet gleich die Kamera; der Nutzer darf ihn unter „Mehr“ ändern,
     Auslöser und Sucher-Knöpfe am Zahnrad im Studio. Den alten Teilen-Bildschirm samt ?teilen=alt gibt es seit dem 21.10.2026 nicht mehr (A24); nur die Galerie „Frühere Wetterfotos“ (wpc-galerie) ist geblieben. */
  var KS_ORDNER = 'lib/kamera-studio/';
  // speicher: 'wpcamera' trennt Galerie (IndexedDB wpcamera-ks-galerie) und Nutzerwahl (wpcamera-ks-nutzer-…) von WeddaApp und Konfigurator unter derselben Adresse
  var KS_EINSTELLUNG = {
    variante: 'schnell', funktionen: {}, speicher: 'wpcamera',
    optionen: { zugangAktion: 'kamera', ausloeserOrt: 'frei', galerieOriginale: 3, galerieBearbeitet: 5, vorschauStart: 'studio',
      nutzerDarf: { zugang: [], ausloeser: ['studio'], galerie: [], sucher: ['studio'] } },
    // Foto-Infos (design.json, A26): aufs Foto nur Temperatur, Wettersymbol, Ort und Datum; der Nutzer kann im Studio mehr zuschalten
    start: { daten: { temperatur: true, symbol: true, ort: 'genau', datum: true, lage: false, uhrzeit: false, logo: false, wind: false, regen: false, feuchte: false, uv: false, sonne: false, druck: false, boeen: false, regenRisiko: false } }
  };
  var ZUGANG_STD = { ort: 'tab', platz: '3', aus: 'rund' };
  var ZUGANG_ORTE = [['tab', 'Tab-Leiste'], ['kopf', 'Kopfzeile'], ['schwebend', 'Schwebend'], ['mehr', 'Im Tab „Mehr“'], ['kachel', 'Kachel']];
  var ZUGANG_PLATZ_STD = { tab: '3', kopf: 'rechts-aussen', schwebend: 'ur', mehr: 'oben', kachel: 'oben' };
  var ZUGANG_PLAETZE = {
    tab: [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']],
    kopf: [['links-aussen', 'Links außen'], ['links-innen', 'Links innen'], ['rechts-innen', 'Rechts innen'], ['rechts-aussen', 'Rechts außen']],
    schwebend: [['ol', 'Oben links'], ['or', 'Oben rechts'], ['ul', 'Unten links'], ['ur', 'Unten rechts']],
    kachel: [['oben', 'Ganz oben'], ['mitte', 'Unter „Aktuell“'], ['unten', 'Ganz unten']],
    mehr: [['oben', 'Erste Zeile']]
  };
  var ZUGANG_AUSSEHEN = [['rund', 'Rund'], ['symbol', 'Nur Symbol'], ['symbolText', 'Symbol und Text'], ['pille', 'Text-Knopf']];
  var ZUGANG_NICHT = { tab: ['pille'], mehr: ['rund', 'symbol'], kachel: ['symbol'] };   // passt an diesem Ort nicht
  var ks = null, ksLaden = null, studioZuletztFokus = null;

  // Eigene Schlüssel (wpc-wf-…), nicht die des Studios: Konfigurator und WeddaApp liegen unter derselben Adresse (stephandel.github.io)
  function nutzerLies(k) { return speicher.lesen('wpc-wf-' + k, null); }
  function nutzerSchreibe(k, v) { if (v == null) { try { localStorage.removeItem('wpc-wf-' + k); } catch (e) { } } else speicher.schreiben('wpc-wf-' + k, v); }
  function inListe(liste, id) { return liste.some(function (x) { return x[0] === id; }); }
  function zugang() {
    var o = nutzerLies('zugangOrt'); if (!inListe(ZUGANG_ORTE, o)) o = ZUGANG_STD.ort;
    var platz = nutzerLies('zugangPlatz'); if (!inListe(ZUGANG_PLAETZE[o], platz)) platz = o === ZUGANG_STD.ort ? ZUGANG_STD.platz : ZUGANG_PLATZ_STD[o];
    var nicht = ZUGANG_NICHT[o] || [], aus = nutzerLies('zugangAussehen');
    if (!inListe(ZUGANG_AUSSEHEN, aus) || nicht.indexOf(aus) >= 0) aus = nicht.indexOf(ZUGANG_STD.aus) < 0 ? ZUGANG_STD.aus : ZUGANG_AUSSEHEN.map(function (x) { return x[0]; }).filter(function (a) { return nicht.indexOf(a) < 0; })[0];
    return { ort: o, platz: platz, aus: aus };
  }
  // Eine Bauform für Kopfzeile, schwebend, Mehr und Kachel; der Tab-Knopf entsteht in baueTabs
  function zugangKnopf(z, klasse) {
    var sym = z.aus === 'pille' ? '' : Ikon('camera'), text = z.aus === 'symbolText' || z.aus === 'pille' ? '<span>Wetterfoto</span>' : '';
    if (z.ort === 'mehr') text = '<span class="zugang-zeile"><b>Wetterfoto</b><small>Foto aufnehmen, Wetter drauf, teilen</small></span>';
    return '<button type="button" class="' + klasse + ' zugang zugang-' + z.aus + '" data-zugang aria-label="Wetterfoto – Foto aufnehmen">' + sym + text + '</button>';
  }
  function zugangKachel(z) {
    return '<section class="kachel zugang-kachel" aria-label="Wetterfoto"><div><h2 class="kachel-titel">Wetterfoto</h2><p class="info">Foto machen, Wetter drauf, teilen.</p></div>' + zugangKnopf(z, 'zugang-kachel-knopf') + '</section>';
  }
  // Kopfzeile und schwebend setzen; Tab-Leiste (baueTabs), Kachel (startseiteOrdnen) und „Mehr“ (renderMehr) bauen den Knopf selbst
  function zugangAnwenden(start) {
    var z = zugang();
    $$('.zugang-kopf, .zugang-schwebend, .zugang-mehr').forEach(function (e) { e.remove(); });
    if (z.ort !== 'kachel') $$('.zugang-kachel').forEach(function (e) { e.remove(); });
    if (z.ort === 'kopf') {
      var ziel = { 'links-aussen': ['#btnMenue', 'beforebegin'], 'links-innen': ['#btnMenue', 'afterend'], 'rechts-innen': ['#btnSuche', 'beforebegin'], 'rechts-aussen': ['#btnSuche', 'afterend'] }[z.platz];
      $(ziel[0]).insertAdjacentHTML(ziel[1], zugangKnopf(z, 'ikonknopf tippbar zugang-kopf'));
    } else if (z.ort === 'schwebend') document.body.insertAdjacentHTML('beforeend', zugangKnopf(z, 'zugang-schwebend zugang-pos-' + z.platz));
    baueTabs();
    if (start) return;
    if (aktiv === 'wetter' && daten) renderWetter(); else if (aktiv === 'mehr') renderMehr();
  }
  function wetterfotoEinstellungen(z) {
    var nicht = ZUGANG_NICHT[z.ort] || [], aussehen = ZUGANG_AUSSEHEN.filter(function (x) { return nicht.indexOf(x[0]) < 0; });
    var gruppe = function (name, liste, wert, label) { return '<p class="a5-groesse-titel">' + label + '</p>' + seg(name, wert, liste, label).replace('class="seg"', 'class="seg umbruch"'); };
    return '<h2 class="abschnitt-titel" id="wfTitel">Wetterfoto</h2><div class="kachel a5-groesse" id="wfEinst">' +
      gruppe('wfzo', ZUGANG_ORTE, z.ort, 'Wo sitzt der Wetterfoto-Knopf?') +
      (ZUGANG_PLAETZE[z.ort].length > 1 ? gruppe('wfzp', ZUGANG_PLAETZE[z.ort], z.platz, z.ort === 'tab' ? 'Platz in der Tab-Leiste' : 'Platz') : '') +
      gruppe('wfzs', aussehen, z.aus, 'Aussehen') +
      '<p class="info">Das gilt nur für dieses Gerät. Auslöser und Sucher-Knöpfe stellst du im Wetterfoto über das Zahnrad ein.</p>' +
      '<button type="button" class="button leise tippbar" id="wfZurueck">Zurücksetzen</button></div>';
  }
  function wetterfotoWahl(art, wert) {
    if (art === 'wfzo') { nutzerSchreibe('zugangOrt', wert); nutzerSchreibe('zugangPlatz', null); }
    else nutzerSchreibe(art === 'wfzp' ? 'zugangPlatz' : 'zugangAussehen', wert);
    zugangAnwenden();
    var n = $('[data-seg="' + art + '"] [data-v="' + wert + '"]'); if (n) n.focus();
  }
  // Ortszeit mit Versatz (das Studio liest Stunde und Minute direkt aus dem Text, deshalb nie UTC mit „Z“)
  function wfVersatz(sek) { var a = Math.abs(sek), p = function (n) { return (n < 10 ? '0' : '') + n; }; return (sek < 0 ? '-' : '+') + p(Math.floor(a / 3600)) + ':' + p(Math.floor(a % 3600 / 60)); }
  function ortszeitJetzt() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':00' + wfVersatz(-d.getTimezoneOffset() * 60);
  }
  // Wetter im Format des Studios aus den echten Daten der App (Open-Meteo oder DWD); ohne Daten nur Ort und Zeit, damit nie Beispielwerte auf dem Foto landen.
  // Gemerkte Daten gelten auch während eines Neuladens. Infos aufs Foto wählt das Studio selbst (Standard: Temperatur, Symbol, Wetterlage, Ort, Datum, Uhrzeit; Wind und Regen aus).
  function studioWetter() {
    var gps = ort.name === 'Mein Standort';
    var w = { ort: { stadt: gps ? '' : (ort.stadt || ort.name).split(',')[0], stadtteil: '', land: '', lat: ort.lat, lon: ort.lon }, zeit: ortszeitJetzt() };
    if (!daten || !daten.current || !daten.daily) return w;
    var c = daten.current, d = daten.daily, erst = function (a) { return a && a[0] != null ? a[0] : null; };
    w.temp = c.temperature_2m; w.gefuehlt = c.apparent_temperature; w.code = c.weather_code; w.lage = wText(c.weather_code, c.is_day);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(c.time || '')) w.zeit = c.time.slice(0, 16) + ':00' + wfVersatz(isFinite(daten.utc_offset_seconds) ? daten.utc_offset_seconds : -new Date().getTimezoneOffset() * 60);
    w.wind = c.wind_speed_10m; w.windRichtung = c.wind_direction_10m == null ? null : richtung(c.wind_direction_10m); w.boeen = c.wind_gusts_10m;
    w.regen = erst(d.precipitation_sum); w.regenRisiko = erst(d.precipitation_probability_max);
    w.feuchte = c.relative_humidity_2m; w.druck = c.pressure_msl; w.uv = erst(d.uv_index_max);
    w.sonnenaufgang = d.sunrise && d.sunrise[0] ? hm(d.sunrise[0]) : null; w.sonnenuntergang = d.sunset && d.sunset[0] ? hm(d.sunset[0]) : null;
    w.modell = quelle === 'dwd' && dwdLaeuft !== false ? 'DWD MOSMIX' : modellInfo()[1];
    return w;
  }
  // Studio-Dateien erst bei Bedarf laden (CSS, dann die drei Skripte in fester Reihenfolge); sie liegen im Offline-Speicher.
  // Scheitert eine Datei, kommen alle wieder heraus, damit ein neuer Versuch sauber beginnt.
  function studioLaden() {
    if (window.KSStudio) return Promise.resolve();
    if (ksLaden) return ksLaden;
    var neu = [];
    var holen = function (tag, datei) {
      return new Promise(function (ok, fehl) {
        var e = document.createElement(tag);
        if (tag === 'link') { e.rel = 'stylesheet'; e.href = KS_ORDNER + datei; } else e.src = KS_ORDNER + datei;
        e.onload = ok; e.onerror = fehl; neu.push(e); document.head.appendChild(e);
      });
    };
    ksLaden = ['ks-symbole.js', 'ks-engine.js', 'ks-studio.js'].reduce(function (kette, datei) {
      return kette.then(function () { return holen('script', datei); });
    }, holen('link', 'ks-studio.css')).catch(function (e) {
      neu.forEach(function (x) { x.remove(); }); ksLaden = null; throw e;
    });
    return ksLaden;
  }
  function studioLadenZeigen() {
    $('#ksWurzel').innerHTML = '<p class="studio-laedt" role="status">Wetterfoto wird geladen …</p>';
    studioLaden().then(function () { if (!$('#studio').hidden && !ks) studioMount(); }).catch(function () {
      $('#ksWurzel').innerHTML = '<div class="studio-laedt" role="status"><p>Das Wetterfoto ließ sich nicht laden. Prüfe die Verbindung.</p>' +
        '<button type="button" class="button tippbar" id="studioNochmal">Erneut versuchen</button></div>';
    });
  }
  // Hinter dem Wetterfoto ist nichts bedienbar (auch nicht für VoiceOver)
  function hintergrundSperren(an) {
    $$('#titelzeile, .inhalt, #tabbar, #hinweis, #macLeiste, .zugang-schwebend').forEach(function (e) { if (an) e.setAttribute('inert', ''); else e.removeAttribute('inert'); });
  }
  function studioMount() {
    $('#ksWurzel').innerHTML = '';
    ks = KSStudio.mount($('#ksWurzel'), { variante: KS_EINSTELLUNG.variante, funktionen: KS_EINSTELLUNG.funktionen, optionen: KS_EINSTELLUNG.optionen, speicher: KS_EINSTELLUNG.speicher, start: KS_EINSTELLUNG.start,
      wetter: studioWetter(), theme: 'dunkel', appName: 'WetterProCamera' });
  }
  // kamera: der Knopf soll gleich die Kamera öffnen (geht nur direkt im Antippen, also nur, wenn das Studio schon geladen ist)
  // knopf: der angetippte Knopf, dorthin kehrt der Fokus zurück (Safari fokussiert angetippte Knöpfe nicht)
  function studioAuf(kamera, knopf) {
    if (!$('#studio').hidden) return;
    studioZuletztFokus = knopf || document.activeElement;
    $('#studio').hidden = false; document.body.style.overflow = 'hidden'; hintergrundSperren(true);
    if (window.KSStudio) {
      studioMount();
      if (kamera) ks.neuesFoto(); else $('#studioZu').focus();
      return;
    }
    $('#studioZu').focus();
    studioLadenZeigen();
  }
  function studioZu() {
    if (ks) { try { ks.zerstoere(); } catch (e) { } ks = null; }
    $('#ksWurzel').innerHTML = '';
    $('#studio').hidden = true; document.body.style.overflow = ''; hintergrundSperren(false);
    // Wurde der Knopf inzwischen neu gezeichnet (neue Wetterdaten, anderer Ort der Einstellung), den sichtbaren Wetterfoto-Knopf nehmen
    var f = studioZuletztFokus && studioZuletztFokus.isConnected ? studioZuletztFokus : null;
    if (!f) f = $$('[data-zugang], [data-kamera]').filter(function (e) { return e.getClientRects().length; })[0] || $('#btnTeilen');
    if (f && f.focus) f.focus();
  }
  // Alle Einstiege (Kopfzeile, Seitenleiste, Kurzbefehl ?kamera=1, Galerie-Knopf) öffnen das Studio; die Kamera nur über den Zugangsknopf
  document.addEventListener('click', function (e) { var k = e.target.closest('[data-zugang]'); if (k) studioAuf(true, k); });
  $('#studioZu').addEventListener('click', studioZu);
  $('#ksWurzel').addEventListener('click', function (e) { if (e.target.closest('#studioNochmal')) studioLadenZeigen(); });
  // Esc schließt das Wetterfoto erst, wenn das Studio selbst nichts mehr zu schließen hatte (es meldet das mit preventDefault)
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !e.defaultPrevented && !$('#studio').hidden) studioZu(); });
  document.addEventListener('click', function (e) {
    var wf = e.target.closest('[data-seg^="wf"] [data-v]');
    if (wf) { wetterfotoWahl(wf.parentNode.dataset.seg, wf.dataset.v); return; }
    if (e.target.closest('#wfZurueck')) { ['zugangOrt', 'zugangPlatz', 'zugangAussehen'].forEach(function (k) { nutzerSchreibe(k, null); }); zugangAnwenden(); var zb = $('#wfZurueck'); if (zb) zb.focus(); }
  });
  // Tab „Mehr“: Abschnitt „Wetterfoto“ vor „Webcam“, bei Ort „Im Tab Mehr“ der Knopf als erste Zeile
  renderMehr = (function (alt) {
    return function () {
      alt();
      var s = $('#tab-mehr'), z = zugang();
      var web = $$('h2.abschnitt-titel', s).filter(function (h) { return /^Webcam/.test(h.textContent.trim()); })[0];
      var html = wetterfotoEinstellungen(z);
      if (web) web.insertAdjacentHTML('beforebegin', html); else s.insertAdjacentHTML('beforeend', html);
      if (z.ort === 'mehr') s.insertAdjacentHTML('afterbegin', '<div class="liste zugang-mehr">' + zugangKnopf(z, 'tippbar') + '</div>');
    };
  })(renderMehr);
  // Frühere Galerie des alten Teilen-Bildschirms (wpc-galerie): nur zeigen, wenn dort noch Fotos liegen; die neue Galerie liegt im Studio
  galerieZeileMehr = (function (alt) {
    return function (s) {
      alt(s);
      galerieZahl().then(function (n) {
        if (n > 0) { var h = $$('h2.abschnitt-titel', s).filter(function (x) { return x.textContent === 'Meine Wetterfotos'; })[0]; if (h) h.textContent = 'Frühere Wetterfotos'; return; }
        var b = $('#pcGalMehr', s); if (!b) return;
        var titel = b.closest('.liste').previousElementSibling; b.closest('.liste').remove(); if (titel && titel.textContent === 'Meine Wetterfotos') titel.remove();
      }, function () { });
    };
  })(galerieZeileMehr);
  // Studio-Dateien im Hintergrund vorladen, damit der Zugangsknopf gleich die Kamera öffnen kann
  if (!/[?&]kamera=1/.test(location.search)) setTimeout(function () { studioLaden().catch(function () { }); }, 1500);
  // Zugangsknopf als Kachel auf der Startseite (Ort „Kachel“): oben, unter „Aktuell“ oder ganz unten
  function zugangKachelSetzen(s) {
    var z = zugang(); $$('.zugang-kachel', s).forEach(function (e) { e.remove(); });
    if (z.ort !== 'kachel') return;
    s.insertAdjacentHTML('beforeend', zugangKachel(z));
    var k = $('.zugang-kachel', s), akt = $('.akt', s);
    if (z.platz === 'oben') s.insertBefore(k, (akt || s.firstChild)); else if (z.platz === 'mitte' && akt) akt.insertAdjacentElement('afterend', k);
  }

  /* === A9: Modul „Warnung“ (DWD über Bright Sky, CC BY 4.0) ===
     Nur für Orte in Deutschland. Keine Warnung, Fehler oder offline: Kachel fehlt still, nichts blockiert. */
  var A9_WARN = { minor: ['Wetterwarnung', 1], moderate: ['Markante Wetterwarnung', 2], severe: ['Unwetterwarnung', 3], extreme: ['Extreme Unwetterwarnung', 4] };
  var a9WarnD = {};
  var a9InDeutschland = function (o) { return o.lat > 47.2 && o.lat < 55.1 && o.lon > 5.8 && o.lon < 15.1; };
  function a9WarnHolen(o) {
    var k = a5PosKey(o), m = a9WarnD[k];
    if (!a9InDeutschland(o) || (m && (m.laedt || Date.now() - m.zeit < 15 * 60e3))) return;
    a9WarnD[k] = { laedt: true, zeit: 0, d: m && m.d };
    holeJson(BRIGHTSKY + 'alerts?lat=' + o.lat + '&lon=' + o.lon + '&tz=Europe/Berlin').then(function (r) {
      a9WarnD[k] = { zeit: Date.now(), d: r && Array.isArray(r.alerts) ? r.alerts : [] }; a9WarnNeu();
    }, function () { a9WarnD[k] = { zeit: Date.now() - 10 * 60e3, d: m && m.d }; });   // nach 5 Minuten neuer Versuch
  }
  function a9WarnListe() {
    var m = a9WarnD[a5PosKey(ort)], jetzt = w3Jetzt(); if (!m || !m.d) return [];
    return m.d.filter(function (a) { return a && a.status !== 'test' && a.response_type !== 'allclear' && A9_WARN[a.severity] && a.headline_de && (!a.expires || String(a.expires).slice(0, 16) > jetzt); })
      .sort(function (x, y) { return A9_WARN[y.severity][1] - A9_WARN[x.severity][1] || String(x.onset).localeCompare(String(y.onset)); }).slice(0, 4);
  }
  // „heute 18:00 bis morgen 08:00 Uhr“; läuft die Warnung schon, steht „jetzt bis …“
  function a9Zeitraum(a) {
    var von = String(a.onset || '').slice(0, 16), bis = String(a.expires || '').slice(0, 16), jetzt = w3Jetzt(), tag = function (z) { return w3TagWort(z.slice(0, 10)); };
    var anfang = !von || von <= jetzt ? 'jetzt' : tag(von) + ' ' + hm(von);
    if (!bis) return anfang + (anfang === 'jetzt' ? '' : ' Uhr');
    return anfang + ' bis ' + (von && von > jetzt && von.slice(0, 10) === bis.slice(0, 10) ? '' : tag(bis) + ' ') + hm(bis) + ' Uhr';
  }
  function a9WarnHtml() {
    var l = a9WarnListe(); if (!l.length) return '';
    return '<section class="a9-warnung" id="a9Warnung" aria-labelledby="a9WarnungT"><h2 class="nur-vorlesen" id="a9WarnungT">Wetterwarnungen</h2>' +
      l.map(function (a, i) {
        return '<button type="button" class="a9-warn a9-warn-' + a.severity + ' tippbar" data-a9-warn="' + i + '" aria-haspopup="dialog">' + Ikon('warn') +
          '<span class="a9-warn-text"><small class="a9-warn-art">' + A9_WARN[a.severity][0] + '</small><b>' + esc(a.headline_de) + '</b><span class="a9-warn-zeit">' + esc(a9Zeitraum(a)) + '</span></span><span aria-hidden="true">›</span></button>';
      }).join('') + '</section>';
  }
  function a9WarnNeu() {
    if (aktiv !== 'wetter' || !daten) return;
    var s = $('#tab-wetter'); if (!s) return;
    var alt = $('#a9Warnung', s); if (alt) alt.remove();
    var html = a9WarnHtml(); if (!html) return;
    var z = $('.update-zeile', s);
    if (z) z.insertAdjacentHTML('afterend', html); else s.insertAdjacentHTML('afterbegin', html);
  }
  function a9WarnBlatt(i) {
    var a = a9WarnListe()[i]; if (!a) return;
    var d = w3Blatt('a9WarnBlatt', 'Wetterwarnung');
    if (!d.open) w3Fokus = document.activeElement;
    var absatz = function (t) { return t ? '<p>' + esc(t) + '</p>' : ''; };
    $('#a9WarnBlattInhalt').innerHTML = '<section class="kachel a9-blatt a9-warn-' + a.severity + '"><p class="a9-warn-art">' + A9_WARN[a.severity][0] + (a.event_de ? ': ' + esc(a.event_de) : '') + '</p><h3 class="w3-h3">' + esc(a.headline_de) + '</h3><p class="zahl">' + esc(a9Zeitraum(a)) + '</p></section>' +
      '<section class="kachel">' + absatz(a.description_de) + (a.instruction_de ? '<h3 class="w3-h3">Verhaltenshinweise</h3>' + absatz(a.instruction_de) : '') +
      '<p class="info">Quelle: Deutscher Wetterdienst (DWD), über Bright Sky (brightsky.dev), CC BY 4.0.</p></section>';
    if (!d.open) d.showModal();
    $('[data-zu]', d).focus();
  }
  document.addEventListener('click', function (e) { var b = e.target.closest('#a9Warnung [data-a9-warn]'); if (b) a9WarnBlatt(+b.dataset.a9Warn); });
  renderWetter = (function (alt) { return function () { alt(); try { a9WarnHolen(ort); a9WarnNeu(); } catch (e) { console.error('Warnung', e); } }; })(renderWetter);
  quellenHtml = (function (alt) {
    return function () {
      return alt() + '<a class="tippbar" href="https://brightsky.dev" target="_blank" rel="noopener"><span class="modell-text"><span>Warnungen: DWD über Bright Sky</span><small class="leise">Amtliche Wetterwarnungen des Deutschen Wetterdienstes, CC BY 4.0</small></span><span aria-hidden="true">↗</span></a>';
    };
  })(quellenHtml);
  // Tab „Mehr“ (Nutzertest 19.10.): Pilot-Karte nach unten (vor „Über die App“), Einstellungen in Gruppen mit Zwischenüberschriften; auf dem Mac sind sie ausgeblendet, dort gruppiert schon mehrOrdnen
  function a9MehrGliedern() {
    var s = $('#tab-mehr'); if (!s || $('.mehr-gruppe', s) || !$('#datenschutz', s)) return;
    var pt = $('#pilotTitel', s), pk = $('.pilot', s), ueber = $$('h2.abschnitt-titel', s).filter(function (h) { return /Über die App/.test(h.textContent); })[0];
    if (pt && pk) { if (ueber) { s.insertBefore(pt, ueber); s.insertBefore(pk, ueber); } else { s.appendChild(pt); s.appendChild(pk); } }
    var quellen = $$('h2.abschnitt-titel', s).filter(function (h) { return h.textContent.trim() === 'Quellen'; })[0];
    [['Orte', s.firstElementChild], ['Wetterdaten', $('#quelleTitel', s)], ['Startseite und Ansicht', $('#a5StartTitel', s)], ['Kamera und Webcam', $('#wfTitel', s)], ['Quellen und Info', quellen]].forEach(function (g, i) {
      if (g[1]) g[1].insertAdjacentHTML('beforebegin', '<h2 class="mehr-gruppe" id="mehrGruppe' + i + '"><button type="button" class="mehr-gruppe-knopf" aria-expanded="true"><span>' + g[0] + '</span>' + Ikon('chevdown') + '</button></h2>');
    });
    a9MehrAnwenden();
  }
  // Gruppen einklappbar (nur iPhone und iPad; am Mac stehen alle offen): beim Start nur „Orte“ offen, Zustand in wpc-mehr-offen
  var A9_MEHR_OFFEN = 'wpc-mehr-offen';
  function a9MehrOffenListe() { var v = speicher.lesen(A9_MEHR_OFFEN, null); return Array.isArray(v) ? v : [0]; }
  function a9MehrAnwenden() {
    var s = $('#tab-mehr'), offen = a9MehrOffenListe(); if (!s) return;
    $$('.mehr-gruppe', s).forEach(function (h) {
      var an = offen.indexOf(+h.id.replace('mehrGruppe', '')) >= 0, e = h.nextElementSibling;
      $('button', h).setAttribute('aria-expanded', String(an));
      while (e && !e.classList.contains('mehr-gruppe')) { e.classList.toggle('mehr-zu', !an); e = e.nextElementSibling; }
    });
  }
  function a9MehrOeffnen(i) { var l = a9MehrOffenListe(); if (l.indexOf(i) < 0) { l.push(i); speicher.schreiben(A9_MEHR_OFFEN, l); } a9MehrAnwenden(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.mehr-gruppe-knopf'); if (!b) return;
    var i = +b.parentNode.id.replace('mehrGruppe', ''), l = a9MehrOffenListe(), p = l.indexOf(i);
    if (p >= 0) l.splice(p, 1); else l.push(i);
    speicher.schreiben(A9_MEHR_OFFEN, l); a9MehrAnwenden();
  });
  renderMehr = (function (alt) {
    return function () {
      alt();
      var d = $('#tab-mehr #datenschutz');
      a9MehrGliedern();
      if (d && !$('#datenschutzWarnung', d)) d.insertAdjacentHTML('beforeend', '<p id="datenschutzWarnung">Für Warnungen sieht brightsky.dev deine IP-Adresse und den Ort (nur bei Orten in Deutschland). Für Luftqualität und Saharastaub sieht Open-Meteo deine IP-Adresse und den Ort.</p>');
    };
  })(renderMehr);

  /* === A9: Modul „Luftqualität“ (Ampel-Ring nach dem Europäischen Luftqualitätsindex, Open-Meteo/CAMS, CC BY 4.0) ===
     Größe laut Design-Link „klein“: Ring mit Zahl und Wort; die Schadstoff-Balken klappen auf („groß“ zeigt sie gleich offen). */
  var A9_LUFT_GROESSE = 'klein';
  var A9_LUFT = [['gut', 20], ['noch gut', 40], ['mäßig', 60], ['schlecht', 80], ['sehr schlecht', 100], ['extrem schlecht', Infinity]];   // Wörter nach UBA-Sprachgebrauch
  var a9LuftStufe = function (v) { for (var i = 0; i < A9_LUFT.length; i++) if (v <= A9_LUFT[i][1]) return i; return 5; };
  // Grenzen je Schadstoff (µg/m³) nach EEA (Stand 2024, laut Open-Meteo): Obergrenzen von gut, mäßig, mittel, schlecht, sehr schlecht
  var A9_STOFFE = [['pm2_5', 'Feinstaub PM2,5', [5, 15, 50, 90, 140]], ['pm10', 'Feinstaub PM10', [15, 45, 120, 195, 270]], ['nitrogen_dioxide', 'Stickstoffdioxid', [10, 25, 60, 100, 150]], ['ozone', 'Ozon', [60, 100, 120, 160, 180]]];
  function a9LuftHtml() {
    var m = w3Staub[a5PosKey(ort)], c = m && m.c; if (!c || c.european_aqi == null) return '';
    var v = Math.round(c.european_aqi), st = a9LuftStufe(v), wort = A9_LUFT[st][0], R = 28, U = 2 * Math.PI * R, anteil = Math.max(.04, Math.min(1, v / 100));
    var ring = '<svg class="a9-ring" viewBox="0 0 72 72" aria-hidden="true"><circle class="a9-ring-spur" cx="36" cy="36" r="' + R + '"/><circle class="a9-ring-bogen a9-luft-' + st + '" cx="36" cy="36" r="' + R + '" stroke-dasharray="' + (anteil * U).toFixed(1) + ' ' + U.toFixed(1) + '" transform="rotate(-90 36 36)"/></svg>';
    var balken = A9_STOFFE.filter(function (x) { return c[x[0]] != null; }).map(function (x) {
      var w = c[x[0]], g = x[2], i = 0; while (i < g.length && w > g[i]) i++;
      return '<li><span class="a9-stoff-name">' + x[1] + '</span><span class="a9-stoff-wert zahl">' + dez(w) + ' µg/m³ · ' + A9_LUFT[i][0] + '</span><span class="a9-balken" aria-hidden="true"><i class="a9-luft-' + i + '" style="width:' + Math.max(4, Math.min(100, w / g[4] * 100)).toFixed(0) + '%"></i></span></li>';
    }).join('');
    return '<section class="kachel a9-luft" id="a9Luft" aria-labelledby="a9LuftT"><h2 class="kachel-titel" id="a9LuftT">' + Ikon('wind') + 'Luftqualität</h2>' +
      '<div class="a9-luft-kopf"><div class="a9-ring-box">' + ring + '<span class="a9-ring-zahl zahl">' + v + '</span></div>' +
      '<p class="regen-satz">' + wort.charAt(0).toUpperCase() + wort.slice(1) + '<br><span class="w3-leise">Europäischer Luftqualitätsindex ' + v + ' von 100</span></p></div>' +
      (balken ? '<details class="a9-luft-mehr"' + (A9_LUFT_GROESSE === 'gross' ? ' open' : '') + '><summary class="tippbar">Schadstoffe</summary><ul class="a9-stoffe">' + balken + '</ul></details>' : '') + '</section>';
  }
  function a9LuftNeu() {
    if (aktiv !== 'wetter' || !daten) return;
    var s = $('#tab-wetter'); if (!s) return;
    var alt = $('#a9Luft', s), offen = alt && $('details', alt) && $('details', alt).open; if (alt) alt.remove();
    var html = a9LuftHtml(), tage = $('.tage', s); if (!html || !tage) return;
    tage.insertAdjacentHTML('afterend', html);
    if (offen) $('#a9Luft details').open = true;
  }
  renderWetter = (function (alt) { return function () { alt(); try { a9LuftNeu(); } catch (e) { console.error('Luftqualität', e); } }; })(renderWetter);
  quellenHtml = (function (alt) {
    return function () {
      return alt() + '<a class="tippbar" href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noopener"><span class="modell-text"><span>Luftqualität: Open-Meteo Air Quality</span><small class="leise">Europäischer Luftqualitätsindex aus CAMS-Modelldaten, CC BY 4.0</small></span><span aria-hidden="true">↗</span></a>';
    };
  })(quellenHtml);

  /* === Startseite nach dem Design-Link vom 20.10.2026 ===
     Reihenfolge: Aktuell, Stunden, Tagesliste, Luftqualität, Sonne, Mond (seit 22.10.2026 getrennt, A26), Was heute geht, danach Zusatzkacheln (Staub, Meer, Meteogramm, wenn eingeschaltet).
     Aus: Webcam (zusätzlich WEBCAMS_FREIGABE), Regenradar-Kachel. Warnung (ganz oben, nur bei Warnlage) und Luftqualität (nach der Tagesliste) sind seit 21.10.2026 (A9) gebaut. */
  var STARTSEITE_REIHE = ['#a9Warnung', '.akt', '.std', '#regenTitel', '.tage', '#a9Luft', '.w3-sonne-kachel', '.w3-mond-kachel', '#a5Tipps', '#w3Calima', '#w3Meer', '.a5-mg-kachel'];   // Regenradar nur, wenn unter „Mehr“ eingeschaltet
  function startseiteOrdnen() {
    var s = $('#tab-wetter'); if (!s || !s.querySelector('.akt')) return;
    var regen = $('#regenTitel', s); if (regen && !startLesen().radar) regen.closest('section').remove();
    STARTSEITE_REIHE.forEach(function (sel) { var e = $(sel, s); if (e && sel === '#regenTitel') e = e.closest('section'); if (e && e.parentNode === s) s.appendChild(e); });
    zugangKachelSetzen(s);
  }
  renderWetter = (function (alt) { return function () { alt(); startseiteOrdnen(); }; })(renderWetter);

  /* === A32 P3 (21.10.2026): „Meteogramm und Karten immer im Vollbild“ ===
     Ist der Schalter unter „Mehr“ an, öffnen Graphs (Darstellung Meteogramm) und Rad/Sat gleich als Vollbild-Blatt; „Fertig“ oder Zurück
     führen zum vorherigen Reiter (unbekannt, etwa beim Start mit gemerktem Reiter: Wetter). Das Meteogramm der Startseite bleibt klein,
     „Ganz ansehen“ öffnet dann direkt das Blatt. Die Darstellung „Kurve“ hat kein Blatt und bleibt, wie sie ist. */
  var A32_IMMER_STANDARD = false;   // Vorgabe aus design.json (einstellungen.vollbildImmer); danach gilt die Wahl unter „Mehr“
  function a32Immer() { return speicher.lesen('wpc-vollbild-immer', A32_IMMER_STANDARD) === true; }
  var a32Vorher = 'wetter';
  function a32Zurueck() {
    if (!a32Immer() || (aktiv !== 'graphs' && aktiv !== 'radsat')) return;
    zeigeTab(a32Vorher);
    var t = $('#tb-' + a32Vorher); if (t && t.offsetParent) t.focus({ preventScroll: true });
  }
  zeigeTab = (function (alt) {
    return function (id) {
      if (id !== aktiv && aktiv !== 'graphs' && aktiv !== 'radsat') a32Vorher = aktiv;
      alt(id);
      if (!a32Immer()) return;
      if (id === 'radsat') radsatVollbild(true);
      else if (id === 'graphs' && graphsModus() === 'meteo' && mg.instanz) mg.instanz.vollbild(true);
    };
  })(zeigeTab);
  radsatVollbildZu = a32Zurueck;
  renderMehr = (function (alt) {
    return function () {
      alt();
      var l = $('#tab-mehr #a5Start'); if (!l || $('#a32Liste')) return;
      // eigene Liste direkt unter den Startseiten-Schaltern (Gruppe „Startseite und Ansicht“), danach Auf-/Zuklappen neu anwenden
      l.insertAdjacentHTML('afterend', '<div class="liste a5-liste" id="a32Liste"><label class="tippbar"><span class="modell-text"><span>Meteogramm und Karten immer im Vollbild</span><small class="leise">Graphs (Meteogramm) und Rad/Sat öffnen über den ganzen Bildschirm; „Fertig“ führt zurück</small></span><input type="checkbox" role="switch" data-a32="immer"' + (a32Immer() ? ' checked' : '') + '></label></div>');
      a9MehrAnwenden();
    };
  })(renderMehr);
  document.addEventListener('change', function (e) { if (e.target.dataset && e.target.dataset.a32) speicher.schreiben('wpc-vollbild-immer', e.target.checked); });

  /* ---------- Start ---------- */
  $('#btnMenue').innerHTML = Ikon('pin'); $('#btnTeilen').innerHTML = Ikon('share'); $('#btnSuche').innerHTML = Ikon('search');
  // Orte-Symbol (Pin) statt Menü-Symbol, führt direkt zu „Meine Orte" (UX-Prüfung A10)
  $('#btnMenue').addEventListener('click', function () { zeigeTab('mehr'); a9MehrOeffnen(0); var l = $('#orteListe'); if (l) { var t = l.previousElementSibling || l; window.scrollTo(0, Math.max(0, t.getBoundingClientRect().top + window.scrollY - $('#titelzeile').offsetHeight - 16)); var e = $('#orteListe [aria-current="true"]') || $('#orteListe button'); if (e) e.focus({ preventScroll: true }); } });
  $('#btnSuche').addEventListener('click', function () { zeigeTab('mehr'); setTimeout(function () { var f = $('#sucheFeld'); if (f) f.focus(); }, 50); });
  $('#btnTeilen').addEventListener('click', function () { studioAuf(false); });
  bindTabs(); zugangAnwenden(true); kopfModell(); paketCStart();
  var start = 'wetter'; try { start = sessionStorage.getItem('wpgt-tab') || 'wetter'; } catch (e) { }
  zeigeTab(SEITEN.some(function (t) { return t[0] === start; }) ? start : 'wetter');
  laden();
  window.addEventListener('online', laden);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && stand && Date.now() - stand > 15 * 60 * 1000) laden(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { });
})();

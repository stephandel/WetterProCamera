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
  var daten = null, stand = null, laeuft = false;
  var cacheKey = function (o) { return 'wpgt-daten-' + o.lat.toFixed(3) + ',' + o.lon.toFixed(3); };
  function urlVorhersage(o) {
    return 'https://api.open-meteo.com/v1/forecast?latitude=' + o.lat + '&longitude=' + o.lon +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,is_day' +
      '&hourly=temperature_2m,precipitation,precipitation_probability,weather_code,is_day' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunshine_duration,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,sunrise,sunset' +
      '&minutely_15=precipitation&forecast_minutely_15=8&timezone=auto&forecast_days=8&wind_speed_unit=kmh';
  }
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
      daten = d; stand = Date.now(); speicher.schreiben(cacheKey(ort), { d: d, zeit: stand }); hinweis(null);
      try { render(); } catch (e) { console.error('Darstellung', e); }   // Zeichenfehler nicht als Netzfehler melden
    }, function (e) {
      console.warn('Wetterdaten', e);
      hinweis(daten ? 'offline' : 'fehler');
    }).then(function () { laeuft = false; });
  }
  function hinweis(art) {
    var h = $('#hinweis');
    if (!art) { h.hidden = true; h.innerHTML = ''; return; }
    var uhr = stand ? new Date(stand).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
    h.innerHTML = art === 'offline'
      ? Ikon('radar') + '<span>Offline · Stand ' + uhr + '</span><button class="button leise" id="btnNeu">Erneut versuchen</button>'
      : '<span>Die Wetterdaten ließen sich nicht laden. Bitte Internetverbindung prüfen.</span><button class="button" id="btnNeu">Erneut versuchen</button>';
    h.hidden = false; $('#btnNeu').addEventListener('click', laden);
    if (art === 'fehler') $('#tab-wetter').innerHTML = '';
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
  function renderWetter() {
    var c = daten.current, d = daten.daily, h = daten.hourly, i0 = stundenIndex();
    var akt = '<section class="kachel akt" aria-label="Aktuelles Wetter">' +
      '<div class="akt-l"><div class="akt-kopf"><b>Aktuell</b> <span class="leise zahl">' + hm(c.time) + '</span></div>' +
      sym(wArt(c.weather_code, c.is_day), 'akt-sym', wText(c.weather_code, c.is_day)) +
      '<div class="akt-fuss"><span class="akt-temp zahl">' + rund(c.temperature_2m) + '°C</span><span class="akt-regen zahl">' + dez(c.precipitation) + ' mm/h</span></div></div>' +
      '<div class="akt-r"><div class="akt-lage">' + esc(wText(c.weather_code, c.is_day)) + '</div><dl class="werte">' +
      '<div><dt>Gefühlt</dt><dd>' + rund(c.apparent_temperature) + '°C</dd></div>' +
      '<div><dt>Rel. Feuchte</dt><dd>' + rund(c.relative_humidity_2m) + ' %</dd></div>' +
      '<div><dt>Luftdruck</dt><dd>' + dez(c.pressure_msl) + ' hPa</dd></div></dl>' +
      '<div class="windzeile">' + windrose(c.wind_direction_10m) + '<div class="wind-wert"><b>' + rund(c.wind_speed_10m) + '</b><small>km/h ' + richtung(c.wind_direction_10m) + '</small></div><div class="boeen">Böen<br><span class="zahl">' + rund(c.wind_gusts_10m) + ' km/h</span></div></div>' +
      '</div></section>';
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
      regen = '<section class="kachel" aria-labelledby="regenTitel"><h2 class="kachel-titel" id="regenTitel">' + Ikon('radar') + 'Regenradar · nächste 2 Stunden</h2>' +
        '<p class="regen-satz">' + regenSatz(q) + '</p>' +
        '<div class="regen-balken" aria-hidden="true">' + q.precipitation.slice(0, 8).map(function (x) { return '<i class="' + (x < 0.1 ? 'trocken' : '') + '" style="height:' + Math.max(6, x / max * 100) + '%"></i>'; }).join('') + '</div>' +
        '<div class="regen-achse zahl" aria-hidden="true"><span>' + hm(q.time[0]) + '</span><span>' + hm(q.time[Math.min(7, q.time.length - 1)]) + '</span></div>' +
        '<button class="button leise mehr-link" data-gehe="radsat">Radar ansehen</button></section>';
    }
    // Tagesliste
    var zeilen = d.time.map(function (t, i) {
      var name = i === 0 ? 'Heute' : teile(t).wt;
      return '<div class="tag"><div class="tag-name"><b>' + name + '</b><small class="zahl">' + datumKurz(t) + '</small></div>' +
        sym(wArt(d.weather_code[i], 1), 'tag-sym', wText(d.weather_code[i], 1)) +
        '<div class="tag-temp"><span class="min">' + rund(d.temperature_2m_min[i]) + '°C</span><span class="max">' + rund(d.temperature_2m_max[i]) + '°C</span></div>' +
        '<div class="tag-zusatz" aria-label="Sonne ' + dez(d.sunshine_duration[i] / 3600) + ' Stunden, Regenrisiko ' + rund(d.precipitation_probability_max[i]) + ' Prozent, ' + dez(d.precipitation_sum[i]) + ' Millimeter"><span>' + Ikon('sun') + dez(d.sunshine_duration[i] / 3600) + ' h</span><span>' + Ikon('tropfen') + rund(d.precipitation_probability_max[i]) + ' %</span><span>' + Ikon('tropfen') + dez(d.precipitation_sum[i]) + ' mm</span></div>' +
        '<div class="tag-wind">' + windrose(d.wind_direction_10m_dominant[i]) + '<span><b>' + rund(d.wind_speed_10m_max[i]) + '</b><small>km/h</small></span></div></div>';
    }).join('');
    var tage = '<section class="kachel tage" aria-label="Vorhersage für die nächsten Tage">' + zeilen + '</section>';
    $('#tab-wetter').innerHTML = akt + std + regen + tage;
  }

  /* ---------- Graphs: Temperatur und Regen, 48 Stunden ---------- */
  function renderGraphs() {
    var h = daten.hourly, i0 = stundenIndex(), n = 48, B = 680, H = 260, l = 34, r = 10, o = 14, u = 30;
    var temp = h.temperature_2m.slice(i0, i0 + n), regen = h.precipitation.slice(i0, i0 + n), zeit = h.time.slice(i0, i0 + n);
    var tmin = Math.floor(Math.min.apply(null, temp) - 1), tmax = Math.ceil(Math.max.apply(null, temp) + 1), rmax = Math.max(2, Math.max.apply(null, regen));
    var x = function (i) { return l + i * (B - l - r) / (n - 1); }, y = function (t) { return o + (tmax - t) * (H - o - u) / (tmax - tmin); };
    var gitter = '', schritt = Math.max(1, Math.round((tmax - tmin) / 4));
    for (var t = Math.ceil(tmin); t <= tmax; t += schritt) gitter += '<line class="gitter" x1="' + l + '" x2="' + (B - r) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text x="' + (l - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t + '°</text>';
    var achse = zeit.map(function (z, i) { return i % 6 === 0 ? '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle">' + hm(z) + '</text>' : ''; }).join('');
    var balken = regen.map(function (v, i) { var hh = v / rmax * (H - o - u) * .5; return v > 0 ? '<rect class="regen" x="' + (x(i) - 4) + '" y="' + (H - u - hh) + '" width="8" height="' + hh + '" rx="2"/>' : ''; }).join('');
    var pfad = temp.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
    var flaeche = pfad + ' L' + x(n - 1) + ' ' + (H - u) + ' L' + x(0) + ' ' + (H - u) + ' Z';
    var tMaxI = temp.indexOf(Math.max.apply(null, temp)), tMinI = temp.indexOf(Math.min.apply(null, temp));
    var summe = regen.reduce(function (a, b) { return a + b; }, 0);
    $('#tab-graphs').innerHTML = '<section class="kachel graph" aria-labelledby="gTitel"><h2 class="kachel-titel" id="gTitel">' + Ikon('chart') + 'Temperatur und Regen · 48 Stunden</h2>' +
      '<svg viewBox="0 0 ' + B + ' ' + H + '" role="img" aria-label="Temperatur zwischen ' + rund(Math.min.apply(null, temp)) + ' und ' + rund(Math.max.apply(null, temp)) + ' Grad, Regen insgesamt ' + dez(summe) + ' Millimeter">' +
      gitter + balken + '<path class="flaeche" d="' + flaeche + '"/><path class="linie" d="' + pfad + '"/>' +
      '<line class="jetzt" x1="' + x(0) + '" x2="' + x(0) + '" y1="' + o + '" y2="' + (H - u) + '"/>' + achse + '</svg>' +
      '<div class="graph-legende"><span>Temperatur</span><span class="r">Regen pro Stunde</span></div></section>' +
      '<section class="kachel"><p class="regen-satz">Höchstwert ' + rund(temp[tMaxI]) + '°C um ' + hm(zeit[tMaxI]) + ' Uhr, Tiefstwert ' + rund(temp[tMinI]) + '°C um ' + hm(zeit[tMinI]) + ' Uhr.</p>' +
      '<p class="info">' + (summe < 0.2 ? 'In den nächsten zwei Tagen fällt kaum Regen.' : 'In den nächsten zwei Tagen fallen etwa ' + dez(summe) + ' mm Regen.') + '</p></section>';
  }

  /* ---------- Karten und Radar (Leaflet, erst beim Öffnen laden) ---------- */
  var karte = null, radarKarte = null, radar = { frames: [], i: 0, ebene: null, timer: null, host: '' };
  function leafletBereit(fn, n) { if (window.L) return fn(); if ((n || 0) > 50) return; setTimeout(function () { leafletBereit(fn, (n || 0) + 1); }, 100); }
  function grundKarte(el, zoom) {
    var k = L.map(el, { zoomControl: true, attributionControl: true }).setView([ort.lat, ort.lon], zoom);
    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 15, attribution: 'Karte: © <a href="https://opentopomap.org">OpenTopoMap</a>, Daten © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(k);
    return k;
  }
  function renderKarten() {
    var s = $('#tab-karten');
    if (!s.dataset.gebaut) {
      s.innerHTML = '<div class="karte" id="karte" role="region" aria-label="Karte mit Temperaturen"></div><div class="karte-fuss"><span>Aktuelle Temperaturen an deinen Orten.</span></div>';
      s.dataset.gebaut = '1';
    }
    leafletBereit(function () {
      if (!karte) karte = grundKarte($('#karte'), 9);
      karte.invalidateSize(); karte.setView([ort.lat, ort.lon], karte.getZoom());
      var orte = STANDARDORTE.concat(STANDARDORTE.some(function (o) { return o.name === ort.name; }) ? [] : [ort]);
      holeJson('https://api.open-meteo.com/v1/forecast?latitude=' + orte.map(function (o) { return o.lat; }).join(',') + '&longitude=' + orte.map(function (o) { return o.lon; }).join(',') + '&current=temperature_2m,weather_code,is_day&timezone=auto')
        .then(function (antw) {
          [].concat(antw).forEach(function (a, i) {
            var o = orte[i], c = a.current;
            L.marker([o.lat, o.lon], { icon: L.divIcon({ className: '', html: '<span class="temp-marke">' + sym(wArt(c.weather_code, c.is_day)) + rund(c.temperature_2m) + '°</span>', iconAnchor: [28, 16] }), title: o.name + ': ' + rund(c.temperature_2m) + ' Grad' }).addTo(karte);
          });
        }).catch(function () { });
    });
  }
  function renderRadsat() {
    var s = $('#tab-radsat');
    if (!s.dataset.gebaut) {
      s.innerHTML = '<div class="karte" id="radarKarte" role="region" aria-label="Regenradar der letzten 2 Stunden"></div>' +
        '<div class="karte-fuss"><button class="chip tippbar" id="radarPlay" aria-pressed="false">' + Ikon('chevron') + '<span>Abspielen</span></button><span id="radarZeit" class="zahl" aria-live="polite"></span></div>' +
        '<p class="info">Regenradar von <a href="https://www.rainviewer.com" rel="noopener">RainViewer</a>, letzte 2 Stunden.</p>';
      s.dataset.gebaut = '1';
      $('#radarPlay').addEventListener('click', radarAbspielen);
    }
    leafletBereit(function () {
      if (!radarKarte) radarKarte = grundKarte($('#radarKarte'), 7);
      radarKarte.invalidateSize(); radarKarte.setView([ort.lat, ort.lon], radarKarte.getZoom());
      holeJson('https://api.rainviewer.com/public/weather-maps.json').then(function (m) {
        radar.host = m.host; radar.frames = (m.radar && m.radar.past) || []; radar.i = radar.frames.length - 1; radarZeigen();
      }).catch(function () { $('#radarZeit').textContent = 'Radar gerade nicht erreichbar.'; });
    });
  }
  function radarZeigen() {
    var f = radar.frames[radar.i]; if (!f || !radarKarte) return;
    var neu = L.tileLayer(radar.host + f.path + '/256/{z}/{x}/{y}/2/1_1.png', { opacity: .75, maxNativeZoom: 7, maxZoom: 15 });
    neu.addTo(radarKarte); if (radar.ebene) radarKarte.removeLayer(radar.ebene); radar.ebene = neu;
    $('#radarZeit').textContent = new Date(f.time * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  }
  function radarAbspielen() {
    var b = $('#radarPlay'), an = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(an)); $('span', b).textContent = an ? 'Anhalten' : 'Abspielen';
    clearInterval(radar.timer);
    if (an) radar.timer = setInterval(function () { radar.i = (radar.i + 1) % radar.frames.length; radarZeigen(); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 1500 : 700);
  }

  /* ---------- Mehr: Ortssuche, Orte, Info ---------- */
  function renderMehr() {
    var s = $('#tab-mehr');
    var orteHtml = STANDARDORTE.map(function (o, i) { return '<button class="tippbar" data-ort="' + i + '"' + (o.name === ort.name ? ' aria-current="true"' : '') + '><span>' + esc(o.name) + '</span><span class="leise">' + esc(o.land) + '</span></button>'; }).join('');
    s.innerHTML = '<section class="kachel" aria-labelledby="sTitel"><h2 class="kachel-titel" id="sTitel">' + Ikon('search') + 'Ort suchen</h2>' +
      '<form class="suche" id="sucheForm" role="search"><input id="sucheFeld" type="search" placeholder="Stadt oder Ort" autocomplete="off" enterkeyhint="search" aria-label="Ort suchen"><button class="button">Suchen</button></form></section>' +
      '<div class="liste" id="sucheErgebnis" aria-live="polite"></div>' +
      '<h2 class="abschnitt-titel">Meine Orte</h2><div class="liste" id="orteListe">' + orteHtml +
      '<button class="tippbar" id="btnStandort"><span>' + Ikon('pin') + ' Mein Standort</span><span class="leise">fragt einmal nach</span></button></div>' +
      '<h2 class="abschnitt-titel">Über die App</h2><section class="kachel info">' +
      '<p><b>WetterProCamera</b> ist eine Test-App, gestaltet mit dem Design-Konfigurator nach den Empfehlungen der KI.</p>' +
      '<p>Wetterdaten: <a href="https://open-meteo.com" rel="noopener">Open-Meteo</a> (CC BY 4.0). Regenradar: <a href="https://www.rainviewer.com" rel="noopener">RainViewer</a>. Karte: <a href="https://opentopomap.org" rel="noopener">OpenTopoMap</a>, © OpenStreetMap-Mitwirkende. Wettersymbole: eigene Zeichnung „Klassisch". Foto: Mannheim, eigene Aufnahme.</p></section>';
    $('#sucheForm').addEventListener('submit', function (e) { e.preventDefault(); suchen($('#sucheFeld').value); });
    $('#orteListe').addEventListener('click', function (e) { var b = e.target.closest('[data-ort]'); if (b) ortSetzen(STANDARDORTE[+b.dataset.ort]); });
    $('#btnStandort').addEventListener('click', standort);
  }
  function suchen(text) {
    var ziel = $('#sucheErgebnis'); text = (text || '').trim(); if (text.length < 2) return;
    ziel.innerHTML = '<div class="leise">Suche läuft …</div>';
    holeJson('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(text) + '&count=8&language=de&format=json').then(function (r) {
      var t = r.results || [];
      ziel.innerHTML = t.length ? t.map(function (o, i) { return '<button class="tippbar" data-treffer="' + i + '"><span>' + esc(o.name) + '</span><span class="leise">' + esc([o.admin1, o.country].filter(Boolean).join(', ')) + '</span></button>'; }).join('') : '<div class="leise">Kein Ort gefunden. Anders schreiben?</div>';
      $$('[data-treffer]', ziel).forEach(function (b) { b.addEventListener('click', function () { var o = t[+b.dataset.treffer]; ortSetzen({ name: o.name, land: o.country || '', lat: o.latitude, lon: o.longitude }); }); });
    }).catch(function () { ziel.innerHTML = '<div class="leise">Suche gerade nicht möglich. Bitte Internetverbindung prüfen.</div>'; });
  }
  function standort() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(function (p) {
      var lat = +p.coords.latitude.toFixed(3), lon = +p.coords.longitude.toFixed(3);
      holeJson('https://geocoding-api.open-meteo.com/v1/search?name=' + lat + ',' + lon + '&count=1&language=de').catch(function () { return {}; }).then(function () { ortSetzen({ name: 'Mein Standort', land: '', lat: lat, lon: lon }); });
    }, function () { var b = $('#btnStandort .leise'); if (b) b.textContent = 'nicht erlaubt'; });
  }
  function ortSetzen(o) { ort = o; speicher.schreiben('wpgt-ort', o); daten = null; $('#ortName').textContent = o.name; zeigeTab('wetter'); laden(); }

  /* ---------- Tabs ---------- */
  var TABS = [['wetter', 'Wetter', 'cloudsun'], ['graphs', 'Graphs', 'chart'], ['karten', 'Karten', 'map'], ['radsat', 'Rad/Sat', 'radar'], ['mehr', 'Mehr', 'more']];
  var aktiv = 'wetter';
  function baueTabs() {
    $('#tabbar').innerHTML = TABS.map(function (t) { return '<button role="tab" id="tb-' + t[0] + '" aria-controls="tab-' + t[0] + '" data-tab="' + t[0] + '" class="tippbar">' + Ikon(t[2]) + '<span>' + t[1] + '</span></button>'; }).join('');
    $('#tabbar').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) zeigeTab(b.dataset.tab); });
    $('#tabbar').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var i = TABS.findIndex(function (t) { return t[0] === aktiv; }), n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0];
      zeigeTab(n); $('#tb-' + n).focus();
    });
  }
  function zeigeTab(id) {
    aktiv = id;
    TABS.forEach(function (t) { var an = t[0] === id, b = $('#tb-' + t[0]); b.setAttribute('aria-selected', String(an)); b.tabIndex = an ? 0 : -1; $('#tab-' + t[0]).hidden = !an; });
    try { sessionStorage.setItem('wpgt-tab', id); } catch (e) { }
    window.scrollTo(0, 0); render();
  }
  function render() {
    if (aktiv === 'mehr') return renderMehr();
    if (aktiv === 'karten') return renderKarten();
    if (aktiv === 'radsat') return renderRadsat();
    if (!daten) return;
    $('#ortName').textContent = ort.name;
    if (aktiv === 'wetter') renderWetter();
    if (aktiv === 'graphs') renderGraphs();
  }
  document.addEventListener('click', function (e) { var g = e.target.closest('[data-gehe]'); if (g) zeigeTab(g.dataset.gehe); });

  /* ---------- Wetter mit Foto teilen (Canvas, 3:4, 1080 × 1440) ---------- */
  var foto = null, stil = speicher.lesen('wpgt-stil', 'klassisch');
  var STILE = [['klassisch', 'Klassisch'], ['glas', 'Glas'], ['minimal', 'Minimal'], ['rahmen', 'Rahmen']];
  function ladeBild(src) { return new Promise(function (ok, f) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = f; i.src = src; }); }
  function symbolBild(art) { var defs = (document.getElementById('ws-defs') || {}).outerHTML || ''; var m = defs.match(/<defs>[\s\S]*<\/defs>/); var svg = WetterSymbol(art).replace(/^<svg([^>]*)>/, function (a, b) { return '<svg' + b.replace(/\s(class|aria-hidden|data-art)="[^"]*"/g, '') + ' xmlns="http://www.w3.org/2000/svg" width="256" height="256">' + (m ? m[0] : ''); }); return ladeBild('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)); }
  function fuellen(ctx, img, w, h) { var s = Math.max(w / img.width, h / img.height), bw = img.width * s, bh = img.height * s; ctx.drawImage(img, (w - bw) / 2, (h - bh) / 2, bw, bh); }
  function text(ctx, t, x, y, px, gewicht, farbe, ausr) { ctx.font = gewicht + ' ' + px + 'px ' + getComputedStyle(document.body).fontFamily; ctx.fillStyle = farbe; ctx.textAlign = ausr || 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(t, x, y); }
  function zeichne(cv, welcher, breite) {
    if (!daten) return Promise.resolve();
    var W = breite, H = Math.round(breite * 4 / 3), k = W / 1080, ctx = cv.getContext('2d'); cv.width = W; cv.height = H;
    var c = daten.current, d = daten.daily;
    return Promise.all([foto ? Promise.resolve(foto) : ladeBild('foto-mannheim.jpg'), symbolBild(wArt(c.weather_code, c.is_day))]).then(function (b) {
      var img = b[0], s = b[1], rand = welcher === 'rahmen' ? 48 * k : 0;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      ctx.save(); if (rand) { ctx.beginPath(); ctx.rect(rand, rand, W - 2 * rand, H - 2 * rand - 200 * k); ctx.clip(); }
      fuellen(ctx, img, W, H); ctx.restore();
      var temp = rund(c.temperature_2m) + '°', ortT = ort.name, dat = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
      var wind = rund(c.wind_speed_10m) + ' km/h ' + richtung(c.wind_direction_10m), regen = dez(d.precipitation_sum[0]) + ' mm', sonne = dez(d.sunshine_duration[0] / 3600) + ' h';
      if (welcher === 'klassisch') {
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, 230 * k);
        ctx.drawImage(s, 36 * k, 30 * k, 150 * k, 150 * k);
        text(ctx, temp, 200 * k, 140 * k, 110 * k, 300, '#fff'); text(ctx, ortT + ' · ' + dat, 44 * k, 208 * k, 34 * k, 600, '#fff');
        text(ctx, 'Wind ' + wind, W - 40 * k, 90 * k, 34 * k, 500, '#fff', 'right'); text(ctx, 'Regen ' + regen, W - 40 * k, 140 * k, 34 * k, 500, '#fff', 'right'); text(ctx, 'Sonne ' + sonne, W - 40 * k, 190 * k, 34 * k, 500, '#fff', 'right');
      } else if (welcher === 'glas') {
        ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2 * k;
        var y0 = H - 360 * k; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(40 * k, y0, W - 80 * k, 300 * k, 40 * k); else ctx.rect(40 * k, y0, W - 80 * k, 300 * k); ctx.fill(); ctx.stroke();
        ctx.drawImage(s, 70 * k, y0 + 40 * k, 140 * k, 140 * k); text(ctx, temp, 230 * k, y0 + 150 * k, 120 * k, 300, '#fff');
        text(ctx, ortT + ' · ' + dat, 80 * k, y0 + 245 * k, 34 * k, 600, '#fff'); text(ctx, wind + ' · ' + regen + ' · ☀ ' + sonne, W - 80 * k, y0 + 90 * k, 30 * k, 500, '#fff', 'right');
      } else if (welcher === 'minimal') {
        var g = ctx.createLinearGradient(0, H * .55, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)'); ctx.fillStyle = g; ctx.fillRect(0, H * .55, W, H * .45);
        text(ctx, temp, 60 * k, H - 140 * k, 180 * k, 200, '#fff'); text(ctx, ortT + ' · ' + dat, 66 * k, H - 70 * k, 36 * k, 600, '#fff');
      } else {
        ctx.fillStyle = '#fff'; ctx.fillRect(0, H - rand - 200 * k, W, 200 * k + rand);
        ctx.drawImage(s, rand, H - 220 * k, 150 * k, 150 * k); text(ctx, temp, rand + 170 * k, H - 110 * k, 100 * k, 300, '#111');
        text(ctx, ortT + ' · ' + dat, W - rand, H - 150 * k, 34 * k, 600, '#111', 'right'); text(ctx, wind + ' · ' + regen, W - rand, H - 100 * k, 30 * k, 500, '#555', 'right');
      }
      if (welcher !== 'rahmen') text(ctx, 'WetterProCamera', W - 40 * k, H - 36 * k, 26 * k, 600, 'rgba(255,255,255,.85)', 'right');
      else text(ctx, 'WetterProCamera', rand, H - 36 * k, 24 * k, 600, '#777');
    });
  }
  function teilenOeffnen() {
    if (!daten) { hinweisKurz('Die Wetterdaten laden noch. Gleich noch einmal tippen.'); return; }
    var dlg = $('#teilen');
    $('#tStile').innerHTML = STILE.map(function (s) { return '<button role="radio" aria-checked="' + (s[0] === stil) + '" data-stil="' + s[0] + '" class="tippbar"><canvas width="54" height="72"></canvas><span>' + s[1] + '</span></button>'; }).join('');
    $$('#tStile canvas').forEach(function (cv, i) { zeichne(cv, STILE[i][0], 216); });
    zeichne($('#tBild'), stil, 1080);
    dlg.showModal();
  }
  function bindTeilen() {
    $('#tAbbrechen').addEventListener('click', function () { $('#teilen').close(); });
    $('#tStile').addEventListener('click', function (e) { var b = e.target.closest('[data-stil]'); if (!b) return; stil = b.dataset.stil; speicher.schreiben('wpgt-stil', stil); $$('#tStile [data-stil]').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); }); zeichne($('#tBild'), stil, 1080); });
    ['#tFotos', '#tKamera'].forEach(function (id) {
      $(id).addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0]; if (!f) return;
        var r = new FileReader(); r.onload = function () { ladeBild(r.result).then(function (i) { foto = i; teilenOeffnen(); }); }; r.readAsDataURL(f);
      });
    });
    $('#tTeilen').addEventListener('click', function () {
      $('#tBild').toBlob(function (blob) {
        if (!blob) return;
        var datei = new File([blob], 'wetter-' + ort.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.jpg', { type: 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [datei] })) { navigator.share({ files: [datei], title: 'Wetter in ' + ort.name }).catch(function () { }); return; }
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = datei.name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      }, 'image/jpeg', .9);
    });
  }

  /* ---------- Start ---------- */
  $('#btnMenue').innerHTML = Ikon('sliders'); $('#btnTeilen').innerHTML = Ikon('share'); $('#btnSuche').innerHTML = Ikon('search');
  $('#tTeilen').innerHTML = Ikon('share'); $('#tFotosIkon').innerHTML = Ikon('image'); $('#tKameraIkon').innerHTML = Ikon('camera');
  $('#btnMenue').addEventListener('click', function () { zeigeTab('mehr'); });
  $('#btnSuche').addEventListener('click', function () { zeigeTab('mehr'); setTimeout(function () { var f = $('#sucheFeld'); if (f) f.focus(); }, 50); });
  $('#btnTeilen').addEventListener('click', teilenOeffnen);
  baueTabs(); bindTeilen();
  var start = 'wetter'; try { start = sessionStorage.getItem('wpgt-tab') || 'wetter'; } catch (e) { }
  zeigeTab(TABS.some(function (t) { return t[0] === start; }) ? start : 'wetter');
  laden();
  window.addEventListener('online', laden);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && stand && Date.now() - stand > 15 * 60 * 1000) laden(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { });
})();

/*
 * Third Place: navigation mode.
 * Real map data from OpenStreetMap:
 *   - tiles: OpenStreetMap standard tiles
 *   - search + reverse lookup: Photon (komoot)
 *   - nearby places, hours, details: Overpass API
 *   - routes + turn-by-turn: OSRM (routing.openstreetmap.de)
 */
(function () {
  'use strict';

  // ---------- Setup ----------
  var LAHORE = { center: [31.5204, 74.3587], bbox: [74.10, 31.30, 74.60, 31.72] };
  var API = {
    photon: 'https://photon.komoot.io',
    overpass: [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.private.coffee/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
    ],
    route: function (mode) { return 'https://routing.openstreetmap.de/routed-' + mode + '/route/v1/driving/'; }
  };

  var INTENTS = {
    read: {
      phrase: 'somewhere to read',
      filters: ['["amenity"="library"]', '["shop"="books"]', '["amenity"="cafe"]']
    },
    breathe: {
      phrase: 'somewhere to breathe',
      filters: ['["leisure"="park"]', '["leisure"="garden"]', '["leisure"="nature_reserve"]']
    },
    work: {
      phrase: 'somewhere to focus',
      filters: ['["amenity"="library"]', '["amenity"="coworking_space"]', '["office"="coworking"]', '["amenity"="cafe"]']
    },
    talk: {
      phrase: 'somewhere to talk',
      filters: ['["amenity"="cafe"]', '["amenity"="restaurant"]', '["amenity"="ice_cream"]']
    },
    wander: {
      phrase: 'somewhere to wander',
      filters: ['["tourism"="museum"]', '["tourism"="gallery"]', '["amenity"="arts_centre"]', '["historic"]', '["tourism"="attraction"]']
    }
  };

  // What kind of place it is. Noise and "solo" notes describe the kind of place, not this exact one.
  var TYPES = {
    library:    { label: 'Library',          noise: 'Usually quiet',            solo: true,  paid: false },
    books:      { label: 'Bookshop',         noise: 'Usually quiet',            solo: true,  paid: true },
    cafe:       { label: 'Café',             noise: 'Usually a gentle buzz',    solo: true,  paid: true },
    coworking:  { label: 'Co-working space', noise: 'Usually quiet',            solo: true,  paid: true },
    park:       { label: 'Park',             noise: 'Open air, varies by hour', solo: true,  paid: false },
    garden:     { label: 'Garden',           noise: 'Usually calm',             solo: true,  paid: false },
    reserve:    { label: 'Nature reserve',   noise: 'Usually calm',             solo: true,  paid: false },
    restaurant: { label: 'Restaurant',       noise: 'Usually lively',           solo: false, paid: true },
    ice_cream:  { label: 'Ice cream',        noise: 'Usually lively',           solo: false, paid: true },
    museum:     { label: 'Museum',           noise: 'Usually quiet',            solo: true,  paid: null },
    gallery:    { label: 'Gallery',          noise: 'Usually quiet',            solo: true,  paid: null },
    arts:       { label: 'Arts centre',      noise: 'Varies with what’s on', solo: true, paid: null },
    historic:   { label: 'Historic place',   noise: 'Varies by hour',           solo: true,  paid: null },
    attraction: { label: 'Landmark',         noise: 'Often busy',               solo: true,  paid: null },
    place:      { label: 'Place',            noise: 'Not sure',                 solo: true,  paid: null }
  };

  var MODES = { foot: 'walking', car: 'by car', bike: 'by bike' };

  var state = {
    choices: { intent: null, budget: null, company: null, radius: '2500' },
    origin: null,   // { lat, lng, label, kind: 'me' | 'search' | 'map' }
    me: null,       // { lat, lng, accuracy }
    places: [],
    selected: null,
    from: null,     // { lat, lng, label, isMe? }
    to: null,
    mode: 'foot',
    route: null,
    picking: null,  // 'from' | 'to' | null
    nav: null,
    directionsBack: 'find'
  };

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  $('year').textContent = new Date().getFullYear();

  // ---------- Map ----------
  var map = L.map('map', {
    zoomControl: false,
    minZoom: 10,
    maxBounds: [[30.9, 73.6], [32.2, 75.1]],
    maxBoundsViscosity: 0.8
  }).setView(LAHORE.center, 13);

  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  L.control.scale({ position: 'bottomright', imperial: false }).addTo(map);

  var layers = {
    places: L.layerGroup().addTo(map),
    route: L.layerGroup().addTo(map),
    search: L.layerGroup().addTo(map),
    me: L.layerGroup().addTo(map)
  };

  var icon = {
    pin: function (active) {
      return L.divIcon({ className: '', html: '<div class="pin' + (active ? ' is-active' : '') + '"></div>', iconSize: active ? [24, 24] : [18, 18], iconAnchor: active ? [12, 24] : [9, 18], popupAnchor: [0, -20] });
    },
    start: L.divIcon({ className: '', html: '<div class="dot-start"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
    end: L.divIcon({ className: '', html: '<div class="dot-end"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
    search: L.divIcon({ className: '', html: '<div class="dot-search"></div>', iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8] }),
    me: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] })
  };

  // ---------- Helpers ----------
  function fetchJSON(url, opts) {
    opts = opts || {};
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, opts.timeout || 20000);
    if (opts.signal) opts.signal.addEventListener('abort', function () { ctrl.abort(); });
    return fetch(url, { method: opts.method || 'GET', body: opts.body, signal: ctrl.signal, headers: opts.headers })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .finally(function () { clearTimeout(timer); });
  }

  function distance(a, b) {
    var R = 6371000, toRad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * toRad, dLng = (b.lng - a.lng) * toRad;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function fmtDist(m) {
    if (m < 50) return Math.round(m / 5) * 5 + ' m';
    if (m < 1000) return Math.round(m / 10) * 10 + ' m';
    return (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' km';
  }
  function fmtDuration(s) {
    var min = Math.max(1, Math.round(s / 60));
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60), m = min % 60;
    return h + ' hr' + (m ? ' ' + m + ' min' : '');
  }
  function fmtClock(date) {
    return date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' }).replace(' ', ' ');
  }
  function fmtCoords(p) { return p.lat.toFixed(5) + ', ' + p.lng.toFixed(5); }

  var toastTimer;
  function toast(msg, ms) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, ms || 3500);
  }

  // ---------- Panel / views ----------
  var panel = $('panel');
  var isDesktop = function () { return window.matchMedia('(min-width: 900px)').matches; };
  function setSheet(size) { panel.dataset.sheet = size; setTimeout(function () { map.invalidateSize(); }, 260); }
  $('panel-handle').addEventListener('click', function () {
    var order = ['peek', 'half', 'full'];
    setSheet(order[(order.indexOf(panel.dataset.sheet) + 1) % order.length]);
  });

  function showView(name) {
    document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.dataset.view !== name; });
    $('panel-scroll').scrollTop = 0;
    if (!isDesktop() && panel.dataset.sheet === 'peek') setSheet('half');
  }
  document.querySelectorAll('[data-back]').forEach(function (b) {
    b.addEventListener('click', function () {
      showView(b.dataset.back);
      if (b.dataset.back === 'results') highlightPlace(null);
    });
  });

  // ---------- About ----------
  var about = $('about-dialog');
  function openAbout(e) { if (e) e.preventDefault(); if (!about.open) about.showModal(); }
  $('about-link').addEventListener('click', openAbout);
  about.addEventListener('close', function () { if (location.hash === '#about') history.replaceState(null, '', location.pathname + location.search); });
  if (location.hash === '#about') openAbout();

  // ---------- Search (Photon) ----------
  function photonFeature(f) {
    var p = f.properties || {};
    var c = f.geometry.coordinates;
    var name = p.name || [p.street, p.housenumber].filter(Boolean).join(' ') || p.district || p.city || 'Unnamed place';
    var kind = (p.osm_value || p.type || '').replace(/_/g, ' ');
    var area = [p.street && p.name !== p.street ? p.street : null, p.locality, p.district, p.city === 'Lahore Cant' ? 'Lahore' : p.city]
      .filter(function (x, i, arr) { return x && x !== name && arr.indexOf(x) === i; });
    return {
      name: name,
      lat: c[1], lng: c[0],
      sub: [kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : null].concat(area.slice(0, 2)).filter(Boolean).join(' · '),
      area: p.district || p.locality || p.suburb || null
    };
  }

  function photonSearch(q, signal) {
    var center = map.getCenter();
    var url = API.photon + '/api/?' + new URLSearchParams({
      q: q, lang: 'en', limit: '12', lat: center.lat.toFixed(5), lon: center.lng.toFixed(5)
    });
    return fetchJSON(url, { signal: signal }).then(function (j) {
      var b = LAHORE.bbox;
      return (j.features || []).map(photonFeature).filter(function (p) {
        return p.lng >= b[0] && p.lng <= b[2] && p.lat >= b[1] && p.lat <= b[3];
      }).slice(0, 7);
    });
  }

  var areaCache = new Map();
  var areaQueue = Promise.resolve();
  function reverseLookup(lat, lng) {
    var key = lat.toFixed(4) + ',' + lng.toFixed(4);
    if (areaCache.has(key)) return areaCache.get(key);
    var job = areaQueue.then(function () { return sleep(150); }).then(function () {
      return fetchJSON(API.photon + '/reverse?' + new URLSearchParams({ lat: lat, lon: lng, lang: 'en', limit: '1' }));
    }).then(function (j) {
      var f = j.features && j.features[0];
      return f ? photonFeature(f) : null;
    }).catch(function () { return null; });
    areaQueue = job;
    areaCache.set(key, job);
    return job;
  }

  /** Accessible autocomplete for a search input. */
  function autocomplete(input, list, onPick) {
    var items = [], active = -1, ctrl = null, timer = null;
    function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; }
    function render(msg) {
      list.innerHTML = '';
      if (msg) {
        list.innerHTML = '<li class="s-empty">' + esc(msg) + '</li>';
      } else {
        items.forEach(function (it, i) {
          var li = document.createElement('li');
          li.id = list.id + '-' + i;
          li.setAttribute('role', 'option');
          li.setAttribute('aria-selected', i === active ? 'true' : 'false');
          li.innerHTML = '<span class="s-name">' + esc(it.name) + '</span><span class="s-sub">' + esc(it.sub || '') + '</span>';
          li.addEventListener('mousedown', function (e) { e.preventDefault(); pick(i); });
          list.appendChild(li);
        });
      }
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }
    function pick(i) {
      var it = items[i];
      if (!it) return;
      input.value = it.name;
      close();
      onPick(it);
    }
    input.addEventListener('input', function () {
      var q = input.value.trim();
      clearTimeout(timer);
      if (ctrl) ctrl.abort();
      if (q.length < 3) { close(); return; }
      timer = setTimeout(function () {
        ctrl = new AbortController();
        render('Looking…');
        photonSearch(q, ctrl.signal).then(function (res) {
          items = res; active = -1;
          if (!res.length) render('Nothing in Lahore by that name. Try a street or nearby landmark.');
          else render();
        }).catch(function (e) {
          if (e.name !== 'AbortError') render('Search isn’t answering right now. Try again in a moment.');
        });
      }, 280);
    });
    input.addEventListener('keydown', function (e) {
      if (list.hidden || !items.length) return;
      if (e.key === 'ArrowDown') { active = (active + 1) % items.length; render(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { active = (active - 1 + items.length) % items.length; render(); e.preventDefault(); }
      else if (e.key === 'Enter') { pick(active < 0 ? 0 : active); e.preventDefault(); }
      else if (e.key === 'Escape') { close(); }
      if (active >= 0) input.setAttribute('aria-activedescendant', list.id + '-' + active);
    });
    input.addEventListener('blur', function () { setTimeout(close, 120); });
  }

  // ---------- Origin ("where we look around") ----------
  function setOrigin(o) {
    state.origin = o;
    var label = o.kind === 'me' ? 'Looking around where you are' : 'Looking around ' + o.label;
    $('here-label').textContent = label + '.';
  }

  autocomplete($('place-search'), $('place-search-list'), function (p) {
    showSearchPoint(p, true);
    setOrigin({ lat: p.lat, lng: p.lng, label: p.name, kind: 'search' });
  });

  function showSearchPoint(p, fly) {
    layers.search.clearLayers();
    var m = L.marker([p.lat, p.lng], { icon: icon.search }).addTo(layers.search);
    m.bindPopup(pointPopup(p)).openPopup();
    if (fly) map.flyTo([p.lat, p.lng], 16, { duration: 0.8 });
  }

  function pointPopup(p) {
    var div = document.createElement('div');
    div.innerHTML =
      '<p class="popup-title">' + esc(p.name) + '</p>' +
      '<p class="popup-sub">' + esc(p.sub || '') + (p.sub ? '<br>' : '') + '<span class="coords">' + fmtCoords(p) + '</span></p>' +
      '<div class="popup-actions">' +
      '<button type="button" class="link-btn" data-a="to">Directions to here</button>' +
      '<button type="button" class="link-btn" data-a="from">Start directions from here</button>' +
      '<button type="button" class="link-btn" data-a="near">Find places near here</button>' +
      '</div>';
    div.addEventListener('click', function (e) {
      var a = e.target.dataset && e.target.dataset.a;
      if (!a) return;
      map.closePopup();
      var pt = { lat: p.lat, lng: p.lng, label: p.name };
      if (a === 'to') openDirections(null, pt);
      else if (a === 'from') openDirections(pt, state.to);
      else {
        setOrigin({ lat: p.lat, lng: p.lng, label: p.name, kind: 'map' });
        showView('find');
        if (state.choices.intent && state.choices.budget && state.choices.company) findPlaces();
        else $('find-hint').textContent = 'Tell us what you feel like, and we’ll look around ' + p.name + '.';
      }
    });
    return div;
  }

  // Tap anywhere on the map: name the spot, offer directions.
  map.on('click', function (e) {
    var ll = e.latlng;
    if (state.picking) { finishPick(ll); return; }
    if (state.nav) return;
    var popup = L.popup().setLatLng(ll).setContent('<p class="popup-sub">Finding this spot…</p>').openOn(map);
    reverseLookup(ll.lat, ll.lng).then(function (r) {
      var p = { lat: ll.lat, lng: ll.lng, name: r ? r.name : 'Dropped pin', sub: r ? r.sub : '' };
      if (map.hasLayer(popup)) popup.setContent(pointPopup(p));
    });
  });

  // ---------- Your location ----------
  function updateMe(lat, lng, accuracy) {
    state.me = { lat: lat, lng: lng, accuracy: accuracy };
    layers.me.clearLayers();
    if (accuracy && accuracy < 1500) {
      L.circle([lat, lng], { radius: accuracy, color: '#2F5D46', weight: 1, opacity: 0.4, fillColor: '#2F5D46', fillOpacity: 0.08, interactive: false }).addTo(layers.me);
    }
    L.marker([lat, lng], { icon: icon.me, keyboard: false, interactive: false, zIndexOffset: 1000 }).addTo(layers.me);
  }

  function locate() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) { reject(new Error('unsupported')); return; }
      navigator.geolocation.getCurrentPosition(function (pos) {
        var c = pos.coords;
        updateMe(c.latitude, c.longitude, c.accuracy);
        resolve(state.me);
      }, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
    });
  }

  function locateAndCentre(alsoOrigin) {
    toast('Finding where you are…', 8000);
    return locate().then(function (me) {
      $('toast').hidden = true;
      var inLahore = distance(me, { lat: LAHORE.center[0], lng: LAHORE.center[1] }) < 60000;
      if (!inLahore) {
        toast('You seem to be outside Lahore. Search for a street to start from instead.', 5000);
        return me;
      }
      map.flyTo([me.lat, me.lng], 16, { duration: 0.8 });
      if (alsoOrigin) setOrigin({ lat: me.lat, lng: me.lng, label: 'your location', kind: 'me' });
      return me;
    }).catch(function () {
      toast('We couldn’t see where you are. Allow location, or search for a street instead.', 5000);
      throw new Error('no-location');
    });
  }

  $('locate-btn').addEventListener('click', function () { locateAndCentre(true).catch(function () {}); });
  $('map-locate').addEventListener('click', function () {
    if (state.nav) { state.nav.follow = true; $('recenter-btn').hidden = true; if (state.me) map.setView([state.me.lat, state.me.lng], 17); return; }
    locateAndCentre(true).catch(function () {});
  });

  // ---------- Questions ----------
  document.querySelectorAll('.choices').forEach(function (fs) {
    var group = fs.dataset.group;
    fs.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      fs.querySelectorAll('.chip').forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      state.choices[group] = chip.dataset.value;
      $('find-hint').textContent = '';
    });
  });
  document.querySelectorAll('.chip:not(.is-on)').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });

  $('find-btn').addEventListener('click', function () {
    var c = state.choices;
    var missing = !c.intent ? 'what you feel like doing' : !c.budget ? 'what you’d like to spend' : !c.company ? 'who’s coming with you' : null;
    if (missing) { $('find-hint').textContent = 'Tell us ' + missing + ' first.'; return; }
    findPlaces();
  });

  // ---------- Nearby places (Overpass) ----------
  function overpassQuery(intent, o, radius) {
    var around = '(around:' + radius + ',' + o.lat.toFixed(5) + ',' + o.lng.toFixed(5) + ')';
    var parts = INTENTS[intent].filters.map(function (f) { return 'nwr' + f + '["name"]' + around + ';'; });
    return '[out:json][timeout:25];(' + parts.join('') + ');out center tags 400;';
  }

  function overpass(query) {
    var i = 0;
    function attempt() {
      var url = API.overpass[i];
      return fetchJSON(url, {
        method: 'POST',
        body: new URLSearchParams({ data: query }),
        timeout: 30000
      }).catch(function (err) {
        i++;
        if (i < API.overpass.length) return attempt();
        throw err;
      });
    }
    return attempt();
  }

  function detectType(t) {
    if (t.amenity === 'library') return 'library';
    if (t.shop === 'books') return 'books';
    if (t.amenity === 'cafe') return 'cafe';
    if (t.amenity === 'coworking_space' || t.office === 'coworking') return 'coworking';
    if (t.leisure === 'park') return 'park';
    if (t.leisure === 'garden') return 'garden';
    if (t.leisure === 'nature_reserve') return 'reserve';
    if (t.amenity === 'restaurant') return 'restaurant';
    if (t.amenity === 'ice_cream') return 'ice_cream';
    if (t.tourism === 'museum') return 'museum';
    if (t.tourism === 'gallery') return 'gallery';
    if (t.amenity === 'arts_centre') return 'arts';
    if (t.historic) return 'historic';
    if (t.tourism === 'attraction') return 'attraction';
    return 'place';
  }

  function toPlace(el) {
    var t = el.tags || {};
    var lat = el.lat != null ? el.lat : el.center && el.center.lat;
    var lng = el.lon != null ? el.lon : el.center && el.center.lon;
    if (lat == null || lng == null) return null;
    var name = t['name:en'] || t.name;
    if (!name) return null;
    var type = detectType(t);
    var hours = OpeningHours.parse(t.opening_hours);
    return {
      id: el.type + '/' + el.id,
      osmUrl: 'https://www.openstreetmap.org/' + el.type + '/' + el.id,
      name: name,
      nameLocal: t['name:en'] && t.name && t.name !== t['name:en'] ? t.name : null,
      lat: lat, lng: lng,
      type: type,
      tags: t,
      hours: hours,
      area: t['addr:suburb'] || t['addr:neighbourhood'] || t['addr:district'] || t['addr:quarter'] || null
    };
  }

  function budgetBand(p) {
    var t = p.tags, meta = TYPES[p.type];
    if (t.fee === 'no' || t.charge === '0') return 'Free';
    if (t.charge) return 'Entry: ' + t.charge;
    if (t.fee === 'yes') return 'Entry fee, check before you go';
    if (meta.paid) return 'You’ll buy something, so check prices';
    return 'Cost not listed, check before you go';
  }

  function wifiText(t) {
    var w = t.internet_access;
    if (w === 'wlan' || w === 'yes' || w === 'wifi') return t['internet_access:fee'] === 'yes' ? 'Wi-Fi listed (paid)' : 'Wi-Fi listed';
    if (w === 'no') return 'No Wi-Fi';
    if (w === 'terminal') return 'Computers, no Wi-Fi listed';
    return 'Wi-Fi not listed';
  }
  function seatingText(t) {
    var bits = [];
    if (t.outdoor_seating === 'yes') bits.push('outdoor seating');
    if (t.indoor_seating === 'yes') bits.push('indoor seating');
    if (t.outdoor_seating === 'no' && t.indoor_seating !== 'yes') bits.push('no outdoor seating');
    if (t.bench === 'yes') bits.push('benches');
    if (!bits.length) return 'Seating not listed';
    var s = bits.join(', ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function entryText(t) {
    var bits = [];
    if (t.access === 'private') bits.push('Private, may need permission');
    else if (t.access === 'customers') bits.push('Customers only');
    else if (t.access === 'members' || t.membership === 'required') bits.push('Members only');
    if (t.fee === 'no') bits.push('no entry fee');
    if (t.fee === 'yes') bits.push('entry fee');
    if (t.wheelchair === 'yes') bits.push('step-free access');
    if (t.wheelchair === 'limited') bits.push('some step-free access');
    if (t.wheelchair === 'no') bits.push('not step-free');
    if (t.female === 'yes') bits.push('women only');
    if (!bits.length) return 'Entry rules not listed';
    var s = bits.join(', ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function score(p, origin) {
    var c = state.choices, meta = TYPES[p.type];
    var d = distance(origin, p);
    var m = 1;
    if (c.intent === 'read' && (p.type === 'library' || p.type === 'books')) m *= 0.6;
    if (c.intent === 'work') {
      if (p.type === 'library' || p.type === 'coworking') m *= 0.6;
      if (p.type === 'cafe') m *= /^(wlan|yes|wifi)$/.test(p.tags.internet_access || '') ? 0.7 : 1.4;
    }
    if (c.company === 'solo' && !meta.solo) m *= 1.7;
    if ((c.company === 'group' || c.company === 'family') && (p.type === 'library' || p.type === 'coworking')) m *= 2;
    if (c.company === 'family' && (p.type === 'park' || p.type === 'museum' || p.type === 'ice_cream')) m *= 0.8;
    if (c.budget === 'low' && p.type === 'restaurant') m *= 1.5;
    if (c.budget === 'low' && meta.paid === false) m *= 0.85;
    if (p.hours) {
      var st = OpeningHours.status(p.hours);
      if (st && !st.open) m *= 1.3;
    }
    return d * m;
  }

  function keep(p) {
    var c = state.choices, meta = TYPES[p.type];
    if (c.budget === 'free') {
      if (meta.paid === true) return false;
      if (p.tags.fee === 'yes' || p.tags.charge) return false;
    }
    if (p.tags.access === 'private' || p.tags.access === 'no') return false;
    return true;
  }

  var searchSeq = 0;
  function findPlaces() {
    var c = state.choices;
    var origin = state.origin;
    if (!origin) {
      var mc = map.getCenter();
      origin = { lat: mc.lat, lng: mc.lng, label: 'the middle of the map', kind: 'map' };
    }
    var seq = ++searchSeq;
    var radius = +c.radius;
    showView('results');
    $('results-title').textContent = 'Looking for ' + INTENTS[c.intent].phrase + '…';
    $('results-sub').textContent = '';
    $('results-list').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    layers.places.clearLayers();

    overpass(overpassQuery(c.intent, origin, radius)).then(function (data) {
      if (seq !== searchSeq) return;
      var seen = {};
      var places = (data.elements || []).map(toPlace).filter(function (p) {
        if (!p || !keep(p)) return false;
        var k = p.name.toLowerCase() + '|' + p.lat.toFixed(3) + '|' + p.lng.toFixed(3);
        if (seen[k]) return false;
        seen[k] = true;
        return true;
      });
      places.forEach(function (p) {
        p.dist = distance(origin, p);
        p.score = score(p, origin);
      });
      places.sort(function (a, b) { return a.score - b.score; });
      state.places = places.slice(0, 40);
      state.placesOrigin = origin;
      renderResults(origin, radius, places.length);
    }).catch(function () {
      if (seq !== searchSeq) return;
      $('results-title').textContent = 'The map data isn’t answering';
      $('results-list').innerHTML = '<div class="empty"><p>We couldn’t reach OpenStreetMap just now. It’s usually back in a minute.</p><button type="button" class="btn btn-primary" id="retry-btn">Try again</button></div>';
      $('retry-btn').addEventListener('click', findPlaces);
    });
  }

  function renderResults(origin, radius, total) {
    var c = state.choices;
    var where = origin.kind === 'me' ? 'you' : origin.label;
    var list = $('results-list');
    var places = state.places;
    $('results-title').textContent = places.length
      ? places.length + (places.length === 1 ? ' place' : ' places') + ' for ' + INTENTS[c.intent].phrase
      : 'Nothing close enough yet';
    var bits = ['Within ' + fmtDist(radius) + ' of ' + where + '.'];
    if (c.budget === 'free') bits.push('Only places you don’t have to pay for.');
    if (c.company === 'solo') bits.push('Places that suit going alone come first.');
    if (c.company === 'group' || c.company === 'family') bits.push('Quiet reading rooms are moved down.');
    if (total > places.length) bits.push('Showing the best ' + places.length + '.');
    $('results-sub').textContent = bits.join(' ');

    if (!places.length) {
      list.innerHTML = '<div class="empty"><p>We didn’t find anything that fits within ' + fmtDist(radius) + '.</p><p>Try going a little further, or start from another neighbourhood.</p></div>';
      return;
    }

    list.innerHTML = places.map(cardHTML).join('');
    list.querySelectorAll('.card').forEach(function (el) {
      el.addEventListener('click', function () { openPlace(el.dataset.id); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPlace(el.dataset.id); } });
      el.addEventListener('mouseenter', function () { highlightPlace(el.dataset.id, false); });
    });

    var bounds = L.latLngBounds([[origin.lat, origin.lng]]);
    places.forEach(function (p) {
      p.marker = L.marker([p.lat, p.lng], { icon: icon.pin(false), title: p.name, riseOnHover: true })
        .addTo(layers.places)
        .on('click', function () { openPlace(p.id); });
      bounds.extend([p.lat, p.lng]);
    });
    if (origin.kind !== 'me') showSearchPointQuiet(origin);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });

    // Fill in neighbourhood names that OSM didn't tag on the place itself.
    places.slice(0, 25).forEach(function (p) {
      if (p.area) return;
      reverseLookup(p.lat, p.lng).then(function (r) {
        p.area = (r && r.area) || 'Lahore';
        document.querySelectorAll('[data-area-for="' + CSS.escape(p.id) + '"]').forEach(function (n) { n.textContent = p.area; });
      });
    });
  }

  function showSearchPointQuiet(o) {
    layers.search.clearLayers();
    L.marker([o.lat, o.lng], { icon: icon.search, title: o.label }).addTo(layers.search);
  }

  function statusHTML(p) {
    var st = OpeningHours.status(p.hours);
    if (st) return '<p class="status ' + (st.open ? 'open' : 'closed') + '">' + esc(st.text) + '</p>';
    return '<p class="status unknown">Check timings before you go</p>';
  }

  function cardHTML(p) {
    var meta = TYPES[p.type];
    return '<article class="card" tabindex="0" data-id="' + esc(p.id) + '" aria-label="' + esc(p.name) + '">' +
      '<div class="card-top"><div>' +
      '<h3>' + esc(p.name) + '</h3>' +
      '<p class="card-meta">' + esc(meta.label) + ' · <span data-area-for="' + esc(p.id) + '">' + esc(p.area || 'Lahore') + '</span></p>' +
      '</div><span class="card-dist">' + fmtDist(p.dist) + '</span></div>' +
      '<ul class="facts">' +
      '<li>' + esc(budgetBand(p)) + '</li>' +
      '<li>' + esc(meta.noise) + '</li>' +
      '<li>' + (meta.solo ? 'Good on your own' : 'Better with company') + '</li>' +
      '</ul>' +
      statusHTML(p) +
      '<p class="before"><strong>Before you go:</strong> ' + esc(wifiText(p.tags)) + ' · ' + esc(seatingText(p.tags)) + ' · ' + esc(entryText(p.tags)) + '</p>' +
      '</article>';
  }

  function highlightPlace(id, pan) {
    state.places.forEach(function (p) {
      if (!p.marker) return;
      var on = p.id === id;
      p.marker.setIcon(icon.pin(on));
      p.marker.setZIndexOffset(on ? 500 : 0);
      if (on && pan) map.panTo([p.lat, p.lng]);
    });
    document.querySelectorAll('.card').forEach(function (c) { c.classList.toggle('is-active', c.dataset.id === id); });
  }

  // ---------- One place ----------
  function openPlace(id) {
    var p = state.places.find(function (x) { return x.id === id; });
    if (!p) return;
    state.selected = p;
    highlightPlace(id, false);
    map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
    var t = p.tags, meta = TYPES[p.type];

    var address = [[t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '), t['addr:suburb'] || p.area, t['addr:city']]
      .filter(Boolean).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(', ');
    var phone = t.phone || t['contact:phone'];
    var website = t.website || t['contact:website'];
    var insta = t['contact:instagram'];
    var safeUrl = function (u) { return /^https?:\/\//i.test(u) ? u : 'https://' + u; };

    var hoursBlock;
    if (p.hours) {
      hoursBlock = '<ul class="hours-list">' + OpeningHours.weekLines(p.hours).map(function (l) {
        return '<li class="' + (l.today ? 'today' : '') + '"><span>' + l.day + '</span><span>' + esc(l.text) + '</span></li>';
      }).join('') + '</ul><p class="raw-hours">As listed on OpenStreetMap. Hours can change, especially around Ramadan and holidays.</p>';
    } else if (t.opening_hours) {
      hoursBlock = '<p>Check timings before you go.</p><p class="raw-hours">Listed as: ' + esc(t.opening_hours) + '</p>';
    } else {
      hoursBlock = '<p>Check timings before you go.</p>';
    }

    var extra = [];
    if (t.cuisine) extra.push(['Food', t.cuisine.replace(/_/g, ' ').replace(/;/g, ', ')]);
    if (t.diet_halal || t['diet:halal']) extra.push(['Halal', t['diet:halal'] || t.diet_halal]);
    if (t.smoking) extra.push(['Smoking', t.smoking.replace(/_/g, ' ')]);
    if (t.description) extra.push(['Note', t.description]);

    // Other places in this list, by distance from this one.
    var nearby = state.places.filter(function (x) { return x.id !== p.id; })
      .map(function (x) { return { p: x, d: distance(p, x) }; })
      .sort(function (a, b) { return a.d - b.d; }).slice(0, 4);

    $('place-detail').innerHTML =
      '<h2>' + esc(p.name) + '</h2>' +
      (p.nameLocal ? '<p class="muted" lang="ur" dir="auto">' + esc(p.nameLocal) + '</p>' : '') +
      '<p class="detail-type">' + esc(meta.label) + ' · <span data-area-for="' + esc(p.id) + '">' + esc(p.area || 'Lahore') + '</span> · ' + fmtDist(p.dist) + ' away</p>' +
      statusHTML(p) +
      '<ul class="facts"><li>' + esc(budgetBand(p)) + '</li><li>' + esc(meta.noise) + '</li><li>' + (meta.solo ? 'Good on your own' : 'Better with company') + '</li></ul>' +
      '<div class="btn-row">' +
      '<button type="button" class="btn btn-primary" id="place-go">Get directions</button>' +
      '<button type="button" class="btn" id="place-show">Show on map</button>' +
      '</div>' +
      '<div class="detail-block"><h3>Before you go</h3><dl>' +
      '<dt>Wi-Fi</dt><dd>' + esc(wifiText(t)) + '</dd>' +
      '<dt>Seating</dt><dd>' + esc(seatingText(t)) + '</dd>' +
      '<dt>Entry</dt><dd>' + esc(entryText(t)) + '</dd>' +
      '</dl></div>' +
      '<div class="detail-block"><h3>Opening hours</h3>' + hoursBlock + '</div>' +
      '<div class="detail-block"><h3>Details</h3><dl>' +
      (address ? '<dt>Address</dt><dd>' + esc(address) + '</dd>' : '') +
      (phone ? '<dt>Phone</dt><dd><a href="tel:' + esc(phone.replace(/[^\d+]/g, '')) + '">' + esc(phone) + '</a></dd>' : '') +
      (website ? '<dt>Website</dt><dd><a href="' + esc(safeUrl(website)) + '" target="_blank" rel="noopener">' + esc(website.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</a></dd>' : '') +
      (insta ? '<dt>Instagram</dt><dd>' + esc(insta) + '</dd>' : '') +
      extra.map(function (e) { return '<dt>' + esc(e[0]) + '</dt><dd>' + esc(e[1]) + '</dd>'; }).join('') +
      '<dt>Coordinates</dt><dd><span class="coords">' + fmtCoords(p) + '</span> <button type="button" class="link-btn" id="copy-coords">Copy</button></dd>' +
      '<dt>Source</dt><dd><a href="' + p.osmUrl + '" target="_blank" rel="noopener">OpenStreetMap</a>. Spot something wrong? You can fix it there.</dd>' +
      '</dl></div>' +
      (nearby.length ? '<div class="detail-block"><h3>Also nearby</h3><ul class="nearby-list">' + nearby.map(function (n) {
        return '<li><button type="button" data-id="' + esc(n.p.id) + '"><span class="nb-name">' + esc(n.p.name) + ' <span class="muted">· ' + esc(TYPES[n.p.type].label) + '</span></span><span class="nb-dist">' + fmtDist(n.d) + '</span></button></li>';
      }).join('') + '</ul></div>' : '');

    $('place-go').addEventListener('click', function () {
      openDirections(null, { lat: p.lat, lng: p.lng, label: p.name }, 'place');
    });
    $('place-show').addEventListener('click', function () {
      map.flyTo([p.lat, p.lng], 18, { duration: 0.6 });
      if (!isDesktop()) setSheet('peek');
    });
    $('copy-coords').addEventListener('click', function () {
      var txt = fmtCoords(p);
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('Coordinates copied.'); }, function () { toast(txt); });
    });
    document.querySelectorAll('.nearby-list button').forEach(function (b) {
      b.addEventListener('click', function () { openPlace(b.dataset.id); });
    });
    showView('place');
  }

  // ---------- Directions ----------
  autocomplete($('from-input'), $('from-list'), function (p) { state.from = { lat: p.lat, lng: p.lng, label: p.name }; getRoute(); });
  autocomplete($('to-input'), $('to-list'), function (p) { state.to = { lat: p.lat, lng: p.lng, label: p.name }; getRoute(); });

  function setFromMe() {
    return locate().then(function (me) {
      state.from = { lat: me.lat, lng: me.lng, label: 'Your location', isMe: true };
      $('from-input').value = 'Your location';
      return state.from;
    });
  }

  function openDirections(from, to, back) {
    state.directionsBack = back || (document.querySelector('.view:not([hidden])') || {}).dataset.view || 'find';
    if (state.directionsBack === 'directions') state.directionsBack = 'find';
    if (to) { state.to = to; $('to-input').value = to.label; }
    showView('directions');
    if (from) {
      state.from = from;
      $('from-input').value = from.label;
      getRoute();
    } else if (state.me) {
      state.from = { lat: state.me.lat, lng: state.me.lng, label: 'Your location', isMe: true };
      $('from-input').value = 'Your location';
      getRoute();
    } else {
      // Ask for location; if it isn't available, fall back to where you were searching from.
      $('route-summary').innerHTML = '<p class="small">Finding where you are…</p>';
      setFromMe().then(getRoute).catch(function () {
        if (state.origin && state.origin.kind !== 'me') {
          state.from = { lat: state.origin.lat, lng: state.origin.lng, label: state.origin.label };
          $('from-input').value = state.origin.label;
          getRoute();
        } else {
          $('route-summary').innerHTML = '<p class="small">Where are you starting from? Type a street or neighbourhood, or pick a spot on the map.</p>';
          $('from-input').focus();
        }
      });
    }
  }

  $('directions-back').addEventListener('click', function () {
    stopNav();
    clearRoute();
    showView(state.directionsBack);
  });
  $('from-me').addEventListener('click', function () {
    setFromMe().then(getRoute).catch(function () { toast('We couldn’t see where you are. Allow location, or type a street.', 5000); });
  });
  $('swap-btn').addEventListener('click', function () {
    var f = state.from; state.from = state.to; state.to = f;
    $('from-input').value = state.from ? state.from.label : '';
    $('to-input').value = state.to ? state.to.label : '';
    getRoute();
  });
  document.querySelectorAll('.segmented button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.mode = b.dataset.mode;
      document.querySelectorAll('.segmented button').forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
      getRoute();
    });
  });

  // Pick a point on the map for "from" or "to".
  function startPick(which) {
    state.picking = which;
    $('pick-text').textContent = 'Tap the map to choose where you’re ' + (which === 'from' ? 'starting' : 'going') + '.';
    $('pick-banner').hidden = false;
    map.getContainer().style.cursor = 'crosshair';
    if (!isDesktop()) setSheet('peek');
  }
  function endPick() {
    state.picking = null;
    $('pick-banner').hidden = true;
    map.getContainer().style.cursor = '';
  }
  function finishPick(ll) {
    var which = state.picking;
    endPick();
    var pt = { lat: ll.lat, lng: ll.lng, label: 'Dropped pin (' + fmtCoords({ lat: ll.lat, lng: ll.lng }) + ')' };
    state[which] = pt;
    $(which + '-input').value = pt.label;
    if (!isDesktop()) setSheet('half');
    getRoute();
    reverseLookup(ll.lat, ll.lng).then(function (r) {
      if (r && state[which] === pt) {
        pt.label = r.name;
        $(which + '-input').value = r.name;
      }
    });
  }
  $('from-pick').addEventListener('click', function () { startPick('from'); });
  $('to-pick').addEventListener('click', function () { startPick('to'); });
  $('pick-cancel').addEventListener('click', endPick);

  function clearRoute() {
    layers.route.clearLayers();
    state.route = null;
    $('route-summary').innerHTML = '';
    $('route-steps').innerHTML = '';
    $('start-nav').hidden = true;
  }

  function cardinal(b) {
    return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(((b % 360) + 360) % 360 / 45) % 8];
  }
  function ordinal(n) { return n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th'); }
  function turnWord(mod) {
    if (!mod) return 'ahead';
    if (mod === 'slight left') return 'slightly left';
    if (mod === 'slight right') return 'slightly right';
    return mod;
  }
  function side(mod) { return /left/.test(mod || '') ? 'left' : 'right'; }

  function stepText(s) {
    var m = s.maneuver, mod = m.modifier || '';
    var name = s.name || s.ref || '';
    var onto = name ? ' onto ' + name : '';
    var on = name ? ' on ' + name : '';
    switch (m.type) {
      case 'depart': return 'Head ' + cardinal(m.bearing_after || 0) + on;
      case 'arrive':
        if (/left/.test(mod)) return 'Arrive. It’s on your left';
        if (/right/.test(mod)) return 'Arrive. It’s on your right';
        return 'Arrive at your destination';
      case 'roundabout': case 'rotary': case 'roundabout turn':
        return 'At the roundabout, take the ' + ordinal(m.exit || 1) + ' exit' + onto;
      case 'exit roundabout': case 'exit rotary': return 'Leave the roundabout' + onto;
      case 'new name': return 'Continue' + onto;
      case 'end of road': return 'At the end of the road, turn ' + side(mod) + onto;
      case 'fork': return 'At the fork, keep ' + side(mod) + onto;
      case 'merge': return 'Merge ' + side(mod) + onto;
      case 'on ramp': return 'Take the ramp on the ' + side(mod) + onto;
      case 'off ramp': return 'Take the exit on the ' + side(mod) + onto;
      case 'continue':
        if (mod === 'uturn') return 'Make a U-turn' + onto;
        if (mod && mod !== 'straight') return 'Keep ' + side(mod) + onto;
        return 'Continue straight' + on;
      default:
        if (mod === 'uturn') return 'Make a U-turn' + onto;
        if (mod === 'straight') return 'Go straight' + onto;
        return 'Turn ' + turnWord(mod) + onto;
    }
  }
  function stepArrow(s) {
    var m = s.maneuver, mod = m.modifier || '';
    if (m.type === 'arrive') return '●';
    if (m.type === 'depart') return '↑';
    if (/roundabout|rotary/.test(m.type)) return '↻';
    if (mod === 'uturn') return '↶';
    if (mod === 'sharp left' || mod === 'left') return '←';
    if (mod === 'sharp right' || mod === 'right') return '→';
    if (mod === 'slight left') return '↖';
    if (mod === 'slight right') return '↗';
    return '↑';
  }

  var routeSeq = 0;
  function getRoute(opts) {
    opts = opts || {};
    var from = state.from, to = state.to;
    if (!from || !to) {
      clearRoute();
      if (!to) $('route-summary').innerHTML = '<p class="small">Where are you going? Type a place, or pick a spot on the map.</p>';
      return Promise.resolve();
    }
    var seq = ++routeSeq;
    if (!opts.silent) $('route-summary').innerHTML = '<p class="small">Working out the way…</p>';
    var url = API.route(state.mode) + from.lng.toFixed(6) + ',' + from.lat.toFixed(6) + ';' + to.lng.toFixed(6) + ',' + to.lat.toFixed(6) +
      '?overview=full&geometries=geojson&steps=true';
    return fetchJSON(url, { timeout: 20000 }).then(function (j) {
      if (seq !== routeSeq) return;
      if (j.code !== 'Ok' || !j.routes || !j.routes.length) throw new Error(j.code || 'NoRoute');
      var r = j.routes[0];
      var coords = r.geometry.coordinates.map(function (c) { return [c[1], c[0]]; });
      var steps = r.legs[0].steps.map(function (s) {
        return {
          text: stepText(s),
          arrow: stepArrow(s),
          distance: s.distance,
          duration: s.duration,
          loc: [s.maneuver.location[1], s.maneuver.location[0]]
        };
      });
      state.route = { coords: coords, steps: steps, distance: r.distance, duration: r.duration };
      drawRoute(!opts.silent);
      renderRoute();
    }).catch(function (e) {
      if (seq !== routeSeq) return;
      layers.route.clearLayers();
      $('route-steps').innerHTML = '';
      $('start-nav').hidden = true;
      var msg = String(e.message) === 'NoRoute'
        ? 'We couldn’t find a way between these two spots ' + MODES[state.mode] + '. Try moving one of them closer to a road.'
        : 'Directions aren’t answering right now. Try again in a moment.';
      $('route-summary').innerHTML = '<p class="small">' + msg + '</p>';
    });
  }

  function drawRoute(fit) {
    var r = state.route;
    layers.route.clearLayers();
    L.polyline(r.coords, { color: '#1F1B16', weight: 9, opacity: 0.18, interactive: false }).addTo(layers.route);
    L.polyline(r.coords, { color: '#2F5D46', weight: 5, opacity: 0.95, dashArray: state.mode === 'foot' ? '1 9' : null, lineCap: 'round', interactive: false }).addTo(layers.route);
    if (state.mode === 'foot') L.polyline(r.coords, { color: '#2F5D46', weight: 3, opacity: 0.5, interactive: false }).addTo(layers.route);
    if (!(state.from && state.from.isMe && state.me)) L.marker(r.coords[0], { icon: icon.start, interactive: false }).addTo(layers.route);
    L.marker(r.coords[r.coords.length - 1], { icon: icon.end, title: state.to.label }).addTo(layers.route);
    if (fit) map.fitBounds(L.latLngBounds(r.coords), { padding: [50, 50], maxZoom: 17 });
  }

  function renderRoute() {
    var r = state.route;
    var arrive = new Date(Date.now() + r.duration * 1000);
    var note = state.mode === 'car' ? 'Times don’t include traffic. Lahore at rush hour can double them.'
      : state.mode === 'bike' ? 'Follows roads open to bikes.'
      : 'Follows streets and paths open to people on foot.';
    $('route-summary').innerHTML =
      '<p class="big">' + fmtDuration(r.duration) + ' <span class="muted" style="font-size:18px">· ' + fmtDist(r.distance) + '</span></p>' +
      '<p class="small">' + esc(MODES[state.mode].charAt(0).toUpperCase() + MODES[state.mode].slice(1)) + ' to ' + esc(state.to.label) + '. You’d arrive around ' + fmtClock(arrive) + '.</p>' +
      '<p class="small">' + note + '</p>';
    var ol = $('route-steps');
    ol.innerHTML = r.steps.map(function (s, i) {
      return '<li data-i="' + i + '"><span class="step-icon" aria-hidden="true">' + s.arrow + '</span><span>' + esc(s.text) + '</span>' +
        '<span class="step-dist">' + (s.distance > 0 ? fmtDist(s.distance) : '') + '</span></li>';
    }).join('');
    ol.querySelectorAll('li').forEach(function (li) {
      li.addEventListener('click', function () {
        var s = r.steps[+li.dataset.i];
        map.flyTo(s.loc, 18, { duration: 0.5 });
        L.popup({ closeButton: false }).setLatLng(s.loc).setContent('<p class="popup-sub" style="margin:0">' + esc(s.text) + '</p>').openOn(map);
        if (!isDesktop()) setSheet('peek');
      });
    });
    var navigable = state.from && state.from.isMe;
    $('start-nav').hidden = false;
    $('start-nav').textContent = navigable ? 'Start navigation' : 'Start navigation from where I am';
  }

  // ---------- Live navigation ----------
  // Project points onto the route in local metres (fine at city scale).
  function toXY(p, ref) {
    var k = Math.cos(ref[0] * Math.PI / 180);
    return [(p[1] - ref[1]) * 111320 * k, (p[0] - ref[0]) * 110540];
  }
  function prepareNav() {
    var r = state.route;
    var ref = r.coords[0];
    var xy = r.coords.map(function (c) { return toXY(c, ref); });
    var cum = [0];
    for (var i = 1; i < xy.length; i++) cum.push(cum[i - 1] + Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]));
    // Where each manoeuvre sits along the route.
    var from = 0;
    var stepAlong = r.steps.map(function (s) {
      var sxy = toXY(s.loc, ref), best = from, bestD = Infinity;
      for (var j = from; j < xy.length; j++) {
        var d = Math.hypot(xy[j][0] - sxy[0], xy[j][1] - sxy[1]);
        if (d < bestD) { bestD = d; best = j; }
      }
      from = best;
      return cum[best];
    });
    return { ref: ref, xy: xy, cum: cum, stepAlong: stepAlong, total: cum[cum.length - 1] };
  }
  function projectOnRoute(g, p) {
    var pt = toXY([p.lat, p.lng], g.ref);
    var best = { dist: Infinity, along: 0 };
    for (var i = 1; i < g.xy.length; i++) {
      var a = g.xy[i - 1], b = g.xy[i];
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var len2 = dx * dx + dy * dy;
      var t = len2 ? Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / len2)) : 0;
      var x = a[0] + t * dx, y = a[1] + t * dy;
      var d = Math.hypot(pt[0] - x, pt[1] - y);
      if (d < best.dist) best = { dist: d, along: g.cum[i - 1] + t * Math.sqrt(len2) };
    }
    return best;
  }

  $('start-nav').addEventListener('click', function () {
    if (state.from && state.from.isMe) { startNav(); return; }
    setFromMe().then(function () { return getRoute(); }).then(function () { if (state.route) startNav(); })
      .catch(function () { toast('Navigation needs your location. Allow it and try again.', 5000); });
  });

  function startNav() {
    if (!navigator.geolocation || !state.route) return;
    stopNav();
    state.nav = { geo: prepareNav(), follow: true, off: 0, lastReroute: 0, watch: null, arrived: false };
    $('nav-banner').hidden = false;
    updateBanner(0);
    if (!isDesktop()) setSheet('peek');
    if (state.me) map.setView([state.me.lat, state.me.lng], 17);
    state.nav.watch = navigator.geolocation.watchPosition(onNavFix, function () {
      toast('Lost your location. We’ll keep trying.', 4000);
    }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
  }

  function stopNav() {
    if (!state.nav) return;
    if (state.nav.watch != null) navigator.geolocation.clearWatch(state.nav.watch);
    state.nav = null;
    $('nav-banner').hidden = true;
    $('recenter-btn').hidden = true;
  }
  $('nav-stop').addEventListener('click', function () { stopNav(); if (!isDesktop()) setSheet('half'); });
  $('recenter-btn').addEventListener('click', function () {
    if (!state.nav) return;
    state.nav.follow = true;
    $('recenter-btn').hidden = true;
    if (state.me) map.setView([state.me.lat, state.me.lng], Math.max(map.getZoom(), 17));
  });
  map.on('dragstart', function () {
    if (state.nav) { state.nav.follow = false; $('recenter-btn').hidden = false; }
  });

  function updateBanner(along) {
    var nav = state.nav, r = state.route, g = nav.geo;
    var idx = r.steps.length - 1;
    for (var i = 1; i < r.steps.length; i++) {
      if (g.stepAlong[i] > along + 8) { idx = i; break; }
    }
    var step = r.steps[idx];
    var toStep = Math.max(0, g.stepAlong[idx] - along);
    var remaining = Math.max(0, g.total - along);
    var remainingTime = r.duration * (g.total ? remaining / g.total : 0);
    $('nav-arrow').textContent = step.arrow;
    $('nav-dist').textContent = idx === r.steps.length - 1 && toStep < 30 ? 'Almost there' : 'In ' + fmtDist(toStep);
    $('nav-text').textContent = step.text;
    $('nav-remaining').textContent = fmtDist(remaining) + ' · ' + fmtDuration(remainingTime) + ' · arrive ' + fmtClock(new Date(Date.now() + remainingTime * 1000));
  }

  function onNavFix(pos) {
    var nav = state.nav;
    if (!nav) return;
    var c = pos.coords;
    updateMe(c.latitude, c.longitude, c.accuracy);
    var p = { lat: c.latitude, lng: c.longitude };
    if (nav.follow) map.setView([p.lat, p.lng], Math.max(map.getZoom(), 17), { animate: true });

    var end = state.route.coords[state.route.coords.length - 1];
    if (distance(p, { lat: end[0], lng: end[1] }) < 25) {
      if (!nav.arrived) {
        nav.arrived = true;
        $('nav-arrow').textContent = '●';
        $('nav-dist').textContent = 'You’re here';
        $('nav-text').textContent = state.to.label;
        $('nav-remaining').textContent = 'Enjoy your time.';
      }
      return;
    }

    var proj = projectOnRoute(nav.geo, p);
    var tolerance = Math.max(40, Math.min(c.accuracy || 0, 80));
    if (proj.dist > tolerance) {
      nav.off++;
      if (nav.off >= 3 && Date.now() - nav.lastReroute > 12000) {
        nav.lastReroute = Date.now();
        nav.off = 0;
        $('nav-dist').textContent = 'Finding a new way…';
        state.from = { lat: p.lat, lng: p.lng, label: 'Your location', isMe: true };
        getRoute({ silent: true }).then(function () {
          if (state.nav && state.route) { state.nav.geo = prepareNav(); updateBanner(0); }
        });
      }
      return;
    }
    nav.off = 0;
    updateBanner(proj.along);
  }

  window.addEventListener('resize', function () { map.invalidateSize(); });
})();

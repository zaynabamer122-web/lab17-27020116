/*
 * THIRD PLACE · The Lahore Atlas — navigation mode.
 * Everything on this page comes from live OpenStreetMap data:
 *   tiles      OpenStreetMap standard tiles
 *   search     Photon (komoot), Lahore-biased
 *   places     Overpass API (with Photon + OSM API as a fallback when Overpass is slow)
 *   details    OpenStreetMap API (opening hours, Wi-Fi, seating, contact)
 *   routes     OSRM via routing.openstreetmap.de (foot, car, bike) with turn-by-turn steps
 *
 * Link here from other pages with:
 *   navigate/?to=31.5579,74.3125&name=Lahore%20Museum   (directions to a point)
 *   navigate/?place=way/792447292                        (open one OSM place)
 *   navigate/?q=Anarkali                                 (start from a search)
 */
(function () {
  'use strict';

  // ---------- Setup ----------
  var LAHORE = { center: [31.5204, 74.3587], bbox: [74.10, 31.30, 74.60, 31.72] };
  var API = {
    photon: 'https://photon.komoot.io',
    osm: 'https://api.openstreetmap.org/api/0.6',
    overpass: [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.private.coffee/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
    ],
    route: function (mode) { return 'https://routing.openstreetmap.de/routed-' + mode + '/route/v1/driving/'; }
  };
  var SAVED_KEY = 'tp.navSaved';

  var INTENTS = {
    read: {
      phrase: 'somewhere to read',
      filters: ['["amenity"="library"]', '["shop"="books"]', '["amenity"="cafe"]'],
      words: ['library', 'books', 'book', 'cafe', 'coffee', 'tea'],
      tags: ['amenity:library', 'shop:books', 'amenity:cafe']
    },
    breathe: {
      phrase: 'somewhere to breathe',
      filters: ['["leisure"="park"]', '["leisure"="garden"]', '["leisure"="nature_reserve"]'],
      words: ['park', 'garden', 'bagh'],
      tags: ['leisure:park', 'leisure:garden', 'leisure:nature_reserve']
    },
    work: {
      phrase: 'somewhere to think',
      filters: ['["amenity"="library"]', '["amenity"="coworking_space"]', '["office"="coworking"]', '["amenity"="cafe"]'],
      words: ['library', 'cowork', 'cafe', 'coffee'],
      tags: ['amenity:library', 'amenity:coworking_space', 'office:coworking', 'amenity:cafe']
    },
    talk: {
      phrase: 'somewhere to talk',
      filters: ['["amenity"="cafe"]', '["amenity"="restaurant"]', '["amenity"="ice_cream"]'],
      words: ['cafe', 'coffee', 'tea', 'restaurant', 'grill', 'ice cream'],
      tags: ['amenity:cafe', 'amenity:restaurant', 'amenity:ice_cream']
    },
    wander: {
      phrase: 'somewhere old',
      filters: ['["tourism"="museum"]', '["tourism"="gallery"]', '["amenity"="arts_centre"]', '["historic"]', '["tourism"="attraction"]'],
      words: ['museum', 'gallery', 'fort', 'tomb', 'mosque', 'haveli', 'gate', 'art'],
      tags: ['tourism:museum', 'tourism:gallery', 'amenity:arts_centre', 'historic', 'tourism:attraction']
    }
  };

  // Original hairline emblems, drawn in currentColor.
  var EMBLEM = {
    book: '<path d="M3 6.5c3-1.6 6-1.6 9 0V19c-3-1.6-6-1.6-9 0zM12 6.5c3-1.6 6-1.6 9 0V19c-3-1.6-6-1.6-9 0z"/>',
    cup: '<path d="M5 10h11v4.5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 14.5zM16 11h1.8a2 2 0 0 1 0 4H16M8.5 3.5c0 1.8 1.8 1.8 1.8 4M12 3.5c0 1.8 1.8 1.8 1.8 4"/>',
    lamp: '<path d="M4 20.5h16M6.5 20.5v-6h11v6M9 14.5l-1.5-6.5 5.5-2.5M13 5.5l2.5 3"/>',
    tree: '<path d="M12 21v-6.5M12 14.5c-3.8 0-6-2.8-6-5.8a6 6 0 0 1 12 0c0 3-2.2 5.8-6 5.8zM8 21h8M12 11l-2-2M12 12.5l2.5-2.5"/>',
    bowl: '<path d="M3 11.5h18a9 9 0 0 1-18 0zM8 21h8M9.5 8c0-1.8 1.8-1.8 1.8-4M13 8c0-1.8 1.8-1.8 1.8-4"/>',
    cone: '<path d="M8 10.5l4 10.5 4-10.5M7 10.5a5 5 0 0 1 10 0zM9.2 13.5h5.6"/>',
    arch: '<path d="M5 21V11.5a7 7 0 0 1 14 0V21M3 21h18M9 21v-6.5a3 3 0 0 1 6 0V21M12 2.5v2"/>',
    frame: '<path d="M4 5h16v14H4zM7 16l3.5-4.5 2.5 2.5 2-2 2 4M15.5 8.5h.01"/>',
    dot: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.5"/>'
  };
  var SEAL = '<path d="M12 2.8l2 2.4 3-.6.6 3 2.6 1.6-1.4 2.8 1.4 2.8-2.6 1.6-.6 3-3-.6-2 2.4-2-2.4-3 .6-.6-3L3.8 15l1.4-2.8L3.8 9.4l2.6-1.6.6-3 3 .6z"/><path d="M9.5 15.5v-3a2.5 2.5 0 0 1 5 0v3M8.5 15.5h7"/>';

  // Noise and "solo" notes describe the kind of place, not this exact place.
  var TYPES = {
    library:    { label: 'Library',          noise: 'Usually quiet',            solo: true,  paid: false, role: 'quiet',  emblem: 'book' },
    books:      { label: 'Bookshop',         noise: 'Usually quiet',            solo: true,  paid: true,  role: 'quiet',  emblem: 'book' },
    cafe:       { label: 'Café',             noise: 'Usually a gentle murmur',  solo: true,  paid: true,  role: 'social', emblem: 'cup' },
    coworking:  { label: 'Co-working room',  noise: 'Usually quiet',            solo: true,  paid: true,  role: 'quiet',  emblem: 'lamp' },
    park:       { label: 'Park',             noise: 'Open air, varies by hour', solo: true,  paid: false, role: 'garden', emblem: 'tree' },
    garden:     { label: 'Garden',           noise: 'Usually calm',             solo: true,  paid: false, role: 'garden', emblem: 'tree' },
    reserve:    { label: 'Nature reserve',   noise: 'Usually calm',             solo: true,  paid: false, role: 'garden', emblem: 'tree' },
    restaurant: { label: 'Restaurant',       noise: 'Usually lively',           solo: false, paid: true,  role: 'social', emblem: 'bowl' },
    ice_cream:  { label: 'Ice cream',        noise: 'Usually lively',           solo: false, paid: true,  role: 'social', emblem: 'cone' },
    museum:     { label: 'Museum',           noise: 'Usually quiet',            solo: true,  paid: null,  role: 'old',    emblem: 'arch' },
    gallery:    { label: 'Gallery',          noise: 'Usually quiet',            solo: true,  paid: null,  role: 'quiet',  emblem: 'frame' },
    arts:       { label: 'Arts centre',      noise: 'Varies with what is on',   solo: true,  paid: null,  role: 'quiet',  emblem: 'frame' },
    historic:   { label: 'Historic place',   noise: 'Varies by hour',           solo: true,  paid: null,  role: 'old',    emblem: 'arch' },
    attraction: { label: 'Landmark',         noise: 'Often busy',               solo: true,  paid: null,  role: 'old',    emblem: 'arch' },
    place:      { label: 'Place',            noise: 'Check before you go',      solo: true,  paid: null,  role: 'quiet',  emblem: 'dot' }
  };

  var MODES = { foot: 'on foot', car: 'by car or rickshaw', bike: 'by bicycle' };

  var state = {
    choices: { intent: null, budget: null, company: null, radius: '2500' },
    origin: null,   // { lat, lng, label, kind: 'me' | 'search' | 'map' }
    me: null,
    places: [],
    placeIndex: {}, // id -> place, for everything we have shown
    selected: null,
    placeBack: 'results',
    from: null,
    to: null,
    mode: 'foot',
    route: null,
    picking: null,
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
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var circled = function (n) { return n >= 1 && n <= 20 ? String.fromCharCode(0x2460 + n - 1) : n + '.'; };

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

  var layers = {
    places: L.layerGroup().addTo(map),
    route: L.layerGroup().addTo(map),
    search: L.layerGroup().addTo(map),
    me: L.layerGroup().addTo(map)
  };

  var icon = {
    pin: function (role, active) {
      return L.divIcon({ className: '', html: '<div class="pin ' + role + (active ? ' is-active' : '') + '"></div>', iconSize: [16, 16], iconAnchor: [8, 16], popupAnchor: [0, -18] });
    },
    start: L.divIcon({ className: '', html: '<div class="dot-start"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }),
    end: L.divIcon({ className: '', html: '<div class="dot-end"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
    search: L.divIcon({ className: '', html: '<div class="dot-search"></div>', iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -8] }),
    me: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] })
  };

  // Footer scale bar follows the real map scale.
  function updateScale() {
    var size = map.getSize();
    var y = size.y / 2;
    var a = map.containerPointToLatLng([0, y]), b = map.containerPointToLatLng([120, y]);
    var max = distance({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
    var steps = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    var nice = steps[0];
    for (var i = 0; i < steps.length; i++) if (steps[i] <= max) nice = steps[i];
    var w = Math.max(24, Math.round(120 * nice / max));
    var svg = document.querySelector('.scale svg');
    svg.setAttribute('width', w);
    $('scale-label').textContent = fmtDist(nice);
  }
  map.on('zoomend moveend resize', updateScale);

  // ---------- Helpers ----------
  function fetchJSON(url, opts) {
    opts = opts || {};
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, opts.timeout || 20000);
    if (opts.signal) opts.signal.addEventListener('abort', function () { ctrl.abort(); });
    return fetch(url, { method: opts.method || 'GET', body: opts.body, signal: ctrl.signal })
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
  // 31°33′12″N 74°19′05″E: the atlas style, with seconds so it is precise to about 30 m.
  function fmtCoords(p) {
    function dms(v, pos, neg) {
      var a = Math.abs(v), d = Math.floor(a), mf = (a - d) * 60, m = Math.floor(mf), s = Math.round((mf - m) * 60);
      if (s === 60) { s = 0; m++; }
      if (m === 60) { m = 0; d++; }
      return d + '°' + (m < 10 ? '0' : '') + m + '′' + (s < 10 ? '0' : '') + s + '″' + (v >= 0 ? pos : neg);
    }
    return dms(p.lat, 'N', 'S') + ' ' + dms(p.lng, 'E', 'W');
  }
  function decimalCoords(p) { return p.lat.toFixed(6) + ', ' + p.lng.toFixed(6); }

  var toastTimer;
  function toast(msg, ms) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, ms || 3500);
  }

  // ---------- Header (phone) ----------
  $('nav-toggle').addEventListener('click', function () {
    var nav = document.querySelector('.nav');
    var open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    this.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // ---------- Panel / views ----------
  var panel = $('panel');
  var isDesktop = function () { return window.matchMedia('(min-width: 900px)').matches; };
  function setSheet(size) { panel.dataset.sheet = size; setTimeout(function () { map.invalidateSize(); }, 300); }
  $('panel-handle').addEventListener('click', function () {
    var order = ['peek', 'half', 'full'];
    setSheet(order[(order.indexOf(panel.dataset.sheet) + 1) % order.length]);
  });

  function currentView() { var v = document.querySelector('.view:not([hidden])'); return v ? v.dataset.view : 'find'; }
  function showView(name) {
    document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.dataset.view !== name; });
    $('panel-scroll').scrollTop = 0;
    if (!isDesktop() && panel.dataset.sheet === 'peek') setSheet('half');
  }
  document.querySelectorAll('[data-back]').forEach(function (b) {
    b.addEventListener('click', function () { showView(b.dataset.back); });
  });
  $('place-back').addEventListener('click', function () {
    highlightPlace(null);
    if (state.placeBack === 'saved') renderSaved();
    showView(state.placeBack === 'saved' ? 'saved' : state.places.length ? 'results' : 'find');
  });

  // ---------- Saved places (wax seals) ----------
  function readSaved() { try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch (e) { return []; } }
  function writeSaved(list) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch (e) { /* private mode */ } updateSavedCount(); }
  function isSaved(id) { return readSaved().some(function (s) { return s.id === id; }); }
  function toggleSaved(p) {
    var list = readSaved();
    var on = list.some(function (s) { return s.id === p.id; });
    list = on ? list.filter(function (s) { return s.id !== p.id; })
      : list.concat([{ id: p.id, name: p.name, lat: p.lat, lng: p.lng, type: p.type, area: p.area || null }]);
    writeSaved(list);
    document.querySelectorAll('.seal[data-id="' + CSS.escape(p.id) + '"]').forEach(function (b) {
      b.setAttribute('aria-pressed', on ? 'false' : 'true');
      b.setAttribute('aria-label', (on ? 'Seal ' : 'Unseal ') + p.name);
    });
    toast(on ? 'Removed from your places.' : 'Sealed into your places.');
    return !on;
  }
  function updateSavedCount() {
    var n = readSaved().length;
    var el = $('saved-count');
    el.textContent = n;
    el.hidden = n === 0;
  }
  function sealHTML(p) {
    var on = isSaved(p.id);
    return '<button type="button" class="seal" data-id="' + esc(p.id) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Unseal ' : 'Seal ') + esc(p.name) + '" title="Keep in My Places">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=".8" aria-hidden="true">' + SEAL + '</svg></button>';
  }
  $('my-places-btn').addEventListener('click', function () {
    document.querySelector('.nav').classList.remove('is-open');
    renderSaved();
    showView('saved');
  });
  function renderSaved() {
    var list = readSaved();
    var ref = state.me || state.origin || { lat: map.getCenter().lat, lng: map.getCenter().lng };
    if (!list.length) {
      $('saved-list').innerHTML = '<div class="empty"><p>Nothing sealed yet.</p><p>Press the wax seal on any place to keep it here.</p></div>';
      return;
    }
    $('saved-list').innerHTML = list.map(function (s) {
      var meta = TYPES[s.type] || TYPES.place;
      return '<article class="card" tabindex="0" data-id="' + esc(s.id) + '">' +
        '<div class="card-top">' + emblemHTML(s.type) + '<div><h3>' + esc(s.name) + '</h3>' +
        '<p class="card-meta">' + esc(meta.label) + ' · ' + esc(s.area || 'Lahore') + '</p></div>' +
        '<span class="card-dist">' + fmtDist(distance(ref, s)) + '</span></div>' +
        '<div class="card-foot"><button type="button" class="link-btn" data-go="' + esc(s.id) + '">The way there →</button>' + sealHTML(s) + '</div>' +
        '</article>';
    }).join('');
    wireCards($('saved-list'), function (id) { openPlaceById(id, 'saved'); });
  }

  // ---------- Search (Photon) ----------
  function photonFeature(f) {
    var p = f.properties || {};
    var c = f.geometry.coordinates;
    var name = p.name || [p.street, p.housenumber].filter(Boolean).join(' ') || p.district || p.city || 'Unnamed place';
    var kind = p.osm_key === 'highway' ? 'Street' : p.osm_key === 'place' ? 'Neighbourhood'
      : p.osm_value && p.osm_value !== 'yes' ? p.osm_value.replace(/_/g, ' ') : '';
    var area = [p.street && p.name !== p.street ? p.street : null, p.locality, p.district, p.city === 'Lahore Cant' ? 'Lahore' : p.city]
      .filter(function (x, i, arr) { return x && x !== name && arr.indexOf(x) === i; });
    return {
      name: name,
      lat: c[1], lng: c[0],
      osm: p.osm_type && p.osm_id ? { type: { N: 'node', W: 'way', R: 'relation' }[p.osm_type], id: p.osm_id, key: p.osm_key, value: p.osm_value } : null,
      sub: [kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : null].concat(area.slice(0, 2)).filter(Boolean).join(' · '),
      area: p.district || p.locality || p.suburb || null
    };
  }

  function photonSearch(q, signal) {
    var center = map.getCenter();
    var url = API.photon + '/api/?' + new URLSearchParams({
      q: q, lang: 'en', limit: '15', lat: center.lat.toFixed(5), lon: center.lng.toFixed(5)
    });
    return fetchJSON(url, { signal: signal }).then(function (j) {
      var b = LAHORE.bbox, seen = {};
      return (j.features || []).map(photonFeature).filter(function (p) {
        if (p.lng < b[0] || p.lng > b[2] || p.lat < b[1] || p.lat > b[3]) return false;
        var k = p.name + '|' + p.sub;
        if (seen[k]) return false;
        seen[k] = true;
        return true;
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
    function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; }
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
          if (!res.length) render('Nothing in Lahore by that name. Try a street or a landmark nearby.');
          else render();
        }).catch(function (e) {
          if (e.name !== 'AbortError') render('Search is not answering just now. Try again in a moment.');
        });
      }, 280);
    });
    input.addEventListener('keydown', function (e) {
      if (list.hidden || !items.length) return;
      if (e.key === 'ArrowDown') { active = (active + 1) % items.length; render(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { active = (active - 1 + items.length) % items.length; render(); e.preventDefault(); }
      else if (e.key === 'Enter') { pick(active < 0 ? 0 : active); e.preventDefault(); return; }
      else if (e.key === 'Escape') { close(); return; }
      if (active >= 0) input.setAttribute('aria-activedescendant', list.id + '-' + active);
    });
    input.addEventListener('blur', function () { setTimeout(close, 120); });
  }

  // ---------- Origin ("where we survey around") ----------
  function setOrigin(o) {
    state.origin = o;
    $('here-label').textContent = (o.kind === 'me' ? 'Surveying around where you are' : 'Surveying around ' + o.label) + '.';
  }

  autocomplete($('place-search'), $('place-search-list'), function (p) {
    showSearchPoint(p, true);
    setOrigin({ lat: p.lat, lng: p.lng, label: p.name, kind: 'search' });
  });

  function showSearchPoint(p, fly) {
    layers.search.clearLayers();
    var m = L.marker([p.lat, p.lng], { icon: icon.search }).addTo(layers.search);
    m.bindPopup(pointPopup(p)).openPopup();
    if (fly) map.flyTo([p.lat, p.lng], 16, { duration: reducedMotion ? 0 : 0.8 });
  }

  function pointPopup(p) {
    var div = document.createElement('div');
    div.innerHTML =
      '<p class="popup-title">' + esc(p.name) + '</p>' +
      '<p class="popup-sub">' + esc(p.sub || '') + (p.sub ? '<br>' : '') + '<span class="coords" style="font-size:14px">' + fmtCoords(p) + '</span></p>' +
      '<div class="popup-actions">' +
      '<button type="button" class="link-btn" data-a="to">The way here</button>' +
      '<button type="button" class="link-btn" data-a="from">Set out from here</button>' +
      '<button type="button" class="link-btn" data-a="near">Survey what is near</button>' +
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
        else $('find-hint').textContent = 'Tell us what you are hoping for, and we will survey around ' + p.name + '.';
      }
    });
    return div;
  }

  // Touch anywhere on the map: name the spot, offer the way there.
  map.on('click', function (e) {
    var ll = e.latlng;
    if (state.picking) { finishPick(ll); return; }
    if (state.nav) return;
    var popup = L.popup().setLatLng(ll).setContent('<p class="popup-sub">Reading the map…</p>').openOn(map);
    reverseLookup(ll.lat, ll.lng).then(function (r) {
      var p = { lat: ll.lat, lng: ll.lng, name: r ? r.name : 'Marked spot', sub: r ? r.sub : '' };
      if (map.hasLayer(popup)) popup.setContent(pointPopup(p));
    });
  });

  // ---------- Your location ----------
  function updateMe(lat, lng, accuracy) {
    state.me = { lat: lat, lng: lng, accuracy: accuracy };
    layers.me.clearLayers();
    if (accuracy && accuracy < 1500) {
      L.circle([lat, lng], { radius: accuracy, color: '#424E68', weight: 0.6, opacity: 0.4, fillColor: '#A7C4CC', fillOpacity: 0.18, interactive: false }).addTo(layers.me);
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
      if (distance(me, { lat: LAHORE.center[0], lng: LAHORE.center[1] }) > 60000) {
        toast('You seem to be outside Lahore. Search for a street to begin from instead.', 5000);
        return me;
      }
      map.flyTo([me.lat, me.lng], 16, { duration: reducedMotion ? 0 : 0.8 });
      if (alsoOrigin) setOrigin({ lat: me.lat, lng: me.lng, label: 'your location', kind: 'me' });
      return me;
    }).catch(function () {
      toast('We could not see where you are. Allow location, or search for a street instead.', 5000);
      throw new Error('no-location');
    });
  }

  $('locate-btn').addEventListener('click', function () { locateAndCentre(true).catch(function () {}); });
  $('map-locate').addEventListener('click', function () {
    if (state.nav) { recentre(); return; }
    locateAndCentre(true).catch(function () {});
  });

  // ---------- Questions ----------
  document.querySelectorAll('.choices').forEach(function (fs) {
    var group = fs.dataset.group;
    fs.querySelectorAll('.chip:not(.is-on)').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
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

  $('find-btn').addEventListener('click', function () {
    var c = state.choices;
    var missing = !c.intent ? 'what you are hoping for' : !c.budget ? 'what you would like to spend' : !c.company ? 'who is coming with you' : null;
    if (missing) { $('find-hint').textContent = 'Tell us ' + missing + ' first.'; return; }
    findPlaces();
  });

  // ---------- Nearby places ----------
  function overpassQuery(intent, o, radius) {
    var around = '(around:' + radius + ',' + o.lat.toFixed(5) + ',' + o.lng.toFixed(5) + ')';
    var parts = INTENTS[intent].filters.map(function (f) { return 'nwr' + f + '["name"]' + around + ';'; });
    return '[out:json][timeout:45];(' + parts.join('') + ');out center tags 400;';
  }

  /** Ask the Overpass mirrors one after another (staggered), first answer wins. */
  function overpass(query) {
    return new Promise(function (resolve, reject) {
      var failed = 0, done = false;
      API.overpass.forEach(function (url, i) {
        setTimeout(function () {
          if (done) return;
          fetchJSON(url + '?data=' + encodeURIComponent(query), { timeout: 60000 }).then(function (j) {
            if (done) return;
            done = true;
            resolve(j.elements || []);
          }, function (err) {
            if (++failed === API.overpass.length && !done) { done = true; reject(err); }
          });
        }, i * 7000);
      });
    });
  }

  /** Fallback: Photon finds named places by kind; the OSM API then supplies their full tags. */
  function photonPlaces(intent, o, radius) {
    var dLat = radius / 110540, dLng = radius / (111320 * Math.cos(o.lat * Math.PI / 180));
    var bbox = [o.lng - dLng, o.lat - dLat, o.lng + dLng, o.lat + dLat].map(function (v) { return v.toFixed(5); }).join(',');
    var cfg = INTENTS[intent];
    var jobs = cfg.words.map(function (w) {
      var qs = new URLSearchParams({ q: w, bbox: bbox, limit: '50', lang: 'en' });
      cfg.tags.forEach(function (t) { qs.append('osm_tag', t); });
      return fetchJSON(API.photon + '/api/?' + qs, { timeout: 15000 }).then(function (j) { return j.features || []; }, function () { return []; });
    });
    return Promise.all(jobs).then(function (lists) {
      var byId = {};
      [].concat.apply([], lists).forEach(function (f) {
        var p = f.properties || {};
        if (!p.name || !p.osm_type) return;
        var type = { N: 'node', W: 'way', R: 'relation' }[p.osm_type];
        var tags = { name: p.name };
        tags[p.osm_key] = p.osm_value;
        if (p.street) tags['addr:street'] = p.street;
        if (p.district) tags['addr:suburb'] = p.district;
        byId[type + '/' + p.osm_id] = { type: type, id: p.osm_id, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], tags: tags };
      });
      var els = Object.keys(byId).map(function (k) { return byId[k]; })
        .filter(function (e) { return distance(o, { lat: e.lat, lng: e.lon }) <= radius; });
      return enrichFromOSM(els).then(function () { return els; });
    });
  }

  function enrichFromOSM(els) {
    var groups = { node: [], way: [], relation: [] };
    els.forEach(function (e) { groups[e.type].push(e); });
    var jobs = Object.keys(groups).filter(function (t) { return groups[t].length; }).map(function (t) {
      var ids = groups[t].slice(0, 300).map(function (e) { return e.id; }).join(',');
      return fetchJSON(API.osm + '/' + t + 's.json?' + t + 's=' + ids, { timeout: 15000 }).then(function (j) {
        var tagsById = {};
        (j.elements || []).forEach(function (x) { tagsById[x.id] = x.tags || {}; });
        groups[t].forEach(function (e) { if (tagsById[e.id]) e.tags = Object.assign({}, e.tags, tagsById[e.id]); });
      }).catch(function () { /* keep what Photon gave us */ });
    });
    return Promise.all(jobs);
  }

  /**
   * Get places: Overpass first. If it has not answered after 15 s, run the Photon fallback too and
   * show whichever arrives first. If Overpass answers later, `onUpgrade` gets the fuller list.
   */
  function fetchElements(intent, o, radius, onUpgrade) {
    return new Promise(function (resolve, reject) {
      var settled = false, source = null, overFailed = false, fbFailed = false, fbStarted = false;
      function settle(els, src) { settled = true; source = src; clearTimeout(timer); resolve({ elements: els, source: src }); }
      function startFallback() {
        if (fbStarted || settled) return;
        fbStarted = true;
        photonPlaces(intent, o, radius).then(function (els) {
          if (settled) return;
          if (els.length || overFailed) settle(els, 'photon');
          else fbFailed = true;
        }).catch(function (err) {
          fbFailed = true;
          if (overFailed && !settled) reject(err);
        });
      }
      var timer = setTimeout(startFallback, 15000);
      overpass(overpassQuery(intent, o, radius)).then(function (els) {
        if (!settled) settle(els, 'overpass');
        else if (source === 'photon') onUpgrade(els);
      }).catch(function (err) {
        overFailed = true;
        if (settled) return;
        if (fbFailed) reject(err);
        else startFallback();
      });
    });
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

  var ARABIC = /[؀-ۿ]/;
  function toPlace(el) {
    var t = el.tags || {};
    var lat = el.lat != null ? el.lat : el.center && el.center.lat;
    var lng = el.lon != null ? el.lon : el.center && el.center.lon;
    if (lat == null || lng == null) return null;
    var name = t['name:en'] || t.name;
    if (!name) return null;
    var urdu = t['name:ur'] || (t.name && ARABIC.test(t.name) && t.name !== name ? t.name : null);
    return {
      id: el.type + '/' + el.id,
      osmUrl: 'https://www.openstreetmap.org/' + el.type + '/' + el.id,
      name: name,
      urdu: urdu,
      lat: lat, lng: lng,
      type: detectType(t),
      tags: t,
      hours: OpeningHours.parse(t.opening_hours),
      area: t['addr:suburb'] || t['addr:neighbourhood'] || t['addr:district'] || t['addr:quarter'] || null
    };
  }

  function spendBand(p) {
    var t = p.tags, meta = TYPES[p.type];
    if (t.fee === 'no' || t.charge === '0') return 'Free';
    if (t.charge) return 'Entry ' + t.charge.replace(/^PKR\s*/i, 'Rs. ');
    if (t.fee === 'yes') return 'Entry fee: check before you go';
    if (meta.paid) return 'Prices: check before you go';
    return 'Cost: check before you go';
  }
  function wifiText(t) {
    var w = t.internet_access;
    if (w === 'wlan' || w === 'yes' || w === 'wifi') return t['internet_access:fee'] === 'yes' ? 'Wi-Fi listed (paid)' : 'Wi-Fi listed';
    if (w === 'no') return 'No Wi-Fi';
    if (w === 'terminal') return 'Computers, no Wi-Fi listed';
    return 'Wi-Fi: check before you go';
  }
  function seatingText(t) {
    var bits = [];
    if (t.outdoor_seating === 'yes') bits.push('outdoor seating');
    if (t.indoor_seating === 'yes') bits.push('indoor seating');
    if (t.outdoor_seating === 'no' && t.indoor_seating !== 'yes') bits.push('no outdoor seating');
    if (t.bench === 'yes') bits.push('benches');
    if (!bits.length) return 'Seating: check before you go';
    var s = bits.join(', ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function entryText(t) {
    var bits = [];
    if (t.access === 'private') bits.push('private, may need permission');
    else if (t.access === 'customers') bits.push('customers only');
    else if (t.access === 'members' || t.membership === 'required') bits.push('members only');
    if (t.fee === 'no') bits.push('no entry fee');
    if (t.fee === 'yes') bits.push('entry fee');
    if (t.wheelchair === 'yes') bits.push('step-free access');
    if (t.wheelchair === 'limited') bits.push('some step-free access');
    if (t.wheelchair === 'no') bits.push('not step-free');
    if (t.female === 'yes') bits.push('women only');
    if (!bits.length) return 'Entry: check before you go';
    var s = bits.join(', ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function score(p, origin) {
    var c = state.choices, meta = TYPES[p.type];
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
    var st = OpeningHours.status(p.hours);
    if (st && !st.open) m *= 1.3;
    return distance(origin, p) * m;
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

  function buildPlaces(elements, origin) {
    var seen = {};
    var places = elements.map(toPlace).filter(function (p) {
      if (!p || !keep(p)) return false;
      var k = p.name.toLowerCase() + '|' + p.lat.toFixed(3) + '|' + p.lng.toFixed(3);
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
    places.forEach(function (p) {
      p.dist = distance(origin, p);
      p.score = score(p, origin);
      state.placeIndex[p.id] = p;
    });
    places.sort(function (a, b) { return a.score - b.score; });
    return places;
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
    $('results-title').textContent = 'Surveying for ' + INTENTS[c.intent].phrase + '…';
    $('results-sub').textContent = '';
    $('results-list').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    layers.places.clearLayers();
    var slow = setTimeout(function () {
      if (seq === searchSeq) $('results-sub').textContent = 'The survey office is slow today. Still reading the map…';
    }, 7000);

    fetchElements(c.intent, origin, radius, function upgrade(els) {
      // Overpass arrived after the fallback: show the fuller list if you are still looking at it.
      if (seq !== searchSeq || currentView() !== 'results') return;
      var all = buildPlaces(els, origin);
      if (all.length <= state.places.length) return;
      state.places = all.slice(0, 40);
      renderResults(origin, radius, all.length, 'overpass');
    }).then(function (res) {
      clearTimeout(slow);
      if (seq !== searchSeq) return;
      var all = buildPlaces(res.elements, origin);
      state.places = all.slice(0, 40);
      renderResults(origin, radius, all.length, res.source);
    }).catch(function () {
      clearTimeout(slow);
      if (seq !== searchSeq) return;
      $('results-title').textContent = 'The map is not answering';
      $('results-sub').textContent = '';
      $('results-list').innerHTML = '<div class="empty"><p>We could not reach OpenStreetMap just now. It is usually back within a minute.</p><button type="button" class="btn btn-ink" id="retry-btn">Try again</button></div>';
      $('retry-btn').addEventListener('click', findPlaces);
    });
  }

  function renderResults(origin, radius, total, source) {
    var c = state.choices;
    var where = origin.kind === 'me' ? 'you' : origin.label;
    var list = $('results-list');
    var places = state.places;
    $('results-title').textContent = places.length
      ? places.length + (places.length === 1 ? ' place' : ' places') + ' for ' + INTENTS[c.intent].phrase
      : 'Nothing close enough yet';
    var bits = ['Within ' + fmtDist(radius) + ' of ' + where + ', nearest and best suited first.'];
    if (c.budget === 'free') bits.push('Only places you need not pay for.');
    if (c.company === 'solo') bits.push('Places that suit going alone come first.');
    if (c.company === 'group' || c.company === 'family') bits.push('Hushed reading rooms are moved down.');
    if (total > places.length) bits.push('Showing the best ' + places.length + ' of ' + total + '.');
    $('results-sub').textContent = bits.join(' ');

    if (!places.length) {
      list.innerHTML = '<div class="empty"><p>Nothing fits within ' + fmtDist(radius) + '.</p><p>Try going a little further, or begin from another neighbourhood.</p></div>';
      return;
    }

    list.innerHTML = (source === 'photon'
      ? '<p class="notice">The main survey service is slow today, so this list may be shorter than usual. It will fill in if the service answers.</p>' : '') +
      places.map(cardHTML).join('');
    wireCards(list, function (id) { openPlace(id, 'results'); });

    layers.places.clearLayers();
    var bounds = L.latLngBounds([[origin.lat, origin.lng]]);
    places.forEach(function (p) {
      p.marker = L.marker([p.lat, p.lng], { icon: icon.pin(TYPES[p.type].role, false), title: p.name, riseOnHover: true })
        .addTo(layers.places)
        .on('click', function () { openPlace(p.id, 'results'); });
      bounds.extend([p.lat, p.lng]);
    });
    if (origin.kind !== 'me') {
      layers.search.clearLayers();
      L.marker([origin.lat, origin.lng], { icon: icon.search, title: origin.label }).addTo(layers.search);
    }
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });

    // Fill in neighbourhood names that OSM did not tag on the place itself.
    places.slice(0, 25).forEach(function (p) {
      if (p.area) return;
      reverseLookup(p.lat, p.lng).then(function (r) {
        p.area = (r && r.area) || 'Lahore';
        document.querySelectorAll('[data-area-for="' + CSS.escape(p.id) + '"]').forEach(function (n) { n.textContent = p.area; });
      });
    });
  }

  function wireCards(root, onOpen) {
    root.querySelectorAll('.card').forEach(function (el) {
      el.addEventListener('click', function (e) {
        var seal = e.target.closest('.seal');
        var go = e.target.closest('[data-go]');
        if (seal) {
          e.stopPropagation();
          var p = state.placeIndex[seal.dataset.id] || readSaved().find(function (s) { return s.id === seal.dataset.id; });
          if (p) toggleSaved(p);
          return;
        }
        if (go) {
          e.stopPropagation();
          var q = state.placeIndex[go.dataset.go] || readSaved().find(function (s) { return s.id === go.dataset.go; });
          if (q) openDirections(null, { lat: q.lat, lng: q.lng, label: q.name });
          return;
        }
        onOpen(el.dataset.id);
      });
      el.addEventListener('keydown', function (e) {
        if (e.target !== el) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(el.dataset.id); }
      });
      el.addEventListener('mouseenter', function () { highlightPlace(el.dataset.id); });
    });
  }

  function emblemHTML(type) {
    var meta = TYPES[type] || TYPES.place;
    return '<span class="emblem ' + meta.role + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + EMBLEM[meta.emblem] + '</svg></span>';
  }

  function statusHTML(p) {
    var st = OpeningHours.status(p.hours);
    if (st) return '<p class="status ' + (st.open ? 'open' : 'closed') + '">' + esc(st.text) + '</p>';
    return '<p class="status unknown">Opening hours: check before you go</p>';
  }

  function cardHTML(p) {
    var meta = TYPES[p.type];
    return '<article class="card" tabindex="0" data-id="' + esc(p.id) + '" aria-label="' + esc(p.name) + '">' +
      '<div class="card-top">' + emblemHTML(p.type) + '<div>' +
      '<h3>' + esc(p.name) + '</h3>' +
      '<p class="card-meta">' + esc(meta.label) + ' · <span data-area-for="' + esc(p.id) + '">' + esc(p.area || 'Lahore') + '</span></p>' +
      '</div><span class="card-dist">' + fmtDist(p.dist) + '</span></div>' +
      '<ul class="facts">' +
      '<li>' + esc(spendBand(p)) + '</li>' +
      '<li>' + esc(meta.noise) + '</li>' +
      '<li>' + (meta.solo ? 'Kind to the solo visitor' : 'Better in company') + '</li>' +
      '</ul>' +
      statusHTML(p) +
      '<p class="before"><span>Before you go</span> · ' + esc(wifiText(p.tags)) + ' · ' + esc(seatingText(p.tags)) + ' · ' + esc(entryText(p.tags)) + '</p>' +
      '<div class="card-foot"><button type="button" class="link-btn" data-go="' + esc(p.id) + '">The way there →</button>' + sealHTML(p) + '</div>' +
      '</article>';
  }

  function highlightPlace(id) {
    state.places.forEach(function (p) {
      if (!p.marker) return;
      var on = p.id === id;
      p.marker.setIcon(icon.pin(TYPES[p.type].role, on));
      p.marker.setZIndexOffset(on ? 500 : 0);
    });
    document.querySelectorAll('.card').forEach(function (c) { c.classList.toggle('is-active', c.dataset.id === id); });
  }

  // ---------- One place ----------
  function openPlaceById(id, back) {
    if (state.placeIndex[id] && state.placeIndex[id].tags) { openPlace(id, back); return; }
    var m = /^(node|way|relation)\/(\d+)$/.exec(id);
    if (!m) return;
    var saved = readSaved().find(function (s) { return s.id === id; });
    toast('Opening the survey notes…', 6000);
    fetchJSON(API.osm + '/' + m[1] + '/' + m[2] + '.json', { timeout: 15000 }).then(function (j) {
      var el = j.elements && j.elements[0];
      if (!el) throw new Error('missing');
      var lat = el.lat != null ? el.lat : saved && saved.lat;
      var lon = el.lon != null ? el.lon : saved && saved.lng;
      if (lat == null) {
        // A way or relation with no remembered point: find it through Photon.
        return photonSearch((el.tags && el.tags.name) || '').then(function (res) {
          var hit = res.find(function (r) { return r.osm && r.osm.id === +m[2]; }) || res[0];
          if (!hit) throw new Error('nowhere');
          return { type: m[1], id: +m[2], lat: hit.lat, lon: hit.lng, tags: el.tags };
        });
      }
      return { type: m[1], id: +m[2], lat: lat, lon: lon, tags: el.tags || {} };
    }).then(function (el) {
      $('toast').hidden = true;
      var p = toPlace(el);
      if (!p) throw new Error('unnamed');
      var ref = state.me || state.origin || { lat: map.getCenter().lat, lng: map.getCenter().lng };
      p.dist = distance(ref, p);
      if (!p.area && saved) p.area = saved.area;
      state.placeIndex[p.id] = p;
      openPlace(p.id, back);
    }).catch(function () {
      toast('We could not open that place just now.', 4000);
    });
  }

  function openPlace(id, back) {
    var p = state.placeIndex[id];
    if (!p) return;
    state.selected = p;
    state.placeBack = back || 'results';
    highlightPlace(id);
    map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 16), { duration: reducedMotion ? 0 : 0.6 });
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
        return '<li class="' + (l.today ? 'today' : '') + '"><span>' + l.day + (l.today ? ' · today' : '') + '</span><span>' + esc(l.text) + '</span></li>';
      }).join('') + '</ul><p class="raw-hours">As listed on OpenStreetMap. Hours shift in Ramadan and on holidays, so check before you go.</p>';
    } else if (t.opening_hours) {
      hoursBlock = '<p>Check before you go.</p><p class="raw-hours">Listed as: ' + esc(t.opening_hours) + '</p>';
    } else {
      hoursBlock = '<p>Not listed. Check before you go.</p>';
    }

    var extra = [];
    if (t.cuisine) extra.push(['Food', t.cuisine.replace(/_/g, ' ').replace(/;/g, ', ')]);
    if (t['diet:halal']) extra.push(['Halal', t['diet:halal']]);
    if (t.smoking) extra.push(['Smoking', t.smoking.replace(/_/g, ' ')]);
    if (t.description) extra.push(['Note', t.description]);
    if (t.start_date) extra.push(['Dates from', t.start_date]);

    var nearby = state.places.filter(function (x) { return x.id !== p.id; })
      .map(function (x) { return { p: x, d: distance(p, x) }; })
      .sort(function (a, b) { return a.d - b.d; }).slice(0, 4);

    $('place-detail').innerHTML =
      '<div class="detail-head">' + emblemHTML(p.type) + '<div><h2>' + esc(p.name) + '</h2>' +
      (p.urdu ? '<p class="detail-urdu urdu" lang="ur" dir="rtl">' + esc(p.urdu) + '</p>' : '') + '</div>' + sealHTML(p) + '</div>' +
      '<p class="detail-type">' + esc(meta.label) + ' · <span data-area-for="' + esc(p.id) + '">' + esc(p.area || 'Lahore') + '</span>' + (p.dist != null ? ' · ' + fmtDist(p.dist) + ' away' : '') + '</p>' +
      statusHTML(p) +
      '<ul class="facts"><li>' + esc(spendBand(p)) + '</li><li>' + esc(meta.noise) + '</li><li>' + (meta.solo ? 'Kind to the solo visitor' : 'Better in company') + '</li></ul>' +
      '<div class="btn-row">' +
      '<button type="button" class="btn btn-ink" id="place-go">The way there</button>' +
      '<button type="button" class="btn" id="place-show">Show on the map</button>' +
      '</div>' +
      '<div class="detail-block"><h3>Before you go</h3><dl>' +
      '<dt>Wi-Fi</dt><dd>' + esc(wifiText(t)) + '</dd>' +
      '<dt>Seating</dt><dd>' + esc(seatingText(t)) + '</dd>' +
      '<dt>Entry</dt><dd>' + esc(entryText(t)) + '</dd>' +
      '</dl></div>' +
      '<div class="detail-block"><h3>Opening hours</h3>' + hoursBlock + '</div>' +
      '<div class="detail-block"><h3>Survey notes</h3><dl>' +
      (address ? '<dt>Address</dt><dd>' + esc(address) + '</dd>' : '') +
      (phone ? '<dt>Phone</dt><dd><a href="tel:' + esc(phone.replace(/[^\d+]/g, '')) + '">' + esc(phone) + '</a></dd>' : '') +
      (website ? '<dt>Website</dt><dd><a href="' + esc(safeUrl(website)) + '" target="_blank" rel="noopener">' + esc(website.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</a></dd>' : '') +
      (insta ? '<dt>Instagram</dt><dd>' + esc(insta) + '</dd>' : '') +
      extra.map(function (e) { return '<dt>' + esc(e[0]) + '</dt><dd>' + esc(e[1]) + '</dd>'; }).join('') +
      '<dt>Position</dt><dd><span class="coords">' + fmtCoords(p) + '</span><br><button type="button" class="link-btn" id="copy-coords">Copy as ' + decimalCoords(p) + '</button></dd>' +
      '<dt>Source</dt><dd><a href="' + p.osmUrl + '" target="_blank" rel="noopener">OpenStreetMap</a>. If something is wrong, you can correct it there.</dd>' +
      '</dl></div>' +
      (nearby.length ? '<div class="detail-block"><h3>Also near</h3><ul class="nearby-list">' + nearby.map(function (n, i) {
        return '<li><button type="button" data-id="' + esc(n.p.id) + '"><span class="nb-name"><span class="num">' + circled(i + 1) + '</span> ' + esc(n.p.name) + ' <span class="muted">· ' + esc(TYPES[n.p.type].label) + '</span></span><span class="nb-dist">' + fmtDist(n.d) + '</span></button></li>';
      }).join('') + '</ul></div>' : '');

    $('place-detail').querySelector('.seal').addEventListener('click', function () { toggleSaved(p); });
    $('place-go').addEventListener('click', function () {
      openDirections(null, { lat: p.lat, lng: p.lng, label: p.name }, 'place');
    });
    $('place-show').addEventListener('click', function () {
      map.flyTo([p.lat, p.lng], 18, { duration: reducedMotion ? 0 : 0.6 });
      if (!isDesktop()) setSheet('peek');
    });
    $('copy-coords').addEventListener('click', function () {
      var txt = decimalCoords(p);
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('Position copied.'); }, function () { toast(txt); });
    });
    document.querySelectorAll('.nearby-list button').forEach(function (b) {
      b.addEventListener('click', function () { openPlace(b.dataset.id, state.placeBack); });
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
    var cur = currentView();
    state.directionsBack = back || (cur === 'directions' ? state.directionsBack : cur);
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
      $('route-summary').innerHTML = '<p class="small">Finding where you are…</p>';
      setFromMe().then(getRoute).catch(function () {
        if (state.origin && state.origin.kind !== 'me') {
          state.from = { lat: state.origin.lat, lng: state.origin.lng, label: state.origin.label };
          $('from-input').value = state.origin.label;
          getRoute();
        } else {
          $('route-summary').innerHTML = '<p class="small">Where are you setting out from? Type a street or neighbourhood, or mark a spot on the map.</p>';
          $('from-input').focus();
        }
      });
    }
  }

  $('directions-back').addEventListener('click', function () {
    stopNav();
    clearRoute();
    showView(state.directionsBack || 'find');
  });
  $('from-me').addEventListener('click', function () {
    setFromMe().then(getRoute).catch(function () { toast('We could not see where you are. Allow location, or type a street.', 5000); });
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

  function startPick(which) {
    state.picking = which;
    $('pick-text').textContent = 'Touch the map where you are ' + (which === 'from' ? 'setting out from' : 'going') + '.';
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
    var pt = { lat: ll.lat, lng: ll.lng, label: 'Marked spot, ' + fmtCoords({ lat: ll.lat, lng: ll.lng }) };
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
    return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round((((b % 360) + 360) % 360) / 45) % 8];
  }
  function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
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
    var on = name ? ' along ' + name : '';
    switch (m.type) {
      case 'depart': return 'Set out ' + cardinal(m.bearing_after || 0) + on;
      case 'arrive':
        if (/left/.test(mod)) return 'Arrive. It is on your left';
        if (/right/.test(mod)) return 'Arrive. It is on your right';
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
        if (mod === 'uturn') return 'Turn back' + onto;
        if (mod && mod !== 'straight') return 'Keep ' + side(mod) + onto;
        return 'Continue straight' + on;
      default:
        if (mod === 'uturn') return 'Turn back' + onto;
        if (mod === 'straight') return 'Go straight' + onto;
        return 'Turn ' + turnWord(mod) + onto;
    }
  }
  function stepArrow(s) {
    var m = s.maneuver, mod = m.modifier || '';
    if (m.type === 'arrive') return '○';
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
      if (!to) $('route-summary').innerHTML = '<p class="small">Where are you going? Type a place, or mark a spot on the map.</p>';
      return Promise.resolve();
    }
    var seq = ++routeSeq;
    if (!opts.silent) $('route-summary').innerHTML = '<p class="small">Working out the way…</p>';
    var url = API.route(state.mode) + from.lng.toFixed(6) + ',' + from.lat.toFixed(6) + ';' + to.lng.toFixed(6) + ',' + to.lat.toFixed(6) +
      '?overview=full&geometries=geojson&steps=true';
    return fetchJSON(url, { timeout: 20000 }).then(function (j) {
      if (seq !== routeSeq) return;
      if (j.code !== 'Ok' || !j.routes || !j.routes.length) throw new Error('NoRoute');
      var r = j.routes[0];
      var coords = r.geometry.coordinates.map(function (c) { return [c[1], c[0]]; });
      var steps = r.legs[0].steps.map(function (s) {
        return { text: stepText(s), arrow: stepArrow(s), distance: s.distance, duration: s.duration, loc: [s.maneuver.location[1], s.maneuver.location[0]] };
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
        ? 'We could not find a way between these two spots ' + MODES[state.mode] + '. Try moving one of them nearer a road.'
        : 'Directions are not answering just now. Try again in a moment.';
      $('route-summary').innerHTML = '<p class="small">' + msg + '</p>';
    });
  }

  function drawRoute(fit) {
    var r = state.route;
    layers.route.clearLayers();
    L.polyline(r.coords, { color: '#463B35', weight: state.mode === 'foot' ? 7 : 9, opacity: 0.14, interactive: false }).addTo(layers.route);
    var ink = L.polyline(r.coords, { color: '#424E68', weight: state.mode === 'foot' ? 3.5 : 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(layers.route);
    if (!(state.from && state.from.isMe && state.me)) L.marker(r.coords[0], { icon: icon.start, interactive: false }).addTo(layers.route);
    L.marker(r.coords[r.coords.length - 1], { icon: icon.end, title: state.to.label }).addTo(layers.route);
    if (fit) map.fitBounds(L.latLngBounds(r.coords), { padding: [50, 50], maxZoom: 17, animate: false });
    // Ink that draws itself along the way.
    var el = ink.getElement && ink.getElement();
    if (el && !reducedMotion && el.getTotalLength) {
      var len = el.getTotalLength();
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = len;
      el.classList.add('ink-draw');
      el.addEventListener('animationend', function () {
        el.classList.remove('ink-draw');
        el.style.strokeDasharray = '';
        el.style.strokeDashoffset = '';
      }, { once: true });
    }
  }

  function renderRoute() {
    var r = state.route;
    var arrive = new Date(Date.now() + r.duration * 1000);
    var note = state.mode === 'car' ? 'Times leave out traffic. At rush hour Lahore can double them.'
      : state.mode === 'bike' ? 'Follows roads open to bicycles.'
      : 'Follows streets and paths open to people on foot.';
    $('route-summary').innerHTML =
      '<p class="big">' + fmtDuration(r.duration) + ' <span>· ' + fmtDist(r.distance) + '</span></p>' +
      '<p class="small">' + esc(MODES[state.mode].charAt(0).toUpperCase() + MODES[state.mode].slice(1)) + ' to ' + esc(state.to.label) + '. You would arrive around ' + fmtClock(arrive) + '.</p>' +
      '<p class="small">' + note + '</p>';
    var ol = $('route-steps');
    ol.innerHTML = r.steps.map(function (s, i) {
      return '<li data-i="' + i + '"><span class="step-num" aria-hidden="true">' + circled(i + 1) + '</span><span class="step-arrow" aria-hidden="true">' + s.arrow + '</span><span>' + esc(s.text) + '</span>' +
        '<span class="step-dist">' + (s.distance > 0 ? fmtDist(s.distance) : '') + '</span></li>';
    }).join('');
    ol.querySelectorAll('li').forEach(function (li) {
      li.addEventListener('click', function () {
        var s = r.steps[+li.dataset.i];
        map.flyTo(s.loc, 18, { duration: reducedMotion ? 0 : 0.5 });
        L.popup({ closeButton: false }).setLatLng(s.loc).setContent('<p class="popup-sub" style="margin:0">' + circled(+li.dataset.i + 1) + ' ' + esc(s.text) + '</p>').openOn(map);
        if (!isDesktop()) setSheet('peek');
      });
    });
    $('start-nav').hidden = false;
    $('start-nav').textContent = state.from && state.from.isMe ? 'Begin the journey' : 'Begin the journey from where I am';
  }

  // ---------- Live navigation ----------
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
      var d = Math.hypot(pt[0] - (a[0] + t * dx), pt[1] - (a[1] + t * dy));
      if (d < best.dist) best = { dist: d, along: g.cum[i - 1] + t * Math.sqrt(len2) };
    }
    return best;
  }

  $('start-nav').addEventListener('click', function () {
    if (state.from && state.from.isMe) { startNav(); return; }
    setFromMe().then(function () { return getRoute(); }).then(function () { if (state.route) startNav(); })
      .catch(function () { toast('The journey needs your location. Allow it and try again.', 5000); });
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
      toast('Lost your location. We will keep trying.', 4000);
    }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
  }

  function stopNav() {
    if (!state.nav) return;
    if (state.nav.watch != null) navigator.geolocation.clearWatch(state.nav.watch);
    state.nav = null;
    $('nav-banner').hidden = true;
    $('recenter-btn').hidden = true;
  }
  function recentre() {
    if (!state.nav) return;
    state.nav.follow = true;
    $('recenter-btn').hidden = true;
    if (state.me) map.setView([state.me.lat, state.me.lng], Math.max(map.getZoom(), 17));
  }
  $('nav-stop').addEventListener('click', function () { stopNav(); if (!isDesktop()) setSheet('half'); });
  $('recenter-btn').addEventListener('click', recentre);
  map.on('dragstart', function () {
    if (state.nav) { state.nav.follow = false; $('recenter-btn').hidden = false; }
  });

  function updateBanner(along) {
    var r = state.route, g = state.nav.geo;
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
    if (nav.follow) map.setView([p.lat, p.lng], Math.max(map.getZoom(), 17), { animate: !reducedMotion });

    var end = state.route.coords[state.route.coords.length - 1];
    if (distance(p, { lat: end[0], lng: end[1] }) < 25) {
      if (!nav.arrived) {
        nav.arrived = true;
        $('nav-arrow').textContent = '○';
        $('nav-dist').textContent = 'You are here';
        $('nav-text').textContent = state.to.label;
        $('nav-remaining').textContent = 'Stay as long as you like.';
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

  // ---------- Links in from other pages ----------
  function readParams() {
    var qs = new URLSearchParams(location.search);
    var to = qs.get('to');
    if (to) {
      var m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(to);
      if (m) {
        var pt = { lat: +m[1], lng: +m[2], label: qs.get('name') || fmtCoords({ lat: +m[1], lng: +m[2] }) };
        map.setView([pt.lat, pt.lng], 16);
        openDirections(null, pt, 'find');
        return;
      }
    }
    var place = qs.get('place');
    if (place) { openPlaceById(place, 'find'); return; }
    var q = qs.get('q');
    if (q) {
      $('place-search').value = q;
      photonSearch(q).then(function (res) {
        if (!res.length) return;
        showSearchPoint(res[0], true);
        setOrigin({ lat: res[0].lat, lng: res[0].lng, label: res[0].name, kind: 'search' });
        $('place-search').value = res[0].name;
      }).catch(function () {});
    }
  }

  updateSavedCount();
  updateScale();
  readParams();
  window.addEventListener('resize', function () { map.invalidateSize(); });
  window.addEventListener('storage', function (e) { if (e.key === SAVED_KEY) updateSavedCount(); });
})();

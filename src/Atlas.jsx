import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MOODS, SPEND, COMPANY, NOISE, SPEND_LABEL, PLACES, COLLECTIONS } from './data.js'
import { Emblem } from './Emblems.jsx'
import { SPRING, Compass, WaxSeal, scrollToId } from './ui.jsx'
import { loadStyles } from './mapStyle.js'
import { km, fmtKm, fmtCoord, directionsUrl, useSaved, useStored, circled, prefersReduced } from './lib.js'

maplibregl.setWorkerUrl(workerUrl)

/* ======================= I. Discover: search by intention ======================= */
function Chips({ name, options, value, onChange }) {
  return (
    <LayoutGroup id={name}>
      <div className="chips" role="radiogroup" aria-label={name}>
        {options.map(o => {
          const on = value === o.id
          return (
            <button key={o.id} type="button" role="radio" aria-checked={on} className={`chip ${on ? 'is-on' : ''}`}
              onClick={() => onChange(on ? null : o.id)} data-cursor="link">
              {on && <motion.span layoutId={`${name}-pill`} className="chip-pill" transition={SPRING} />}
              <span className="chip-text">{o.label}</span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}

export function Discover({ filters, setFilters, count }) {
  const viewport = useRef(null)
  const dragging = useRef(false)
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }))
  const names = useMemo(() => [...new Set(PLACES.flatMap(p => [p.name, p.area]))], [])
  return (
    <div className="discover">
      <p className="ask">Where do you feel like going?</p>
      <div className="strip-viewport" ref={viewport}>
        <motion.div className="strip" drag="x" dragConstraints={viewport} dragElastic={0.06}
          dragTransition={{ power: 0.22, timeConstant: 240 }}
          onDragStart={() => { dragging.current = true }} onDragEnd={() => setTimeout(() => { dragging.current = false }, 60)}
          data-cursor="drag" data-cursor-label="drag">
          {MOODS.map((m, i) => {
            const on = filters.mood === m.id
            return (
              <motion.button key={m.id} type="button" className={`mood ${on ? 'is-on' : ''}`} aria-pressed={on}
                onClick={() => { if (!dragging.current) set('mood', on ? null : m.id) }}
                whileHover={{ y: -6 }} whileTap={{ scale: 0.96 }} transition={SPRING}
                data-cursor="open" data-cursor-label={on ? 'clear' : 'choose'}>
                <span className="mood-num">{circled(i + 1)}</span>
                <Emblem name={m.emblem} size={74} pigment={on ? 'var(--pomegranate)' : 'var(--terracotta)'} />
                <span className="mood-label">{m.label}</span>
                <span className="mood-line">{m.line}</span>
              </motion.button>
            )
          })}
        </motion.div>
      </div>

      <div className="filters">
        <div className="filter-row"><span className="filter-q">What would you like to spend?</span>
          <Chips name="spend" options={SPEND} value={filters.spend} onChange={v => set('spend', v)} /></div>
        <div className="filter-row"><span className="filter-q">Who are you going with?</span>
          <Chips name="company" options={COMPANY} value={filters.company} onChange={v => set('company', v)} /></div>
        <div className="filter-row"><label className="filter-q" htmlFor="q">A place or neighbourhood?</label>
          <div className="search">
            <input id="q" list="place-names" value={filters.q} onChange={e => set('q', e.target.value)} placeholder="Anarkali, Gulberg, a library…" autoComplete="off" />
            <datalist id="place-names">{names.map(n => <option key={n} value={n} />)}</datalist>
            {filters.q && <button type="button" className="search-clear" onClick={() => set('q', '')} aria-label="Clear search" data-cursor="link">×</button>}
          </div>
        </div>
      </div>

      <div className="discover-result">
        <motion.span key={count} className="result-count" initial={{ scale: 1.25, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING}>{count}</motion.span>
        <span>{count === 1 ? 'place matches' : 'places match'} how you feel today.</span>
        <button className="btn-line" onClick={() => scrollToId('atlas')} data-cursor="open" data-cursor-label="to the atlas">See them on the atlas ↓</button>
      </div>
    </div>
  )
}

/* ======================= II. The Atlas: map + list ======================= */
const TONES = ['calm', 'lively', 'inspiring', 'cosy']

function LetterForm({ place }) {
  const [, setLetters] = useStored('tp.letters', [])
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [tone, setTone] = useState('calm')
  const [msg, setMsg] = useState('')
  const submit = e => {
    e.preventDefault()
    if (text.trim().length < 12) { setMsg('Write at least a sentence: what should the next visitor know?'); return }
    setLetters(ls => [{ id: Date.now(), placeId: place.id, text: text.trim(), name: name.trim() || 'A visitor', tone, at: new Date().toISOString() }, ...ls])
    setText(''); setName(''); setMsg('Sealed. Your letter is saved on this device.')
  }
  return (
    <form className="letter-form" onSubmit={submit}>
      <label htmlFor={`l-${place.id}`}>Leave a letter for the next visitor</label>
      <textarea id={`l-${place.id}`} value={text} onChange={e => { setText(e.target.value); setMsg('') }} maxLength={220} rows={3}
        placeholder="Come here when it rains. The light through the windows is lovely." />
      <div className="letter-row">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name (optional)" maxLength={40} aria-label="Your name" />
        <div className="tones" role="radiogroup" aria-label="How it felt">
          {TONES.map(t => (
            <button type="button" key={t} role="radio" aria-checked={tone === t} className={tone === t ? 'is-on' : ''} onClick={() => setTone(t)} data-cursor="link">{t}</button>
          ))}
        </div>
        <button className="btn-ink btn-small" type="submit" data-cursor="seal" data-cursor-label="seal">Seal it</button>
      </div>
      <p className="form-msg" role="status">{msg}</p>
    </form>
  )
}

function PlaceCard({ p, n, selected, onSelect, distance }) {
  const [saved, toggle] = useSaved()
  const [letters] = useStored('tp.letters', [])
  const mine = letters.filter(l => l.placeId === p.id)
  const ref = useRef(null)
  useEffect(() => {
    if (!selected || !ref.current) return
    const list = ref.current.closest('.atlas-list')
    if (list && list.scrollHeight > list.clientHeight) list.scrollTo({ top: ref.current.offsetTop - 64, behavior: prefersReduced() ? 'auto' : 'smooth' })
  }, [selected])
  return (
    <motion.article ref={ref} layout="position" className={`card ${selected ? 'is-selected' : ''}`} transition={SPRING}>
      <button type="button" className="card-head" onClick={() => onSelect(selected ? null : p.id)} aria-expanded={selected}
        data-cursor="open" data-cursor-label={selected ? 'close' : 'open'}>
        <span className="card-num">{circled(n)}</span>
        <Emblem name={p.emblem} size={46} pigment="var(--terracotta)" />
        <span className="card-title">
          <b>{p.name}</b>
          <em>{p.area}{p.urdu && <span className="urdu" lang="ur"> · {p.urdu}</span>}</em>
        </span>
      </button>
      <div className="card-seal"><WaxSeal saved={saved.includes(p.id)} onToggle={() => toggle(p.id)} name={p.name} /></div>
      <ul className="tags">
        <li>{SPEND_LABEL[p.spend]}</li>
        <li>{NOISE[p.noise]}</li>
        <li>{p.solo ? 'Good alone' : 'Better with company'}</li>
        {distance != null && <li className="tag-dist">{fmtKm(distance)} away</li>}
      </ul>
      <AnimatePresence initial={false}>
        {selected && (
          <motion.div className="card-more" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING}>
            <div className="card-more-inner">
              <p className="card-coord">{fmtCoord(p.lat, p.lng)}</p>
              <h4 className="before-title">Before you go</h4>
              <dl className="before">
                <dt>Wi-Fi</dt><dd>{p.before.wifi}</dd>
                <dt>Seating</dt><dd>{p.before.seating}</dd>
                <dt>Access</dt><dd>{p.before.access}</dd>
                <dt>Entry</dt><dd>{p.before.entry}</dd>
                <dt>Timings</dt><dd>Check before you go.</dd>
              </dl>
              <h4 className="before-title">Letters from the city</h4>
              <blockquote className="letter letter--editor"><p>{p.note}</p><cite>Editors’ note, Third Place</cite></blockquote>
              {mine.map(l => (
                <blockquote key={l.id} className="letter"><p>{l.text}</p><cite>{l.name} · felt {l.tone} · saved on this device</cite></blockquote>
              ))}
              <LetterForm place={p} />
              <div className="card-actions">
                <a className="btn-line" href={directionsUrl([p])} target="_blank" rel="noreferrer" data-cursor="open" data-cursor-label="directions">Directions ↗</a>
                <span className="card-fine">Spend bands are our rough estimate.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

const ROUTE_SRC = 'tp-route'
function paintRoute(map, coords) {
  if (!map || !map.isStyleLoaded()) return
  const data = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }
  if (map.getSource(ROUTE_SRC)) map.getSource(ROUTE_SRC).setData(data)
  else {
    map.addSource(ROUTE_SRC, { type: 'geojson', data })
    map.addLayer({ id: 'tp-route-halo', type: 'line', source: ROUTE_SRC, paint: { 'line-color': '#F0E8D8', 'line-width': 6, 'line-opacity': 0.8 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
    map.addLayer({ id: 'tp-route', type: 'line', source: ROUTE_SRC, paint: { 'line-color': '#A86F70', 'line-width': 2.2, 'line-dasharray': [1, 1.6] }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
  }
}

export function Atlas({ places, selectedId, onSelect, route, collection, onClearCollection }) {
  const box = useRef(null)
  const mapRef = useRef(null)
  const stylesRef = useRef(null)
  const markers = useRef(new Map())
  const youMarker = useRef(null)
  const selectRef = useRef(onSelect)
  const drawnRoute = useRef([])
  selectRef.current = onSelect
  const [mode, setMode] = useState('illustrated')
  const [bearing, setBearing] = useState(0)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [you, setYou] = useState(null)
  const [locMsg, setLocMsg] = useState('')

  /* create the map once */
  useEffect(() => {
    let map, cancelled = false
    loadStyles().then(styles => {
      if (cancelled) return
      stylesRef.current = styles
      map = new maplibregl.Map({
        container: box.current, style: styles.illustrated, center: [74.33, 31.56], zoom: 11.6,
        minZoom: 9.5, maxZoom: 18, maxBounds: [[73.9, 31.2], [74.8, 31.9]], attributionControl: { compact: true }, pitchWithRotate: false,
      })
      mapRef.current = map
      map.scrollZoom.setWheelZoomRate(1 / 600)
      map.on('rotate', () => setBearing(map.getBearing()))
      map.on('load', () => setReady(true))
      map.on('style.load', () => { if (drawnRoute.current.length) paintRoute(map, drawnRoute.current) })
      PLACES.forEach(p => {
        const el = document.createElement('button')
        el.type = 'button'
        el.className = 'pin'
        el.setAttribute('aria-label', p.name)
        el.dataset.cursor = 'open'
        el.dataset.cursorLabel = p.name
        el.innerHTML = '<span class="pin-body"><span class="pin-num"></span></span><span class="pin-stem"></span>'
        el.addEventListener('click', e => { e.stopPropagation(); selectRef.current(p.id) })
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(map)
        markers.current.set(p.id, { marker, el })
      })
    }).catch(() => setFailed(true))
    return () => { cancelled = true; map?.remove(); markers.current.clear() }
  }, [])

  /* switch between illustrated and practical without losing anything */
  useEffect(() => {
    const map = mapRef.current, st = stylesRef.current
    if (!map || !st || !ready) return
    map.setStyle(st[mode], { diff: false })
  }, [mode, ready])

  /* sync markers with the current search */
  const order = useMemo(() => {
    const list = you ? [...places].sort((a, b) => km(you, a) - km(you, b)) : places
    return list
  }, [places, you])
  useEffect(() => {
    const idx = new Map(order.map((p, i) => [p.id, i + 1]))
    const onRoute = new Set(route?.stops.map(s => s.id) || [])
    markers.current.forEach(({ el }, id) => {
      const n = idx.get(id)
      el.style.display = n || onRoute.has(id) ? '' : 'none'
      el.querySelector('.pin-num').textContent = n || '·'
      el.classList.toggle('is-selected', id === selectedId)
      el.classList.toggle('on-route', onRoute.has(id))
    })
  }, [order, selectedId, route, ready])

  /* fly to the selected place */
  useEffect(() => {
    const map = mapRef.current
    const p = PLACES.find(x => x.id === selectedId)
    if (!map || !p) return
    map.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 14.6), speed: 1.1, curve: 1.5, essential: true, padding: { left: 0, right: 0, top: 80, bottom: 0 } })
  }, [selectedId])

  /* a wandering route draws itself across the map */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    if (!route) { drawnRoute.current = []; if (map.getSource(ROUTE_SRC)) paintRoute(map, []); return }
    const line = route.line
    const b = line.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(line[0], line[0]))
    map.fitBounds(b, { padding: 90, duration: 1200 })
    if (prefersReduced()) { drawnRoute.current = line; paintRoute(map, line); return }
    let raf, start
    const step = t => {
      if (!start) start = t
      const k = Math.min(1, (t - start) / 1800)
      const e = 1 - Math.pow(1 - k, 3)
      const upto = Math.max(2, Math.ceil(e * line.length))
      drawnRoute.current = line.slice(0, upto)
      paintRoute(map, drawnRoute.current)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    const go = setTimeout(() => { raf = requestAnimationFrame(step) }, 700)
    return () => { clearTimeout(go); cancelAnimationFrame(raf) }
  }, [route, ready])

  /* where am I? */
  const locate = () => {
    if (!navigator.geolocation) { setLocMsg('Your browser can’t share a location.'); return }
    setLocMsg('Finding you…')
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setYou(loc); setLocMsg('Sorted by distance from you.')
      const map = mapRef.current
      if (!map) return
      if (!youMarker.current) {
        const el = document.createElement('div'); el.className = 'you-pin'; el.innerHTML = '<span></span>'
        youMarker.current = new maplibregl.Marker({ element: el })
      }
      youMarker.current.setLngLat([loc.lng, loc.lat]).addTo(map)
      map.flyTo({ center: [loc.lng, loc.lat], zoom: 12.5, essential: true })
    }, () => setLocMsg('Location was not shared. Distances are hidden.'), { enableHighAccuracy: false, timeout: 9000 })
  }

  const col = COLLECTIONS.find(c => c.id === collection)
  const listKey = order.map(p => p.id).join('|')
  return (
    <div className="atlas">
      <div className="atlas-map-wrap" data-lenis-prevent data-cursor="map">
        <div className="atlas-map" ref={box} />
        <div className="atlas-grain" aria-hidden="true" />
        {failed && <p className="atlas-fail">The map tiles couldn’t load. Check your connection. The list still works.</p>}
        <div className="atlas-toolbar">
          <LayoutGroup id="mode">
            <div className="mode-toggle" role="radiogroup" aria-label="Map style">
              {[['illustrated', 'Illustrated atlas'], ['practical', 'Practical map']].map(([id, label]) => (
                <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)} data-cursor="link">
                  {mode === id && <motion.span layoutId="mode-pill" className="mode-pill" transition={SPRING} />}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>
        </div>
        <div className="atlas-tools">
          <Compass bearing={bearing} size={58} onClick={() => mapRef.current?.easeTo({ bearing: 0, duration: 700 })} />
          <button type="button" className="tool" onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in" data-cursor="link">+</button>
          <button type="button" className="tool" onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out" data-cursor="link">−</button>
          <button type="button" className="tool tool-wide" onClick={locate} data-cursor="link">Near me</button>
        </div>
        <p className="atlas-note">Real OpenStreetMap geography, {mode === 'illustrated' ? 'hand-tinted' : 'as it is'}. Right-drag to turn the map.</p>
      </div>

      <div className="atlas-list" data-lenis-prevent>
        <div className="atlas-list-head">
          <span className="eyebrow">{order.length} {order.length === 1 ? 'place' : 'places'}{col ? ` in ${col.title}` : ''}</span>
          {col && <button className="btn-text" onClick={onClearCollection} data-cursor="link">show all</button>}
          {locMsg && <span className="loc-msg" role="status">{locMsg}</span>}
        </div>
        {order.length === 0 && (
          <div className="empty">
            <Emblem name="lantern" size={52} pigment="var(--brass)" />
            <p>Nothing fits all of that yet. Loosen one wish (budget is usually the culprit) and the city opens up again.</p>
          </div>
        )}
        <motion.div key={listKey} className="cards" initial={{ clipPath: 'circle(0% at 12% 0%)' }} animate={{ clipPath: 'circle(160% at 12% 0%)' }} transition={{ duration: 0.9, ease: [0.3, 0.7, 0.2, 1] }}>
          {order.map((p, i) => (
            <PlaceCard key={p.id} p={p} n={i + 1} selected={p.id === selectedId} onSelect={onSelect} distance={you ? km(you, p) : null} />
          ))}
        </motion.div>
      </div>
    </div>
  )
}

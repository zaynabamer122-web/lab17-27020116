import { useEffect, useState, useCallback } from 'react'

/* ---------- seeded randomness for hand-drawn linework ---------- */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pointInPoly(x, y, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const f = n => Math.round(n * 10) / 10

export function smoothPath(pts, closed = false) {
  const n = pts.length
  const at = i => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`
  }
  return closed ? d + 'Z' : d
}

/* ---------- geography ---------- */
export function km(a, b) {
  const R = 6371, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
export const fmtKm = d => (d < 1 ? `${Math.round(d * 1000 / 10) * 10} m` : `${d.toFixed(1)} km`)

export function fmtCoord(lat, lng) {
  const dm = v => {
    const a = Math.abs(v), d = Math.floor(a), m = Math.floor((a - d) * 60)
    return `${d}°${String(m).padStart(2, '0')}′`
  }
  return `${dm(lat)}N ${dm(lng)}E`
}

export const directionsUrl = (stops) => {
  const ll = p => `${p.lat},${p.lng}`
  if (stops.length === 1) return `https://www.google.com/maps/dir/?api=1&destination=${ll(stops[0])}`
  const origin = ll(stops[0]), dest = ll(stops[stops.length - 1])
  const way = stops.slice(1, -1).map(ll).join('|')
  return `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${origin}&destination=${dest}${way ? `&waypoints=${encodeURIComponent(way)}` : ''}`
}

/* Real walking route from the public OSRM demo server (no key). Falls back to straight lines. */
export async function walkingRoute(stops) {
  const coords = stops.map(p => `${p.lng},${p.lat}`).join(';')
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const r = await fetch(`https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=geojson`, { signal: ctrl.signal })
    clearTimeout(t)
    const j = await r.json()
    if (j.code === 'Ok') return { line: j.routes[0].geometry.coordinates, km: j.routes[0].distance / 1000, real: true }
  } catch { /* offline or blocked: fall through */ }
  let total = 0
  for (let i = 1; i < stops.length; i++) total += km(stops[i - 1], stops[i])
  return { line: stops.map(p => [p.lng, p.lat]), km: total, real: false }
}

/* ---------- tiny persistent store shared across components ---------- */
const EVT = 'tp:store'
const read = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
export function useStored(key, fallback) {
  const [value, setValue] = useState(() => read(key, fallback))
  useEffect(() => {
    const sync = e => { if (!e.detail || e.detail === key) setValue(read(key, fallback)) }
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const set = useCallback(next => {
    const v = typeof next === 'function' ? next(read(key, fallback)) : next
    try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* private mode */ }
    window.dispatchEvent(new CustomEvent(EVT, { detail: key }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return [value, set]
}

export const useSaved = () => {
  const [saved, setSaved] = useStored('tp.saved', [])
  const toggle = id => setSaved(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  return [saved, toggle]
}

export const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
export const circled = n => (n >= 1 && n <= 20 ? String.fromCharCode(0x2460 + n - 1) : String(n))

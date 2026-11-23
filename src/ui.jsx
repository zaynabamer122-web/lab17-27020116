import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useScroll, useTransform, useAnimationControls } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { rng, fmtCoord, prefersReduced, useSaved, circled } from './lib.js'
import { PLACES, placeById } from './data.js'
import { ArchMark, Quatrefoil, Emblem } from './Emblems.jsx'

gsap.registerPlugin(ScrollTrigger)
export { gsap, ScrollTrigger }

export const SPRING = { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 } // precise, tactile

/* ---------- smooth scrolling ---------- */
export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReduced()) return
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true })
    window.__lenis = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = t => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => { gsap.ticker.remove(tick); lenis.destroy(); window.__lenis = null }
  }, [])
}
export const scrollToId = id => {
  const el = document.getElementById(id)
  if (!el) return
  if (window.__lenis) window.__lenis.scrollTo(el, { offset: -40, duration: 1.4 })
  else el.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth' })
}

/* ---------- surveyor's reticle cursor ---------- */
export function Cursor() {
  const x = useMotionValue(-200), y = useMotionValue(-200)
  const sx = useSpring(x, { stiffness: 1100, damping: 60, mass: 0.3 })
  const sy = useSpring(y, { stiffness: 1100, damping: 60, mass: 0.3 })
  const [mode, setMode] = useState('')
  const [label, setLabel] = useState('')
  const [down, setDown] = useState(false)
  const coordRef = useRef(null)
  const [enabled] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches)

  useEffect(() => {
    if (!enabled) return
    document.documentElement.classList.add('has-cursor')
    const move = e => {
      x.set(e.clientX); y.set(e.clientY)
      if (coordRef.current) {
        const lat = 31.62 - (e.clientY / window.innerHeight) * 0.16
        const lng = 74.24 + (e.clientX / window.innerWidth) * 0.18
        coordRef.current.textContent = fmtCoord(lat, lng)
      }
      const t = e.target.closest ? e.target.closest('[data-cursor]') : null
      const m = t ? t.dataset.cursor : ''
      setMode(prev => (prev === m ? prev : m))
      const l = t ? t.dataset.cursorLabel || '' : ''
      setLabel(prev => (prev === l ? prev : l))
    }
    const d = () => setDown(true), u = () => setDown(false)
    const leave = () => { x.set(-200); y.set(-200) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', d)
    window.addEventListener('pointerup', u)
    document.addEventListener('mouseleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', d)
      window.removeEventListener('pointerup', u)
      document.removeEventListener('mouseleave', leave)
      document.documentElement.classList.remove('has-cursor')
    }
  }, [enabled, x, y])

  if (!enabled) return null
  return (
    <motion.div className={`cursor ${mode ? 'cursor--' + mode : ''} ${down ? 'is-down' : ''}`} style={{ x: sx, y: sy }} aria-hidden="true">
      <div className="cursor-ring" />
      <div className="cursor-cross" />
      {mode === 'map' && (
        <svg className="cursor-needle" viewBox="0 0 20 20"><path d="M10 1L12.5 10H7.5Z" fill="#A86F70" /><path d="M10 19L7.5 10H12.5Z" fill="none" stroke="#463B35" strokeWidth=".7" /></svg>
      )}
      <span className="cursor-label">{label}</span>
      <span className="cursor-coord" ref={coordRef} />
    </motion.div>
  )
}

/* ---------- paper and faint survey linework behind everything ---------- */
export function Paper() {
  const { scrollY } = useScroll()
  const yLines = useTransform(scrollY, v => -v * 0.06)
  const d = useMemo(() => {
    const r = rng(1854)
    const step = 64, cols = 26, rows = 34
    const g = Array.from({ length: rows }, (_, j) => Array.from({ length: cols }, (_, i) => [i * step + (r() - 0.5) * 22, j * step + (r() - 0.5) * 22]))
    let p = ''
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = g[j][i]
      if (i < cols - 1 && r() > 0.18) p += `M${a[0].toFixed(0)},${a[1].toFixed(0)}L${g[j][i + 1][0].toFixed(0)},${g[j][i + 1][1].toFixed(0)}`
      if (j < rows - 1 && r() > 0.18) p += `M${a[0].toFixed(0)},${a[1].toFixed(0)}L${g[j + 1][i][0].toFixed(0)},${g[j + 1][i][1].toFixed(0)}`
    }
    return p
  }, [])
  return (
    <div className="paper" aria-hidden="true">
      <motion.svg className="paper-lines" viewBox="0 0 1600 2100" preserveAspectRatio="xMidYMin slice" style={{ y: yLines }}>
        <path d={d} />
      </motion.svg>
      <div className="paper-grain" />
    </div>
  )
}

/* ---------- navigation: the index of an old atlas ---------- */
function SunDial() {
  const now = new Date()
  const h = now.getHours() + now.getMinutes() / 60
  const day = h >= 6 && h <= 18.5
  const t = Math.min(1, Math.max(0, (h - 6) / 12.5))
  const cx = 4 + t * 32, cy = 18 - Math.sin(t * Math.PI) * 13
  return (
    <svg className="sundial" viewBox="0 0 40 22" width="40" height="22" aria-label={day ? 'Daytime in Lahore' : 'Night-time in Lahore'}>
      <path d="M2 19H38" stroke="currentColor" strokeWidth=".6" />
      <path d="M4 18C10 2 30 2 36 18" fill="none" stroke="currentColor" strokeWidth=".5" strokeDasharray="1 2" />
      {day
        ? <circle cx={cx} cy={cy} r="2.6" fill="#B49A69" />
        : <path d="M22 6a4 4 0 1 0 3 6.6a3.2 3.2 0 1 1 -3 -6.6Z" fill="#424E68" />}
    </svg>
  )
}

export function Nav({ home = true, onMyPlaces }) {
  const [saved] = useSaved()
  const [hidden, setHidden] = useState(false)
  const last = useRef(0)
  useEffect(() => {
    const on = () => {
      const y = window.scrollY
      setHidden(y > 240 && y > last.current)
      last.current = y
    }
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const href = id => (home ? `#${id}` : `index.html#${id}`)
  const go = (e, id) => { if (home) { e.preventDefault(); scrollToId(id) } }
  return (
    <motion.header className="nav" animate={{ y: hidden ? -90 : 0 }} transition={SPRING}>
      <a className="wordmark" href={home ? '#top' : 'index.html'} onClick={e => go(e, 'top')} data-cursor="link">
        <ArchMark />
        <span className="wordmark-text">THIRD PLACE<small>The Lahore Atlas</small></span>
      </a>
      <nav className="nav-index" aria-label="Atlas index">
        <a href={href('discover')} onClick={e => go(e, 'discover')} data-cursor="link"><i>I</i>Discover</a>
        <a href={href('atlas')} onClick={e => go(e, 'atlas')} data-cursor="link"><i>II</i>The Atlas</a>
        <a href={href('collections')} onClick={e => go(e, 'collections')} data-cursor="link"><i>III</i>Collections</a>
        <button type="button" onClick={onMyPlaces} data-cursor="link"><i>IV</i>My Places{saved.length > 0 && <span className="nav-count">{saved.length}</span>}</button>
        <a href="about.html" data-cursor="link" aria-current={home ? undefined : 'page'}><i>V</i>Colophon</a>
      </nav>
      <div className="nav-meta"><SunDial /><span>Lahore · 31°32′N</span></div>
    </motion.header>
  )
}

/* ---------- section heads: each section is entered through a gate ---------- */
export function GateHead({ gate, numeral, urdu, title, lede, align = 'left' }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (prefersReduced()) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: 'top 88%', end: 'top 42%', scrub: 0.5 } })
      tl.fromTo('.gate-title-ink', { clipPath: 'inset(-10% 100% -20% 0)' }, { clipPath: 'inset(-10% 0% -20% 0)', ease: 'none' }, 0)
        .fromTo('.ruling-pen', { left: '0%', opacity: 1 }, { left: '100%', ease: 'none' }, 0)
        .to('.ruling-pen', { opacity: 0, duration: 0.08 })
        .fromTo('.gate-rule', { scaleX: 0 }, { scaleX: 1, ease: 'none' }, 0)
        .fromTo('.gate-lede', { opacity: 0, y: 14 }, { opacity: 1, y: 0 }, 0.4)
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <header className={`gate-head gate-head--${align}`} ref={ref}>
      <div className="gate-meta">
        <Quatrefoil />
        <span className="gate-name">{gate} Gate · {numeral}</span>
        {urdu && <span className="urdu gate-urdu" lang="ur">{urdu}</span>}
      </div>
      <h2 className="gate-title"><span className="gate-title-ink">{title}</span><span className="ruling-pen" aria-hidden="true" /></h2>
      <span className="gate-rule" aria-hidden="true" />
      {lede && <p className="gate-lede">{lede}</p>}
    </header>
  )
}

/* ---------- a scale bar that measures itself out as you scroll ---------- */
export function ScaleBar({ label = 'metres' }) {
  const ref = useRef(null), fill = useRef(null), num = useRef(null)
  useLayoutEffect(() => {
    if (prefersReduced()) { fill.current.style.transform = 'scaleX(1)'; num.current.textContent = '500'; return }
    const st = ScrollTrigger.create({
      trigger: ref.current, start: 'top 95%', end: 'top 55%', scrub: true,
      onUpdate: s => {
        fill.current.style.transform = `scaleX(${s.progress})`
        num.current.textContent = String(Math.round(s.progress * 50) * 10)
      },
    })
    return () => st.kill()
  }, [])
  return (
    <div className="scalebar" ref={ref} aria-hidden="true">
      <div className="scalebar-track">
        {[0, 1, 2, 3, 4, 5].map(i => <span key={i} className="scalebar-tick" style={{ left: `${i * 20}%` }}><em>{i * 100}</em></span>)}
        <div className="scalebar-fill" ref={fill} />
      </div>
      <span className="scalebar-read"><b ref={num}>0</b> {label}</span>
    </div>
  )
}

/* ---------- compass rose ---------- */
export function Compass({ bearing = 0, size = 64, onClick }) {
  const r = useSpring(0, { stiffness: 260, damping: 14 }) // a little physical bounce as it settles
  useEffect(() => { r.set(-bearing) }, [bearing, r])
  return (
    <button type="button" className="compass" onClick={onClick} aria-label="Reset map to north" data-cursor="link" data-cursor-label="north" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="30" fill="#F0E8D8" stroke="#463B35" strokeWidth=".6" />
        <circle cx="32" cy="32" r="25" fill="none" stroke="#B49A69" strokeWidth=".5" strokeDasharray="1 2.4" />
        <motion.g style={{ rotate: r, originX: '32px', originY: '32px' }}>
          <path d="M32 6L36 32H28Z" fill="#A86F70" />
          <path d="M32 58L28 32H36Z" fill="none" stroke="#463B35" strokeWidth=".7" />
          <path d="M6 32L32 29V35Z M58 32L32 35V29Z" fill="none" stroke="#424E68" strokeWidth=".5" />
          <text x="32" y="4.5" textAnchor="middle" fontSize="5" fill="#463B35" fontFamily="Manrope" fontWeight="300">N</text>
        </motion.g>
        <circle cx="32" cy="32" r="1.6" fill="#463B35" />
      </svg>
    </button>
  )
}

/* ---------- wax seal: saving a place stamps it into your atlas ---------- */
export function WaxSeal({ saved, onToggle, name }) {
  const controls = useAnimationControls()
  const [ripple, setRipple] = useState(0)
  const click = e => {
    e.stopPropagation()
    controls.start({ scale: [1, 0.78, 1.07, 1], rotate: [0, -7, 2, 0], transition: { duration: 0.46, times: [0, 0.28, 0.66, 1], ease: 'easeOut' } })
    if (!saved) setRipple(n => n + 1)
    onToggle()
  }
  return (
    <button type="button" className={`seal ${saved ? 'is-saved' : ''}`} onClick={click} aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from My Places` : `Save ${name} to My Places`} data-cursor="seal" data-cursor-label={saved ? 'unseal' : 'seal it'}>
      <motion.svg viewBox="0 0 48 48" animate={controls}>
        <path className="seal-wax" d="M24 3C28 3 29 6 32 6.5C35.5 7 38 5.5 40.5 8.5C43 11.5 41 14 42.5 17C44 20 46 21 45.5 25C45 29 42 29.5 41.5 33C41 36.5 42.5 39 39 41.5C35.5 44 33.5 41.5 30 42.5C26.5 43.5 26 46 22 45.5C18 45 18 42 14.5 41C11 40 8.5 42 6.5 38.5C4.5 35 7 33 6 29.5C5 26 2 25 2.5 21C3 17 6 17 7 13.5C8 10 6.5 7.5 10 5.5C13.5 3.5 15.5 6 19 5C22.5 4 20 3 24 3Z" />
        <circle cx="24" cy="24" r="13" className="seal-ring" />
        <path className="seal-arch" d="M18 32V22.5C18 18.5 21 16 24 14.5C27 16 30 18.5 30 22.5V32M15.5 32H32.5" />
      </motion.svg>
      <AnimatePresence>
        {ripple > 0 && (
          <motion.span key={ripple} className="seal-ripple" initial={{ scale: 0.4, opacity: 0.5 }} animate={{ scale: 2.4, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }} />
        )}
      </AnimatePresence>
    </button>
  )
}

/* ---------- manuscript border: hairline botanical margins for special collections ---------- */
function Sprig({ className }) {
  return (
    <svg className={`sprig ${className}`} viewBox="0 0 60 60" aria-hidden="true">
      <path d="M2 58C10 40 22 26 40 14C46 10 52 6 58 2" fill="none" stroke="#879783" strokeWidth=".7" />
      <path d="M14 40C10 34 12 30 16 28C18 32 18 36 14 40Z M24 30C22 24 25 21 29 20C30 24 29 28 24 30Z M34 21C34 16 37 14 41 14C41 18 39 21 34 21Z M20 36C26 36 29 39 29 43C25 43 22 41 20 36Z M31 26C37 27 39 30 38 34C34 33 32 31 31 26Z"
        fill="#879783" fillOpacity=".35" stroke="#879783" strokeWidth=".5" />
      <circle cx="46" cy="10" r="3" fill="#C7A0A0" fillOpacity=".5" stroke="#B49A69" strokeWidth=".5" />
      <circle cx="10" cy="48" r="2.2" fill="#B49A69" fillOpacity=".5" />
    </svg>
  )
}
export function ManuscriptFrame({ children, className = '' }) {
  return (
    <div className={`ms-frame ${className}`}>
      <Sprig className="tl" /><Sprig className="tr" /><Sprig className="bl" /><Sprig className="br" />
      {children}
    </div>
  )
}

/* ---------- tilework niche: kashi kari arch with a tree of life ---------- */
export function TileNiche({ className = '' }) {
  return (
    <svg className={`tile-niche ${className}`} viewBox="0 0 220 300" aria-hidden="true">
      <defs>
        <pattern id="tile-band" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M10 2C13 2 13 6 10 8C7 6 7 2 10 2ZM18 10C18 13 14 13 12 10C14 7 18 7 18 10ZM10 18C7 18 7 14 10 12C13 14 13 18 10 18ZM2 10C2 7 6 7 8 10C6 13 2 13 2 10Z" fill="#C9C77F" fillOpacity=".5" stroke="#424E68" strokeWidth=".5" />
        </pattern>
      </defs>
      <rect x="2" y="2" width="216" height="296" fill="url(#tile-band)" opacity=".6" />
      <rect x="2" y="2" width="216" height="296" fill="none" stroke="#424E68" strokeWidth=".8" />
      <path d="M26 290V120C26 70 70 40 110 22C150 40 194 70 194 120V290Z" fill="#F0E8D8" stroke="#424E68" strokeWidth=".9" />
      <path d="M36 290V122C36 78 74 52 110 35C146 52 184 78 184 122V290" fill="#A7C4CC" fillOpacity=".18" stroke="#424E68" strokeWidth=".5" />
      <g className="tol" fill="none" stroke="#424E68" strokeWidth=".8" strokeLinecap="round">
        <path className="tol-ink" d="M110 285V120M110 240C90 230 76 214 70 196M110 240C130 230 144 214 150 196M110 200C92 190 82 176 80 160M110 200C128 190 138 176 140 160M110 160C98 150 92 138 92 126M110 160C122 150 128 138 128 126M110 120C104 110 104 98 110 88C116 98 116 110 110 120" />
      </g>
      <g fill="#C9C77F" fillOpacity=".65" stroke="#424E68" strokeWidth=".5">
        {[[70, 196], [150, 196], [80, 160], [140, 160], [92, 126], [128, 126], [62, 214], [158, 214]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y - 7}C${x + 5} ${y - 3} ${x + 5} ${y + 3} ${x} ${y + 7}C${x - 5} ${y + 3} ${x - 5} ${y - 3} ${x} ${y - 7}Z`} />
        ))}
      </g>
      <g fill="#A7C4CC" fillOpacity=".7" stroke="#424E68" strokeWidth=".5">
        {[[96, 218], [124, 218], [100, 178], [120, 178], [110, 98]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" />)}
      </g>
    </svg>
  )
}

/* ---------- My Places: the Little Atlas drawer ---------- */
const B = PLACES.reduce((b, p) => ({
  minLat: Math.min(b.minLat, p.lat), maxLat: Math.max(b.maxLat, p.lat),
  minLng: Math.min(b.minLng, p.lng), maxLng: Math.max(b.maxLng, p.lng),
}), { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 })
const proj = p => [20 + ((p.lng - B.minLng) / (B.maxLng - B.minLng)) * 280, 20 + ((B.maxLat - p.lat) / (B.maxLat - B.minLat)) * 200]

export function LittleAtlas({ open, onClose, onShow }) {
  const [saved, toggle] = useSaved()
  const places = saved.map(id => placeById[id]).filter(Boolean)
  useEffect(() => {
    if (!open) return
    const k = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    window.__lenis?.stop()
    return () => { window.removeEventListener('keydown', k); window.__lenis?.start() }
  }, [open, onClose])
  const pts = places.map(proj)
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="drawer-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside className="drawer" role="dialog" aria-label="My Places, the Little Atlas" data-lenis-prevent
            initial={{ x: '104%' }} animate={{ x: 0 }} exit={{ x: '104%' }} transition={SPRING}>
            <div className="drawer-head">
              <span className="eyebrow">IV · My Places</span>
              <button className="drawer-close" onClick={onClose} aria-label="Close My Places" data-cursor="link">×</button>
            </div>
            <h3 className="drawer-title">The Little Atlas</h3>
            <p className="drawer-lede">Every place you seal is inked into your own map of the city. It is kept on this device only.</p>
            <svg className="mini-atlas" viewBox="0 0 320 240" aria-label={`${places.length} saved places plotted on a small map`}>
              <rect x="4" y="4" width="312" height="232" fill="none" stroke="#463B35" strokeWidth=".5" />
              <rect x="8" y="8" width="304" height="224" fill="none" stroke="#B49A69" strokeWidth=".4" />
              {PLACES.map(p => { const [x, y] = proj(p); return <circle key={p.id} cx={x} cy={y} r="1.4" fill="#463B35" opacity=".25" /> })}
              {pts.length > 1 && (
                <motion.path d={`M${pts.map(p => p.join(',')).join('L')}`} fill="none" stroke="#A86F70" strokeWidth=".9" strokeDasharray="2 3"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeInOut' }} />
              )}
              {pts.map(([x, y], i) => (
                <motion.g key={places[i].id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...SPRING, delay: 0.15 + i * 0.06 }} style={{ originX: `${x}px`, originY: `${y}px` }}>
                  <circle cx={x} cy={y} r="6.5" fill="#C7A0A0" stroke="#A86F70" strokeWidth=".6" />
                  <text x={x} y={y + 2.4} textAnchor="middle" fontSize="7" fill="#463B35" fontFamily="Manrope">{i + 1}</text>
                </motion.g>
              ))}
              <text x="300" y="226" textAnchor="end" fontSize="7" fill="#7E6A58" fontFamily="Cormorant Garamond" fontStyle="italic">your Lahore, so far</text>
            </svg>
            {places.length === 0 ? (
              <div className="drawer-empty">
                <Emblem name="key" size={48} pigment="var(--rose)" />
                <p>Your atlas is still blank. Press the wax seal on any place to begin it.</p>
              </div>
            ) : (
              <ol className="drawer-list">
                {places.map((p, i) => (
                  <li key={p.id}>
                    <span className="numeral">{circled(i + 1)}</span>
                    <button className="drawer-place" onClick={() => onShow(p.id)} data-cursor="open" data-cursor-label="show">
                      <b>{p.name}</b><em>{p.area}</em>
                    </button>
                    <button className="drawer-remove" onClick={() => toggle(p.id)} aria-label={`Remove ${p.name}`} data-cursor="link">remove</button>
                  </li>
                ))}
              </ol>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

/* ---------- footer ---------- */
export function Footer() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const rot = useTransform(scrollYProgress, [0, 1], [140, 0])
  return (
    <footer className="footer" ref={ref}>
      <div className="footer-inner">
        <motion.svg className="footer-rose" viewBox="0 0 120 120" style={{ rotate: rot }} aria-hidden="true">
          <circle cx="60" cy="60" r="56" fill="none" stroke="#463B35" strokeWidth=".5" />
          <circle cx="60" cy="60" r="48" fill="none" stroke="#B49A69" strokeWidth=".4" strokeDasharray="1 3" />
          {Array.from({ length: 16 }, (_, i) => (
            <path key={i} d={i % 4 === 0 ? 'M60 6L64 60H56Z' : i % 2 === 0 ? 'M60 20L62.5 60H57.5Z' : 'M60 32L61.5 60H58.5Z'}
              transform={`rotate(${i * 22.5} 60 60)`} fill={i === 0 ? '#A86F70' : 'none'} stroke="#463B35" strokeWidth=".5" />
          ))}
          <text x="60" y="4" textAnchor="middle" fontSize="7" fill="#463B35" fontFamily="Manrope">N</text>
        </motion.svg>
        <div className="footer-copy">
          <p className="footer-mark">THIRD PLACE</p>
          <p className="footer-line">A guide to the spaces between home, university and work.</p>
          <ScaleBar label="metres from your door" />
          <p className="footer-small">Surveyed in Lahore · {new Date().getFullYear()} · <span className="urdu" lang="ur">لاہور</span></p>
          <p className="footer-small">Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" data-cursor="link">OpenStreetMap contributors</a>, tiles by <a href="https://openfreemap.org" target="_blank" rel="noreferrer" data-cursor="link">OpenFreeMap</a>. Timings and fees change, so check before you go.</p>
          <p className="footer-small">Lab 17 · 27020116</p>
        </div>
      </div>
    </footer>
  )
}

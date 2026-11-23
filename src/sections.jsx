import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useAnimationControls } from 'framer-motion'
import { COLLECTIONS, PLACES, WANDERS, placeById } from './data.js'
import { Emblem } from './Emblems.jsx'
import { gsap, SPRING, ManuscriptFrame, scrollToId } from './ui.jsx'
import { km, fmtKm, circled, walkingRoute, directionsUrl, useStored, prefersReduced } from './lib.js'

/* ======================= III. Collections: folios that fan out ======================= */
function Folio({ c, i, onOpen }) {
  const places = PLACES.filter(p => p.collections.includes(c.id))
  const controls = useAnimationControls()
  const open = async () => {
    await controls.start({ rotateY: -82, opacity: 0.4, transition: { duration: 0.32, ease: [0.5, 0, 0.75, 0] } })
    onOpen(c.id)
    controls.set({ rotateY: 0, opacity: 1 })
  }
  return (
    <div className="folio" style={{ '--i': i }}>
      <motion.div className="folio-page" animate={controls} style={{ transformOrigin: 'left center', '--pigment': c.pigment }}>
        <ManuscriptFrame>
          <span className="folio-num">{circled(i + 1)}</span>
          <p className="urdu folio-urdu" lang="ur">{c.urdu}</p>
          <h3 className="folio-title">{c.title}</h3>
          <p className="folio-line">{c.line}</p>
          <ul className="folio-places">
            {places.slice(0, 4).map(p => <li key={p.id}>{p.name}</li>)}
            {places.length > 4 && <li className="more">and {places.length - 4} more</li>}
          </ul>
          <button className="btn-line" onClick={open} data-cursor="open" data-cursor-label="turn the page">Open the collection · {places.length}</button>
        </ManuscriptFrame>
      </motion.div>
    </div>
  )
}

export function Collections({ onOpen }) {
  const root = useRef(null)
  useLayoutEffect(() => {
    if (prefersReduced()) return
    const mm = gsap.matchMedia()
    mm.add('(min-width: 900px)', () => {
      const folios = gsap.utils.toArray('.folio', root.current)
      const n = folios.length
      gsap.set(folios, { xPercent: -50, yPercent: -50, left: '50%', top: '50%', position: 'absolute' })
      gsap.set(folios, { x: (i) => i * 3, y: (i) => -i * 3, rotation: (i) => (i - 2) * 2.2 })
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: '+=120%', pin: true, scrub: 0.6 } })
      tl.to(folios, {
        x: (i) => (i - (n - 1) / 2) * 252,
        y: (i) => Math.abs(i - (n - 1) / 2) * 26,
        rotation: (i) => (i - (n - 1) / 2) * 5,
        ease: 'power2.out', stagger: 0.04,
      })
    })
    return () => mm.revert()
  }, [])
  return (
    <div className="collections" ref={root}>
      <div className="folios">
        {COLLECTIONS.map((c, i) => <Folio key={c.id} c={c} i={i} onOpen={onOpen} />)}
      </div>
      <p className="collections-hint" aria-hidden="true">keep scrolling to spread the folios</p>
    </div>
  )
}

/* ======================= IV. The Art of Wandering ======================= */
const POS = [[60, 70], [250, 180], [440, 80], [620, 200], [800, 90]]

export function Wandering({ onRoute }) {
  const root = useRef(null)
  const [wid, setWid] = useState(WANDERS[0].id)
  const [status, setStatus] = useState('')
  const w = WANDERS.find(x => x.id === wid)
  const stops = w.stops.map(id => placeById[id])
  const pts = stops.map((_, i) => POS[Math.round((i * (POS.length - 1)) / Math.max(1, stops.length - 1))])
  const d = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`
    const [px, py] = pts[i - 1]
    const mx = (px + x) / 2
    return `${acc}C${mx},${py} ${mx},${y} ${x},${y}`
  }, '')
  const legs = stops.slice(1).map((p, i) => km(stops[i], p))
  const total = legs.reduce((a, b) => a + b, 0)

  const { scrollYProgress } = useScroll({ target: root, offset: ['start 75%', 'center 45%'] })
  const draw = useTransform(scrollYProgress, [0, 1], [0, 1])

  const show = async () => {
    setStatus('Plotting a walking route…')
    const r = await walkingRoute(stops)
    onRoute({ id: w.id, stops, line: r.line })
    setStatus(r.real ? `About ${fmtKm(r.km)} on foot along real streets.` : `About ${fmtKm(r.km)} as the crow flies. The street routing service didn’t answer.`)
    scrollToId('atlas')
  }

  return (
    <div className="wandering" ref={root}>
      <div className="wander-tabs" role="tablist" aria-label="Moods for wandering">
        {WANDERS.map((x, i) => (
          <button key={x.id} role="tab" aria-selected={x.id === wid} className={`wander-tab ${x.id === wid ? 'is-on' : ''}`}
            onClick={() => { setWid(x.id); setStatus('') }} data-cursor="link">
            <span className="numeral">{circled(i + 1)}</span>
            <span><b>{x.title}</b><em>{x.mood}</em></span>
            <span className="urdu" lang="ur">{x.urdu}</span>
          </button>
        ))}
      </div>
      <div className="wander-plan" role="tabpanel">
        <svg viewBox="0 0 860 280" className="wander-svg" aria-label={`Route: ${stops.map(s => s.name).join(', then ')}`}>
          <path d={d} className="wander-shadow" />
          <motion.path key={wid} d={d} className="wander-line" style={{ pathLength: draw }} />
          {pts.map(([x, y], i) => (
            <Stop key={`${wid}-${i}`} x={x} y={y} i={i} n={stops.length} p={stops[i]} progress={draw} />
          ))}
          {legs.map((l, i) => {
            const [ax, ay] = pts[i], [bx, by] = pts[i + 1]
            return <text key={i} x={(ax + bx) / 2} y={(ay + by) / 2 - 14} className="wander-leg">{fmtKm(l)}</text>
          })}
        </svg>
        <div className="wander-foot">
          <p><b>{stops.length} stops</b> · roughly {fmtKm(total)} between them as the crow flies</p>
          <div className="wander-actions">
            <button className="btn-ink" onClick={show} data-cursor="open" data-cursor-label="draw it">Draw it on the atlas ↗</button>
            <a className="btn-line" href={directionsUrl(stops)} target="_blank" rel="noreferrer" data-cursor="open" data-cursor-label="directions">Walking directions</a>
          </div>
          <p className="form-msg" role="status">{status}</p>
        </div>
      </div>
    </div>
  )
}

function Stop({ x, y, i, n, p, progress }) {
  const at = n > 1 ? i / (n - 1) : 0
  const s = useTransform(progress, [Math.max(0, at - 0.06), at + 0.02], [0, 1])
  return (
    <motion.g style={{ scale: s, opacity: s, originX: `${x}px`, originY: `${y}px` }}>
      <circle cx={x} cy={y} r="17" className="stop-ring" />
      <text x={x} y={y + 5} className="stop-num">{i + 1}</text>
      <text x={x} y={y + 40} className="stop-name">{p.name}</text>
      <text x={x} y={y + 56} className="stop-area">{p.area}</text>
    </motion.g>
  )
}

/* ======================= V. Letters from the City ======================= */
const FEATURED = ['pak-tea-house', 'wazir-khan', 'quaid-library', 'badshahi', 'readings', 'shahi-hammam', 'model-town-park', 'coocos-den']

export function Letters({ onVisit }) {
  const [mine] = useStored('tp.letters', [])
  const slips = [
    ...mine.slice(0, 4).map(l => ({ key: `m${l.id}`, text: l.text, cite: `${l.name}, on ${placeById[l.placeId]?.name}`, sub: 'saved on this device', place: l.placeId, mine: true })),
    ...FEATURED.map(id => ({ key: id, text: placeById[id].note, cite: placeById[id].name, sub: 'editors’ note', place: id })),
  ]
  const tilt = i => [-2.2, 1.4, -0.8, 2, -1.6, 0.9, -2.4, 1.7, -1, 2.3, -0.6, 1.1][i % 12]
  return (
    <div className="letters">
      {slips.map((s, i) => (
        <motion.figure key={s.key} className={`slip ${s.mine ? 'slip--mine' : ''}`}
          initial={{ opacity: 0, y: -50, rotate: tilt(i) * 3 }}
          whileInView={{ opacity: 1, y: 0, rotate: tilt(i) }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ ...SPRING, delay: (i % 4) * 0.07 }}
          drag dragSnapToOrigin dragElastic={0.5} dragTransition={{ bounceStiffness: 520, bounceDamping: 22 }}
          whileDrag={{ scale: 1.05, rotate: 0, zIndex: 5 }}
          data-cursor="drag" data-cursor-label="lift">
          <Emblem name={placeById[s.place]?.emblem || 'window'} size={30} pigment="var(--rose)" className="slip-emblem" />
          <blockquote>“{s.text}”</blockquote>
          <figcaption>
            <button className="slip-place" onClick={() => onVisit(s.place)} data-cursor="open" data-cursor-label="visit">{s.cite} ↗</button>
            <span>{s.sub}</span>
          </figcaption>
        </motion.figure>
      ))}
    </div>
  )
}

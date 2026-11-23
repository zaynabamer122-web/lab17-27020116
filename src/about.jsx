import { StrictMode, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { motion, AnimatePresence } from 'framer-motion'
import './styles.css'
import { MOODS, PLACES } from './data.js'
import { Cursor, Paper, Nav, GateHead, ScaleBar, Footer, LittleAtlas, TileNiche, useSmoothScroll, gsap, SPRING } from './ui.jsx'
import { useStored, circled, prefersReduced } from './lib.js'

const AREAS = [...new Set(PLACES.map(p => p.area.split(',').pop().trim()))].sort()

export const validPhone = v => /^03\d{9}$/.test(v.replace(/[\s-]/g, ''))

function SuggestForm() {
  const [list, setList] = useStored('tp.suggestions', [])
  const blank = { name: '', phone: '', place: '', area: '', moods: [], note: '' }
  const [f, setF] = useState(blank)
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(false)
  const set = (k, v) => { setF(x => ({ ...x, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

  const submit = e => {
    e.preventDefault()
    const err = {}
    if (f.name.trim().length < 2) err.name = 'Tell us your name.'
    if (!validPhone(f.phone)) err.phone = 'Use an 11-digit mobile number starting with 03, like 0300 1234567.'
    if (f.place.trim().length < 2) err.place = 'Which place is it?'
    if (f.area.trim().length < 2) err.area = 'Which neighbourhood is it in?'
    if (f.moods.length === 0) err.moods = 'Pick at least one thing it’s good for.'
    setErrors(err)
    if (Object.keys(err).length) {
      document.getElementById(`s-${Object.keys(err)[0]}`)?.focus()
      return
    }
    setList(l => [{ ...f, phone: f.phone.replace(/[\s-]/g, ''), at: new Date().toISOString() }, ...l])
    setF(blank); setDone(true)
  }

  const field = (k, label, props = {}) => (
    <div className={`field ${errors[k] ? 'has-error' : ''}`}>
      <label htmlFor={`s-${k}`}>{label}</label>
      <input id={`s-${k}`} value={f[k]} onChange={e => set(k, e.target.value)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `e-${k}` : undefined} {...props} />
      <AnimatePresence>{errors[k] && <motion.p id={`e-${k}`} className="field-err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{errors[k]}</motion.p>}</AnimatePresence>
    </div>
  )

  return (
    <div className="suggest-wrap">
      <form className="suggest" onSubmit={submit} noValidate>
        {field('name', 'Your name', { autoComplete: 'name', maxLength: 60 })}
        {field('phone', 'Mobile number', { inputMode: 'numeric', autoComplete: 'tel', placeholder: '03XX XXXXXXX', maxLength: 13 })}
        {field('place', 'The place', { placeholder: 'A library, a rooftop, a courtyard…', maxLength: 80 })}
        {field('area', 'Neighbourhood', { list: 'areas', placeholder: 'Anarkali, Gulberg…', maxLength: 60 })}
        <datalist id="areas">{AREAS.map(a => <option key={a} value={a} />)}</datalist>
        <fieldset className={`field field--full ${errors.moods ? 'has-error' : ''}`}>
          <legend>What is it good for?</legend>
          <div className="chips">
            {MOODS.map(m => {
              const on = f.moods.includes(m.id)
              return (
                <button type="button" key={m.id} id={m === MOODS[0] ? 's-moods' : undefined} className={`chip ${on ? 'is-on is-filled' : ''}`} aria-pressed={on}
                  onClick={() => set('moods', on ? f.moods.filter(x => x !== m.id) : [...f.moods, m.id])} data-cursor="link">
                  <span className="chip-text">{m.label}</span>
                </button>
              )
            })}
          </div>
          {errors.moods && <p className="field-err">{errors.moods}</p>}
        </fieldset>
        <div className="field field--full">
          <label htmlFor="s-note">Why should someone go? <span className="opt">(optional)</span></label>
          <textarea id="s-note" rows={3} value={f.note} onChange={e => set('note', e.target.value)} maxLength={300} placeholder="Go on a weekday morning, when the light comes through the jaali." />
        </div>
        <div className="field--full suggest-actions">
          <button className="btn-ink" type="submit" data-cursor="seal" data-cursor-label="seal it">Seal and send</button>
          <span className="card-fine">We use your number only to ask about the place. It stays on this device for now.</span>
        </div>
      </form>
      <AnimatePresence>
        {done && (
          <motion.div className="stamp" role="status" initial={{ scale: 1.6, opacity: 0, rotate: -14 }} animate={{ scale: 1, opacity: 1, rotate: -6 }} exit={{ opacity: 0 }} transition={SPRING}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#A86F70" strokeWidth="1.2" />
              <circle cx="60" cy="60" r="46" fill="none" stroke="#A86F70" strokeWidth=".5" strokeDasharray="2 3" />
              <text x="60" y="56" textAnchor="middle" fill="#A86F70" fontFamily="Cormorant Garamond" fontSize="15" letterSpacing="3">RECEIVED</text>
              <text x="60" y="74" textAnchor="middle" fill="#A86F70" fontFamily="Manrope" fontSize="7" letterSpacing="2">THIRD PLACE · LAHORE</text>
            </svg>
            <p>Thank you. Your suggestion is sealed and saved on this device. There’s no server yet, so nothing has been sent anywhere.</p>
            <button className="btn-text" onClick={() => setDone(false)} data-cursor="link">suggest another</button>
          </motion.div>
        )}
      </AnimatePresence>
      {list.length > 0 && (
        <div className="your-suggestions">
          <h4 className="before-title">Your suggestions</h4>
          <ol>{list.map((s, i) => <li key={s.at}><span className="numeral">{circled(i + 1)}</span> {s.place}, <em>{s.area}</em></li>)}</ol>
        </div>
      )}
    </div>
  )
}

function About() {
  useSmoothScroll()
  const [drawer, setDrawer] = useState(false)
  const niche = useRef(null)
  useLayoutEffect(() => {
    if (prefersReduced()) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.tol-ink', { strokeDasharray: 600, strokeDashoffset: 600 }, {
        strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: niche.current, start: 'top 80%', end: 'bottom 60%', scrub: 0.6 },
      })
    }, niche)
    return () => ctx.revert()
  }, [])
  return (
    <>
      <Paper />
      <Cursor />
      <Nav home={false} onMyPlaces={() => setDrawer(true)} />
      <main className="colophon">
        <section className="section section--first">
          <GateHead gate="Kashmiri" numeral="I" urdu="کشمیری دروازہ" title="Colophon"
            lede="In an old manuscript, the colophon is the note at the end that says who made it, and how. This is ours." />
          <div className="colophon-grid">
            <div className="colophon-text">
              <p className="drop">The sociologist Ray Oldenburg called them <em>third places</em>: the tea houses, libraries, gardens and corners where a city’s life happens between home and work. Lahore has hundreds of them, but most guides only ask where you’d like to eat.</p>
              <p>Third Place asks how you feel instead. Quiet or lively, alone or in company, free or a little indulgent, and then it finds the places that fit.</p>
              <ol className="principles">
                <li><span className="numeral">①</span><div><b>Intentions before categories.</b> You search by the afternoon you need, not by the type of business.</div></li>
                <li><span className="numeral">②</span><div><b>Honest information.</b> Coordinates come from OpenStreetMap. We never invent opening hours, prices or reviews. If we don’t know, we say “check before you go”.</div></li>
                <li><span className="numeral">③</span><div><b>Lahore first.</b> Gate names, Urdu labels and old survey maps shape the whole design.</div></li>
                <li><span className="numeral">④</span><div><b>Your atlas is yours.</b> Saved places, letters and suggestions stay in your browser.</div></li>
              </ol>
            </div>
            <figure className="colophon-figure" ref={niche}>
              <TileNiche />
              <figcaption>After the kashi kari tile niches of the Walled City, drawn as a tree of life.</figcaption>
            </figure>
          </div>
        </section>

        <div className="divider"><ScaleBar /></div>

        <section className="section" id="suggest">
          <GateHead gate="Delhi" numeral="II" urdu="دہلی دروازہ" title="Suggest a place"
            lede="Know a corner of Lahore that belongs in the atlas? Tell us about it. We read every one." />
          <SuggestForm />
        </section>

        <section className="section credits">
          <h3 className="before-title">Sources &amp; credits</h3>
          <p>Map data © OpenStreetMap contributors, tiles from OpenFreeMap, walking routes from the OSRM demo server, and type from Google Fonts: Cormorant Garamond, Manrope and Noto Nastaliq Urdu. Every illustration is original and drawn in code, inspired by 19th-century survey plans of Lahore, Mughal manuscript margins and the tilework of the Walled City.</p>
        </section>
      </main>
      <Footer />
      <LittleAtlas open={drawer} onClose={() => setDrawer(false)} onShow={id => { location.href = `index.html?place=${id}` }} />
    </>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><About /></StrictMode>)

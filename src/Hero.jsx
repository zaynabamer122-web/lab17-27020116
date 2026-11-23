import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap, scrollToId } from './ui.jsx'
import { drawSurvey, GATES, W, H } from './survey.js'
import { prefersReduced } from './lib.js'

function Cypress({ x, y, s }) {
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})`}>
      <path d="M0 -14C3 -9 3.6 -3 2.2 2H-2.2C-3.6 -3 -3 -9 0 -14Z" className="cypress" />
      <path d="M0 2V5" stroke="#463B35" strokeWidth=".6" />
    </g>
  )
}

function Domes({ x, y, s = 1, minarets = 4 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className="domes">
      <path d="M-22 6H22V0H-22Z" />
      <path d="M-8 0C-8 -8 0 -12 0 -15C0 -12 8 -8 8 0Z" />
      <path d="M-19 0C-19 -5 -14 -7 -14 -9C-14 -7 -9 -5 -9 0ZM9 0C9 -5 14 -7 14 -9C14 -7 19 -5 19 0Z" />
      {Array.from({ length: minarets }, (_, i) => {
        const mx = -26 + (i * 52) / (minarets - 1)
        return <path key={i} d={`M${mx - 1.2} 6V-14H${mx + 1.2}V6ZM${mx - 2} -14H${mx + 2}L${mx} -18Z`} />
      })}
    </g>
  )
}

export default function Hero() {
  const root = useRef(null)
  const s = useMemo(() => drawSurvey(1846), [])
  const [narrow] = useState(() => window.matchMedia('(max-width: 700px)').matches)

  useLayoutEffect(() => {
    const reduce = prefersReduced()
    const ctx = gsap.context(() => {
      const ink = gsap.utils.toArray('.ink')
      if (reduce) {
        gsap.set('.wash', { opacity: (i, el) => el.dataset.o })
        gsap.set('.gate-label', { opacity: 1 })
        return
      }
      gsap.set(ink, { strokeDasharray: 1, strokeDashoffset: 1 })
      // 1 — the survey inks itself in
      gsap.to(ink, { strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut', stagger: { each: 0.09, from: 'random' }, delay: 0.15,
        onComplete: () => { gsap.set(ink, { strokeDasharray: 'none' }); root.current?.querySelector('.hero-survey')?.classList.add('ink-done') } })
      gsap.from('.hero-copy > *', { y: 22, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.09, delay: 0.35 })
      gsap.from('.cypress-row', { opacity: 0, duration: 1.2, delay: 1.6 })

      // 2 — on scroll: the plan is hand-coloured, the gates are named, and you walk through Roshnai Gate
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: '+=170%', pin: true, scrub: 0.7, anticipatePin: 1 } })
      tl.to('.wash', { opacity: (i, el) => el.dataset.o, duration: 0.3, stagger: 0.04, ease: 'none' })
        .to('.gate-label', { opacity: 1, duration: 0.18, stagger: 0.012 }, '<0.05')
        .to('.hero-cartouche', { opacity: 1, y: 0, duration: 0.2 }, '<')
        .to('.hero-copy', { y: -60, opacity: 0, duration: 0.22, ease: 'power1.in' }, '+=0.08')
        .to('.survey-zoom', { scale: 7, svgOrigin: '340 188', duration: 0.55, ease: 'power3.in' }, '<')
        .to('.gate-label, .hero-cartouche, .hero-north, .hero-scale', { opacity: 0, duration: 0.12 }, '<')
        .fromTo('.hero-portal', { scale: 0.2, opacity: 0 }, { scale: 1.6, opacity: 1, duration: 0.4, ease: 'power2.in' }, '<0.22')
        .to('.hero-survey', { opacity: 0, duration: 0.15 }, '>-0.12')
        .to('.hero-portal', { opacity: 0, duration: 0.1 })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section className="hero" id="top" ref={root} aria-label="Introduction">
      <svg className="hero-survey" viewBox={narrow ? '190 120 680 470' : `-300 0 ${W + 300} ${H}`} preserveAspectRatio={narrow ? 'xMidYMin meet' : 'xMidYMid slice'} aria-hidden="true">
        <defs>
          <filter id="bleed" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="7" />
            <feDisplacementMap in="SourceGraphic" scale="9" />
            <feGaussianBlur stdDeviation=".6" />
          </filter>
        </defs>
        <g className="survey-zoom">
          {/* colour washes, applied by hand after the ink */}
          <g filter="url(#bleed)">
            <path className="wash" data-o=".55" d={s.river} fill="#A7C4CC" />
            {s.gardens.map((d, i) => <path key={i} className="wash" data-o=".55" d={d} fill="#C9C77F" />)}
            <path className="wash" data-o=".42" d={s.wall} fill="#9E4A42" />
          </g>
          {/* ink */}
          <path className="ink ink-fields" pathLength="1" d={s.fields} />
          <path className="ink ink-hach" pathLength="1" d={s.hachures} />
          {s.banks.map((d, i) => <path key={i} className="ink ink-bank" pathLength="1" d={d} />)}
          {s.alleys.map((d, i) => <path key={i} className="ink ink-alley" pathLength="1" d={d} />)}
          <path className="ink ink-block" pathLength="1" d={s.blocks} />
          {s.bazaars.map((d, i) => <path key={i} className="ink ink-bazaar" pathLength="1" d={d} />)}
          <path className="ink ink-wall" pathLength="1" d={s.wall} />
          <path className="ink ink-fort" pathLength="1" d="M372 176H520V236H372Z M384 186H436V226H384Z M446 186H508V212H446Z" />
          <g className="cypress-row">{s.trees.map(([x, y, k], i) => <Cypress key={i} x={x} y={y} s={k} />)}</g>
          <Domes x={300} y={150} s={0.9} />
          <Domes x={718} y={330} s={0.55} />
          {GATES.map(g => (
            <g key={g.name} className="gate-label">
              <circle cx={g.x} cy={g.y} r="3" fill="#F0E8D8" stroke="#463B35" strokeWidth=".6" />
              <text x={g.lx} y={g.ly} textAnchor={g.anchor}>{g.name} Gate</text>
            </g>
          ))}
        </g>
        <g className="hero-cartouche" transform="translate(880 92)">
          <rect x="-82" y="-62" width="164" height="132" fill="#F0E8D8" fillOpacity=".7" stroke="#463B35" strokeWidth=".5" />
          <rect x="-77" y="-57" width="154" height="122" fill="none" stroke="#B49A69" strokeWidth=".4" />
          <text y="-34" className="ct-small">PLAN</text>
          <text y="-18" className="ct-italic">of the City and Environs of</text>
          <text y="10" className="ct-big">LAHORE</text>
          <text y="30" className="ct-italic">re-surveyed for wanderers</text>
          <text y="50" className="ct-small">MMXXVI · not to scale</text>
        </g>
        <g className="hero-north" transform="translate(938 610)">
          <path d="M0 -34L5 0H-5Z" fill="#463B35" /><path d="M0 34L-5 0H5Z" fill="none" stroke="#463B35" strokeWidth=".6" />
          <text y="-40" textAnchor="middle">N</text>
        </g>
        <g className="hero-scale" transform="translate(60 664)">
          <path d="M0 0H160M0 -4V4M40 -3V3M80 -4V4M120 -3V3M160 -4V4" stroke="#463B35" strokeWidth=".6" />
          <path d="M0 0H40M80 0H120" stroke="#463B35" strokeWidth="2.2" />
          <text x="0" y="-8">0</text><text x="80" y="-8" textAnchor="middle">a short walk</text><text x="160" y="-8" textAnchor="end">a long one</text>
        </g>
      </svg>

      <svg className="hero-portal" viewBox="0 0 200 240" aria-hidden="true">
        <path d="M30 240V110C30 60 70 30 100 12C130 30 170 60 170 110V240" fill="none" stroke="#463B35" strokeWidth=".5" />
        <path d="M42 240V112C42 70 76 44 100 30C124 44 158 70 158 112V240" fill="none" stroke="#B49A69" strokeWidth=".35" />
      </svg>

      <div className="hero-copy">
        <p className="eyebrow">A guide to the spaces between</p>
        <h1 className="hero-title">Somewhere to wander.<br /><em>Somewhere to stay.</em></h1>
        <p className="hero-lede">Find the places that make a city feel like your own. Not home, not university, not work: the third place.</p>
        <div className="hero-actions">
          <button className="btn-ink" onClick={() => scrollToId('discover')} data-cursor="open" data-cursor-label="enter">Explore the city <span aria-hidden="true">↗</span></button>
          <span className="hero-coord">LAHORE · 31°32′N 74°20′E</span>
        </div>
        <p className="hero-hint" aria-hidden="true">scroll to colour the map</p>
      </div>
    </section>
  )
}

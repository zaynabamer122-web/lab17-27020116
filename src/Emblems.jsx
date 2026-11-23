// Original hand-drawn emblems, after miniature painting. Each animates on hover via CSS (see .emblem in styles.css).
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'round', strokeLinejoin: 'round' }

const shapes = {
  window: (c) => (
    <>
      <path {...S} d="M16 58V30C16 18 24 10 32 6C40 10 48 18 48 30V58Z" />
      <path {...S} d="M20 58V31C20 21 26 14 32 11C38 14 44 21 44 31V58" opacity=".55" />
      <g className="e-jaali" opacity=".6"><path {...S} d="M24 26L40 42M24 34L36 46M28 22L44 38M24 42L32 50M40 24L24 40M44 32L28 48M36 22L24 34" /></g>
      <g className="e-shutter-l"><path d="M20 31C20 21 26 14 32 11V58H20Z" fill={c} opacity=".35" /></g>
      <g className="e-shutter-r"><path d="M44 31C44 21 38 14 32 11V58H44Z" fill={c} opacity=".35" /></g>
      <path {...S} d="M12 58H52" />
    </>
  ),
  book: (c) => (
    <>
      <path {...S} d="M32 18C25 13 16 13 9 15V50C16 48 25 48 32 53C39 48 48 48 55 50V15C48 13 39 13 32 18Z" />
      <path d="M32 18C39 13 48 13 55 15V50C48 48 39 48 32 53Z" fill={c} opacity=".25" />
      <path {...S} d="M32 18V53" />
      <g opacity=".6"><path {...S} d="M14 23H27M14 28H27M14 33H25M37 23H50M37 28H50M37 33H48M14 38H26M37 38H49" /></g>
      <g className="e-page"><path {...S} d="M32 18C37 14 43 13.5 47 14.5L44 47C40 47 36 48.5 32 52" fill="#F0E8D8" /><path {...S} d="M36 22H43M36 27H42" opacity=".5" /></g>
    </>
  ),
  lantern: (c) => (
    <g className="e-swing">
      <path {...S} d="M32 4V10" />
      <path {...S} d="M27 10H37L40 16H24Z" />
      <path {...S} d="M24 16C20 24 20 40 24 48H40C44 40 44 24 40 16" />
      <path d="M24 16C20 24 20 40 24 48H40C44 40 44 24 40 16Z" fill={c} opacity=".18" />
      <path {...S} d="M28 16C26 26 26 38 28 48M36 16C38 26 38 38 36 48" opacity=".5" />
      <ellipse className="e-flame" cx="32" cy="33" rx="3.2" ry="6" fill="#B49A69" opacity=".85" />
      <path {...S} d="M24 48L27 54H37L40 48M29 54V58H35V54" />
    </g>
  ),
  tree: (c) => (
    <>
      <g className="e-sway">
        <path d="M24 50C14 44 14 30 20 22C24 10 32 6 32 6C32 6 40 10 44 22C50 30 50 44 40 50Z" fill={c} opacity=".3" />
        <path {...S} d="M24 50C14 44 14 30 20 22C24 10 32 6 32 6C32 6 40 10 44 22C50 30 50 44 40 50Z" />
        <path {...S} d="M32 14V50M32 24L25 30M32 30L40 35M32 38L24 43M32 20L37 25" opacity=".6" />
        <circle className="e-bird" cx="45" cy="18" r="1.6" fill="currentColor" />
      </g>
      <path {...S} d="M30 50L28 58H36L34 50M18 58H46" />
    </>
  ),
  ink: (c) => (
    <>
      <path {...S} d="M20 36H44L46 56H18Z" />
      <path d="M20 36H44L46 56H18Z" fill={c} opacity=".25" />
      <path {...S} d="M24 36V31H40V36" />
      <path d="M22 44C28 42 36 46 42 44V54H22Z" fill="#424E68" opacity=".35" />
      <g className="e-qalam"><path {...S} d="M40 6L28 40" /><path {...S} d="M41.5 4.5L39 9" strokeWidth="2" /></g>
    </>
  ),
  chairs: (c) => (
    <>
      <g className="e-chair-l"><path {...S} d="M10 24V54M10 38H26V54M10 38C10 34 12 26 12 24M26 38V30" /><path d="M10 38H26V42H10Z" fill={c} opacity=".35" /></g>
      <g className="e-chair-r"><path {...S} d="M54 24V54M54 38H38V54M54 38C54 34 52 26 52 24M38 38V30" /><path d="M54 38H38V42H54Z" fill={c} opacity=".35" /></g>
      <g className="e-steam" opacity=".6"><path {...S} d="M30 30C28 26 32 24 30 20M34 30C32 26 36 24 34 20" /></g>
      <path {...S} d="M28 40H36V46H28ZM32 46V54M6 58H58" />
    </>
  ),
  key: (c) => (
    <g className="e-turn">
      <circle {...S} cx="20" cy="22" r="10" />
      <circle cx="20" cy="22" r="10" fill={c} opacity=".25" />
      <path {...S} d="M20 16C23 16 26 19 26 22C26 25 23 28 20 28C17 28 14 25 14 22C14 19 17 16 20 16Z" opacity=".55" />
      <path {...S} d="M27 29L50 52M42 44L47 39M46 48L51 43M38 40L41 37" />
    </g>
  ),
  cup: (c) => (
    <>
      <path {...S} d="M16 30H44V42C44 50 38 54 30 54C22 54 16 50 16 42Z" />
      <path d="M16 36H44V42C44 50 38 54 30 54C22 54 16 50 16 42Z" fill={c} opacity=".3" />
      <path {...S} d="M44 34C50 34 52 38 50 42C48 46 44 45 44 45M10 58H50" />
      <g className="e-steam" opacity=".6"><path {...S} d="M24 24C22 20 26 17 24 12M31 24C29 20 33 17 31 12M38 24C36 20 40 17 38 12" /></g>
    </>
  ),
}

export function Emblem({ name = 'window', pigment = 'var(--terracotta)', size = 56, className = '' }) {
  return (
    <svg className={`emblem emblem-${name} ${className}`} viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      {shapes[name]?.(pigment)}
    </svg>
  )
}

export function ArchMark({ size = 22 }) {
  return (
    <svg viewBox="0 0 24 28" width={size} height={size * 1.16} aria-hidden="true" className="arch-mark">
      <path d="M3 27V12C3 6.5 7.5 3 12 1C16.5 3 21 6.5 21 12V27" fill="none" stroke="currentColor" strokeWidth=".9" />
      <path d="M7 27V13C7 9.5 9.5 7 12 5.6C14.5 7 17 9.5 17 13V27" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".6" />
      <path d="M1 27H23" stroke="currentColor" strokeWidth=".9" />
    </svg>
  )
}

/* kashi-kari quatrefoil, a small tilework accent beside gate labels */
export function Quatrefoil({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="quatrefoil">
      <path d="M12 2C15 2 15.5 6 12 8.5C8.5 6 9 2 12 2ZM22 12C22 15 18 15.5 15.5 12C18 8.5 22 9 22 12ZM12 22C9 22 8.5 18 12 15.5C15.5 18 15 22 12 22ZM2 12C2 9 6 8.5 8.5 12C6 15.5 2 15 2 12Z"
        fill="#C9C77F" fillOpacity=".55" stroke="#424E68" strokeWidth=".7" />
      <circle cx="12" cy="12" r="1.8" fill="#A7C4CC" stroke="#424E68" strokeWidth=".6" />
    </svg>
  )
}

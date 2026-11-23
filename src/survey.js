// An original, procedurally drawn "survey" of a walled city, after the mood of
// 19th-century Lahore plans: a maze of alleys inside the wall, field plots outside,
// a river ribbon, garden washes and hachured ground. Not to scale, not traced.
import { rng, pointInPoly, smoothPath } from './lib.js'

export const W = 1000, H = 700

export const WALL = [
  [255, 248], [318, 196], [470, 168], [602, 172], [702, 198], [792, 258], [826, 342],
  [806, 432], [744, 500], [640, 542], [520, 558], [398, 542], [298, 500], [238, 430], [224, 338],
]
const CENTER = [525, 365]

// The thirteen gates, clockwise from the north (positions are stylised).
export const GATES = [
  ['Roshnai', 340, 188], ['Masty', 540, 168], ['Kashmiri', 652, 184], ['Sheranwala', 748, 226],
  ['Yakki', 812, 304], ['Delhi', 818, 392], ['Akbari', 776, 468], ['Mochi', 690, 522],
  ['Shah Alami', 580, 550], ['Lohari', 455, 551], ['Mori', 352, 523], ['Bhati', 266, 466], ['Taxali', 229, 300],
].map(([name, x, y]) => {
  const dx = x - CENTER[0], dy = y - CENTER[1], len = Math.hypot(dx, dy)
  return { name, x, y, lx: x + (dx / len) * 30, ly: y + (dy / len) * 22, anchor: dx < -60 ? 'end' : dx > 60 ? 'start' : 'middle' }
})

const RIVER = [[-30, 40], [90, 70], [175, 128], [182, 214], [128, 300], [104, 400], [140, 492], [118, 590], [60, 720]]

const inWall = (x, y, pad = 0) => {
  if (!pad) return pointInPoly(x, y, WALL)
  const grown = WALL.map(([px, py]) => [px + Math.sign(px - CENTER[0]) * pad, py + Math.sign(py - CENTER[1]) * pad])
  return pointInPoly(x, y, grown)
}
const nearRiver = (x, y, w = 48) => RIVER.some(([rx, ry], i) => {
  if (i === 0) return false
  const [ax, ay] = RIVER[i - 1]
  const t = Math.max(0, Math.min(1, ((x - ax) * (rx - ax) + (y - ay) * (ry - ay)) / ((rx - ax) ** 2 + (ry - ay) ** 2)))
  return Math.hypot(x - (ax + t * (rx - ax)), y - (ay + t * (ry - ay))) < w
})

export function drawSurvey(seed = 1846) {
  const r = rng(seed)
  const R = (a, b) => a + r() * (b - a)

  /* alleys: organic random walks that stay inside the wall */
  const alleys = Array.from({ length: 6 }, () => '')
  for (let k = 0; k < 520; k++) {
    let x, y, tries = 0
    do { x = R(225, 826); y = R(168, 558); tries++ } while (!inWall(x, y) && tries < 50)
    let a = Math.floor(r() * 4) * (Math.PI / 2) + R(-0.4, 0.4)
    let d = `M${x.toFixed(1)},${y.toFixed(1)}`
    const steps = 3 + Math.floor(r() * 9)
    for (let s = 0; s < steps; s++) {
      a += R(-0.75, 0.75)
      if (r() < 0.18) a += (r() < 0.5 ? 1 : -1) * Math.PI / 2
      const nx = x + Math.cos(a) * R(6, 13), ny = y + Math.sin(a) * R(6, 13)
      if (!inWall(nx, ny)) break
      x = nx; y = ny
      d += `L${x.toFixed(1)},${y.toFixed(1)}`
    }
    alleys[k % 6] += d
  }

  /* footprints: tiny closed blocks */
  let blocks = ''
  for (let k = 0; k < 300; k++) {
    const x = R(240, 810), y = R(180, 548)
    if (!inWall(x, y)) continue
    const w = R(4, 11), h = R(4, 9), t = R(-0.6, 0.6), c = Math.cos(t), s = Math.sin(t)
    const pts = [[0, 0], [w, 0], [w, h], [0, h]].map(([px, py]) => [x + px * c - py * s, y + px * s + py * c])
    blocks += `M${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join('L')}Z`
  }

  /* bazaars: the main streets */
  const bazaars = [
    [[580, 550], [570, 470], [552, 400], [540, 330]],
    [[652, 184], [628, 240], [596, 290], [556, 326]],
    [[818, 392], [748, 362], [668, 346], [588, 334], [540, 330]],
    [[266, 466], [340, 432], [430, 384], [520, 336]],
    [[229, 300], [320, 316], [430, 324], [540, 330]],
  ].map(p => smoothPath(p))

  /* field plots outside: a warped survey grid */
  const step = 34, jit = 9
  const grid = []
  for (let gy = -1; gy <= H / step + 1; gy++) {
    grid[gy + 1] = []
    for (let gx = -1; gx <= W / step + 1; gx++) grid[gy + 1][gx + 1] = [gx * step + R(-jit, jit), gy * step + R(-jit, jit)]
  }
  let fields = ''
  const keep = (a, b) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
    return !inWall(mx, my, 26) && !nearRiver(mx, my) && r() > 0.12
  }
  for (let j = 0; j < grid.length; j++) for (let i = 0; i < grid[j].length; i++) {
    const p = grid[j][i]
    if (grid[j][i + 1] && keep(p, grid[j][i + 1])) fields += `M${p[0].toFixed(1)},${p[1].toFixed(1)}L${grid[j][i + 1][0].toFixed(1)},${grid[j][i + 1][1].toFixed(1)}`
    if (grid[j + 1] && keep(p, grid[j + 1][i])) fields += `M${p[0].toFixed(1)},${p[1].toFixed(1)}L${grid[j + 1][i][0].toFixed(1)},${grid[j + 1][i][1].toFixed(1)}`
  }

  /* river ribbon */
  const left = [], right = []
  RIVER.forEach((p, i) => {
    const a = RIVER[Math.max(0, i - 1)], b = RIVER[Math.min(RIVER.length - 1, i + 1)]
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1
    const w = 18 + Math.sin(i * 1.7) * 7 + i * 1.6
    left.push([p[0] - (dy / len) * w, p[1] + (dx / len) * w])
    right.push([p[0] + (dy / len) * w, p[1] - (dx / len) * w])
  })
  const river = smoothPath([...left, ...right.reverse()], true)
  const banks = [smoothPath(left), smoothPath(right.slice().reverse())]

  /* gardens: soft blobs of wash */
  const gardens = [[318, 612, 46], [470, 632, 34], [688, 604, 52], [868, 470, 40], [892, 236, 30], [612, 96, 30], [262, 586, 26]].map(([cx, cy, rad]) => {
    const pts = Array.from({ length: 11 }, (_, i) => {
      const a = (i / 11) * Math.PI * 2, rr = rad * R(0.7, 1.15)
      return [cx + Math.cos(a) * rr * 1.25, cy + Math.sin(a) * rr * 0.8]
    })
    return smoothPath(pts, true)
  })

  /* hachures: short ticks around low mounds, like old relief marks */
  let hachures = ''
  ;[[560, 640, 46], [810, 590, 34], [930, 360, 28], [372, 110, 30]].forEach(([cx, cy, rad]) => {
    for (let ring = 0; ring < 2; ring++) {
      const rr = rad + ring * 12
      for (let a = 0; a < Math.PI * 2; a += 0.16) {
        const x1 = cx + Math.cos(a) * rr, y1 = cy + Math.sin(a) * rr * 0.6
        const x2 = cx + Math.cos(a) * (rr + 7), y2 = cy + Math.sin(a) * (rr + 7) * 0.6
        if (!nearRiver(x1, y1)) hachures += `M${x1.toFixed(1)},${y1.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}`
      }
    }
  })

  /* cypress trees ringing the wall, outside */
  const trees = []
  WALL.forEach((p, i) => {
    const q = WALL[(i + 1) % WALL.length]
    const len = Math.hypot(q[0] - p[0], q[1] - p[1])
    for (let t = 0.2; t < 1; t += 46 / len) {
      const x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t
      const dx = x - CENTER[0], dy = y - CENTER[1], l = Math.hypot(dx, dy)
      const tx = x + (dx / l) * 16, ty = y + (dy / l) * 13
      if (!GATES.some(g => Math.hypot(g.x - x, g.y - y) < 26) && r() > 0.25) trees.push([tx, ty, R(0.8, 1.15)])
    }
  })

  return {
    wall: smoothPath(WALL, true),
    alleys, blocks, bazaars, fields, river, banks, gardens, hachures, trees,
  }
}

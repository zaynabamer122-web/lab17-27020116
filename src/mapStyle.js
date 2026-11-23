// Two map modes over the same real OpenStreetMap data (OpenFreeMap, no API key).
// "Practical" is the stock Liberty style. "Illustrated" repaints it in survey-map pigments.
export const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

let cache = null
export async function loadStyles() {
  if (cache) return cache
  const base = await (await fetch(STYLE_URL)).json()
  cache = { practical: base, illustrated: illustrate(base) }
  return cache
}

const INK = '#463B35', SEPIA = '#7E6A58', FAINT = '#B7A48C', PARCH = '#EFE6D3'

function illustrate(base) {
  const s = JSON.parse(JSON.stringify(base))
  s.layers = s.layers.filter(l => {
    const id = l.id
    if (l.type === 'raster' || l.type === 'fill-extrusion') return false
    if (/^poi|shield|one_way|airport|aeroway|hatching|tunnel_/.test(id)) return false
    if (/casing/.test(id)) return false
    return true
  }).map(l => {
    const id = l.id, p = (l.paint = l.paint || {})
    const scale = v => {
      if (typeof v === 'number') return v * 0.4
      if (Array.isArray(v) && (v[0] === 'interpolate' || v[0] === 'step')) {
        // interpolate: [op, type, input, z, out, z, out…]  step: [op, input, out, z, out…]
        const isOut = v[0] === 'interpolate' ? i => i >= 4 && i % 2 === 0 : i => i >= 2 && i % 2 === 0
        return v.map((x, i) => (isOut(i) && typeof x === 'number' ? x * 0.4 : x))
      }
      return v
    }
    if (id === 'background') p['background-color'] = PARCH
    else if (id === 'water') { p['fill-color'] = '#B4C9CC'; p['fill-opacity'] = 0.85 }
    else if (id.startsWith('waterway') && l.type === 'line') { p['line-color'] = '#9DBAC1' }
    else if (id === 'park') { p['fill-color'] = '#CFCB8E'; p['fill-opacity'] = 0.55 }
    else if (id === 'park_outline') { p['line-color'] = '#879783'; p['line-opacity'] = 0.6; p['line-dasharray'] = [2, 2] }
    else if (id.startsWith('landcover_wood') || id.startsWith('landcover_grass')) { p['fill-color'] = '#C9C77F'; p['fill-opacity'] = 0.35 }
    else if (id.startsWith('landcover')) { p['fill-color'] = '#E4D8BF'; p['fill-opacity'] = 0.5 }
    else if (id === 'landuse_residential') { p['fill-color'] = '#E9DDC6'; p['fill-opacity'] = 0.6 }
    else if (id.startsWith('landuse')) { p['fill-color'] = '#E2D3B8'; p['fill-opacity'] = 0.55 }
    else if (id === 'building') { p['fill-color'] = '#DCC3A6'; p['fill-outline-color'] = '#B98269'; p['fill-opacity'] = 0.55 }
    else if (id === 'road_area_pattern') { delete p['fill-pattern']; p['fill-color'] = PARCH; p['fill-opacity'] = 0 }
    else if (l.type === 'line' && /rail/.test(id)) { p['line-color'] = SEPIA; p['line-dasharray'] = [3, 2]; p['line-width'] = 0.8 }
    else if (l.type === 'line' && /motorway|trunk|primary/.test(id)) { p['line-color'] = SEPIA; if (p['line-width']) p['line-width'] = scale(p['line-width']) }
    else if (l.type === 'line' && /secondary|tertiary|link|street|minor/.test(id)) { p['line-color'] = '#9C8770'; if (p['line-width']) p['line-width'] = scale(p['line-width']) }
    else if (l.type === 'line' && /service|track|path|pedestrian/.test(id)) { p['line-color'] = FAINT; p['line-opacity'] = 0.7 }
    else if (id.startsWith('boundary')) { p['line-color'] = '#A86F70'; p['line-opacity'] = 0.5 }
    if (l.type === 'symbol') {
      p['text-color'] = /water/.test(id) ? '#424E68' : INK
      p['text-halo-color'] = PARCH
      p['text-halo-width'] = 1.4
      if (l.layout && l.layout['text-font']) l.layout['text-font'] = ['Noto Sans Italic']
      p['icon-opacity'] = 0
    }
    return l
  })
  return s
}

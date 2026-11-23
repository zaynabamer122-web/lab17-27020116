import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { PLACES, spendFits } from './data.js'
import { Cursor, Paper, Nav, GateHead, ScaleBar, Footer, LittleAtlas, useSmoothScroll, scrollToId, ScrollTrigger } from './ui.jsx'
import Hero from './Hero.jsx'
import { Discover, Atlas } from './Atlas.jsx'
import { Collections, Wandering, Letters } from './sections.jsx'

const EMPTY = { mood: null, spend: null, company: null, q: '' }

function App() {
  useSmoothScroll()
  const [filters, setFilters] = useState(EMPTY)
  const [collection, setCollection] = useState(null)
  const [selected, setSelected] = useState(null)
  const [route, setRoute] = useState(null)
  const [drawer, setDrawer] = useState(false)

  const places = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    return PLACES.filter(p =>
      (!filters.mood || p.moods.includes(filters.mood)) &&
      spendFits(p.spend, filters.spend) &&
      (!filters.company || p.company.includes(filters.company)) &&
      (!collection || p.collections.includes(collection)) &&
      (!q || `${p.name} ${p.area} ${p.urdu}`.toLowerCase().includes(q)))
  }, [filters, collection])

  const visit = useCallback(id => {
    if (!places.some(p => p.id === id)) { setFilters(EMPTY); setCollection(null) }
    setSelected(id)
    setDrawer(false)
    setTimeout(() => scrollToId('atlas'), 60)
  }, [places])

  const openCollection = id => { setCollection(id); setFilters(EMPTY); setSelected(null); setRoute(null); scrollToId('atlas') }
  const showRoute = r => { setRoute(r); setSelected(null) }

  // arriving from the Colophon page with ?place=…
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('place')
    if (id && PLACES.some(p => p.id === id)) setTimeout(() => visit(id), 400)
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <Paper />
      <Cursor />
      <Nav onMyPlaces={() => setDrawer(true)} />
      <main>
        <Hero />

        <section className="section" id="discover" aria-labelledby="discover-title">
          <GateHead gate="Roshnai" numeral="I" urdu="روشنائی دروازہ" title="Begin with a feeling"
            lede="Most guides ask which café or which park. This one asks what kind of afternoon you need, what you’d like to spend, and who is coming with you." />
          <Discover filters={filters} setFilters={setFilters} count={places.length} />
        </section>

        <div className="divider"><ScaleBar /></div>

        <section className="section section--wide" id="atlas">
          <GateHead gate="Taxali" numeral="II" urdu="ٹکسالی دروازہ" title="The Atlas"
            lede="Every place sits on real OpenStreetMap geography. Switch between the hand-tinted atlas and the practical map; your search stays where it is." />
          <Atlas places={places} selectedId={selected} onSelect={setSelected} route={route}
            collection={collection} onClearCollection={() => setCollection(null)} />
          {route && (
            <p className="route-banner">Showing the route <b>{route.stops.map(s => s.name).join(' → ')}</b>
              <button className="btn-text" onClick={() => setRoute(null)} data-cursor="link">clear route</button></p>
          )}
        </section>

        <section className="section" id="collections">
          <GateHead gate="Bhati" numeral="III" urdu="بھاٹی دروازہ" title="Collections"
            lede="Small folios of places that belong together, named the way Lahore would name them." />
        </section>
        <Collections onOpen={openCollection} />

        <section className="section" id="wandering">
          <GateHead gate="Lohari" numeral="IV" urdu="لوہاری دروازہ" title="The Art of Wandering"
            lede="Not a destination but a small route: choose a mood, and we’ll join three or more places into an afternoon." />
          <Wandering onRoute={showRoute} />
        </section>

        <section className="section" id="letters">
          <GateHead gate="Mochi" numeral="V" urdu="موچی دروازہ" title="Letters from the City"
            lede="Short notes left for the next visitor. Pick one up, or leave your own from any place in the atlas." />
          <Letters onVisit={visit} />
        </section>
      </main>
      <Footer />
      <LittleAtlas open={drawer} onClose={() => setDrawer(false)} onShow={visit} />
    </>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)

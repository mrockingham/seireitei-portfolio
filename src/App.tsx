import { Component, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import World from './World'
import { places } from './world-data'
import { siteSlots } from './lab/layout'
import type { Place } from './world-data'
import type { Controls, Travel, Vec3 } from './World'
import type { Arrival } from './ArrivalFx'
import { loadProgress, loadingStore } from './world-assets'
import QuickView from './QuickView'
import manifest from './world-manifest.json'
import './App.css'
import { isEncounterActive, advanceEncounter, barracksSteps, finaleSteps, gardenSteps, gateSteps } from './encounter-state'
import type { EncounterPhase } from './encounter-state'
import EnvironmentStudy from './EnvironmentStudy'
import { ICHIGO_MARK, createFinaleClock, finalePhases } from './finale/timeline'
import { GATE_FINISH, GT, ICHIGO_GATE_END } from './gate/timeline'
import { BARRACKS_FINISH, BT, ICHIGO_HALL_END } from './barracks/timeline'
import { GARDEN_FINISH, GD, ICHIGO_GARDEN_END } from './garden/timeline'
import { about, chapters, experience, finalChapter, skills, trainingSection } from './portfolio-content'

function trapTab(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Tab') return
  const items = e.currentTarget.querySelectorAll<HTMLElement>('button, a[href]')
  const first = items[0], last = items[items.length - 1]
  if (!first) return
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}

/** Places in the order you meet them along the route (the map list and journey bars). */
const routeOrder = places.map((_, i) => i).sort((a, b) => places[a].order - places[b].order)
function placeNote(p: Place) {
  if (p.name === 'Captains’ training arena') return 'Sajin Komamura and Kaname Tōsen spar: Tenken’s phantom arm, Tōsen’s Bankai sealing them both inside a black dome, and Komamura’s giant Bankai bursting out of it. Watch from outside the gate.'
  if (p.name === 'Eleventh Division yard') return 'Kenpachi Zaraki lounges on a bench with Yachiru on his shoulder while Ikkaku Madarame and Yumichika Ayasegawa spar in the ring. Watch from the street.'
  return `${p.subtitle}. The encounter here plays when you arrive, and you can play it again from here.`
}
/** Your section at the training grounds, from portfolio-content.ts. Empty fields show placeholders. */
function SectionCard({ onClose }: { onClose: () => void }) {
  const s = trainingSection
  return <aside className="side-section" aria-label={s.heading || 'Your section'}>
    <button className="close" onClick={onClose} aria-label="Close section">×</button>
    <p className="eyebrow">SIDE STOP / TRAINING GROUNDS</p>
    <h2>{s.heading || <span className="resume-placeholder">Your section title</span>}</h2>
    {s.body ? <p>{s.body}</p> : <p className="section-placeholder">Add this section’s heading, text, and links in <code>src/portfolio-content.ts</code> (<code>trainingSection</code>).</p>}
    {s.tools.length > 0 && <div className="skill-groups">{s.tools.map(g => <section key={g.group}><h3>{g.group}</h3><ul className="role-tech">{g.items.map(t => <li key={t}>{t}</li>)}</ul></section>)}</div>}
    {s.links.length > 0 && <ul className="contact-links">{s.links.map(l => <li key={l.href}><a href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{l.label} <span aria-hidden="true">↗</span></a></li>)}</ul>}
    <small>{s.body ? 'Chad, Uryū, and Orihime are procedural placeholder characters' : 'Placeholder copy · Chad, Uryū, and Orihime are procedural placeholder characters'}</small>
  </aside>
}

/**
 * The touch joystick (touch screens only, via CSS): put a thumb down anywhere in the lower-left of the
 * screen and the stick centres there; drag to move, further to run. Elsewhere, one finger drags the
 * camera and two pinch to zoom (handled on the canvas).
 */
function TouchStick({ controls }: { controls: React.RefObject<Controls> }) {
  const zone = useRef<HTMLDivElement>(null), base = useRef<HTMLDivElement>(null), knob = useRef<HTMLDivElement>(null)
  const active = useRef<{ id: number; x: number; y: number } | null>(null)
  const RADIUS = 48
  const place = (x: number, y: number, kx: number, ky: number) => {
    const z = zone.current?.getBoundingClientRect()
    if (!z || !base.current || !knob.current) return
    base.current.style.left = x - z.left + 'px'; base.current.style.top = y - z.top + 'px'
    knob.current.style.transform = 'translate(' + kx + 'px, ' + ky + 'px)'
  }
  const release = () => {
    active.current = null
    Object.assign(controls.current.stick, { x: 0, y: 0 })
    zone.current?.classList.remove('active')
    if (base.current) { base.current.style.left = ''; base.current.style.top = '' }
    if (knob.current) knob.current.style.transform = ''
  }
  useEffect(() => { const stick = controls.current.stick; return () => { Object.assign(stick, { x: 0, y: 0 }) } }, [controls])
  return <div ref={zone} className="touch-stick-zone" aria-hidden="true"
    onPointerDown={e => { if (active.current) return; e.currentTarget.setPointerCapture(e.pointerId); active.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; zone.current?.classList.add('active'); place(e.clientX, e.clientY, 0, 0) }}
    onPointerMove={e => {
      const a = active.current
      if (!a || a.id !== e.pointerId) return
      let dx = e.clientX - a.x, dy = e.clientY - a.y
      const d = Math.hypot(dx, dy)
      if (d > RADIUS) { dx *= RADIUS / d; dy *= RADIUS / d }
      Object.assign(controls.current.stick, { x: dx / RADIUS, y: dy / RADIUS })
      place(a.x, a.y, dx, dy)
    }}
    onPointerUp={e => { if (active.current?.id === e.pointerId) release() }}
    onPointerCancel={e => { if (active.current?.id === e.pointerId) release() }}>
    <div ref={base} className="touch-stick"><div ref={knob} className="touch-knob" /></div>
  </div>
}

const triangles = (manifest.stats.visual.triangles / 1000).toFixed(0)
const loaderText: Record<string, [string, (s: { loaded: number; total: number }) => string]> = {
  download: ['Downloading the world', s => (s.loaded / 1048576).toFixed(1) + ' of ' + (s.total / 1048576).toFixed(1) + ' MB'],
  build: ['Unpacking Seireitei', () => 'Assembling ' + triangles + 'k triangles of streets, halls, and hills'],
  compile: ['Preparing the effects', () => 'Readying the petals, ice, and reishi'],
  frames: ['Opening the gate', () => 'Almost there'],
  ready: ['The world is ready', () => 'Step inside'],
  error: ['Something went wrong', () => 'Try reloading the page'],
}
/**
 * The loader in the middle of the landing screen: a ring that fills as the world downloads, unpacks,
 * warms up its shaders, and draws its first frames, then fades to reveal the gate behind it.
 */
function WorldLoader({ ready }: { ready: boolean }) {
  const s = useSyncExternalStore(loadingStore.subscribe, loadingStore.get)
  const [now, setNow] = useState(() => performance.now())
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (ready) { const id = window.setTimeout(() => setGone(true), 1200); return () => clearTimeout(id) }
    // The later phases are estimated over time, so keep the ring moving between store updates.
    let raf = 0, last = 0
    const tick = (t: number) => { if (t - last > 90) { last = t; setNow(t) } raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ready])
  if (gone) return null
  const p = ready ? 1 : loadProgress(s, now)
  const [label, detail] = loaderText[ready ? 'ready' : s.phase] ?? loaderText.download
  const C = 2 * Math.PI * 88
  return <div className={ready ? 'world-loader done' : 'world-loader'} role="status" aria-live="polite">
    <div className="loader-ring">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle className="loader-track" cx="100" cy="100" r="88" />
        <circle className="loader-fill" cx="100" cy="100" r="88" strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
      </svg>
      <span className="loader-mark" aria-hidden="true">✦</span>
      <strong>{Math.floor(p * 100)}<small>%</small></strong>
      {[0, 1, 2].map(i => <span key={i} className={'loader-bf bf' + i} aria-hidden="true"><svg viewBox="-20 -16 40 32">{[1, -1].map(side => <g key={side} transform={'scale(' + side + ' 1)'}><path className="bf-wing" d="M0 0 C -6 -12 -18 -14 -18 -4 C -18 2 -10 4 -4 3 C -10 6 -12 14 -6 12 C -2 10 0 6 0 2 Z" /></g>)}</svg></span>)}
    </div>
    <p className="loader-label">{label}</p>
    <p className="loader-detail">{detail(s)}</p>
  </div>
}

/** Focuses the panel's main button without scrolling the panel away from its heading (autoFocus would). */
const focusQuietly = (el: HTMLButtonElement | null) => { el?.focus({ preventScroll: true }) }

/** Details for the website on the selected lab screen, from `websites` in portfolio-content.ts. */
function GalleryPanel({ index, onPrev, onNext, onClose }: { index: number; onPrev: () => void; onNext: () => void; onClose: () => void }) {
  const s = siteSlots[index]?.site ?? null
  const n = String(index + 1).padStart(2, '0'), total = String(siteSlots.length).padStart(2, '0')
  const image = s?.image ? (/^(https?:)?\/\//.test(s.image) || s.image.startsWith('/') ? s.image : `/assets/websites/${s.image}`) : null
  return <aside className="gallery-panel" role="dialog" aria-label={s ? s.title : `Website ${n}`} key={index}>
    <button className="close" onClick={onClose} aria-label="Stop browsing">×</button>
    <p className="eyebrow">TWELFTH DIVISION LAB / WEBSITE {n} OF {total}</p>
    {image && <img src={image} alt={`Screenshot of ${s?.title}`} />}
    <h2>{s ? s.title : <span className="resume-placeholder">Your website {n}</span>}</h2>
    {s ? <p>{s.description}</p> : <p className="section-placeholder">Add your sites to <code>websites</code> in <code>src/portfolio-content.ts</code>, with screenshots in <code>public/assets/websites/</code>.</p>}
    {s?.tags?.length ? <ul className="site-tags">{s.tags.map(t => <li key={t}>{t}</li>)}</ul> : null}
    {s && <div className="site-links"><a className="primary visit-site" href={s.url} target="_blank" rel="noreferrer">Visit site <span>↗</span></a>{s.repo && <a className="secondary" href={s.repo} target="_blank" rel="noreferrer">Code ↗</a>}</div>}
    <div className="gallery-nav"><button onClick={onPrev} aria-label="Previous website">← <kbd>A</kbd></button><span>{n} / {total}</span><button autoFocus onClick={onNext} aria-label="Next website"><kbd>D</kbd> →</button></div>
    <small>{s ? 'Mayuri and Nemu are procedural placeholder characters' : 'Placeholder · Mayuri and Nemu are procedural placeholder characters'} · <kbd>ESC</kbd> to step back</small>
  </aside>
}

/** Ichigo's final mark in each fight, where control returns after the finishing move. */
/** Where the Senkaimon sets Ichigo down after the finale: in front of the lab, facing its door. */
const LAB_ARRIVAL: Vec3 = [-7.4, .1, 6.5]
/** Hell butterflies crossing the Senkaimon transition: start and end (vw, vh), delay (s), size, tilt. */
const gateButterflies = [[-10, 70, 55, 30, 0, 1, -10], [110, 20, 40, 60, .15, .8, 15], [-8, 30, 70, 75, .3, 1.2, -5], [108, 80, 30, 20, .45, .9, 20], [50, 110, 60, 45, .1, 1.1, 0], [30, -10, 45, 50, .55, .7, 10], [-12, 55, 42, 42, .75, 1.3, -15], [112, 45, 58, 48, .9, 1, 12], [70, 110, 52, 38, 1.1, .75, -8], [20, 110, 48, 55, 1.25, .9, 6]] as const
const finishMark = (stage: number): Vec3 => stage === 0 ? ICHIGO_GATE_END : stage === 1 ? ICHIGO_HALL_END : stage === 2 ? ICHIGO_GARDEN_END : ICHIGO_MARK

class SceneBoundary extends Component<{ children: ReactNode; onError: (message: string) => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error) { this.props.onError(error.message) }
  render() { return this.state.failed ? null : this.props.children }
}

export default function App() {
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0)
  const completed = useRef(new Set<number>())
  /** The first fight not yet completed (4 once all are): the route guide lights the way to it. */
  const [nextStage, setNextStage] = useState(0)
  const [gateComplete, setGateComplete] = useState(false)
  const [phase, setPhase] = useState<EncounterPhase>('idle')
  const encounterActive = isEncounterActive(phase)
  const [ready, setReady] = useState(false)
  const [entered, setEntered] = useState(false)
  const [panel, setPanel] = useState<'map' | 'controls' | 'encounter' | null>(null)
  /** Portfolio at a glance: one page with everything, shareable as #portfolio. */
  const [quick, setQuick] = useState(() => window.location.hash === '#portfolio')
  const openQuick = useCallback(() => { setQuick(true); history.replaceState(null, '', '#portfolio') }, [])
  const closeQuick = useCallback(() => { setQuick(false); if (window.location.hash === '#portfolio') history.replaceState(null, '', window.location.pathname + window.location.search) }, [])
  useEffect(() => {
    const sync = () => setQuick(window.location.hash === '#portfolio')
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  /** The website being browsed on the lab's screen wall, or null. */
  const [gallery, setGallery] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [position, setPosition] = useState<Vec3>([0, 0, 22])
  const [visited, setVisited] = useState<number[]>([])
  const [cameraMode, setCameraMode] = useState<'free' | 'follow'>('free')
  const [travel, setTravel] = useState<Travel>({ serial: 0, position: [0, .1, 22] })
  const controls = useRef<Controls>({ keys: new Set(), yaw: 0, pitch: .33, distance: 6, cameraMode: 'free', stick: { x: 0, y: 0 } })
  const finaleClock = useRef(createFinaleClock())
  const gateClock = useRef(createFinaleClock())
  const barracksClock = useRef(createFinaleClock())
  const gardenClock = useRef(createFinaleClock())
  /** Hand control back on Ichigo's final mark, keeping the camera's view for a smooth glide. */
  const completeCinematic = useCallback((mark: Vec3) => {
    controls.current.yaw = 0
    setTravel(old => ({ serial: old.serial + 1, position: mark, keepCamera: true }))
    setPhase('complete')
  }, [])
  // Finishing the journey: the Senkaimon carries Ichigo from the summit to the front of the lab.
  // The gate's doors close on screen (0–0.9 s), he is moved while they are shut (1.2 s), and they
  // open onto his arrival (1.85 s), with the in-world arrival effect timed to the opening.
  const [transit, setTransit] = useState(false)
  const [arrival, setArrival] = useState<Arrival | null>(null)
  const [journeyNote, setJourneyNote] = useState(false)
  const transitTimers = useRef<number[]>([])
  useEffect(() => () => transitTimers.current.forEach(clearTimeout), [])
  const finishJourney = useCallback(() => {
    completeCinematic(ICHIGO_MARK)
    setTransit(true)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const at = (ms: number, fn: () => void) => transitTimers.current.push(window.setTimeout(fn, reduced ? ms * .5 : ms))
    at(1200, () => { controls.current.keys.clear(); controls.current.yaw = Math.PI / 2; setTravel(old => ({ serial: old.serial + 1, position: LAB_ARRIVAL })) })
    at(1850, () => { setArrival(old => ({ serial: (old?.serial ?? 0) + 1, at: LAB_ARRIVAL })); setJourneyNote(true) })
    at(4200, () => setTransit(false))
  }, [completeCinematic])
  // The cinematic directors advance beats from inside the render loop; ignore stale requests.
  const onFinalePhase = useCallback((from: EncounterPhase, to: EncounterPhase) => setPhase(old => old === from ? to : old), [])
  const onGatePhase = useCallback((from: EncounterPhase, to: EncounterPhase) => {
    if (to === 'complete') completeCinematic(ICHIGO_GATE_END)
    else setPhase(old => old === from ? to : old)
  }, [completeCinematic])
  const onBarracksPhase = useCallback((from: EncounterPhase, to: EncounterPhase) => {
    if (to === 'complete') completeCinematic(ICHIGO_HALL_END)
    else setPhase(old => old === from ? to : old)
  }, [completeCinematic])
  const onGardenPhase = useCallback((from: EncounterPhase, to: EncounterPhase) => {
    if (to === 'complete') completeCinematic(ICHIGO_GARDEN_END)
    else setPhase(old => old === from ? to : old)
  }, [completeCinematic])
  const toggleCamera = useCallback(() => {
    const next = controls.current.cameraMode === 'free' ? 'follow' : 'free'
    controls.current.cameraMode = next
    controls.current.keys.clear()
    setCameraMode(next)
    ;(document.activeElement as HTMLElement)?.blur()
  }, [])
  const playing = entered && !panel && !error && !encounterActive && gallery === null && !transit && !quick
  const onSelectSite = useCallback((i: number) => { controls.current.keys.clear(); setPanel(null); setGallery(i); setJourneyNote(false) }, [])
  const readyCallback = useCallback(() => setReady(true), [])
  const nearest = places.map((p, index) => { const distance = Math.hypot(p.position[0] - position[0], p.position[2] - position[2], p.position[1] - position[1]); return { index, distance, score: distance - p.radius } }).sort((a, b) => a.score - b.score)[0]
  const current = places[nearest.index]
  const nearby = nearest.distance < current.radius
  const atTraining = nearby && current.name === 'Training grounds'
  const atLab = nearby && current.name === 'Twelfth Division lab'
  // The training-grounds section shows as a card on arrival; closing it hides it until you leave.
  const [sectionClosed, setSectionClosed] = useState(false)
  if (!atTraining && sectionClosed) setSectionClosed(false)
  // The 'journey complete' note stays while you are at the lab after arriving.
  if (journeyNote && !atLab && !transit) setJourneyNote(false)
  const onPosition = useCallback((p: Vec3) => {
    setPosition(p)
    places.forEach((place, i) => {
      if (Math.hypot(place.position[0] - p[0], place.position[2] - p[2], place.position[1] - p[1]) < place.radius) setVisited(old => old.includes(i) ? old : [...old, i])
    })
  }, [])
  const startEncounter = useCallback((index: 0 | 1 | 2 | 3 = 0) => {
    setStage(index)
    controls.current.keys.clear()
    setPanel(null)
    // Every fight walks Ichigo from wherever the player stands onto his mark.
    setPhase('intro')
    ;(document.activeElement as HTMLElement)?.blur()
  }, [])
  useEffect(() => {
    // Start a one-shot sequence when the external physics position enters the gate trigger.
    // eslint-disable-next-line react/set-state-in-effect
    if (phase === 'complete') completed.current.add(stage)
    const next = [0, 1, 2, 3].find(i => !completed.current.has(i)) ?? 4
    // eslint-disable-next-line react/set-state-in-effect
    if (next !== nextStage) setNextStage(next)
    // Synchronize the gate actor visibility with the completed encounter.
    // eslint-disable-next-line react/set-state-in-effect
    if (phase === 'complete' && stage === 0) setGateComplete(true)
    if (playing && nearest.index < 4 && !completed.current.has(nearest.index) && nearest.distance < (nearest.index === 1 ? 6.5 : 4.5)) startEncounter(nearest.index as 0 | 1 | 2 | 3)
  }, [playing, phase, stage, nearest.index, nearest.distance, startEncounter, nextStage])
  useEffect(() => {
    if (!encounterActive) (document.activeElement as HTMLElement)?.blur()
  }, [encounterActive])
  useEffect(() => {
    const keys = controls.current.keys
    function down(e: KeyboardEvent) {
      if (transit) return
      if (quick) { if (e.code === 'Escape') { e.preventDefault(); closeQuick() } return }
      if (encounterActive) {
        // Cinematics: Escape skips to the portfolio section (or ends the finishing move);
        // the right arrow steps one beat.
        if ((phase === 'finish' || phase === 'catch') && (e.code === 'Escape' || e.code === 'ArrowRight')) { e.preventDefault(); completeCinematic(finishMark(stage)); return }
        if (e.code === 'Escape' && phase !== 'reveal') { e.preventDefault(); setPhase('reveal') }
        if (e.code === 'ArrowRight' && phase !== 'reveal') { e.preventDefault(); setPhase(advanceEncounter(stage, phase)) }
        return
      }
      if (gallery !== null) {
        // Browsing websites in the lab: ←/→ (or A/D) step through them; Escape steps back out.
        const n = siteSlots.length
        if (e.code === 'Escape') { e.preventDefault(); setGallery(null) }
        if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); setGallery((gallery + 1) % n) }
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); setGallery((gallery - 1 + n) % n) }
        return
      }
      if (e.code === 'Escape') { setPanel(old => old ? null : 'controls'); keys.clear(); return }
      if ((e.target as HTMLElement).closest('button, input, a')) return
      if (e.code === 'KeyC' && entered && !e.repeat) { e.preventDefault(); toggleCamera(); return }
      if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault()
      if (e.code === 'KeyM') { setPanel(old => old === 'map' ? null : 'map'); keys.clear(); return }
      if (e.code === 'KeyE' && nearby && entered) { if (atTraining) setSectionClosed(false); else if (atLab) onSelectSite(0); else setPanel('encounter'); keys.clear(); return }
      if (playing) keys.add(e.code)
    }
    function up(e: KeyboardEvent) { keys.delete(e.code) }
    function blur() { keys.clear() }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', blur); keys.clear() }
  }, [playing, nearby, atTraining, atLab, gallery, onSelectSite, entered, toggleCamera, encounterActive, phase, stage, completeCinematic, transit, quick, closeQuick])
  function teleport(p: Vec3, yaw = 0) {
    controls.current.keys.clear(); controls.current.yaw = yaw; setGallery(null)
    setTravel(old => ({ serial: old.serial + 1, position: p })); setPanel(null)
    ;(document.activeElement as HTMLElement)?.blur()
  }
  function close() { setPanel(null); (document.activeElement as HTMLElement)?.blur() }

  useEffect(() => {
    if (!import.meta.env.DEV) return
    // Development helpers for reviewing the finale: __finale.start(), .seek(12.5), .pause().
    const hooks = {
      start: () => startEncounter(3),
      seek: (t: number) => { finaleClock.current.seek = t; setPhase([...finalePhases].reverse().find(p => t >= p.start)?.phase ?? 'intro') },
      pause: (paused = true) => { finaleClock.current.paused = paused },
      state: () => ({ ...finaleClock.current }),
    }
    // Same helpers for the gate fight: __gate.start(), .seek(8), .pause().
    const gate = {
      start: () => startEncounter(0),
      seek: (t: number) => { gateClock.current.seek = t; setStage(0); setPhase(t >= GATE_FINISH ? 'finish' : t >= GT.reveal ? 'reveal' : t >= GT.renji ? 'renji' : 'intro') },
      pause: (paused = true) => { gateClock.current.paused = paused },
      state: () => ({ ...gateClock.current }),
    }
    // And the barracks fight: __barracks.start(), .seek(7), .pause().
    const barracks = {
      start: () => startEncounter(1),
      seek: (t: number) => { barracksClock.current.seek = t; setStage(1); setPhase(t >= BARRACKS_FINISH ? 'finish' : t >= BT.reveal ? 'reveal' : t >= BT.dragon ? 'dragon' : 'intro') },
      pause: (paused = true) => { barracksClock.current.paused = paused },
      state: () => ({ ...barracksClock.current }),
    }
    // And the garden fight: __garden.start(), .seek(6.6), .pause().
    const garden = {
      start: () => startEncounter(2),
      seek: (t: number) => { gardenClock.current.seek = t; setStage(2); setPhase(t >= GD.appear ? 'catch' : t >= GARDEN_FINISH ? 'finish' : t >= GD.reveal ? 'reveal' : t >= GD.shunko ? 'shunko' : 'intro') },
      pause: (paused = true) => { gardenClock.current.paused = paused },
      state: () => ({ ...gardenClock.current }),
    }
    const w = window as unknown as { __finale?: typeof hooks; __gate?: typeof gate; __barracks?: typeof barracks; __garden?: typeof garden }
    w.__finale = hooks; w.__gate = gate; w.__barracks = barracks; w.__garden = garden
  }, [startEncounter])
  const artReview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('artReview')
  if (artReview) return <EnvironmentStudy name={artReview} />
  return <main>
    <div className="scene" aria-label="Interactive Seireitei world">
      <SceneBoundary onError={setError}>
        <Canvas shadows="percentage" dpr={[1, 1.5]} camera={{ position: [0, 5, 32], fov: 52, near: .08, far: 350 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
          <color attach="background" args={['#b5cfdd']} />
          <fog attach="fog" args={['#b5cfdd', 110, 250]} />
          <Suspense fallback={null}>
            <Physics timeStep={1 / 60} interpolate={false}>
              <World stage={stage} gateComplete={gateComplete} nextStage={nextStage} arrival={arrival} phase={phase} playing={playing} entered={entered} controls={controls} travel={travel} onReady={readyCallback} onPosition={onPosition} finaleClock={finaleClock} onFinalePhase={onFinalePhase} gateClock={gateClock} onGatePhase={onGatePhase} barracksClock={barracksClock} onBarracksPhase={onBarracksPhase} gardenClock={gardenClock} onGardenPhase={onGardenPhase} gallery={gallery} onSelectSite={onSelectSite} />
            </Physics>
          </Suspense>
        </Canvas>
      </SceneBoundary>
    </div>
    <header inert={encounterActive}>
      <a className="brand" href="#" onClick={e => { e.preventDefault(); if (entered) setPanel('map') }} aria-label="Seireitei world map"><span className="brand-symbol">✦</span><span>SEIREITEI<small>MICHAEL ROCKINGHAM · PORTFOLIO</small></span></a>
      <div className="top-actions"><span className="edition">WORLD STUDY / 01</span>{!encounterActive && !transit && <button className="quick-open" onClick={openQuick} aria-label="Portfolio at a glance">Portfolio <span>≡</span></button>}{entered && <><button onClick={toggleCamera} aria-label={`Camera: ${cameraMode === 'free' ? 'free look' : 'third-person follow'}. Switch mode`} aria-pressed={cameraMode === 'follow'}>{cameraMode === 'free' ? 'Free look' : 'Follow camera'} <kbd>C</kbd></button><button onClick={() => setPanel('map')}>Map <kbd>M</kbd></button><button onClick={() => setPanel('controls')}>Controls <span>↗</span></button></>}</div>
    </header>
    {!entered && !error && <WorldLoader ready={ready} />}
    {!entered && <section className="entry">
      <div className="entry-copy"><p className="eyebrow"><span /> THE SOUL SOCIETY</p><h1>Every journey<br />begins at<br /><em>the gate.</em></h1><p className="intro">Step into Seireitei. Follow the streets, enter the halls, and find your way to the hill above it all.</p>
        <button className={ready ? 'primary ready' : 'primary'} disabled={!ready || !!error} onClick={e => { setEntered(true); e.currentTarget.blur() }}>{ready ? 'Enter the world' : 'Loading the world…'}<span>→</span></button>
        <button className="quick-link" onClick={openQuick}>Short on time? See the portfolio at a glance <span>→</span></button>
        <div className="entry-notes"><span>0{places.length} LOCATIONS</span><span>FREE EXPLORATION</span></div>
      </div>
      <div className="entry-bottom"><span>A BLEACH-INSPIRED WORLD</span><span>Headphones optional. Curiosity encouraged.</span></div>
    </section>}
    {entered && !encounterActive && gallery === null && <>
      <aside className="location"><p className="eyebrow">{nearby ? 'YOU HAVE ARRIVED' : 'EXPLORING SEIREITEI'}</p><h2>{current.name}</h2><p>{current.subtitle}</p>{nearby && <button className="encounter-button" onClick={() => atTraining ? setSectionClosed(false) : atLab ? onSelectSite(0) : setPanel('encounter')}><kbd>E</kbd> {atTraining ? 'Read the section' : atLab ? 'Browse the websites' : 'Inspect location'} <span>↗</span></button>}</aside>
      {atTraining && !sectionClosed && !panel && <SectionCard onClose={() => setSectionClosed(true)} />}
      <div className="journey"><span>{String(visited.length).padStart(2, '0')} / {String(places.length).padStart(2, '0')} DISCOVERED</span><div>{routeOrder.map(i => <button key={places[i].name} aria-label={`View ${places[i].name} on map`} title={places[i].name} className={visited.includes(i) ? 'discovered' : ''} onClick={() => setPanel('map')} />)}</div></div>
      <div className="movement-hint"><kbd>W A S D</kbd> {cameraMode === 'free' ? 'Move' : 'Move / turn'} <i /> {cameraMode === 'free' ? 'Drag to look' : 'Drag to turn'} <i /><kbd>C</kbd> Camera <i /><kbd>SHIFT</kbd> Run</div>
      <TouchStick controls={controls} />
    </>}
    {panel && entered && <div className="modal-backdrop" onClick={close}>
      <section className={`modal ${panel === 'map' ? 'map-modal' : ''}`} role="dialog" aria-modal="true" aria-label={panel === 'map' ? 'World map' : panel === 'controls' ? 'Controls' : current.name} onClick={e => e.stopPropagation()} onKeyDown={e => {
        if (e.key !== 'Tab') return
        const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('button')
        const first = buttons[0], last = buttons[buttons.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }}>
        <button autoFocus className="close" onClick={close} aria-label="Close dialog">×</button>
        <p className="eyebrow">{panel === 'map' ? 'YOUR PATH THROUGH SEIREITEI' : panel === 'controls' ? 'TAKE YOUR TIME' : current.side ? 'SIDE STOP' : `LOCATION ${current.label}`}</p>
        <h2>{panel === 'map' ? 'Eight places. One journey.' : panel === 'controls' ? 'Find your way.' : current.name}</h2>
        {panel === 'map' ? <>
          <div className="map-art"><svg viewBox="0 0 400 340" role="img" aria-label="Route from gate to barracks, compound, and hilltop, with side stops"><path className="map-route" d="M150 280 L150 250 L300 250 L300 190 L70 190 L70 135 L70 90 L215 90 L215 65 L70 65 L110 35" /><path className="map-route map-spur" d="M272 250 L272 264 M236 190 L236 180 M150 250 L113 250 M70 90 L43 81" />{places.map((p, i) => p.side
            ? <g key={p.name}><rect x={p.mapDot[0] - 9} y={p.mapDot[1] - 9} width="18" height="18" transform={`rotate(45 ${p.mapDot[0]} ${p.mapDot[1]})`} className={visited.includes(i) ? 'map-dot active' : 'map-dot'} /></g>
            : <g key={p.name}><circle cx={p.mapDot[0]} cy={p.mapDot[1]} r="14" className={visited.includes(i) ? 'map-dot active' : 'map-dot'} /><text x={p.mapDot[0]} y={p.mapDot[1] + 4}>{i + 1}</text></g>)}<text x="210" y="308" className="map-caption">SOUTH GATE → NORTH SUMMIT</text></svg></div>
          <div className="place-list">{routeOrder.map(i => { const p = places[i]; return <button key={p.name} onClick={() => teleport(p.spawn, p.spawnYaw)}><span className={p.side ? 'place-number side' : 'place-number'}>{p.label}</span><span>{p.name}<small>{p.side ? 'Side stop · ' : ''}{visited.includes(i) ? 'Discovered' : 'Unexplored'} · Jump here</small></span><span>↗</span></button> })}</div>
          <p className="fine-print">Quick travel is available while we test the world.</p>
        </> : panel === 'controls' ? <><div className="control-list"><p><span>Walk</span><kbd>W A S D / ARROWS</kbd></p><p><span>Run</span><kbd>SHIFT</kbd></p><p><span>Look around</span><kbd>CLICK + DRAG</kbd></p><p><span>Camera distance · up to 30 m</span><kbd>SCROLL</kbd></p><p><span>Camera mode</span><kbd>C</kbd></p><p><span>World map</span><kbd>M</kbd></p><p><span>Inspect / pause</span><kbd>E / ESC</kbd></p><p className="touch-only"><span>Move · touch</span><kbd>LEFT THUMBSTICK</kbd></p><p className="touch-only"><span>Run · touch</span><kbd>PUSH TO THE RIM</kbd></p><p className="touch-only"><span>Look · touch</span><kbd>DRAG</kbd></p><p className="touch-only"><span>Zoom · touch</span><kbd>PINCH</kbd></p></div><p className="modal-copy">Free look keeps the original movement. Follow mode keeps the camera behind you: A/D turns, W/S moves forward/backward, and dragging turns the character too. Walls still bring the camera closer.</p><button className="secondary" onClick={toggleCamera}>Switch to {cameraMode === 'free' ? 'follow camera' : 'free look'}</button><p className="modal-copy">Doors open as you approach. Explore the barracks and compound, then take the switchback stairs up to the hill.</p><button className="secondary" onClick={() => teleport([0,.2,22])}>Return to the gate ↗</button></> : <><p className="modal-copy">{placeNote(current)}</p>{nearest.index < 4 && <button className="secondary" onClick={() => startEncounter(nearest.index as 0 | 1 | 2 | 3)}>Play the encounter ↗</button>}<div className="prototype-note"><span>IN THIS WORLD STUDY</span><p>Characters, powers, and effects are procedural placeholders built in code.</p></div><button className="primary" onClick={close}>Keep exploring <span>→</span></button></>}
      </section>
    </div>}
    {entered && encounterActive && (() => {
      // Letterboxed cinematic overlay shared by all four fights.
      const gate = stage === 0, hall = stage === 1, garden = stage === 2
      const steps = gate ? gateSteps : hall ? barracksSteps : garden ? gardenSteps : finaleSteps
      const beat = steps.findIndex(s => s.phase === phase)
      const step = steps[beat]
      return <section className={`finale-encounter ${phase}`} aria-label={gate ? 'Rukia and Renji encounter' : hall ? 'Tōshirō encounter' : garden ? 'Soi Fon encounter' : 'Byakuya finale'}>
        <div className="letterbox top" aria-hidden="true" /><div className="letterbox bottom" aria-hidden="true" />
        {step && <div className="finale-caption" role="status" key={phase}><p className="eyebrow">{gate ? '01 / SPIRIT GATE' : hall ? '02 / DIVISION BARRACKS' : garden ? '03 / KUCHIKI GARDEN' : '04 / SŌKYOKU HILL'}</p><h2>{step.title}</h2><p>{step.caption}</p></div>}
        {phase !== 'reveal' && <ol className="finale-beats" aria-label={`Beat ${beat + 1} of ${steps.length}`}>{steps.map((s, i) => <li key={s.phase} className={i < beat ? 'done' : i === beat ? 'current' : ''} />)}</ol>}
        {phase === 'reveal' ? (gate ? <article className="resume-reveal gate-reveal" role="dialog" aria-modal="true" aria-label="About Me" onKeyDown={trapTab}>
          <p className="eyebrow">CHAPTER ONE</p><h2>About Me</h2>
          <p className="profile-line"><strong>{about.name}</strong><span>{about.role} · {about.location}</span></p>
          <p>{about.summary}</p>
          <small>Characters and effects are procedural placeholders</small>
          <button ref={focusQuietly} className="primary" onClick={() => setPhase('finish')}>Continue · Ichigo’s finishing move <span>→</span></button>
        </article> : hall ? <article className="resume-reveal gate-reveal wide-reveal" role="dialog" aria-modal="true" aria-label="Experience" onKeyDown={trapTab}>
          <p className="eyebrow">CHAPTER TWO</p><h2>Experience</h2>
          <div className="roles">{experience.map((r, i) => <details key={r.company} open={i === 0}>
            <summary><strong>{r.company}</strong><span>{r.title} · {r.dates}</span></summary>
            <ul className="role-tech" aria-label="Tech">{r.tech.map(t => <li key={t}>{t}</li>)}</ul>
            <ul className="role-points">{r.highlights.map(h => <li key={h.title}><b>{h.title}.</b> {h.text}{h.link && <> <a href={h.link.href} target="_blank" rel="noreferrer">{h.link.label} ↗</a></>}</li>)}</ul>
          </details>)}</div>
          <small>Characters and effects are procedural placeholders</small>
          <button ref={focusQuietly} className="primary" onClick={() => setPhase('finish')}>Continue · Ichigo’s finishing move <span>→</span></button>
        </article> : garden ? <article className="resume-reveal gate-reveal garden-reveal" role="dialog" aria-modal="true" aria-label="Skills" onKeyDown={trapTab}>
          <p className="eyebrow">CHAPTER THREE</p><h2>Skills</h2>
          <div className="skill-groups">{skills.map(g => <section key={g.group}><h3>{g.group}</h3><ul className="role-tech">{g.items.map(t => <li key={t}>{t}</li>)}</ul></section>)}</div>
          <small>Characters and effects are procedural placeholders</small>
          <button ref={focusQuietly} className="primary" onClick={() => setPhase('finish')}>Continue · Ichigo’s finishing move <span>→</span></button>
        </article> : <article className="resume-reveal finale-reveal" role="dialog" aria-modal="true" aria-label={finalChapter.heading} onKeyDown={trapTab}>
          <p className="eyebrow">FINAL CHAPTER</p><h2>{finalChapter.heading}</h2>
          {finalChapter.message ? <p>{finalChapter.message}</p> : <p className="resume-placeholder">Your closing message goes here.</p>}
          {finalChapter.links.length ? <ul className="contact-links">{finalChapter.links.map(l => <li key={l.href}><a href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{l.label} <span aria-hidden="true">↗</span></a></li>)}</ul>
            : <p className="contact-placeholder">Add your contact links in <code>src/portfolio-content.ts</code>.</p>}
          <ol className="chapter-recap" aria-label="Chapters completed">{chapters.map((c, i) => <li key={c}><span>0{i + 1}</span>{c}</li>)}</ol>
          <small>Characters and effects are procedural placeholders</small>
          <button ref={focusQuietly} className="primary" onClick={finishJourney}>Finish the journey <span>→</span></button>
          <button className="secondary replay-finale" onClick={() => startEncounter(3)}>Replay the finale</button>
        </article>) : <div className="finale-controls">
          {phase === 'finish' || phase === 'catch' ? <button className="skip-cinematic" onClick={() => completeCinematic(finishMark(stage))}>Skip <kbd>ESC</kbd></button> : <>
            <button onClick={() => setPhase(advanceEncounter(stage, phase))}>Next beat <kbd>→</kbd></button>
            <button className="skip-cinematic" onClick={() => setPhase('reveal')}>{gate ? 'Skip to About Me' : hall ? 'Skip to Experience' : garden ? 'Skip to Skills' : 'Skip to portfolio'} <kbd>ESC</kbd></button>
          </>}
        </div>}
      </section>
    })()}
    {entered && phase === 'complete' && !panel && nearest.distance < 7 && nearest.index === stage && <div className="encounter-next" role="status"><strong>{stage === 0 ? 'Gate encounter complete' : stage === 1 ? 'Barracks encounter complete' : stage === 2 ? 'Garden encounter complete' : 'Final encounter complete'}</strong><span>{stage === 0 ? 'Turn right and follow the street to the Division barracks →' : stage === 1 ? 'Continue through the rear doors toward the Kuchiki compound →' : stage === 2 ? 'Continue through the estate toward Sōkyoku Hill →' : 'All four chapters are ready to explore again.'}</span><button onClick={() => startEncounter(stage)}>Replay encounter</button></div>}
    {entered && gallery !== null && <GalleryPanel index={gallery} onPrev={() => setGallery((gallery - 1 + siteSlots.length) % siteSlots.length)} onNext={() => setGallery((gallery + 1) % siteSlots.length)} onClose={() => setGallery(null)} />}
    {entered && journeyNote && atLab && !transit && gallery === null && !panel && <div className="encounter-next journey-note" role="status"><strong>Journey complete</strong><span>The Senkaimon brought you to the Twelfth Division lab. Step inside to browse the websites.</span><button onClick={() => onSelectSite(0)}>Browse the websites</button></div>}
    {quick && <QuickView entered={entered} ready={ready} onClose={closeQuick} onEnter={() => { closeQuick(); setEntered(true) }} />}
    {transit && <div className="senkaimon" aria-hidden="true">
      <div className="senkaimon-light" />
      <div className="senkaimon-door left"><span>穿</span></div>
      <div className="senkaimon-door right"><span>界</span></div>
      <p className="senkaimon-caption">SENKAIMON · 穿界門</p>
      {gateButterflies.map(([x0, y0, x1, y1, d, sc, rot], i) => <svg key={i} className="senkaimon-bf" viewBox="-20 -16 40 32" style={{ ['--x0' as string]: x0 + 'vw', ['--y0' as string]: y0 + 'vh', ['--x1' as string]: x1 + 'vw', ['--y1' as string]: y1 + 'vh', ['--s' as string]: sc, ['--r' as string]: rot + 'deg', animationDelay: d + 's' }}>
        {[1, -1].map(side => <g key={side} transform={'scale(' + side + ' 1)'}><path className="bf-wing" d="M0 0 C -6 -12 -18 -14 -18 -4 C -18 2 -10 4 -4 3 C -10 6 -12 14 -6 12 C -2 10 0 6 0 2 Z" /></g>)}
      </svg>)}
    </div>}
    {error && <div className="error-message" role="alert"><h2>The world couldn’t load.</h2><p>{error}</p><button onClick={() => location.reload()}>Try again</button></div>}
  </main>
}


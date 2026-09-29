// Division barracks encounter director (Tōshirō Hitsugaya and Hyōrinmaru, five captains
// watching). Same structure as the other cinematics: one clock drives every pose, effect,
// light, and camera move, so skip, replay, and frame rate stay in sync.
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { EncounterPhase } from './encounter-state'
import { Ichigo } from './finale/characters'
import type { Figure } from './finale/figure-kit'
import { addRotation, applyGait, applySample, bakeTrack, createSample, sampleTrack } from './finale/rig'
import type { Track } from './finale/rig'
import { impulse, ramp, window4 } from './finale/timeline'
import type { FinaleClock, FinaleMood } from './finale/timeline'
import { Flashes, Getsuga, Particles, Rings, Scar } from './finale/effects'
import { createCameraPose, evaluateShots } from './finale/camera'
import { getEnvMap } from './finale/materials'
import { findFlatMarker } from './finale/scene-utils'
import type { CinemaLights } from './finale/scene-utils'
import { Captain, Toshiro } from './barracks/characters'
import type { CaptainKind } from './barracks/characters'
import { captainPoses, hallIchigoFinish, hallIchigoTrack, toshiroFinish, toshiroTrack } from './barracks/choreography'
import { IceDragon } from './barracks/dragon'
import { FrostFloor, IceBind, hallDust, hallFlashes, hallRings, hallSparks, toshiroDeparture } from './barracks/effects'
import { hallShots } from './barracks/camera'
import { BARRACKS_FINISH, BT, HALL_FLOOR as G, ICHIGO_HALL_END, ICHIGO_HALL_MARK, TOSHIRO_MARK, TOSHIRO_START, barracksNextPhase, barracksPhaseEnd, barracksPhaseStart, hallWaveZ } from './barracks/timeline'

type Props = {
  phase: EncounterPhase
  clock: RefObject<FinaleClock>
  mood: RefObject<FinaleMood>
  playerPosition: RefObject<THREE.Vector3>
  onPhase: (from: EncounterPhase, to: EncounterPhase) => void
  lights: CinemaLights
  occluders?: React.RefObject<THREE.Object3D>[]
}

const captains: { kind: CaptainKind; name: string; x: number; z: number }[] = [
  { kind: 'ukitake', name: 'Jūshirō Ukitake', x: 23, z: -9 },
  { kind: 'shunsui', name: 'Shunsui Kyōraku', x: 23, z: -13 },
  { kind: 'unohana', name: 'Retsu Unohana', x: 23, z: -17 },
  { kind: 'komamura', name: 'Sajin Komamura', x: 33, z: -13 },
  { kind: 'mayuri', name: 'Mayuri Kurotsuchi', x: 33, z: -17 },
]
const captainTracks = Object.fromEntries(captains.map(c => [c.kind, bakeTrack([{ t: 0, pose: captainPoses[c.kind] }])])) as Record<CaptainKind, Track>
const labelStyle: React.CSSProperties = { pointerEvents: 'none', whiteSpace: 'nowrap', fontSize: 11, color: '#effaff', background: '#153442cc', padding: '3px 7px', borderRadius: 3 }
const ENTRY = 1.3
const [IX, , IZ] = ICHIGO_HALL_MARK, IZE = ICHIGO_HALL_END[2]
const [SX, , SZ] = TOSHIRO_START, [TX, , TZ] = TOSHIRO_MARK
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function useHallEffects() {
  const { gl } = useThree()
  const fx = useMemo(() => {
    const env = getEnvMap(gl)
    const group = new THREE.Group()
    group.name = 'barracks-effects'
    const dragon = new IceDragon(env), frost = new FrostFloor(), bind = new IceBind(env)
    const wave = new Getsuga('first', { release: BT.release, hit: BT.hit, x: IX - .1, y: G + 1.3, z: hallWaveZ, roll: -.5 })
    const scar = new Scar(false, { release: BT.release, hit: BT.hit, x: IX, ground: G, from: IZE - 1, to: TZ + .9, fade: [.4, 2.6] })
    const rings = new Rings(hallRings()), flashes = new Flashes(hallFlashes())
    const sparks = new Particles(hallSparks(), true, false, G + .02), dust = new Particles(hallDust(), false, true, G + .02)
    const leave = toshiroDeparture()
    const leaveSparks = new Particles(leave.sparks, true, false, G + .02), leaveFlashes = new Flashes(leave.flashes)
    group.add(frost.mesh, dragon.group, bind.mesh, wave.group, scar.mesh, rings.group, flashes.group, dust.points, sparks.points, leaveSparks.points, leaveFlashes.group)
    return { group, dragon, frost, bind, wave, scar, rings, flashes, sparks, dust, leaveSparks, leaveFlashes }
  }, [gl])
  useEffect(() => () => {
    fx.dragon.dispose(); fx.frost.dispose(); fx.bind.dispose(); fx.wave.dispose(); fx.scar.dispose(); fx.rings.dispose(); fx.flashes.dispose()
    fx.sparks.dispose(); fx.dust.dispose(); fx.leaveSparks.dispose(); fx.leaveFlashes.dispose()
  }, [fx])
  return fx
}

const tmpV = new THREE.Vector3(), tmpW = new THREE.Vector3()
const iceLight = new THREE.Color('#aeeaff'), rimCool = new THREE.Color('#e4efff'), steel = new THREE.Color('#e3eef2'), frostGlow = new THREE.Color('#7fd8ff'), black = new THREE.Color('#000000')

function BarracksEncounter({ phase, clock, mood, playerPosition, onPhase, lights, occluders }: Props) {
  const { gl, camera, size, scene } = useThree()
  const marker = useRef<THREE.Object3D | null | undefined>(undefined)
  const fx = useHallEffects()
  const toshiro = useRef<Figure | null>(null), ichigo = useRef<Figure | null>(null)
  const toshiroRoot = useRef<THREE.Group>(null), ichigoRoot = useRef<THREE.Group>(null)
  const captainFigures = useRef<(Figure | null)[]>([])
  const captainRoots = useRef<(THREE.Group | null)[]>([])
  const captainRefs = useMemo(() => captains.map((_, i) => (f: Figure | null) => { captainFigures.current[i] = f }), [])
  const sample = useMemo(() => createSample(), [])
  const camPose = useMemo(() => createCameraPose(), [])
  const director = useRef({
    prev: 'idle' as EncounterPhase, requested: null as EncounterPhase | null,
    entry: { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 52, feet: new THREE.Vector3(...ICHIGO_HALL_MARK) },
    lookObj: new THREE.PerspectiveCamera(), focus: new THREE.Vector3(), shake: reducedMotion() ? 0 : 1,
  })
  useLayoutEffect(() => {
    // eslint-disable-next-line react/immutability -- renderer flag; Ichigo's figure uses clipping planes.
    gl.localClippingEnabled = true
  }, [gl])
  const cinematic = phase !== 'idle' && phase !== 'complete'
  // Tōshirō leaves with a flash step once the fight is won; keep his name label hidden after that.
  const [departed, setDeparted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- mirrors the encounter phase for the label.
    if (phase === 'complete') setDeparted(true); else if (phase === 'intro') setDeparted(false)
  }, [phase])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, .1)
    const c = clock.current, d = director.current
    if (d.prev !== phase) {
      if (phase === 'intro') {
        // eslint-disable-next-line react/immutability -- the barracks clock is a shared mutable ref advanced here.
        c.time = 0; c.completeAt = -1
        // A new fight starts from a neutral sky, even if another one was still fading out.
        Object.assign(mood.current, { pink: 0, dusk: 0, gold: 0, cold: 0 })
        d.entry.pos.copy(camera.position); d.entry.quat.copy(camera.quaternion)
        d.entry.fov = (camera as THREE.PerspectiveCamera).fov
        const p = playerPosition.current
        d.entry.feet.set(p.x, p.y - .9, p.z)
        if (d.entry.feet.distanceTo(tmpV.set(...ICHIGO_HALL_MARK)) > 8) d.entry.feet.set(...ICHIGO_HALL_MARK)
      } else if (phase === 'complete') c.completeAt = c.time
      else if (phase === 'finish') c.time = BARRACKS_FINISH
      else if (phase !== 'idle' && c.time < barracksPhaseStart(phase)) c.time = barracksPhaseStart(phase)
      d.prev = phase; d.requested = null
    }
    if (c.seek !== undefined) { c.time = c.seek; c.seek = undefined }
    const active = phase !== 'idle' && phase !== 'complete'
    if (phase !== 'idle' && !c.paused) c.time += dt
    if (phase === 'reveal') c.time = Math.min(c.time, BARRACKS_FINISH - 5)
    if (active && phase !== 'reveal' && c.time >= barracksPhaseEnd(phase) && d.requested !== phase) {
      d.requested = phase
      onPhase(phase, barracksNextPhase(phase))
    }
    const t = c.time
    const finishing = t >= BARRACKS_FINISH - 1
    const departure = c.completeAt >= 0 ? (phase === 'complete' ? t - c.completeAt : 99) : -1
    const live = active || departure >= 0
    const tt = live ? t : 0

    // ---- Camera ----
    if (active) {
      const cam = camera as THREE.PerspectiveCamera
      evaluateShots(hallShots, t, camPose, d.shake, size.width / size.height)
      const w = ramp(t, 0, 1.15)
      d.lookObj.position.copy(camPose.pos); d.lookObj.lookAt(camPose.look)
      cam.position.lerpVectors(d.entry.pos, camPose.pos, w)
      cam.quaternion.slerpQuaternions(d.entry.quat, d.lookObj.quaternion, w)
      const fov = d.entry.fov + (camPose.fov - d.entry.fov) * w
      // eslint-disable-next-line react/immutability -- the cinematic owns the camera while it plays.
      if (Math.abs(cam.fov - fov) > .01) { cam.fov = fov; cam.updateProjectionMatrix() }
    } else if (phase === 'complete' && (camera as THREE.PerspectiveCamera).fov !== 52 && departure < 4) {
      const cam = camera as THREE.PerspectiveCamera
      cam.fov += (52 - cam.fov) * (1 - Math.exp(-3 * dt))
      if (Math.abs(cam.fov - 52) < .05) cam.fov = 52
      cam.updateProjectionMatrix()
    }

    // ---- Effects first: the dragon's head is the captains' focus ----
    if (marker.current === undefined) marker.current = findFlatMarker(scene, 28, -11, G)
    if (marker.current) marker.current.visible = !active
    const fxTime = live ? t : -1
    const dragonLight = fx.dragon.update(fxTime)
    fx.frost.update(fxTime); fx.bind.update(fxTime)
    const waveLight = fx.wave.update(fxTime)
    fx.scar.update(fxTime); fx.rings.update(fxTime); fx.flashes.update(fxTime)
    const pixel = size.height * gl.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) / 2))
    fx.sparks.update(fxTime, pixel); fx.dust.update(fxTime, pixel)
    fx.leaveSparks.update(departure >= 0 && departure < 5 ? departure : -1, pixel); fx.leaveFlashes.update(departure >= 0 ? departure : -1)

    // ---- Tōshirō: steps out of the line, draws Hyōrinmaru from his back ----
    const T = toshiro.current
    if (T && toshiroRoot.current) {
      toshiroRoot.current.visible = departure < .1
      sampleTrack(finishing ? toshiroFinish : toshiroTrack, tt, sample)
      applySample(T.joints, sample, T.hipsY)
      T.root.position.copy(sample.offset)
      T.joints.chest?.rotateX(Math.sin(state.clock.elapsedTime * 2) * .012)
      const k = live ? ramp(tt, BT.stepOut, BT.stepIn) : 0
      toshiroRoot.current.position.set(SX + (TX - SX) * k, G, SZ + (TZ - SZ) * k)
      const heading = Math.atan2(TX - SX, TZ - SZ)
      toshiroRoot.current.rotation.y = !live ? -Math.PI / 2 : tt < BT.stepOut + .3 ? -Math.PI / 2 + (heading + Math.PI / 2) * ramp(tt, BT.stepOut, BT.stepOut + .3) : heading * (1 - ramp(tt, BT.stepIn - .4, BT.stepIn + .1))
      if (live && tt > BT.stepOut && tt < BT.stepIn) applyGait(T.joints, tt * 11, window4(tt, BT.stepOut, BT.stepOut + .2, BT.stepIn - .25, BT.stepIn), 0, T.hipsY - sample.drop)
      const drawn = live && tt >= BT.drawn - .15
      if (T.parts.backSword) T.parts.backSword.visible = !drawn
      if (T.parts.handSword) T.parts.handSword.visible = drawn
      const bladeMesh = T.parts.blade?.children[0] as THREE.Mesh | undefined
      if (bladeMesh) {
        const frosted = live ? ramp(tt, BT.call, BT.swing) * (1 - (finishing ? ramp(tt, BT.hit, BT.hit + 1) : 0)) : 0
        const mat = bladeMesh.material as THREE.MeshStandardMaterial
        mat.emissive.lerpColors(black, frostGlow, frosted * .5); mat.color.copy(steel)
      }
      const chain = T.parts.chain
      if (chain) for (let i = 0; i < 11; i++) {
        const link = chain.getObjectByName(`link${i}`)
        if (link) link.rotation.set(.12 + Math.sin(state.clock.elapsedTime * 3 - i * .6) * .12, 0, Math.sin(state.clock.elapsedTime * 2.2 - i * .8) * .2 + impulse(tt, BT.swing, 2.5) * .5)
      }
    }

    // ---- Ichigo (cinematic stand-in; the player avatar steps aside meanwhile) ----
    const I = ichigo.current
    if (I && ichigoRoot.current) {
      ichigoRoot.current.visible = active
      if (active) {
        sampleTrack(finishing ? hallIchigoFinish : hallIchigoTrack, t, sample)
        applySample(I.joints, sample, I.hipsY)
        I.root.position.copy(sample.offset)
        I.setForm?.('shikai')
        const e = d.entry.feet, k = ramp(t, 0, ENTRY)
        let x = e.x + (IX - e.x) * k, z = e.z + (IZ - e.z) * k
        const y = e.y + (G - e.y) * k
        if (finishing) { x = IX; z = IZE }
        else z += (IZE - IZ) * ramp(t, BT.impact, BT.impact + .18)
        ichigoRoot.current.position.set(x, y, z)
        let yaw = Math.PI
        const tx = IX - e.x, tz = IZ - e.z
        if (!finishing && Math.hypot(tx, tz) > .35) {
          const heading = Math.atan2(tx, tz)
          const diff = Math.atan2(Math.sin(Math.PI - heading), Math.cos(Math.PI - heading))
          yaw = heading + diff * ramp(t, ENTRY * .55, ENTRY)
          applyGait(I.joints, t * 10.5, 1 - ramp(t, ENTRY - .35, ENTRY), .1, I.hipsY - sample.drop)
        }
        ichigoRoot.current.rotation.y = yaw
        // Straining against the ice: the upper body twists while the legs stay locked.
        const strain = (!finishing && t > BT.circle) || (finishing && t < BT.breakFree) ? 1 : 0
        if (strain) { addRotation(I.joints, 'spine', 0, Math.sin(state.clock.elapsedTime * 2.6) * .16, 0); addRotation(I.joints, 'chest', Math.sin(state.clock.elapsedTime * 3.4) * .05, 0, 0) }
        I.joints.chest?.rotateX(Math.sin(state.clock.elapsedTime * 1.9) * .015)
        if (I.parts.swordCloth) I.parts.swordCloth.rotation.x = Math.sin(state.clock.elapsedTime * 4.1) * .3 + .2
      }
    }

    // ---- Captains: idle stances; heads follow the dragon, the fighters, or the player ----
    const focus = d.focus
    if (active && fxTime >= BT.dragonOut && !(finishing && t > BT.intercept + .3)) focus.copy(fx.dragon.headPos)
    else if (active) focus.set(IX, G + 1.4, (IZ + TZ) / 2)
    else focus.copy(playerPosition.current)
    const flinch = active ? impulse(t, BT.roar, 3) * .7 + impulse(t, BT.impact, 4) + impulse(t, BT.intercept, 4) : 0
    captains.forEach((cap, i) => {
      const fig = captainFigures.current[i], root = captainRoots.current[i]
      if (!fig || !root) return
      sampleTrack(captainTracks[cap.kind], 0, sample)
      applySample(fig.joints, sample, fig.hipsY)
      fig.joints.chest?.rotateX(Math.sin(state.clock.elapsedTime * 1.5 + i * 1.7) * .012 - flinch * .08)
      // Local direction to the focus (the captain faces +Z locally).
      tmpV.copy(focus).sub(tmpW.set(cap.x, G + 1.6, cap.z))
      const near = active || tmpV.lengthSq() < 144
      const yawToFocus = Math.atan2(tmpV.x, tmpV.z) - root.rotation.y
      const yaw = near ? Math.max(-1.1, Math.min(1.1, Math.atan2(Math.sin(yawToFocus), Math.cos(yawToFocus)))) : 0
      const pitch = near ? Math.max(-.6, Math.min(.35, -Math.atan2(tmpV.y, Math.hypot(tmpV.x, tmpV.z)))) : 0
      addRotation(fig.joints, 'neck', pitch * .5, yaw * .55, 0)
      addRotation(fig.joints, 'head', pitch * .4, yaw * .4, 0)
      const wind = active && t > BT.dragonOut ? .1 + impulse(t, BT.roar, 1.5) * .25 : .03
      for (const name of ['haoriL', 'haoriR']) { const panel = fig.parts[name]; if (panel) panel.rotation.x = .03 + wind + Math.sin(state.clock.elapsedTime * 2.1 + i + (name === 'haoriR' ? 1 : 0)) * wind * .4 }
    })

    // ---- Shared lights, only while this cinematic owns them ----
    if (active || (departure >= 0 && departure < 3)) {
      const L = lights.fx
      // eslint-disable-next-line react/immutability -- the shared cinematic lights are owned by whichever cinematic is playing.
      if (waveLight > 0) { L.color.set('#8fe6ff'); L.intensity = 30 * waveLight; L.position.set(IX, G + 1.2, hallWaveZ(t)) }
      else if (dragonLight > 0) { L.color.copy(iceLight); L.intensity = 26 * dragonLight; L.position.copy(fx.dragon.headPos).y += .6 }
      else L.intensity = 0
      L.intensity += active ? 45 * impulse(t, BT.impact, 5) + 50 * impulse(t, BT.intercept, 5) + 30 * impulse(t, BT.hit, 5) : 0
      lights.rim.position.set(24, G + 6, -21)
      lights.rim.target.position.set(28, G + 1.5, -9)
      lights.rim.intensity = (active ? ramp(t, 0, .8) : 1 - ramp(departure, 0, 2)) * .9
      lights.rim.color.copy(rimCool)
    }

    // ---- Mood: the hall turns cold while Hyōrinmaru is out ----
    if (active || (departure >= 0 && departure < 3)) {
      const m = mood.current
      const cold = finishing ? 1 - ramp(t, BT.hit, BT.hit + 2) : ramp(t, BT.dragonOut, BT.roar)
      // eslint-disable-next-line react/immutability -- mood is a shared mutable ref read by Environment.
      m.cold = cold * .55 * (departure >= 0 ? 1 - ramp(departure, 0, 2) : 1)
    }
  })

  return <>
    {captains.map((cap, i) => <group key={cap.kind} ref={o => { captainRoots.current[i] = o }} position={[cap.x, G, cap.z]} rotation={[0, cap.x < 28 ? Math.PI / 2 : -Math.PI / 2, 0]}>
      <Captain kind={cap.kind} figure={captainRefs[i]} />
      {!cinematic && <Html position={[0, cap.kind === 'komamura' ? 2.75 : 2.25, 0]} center distanceFactor={10} occlude={occluders ?? true} zIndexRange={[8, 0]} style={labelStyle}>{cap.name}</Html>}
    </group>)}
    <group ref={toshiroRoot} position={TOSHIRO_START} rotation={[0, -Math.PI / 2, 0]}>
      <Toshiro figure={toshiro} />
      {!cinematic && !departed && <Html position={[0, 1.75, 0]} center distanceFactor={10} occlude={occluders ?? true} zIndexRange={[8, 0]} style={labelStyle}>Tōshirō Hitsugaya</Html>}
    </group>
    <group ref={ichigoRoot} position={ICHIGO_HALL_MARK} rotation={[0, Math.PI, 0]} visible={false}><Ichigo figure={ichigo} /></group>
    <primitive object={fx.group} />
  </>
}

export default memo(BarracksEncounter)

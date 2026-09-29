// Sōkyoku Hill finale director. One clock drives every pose, effect, light, and camera
// move, so replay and skip always land on a consistent frame at any frame rate.
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { EncounterPhase } from './encounter-state'
import { Byakuya, Ichigo, LooseKatana } from './finale/characters'
import type { Figure } from './finale/characters'
import { applyGait, applySample, createSample, sampleTrack } from './finale/rig'
import { B_IDLE, byakuyaTrack, ichigoTrack } from './finale/choreography'
import { bakeTrack } from './finale/rig'
import { BYAKUYA_MARK, GROUND_Y, ICHIGO_MARK, T, finaleNextPhase, finalePhaseEnd, finalePhaseStart, finalWaveZ, firstWaveZ, impulse, lin, ramp, window4 } from './finale/timeline'
import type { FinaleClock, FinaleMood } from './finale/timeline'
import { PetalStorm } from './finale/petals'
import type { PetalContext } from './finale/petals'
import { KageyoshiBlades } from './finale/blades'
import { BankaiAura, Flashes, Getsuga, Particles, Rings, Scar, ShieldGlow, dustBursts, flashEvents, ringEvents, sparkBursts } from './finale/effects'
import { createCameraPose, evaluateCamera } from './finale/camera'
import { getEnvMap } from './finale/materials'
import { findFlatMarker } from './finale/scene-utils'
import type { CinemaLights } from './finale/scene-utils'

type Props = {
  phase: EncounterPhase
  clock: RefObject<FinaleClock>
  mood: RefObject<FinaleMood>
  playerPosition: RefObject<THREE.Vector3>
  onPhase: (from: EncounterPhase, to: EncounterPhase) => void
  lights: CinemaLights
}

const idleTrack = bakeTrack([{ t: 0, pose: B_IDLE }])

const ENTRY = 1.35
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function useFinaleEffects() {
  const { gl } = useThree()
  const fx = useMemo(() => {
    const group = new THREE.Group()
    group.name = 'sokyoku-finale-effects'
    const petals = new PetalStorm()
    const blades = new KageyoshiBlades(getEnvMap(gl))
    const [IX, , IZ] = ICHIGO_MARK, BZ = BYAKUYA_MARK[2]
    const first = new Getsuga('first', { release: T.firstRelease, hit: T.firstImpact, x: IX - .1, y: GROUND_Y + 1.3, z: firstWaveZ, roll: -.5 })
    const final = new Getsuga('final', { release: T.finalRelease, hit: T.finalImpact, x: IX + .1, y: GROUND_Y + 1.95, z: finalWaveZ, roll: .42 })
    const scars = [
      new Scar(false, { release: T.firstRelease, hit: T.firstImpact, x: IX, ground: GROUND_Y, from: IZ - 1, to: BZ + 2.2, fade: [.3, 2.2] }),
      new Scar(true, { release: T.finalRelease, hit: T.finalImpact, x: IX, ground: GROUND_Y, from: IZ - 1, to: BZ + .2, fade: [1.2, 7] }),
    ]
    const rings = new Rings(ringEvents()), flashes = new Flashes(flashEvents()), shield = new ShieldGlow(), aura = new BankaiAura()
    const sparks = new Particles(sparkBursts(), true, false), dust = new Particles(dustBursts(), false, true)
    group.add(petals.mesh, blades.mesh, first.group, final.group, ...scars.map(s => s.mesh), rings.group, flashes.group, shield.mesh, aura.group, dust.points, sparks.points)
    return { group, petals, blades, first, final, scars, rings, flashes, shield, aura, sparks, dust }
  }, [gl])
  useEffect(() => () => {
    fx.petals.dispose(); fx.blades.dispose(); fx.first.dispose(); fx.final.dispose(); fx.scars.forEach(s => s.dispose())
    fx.rings.dispose(); fx.flashes.dispose(); fx.shield.dispose(); fx.aura.dispose(); fx.sparks.dispose(); fx.dust.dispose()
  }, [fx])
  return fx
}

const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0)
const pink = new THREE.Color('#ff8fb8'), cyan = new THREE.Color('#8fe6ff'), crimson = new THREE.Color('#ff2340'), rimCool = new THREE.Color('#dfe8ff'), rimWarm = new THREE.Color('#ff7a86')

function HillEncounter({ phase, clock, mood, playerPosition, onPhase, lights }: Props) {
  const { gl, camera, size, scene } = useThree()
  const marker = useRef<THREE.Object3D | null | undefined>(undefined)
  const fx = useFinaleEffects()
  const byakuya = useRef<Figure | null>(null), ichigo = useRef<Figure | null>(null)
  const byakuyaRoot = useRef<THREE.Group>(null), ichigoRoot = useRef<THREE.Group>(null)
  const loose = useRef<THREE.Group>(null)
  const sampleB = useMemo(() => createSample(), []), sampleI = useMemo(() => createSample(), [])
  const camPose = useMemo(() => createCameraPose(), [])
  const ctx = useMemo<PetalContext>(() => ({ swordBase: new THREE.Vector3(), swordDir: new THREE.Vector3(0, 1, 0), swordLength: .88, camera: new THREE.Vector3() }), [])
  const director = useRef({
    prev: 'idle' as EncounterPhase, requested: null as EncounterPhase | null,
    entry: { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 52, feet: new THREE.Vector3(...ICHIGO_MARK) },
    // A camera-typed helper so lookAt aims its -Z axis, like the real camera.
    drop: new THREE.Matrix4(), lookObj: new THREE.PerspectiveCamera(), shake: reducedMotion() ? 0 : 1,
    warm: { compiled: false, shadows: false, target: new THREE.WebGLRenderTarget(64, 64) },
  })
  useEffect(() => () => director.current.warm.target.dispose(), [])
  useLayoutEffect(() => {
    // Costume wipe uses per-material clipping planes.
    // eslint-disable-next-line react/immutability -- renderer flag, set once for the whole canvas.
    gl.localClippingEnabled = true
  }, [gl])
  useEffect(() => {
    if (!import.meta.env.DEV) return
    // Development only: render and read back one frame (used for automated review screenshots).
    const w = window as unknown as { __finaleCapture?: () => string; __finaleFx?: unknown; __three?: unknown }
    w.__finaleCapture = () => { gl.render(scene, camera); return gl.domElement.toDataURL('image/jpeg', .9) }
    w.__finaleFx = fx
    w.__three = { gl, scene, camera }
    return () => { delete w.__finaleCapture; delete w.__finaleFx; delete w.__three }
  }, [gl, scene, camera, fx])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, .1)
    const c = clock.current, d = director.current
    if (d.prev !== phase) {
      if (phase === 'intro') {
        // eslint-disable-next-line react/immutability -- the finale clock is a shared mutable ref, advanced here every frame.
        c.time = 0; c.completeAt = -1
        // A new fight starts from a neutral sky, even if another one was still fading out.
        Object.assign(mood.current, { pink: 0, dusk: 0, gold: 0, cold: 0 })
        d.entry.pos.copy(camera.position); d.entry.quat.copy(camera.quaternion)
        d.entry.fov = (camera as THREE.PerspectiveCamera).fov
        const p = playerPosition.current
        d.entry.feet.set(p.x, p.y - .9, p.z)
        if (d.entry.feet.distanceTo(tmpV.set(...ICHIGO_MARK)) > 9) d.entry.feet.set(...ICHIGO_MARK)
      } else if (phase === 'complete') c.completeAt = c.time
      else if (phase !== 'idle' && c.time < finalePhaseStart(phase)) c.time = finalePhaseStart(phase)
      d.prev = phase; d.requested = null
    }
    if (c.seek !== undefined) { c.time = c.seek; c.seek = undefined }
    const cinematic = phase !== 'idle' && phase !== 'complete'
    if (phase !== 'idle' && !c.paused) c.time += dt
    if (cinematic && phase !== 'reveal' && c.time >= finalePhaseEnd(phase) && d.requested !== phase) {
      d.requested = phase
      onPhase(phase, finaleNextPhase(phase))
    }
    const t = c.time
    const B = byakuya.current, I = ichigo.current

    // ---- Camera (first, so lens-aware effects below see this frame's camera) ----
    if (cinematic) {
      const cam = camera as THREE.PerspectiveCamera
      evaluateCamera(t, camPose, d.shake, size.width / size.height)
      // Ease in from wherever the gameplay camera was when the encounter began.
      const w = ramp(t, 0, 1.15)
      d.lookObj.position.copy(camPose.pos); d.lookObj.lookAt(camPose.look)
      cam.position.lerpVectors(d.entry.pos, camPose.pos, w)
      cam.quaternion.slerpQuaternions(d.entry.quat, d.lookObj.quaternion, w)
      const fov = d.entry.fov + (camPose.fov - d.entry.fov) * w
      // eslint-disable-next-line react/immutability -- the finale owns the camera while the cinematic plays.
      if (Math.abs(cam.fov - fov) > .01) { cam.fov = fov; cam.updateProjectionMatrix() }
    } else if ((camera as THREE.PerspectiveCamera).fov !== 52 && phase === 'complete') {
      const cam = camera as THREE.PerspectiveCamera
      cam.fov += (52 - cam.fov) * (1 - Math.exp(-3 * dt))
      if (Math.abs(cam.fov - 52) < .05) cam.fov = 52
      cam.updateProjectionMatrix()
    }
    const departure = c.completeAt >= 0 ? (phase === 'complete' ? t - c.completeAt : 99) : -1
    const idle = phase === 'idle' && c.completeAt < 0

    // ---- Byakuya ----
    if (B && byakuyaRoot.current) {
      byakuyaRoot.current.visible = departure < .3
      sampleTrack(cinematic || departure >= 0 ? byakuyaTrack : idleTrack, cinematic || departure >= 0 ? t : 0, sampleB)
      applySample(B.joints, sampleB, B.hipsY)
      B.root.position.copy(sampleB.offset)
      const breath = Math.sin(state.clock.elapsedTime * 1.7) * .012
      B.joints.chest?.rotateX(breath)
      const storm = cinematic ? Math.max(window4(t, 1.6, 2.4, 8.8, 9.6) * .5, window4(t, 13, 14, 21.2, 22.5), impulse(t, T.bankaiBurst, 1.5)) : 0
      const wind = .18 + storm * .6
      for (const name of ['scarfA', 'scarfB']) {
        const tail = B.parts[name]
        for (let k = 0; tail && k < 6; k++) {
          const seg = tail.getObjectByName(`seg${k}`)
          if (seg) seg.rotation.set(wind * (k === 0 ? .9 : .35) + Math.sin(state.clock.elapsedTime * (2.2 + storm * 4) - k * .7 + (name === 'scarfB' ? 1.3 : 0)) * (.08 + wind * .25), 0, Math.sin(state.clock.elapsedTime * 1.3 + k) * .06 * (1 + storm))
        }
      }
      for (const name of ['haoriL', 'haoriR']) {
        const panel = B.parts[name]
        if (panel) panel.rotation.x = .04 + wind * .18 + Math.sin(state.clock.elapsedTime * (2 + storm * 5) + (name === 'haoriR' ? 1.1 : 0)) * (.02 + storm * .08)
      }
      // Shikai: the blade scatters from the tip; it reforms before the Bankai and is released.
      const blade = B.parts.blade, handSword = B.parts.handSword
      const bladeLength = cinematic || departure >= 0 ? Math.max(0, 1 - ramp(t, T.scatter, T.scatter + .85)) + ramp(t, T.reform + .1, T.reform + .75) * (t < T.swordDrop + 1 ? 1 : 0) : 1
      if (blade) { blade.scale.set(1, Math.max(.001, Math.min(1, bladeLength)), 1); blade.visible = bladeLength > .01 }
      if (handSword) handSword.visible = !(cinematic || departure >= 0) || t < T.swordDrop
      if (blade) {
        blade.updateWorldMatrix(true, false)
        ctx.swordBase.setFromMatrixPosition(blade.matrixWorld)
        blade.getWorldQuaternion(tmpQ)
        ctx.swordDir.copy(up).applyQuaternion(tmpQ)
      }
      if (handSword && loose.current) {
        if (t < T.swordDrop) { handSword.updateWorldMatrix(true, false); d.drop.copy(handSword.matrixWorld) }
        const fall = t - T.swordDrop
        loose.current.visible = (cinematic || departure >= 0) && fall >= 0 && fall < 1
        if (loose.current.visible) {
          d.drop.decompose(loose.current.position, loose.current.quaternion, tmpV)
          // Gravity to the ground, then it sinks through the surface like water.
          loose.current.position.y -= Math.min(4.9 * fall * fall, .75) + Math.max(0, fall - .39) * 1.9
        }
      }
    }

    // ---- Ichigo (cinematic stand-in; the player avatar hides while this is shown) ----
    if (I && ichigoRoot.current) {
      ichigoRoot.current.visible = cinematic
      if (cinematic) {
        sampleTrack(ichigoTrack, t, sampleI)
        applySample(I.joints, sampleI, I.hipsY)
        I.root.position.copy(sampleI.offset)
        // Entry: walk from where the player triggered the encounter onto the mark.
        const walk = 1 - ramp(t, ENTRY - .35, ENTRY)
        const e = d.entry.feet, travel = tmpV.set(ICHIGO_MARK[0] - e.x, 0, ICHIGO_MARK[2] - e.z)
        const far = travel.length() > .35
        const k = ramp(t, 0, ENTRY)
        ichigoRoot.current.position.set(e.x + (ICHIGO_MARK[0] - e.x) * k, e.y + (GROUND_Y - e.y) * k, e.z + (ICHIGO_MARK[2] - e.z) * k)
        let yaw = Math.PI
        if (far) {
          const heading = Math.atan2(travel.x, travel.z)
          const diff = Math.atan2(Math.sin(Math.PI - heading), Math.cos(Math.PI - heading))
          yaw = heading + diff * ramp(t, ENTRY * .55, ENTRY)
          applyGait(I.joints, t * 10.5, walk, .15, I.hipsY - sampleI.drop)
        }
        ichigoRoot.current.rotation.y = yaw
        const breath = Math.sin(state.clock.elapsedTime * 1.9) * .015
        I.joints.chest?.rotateX(breath)
        // Costume: white → black, wiping up from the feet during the Bankai.
        I.setForm?.(t < T.wipeStart ? 'shikai' : t > T.wipeEnd ? 'bankai' : GROUND_Y + lin(t, T.wipeStart, T.wipeEnd) * 1.95)
        const gust = impulse(t, T.bankaiBurst, 1.2) + window4(t, 13, 14, 21.2, 22.3) * .35
        for (const name of ['coatL', 'coatR']) {
          const panel = I.parts[name]
          if (panel) { panel.rotation.x = .05 + gust * .55 + Math.sin(state.clock.elapsedTime * (2.4 + gust * 6) + (name === 'coatR' ? 1.4 : 0)) * (.03 + gust * .1); panel.rotation.z = (name === 'coatL' ? 1 : -1) * gust * .12 }
        }
        if (I.parts.chain) I.parts.chain.rotation.z = Math.sin(state.clock.elapsedTime * 3.3) * .35
        if (I.parts.swordCloth) I.parts.swordCloth.rotation.x = Math.sin(state.clock.elapsedTime * 4.1) * .3 + .2
      }
    }

    // ---- Effects ----
    if (marker.current === undefined) marker.current = findFlatMarker(scene, -14, -87, GROUND_Y)
    if (marker.current) marker.current.visible = !cinematic
    ctx.camera.copy(camera.position)
    const fxTime = cinematic || departure >= 0 ? t : -1
    const nearHill = camera.position.distanceToSquared(tmpV.set(...BYAKUYA_MARK)) < 90 * 90
    // eslint-disable-next-line react/immutability -- Three.js scene objects are mutated per frame by design.
    fx.petals.mesh.visible = cinematic || (departure >= 0 && departure < 3) || (idle && nearHill)
    if (cinematic || (departure >= 0 && departure < 3)) {
      fx.petals.update(t, ctx, departure >= 0 ? departure : -1)
    } else if (idle && nearHill) {
      fx.petals.updateIdle(state.clock.elapsedTime)
    }
    fx.blades.update(fxTime)
    const firstLight = fx.first.update(fxTime), finalLight = fx.final.update(fxTime)
    fx.scars.forEach(s => s.update(fxTime))
    fx.rings.update(fxTime); fx.flashes.update(fxTime); fx.shield.update(fxTime)
    const wipe = cinematic && t >= T.wipeStart && t <= T.wipeEnd ? GROUND_Y + lin(t, T.wipeStart, T.wipeEnd) * 1.95 : null
    const aura = fx.aura.update(fxTime, wipe)
    const pixel = size.height * gl.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) / 2))
    fx.sparks.update(fxTime, pixel); fx.dust.update(fxTime, pixel)

    // Shader warm-up: compile every finale material (costumes, effects) while the world loads,
    // then render once off-screen near the hill so shadow variants compile before the fight
    // rather than stalling mid-cinematic.
    const wu = d.warm
    if (!wu.compiled || (!wu.shadows && nearHill)) {
      const hidden: THREE.Object3D[] = []
      scene.traverse(o => { if (!o.visible) { hidden.push(o); o.visible = true } })
      if (!wu.compiled) { gl.compile(scene, camera); wu.compiled = true }
      else { gl.setRenderTarget(wu.target); gl.render(scene, camera); gl.setRenderTarget(null); wu.shadows = true }
      hidden.forEach(o => { o.visible = false })
    }

    // ---- Lights: the shared effect light and rim light, only while this cinematic owns them ----
    if (cinematic || (departure >= 0 && departure < 3)) {
      const L = lights.fx
      // eslint-disable-next-line react/immutability -- the shared cinematic lights are owned by whichever cinematic is playing.
      if (finalLight > 0) { L.color.copy(crimson); L.intensity = 60 * finalLight; L.position.set(ICHIGO_MARK[0], GROUND_Y + 1.5, finalWaveZ(t)) }
      else if (aura > 0) { L.color.copy(crimson); L.intensity = 42 * aura; L.position.set(ICHIGO_MARK[0], GROUND_Y + 1.4, ICHIGO_MARK[2]) }
      else if (firstLight > 0) { L.color.copy(cyan); L.intensity = 32 * firstLight; L.position.set(ICHIGO_MARK[0], GROUND_Y + 1.2, firstWaveZ(t)) }
      else if (cinematic) { L.color.copy(pink); L.intensity = 26 * Math.min(1, fx.petals.energy * 5); L.position.set(BYAKUYA_MARK[0], GROUND_Y + 2, BYAKUYA_MARK[2] + 1.5) }
      else L.intensity = 0
      L.intensity += cinematic ? 90 * impulse(t, T.finalImpact, 5) + 40 * impulse(t, T.firstImpact, 6) : 0
      const presence = cinematic ? ramp(t, 0, .8) : 1 - ramp(departure, 0, 2)
      const dusk = cinematic ? window4(t, 15.8, 16.4, 21.4, 22.6) : 0
      lights.rim.position.set(BYAKUYA_MARK[0] - 6, GROUND_Y + 8, BYAKUYA_MARK[2] - 10)
      lights.rim.target.position.set(-14, GROUND_Y + 1, -86)
      lights.rim.intensity = presence * 1.25
      lights.rim.color.copy(rimCool).lerp(rimWarm, dusk)
    }

    // ---- Environment mood, only while this cinematic owns it (the garden fight tints gold too) ----
    if (cinematic || (departure >= 0 && departure < 4)) {
      const m = mood.current
      const fadeOut = departure >= 0 ? 1 - ramp(departure, 0, 3) : 1
      // eslint-disable-next-line react/immutability -- mood is a shared mutable ref read by Environment each frame.
      m.pink = (window4(t, .6, 2.6, 8.4, 9.6) * .35 + window4(t, 10.4, 12.5, 15.6, 16.6) * .65 + window4(t, 17.6, 19.4, 21.1, 21.9) * .5) * fadeOut
      m.dusk = (window4(t, 15.85, 16.35, 17.8, 19.2) * .8 + window4(t, 19.4, 20.2, 21.3, 22.4) * .65) * fadeOut
      m.gold = ramp(t, 21.4, 23.4) * .7 * fadeOut
    }

  })

  return <>
    <group ref={byakuyaRoot} position={BYAKUYA_MARK}><Byakuya figure={byakuya} /></group>
    <group ref={ichigoRoot} position={ICHIGO_MARK} rotation={[0, Math.PI, 0]} visible={false}><Ichigo figure={ichigo} /></group>
    <LooseKatana object={loose} />
    <primitive object={fx.group} />
  </>
}

export default memo(HillEncounter)

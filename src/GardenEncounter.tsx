// Kuchiki garden encounter director (Soi Fon, with Yoruichi watching from the veranda).
// Same structure as the other cinematics: one clock drives every pose, effect, light, and camera
// move, so skip, replay, and frame rate stay in sync. The catch plays in slow motion by running
// the clock slower (gardenRate), which keeps everything a pure function of time.
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { EncounterPhase } from './encounter-state'
import { Ichigo } from './finale/characters'
import type { Figure } from './finale/figure-kit'
import { addRotation, applyGait, applySample, createSample, sampleTrack } from './finale/rig'
import type { Sample } from './finale/rig'
import { easeOutBack, impulse, lin, ramp, window4 } from './finale/timeline'
import type { FinaleClock, FinaleMood } from './finale/timeline'
import { Flashes, Getsuga, Particles, Rings, Scar } from './finale/effects'
import { createCameraPose, evaluateShots } from './finale/camera'
import { findFlatMarker } from './finale/scene-utils'
import type { CinemaLights } from './finale/scene-utils'
import { SoiFon, Yoruichi } from './garden/characters'
import {
  CARRY_HIPS, CARRY_PITCH, CARRY_YAW, SOI_PIVOT, gardenIchigoFinish, gardenIchigoTrack, ichigoSpinYaw,
  soiFinish, soiFinishPath, soiPath, soiTrack, yoruichiFinish, yoruichiPath, yoruichiTrack,
} from './garden/choreography'
import { createPathSample, samplePath } from './finale/paths'
import type { PathSample } from './finale/paths'
import { CLASH1, CLASH2, CLASH3, HIT_POINT, HomonkaMark, ShunkoAura, Streaks, createGhostMaterial, gardenDebris, gardenDeparture, gardenDust, gardenFlashes, gardenRings, gardenSparks, gardenStreaks } from './garden/effects'
import { gardenShots } from './garden/camera'
import {
  GARDEN_FINISH, GARDEN_GROUND as G, GARDEN_HIT_Z, GD, ICHIGO_GARDEN_END, ICHIGO_GARDEN_MARK, SOI_MARK, YORUICHI_SEAT,
  gardenNextPhase, gardenPhaseEnd, gardenPhaseStart, gardenRate, gardenWaveZ,
} from './garden/timeline'

type Props = {
  phase: EncounterPhase
  clock: RefObject<FinaleClock>
  mood: RefObject<FinaleMood>
  playerPosition: RefObject<THREE.Vector3>
  onPhase: (from: EncounterPhase, to: EncounterPhase) => void
  lights: CinemaLights
  occluders?: React.RefObject<THREE.Object3D>[]
}

const F = GARDEN_FINISH
const ENTRY = 1.3
const GHOSTS = 4
const [IX, , IZ] = ICHIGO_GARDEN_MARK, IZE = ICHIGO_GARDEN_END[2]
const SOI_SCALE = .86
const labelStyle: React.CSSProperties = { pointerEvents: 'none', whiteSpace: 'nowrap', fontSize: 11, color: '#fff6e8', background: '#3a2438cc', padding: '3px 7px', borderRadius: 3 }
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
/** Windows in which Soi Fon leaves afterimages behind her flash steps. */
const trails: [number, number][] = [[GD.flash - .05, GD.back + .3], [GD.dash1 - .05, GD.clash1 + .7], [GD.dash2 - .05, GD.clash2 + .6], [GD.dash3 - .05, GD.clash3 + .8], [GD.dash - .05, GD.hit]]
const inTrail = (t: number) => trails.some(([a, b]) => t >= a && t <= b)

/** Shunkō strength: gathers, erupts, holds through the fight, and bleeds away when she is thrown. */
function shunkoStrength(t: number) {
  if (t < GD.gather) return 0
  if (t < F - 1) return Math.max(ramp(t, GD.gather, GD.burst - .05) * .3, ramp(t, GD.burst - .05, GD.burst + .12)) * (1 + .5 * impulse(t, GD.burst, 3))
  return 1 - ramp(t, GD.fling, GD.catch)
}

function useGardenEffects() {
  const fx = useMemo(() => {
    const group = new THREE.Group()
    group.name = 'garden-effects'
    const aura = new ShunkoAura(), homonka = new HomonkaMark()
    const wave = new Getsuga('first', { release: GD.release, hit: GD.hit, x: IX - .1, y: G + 1.3, z: gardenWaveZ, roll: -.5 })
    const scar = new Scar(false, { release: GD.release, hit: GD.hit, x: IX, ground: G, from: IZE - 1, to: GARDEN_HIT_Z + .3, fade: [.4, 2.6] })
    const rings = new Rings(gardenRings()), flashes = new Flashes(gardenFlashes()), streaks = new Streaks(gardenStreaks())
    const sparks = new Particles(gardenSparks(), true, false, G + .02), dust = new Particles(gardenDust(), false, true, G + .02), debris = new Particles(gardenDebris(), false, false, G + .02)
    const leave = gardenDeparture()
    const leaveSparks = new Particles(leave.sparks, true, false, G + .02), leaveDust = new Particles(leave.dust, false, true, G + .02), leaveFlashes = new Flashes(leave.flashes)
    group.add(wave.group, scar.mesh, rings.group, flashes.group, streaks.group, dust.points, debris.points, sparks.points, leaveSparks.points, leaveDust.points, leaveFlashes.group)
    const ghostMats = Array.from({ length: GHOSTS }, () => createGhostMaterial('#cfefff'))
    return { group, aura, homonka, wave, scar, rings, flashes, streaks, sparks, dust, debris, leaveSparks, leaveDust, leaveFlashes, ghostMats }
  }, [])
  useEffect(() => () => {
    fx.aura.dispose(); fx.homonka.dispose(); fx.wave.dispose(); fx.scar.dispose(); fx.rings.dispose(); fx.flashes.dispose(); fx.streaks.dispose()
    fx.sparks.dispose(); fx.dust.dispose(); fx.debris.dispose(); fx.leaveSparks.dispose(); fx.leaveDust.dispose(); fx.leaveFlashes.dispose()
    fx.ghostMats.forEach(m => m.dispose())
  }, [fx])
  return fx
}

const tmpV = new THREE.Vector3(), tmpW = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), euler = new THREE.Euler(0, 0, 0, 'YXZ')
const qFree = new THREE.Quaternion(), qCarry = new THREE.Quaternion(), qLocal = new THREE.Quaternion().setFromEuler(new THREE.Euler(CARRY_PITCH, CARRY_YAW, 0, 'YXZ'))
const posFree = new THREE.Vector3(), posCarry = new THREE.Vector3(), up = new THREE.Vector3()
const gold = new THREE.Color('#ffcf5a'), black = new THREE.Color('#000000'), windColor = new THREE.Color('#cdf3ff'), rimWarm = new THREE.Color('#ffe6c8')
const ghostGold = new THREE.Color('#fff0cc'), ghostWind = new THREE.Color('#eef6ff')

/**
 * Chains (braids, ponytail, sash tails) hang with gravity, tilted back off the body by `tilt`,
 * and sway; segments are cached per part.
 */
const chainCache = new WeakMap<THREE.Object3D, THREE.Object3D[]>()
const chainEuler = new THREE.Euler(0, 0, 0, 'YXZ'), yawQ = new THREE.Quaternion()
function hang(part: THREE.Object3D | undefined, time: number, phase: number, amp: number, tilt: number) {
  if (!part?.parent) return
  let segs = chainCache.get(part)
  if (!segs) { segs = []; part.traverse(o => { if (/^seg\d+$/.test(o.name)) segs!.push(o) }); chainCache.set(part, segs) }
  part.parent.getWorldQuaternion(tmpQ)
  chainEuler.setFromQuaternion(tmpQ, 'YXZ')
  yawQ.setFromAxisAngle(up.set(0, 1, 0), chainEuler.y)
  yawQ.multiply(tmpQ2.setFromEuler(euler.set(tilt + Math.sin(time * 2.3 + phase) * amp, 0, Math.sin(time * 1.7 + phase) * amp * .8)))
  part.quaternion.copy(tmpQ.invert()).multiply(yawQ)
  for (const s of segs) {
    const k = Number(s.name.slice(3))
    s.rotation.set(Math.sin(time * 3.1 - k * .7 + phase) * amp * .5, 0, Math.sin(time * 2.6 - k * .9 + phase) * amp * .4)
  }
}

/** Places a figure's outer group from a path sample, pivoting pitch about the hips. */
function placeFree(root: THREE.Object3D, s: PathSample, pivot: number) {
  euler.set(s.pitch, s.yaw, 0, 'YXZ')
  root.quaternion.setFromEuler(euler)
  up.set(0, pivot, 0).applyQuaternion(root.quaternion)
  root.position.copy(s.pos).add(tmpV.set(0, pivot, 0)).sub(up)
}

/** Poses Soi Fon (or one of her afterimages) at time t from her paths and tracks. */
function poseSoi(fig: Figure, root: THREE.Object3D, t: number, live: boolean, path: PathSample, sample: Sample) {
  const late = t >= F - 1
  if (live) samplePath(late ? soiFinishPath : soiPath, t, path)
  else { path.pos.set(...SOI_MARK); path.yaw = 0; path.pitch = 0; path.visible = true }
  placeFree(root, path, SOI_PIVOT)
  sampleTrack(late ? soiFinish : soiTrack, live ? t : 0, sample)
  applySample(fig.joints, sample, fig.hipsY)
  fig.root.position.copy(sample.offset)
  const p = fig.parts
  const drawn = live && t >= GD.draw + .12, shikai = live ? lin(t, GD.shikai, GD.shikai + .3) : 0
  if (p.sheathedHilt) p.sheathedHilt.visible = !drawn
  if (p.handBlade) { p.handBlade.visible = drawn && shikai < 1; p.handBlade.scale.setScalar(Math.max(.001, 1 - shikai)) }
  if (p.stinger) { const s = live ? easeOutBack(lin(t, GD.shikai + .1, GD.stinger)) : 0; p.stinger.visible = s > .01; p.stinger.scale.setScalar(Math.max(.001, s)) }
  return path.visible
}

function GardenEncounter({ phase, clock, mood, playerPosition, onPhase, lights, occluders }: Props) {
  const { gl, camera, size, scene } = useThree()
  const marker = useRef<THREE.Object3D | null | undefined>(undefined)
  const fx = useGardenEffects()
  const soi = useRef<Figure | null>(null), yoru = useRef<Figure | null>(null), ichigo = useRef<Figure | null>(null)
  const soiRoot = useRef<THREE.Group>(null), yoruRoot = useRef<THREE.Group>(null), ichigoRoot = useRef<THREE.Group>(null)
  const ghosts = useRef<(Figure | null)[]>([])
  const ghostRoots = useRef<(THREE.Group | null)[]>([])
  const ghostRefs = useMemo(() => Array.from({ length: GHOSTS }, (_, k) => (f: Figure | null) => { ghosts.current[k] = f }), [])
  const sample = useMemo(() => createSample(), [])
  const pathSample = useMemo(() => createPathSample(), [])
  const echo = useMemo(() => createPathSample(), [])
  const camPose = useMemo(() => createCameraPose(), [])
  const director = useRef({
    prev: 'idle' as EncounterPhase, requested: null as EncounterPhase | null, warmed: false,
    entry: { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 52, feet: new THREE.Vector3(...ICHIGO_GARDEN_MARK) },
    lookObj: new THREE.PerspectiveCamera(), shake: reducedMotion() ? 0 : 1, warmTarget: new THREE.WebGLRenderTarget(64, 64),
    soiChest: new THREE.Vector3(),
  })
  useEffect(() => () => director.current.warmTarget.dispose(), [])
  useLayoutEffect(() => {
    // eslint-disable-next-line react/immutability -- renderer flag; Ichigo's figure uses clipping planes.
    gl.localClippingEnabled = true
  }, [gl])
  useLayoutEffect(() => {
    // The aura rides on Soi Fon's chest; the butterfly mark on Ichigo's back.
    soi.current?.joints.chest?.add(fx.aura.group)
    ichigo.current?.parts.mark?.add(fx.homonka.group)
    return () => { fx.aura.group.removeFromParent(); fx.homonka.group.removeFromParent() }
  }, [fx])
  const cinematic = phase !== 'idle' && phase !== 'complete'
  // Yoruichi leaves with Soi Fon once the fight is won; keep their name labels hidden after that.
  const [departed, setDeparted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- mirrors the encounter phase for the labels.
    if (phase === 'complete') setDeparted(true); else if (phase === 'intro') setDeparted(false)
  }, [phase])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, .1)
    const c = clock.current, d = director.current
    const m = mood.current
    if (d.prev !== phase) {
      if (phase === 'intro') {
        // eslint-disable-next-line react/immutability -- the garden clock is a shared mutable ref advanced here.
        c.time = 0; c.completeAt = -1
        // A new fight starts from a neutral sky, even if another one was still fading out.
        Object.assign(m, { pink: 0, dusk: 0, gold: 0, cold: 0 })
        d.entry.pos.copy(camera.position); d.entry.quat.copy(camera.quaternion)
        d.entry.fov = (camera as THREE.PerspectiveCamera).fov
        const p = playerPosition.current
        d.entry.feet.set(p.x, p.y - .9, p.z)
        // Arriving from the veranda side would walk through Soi Fon; start on the mark instead.
        if (d.entry.feet.distanceTo(tmpV.set(...ICHIGO_GARDEN_MARK)) > 8 || d.entry.feet.z < -31.5) d.entry.feet.set(...ICHIGO_GARDEN_MARK)
      } else if (phase === 'complete') c.completeAt = c.time
      else if (phase === 'finish') c.time = F
      else if (phase !== 'idle' && c.time < gardenPhaseStart(phase)) c.time = gardenPhaseStart(phase)
      d.prev = phase; d.requested = null
    }
    if (c.seek !== undefined) { c.time = c.seek; c.seek = undefined }
    const active = phase !== 'idle' && phase !== 'complete'
    if (phase !== 'idle' && !c.paused) c.time += dt * (phase === 'complete' ? 1 : gardenRate(c.time))
    // The reveal waits for the visitor; keep its clock bounded so it never runs into the finish.
    if (phase === 'reveal') c.time = Math.min(c.time, F - 5)
    if (active && phase !== 'reveal' && c.time >= gardenPhaseEnd(phase) && d.requested !== phase) {
      d.requested = phase
      onPhase(phase, gardenNextPhase(phase))
    }
    const t = c.time
    const finishing = t >= F - 1
    const departure = c.completeAt >= 0 ? (phase === 'complete' ? t - c.completeAt : 99) : -1
    const live = active || departure >= 0
    const tt = live ? t : 0
    const time = state.clock.elapsedTime

    // ---- Camera ----
    if (active) {
      const cam = camera as THREE.PerspectiveCamera
      evaluateShots(gardenShots, t, camPose, d.shake, size.width / size.height)
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

    // ---- World effects ----
    if (marker.current === undefined) marker.current = findFlatMarker(scene, -22, -32, G, [7, 10])
    if (marker.current) marker.current.visible = !active
    const fxTime = live ? t : -1
    const waveLight = fx.wave.update(fxTime)
    fx.scar.update(fxTime); fx.rings.update(fxTime); fx.flashes.update(fxTime); fx.streaks.update(fxTime)
    const pixel = size.height * gl.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) / 2))
    fx.sparks.update(fxTime, pixel); fx.dust.update(fxTime, pixel); fx.debris.update(fxTime, pixel)
    const leaving = departure >= 0 && departure < 5 ? departure : -1
    fx.leaveSparks.update(leaving, pixel); fx.leaveDust.update(leaving, pixel); fx.leaveFlashes.update(departure >= 0 ? departure : -1)

    // ---- Yoruichi (posed first: Soi Fon rides in her arms after the catch) ----
    const Y = yoru.current, yRoot = yoruRoot.current
    if (Y && yRoot) {
      samplePath(yoruichiPath, tt, pathSample)
      yRoot.visible = pathSample.visible && departure < .12
      placeFree(yRoot, pathSample, .8)
      sampleTrack(finishing ? yoruichiFinish : yoruichiTrack, tt, sample)
      applySample(Y.joints, sample, Y.hipsY)
      Y.root.position.copy(sample.offset)
      Y.joints.chest?.rotateX(Math.sin(time * 1.4 + 2) * .012)
      // While seated she watches Soi Fon (or the visitor, before the fight).
      if (!finishing || tt < GD.leap) {
        const S = soi.current
        if (active && S) S.joints.hips?.getWorldPosition(tmpW); else tmpW.copy(playerPosition.current)
        tmpV.copy(tmpW).sub(yRoot.position)
        const near = active || tmpV.lengthSq() < 144
        const yaw = near ? THREE.MathUtils.clamp(Math.atan2(Math.sin(Math.atan2(tmpV.x, tmpV.z) - pathSample.yaw), Math.cos(Math.atan2(tmpV.x, tmpV.z) - pathSample.yaw)), -1, 1) : 0
        const pitch = near ? THREE.MathUtils.clamp(-Math.atan2(tmpV.y - .6, Math.hypot(tmpV.x, tmpV.z)), -.5, .4) : 0
        addRotation(Y.joints, 'neck', pitch * .5, yaw * .55, 0)
        addRotation(Y.joints, 'head', pitch * .4, yaw * .4, 0)
      }
      hang(Y.parts.pony, time, 0, .06 + (finishing && tt > GD.appear && tt < GD.touchdown + .3 ? .2 : 0), .22)
      hang(Y.parts.sash, time, 1.3, .08, .12)
    }

    // ---- Soi Fon ----
    const S = soi.current, sRoot = soiRoot.current
    let soiVisible = false
    const aura = live ? shunkoStrength(tt) : 0
    if (S && sRoot) {
      soiVisible = poseSoi(S, sRoot, tt, live, pathSample, sample) && departure < .12
      // After the catch she rides in Yoruichi's arms.
      if (finishing && tt >= GD.catch - .03 && Y && Y.joints.chest) {
        posFree.copy(sRoot.position); qFree.copy(sRoot.quaternion)
        Y.root.updateWorldMatrix(true, true)
        Y.joints.chest.getWorldQuaternion(qCarry).multiply(qLocal)
        posCarry.set(...CARRY_HIPS).applyMatrix4(Y.joints.chest.matrixWorld)
        posCarry.sub(up.set(0, (S.hipsY - sample.drop) * SOI_SCALE, 0).applyQuaternion(qCarry))
        const w = ramp(tt, GD.catch - .03, GD.catch + .2)
        sRoot.position.lerpVectors(posFree, posCarry, w)
        sRoot.quaternion.slerpQuaternions(qFree, qCarry, w)
        soiVisible = departure < .12
      }
      sRoot.visible = soiVisible
      S.joints.chest?.rotateX(Math.sin(time * 1.9 + 1) * .012)
      const torn = live && tt >= GD.burst
      const haori = S.root.userData.haori as THREE.Material | undefined
      if (haori) haori.visible = !torn
      const bladeMesh = S.parts.blade?.children[0] as THREE.Mesh | undefined
      const glow = live ? window4(tt, GD.call, GD.shikai, GD.shikai + .1, GD.stinger + .2) : 0
      if (bladeMesh) (bladeMesh.material as THREE.MeshStandardMaterial).emissive?.lerpColors(black, gold, glow * .6)
      const flying = finishing && tt > GD.fling && tt < GD.catch + .4
      hang(S.parts.braidL, time, 0, flying ? .25 : .06 + aura * .08, .3)
      hang(S.parts.braidR, time, 2, flying ? .25 : .06 + aura * .08, .3)
      hang(S.parts.sash, time, 1, .08 + aura * .12, .12)
      S.joints.chest?.getWorldPosition(d.soiChest)
    }
    fx.aura.update(t, soiVisible ? aura : 0, pixel)

    // ---- Afterimages: Soi Fon's recent past, left behind by each flash step ----
    for (let k = 0; k < GHOSTS; k++) {
      const g = ghosts.current[k], gRoot = ghostRoots.current[k]
      if (!g || !gRoot) continue
      const te = tt - (k + 1) * .07
      let show = active && inTrail(te) && inTrail(tt)
      if (show) {
        show = poseSoi(g, gRoot, te, true, echo, sample)
        // Only where she no longer is.
        if (show && soiVisible && gRoot.position.distanceToSquared(sRoot!.position) < .16) show = false
      }
      gRoot.visible = show
      if (!show) continue
      if (g.parts.haoriL) g.parts.haoriL.visible = te < GD.burst
      if (g.parts.haoriR) g.parts.haoriR.visible = te < GD.burst
      const mat = fx.ghostMats[k]
      // eslint-disable-next-line react/immutability -- effect materials are owned by this director and animated per frame.
      mat.uniforms.uAlpha.value = (1 - k / GHOSTS) * .5
      ;(mat.uniforms.uColor.value as THREE.Color).copy(te > GD.burst ? ghostWind : ghostGold)
    }

    // ---- Ichigo (cinematic stand-in; the player avatar steps aside meanwhile) ----
    const I = ichigo.current, iRoot = ichigoRoot.current
    if (I && iRoot) {
      iRoot.visible = active
      if (active) {
        sampleTrack(finishing ? gardenIchigoFinish : gardenIchigoTrack, t, sample)
        applySample(I.joints, sample, I.hipsY)
        I.root.position.copy(sample.offset)
        I.setForm?.('shikai')
        const e = d.entry.feet, k = ramp(t, 0, ENTRY)
        let x = e.x + (IX - e.x) * k, z = e.z + (IZ - e.z) * k
        const y = e.y + (G - e.y) * k
        if (finishing) { x = IX; z = IZE }
        else z += (IZE - IZ) * ramp(t, GD.clash1, GD.clash1 + .2)
        iRoot.position.set(x, y, z)
        let yaw = finishing ? Math.PI : ichigoSpinYaw(t)
        const tx = IX - e.x, tz = IZ - e.z
        if (!finishing && t < ENTRY + .1 && Math.hypot(tx, tz) > .35) {
          const heading = Math.atan2(tx, tz)
          const diff = Math.atan2(Math.sin(Math.PI - heading), Math.cos(Math.PI - heading))
          yaw = heading + diff * ramp(t, ENTRY * .55, ENTRY)
          applyGait(I.joints, t * 10.5, 1 - ramp(t, ENTRY - .35, ENTRY), .1, I.hipsY - sample.drop)
        }
        iRoot.rotation.y = yaw
        // He tracks her afterimages, and later watches her thrown and caught.
        const watch = !finishing ? window4(t, GD.flash, GD.flash + .1, GD.sting - .05, GD.sting) : ramp(t, GD.fling, GD.fling + .3)
        if (watch > 0 && S) {
          tmpV.copy(d.soiChest).sub(iRoot.position)
          const rel = Math.atan2(tmpV.x, tmpV.z) - yaw
          const ly = THREE.MathUtils.clamp(Math.atan2(Math.sin(rel), Math.cos(rel)), -1.2, 1.2) * watch
          const lp = THREE.MathUtils.clamp(-Math.atan2(tmpV.y - 1.4, Math.hypot(tmpV.x, tmpV.z)), -.6, .4) * watch
          addRotation(I.joints, 'neck', lp * .5, ly * .55, 0)
          addRotation(I.joints, 'head', lp * .4, ly * .4, 0)
        }
        I.joints.chest?.rotateX(Math.sin(time * 1.9) * .015)
        if (I.parts.swordCloth) I.parts.swordCloth.rotation.x = Math.sin(time * 4.1) * .3 + .2
      }
    }
    // The butterfly mark stays through the fight; it flares when she comes for the second sting.
    fx.homonka.update(active ? t : -1, GD.sting + .02, finishing ? window4(t, GD.crouch, GD.dash, GD.lunge, GD.hit + .2) : 0)

    // ---- Shared lights, only while this cinematic owns them ----
    if (active || (departure >= 0 && departure < 3)) {
      const L = lights.fx
      const clash = active ? impulse(t, GD.clash1, 6) + impulse(t, GD.clash2, 6) + impulse(t, GD.clash3, 5) * 1.3 : 0
      // eslint-disable-next-line react/immutability -- the shared cinematic lights are owned by whichever cinematic is playing.
      if (waveLight > 0) { L.color.set('#8fe6ff'); L.intensity = 30 * waveLight; L.position.set(IX, G + 1.2, gardenWaveZ(t)) }
      else if (clash > .05) { L.color.set('#fff1d0'); L.intensity = 40 * Math.min(1, clash); L.position.copy(t > GD.dash3 ? tmpW.set(...CLASH3) : t > GD.dash2 ? tmpW.set(...CLASH2) : tmpW.set(...CLASH1)) }
      else if (aura > .05 && soiVisible) { L.color.copy(windColor); L.intensity = 12 * aura; L.position.copy(d.soiChest) }
      else if (active && t > GD.call && t < GD.stinger + .4) { L.color.copy(gold); L.intensity = 5 * window4(t, GD.call, GD.shikai, GD.shikai + .2, GD.stinger + .4); L.position.copy(d.soiChest).z += .9 }
      else L.intensity = 0
      L.intensity += active ? 50 * impulse(t, GD.burst, 4) + 55 * impulse(t, GD.hit, 5) + 20 * impulse(t, GD.sting, 6) : 0
      if (active && t >= GD.hit && t < GD.hit + .6) L.position.set(...HIT_POINT)
      lights.rim.position.set(-27, G + 6.5, -41)
      lights.rim.target.position.set(-22, G + 1.2, -31)
      lights.rim.intensity = (active ? ramp(t, 0, .8) : 1 - ramp(departure, 0, 2)) * .9
      lights.rim.color.copy(rimWarm)
    }

    // ---- Mood: a warm late-afternoon light over the garden ----
    if (active || (departure >= 0 && departure < 3)) {
      // eslint-disable-next-line react/immutability -- mood is a shared mutable ref read by Environment.
      m.gold = (active ? ramp(t, 0, 1.5) : 1 - ramp(departure, 0, 2.5)) * .35
    }

    // Shader warm-up once, as the visitor nears the garden: render off-screen with everything shown.
    if (!d.warmed && playerPosition.current.distanceToSquared(tmpV.set(-22, 1, -32)) < 40 * 40) {
      const hidden: THREE.Object3D[] = []
      scene.traverse(o => { if (!o.visible) { hidden.push(o); o.visible = true } })
      gl.setRenderTarget(d.warmTarget); gl.render(scene, camera); gl.setRenderTarget(null)
      hidden.forEach(o => { o.visible = false })
      d.warmed = true
    }
  })

  return <>
    <group ref={yoruRoot} position={YORUICHI_SEAT}>
      <Yoruichi figure={yoru} />
      {!cinematic && !departed && <Html position={[0, 1.55, 0]} center distanceFactor={10} occlude={occluders ?? true} zIndexRange={[8, 0]} style={labelStyle}>Yoruichi Shihōin</Html>}
    </group>
    <group ref={soiRoot} position={SOI_MARK}>
      <SoiFon figure={soi} />
      {!cinematic && !departed && <Html position={[0, 1.75, 0]} center distanceFactor={10} occlude={occluders ?? true} zIndexRange={[8, 0]} style={labelStyle}>Soi Fon</Html>}
    </group>
    {fx.ghostMats.map((mat, k) => <group key={k} ref={o => { ghostRoots.current[k] = o }} visible={false}>
      <SoiFon ghost={mat} figure={ghostRefs[k]} />
    </group>)}
    <group ref={ichigoRoot} position={ICHIGO_GARDEN_MARK} rotation={[0, Math.PI, 0]} visible={false}><Ichigo figure={ichigo} /></group>
    <primitive object={fx.group} />
  </>
}

export default memo(GardenEncounter)

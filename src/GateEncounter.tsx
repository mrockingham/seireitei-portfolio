// Spirit Gate encounter director (Rukia and Renji). Mirrors the finale: one clock drives
// every pose, effect, light, and camera move, so skip, replay, and frame rate stay in sync.
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { EncounterPhase } from './encounter-state'
import { Ichigo } from './finale/characters'
import type { Figure } from './finale/figure-kit'
import { addRotation, applyGait, applySample, createSample, sampleTrack } from './finale/rig'
import { easeOutCubic, impulse, lin, ramp, window4 } from './finale/timeline'
import type { FinaleClock, FinaleMood } from './finale/timeline'
import { Flashes, Getsuga, Particles, Rings, Scar } from './finale/effects'
import { createCameraPose, evaluateShots } from './finale/camera'
import { getEnvMap } from './finale/materials'
import { findFlatMarker } from './finale/scene-utils'
import type { CinemaLights } from './finale/scene-utils'
import { Renji, Rukia } from './gate/characters'
import { gateIchigoFinish, gateIchigoTrack, renjiFinish, renjiTrack, rukiaFinish, rukiaTrack } from './gate/choreography'
import { GATE_FINISH, GATE_GROUND as G, GT, ICHIGO_GATE_END, ICHIGO_GATE_MARK, RENJI_MARK, RUKIA_MARK, gateNextPhase, gatePhaseEnd, gatePhaseStart, gateWaveZ } from './gate/timeline'
import { LASH_TARGET, SWEEP_TARGET, Tsukishiro, ZABIMARU_SEGMENTS, ZabimaruBlade, departureFlashes, departureSparks, gateDust, gateFlashes, gateRings, gateSparks, layoutZabimaru } from './gate/effects'
import { gateShots } from './gate/camera'

type Props = {
  phase: EncounterPhase
  clock: RefObject<FinaleClock>
  mood: RefObject<FinaleMood>
  playerPosition: RefObject<THREE.Vector3>
  onPhase: (from: EncounterPhase, to: EncounterPhase) => void
  lights: CinemaLights
}

const ENTRY = 1.3
const [IX, , IZ] = ICHIGO_GATE_MARK, IZE = ICHIGO_GATE_END[2]
const faceIchigo = (x: number, z: number) => Math.atan2(IX - x, IZE - z)
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function useGateEffects() {
  const { gl } = useThree()
  const fx = useMemo(() => {
    const env = getEnvMap(gl)
    const group = new THREE.Group()
    group.name = 'spirit-gate-effects'
    const ice = new Tsukishiro(env), zabimaru = new ZabimaruBlade(env)
    const wave = new Getsuga('first', { release: GT.finishRelease, hit: GT.finishHit, x: IX - .1, y: G + 1.3, z: gateWaveZ, roll: -.5 })
    const scar = new Scar(false, { release: GT.finishRelease, hit: GT.finishHit, x: IX, ground: G, from: IZE - 1, to: RUKIA_MARK[2] + 1.2, fade: [.4, 2.6] })
    const rings = new Rings(gateRings()), flashes = new Flashes(gateFlashes())
    const sparks = new Particles(gateSparks(), true, false, G + .02), dust = new Particles(gateDust(), false, true, G + .02)
    const leaveSparks = new Particles(departureSparks(), true, false, G + .02), leaveFlashes = new Flashes(departureFlashes())
    group.add(ice.group, zabimaru.group, wave.group, scar.mesh, rings.group, flashes.group, dust.points, sparks.points, leaveSparks.points, leaveFlashes.group)
    return { group, ice, zabimaru, wave, scar, rings, flashes, sparks, dust, leaveSparks, leaveFlashes, points: Array.from({ length: ZABIMARU_SEGMENTS }, () => new THREE.Vector3()) }
  }, [gl])
  useEffect(() => () => {
    fx.ice.dispose(); fx.zabimaru.dispose(); fx.wave.dispose(); fx.scar.dispose(); fx.rings.dispose(); fx.flashes.dispose()
    fx.sparks.dispose(); fx.dust.dispose(); fx.leaveSparks.dispose(); fx.leaveFlashes.dispose()
  }, [fx])
  return fx
}

const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), yAxis = new THREE.Vector3(0, 1, 0), xAxis = new THREE.Vector3(1, 0, 0)
const steel = new THREE.Color('#dfe6ea'), snow = new THREE.Color('#ffffff'), black = new THREE.Color('#000000'), frostGlow = new THREE.Color('#7fd8ff')
const iceLight = new THREE.Color('#bfeeff'), ember = new THREE.Color('#ffb070'), rimCool = new THREE.Color('#e4efff')

function GateEncounter({ phase, clock, mood, playerPosition, onPhase, lights }: Props) {
  const { gl, camera, size, scene } = useThree()
  const fx = useGateEffects()
  const rukia = useRef<Figure | null>(null), renji = useRef<Figure | null>(null), ichigo = useRef<Figure | null>(null)
  const rukiaRoot = useRef<THREE.Group>(null), renjiRoot = useRef<THREE.Group>(null), ichigoRoot = useRef<THREE.Group>(null)
  const sample = useMemo(() => createSample(), [])
  const camPose = useMemo(() => createCameraPose(), [])
  const marker = useRef<THREE.Object3D | null | undefined>(undefined)
  const director = useRef({
    prev: 'idle' as EncounterPhase, requested: null as EncounterPhase | null, warmed: false,
    entry: { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 52, feet: new THREE.Vector3(...ICHIGO_GATE_MARK) },
    lookObj: new THREE.PerspectiveCamera(), bladeDir: new THREE.Vector3(), side: new THREE.Vector3(), shake: reducedMotion() ? 0 : 1,
    warmTarget: new THREE.WebGLRenderTarget(64, 64),
  })
  useEffect(() => () => director.current.warmTarget.dispose(), [])
  useLayoutEffect(() => {
    // eslint-disable-next-line react/immutability -- renderer flag; Ichigo's figure uses clipping planes.
    gl.localClippingEnabled = true
  }, [gl])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, .1)
    const c = clock.current, d = director.current
    if (d.prev !== phase) {
      if (phase === 'intro') {
        // eslint-disable-next-line react/immutability -- the gate clock is a shared mutable ref advanced here.
        c.time = 0; c.completeAt = -1
        // A new fight starts from a neutral sky, even if another one was still fading out.
        Object.assign(mood.current, { pink: 0, dusk: 0, gold: 0, cold: 0 })
        d.entry.pos.copy(camera.position); d.entry.quat.copy(camera.quaternion)
        d.entry.fov = (camera as THREE.PerspectiveCamera).fov
        const p = playerPosition.current
        d.entry.feet.set(p.x, p.y - .9, p.z)
        if (d.entry.feet.distanceTo(tmpV.set(...ICHIGO_GATE_MARK)) > 8) d.entry.feet.set(...ICHIGO_GATE_MARK)
      } else if (phase === 'complete') c.completeAt = c.time
      else if (phase === 'finish') c.time = GATE_FINISH
      else if (phase !== 'idle' && c.time < gatePhaseStart(phase)) c.time = gatePhaseStart(phase)
      d.prev = phase; d.requested = null
    }
    if (c.seek !== undefined) { c.time = c.seek; c.seek = undefined }
    const cinematic = phase !== 'idle' && phase !== 'complete'
    if (phase !== 'idle' && !c.paused) c.time += dt
    // The reveal waits for the visitor; keep its clock bounded so it never runs into the finish.
    if (phase === 'reveal') c.time = Math.min(c.time, GT.reveal + 30)
    if (cinematic && phase !== 'reveal' && c.time >= gatePhaseEnd(phase) && d.requested !== phase) {
      d.requested = phase
      onPhase(phase, gateNextPhase(phase))
    }
    const t = c.time
    const finishing = t >= GATE_FINISH - 1
    const departure = c.completeAt >= 0 ? (phase === 'complete' ? t - c.completeAt : 99) : -1
    const live = cinematic || departure >= 0
    const tt = live ? t : 0

    // ---- Camera ----
    if (cinematic) {
      const cam = camera as THREE.PerspectiveCamera
      evaluateShots(gateShots, t, camPose, d.shake, size.width / size.height)
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

    // ---- Rukia ----
    const R = rukia.current
    if (R && rukiaRoot.current) {
      rukiaRoot.current.visible = departure < .08
      sampleTrack(finishing ? rukiaFinish : rukiaTrack, tt, sample)
      applySample(R.joints, sample, R.hipsY)
      R.root.position.copy(sample.offset)
      R.joints.chest?.rotateX(Math.sin(state.clock.elapsedTime * 1.8) * .012)
      // "Dance": the blade spins twice around her forearm, turning white as the ribbon unfurls.
      const spin = live && !finishing ? Math.PI * 4 * easeOutCubic(lin(tt, GT.danceStart + .15, GT.danceEnd - .05)) ** 1.2 : 0
      if (spin > 0) addRotation(R.joints, 'wristR', 0, spin, 0)
      const released = live ? (finishing ? 1 : ramp(tt, GT.danceStart + .1, GT.danceStart + .8)) : 0
      const bladeMesh = R.parts.blade?.children[0] as THREE.Mesh | undefined
      if (bladeMesh) {
        const mat = bladeMesh.material as THREE.MeshStandardMaterial
        mat.color.lerpColors(steel, snow, released)
        mat.emissive.lerpColors(black, frostGlow, released * .45)
      }
      if (R.parts.tsubaSealed) R.parts.tsubaSealed.visible = released < .5
      if (R.parts.tsubaRing) R.parts.tsubaRing.visible = released >= .5
      const ribbon = R.parts.ribbon
      if (ribbon) {
        ribbon.scale.setScalar(Math.max(.001, released))
        const whirl = spin > 0 && tt < GT.danceEnd ? 1 : 0
        for (let k = 0; k < 9; k++) {
          const seg = ribbon.getObjectByName(`rib${k}`)
          if (seg) seg.rotation.set(.22 + Math.sin(state.clock.elapsedTime * 3.1 - k * .7) * .16, 0, Math.sin(state.clock.elapsedTime * 4.3 - k * .9) * .2 - whirl * .5)
        }
      }
    }

    // ---- Renji and Zabimaru ----
    const N = renji.current
    if (N && renjiRoot.current) {
      renjiRoot.current.visible = departure < .15
      sampleTrack(finishing ? renjiFinish : renjiTrack, tt, sample)
      applySample(N.joints, sample, N.hipsY)
      N.root.position.copy(sample.offset)
      N.joints.chest?.rotateX(Math.sin(state.clock.elapsedTime * 1.6 + 1) * .012)
      const base = N.parts.bladeBase
      // eslint-disable-next-line react/immutability -- Three.js scene objects are mutated per frame by design.
      fx.zabimaru.group.visible = renjiRoot.current.visible
      if (base && fx.zabimaru.group.visible) {
        base.updateWorldMatrix(true, false)
        tmpV.setFromMatrixPosition(base.matrixWorld)
        base.getWorldQuaternion(tmpQ)
        d.bladeDir.copy(yAxis).applyQuaternion(tmpQ)
        d.side.copy(xAxis).applyQuaternion(tmpQ)
        layoutZabimaru(finishing ? 0 : tt, tmpV, d.bladeDir, fx.points)
        fx.zabimaru.update(fx.points, d.side, live && !finishing ? .4 + ramp(tt, GT.howl - .05, GT.howl + .12) * .6 : finishing ? 1 : .4)
      }
    }

    // ---- Ichigo (cinematic stand-in; the player avatar steps aside meanwhile) ----
    const I = ichigo.current
    if (I && ichigoRoot.current) {
      ichigoRoot.current.visible = cinematic
      if (cinematic) {
        sampleTrack(finishing ? gateIchigoFinish : gateIchigoTrack, t, sample)
        applySample(I.joints, sample, I.hipsY)
        I.root.position.copy(sample.offset)
        I.setForm?.('shikai')
        // World path: walk onto the mark, flash-step back out of Tsukishiro, rock back on blocks.
        const e = d.entry.feet, k = ramp(t, 0, ENTRY)
        let x = e.x + (IX - e.x) * k, z = e.z + (IZ - e.z) * k, y = e.y + (G - e.y) * k
        const hop = lin(t, GT.dodge, GT.dodge + .36)
        if (finishing) { x = IX; z = IZE; y = G }
        else {
          z += (IZE - IZ) * easeOutCubic(hop); y += Math.sin(Math.PI * hop) * .55
          z += .35 * (ramp(t, GT.lashHit, GT.lashHit + .12) - ramp(t, GT.lashHit + .45, GT.lashHit + 1.2))
          z += .22 * (ramp(t, GT.sweepHit, GT.sweepHit + .1) - ramp(t, GT.sweepHit + .45, GT.sweepHit + 1.1))
        }
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
        I.joints.chest?.rotateX(Math.sin(state.clock.elapsedTime * 1.9) * .015)
        if (I.parts.swordCloth) I.parts.swordCloth.rotation.x = Math.sin(state.clock.elapsedTime * 4.1) * .3 + .2
      }
    }

    // ---- Effects ----
    if (marker.current === undefined) marker.current = findFlatMarker(scene, 0, 5, G)
    if (marker.current) marker.current.visible = !cinematic
    const fxTime = live ? t : -1
    const iceStrength = fx.ice.update(finishing ? -1 : fxTime)
    const waveLight = fx.wave.update(fxTime)
    fx.scar.update(fxTime); fx.rings.update(fxTime); fx.flashes.update(fxTime)
    const pixel = size.height * gl.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) / 2))
    fx.sparks.update(fxTime, pixel); fx.dust.update(fxTime, pixel)
    fx.leaveSparks.update(departure >= 0 && departure < 5 ? departure : -1, pixel); fx.leaveFlashes.update(departure >= 0 ? departure : -1)

    // ---- Shared lights, only while this cinematic owns them ----
    if (cinematic || (departure >= 0 && departure < 3)) {
      const L = lights.fx
      const strike = impulse(t, GT.lashHit, 7) + impulse(t, GT.sweepHit, 7) + impulse(t, GT.howl, 5) * .6
      // eslint-disable-next-line react/immutability -- the shared cinematic lights are owned by whichever cinematic is playing.
      if (waveLight > 0) { L.color.set('#8fe6ff'); L.intensity = 30 * waveLight; L.position.set(IX, G + 1.2, gateWaveZ(t)) }
      else if (strike > .02 && !finishing) { L.color.copy(ember); L.intensity = 40 * Math.min(1, strike); L.position.set(LASH_TARGET[0], LASH_TARGET[1], t > GT.sweepRelease ? SWEEP_TARGET[2] : LASH_TARGET[2]) }
      else if (iceStrength > 0) { L.color.copy(iceLight); L.intensity = 30 * Math.min(1, iceStrength); L.position.set(IX, G + 2, IZ) }
      else L.intensity = 0
      L.intensity += cinematic ? 60 * impulse(t, GT.finishHit, 5) + 35 * impulse(t, GT.pillar, 5) : 0
      lights.rim.position.set(-3, G + 6, -4)
      lights.rim.target.position.set(0, G + 1, 5.5)
      lights.rim.intensity = (cinematic ? ramp(t, 0, .8) : 1 - ramp(departure, 0, 2)) * 1.05
      lights.rim.color.copy(rimCool)
    }

    // ---- Mood: a pale frost while Tsukishiro holds the courtyard ----
    // Only while this fight plays or fades out (the barracks fight uses the same tint).
    if (cinematic || (departure >= 0 && departure < 3)) {
      const m = mood.current
      // eslint-disable-next-line react/immutability -- mood is a shared mutable ref read by Environment.
      m.cold = !finishing ? window4(t, GT.danceStart, GT.pillar, GT.shatter + .6, GT.renji + 2.5) * .75 * (departure >= 0 ? 1 - ramp(departure, 0, 2) : 1) : 0
    }

    // Shadow-variant warm-up once, while the gate is still inside the sun's shadow frustum.
    if (!d.warmed) {
      const hidden: THREE.Object3D[] = []
      scene.traverse(o => { if (!o.visible) { hidden.push(o); o.visible = true } })
      gl.setRenderTarget(d.warmTarget); gl.render(scene, camera); gl.setRenderTarget(null)
      hidden.forEach(o => { o.visible = false })
      d.warmed = true
    }
  })

  return <>
    <group ref={rukiaRoot} position={RUKIA_MARK} rotation={[0, faceIchigo(RUKIA_MARK[0], RUKIA_MARK[2]), 0]}><Rukia figure={rukia} /></group>
    <group ref={renjiRoot} position={RENJI_MARK} rotation={[0, faceIchigo(RENJI_MARK[0], RENJI_MARK[2]), 0]}><Renji figure={renji} /></group>
    <group ref={ichigoRoot} position={ICHIGO_GATE_MARK} rotation={[0, Math.PI, 0]} visible={false}><Ichigo figure={ichigo} /></group>
    <primitive object={fx.group} />
  </>
}

export default memo(GateEncounter)

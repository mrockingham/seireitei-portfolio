// Eleventh Division yard director: Kenpachi lounges on a bench with Yachiru on his shoulder,
// watching Ikkaku (Hōzukimaru) and Yumichika spar in a roped ring on a 16-second loop, beside the
// street from the barracks to the Kuchiki compound. Holds still while a fight plays; skipped when far.
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { Figure } from './finale/figure-kit'
import { addRotation, applyGait, applySample, createSample, sampleTrack } from './finale/rig'
import { createPathSample, pathSpeed, placeOnPath, samplePath } from './finale/paths'
import { rigidSkin } from './finale/skin'
import { lookToward } from './finale/look'
import { easeOutCubic, impulse, lin, window4 } from './finale/timeline'
import { Flashes, Particles, Rings } from './finale/effects'
import { Banner } from './life/banner'
import { Ikkaku, Kenpachi, Yachiru, Yumichika } from './stops/eleventh-figures'
import {
  BENCH, BENCH_YAW, EB, ELEVENTH_CENTER, ELEVENTH_GROUND as G, ELEVENTH_LOOP, RING, RING_RADIUS, eleventhDust, eleventhFlashes, eleventhRings, eleventhSparks,
  ikkakuPath, ikkakuTrack, kenpachiTrack, yachiruSeatVector, yachiruTrack, yumichikaPath, yumichikaTrack,
} from './stops/eleventh'

const [RX, , RZ] = RING
const QUIET_TIME = 15.8
const STAKES = 12
const center = new THREE.Vector3(ELEVENTH_CENTER[0], 1, ELEVENTH_CENTER[2])
const ropeSpans = Array.from({ length: STAKES }, (_, k) => {
  const th = (k + .5) * Math.PI * 2 / STAKES, rr = RING_RADIUS * Math.cos(Math.PI / STAKES)
  return { position: [RX + Math.cos(th) * rr, .5, RZ + Math.sin(th) * rr] as [number, number, number], rotation: [0, -th - Math.PI / 2, 0] as [number, number, number], half: RING_RADIUS * Math.sin(Math.PI / STAKES) + .1 }
})
const RACK: [number, number, number] = [22.6, 0, -41.3], BARREL: [number, number, number] = [5.6, 0, -40.7]
/** Development only: window.__eleventh.freeze(seconds) pins the loop for review; freeze() releases it. */
const debug = { t: null as number | null }

function useYard() {
  const yard = useMemo(() => {
    const group = new THREE.Group()
    group.name = 'eleventh-yard'
    const sand = new THREE.MeshStandardMaterial({ color: '#dccca6', roughness: 1 })
    const wood = new THREE.MeshStandardMaterial({ color: '#6e4b30', roughness: .8 })
    const pale = new THREE.MeshStandardMaterial({ color: '#b89a6e', roughness: .75 })
    const rope = new THREE.MeshStandardMaterial({ color: '#cbb071', roughness: .9 })
    const jar = new THREE.MeshStandardMaterial({ color: '#7a4a2b', roughness: .35 })
    const cream = new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: .5 })
    const iron = new THREE.MeshStandardMaterial({ color: '#3b3a3f', roughness: .5, metalness: .4 })
    const geos: THREE.BufferGeometry[] = []
    const add = (g: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], r: [number, number, number] = [0, 0, 0], parent: THREE.Object3D = group, shadow = true) => {
      geos.push(g); const mesh = new THREE.Mesh(g, m); mesh.position.set(...p); mesh.rotation.set(...r); mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh
    }
    add(new THREE.CircleGeometry(RING_RADIUS - .15, 48), sand, [RX, G - .01, RZ], [-Math.PI / 2, 0, 0], group, false)
    const stakeGeo = new THREE.CylinderGeometry(.05, .06, .8, 6); geos.push(stakeGeo)
    const stakes = new THREE.InstancedMesh(stakeGeo, wood, STAKES), m4 = new THREE.Matrix4()
    for (let k = 0; k < STAKES; k++) { const th = k * Math.PI * 2 / STAKES; stakes.setMatrixAt(k, m4.makeTranslation(RX + Math.cos(th) * RING_RADIUS, .4, RZ + Math.sin(th) * RING_RADIUS)) }
    stakes.castShadow = true; group.add(stakes)
    add(new THREE.TorusGeometry(RING_RADIUS, .025, 4, 80), rope, [RX, .62, RZ], [Math.PI / 2, 0, 0], group, false)
    // Kenpachi's bench, with a sake jar and cups.
    const bench = new THREE.Group(); bench.position.set(...BENCH); bench.rotation.y = BENCH_YAW; group.add(bench)
    for (const dx of [-1.0, 1.0]) add(new THREE.BoxGeometry(.3, .42, .42), wood, [dx, .21, 0], [0, 0, 0], bench)
    add(new THREE.BoxGeometry(2.5, .08, .48), pale, [0, .46, 0], [0, 0, 0], bench)
    add(new THREE.CylinderGeometry(.12, .15, .3, 10), jar, [-.85, .65, .05], [0, 0, 0], bench)
    add(new THREE.CylinderGeometry(.05, .07, .08, 8), jar, [-.85, .84, .05], [0, 0, 0], bench)
    for (const dx of [-.55, -.45]) add(new THREE.CylinderGeometry(.035, .03, .045, 8), cream, [dx, .52, .12], [0, 0, 0], bench)
    // Weapon rack of wooden practice swords.
    const rack = new THREE.Group(); rack.position.set(...RACK); group.add(rack)
    for (const dx of [-.8, .8]) add(new THREE.BoxGeometry(.1, 1.3, .1), wood, [dx, .65, 0], [0, 0, 0], rack)
    for (const y of [.45, 1.05]) add(new THREE.BoxGeometry(1.8, .08, .1), wood, [0, y, 0], [0, 0, 0], rack)
    for (let k = 0; k < 5; k++) add(new THREE.BoxGeometry(.05, 1.0, .03), pale, [-.55 + k * .27, .72, .09], [.18, 0, .04 * (k - 2)], rack)
    // Barrel.
    add(new THREE.CylinderGeometry(.34, .34, .8, 12), wood, [BARREL[0], .4, BARREL[2]])
    for (const y of [.15, .65]) add(new THREE.TorusGeometry(.345, .02, 4, 20), iron, [BARREL[0], y, BARREL[2]], [Math.PI / 2, 0, 0])
    const banners = [new Banner({ position: [6.1, 0, -35.2], text: '十一番隊', cloth: '#f2eee3', ink: '#141418', height: 3.2 }), new Banner({ position: [23.6, 0, -35.0], yaw: Math.PI, text: '十一番隊', cloth: '#f2eee3', ink: '#141418', height: 3.2 })]
    banners.forEach(b => group.add(b.group))
    return { group, banners, dispose() { geos.forEach(g => g.dispose()); [sand, wood, pale, rope, jar, cream, iron].forEach(m => m.dispose()); stakes.dispose(); banners.forEach(b => b.dispose()) } }
  }, [])
  useEffect(() => () => yard.dispose(), [yard])
  return yard
}

function useSparFx() {
  const fx = useMemo(() => {
    const group = new THREE.Group()
    group.name = 'eleventh-fx'
    const sparks = new Particles(eleventhSparks(), true, false, G + .02), dust = new Particles(eleventhDust(), false, true, G + .02)
    const rings = new Rings(eleventhRings()), flashes = new Flashes(eleventhFlashes())
    group.add(rings.group, flashes.group, dust.points, sparks.points)
    return { group, sparks, dust, rings, flashes }
  }, [])
  useEffect(() => () => { fx.sparks.dispose(); fx.dust.dispose(); fx.rings.dispose(); fx.flashes.dispose() }, [fx])
  return fx
}

const tmp = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), up = new THREE.Vector3()
const sa = createPathSample(), sb = createPathSample()

function EleventhYard({ quiet, playerPosition }: { quiet: boolean; playerPosition: RefObject<THREE.Vector3> }) {
  const { camera, size, gl } = useThree()
  const stop = useRef<THREE.Group>(null)
  const kenpachi = useRef<Figure | null>(null), yachiru = useRef<Figure | null>(null), ikkaku = useRef<Figure | null>(null), yumichika = useRef<Figure | null>(null)
  const kRoot = useRef<THREE.Group>(null), yaRoot = useRef<THREE.Group>(null), iRoot = useRef<THREE.Group>(null), yuRoot = useRef<THREE.Group>(null)
  const yard = useYard(), fx = useSparFx()
  const sample = useMemo(() => createSample(), [])
  const ps = useMemo(() => [createPathSample(), createPathSample()], [])
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __eleventh?: unknown }
    w.__eleventh = { freeze: (t?: number) => { debug.t = t ?? null } }
    return () => { delete w.__eleventh }
  }, [])
  useLayoutEffect(() => {
    const skins = [kenpachi, yachiru, ikkaku, yumichika].map(f => f.current ? rigidSkin(f.current) : null)
    return () => skins.forEach(s => s?.dispose())
  }, [])

  useFrame(state => {
    const group = stop.current
    if (!group) return
    const far = camera.position.distanceToSquared(center) > 85 * 85
    // eslint-disable-next-line react/immutability -- scene objects are updated per frame by design.
    group.visible = !far
    if (far) return
    const lt = quiet ? QUIET_TIME : debug.t ?? state.clock.elapsedTime % ELEVENTH_LOOP
    const time = state.clock.elapsedTime
    const player = playerPosition.current
    const I = ikkaku.current, Y = yumichika.current, K = kenpachi.current, A = yachiru.current
    // ---- The sparring pair ----
    const pairs: [Figure | null, THREE.Group | null, typeof ikkakuPath, typeof ikkakuTrack, number][] = [[I, iRoot.current, ikkakuPath, ikkakuTrack, 0], [Y, yuRoot.current, yumichikaPath, yumichikaTrack, 1]]
    for (const [f, root, path, track, i] of pairs) {
      if (!f || !root) continue
      const s = samplePath(path, lt, ps[i])
      placeOnPath(root, s, .8)
      sampleTrack(track, lt, sample)
      applySample(f.joints, sample, f.hipsY)
      f.root.position.copy(sample.offset)
      const speed = quiet ? 0 : pathSpeed(path, lt, sa, sb)
      const circling = lt > EB.circle && lt < EB.circleEnd
      if (speed > .3 && (circling || speed < 3)) applyGait(f.joints, lt * 8.5, Math.min(1, speed / 1.6), 0, f.hipsY - sample.drop)
      f.joints.chest?.rotateX(Math.sin(time * 1.9 + i * 2) * .012)
      // The blade lock shudders.
      const lock = window4(lt, EB.lock, EB.lock + .1, EB.lockEnd - .1, EB.lockEnd)
      if (lock > 0) addRotation(f.joints, 'chest', 0, Math.sin(time * 23 + i) * .03 * lock, 0)
    }
    if (I) {
      const sealed = quiet || lt < EB.spear || lt > EB.seal + .1
      if (I.parts.sword) I.parts.sword.visible = sealed
      if (I.parts.sheath) I.parts.sheath.visible = sealed
      if (I.parts.spear) I.parts.spear.visible = !sealed
      const spin = !quiet && lt > .6 && lt < 1.95 ? easeOutCubic(lin(lt, .6, 1.95)) * Math.PI * 2 * 3 : 0
      if (I.parts.spearSpin) I.parts.spearSpin.rotation.x = spin
      // "Split": the spear breaks into three sections on chains and whips around behind Yumichika.
      const split = quiet ? 0 : window4(lt, EB.split, EB.split + .12, EB.reform - .15, EB.reform)
      const u = lt - EB.split
      for (const [name, gap] of [['sec1body', .13], ['sec2body', .13]] as [string, number][]) { const p = I.parts[name]; if (p) p.position.y = gap * split }
      if (I.parts.chain1) I.parts.chain1.visible = split > .05
      if (I.parts.chain2) I.parts.chain2.visible = split > .05
      if (I.parts.sec1) I.parts.sec1.rotation.x = split * (-.9 + .5 * Math.sin(u * 8))
      if (I.parts.sec2) I.parts.sec2.rotation.x = split * (1.5 * Math.sin(u * 6.5) - .4)
    }
    // ---- Kenpachi on his bench, Yachiru on his shoulder ----
    const kr = kRoot.current, yr = yaRoot.current
    if (K && kr) {
      sampleTrack(kenpachiTrack, lt, sample)
      applySample(K.joints, sample, K.hipsY)
      K.joints.chest?.rotateX(Math.sin(time * 1.2) * .015)
      const iPos = iRoot.current?.position, yPos = yuRoot.current?.position
      const nearPlayer = kr.position.distanceToSquared(player) < 49
      const watch = iPos && yPos ? tmp.copy(iPos).add(yPos).multiplyScalar(.5).setY(1.2) : tmp.set(RX, 1.2, RZ)
      const laughing = window4(lt, EB.pose, EB.pose + .2, 7.8, 8.2) + window4(lt, EB.lock, EB.lock + .15, 9.4, 9.9)
      lookToward(K, kr.position, BENCH_YAW, nearPlayer ? player : watch, .8 * (1 - laughing), 1.3)
    }
    if (A && yr && K?.joints.chest) {
      sampleTrack(yachiruTrack, lt, sample)
      applySample(A.joints, sample, A.hipsY)
      const kick = Math.sin(time * 5.5) * .25
      addRotation(A.joints, 'kneeL', kick, 0, 0); addRotation(A.joints, 'kneeR', -kick, 0, 0)
      const chest = K.joints.chest
      chest.updateWorldMatrix(true, false)
      chest.getWorldQuaternion(tmpQ)
      yr.quaternion.copy(tmpQ)
      yr.position.copy(yachiruSeatVector).applyMatrix4(chest.matrixWorld)
      yr.position.sub(up.set(0, (A.hipsY - sample.drop) * .6, 0).applyQuaternion(tmpQ))
      const bounce = impulse(lt, EB.pose + .15, 4) + impulse(lt, EB.lock + .1, 4)
      yr.position.y += Math.abs(Math.sin(time * 9)) * .05 * Math.min(1, bounce * 3)
      lookToward(A, yr.position, BENCH_YAW, yr.position.distanceToSquared(player) < 49 ? player : tmp.set(RX, 1.2, RZ), .8, .5)
    }
    const fxTime = quiet ? -1 : lt
    fx.rings.update(fxTime); fx.flashes.update(fxTime)
    const pixel = size.height * gl.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) / 2))
    fx.sparks.update(fxTime, pixel); fx.dust.update(fxTime, pixel)
    yard.banners.forEach(b => b.update(time))
  })

  return <>
    <group ref={stop} name="stop-eleventh">
      <primitive object={yard.group} />
      <group ref={kRoot} position={BENCH} rotation={[0, BENCH_YAW, 0]}><Kenpachi figure={kenpachi} /></group>
      <group ref={yaRoot}><Yachiru figure={yachiru} /></group>
      <group ref={iRoot}><Ikkaku figure={ikkaku} /></group>
      <group ref={yuRoot}><Yumichika figure={yumichika} /></group>
      <primitive object={fx.group} />
    </group>
    <RigidBody type="fixed" colliders={false}>
      {ropeSpans.map((s, k) => <CuboidCollider key={k} args={[s.half, .5, .1]} position={s.position} rotation={s.rotation} />)}
      <CuboidCollider args={[1.35, .7, .45]} position={[BENCH[0], .7, BENCH[2]]} rotation={[0, BENCH_YAW, 0]} />
      <CuboidCollider args={[.95, .7, .15]} position={[RACK[0], .7, RACK[2]]} />
      <CuboidCollider args={[.36, .45, .36]} position={[BARREL[0], .45, BARREL[2]]} />
    </RigidBody>
  </>
}

export default memo(EleventhYard)

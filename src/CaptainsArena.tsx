// Captains' training arena director: Komamura and Tōsen spar on a 26-second loop in a walled sand
// arena in the open north-west corner, west of Sōkyoku Hill. Tenken's phantom arm, Enma Kōrogi's
// black dome, and Kokujō Tengen Myō'ō bursting out of it (see stops/arena.ts for the beats).
// Holds still (at the opening stand-off) while a fight plays; skipped when the camera is far away.
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { Figure } from './finale/figure-kit'
import { applyGait, applySample, createSample, sampleTrack } from './finale/rig'
import { createPathSample, pathSpeed, placeOnPath, samplePath } from './finale/paths'
import { rigidSkin } from './finale/skin'
import { easeOutCubic, lin, ramp, window4 } from './finale/timeline'
import { cameraAssist } from './camera-assist'
import { Flashes, Particles, Rings } from './finale/effects'
import { Streaks } from './garden/effects'
import { Banner } from './life/banner'
import { KokujoGiant, Komamura, Tosen } from './stops/arena-figures'
import {
  AB, ARENA_CENTER, ARENA_GROUND as G, ARENA_HALF, ARENA_LOOP, GIANT_AT, GIANT_SCALE, GIANT_YAW, KOMAMURA_MARK, SLASH_POINT, TOSEN_MARK, ar,
  arenaDust, arenaFlashes, arenaRings, arenaShards, arenaSparks, arenaStreaks, komamuraPath, komamuraTrack, giantTrack, tosenPath, tosenTrack,
} from './stops/arena'
import { DarkDome, Hoops, TenkenArm } from './stops/arena-fx'

const [AX, , AZ] = ARENA_CENTER
const [HX, HZ] = ARENA_HALF
/** The opening stand-off, held while a fight plays elsewhere. */
const QUIET_TIME = .6
const center = new THREE.Vector3(AX, 1, AZ)
const WALL_H = 1.6, WALL_T = .4
const GATE_W = 3.2
/** Tiered benches outside the north wall. */
const STANDS = [0, 1, 2].map(k => ({ z: AZ - HZ - WALL_T - .6 - k * 1.0, h: .45 + k * .45 }))
const LANTERNS: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [AX + sx * (HX + 1.1), AZ + sz * (HZ + 1.1)])
const RACK: [number, number, number] = [AX - HX + .5, 0, AZ - HZ + 3]
/** Development only: window.__arena.freeze(seconds) pins the loop for review; freeze() releases it. */
const debug = { t: null as number | null }

function useArena() {
  const arena = useMemo(() => {
    const group = new THREE.Group()
    group.name = 'captains-arena'
    const sand = new THREE.MeshStandardMaterial({ color: '#d9c8a1', roughness: 1 })
    const line = new THREE.MeshStandardMaterial({ color: '#f1e9d4', roughness: 1 })
    const plaster = new THREE.MeshStandardMaterial({ color: '#e7e2d6', roughness: .9 })
    const cap = new THREE.MeshStandardMaterial({ color: '#343a41', roughness: .7 })
    const wood = new THREE.MeshStandardMaterial({ color: '#6e4b30', roughness: .8 })
    const pale = new THREE.MeshStandardMaterial({ color: '#b89a6e', roughness: .75 })
    const paper = new THREE.MeshStandardMaterial({ color: '#f3e6c4', emissive: '#f0c070', emissiveIntensity: .35, roughness: .9 })
    const rope = new THREE.MeshStandardMaterial({ color: '#cbb071', roughness: .9 })
    const geos: THREE.BufferGeometry[] = []
    const add = (g: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], r: [number, number, number] = [0, 0, 0], shadow = true) => {
      geos.push(g); const mesh = new THREE.Mesh(g, m); mesh.position.set(...p); mesh.rotation.set(...r); mesh.castShadow = shadow; mesh.receiveShadow = true; group.add(mesh); return mesh
    }
    // Sand floor with painted markings: a large circle and the two starting lines.
    add(new THREE.PlaneGeometry(HX * 2, HZ * 2), sand, [AX, G - .01, AZ], [-Math.PI / 2, 0, 0], false)
    add(new THREE.RingGeometry(5.8, 6.0, 72), line, [AX, G, AZ + 2], [-Math.PI / 2, 0, 0], false)
    for (const m of [KOMAMURA_MARK, TOSEN_MARK]) add(new THREE.PlaneGeometry(.2, 1.4), line, [m[0], G, m[2]], [-Math.PI / 2, 0, 0], false)
    // Walls on three sides: plaster on a dark base with a tiled cap. The south side, where visitors
    // watch from, is a low wooden railing around an open gateway roped off with a shimenawa.
    const wall = (x: number, z: number, lx: number, lz: number) => {
      add(new THREE.BoxGeometry(lx, WALL_H, lz), plaster, [x, WALL_H / 2, z])
      add(new THREE.BoxGeometry(lx + .06, .3, lz + .06), cap, [x, .15, z])
      add(new THREE.BoxGeometry(lx + .3, .14, lz + .3), cap, [x, WALL_H + .07, z])
    }
    const ox = HX + WALL_T / 2, oz = HZ + WALL_T / 2
    wall(AX - ox, AZ, WALL_T, HZ * 2 + WALL_T * 2)
    wall(AX + ox, AZ, WALL_T, HZ * 2 + WALL_T * 2)
    wall(AX, AZ - oz, HX * 2, WALL_T)
    const side = (HX * 2 - GATE_W) / 2
    for (const s of [-1, 1]) {
      const cx = AX + s * (GATE_W / 2 + side / 2)
      for (let k = 0; k <= 4; k++) add(new THREE.BoxGeometry(.16, 1.05, .16), wood, [AX + s * (GATE_W / 2 + .35 + k * (side - .5) / 4), .52, AZ + oz])
      for (const y of [.45, .92]) add(new THREE.BoxGeometry(side - .3, .09, .1), wood, [cx, y, AZ + oz])
      add(new THREE.BoxGeometry(.3, 3.3, .3), wood, [AX + s * (GATE_W / 2 + .1), 1.65, AZ + oz])
    }
    add(new THREE.BoxGeometry(GATE_W + 1.2, .22, .34), wood, [AX, 3.2, AZ + oz])
    add(new THREE.BoxGeometry(GATE_W + .3, .14, .22), wood, [AX, 2.75, AZ + oz])
    // The rope sags across the gateway, hung with paper streamers.
    const sag = new THREE.CatmullRomCurve3([-1, -.5, 0, .5, 1].map(u => new THREE.Vector3(AX + u * GATE_W / 2, 1.25 - .28 * (1 - u * u), AZ + oz)))
    add(new THREE.TubeGeometry(sag, 20, .07, 6), rope, [0, 0, 0], [0, 0, 0], false)
    for (const u of [-.5, 0, .5]) add(new THREE.BoxGeometry(.12, .34, .01), paper, [AX + u * GATE_W / 2, 1.25 - .28 * (1 - u * u) - .22, AZ + oz], [0, 0, .08], false)
    // Stands outside the north wall.
    for (const st of STANDS) add(new THREE.BoxGeometry(HX * 2 - 2, st.h, 1.0), pale, [AX, st.h / 2, st.z])
    // Corner lanterns and a weapon rack.
    for (const [x, z] of LANTERNS) {
      add(new THREE.CylinderGeometry(.08, .1, 3.3, 6), wood, [x, 1.65, z])
      add(new THREE.BoxGeometry(.42, .55, .42), paper, [x, 3.0, z])
      add(new THREE.BoxGeometry(.52, .08, .52), cap, [x, 3.32, z])
    }
    const rack = new THREE.Group(); rack.position.set(...RACK); rack.rotation.y = Math.PI / 2; group.add(rack)
    const racked = (g: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], r: [number, number, number] = [0, 0, 0]) => { const mesh = add(g, m, p, r); rack.add(mesh) }
    for (const dx of [-.8, .8]) racked(new THREE.BoxGeometry(.1, 1.3, .1), wood, [dx, .65, 0])
    for (const y of [.45, 1.05]) racked(new THREE.BoxGeometry(1.8, .08, .1), wood, [0, y, 0])
    for (let k = 0; k < 5; k++) racked(new THREE.BoxGeometry(.05, 1.0, .03), pale, [-.55 + k * .27, .72, .09], [.18, 0, .04 * (k - 2)])
    const banners = [
      new Banner({ position: [AX - GATE_W / 2 - 1.3, 0, AZ + oz + 1.1], text: '七番隊', cloth: '#f2eee3', ink: '#1d2230', height: 3.4 }),
      new Banner({ position: [AX + GATE_W / 2 + 1.3, 0, AZ + oz + 1.1], text: '九番隊', cloth: '#f2eee3', ink: '#1d2230', height: 3.4 }),
    ]
    banners.forEach(b => group.add(b.group))
    return { group, banners, dispose() { geos.forEach(g => g.dispose()); [sand, line, plaster, cap, wood, pale, paper, rope].forEach(m => m.dispose()); banners.forEach(b => b.dispose()) } }
  }, [])
  useEffect(() => () => arena.dispose(), [arena])
  return arena
}

function useArenaFx() {
  const fx = useMemo(() => {
    const group = new THREE.Group()
    group.name = 'arena-fx'
    const tenken = new TenkenArm(), dome = new DarkDome(), hoops = new Hoops(new THREE.Vector3(...ar(2.9, 2.8, 2.45)))
    const rings = new Rings(arenaRings()), flashes = new Flashes(arenaFlashes()), streaks = new Streaks(arenaStreaks())
    const sparks = new Particles(arenaSparks(), true, false, G + .02), dust = new Particles(arenaDust(), false, true, G + .02), shards = new Particles(arenaShards(), false, false, G + .02)
    group.add(tenken.group, dome.mesh, hoops.mesh, rings.group, flashes.group, streaks.group, dust.points, shards.points, sparks.points)
    return { group, tenken, dome, hoops, rings, flashes, streaks, sparks, dust, shards }
  }, [])
  useEffect(() => () => {
    fx.tenken.dispose(); fx.dome.dispose(); fx.hoops.dispose(); fx.rings.dispose(); fx.flashes.dispose(); fx.streaks.dispose(); fx.sparks.dispose(); fx.dust.dispose(); fx.shards.dispose()
  }, [fx])
  return fx
}

const sa = createPathSample(), sb = createPathSample()
const hand = new THREE.Vector3(), aimDir = new THREE.Vector3(), parentQ = new THREE.Quaternion(), aimQ = new THREE.Quaternion(), BLADE_AXIS = new THREE.Vector3(0, 0, 1)
const strike = new THREE.Vector3(SLASH_POINT[0], G + .1, SLASH_POINT[2])

function CaptainsArena({ quiet, playerPosition }: { quiet: boolean; playerPosition: RefObject<THREE.Vector3> }) {
  const { camera, size, gl } = useThree()
  const stop = useRef<THREE.Group>(null)
  const komamura = useRef<Figure | null>(null), tosen = useRef<Figure | null>(null), giant = useRef<Figure | null>(null)
  const kRoot = useRef<THREE.Group>(null), tRoot = useRef<THREE.Group>(null), gRoot = useRef<THREE.Group>(null)
  const arena = useArena(), fx = useArenaFx()
  const sample = useMemo(() => createSample(), [])
  const ps = useMemo(() => [createPathSample(), createPathSample()], [])
  // The giant fades from the helmet down: a clipping plane on every one of its materials.
  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000), [])
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __arena?: unknown }
    w.__arena = { freeze: (t?: number) => { debug.t = t ?? null } }
    return () => { delete w.__arena }
  }, [])
  useLayoutEffect(() => {
    // eslint-disable-next-line react/immutability -- the renderer flag the fights also enable; planes only apply where set.
    gl.localClippingEnabled = true
    const skins = [komamura, tosen, giant].map(f => f.current ? rigidSkin(f.current) : null)
    giant.current?.root.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return
      for (const mat of Array.isArray(o.material) ? o.material : [o.material]) { mat.clippingPlanes = [clip]; mat.clipShadows = true }
    })
    return () => skins.forEach(s => s?.dispose())
  }, [gl, clip])

  useFrame(state => {
    const group = stop.current
    if (!group) return
    // The giant stands 13 m tall, so the arena stays live from further away than the other stops.
    const far = camera.position.distanceToSquared(center) > 110 * 110
    // eslint-disable-next-line react/immutability -- scene objects are updated per frame by design.
    group.visible = !far
    const lt = quiet ? QUIET_TIME : debug.t ?? state.clock.elapsedTime % ARENA_LOOP
    // Someone watching from the gate gets a gentle upward tilt while the dome and the giant are up.
    const watching = !far && !quiet && playerPosition.current.distanceToSquared(center) < 26 * 26
    // eslint-disable-next-line react/immutability -- a shared camera hint, written only here.
    cameraAssist.tilt = watching ? .27 * window4(lt, AB.ringsRise, AB.dome + .6, AB.fadeEnd - .4, AB.fadeEnd + .6) : 0
    if (far) return
    const time = state.clock.elapsedTime
    const K = komamura.current, T = tosen.current, Gi = giant.current
    // ---- The two captains ----
    const fighters: [Figure | null, THREE.Group | null, typeof komamuraPath, typeof komamuraTrack, number][] = [[K, kRoot.current, komamuraPath, komamuraTrack, 0], [T, tRoot.current, tosenPath, tosenTrack, 1]]
    for (const [f, root, path, track, i] of fighters) {
      if (!f || !root) continue
      const s = samplePath(path, lt, ps[i])
      placeOnPath(root, s, .8)
      root.visible = s.visible
      sampleTrack(track, lt, sample)
      applySample(f.joints, sample, f.hipsY)
      f.root.position.copy(sample.offset)
      const speed = quiet ? 0 : pathSpeed(path, lt, sa, sb)
      if (speed > .3 && speed < 3) applyGait(f.joints, lt * 7.5, Math.min(1, speed / 1.4), 0, f.hipsY - sample.drop)
      f.joints.chest?.rotateX(Math.sin(time * 1.7 + i * 2) * .012)
    }
    if (T) {
      // Suzumushi whirls on its ring guard before the rings fly out.
      const spin = quiet ? 0 : ramp(lt, AB.spin - .1, AB.spin + .2) * (1 - ramp(lt, AB.rings + .2, AB.ringsOut))
      if (T.parts.sword) T.parts.sword.rotation.x = spin > 0 ? (lt - AB.spin) * 26 : 0
      if (T.parts.scarfTail) T.parts.scarfTail.rotation.x = .15 + Math.sin(time * 2.6) * .12
    }
    // ---- Kokujō Tengen Myō'ō: grows inside the dome, bursts out, strikes, and fades ----
    const gr = gRoot.current
    if (Gi && gr) {
      const shown = !quiet && lt > AB.giant && lt < AB.fadeEnd
      gr.visible = shown
      if (shown) {
        const grow = easeOutCubic(lin(lt, AB.giant, AB.giantFull))
        gr.scale.setScalar(GIANT_SCALE * (.35 + .65 * grow))
        // It mirrors Komamura a beat behind.
        sampleTrack(giantTrack, Math.max(AB.giant, lt - .12), sample)
        applySample(Gi.joints, sample, Gi.hipsY)
        Gi.root.position.copy(sample.offset)
        Gi.joints.chest?.rotateX(Math.sin(time * 1.1) * .01)
        if (Gi.parts.loops) Gi.parts.loops.rotation.z = Math.sin(time * .9) * .06
        // The slash: the blade is aimed straight at the strike point, so it bites into the ground where Tōsen stood.
        const sword = Gi.parts.sword
        if (sword?.parent) {
          sword.quaternion.identity()
          const aim = ramp(lt, AB.slash - .08, AB.slash + .02) * (1 - ramp(lt, AB.fade - .6, AB.fade))
          if (aim > 0) {
            sword.parent.updateWorldMatrix(true, false)
            sword.getWorldPosition(hand)
            aimQ.setFromUnitVectors(BLADE_AXIS, aimDir.copy(strike).sub(hand).normalize())
            sword.quaternion.slerp(aimQ.premultiply(sword.parent.getWorldQuaternion(parentQ).invert()), aim)
          }
        }
        // eslint-disable-next-line react/immutability -- the giant's clipping plane is owned here.
        clip.constant = lt < AB.fade ? 1000 : G + 14.5 - 15 * lin(lt, AB.fade, AB.fadeEnd - .1)
      }
    }
    // ---- Effects ----
    const fxTime = quiet ? -1 : lt
    fx.tenken.update(fxTime); fx.hoops.update(fxTime); fx.dome.update(fxTime, time)
    fx.rings.update(fxTime); fx.flashes.update(fxTime); fx.streaks.update(fxTime)
    const pixel = size.height * gl.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) / 2))
    fx.sparks.update(fxTime, pixel); fx.dust.update(fxTime, pixel); fx.shards.update(fxTime, pixel)
    arena.banners.forEach(b => b.update(time))
  })

  const ox = HX + WALL_T / 2, oz = HZ + WALL_T / 2
  return <>
    <group ref={stop} name="stop-arena">
      <primitive object={arena.group} />
      <group ref={kRoot}><Komamura figure={komamura} /></group>
      <group ref={tRoot}><Tosen figure={tosen} /></group>
      <group ref={gRoot} position={GIANT_AT} rotation={[0, GIANT_YAW, 0]} visible={false}><KokujoGiant figure={giant} /></group>
      <primitive object={fx.group} />
    </group>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[WALL_T / 2, WALL_H / 2 + .2, oz + WALL_T / 2]} position={[AX - ox, WALL_H / 2, AZ]} />
      <CuboidCollider args={[WALL_T / 2, WALL_H / 2 + .2, oz + WALL_T / 2]} position={[AX + ox, WALL_H / 2, AZ]} />
      <CuboidCollider args={[HX, WALL_H / 2 + .2, WALL_T / 2]} position={[AX, WALL_H / 2, AZ - oz]} />
      <CuboidCollider args={[HX, WALL_H / 2 + .2, WALL_T / 2 + .1]} position={[AX, WALL_H / 2, AZ + oz]} />
      <CuboidCollider args={[HX - 1, .7, 1.6]} position={[AX, .7, AZ - oz - 1.8]} />
      {LANTERNS.map(([x, z], k) => <CuboidCollider key={k} args={[.15, 1.6, .15]} position={[x, 1.6, z]} />)}
    </RigidBody>
  </>
}

export default memo(CaptainsArena)

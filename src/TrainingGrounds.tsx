// Training grounds director: Chad, Uryū, and Orihime spar on an 18-second loop in an open lot
// beside the street from the gate to the barracks. Everything is a pure function of the loop time.
// The yard holds still (and its effects rest) while one of the fights plays, and it is skipped
// entirely when the camera is far away.
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { Figure } from './finale/figure-kit'
import { applyGait, applySample, createSample, sampleTrack } from './finale/rig'
import type { Track } from './finale/rig'
import { createPathSample, pathSpeed, placeOnPath, samplePath } from './finale/paths'
import type { Path } from './finale/paths'
import { rigidSkin } from './finale/skin'
import { lookToward } from './finale/look'
import { easeOutBack, lin } from './finale/timeline'
import { Flashes, Particles, Rings } from './finale/effects'
import { Streaks } from './garden/effects'
import { Banner } from './life/banner'
import { Chad, Orihime, Uryu } from './stops/karakura-figures'
import {
  CHAD_MARK, TA, TRAINING_CENTER, TRAINING_GROUND as G, TRAINING_LOOP, TRAINING_RADIUS, URYU_DODGE, URYU_MARK,
  chadPath, chadTrack, orihimePath, orihimeTrack, trainingArrows, uryuPath, uryuTrack,
} from './stops/training'
import { Arrows, Directo, Dome, Fairies, TriShield, trainingDust, trainingFlashes, trainingRings, trainingSparks } from './stops/training-fx'

const [AX, , AZ] = TRAINING_CENTER
const QUIET_TIME = 15.5
const FENCE_POSTS = 16
const center = new THREE.Vector3(AX, 1, AZ)

/** Fence colliders: one thin box per span between posts. */
const fenceSpans = Array.from({ length: FENCE_POSTS }, (_, k) => {
  const th = (k + .5) * Math.PI * 2 / FENCE_POSTS, r = TRAINING_RADIUS * Math.cos(Math.PI / FENCE_POSTS)
  return { position: [AX + Math.cos(th) * r, .6, AZ + Math.sin(th) * r] as [number, number, number], rotation: [0, -th - Math.PI / 2, 0] as [number, number, number], half: TRAINING_RADIUS * Math.sin(Math.PI / FENCE_POSTS) + .12 }
})
const BENCH: [number, number, number] = [AX + 1.9, 0, AZ + 5.4]
const TARGETS = [-2.2, 0, 2.2].map(dz => [AX + 8.9, 0, AZ + dz] as [number, number, number])
const WALL: [number, number, number] = [AX, 0, AZ + 9.4]
const TREES: [number, number][] = [[14, 25.5], [19.5, 26], [29, 25.8], [34, 24.5]]
const SHED: [number, number, number] = [AX + 12.5, 0, AZ + 3.2]

function useYard() {
  const yard = useMemo(() => {
    const group = new THREE.Group()
    group.name = 'training-yard'
    const earth = new THREE.MeshStandardMaterial({ color: '#c9b089', roughness: 1 })
    const worn = new THREE.MeshStandardMaterial({ color: '#b1956c', roughness: 1 })
    const wood = new THREE.MeshStandardMaterial({ color: '#7a5636', roughness: .8 })
    const rope = new THREE.MeshStandardMaterial({ color: '#cbb071', roughness: .9 })
    const straw = new THREE.MeshStandardMaterial({ color: '#d8c07a', roughness: 1, flatShading: true })
    const bag = new THREE.MeshStandardMaterial({ color: '#6b4a33', roughness: .7 })
    const geos: THREE.BufferGeometry[] = []
    const add = (g: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], r: [number, number, number] = [0, 0, 0], parent: THREE.Object3D = group, shadow = true) => {
      geos.push(g); const mesh = new THREE.Mesh(g, m); mesh.position.set(...p); mesh.rotation.set(...r); mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh
    }
    add(new THREE.CircleGeometry(TRAINING_RADIUS - .25, 56), earth, [AX, G - .01, AZ], [-Math.PI / 2, 0, 0], group, false)
    add(new THREE.RingGeometry(5.3, 5.55, 56), worn, [AX, G - .005, AZ], [-Math.PI / 2, 0, 0], group, false)
    // Fence: posts and two straw ropes.
    const postGeo = new THREE.CylinderGeometry(.07, .08, 1.15, 6); geos.push(postGeo)
    const posts = new THREE.InstancedMesh(postGeo, wood, FENCE_POSTS)
    const m4 = new THREE.Matrix4()
    for (let k = 0; k < FENCE_POSTS; k++) { const th = k * Math.PI * 2 / FENCE_POSTS; posts.setMatrixAt(k, m4.makeTranslation(AX + Math.cos(th) * TRAINING_RADIUS, .575, AZ + Math.sin(th) * TRAINING_RADIUS)) }
    posts.castShadow = true; group.add(posts)
    for (const y of [.55, .95]) add(new THREE.TorusGeometry(TRAINING_RADIUS, .02, 4, 96), rope, [AX, y, AZ], [Math.PI / 2, 0, 0], group, false)
    // A bench with Orihime's bag, inside the ring behind her mark.
    for (const dx of [-.85, .85]) add(new THREE.BoxGeometry(.28, .38, .38), wood, [BENCH[0] + dx, .19, BENCH[2]])
    add(new THREE.BoxGeometry(2.1, .07, .42), wood, [BENCH[0], .41, BENCH[2]])
    add(new THREE.BoxGeometry(.42, .3, .14), bag, [BENCH[0] - .4, .6, BENCH[2]], [0, .2, 0])
    add(new THREE.CylinderGeometry(.04, .04, .22, 8), rope, [BENCH[0] + .5, .56, BENCH[2]])
    // Straw targets outside the fence.
    for (const p of TARGETS) {
      add(new THREE.CylinderGeometry(.06, .07, 1.7, 6), wood, [p[0], .85, p[2]])
      add(new THREE.CylinderGeometry(.2, .2, .7, 8), straw, [p[0], 1.35, p[2]])
    }
    const banner = new Banner({ position: [AX - 8.2, 0, AZ - 4.6], yaw: -.5, text: '空座', cloth: '#f2eee3', ink: '#1d2230', height: 3 })
    group.add(banner.group)
    // Backdrop on the open south side: a low wall, trees, and a tool shed.
    const plaster = new THREE.MeshStandardMaterial({ color: '#e7e2d6', roughness: .9 })
    const cap = new THREE.MeshStandardMaterial({ color: '#343a41', roughness: .7 })
    const bark = new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: .9 })
    const leaf = new THREE.MeshStandardMaterial({ color: '#5f8a4a', roughness: .85, flatShading: true })
    const leaf2 = new THREE.MeshStandardMaterial({ color: '#739c55', roughness: .85, flatShading: true })
    add(new THREE.BoxGeometry(26, 1.4, .5), plaster, [WALL[0], .7, WALL[2]])
    add(new THREE.BoxGeometry(26.4, .14, .75), cap, [WALL[0], 1.46, WALL[2]])
    for (const [x, z] of TREES) {
      add(new THREE.CylinderGeometry(.16, .22, 2.4, 7), bark, [x, 1.2, z])
      add(new THREE.IcosahedronGeometry(1.5, 1), leaf, [x, 3.2, z])
      add(new THREE.IcosahedronGeometry(1.1, 1), leaf2, [x + .5, 3.9, z - .3])
      add(new THREE.IcosahedronGeometry(1.0, 1), leaf, [x - .6, 3.6, z + .4])
    }
    const shed = new THREE.Group(); shed.position.set(...SHED); shed.rotation.y = -.25; group.add(shed)
    add(new THREE.BoxGeometry(3.2, 2.3, 2.6), plaster, [0, 1.15, 0], [0, 0, 0], shed)
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(3.6, .12, 1.7), cap, [0, 2.75, s * .72], [s * -.55, 0, 0], shed)
    add(new THREE.BoxGeometry(.9, 1.7, .06), wood, [0, .85, 1.32], [0, 0, 0], shed)
    return { group, banner, dispose() { geos.forEach(g => g.dispose()); [earth, worn, wood, rope, straw, bag, plaster, cap, bark, leaf, leaf2].forEach(m => m.dispose()); posts.dispose(); banner.dispose() } }
  }, [])
  useEffect(() => () => yard.dispose(), [yard])
  return yard
}

function usePowers() {
  const fx = useMemo(() => {
    const group = new THREE.Group()
    group.name = 'training-powers'
    const arrowList = trainingArrows()
    const arrows = new Arrows(arrowList), directo = new Directo(), shield = new TriShield(), dome = new Dome()
    const domeCenter = new THREE.Vector3(CHAD_MARK[0] + .35, G + .15, CHAD_MARK[2] + .35)
    const fairies = new Fairies([
      ...shield.corners.map(c => ({ times: [TA.cast, TA.shield, TA.shieldEnd, TA.shieldEnd + .3] as [number, number, number, number], target: c })),
      ...[-1, 1].map(s => ({ times: [TA.heal - .3, TA.heal, TA.healEnd, TA.healEnd + .35] as [number, number, number, number], target: domeCenter.clone().add(new THREE.Vector3(s * 1.35, .1, 0)) })),
    ])
    const rings = new Rings(trainingRings()), flashes = new Flashes(trainingFlashes())
    // The shield and El Directo rings face along X (Rings are built facing Z).
    rings.group.children[0].rotation.y = Math.PI / 2
    rings.group.children[1].rotation.y = Math.PI / 2
    const sparks = new Particles(trainingSparks(arrowList), true, false, G + .02), dust = new Particles(trainingDust(arrowList), false, true, G + .02)
    const streaks = new Streaks([{ t: TA.dodge, from: [URYU_MARK[0], URYU_MARK[1] + .8, URYU_MARK[2]], to: [URYU_DODGE[0], URYU_DODGE[1] + .8, URYU_DODGE[2]], duration: .3, radius: .05, color: '#bfeaff', alpha: .7 }])
    group.add(arrows.mesh, directo.group, shield.group, dome.mesh, fairies.mesh, rings.group, flashes.group, streaks.group, dust.points, sparks.points)
    return { group, arrows, directo, shield, dome, fairies, rings, flashes, sparks, dust, streaks }
  }, [])
  useEffect(() => () => {
    fx.arrows.dispose(); fx.directo.dispose(); fx.shield.dispose(); fx.dome.dispose(); fx.fairies.dispose(); fx.rings.dispose(); fx.flashes.dispose(); fx.sparks.dispose(); fx.dust.dispose(); fx.streaks.dispose()
  }, [fx])
  return fx
}

type Actor = { fig: RefObject<Figure | null>; root: RefObject<THREE.Group | null>; path: Path; track: Track; run: number }
const tmp = new THREE.Vector3(), pin = new THREE.Vector3(), pinLocal = new THREE.Vector3(-.112, .17, .03)
const sa = createPathSample(), sb = createPathSample()
/** Development only: window.__training.freeze(seconds) pins the loop for review; freeze() releases it. */
const debug = { t: null as number | null }

function TrainingGrounds({ quiet, playerPosition }: { quiet: boolean; playerPosition: RefObject<THREE.Vector3> }) {
  const { camera, size, gl } = useThree()
  const stop = useRef<THREE.Group>(null)
  const chad = useRef<Figure | null>(null), uryu = useRef<Figure | null>(null), orihime = useRef<Figure | null>(null)
  const chadRoot = useRef<THREE.Group>(null), uryuRoot = useRef<THREE.Group>(null), orihimeRoot = useRef<THREE.Group>(null)
  const actors = useMemo<Actor[]>(() => [
    { fig: chad, root: chadRoot, path: chadPath, track: chadTrack, run: 0 },
    { fig: uryu, root: uryuRoot, path: uryuPath, track: uryuTrack, run: 0 },
    { fig: orihime, root: orihimeRoot, path: orihimePath, track: orihimeTrack, run: 1 },
  ], [])
  const yard = useYard(), fx = usePowers()
  const sample = useMemo(() => createSample(), [])
  const ps = useMemo(() => [createPathSample(), createPathSample(), createPathSample()], [])
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __training?: unknown }
    w.__training = { freeze: (t?: number) => { debug.t = t ?? null } }
    return () => { delete w.__training }
  }, [])
  useLayoutEffect(() => {
    // One or two draw calls per body instead of ~40; weapons and powers stay separate parts.
    const skins = [chad, uryu, orihime].map(f => f.current ? rigidSkin(f.current) : null)
    return () => skins.forEach(s => s?.dispose())
  }, [])

  useFrame(state => {
    const group = stop.current
    if (!group) return
    const far = camera.position.distanceToSquared(center) > 85 * 85
    // eslint-disable-next-line react/immutability -- scene objects are updated per frame by design.
    group.visible = !far
    if (far) return
    const lt = quiet ? QUIET_TIME : debug.t ?? state.clock.elapsedTime % TRAINING_LOOP
    const time = state.clock.elapsedTime
    actors.forEach((a, i) => {
      const f = a.fig.current, root = a.root.current
      if (!f || !root) return
      const s = samplePath(a.path, lt, ps[i])
      root.visible = s.visible
      placeOnPath(root, s, .8)
      sampleTrack(a.track, lt, sample)
      applySample(f.joints, sample, f.hipsY)
      f.root.position.copy(sample.offset)
      const speed = quiet ? 0 : pathSpeed(a.path, lt, sa, sb)
      if (speed > .3) applyGait(f.joints, lt * (a.run && speed > 2.5 ? 13 : 9.5), Math.min(1, speed / 1.4), a.run && speed > 2.5 ? 1 : 0, f.hipsY - sample.drop)
      f.joints.chest?.rotateX(Math.sin(time * 1.7 + i * 2) * .012)
    })
    const C = chad.current, U = uryu.current, O = orihime.current
    const cRoot = chadRoot.current, uRoot = uryuRoot.current, oRoot = orihimeRoot.current
    if (C && U && O && cRoot && uRoot && oRoot) {
      // Powers: the armour and bow are summoned and dismissed on cue.
      const armor = quiet ? 0 : easeOutBack(lin(lt, TA.armor, TA.armor + .25)) * (1 - lin(lt, TA.armorOff, TA.armorOff + .35))
      for (const name of ['armorShoulder', 'armorForearm', 'armorHand']) C.parts[name]?.scale.setScalar(Math.max(.001, armor))
      const bow = quiet ? 0 : easeOutBack(lin(lt, TA.bow, TA.bow + .3)) * (1 - lin(lt, 7.2, 7.6))
      U.parts.bow?.scale.setScalar(Math.max(.001, bow))
      // Heads follow the spar; between rounds they notice a visitor nearby.
      const player = playerPosition.current
      const idle = quiet || lt > TA.back
      const near = (r: THREE.Object3D) => idle && r.position.distanceToSquared(player) < 64
      lookToward(C, cRoot.position, ps[0].yaw, near(cRoot) ? player : tmp.copy(uRoot.position).setY(1.4), .8, 1.7)
      lookToward(U, uRoot.position, ps[1].yaw, near(uRoot) ? player : tmp.copy(cRoot.position).setY(1.4), .8)
      lookToward(O, oRoot.position, ps[2].yaw, near(oRoot) ? player : lt < TA.run ? tmp.set(AX, 1.3, AZ) : tmp.copy(cRoot.position).setY(.9), .9, 1.35)
      // Orihime's fairies leave from her hairpin.
      O.joints.head?.updateWorldMatrix(true, false)
      if (O.joints.head) pin.copy(pinLocal).applyMatrix4(O.joints.head.matrixWorld)
    }
    const fxTime = quiet ? -1 : lt
    fx.arrows.update(fxTime); fx.directo.update(fxTime); fx.shield.update(fxTime); fx.dome.update(fxTime); fx.fairies.update(fxTime, pin)
    fx.rings.update(fxTime); fx.flashes.update(fxTime); fx.streaks.update(fxTime)
    const pixel = size.height * gl.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) / 2))
    fx.sparks.update(fxTime, pixel); fx.dust.update(fxTime, pixel)
    yard.banner.update(time)
  })

  return <>
    <group ref={stop} name="stop-training">
      <primitive object={yard.group} />
      <group ref={chadRoot}><Chad figure={chad} /></group>
      <group ref={uryuRoot}><Uryu figure={uryu} /></group>
      <group ref={orihimeRoot}><Orihime figure={orihime} /></group>
      <primitive object={fx.group} />
    </group>
    <RigidBody type="fixed" colliders={false}>
      {fenceSpans.map((s, k) => <CuboidCollider key={k} args={[s.half, .6, .1]} position={s.position} rotation={s.rotation} />)}
      {TARGETS.map((p, k) => <CuboidCollider key={`t${k}`} args={[.22, .9, .22]} position={[p[0], .9, p[2]]} />)}
      <CuboidCollider args={[13, .8, .3]} position={[WALL[0], .8, WALL[2]]} />
      {TREES.map(([x, z], k) => <CuboidCollider key={`tree${k}`} args={[.25, 1.2, .25]} position={[x, 1.2, z]} />)}
      <CuboidCollider args={[1.65, 1.2, 1.35]} position={[SHED[0], 1.2, SHED[2]]} rotation={[0, -.25, 0]} />
    </RigidBody>
  </>
}

export default memo(TrainingGrounds)

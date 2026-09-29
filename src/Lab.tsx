// Twelfth Division lab director: the screen wall that shows your websites (from portfolio-content.ts),
// Mayuri presenting as a hologram, Nemu at the console, the sliding doors, and the gallery camera.
// Click a screen (or press E inside) to browse: the camera frames the selected screen while App
// shows the site's details beside it.
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { Figure } from './finale/figure-kit'
import { addRotation, applySample, bakeTrack, createSample, sampleTrack } from './finale/rig'
import type { Pose } from './finale/rig'
import { rigidSkin } from './finale/skin'
import { lookToward } from './finale/look'
import { Captain } from './barracks/characters'
import { captainPoses } from './barracks/choreography'
import { Nemu } from './lab/figures'
import { HOLO_SPOT, NEMU_SPOT, buildLab } from './lab/building'
import { createHologramMaterial, drawSiteTexture, loadSiteImage } from './lab/screens'
import { LAB_CENTER, LAB_RADIUS, SCREEN_H, SCREEN_W, SITES_PER_WALL, around, galleryFraming, screenSlot, siteSlots } from './lab/layout'

const center = new THREE.Vector3(LAB_CENTER[0], 1.5, LAB_CENTER[2])
const doorPoint = new THREE.Vector3(...around(Math.PI / 2, LAB_RADIUS, 1))
const M_THINK: Pose = captainPoses.mayuri
const M_PRESENT: Pose = { thighL: [-.05, 0, .08], thighR: [.05, 0, -.08], spine: [0, .25, 0], neck: [0, -.2, 0], shoulderR: [-1.4, 0, -.5], elbowR: [-.2, 0, 0], wristR: [-.4, 0, 0], shoulderL: [-.35, 0, -.35], elbowL: [-1.3, 0, 0] }
const N_TYPE: Pose = { thighL: [0, 0, .05], thighR: [.02, 0, -.05], spine: [.18, 0, 0], neck: [-.05, 0, 0], shoulderR: [-.95, 0, .2], elbowR: [-1.05, 0, 0], wristR: [.4, 0, 0], shoulderL: [-.95, 0, -.2], elbowL: [-1.05, 0, 0], wristL: [.4, 0, 0] }
const mayuriTrack = bakeTrack([{ t: 0, pose: M_THINK }, { t: 4, pose: M_THINK }, { t: 5, pose: M_PRESENT }, { t: 9, pose: M_PRESENT }, { t: 10, pose: M_THINK }, { t: 12, pose: M_THINK }])
const presentTrack = bakeTrack([{ t: 0, pose: M_PRESENT }])
const nemuTrack = bakeTrack([{ t: 0, pose: N_TYPE }])
const tmp = new THREE.Vector3(), look = new THREE.Vector3(), aim = new THREE.Quaternion()

/** A free-standing screen outside the door, cycling through the websites so passers-by can tell what is inside. */
const KIOSK: [number, number, number] = [-6.6, 0, 3.2]
/** Facing the gate, so it greets everyone who comes through. */
const KIOSK_YAW = .8
const KIOSK_EVERY = 3.5
function kioskText(main: string, sub: string, height: number, accent: string) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = height
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#0c1a24'; ctx.fillRect(0, 0, 1024, height)
  ctx.fillStyle = accent; ctx.fillRect(0, height - 6, 1024, 6)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#e8f7ff'; ctx.font = '600 ' + Math.round(height * .42) + 'px "Manrope", "DM Sans", sans-serif'
  ctx.fillText(main, 34, height / 2, 700)
  ctx.fillStyle = accent; ctx.font = Math.round(height * .3) + 'px "Manrope", "DM Sans", "Yu Gothic", sans-serif'
  ctx.textAlign = 'right'; ctx.fillText(sub, 990, height / 2, 300)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

function Lab({ gallery, onSelectSite, playerPosition, obstacles }: { gallery: number | null; onSelectSite: (i: number) => void; playerPosition: RefObject<THREE.Vector3>; obstacles: THREE.Object3D }) {
  const { camera, size, gl } = useThree()
  const lab = useMemo(() => buildLab(), [])
  useEffect(() => () => lab.dispose(), [lab])
  useLayoutEffect(() => {
    // The follow camera and name labels treat the lab's walls and dome as obstacles.
    obstacles.add(lab.proxy)
    return () => { obstacles.remove(lab.proxy) }
  }, [lab, obstacles])
  // Screen textures: a drawn page per slot, replaced by the screenshot once it loads.
  const drawn = useMemo(() => siteSlots.map(s => drawSiteTexture(s)), [])
  const standby = useMemo(() => drawSiteTexture({ site: { title: 'Standby', url: 'kurotsuchi.lab', description: 'Awaiting data' }, index: 0 }), [])
  const [shots, setShots] = useState<(THREE.Texture | null)[]>(() => siteSlots.map(() => null))
  useEffect(() => {
    siteSlots.forEach((s, i) => { if (s.site?.image) loadSiteImage(s.site.image, SCREEN_W / SCREEN_H, tex => setShots(old => old.map((t, k) => k === i ? tex : t))) })
  }, [])
  useEffect(() => () => { drawn.forEach(t => t.dispose()); standby.dispose() }, [drawn, standby])
  const shotsRef = useRef(shots)
  useEffect(() => { shotsRef.current = shots }, [shots])
  useEffect(() => () => shotsRef.current.forEach(t => t?.dispose()), [])
  // The kiosk outside the door: a header, the current site's page, and its title.
  const kiosk = useMemo(() => {
    const header = kioskText('WEBSITES · STEP INSIDE TO BROWSE', '技術開発局', 120, '#7fdcff')
    const captions = siteSlots.map((s, i) => kioskText(s.site ? s.site.title : 'Your website ' + String(i + 1).padStart(2, '0'), String(i + 1).padStart(2, '0') + ' / ' + String(siteSlots.length).padStart(2, '0'), 88, '#e9bd92'))
    const mats = { header: new THREE.MeshBasicMaterial({ map: header, toneMapped: false }), page: new THREE.MeshBasicMaterial({ toneMapped: false }), caption: new THREE.MeshBasicMaterial({ toneMapped: false }), frame: new THREE.MeshStandardMaterial({ color: '#2c3640', roughness: .5, metalness: .3 }) }
    return { header, captions, mats, shown: -1 }
  }, [])
  useEffect(() => () => { kiosk.header.dispose(); kiosk.captions.forEach(t => t.dispose()); Object.values(kiosk.mats).forEach(m => m.dispose()) }, [kiosk])
  const screenMats = useMemo(() => Array.from({ length: SITES_PER_WALL }, () => new THREE.MeshBasicMaterial({ toneMapped: false })), [])
  const glowMats = useMemo(() => Array.from({ length: SITES_PER_WALL }, () => new THREE.MeshBasicMaterial({ color: '#6fe0ff', transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })), [])
  useEffect(() => () => { screenMats.forEach(m => m.dispose()); glowMats.forEach(m => m.dispose()) }, [screenMats, glowMats])
  const slots = useMemo(() => Array.from({ length: SITES_PER_WALL }, (_, i) => screenSlot(i)), [])
  const hovered = useRef<number | null>(null)

  // Mayuri's hologram and Nemu.
  const mayuri = useRef<Figure | null>(null), nemu = useRef<Figure | null>(null)
  const mayuriRoot = useRef<THREE.Group>(null), nemuRoot = useRef<THREE.Group>(null)
  const holoTime = useMemo(() => ({ value: 0 }), [])
  const holoMats = useMemo(() => [createHologramMaterial(holoTime, true), createHologramMaterial(holoTime, false)], [holoTime])
  useEffect(() => () => holoMats.forEach(m => m.dispose()), [holoMats])
  useLayoutEffect(() => {
    const skins = [nemu.current ? rigidSkin(nemu.current) : null]
    const M = mayuri.current
    if (M) {
      const skin = rigidSkin(M)
      skins.push(skin)
      M.root.traverse(o => {
        if (!(o instanceof THREE.Mesh)) return
        o.castShadow = false
        o.material = o instanceof THREE.SkinnedMesh ? holoMats[0] : holoMats[1]
      })
    }
    return () => skins.forEach(s => s?.dispose())
  }, [holoMats])
  const sample = useMemo(() => createSample(), [])
  const blend = useMemo(() => createSample(), [])

  // Gallery camera state.
  const cam = useRef({ open: false, index: -1, start: 0, fromPos: new THREE.Vector3(), fromQuat: new THREE.Quaternion(), fromFov: 52, targetPos: new THREE.Vector3(), aimer: new THREE.PerspectiveCamera(), door: 0 })

  const page = gallery !== null ? Math.floor(gallery / SITES_PER_WALL) : 0
  useEffect(() => {
    for (let i = 0; i < SITES_PER_WALL; i++) {
      const k = page * SITES_PER_WALL + i
      const tex = k < siteSlots.length ? shots[k] ?? drawn[k] : standby
      // eslint-disable-next-line react/immutability -- screen materials are owned here and retargeted when the page changes.
      screenMats[i].map = tex; screenMats[i].needsUpdate = true
    }
  }, [page, shots, drawn, standby, screenMats])

  const select = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 8) return
    const k = page * SITES_PER_WALL + i
    if (k < siteSlots.length) onSelectSite(k)
  }

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, .1), t = state.clock.elapsedTime, c = cam.current
    const player = playerPosition.current
    const near = camera.position.distanceToSquared(center) < 45 * 45
    // eslint-disable-next-line react/immutability -- scene objects are updated per frame by design.
    lab.interior.visible = near
    if (mayuriRoot.current) mayuriRoot.current.visible = near
    if (nemuRoot.current) nemuRoot.current.visible = near
    const inside = player.distanceToSquared(center) < (LAB_RADIUS + .5) ** 2
    const doorTarget = gallery !== null || inside || player.distanceToSquared(doorPoint) < 42 ? 1 : 0
    c.door += (doorTarget - c.door) * (1 - Math.exp(-4 * dt))
    const pixel = size.height * gl.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) / 2))
    lab.update(t, pixel, c.door)
    const k = Math.floor(t / KIOSK_EVERY) % siteSlots.length
    if (k !== kiosk.shown) {
      // eslint-disable-next-line react/immutability -- the kiosk's materials are owned here and cycle through the sites.
      kiosk.shown = k; kiosk.mats.page.map = shotsRef.current[k] ?? drawn[k]; kiosk.mats.caption.map = kiosk.captions[k]
      kiosk.mats.page.needsUpdate = true; kiosk.mats.caption.needsUpdate = true
    }
    // eslint-disable-next-line react/immutability -- a shader uniform owned by this lab, advanced per frame.
    holoTime.value = t

    // ---- Gallery camera ----
    const pcam = camera as THREE.PerspectiveCamera
    if (gallery !== null) {
      const slot = gallery % SITES_PER_WALL
      if (!c.open || c.index !== gallery) {
        c.fromPos.copy(camera.position); c.fromQuat.copy(camera.quaternion); c.fromFov = pcam.fov
        c.start = t; c.open = true; c.index = gallery
      }
      const fov = galleryFraming(slot, size.width / size.height, c.targetPos, look)
      const w = THREE.MathUtils.smoothstep(t - c.start, 0, .9)
      c.aimer.position.copy(c.targetPos); c.aimer.lookAt(look); aim.copy(c.aimer.quaternion)
      // eslint-disable-next-line react/immutability -- the gallery owns the camera while it is open.
      camera.position.lerpVectors(c.fromPos, c.targetPos, w).y += Math.sin(t * .6) * .015
      camera.quaternion.slerpQuaternions(c.fromQuat, aim, w)
      const f = c.fromFov + (fov - c.fromFov) * w
      // eslint-disable-next-line react/immutability -- the gallery owns the camera while it is open.
      if (Math.abs(pcam.fov - f) > .01) { pcam.fov = f; pcam.updateProjectionMatrix() }
    } else if (c.open) {
      c.open = false; c.index = -1
    } else if (pcam.fov !== 52 && inside) {
      // Ease the lens back to the follow camera's after browsing.
      pcam.fov += (52 - pcam.fov) * (1 - Math.exp(-4 * dt)); if (Math.abs(pcam.fov - 52) < .05) pcam.fov = 52
      pcam.updateProjectionMatrix()
    }

    // ---- Screens: hover and selection glow ----
    for (let i = 0; i < SITES_PER_WALL; i++) {
      const k = page * SITES_PER_WALL + i
      const selected = gallery === k, hot = hovered.current === i
      // eslint-disable-next-line react/immutability -- screen glow materials are owned here and animated per frame.
      glowMats[i].opacity = selected ? .55 + .25 * Math.sin(t * 4) : hot ? .45 : k < siteSlots.length ? .14 : .05
    }

    if (!near) return
    // ---- Mayuri's projection: thinking, then presenting; in the gallery he presents the selected screen ----
    const M = mayuri.current, mr = mayuriRoot.current
    if (M && mr) {
      sampleTrack(gallery !== null ? presentTrack : mayuriTrack, t % 12, sample)
      applySample(M.joints, sample, M.hipsY)
      mr.position.y = .36 + Math.sin(t * 1.3) * .04
      const target = gallery !== null ? slots[gallery % SITES_PER_WALL].position : inside ? tmp.copy(player).setY(1.6) : slots[5].position
      const want = Math.atan2(target.x - mr.position.x, target.z - mr.position.z)
      const d = Math.atan2(Math.sin(want - mr.rotation.y), Math.cos(want - mr.rotation.y))
      mr.rotation.y += d * (1 - Math.exp(-3 * dt))
      M.root.visible = Math.sin(t * 37) * Math.sin(t * 11) > -.97
    }
    // ---- Nemu typing at the console; she glances at visitors ----
    const N = nemu.current, nr = nemuRoot.current
    if (N && nr) {
      sampleTrack(nemuTrack, 0, blend)
      applySample(N.joints, blend, N.hipsY)
      addRotation(N.joints, 'wristR', Math.sin(t * 13) * .12, 0, 0); addRotation(N.joints, 'wristL', Math.sin(t * 11 + 1) * .12, 0, 0)
      N.joints.chest?.rotateX(Math.sin(t * 1.5) * .01)
      const glance = inside && gallery === null ? .9 : gallery !== null ? .6 : 0
      lookToward(N, nr.position, NEMU_SPOT.phi, gallery !== null ? slots[gallery % SITES_PER_WALL].position : tmp.copy(player).setY(1.5), glance, 1.4)
      const braid = N.parts.braid
      if (braid) braid.rotation.x = .12 + Math.sin(t * 1.3) * .03
    }
  })

  const holo = around(HOLO_SPOT.phi, HOLO_SPOT.r, .36), nemuAt = around(NEMU_SPOT.phi, NEMU_SPOT.r, .06)
  return <group name="lab">
    <primitive object={lab.shell} />
    <primitive object={lab.interior} />
    {slots.map((s, i) => <group key={i} position={s.position} rotation={[0, s.yaw, 0]}>
      <mesh material={glowMats[i]} position={[0, 0, -.02]} renderOrder={2}><planeGeometry args={[SCREEN_W + .22, SCREEN_H + .22]} /></mesh>
      <mesh material={screenMats[i]} onClick={select(i)}
        onPointerOver={e => { e.stopPropagation(); hovered.current = i; if (page * SITES_PER_WALL + i < siteSlots.length) document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { hovered.current = null; document.body.style.cursor = '' }}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
      </mesh>
    </group>)}
    <group ref={mayuriRoot} name="lab-hologram" position={holo} rotation={[0, HOLO_SPOT.phi + Math.PI, 0]}>
      <group scale={1.28}><Captain kind="mayuri" figure={mayuri} /></group>
    </group>
    <group ref={nemuRoot} name="lab-nemu" position={nemuAt} rotation={[0, NEMU_SPOT.phi, 0]}><Nemu figure={nemu} /></group>
    <group position={KIOSK} rotation={[0, KIOSK_YAW, 0]}>
      {[-1.3, 1.3].map(x => <mesh key={x} material={kiosk.mats.frame} position={[x, 1.25, -.02]} castShadow><boxGeometry args={[.12, 2.5, .12]} /></mesh>)}
      <mesh material={kiosk.mats.frame} position={[0, 2.05, -.07]} castShadow><boxGeometry args={[2.72, 1.98, .1]} /></mesh>
      <mesh material={kiosk.mats.header} position={[0, 2.84, 0]}><planeGeometry args={[2.56, .3]} /></mesh>
      <mesh material={kiosk.mats.page} position={[0, 2.0, 0]}><planeGeometry args={[2.4, 1.35]} /></mesh>
      <mesh material={kiosk.mats.caption} position={[0, 1.2, 0]}><planeGeometry args={[2.56, .22]} /></mesh>
    </group>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[1.4, 1.3, .15]} position={[KIOSK[0], 1.3, KIOSK[2]]} rotation={[0, KIOSK_YAW, 0]} />
      {lab.colliders.map((b, k) => <CuboidCollider key={k} args={b.half} position={b.position} rotation={[0, b.yaw, 0]} />)}
    </RigidBody>
  </group>
}

export default memo(Lab)

import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { CapsuleCollider, CuboidCollider, RigidBody, TrimeshCollider, useBeforePhysicsStep, useRapier } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import manifest from './world-manifest.json'
import GateEncounter from './GateEncounter'
import HillEncounter from './HillEncounter'
import GardenEncounter from './GardenEncounter'
import ButterflyMark from './ButterflyMark'
import BarracksEncounter from './BarracksEncounter'
import TrainingGrounds from './TrainingGrounds'
import EleventhYard from './EleventhYard'
import CaptainsArena from './CaptainsArena'
import RouteGuide from './RouteGuide'
import ArrivalFx from './ArrivalFx'
import type { Arrival } from './ArrivalFx'
import { cameraAssist } from './camera-assist'
import AmbientLife from './AmbientLife'
import Lab from './Lab'
import { isEncounterActive } from './encounter-state'
import type { EncounterPhase } from './encounter-state'
import Environment from './Environment'
import { makeEnvironmentMaterial } from './environment-materials'
import { Ichigo } from './finale/characters'
import type { Figure } from './finale/characters'
import { applyGait, applySample, bakeTrack, createSample, sampleTrack } from './finale/rig'
import { I_BANKAI_STANCE, I_EXPLORE, I_STAND, playerFinishTrack } from './finale/choreography'
import { createFinaleClock, createFinaleMood } from './finale/timeline'
import { createCinemaLights } from './finale/scene-utils'
import type { FinaleClock } from './finale/timeline'

export type Vec3 = [number, number, number]
/** stick: the touch joystick, x right and y down (toward the viewer), each -1..1; zero when idle. */
export type Controls = { keys: Set<string>; yaw: number; pitch: number; distance: number; cameraMode: 'free' | 'follow'; stick: { x: number; y: number } }
/** keepCamera: move the player without snapping the follow camera (used after the finale). */
export type Travel = { serial: number; position: Vec3; keepCamera?: boolean }

type WorldProps = {
  stage: 0 | 1 | 2 | 3; gateComplete: boolean; /** The first fight not yet completed (4 once all are). */ nextStage: number; /** The latest Senkaimon arrival (after the finale). */ arrival: Arrival | null; phase: EncounterPhase; playing: boolean; entered: boolean; controls: React.RefObject<Controls>; travel: Travel
  onReady: () => void; onPosition: (p: Vec3) => void
  finaleClock?: React.RefObject<FinaleClock>; onFinalePhase?: (from: EncounterPhase, to: EncounterPhase) => void
  gateClock?: React.RefObject<FinaleClock>; onGatePhase?: (from: EncounterPhase, to: EncounterPhase) => void
  barracksClock?: React.RefObject<FinaleClock>; onBarracksPhase?: (from: EncounterPhase, to: EncounterPhase) => void
  gardenClock?: React.RefObject<FinaleClock>; onGardenPhase?: (from: EncounterPhase, to: EncounterPhase) => void
  /** The website being browsed in the lab (the lab's camera takes over), or null. */
  gallery: number | null; onSelectSite: (i: number) => void
}

const noFinalePhase = () => {}

function World({ stage, gateComplete, nextStage, arrival, phase, playing, entered, controls, travel, onReady, onPosition, finaleClock, onFinalePhase, gateClock, onGatePhase, barracksClock, onBarracksPhase, gardenClock, onGardenPhase, gallery, onSelectSite }: WorldProps) {
  const ownClock = useRef<FinaleClock>(createFinaleClock())
  const ownGateClock = useRef<FinaleClock>(createFinaleClock())
  const ownBarracksClock = useRef<FinaleClock>(createFinaleClock())
  const ownGardenClock = useRef<FinaleClock>(createFinaleClock())
  // One effect light and one rim light shared by every cinematic (a fixed light count avoids recompiles).
  const cinemaLights = useMemo(() => createCinemaLights(), [])
  const mood = useRef(createFinaleMood())
  const asset = useGLTF('/assets/seireitei/seireitei-world.glb')
  const collisionAsset = useGLTF('/assets/seireitei/seireitei-collision.glb')
  const prepared = useMemo(() => {
    const materials = new Map<THREE.Material, THREE.Material>()
    const clone = asset.scene.clone(true)
    clone.traverse(o => { if (o instanceof THREE.Mesh) {
      o.castShadow = true; o.receiveShadow = true
      const adapt = (source: THREE.Material) => {
        if (!materials.has(source)) materials.set(source, makeEnvironmentMaterial(source))
        return materials.get(source)!
      }
      o.material = Array.isArray(o.material) ? o.material.map(adapt) : adapt(o.material)
    } })
    return { visual: clone, materials }
  }, [asset.scene])
  const visual = prepared.visual
  useEffect(() => () => { prepared.materials.forEach(m => m.dispose()) }, [prepared])
  useFrame((_, dt) => {
    prepared.materials.forEach(material => {
      const uniform = material.userData.artTime as THREE.Uniform<number> | undefined
      if (uniform) uniform.value += Math.min(dt, .1)
    })
  })
  const collision = useMemo(() => collisionAsset.scene.clone(true), [collisionAsset.scene])
  const mixer = useMemo(() => new THREE.AnimationMixer(visual), [visual])
  const actions = useMemo(() => new Map(asset.animations.map(clip => {
    const a = mixer.clipAction(clip); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true
    return [clip.name, a]
  })), [asset.animations, mixer])
  const doorBodies = useRef(new Map<string, RapierRigidBody>())
  const openClips = useRef(new Set<string>())
  const playerPosition = useRef(new THREE.Vector3(0, 1, 22))
  const staticMeshes = useMemo(() => collision.children.filter(o => o.userData.role === 'staticTrimesh') as THREE.Mesh[], [collision])
  // Html labels test occlusion against the light collision model rather than every visual triangle.
  const occluders = useMemo(() => [{ current: collision }], [collision])

  useEffect(() => { onReady(); return () => { mixer.stopAllAction() } }, [mixer, onReady])
  useBeforePhysicsStep(world => {
    if (entered && !openClips.current.has('gate_open')) {
      actions.get('gate_open')?.reset().play(); openClips.current.add('gate_open')
    }
    for (const d of manifest.doors) {
      if (d.clip !== 'gate_open' && entered && !openClips.current.has(d.clip)) {
        const distance = Math.hypot(playerPosition.current.x - d.closed[0], playerPosition.current.z - d.closed[2])
        if (distance < 5.5) { actions.get(d.clip)?.reset().play(); openClips.current.add(d.clip) }
      }
    }
    mixer.update(world.timestep)
    for (const d of manifest.doors) {
      const node = visual.getObjectByName(d.node)!
      doorBodies.current.get(d.node)?.setNextKinematicTranslation(node.position)
      collision.getObjectByName(d.colliderNode)?.position.copy(node.position)
    }
    collision.updateMatrixWorld(true)
  })

  return <>
    <primitive object={visual} dispose={null} />
    {staticMeshes.map(mesh => <RigidBody key={mesh.uuid} type="fixed" colliders={false}>
      <TrimeshCollider args={[mesh.geometry.attributes.position.array as Float32Array, mesh.geometry.index!.array as Uint32Array]} friction={.8} />
    </RigidBody>)}
    {manifest.doors.map(d => <RigidBody key={d.node} ref={body => { if (body) doorBodies.current.set(d.node, body); else doorBodies.current.delete(d.node) }} type="kinematicPosition" colliders={false} position={d.closed as Vec3}>
      <CuboidCollider args={d.colliderSize.map(v => v / 2) as Vec3} position={d.colliderLocalCenter as Vec3} />
    </RigidBody>)}
    <GateEncounter phase={stage === 0 ? phase : gateComplete ? 'complete' : 'idle'} clock={gateClock ?? ownGateClock} mood={mood} playerPosition={playerPosition} onPhase={onGatePhase ?? noFinalePhase} lights={cinemaLights} />
    <BarracksEncounter phase={stage === 1 ? phase : 'idle'} clock={barracksClock ?? ownBarracksClock} mood={mood} playerPosition={playerPosition} onPhase={onBarracksPhase ?? noFinalePhase} lights={cinemaLights} occluders={occluders} />
    <GardenEncounter phase={stage === 2 ? phase : 'idle'} clock={gardenClock ?? ownGardenClock} mood={mood} playerPosition={playerPosition} onPhase={onGardenPhase ?? noFinalePhase} lights={cinemaLights} occluders={occluders} />
    {/* Side stops: looping vignettes that hold still while a fight plays. */}
    <TrainingGrounds quiet={isEncounterActive(phase)} playerPosition={playerPosition} />
    <EleventhYard quiet={isEncounterActive(phase)} playerPosition={playerPosition} />
    <CaptainsArena quiet={isEncounterActive(phase)} playerPosition={playerPosition} />
    <ArrivalFx arrival={arrival} />
    <RouteGuide nextStage={nextStage} visible={entered && !isEncounterActive(phase) && gallery === null} playerPosition={playerPosition} />
    <AmbientLife quiet={isEncounterActive(phase)} playerPosition={playerPosition} />
    <Lab gallery={gallery} onSelectSite={onSelectSite} playerPosition={playerPosition} obstacles={collision} />
    <HillEncounter phase={stage === 3 ? phase : 'idle'} clock={finaleClock ?? ownClock} mood={mood} playerPosition={playerPosition} onPhase={onFinalePhase ?? noFinalePhase} lights={cinemaLights} />
    <primitive object={cinemaLights.fx} />
    <primitive object={cinemaLights.rim} />
    <primitive object={cinemaLights.rim.target} />
    <Player stage={stage} gateComplete={gateComplete} phase={phase} playing={playing} entered={entered} controls={controls} travel={travel} obstacles={collision} playerPosition={playerPosition} onPosition={onPosition} gallery={gallery} />
    <Environment anchor={playerPosition} mood={mood} />
  </>
}

type PlayerProps = Omit<WorldProps, 'nextStage' | 'arrival' | 'onReady' | 'finaleClock' | 'onFinalePhase' | 'gateClock' | 'onGatePhase' | 'barracksClock' | 'onBarracksPhase' | 'gardenClock' | 'onGardenPhase' | 'onSelectSite'> & {
  obstacles: THREE.Object3D; playerPosition: React.RefObject<THREE.Vector3>
}
function Player({ stage, phase, playing, entered, controls, travel, obstacles, playerPosition, onPosition, gallery }: PlayerProps) {
  const body = useRef<RapierRigidBody>(null)
  const avatar = useRef<THREE.Group>(null)
  const figure = useRef<Figure | null>(null)
  const sample = useMemo(() => createSample(), [])
  const tracks = useMemo(() => ({ explore: bakeTrack([{ t: 0, pose: I_EXPLORE }]), ready: bakeTrack([{ t: 0, pose: I_STAND }]), bankai: bakeTrack([{ t: 0, pose: I_BANKAI_STANCE }]) }), [])
  const gait = useRef({ phase: 0, amount: 0 })
  const exitBlend = useRef(1)
  const tilt = useRef(0)
  const stickRun = useRef(false)
  const wasActive = useRef(false)
  const { world } = useRapier()
  const controller = useMemo(() => world.createCharacterController(.025), [world])
  const { camera, gl } = useThree()
  const velocityY = useRef(0)
  const moving = useRef(false)
  const butterfly = useRef<THREE.Group>(null)
  const marked = useRef(false)
  const bankai = useRef(false)
  const facing = useRef(0)
  const moveClock = useRef({ phase, time: 0 })
  const reportTime = useRef(0)
  const initialized = useRef(false)
  const rayRef = useRef(new THREE.Raycaster())
  const target = useMemo(() => new THREE.Vector3(), [])
  const desired = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  const forward = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    controller.enableAutostep(.3, .15, true)
    controller.enableSnapToGround(.5)
    controller.setMaxSlopeClimbAngle(35 * Math.PI / 180)
    controller.setMinSlopeSlideAngle(40 * Math.PI / 180)
    return () => world.removeCharacterController(controller)
  }, [controller, world])
  useEffect(() => {
    const p = travel.position
    body.current?.setTranslation({ x: p[0], y: p[1] + .95, z: p[2] }, true)
    velocityY.current = 0; initialized.current = !!travel.keepCamera && initialized.current
  }, [travel])
  useEffect(() => {
    const canvas = gl.domElement
    const input = controls.current
    // One pointer drags the camera around; two (a pinch on a touch screen) zoom it in and out.
    const pointers = new Map<number, { x: number; y: number }>()
    let pinch = 0
    const spread = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y) }
    function down(e: PointerEvent) {
      if (!playing) return
      canvas.setPointerCapture(e.pointerId)
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      pinch = pointers.size === 2 ? spread() : 0
    }
    function up(e: PointerEvent) { pointers.delete(e.pointerId); pinch = 0 }
    function move(e: PointerEvent) {
      const last = pointers.get(e.pointerId)
      if (!last || !playing) return
      const dx = e.clientX - last.x, dy = e.clientY - last.y
      last.x = e.clientX; last.y = e.clientY
      if (pointers.size >= 2) {
        const d = spread()
        if (pinch > 0 && d > 0) input.distance = THREE.MathUtils.clamp(input.distance * pinch / d, 2.2, 30)
        pinch = d
        return
      }
      input.yaw -= dx * .005
      input.pitch = THREE.MathUtils.clamp(input.pitch + dy * .004, .05, 1)
    }
    function wheel(e: WheelEvent) {
      e.preventDefault()
      if (!playing) return
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1)
      input.distance = THREE.MathUtils.clamp(input.distance * Math.exp(THREE.MathUtils.clamp(delta * .0015, -.5, .5)), 2.2, 30)
    }
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('pointermove', move); canvas.addEventListener('wheel', wheel, { passive: false })
    return () => {
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('pointermove', move); canvas.removeEventListener('wheel', wheel)
    }
  }, [gl, playing, controls])

  useBeforePhysicsStep(() => {
    if (!body.current) return
    const dt = world.timestep
    const input = controls.current
    const keys = input.keys
    let x = playing ? Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')) : 0
    let z = playing ? Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')) : 0
    // The touch joystick is analog: a light push walks slowly, pushing to the rim runs.
    const stick = input.stick, push = Math.min(1, Math.hypot(stick.x, stick.y))
    const analog = playing && push > .12
    if (analog) { x = stick.x; z = stick.y }
    stickRun.current = analog && push > .9
    if (input.cameraMode === 'follow') {
      // Steer the camera and character together; backwards movement backpedals.
      // eslint-disable-next-line react/immutability -- This shared input ref is intentionally mutable, not React state.
      input.yaw -= x * 1.8 * dt
      x = 0
      facing.current = input.yaw + Math.PI
    }
    const length = Math.hypot(x, z)
    moving.current = length > (analog ? .05 : 0)
    if (length) { x /= length; z /= length }
    const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') || stickRun.current ? 8 : 4.5) * (analog ? Math.min(1, length * 1.15) : 1)
    const dx = (x * Math.cos(input.yaw) + z * Math.sin(input.yaw)) * speed * dt
    const dz = (-x * Math.sin(input.yaw) + z * Math.cos(input.yaw)) * speed * dt
    if (length && input.cameraMode === 'free') facing.current = Math.atan2(dx, dz)
    if (controller.computedGrounded()) velocityY.current = -.5
    velocityY.current = Math.max(-25, velocityY.current - 22 * dt)
    const collider = body.current.collider(0)
    controller.computeColliderMovement(collider, { x: dx, y: velocityY.current * dt, z: dz }, undefined, undefined, other => other.parent()?.handle !== body.current?.handle)
    const step = controller.computedMovement()
    const p = body.current.translation()
    const next = { x: p.x + step.x, y: p.y + step.y, z: p.z + step.z }
    if (next.y < -8) { next.x = 0; next.y = 1.1; next.z = 22; velocityY.current = 0; initialized.current = false }
    body.current.setNextKinematicTranslation(next)
    playerPosition.current.set(next.x, next.y, next.z)
  })

  useFrame((state, rawDt) => {
    if (!body.current) return
    const dt = Math.min(rawDt, .1)
    const input = controls.current
    const ray = rayRef.current
    const p = body.current.translation()
    if (moveClock.current.phase !== phase) moveClock.current = { phase, time: 0 }
    moveClock.current.time += dt
    // Soi Fon's first sting leaves the Hōmonka butterfly on Ichigo's back; it stays until Bankai.
    if (stage === 2 && phase === 'intro') marked.current = false
    if (stage === 2 && phase === 'complete') marked.current = true
    if (stage === 3 && phase === 'intro') bankai.current = false
    if (stage === 3 && ((phase === 'ichigo-bankai' && moveClock.current.time > 1) || ['final-strike','reveal','complete'].includes(phase))) bankai.current = true
    if (butterfly.current) butterfly.current.visible = marked.current && !bankai.current
    if (isEncounterActive(phase)) facing.current = Math.PI
    // Every fight is a cinematic with its own Ichigo; the player avatar steps aside meanwhile.
    const cinematicStage = isEncounterActive(phase)
    if (avatar.current) avatar.current.visible = entered && !cinematicStage
    const f = figure.current
    if (avatar.current && f) {
      const angle = Math.atan2(Math.sin(facing.current - avatar.current.rotation.y), Math.cos(facing.current - avatar.current.rotation.y))
      avatar.current.rotation.y += angle * (1 - Math.exp(-14 * dt))
      const striking = ['finish', 'first-strike', 'final-strike'].includes(phase)
      const run = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') || stickRun.current ? 1 : 0
      if (striking) sampleTrack(playerFinishTrack, moveClock.current.time, sample)
      else sampleTrack(bankai.current ? tracks.bankai : isEncounterActive(phase) ? tracks.ready : tracks.explore, 0, sample)
      applySample(f.joints, sample, f.hipsY)
      f.root.position.set(0, 0, 0)
      gait.current.amount += ((moving.current && !striking ? 1 : 0) - gait.current.amount) * (1 - Math.exp(-10 * dt))
      gait.current.phase += dt * (9.5 + run * 4) * gait.current.amount
      applyGait(f.joints, gait.current.phase, gait.current.amount, run, f.hipsY - sample.drop)
      f.joints.chest?.rotateX(Math.sin(state.clock.elapsedTime * 1.9) * .012 * (1 - gait.current.amount))
      f.setForm?.(bankai.current ? 'bankai' : 'shikai')
      // Zangetsu rides on the back while exploring and comes to hand for encounters.
      const inHand = bankai.current || striking || isEncounterActive(phase)
      if (f.parts.handSword) f.parts.handSword.visible = inHand
      if (f.parts.backSword) f.parts.backSword.visible = !inHand
      if (f.parts.chain) f.parts.chain.rotation.z = Math.sin(state.clock.elapsedTime * 3) * .3 * (1 + gait.current.amount)
      for (const name of ['coatL', 'coatR']) { const panel = f.parts[name]; if (panel) panel.rotation.x = .05 + gait.current.amount * (.18 + run * .15) + Math.sin(state.clock.elapsedTime * 3 + (name === 'coatR' ? 1.3 : 0)) * .03 }
    }
    // Fights and the lab gallery take the camera; when they hand it back, glide instead of snapping.
    const active = isEncounterActive(phase) || gallery !== null
    if (wasActive.current && !active) exitBlend.current = 0
    wasActive.current = active
    if (!entered) {
      camera.position.set(0, 5.2, 32)
      camera.lookAt(0, 5, 15)
      return
    }
    if (cinematicStage || gallery !== null) return
    target.set(p.x, p.y + .6, p.z)
    desired.set(Math.sin(input.yaw) * input.distance * Math.cos(input.pitch), Math.sin(input.pitch) * input.distance, Math.cos(input.yaw) * input.distance).add(target)
    const direction = desired.clone().sub(target)
    ray.set(target, direction.clone().normalize()); ray.far = direction.length()
    const hit = ray.intersectObject(obstacles, true)[0]
    if (hit) desired.copy(target).addScaledVector(direction.normalize(), Math.max(.35, hit.distance - .25))
    if (!initialized.current) { camera.position.copy(desired); initialized.current = true }
    // After a cinematic, glide back to the follow camera instead of snapping.
    exitBlend.current = Math.min(1, exitBlend.current + dt / 1.6)
    const glide = exitBlend.current * exitBlend.current * (3 - 2 * exitBlend.current)
    camera.position.lerp(desired, 1 - Math.exp(-12 * (.12 + .88 * glide) * dt))
    if (glide < 1) {
      look.copy(camera.position).add(forward.set(0, 0, -1).applyQuaternion(camera.quaternion))
      look.lerp(target, 1 - Math.exp(-10 * (.15 + .85 * glide) * dt))
      camera.lookAt(look)
    } else camera.lookAt(target)
    // A side stop may ask for the view to tilt up (the arena's giant); ease toward it.
    tilt.current += (cameraAssist.tilt - tilt.current) * (1 - Math.exp(-1.6 * dt))
    if (tilt.current > .001) camera.rotateX(tilt.current)
    reportTime.current += dt
    if (reportTime.current > .2) { reportTime.current = 0; onPosition([p.x, p.y - .9, p.z]) }
  })

  return <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[0, 1, 22]} enabledRotations={[false, false, false]}>
    <CapsuleCollider args={[.6, .3]} />
    <group ref={avatar} position={[0, -.9, 0]} visible={entered}>
      <Ichigo figure={figure} />
      <group ref={butterfly} visible={false} position={[0, .12, .19]}><ButterflyMark /></group>
    </group>
  </RigidBody>
}

export default memo(World)

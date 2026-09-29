// Ambient life director: Soul Reapers going about their jobs, hell butterflies, birds, falling
// leaves, cherry petals over the Kuchiki garden, and division banners. Everything is driven by the
// frame clock; people far from the camera are hidden and skipped. Spectators at the side stops
// cheer on the same loop clocks as the stops they watch.
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Figure } from './finale/figure-kit'
import { addRotation, applyGait, applySample, blendSample, createSample, sampleTrack } from './finale/rig'
import { rigidSkin } from './finale/skin'
import { lookToward } from './finale/look'
import { impulse } from './finale/timeline'
import { SoulReaper } from './life/npc'
import { CHAT_LOOP, KATA_LOOP, ambientBanners, butterflyHomes, chatTrack, kataTrack, leafSources, npcPoses, npcs, petalSources } from './life/ambient'
import type { NpcJob } from './life/ambient'
import { Birds, HellButterflies } from './life/critters'
import { Drift } from './life/drift'
import { Banner } from './life/banner'
import { EB, ELEVENTH_LOOP } from './stops/eleventh'
import { TA, TRAINING_LOOP } from './stops/training'
import { AB, ARENA_LOOP } from './stops/arena'

const PAUSE = 2.2
const tmp = new THREE.Vector3(), target = new THREE.Vector3()

/** Where a patrol is at time t: walking the path out and back, pausing at each end. */
function patrolAt(job: Extract<NpcJob, { kind: 'patrol' }>, t: number) {
  const segs = job.path.slice(1).map((p, i) => { const a = job.path[i]; return { a, dx: p[0] - a[0], dz: p[1] - a[1], len: Math.hypot(p[0] - a[0], p[1] - a[1]) } })
  const L = segs.reduce((n, s) => n + s.len, 0), walk = L / job.speed, T = 2 * walk + 2 * PAUSE
  const tau = ((t + job.offset) % T + T) % T
  let d: number, back = false, moving = true
  if (tau < walk) d = tau * job.speed
  else if (tau < walk + PAUSE) { d = L; moving = false }
  else if (tau < 2 * walk + PAUSE) { d = L - (tau - walk - PAUSE) * job.speed; back = true }
  else { d = 0; moving = false; back = true }
  let seg = segs[0], along = d
  for (const s of segs) { seg = s; if (along <= s.len) break; along -= s.len }
  const u = Math.min(1, along / Math.max(1e-6, seg.len)), nx = seg.dx / seg.len, nz = seg.dz / seg.len
  const side = job.side ?? 0
  return {
    x: seg.a[0] + seg.dx * u + (-nz) * side, z: seg.a[1] + seg.dz * u + nx * side,
    yaw: Math.atan2(back ? -nx : nx, back ? -nz : nz), moving, stride: d,
  }
}

function useCritters() {
  const c = useMemo(() => {
    const group = new THREE.Group()
    group.name = 'ambient-critters'
    const butterflies = new HellButterflies(butterflyHomes), birds = new Birds()
    const leaves = new Drift(leafSources, { perSource: 8, colors: ['#6f8f3d', '#8aa64c', '#b59a4a', '#5b7a33'], fall: 4.6, life: [6, 10], sway: .5, wind: [.15, .05], size: [.07, .11] })
    const petals = new Drift(petalSources, { perSource: 10, colors: ['#f6c3d4', '#f9d7e2', '#f2aecb', '#fbe3ea'], fall: 7.5, life: [9, 14], sway: .7, wind: [.25, .1], size: [.06, .09] })
    const banners = ambientBanners.map(b => new Banner(b))
    group.add(butterflies.mesh, birds.mesh, leaves.points, petals.points, ...banners.map(b => b.group))
    return { group, butterflies, birds, leaves, petals, banners }
  }, [])
  useEffect(() => () => { c.butterflies.dispose(); c.birds.dispose(); c.leaves.dispose(); c.petals.dispose(); c.banners.forEach(b => b.dispose()) }, [c])
  return c
}

function AmbientLife({ quiet, playerPosition }: { quiet: boolean; playerPosition: RefObject<THREE.Vector3> }) {
  const { camera, size, gl } = useThree()
  const figs = useRef<(Figure | null)[]>([])
  const roots = useRef<(THREE.Group | null)[]>([])
  const figRefs = useMemo(() => npcs.map((_, i) => (f: Figure | null) => { figs.current[i] = f }), [])
  const yaws = useRef(npcs.map(() => NaN))
  const critters = useCritters()
  const sample = useMemo(() => createSample(), [])
  const cheer = useMemo(() => createSample(), [])
  useLayoutEffect(() => {
    const skins = figs.current.map(f => f ? rigidSkin(f) : null)
    return () => skins.forEach(s => s?.dispose())
  }, [])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, .1), t = state.clock.elapsedTime
    const player = playerPosition.current
    const lt11 = t % ELEVENTH_LOOP, ltA = t % TRAINING_LOOP, ltC = t % ARENA_LOOP
    npcs.forEach((spec, i) => {
      const f = figs.current[i], root = roots.current[i]
      if (!f || !root) return
      const job = spec.job
      // Position and facing.
      let x = 0, y = 0, z = 0, yaw = 0, moving = false, stride = 0
      if (job.kind === 'patrol') { const p = patrolAt(job, t); x = p.x; z = p.z; y = job.y ?? .02; yaw = p.yaw; moving = p.moving; stride = p.stride }
      else if (job.kind === 'chat') { [x, y, z] = job.at; yaw = Math.atan2(job.face[0] - x, job.face[2] - z) }
      else if (job.kind === 'watch') { [x, y, z] = job.at; yaw = Math.atan2(job.target[0] - x, job.target[2] - z) }
      else if (job.kind === 'sweep') { [x, y, z] = job.at; yaw = job.yaw; const drift = Math.sin(t * .3) * .6; x += Math.cos(job.yaw) * drift; z -= Math.sin(job.yaw) * drift }
      else { [x, y, z] = job.at; yaw = job.yaw }
      const far = camera.position.distanceToSquared(tmp.set(x, y + 1, z)) > 70 * 70
      root.visible = !far
      if (far) return
      // Turn smoothly toward the heading (patrols reverse at the ends of their route).
      const cur = yaws.current[i]
      if (Number.isNaN(cur)) yaws.current[i] = yaw
      else { const d = Math.atan2(Math.sin(yaw - cur), Math.cos(yaw - cur)); yaws.current[i] = cur + d * (1 - Math.exp(-6 * dt)) }
      root.position.set(x, y, z)
      root.rotation.y = yaws.current[i]
      // Pose.
      if (job.kind === 'chat') sampleTrack(chatTrack, (t + job.offset) % CHAT_LOOP, sample)
      else if (job.kind === 'kata') sampleTrack(kataTrack, (t + job.offset) % KATA_LOOP, sample)
      else if (job.kind === 'guard') sampleTrack(npcPoses.guard, 0, sample)
      else if (job.kind === 'sweep') sampleTrack(npcPoses.sweep, 0, sample)
      else if (job.kind === 'watch') {
        sampleTrack(npcPoses.watch, 0, sample)
        const w = quiet ? 0 : job.cheer === 'eleventh'
          ? Math.min(1, impulse(lt11, EB.lock, 1.6) + impulse(lt11, EB.pose, 1.8) * .8 + impulse(lt11, EB.clash4, 2.5) * .6)
          : job.cheer === 'arena'
            ? Math.min(1, impulse(ltC, AB.clash3, 2.2) * .6 + impulse(ltC, AB.burst + .3, 1.1) + impulse(ltC, AB.slash + .2, 1.4))
            : Math.min(1, impulse(ltA, TA.impact, 1.8) + impulse(ltA, TA.cheer, 1.4))
        if (w > .01) blendSample(sample, sampleTrack(npcPoses.cheer, 0, cheer), w)
      } else sampleTrack(npcPoses.stand, 0, sample)
      applySample(f.joints, sample, f.hipsY)
      f.root.position.copy(sample.offset)
      if (job.kind === 'patrol' && moving) applyGait(f.joints, stride * 5.2, 1, 0, f.hipsY - sample.drop)
      if (job.kind === 'sweep') { const s = Math.sin(t * 2.4); addRotation(f.joints, 'spine', 0, s * .35, 0); addRotation(f.joints, 'shoulderR', 0, 0, s * .2) }
      f.joints.chest?.rotateX(Math.sin(t * 1.6 + i * 1.3) * .012)
      // Heads: watchers follow the action; chatters face each other; others glance at a nearby visitor.
      const near = root.position.distanceToSquared(player) < 36
      if (job.kind === 'watch') lookToward(f, root.position, yaws.current[i], target.set(job.target[0], 1.2, job.target[2]), .9)
      else if (job.kind === 'chat') lookToward(f, root.position, yaws.current[i], target.set(job.face[0], 1.55, job.face[2]), .8)
      else if (near && job.kind !== 'kata') lookToward(f, root.position, yaws.current[i], target.copy(player).setY(player.y + .6), .9)
      else if (job.kind === 'guard') addRotation(f.joints, 'neck', 0, Math.sin(t * .23 + i) * .5, 0)
    })
    critters.butterflies.update(t)
    critters.birds.update(t)
    const pixel = size.height * gl.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) / 2))
    critters.leaves.update(t, pixel); critters.petals.update(t, pixel)
    critters.banners.forEach(b => b.update(t))
  })

  return <>
    <group name="ambient-npcs">{npcs.map((spec, i) => <group key={i} ref={o => { roots.current[i] = o }}><SoulReaper look={spec.look} figure={figRefs[i]} /></group>)}</group>
    <primitive object={critters.group} />
  </>
}

export default memo(AmbientLife)

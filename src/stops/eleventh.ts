// Eleventh Division yard: Kenpachi lounges on a bench with Yachiru on his shoulder while Ikkaku
// and Yumichika spar in a roped ring. A 16-second loop; everything is a pure function of loop time.
import * as THREE from 'three'
import { bakeTrack } from '../finale/rig'
import type { Pose } from '../finale/rig'
import type { V3 } from '../finale/figure-kit'
import { bakePath, createPathSample, samplePath } from '../finale/paths'
import type { PathKey } from '../finale/paths'
import type { Burst, FlashEvent, RingEvent } from '../finale/effects'

export const ELEVENTH_CENTER: V3 = [14, 0, -38]
export const RING: V3 = [17.5, 0, -38]
export const RING_RADIUS = 3.9
export const ELEVENTH_GROUND = .03
export const ELEVENTH_LOOP = 16
const G = ELEVENTH_GROUND
const [RX, , RZ] = RING
const r = (dx: number, dz: number, dy = 0): V3 => [RX + dx, G + dy, RZ + dz]

export const EB = {
  extend: .45, spear: .58, dash: 2.0, clash1: 2.2, clash2: 2.82, clash3: 3.45, flurry: [3.95, 4.15, 4.35, 4.55], back: 4.85, split: 5.0, clash4: 5.5, reform: 5.9,
  pose: 6.9, rush: 8.2, lock: 8.6, lockEnd: 10.2, part: 10.35, circle: 10.9, circleEnd: 14.6, seal: 15.2,
} as const

/** Kenpachi's bench, facing the ring. */
export const BENCH: V3 = [9.6, G, -41.25]
export const BENCH_YAW = Math.atan2(RX - BENCH[0], RZ - BENCH[2])
/** Yachiru sits on Kenpachi's left shoulder (Kenpachi chest-joint space). */
export const YACHIRU_SEAT: V3 = [.2, .31, -.03]

const face = (a: V3, b: V3) => Math.atan2(b[0] - a[0], b[2] - a[2])
const IM = r(-1.9, 0), YM = r(1.9, 0)
// Both circle the ring counter-clockwise, facing each other.
const orbit = (phase: number): PathKey[] => [0, 1, 2, 3, 4].map(k => {
  const a = phase + k * Math.PI / 2, p = r(Math.cos(a) * 1.9, Math.sin(a) * 1.9)
  return { t: EB.circle + k * (EB.circleEnd - EB.circle) / 4, p, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), ease: 'linear' as const }
})
export const ikkakuPath = bakePath([
  { t: 0, p: IM, yaw: Math.PI / 2 },
  { t: EB.dash, p: IM },
  { t: EB.clash1, p: r(-.65, 0), ease: 'out' },
  { t: 2.65, p: r(-1.0, 0) },
  { t: EB.clash2, p: r(-.6, .1), ease: 'out' },
  { t: 3.3, p: r(-1.0, 0) },
  { t: EB.clash3, p: r(-1.2, 0), ease: 'out' },
  { t: 3.95, p: r(-.95, 0) }, { t: 4.15, p: r(-1.05, 0) }, { t: 4.35, p: r(-.9, 0) }, { t: 4.55, p: r(-1.0, 0) },
  { t: EB.back, p: IM, arc: .45, ease: 'out' },
  { t: EB.rush, p: IM },
  { t: EB.lock, p: r(-.55, 0), ease: 'in' },
  { t: EB.lockEnd, p: r(-.55, 0) },
  { t: EB.part, p: IM, arc: .35, ease: 'out' },
  ...orbit(Math.PI),
  { t: ELEVENTH_LOOP, p: IM, yaw: Math.PI / 2 },
])
export const yumichikaPath = bakePath([
  { t: 0, p: YM, yaw: -Math.PI / 2 },
  { t: EB.dash + .05, p: YM },
  { t: EB.clash1, p: r(1.9, .75), yaw: face(r(1.9, .75), r(-.65, 0)), ease: 'out' },
  { t: 2.65, p: r(1.9, .75) },
  { t: EB.clash2 + .12, p: r(2.3, .9), arc: .45, ease: 'out' },
  { t: 3.3, p: r(1.8, .3), yaw: -Math.PI / 2 },
  { t: EB.clash3, p: r(-.4, .05), ease: 'out' },
  { t: 3.95, p: r(-.2, 0) }, { t: 4.15, p: r(-.1, 0) }, { t: 4.35, p: r(-.25, 0) }, { t: 4.55, p: r(-.15, 0) },
  { t: EB.back, p: r(.9, 0) },
  { t: EB.clash4, p: r(1.25, .2), yaw: -Math.PI / 2 + .9 },
  { t: EB.reform, p: r(1.4, 0), yaw: -Math.PI / 2 },
  { t: 6.3, p: YM },
  { t: EB.rush, p: YM },
  { t: EB.lock, p: r(.55, 0), ease: 'in' },
  { t: EB.lockEnd, p: r(.55, 0) },
  { t: EB.part, p: YM, arc: .35, ease: 'out' },
  ...orbit(0),
  { t: ELEVENTH_LOOP, p: YM, yaw: -Math.PI / 2 },
])

const legsReady: Pose = { thighL: [-.14, 0, .1], kneeL: [.26, 0, 0], ankleL: [-.12, 0, 0], thighR: [.14, 0, -.1], kneeR: [.22, 0, 0], ankleR: [-.1, 0, 0], drop: .035 }
const legsWide: Pose = { thighL: [-.32, 0, .2], kneeL: [.46, 0, 0], ankleL: [-.14, 0, 0], thighR: [.22, 0, -.2], kneeR: [.42, 0, 0], ankleR: [-.2, 0, 0], drop: .09 }
const legsLunge: Pose = { thighL: [-1.05, 0, .1], kneeL: [1.02, 0, 0], ankleL: [.05, 0, 0], thighR: [.55, 0, -.1], kneeR: [.36, 0, 0], ankleR: [.22, 0, 0], drop: .2 }
const tuck: Pose = { thighL: [-1.6, 0, .15], kneeL: [1.8, 0, 0], thighR: [-1.2, 0, -.15], kneeR: [1.7, 0, 0], drop: .1 }

// --- Ikkaku -------------------------------------------------------------------------------------
const IK_SEALED: Pose = { ...legsWide, spine: [.05, .2, 0], shoulderR: [-1.2, 0, .1], elbowR: [-.4, 0, 0], wristR: [1.2, 0, 0], shoulderL: [.4, 0, .4], elbowL: [-.3, 0, 0], wristL: [.8, 0, 0] }
const IK_JOIN: Pose = { ...legsWide, shoulderR: [-1.0, 0, .45], elbowR: [-1.2, 0, 0], wristR: [.6, 0, 0], shoulderL: [-1.0, 0, -.45], elbowL: [-1.2, 0, 0], wristL: [.6, 0, 0] }
const IK_SPIN: Pose = { ...legsWide, spine: [.05, .15, 0], shoulderR: [-1.3, 0, .25], elbowR: [-.8, 0, 0], wristR: [.4, 0, 0], shoulderL: [.2, 0, .5], elbowL: [-.4, 0, 0] }
const IK_READY: Pose = { ...legsWide, drop: .12, spine: [.1, .35, 0], neck: [0, -.35, 0], shoulderR: [-.6, 0, .2], elbowR: [-1.2, 0, 0], wristR: [1.3, 0, 0], shoulderL: [-1.1, 0, -.35], elbowL: [-.7, 0, 0] }
const IK_THRUST: Pose = { ...legsLunge, spine: [.25, .4, 0], neck: [-.1, -.4, 0], shoulderR: [-1.3, 0, .1], elbowR: [-.1, 0, 0], wristR: [1.4, 0, 0], shoulderL: [-1.2, 0, -.3], elbowL: [-.3, 0, 0] }
const IK_SWEEP: Pose = { ...legsWide, drop: .25, spine: [.3, -.5, 0], neck: [0, .4, 0], shoulderR: [-.5, 0, -1.0], elbowR: [-.2, 0, 0], wristR: [1.5, .5, 0], shoulderL: [-.3, 0, .6], elbowL: [-.5, 0, 0] }
const IK_BLOCK: Pose = { ...legsWide, drop: .15, spine: [.1, 0, 0], shoulderR: [-1.6, 0, .6], elbowR: [-1.2, 0, 0], wristR: [0, 1.5, 0], shoulderL: [-1.6, 0, -.6], elbowL: [-1.2, 0, 0] }
const IK_SPLIT: Pose = { ...legsWide, spine: [-.1, -.4, 0], neck: [0, .4, 0], shoulderR: [-2.4, 0, -.3], elbowR: [-.3, 0, 0], wristR: [.6, 0, 0], shoulderL: [-.3, 0, .6], elbowL: [-.5, 0, 0] }
const IK_LAUGH: Pose = { ...legsReady, spine: [-.1, 0, 0], neck: [-.45, 0, 0], head: [-.15, 0, 0], shoulderR: [-2.6, 0, -1.0], elbowR: [-2.0, 0, 0], wristR: [.3, 0, 0], shoulderL: [-2.6, 0, 1.0], elbowL: [-2.0, 0, 0] }
const IK_LOCK: Pose = { ...legsLunge, drop: .22, spine: [.25, .1, 0], shoulderR: [-1.4, 0, .4], elbowR: [-1.0, 0, 0], wristR: [.2, 1.3, 0], shoulderL: [-1.4, 0, -.4], elbowL: [-1.0, 0, 0] }
export const ikkakuTrack = bakeTrack([
  { t: 0, pose: IK_SEALED }, { t: .3, pose: IK_JOIN }, { t: EB.spear, pose: IK_JOIN }, { t: .9, pose: IK_SPIN }, { t: 1.8, pose: IK_SPIN }, { t: EB.dash, pose: IK_READY },
  { t: EB.clash1, pose: IK_THRUST, ease: 'snap' }, { t: 2.55, pose: IK_READY }, { t: EB.clash2, pose: IK_SWEEP, ease: 'snap' }, { t: 3.2, pose: IK_READY },
  { t: EB.clash3, pose: IK_BLOCK, ease: 'snap' }, { t: 3.95, pose: IK_THRUST, ease: 'snap' }, { t: 4.15, pose: IK_BLOCK, ease: 'snap' }, { t: 4.35, pose: IK_THRUST, ease: 'snap' }, { t: 4.55, pose: IK_BLOCK, ease: 'snap' },
  { t: EB.back, pose: { ...IK_READY, ...tuck }, ease: 'out' }, { t: EB.split + .1, pose: IK_SPLIT }, { t: EB.clash4 + .2, pose: IK_SPLIT }, { t: EB.reform + .2, pose: IK_READY },
  { t: EB.pose + .1, pose: IK_LAUGH }, { t: 7.9, pose: IK_LAUGH }, { t: EB.rush, pose: IK_READY }, { t: EB.lock, pose: IK_LOCK, ease: 'snap' }, { t: EB.lockEnd, pose: IK_LOCK },
  { t: EB.part, pose: { ...IK_READY, ...tuck } }, { t: EB.circle, pose: IK_READY }, { t: EB.circleEnd, pose: IK_READY }, { t: EB.seal, pose: IK_JOIN }, { t: 15.7, pose: IK_SEALED }, { t: 16, pose: IK_SEALED },
])

// --- Yumichika -------------------------------------------------------------------------------------
const YU_READY: Pose = { ...legsReady, drop: .05, spine: [.02, .15, .03], neck: [0, -.15, 0], shoulderR: [-.9, 0, .15], elbowR: [-.5, 0, 0], wristR: [1.0, 0, 0], shoulderL: [.15, 0, .25], elbowL: [-1.2, 0, 0] }
const YU_PARRY: Pose = { ...legsWide, spine: [.05, .25, 0], shoulderR: [-1.3, 0, .5], elbowR: [-1.0, 0, 0], wristR: [.7, .9, 0], shoulderL: [.2, 0, .5], elbowL: [-.6, 0, 0] }
const YU_SLASH: Pose = { ...legsLunge, spine: [.2, .5, 0], neck: [-.1, -.45, 0], shoulderR: [-1.0, 0, -.6], elbowR: [-.1, 0, 0], wristR: [1.3, 0, 0], shoulderL: [.4, 0, .6], elbowL: [-.4, 0, 0] }
const YU_HOP: Pose = { ...tuck, spine: [.15, 0, 0], shoulderR: [-.6, 0, -.8], elbowR: [-.3, 0, 0], wristR: [1.0, 0, 0], shoulderL: [-.4, 0, .9], elbowL: [-.3, 0, 0] }
const YU_BACKBLOCK: Pose = { ...legsWide, drop: .12, spine: [.1, .3, 0], neck: [0, -.4, 0], shoulderR: [-2.8, 0, -.4], elbowR: [-1.2, 0, 0], wristR: [.3, 0, 0], shoulderL: [.2, 0, .5], elbowL: [-.5, 0, 0] }
const YU_POSE: Pose = { ...legsReady, thighL: [-.25, 0, .02], kneeL: [.35, 0, 0], spine: [-.05, 0, .1], neck: [.1, 0, -.15], shoulderL: [-2.2, 0, -.2], elbowL: [-2.2, 0, 0], shoulderR: [-.2, 0, -.5], elbowR: [-.2, 0, 0], wristR: [1.1, 0, 0] }
const YU_LOCK: Pose = { ...legsLunge, drop: .22, spine: [.25, -.1, 0], shoulderR: [-1.4, 0, .45], elbowR: [-1.0, 0, 0], wristR: [.3, 1.2, 0], shoulderL: [-1.3, 0, -.4], elbowL: [-1.1, 0, 0] }
export const yumichikaTrack = bakeTrack([
  { t: 0, pose: YU_READY }, { t: EB.dash, pose: YU_READY }, { t: EB.clash1, pose: YU_PARRY, ease: 'snap' }, { t: 2.6, pose: YU_PARRY }, { t: EB.clash2 + .05, pose: YU_HOP, ease: 'out' },
  { t: 3.15, pose: YU_READY }, { t: EB.clash3, pose: YU_SLASH, ease: 'snap' }, { t: 3.95, pose: YU_PARRY, ease: 'snap' }, { t: 4.15, pose: YU_SLASH, ease: 'snap' }, { t: 4.35, pose: YU_PARRY, ease: 'snap' }, { t: 4.55, pose: YU_SLASH, ease: 'snap' },
  { t: EB.back, pose: YU_READY }, { t: EB.clash4 - .02, pose: YU_BACKBLOCK, ease: 'snap' }, { t: EB.reform + .1, pose: YU_BACKBLOCK }, { t: 6.4, pose: YU_READY },
  { t: EB.pose + .3, pose: YU_POSE }, { t: 7.9, pose: YU_POSE }, { t: EB.rush, pose: YU_READY }, { t: EB.lock, pose: YU_LOCK, ease: 'snap' }, { t: EB.lockEnd, pose: YU_LOCK },
  { t: EB.part, pose: YU_HOP }, { t: EB.circle, pose: YU_READY }, { t: 16, pose: YU_READY },
])

// --- Kenpachi and Yachiru ---------------------------------------------------------------------------
const KE_SIT: Pose = {
  drop: .46, thighL: [-1.45, 0, .28], kneeL: [1.35, 0, 0], ankleL: [.1, 0, 0], thighR: [-1.4, 0, -.3], kneeR: [1.3, 0, 0], ankleR: [.1, 0, 0],
  spine: [.18, 0, 0], chest: [.05, 0, 0], neck: [-.12, 0, 0], shoulderR: [-.75, 0, .15], elbowR: [-.9, 0, 0], wristR: [-.25, 0, 0], shoulderL: [-.55, 0, .1], elbowL: [-.7, 0, 0],
}
const KE_LAUGH: Pose = { ...KE_SIT, spine: [.05, 0, 0], neck: [-.45, 0, 0], head: [-.2, 0, 0] }
const KE_YAWN: Pose = { ...KE_SIT, spine: [.02, 0, 0], neck: [-.5, 0, .1], shoulderL: [-1.9, 0, -.2], elbowL: [-2.0, 0, 0] }
export const kenpachiTrack = bakeTrack([
  { t: 0, pose: KE_SIT }, { t: EB.pose, pose: KE_SIT }, { t: EB.pose + .2, pose: KE_LAUGH, ease: 'snap' }, { t: 7.8, pose: KE_LAUGH }, { t: 8.2, pose: KE_SIT },
  { t: EB.lock, pose: KE_SIT }, { t: EB.lock + .15, pose: KE_LAUGH, ease: 'snap' }, { t: 9.4, pose: KE_LAUGH }, { t: 9.9, pose: KE_SIT },
  { t: 12.2, pose: KE_SIT }, { t: 12.7, pose: KE_YAWN }, { t: 13.6, pose: KE_YAWN }, { t: 14.1, pose: KE_SIT }, { t: 16, pose: KE_SIT },
])
const YA_SIT: Pose = { drop: .64, thighL: [-1.45, 0, .12], kneeL: [1.35, 0, 0], thighR: [-1.4, 0, -.12], kneeR: [1.3, 0, 0], spine: [-.05, 0, 0], shoulderL: [-2.6, 0, .3], elbowL: [-.8, 0, 0], shoulderR: [-1.1, 0, .3], elbowR: [-2.0, 0, 0] }
const YA_CHEER: Pose = { ...YA_SIT, shoulderL: [-2.9, 0, .45], elbowL: [-.2, 0, 0], shoulderR: [-2.9, 0, -.45], elbowR: [-.2, 0, 0], neck: [-.2, 0, 0] }
export const yachiruTrack = bakeTrack([
  { t: 0, pose: YA_SIT }, { t: EB.pose, pose: YA_SIT }, { t: EB.pose + .15, pose: YA_CHEER, ease: 'snap' }, { t: 7.9, pose: YA_CHEER }, { t: 8.3, pose: YA_SIT },
  { t: EB.lock, pose: YA_SIT }, { t: EB.lock + .1, pose: YA_CHEER, ease: 'snap' }, { t: 9.5, pose: YA_CHEER }, { t: 9.9, pose: YA_SIT }, { t: 16, pose: YA_SIT },
])

// --- Event lists (loop time) ------------------------------------------------------------------------
const sparks = ['#fff4d0', '#ffd58a', '#ffffff', '#ffb45c']
const dirt = ['#d8c8a2', '#c9b68d', '#e3d6b6']
/** Where the fighters meet at time t (midpoint, at weapon height). */
const meet = (t: number, dy = 1.25): V3 => {
  const a = samplePath(ikkakuPath, t, createPathSample()).pos, b = samplePath(yumichikaPath, t, createPathSample()).pos
  return [(a.x + b.x) / 2, G + dy, (a.z + b.z) / 2]
}
export const CLASHES: { t: number; p: V3; big?: boolean }[] = [
  { t: EB.clash1, p: meet(EB.clash1) }, { t: EB.clash2, p: meet(EB.clash2, .45) }, { t: EB.clash3, p: meet(EB.clash3, 1.5) },
  ...EB.flurry.map(t => ({ t, p: meet(t, 1.2 + (t * 7 % 3) * .1) })),
  { t: EB.clash4, p: r(1.05, .35, 1.55) }, { t: EB.lock, p: meet(EB.lock, 1.3), big: true },
]
export function eleventhSparks(): Burst[] {
  const out: Burst[] = CLASHES.map(c => ({ t: c.t, spread: .03, count: c.big ? 180 : 60, origin: c.p, box: [.06, .08, .06] as V3, radial: true, speed: (c.big ? [2.5, 8] : [1.5, 5]) as [number, number], vel: [0, .8, 0] as V3, gravity: 6, drag: 1.2, life: [.25, .7] as [number, number], size: [.035, .07] as [number, number], colors: sparks }))
  // Sparks keep grinding off the blades while they lock.
  for (let k = 0; k < 7; k++) out.push({ t: EB.lock + .25 + k * .21, count: 10, origin: meet(EB.lock, 1.3), box: [.04, .05, .04], radial: true, speed: [1, 3], vel: [0, .8, 0], gravity: 6, life: [.2, .45], size: [.03, .06], colors: sparks })
  out.push({ t: EB.extend, spread: .1, count: 26, origin: meet(EB.extend, 1.1).map((v, i) => i === 0 ? RX - 1.6 : v) as V3, box: [.1, .1, .1], radial: true, speed: [.4, 1.4], life: [.3, .6], size: [.03, .06], colors: sparks })
  return out
}
export function eleventhDust(): Burst[] {
  const out: Burst[] = []
  for (const [t, path] of [[EB.clash1 - .05, 'i'], [EB.clash2 + .12, 'y'], [EB.clash3 - .05, 'y'], [EB.back, 'i'], [EB.lock, 'i'], [EB.lock, 'y'], [EB.part, 'i'], [EB.part, 'y']] as [number, string][]) {
    const p = samplePath(path === 'i' ? ikkakuPath : yumichikaPath, t, createPathSample()).pos
    out.push({ t, count: 12, origin: [p.x, G + .06, p.z], box: [.2, .02, .15], radial: true, flat: true, up: .2, speed: [.6, 1.8], drag: 2.2, life: [.6, 1.1], size: [.25, .5], colors: dirt })
  }
  out.push({ t: EB.lock, count: 40, origin: [RX, G + .06, RZ], box: [.4, .02, .3], radial: true, flat: true, up: .2, speed: [2, 4.5], drag: 2, life: [.8, 1.4], size: [.35, .7], colors: dirt })
  return out
}
export function eleventhRings(): RingEvent[] {
  const big = CLASHES[CLASHES.length - 1]
  return [
    { t: big.t, x: RX, y: G + .03, z: RZ, radius: 3.2, duration: .8, color: '#fff0c8', alpha: .7, width: .05 },
    { t: big.t, x: big.p[0], y: big.p[1], z: big.p[2], radius: 1.1, duration: .35, color: '#fff4d8', alpha: .85, width: .07, vertical: true },
  ]
}
export function eleventhFlashes(): FlashEvent[] {
  return [
    { t: EB.extend, p: [RX - 1.55, G + 1.1, RZ + .05], from: .08, to: .45, duration: .3, color: '#ffd27a', alpha: .7 },
    { t: EB.seal, p: [RX - 1.55, G + 1.1, RZ + .05], from: .08, to: .4, duration: .3, color: '#ffd27a', alpha: .6 },
  ]
}
export const yachiruSeatVector = new THREE.Vector3(...YACHIRU_SEAT)

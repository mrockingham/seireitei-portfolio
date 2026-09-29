// Minimal keyframed pose system for the procedural character rigs.
// Characters face +Z in local space; the right side is -X.
// Rotation conventions (radians, Euler XYZ):
//   shoulder/elbow/thigh x < 0 swings the limb forward; knee x > 0 bends the shin back.
//   Left shoulder z > 0 raises the arm outward; right shoulder z < 0 does the same.
//   spine/chest x > 0 leans forward; spine y < 0 draws the right shoulder back.
//   Weapons point along the hand's local +Z, so wrist x tilts the blade.
import * as THREE from 'three'
import { clamp01 } from './timeline'

export const JOINTS = ['hips', 'spine', 'chest', 'neck', 'head', 'shoulderL', 'elbowL', 'wristL', 'shoulderR', 'elbowR', 'wristR', 'thighL', 'kneeL', 'ankleL', 'thighR', 'kneeR', 'ankleR'] as const
export type Joint = typeof JOINTS[number]
export type Joints = Partial<Record<Joint, THREE.Object3D>>
export type Euler3 = [number, number, number]
/** offset: root translation in character space (x right-to-left, z forward); drop lowers the hips. */
export type Pose = Partial<Record<Joint, Euler3>> & { offset?: Euler3; yaw?: number; drop?: number }
export type Ease = 'inOut' | 'out' | 'in' | 'linear' | 'snap'
export type Key = { t: number; pose: Pose; ease?: Ease }

type BakedKey = { t: number; ease: Ease; q: THREE.Quaternion[]; offset: THREE.Vector3; yaw: number; drop: number }
export type Track = BakedKey[]
export type Sample = { q: THREE.Quaternion[]; offset: THREE.Vector3; yaw: number; drop: number }

const euler = new THREE.Euler()
const easeFns: Record<Ease, (x: number) => number> = {
  inOut: x => x * x * (3 - 2 * x),
  out: x => 1 - (1 - x) ** 3,
  in: x => x ** 3,
  linear: x => x,
  // Fast strike: most of the motion lands in the first third.
  snap: x => 1 - (1 - x) ** 5,
}

export function bakeTrack(keys: Key[]): Track {
  return keys.map(k => ({
    t: k.t, ease: k.ease ?? 'inOut',
    q: JOINTS.map(j => { const r = k.pose[j]; return new THREE.Quaternion().setFromEuler(euler.set(r?.[0] ?? 0, r?.[1] ?? 0, r?.[2] ?? 0)) }),
    offset: new THREE.Vector3(...(k.pose.offset ?? [0, 0, 0])), yaw: k.pose.yaw ?? 0, drop: k.pose.drop ?? 0,
  }))
}
export const createSample = (): Sample => ({ q: JOINTS.map(() => new THREE.Quaternion()), offset: new THREE.Vector3(), yaw: 0, drop: 0 })

/** Samples a track at time t; each key's ease shapes the motion that arrives at that key. */
export function sampleTrack(track: Track, t: number, out: Sample) {
  let b = track.findIndex(k => k.t > t)
  if (b === -1) b = track.length - 1
  const a = Math.max(0, b - 1)
  const ka = track[a], kb = track[b]
  const x = ka === kb ? 1 : clamp01((t - ka.t) / (kb.t - ka.t))
  const w = t <= ka.t && a === 0 ? 0 : easeFns[kb.ease](x)
  for (let i = 0; i < JOINTS.length; i++) out.q[i].slerpQuaternions(ka.q[i], kb.q[i], w)
  out.offset.lerpVectors(ka.offset, kb.offset, w)
  out.yaw = ka.yaw + (kb.yaw - ka.yaw) * w
  out.drop = ka.drop + (kb.drop - ka.drop) * w
  return out
}

/** Blends sample b into a by weight w (0 keeps a). */
export function blendSample(a: Sample, b: Sample, w: number) {
  if (w <= 0) return a
  for (let i = 0; i < JOINTS.length; i++) a.q[i].slerp(b.q[i], w)
  a.offset.lerp(b.offset, w)
  a.yaw += (b.yaw - a.yaw) * w
  a.drop += (b.drop - a.drop) * w
  return a
}

export function applySample(joints: Joints, s: Sample, hipsY: number) {
  JOINTS.forEach((name, i) => { const j = joints[name]; if (j) j.quaternion.copy(s.q[i]) })
  if (joints.hips) joints.hips.position.y = hipsY - s.drop
}

const tmp = new THREE.Quaternion()
/** Adds a rotation on top of the current joint orientation (used for walk cycles and breathing). */
export function addRotation(joints: Joints, name: Joint, x: number, y = 0, z = 0) {
  const j = joints[name]
  if (!j) return
  j.quaternion.multiply(tmp.setFromEuler(euler.set(x, y, z)))
}

/** Procedural walk/run overlay; phase in radians, amount 0..1, run 0..1. */
export function applyGait(joints: Joints, phase: number, amount: number, run: number, hipsY: number) {
  if (amount <= 0) return
  const s = Math.sin(phase), c = Math.cos(phase)
  const stride = (.5 + run * .35) * amount
  addRotation(joints, 'thighL', -s * stride)
  addRotation(joints, 'thighR', s * stride)
  addRotation(joints, 'kneeL', Math.max(0, c) * (.75 + run * .5) * amount)
  addRotation(joints, 'kneeR', Math.max(0, -c) * (.75 + run * .5) * amount)
  addRotation(joints, 'shoulderL', s * (.32 + run * .25) * amount)
  addRotation(joints, 'shoulderR', -s * (.32 + run * .25) * amount * .6)
  addRotation(joints, 'spine', run * .22 * amount, -s * .08 * amount, 0)
  if (joints.hips) joints.hips.position.y = hipsY - Math.abs(c) * (.025 + run * .03) * amount
}

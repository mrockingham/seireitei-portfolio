// World-space keyframed paths: where a figure stands, which way it faces, and when it is hidden.
// Shared by the garden fight and the ambient stops; everything is a pure function of time.
import * as THREE from 'three'
import type { V3 } from './figure-kit'
import { clamp01 } from './timeline'

/**
 * A world-space path key. The segment arriving at a key uses that key's ease, arc (extra height at
 * mid-segment), and flip (extra pitch over the segment, e.g. -2π for a back flip). `hide` makes the
 * figure vanish from this key until the next one: a flash step.
 */
export type PathKey = { t: number; p: V3; yaw?: number; pitch?: number; hide?: boolean; arc?: number; flip?: number; ease?: 'inOut' | 'out' | 'in' | 'linear' }
type BakedPathKey = PathKey & { yaw: number; pitch: number }
export type Path = BakedPathKey[]
export type PathSample = { pos: THREE.Vector3; yaw: number; pitch: number; visible: boolean }
export const createPathSample = (): PathSample => ({ pos: new THREE.Vector3(), yaw: 0, pitch: 0, visible: true })

export const pathEases = { inOut: (x: number) => x * x * (3 - 2 * x), out: (x: number) => 1 - (1 - x) ** 3, in: (x: number) => x ** 3, linear: (x: number) => x }
export function bakePath(keys: PathKey[]): Path {
  let yaw = 0, pitch = 0
  return keys.map(k => { yaw = k.yaw ?? yaw; pitch = k.pitch ?? pitch; return { ...k, yaw, pitch } })
}
export function samplePath(path: Path, t: number, out: PathSample) {
  let b = path.findIndex(k => k.t > t)
  if (b === -1) b = path.length - 1
  const a = Math.max(0, b - 1), ka = path[a], kb = path[b]
  const x = ka === kb ? 1 : clamp01((t - ka.t) / (kb.t - ka.t))
  const e = pathEases[kb.ease ?? 'inOut'](x)
  out.visible = x >= 1 ? !kb.hide : !ka.hide
  out.pos.set(ka.p[0] + (kb.p[0] - ka.p[0]) * e, ka.p[1] + (kb.p[1] - ka.p[1]) * e + (kb.arc ?? 0) * 4 * x * (1 - x), ka.p[2] + (kb.p[2] - ka.p[2]) * e)
  const dy = Math.atan2(Math.sin(kb.yaw - ka.yaw), Math.cos(kb.yaw - ka.yaw))
  out.yaw = ka.yaw + dy * e
  out.pitch = ka.pitch + (kb.pitch - ka.pitch) * e + (kb.flip ?? 0) * x
  return out
}

/** How far along a path the figure is moving at time t (m/s), for driving a walk cycle. */
export function pathSpeed(path: Path, t: number, a: PathSample, b: PathSample) {
  samplePath(path, t - .05, a); samplePath(path, t + .05, b)
  return Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) / .1
}

const euler = new THREE.Euler(0, 0, 0, 'YXZ'), up = new THREE.Vector3()
/** Places a figure's outer group from a path sample, pivoting pitch about `pivot` meters above the feet. */
export function placeOnPath(root: THREE.Object3D, s: PathSample, pivot: number) {
  euler.set(s.pitch, s.yaw, 0, 'YXZ')
  root.quaternion.setFromEuler(euler)
  up.set(0, pivot, 0).applyQuaternion(root.quaternion)
  root.position.copy(s.pos)
  root.position.y += pivot
  root.position.sub(up)
}

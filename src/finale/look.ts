// Turns a figure's neck and head toward a world point (on top of its current pose).
import * as THREE from 'three'
import type { Figure } from './figure-kit'
import { addRotation } from './rig'

const v = new THREE.Vector3()
/** yaw: the figure's facing; eye: height of the eyes above its feet; weight 0..1 blends the turn in. */
export function lookToward(f: Figure, position: THREE.Vector3, yaw: number, target: THREE.Vector3, weight = 1, eye = 1.5, limit = 1.1) {
  if (weight <= 0) return
  v.copy(target).sub(position)
  const rel = Math.atan2(v.x, v.z) - yaw
  const ly = THREE.MathUtils.clamp(Math.atan2(Math.sin(rel), Math.cos(rel)), -limit, limit) * weight
  const lp = THREE.MathUtils.clamp(-Math.atan2(v.y - eye, Math.hypot(v.x, v.z)), -.6, .45) * weight
  addRotation(f.joints, 'neck', lp * .5, ly * .55, 0)
  addRotation(f.joints, 'head', lp * .4, ly * .4, 0)
}

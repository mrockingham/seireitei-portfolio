// Ambient creatures, all instanced and all pure functions of time: hell butterflies (jigokuchō)
// fluttering around landmarks, and birds circling high over the city.
import * as THREE from 'three'
import { hash } from '../finale/timeline'

type V3 = [number, number, number]
export type ButterflyHome = { center: V3; radius: number; count: number }

/** One wing, lying flat in the XZ plane, root along the body at the origin, extending along +X. */
function wingGeometry(points: [number, number][]) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y))))
  g.rotateX(-Math.PI / 2)
  return g
}

abstract class Winged {
  readonly mesh: THREE.InstancedMesh
  protected readonly m = new THREE.Matrix4(); protected readonly q = new THREE.Quaternion(); protected readonly qf = new THREE.Quaternion(); protected readonly qw = new THREE.Quaternion()
  protected readonly p = new THREE.Vector3(); protected readonly s = new THREE.Vector3(); protected readonly e = new THREE.Euler(0, 0, 0, 'YXZ'); protected readonly z = new THREE.Vector3(0, 0, 1)
  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, count: number) {
    this.mesh = new THREE.InstancedMesh(geometry, material, count * 2)
    this.mesh.frustumCulled = false
  }
  dispose() { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); this.mesh.dispose() }
  /** Writes both wings of creature i: body at p facing yaw/pitch, wings raised by flap. */
  protected wings(i: number, p: THREE.Vector3, yaw: number, pitch: number, flap: number, size: number) {
    this.q.setFromEuler(this.e.set(pitch, yaw, 0))
    for (const side of [1, -1]) {
      this.qf.setFromAxisAngle(this.z, side * flap)
      this.m.compose(p, this.qw.copy(this.q).multiply(this.qf), this.s.set(side * size, size, size))
      this.mesh.setMatrixAt(i * 2 + (side > 0 ? 0 : 1), this.m)
    }
  }
}

/** Hell butterflies: black swallowtails with a violet sheen, drifting around their home points. */
export class HellButterflies extends Winged {
  private readonly list: { c: V3; r: number; phase: number; speed: number }[]
  private readonly a = new THREE.Vector3(); private readonly b = new THREE.Vector3()
  constructor(homes: ButterflyHome[]) {
    const list = homes.flatMap((h, hi) => Array.from({ length: h.count }, (_, k) => ({ c: h.center, r: h.radius, phase: hash(hi * 13 + k * 7.1) * 6.28, speed: .55 + hash(hi * 5 + k) * .4 })))
    const geo = wingGeometry([[0, .02], [.07, .1], [.19, .12], [.26, .06], [.22, -.01], [.14, -.04], [.19, -.14], [.13, -.12], [.08, -.06], [0, -.04]])
    const mat = new THREE.MeshStandardMaterial({ color: '#15111b', emissive: '#40205c', emissiveIntensity: .5, roughness: .4, side: THREE.DoubleSide })
    super(geo, mat, list.length)
    this.list = list
    this.mesh.castShadow = false
  }
  private pos(b: { c: V3; r: number; phase: number; speed: number }, t: number, out: THREE.Vector3) {
    const u = t * b.speed, f = b.phase
    return out.set(
      b.c[0] + Math.sin(u * .7 + f) * b.r + Math.sin(u * 1.9 + 2 * f) * .6,
      b.c[1] + 1.9 + Math.sin(u * 1.1 + f) * .6 + Math.sin(t * 5 + f) * .06,
      b.c[2] + Math.cos(u * .5 + 1.3 * f) * b.r * .8 + Math.cos(u * 2.3 + f) * .5,
    )
  }
  update(t: number) {
    this.list.forEach((b, i) => {
      this.pos(b, t, this.a); this.pos(b, t + .08, this.b)
      const dx = this.b.x - this.a.x, dz = this.b.z - this.a.z, dy = this.b.y - this.a.y
      const flap = .15 + 1.0 * (.5 + .5 * Math.sin(t * 15 + b.phase * 3))
      this.wings(i, this.a, Math.atan2(dx, dz), -Math.atan2(dy, Math.hypot(dx, dz)) * .5, flap, .7)
    })
    this.mesh.instanceMatrix.needsUpdate = true
  }
}

/** Two flocks of birds wheeling high over the city. */
export class Birds extends Winged {
  private readonly list: { c: V3; r: number; w: number; off: V3; phase: number }[]
  constructor() {
    const flocks: { c: V3; r: number; w: number }[] = [{ c: [5, 34, -25], r: 42, w: .075 }, { c: [-10, 42, -60], r: 30, w: -.06 }]
    const list = flocks.flatMap((f, fi) => Array.from({ length: 7 }, (_, k) => ({ ...f, off: [(k % 2 ? 1 : -1) * Math.ceil(k / 2) * 1.6, (hash(k + fi) - .5) * 1.5, -Math.ceil(k / 2) * 1.4] as V3, phase: hash(k * 3.3 + fi) * 6 })))
    const geo = wingGeometry([[0, .06], [.35, .02], [.6, -.08], [.3, -.05], [0, -.06]])
    super(geo, new THREE.MeshBasicMaterial({ color: '#2d3139', side: THREE.DoubleSide }), list.length)
    this.list = list
  }
  update(t: number) {
    this.list.forEach((b, i) => {
      const a = t * b.w + b.phase * .02, dir = Math.sign(b.w)
      // Circle, then offset each bird in the flock's own frame (a loose V).
      const fx = Math.cos(a) * b.r, fz = Math.sin(a) * b.r
      const tx = -Math.sin(a) * dir, tz = Math.cos(a) * dir
      this.p.set(b.c[0] + fx + tx * b.off[2] + tz * b.off[0], b.c[1] + b.off[1] + Math.sin(t * .6 + b.phase) * .8, b.c[2] + fz + tz * b.off[2] - tx * b.off[0])
      const glide = Math.sin(t * .5 + b.phase) > .3
      const flap = glide ? .08 : .45 * Math.sin(t * 7 + b.phase)
      this.wings(i, this.p, Math.atan2(tx, tz), 0, flap, 1)
    })
    this.mesh.instanceMatrix.needsUpdate = true
  }
}

/**
 * A swarm of hell butterflies bursting outward and upward from a point, for arrivals through the
 * Senkaimon. update(t) takes seconds since the burst; they are gone after about four seconds.
 */
export class ButterflyBurst extends Winged {
  private readonly count: number
  constructor(count = 18) {
    const geo = wingGeometry([[0, .02], [.07, .1], [.19, .12], [.26, .06], [.22, -.01], [.14, -.04], [.19, -.14], [.13, -.12], [.08, -.06], [0, -.04]])
    const mat = new THREE.MeshStandardMaterial({ color: '#15111b', emissive: '#5a2a86', emissiveIntensity: .7, roughness: .4, side: THREE.DoubleSide })
    super(geo, mat, count)
    this.count = count
    this.mesh.castShadow = false
  }
  update(t: number) {
    this.mesh.visible = t > 0 && t < 4.2
    if (!this.mesh.visible) return
    for (let i = 0; i < this.count; i++) {
      const h = hash(i * 3.3), k = hash(i * 7.9)
      // Spiral out and up, each on its own orbit, then shrink away.
      const a = i / this.count * Math.PI * 2 + t * (1.4 + h) * (i % 2 ? 1 : -1)
      const r = .5 + t * (1.1 + k * 1.2)
      this.p.set(Math.sin(a) * r, .6 + t * (.9 + h * .9) + Math.sin(t * 3 + i) * .15, Math.cos(a) * r)
      const flap = .15 + (.5 + .5 * Math.sin(t * 16 + i * 1.7))
      const size = .75 * Math.min(1, t * 3) * (1 - THREE.MathUtils.smoothstep(t, 3.0, 4.1))
      this.wings(i, this.p, a + Math.PI / 2 * (i % 2 ? 1 : -1), -.3, flap, Math.max(.001, size))
    }
    this.mesh.instanceMatrix.needsUpdate = true
  }
}

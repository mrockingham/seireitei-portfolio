// Hyōrinmaru's ice dragon. The head flies a keyframed path; the body is the last ~10 m of that
// path (arc-length sampled), so it pours out of the blade, coils, and dives like a serpent at
// any frame rate. Body, spines, and wing crystals are instanced; the head is a small rig.
// On the finishing Getsuga the whole dragon freezes and shatters from head to tail.
import * as THREE from 'three'
import { clamp01, easeOutCubic, hash, ramp, window4 } from '../finale/timeline'
import { BARRACKS_FINISH as F, BT, ICHIGO_HALL_END, TOSHIRO_MARK } from './timeline'

type K = [number, number, number, number]
const [TX, , TZ] = TOSHIRO_MARK, IZE = ICHIGO_HALL_END[2]
// [time on the dragon's path clock, x, y, z]. Finish keys are re-based to follow the reveal.
const R0 = BT.reveal
const keys: K[] = [
  [0, TX, 2.35, TZ + .3], [BT.dragonOut, TX, 2.35, TZ + .3],
  // Pours out of the raised blade and spirals up around Tōshirō.
  [3.3, TX + 1.5, 2.95, TZ], [3.55, TX, 3.6, TZ - 1.7], [3.8, TX - 1.9, 4.2, TZ], [4.05, TX, 4.8, TZ + 2.0], [4.3, TX + 2.2, 5.3, TZ - .2], [4.6, TX + .6, 5.75, TZ - 2.3],
  // Rears under the ceiling and roars, then settles to face Ichigo.
  [4.95, TX - .6, 5.95, TZ - 2.0], [5.4, TX - 1.1, 5.4, TZ - 1.1], [6.0, TX - .5, 5.0, TZ + .3],
  // Anticipation, dive into Ichigo's guard, recoil.
  [6.5, TX - .2, 5.95, TZ - 1.4], [6.75, TX - .1, 5.9, TZ - 1.2], [6.97, TX, 4.4, TZ + 2.2], [7.15, TX, 2.3, IZE - 2.4], [BT.impact, TX, 1.55, IZE - 1.25],
  [7.5, TX + .4, 3.1, IZE - 2.9], [7.8, TX + 2.4, 4.8, TZ + 2.4],
  // Circles the hall, then coils around Tōshirō with its head beside him.
  [8.3, TX + 4.5, 5.4, TZ - .3], [8.55, TX + 1.5, 5.8, TZ - 4.2], [8.8, TX - 4.0, 5.3, TZ - 1.8], [9.05, TX - 3.8, 4.8, TZ + 3.0], [9.2, TX - 1.2, 4.6, TZ + 3.6],
  [9.5, TX + 2.0, 3.8, TZ + 1.0], [9.85, TX + .2, 3.3, TZ - 2.0], [10.2, TX - 1.8, 3.6, TZ + .4], [R0, TX - .9, 3.9, TZ + 1.6],
  // Finish: lunges in front of Tōshirō to intercept the Getsuga.
  [R0 + 1.35, TX - .6, 3.7, TZ + 1.9], [R0 + (BT.intercept - F), TX, 2.0, TZ + 1.9],
  [R0 + 10, TX, 2.0, TZ + 1.9],
]
const pathTime = (t: number) => t < R0 ? t : t < F ? R0 : R0 + (t - F)

function catmull(t: number, out: THREE.Vector3) {
  let i = keys.findIndex(k => k[0] > t)
  if (i === -1) return out.set(keys[keys.length - 1][1], keys[keys.length - 1][2], keys[keys.length - 1][3])
  if (i === 0) return out.set(keys[0][1], keys[0][2], keys[0][3])
  i -= 1
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)]
  const u = clamp01((t - k1[0]) / (k2[0] - k1[0])), u2 = u * u, u3 = u2 * u
  const cr = (a: number, b: number, c: number, d: number) => .5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3)
  return out.set(cr(k0[1], k1[1], k2[1], k3[1]), cr(k0[2], k1[2], k2[2], k3[2]), cr(k0[3], k1[3], k2[3], k3[3]))
}

export const DRAGON_SEGMENTS = 72
const SPACING = .14
const radiusAt = (k: number) => {
  const u = k / (DRAGON_SEGMENTS - 1)
  return (u < .1 ? .24 + u * 1.1 : .35 * (1 - (u - .1) / .9) ** .75 + .035)
}

const iceRim = (mat: THREE.MeshStandardMaterial, key: string) => {
  mat.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float iceRim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);
      totalEmissiveRadiance += vec3(.75, .95, 1.0) * iceRim * .9;`)
  }
  mat.customProgramCacheKey = () => key
  return mat
}

export class IceDragon {
  readonly group = new THREE.Group()
  readonly head = new THREE.Group()
  private readonly jaw = new THREE.Group()
  private readonly body: THREE.InstancedMesh
  private readonly spines: THREE.InstancedMesh
  private readonly wings: THREE.InstancedMesh
  private readonly mats: THREE.Material[] = []
  private readonly pts = Array.from({ length: DRAGON_SEGMENTS }, () => new THREE.Vector3())
  private readonly frozen = Array.from({ length: DRAGON_SEGMENTS }, () => new THREE.Vector3())
  private readonly a = new THREE.Vector3()
  private readonly b = new THREE.Vector3()
  private readonly dir = new THREE.Vector3()
  private readonly side = new THREE.Vector3()
  private readonly up = new THREE.Vector3()
  private readonly worldUp = new THREE.Vector3(0, 1, 0)
  private readonly m = new THREE.Matrix4()
  private readonly basis = new THREE.Matrix4()
  private readonly q = new THREE.Quaternion()
  private readonly s = new THREE.Vector3()
  private readonly e = new THREE.Euler()
  private readonly q2 = new THREE.Quaternion()
  private readonly q3 = new THREE.Quaternion()
  private readonly xAxis = new THREE.Vector3(1, 0, 0)
  /** Head position this frame (for lights and the camera). */
  readonly headPos = new THREE.Vector3()

  constructor(envMap: THREE.Texture) {
    const ice = iceRim(new THREE.MeshStandardMaterial({ color: '#98d8f0', emissive: '#1f86b4', emissiveIntensity: .42, roughness: .14, metalness: .08, envMap, envMapIntensity: 1.1, flatShading: true }), 'dragon-ice-v1')
    const crystal = iceRim(new THREE.MeshStandardMaterial({ color: '#e8fbff', emissive: '#5fcbef', emissiveIntensity: .45, roughness: .08, metalness: .05, envMap, flatShading: true }), 'dragon-crystal-v1')
    const eye = new THREE.MeshBasicMaterial({ color: '#ff5d78' }), mouth = new THREE.MeshStandardMaterial({ color: '#2b7da0', roughness: .4 })
    this.mats.push(ice, crystal, eye, mouth)
    this.body = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), ice, DRAGON_SEGMENTS)
    this.spines = new THREE.InstancedMesh(new THREE.ConeGeometry(.35, 1, 4).translate(0, .5, 0), crystal, DRAGON_SEGMENTS)
    this.wings = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0).scale(.12, 1, .03).translate(0, 1, 0), crystal, 12)
    for (const mesh of [this.body, this.spines, this.wings]) { mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.castShadow = true; mesh.frustumCulled = false }
    // Head: long skull, snout, hinged jaw, swept horns, glowing eyes, teeth, beard crystals.
    const add = (parent: THREE.Object3D, g: THREE.BufferGeometry, mat: THREE.Material, p: [number, number, number], s: [number, number, number] = [1, 1, 1], r: [number, number, number] = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(g, mat); mesh.position.set(...p); mesh.scale.set(...s); mesh.rotation.set(...r); mesh.castShadow = true; parent.add(mesh); return mesh
    }
    const ico = new THREE.IcosahedronGeometry(1, 1), oct = new THREE.OctahedronGeometry(1, 0), coneG = new THREE.ConeGeometry(1, 1, 5)
    add(this.head, ico, ice, [0, 0, 0], [.34, .3, .5])
    add(this.head, oct, ice, [0, .02, .52], [.22, .15, .4])
    add(this.head, oct, crystal, [0, .16, .2], [.08, .1, .35], [.2, 0, 0])
    for (const s of [-1, 1]) {
      add(this.head, coneG, crystal, [s * .2, .26, -.32], [.07, .9, .07], [-1.15, 0, s * -.35])
      add(this.head, coneG, crystal, [s * .3, .05, -.2], [.06, .55, .06], [-1.3, 0, s * -.9])
      add(this.head, new THREE.SphereGeometry(1, 8, 6), eye, [s * .19, .1, .28], [.05, .035, .07])
      for (const z of [.35, .55, .72]) add(this.head, coneG, crystal, [s * .12, -.1, z], [.025, .09, .025], [Math.PI, 0, 0])
    }
    this.jaw.position.set(0, -.1, .1)
    add(this.jaw, oct, ice, [0, -.04, .35], [.19, .07, .42])
    add(this.jaw, oct, mouth, [0, .02, .3], [.15, .03, .34])
    for (const s of [-1, 1]) for (const z of [.3, .5]) add(this.jaw, coneG, crystal, [s * .1, .04, z], [.022, .08, .022])
    for (let k = 0; k < 5; k++) add(this.jaw, coneG, crystal, [(k - 2) * .07, -.12, .12], [.03, .28, .03], [Math.PI - .3, 0, (k - 2) * .15])
    this.head.add(this.jaw)
    this.group.add(this.body, this.spines, this.wings, this.head)
    this.group.name = 'hyorinmaru'
    this.group.visible = false
  }
  dispose() {
    for (const mesh of [this.body, this.spines, this.wings]) { mesh.geometry.dispose(); mesh.dispose() }
    this.head.traverse(o => { if (o instanceof THREE.Mesh) o.geometry.dispose() })
    this.mats.forEach(m => m.dispose())
  }

  /** Arc-length samples the head's recent path into `out`; returns how many segments exist. */
  private sampleBody(time: number, out: THREE.Vector3[], sway: THREE.Vector3 | null) {
    const pt = pathTime(time)
    catmull(pt, out[0])
    let count = 1, travelled = 0, step = .006, tb = pt
    this.a.copy(out[0])
    while (count < out.length && tb > 0 && pt - tb < 9) {
      tb -= step
      catmull(tb, this.b)
      travelled += this.b.distanceTo(this.a)
      this.a.copy(this.b)
      while (count < out.length && travelled >= count * SPACING) out[count++].copy(this.b)
    }
    if (sway) for (let k = 0; k < count; k++) out[k].addScaledVector(sway, (1 - k / out.length) ** 2)
    return count
  }

  /** Returns the dragon's light strength (0 while hidden). */
  update(t: number) {
    const live = t >= BT.dragonOut
    this.group.visible = live
    if (!live) { this.headPos.set(TX, 2.35, TZ + .3); return 0 }
    // During the reveal the dragon breathes and sways in its coil around Tōshirō.
    const hover = t >= R0 && t < F + 1.3 ? ramp(t, R0, R0 + 1.5) * (1 - ramp(t, F + .9, F + 1.3)) : 0
    this.s.set(Math.sin(t * .8) * .35, Math.sin(t * 1.1) * .22, Math.cos(t * .7) * .25).multiplyScalar(hover)
    const shatterAt = BT.intercept + .04
    const shattering = t >= shatterAt
    let count: number
    if (shattering) {
      count = this.sampleBody(shatterAt, this.frozen, null)
      for (let k = 0; k < count; k++) this.pts[k].copy(this.frozen[k])
    } else count = this.sampleBody(t, this.pts, hover > 0 ? this.s : null)
    this.headPos.copy(this.pts[0])
    const bodyArr = this.body.instanceMatrix.array as Float32Array, spineArr = this.spines.instanceMatrix.array as Float32Array
    for (let k = 0; k < DRAGON_SEGMENTS; k++) {
      if (k >= count) { bodyArr.fill(0, k * 16, k * 16 + 16); spineArr.fill(0, k * 16, k * 16 + 16); continue }
      const p = this.pts[k], next = this.pts[Math.min(count - 1, k + 1)], prev = this.pts[Math.max(0, k - 1)]
      this.dir.subVectors(prev, next)
      if (this.dir.lengthSq() < 1e-8) this.dir.set(0, 0, 1)
      this.dir.normalize()
      this.side.crossVectors(this.worldUp, this.dir)
      if (this.side.lengthSq() < 1e-6) this.side.set(1, 0, 0)
      this.side.normalize()
      this.up.crossVectors(this.dir, this.side)
      // Emerging segments grow out of the blade; the tip of the tail tapers to nothing.
      const grow = clamp01((count - k) / 3)
      let r = radiusAt(k) * grow, x = p.x, y = p.y, z = p.z, spin = 0
      if (shattering) {
        const ts = shatterAt + k * .011, f = Math.max(0, t - ts)
        if (f > 0) {
          const h = hash(k * 7.3)
          x += (this.side.x * (h - .5) * 5 + this.up.x) * f * 2.2; z += (this.side.z * (h - .5) * 5) * f * 2.2
          y += (1.5 + h * 2) * f - 4.9 * f * f
          y = Math.max(y, .7)
          r *= 1 - ramp(f, .4, 1.1)
          spin = f * (8 + h * 6)
        }
      }
      this.basis.makeBasis(this.side, this.up, this.dir)
      this.q.setFromRotationMatrix(this.basis)
      if (spin) this.q.multiply(this.q2.setFromEuler(this.e.set(spin, spin * .6, 0)))
      this.m.compose(this.a.set(x, y, z), this.q, this.b.set(r * 1.05, r * .92, SPACING * 1.25 + r * .6)).toArray(bodyArr, k * 16)
      if (k % 2 === 0 && k > 4 && k < count - 3) {
        const len = r * 1.7
        this.m.compose(this.a.set(x, y, z).addScaledVector(this.up, r * .7), this.q2.copy(this.q).multiply(this.q3.setFromAxisAngle(this.xAxis, -.5)), this.b.set(r * .55, len, r * .55)).toArray(spineArr, k * 16)
      } else spineArr.fill(0, k * 16, k * 16 + 16)
    }
    // Wings: two fans of crystals at the shoulders, beating slowly; folded in the dive.
    const wingArr = this.wings.instanceMatrix.array as Float32Array, shoulder = 9
    const wingScale = count > shoulder + 2 ? clamp01((count - shoulder) / 6) * (shattering ? 1 - ramp(t - shatterAt, .12, .6) : 1) : 0
    const fold = window4(t, 6.8, 7.0, BT.impact + .1, BT.impact + .5)
    const beat = Math.sin(t * 3.4) * .3
    if (wingScale > 0) {
      const p = this.pts[shoulder], n = this.pts[shoulder + 1]
      this.dir.subVectors(this.pts[shoulder - 1], n).normalize()
      this.side.crossVectors(this.worldUp, this.dir).normalize()
      this.up.crossVectors(this.dir, this.side)
      this.basis.makeBasis(this.side, this.up, this.dir)
      const base = this.q3.setFromRotationMatrix(this.basis)
      for (let w = 0; w < 12; w++) {
        const s = w < 6 ? 1 : -1, i = w % 6
        const spread = (.35 + i * .2) * (1 - fold * .7) + beat * (1 - fold)
        this.e.set(-.5 - i * .18, 0, s * (Math.PI / 2 - spread))
        this.q.copy(base).multiply(this.q2.setFromEuler(this.e))
        const len = (.85 + (i < 3 ? i * .28 : (5 - i) * .24)) * wingScale
        this.m.compose(this.a.copy(p).addScaledVector(this.side, s * .25).addScaledVector(this.up, .2), this.q, this.b.set(1.3, len, 1.3)).toArray(wingArr, w * 16)
      }
    } else wingArr.fill(0)
    this.body.instanceMatrix.needsUpdate = true; this.spines.instanceMatrix.needsUpdate = true; this.wings.instanceMatrix.needsUpdate = true
    // Head looks along its flight; the jaw opens for the roar and the strike.
    const headAway = shattering ? ramp(t - shatterAt, 0, .25) : 0
    this.head.visible = count > 1 && headAway < 1
    if (count > 1) {
      this.dir.subVectors(this.pts[0], this.pts[Math.min(3, count - 1)]).normalize()
      this.head.position.copy(this.pts[0]).addScaledVector(this.dir, .2)
      this.head.lookAt(this.a.copy(this.head.position).add(this.dir))
      const s = clamp01(count / 4) * (1 - headAway) * 1.05
      this.head.scale.setScalar(Math.max(.001, s))
    }
    this.jaw.rotation.x = .08 + Math.sin(t * 2.2) * .04 + window4(t, BT.roar - .1, BT.roar + .15, 5.2, 5.5) * .7 + window4(t, 6.85, 7.0, BT.impact + .05, BT.impact + .3) * .55 + window4(t, BT.intercept - .3, BT.intercept - .1, BT.intercept, BT.intercept + .1) * .6
    return shattering ? 1 - ramp(t - shatterAt, .2, 1.2) : .6 + .4 * easeOutCubic(ramp(t, BT.dragonOut, BT.dragonOut + .8))
  }
}

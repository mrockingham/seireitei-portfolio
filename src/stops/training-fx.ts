// Powers for the training grounds, all pure functions of the loop time: Uryū's arrows,
// Chad's El Directo, and Orihime's Santen Kesshun (triangle shield), Sōten Kisshun (healing dome),
// and the fairies that fly out of her hairpins to form them.
import * as THREE from 'three'
import type { Burst, FlashEvent, RingEvent } from '../finale/effects'
import { easeOutBack, easeOutCubic, lin, window4 } from '../finale/timeline'
import type { Arrow } from './training'
import { CHAD_FIST, CHAD_MARK, SHIELD_POINT, TA, TRAINING_GROUND as G, URYU_BOW_POINT, URYU_DODGE, URYU_MARK } from './training'

const additive = (color: string) => new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
const fresnelVertex = `varying vec3 vN; varying vec3 vV;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`
function glowShell(color: string, rim = 1.4) {
  return new THREE.ShaderMaterial({
    vertexShader: fresnelVertex,
    fragmentShader: `uniform vec3 uColor; uniform float uAlpha; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), ${rim.toFixed(2)}); gl_FragColor = vec4(uColor, (f * .8 + .12) * uAlpha); }`,
    uniforms: { uColor: { value: new THREE.Color(color) }, uAlpha: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
  })
}

/** Instanced spirit arrows: thin glowing shafts flying along straight lines. */
export class Arrows {
  readonly mesh: THREE.InstancedMesh
  private readonly list: Arrow[]
  private readonly m = new THREE.Matrix4(); private readonly q = new THREE.Quaternion(); private readonly p = new THREE.Vector3(); private readonly s = new THREE.Vector3(); private readonly d = new THREE.Vector3(); private readonly z = new THREE.Vector3(0, 0, 1)
  constructor(list: Arrow[]) {
    this.list = list
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0, -.5), additive('#a8ecff'), list.length)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 12
  }
  dispose() { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); this.mesh.dispose() }
  update(t: number) {
    this.list.forEach((a, i) => {
      const x = (t - a.t) / a.dur
      if (x < 0 || x > 1) { this.m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this.m); return }
      this.p.set(a.from[0] + (a.to[0] - a.from[0]) * x, a.from[1] + (a.to[1] - a.from[1]) * x, a.from[2] + (a.to[2] - a.from[2]) * x)
      this.d.set(a.to[0] - a.from[0], a.to[1] - a.from[1], a.to[2] - a.from[2]).normalize()
      this.q.setFromUnitVectors(this.z, this.d)
      this.m.compose(this.p, this.q, this.s.set(.028, .028, .75))
      this.mesh.setMatrixAt(i, this.m)
    })
    this.mesh.instanceMatrix.needsUpdate = true
  }
}

/** El Directo: a blue-white fist of energy with a trailing shock cone. */
export class Directo {
  readonly group = new THREE.Group()
  private readonly core: THREE.Mesh
  private readonly coreMat = glowShell('#dff6ff', 1.1)
  private readonly trail: THREE.Mesh
  private readonly trailMat = glowShell('#6fcaff', 1.8)
  constructor() {
    this.core = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), this.coreMat)
    this.trail = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 18, 1, true).rotateZ(Math.PI / 2).translate(-.5, 0, 0), this.trailMat)
    this.group.add(this.trail, this.core)
    this.group.renderOrder = 13
    this.group.visible = false
  }
  dispose() { this.core.geometry.dispose(); this.trail.geometry.dispose(); this.coreMat.dispose(); this.trailMat.dispose() }
  update(t: number) {
    const x = lin(t, TA.directo, TA.impact)
    this.group.visible = t >= TA.directo && t < TA.impact + .05
    if (!this.group.visible) return
    this.group.position.set(CHAD_FIST[0] + (SHIELD_POINT[0] - .25 - CHAD_FIST[0]) * x, CHAD_FIST[1] + (SHIELD_POINT[1] - CHAD_FIST[1]) * x, CHAD_FIST[2] + (SHIELD_POINT[2] - CHAD_FIST[2]) * x)
    const grow = easeOutCubic(lin(t, TA.directo, TA.directo + .12))
    this.core.scale.setScalar(.12 + .26 * grow)
    this.trail.scale.set(.9 + 1.4 * grow, .32 * grow + .01, .32 * grow + .01)
    ;(this.coreMat.uniforms.uAlpha as { value: number }).value = .95
    ;(this.trailMat.uniforms.uAlpha as { value: number }).value = .7
  }
}

/** Santen Kesshun: a golden triangle held by three fairies, facing back toward Chad (-X). */
export class TriShield {
  readonly group = new THREE.Group()
  private readonly face: THREE.Mesh
  private readonly faceMat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uAlpha; uniform float uHit; varying vec2 vUv;
      void main(){ float r = length(vUv - vec2(.5, .38)) * 2.0; float a = (.22 + .5 * smoothstep(.2, .95, r) + uHit * .5) * uAlpha; gl_FragColor = vec4(mix(vec3(1.0, .72, .25), vec3(1.0, .95, .75), uHit), a); }`,
    uniforms: { uAlpha: { value: 0 }, uHit: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
  })
  private readonly edges: THREE.Mesh[] = []
  private readonly edgeMat = additive('#ffd27a')
  /** Corner positions (world), for the fairies. */
  readonly corners: THREE.Vector3[]
  constructor() {
    const s = 1.55, h = s * Math.sqrt(3) / 2
    const pts = [new THREE.Vector2(-s / 2, -h / 3), new THREE.Vector2(s / 2, -h / 3), new THREE.Vector2(0, h * 2 / 3)]
    const shape = new THREE.Shape(pts)
    const geo = new THREE.ShapeGeometry(shape)
    // Map UVs across the triangle's bounds for the radial glow.
    const pos = geo.attributes.position, uv = geo.attributes.uv
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + s / 2) / s, (pos.getY(i) + h / 3) / h)
    this.face = new THREE.Mesh(geo, this.faceMat)
    this.group.add(this.face)
    const edgeGeo = new THREE.BoxGeometry(1, .03, .03)
    for (let i = 0; i < 3; i++) {
      const a = pts[i], b = pts[(i + 1) % 3]
      const e = new THREE.Mesh(edgeGeo, this.edgeMat)
      e.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0); e.scale.x = a.distanceTo(b); e.rotation.z = Math.atan2(b.y - a.y, b.x - a.x)
      this.edges.push(e); this.group.add(e)
    }
    this.group.position.set(...SHIELD_POINT)
    this.group.rotation.y = -Math.PI / 2
    this.group.renderOrder = 12
    this.group.visible = false
    this.group.updateMatrixWorld(true)
    this.corners = pts.map(p => new THREE.Vector3(p.x, p.y, 0).applyMatrix4(this.group.matrixWorld))
  }
  dispose() { this.face.geometry.dispose(); this.edges[0].geometry.dispose(); this.faceMat.dispose(); this.edgeMat.dispose() }
  update(t: number) {
    const strength = window4(t, TA.shield - .05, TA.shield + .08, TA.shieldEnd - .15, TA.shieldEnd + .1)
    this.group.visible = strength > .01
    if (!this.group.visible) return
    const hit = Math.exp(-Math.max(0, t - TA.impact) * 6) * (t >= TA.impact ? 1 : 0)
    this.faceMat.uniforms.uAlpha.value = strength
    this.faceMat.uniforms.uHit.value = hit
    this.edgeMat.opacity = strength
    this.group.scale.setScalar(.6 + .4 * easeOutBack(lin(t, TA.shield - .05, TA.shield + .15)) + hit * .06)
  }
}

/** Sōten Kisshun: a warm dome of light over Chad while he heals. */
export class Dome {
  readonly mesh: THREE.Mesh
  private readonly mat = glowShell('#ffcf7a', 1.2)
  constructor() {
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), this.mat)
    this.mesh.position.set(CHAD_MARK[0] + .35, G, CHAD_MARK[2] + .35)
    this.mesh.renderOrder = 12
    this.mesh.visible = false
  }
  dispose() { this.mesh.geometry.dispose(); this.mat.dispose() }
  update(t: number) {
    const s = window4(t, TA.heal, TA.heal + .3, TA.healEnd, TA.healEnd + .4)
    this.mesh.visible = s > .01
    if (!this.mesh.visible) return
    const grow = easeOutBack(lin(t, TA.heal, TA.heal + .35))
    this.mesh.scale.set(1.35 * grow, 1.45 * grow, 1.1 * grow)
    this.mat.uniforms.uAlpha.value = s * (.55 + .12 * Math.sin(t * 5))
  }
}

/**
 * Orihime's fairies: glowing sparks that leave her hairpins, hold a formation, and return.
 * Each flight: [depart, arrive, leave, home] times and a target (world).
 */
export class Fairies {
  readonly mesh: THREE.InstancedMesh
  private readonly m = new THREE.Matrix4(); private readonly p = new THREE.Vector3(); private readonly q = new THREE.Quaternion(); private readonly s = new THREE.Vector3()
  private readonly flights: { times: [number, number, number, number]; target: THREE.Vector3 }[]
  private static readonly TRAIL = 4
  constructor(flights: { times: [number, number, number, number]; target: THREE.Vector3 }[]) {
    this.flights = flights
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), additive('#fff0b8'), flights.length * Fairies.TRAIL)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 14
  }
  dispose() { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); this.mesh.dispose() }
  /** pin: world position of her hairpin this frame. */
  update(t: number, pin: THREE.Vector3) {
    this.flights.forEach((f, i) => {
      for (let k = 0; k < Fairies.TRAIL; k++) {
        const tk = t - k * .025
        const [d0, a0, l0, h0] = f.times
        const out = lin(tk, d0, a0), back = lin(tk, l0, h0)
        const active = tk >= d0 && tk < h0
        if (!active) { this.m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i * Fairies.TRAIL + k, this.m); continue }
        const u = back > 0 ? 1 - back : out, e = u * u * (3 - 2 * u)
        this.p.lerpVectors(pin, f.target, e)
        this.p.y += Math.sin(Math.PI * e) * .45 + Math.sin(tk * 9 + i * 2) * .03 * (out >= 1 && back <= 0 ? 1 : 0)
        const size = (k === 0 ? .035 : .024 - k * .004) * (1 + .3 * Math.sin(tk * 20 + i))
        this.m.compose(this.p, this.q, this.s.setScalar(Math.max(.004, size)))
        this.mesh.setMatrixAt(i * Fairies.TRAIL + k, this.m)
      }
    })
    this.mesh.instanceMatrix.needsUpdate = true
  }
}

// --- Event lists (loop time) ---------------------------------------------------------------------
const blue = ['#dff9ff', '#8fe3ff', '#ffffff']
const gold = ['#fff0b8', '#ffd27a', '#ffffff']
const dirt = ['#cdb58c', '#bfa47a', '#d9c6a2']
export function trainingSparks(arrows: Arrow[]): Burst[] {
  const out: Burst[] = [
    { t: TA.bow, spread: .2, count: 30, origin: [URYU_BOW_POINT[0], URYU_BOW_POINT[1], URYU_BOW_POINT[2]], box: [.05, .3, .05], radial: true, speed: [.3, 1.2], life: [.3, .7], size: [.03, .06], colors: blue },
    { t: TA.armor, spread: .15, count: 50, origin: [CHAD_MARK[0] + .2, G + 1.3, CHAD_MARK[2] - .2], box: [.15, .3, .15], radial: true, speed: [.8, 2.6], drag: 1.5, life: [.3, .7], size: [.04, .07], colors: ['#ff5a6a', '#ffffff', '#c21e30'] },
    { t: TA.impact, spread: .05, count: 150, origin: [SHIELD_POINT[0] - .1, SHIELD_POINT[1], SHIELD_POINT[2]], box: [.1, .4, .4], radial: true, speed: [2, 6], vel: [-1.5, .8, 0], gravity: 5, drag: 1.2, life: [.35, .9], size: [.05, .1], colors: [...blue, ...gold] },
    { t: TA.heal + .1, spread: 2, count: 60, origin: [CHAD_MARK[0] + .35, G + .4, CHAD_MARK[2] + .35], box: [.8, .3, .6], vel: [0, .8, 0], radial: true, speed: [.05, .3], life: [.8, 1.4], size: [.03, .06], colors: gold },
  ]
  arrows.forEach(a => {
    if (a.to[1] > G + 10) return
    out.push({ t: a.t + a.dur, count: a.to[1] > G + .5 ? 16 : 10, origin: a.to, box: [.05, .05, .05], radial: true, speed: [1, 3.5], vel: [0, 1, 0], gravity: 5, drag: 1.4, life: [.2, .5], size: [.03, .06], colors: blue })
  })
  return out
}
export function trainingDust(arrows: Arrow[]): Burst[] {
  const out: Burst[] = [
    { t: TA.dodge, count: 12, origin: [URYU_MARK[0], G + .08, URYU_MARK[2]], box: [.15, .03, .15], radial: true, flat: true, up: .15, speed: [.6, 1.5], drag: 2.2, life: [.6, 1], size: [.25, .45], colors: dirt },
    { t: TA.dodge + .07, count: 12, origin: [URYU_DODGE[0], G + .08, URYU_DODGE[2]], box: [.15, .03, .15], radial: true, flat: true, up: .15, speed: [.6, 1.5], drag: 2.2, life: [.6, 1], size: [.25, .45], colors: dirt },
    { t: TA.directo, count: 18, origin: [CHAD_MARK[0], G + .08, CHAD_MARK[2]], box: [.3, .03, .2], radial: true, flat: true, up: .2, speed: [1, 2.5], drag: 2, life: [.7, 1.2], size: [.3, .55], colors: dirt },
    { t: TA.kneel + .1, count: 12, origin: [CHAD_MARK[0], G + .08, CHAD_MARK[2]], box: [.3, .03, .2], radial: true, flat: true, up: .2, speed: [.6, 1.5], drag: 2, life: [.6, 1], size: [.25, .45], colors: dirt },
  ]
  arrows.forEach(a => { if (a.to[1] < G + .1) out.push({ t: a.t + a.dur, count: 7, origin: [a.to[0], G + .06, a.to[2]], box: [.08, .02, .08], radial: true, flat: true, up: .5, speed: [.5, 1.5], drag: 2.2, life: [.5, .9], size: [.2, .38], colors: dirt }) })
  return out
}
export function trainingRings(): RingEvent[] {
  return [
    { t: TA.impact, x: SHIELD_POINT[0] - .1, y: SHIELD_POINT[1], z: SHIELD_POINT[2], radius: 1.5, duration: .45, color: '#fff0c0', alpha: .9, width: .07, vertical: true },
    { t: TA.directo, x: CHAD_FIST[0] + .1, y: CHAD_FIST[1], z: CHAD_FIST[2], radius: .9, duration: .3, color: '#bfeaff', alpha: .8, width: .08, vertical: true },
    { t: TA.heal, x: CHAD_MARK[0] + .35, y: G + .03, z: CHAD_MARK[2] + .35, radius: 1.8, duration: .8, color: '#ffd27a', alpha: .6, width: .05 },
  ]
}
export function trainingFlashes(): FlashEvent[] {
  return [
    { t: TA.armor, p: [CHAD_MARK[0] + .25, G + 1.3, CHAD_MARK[2] - .25], from: .1, to: .6, duration: .3, color: '#ff4a5e', alpha: .7 },
    { t: TA.bow, p: URYU_BOW_POINT, from: .1, to: .5, duration: .3, color: '#9fe9ff', alpha: .7 },
    { t: TA.impact, p: [SHIELD_POINT[0] - .15, SHIELD_POINT[1], SHIELD_POINT[2]], from: .2, to: .9, duration: .3, color: '#fff3c8', alpha: .85 },
  ]
}

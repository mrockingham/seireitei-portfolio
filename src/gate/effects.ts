// Spirit Gate effects: Sode no Shirayuki's Tsukishiro (circle, ice pillar, frost, snow),
// Zabimaru's segmented blade, and the burst/ring/flash event lists. All pure functions of
// the gate clock; dense pieces use instancing.
import * as THREE from 'three'
import { clamp01, easeOutBack, easeOutCubic, hash, lin, ramp } from '../finale/timeline'
import type { Burst, FlashEvent, RingEvent } from '../finale/effects'
import { GATE_GROUND as G, GT, ICHIGO_GATE_END, ICHIGO_GATE_MARK, RENJI_MARK, RUKIA_MARK, gateWaveZ } from './timeline'

const [IX, , IZ] = ICHIGO_GATE_MARK, IZE = ICHIGO_GATE_END[2]
const [RX, , RZ] = RUKIA_MARK, [NX, , NZ] = RENJI_MARK
/** Ichigo's guard, where Zabimaru's two strikes land. */
export const LASH_TARGET: [number, number, number] = [-.05, G + 1.13, IZE - .65]
export const SWEEP_TARGET: [number, number, number] = [.1, G + .53, IZE - .6]

const noise = `
float gHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float gNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(gHash(i),gHash(i+vec2(1,0)),f.x),mix(gHash(i+vec2(0,1)),gHash(i+vec2(1,1)),f.x),f.y);}
`
const uvVertex = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
const fresnelVertex = `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`
const shader = (vertexShader: string, fragment: string, uniforms: Record<string, THREE.IUniform>, additive: boolean) => new THREE.ShaderMaterial({
  vertexShader, fragmentShader: noise + fragment, uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false,
})

// --- Tsukishiro: the circle, the frost, the pillar ------------------------------------------
const glyphFragment = `
uniform float uDraw; uniform float uAlpha; uniform float uTime;
varying vec2 vUv;
void main(){
  vec2 p = vUv - .5; float r = length(p) * 2.0;
  float ang = atan(p.y, p.x) / 6.2831853 + .5;
  float ring = exp(-pow((r - .92) / .018, 2.0)) * step(ang, uDraw);
  float inner = exp(-pow((r - .6) / .012, 2.0)) * step(ang, uDraw * 1.25 - .25);
  float spokeAng = abs(fract(ang * 6.0 + .25) - .5);
  float spokes = smoothstep(.02, .0, spokeAng * r) * smoothstep(.62, .66, r) * step(r, .9) * step(.999, uDraw);
  float shimmer = .8 + .2 * gNoise(vec2(ang * 40.0 - uTime * 3.0, r * 8.0));
  float a = (ring + inner * .7 + spokes * .5) * shimmer * uAlpha;
  gl_FragColor = vec4(vec3(.82, .96, 1.0), a);
}`
const frostFragment = `
uniform float uFrost; uniform float uAlpha;
varying vec2 vUv;
void main(){
  vec2 p = vUv - .5; float r = length(p) * 2.0;
  float n = gNoise(vUv * 28.0) * .6 + gNoise(vUv * 70.0) * .4;
  float edge = smoothstep(uFrost, uFrost - .25, r + (n - .5) * .25);
  float a = edge * (.35 + .45 * n) * uAlpha;
  gl_FragColor = vec4(vec3(.93, .98, 1.0), a);
}`
const pillarFragment = `
uniform float uAlpha; uniform float uTime;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  float streak = gNoise(vec2(vUv.x * 22.0, vUv.y * 2.5 + uTime * .1));
  float crack = smoothstep(.02, .0, abs(gNoise(vec2(vUv.x * 9.0, vUv.y * 5.0)) - .5)) * .6;
  float top = 1.0 - smoothstep(.8, 1.0, vUv.y);
  vec3 col = mix(vec3(.66, .88, .98), vec3(1.0), clamp(fres + crack + streak * .25, 0.0, 1.0));
  float a = (.18 + fres * .6 + streak * .12 + crack * .3) * top * uAlpha;
  gl_FragColor = vec4(col, a);
}`

type Shard = { a: number; r: number; h: number; tilt: number; w: number; delay: number; vx: number; vy: number; vz: number; spin: number }

export class Tsukishiro {
  readonly group = new THREE.Group()
  private readonly glyph: THREE.Mesh
  private readonly frost: THREE.Mesh
  private readonly column: THREE.Mesh
  private readonly shards: THREE.InstancedMesh
  private readonly list: Shard[] = []
  private readonly m = new THREE.Matrix4()
  private readonly q = new THREE.Quaternion()
  private readonly e = new THREE.Euler()
  private readonly p = new THREE.Vector3()
  private readonly s = new THREE.Vector3()
  private readonly time = { value: 0 }
  constructor(envMap: THREE.Texture) {
    const R = 1.45
    this.glyph = new THREE.Mesh(new THREE.CircleGeometry(R * 1.08, 96), shader(uvVertex, glyphFragment, { uDraw: { value: 0 }, uAlpha: { value: 0 }, uTime: this.time }, true))
    this.frost = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), shader(uvVertex, frostFragment, { uFrost: { value: 0 }, uAlpha: { value: 0 } }, false))
    for (const disc of [this.glyph, this.frost]) { disc.rotation.x = -Math.PI / 2; disc.renderOrder = 5 }
    this.glyph.position.y = .03; this.frost.position.y = .02
    this.column = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.08, 1, 40, 6, true).translate(0, .5, 0), shader(fresnelVertex, pillarFragment, { uAlpha: { value: 0 }, uTime: this.time }, false))
    this.column.renderOrder = 7
    // Crystals: a ring around the circle's rim plus a tall core inside the column.
    for (let i = 0; i < 46; i++) {
      const core = i >= 36, a = hash(i * 3.7) * Math.PI * 2
      const r = core ? hash(i * 1.3) * .7 : R * (.72 + hash(i * 5.1) * .45)
      this.list.push({
        a, r, h: core ? 3.2 + hash(i * 2.9) * 3.4 : .7 + hash(i * 7.9) * 2.1, tilt: core ? (hash(i * 4.4) - .5) * .25 : .18 + hash(i * 6.6) * .5,
        w: core ? .32 + hash(i) * .2 : .16 + hash(i * 8.8) * .16, delay: core ? .02 : r / R * .12,
        vx: Math.cos(a) * (2.5 + hash(i * 9.1) * 4), vy: 2 + hash(i * 2.2) * 4, vz: Math.sin(a) * (2.5 + hash(i * 9.1) * 4), spin: (hash(i * 5.5) - .5) * 14,
      })
    }
    const crystal = new THREE.OctahedronGeometry(1, 0).scale(.5, 1, .5).translate(0, .95, 0)
    this.shards = new THREE.InstancedMesh(crystal, new THREE.MeshStandardMaterial({ color: '#e4f7ff', emissive: '#6fcdf0', emissiveIntensity: .45, roughness: .1, metalness: .05, envMap, envMapIntensity: 1.2, transparent: true, opacity: .9, flatShading: true }), this.list.length)
    this.shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.shards.castShadow = true
    this.shards.frustumCulled = false
    this.group.add(this.frost, this.glyph, this.column, this.shards)
    this.group.position.set(IX, G, IZ)
    this.group.name = 'tsukishiro'
  }
  dispose() {
    for (const o of [this.glyph, this.frost, this.column, this.shards]) { o.geometry.dispose(); (o.material as THREE.Material).dispose() }
    this.shards.dispose()
  }
  /** Returns the ice light strength (0 when idle). */
  update(t: number) {
    const active = t >= GT.circleStart && t < GT.renji + 5
    this.group.visible = active
    if (!active) return 0
    this.time.value = t
    const glyphMat = this.glyph.material as THREE.ShaderMaterial, frostMat = this.frost.material as THREE.ShaderMaterial, colMat = this.column.material as THREE.ShaderMaterial
    glyphMat.uniforms.uDraw.value = lin(t, GT.circleStart, GT.circleEnd)
    glyphMat.uniforms.uAlpha.value = ramp(t, GT.circleStart, GT.circleStart + .1) * (1 - ramp(t, GT.pillar + .1, GT.pillar + .9)) * 1.4
    frostMat.uniforms.uFrost.value = easeOutCubic(lin(t, GT.pillar, GT.pillar + 1.2)) * 1.05
    frostMat.uniforms.uAlpha.value = ramp(t, GT.pillar, GT.pillar + .3) * (1 - ramp(t, GT.renji + 1.5, GT.renji + 4.5))
    // The column erupts, holds, then breaks apart with the crystals.
    const rise = easeOutBack(lin(t, GT.pillar, GT.pillar + .24))
    const broken = ramp(t, GT.shatter, GT.shatter + .35)
    this.column.visible = t >= GT.pillar && broken < 1
    this.column.scale.set(1.45 * (1 + broken * .25), Math.max(.01, 7.5 * rise), 1.45 * (1 + broken * .25))
    colMat.uniforms.uAlpha.value = (1 - broken) * (t < GT.pillar + .5 ? 1.4 - ramp(t, GT.pillar, GT.pillar + .5) * .4 : 1)
    const arr = this.shards.instanceMatrix.array as Float32Array
    this.list.forEach((s, i) => {
      const grow = easeOutBack(lin(t, GT.pillar + s.delay, GT.pillar + s.delay + .22))
      const flight = Math.max(0, t - GT.shatter - s.delay * .5)
      const shrink = 1 - ramp(flight, .5, 1.1)
      if (t < GT.pillar + s.delay || shrink <= 0) { arr.fill(0, i * 16, i * 16 + 16); return }
      this.p.set(Math.cos(s.a) * s.r + s.vx * flight, s.vy * flight - 4.9 * flight * flight, Math.sin(s.a) * s.r + s.vz * flight)
      this.p.y = Math.max(this.p.y, -.2)
      this.e.set(Math.sin(s.a) * s.tilt + s.spin * flight, s.a, -Math.cos(s.a) * s.tilt + s.spin * flight * .7)
      this.q.setFromEuler(this.e)
      const piece = flight > 0 ? .55 : 1
      this.s.set(s.w * shrink * piece, Math.max(.001, s.h * grow * shrink * piece), s.w * shrink * piece)
      this.m.compose(this.p, this.q, this.s).toArray(arr, i * 16)
    })
    this.shards.instanceMatrix.needsUpdate = true
    return (t >= GT.pillar ? (1 - broken * .6) * (1 - ramp(t, GT.shatter + .3, GT.shatter + 1.4)) : 0) + glyphMat.uniforms.uAlpha.value * .3
  }
}

// --- Zabimaru: plates joined by links, laid out in world space by the director -------------------
export const ZABIMARU_SEGMENTS = 14
export class ZabimaruBlade {
  readonly group = new THREE.Group()
  private readonly plates: THREE.InstancedMesh
  private readonly teeth: THREE.InstancedMesh
  private readonly links: THREE.InstancedMesh
  private readonly m = new THREE.Matrix4()
  private readonly basis = new THREE.Matrix4()
  private readonly x = new THREE.Vector3()
  private readonly y = new THREE.Vector3()
  private readonly z = new THREE.Vector3()
  private readonly one = new THREE.Vector3(1, 1, 1)
  private readonly q = new THREE.Quaternion()
  private readonly mid = new THREE.Vector3()
  private readonly up = new THREE.Vector3(0, 1, 0)
  constructor(envMap: THREE.Texture) {
    const steel = new THREE.MeshStandardMaterial({ color: '#d9dde0', metalness: .88, roughness: .26, envMap, envMapIntensity: 1.1, flatShading: true })
    const plate = new THREE.BoxGeometry(.09, .1, .026)
    // A hooked tooth on the cutting side of every plate.
    const tooth = new THREE.ConeGeometry(.034, .13, 4).rotateZ(-Math.PI / 2 - .5).translate(.075, .022, 0)
    this.plates = new THREE.InstancedMesh(plate, steel, ZABIMARU_SEGMENTS)
    this.teeth = new THREE.InstancedMesh(tooth, steel, ZABIMARU_SEGMENTS)
    this.links = new THREE.InstancedMesh(new THREE.CylinderGeometry(.013, .013, 1, 5), new THREE.MeshStandardMaterial({ color: '#2b2427', roughness: .6, metalness: .4 }), ZABIMARU_SEGMENTS - 1)
    for (const mesh of [this.plates, this.teeth, this.links]) { mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.castShadow = true; mesh.frustumCulled = false }
    this.group.add(this.plates, this.teeth, this.links)
    this.group.name = 'zabimaru'
  }
  dispose() {
    for (const mesh of [this.plates, this.teeth, this.links]) { mesh.geometry.dispose(); mesh.dispose() }
    ;(this.plates.material as THREE.Material).dispose(); (this.links.material as THREE.Material).dispose()
  }
  /** points: segment centres (world); side: the direction the teeth face; teeth: 0..1 tooth size. */
  update(points: THREE.Vector3[], side: THREE.Vector3, teeth: number) {
    const pa = this.plates.instanceMatrix.array as Float32Array, ta = this.teeth.instanceMatrix.array as Float32Array, la = this.links.instanceMatrix.array as Float32Array
    for (let i = 0; i < points.length; i++) {
      const prev = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)]
      this.y.subVectors(next, prev).normalize()
      this.z.crossVectors(side, this.y).normalize()
      if (this.z.lengthSq() < 1e-6) this.z.crossVectors(this.up, this.y).normalize()
      this.x.crossVectors(this.y, this.z)
      this.basis.makeBasis(this.x, this.y, this.z).setPosition(points[i])
      this.basis.toArray(pa, i * 16)
      this.m.copy(this.basis).scale(this.one.set(Math.max(.001, teeth), Math.max(.001, teeth), 1)).toArray(ta, i * 16)
      if (i < points.length - 1) {
        const gap = points[i].distanceTo(points[i + 1])
        const len = Math.max(0, gap - .08)
        this.mid.addVectors(points[i], points[i + 1]).multiplyScalar(.5)
        this.q.setFromUnitVectors(this.up, this.z.subVectors(points[i + 1], points[i]).normalize())
        this.m.compose(this.mid, this.q, this.one.set(len > .01 ? 1 : 0, Math.max(.001, len), len > .01 ? 1 : 0)).toArray(la, i * 16)
      }
    }
    this.plates.instanceMatrix.needsUpdate = true; this.teeth.instanceMatrix.needsUpdate = true; this.links.instanceMatrix.needsUpdate = true
  }
}

// --- Whip choreography: extension, length, and target control points over time -------------------
type WhipKey = { t: number; ext: number; len: number; c2: [number, number, number]; c3: [number, number, number] }
const T1 = LASH_TARGET, T2 = SWEEP_TARGET
const over = (a: [number, number, number], x: number, y: number, z: number): [number, number, number] => [a[0] + x, a[1] + y, a[2] + z]
const NH: [number, number, number] = [NX, G + 1.9, NZ + .4]
const whipKeys: WhipKey[] = [
  { t: GT.lashRelease - .05, ext: 0, len: 1.2, c2: over(T1, -.6, 2.4, -2), c3: over(T1, -.5, 1.2, -1.6) },
  { t: GT.lashHit, ext: 1, len: 6.6, c2: over(T1, -.5, 2.4, -1.8), c3: T1 },
  { t: GT.flourish, ext: 1, len: 5.8, c2: over(T1, -.9, 2.8, -2.4), c3: over(T1, -.8, 1.1, -1.2) },
  { t: GT.flourish + .3, ext: 1, len: 4.8, c2: over(NH, 1.8, 2.6, 1.8), c3: over(NH, 2.4, 1.2, -.6) },
  { t: GT.flourish + .6, ext: 1, len: 4.6, c2: over(NH, -1.2, 2.8, -1.8), c3: over(NH, -2.2, 1.0, .6) },
  { t: GT.sweepRelease, ext: 1, len: 4.4, c2: over(NH, -2.8, .2, .6), c3: over(NH, -3.2, -.8, 2.2) },
  { t: GT.sweepHit, ext: 1, len: 6.8, c2: [NX - 3.4, G + .9, IZE - 3.4], c3: T2 },
  { t: GT.retract, ext: 1, len: 6.2, c2: [NX - 2.6, G + 1.2, IZE - 3.8], c3: over(T2, 1.5, -.35, -1.4) },
  { t: GT.retract + .55, ext: 0, len: 1.2, c2: over(NH, 1.2, 1.5, 1.5), c3: over(NH, 1.4, .8, 2.4) },
]
const smooth = (x: number) => { const c = clamp01(x); return c * c * (3 - 2 * c) }
const tmp = { c2: new THREE.Vector3(), c3: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3() }
function sampleWhip(t: number) {
  let i = whipKeys.findIndex(k => k.t > t)
  if (i === -1) i = whipKeys.length
  const a = whipKeys[Math.max(0, i - 1)], b = whipKeys[Math.min(whipKeys.length - 1, i)]
  const w = a === b ? 1 : smooth((t - a.t) / (b.t - a.t))
  tmp.c2.fromArray(a.c2).lerp(tmp.d.fromArray(b.c2), w)
  tmp.c3.fromArray(a.c3).lerp(tmp.d.fromArray(b.c3), w)
  return { ext: a.ext + (b.ext - a.ext) * w, len: a.len + (b.len - a.len) * w }
}
const bez = (p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, u: number, out: THREE.Vector3) => {
  const v = 1 - u
  return out.copy(p0).multiplyScalar(v * v * v).addScaledVector(p1, 3 * v * v * u).addScaledVector(p2, 3 * v * u * u).addScaledVector(p3, u * u * u)
}
const samples = Array.from({ length: 17 }, () => new THREE.Vector3())
/**
 * Lays the segments out: packed along the blade when sealed, travelling along a Bezier toward
 * the target as the whip extends. base/dir come from Renji's live hand transform.
 */
export function layoutZabimaru(t: number, base: THREE.Vector3, dir: THREE.Vector3, out: THREE.Vector3[]) {
  const { ext, len } = sampleWhip(t)
  const p1 = tmp.b.copy(base).addScaledVector(dir, 1.5)
  let total = 0
  for (let k = 0; k < samples.length; k++) {
    bez(base, p1, tmp.c2, tmp.c3, k / (samples.length - 1), samples[k])
    if (k) total += samples[k].distanceTo(samples[k - 1])
  }
  const compactLen = 1.2
  for (let i = 0; i < out.length; i++) {
    const f = (i + .5) / out.length
    const straight = tmp.c.copy(base).addScaledVector(dir, .05 + f * compactLen)
    const s = f * len, u = Math.min(1, s / Math.max(total, .01))
    bez(base, p1, tmp.c2, tmp.c3, u, out[i])
    // A travelling ripple makes the extended whip snake rather than slide.
    const wave = Math.sin(u * 11 - t * 16) * .1 * ext * u * (1 - u) * 4
    out[i].y += wave; out[i].x += wave * .6
    out[i].lerpVectors(straight, out[i], ext)
  }
  return ext
}

// --- Event lists ------------------------------------------------------------------------------
const ice = ['#ffffff', '#dff7ff', '#a8e6ff', '#7fd6f5']
const steelSparks = ['#fff4d6', '#ffcf7a', '#ff9a4a', '#ffffff']
const mist = ['#f4fbff', '#e2f3fb', '#d6eef8']
const sand = ['#e6d7b8', '#dccaa6', '#f1e7d1']

export function gateSparks(): Burst[] {
  const out: Burst[] = [
    { t: GT.danceStart, spread: 1.4, count: 70, origin: [RX, G + 1.3, RZ + .7], box: [.4, .4, .4], radial: true, speed: [.2, .8], vel: [0, .25, 0], life: [.8, 1.6], size: [.04, .08], colors: ice },
    { t: GT.pillar, spread: .08, count: 220, origin: [IX, G + 1.4, IZ], box: [1.1, 1.2, 1.1], radial: true, speed: [2, 6], vel: [0, 1.5, 0], gravity: 3, drag: 1, life: [.6, 1.4], size: [.05, .1], colors: ice },
    { t: GT.shatter, spread: .12, count: 260, origin: [IX, G + 2.6, IZ], box: [1, 2.2, 1], radial: true, speed: [3, 8], gravity: 6, drag: .8, life: [.6, 1.3], size: [.05, .11], colors: ice },
    // Gentle snowfall that lingers through Renji's attack and the reveal.
    { t: GT.pillar + .2, spread: 14, count: 260, origin: [0, G + 6.2, 5.5], box: [6, .6, 5], vel: [.15, -.55, 0], radial: true, speed: [.02, .15], life: [6, 9], size: [.035, .06], colors: ['#ffffff', '#eef8ff'] },
    { t: GT.howl, spread: .1, count: 70, origin: [NX + .25, G + 1.9, NZ + .7], box: [.2, .5, .2], radial: true, speed: [1, 3.5], gravity: 3, life: [.3, .7], size: [.04, .08], colors: ['#ffb36b', '#ff6b3d', '#fff0d0'] },
    { t: GT.lashHit, spread: .05, count: 150, origin: T1, box: [.1, .15, .1], radial: true, speed: [2.5, 8], vel: [0, 1, 1.5], gravity: 8, drag: 1.2, life: [.25, .7], size: [.04, .09], colors: steelSparks },
    { t: GT.sweepHit, spread: .05, count: 130, origin: T2, box: [.1, .1, .1], radial: true, speed: [2.5, 7], vel: [.5, .8, 1], gravity: 8, drag: 1.2, life: [.25, .7], size: [.04, .09], colors: steelSparks },
    { t: GT.finishHit, spread: .08, count: 260, origin: [(RX + NX) / 2, G + 1.3, RZ + .9], box: [1.3, .6, .3], radial: true, speed: [3, 9], vel: [0, 1, -2], gravity: 5, drag: 1.1, life: [.45, 1.2], size: [.05, .11], colors: ['#dff9ff', '#79dfff', '#ffffff', ...ice] },
  ]
  for (let k = 0; k < 12; k++) {
    const u = (k + .5) / 12, a = u * Math.PI * 2 - Math.PI
    out.push({ t: GT.circleStart + u * (GT.circleEnd - GT.circleStart), count: 4, origin: [IX + Math.cos(a) * 1.4, G + .08, IZ + Math.sin(a) * 1.4], box: [.05, .02, .05], vel: [0, .6, 0], radial: true, speed: [.1, .4], life: [.35, .7], size: [.05, .08], colors: ice })
    const tf = GT.finishRelease + (k / 11) * (GT.finishHit - GT.finishRelease)
    out.push({ t: tf, count: 8, origin: [IX, G + 1.1, gateWaveZ(tf)], box: [.4, .6, .05], radial: true, speed: [.3, 1.4], vel: [0, .6, .8], life: [.3, .7], size: [.04, .08], colors: ['#dff9ff', '#79dfff'] })
  }
  return out
}
export function gateDust(): Burst[] {
  return [
    { t: GT.dodge + .34, spread: .05, count: 18, origin: [IX, G + .1, IZE], box: [.25, .02, .2], radial: true, flat: true, up: .4, speed: [.8, 2], drag: 2.2, life: [.8, 1.4], size: [.3, .55], colors: sand },
    { t: GT.pillar, spread: .5, count: 70, origin: [IX, G + .25, IZ], box: [1.2, .1, 1.2], radial: true, flat: true, up: .15, speed: [.8, 2.4], drag: 1.6, life: [1.4, 2.6], size: [.6, 1.2], colors: mist },
    { t: GT.shatter, spread: .3, count: 50, origin: [IX, G + 1.2, IZ], box: [1, 1, 1], radial: true, speed: [.5, 1.8], drag: 1.5, life: [1.2, 2.2], size: [.6, 1.1], colors: mist },
    { t: GT.lashHit, count: 16, origin: [IX, G + .1, IZE + .1], box: [.2, .02, .2], radial: true, flat: true, up: .3, speed: [.6, 1.6], drag: 2.2, life: [.7, 1.2], size: [.25, .5], colors: sand },
    { t: GT.finishHit, spread: .1, count: 70, origin: [(RX + NX) / 2, G + .25, RZ + .4], box: [1.4, .1, .4], radial: true, flat: true, up: .3, speed: [2, 5], drag: 1.8, life: [1, 1.9], size: [.45, .9], colors: sand },
  ]
}
export function gateRings(): RingEvent[] {
  return [
    { t: GT.pillar, x: IX, y: G + .05, z: IZ, radius: 5, duration: 1, color: '#c8f2ff', alpha: .9, width: .04 },
    { t: GT.shatter, x: IX, y: G + .05, z: IZ, radius: 3.6, duration: .9, color: '#e8fbff', alpha: .5, width: .05 },
    { t: GT.lashHit, x: T1[0], y: T1[1], z: T1[2], radius: 1.1, duration: .35, color: '#ffe2b0', alpha: .9, width: .07, vertical: true },
    { t: GT.sweepHit, x: T2[0], y: T2[1], z: T2[2], radius: 1, duration: .35, color: '#ffe2b0', alpha: .9, width: .07, vertical: true },
    { t: GT.finishHit, x: (RX + NX) / 2, y: G + .05, z: RZ + .6, radius: 5, duration: .9, color: '#9fe8ff', alpha: .9, width: .05 },
  ]
}
export function gateFlashes(): FlashEvent[] {
  return [
    { t: GT.danceEnd - .1, p: [RX, G + 1.3, RZ + 1.05], from: .05, to: .32, duration: .25, color: '#e6fbff', alpha: .55 },
    { t: GT.pillar, p: [IX, G + 1.2, IZ], from: .5, to: 2.4, duration: .45, color: '#bdf0ff', alpha: .8 },
    { t: GT.howl, p: [NX + .25, G + 1.9, NZ + .7], from: .1, to: .9, duration: .4, color: '#ff7a4a', alpha: .8 },
    { t: GT.lashHit, p: T1, from: .1, to: .7, duration: .3, color: '#ffd9a0', alpha: .9 },
    { t: GT.sweepHit, p: T2, from: .1, to: .6, duration: .3, color: '#ffd9a0', alpha: .9 },
    { t: GT.finishHit, p: [(RX + NX) / 2, G + 1.3, RZ + .8], from: .4, to: 2.6, duration: .5, color: '#9fe8ff', alpha: .9 },
  ]
}
/** Timed from the moment control returns: Rukia and Renji leave with a flash step. */
export function departureSparks(): Burst[] {
  return [
    { t: .05, count: 80, origin: [RX, G + 1, RZ - .9], box: [.3, .6, .3], radial: true, speed: [.5, 2.5], vel: [0, 1, 0], life: [.5, 1.1], size: [.04, .08], colors: ice },
    { t: .12, count: 70, origin: [NX, G + 1.1, NZ - 1], box: [.3, .7, .3], radial: true, speed: [.5, 2.5], vel: [0, 1, 0], life: [.4, .9], size: [.04, .08], colors: ['#ff8a5a', '#ffd0a0', '#ffffff'] },
  ]
}
export function departureFlashes(): FlashEvent[] {
  return [
    { t: .05, p: [RX, G + 1, RZ - .9], from: .2, to: 1.1, duration: .3, color: '#dff6ff', alpha: .8 },
    { t: .12, p: [NX, G + 1.1, NZ - 1], from: .2, to: 1.2, duration: .3, color: '#ffc8a0', alpha: .8 },
  ]
}

// Kuchiki garden effects: Soi Fon's Shunkō aura, the Hōmonka butterfly mark, flash-step streaks and
// afterimages, and the burst/ring/flash event lists. Everything is a pure function of the garden clock.
import * as THREE from 'three'
import type { Burst, FlashEvent, RingEvent } from '../finale/effects'
import { hash, lin } from '../finale/timeline'
import { GARDEN_GROUND as G, GARDEN_HIT_Z, GD, ICHIGO_GARDEN_END, ICHIGO_GARDEN_MARK, SOI_MARK, YORUICHI_SEAT, gardenWaveZ } from './timeline'
import { SOI_HAND_AT_CALL, SOI_THROWN_FROM, STING_POINT, YORUICHI_LAND, soiFlashSteps } from './choreography'

const [IX, , IZ] = ICHIGO_GARDEN_MARK, IZE = ICHIGO_GARDEN_END[2]
const [SX, , SZ] = SOI_MARK
const noiseGlsl = `
float fxHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float fxNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(fxHash(i),fxHash(i+vec2(1,0)),f.x),mix(fxHash(i+vec2(0,1)),fxHash(i+vec2(1,1)),f.x),f.y);}
`
const fresnelVertex = `varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`

/** Translucent rim-lit silhouette used for flash-step afterimages. */
export function createGhostMaterial(color: string) {
  return new THREE.ShaderMaterial({
    vertexShader: fresnelVertex,
    fragmentShader: `uniform vec3 uColor; uniform float uAlpha; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.5); gl_FragColor = vec4(uColor * (.85 + .3 * f), (.3 + .7 * f) * uAlpha); }`,
    uniforms: { uColor: { value: new THREE.Color(color) }, uAlpha: { value: 0 } },
    transparent: true, depthWrite: false, toneMapped: false,
  })
}

// --- Shunkō ----------------------------------------------------------------------------------
const ARCS = 12, ARC_SEGMENTS = 6, MOTES = 110
/**
 * Kidō compressed around Soi Fon's back and shoulders: a streaming wind shell, flickering
 * lightning arcs, and motes pulled up and back. Parented to her chest joint (body units).
 */
export class ShunkoAura {
  readonly group = new THREE.Group()
  private readonly shell: THREE.Mesh
  private readonly shellMat: THREE.ShaderMaterial
  private readonly arcs: THREE.InstancedMesh
  private readonly arcMat = new THREE.MeshBasicMaterial({ color: '#dff6ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  private readonly motes: THREE.Points
  private readonly moteMat: THREE.ShaderMaterial
  private readonly glow: THREE.Sprite
  private readonly glowTex: THREE.DataTexture
  private readonly time = { value: 0 }
  private readonly m = new THREE.Matrix4()
  private readonly a = new THREE.Vector3()
  private readonly b = new THREE.Vector3()
  private readonly pts = Array.from({ length: ARC_SEGMENTS + 1 }, () => new THREE.Vector3())
  private readonly q = new THREE.Quaternion()
  private readonly s = new THREE.Vector3()
  private readonly d = new THREE.Vector3()
  private readonly z = new THREE.Vector3(0, 0, 1)
  constructor() {
    this.shellMat = new THREE.ShaderMaterial({
      vertexShader: fresnelVertex,
      fragmentShader: noiseGlsl + `uniform float uTime; uniform float uAlpha; varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){
          float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.5);
          float ang = atan(vP.x, vP.z);
          float n = fxNoise(vec2(ang * 3.0 + uTime * 1.3, vP.y * 5.0 - uTime * 6.0));
          float n2 = fxNoise(vec2(ang * 7.0 - uTime * 2.1, vP.y * 11.0 - uTime * 10.0));
          float streak = smoothstep(.5, .92, n * .6 + n2 * .4);
          float back = smoothstep(.4, -.6, vP.z);
          float a = (f * .12 + streak * .7) * (.25 + .75 * back) * uAlpha;
          gl_FragColor = vec4(mix(vec3(.55, .85, 1.0), vec3(1.0), streak), a);
        }`,
      uniforms: { uTime: this.time, uAlpha: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    })
    this.shell = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), this.shellMat)
    this.shell.position.set(0, .06, -.06)
    this.shell.scale.set(.3, .27, .24)
    this.shell.renderOrder = 13
    const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, .5)
    this.arcs = new THREE.InstancedMesh(box, this.arcMat, ARCS * ARC_SEGMENTS)
    this.arcs.frustumCulled = false
    this.arcs.renderOrder = 14
    // Motes: a looping swirl rising off the shoulders and streaming back.
    const seeds = new Float32Array(MOTES * 4)
    for (let i = 0; i < MOTES; i++) seeds.set([hash(i * 3.1), hash(i * 7.7 + 1), hash(i * 1.3 + 5), hash(i * 9.1 + 2)], i * 4)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    this.moteMat = new THREE.ShaderMaterial({
      vertexShader: `attribute vec4 aSeed; uniform float uTime; uniform float uPixel; uniform float uAlpha; varying float vA;
        void main(){
          float life = fract(uTime * (.9 + aSeed.y * .8) + aSeed.x);
          float ang = aSeed.z * 6.2832 + uTime * (1.5 + aSeed.w * 2.0);
          float r = .22 + .12 * aSeed.w + life * .12;
          vec3 p = vec3(sin(ang) * r * 1.2, -.1 + life * .75, -abs(cos(ang)) * r - .06 - life * .35);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vA = uAlpha * smoothstep(0.0, .12, life) * (1.0 - life);
          gl_PointSize = (.012 + .014 * aSeed.y) * uPixel / max(.1, -mv.z);
        }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5) * 2.0; float a = smoothstep(1.0, .2, d) * vA; if (a < .004) discard; gl_FragColor = vec4(vec3(.85, .97, 1.0), a); }`,
      uniforms: { uTime: this.time, uPixel: { value: 500 }, uAlpha: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    })
    this.motes = new THREE.Points(g, this.moteMat)
    this.motes.frustumCulled = false
    this.motes.renderOrder = 14
    const px = new Uint8Array(64 * 64 * 4)
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const r = Math.min(1, Math.hypot(x - 31.5, y - 31.5) / 31.5), a = (1 - r) ** 2.2
      px.set([255, 255, 255, Math.round(a * 255)], (y * 64 + x) * 4)
    }
    this.glowTex = new THREE.DataTexture(px, 64, 64)
    this.glowTex.needsUpdate = true
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: '#bfeaff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
    this.glow.position.set(0, .1, -.16)
    this.glow.renderOrder = 12
    this.group.add(this.glow, this.shell, this.arcs, this.motes)
    this.group.visible = false
    this.group.name = 'shunko-aura'
  }
  dispose() {
    this.shell.geometry.dispose(); this.shellMat.dispose(); this.arcs.geometry.dispose(); this.arcMat.dispose(); this.arcs.dispose()
    this.motes.geometry.dispose(); this.moteMat.dispose(); this.glowTex.dispose(); this.glow.material.dispose()
  }
  /** strength 0..1; pixel: pixels per world unit at distance 1 (for the motes). */
  update(t: number, strength: number, pixel: number) {
    this.group.visible = strength > .01
    if (!this.group.visible) return
    this.time.value = t
    const flicker = .85 + .15 * Math.sin(t * 47) * Math.sin(t * 13)
    this.shellMat.uniforms.uAlpha.value = strength * flicker
    this.shell.scale.set(.3 + strength * .03, .27 + strength * .03, .24 + strength * .03)
    this.moteMat.uniforms.uAlpha.value = strength
    this.moteMat.uniforms.uPixel.value = pixel
    this.glow.material.opacity = strength * flicker * .45
    this.glow.scale.set(.95 + strength * .15, .85 + strength * .1, 1)
    let n = 0
    for (let k = 0; k < ARCS; k++) {
      // Each arc re-strikes about 20 times a second, deterministically from the clock.
      const bucket = Math.floor(t * 20 + k * .37), seed = bucket * 31.7 + k * 7.3
      const on = hash(seed) < .25 + .55 * strength
      const side = hash(seed + 1) < .5 ? -1 : 1
      const ang = side * (.2 + hash(seed + 2) * 1.5), y = -.02 + hash(seed + 3) * .3, r = .2 + hash(seed + 4) * .05
      this.a.set(Math.sin(ang) * r * 1.15, y, -Math.cos(ang) * r * .9)
      this.b.set(this.a.x + (hash(seed + 5) - .5) * .25 + side * .1, this.a.y + (hash(seed + 6) - .3) * .22, this.a.z - .04 - hash(seed + 7) * .14)
      for (let i = 0; i <= ARC_SEGMENTS; i++) {
        const u = i / ARC_SEGMENTS, j = i === 0 || i === ARC_SEGMENTS ? 0 : .08
        this.pts[i].lerpVectors(this.a, this.b, u)
        this.pts[i].x += (hash(seed + 11 + i) - .5) * j; this.pts[i].y += (hash(seed + 17 + i) - .5) * j; this.pts[i].z += (hash(seed + 23 + i) - .5) * j
      }
      const width = on ? .007 + .005 * strength : 0
      for (let i = 0; i < ARC_SEGMENTS; i++, n++) {
        this.d.subVectors(this.pts[i + 1], this.pts[i])
        const len = this.d.length()
        this.q.setFromUnitVectors(this.z, this.d.divideScalar(len || 1))
        this.m.compose(this.pts[i], this.q, this.s.set(width, width, width > 0 ? len : 0))
        this.arcs.setMatrixAt(n, this.m)
      }
    }
    this.arcs.instanceMatrix.needsUpdate = true
    this.arcMat.opacity = Math.min(1, strength * 1.2)
  }
}

// --- Hōmonka: the butterfly mark left by Suzumebachi's first sting ---------------------------------
function wingShape() {
  const s = new THREE.Shape()
  s.moveTo(0, 0); s.bezierCurveTo(.04, .13, .16, .2, .25, .25); s.bezierCurveTo(.24, .08, .16, .01, 0, 0)
  const hole = new THREE.Path()
  hole.moveTo(.055, .047); hole.bezierCurveTo(.12, .06, .19, .1, .2, .19); hole.bezierCurveTo(.13, .17, .08, .1, .055, .047)
  s.holes.push(hole)
  return s
}
export class HomonkaMark {
  readonly group = new THREE.Group()
  private readonly wing: THREE.ShapeGeometry
  private readonly ink = new THREE.MeshBasicMaterial({ color: '#0e0d14', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })
  private readonly glowMat: THREE.ShaderMaterial
  private readonly glow: THREE.Mesh
  private readonly mark = new THREE.Group()
  constructor() {
    this.wing = new THREE.ShapeGeometry(wingShape())
    for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(this.wing, this.ink); w.rotation.z = i * Math.PI / 2; this.mark.add(w) }
    this.glowMat = new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uAlpha; varying vec2 vUv; void main(){ float r = length(vUv - .5) * 2.0; float a = (exp(-pow((r - .75) * 6.0, 2.0)) * .9 + smoothstep(1.0, 0.0, r) * .35) * uAlpha; gl_FragColor = vec4(1.0, .78, .3, a); }`,
      uniforms: { uAlpha: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
    })
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.glowMat)
    this.glow.position.z = .01
    this.group.add(this.mark, this.glow)
    // Mounted on the back of the chest, facing out (-Z in the figure).
    this.group.rotation.y = Math.PI
    this.group.position.z = -.012
    this.group.visible = false
    this.group.name = 'homonka'
  }
  dispose() { this.wing.dispose(); this.ink.dispose(); this.glow.geometry.dispose(); this.glowMat.dispose() }
  /** stungAt: when the mark appears; pulse: 0..1 extra glow (the second sting threatens). */
  update(t: number, stungAt: number, pulse: number) {
    const age = t - stungAt
    this.group.visible = age >= 0
    if (age < 0) return
    const grow = Math.min(1, age / .22), s = .55 * (1 - (1 - grow) ** 3) * (1 + .25 * Math.exp(-age * 8))
    this.mark.scale.setScalar(Math.max(.001, s))
    const bloom = Math.exp(-age * 3.5)
    this.glow.scale.setScalar(.3 + (1 - Math.exp(-age * 5)) * .15 + pulse * .08)
    this.glowMat.uniforms.uAlpha.value = Math.min(1, bloom + pulse * .6)
  }
}

// --- Flash-step streaks --------------------------------------------------------------------------
export type StreakEvent = { t: number; from: [number, number, number]; to: [number, number, number]; duration: number; radius: number; color: string; alpha: number }
const streakFragment = `uniform float uHead; uniform float uTail; uniform float uAlpha; uniform vec3 uColor; varying vec2 vUv;
void main(){
  float along = vUv.y;
  float a = smoothstep(uTail - .02, uTail + .15, along) * (1.0 - smoothstep(uHead - .08, uHead, along));
  float core = 1.0 - abs(vUv.x * 2.0 - 1.0);
  gl_FragColor = vec4(uColor, a * uAlpha * (.35 + .65 * core));
}`
/** A bright tube that shoots from where a fighter vanished to where they reappear, then drains away. */
export class Streaks {
  readonly group = new THREE.Group()
  private readonly geometry = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).translate(0, .5, 0)
  private readonly items: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; e: StreakEvent }[]
  constructor(events: StreakEvent[]) {
    const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3()
    this.items = events.map(e => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: streakFragment, uniforms: { uHead: { value: 0 }, uTail: { value: 0 }, uAlpha: { value: 0 }, uColor: { value: new THREE.Color(e.color) } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(this.geometry, mat)
      d.set(e.to[0] - e.from[0], e.to[1] - e.from[1], e.to[2] - e.from[2])
      mesh.position.set(...e.from)
      mesh.quaternion.setFromUnitVectors(up, d.clone().normalize())
      mesh.scale.set(e.radius, Math.max(.01, d.length()), e.radius)
      mesh.visible = false; mesh.renderOrder = 12; mesh.frustumCulled = false
      this.group.add(mesh)
      return { mesh, mat, e }
    })
  }
  dispose() { this.geometry.dispose(); this.items.forEach(i => i.mat.dispose()) }
  update(t: number) {
    for (const { mesh, mat, e } of this.items) {
      const x = (t - e.t) / e.duration
      mesh.visible = x >= 0 && x < 1
      if (!mesh.visible) continue
      mat.uniforms.uHead.value = Math.min(1.1, x / .4 * 1.1)
      mat.uniforms.uTail.value = lin(x, .3, 1) * 1.1
      mat.uniforms.uAlpha.value = e.alpha
    }
  }
}

// --- Event lists -------------------------------------------------------------------------------
const gold = ['#ffe39a', '#ffd060', '#fff4d0', '#ffffff']
const wind = ['#e9fbff', '#bff0ff', '#ffffff', '#9fe3ff']
const stone = ['#d9d4c7', '#cfc8b8', '#e4dfd3']
const lilac = ['#f0e6ff', '#ffe9b8', '#ffffff']
export const CLASH1: [number, number, number] = [IX, G + 1.22, IZ - .5]
export const CLASH2: [number, number, number] = [IX - .5, G + 1.45, IZE - .1]
export const CLASH3: [number, number, number] = [IX, G + 2.0, IZE - .35]
export const HIT_POINT: [number, number, number] = [SX, G + 1.12, GARDEN_HIT_Z]
export const CATCH_POINT: [number, number, number] = [SX - .05, G + 2.35, -35.55]
const YORUICHI_APPEAR: [number, number, number] = [-23.25, G + 2.6, -36.2]

/** Flash steps that start from or land on the ground (not the mid-air dive). */
const groundSteps = () => soiFlashSteps().map(s => ({ ...s, fromGround: s.from[1] < G + .1, toGround: s.to[1] < G + .1 }))

export function gardenSparks(): Burst[] {
  const out: Burst[] = [
    // Suzumebachi's release: gold motes off the blade as it becomes the stinger.
    { t: GD.shikai, spread: .3, count: 70, origin: SOI_HAND_AT_CALL, box: [.05, .2, .05], radial: true, speed: [.5, 1.8], drag: 1.5, life: [.5, 1.1], size: [.04, .08], colors: gold },
    // The first sting: the butterfly mark blooms on Ichigo's back.
    { t: GD.sting + .02, spread: .04, count: 90, origin: STING_POINT, box: [.08, .08, .05], radial: true, speed: [1.5, 4.5], vel: [0, .5, .8], gravity: 4, drag: 1.2, life: [.3, .7], size: [.04, .08], colors: gold },
    // Shunkō erupts.
    { t: GD.burst, spread: .1, count: 220, origin: [SX, G + 1.05, SZ], box: [.25, .35, .25], radial: true, speed: [3, 9], drag: 1.4, gravity: .8, life: [.5, 1.2], size: [.05, .1], colors: wind },
    { t: GD.burst + .1, spread: .8, count: 90, origin: [SX, G + .6, SZ], box: [.5, .2, .5], vel: [0, 2.6, 0], radial: true, speed: [.3, 1], life: [.6, 1.2], size: [.04, .08], colors: wind },
    // Three clashes.
    { t: GD.clash1, spread: .04, count: 160, origin: CLASH1, box: [.12, .2, .06], radial: true, speed: [2.5, 7.5], vel: [0, .8, .4], gravity: 5, drag: 1.1, life: [.35, .9], size: [.05, .1], colors: [...gold, ...wind] },
    { t: GD.clash2, spread: .04, count: 140, origin: CLASH2, box: [.06, .2, .12], radial: true, speed: [2.5, 7], vel: [.6, .8, 0], gravity: 5, drag: 1.1, life: [.35, .9], size: [.05, .1], colors: [...gold, ...wind] },
    { t: GD.clash3, spread: .04, count: 200, origin: CLASH3, box: [.2, .1, .2], radial: true, speed: [3, 8], vel: [0, -1, 0], gravity: 6, drag: 1, life: [.4, 1], size: [.05, .1], colors: [...gold, ...wind] },
    // The finishing Getsuga meets Shunkō, then overpowers it and throws her.
    { t: GD.hit, spread: .06, count: 240, origin: HIT_POINT, box: [.35, .45, .1], radial: true, speed: [3, 9], vel: [0, 1, -1.5], gravity: 5, drag: 1.1, life: [.4, 1.1], size: [.05, .11], colors: ['#dff9ff', '#79dfff', '#ffffff', '#bff0ff'] },
    { t: GD.fling, spread: .05, count: 160, origin: [SX, G + 1.1, SOI_THROWN_FROM[2]], box: [.3, .4, .2], radial: true, speed: [2.5, 7], vel: [0, 1.5, -2], gravity: 4, drag: 1.2, life: [.4, 1], size: [.05, .1], colors: wind },
    // Yoruichi arrives: a soft glint where she catches Soi Fon.
    { t: GD.catch, spread: .15, count: 70, origin: CATCH_POINT, box: [.3, .3, .3], radial: true, speed: [.3, 1.2], drag: 1.5, life: [.6, 1.3], size: [.04, .07], colors: lilac },
  ]
  // Shunkō bleeds off her as she flies.
  for (let k = 0; k < 6; k++) {
    const u = k / 5, x = SX - .05 * u, y = G + 1.1 + (1.25 + .9 * 4 * u * (1 - u)) * u, z = SOI_THROWN_FROM[2] + (-35.4 - SOI_THROWN_FROM[2]) * u
    out.push({ t: GD.fling + u * (GD.catch - GD.fling), count: 14, origin: [x, y, z], box: [.2, .3, .2], radial: true, speed: [.2, .9], life: [.4, .9], size: [.04, .07], colors: wind })
  }
  // Getsuga trail.
  for (let k = 0; k < 10; k++) {
    const tf = GD.release + k / 9 * (GD.hit - GD.release)
    out.push({ t: tf, count: 8, origin: [IX, G + 1.1, gardenWaveZ(tf)], box: [.4, .6, .05], radial: true, speed: [.3, 1.4], vel: [0, .6, .8], life: [.3, .7], size: [.04, .08], colors: ['#dff9ff', '#79dfff'] })
  }
  // Glints wherever she vanishes and reappears.
  for (const s of groundSteps()) {
    const shunko = s.t > GD.burst
    out.push({ t: s.t, count: 10, origin: [s.from[0], s.from[1] + .8, s.from[2]], box: [.2, .5, .2], radial: true, speed: [.4, 1.5], life: [.2, .45], size: [.04, .07], colors: shunko ? wind : gold })
    out.push({ t: s.toTime, count: 10, origin: [s.to[0], s.to[1] + .8, s.to[2]], box: [.2, .5, .2], radial: true, speed: [.4, 1.5], life: [.2, .45], size: [.04, .07], colors: shunko ? wind : gold })
  }
  return out
}

export function gardenDust(): Burst[] {
  const out: Burst[] = [
    { t: GD.burst, spread: .08, count: 110, origin: [SX, G + .12, SZ], box: [.3, .05, .3], radial: true, flat: true, up: .12, speed: [3, 7], drag: 2, life: [1, 1.9], size: [.45, .9], colors: stone },
    { t: GD.clash1, spread: .1, count: 26, origin: [IX, G + .12, IZ], box: [.3, .05, .2], radial: true, flat: true, up: .2, speed: [1, 2.8], drag: 2, life: [.8, 1.4], size: [.3, .6], colors: stone },
    { t: GD.clash3, spread: .08, count: 90, origin: [IX, G + .12, IZE], box: [.3, .05, .3], radial: true, flat: true, up: .2, speed: [2.5, 6], drag: 2, life: [1, 1.8], size: [.4, .85], colors: stone },
    { t: GD.hit, spread: .2, count: 34, origin: [SX, G + .12, -33.1], box: [.3, .05, .2], radial: true, flat: true, up: .25, speed: [1, 3], drag: 2, life: [.8, 1.4], size: [.3, .6], colors: stone },
    { t: GD.touchdown, spread: .06, count: 44, origin: [YORUICHI_LAND[0], G + .1, YORUICHI_LAND[2]], box: [.25, .04, .25], radial: true, flat: true, up: .15, speed: [1.2, 3], drag: 2.2, life: [.8, 1.5], size: [.3, .6], colors: stone },
  ]
  // Wind gathers around her feet before Shunkō: dust swept in a circle.
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * Math.PI * 2, r = 1.3
    out.push({ t: GD.gather + k * .055, count: 7, origin: [SX + Math.cos(a) * r, G + .12, SZ + Math.sin(a) * r], box: [.15, .03, .15], vel: [-Math.sin(a) * 2.2 - Math.cos(a) * .6, .25, Math.cos(a) * 2.2 - Math.sin(a) * .6], drag: 1.5, life: [.7, 1.1], size: [.25, .45], colors: stone })
  }
  for (const s of groundSteps()) {
    if (s.fromGround) out.push({ t: s.t, count: 12, origin: [s.from[0], G + .1, s.from[2]], box: [.15, .03, .15], radial: true, flat: true, up: .15, speed: [.6, 1.6], drag: 2.2, life: [.6, 1.1], size: [.25, .5], colors: stone })
    if (s.toGround) out.push({ t: s.toTime, count: 10, origin: [s.to[0], G + .1, s.to[2]], box: [.15, .03, .15], radial: true, flat: true, up: .15, speed: [.5, 1.4], drag: 2.2, life: [.5, 1], size: [.25, .45], colors: stone })
  }
  for (let k = 0; k < 8; k++) {
    const tf = GD.release + k / 7 * (GD.hit - GD.release)
    out.push({ t: tf, count: 6, origin: [IX, G + .2, gardenWaveZ(tf)], box: [.5, .08, .1], radial: true, flat: true, up: .4, speed: [.5, 1.4], drag: 2, life: [.7, 1.2], size: [.3, .6], colors: stone })
  }
  return out
}

/** Solid debris: the haori torn off by Shunkō, and leaves blown across the court. */
export function gardenDebris(): Burst[] {
  const leaves = ['#6f8f3d', '#8aa64c', '#b59a4a', '#5b7a33']
  return [
    { t: 0, spread: 14, count: 70, origin: [-22, G + 4.8, -31.5], box: [7, .5, 5], vel: [.25, -.55, .1], radial: true, speed: [.05, .25], life: [7, 11], size: [.04, .07], colors: leaves },
    { t: GD.burst + .02, spread: .05, count: 70, origin: [SX, G + 1.1, SZ - .05], box: [.2, .3, .15], radial: true, speed: [2, 6], vel: [0, 1.5, 0], gravity: 2.2, drag: 1.6, life: [1.2, 2.2], size: [.06, .11], colors: ['#f4f2eb', '#e8e5dc', '#ffffff'] },
    { t: GD.burst, spread: .08, count: 80, origin: [SX, G + .15, SZ], box: [2, .1, 2], radial: true, flat: true, up: .4, speed: [2, 5], gravity: 1.2, drag: 1.4, life: [1.5, 3], size: [.05, .09], colors: leaves },
    { t: GD.clash3, spread: .08, count: 40, origin: [IX, G + .15, IZE], box: [1.2, .1, 1.2], radial: true, flat: true, up: .5, speed: [2, 4.5], gravity: 1.4, drag: 1.4, life: [1.2, 2.4], size: [.05, .09], colors: leaves },
  ]
}

export function gardenRings(): RingEvent[] {
  return [
    { t: GD.sting + .02, x: STING_POINT[0], y: STING_POINT[1], z: STING_POINT[2] + .05, radius: .7, duration: .45, color: '#ffd782', alpha: .9, width: .07, vertical: true },
    { t: GD.burst, x: SX, y: G + .04, z: SZ, radius: 6, duration: 1, color: '#dff8ff', alpha: .9, width: .05 },
    { t: GD.burst + .12, x: SX, y: G + .04, z: SZ, radius: 3.5, duration: 1.1, color: '#9fe3ff', alpha: .55, width: .08 },
    { t: GD.clash1, x: CLASH1[0], y: CLASH1[1], z: CLASH1[2], radius: 1.3, duration: .4, color: '#fff2c8', alpha: .85, width: .07, vertical: true },
    { t: GD.clash2, x: CLASH2[0], y: CLASH2[1], z: CLASH2[2], radius: 1.1, duration: .4, color: '#fff2c8', alpha: .8, width: .07, vertical: true },
    { t: GD.clash3, x: IX, y: G + .04, z: IZE, radius: 4.5, duration: .9, color: '#e8fbff', alpha: .9, width: .05 },
    { t: GD.hit, x: HIT_POINT[0], y: HIT_POINT[1], z: HIT_POINT[2], radius: 1.7, duration: .45, color: '#bdf3ff', alpha: .9, width: .07, vertical: true },
    { t: GD.fling, x: SX, y: G + .04, z: SOI_THROWN_FROM[2], radius: 3.2, duration: .8, color: '#dff8ff', alpha: .8, width: .05 },
    { t: GD.touchdown, x: YORUICHI_LAND[0], y: G + .04, z: YORUICHI_LAND[2], radius: 2.2, duration: .9, color: '#f3e6ff', alpha: .6, width: .05 },
  ]
}

export function gardenFlashes(): FlashEvent[] {
  return [
    { t: GD.shikai, p: SOI_HAND_AT_CALL, from: .1, to: .7, duration: .45, color: '#ffcf5a', alpha: .85 },
    { t: GD.sting + .02, p: STING_POINT, from: .1, to: .9, duration: .4, color: '#ffc850', alpha: .9 },
    { t: GD.hit, p: HIT_POINT, from: .3, to: 1.3, duration: .3, color: '#aef0ff', alpha: .9 },
    { t: GD.appear, p: YORUICHI_APPEAR, from: .1, to: .8, duration: .3, color: '#f2e2ff', alpha: .8 },
  ]
}

export function gardenStreaks(): StreakEvent[] {
  const out: StreakEvent[] = []
  for (const s of soiFlashSteps()) {
    const shunko = s.t > GD.burst
    out.push({ t: s.t, from: [s.from[0], s.from[1] + .75, s.from[2]], to: [s.to[0], s.to[1] + .75, s.to[2]], duration: Math.max(.12, (s.toTime - s.t) * 1.6), radius: shunko ? .06 : .03, color: shunko ? '#dff8ff' : '#ffe6a8', alpha: shunko ? .7 : .35 })
  }
  // Yoruichi: from the veranda to Soi Fon in one step.
  out.push({ t: GD.leap, from: [YORUICHI_SEAT[0], YORUICHI_SEAT[1] + .7, YORUICHI_SEAT[2]], to: YORUICHI_APPEAR, duration: .45, radius: .08, color: '#efe2ff', alpha: .75 })
  return out
}

/** Yoruichi leaves with Soi Fon in a flash step once control returns. */
export function gardenDeparture(): { sparks: Burst[]; dust: Burst[]; flashes: FlashEvent[] } {
  const [x, , z] = YORUICHI_LAND
  return {
    sparks: [{ t: .1, count: 90, origin: [x, G + 1.0, z], box: [.3, .6, .3], radial: true, speed: [.8, 3], drag: 1.4, life: [.35, .8], size: [.04, .08], colors: lilac }],
    dust: [{ t: .1, count: 34, origin: [x, G + .1, z], box: [.3, .05, .3], radial: true, flat: true, up: .2, speed: [1, 2.6], drag: 2, life: [.8, 1.4], size: [.3, .6], colors: stone }],
    flashes: [{ t: .08, p: [x, G + 1.0, z], from: .2, to: 1.4, duration: .35, color: '#f2e6ff', alpha: .8 }],
  }
}

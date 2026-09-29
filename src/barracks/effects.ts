// Division barracks effects: frost spreading across the hall floor, the ice that locks
// Ichigo's legs after the dragon's strike, and the burst/ring/flash event lists.
import * as THREE from 'three'
import { easeOutBack, easeOutCubic, hash, lin, ramp } from '../finale/timeline'
import type { Burst, FlashEvent, RingEvent } from '../finale/effects'
import { BT, HALL_FLOOR as G, ICHIGO_HALL_END, TOSHIRO_MARK, hallWaveZ } from './timeline'

const [IX, , IZE] = ICHIGO_HALL_END, [TX, , TZ] = TOSHIRO_MARK
const noise = `
float bHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float bNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(bHash(i),bHash(i+vec2(1,0)),f.x),mix(bHash(i+vec2(0,1)),bHash(i+vec2(1,1)),f.x),f.y);}
`
const frostFragment = `
uniform float uFrost; uniform float uAlpha;
varying vec2 vUv;
void main(){
  vec2 p = vUv - .5; float r = length(p) * 2.0;
  float n = bNoise(vUv * 34.0) * .6 + bNoise(vUv * 90.0) * .4;
  float streaks = pow(abs(sin(atan(p.y, p.x) * 9.0 + n * 3.0)), 18.0) * .5;
  float edge = smoothstep(uFrost, uFrost - .2, r + (n - .5) * .22);
  float a = edge * (.28 + .4 * n + streaks) * uAlpha;
  gl_FragColor = vec4(vec3(.92, .98, 1.0), a);
}`

/** Frost that spreads from Tōshirō across the polished floor as the dragon appears. */
export class FrostFloor {
  readonly mesh: THREE.Mesh
  private readonly mat: THREE.ShaderMaterial
  constructor() {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: noise + frostFragment, uniforms: { uFrost: { value: 0 }, uAlpha: { value: 0 } }, transparent: true, depthWrite: false, toneMapped: false,
    })
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(8.6, 72), this.mat)
    this.mesh.rotation.x = -Math.PI / 2
    this.mesh.position.set(TX, G + .012, TZ + 2.5)
    this.mesh.renderOrder = 4
    this.mesh.visible = false
  }
  dispose() { this.mesh.geometry.dispose(); this.mat.dispose() }
  update(t: number) {
    const alpha = t < BT.dragonOut ? 0 : ramp(t, BT.dragonOut, BT.dragonOut + .4) * (1 - ramp(t, BT.end + .5, BT.end + 3))
    this.mesh.visible = alpha > 0
    this.mat.uniforms.uFrost.value = easeOutCubic(lin(t, BT.dragonOut + .1, BT.roar + .6)) * 1.02
    this.mat.uniforms.uAlpha.value = alpha
  }
}

/** Crystals that lock Ichigo's legs after the strike and burst when he breaks free. */
export class IceBind {
  readonly mesh: THREE.InstancedMesh
  private readonly list = Array.from({ length: 18 }, (_, i) => ({
    a: i / 18 * Math.PI * 2 + hash(i) * .3, r: .2 + hash(i * 2.3) * .2, h: .22 + hash(i * 4.1) * .38, w: .06 + hash(i * 5.7) * .05,
    tilt: .15 + hash(i * 3.3) * .45, delay: hash(i * 6.1) * .35, v: 2 + hash(i * 8.8) * 3.5, spin: (hash(i * 9.9) - .5) * 12,
  }))
  private readonly m = new THREE.Matrix4()
  private readonly q = new THREE.Quaternion()
  private readonly e = new THREE.Euler()
  private readonly p = new THREE.Vector3()
  private readonly s = new THREE.Vector3()
  constructor(envMap: THREE.Texture) {
    const g = new THREE.OctahedronGeometry(1, 0).scale(.5, 1, .5).translate(0, .9, 0)
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: '#e4f8ff', emissive: '#66c9ec', emissiveIntensity: .4, roughness: .1, envMap, transparent: true, opacity: .88, flatShading: true }), this.list.length)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.castShadow = true
    this.mesh.frustumCulled = false
  }
  dispose() { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); this.mesh.dispose() }
  update(t: number) {
    const arr = this.mesh.instanceMatrix.array as Float32Array
    this.mesh.visible = t >= BT.impact && t < BT.breakFree + 1.4
    if (!this.mesh.visible) return
    this.list.forEach((c, i) => {
      const grow = easeOutBack(lin(t, BT.impact + .02 + c.delay * .5, BT.impact + .3 + c.delay))
      const f = Math.max(0, t - BT.breakFree)
      const shrink = 1 - ramp(f, .45, 1.1)
      if (grow <= 0 || shrink <= 0) { arr.fill(0, i * 16, i * 16 + 16); return }
      this.p.set(IX + Math.cos(c.a) * (c.r + c.v * f), G + (c.v * .8) * f - 4.9 * f * f, IZE + Math.sin(c.a) * (c.r + c.v * f))
      this.p.y = Math.max(this.p.y, G - .1)
      this.e.set(Math.sin(c.a) * c.tilt + c.spin * f, c.a, -Math.cos(c.a) * c.tilt + c.spin * f * .5)
      this.q.setFromEuler(this.e)
      const k = f > 0 ? .6 : 1
      this.s.set(c.w * shrink * k, Math.max(.001, c.h * grow * shrink * k), c.w * shrink * k)
      this.m.compose(this.p, this.q, this.s).toArray(arr, i * 16)
    })
    this.mesh.instanceMatrix.needsUpdate = true
  }
}

const ice = ['#ffffff', '#dff7ff', '#a8e6ff', '#7fd6f5']
const mist = ['#f4fbff', '#e2f3fb', '#d6eef8']
const wood = ['#d9c3a0', '#cbb28b', '#e8dcc6']
const GUARD: [number, number, number] = [IX, G + .95, IZE - .75]

export function hallSparks(): Burst[] {
  const out: Burst[] = [
    { t: BT.dragonOut, spread: .1, count: 90, origin: [TX, G + 1.9, TZ + .3], box: [.2, .3, .2], radial: true, speed: [1.5, 4], vel: [0, 1, 0], gravity: 2, drag: 1, life: [.5, 1.1], size: [.05, .1], colors: ice },
    { t: BT.roar, spread: .3, count: 120, origin: [TX - .6, G + 5.2, TZ - 1.5], box: [.6, .4, .6], radial: true, speed: [1.5, 5], gravity: 1, drag: 1.2, life: [.6, 1.3], size: [.05, .1], colors: ice },
    // Snow drifting down from the ceiling for the rest of the fight.
    { t: BT.dragonOut + .4, spread: 16, count: 320, origin: [TX, G + 6.1, TZ + 3.5], box: [7.5, .3, 8], vel: [.08, -.45, 0], radial: true, speed: [.02, .12], life: [7, 11], size: [.035, .06], colors: ['#ffffff', '#eef8ff'] },
    { t: BT.impact, spread: .06, count: 240, origin: GUARD, box: [.35, .35, .2], radial: true, speed: [2.5, 8], vel: [0, 1.5, 1.2], gravity: 5, drag: 1, life: [.5, 1.2], size: [.05, .11], colors: ice },
    { t: BT.breakFree, spread: .08, count: 150, origin: [IX, G + .5, IZE], box: [.35, .35, .35], radial: true, speed: [2, 6], gravity: 6, drag: 1, life: [.4, 1], size: [.05, .1], colors: ['#dff9ff', '#79dfff', '#ffffff'] },
    { t: BT.intercept, spread: .06, count: 280, origin: [TX, G + 1.9, TZ + 2], box: [.6, .6, .4], radial: true, speed: [3, 9], vel: [0, 1, -1], gravity: 5, drag: 1, life: [.5, 1.3], size: [.05, .12], colors: [...ice, '#79dfff'] },
    { t: BT.hit, spread: .06, count: 160, origin: [TX, G + 1.1, TZ + .4], box: [.4, .5, .2], radial: true, speed: [2.5, 7], vel: [0, 1, -1.5], gravity: 5, drag: 1.1, life: [.4, 1.1], size: [.05, .1], colors: ['#dff9ff', '#79dfff', '#ffffff'] },
  ]
  for (let k = 0; k < 14; k++) {
    const u = (k + .5) / 14, tt = BT.dragonOut + u * 1.5, a = u * Math.PI * 3.2, r = 1.5 + u * .8
    out.push({ t: tt, count: 6, origin: [TX + Math.cos(a) * r, G + 2.2 + u * 3.3, TZ + Math.sin(a) * r], box: [.2, .2, .2], radial: true, speed: [.3, 1.2], life: [.5, 1], size: [.05, .09], colors: ice })
    const tf = BT.release + (k / 13) * (BT.hit - BT.release)
    out.push({ t: tf, count: 8, origin: [IX, G + 1.1, hallWaveZ(tf)], box: [.4, .6, .05], radial: true, speed: [.3, 1.4], vel: [0, .6, .8], life: [.3, .7], size: [.04, .08], colors: ['#dff9ff', '#79dfff'] })
  }
  return out
}
export function hallDust(): Burst[] {
  return [
    { t: BT.dragonOut + .2, spread: .8, count: 60, origin: [TX, G + .2, TZ], box: [1.5, .05, 1.5], radial: true, flat: true, up: .1, speed: [1, 2.8], drag: 1.6, life: [1.5, 2.6], size: [.6, 1.2], colors: mist },
    { t: BT.impact, spread: .1, count: 60, origin: [IX, G + .25, IZE - .3], box: [.4, .05, .3], radial: true, flat: true, up: .2, speed: [1.5, 4], drag: 1.8, life: [1, 2], size: [.5, 1], colors: mist },
    { t: BT.intercept, spread: .3, count: 70, origin: [TX, G + 1.6, TZ + 2], box: [1.2, 1, .8], radial: true, speed: [.8, 2.5], drag: 1.4, life: [1.3, 2.4], size: [.6, 1.2], colors: mist },
    { t: BT.hit, spread: .1, count: 40, origin: [TX, G + .2, TZ], box: [.5, .05, .3], radial: true, flat: true, up: .3, speed: [1.5, 3.5], drag: 2, life: [.9, 1.6], size: [.4, .8], colors: wood },
  ]
}
export function hallRings(): RingEvent[] {
  return [
    { t: BT.dragonOut + .05, x: TX, y: G + .03, z: TZ, radius: 6.5, duration: 1.1, color: '#c8f2ff', alpha: .8, width: .04 },
    { t: BT.impact, x: IX, y: G + .03, z: IZE, radius: 4, duration: .8, color: '#dff8ff', alpha: .9, width: .05 },
    { t: BT.impact, x: GUARD[0], y: GUARD[1], z: GUARD[2], radius: 1.4, duration: .35, color: '#e8fbff', alpha: .8, width: .07, vertical: true },
    { t: BT.breakFree, x: IX, y: G + .03, z: IZE, radius: 3, duration: .7, color: '#9fe8ff', alpha: .8, width: .05 },
    { t: BT.hit, x: TX, y: G + .03, z: TZ + .3, radius: 4.5, duration: .9, color: '#9fe8ff', alpha: .9, width: .05 },
  ]
}
export function hallFlashes(): FlashEvent[] {
  return [
    { t: BT.swing, p: [TX, G + 2.2, TZ + .3], from: .1, to: 1.0, duration: .4, color: '#bff0ff', alpha: .8 },
    { t: BT.impact, p: GUARD, from: .3, to: 1.8, duration: .45, color: '#dff8ff', alpha: .9 },
    { t: BT.breakFree, p: [IX, G + 1, IZE], from: .3, to: 1.4, duration: .4, color: '#9fe8ff', alpha: .8 },
    { t: BT.intercept, p: [TX, G + 1.9, TZ + 2], from: .4, to: 2.4, duration: .5, color: '#bff0ff', alpha: .9 },
    { t: BT.hit, p: [TX, G + 1.1, TZ + .4], from: .3, to: 1.6, duration: .4, color: '#9fe8ff', alpha: .9 },
  ]
}
export function toshiroDeparture(): { sparks: Burst[]; flashes: FlashEvent[] } {
  return {
    sparks: [{ t: .05, count: 90, origin: [TX, G + .9, TZ - 1.2], box: [.25, .5, .25], radial: true, speed: [.5, 2.5], vel: [0, 1, 0], life: [.5, 1.1], size: [.04, .08], colors: ice }],
    flashes: [{ t: .05, p: [TX, G + .9, TZ - 1.2], from: .2, to: 1.1, duration: .3, color: '#dff6ff', alpha: .8 }],
  }
}

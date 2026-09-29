// Looping drift of small flat things: leaves falling from the city's trees, and cherry petals
// over the Kuchiki garden. One GPU Points object each; positions are pure functions of time.
import * as THREE from 'three'
import { hash } from '../finale/timeline'

export type DriftSource = { x: number; z: number; top: number; spread: number; ground: number }
export type DriftOptions = { perSource: number; colors: string[]; fall: number; life: [number, number]; sway: number; wind: [number, number]; size: [number, number] }

const vertex = `
attribute vec4 aSource; attribute vec4 aSeed; attribute vec3 aColor;
uniform float uTime; uniform float uPixel; uniform float uFall; uniform float uSway; uniform vec2 uWind; uniform vec2 uLife; uniform vec2 uSize;
varying vec3 vColor; varying float vAlpha; varying float vSpin;
void main(){
  float life = mix(uLife.x, uLife.y, aSeed.w);
  float age = fract((uTime + aSeed.x * life) / life);
  float t = age * life;
  vec3 p = vec3(aSource.x + (aSeed.y - .5) * 2.0 * aSource.w, aSource.y - age * uFall, aSource.z + (aSeed.z - .5) * 2.0 * aSource.w);
  p.x += sin(uTime * 1.3 + aSeed.z * 6.28) * uSway + uWind.x * t;
  p.z += cos(uTime * 1.1 + aSeed.y * 6.28) * uSway + uWind.y * t;
  float ground = position.y;
  float landed = step(p.y, ground);
  p.y = max(p.y, ground + .01);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vAlpha = smoothstep(0.0, .08, age) * (1.0 - smoothstep(.82, 1.0, age));
  vSpin = uTime * (1.5 + aSeed.x * 2.0) * (1.0 - landed) + aSeed.y * 6.28;
  gl_PointSize = mix(uSize.x, uSize.y, aSeed.y) * uPixel / max(.1, -mv.z);
  vColor = aColor;
}`
const fragment = `
varying vec3 vColor; varying float vAlpha; varying float vSpin;
void main(){
  vec2 c = gl_PointCoord - .5;
  float s = sin(vSpin), k = cos(vSpin);
  c = vec2(c.x * k - c.y * s, c.x * s + c.y * k);
  // A small leaf or petal: an ellipse that tumbles as it falls.
  float d = (c.x * c.x) / .06 + (c.y * c.y) / .24;
  if (d > 1.0 || vAlpha < .01) discard;
  gl_FragColor = vec4(vColor * (.85 + .15 * (1.0 - d)), vAlpha);
}`

export class Drift {
  readonly points: THREE.Points
  private readonly mat: THREE.ShaderMaterial
  constructor(sources: DriftSource[], o: DriftOptions) {
    const n = sources.length * o.perSource
    const pos = new Float32Array(n * 3), src = new Float32Array(n * 4), seed = new Float32Array(n * 4), col = new Float32Array(n * 3)
    const color = new THREE.Color()
    let i = 0
    sources.forEach((s, si) => {
      for (let k = 0; k < o.perSource; k++, i++) {
        pos.set([0, s.ground, 0], i * 3)
        src.set([s.x, s.top, s.z, s.spread], i * 4)
        seed.set([hash(si * 31 + k * 1.7), hash(si * 7 + k * 3.3 + 1), hash(si * 11 + k * 5.9 + 2), hash(si * 3 + k * 9.1 + 3)], i * 4)
        color.set(o.colors[Math.floor(hash(si + k * 2.3) * o.colors.length)])
        col.set([color.r, color.g, color.b], i * 3)
      }
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSource', new THREE.BufferAttribute(src, 4))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vertex, fragmentShader: fragment,
      uniforms: { uTime: { value: 0 }, uPixel: { value: 500 }, uFall: { value: o.fall }, uSway: { value: o.sway }, uWind: { value: new THREE.Vector2(...o.wind) }, uLife: { value: new THREE.Vector2(...o.life) }, uSize: { value: new THREE.Vector2(...o.size) } },
      transparent: true, depthWrite: false,
    })
    this.points = new THREE.Points(g, this.mat)
    this.points.frustumCulled = false
    this.points.renderOrder = 8
  }
  dispose() { this.points.geometry.dispose(); this.mat.dispose() }
  update(t: number, pixel: number) { this.mat.uniforms.uTime.value = t; this.mat.uniforms.uPixel.value = pixel }
}

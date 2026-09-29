// Procedural effect meshes shared by the cinematics; the finale's event lists live at the bottom.
// Everything is a pure function of the encounter clock.
import * as THREE from 'three'
import { BYAKUYA_MARK, GROUND_Y, ICHIGO_MARK, T, easeOutBack, easeOutCubic, finalWaveZ, firstWaveZ, hash, impulse, lin, ramp, window4 } from './timeline'
import { BLADES, DISSOLVE_DURATION, bladeDissolveStart, bladeRiseStart } from './blades'

const [BX, , BZ] = BYAKUYA_MARK, [IX, , IZ] = ICHIGO_MARK, G = GROUND_Y
const noiseGlsl = `
float fxHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float fxNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(fxHash(i),fxHash(i+vec2(1,0)),f.x),mix(fxHash(i+vec2(0,1)),fxHash(i+vec2(1,1)),f.x),f.y);}
`
const uvVertex = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'

function fxMaterial(fragment: string, uniforms: Record<string, THREE.IUniform>, additive = true) {
  return new THREE.ShaderMaterial({
    vertexShader: uvVertex, fragmentShader: noiseGlsl + fragment, uniforms,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false,
  })
}

// --- Getsuga Tenshō ------------------------------------------------------------------
/**
 * Crescent band in the vertical YZ plane, bulging toward -Z (its direction of travel) with
 * the tips trailing back, so it reads as a flying blade from the side shots.
 */
function crescentGeometry(R: number, W: number, curl: number, segs = 56) {
  const thetaMax = 1.25, pos: number[] = [], uv: number[] = [], index: number[] = []
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, th = (u * 2 - 1) * thetaMax
    const w = W * Math.cos((u * 2 - 1) * Math.PI / 2) ** .6
    const s = Math.sin(th), c = Math.cos(th), x = curl * (1 - c)
    pos.push(x, R * s, -R * c + R * .75, x, (R - w) * s, -(R - w) * c + R * .75)
    uv.push(u, 1, u, 0)
  }
  for (let i = 0; i < segs; i++) { const a = i * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(index)
  return g
}
const crescentFragment = `
uniform float uTime; uniform float uAlpha; uniform float uMode; uniform vec3 uCore; uniform vec3 uEdge;
varying vec2 vUv;
void main(){
  float along = vUv.x, across = vUv.y;
  float tips = smoothstep(0.0, .15, along) * smoothstep(1.0, .85, along);
  float n = fxNoise(vec2(along * 11.0 - uTime * 8.0, across * 4.0 + uTime * 3.0));
  float n2 = fxNoise(vec2(along * 31.0 + uTime * 5.0, across * 9.0));
  if (uMode < .5) {
    float lead = pow(across, 1.8);
    float a = tips * (.22 + .78 * lead) * (.65 + .55 * n) * uAlpha;
    gl_FragColor = vec4(mix(uEdge, uCore, lead * lead), a);
  } else if (uMode > 2.5) {
    float bright = smoothstep(.15, 1.0, across);
    float a = tips * mix(.3, 1.0, bright) * (.8 + .28 * n) * uAlpha;
    gl_FragColor = vec4(mix(uEdge, uCore, bright * bright), a);
  } else if (uMode < 1.5) {
    float body = smoothstep(0.0, .22, across) * smoothstep(1.0, .78, across);
    float a = tips * mix(.5, .96, body) * (.78 + .32 * n2) * uAlpha;
    gl_FragColor = vec4(uCore + uEdge * .12 * n, a);
  } else {
    float rim = max(1.0 - smoothstep(0.0, .26, across), smoothstep(.66, 1.0, across));
    float a = tips * rim * (.55 + .7 * n) * uAlpha;
    gl_FragColor = vec4(uEdge * (1.0 + n2 * .6), a);
  }
}`

/** Where and when a Getsuga flies: z(t) gives the wave's world z while travelling toward -Z. */
export type WaveConfig = { release: number; hit: number; x: number; y: number; z: (t: number) => number; roll: number }

export class Getsuga {
  readonly group = new THREE.Group()
  private layers: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; ghost: number }[] = []
  private readonly time = { value: 0 }
  private readonly final: boolean
  private readonly cfg: WaveConfig
  /** 'first' is the blue-white Shikai wave; 'final' is the black-and-crimson Bankai wave. */
  constructor(kind: 'first' | 'final', cfg: WaveConfig) {
    this.final = kind === 'final'
    this.cfg = cfg
    const R = this.final ? 2.3 : 1.35, W = this.final ? .78 : .42, curl = this.final ? .35 : .2
    const core = new THREE.Color(this.final ? '#040307' : '#f7ffff'), edge = new THREE.Color(this.final ? '#ff1c3c' : '#27b4ff')
    // Final: crimson rim (additive) behind a near-black core. First: soft cyan glow behind a bright core.
    const spec: { geometry: THREE.BufferGeometry; mode: number; order: number }[] = this.final
      ? [{ geometry: crescentGeometry(R * 1.07, W * 1.45, curl), mode: 2, order: 1 }, { geometry: crescentGeometry(R, W, curl), mode: 1, order: 2 }]
      : [{ geometry: crescentGeometry(R * 1.06, W * 1.6, curl), mode: 0, order: 1 }, { geometry: crescentGeometry(R, W, curl), mode: 3, order: 2 }]
    for (let ghost = 0; ghost < (this.final ? 5 : 4); ghost++) spec.forEach(s => {
      const mat = fxMaterial(crescentFragment, { uTime: this.time, uAlpha: { value: 0 }, uMode: { value: s.mode }, uCore: { value: core }, uEdge: { value: edge } }, s.mode === 0 || s.mode === 2)
      const mesh = new THREE.Mesh(s.geometry, mat)
      mesh.renderOrder = 10 + s.order - ghost * 2
      mesh.frustumCulled = false
      this.group.add(mesh)
      this.layers.push({ mesh, mat, ghost })
    })
    this.group.visible = false
    this.group.name = this.final ? 'getsuga-final' : 'getsuga-first'
  }
  dispose() {
    const geometries = new Set(this.layers.map(l => l.mesh.geometry))
    geometries.forEach(g => g.dispose()); this.layers.forEach(l => l.mat.dispose())
  }
  /** Returns the light intensity the wave should cast (0 when hidden). */
  update(t: number) {
    const { release, hit } = this.cfg
    const visible = t >= release && t < hit + .55
    this.group.visible = visible
    if (!visible) return 0
    this.time.value = t
    const z = this.cfg.z(t)
    const emerge = easeOutBack(lin(t, release, release + .2))
    const k = ramp(t, hit, hit + .12)
    const fade = 1 - ramp(t, hit + (this.final ? .02 : .1), hit + (this.final ? .38 : .5))
    const flicker = .85 + .15 * Math.sin(t * 60) * Math.sin(t * 23)
    this.group.position.set(this.cfg.x, this.cfg.y, z)
    this.group.rotation.set(0, 0, this.cfg.roll)
    // At impact the crescent flattens against its target and spreads.
    const burst = this.final ? 1 + k * .7 : 1, squash = this.final ? 1 : 1 - k * .65
    this.group.scale.set(Math.max(.01, emerge) * burst, Math.max(.01, emerge) * (1 + k * .3) * burst, Math.max(.05, emerge * squash * burst))
    const speed = t < hit ? 1 : 0
    this.layers.forEach(({ mesh, mat, ghost }) => {
      mesh.position.set(0, 0, ghost * (this.final ? .55 : .4) * speed)
      mesh.scale.setScalar(1 - ghost * .06)
      mesh.visible = ghost === 0 || speed > 0
      mat.uniforms.uAlpha.value = fade * flicker * .55 ** ghost * (ghost ? .8 : 1)
    })
    return fade * emerge
  }
}

// --- Ground scars left by each Getsuga ------------------------------------------------
const scarFragment = `
uniform float uReveal; uniform float uAlpha; uniform vec3 uColor; uniform float uTime;
varying vec2 vUv;
void main(){
  float along = vUv.y;
  if (along > uReveal) discard;
  float core = 1.0 - smoothstep(.05, .5, abs(vUv.x - .5));
  float n = fxNoise(vec2(vUv.x * 14.0, along * 30.0));
  float head = smoothstep(uReveal - .12, uReveal, along);
  float a = core * (.55 + .45 * n) * uAlpha * (1.0 + head * 1.5);
  gl_FragColor = vec4(uColor * (1.0 + head), a);
}`
/** A glowing trench revealed along the wave's path; from/to are world z (from > to). */
export type ScarConfig = { release: number; hit: number; x: number; ground: number; from: number; to: number; fade: [number, number] }
export class Scar {
  readonly mesh: THREE.Mesh
  private readonly mat: THREE.ShaderMaterial
  private readonly final: boolean
  private readonly cfg: ScarConfig
  constructor(final: boolean, cfg: ScarConfig) {
    this.final = final
    this.cfg = cfg
    this.mat = fxMaterial(scarFragment, { uReveal: { value: 0 }, uAlpha: { value: 0 }, uColor: { value: new THREE.Color(final ? '#ff2a45' : '#7fe6ff') }, uTime: { value: 0 } })
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(final ? .95 : .5, cfg.from - cfg.to), this.mat)
    this.mesh.rotation.set(-Math.PI / 2, 0, 0)
    this.mesh.position.set(cfg.x, cfg.ground + .035, (cfg.from + cfg.to) / 2)
    this.mesh.renderOrder = 4
    this.mesh.visible = false
  }
  dispose() { this.mesh.geometry.dispose(); this.mat.dispose() }
  update(t: number) {
    const { release, hit, fade } = this.cfg
    const alpha = t < release ? 0 : 1 - ramp(t, hit + fade[0], hit + fade[1])
    this.mesh.visible = alpha > 0
    this.mat.uniforms.uReveal.value = lin(t, release, hit)
    this.mat.uniforms.uAlpha.value = alpha * (this.final ? .9 : .6)
  }
}

// --- Rings, flashes, glows -------------------------------------------------------------
const ringFragment = `
uniform float uAlpha; uniform vec3 uColor; uniform float uWidth;
varying vec2 vUv;
void main(){
  float r = length(vUv - .5) * 2.0;
  float ring = exp(-pow((r - .92) / uWidth, 2.0));
  float fill = smoothstep(1.0, .2, r) * .035;
  gl_FragColor = vec4(uColor, (ring + fill) * uAlpha * step(r, 1.0));
}`
export type RingEvent = { t: number; x: number; z: number; y?: number; radius: number; duration: number; color: string; alpha: number; width?: number; vertical?: boolean }
export class Rings {
  readonly group = new THREE.Group()
  private items: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; e: RingEvent }[]
  private readonly geometry = new THREE.CircleGeometry(1, 64)
  constructor(events: RingEvent[]) {
    this.items = events.map(e => {
      const mat = fxMaterial(ringFragment, { uAlpha: { value: 0 }, uColor: { value: new THREE.Color(e.color) }, uWidth: { value: e.width ?? .05 } })
      const mesh = new THREE.Mesh(this.geometry, mat)
      if (!e.vertical) mesh.rotation.x = -Math.PI / 2
      mesh.position.set(e.x, e.y ?? G + .05, e.z)
      mesh.visible = false
      mesh.renderOrder = 5
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
      mesh.scale.setScalar(Math.max(.01, e.radius * easeOutCubic(x)))
      mat.uniforms.uAlpha.value = e.alpha * (1 - x) ** 1.5
    }
  }
}

const flashFragment = `
uniform float uAlpha; uniform vec3 uColor;
varying vec3 vNormalView; varying vec3 vViewDir;
void main(){
  float f = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))), 1.6);
  gl_FragColor = vec4(uColor, (f * .85 + .15) * uAlpha);
}`
const flashVertex = `varying vec3 vNormalView; varying vec3 vViewDir;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vNormalView = normalMatrix * normal; vViewDir = -mv.xyz; gl_Position = projectionMatrix * mv; }`
export type FlashEvent = { t: number; p: [number, number, number]; from: number; to: number; duration: number; color: string; alpha: number }
export class Flashes {
  readonly group = new THREE.Group()
  private readonly geometry = new THREE.SphereGeometry(1, 28, 18)
  private items: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; e: FlashEvent }[]
  constructor(events: FlashEvent[]) {
    this.items = events.map(e => {
      const mat = new THREE.ShaderMaterial({ vertexShader: flashVertex, fragmentShader: flashFragment, uniforms: { uAlpha: { value: 0 }, uColor: { value: new THREE.Color(e.color) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
      const mesh = new THREE.Mesh(this.geometry, mat)
      mesh.position.set(...e.p); mesh.visible = false; mesh.renderOrder = 12
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
      mesh.scale.setScalar(e.from + (e.to - e.from) * easeOutCubic(x))
      mat.uniforms.uAlpha.value = e.alpha * (1 - x) ** 2
    }
  }
}

const discFragment = `
uniform float uAlpha; uniform vec3 uColor; uniform float uTime;
varying vec2 vUv;
void main(){
  float r = length(vUv - .5) * 2.0;
  float n = fxNoise(vUv * 9.0 + uTime * .7);
  float a = smoothstep(1.0, .55, r) * (.55 + .45 * n) + exp(-pow((r - .9) * 9.0, 2.0)) * .8;
  gl_FragColor = vec4(uColor, a * uAlpha);
}`
/** Soft pink glow behind the petal shield so it reads as a solid barrier. */
export class ShieldGlow {
  readonly mesh: THREE.Mesh
  private readonly mat: THREE.ShaderMaterial
  constructor() {
    this.mat = fxMaterial(discFragment, { uAlpha: { value: 0 }, uColor: { value: new THREE.Color('#ff7fb4') }, uTime: { value: 0 } })
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(1.62, 48), this.mat)
    this.mesh.position.set(BX, G + 1.38, BZ + 1.95)
    this.mesh.visible = false
  }
  dispose() { this.mesh.geometry.dispose(); this.mat.dispose() }
  update(t: number) {
    const strength = window4(t, T.shieldGather + .15, T.shieldGather + .7, T.shieldRelease, T.shieldRelease + .7)
    const hit = impulse(t, T.firstImpact, 3.5)
    this.mesh.visible = strength > .001
    this.mat.uniforms.uAlpha.value = strength * (.2 + hit * .75)
    this.mat.uniforms.uTime.value = t
    this.mesh.scale.set(1 + hit * .12, 1 + hit * .12, 1)
  }
}

// --- Ichigo's Bankai aura ----------------------------------------------------------------
const pillarFragment = `
uniform float uTime; uniform float uAlpha; uniform vec3 uColor; uniform float uDark;
varying vec2 vUv;
void main(){
  float n = fxNoise(vec2(vUv.x * 10.0 + vUv.y * 3.0 - uTime * 1.7, vUv.y * 4.0 - uTime * 5.0));
  float n2 = fxNoise(vec2(vUv.x * 23.0 - uTime * 2.3, vUv.y * 10.0 - uTime * 9.0));
  float streak = smoothstep(.5, .95, n * .62 + n2 * .38);
  float fadeY = smoothstep(0.0, .06, vUv.y) * (1.0 - smoothstep(mix(.45, .12, uDark), mix(1.0, .45, uDark), vUv.y));
  float a = mix(streak, smoothstep(.25, .85, n), uDark) * fadeY * uAlpha;
  gl_FragColor = vec4(uColor * (1.0 + n2 * (1.0 - uDark)), a);
}`
export class BankaiAura {
  readonly group = new THREE.Group()
  private readonly pillar: THREE.Mesh
  private readonly smoke: THREE.Mesh
  private readonly ribbons = new THREE.Group()
  private readonly wipeRing: THREE.Mesh
  private readonly mats: THREE.ShaderMaterial[] = []
  private readonly time = { value: 0 }
  constructor() {
    const cylinder = new THREE.CylinderGeometry(1, 1, 1, 40, 1, true).translate(0, .5, 0)
    const make = (color: string, dark: number, additive: boolean) => {
      const mat = fxMaterial(pillarFragment, { uTime: this.time, uAlpha: { value: 0 }, uColor: { value: new THREE.Color(color) }, uDark: { value: dark } }, additive)
      this.mats.push(mat)
      return mat
    }
    this.pillar = new THREE.Mesh(cylinder, make('#ff2244', 0, true))
    this.smoke = new THREE.Mesh(cylinder, make('#07050a', 1, false))
    this.smoke.renderOrder = 6; this.pillar.renderOrder = 7
    const ribbonMat = make('#ff3150', 0, true)
    for (let k = 0; k < 3; k++) {
      const points = Array.from({ length: 80 }, (_, i) => { const u = i / 79, a = u * Math.PI * 2 * 2.4 + k * 2.09; return new THREE.Vector3(Math.cos(a) * (.75 + u * .35), u * 5.2, Math.sin(a) * (.75 + u * .35)) })
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 120, .045, 5), ribbonMat)
      tube.renderOrder = 8
      this.ribbons.add(tube)
    }
    this.wipeRing = new THREE.Mesh(new THREE.TorusGeometry(.46, .03, 6, 48), new THREE.MeshBasicMaterial({ color: '#ff5a72', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
    this.wipeRing.rotation.x = Math.PI / 2
    this.group.add(this.smoke, this.pillar, this.ribbons, this.wipeRing)
    this.group.position.set(IX, G, IZ)
    this.group.visible = false
  }
  dispose() {
    this.pillar.geometry.dispose(); this.mats.forEach(m => m.dispose())
    this.ribbons.children.forEach(c => (c as THREE.Mesh).geometry.dispose())
    this.wipeRing.geometry.dispose(); (this.wipeRing.material as THREE.Material).dispose()
  }
  /** wipeY: world height of the costume wipe (or null). Returns aura strength 0..1. */
  update(t: number, wipeY: number | null) {
    const erupt = easeOutCubic(lin(t, T.bankaiBurst, T.bankaiBurst + .3))
    const strength = t < T.bankaiBurst ? 0 : erupt * (1 - ramp(t, 17.4, 18.6))
    // A tighter dark flame returns while he charges the final Getsuga.
    const charge = window4(t, T.finalWindup, T.finalSwing - .2, T.finalRelease, T.finalRelease + .5)
    const visible = strength > .001 || charge > .001 || wipeY !== null
    this.group.visible = visible
    if (!visible) return 0
    this.time.value = t
    // Eruption: a wide column that thins quickly so the costume change stays visible.
    // Charge: a tight dark flame hugging Ichigo before the final Getsuga.
    const bursting = strength > charge * .5
    const radius = bursting ? .6 + erupt * .85 : .62, height = bursting ? .2 + erupt * 7 : 3.4 * charge
    const s = bursting ? strength * (.35 + .65 * (1 - ramp(t, T.bankaiBurst + .2, T.wipeStart + .25))) : charge * .5
    this.pillar.scale.set(radius, Math.max(.01, height), radius)
    this.smoke.scale.set(radius * .9, Math.max(.01, Math.min(height, 2.2)), radius * .9)
    this.mats[0].uniforms.uAlpha.value = s * .75
    this.mats[1].uniforms.uAlpha.value = s * .45
    this.mats[2].uniforms.uAlpha.value = strength * .6
    this.ribbons.visible = strength > .01
    this.ribbons.rotation.y = t * 4.2
    this.ribbons.scale.set(1 + erupt * .3, erupt, 1 + erupt * .3)
    this.wipeRing.visible = wipeY !== null
    if (wipeY !== null) this.wipeRing.position.y = wipeY - G
    return Math.max(strength, charge * .6)
  }
}

// --- GPU particles ----------------------------------------------------------------------------
export type Burst = {
  t: number; spread?: number; count: number; origin: [number, number, number]; box?: [number, number, number]
  vel?: [number, number, number]; speed?: [number, number]; radial?: boolean; flat?: boolean; up?: number
  gravity?: number; drag?: number; life: [number, number]; size: [number, number]; colors: string[]
}
const particleVertex = `
attribute vec3 aVel; attribute vec4 aData; attribute vec3 aColor; attribute float aDrag;
uniform float uTime; uniform float uPixel; uniform float uGrow; uniform float uGround;
varying vec3 vColor; varying float vAlpha;
void main(){
  float age = uTime - aData.x;
  if (age < 0.0 || age > aData.y) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vAlpha = 0.0; return; }
  float k = aDrag > 0.0 ? (1.0 - exp(-aDrag * age)) / aDrag : age;
  vec3 p = position + aVel * k;
  p.y -= .5 * aData.w * age * age;
  p.y = max(p.y, uGround);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float life = age / aData.y;
  vAlpha = smoothstep(0.0, .06, age) * pow(1.0 - life, 1.3);
  gl_PointSize = aData.z * (1.0 + uGrow * life * 1.6) * uPixel / max(.1, -mv.z);
  vColor = aColor;
}`
const particleFragment = `
uniform float uSoft;
varying vec3 vColor; varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - .5) * 2.0;
  float a = (uSoft > .5 ? smoothstep(1.0, .0, d) * .42 : smoothstep(1.0, .35, d)) * vAlpha;
  if (a < .003) discard;
  gl_FragColor = vec4(vColor, a);
}`
export class Particles {
  readonly points: THREE.Points
  private readonly mat: THREE.ShaderMaterial
  constructor(bursts: Burst[], additive: boolean, soft: boolean, ground = G + .02) {
    const total = bursts.reduce((n, b) => n + b.count, 0)
    const pos = new Float32Array(total * 3), vel = new Float32Array(total * 3), data = new Float32Array(total * 4), col = new Float32Array(total * 3), drag = new Float32Array(total)
    const color = new THREE.Color(), dir = new THREE.Vector3()
    let n = 0, seed = 1
    const rnd = () => hash(seed++ * 1.618)
    for (const b of bursts) for (let i = 0; i < b.count; i++, n++) {
      const box = b.box ?? [0, 0, 0]
      pos.set([b.origin[0] + (rnd() - .5) * 2 * box[0], b.origin[1] + (rnd() - .5) * 2 * box[1], b.origin[2] + (rnd() - .5) * 2 * box[2]], n * 3)
      const speed = b.speed ? b.speed[0] + rnd() * (b.speed[1] - b.speed[0]) : 0
      if (b.radial) {
        dir.set(rnd() - .5, b.flat ? 0 : rnd() - .5, rnd() - .5).normalize()
        dir.y += b.up ?? 0
      } else dir.set(0, 0, 0)
      const v = b.vel ?? [0, 0, 0]
      vel.set([v[0] + dir.x * speed, v[1] + dir.y * speed, v[2] + dir.z * speed], n * 3)
      data.set([b.t + rnd() * (b.spread ?? 0), b.life[0] + rnd() * (b.life[1] - b.life[0]), b.size[0] + rnd() * (b.size[1] - b.size[0]), b.gravity ?? 0], n * 4)
      color.set(b.colors[Math.floor(rnd() * b.colors.length)])
      col.set([color.r, color.g, color.b], n * 3)
      drag[n] = b.drag ?? 0
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aVel', new THREE.BufferAttribute(vel, 3))
    g.setAttribute('aData', new THREE.BufferAttribute(data, 4))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
    g.setAttribute('aDrag', new THREE.BufferAttribute(drag, 1))
    this.mat = new THREE.ShaderMaterial({
      vertexShader: particleVertex, fragmentShader: particleFragment,
      uniforms: { uTime: { value: -1 }, uPixel: { value: 500 }, uGrow: { value: soft ? 1 : 0 }, uGround: { value: ground }, uSoft: { value: soft ? 1 : 0 } },
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false,
    })
    this.points = new THREE.Points(g, this.mat)
    this.points.frustumCulled = false
    this.points.renderOrder = additive ? 14 : 9
  }
  dispose() { this.points.geometry.dispose(); this.mat.dispose() }
  update(t: number, pixelScale: number) {
    this.mat.uniforms.uTime.value = t
    this.mat.uniforms.uPixel.value = pixelScale
  }
}

const pink = ['#ffd0e2', '#ff9cc4', '#ffffff', '#ffb8d2']
const crimson = ['#ff2a48', '#ff6b7d', '#c3102c', '#ffd0d6']
const sand = ['#e6d7b8', '#dccaa6', '#f1e7d1']

export function sparkBursts(): Burst[] {
  const out: Burst[] = [
    // Byakuya's blade scatters into glittering motes.
    { t: T.scatter, spread: .9, count: 70, origin: [BX - .05, G + 1.9, BZ + .45], box: [.05, .45, .05], radial: true, speed: [.4, 1.2], life: [.6, 1.3], size: [.05, .09], colors: pink },
    // First Getsuga: cyan spray where it meets the shield.
    { t: T.firstImpact, spread: .08, count: 170, origin: [BX, G + 1.35, BZ + 2.2], box: [.5, .5, .1], radial: true, speed: [2.5, 7], vel: [0, .6, 2], gravity: 6, drag: 1.2, life: [.35, .9], size: [.05, .1], colors: ['#c9f6ff', '#6fdcff', '#ffffff', '#ffb3cf'] },
    // Ichigo's Bankai eruption and sustained reiatsu embers.
    { t: T.bankaiBurst, spread: .1, count: 240, origin: [IX, G + 1.1, IZ], box: [.3, .7, .3], radial: true, speed: [4, 10], drag: 1.5, gravity: 1, life: [.5, 1.3], size: [.06, .12], colors: crimson },
    { t: T.bankaiBurst + .2, spread: 3.2, count: 280, origin: [IX, G + .2, IZ], box: [.7, .2, .7], vel: [0, 2.4, 0], radial: true, speed: [.2, .9], life: [.7, 1.5], size: [.05, .1], colors: crimson },
    { t: T.finalWindup, spread: .8, count: 120, origin: [IX, G + 1.4, IZ], box: [.4, .9, .4], vel: [0, 1.8, 0], radial: true, speed: [.3, 1.2], life: [.4, .9], size: [.05, .09], colors: crimson },
    // Final Getsuga: embers peel off along its path, then a large impact spray.
    { t: T.finalImpact, spread: .1, count: 360, origin: [BX, G + 1.4, BZ + .5], box: [.6, .7, .3], radial: true, speed: [4, 13], vel: [0, 1, -2], gravity: 5, drag: 1.1, life: [.5, 1.4], size: [.06, .13], colors: [...crimson, '#ffffff'] },
    // The scene settles: a few warm motes hang in the light.
    { t: T.finalImpact + 1.2, spread: 9, count: 120, origin: [BX + 1, G + 1.6, BZ + 3.5], box: [5, 1.4, 5], vel: [.15, .12, 0], radial: true, speed: [.05, .2], life: [4, 7], size: [.04, .07], colors: ['#fff1cf', '#ffd9a8', '#ffe8f0'] },
  ]
  for (let k = 0; k < 16; k++) {
    const u = k / 15
    out.push({ t: T.firstRelease + u * (T.firstImpact - T.firstRelease), count: 7, origin: [IX, G + 1.1, firstWaveZ(T.firstRelease + u * (T.firstImpact - T.firstRelease))], box: [.4, .6, .05], radial: true, speed: [.3, 1.4], vel: [0, .6, .8], life: [.3, .7], size: [.04, .08], colors: ['#dff9ff', '#79dfff'] })
    const tf = T.finalRelease + u * (T.finalImpact - T.finalRelease)
    out.push({ t: tf, count: 12, origin: [IX, G + 1.3, finalWaveZ(tf)], box: [.9, 1, .05], radial: true, speed: [.8, 2.4], vel: [0, 1, 1.4], life: [.4, .9], size: [.05, .1], colors: crimson })
    // The Bankai wipe sheds sparks as it climbs.
    const tw = T.wipeStart + u * (T.wipeEnd - T.wipeStart)
    out.push({ t: tw, count: 6, origin: [IX, G + .05 + u * 1.85, IZ], box: [.42, .02, .42], radial: true, flat: true, speed: [.6, 1.6], life: [.3, .6], size: [.04, .07], colors: ['#ffb0bd', '#ff3653'] })
  }
  BLADES.forEach(b => {
    const d0 = bladeDissolveStart(b)
    for (let k = 0; k < 5; k++) out.push({ t: d0 + k * DISSOLVE_DURATION / 5, count: 5, origin: [b.x, G + b.height * (1 - k / 5), b.z], box: [.35, .2, .35], vel: [0, .5, 0], radial: true, speed: [.2, .8], life: [.5, 1.1], size: [.05, .09], colors: pink })
    out.push({ t: bladeRiseStart(b) + .42, count: 3, origin: [b.x, G + b.height, b.z], box: [.05, .05, .05], radial: true, speed: [.1, .4], life: [.2, .45], size: [.12, .2], colors: ['#ffffff'] })
  })
  return out
}
export function dustBursts(): Burst[] {
  const out: Burst[] = [
    { t: T.swordDrop + .3, count: 26, origin: [BX + .02, G + .08, BZ + .55], box: [.2, .03, .2], radial: true, flat: true, up: .25, speed: [.8, 2], drag: 2.2, life: [.9, 1.6], size: [.35, .6], colors: ['#f2d9e2', '#e4ccb0'] },
    { t: T.bankaiBurst, spread: .1, count: 90, origin: [IX, G + .15, IZ], box: [.3, .05, .3], radial: true, flat: true, up: .15, speed: [3, 7], drag: 2, life: [1, 1.8], size: [.5, 1], colors: sand },
    { t: T.bankaiBurst + .3, spread: 2.8, count: 70, origin: [IX, G + .3, IZ], box: [.5, .2, .5], vel: [0, .9, 0], radial: true, flat: true, speed: [.3, .9], life: [.6, 1.1], size: [.3, .55], colors: ['#2a1016', '#3d141d', '#1b0d12'] },
    { t: T.finalImpact, spread: .1, count: 120, origin: [BX, G + .3, BZ + .3], box: [.5, .2, .4], radial: true, flat: true, up: .3, speed: [2.5, 6.5], drag: 1.8, life: [1.2, 2.2], size: [.5, 1.1], colors: sand },
    { t: T.finalImpact, spread: .15, count: 26, origin: [BX, G + 1.2, BZ + .3], box: [.4, .5, .3], radial: true, speed: [1, 2.5], drag: 1.8, life: [.5, 1], size: [.4, .7], colors: ['#3a1a22', '#5a2a33'] },
  ]
  BLADES.forEach(b => out.push({ t: bladeRiseStart(b) + .02, spread: .12, count: 16, origin: [b.x, G + .15, b.z], box: [.4, .05, .4], radial: true, flat: true, up: .6, speed: [.9, 2.6], drag: 2.2, gravity: .6, life: [1.1, 2], size: [.4, .85], colors: sand }))
  for (let k = 0; k < 10; k++) {
    const tf = T.finalRelease + k / 9 * (T.finalImpact - T.finalRelease)
    out.push({ t: tf, count: 7, origin: [IX, G + .25, finalWaveZ(tf)], box: [.6, .1, .1], radial: true, flat: true, up: .5, speed: [.6, 1.6], drag: 2, life: [.8, 1.4], size: [.35, .7], colors: sand })
  }
  return out
}

export function ringEvents(): RingEvent[] {
  return [
    ...[0, 1, 2].map(k => ({ t: T.swordDrop + .32 + k * .2, x: BX + .02, z: BZ + .55, radius: 3.2 - k * .5, duration: 1.3, color: '#ffc6da', alpha: .85, width: .04 })),
    { t: T.bladesRise - .05, x: -14, z: -87, radius: 7, duration: 1.1, color: '#ffd4e4', alpha: .35, width: .03 },
    { t: T.bankaiBurst, x: IX, z: IZ, radius: 9, duration: .9, color: '#ff2a48', alpha: 1, width: .05 },
    { t: T.bankaiBurst + .12, x: IX, z: IZ, radius: 5.5, duration: 1.1, color: '#ff8090', alpha: .55, width: .08 },
    { t: T.finalImpact, x: BX, z: BZ + .3, radius: 8.5, duration: 1, color: '#ff2a48', alpha: 1, width: .05 },
    { t: T.finalImpact + .1, x: BX, z: BZ + .3, radius: 5, duration: 1.1, color: '#ffe0e4', alpha: .3, width: .06 },
    // A vertical ripple where the first Getsuga meets the petal shield.
    { t: T.firstImpact, x: BX, y: G + 1.38, z: BZ + 2.02, radius: 2.1, duration: .7, color: '#bdf3ff', alpha: .9, width: .06, vertical: true },
  ]
}
export function flashEvents(): FlashEvent[] {
  return [
    { t: T.scatter - .05, p: [BX - .05, G + 1.95, BZ + .45], from: .1, to: .8, duration: .5, color: '#ff9cc4', alpha: .7 },
    { t: T.firstImpact, p: [BX, G + 1.38, BZ + 2.05], from: .3, to: 1.7, duration: .45, color: '#aef0ff', alpha: 1 },
    { t: T.bankaiBurst, p: [IX, G + 1.1, IZ], from: .4, to: 2.4, duration: .5, color: '#ff2a48', alpha: .9 },
    { t: T.finalImpact, p: [BX, G + 1.4, BZ + .35], from: .5, to: 3.0, duration: .5, color: '#ff2140', alpha: .9 },
    { t: T.finalImpact + .03, p: [BX, G + 1.4, BZ + .35], from: .2, to: 1.6, duration: .3, color: '#ffffff', alpha: .8 },
  ]
}

// Senbonzakura petals: one InstancedMesh, every petal a pure function of finale time.
// Each petal walks a chain of formations (sword → swirl → shield → swirl → absorbed →
// giant blade → storm/cocoon → burst → storm → torrent → fall), blending with a per-petal
// stagger so the crowd flows rather than snapping.
import * as THREE from 'three'
import { ARENA_CENTER, BYAKUYA_MARK, GROUND_Y, ICHIGO_MARK, T, clamp01, finalWaveZ, hash, ramp } from './timeline'
import { BLADES, bladeDissolveStart, bladeRiseAmount, DISSOLVE_DURATION } from './blades'

export const PETAL_COUNT = 3200
const SHIKAI_COUNT = 1300
const TAU = Math.PI * 2
const [BX, , BZ] = BYAKUYA_MARK, [IX, , IZ] = ICHIGO_MARK, [CX, , CZ] = ARENA_CENTER
const G = GROUND_Y

export type PetalContext = { swordBase: THREE.Vector3; swordDir: THREE.Vector3; swordLength: number; camera: THREE.Vector3 }

function petalGeometry() {
  const s = new THREE.Shape()
  s.moveTo(0, -.062)
  s.bezierCurveTo(.05, -.046, .054, .028, .022, .06)
  s.lineTo(0, .046)
  s.lineTo(-.022, .06)
  s.bezierCurveTo(-.054, .028, -.05, -.046, 0, -.062)
  const g = new THREE.ShapeGeometry(s, 5)
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i)
    p.setZ(i, -x * x * 7 + (y + .062) ** 2 * 2.2)
  }
  g.computeVertexNormals()
  return g
}

const smooth = (x: number) => { const c = clamp01(x); return c * c * (3 - 2 * c) }
const fract = (x: number) => x - Math.floor(x)

export class PetalStorm {
  readonly mesh: THREE.InstancedMesh
  private seeds: Float32Array
  private axes: Float32Array
  private readonly matrix = new THREE.Matrix4()
  private readonly p = new THREE.Vector3()
  private readonly a = new THREE.Vector3()
  private readonly b = new THREE.Vector3()
  private readonly q = new THREE.Quaternion()
  private readonly qAlign = new THREE.Quaternion()
  private readonly qFlat = new THREE.Quaternion()
  private readonly axis = new THREE.Vector3()
  private readonly scale = new THREE.Vector3()
  private readonly flatBase = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
  private readonly yAxis = new THREE.Vector3(0, 1, 0)
  /** Density of airborne petals near Byakuya, for lighting. */
  energy = 0

  constructor() {
    const material = new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: .36, metalness: .12, emissive: '#b5306c', emissiveIntensity: .32 })
    this.mesh = new THREE.InstancedMesh(petalGeometry(), material, PETAL_COUNT)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.frustumCulled = false
    this.mesh.name = 'senbonzakura-petals'
    this.seeds = new Float32Array(PETAL_COUNT * 5)
    this.axes = new Float32Array(PETAL_COUNT * 3)
    const palette = ['#ffc4d8', '#f7a3c3', '#fbd9e6', '#ee86b0', '#ffb3cc', '#f9e7ee'].map(c => new THREE.Color(c))
    const color = new THREE.Color()
    for (let i = 0; i < PETAL_COUNT; i++) {
      for (let k = 0; k < 5; k++) this.seeds[i * 5 + k] = hash(i * (1.13 + k * 1.71) + k * 7.3 + .5)
      this.axis.set(hash(i * 3.1 + .2) - .5, hash(i * 5.7 + .9) - .5, hash(i * 9.3 + 1.7) - .5).normalize()
      this.axes.set([this.axis.x, this.axis.y, this.axis.z], i * 3)
      color.copy(palette[i % palette.length]).multiplyScalar(.92 + hash(i * 1.9) * .16)
      this.mesh.setColorAt(i, color)
    }
    this.mesh.instanceColor!.needsUpdate = true
  }

  dispose() { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); this.mesh.dispose() }

  // --- formations (write into out) -------------------------------------------------
  private swirl(i: number, t: number, out: THREE.Vector3) {
    const s = this.seeds, o = i * 5
    const u = fract(s[o + 1] + t * .085)
    const ang = u * TAU * 1.45 + t * 1.55 + (i % 3) * 2.094 + (s[o + 2] - .5) * .55
    const r = .72 + .75 * Math.sin(u * Math.PI) + (s[o + 3] - .5) * .38
    out.set(BX + Math.cos(ang) * r, G + .18 + u * 3.15 + (s[o + 4] - .5) * .28, BZ + Math.sin(ang) * r + .35)
    return Math.min(1, Math.sin(u * Math.PI) * 3)
  }
  private shield(i: number, t: number, out: THREE.Vector3) {
    const s = this.seeds, o = i * 5, R = 1.38
    const r = Math.sqrt(s[o + 1]) * R, k = r / R
    const ang = s[o + 2] * TAU + t * .85
    const since = t - T.firstImpact
    const ripple = since > 0 ? Math.sin(r * 8 - since * 17) * .12 * Math.exp(-since * 2.4) * (1 - k * .4) : 0
    const dent = since > 0 ? -.42 * Math.exp(-since * 5) * (1 - k * k) : 0
    out.set(BX + Math.cos(ang) * r, G + 1.38 + Math.sin(ang) * r * .92, BZ + 1.8 + .34 * (1 - k * k) + (s[o + 3] - .5) * .08 + ripple + dent)
  }
  private onSword(i: number, ctx: PetalContext, out: THREE.Vector3) {
    const h = this.seeds[i * 5 + 1]
    out.copy(ctx.swordBase).addScaledVector(ctx.swordDir, .12 + h * ctx.swordLength)
    out.x += (this.seeds[i * 5 + 3] - .5) * .05; out.z += (this.seeds[i * 5 + 4] - .5) * .05
  }
  private onBlade(i: number, t: number, out: THREE.Vector3) {
    const s = this.seeds, o = i * 5, blade = BLADES[i % BLADES.length]
    const h = s[o + 1], across = s[o + 2] - .5
    const lift = bladeRiseAmount(blade, t)
    out.set(blade.x + Math.cos(blade.yaw) * across * blade.width * .8, G + (h * lift - (1 - lift) * .2) * blade.height, blade.z - Math.sin(blade.yaw) * across * blade.width * .8)
  }
  private storm(i: number, t: number, out: THREE.Vector3) {
    const s = this.seeds, o = i * 5
    // Storm → cocoon around Ichigo before his Bankai, then reforms around Byakuya.
    const cocoon = ramp(t, T.cocoon, T.bankaiBurst - .15)
    const cx = CX + (IX - CX) * cocoon, cz = CZ + (IZ - CZ) * cocoon
    const radius = 4.7 + (1.35 - 4.7) * cocoon, height = 5.4 + (3.1 - 5.4) * cocoon
    const r = radius * (.32 + .68 * Math.sqrt(s[o + 1]))
    const a = s[o + 2] * TAU + t * (1.25 + 1.5 * (1 - s[o + 1]) + cocoon * 2.2)
    const y = .12 + s[o + 3] * height + Math.sin(t * 1.3 + s[o + 4] * TAU) * .28
    out.set(cx + Math.cos(a) * r, G + y, cz + Math.sin(a) * r)
  }
  private burst(i: number, t: number, out: THREE.Vector3) {
    this.storm(i, T.bankaiBurst, out)
    const tau = t - T.bankaiBurst, s = this.seeds[i * 5]
    this.a.set(out.x - IX, out.y - (G + 1.2), out.z - IZ)
    if (this.a.lengthSq() < 1e-4) this.a.set(1, 0, 0)
    this.a.normalize()
    const d = 4.4 * (1 - Math.exp(-3.4 * tau)) * (.65 + .7 * s)
    out.addScaledVector(this.a, d)
    out.y = Math.max(G + .05, out.y + (1 - Math.exp(-2 * tau)) * .9)
  }
  private stormB(i: number, t: number, out: THREE.Vector3) {
    const s = this.seeds, o = i * 5
    const r = 3.35 * (.3 + .7 * Math.sqrt(s[o + 1]))
    const a = s[o + 2] * TAU - t * (1.1 + 1.2 * (1 - s[o + 1]))
    out.set(BX + Math.cos(a) * r, G + .15 + s[o + 3] * 4.8 + Math.sin(t * 1.1 + s[o + 4] * TAU) * .3, BZ + 2.1 + Math.sin(a) * r * .9)
  }
  private torrent(i: number, t: number, out: THREE.Vector3) {
    const s = this.seeds, o = i * 5
    const f = fract(s[o + 1] + t * .6)
    const r = (.22 + 1.2 * Math.sin(Math.PI * f) ** .8) * (.35 + .65 * Math.sqrt(s[o + 2]))
    const a = s[o + 3] * TAU + t * 3.1 + f * 4
    const cz = BZ + .8 + (IZ - .9 - BZ - .8) * f, cy = G + 1.35 - .15 * f
    out.set(BX + Math.cos(a) * r, cy + Math.sin(a) * r * .85, cz)
    if (t > T.finalRelease) {
      // The black Getsuga splits the torrent: petals it has passed are thrown aside.
      const passed = out.z - finalWaveZ(Math.min(t, T.finalImpact))
      if (passed > 0) {
        const push = ramp(passed, 0, 1.6) * (2.1 + s[o + 4] * 1.3)
        const dx = Math.cos(a) || .01, dy = Math.sin(a) * .85
        const len = Math.hypot(dx, dy)
        out.x += dx / len * push; out.y += Math.abs(dy / len) * push * .55 + push * .2
      }
    }
    return smooth(f / .07) * smooth((1 - f) / .12)
  }
  private fallFade = 1
  private fall(i: number, t: number, out: THREE.Vector3) {
    this.fallFade = this.torrent(i, T.finalImpact, out)
    const s = this.seeds, o = i * 5, tau = t - T.finalImpact
    this.a.set(out.x - BX, out.y - (G + 1.3), out.z - (BZ + .4))
    const len = this.a.length() || 1
    this.a.multiplyScalar(1 / len)
    out.addScaledVector(this.a, 2.3 * (1 - Math.exp(-2.4 * tau)) * (.45 + s[o] * .9))
    out.y += .9 * (1 - Math.exp(-3 * tau))
    const drop = Math.max(0, tau - .3) * (.5 + .55 * s[o + 2])
    const airborne = out.y - drop > G + .03
    out.y = Math.max(G + .025 + s[o + 3] * .01, out.y - drop)
    if (airborne) {
      out.x += Math.sin(tau * 2.1 + s[o + 4] * TAU) * .32
      out.z += Math.cos(tau * 1.7 + s[o + 1] * TAU) * .22
    }
    return airborne ? 0 : 1
  }

  // --- evaluation -------------------------------------------------------------------
  /** Returns scale; writes position into this.p; sets align (shield) and flat (landed) weights. */
  private evaluate(i: number, t: number, ctx: PetalContext, w: { align: number; flat: number }) {
    const s = this.seeds, o = i * 5, sa = s[o]
    w.align = 0; w.flat = 0
    // Phase A: Shikai (first SHIKAI_COUNT petals only).
    if (t < T.reform + 1.2) {
      if (i >= SHIKAI_COUNT) return 0
      const born = T.scatter + (1 - s[o + 1]) * .85 + sa * .2
      if (t < born) return 0
      this.onSword(i, ctx, this.a)
      let scale = smooth((t - born) / .12)
      let fade = this.swirl(i, t, this.b)
      const toSwirl = smooth((t - born) / .85)
      this.p.lerpVectors(this.a, this.b, toSwirl)
      fade = 1 + (fade - 1) * toSwirl
      const shieldIn = smooth((t - T.shieldGather - sa * .38) / .42), shieldOut = smooth((t - T.shieldRelease - sa * .6) / .75)
      const shieldW = shieldIn * (1 - shieldOut)
      if (shieldW > 0) { this.shield(i, t, this.a); this.p.lerp(this.a, shieldW); fade = 1 + (fade - 1) * (1 - shieldW); scale *= 1 + shieldW * .35; w.align = shieldW }
      const absorb = smooth((t - T.reform - sa * .55) / .4)
      if (absorb > 0) { this.onSword(i, ctx, this.a); this.p.lerp(this.a, absorb); scale *= 1 - absorb }
      return scale * fade
    }
    // Phase B: Bankai. Every petal is shed by one of the giant blades.
    const blade = BLADES[i % BLADES.length]
    const born = bladeDissolveStart(blade) + (1 - s[o + 1]) * DISSOLVE_DURATION * .92
    if (t < born) return 0
    let scale = smooth((t - born) / .15)
    if (t < T.bankaiBurst) {
      this.onBlade(i, born, this.a)
      this.storm(i, t, this.b)
      const k = smooth((t - born) / 1.15)
      this.p.lerpVectors(this.a, this.b, k)
      this.p.y += Math.sin(k * Math.PI) * .6
      return scale
    }
    if (t < T.finalImpact) {
      let fade = 1
      this.burst(i, t, this.p)
      const k = smooth((t - 16.55 - sa * .9) / 1.2)
      if (k > 0) { this.stormB(i, t, this.a); this.p.lerp(this.a, k) }
      const kt = smooth((t - T.torrent - sa * .55) / .7)
      if (kt > 0) { fade = this.torrent(i, t, this.a); this.p.lerp(this.a, kt); fade = 1 + (fade - 1) * kt }
      return scale * fade
    }
    w.flat = this.fall(i, t, this.p)
    // Petals that were fading at the torrent's ends ease back in instead of popping at impact.
    scale *= this.fallFade + (1 - this.fallFade) * smooth((t - T.finalImpact) / .5)
    const fadeStart = T.finalImpact + 3.6 + sa * 2.4
    scale *= 1 - smooth((t - fadeStart) / 1.3)
    return scale
  }

  private weights = { align: 0, flat: 0 }
  /** time: finale clock. departure: seconds since completion (petals carry Byakuya away), or -1. */
  update(time: number, ctx: PetalContext, departure = -1) {
    const arr = this.mesh.instanceMatrix.array as Float32Array
    const w = this.weights
    this.mesh.count = PETAL_COUNT
    this.mesh.instanceMatrix.clearUpdateRanges()
    let energy = 0
    for (let i = 0; i < PETAL_COUNT; i++) {
      const o = i * 5, sd = this.seeds
      let scale: number
      if (departure >= 0) {
        // Byakuya departs in a spiral of petals.
        if (i >= 700) { scale = 0 } else {
          const tc = departure, u = sd[o + 1]
          const ang = sd[o + 2] * TAU + tc * (2.4 + u * 2)
          const r = .35 + tc * (.9 + u * .8)
          this.p.set(BX + Math.cos(ang) * r, G + .2 + sd[o + 3] * 1.7 + tc * (1.3 + u * 1.6), BZ - 1.6 + Math.sin(ang) * r)
          scale = smooth(tc / .2) * (1 - smooth((tc - .9 - u * .6) / .7))
          w.align = 0; w.flat = 0
        }
      } else scale = this.evaluate(i, time, ctx, w)
      // Petals that drift into the lens shrink away instead of filling the frame.
      if (scale > .001) scale *= smooth((this.p.distanceTo(ctx.camera) - .9) / 1.9)
      if (scale <= .001) {
        // Collapse hidden petals to a degenerate matrix.
        arr.fill(0, i * 16, i * 16 + 16)
        continue
      }
      if (this.p.distanceToSquared(this.b.set(BX, G + 1.5, BZ + 1)) < 30) energy++
      // Tumbling orientation, optionally aligned to the shield or laid flat on the ground.
      this.axis.fromArray(this.axes, i * 3)
      this.q.setFromAxisAngle(this.axis, sd[o + 4] * TAU + time * (1.6 + sd[o] * 4.2) * (1 - w.flat))
      if (w.align > 0) { this.qAlign.setFromAxisAngle(this.axis, (sd[o + 2] - .5) * .5); this.q.slerp(this.qAlign, w.align) }
      if (w.flat > 0) { this.qFlat.setFromAxisAngle(this.yAxis, sd[o + 2] * TAU).multiply(this.flatBase); this.q.slerp(this.qFlat, w.flat) }
      const sz = scale * (.85 + sd[o + 3] * .5)
      this.scale.set(sz, sz, sz)
      this.matrix.compose(this.p, this.q, this.scale)
      this.matrix.toArray(arr, i * 16)
    }
    this.energy = energy / PETAL_COUNT
    this.mesh.instanceMatrix.needsUpdate = true
  }

  /** A few petals drifting around Byakuya while the hill is explored. */
  updateIdle(elapsed: number) {
    const arr = this.mesh.instanceMatrix.array as Float32Array
    const n = 90
    for (let i = 0; i < n; i++) {
      const o = i * 5, sd = this.seeds
      const u = fract(sd[o + 1] + elapsed * .04)
      const ang = sd[o + 2] * TAU + elapsed * .35
      const r = 1.1 + sd[o + 3] * 1.6
      this.p.set(BX + Math.cos(ang) * r, G + .3 + u * 3.2, BZ + Math.sin(ang) * r)
      this.axis.fromArray(this.axes, i * 3)
      this.q.setFromAxisAngle(this.axis, elapsed * (1 + sd[o]))
      const sz = Math.sin(u * Math.PI) * (.8 + sd[o + 4] * .4)
      this.scale.set(sz, sz, sz)
      this.matrix.compose(this.p, this.q, this.scale)
      this.matrix.toArray(arr, i * 16)
    }
    // Only the idle petals are drawn and uploaded while exploring.
    this.mesh.count = n
    this.mesh.instanceMatrix.clearUpdateRanges()
    this.mesh.instanceMatrix.addUpdateRange(0, n * 16)
    this.mesh.instanceMatrix.needsUpdate = true
  }
}

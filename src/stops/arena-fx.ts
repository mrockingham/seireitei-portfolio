// Effects for the captains' training arena, all pure functions of the loop time:
// - Tenken: a phantom armoured arm that appears in the air behind Komamura and brings a vast
//   blade down where Tōsen stood (a mirror of Komamura's own swing).
// - Enma Kōrogi: Tōsen's silver rings spread from Suzumushi, rise to the crown of a black dome
//   that swallows the arena floor, and scatter when the dome shatters.
// - The dome itself: opaque black with a faint violet rim, it shudders and cracks as
//   Kokujō Tengen Myō'ō grows inside, then breaks apart from the top down.
import * as THREE from 'three'
import { easeInCubic, easeOutCubic, lin, window4 } from '../finale/timeline'
import { AB, DOME_CENTER, DOME_RADIUS, TENKEN_PIVOT, TENKEN_TARGET } from './arena'

export class TenkenArm {
  readonly group = new THREE.Group()
  private readonly swing = new THREE.Group()
  private readonly body: THREE.MeshStandardMaterial
  private readonly edge: THREE.MeshBasicMaterial
  private readonly geos: THREE.BufferGeometry[] = []
  private readonly start = 1.95
  private readonly end: number
  constructor() {
    this.body = new THREE.MeshStandardMaterial({ color: '#1b2129', emissive: '#0b2a38', roughness: .45, metalness: .35, transparent: true, flatShading: true })
    this.edge = new THREE.MeshBasicMaterial({ color: '#8feaff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y = 0, sz?: [number, number, number]) => {
      this.geos.push(g); const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, 0); if (sz) mesh.scale.set(...sz); mesh.castShadow = m === this.body; this.swing.add(mesh); return mesh
    }
    // Along local +X: armoured forearm, fist, grip, guard, and the blade with a glowing edge.
    add(new THREE.BoxGeometry(2.6, 1.5, 1.5), this.body, 1.3)
    for (const x of [.5, 1.3, 2.1]) add(new THREE.BoxGeometry(.2, 1.65, 1.65), this.body, x)
    add(new THREE.BoxGeometry(1.5, 1.6, 1.6), this.body, 3.2)
    add(new THREE.CylinderGeometry(.22, .22, .9, 8).rotateZ(Math.PI / 2), this.body, 4.1)
    add(new THREE.BoxGeometry(.18, 1.7, 1.2), this.body, 4.55)
    const blade = new THREE.Shape()
    blade.moveTo(0, -.45); blade.lineTo(5.4, -.45); blade.lineTo(6.2, .4); blade.lineTo(0, .4); blade.closePath()
    add(new THREE.ExtrudeGeometry(blade, { depth: .14, bevelEnabled: false }).translate(0, 0, -.07), this.body, 4.65)
    add(new THREE.BoxGeometry(5.5, .1, .18), this.edge, 4.65 + 2.75, -.47)
    this.group.add(this.swing)
    this.group.position.set(...TENKEN_PIVOT)
    this.end = Math.atan2(TENKEN_TARGET[1] - TENKEN_PIVOT[1], TENKEN_TARGET[0] - TENKEN_PIVOT[0])
    this.group.visible = false
  }
  dispose() { this.geos.forEach(g => g.dispose()); this.body.dispose(); this.edge.dispose() }
  update(t: number) {
    const a = window4(t, AB.tenkenRaise, AB.tenkenSwing, AB.tenken + .3, AB.tenkenEnd)
    this.group.visible = a > .01
    if (!this.group.visible) return
    // It reaches out of the air, then the swing accelerates into the ground.
    const reach = easeOutCubic(lin(t, AB.tenkenRaise, AB.tenkenSwing))
    this.swing.scale.set(.25 + .75 * reach, .6 + .4 * reach, .6 + .4 * reach)
    this.swing.rotation.z = this.start + (this.end - this.start) * easeInCubic(lin(t, AB.tenkenSwing, AB.tenken))
    this.body.opacity = a
    this.edge.opacity = a * (.7 + .3 * Math.sin(t * 30))
    this.body.depthWrite = a > .98
  }
}

const HOOPS = 10
const center = new THREE.Vector3(...DOME_CENTER)
const CROWN_R = 2.4
const crownY = center.y + Math.sqrt(DOME_RADIUS ** 2 - CROWN_R ** 2)
/** Tōsen's silver rings (Enma Kōrogi), from the spinning blade to the dome's crown and away. */
export class Hoops {
  readonly mesh: THREE.InstancedMesh
  private readonly mat = new THREE.MeshStandardMaterial({ color: '#e6e9ec', emissive: '#40444c', metalness: .55, roughness: .28 })
  private readonly m = new THREE.Matrix4(); private readonly p = new THREE.Vector3(); private readonly q = new THREE.Quaternion(); private readonly s = new THREE.Vector3()
  private readonly n = new THREE.Vector3(); private readonly a = new THREE.Vector3(); private readonly b = new THREE.Vector3(); private readonly c = new THREE.Vector3()
  private static readonly Z = new THREE.Vector3(0, 0, 1)
  private static readonly UP = new THREE.Vector3(0, 1, 0)
  private readonly origin: THREE.Vector3
  constructor(origin: THREE.Vector3) {
    this.origin = origin
    this.mesh = new THREE.InstancedMesh(new THREE.TorusGeometry(.72, .05, 8, 36), this.mat, HOOPS)
    this.mesh.frustumCulled = false
    this.mesh.castShadow = true
    this.mesh.visible = false
  }
  dispose() { this.mesh.geometry.dispose(); this.mat.dispose(); this.mesh.dispose() }
  update(t: number) {
    this.mesh.visible = t > AB.rings && t < AB.burstEnd + .1
    if (!this.mesh.visible) return
    const spread = easeOutCubic(lin(t, AB.rings, AB.ringsOut)), rise = lin(t, AB.ringsRise, AB.ringsTop), fly = lin(t, AB.burst, AB.burstEnd)
    const riseE = rise * rise * (3 - 2 * rise)
    for (let i = 0; i < HOOPS; i++) {
      const ang = i / HOOPS * Math.PI * 2 + t * (.25 + .4 * (1 - riseE))
      // Around Tōsen at waist height...
      this.a.set(this.origin.x + Math.sin(ang) * 3.2, 1.2 + .25 * Math.sin(t * 2.2 + i), this.origin.z + Math.cos(ang) * 3.2)
      this.p.copy(this.origin).lerp(this.a, spread)
      // ...then up to a circle of holes around the dome's crown.
      this.b.set(center.x + Math.sin(ang) * CROWN_R, crownY, center.z + Math.cos(ang) * CROWN_R)
      if (rise > 0) this.p.lerp(this.b, riseE).y += Math.sin(rise * Math.PI) * 1.2
      this.n.copy(Hoops.UP)
      if (rise > 0) this.n.lerp(this.c.copy(this.b).sub(center).normalize(), riseE).normalize()
      // Scattered by the burst: flung outward, tumbling, shrinking away.
      if (fly > 0) {
        this.c.copy(this.b).sub(center).setY(0).normalize()
        this.p.addScaledVector(this.c, fly * 9).y += fly * 3 - fly * fly * 9
        this.n.applyAxisAngle(this.c.set(-this.c.z, 0, this.c.x), fly * 6)
      }
      this.q.setFromUnitVectors(Hoops.Z, this.n)
      const size = Math.min(1, spread * 1.4 + .15) * (1 - fly)
      this.m.compose(this.p, this.q, this.s.setScalar(Math.max(.001, size)))
      this.mesh.setMatrixAt(i, this.m)
    }
    this.mesh.instanceMatrix.needsUpdate = true
  }
}

const domeVertex = `
uniform float uTime; uniform float uWobble;
varying vec3 vLocal; varying vec3 vNormalView; varying vec3 vViewDir;
void main(){
  vLocal = position;
  float w = sin(position.x * 5.0 + uTime * 7.0) * sin(position.y * 6.0 - uTime * 6.0) * sin(position.z * 5.5 + uTime * 8.0);
  vec3 p = position * (1.0 + w * uWobble);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vNormalView = normalMatrix * normal; vViewDir = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`
const domeFragment = `
uniform float uTime; uniform float uCrack; uniform float uDissolve;
varying vec3 vLocal; varying vec3 vNormalView; varying vec3 vViewDir;
float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vn(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
void main(){
  // Breaks apart from the crown down, in ragged patches.
  float n = vn(vLocal * 3.2) * .6 + vn(vLocal * 7.0) * .4;
  float cut = uDissolve * 1.6 - (1.0 - vLocal.y) * .45;
  if (n < cut) discard;
  float rim = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))), 2.4);
  float band = .5 + .5 * sin(atan(vLocal.z, vLocal.x) * 14.0 + vLocal.y * 6.0 - uTime * .8);
  vec3 col = vec3(.018, .014, .03) + vec3(.2, .15, .38) * rim * (.6 + .4 * band);
  float crack = smoothstep(.014, .0, abs(vn(vLocal * 6.0) - .5)) * uCrack * (.6 + .4 * vn(vLocal * 20.0));
  float edge = smoothstep(cut + .07, cut, n) * step(.001, uDissolve);
  col += vec3(1.0, .62, .3) * (crack * 1.4 + edge * 2.0);
  gl_FragColor = vec4(col, 1.0);
}`
/** Enma Kōrogi's dome. */
export class DarkDome {
  readonly mesh: THREE.Mesh
  private readonly mat: THREE.ShaderMaterial
  constructor() {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: domeVertex, fragmentShader: domeFragment, side: THREE.DoubleSide, toneMapped: false,
      uniforms: { uTime: { value: 0 }, uWobble: { value: 0 }, uCrack: { value: 0 }, uDissolve: { value: 0 } },
    })
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), this.mat)
    this.mesh.position.copy(center)
    this.mesh.visible = false
  }
  dispose() { this.mesh.geometry.dispose(); this.mat.dispose() }
  update(t: number, time: number) {
    this.mesh.visible = t > AB.dome && t < AB.burstEnd
    if (!this.mesh.visible) return
    const grow = easeOutCubic(lin(t, AB.dome, AB.domeFull))
    this.mesh.scale.setScalar(Math.max(.05, DOME_RADIUS * grow))
    const u = this.mat.uniforms
    u.uTime.value = time
    // It shudders harder and harder as the giant grows inside.
    const strain = lin(t, AB.bankai, AB.burst)
    u.uWobble.value = strain * strain * .05 + (t < AB.domeFull ? (1 - grow) * .04 : 0)
    u.uCrack.value = lin(t, AB.giant, AB.burst)
    u.uDissolve.value = lin(t, AB.burst, AB.burstEnd - .1)
  }
}

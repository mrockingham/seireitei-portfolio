import * as THREE from 'three'

// A tiny procedural sky/sand environment so metal blades reflect the world's palette.
// Generated once per renderer; no downloaded HDRs.
const envCache = new WeakMap<THREE.WebGLRenderer, THREE.Texture>()
export function getEnvMap(gl: THREE.WebGLRenderer) {
  const cached = envCache.get(gl)
  if (cached) return cached
  const scene = new THREE.Scene()
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        vec3 zenith = vec3(.30,.52,.72), horizon = vec3(.86,.9,.88), sand = vec3(.55,.46,.33);
        vec3 c = d.y > 0.0 ? mix(horizon, zenith, pow(d.y, .5)) : mix(horizon * .8, sand, pow(-d.y, .35));
        c += vec3(1.0,.93,.8) * pow(max(dot(d, normalize(vec3(.5,.75,.35))), 0.0), 64.0) * 6.0;
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), material)
  scene.add(sphere)
  const pmrem = new THREE.PMREMGenerator(gl)
  const texture = pmrem.fromScene(scene, .02).texture
  pmrem.dispose(); sphere.geometry.dispose(); material.dispose()
  envCache.set(gl, texture)
  return texture
}

const geometryCache = new Map<string, THREE.BufferGeometry>()
/** Shared, never-disposed primitive geometry cache for the procedural figures. */
export function cachedGeometry(key: string, make: () => THREE.BufferGeometry) {
  let g = geometryCache.get(key)
  if (!g) { g = make(); geometryCache.set(key, g) }
  return g
}
export const cyl = (rt: number, rb: number, h: number, seg = 10, open = false, t0 = 0, tl = Math.PI * 2) =>
  cachedGeometry(`cyl:${rt}:${rb}:${h}:${seg}:${open}:${t0}:${tl}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, t0, tl))

/** Shallow tailored folds, shared by every rig.
 * The waist stays fitted; pleats open toward the hem without adding meshes or draw calls.
 */
export function cloth(rt: number, rb: number, h: number, folds = 7, open = false, t0 = 0, tl = Math.PI * 2) {
  return cachedGeometry(`cloth:${rt}:${rb}:${h}:${folds}:${open}:${t0}:${tl}`, () => {
    const g = new THREE.CylinderGeometry(rt, rb, h, Math.max(12, Math.ceil(folds * 6 * tl / (Math.PI * 2))), 4, open, t0, tl)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), drop = .5 - p.getY(i) / h
      const angle = Math.atan2(x, z)
      const trough = .5 + .5 * Math.cos(angle * folds)
      // Open coats fold outward to keep their existing clearance over the trousers.
      const fold = 1 + (open ? .07 * (1 - trough) : -.12 * trough) * (.15 + .85 * drop * drop)
      p.setXYZ(i, x * fold, p.getY(i), z * fold)
    }
    g.computeVertexNormals()
    g.computeBoundingBox()
    g.computeBoundingSphere()
    return g
  })
}
export const sph = (r: number, ws = 12, hs = 10, phiStart = 0, phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI) =>
  cachedGeometry(`sph:${r}:${ws}:${hs}:${phiStart}:${phiLength}:${thetaStart}:${thetaLength}`, () => new THREE.SphereGeometry(r, ws, hs, phiStart, phiLength, thetaStart, thetaLength))
export const box = (w: number, h: number, d: number) => cachedGeometry(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d))
export const cone = (r: number, h: number, seg = 6) => cachedGeometry(`cone:${r}:${h}:${seg}`, () => new THREE.ConeGeometry(r, h, seg))
export const torus = (r: number, tube: number, rs = 6, ts = 16, arc = Math.PI * 2) => cachedGeometry(`torus:${r}:${tube}:${rs}:${ts}:${arc}`, () => new THREE.TorusGeometry(r, tube, rs, ts, arc))

/** Flat blade profile extruded to a thin slab; points are [x, y] with y along the blade. */
export function bladeGeometry(key: string, points: [number, number][], depth: number, bevel = .004) {
  return cachedGeometry(`blade:${key}`, () => {
    const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)))
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 1 })
    g.translate(0, 0, -depth / 2)
    g.computeVertexNormals()
    return g
  })
}

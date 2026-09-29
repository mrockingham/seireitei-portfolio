// The route guide: soft blue light along both edges of the white stone road, floating arrows over
// it, and signposts at the junctions. The stretch from where you stand to your next fight glows
// brightest, with pulses running toward it; the rest of the route stays faintly lit. If you have
// jumped past your next fight on the map, the arrows on that stretch turn around and point back.
import { memo, useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { nearestS, routeAt, routeLength, stopS } from './route/route'
import { buildSignposts } from './route/signs'

const HALF_WIDTH = 1.45
const ARROW_EVERY = 8.5
const color = '#4fc3ff'

const edgeVertex = `
attribute float aS; attribute float aV;
varying float vS; varying float vV; varying float vFade;
uniform vec3 uCamera;
void main(){
  vS = aS; vV = aV;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vFade = 1.0 - smoothstep(60.0, 110.0, distance(world.xyz, uCamera));
  gl_Position = projectionMatrix * viewMatrix * world;
}`
const edgeFragment = `
uniform vec3 uColor; uniform float uTime; uniform float uFrom; uniform float uTo; uniform float uDir; uniform float uAll;
varying float vS; varying float vV; varying float vFade;
void main(){
  float lo = min(uFrom, uTo), hi = max(uFrom, uTo);
  float onStretch = smoothstep(lo - 6.0, lo - 1.0, vS) * (1.0 - smoothstep(hi, hi + 4.0, vS));
  float pulse = pow(fract((vS - uDir * uTime * 7.0) / 14.0), 6.0);
  float across = 1.0 - abs(vV * 2.0 - 1.0);
  // Solid, not additive: glow on pale stone in daylight has to be paint-bright to read.
  float strength = mix(.32 + .15 * uAll, .95, onStretch);
  vec3 col = uColor * (1.0 + .8 * pulse * onStretch) + vec3(.3, .35, .4) * pulse * onStretch;
  gl_FragColor = vec4(col, strength * smoothstep(0.0, .35, across) * vFade);
}`

/** A flat light strip along one edge of the route, with arc length (aS) per vertex. */
function edgeGeometry(side: number) {
  const pos: number[] = [], s: number[] = [], v: number[] = [], index: number[] = []
  const p = new THREE.Vector3(), d = new THREE.Vector3(), prev = new THREE.Vector3(), next = new THREE.Vector3(), n = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  let k = 0, wasHidden = true
  for (let x = 0; x <= routeLength; x += .5) {
    const kind = routeAt(x, p, d)
    // Average the directions either side so the strips mitre cleanly at the corners.
    routeAt(x - .5, prev, prev.clone()); routeAt(x + .5, next, next.clone())
    n.subVectors(next, prev).setY(0).normalize().cross(up).multiplyScalar(side)
    const lift = kind === 'stairs' ? .22 : kind === 'indoor' ? -100 : .035
    for (const [w, vv] of [[HALF_WIDTH - .06, 0], [HALF_WIDTH + .06, 1]]) {
      const q = p.clone().addScaledVector(n, w)
      pos.push(q.x, q.y + lift, q.z); s.push(x); v.push(vv)
    }
    const hidden = lift < -1
    if (k > 0 && !hidden && !wasHidden) { const a = (k - 1) * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    wasHidden = hidden
    k++
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1))
  g.setAttribute('aV', new THREE.Float32BufferAttribute(v, 1))
  g.setIndex(index)
  return g
}

/** A flat chevron pointing along +Z. */
function chevronGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(0, .3); shape.lineTo(.4, -.06); shape.lineTo(.34, -.13); shape.lineTo(0, .18); shape.lineTo(-.34, -.13); shape.lineTo(-.4, -.06); shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, { depth: .05, bevelEnabled: false })
  g.translate(0, 0, -.025)
  // Lay it flat with the tip toward +Z.
  g.rotateX(Math.PI / 2)
  return g
}

const arrowCount = Math.floor(routeLength / ARROW_EVERY)
const tmpP = new THREE.Vector3(), tmpD = new THREE.Vector3(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), scale = new THREE.Vector3(), c = new THREE.Color()
const e = new THREE.Euler(0, 0, 0, 'YXZ')
/** Development only: window.__route.next(stage) previews the guide for a given next fight; next() releases it. */
const debug = { next: null as number | null }

function RouteGuide({ nextStage, visible, playerPosition }: { nextStage: number; visible: boolean; playerPosition: RefObject<THREE.Vector3> }) {
  const group = useRef<THREE.Group>(null)
  const edges = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: edgeVertex, fragmentShader: edgeFragment, transparent: true, depthWrite: false, toneMapped: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uFrom: { value: 0 }, uTo: { value: 0 }, uDir: { value: 1 }, uAll: { value: 0 }, uCamera: { value: new THREE.Vector3() } },
    })
    const meshes = [-1, 1].map(side => { const m = new THREE.Mesh(edgeGeometry(side), mat); m.frustumCulled = false; m.renderOrder = 3; return m })
    return { mat, meshes }
  }, [])
  const arrows = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: 'varying float vA; varying vec2 vP; void main(){ vA = instanceColor.r; vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uColor; varying float vA; varying vec2 vP; void main(){ vec3 c = mix(uColor, vec3(.85, .96, 1.0), .35 * (1.0 - smoothstep(0.0, .3, abs(vP.x)))); gl_FragColor = vec4(c * (1.0 + .4 * vA), min(1.0, vA)); }',
      uniforms: { uColor: { value: new THREE.Color(color) } }, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    })
    const mesh = new THREE.InstancedMesh(chevronGeometry(), mat, arrowCount)
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(arrowCount * 3), 3)
    mesh.frustumCulled = false
    mesh.renderOrder = 4
    // Arrows stand at even spacing, skipping the first few metres and each fight's own mark.
    const at = Array.from({ length: arrowCount }, (_, i) => (i + .6) * ARROW_EVERY).filter(s => stopS.every(t => Math.abs(s - t) > 3.5))
    return { mat, mesh, at }
  }, [])
  const signs = useMemo(() => buildSignposts(), [])
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __route?: unknown }
    w.__route = { next: (n?: number) => { debug.next = n ?? null } }
    return () => { delete w.__route }
  }, [])
  useEffect(() => () => {
    edges.meshes.forEach(m => m.geometry.dispose()); edges.mat.dispose()
    arrows.mesh.geometry.dispose(); arrows.mat.dispose(); arrows.mesh.dispose()
    signs.dispose()
  }, [edges, arrows, signs])

  useFrame(state => {
    const g = group.current
    if (!g) return
    // eslint-disable-next-line react/immutability -- scene objects are updated per frame by design.
    g.visible = visible
    if (!visible) return
    const t = state.clock.elapsedTime
    const player = playerPosition.current
    const here = nearestS(player)
    const next = debug.next ?? nextStage
    const done = next > 3
    const target = done ? routeLength : stopS[next]
    // Off the road (at a side stop, say), the lit stretch starts from the nearest point of the route.
    const from = here.s
    const dir = target >= from ? 1 : -1
    const u = edges.mat.uniforms
    // eslint-disable-next-line react/immutability -- shader uniforms owned by this guide, advanced per frame.
    u.uTime.value = t; u.uFrom.value = done ? 0 : from; u.uTo.value = done ? routeLength : target; u.uDir.value = dir; u.uAll.value = done ? 1 : 0
    u.uCamera.value.copy(state.camera.position)
    // ---- Arrows ----
    const lo = Math.min(from, target), hi = Math.max(from, target)
    let n = 0
    for (const s of arrows.at) {
      const kind = routeAt(s, tmpP, tmpD)
      const inStretch = !done && s > lo - 4 && s < hi + 2
      const point = inStretch ? dir : 1
      const dist = tmpP.distanceTo(state.camera.position)
      // Bright on the stretch ahead, faint elsewhere; they fade out far away and when you walk through them.
      const bright = (inStretch ? 1 : done ? .45 : .3) * (1 - THREE.MathUtils.smoothstep(dist, 40, 70)) * THREE.MathUtils.smoothstep(tmpP.distanceTo(player), 1.2, 3.5)
      tmpP.y += (kind === 'stairs' ? 1.5 : 1.25) + Math.sin(t * 2.2 + s * .4) * .1
      // Tipped up by ~30° so the follow camera behind sees the arrow's face, not its edge.
      e.set(-Math.asin(THREE.MathUtils.clamp(tmpD.y, -1, 1)) * point - .55, Math.atan2(tmpD.x * point, tmpD.z * point), 0)
      q.setFromEuler(e)
      const pop = (inStretch ? 1 + .12 * Math.max(0, Math.sin(t * 4 - s * .35)) : .85) * 1.2
      m4.compose(tmpP, q, scale.setScalar(pop))
      arrows.mesh.setMatrixAt(n, m4)
      arrows.mesh.setColorAt(n, c.setRGB(bright, bright, bright))
      n++
    }
    // eslint-disable-next-line react/immutability -- the arrow instances are owned here and rewritten per frame.
    arrows.mesh.count = n
    arrows.mesh.instanceMatrix.needsUpdate = true
    if (arrows.mesh.instanceColor) arrows.mesh.instanceColor.needsUpdate = true
  })

  return <>
    <group ref={group} name="route-guide">
      {edges.meshes.map((m, i) => <primitive key={i} object={m} />)}
      <primitive object={arrows.mesh} />
    </group>
    <primitive object={signs.group} />
    <RigidBody type="fixed" colliders={false}>
      {signs.colliders.map((p, k) => <CuboidCollider key={k} args={[.14, 1.4, .14]} position={[p[0], 1.4, p[2]]} />)}
    </RigidBody>
  </>
}

export default memo(RouteGuide)

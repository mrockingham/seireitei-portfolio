// The route guide, in the manner of an airliner's aisle lighting: rows of small floor lights along
// both edges of the white stone road, small chevrons lit into the paving, and signposts at the
// junctions. On the stretch from where you stand to your next fight the lights are brighter and a
// soft glow runs along them toward it; the rest of the route stays faintly lit. If you have jumped
// past your next fight on the map, the chevrons on that stretch turn around and point back.
import { memo, useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { nearestS, routeAt, routeLength, stopS } from './route/route'
import { buildSignposts } from './route/signs'

const HALF_WIDTH = 1.45
const ARROW_EVERY = 11
const color = '#5cc8ff'
/** The glow that runs along the lights: speed (m/s) and spacing (m) — the chevrons follow the same wave. */
const CHASE_SPEED = 5, CHASE_GAP = 18
const chaseAt = (s: number, t: number, dir: number) => { const x = (s - dir * t * CHASE_SPEED) / CHASE_GAP; return (x - Math.floor(x)) ** 10 }

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
  float across = 1.0 - abs(vV * 2.0 - 1.0);
  // A dark track in the paving (it gives the lights contrast in daylight), with a light every 0.9 m.
  float cell = fract(vS / .9);
  float light = smoothstep(0.0, .03, cell) * (1.0 - smoothstep(.24, .28, cell)) * smoothstep(.1, .45, across);
  float chase = pow(fract((vS - uDir * uTime * 5.0) / 18.0), 10.0);
  float strength = mix(.3 + .12 * uAll, .8 + .2 * chase, onStretch);
  vec3 lit = mix(uColor, vec3(.92, .98, 1.0), .65 * chase * onStretch);
  vec3 col = mix(vec3(.13, .17, .2), lit, light);
  float alpha = mix(.4 * smoothstep(0.0, .2, across), strength, light);
  gl_FragColor = vec4(col, alpha * vFade);
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
    for (const [w, vv] of [[HALF_WIDTH - .05, 0], [HALF_WIDTH + .05, 1]]) {
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
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
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
      // Lit into the paving: brighter on the stretch ahead (and as the running glow passes), faint elsewhere.
      const bright = (inStretch ? .65 + .35 * chaseAt(s, t, dir) : done ? .3 : .22) * (1 - THREE.MathUtils.smoothstep(dist, 40, 70))
      tmpP.y += kind === 'stairs' ? .25 : .045
      e.set(-Math.asin(THREE.MathUtils.clamp(tmpD.y, -1, 1)) * point, Math.atan2(tmpD.x * point, tmpD.z * point), 0)
      q.setFromEuler(e)
      m4.compose(tmpP, q, scale.setScalar(.85))
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

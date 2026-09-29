// The journey route as a polyline along the white stone road, from the world manifest's ROUTE
// markers: gate → east along the plaza road → through the barracks → out the rear doors → west
// past the Eleventh Division yard → south and west along the stream → over the bridge into the
// Kuchiki compound → through the receiving hall → up the switchback stairs → Sōkyoku Hill.
// The route guide lights its edges and floats arrows along it; distances are arc lengths (m).
import * as THREE from 'three'

type V3 = [number, number, number]
/** kind: 'road' (lit edges), 'indoor' (arrows only), 'stairs' (arrows, edges raised a little). */
export type RouteNode = { p: V3; stop?: 0 | 1 | 2 | 3; next?: 'road' | 'indoor' | 'stairs' }

export const routeNodes: RouteNode[] = [
  { p: [0, .02, 22], next: 'road' },
  { p: [0, .2, 5], stop: 0, next: 'road' },
  { p: [28, .02, 5], next: 'road' },
  { p: [28, .03, 3.6], next: 'indoor' },
  { p: [28, .6, -11], stop: 1, next: 'indoor' },
  { p: [28, .03, -25], next: 'road' },
  { p: [28, .02, -32], next: 'road' },
  { p: [-3, .02, -32], next: 'road' },
  { p: [-3, .02, -19], next: 'road' },
  { p: [-22, .2, -19], next: 'road' },
  { p: [-22, .75, -24], next: 'road' },
  { p: [-22, .23, -28], next: 'road' },
  { p: [-22, .23, -32], stop: 2, next: 'road' },
  { p: [-22, .61, -39], next: 'indoor' },
  { p: [-22, .6, -51], next: 'indoor' },
  { p: [-22, .61, -61], next: 'road' },
  { p: [-22, .02, -63.5], next: 'road' },
  { p: [-22, .02, -65], next: 'stairs' },
  { p: [4, 11, -65], next: 'stairs' },
  { p: [4, 11, -69], next: 'stairs' },
  { p: [-22, 22, -69], next: 'road' },
  { p: [-22, 22.04, -77], next: 'road' },
  { p: [-14, 22.04, -87], stop: 3 },
]

const nodes = routeNodes.map(n => new THREE.Vector3(...n.p))
/** Cumulative arc length at each node. */
export const nodeS: number[] = nodes.reduce<number[]>((acc, p, i) => { acc.push(i ? acc[i - 1] + p.distanceTo(nodes[i - 1]) : 0); return acc }, [])
export const routeLength = nodeS[nodeS.length - 1]
/** Arc length of each encounter's stop (index = stage). */
export const stopS: number[] = [0, 1, 2, 3].map(stage => nodeS[routeNodes.findIndex(n => n.stop === stage)])

/** Point, tangent, and segment kind at arc length s. */
export function routeAt(s: number, pos: THREE.Vector3, dir: THREE.Vector3) {
  const x = THREE.MathUtils.clamp(s, 0, routeLength)
  let i = 0
  while (i < nodeS.length - 2 && nodeS[i + 1] < x) i++
  const a = nodes[i], b = nodes[i + 1]
  const u = (x - nodeS[i]) / Math.max(1e-6, nodeS[i + 1] - nodeS[i])
  pos.lerpVectors(a, b, u)
  dir.subVectors(b, a).normalize()
  return routeNodes[i].next ?? 'road'
}

const seg = new THREE.Vector3(), rel = new THREE.Vector3()
/** The arc length of the route point nearest to p (in plan; height breaks ties near the stairs), and its distance. */
export function nearestS(p: THREE.Vector3) {
  let best = 0, bestD = Infinity
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i], b = nodes[i + 1]
    seg.subVectors(b, a)
    const len2 = seg.x * seg.x + seg.z * seg.z
    rel.subVectors(p, a)
    const u = len2 > 0 ? THREE.MathUtils.clamp((rel.x * seg.x + rel.z * seg.z) / len2, 0, 1) : 0
    const dx = rel.x - seg.x * u, dz = rel.z - seg.z * u, dy = (rel.y - seg.y * u) * .5
    const d = Math.hypot(dx, dz, dy)
    if (d < bestD) { bestD = d; best = nodeS[i] + Math.sqrt(len2 + seg.y * seg.y) * u }
  }
  return { s: best, distance: bestD }
}

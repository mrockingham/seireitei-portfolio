// Wooden signposts at the route's junctions: arrow-shaped boards pointing the way to each place,
// with the number (or ✦ for side stops), the name in English, and a line of Japanese.
import * as THREE from 'three'

type V3 = [number, number, number]
/** A board: where it points (world yaw of its tip: 0 = north/−Z, π/2 = east/+X) and what it says. */
export type Board = { toward: 'N' | 'E' | 'S' | 'W'; label: string; name: string; jp: string }
export type Signpost = { at: V3; boards: Board[] }

const B = (toward: Board['toward'], label: string, name: string, jp: string): Board => ({ toward, label, name, jp })
export const signposts: Signpost[] = [
  // Inside the gate, on the plaza.
  { at: [-4.6, 0, 9.4], boards: [B('E', '02', 'Division barracks', '隊舎'), B('E', '✦', 'Training grounds', '修練場'), B('W', '✦', 'Twelfth Division lab', '技術開発局')] },
  // The corner by the barracks' front door.
  { at: [31.4, 0, 7.8], boards: [B('N', '02', 'Division barracks', '隊舎'), B('S', '✦', 'Training grounds', '修練場'), B('W', '01', 'Spirit gate', '門')] },
  // Behind the barracks, at the rear doors.
  { at: [31.2, 0, -34.8], boards: [B('W', '03', 'Kuchiki compound', '朽木家'), B('W', '✦', 'Eleventh Division yard', '十一番隊'), B('S', '02', 'Division barracks', '隊舎')] },
  // Where the road turns back south toward the stream: the compound's gate is over the bridge.
  { at: [-.4, 0, -35], boards: [B('S', '03', 'Kuchiki compound · bridge', '朽木家'), B('E', '✦', 'Eleventh Division yard', '十一番隊'), B('E', '02', 'Division barracks', '隊舎')] },
  { at: [.3, 0, -21.6], boards: [B('W', '03', 'Kuchiki compound', '朽木家'), B('N', '02', 'Division barracks', '隊舎')] },
  // The route goes around the house (the lawn by the stream is not a path).
  { at: [-4.8, 0, -16.6], boards: [B('S', '03', 'Kuchiki compound', '朽木家'), B('N', '02', 'Division barracks', '隊舎')] },
  { at: [-24.9, 0, -5.4], boards: [B('N', '03', 'Kuchiki compound · bridge', '朽木家'), B('S', '✦', 'Twelfth Division lab', '技術開発局')] },
  // Beyond the receiving hall, at the foot of the stairs.
  { at: [-25.4, 0, -66.6], boards: [B('E', '04', 'Sōkyoku Hill · stairs', '双殛の丘'), B('W', '✦', 'Captains’ training arena', '修練場'), B('S', '03', 'Kuchiki compound', '朽木家')] },
  { at: [-40.5, 0, -64.5], boards: [B('W', '✦', 'Captains’ training arena', '七番隊 · 九番隊'), B('E', '04', 'Sōkyoku Hill', '双殛の丘')] },
]

const yawOf: Record<Board['toward'], number> = { N: Math.PI / 2, E: 0, S: -Math.PI / 2, W: Math.PI }

/** Board face texture; `flip` draws the arrow on the left (the back face of a board pointing right). */
function boardTexture(b: Board, flip: boolean) {
  const c = document.createElement('canvas'); c.width = 640; c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#1f252b'; ctx.fillRect(0, 0, 640, 128)
  ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 4; ctx.strokeRect(6, 6, 628, 116)
  const arrowX = flip ? 44 : 596
  ctx.fillStyle = '#e9bd92'
  ctx.beginPath(); ctx.moveTo(arrowX + (flip ? -22 : 22), 64); ctx.lineTo(arrowX + (flip ? 16 : -16), 36); ctx.lineTo(arrowX + (flip ? 16 : -16), 92); ctx.closePath(); ctx.fill()
  const x0 = flip ? 96 : 34
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#e9bd92'; ctx.font = 'bold 40px "Manrope", "DM Sans", sans-serif'
  ctx.fillText(b.label, x0, 50)
  const lw = ctx.measureText(b.label).width
  ctx.fillStyle = '#f4efe2'; ctx.font = '600 34px "Manrope", "DM Sans", sans-serif'
  ctx.fillText(b.name.toUpperCase(), x0 + lw + 18, 50, 470 - lw)
  ctx.fillStyle = '#b9c4c3'; ctx.font = '26px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif'
  ctx.fillText(b.jp, x0 + lw + 18, 94)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

/** Builds every signpost; returns the group, collider boxes, and a disposer. */
export function buildSignposts() {
  const group = new THREE.Group()
  group.name = 'route-signposts'
  const wood = new THREE.MeshStandardMaterial({ color: '#6e4b30', roughness: .8 })
  const cap = new THREE.MeshStandardMaterial({ color: '#343a41', roughness: .7 })
  const post = new THREE.CylinderGeometry(.09, .11, 2.9, 8), top = new THREE.ConeGeometry(.16, .22, 4)
  const board = new THREE.BoxGeometry(1.9, .38, .05), tip = new THREE.CylinderGeometry(.19, .19, .05, 3)
  const face = new THREE.PlaneGeometry(1.9, .38)
  const disposables: { dispose(): void }[] = [wood, cap, post, top, board, tip, face]
  const colliders: V3[] = []
  for (const s of signposts) {
    const g = new THREE.Group(); g.position.set(...s.at); group.add(g)
    const p = new THREE.Mesh(post, wood); p.position.y = 1.45; p.castShadow = true; g.add(p)
    const c = new THREE.Mesh(top, cap); c.position.y = 3.0; c.rotation.y = Math.PI / 4; g.add(c)
    s.boards.forEach((b, i) => {
      const arm = new THREE.Group(); arm.position.y = 2.45 - i * .48; arm.rotation.y = yawOf[b.toward]; g.add(arm)
      const m = new THREE.Mesh(board, wood); m.position.x = 1.02; m.castShadow = true; arm.add(m)
      const t = new THREE.Mesh(tip, wood); t.position.x = 1.97 + .06; t.rotation.set(Math.PI / 2, 0, -Math.PI / 2); arm.add(t)
      for (const back of [false, true]) {
        const tex = boardTexture(b, back), mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
        disposables.push(tex, mat)
        const f = new THREE.Mesh(face, mat); f.position.set(1.02, 0, back ? -.027 : .027); if (back) f.rotation.y = Math.PI
        arm.add(f)
      }
    })
    colliders.push(s.at)
  }
  return { group, colliders, dispose() { disposables.forEach(d => d.dispose()) } }
}

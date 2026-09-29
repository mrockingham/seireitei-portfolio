// The Twelfth Division's Research and Development Institute: a round, domed lab in the open lot
// west of the gate courtyard. Directions around the room use an azimuth φ with d(φ) = (sin φ, 0,
// cos φ): the door faces east (φ = π/2) toward the courtyard; the screen wall faces it from the west.
import * as THREE from 'three'
import { websites } from '../portfolio-content'
import type { Website } from '../portfolio-content'

type V3 = [number, number, number]
export const LAB_CENTER: V3 = [-19.5, 0, 6.5]
export const LAB_FLOOR = .06
export const LAB_RADIUS = 7.5, LAB_INNER = 7.15, LAB_WALL = 6.2
export const DOOR_PHI = Math.PI / 2, DOOR_HALF = 1.55, DOOR_HEIGHT = 3.3
export const SCREEN_PHI = -Math.PI / 2
/** Site screens: two rows of four on a curve around the west wall. */
export const SCREEN_W = 2.4, SCREEN_H = 1.35, SCREEN_R = 6.55
export const SCREEN_COLS = [-.6545, -.2182, .2182, .6545]
export const SCREEN_ROWS = [3.5, 1.98]
export const SITES_PER_WALL = SCREEN_COLS.length * SCREEN_ROWS.length
/** Every site gets a slot; with none yet, eight placeholders stand in (clearly marked). */
export const siteSlots: { site: Website | null; index: number }[] = websites.length ? websites.map((site, index) => ({ site, index })) : Array.from({ length: SITES_PER_WALL }, (_, index) => ({ site: null, index }))

export const dir = (phi: number, out = new THREE.Vector3()) => out.set(Math.sin(phi), 0, Math.cos(phi))
/** A point in the lab at azimuth φ, radius r, height y. */
export const around = (phi: number, r: number, y: number): V3 => [LAB_CENTER[0] + Math.sin(phi) * r, y, LAB_CENTER[2] + Math.cos(phi) * r]

/** Screen slot i: top row left to right, then the bottom row (as seen from the room). */
export function screenSlot(i: number) {
  const row = Math.floor(i / SCREEN_COLS.length), col = i % SCREEN_COLS.length
  // Seen from inside, facing west, the viewer's left is south (+Z): walk the columns from +φ offset.
  const phi = SCREEN_PHI - SCREEN_COLS[col]
  const p = around(phi, SCREEN_R, SCREEN_ROWS[row])
  return { phi, position: new THREE.Vector3(...p), yaw: phi + Math.PI, row, col }
}

const f = new THREE.Vector3()
/**
 * Gallery framing for slot i. Wide screens: the screen sits left of centre (the panel is on the
 * right). Tall screens: the camera backs off and the screen sits above centre (the panel is below).
 */
export function galleryFraming(i: number, aspect: number, pos: THREE.Vector3, look: THREE.Vector3) {
  const s = screenSlot(i)
  dir(s.phi, f)
  const tall = aspect < .9
  const dist = tall ? 4.5 : 4.7
  pos.copy(s.position).addScaledVector(f, -dist)
  // Eye height, looking up a little at the top row.
  pos.y = s.position.y * .55 + 1.05
  look.copy(s.position)
  if (tall) look.y -= 1.1
  else { look.x += -f.z * 1.25; look.z += f.x * 1.25 }
  return tall ? 64 : 44
}

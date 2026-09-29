// Shot list for the finale. Each shot dollies between two framings; `blend` eases in from
// the previous shot (0 = hard cut). Most shots are two-shots so both fighters stay readable.
import * as THREE from 'three'
import { T, clamp01, impulse, noise1, ramp } from './timeline'
import { BLADES, bladeRiseStart } from './blades'

type V3 = [number, number, number]
type Frame = { pos: V3; look: V3; fov: number }
/** portrait: an alternative framing for tall screens, when a wide shot cannot hold both subjects. */
export type Shot = { start: number; end: number; from: Frame; to: Frame; blend: number; ease?: 'inOut' | 'out' | 'linear'; portrait?: { from: Frame; to: Frame } }

const shots: Shot[] = [
  // Establishing three-quarter two-shot; the Sōkyoku frame stands behind Byakuya.
  { start: 0, end: 1.7, blend: 0, from: { pos: [-9.4, 24.5, -76.6], look: [-14.3, 23.4, -88.4], fov: 46 }, to: { pos: [-10.2, 24.25, -77.7], look: [-14.3, 23.5, -89], fov: 43 } },
  // Over Ichigo's shoulder as the blade scatters.
  { start: 1.7, end: 4.25, blend: .7, from: { pos: [-15.7, 24.0, -79.5], look: [-13.7, 23.7, -91], fov: 40 }, to: { pos: [-15.25, 23.85, -80.3], look: [-13.8, 23.9, -91], fov: 37 } },
  // Front three-quarter on Ichigo's wind-up, Byakuya waiting behind him.
  { start: 4.25, end: 5.32, blend: 0, from: { pos: [-20.3, 23.8, -79.6], look: [-14.4, 23.45, -85.2], fov: 44 }, to: { pos: [-20.0, 23.65, -80.3], look: [-14.4, 23.4, -85.4], fov: 41 } },
  // Side profile: launch, shield, impact.
  { start: 5.32, end: 6.95, blend: 0, from: { pos: [-6.1, 23.5, -86.3], look: [-14, 23.3, -87.1], fov: 50 }, to: { pos: [-6.6, 23.4, -87.4], look: [-14, 23.3, -88], fov: 47 }, ease: 'linear' },
  { start: 6.95, end: 9.0, blend: .9, from: { pos: [-8.6, 23.9, -84.6], look: [-14.2, 23.5, -89.8], fov: 46 }, to: { pos: [-9.5, 23.7, -85.7], look: [-14.2, 23.6, -90.6], fov: 42 } },
  // Low, behind Ichigo: the sword falls into the ground.
  { start: 9.0, end: 10.5, blend: 0, from: { pos: [-15.45, 22.95, -79.6], look: [-13.75, 23.4, -91], fov: 38 }, to: { pos: [-15.2, 22.85, -80.4], look: [-13.75, 23.1, -91], fov: 35 } },
  // High crane down the corridor: two rows of blades erupt around both fighters.
  { start: 10.5, end: 13.0, blend: 0, from: { pos: [-12.6, 25.3, -71.0], look: [-14.2, 23.9, -88], fov: 54 }, to: { pos: [-13.2, 30.2, -73.2], look: [-14.1, 23.7, -88.5], fov: 54 } },
  // Inside the corridor as the blades dissolve into petals.
  { start: 13.0, end: 15.0, blend: 0, from: { pos: [-13.05, 23.0, -77.7], look: [-14.1, 25.2, -89], fov: 62 }, to: { pos: [-13.3, 23.2, -79], look: [-14.1, 24.3, -89], fov: 58 } },
  // The storm closes around Ichigo; the camera circles him.
  { start: 15.0, end: 15.95, blend: 0, from: { pos: [-8.7, 23.9, -79.4], look: [-14, 23.4, -83.3], fov: 42 }, to: { pos: [-8.3, 23.8, -85.6], look: [-14, 23.5, -83.2], fov: 40 } },
  // Bankai burst: fast pull back to a low hero angle.
  { start: 15.95, end: 17.3, blend: 0, from: { pos: [-9.9, 23.2, -87.1], look: [-14, 23.8, -83.1], fov: 46 }, to: { pos: [-8.3, 22.95, -88.7], look: [-14, 24.0, -83.1], fov: 50 }, ease: 'out' },
  // A slow orbit around the transformed Ichigo, the storm gathering behind him.
  { start: 17.3, end: 19.35, blend: 0, from: { pos: [-8.8, 23.0, -86.9], look: [-14, 23.6, -83.1], fov: 40 }, to: { pos: [-9.3, 23.25, -79.6], look: [-14, 23.6, -83.1], fov: 38 } },
  // Low behind Ichigo as the petal torrent comes at him.
  { start: 19.35, end: T.finalRelease, blend: 0, from: { pos: [-15.5, 22.95, -79.2], look: [-13.8, 23.7, -90], fov: 50 }, to: { pos: [-15.25, 22.85, -79.9], look: [-13.8, 23.7, -90], fov: 48 } },
  // Wide side tracking shot as the black Getsuga cuts through.
  { start: T.finalRelease, end: T.finalImpact, blend: 0, from: { pos: [-4.9, 23.9, -84.4], look: [-14, 23.4, -85.8], fov: 57 }, to: { pos: [-5.2, 23.95, -88.4], look: [-14, 23.4, -89.8], fov: 54 }, ease: 'linear' },
  { start: T.finalImpact, end: 22.6, blend: .15, from: { pos: [-5.35, 23.95, -88.7], look: [-14, 23.4, -88.6], fov: 55 }, to: { pos: [-6.0, 24.0, -88.2], look: [-14, 23.3, -88.3], fov: 53 } },
  // Settle: a slow crane into a calm composition that leaves room for the portfolio panel.
  { start: 22.6, end: 26.8, blend: .6, from: { pos: [-6.0, 24.1, -87.6], look: [-14, 23.3, -88.2], fov: 53 }, to: { pos: [-5.0, 25.7, -78.2], look: [-9.9, 23.5, -87.9], fov: 48 } },
]

const shakes: [number, number, number][] = [
  [T.firstImpact, .09, 7], [T.swordDrop + .3, .03, 5], [T.bankaiBurst, .2, 5], [T.finalRelease, .07, 6], [T.finalImpact, .26, 4.5],
  ...BLADES.filter((_, i) => i % 3 === 0).map(b => [bladeRiseStart(b) + .1, .05, 6] as [number, number, number]),
]

const ease = { inOut: (x: number) => x * x * (3 - 2 * x), out: (x: number) => 1 - (1 - x) ** 3, linear: (x: number) => x }
const a = new THREE.Vector3(), b = new THREE.Vector3(), la = new THREE.Vector3(), lb = new THREE.Vector3()

function frameAt(shot: Shot, t: number, pos: THREE.Vector3, look: THREE.Vector3, tall: boolean) {
  const x = ease[shot.ease ?? 'inOut'](clamp01((t - shot.start) / (shot.end - shot.start)))
  const { from, to } = tall && shot.portrait ? shot.portrait : shot
  pos.fromArray(from.pos).lerp(b.fromArray(to.pos), x)
  look.fromArray(from.look).lerp(lb.fromArray(to.look), x)
  return from.fov + (to.fov - from.fov) * x
}

export type CameraPose = { pos: THREE.Vector3; look: THREE.Vector3; fov: number }
export const createCameraPose = (): CameraPose => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50 })

/**
 * A cinematic's camera plan. `settle` starts a slow breathing drift; `reveal` is the window
 * in which a portrait screen lifts and shifts the view clear of the bottom panel.
 */
export type ShotList = {
  shots: Shot[]; shakes: [number, number, number][]; settle?: [number, number]
  reveal?: { start: number; end: number; lift: number; shiftX: number; shiftZ?: number }
  /** Narrow screens: the widest vertical FOV to use before dollying back, and the dolly limit. */
  maxFov?: number; maxDolly?: number
  /** Keeps the camera inside an enclosed space (e.g. walled courtyard) after any dolly. */
  bounds?: { min: V3; max: V3 }
}
const finaleShots: ShotList = { shots, shakes, settle: [26.4, 28], reveal: { start: T.reveal, end: Infinity, lift: 4.4, shiftX: -3.2 } }

/** Evaluates the finale's shot list at time t. `shake` scales impact shake (0 for reduced motion). */
export const evaluateCamera = (t: number, out: CameraPose, shake: number, aspect: number) => evaluateShots(finaleShots, t, out, shake, aspect)

export function evaluateShots(list: ShotList, t: number, out: CameraPose, shake: number, aspect: number) {
  const shots = list.shots
  let i = shots.findIndex(s => t < s.end)
  if (i === -1) i = shots.length - 1
  const shot = shots[i]
  const tall = aspect < .8
  out.fov = frameAt(shot, t, out.pos, out.look, tall)
  if (i > 0 && shot.blend > 0 && t - shot.start < shot.blend) {
    const w = ease.inOut(clamp01((t - shot.start) / shot.blend))
    const fov = frameAt(shots[i - 1], t, a, la, tall)
    out.pos.lerpVectors(a, out.pos, w); out.look.lerpVectors(la, out.look, w); out.fov = fov + (out.fov - fov) * w
  }
  // Settled scene: slow breathing drift so it never freezes.
  const settle = list.settle ? ramp(t, list.settle[0], list.settle[1]) : 0
  if (settle > 0) { out.pos.x += Math.sin(t * .13) * .35 * settle; out.pos.y += Math.sin(t * .09) * .12 * settle }
  // Handheld micro-motion plus impact shake.
  let s = 0
  for (const [at, amp, decay] of list.shakes) s += amp * impulse(t, at, decay)
  const hand = .018 + s * shake
  out.look.x += noise1(t * (1.3 + s * 20)) * hand; out.look.y += noise1(t * (1.1 + s * 20) + 40) * hand
  out.pos.x += noise1(t * .7 + 11) * .03 + noise1(t * 24 + 3) * s * shake * .5
  out.pos.y += noise1(t * 24 + 7) * s * shake * .5
  // Narrow screens: keep the horizontal framing authored for a 1.45 aspect. Widen the
  // vertical FOV up to a limit, then dolly back for the rest so both fighters stay in frame.
  if (aspect < 1.45) {
    const wanted = Math.tan(THREE.MathUtils.degToRad(out.fov) / 2) * 1.45
    const vfov = Math.min(list.maxFov ?? 70, THREE.MathUtils.radToDeg(2 * Math.atan(wanted / aspect)))
    const got = Math.tan(THREE.MathUtils.degToRad(vfov) / 2) * aspect
    out.fov = vfov
    if (got < wanted) {
      // Rise while backing away so the camera clears nearby props and rocks.
      const k = Math.min(list.maxDolly ?? 1.9, wanted / got), y0 = out.pos.y
      out.pos.sub(out.look).multiplyScalar(k).add(out.look)
      out.pos.y = Math.max(out.pos.y, y0 + (k - 1) * 1.1)
    }
  }
  if (list.bounds) out.pos.clamp(a.fromArray(list.bounds.min), b.fromArray(list.bounds.max))
  // Portrait reveal: the portfolio panel covers the lower screen, so lift the scene up.
  const rv = list.reveal
  if (rv && aspect < 1 && t > rv.start - 1 && t < rv.end) {
    const r = ramp(t, rv.start - 1, rv.start + 1)
    out.look.y -= rv.lift * r; out.look.x += rv.shiftX * r; out.look.z += (rv.shiftZ ?? 0) * r
  }
  return out
}

// Training grounds: Chad, Uryū, and Orihime sparring on a loop. Everything is a pure function of
// the loop time (0..TRAINING_LOOP), so the spar is frame-rate independent and repeats seamlessly.
// See finale/rig.ts for pose conventions and finale/paths.ts for world paths.
import { bakeTrack } from '../finale/rig'
import type { Pose } from '../finale/rig'
import type { V3 } from '../finale/figure-kit'
import { bakePath } from '../finale/paths'

/** Centre of the training grounds: an open lot south-east of the gate, beside the street to the barracks. */
export const TRAINING_CENTER: V3 = [24, 0, 18]
export const TRAINING_GROUND = .03
export const TRAINING_RADIUS = 7.1
export const TRAINING_LOOP = 18
const [AX, , AZ] = TRAINING_CENTER, G = TRAINING_GROUND
const at = (dx: number, dz: number, dy = 0): V3 => [AX + dx, G + dy, AZ + dz]

export const TA = {
  bow: 1.0, armor: 1.3, block: 1.5, volley: 1.6, windup: 3.35, directo: 3.92, dodge: 3.93, cast: 4.02, shield: 4.25, impact: 4.35, shieldEnd: 5.2,
  sky: 5.05, rainUp: 5.55, rain: 6.3, rainEnd: 7.25, kneel: 7.3, run: 7.45, heal: 8.3, healEnd: 10.4, glasses: 10.3, armorOff: 11.0, cheer: 11.3, back: 12.4, home: 14.6,
} as const

export const CHAD_MARK = at(-3.3, .2), URYU_MARK = at(3.3, -.2), URYU_DODGE = at(3.1, -2.6), ORIHIME_MARK = at(.4, 3.8)
export const ORIHIME_HEAL = at(-2.35, 1.05), URYU_NEAR = at(-1.6, -1.1)
/** Where Orihime's Santen Kesshun catches the stray El Directo, facing back toward Chad. */
export const SHIELD_POINT = at(5.3, -.15, 1.25)
export const CHAD_BLOCK_POINT = at(-2.72, .2, 1.52)
export const CHAD_FIST = at(-2.35, .2, 1.32)
export const URYU_BOW_POINT = at(2.72, -.2, 1.42)

const face = (from: V3, to: V3) => Math.atan2(to[0] - from[0], to[2] - from[2])
const O_FACE = face(ORIHIME_MARK, at(0, 0))

export const chadPath = bakePath([
  { t: 0, p: CHAD_MARK, yaw: Math.PI / 2 },
  { t: TA.sky - .2, p: CHAD_MARK, yaw: Math.PI / 2 },
  { t: TA.sky + .3, p: CHAD_MARK, yaw: face(CHAD_MARK, URYU_DODGE) },
  { t: TA.back, p: CHAD_MARK },
  { t: TA.back + 1, p: CHAD_MARK, yaw: Math.PI / 2 },
])
export const uryuPath = bakePath([
  { t: 0, p: URYU_MARK, yaw: -Math.PI / 2 },
  { t: TA.dodge, p: URYU_MARK, hide: true },
  { t: TA.dodge + .07, p: URYU_DODGE, yaw: face(URYU_DODGE, CHAD_MARK) },
  { t: 8.5, p: URYU_DODGE },
  { t: 9.8, p: URYU_NEAR, yaw: face(URYU_NEAR, CHAD_MARK), ease: 'linear' },
  { t: TA.back, p: URYU_NEAR },
  { t: TA.home - .3, p: URYU_MARK, yaw: -Math.PI / 2, ease: 'linear' },
])
export const orihimePath = bakePath([
  { t: 0, p: ORIHIME_MARK, yaw: O_FACE },
  { t: TA.run, p: ORIHIME_MARK },
  { t: TA.heal - .1, p: ORIHIME_HEAL, yaw: face(ORIHIME_HEAL, CHAD_MARK), ease: 'linear' },
  { t: TA.back + .1, p: ORIHIME_HEAL },
  { t: TA.home, p: ORIHIME_MARK, yaw: O_FACE, ease: 'linear' },
])

const legsReady: Pose = { thighL: [-.14, 0, .1], kneeL: [.26, 0, 0], ankleL: [-.12, 0, 0], thighR: [.14, 0, -.1], kneeR: [.22, 0, 0], ankleR: [-.1, 0, 0], drop: .035 }
const legsWide: Pose = { thighL: [-.32, 0, .2], kneeL: [.46, 0, 0], ankleL: [-.14, 0, 0], thighR: [.22, 0, -.2], kneeR: [.42, 0, 0], ankleR: [-.2, 0, 0], drop: .09 }
const legsLunge: Pose = { thighL: [-1.05, 0, .1], kneeL: [1.02, 0, 0], ankleL: [.05, 0, 0], thighR: [.55, 0, -.1], kneeR: [.36, 0, 0], ankleR: [.22, 0, 0], drop: .2 }
const kneel: Pose = { drop: .47, thighL: [-1.5, 0, .12], kneeL: [1.5, 0, 0], thighR: [.05, 0, -.08], kneeR: [1.55, 0, 0], ankleR: [.5, 0, 0] }

// --- Chad ---------------------------------------------------------------------------------------
const C_STAND: Pose = { ...legsReady, spine: [.02, 0, 0], shoulderR: [-.1, 0, -.12], elbowR: [-.3, 0, 0], shoulderL: [-.1, 0, .12], elbowL: [-.3, 0, 0] }
const C_GUARD: Pose = { ...legsWide, drop: .08, spine: [.08, .2, 0], neck: [-.05, -.2, 0], shoulderR: [-1.1, 0, .35], elbowR: [-1.9, 0, 0], wristR: [.2, 0, 0], shoulderL: [-1.0, 0, -.35], elbowL: [-1.9, 0, 0] }
const C_BLOCK: Pose = { ...legsWide, drop: .14, spine: [.1, 0, 0], shoulderR: [-1.35, 0, .55], elbowR: [-1.7, 0, 0], shoulderL: [.1, 0, .25], elbowL: [-1.4, 0, 0] }
const C_WINDUP: Pose = { ...legsLunge, drop: .16, spine: [.05, -.5, 0], chest: [0, -.2, 0], neck: [0, .5, 0], shoulderR: [.4, 0, -.3], elbowR: [-1.9, 0, 0], shoulderL: [-1.2, 0, -.3], elbowL: [-1.2, 0, 0] }
const C_PUNCH: Pose = { ...legsLunge, offset: [0, 0, .3], spine: [.15, .45, 0], chest: [.1, .15, 0], neck: [-.1, -.5, 0], shoulderR: [-1.55, 0, .05], elbowR: [-.05, 0, 0], shoulderL: [.3, 0, .3], elbowL: [-1.6, 0, 0] }
const C_CROSS: Pose = { ...legsWide, drop: .2, spine: [.25, 0, 0], neck: [.2, 0, 0], shoulderR: [-1.4, 0, .75], elbowR: [-1.9, 0, 0], shoulderL: [-1.4, 0, -.75], elbowL: [-1.9, 0, 0] }
const C_KNEEL: Pose = { ...kneel, spine: [.2, 0, 0], neck: [.1, 0, 0], shoulderR: [-.5, 0, -.1], elbowR: [-.6, 0, 0], shoulderL: [-.9, 0, .05], elbowL: [-.9, 0, 0] }
const C_THUMBS: Pose = { ...C_STAND, shoulderR: [-1.1, 0, .1], elbowR: [-1.25, 0, 0], wristR: [0, -.3, 0], neck: [0, .3, 0] }
export const chadTrack = bakeTrack([
  { t: 0, pose: C_GUARD }, { t: 1.2, pose: C_GUARD }, { t: TA.block, pose: C_BLOCK, ease: 'snap' }, { t: 3.1, pose: C_BLOCK },
  { t: TA.windup + .3, pose: C_WINDUP }, { t: TA.directo - .05, pose: C_WINDUP }, { t: TA.directo + .05, pose: C_PUNCH, ease: 'snap' }, { t: 4.6, pose: C_PUNCH },
  { t: 5.3, pose: C_GUARD }, { t: 6.2, pose: C_CROSS }, { t: 7.1, pose: C_CROSS }, { t: TA.kneel + .1, pose: C_KNEEL, ease: 'snap' }, { t: 10.5, pose: C_KNEEL },
  { t: 11.1, pose: C_STAND }, { t: 11.45, pose: C_THUMBS }, { t: 12.4, pose: C_THUMBS }, { t: 13.0, pose: C_STAND }, { t: 16.4, pose: C_STAND }, { t: 17.4, pose: C_GUARD }, { t: 18, pose: C_GUARD },
])

// --- Uryū ---------------------------------------------------------------------------------------
const U_STAND: Pose = { ...legsReady, shoulderR: [.02, 0, -.1], elbowR: [-.25, 0, 0], shoulderL: [.02, 0, .1], elbowL: [-.25, 0, 0] }
const U_BOW: Pose = { ...legsWide, spine: [0, -.6, 0], chest: [0, -.2, 0], neck: [0, .75, 0], shoulderL: [-1.52, 0, .05], elbowL: [-.02, 0, 0], shoulderR: [-1.1, 0, .2], elbowR: [-1.4, 0, 0] }
const U_DRAW: Pose = { ...U_BOW, shoulderR: [-1.4, 0, .35], elbowR: [-2.3, 0, 0] }
const U_RELEASE: Pose = { ...U_BOW, shoulderR: [-1.2, 0, -.55], elbowR: [-1.1, 0, 0] }
const U_DODGE: Pose = { ...legsWide, drop: .18, spine: [.1, -.4, -.2], neck: [0, .5, .1], shoulderL: [-1.3, 0, .2], elbowL: [-.1, 0, 0], shoulderR: [-.3, 0, -.6], elbowR: [-.6, 0, 0] }
const U_SKY: Pose = { ...legsWide, spine: [-.2, -.5, 0], chest: [-.15, 0, 0], neck: [-.5, .5, 0], shoulderL: [-2.7, 0, .05], elbowL: [-.02, 0, 0], shoulderR: [-2.6, 0, .4], elbowR: [-2.1, 0, 0] }
const U_SKY_RELEASE: Pose = { ...U_SKY, shoulderR: [-2.3, 0, -.5], elbowR: [-1.0, 0, 0] }
const U_GLASSES: Pose = { ...legsReady, neck: [.08, 0, 0], shoulderR: [-.9, 0, .45], elbowR: [-2.35, 0, 0], wristR: [.3, 0, 0], shoulderL: [.02, 0, .1], elbowL: [-.25, 0, 0] }
const U_CROSSED: Pose = { ...legsReady, neck: [-.05, .2, 0], shoulderR: [-.8, 0, .55], elbowR: [-1.95, 0, 0], shoulderL: [-.75, 0, -.5], elbowL: [-1.95, 0, 0] }
const volley = [0, 1, 2, 3, 4].flatMap(k => [{ t: TA.volley + k * .3 - .15, pose: U_DRAW }, { t: TA.volley + k * .3 + .02, pose: U_RELEASE, ease: 'snap' as const }])
export const uryuTrack = bakeTrack([
  { t: 0, pose: U_STAND }, { t: .7, pose: U_STAND }, { t: TA.bow + .3, pose: U_BOW }, ...volley, { t: 3.1, pose: U_BOW }, { t: TA.dodge, pose: U_BOW },
  { t: TA.dodge + .07, pose: U_DODGE, ease: 'snap' }, { t: 4.6, pose: U_BOW }, { t: TA.sky + .35, pose: U_SKY }, { t: TA.rainUp - .02, pose: U_SKY },
  { t: TA.rainUp + .05, pose: U_SKY_RELEASE, ease: 'snap' }, { t: 6.6, pose: U_SKY_RELEASE }, { t: 7.5, pose: U_STAND }, { t: 9.9, pose: U_STAND },
  { t: TA.glasses + .25, pose: U_GLASSES }, { t: 11.0, pose: U_GLASSES }, { t: 11.5, pose: U_CROSSED }, { t: TA.back, pose: U_CROSSED }, { t: TA.back + .4, pose: U_STAND }, { t: 18, pose: U_STAND },
])

// --- Orihime -------------------------------------------------------------------------------------
const O_CLASP: Pose = { thighL: [0, 0, .04], thighR: [.02, 0, -.04], kneeR: [.08, 0, 0], neck: [.05, 0, 0], shoulderR: [-.7, 0, .45], elbowR: [-1.9, 0, 0], shoulderL: [-.7, 0, -.45], elbowL: [-1.9, 0, 0] }
const O_CAST: Pose = { ...legsWide, drop: .06, spine: [.08, 0, 0], shoulderR: [-1.45, 0, .2], elbowR: [-.1, 0, 0], wristR: [-1.1, 0, 0], shoulderL: [-1.45, 0, -.2], elbowL: [-.1, 0, 0], wristL: [-1.1, 0, 0] }
const O_RELIEF: Pose = { ...O_CLASP, spine: [.1, 0, 0], neck: [.2, 0, .12] }
const O_HEAL: Pose = { ...kneel, drop: .45, spine: [.2, 0, 0], neck: [.15, 0, 0], shoulderR: [-1.15, 0, .2], elbowR: [-.2, 0, 0], wristR: [-.8, 0, 0], shoulderL: [-1.15, 0, -.2], elbowL: [-.2, 0, 0], wristL: [-.8, 0, 0] }
const O_STAND: Pose = { thighL: [0, 0, .04], thighR: [.02, 0, -.04], shoulderR: [.05, 0, -.1], elbowR: [-.3, 0, 0], shoulderL: [.05, 0, .1], elbowL: [-.3, 0, 0] }
const O_CHEER: Pose = { ...O_STAND, shoulderR: [-2.8, 0, -.3], elbowR: [-.3, 0, 0], shoulderL: [-2.8, 0, .3], elbowL: [-.3, 0, 0], neck: [-.15, 0, 0] }
export const orihimeTrack = bakeTrack([
  { t: 0, pose: O_CLASP }, { t: TA.cast - .05, pose: O_CLASP }, { t: TA.cast + .15, pose: O_CAST, ease: 'snap' }, { t: TA.shieldEnd, pose: O_CAST },
  { t: TA.shieldEnd + .4, pose: O_RELIEF }, { t: TA.run - .05, pose: O_RELIEF }, { t: TA.run + .2, pose: O_STAND }, { t: TA.heal - .1, pose: O_STAND },
  { t: TA.heal + .15, pose: O_HEAL }, { t: TA.healEnd, pose: O_HEAL }, { t: 10.8, pose: O_STAND }, { t: TA.cheer, pose: O_CHEER }, { t: 12.2, pose: O_CHEER },
  { t: TA.back + .3, pose: O_STAND }, { t: TA.home + .3, pose: O_CLASP }, { t: 18, pose: O_CLASP },
])

// --- Powers ----------------------------------------------------------------------------------------
/** Uryū's arrows: [launch time, flight seconds, from, to]. */
export type Arrow = { t: number; dur: number; from: V3; to: V3 }
export function trainingArrows(): Arrow[] {
  const out: Arrow[] = []
  for (let k = 0; k < 5; k++) out.push({ t: TA.volley + k * .3, dur: .22, from: URYU_BOW_POINT, to: [CHAD_BLOCK_POINT[0] + .05, CHAD_BLOCK_POINT[1] + (k % 3 - 1) * .08, CHAD_BLOCK_POINT[2] + ((k * 7) % 5 - 2) * .05] })
  // Licht Regen: a bundle shot straight up, then a rain of arrows around Chad.
  const up: V3 = [URYU_DODGE[0] - .35, G + 1.9, URYU_DODGE[2] + .1]
  for (let k = 0; k < 5; k++) out.push({ t: TA.rainUp + k * .03, dur: .35, from: up, to: [up[0] + (k - 2) * .4, G + 15, up[2] + ((k * 3) % 5 - 2) * .4] })
  for (let k = 0; k < 14; k++) {
    const a = k * 2.4, r = k % 4 === 0 ? .25 : .7 + (k % 5) * .35, hitsChad = k % 4 === 0
    const to: V3 = hitsChad ? [CHAD_MARK[0] + .3, G + 1.35, CHAD_MARK[2]] : [CHAD_MARK[0] + Math.cos(a) * r, G, CHAD_MARK[2] + Math.sin(a) * r]
    out.push({ t: TA.rain + k * .065, dur: .3, from: [to[0] + .6, G + 14, to[2] - .3], to })
  }
  return out
}

// Keyframed performances for the Kuchiki garden (see finale/rig.ts for pose conventions).
// Pose tracks drive the joints; world paths move each fighter through flash steps, flips,
// and flights. Pre-reveal tracks run on the garden clock; finish tracks are keyed from GARDEN_FINISH.
import { bakeTrack } from '../finale/rig'
import type { Pose } from '../finale/rig'
import type { V3 } from '../finale/figure-kit'
import { I_STAND } from '../finale/choreography'
import { clamp01 } from '../finale/timeline'
import { bakePath, pathEases as eases } from '../finale/paths'
import { GARDEN_FINISH as F, GARDEN_GROUND as G, GD, ICHIGO_GARDEN_END, ICHIGO_GARDEN_MARK, SOI_MARK, YORUICHI_SEAT } from './timeline'

const legsReady: Pose = { thighL: [-.14, 0, .1], kneeL: [.26, 0, 0], ankleL: [-.12, 0, 0], thighR: [.14, 0, -.1], kneeR: [.22, 0, 0], ankleR: [-.1, 0, 0], drop: .035 }
const legsWide: Pose = { thighL: [-.32, 0, .2], kneeL: [.46, 0, 0], ankleL: [-.14, 0, 0], thighR: [.22, 0, -.2], kneeR: [.42, 0, 0], ankleR: [-.2, 0, 0], drop: .09 }
const legsLunge: Pose = { thighL: [-1.05, 0, .1], kneeL: [1.02, 0, 0], ankleL: [.05, 0, 0], thighR: [.55, 0, -.1], kneeR: [.36, 0, 0], ankleR: [.22, 0, 0], drop: .2 }

// --- World paths (helpers in finale/paths.ts) -------------------------------------------------
const [IX, , IZ] = ICHIGO_GARDEN_MARK, IZE = ICHIGO_GARDEN_END[2]
const [SX, , SZ] = SOI_MARK
/** Yaw that faces Ichigo's mark from (x, z). */
const face = (x: number, z: number, iz = IZ) => Math.atan2(IX - x, iz - z)

// Afterimage spots around Ichigo, then the sting from behind.
const A: V3 = [-24.25, G, -29.95], B: V3 = [-20.05, G, -27.65], C: V3 = [-19.75, G, -30.75], D: V3 = [-22.05, G, -28.12]
// The three Shunkō attacks: a straight lunge, a spinning kick from his left, and a dive from above.
const E: V3 = [-22.05, G, -30.12], E2: V3 = [-22.1, G, -32.7]
const K: V3 = [-23.05, G, -28.72], K2: V3 = [-24.9, G, -30.3], KICK_YAW = face(K[0], K[2], IZE)
const DIVE_TOP: V3 = [IX, G + 2.6, IZE - 1.35], DIVE_HIT: V3 = [IX, G + 1.35, IZE - .78]

export const soiPath = bakePath([
  { t: 0, p: SOI_MARK, yaw: 0, pitch: 0 },
  { t: GD.flash, p: SOI_MARK, hide: true },
  { t: GD.afterA, p: A, yaw: face(A[0], A[2]) },
  { t: GD.afterA + .1, p: A, hide: true },
  { t: GD.afterB, p: B, yaw: face(B[0], B[2]) },
  { t: GD.afterB + .1, p: B, hide: true },
  { t: GD.afterC, p: C, yaw: face(C[0], C[2]) },
  { t: GD.afterC + .1, p: C, hide: true },
  { t: GD.sting - .03, p: D, yaw: Math.PI },
  { t: GD.spin + .07, p: D, hide: true },
  { t: GD.back, p: SOI_MARK, yaw: 0 },
  { t: GD.dash1, p: SOI_MARK, hide: true },
  { t: GD.clash1 - .01, p: E, yaw: 0 },
  { t: GD.clash1 + .1, p: [E[0], G, E[2] - .08] },
  { t: GD.clash1 + .62, p: E2, arc: 1.3, flip: -Math.PI * 2, ease: 'out' },
  { t: GD.dash2, p: E2, hide: true },
  { t: GD.clash2 - .1, p: [K[0] - .25, G, K[2] - .15], yaw: KICK_YAW - 2.4 },
  { t: GD.clash2, p: K, yaw: KICK_YAW, ease: 'out' },
  { t: GD.clash2 + .12, p: [K[0] - .1, G, K[2]] },
  { t: GD.clash2 + .52, p: K2, yaw: face(K2[0], K2[2], IZE), arc: .9, flip: -Math.PI * 2, ease: 'out' },
  { t: GD.dash3, p: K2, hide: true },
  { t: GD.dash3 + .06, p: DIVE_TOP, yaw: 0, pitch: .55 },
  { t: GD.clash3, p: DIVE_HIT, pitch: .9, ease: 'in' },
  { t: GD.clash3 + .1, p: [DIVE_HIT[0], DIVE_HIT[1] + .05, DIVE_HIT[2] - .05] },
  { t: GD.clash3 + .75, p: SOI_MARK, pitch: 0, arc: 2.0, flip: -Math.PI * 2, ease: 'out' },
  { t: GD.reveal, p: SOI_MARK },
])

/** Hips height used as the pivot for flips (meters above her feet when standing). */
export const SOI_PIVOT = .72
/** Where the finishing Getsuga drives her before it throws her. */
export const SOI_THROWN_FROM: V3 = [-22, G, -33.45]
export const soiFinishPath = bakePath([
  { t: F, p: SOI_MARK, yaw: 0, pitch: 0 },
  { t: GD.dash, p: SOI_MARK, hide: true },
  { t: GD.lunge, p: [SX, G, -32.9], yaw: 0 },
  { t: GD.hit, p: [SX, G, -32.95] },
  { t: GD.fling - .02, p: SOI_THROWN_FROM, ease: 'out' },
  // Thrown back over the court toward the veranda; Yoruichi catches her (see the carry below).
  { t: GD.catch, p: [SX - .05, G + 1.55, -35.4], pitch: -.75, arc: .9, ease: 'out' },
  { t: GD.end, p: [SX - .05, G + 1.55, -35.4] },
])

const SEAT_YAW = Math.atan2(-22 - YORUICHI_SEAT[0], -31.5 - YORUICHI_SEAT[2])
/** Yoruichi's landing spot after the catch. */
export const YORUICHI_LAND: V3 = [-21.75, G, -36.0]
export const yoruichiPath = bakePath([
  { t: 0, p: YORUICHI_SEAT, yaw: SEAT_YAW, pitch: 0 },
  { t: GD.leap, p: YORUICHI_SEAT, hide: true },
  { t: GD.appear, p: [-23.25, G + 1.75, -36.2], yaw: 1.0 },
  { t: GD.catch, p: [-22.16, G + 1.4, -35.9], yaw: .35, ease: 'out' },
  { t: GD.touchdown, p: YORUICHI_LAND, yaw: .2, arc: .2, ease: 'in' },
  { t: GD.rise + .7, p: YORUICHI_LAND, yaw: face(YORUICHI_LAND[0], YORUICHI_LAND[2], IZE) },
])
export const YORUICHI_SEAT_YAW = SEAT_YAW

/** Soi Fon's hips in Yoruichi's chest-joint space while she is carried, and her orientation there. */
export const CARRY_HIPS: V3 = [-.04, -.34, .4]
export const CARRY_YAW = -Math.PI / 2, CARRY_PITCH = -.72

// --- Ichigo (Shikai) -------------------------------------------------------------------------
const I_READY: Pose = { ...I_STAND, ...legsWide, drop: .07, shoulderR: [-.62, 0, -.1], elbowR: [-.75, 0, 0], wristR: [.7, 0, 0] }
const I_ALERT: Pose = { ...I_READY, drop: .1, spine: [.08, 0, 0], chest: [.04, 0, 0], shoulderR: [-.9, 0, .05], elbowR: [-.9, 0, 0], wristR: [.9, 0, 0], shoulderL: [-.5, 0, -.2], elbowL: [-.9, 0, 0] }
const I_STUNG: Pose = { ...legsReady, drop: .06, spine: [-.25, 0, 0], chest: [-.2, 0, 0], neck: [-.3, 0, 0], shoulderR: [-.5, 0, -.5], elbowR: [-.5, 0, 0], wristR: [.8, 0, 0], shoulderL: [-.2, 0, .6], elbowL: [-.3, 0, 0] }
const I_BACKHAND: Pose = { ...legsWide, drop: .12, spine: [.1, -.6, 0], chest: [.05, -.2, 0], neck: [0, .4, 0], shoulderR: [-1.3, 0, -1.1], elbowR: [-.15, 0, 0], wristR: [1.4, 0, 0], shoulderL: [-.4, 0, .5], elbowL: [-.6, 0, 0] }
const I_SHIELD: Pose = { ...legsWide, drop: .14, spine: [.2, 0, 0], chest: [.1, 0, 0], neck: [.1, 0, 0], shoulderL: [-1.7, 0, -.35], elbowL: [-1.9, 0, 0], shoulderR: [-.4, 0, -.4], elbowR: [-.6, 0, 0], wristR: [1.0, 0, 0] }
const I_READY_LOW: Pose = { ...I_READY, drop: .12, thighL: [-.4, 0, .22], kneeL: [.6, 0, 0], thighR: [.28, 0, -.22], kneeR: [.5, 0, 0], spine: [.14, -.05, 0], shoulderR: [-.8, 0, .05], elbowR: [-.85, 0, 0], wristR: [.85, 0, 0] }
const I_BLOCK: Pose = { ...legsWide, drop: .14, spine: [.12, 0, 0], chest: [.05, 0, 0], shoulderR: [-1.0, 0, .45], elbowR: [-1.2, 0, 0], wristR: [.5, 1.3, 0], shoulderL: [-1.0, 0, -.45], elbowL: [-1.3, 0, 0] }
const I_BLOCK_LEFT: Pose = { ...legsWide, drop: .12, spine: [.05, .5, 0], chest: [0, .2, 0], neck: [0, -.3, 0], shoulderR: [-1.1, 0, .9], elbowR: [-.8, 0, 0], wristR: [1.4, 0, 0], shoulderL: [-.9, 0, -.3], elbowL: [-1.4, 0, 0] }
const I_GUARD_HIGH: Pose = { ...legsWide, spine: [.12, -.05, 0], chest: [.08, 0, 0], neck: [-.08, .05, 0], shoulderR: [-1.25, 0, .35], elbowR: [-.9, 0, 0], wristR: [.95, .6, 0], shoulderL: [-1.1, 0, -.45], elbowL: [-1.1, 0, 0], wristL: [.2, 0, 0] }
const I_BRACED_HIGH: Pose = { ...I_GUARD_HIGH, drop: .22, spine: [-.08, -.05, 0], chest: [-.1, 0, 0], thighL: [-.2, 0, .24], kneeL: [.7, 0, 0], thighR: [.45, 0, -.24], kneeR: [.55, 0, 0] }
const I_WINDUP: Pose = {
  thighL: [-.58, 0, .17], kneeL: [.78, 0, 0], ankleL: [-.2, 0, 0], thighR: [.36, 0, -.15], kneeR: [.48, 0, 0], ankleR: [-.1, 0, 0], drop: .14, offset: [0, 0, -.12],
  spine: [-.04, -.5, 0], chest: [-.1, -.2, .05], neck: [.02, .38, 0], head: [.04, .3, 0],
  shoulderR: [-2.55, 0, -.35], elbowR: [-1.1, 0, 0], wristR: [.9, 0, 0], shoulderL: [-2.25, 0, -.5], elbowL: [-1.2, 0, 0], wristL: [.3, 0, 0],
}
const I_SLASH: Pose = {
  ...legsLunge, offset: [0, 0, .55],
  spine: [.22, .45, 0], chest: [.25, .2, 0], neck: [-.12, -.32, 0], head: [-.14, -.26, 0],
  shoulderR: [-.78, 0, .55], elbowR: [-.15, 0, 0], wristR: [1.35, 0, 0], shoulderL: [.35, 0, .45], elbowL: [-.4, 0, 0],
}
const I_SHOULDER: Pose = { ...I_STAND, shoulderR: [-1.9, 0, -.4], elbowR: [-1.95, 0, 0], wristR: [.9, 0, 0], neck: [.05, .1, 0] }

export const gardenIchigoTrack = bakeTrack([
  { t: 0, pose: I_STAND },
  { t: 1.6, pose: I_READY },
  { t: GD.flash, pose: I_READY },
  { t: GD.flash + .15, pose: I_ALERT, ease: 'snap' },
  { t: GD.sting - .02, pose: I_ALERT },
  { t: GD.sting + .1, pose: I_STUNG, ease: 'snap' },
  { t: GD.spin - .02, pose: I_STUNG },
  { t: GD.spin + .22, pose: I_BACKHAND, ease: 'snap' },
  { t: GD.back + .1, pose: { ...I_BACKHAND, spine: [.1, -.3, 0] } },
  { t: GD.back + .55, pose: I_READY },
  { t: GD.burst - .05, pose: I_READY },
  { t: GD.burst + .15, pose: I_SHIELD, ease: 'snap' },
  { t: GD.dash1 - .25, pose: I_READY_LOW },
  { t: GD.clash1 - .02, pose: I_BLOCK, ease: 'snap' },
  { t: GD.clash1 + .1, pose: { ...I_BLOCK, drop: .2, spine: [-.05, 0, 0] }, ease: 'snap' },
  { t: GD.clash1 + .6, pose: I_READY_LOW },
  { t: GD.clash2 - .08, pose: I_READY_LOW },
  { t: GD.clash2 - .01, pose: I_BLOCK_LEFT, ease: 'snap' },
  { t: GD.clash2 + .1, pose: { ...I_BLOCK_LEFT, drop: .16 }, ease: 'snap' },
  { t: GD.clash2 + .55, pose: I_READY_LOW },
  { t: GD.dash3 + .02, pose: I_READY_LOW },
  { t: GD.clash3 - .04, pose: I_GUARD_HIGH, ease: 'snap' },
  { t: GD.clash3 + .08, pose: I_BRACED_HIGH, ease: 'snap' },
  { t: GD.clash3 + .7, pose: I_GUARD_HIGH },
  { t: GD.standoff + .3, pose: I_READY },
  { t: GD.reveal, pose: I_READY },
])
export const gardenIchigoFinish = bakeTrack([
  { t: F, pose: I_READY },
  { t: GD.windup + .4, pose: I_WINDUP },
  { t: GD.finishSwing, pose: { ...I_WINDUP, drop: .16, chest: [-.14, -.24, .05] } },
  { t: GD.release, pose: I_SLASH, ease: 'snap' },
  { t: F + 1.8, pose: { ...I_SLASH, drop: .18 } },
  { t: GD.catch + .35, pose: I_READY },
  { t: GD.rise + .6, pose: I_READY },
  { t: F + 4.4, pose: I_SHOULDER },
])
/** Ichigo's yaw: he spins with a backhand at the sting, then turns back around to face her. */
export function ichigoSpinYaw(t: number) {
  const a = eases.out(clamp01((t - GD.spin) / .3)), b = eases.inOut(clamp01((t - GD.back - .1) / .45))
  return Math.PI + 2.9 * a + (Math.PI * 2 - 2.9) * b
}

// --- Soi Fon ---------------------------------------------------------------------------------
const S_IDLE: Pose = { thighL: [-.02, 0, .06], thighR: [.04, 0, -.06], kneeR: [.06, 0, 0], spine: [0, .05, 0], neck: [-.04, 0, 0], shoulderR: [-.85, 0, .55], elbowR: [-1.95, 0, 0], shoulderL: [-.8, 0, -.5], elbowL: [-1.95, 0, 0] }
const S_REACH: Pose = { ...legsReady, spine: [.06, -.2, 0], neck: [0, .2, 0], shoulderR: [.6, 0, -.12], elbowR: [-.45, 0, 0], shoulderL: [-.2, 0, .15], elbowL: [-.5, 0, 0] }
const S_DRAW: Pose = { ...legsReady, spine: [0, .15, 0], shoulderR: [-.5, 0, -.7], elbowR: [-.35, 0, 0], wristR: [1.2, 0, 0], shoulderL: [-.3, 0, .3], elbowL: [-.6, 0, 0] }
const S_CALL: Pose = { ...legsReady, neck: [.05, 0, 0], shoulderR: [-1.25, 0, .3], elbowR: [-1.85, 0, 0], wristR: [1.45, 0, 0], shoulderL: [-1.2, 0, -.45], elbowL: [-1.75, 0, 0] }
const S_READY: Pose = { ...legsWide, drop: .12, spine: [.12, .35, 0], chest: [.05, .1, 0], neck: [-.05, -.35, 0], shoulderR: [-1.35, 0, .1], elbowR: [-.25, 0, 0], wristR: [.1, 0, 0], shoulderL: [.35, 0, .35], elbowL: [-.9, 0, 0] }
const S_CROUCH: Pose = { thighL: [-1.0, 0, .2], kneeL: [1.6, 0, 0], ankleL: [-.6, 0, 0], thighR: [-.3, 0, -.2], kneeR: [1.5, 0, 0], ankleR: [-.4, 0, 0], drop: .38, spine: [.5, .2, 0], chest: [.2, 0, 0], neck: [-.45, -.2, 0], shoulderR: [-1.1, 0, .15], elbowR: [-.4, 0, 0], shoulderL: [.6, 0, .4], elbowL: [-.5, 0, 0] }
const S_POISED: Pose = { ...S_CROUCH, drop: .3, spine: [.35, .25, 0], neck: [-.35, -.25, 0], shoulderR: [-1.4, 0, .1], elbowR: [-.15, 0, 0] }
const S_THRUST: Pose = { ...legsLunge, offset: [0, 0, .4], drop: .18, spine: [.2, .4, 0], chest: [.1, .1, 0], neck: [-.35, -.4, 0], shoulderR: [-1.85, 0, .15], elbowR: [0, 0, 0], wristR: [0, 0, 0], shoulderL: [.7, 0, .45], elbowL: [-.3, 0, 0] }
const S_LAND: Pose = { thighL: [-1.2, 0, .3], kneeL: [1.9, 0, 0], ankleL: [-.7, 0, 0], thighR: [.2, 0, -.35], kneeR: [1.4, 0, 0], ankleR: [.3, 0, 0], drop: .42, spine: [.55, .1, 0], chest: [.15, 0, 0], neck: [-.6, 0, 0], shoulderR: [-1.0, 0, .1], elbowR: [-.3, 0, 0], shoulderL: [-.4, 0, .35], elbowL: [-.2, 0, 0], wristL: [.5, 0, 0] }
const S_GATHER: Pose = { ...legsWide, drop: .16, spine: [.35, 0, 0], chest: [.2, 0, 0], neck: [.35, 0, 0], shoulderR: [-1.2, 0, .75], elbowR: [-1.6, 0, 0], shoulderL: [-1.2, 0, -.75], elbowL: [-1.6, 0, 0] }
const S_BURST: Pose = { ...legsWide, drop: .1, spine: [-.2, 0, 0], chest: [-.2, 0, 0], neck: [-.35, 0, 0], shoulderR: [-.3, 0, -1.3], elbowR: [-.2, 0, 0], shoulderL: [-.3, 0, 1.3], elbowL: [-.2, 0, 0] }
const S_SHUNKO: Pose = { ...legsWide, drop: .16, thighL: [-.5, 0, .25], kneeL: [.8, 0, 0], thighR: [.3, 0, -.25], kneeR: [.6, 0, 0], spine: [.2, .3, 0], chest: [.08, .1, 0], neck: [-.15, -.3, 0], shoulderR: [-1.2, 0, .2], elbowR: [-.5, 0, 0], shoulderL: [-.6, 0, .3], elbowL: [-1.3, 0, 0] }
const S_LUNGE: Pose = { ...legsLunge, drop: .22, spine: [.35, .35, 0], chest: [.15, .1, 0], neck: [-.45, -.35, 0], shoulderR: [-1.6, 0, .1], elbowR: [0, 0, 0], shoulderL: [.8, 0, .5], elbowL: [-.3, 0, 0] }
const S_TUCK: Pose = { thighL: [-2.1, 0, .15], kneeL: [2.2, 0, 0], thighR: [-2.0, 0, -.15], kneeR: [2.2, 0, 0], drop: .15, spine: [.5, 0, 0], chest: [.3, 0, 0], neck: [.3, 0, 0], shoulderR: [-1.0, 0, -.3], elbowR: [-1.3, 0, 0], shoulderL: [-1.0, 0, .3], elbowL: [-1.3, 0, 0] }
const S_KICK_WIND: Pose = { ...legsWide, drop: .1, spine: [.1, -.5, 0], chest: [0, -.2, 0], neck: [0, .5, 0], shoulderR: [-.3, 0, -.9], elbowR: [-.6, 0, 0], shoulderL: [-.6, 0, .8], elbowL: [-.8, 0, 0] }
const S_KICK: Pose = { thighL: [.05, 0, .1], kneeL: [.15, 0, 0], thighR: [-1.3, 0, -1.1], kneeR: [.15, 0, 0], ankleR: [.4, 0, 0], drop: .02, spine: [-.1, 0, -.45], chest: [0, 0, -.2], neck: [0, 0, .45], shoulderR: [.3, 0, -.7], elbowR: [-.5, 0, 0], shoulderL: [-.5, 0, .9], elbowL: [-.8, 0, 0] }
const S_DIVE: Pose = { thighL: [.3, 0, .1], kneeL: [.9, 0, 0], thighR: [.1, 0, -.1], kneeR: [.5, 0, 0], spine: [.3, 0, 0], chest: [.15, 0, 0], neck: [-.6, 0, 0], shoulderR: [-1.9, 0, .1], elbowR: [0, 0, 0], shoulderL: [-.3, 0, .6], elbowL: [-.5, 0, 0] }
const S_GUARD_X: Pose = { ...legsWide, drop: .2, spine: [.25, 0, 0], chest: [.1, 0, 0], neck: [.1, 0, 0], shoulderR: [-1.5, 0, .7], elbowR: [-1.7, 0, 0], shoulderL: [-1.5, 0, -.7], elbowL: [-1.7, 0, 0] }
const S_FLUNG: Pose = { thighL: [-.9, 0, .2], kneeL: [.8, 0, 0], thighR: [-.5, 0, -.2], kneeR: [1.0, 0, 0], spine: [-.35, 0, 0], chest: [-.3, 0, 0], neck: [-.5, 0, 0], shoulderR: [-1.2, 0, -.9], elbowR: [-.3, 0, 0], shoulderL: [-1.2, 0, .9], elbowL: [-.3, 0, 0] }
const S_CARRIED: Pose = {
  thighL: [-1.35, 0, .05], kneeL: [1.5, 0, 0], ankleL: [.3, 0, 0], thighR: [-1.25, 0, -.05], kneeR: [1.4, 0, 0], ankleR: [.3, 0, 0],
  spine: [-.15, 0, 0], chest: [-.1, 0, 0], neck: [-.25, -.2, 0], head: [-.1, -.1, 0], shoulderR: [-.3, 0, -.2], elbowR: [-.6, 0, 0], shoulderL: [-.9, 0, .1], elbowL: [-1.4, 0, 0],
}
const S_LOOKUP: Pose = { ...S_CARRIED, neck: [-.4, -.55, 0], head: [-.2, -.3, 0], shoulderL: [.1, 0, -.3], elbowL: [-1.6, 0, 0] }

export const soiTrack = bakeTrack([
  { t: 0, pose: S_IDLE },
  { t: GD.reach - .05, pose: S_IDLE },
  { t: GD.reach + .3, pose: S_REACH },
  { t: GD.draw, pose: S_REACH },
  { t: GD.draw + .3, pose: S_DRAW, ease: 'out' },
  { t: GD.call, pose: S_CALL },
  { t: GD.shikai + .15, pose: S_CALL },
  { t: GD.stinger, pose: S_READY, ease: 'out' },
  { t: GD.flash - .2, pose: S_READY },
  { t: GD.flash - .02, pose: S_CROUCH },
  { t: GD.afterA, pose: S_POISED, ease: 'snap' },
  { t: GD.sting - .05, pose: S_POISED },
  { t: GD.sting + .04, pose: S_THRUST, ease: 'snap' },
  { t: GD.spin + .07, pose: S_THRUST },
  { t: GD.back, pose: S_LAND, ease: 'snap' },
  { t: GD.back + .4, pose: S_LAND },
  { t: GD.shunko - .1, pose: S_READY },
  { t: GD.gather + .25, pose: S_GATHER },
  { t: GD.burst - .05, pose: { ...S_GATHER, drop: .2 } },
  { t: GD.burst + .12, pose: S_BURST, ease: 'snap' },
  { t: GD.burst + .45, pose: S_BURST },
  { t: GD.dash1 - .3, pose: S_SHUNKO },
  { t: GD.dash1, pose: S_CROUCH },
  { t: GD.clash1 - .01, pose: S_LUNGE, ease: 'snap' },
  { t: GD.clash1 + .1, pose: S_LUNGE },
  { t: GD.clash1 + .25, pose: S_TUCK, ease: 'out' },
  { t: GD.clash1 + .5, pose: S_TUCK },
  { t: GD.clash1 + .62, pose: S_LAND, ease: 'snap' },
  { t: GD.dash2 - .15, pose: S_SHUNKO },
  { t: GD.dash2, pose: S_CROUCH },
  { t: GD.clash2 - .1, pose: S_KICK_WIND },
  { t: GD.clash2, pose: S_KICK, ease: 'snap' },
  { t: GD.clash2 + .12, pose: S_KICK },
  { t: GD.clash2 + .25, pose: S_TUCK, ease: 'out' },
  { t: GD.clash2 + .42, pose: S_TUCK },
  { t: GD.clash2 + .52, pose: S_LAND, ease: 'snap' },
  { t: GD.dash3 - .1, pose: S_SHUNKO },
  { t: GD.dash3, pose: S_CROUCH },
  { t: GD.dash3 + .06, pose: S_DIVE, ease: 'snap' },
  { t: GD.clash3, pose: S_DIVE },
  { t: GD.clash3 + .2, pose: S_TUCK, ease: 'out' },
  { t: GD.clash3 + .62, pose: S_TUCK },
  { t: GD.clash3 + .75, pose: S_LAND, ease: 'snap' },
  { t: GD.standoff + .2, pose: S_LAND },
  { t: GD.standoff + .9, pose: S_SHUNKO },
  { t: GD.reveal, pose: S_SHUNKO },
])
export const soiFinish = bakeTrack([
  { t: F, pose: S_SHUNKO },
  { t: GD.crouch + .2, pose: S_CROUCH },
  { t: GD.dash, pose: S_CROUCH },
  { t: GD.lunge, pose: S_LUNGE, ease: 'snap' },
  { t: GD.hit - .1, pose: S_GUARD_X, ease: 'snap' },
  { t: GD.hit + .15, pose: { ...S_GUARD_X, drop: .26 } },
  { t: GD.fling - .02, pose: S_GUARD_X },
  { t: GD.fling + .15, pose: S_FLUNG, ease: 'snap' },
  { t: GD.catch - .05, pose: S_FLUNG },
  { t: GD.catch + .25, pose: S_CARRIED },
  { t: GD.lookUp, pose: S_CARRIED },
  { t: GD.lookUp + .6, pose: S_LOOKUP },
])

// --- Yoruichi ---------------------------------------------------------------------------------
/** Sitting on the veranda's edge: one leg hanging, one knee up with an arm resting on it. */
const Y_SIT: Pose = {
  drop: .83, thighL: [-1.5, 0, .12], kneeL: [1.35, 0, 0], ankleL: [.2, 0, 0], thighR: [-2.2, 0, -.18], kneeR: [2.35, 0, 0], ankleR: [-.3, 0, 0],
  spine: [-.12, .15, 0], chest: [-.05, 0, 0], neck: [.05, -.1, 0],
  shoulderR: [-1.1, 0, .1], elbowR: [-.4, 0, 0], wristR: [.2, 0, 0], shoulderL: [.55, 0, .2], elbowL: [-.05, 0, 0], wristL: [1.1, 0, 0],
}
const Y_LEAN: Pose = { ...Y_SIT, spine: [.22, .15, 0], chest: [.1, 0, 0], neck: [-.12, -.1, 0], shoulderL: [.4, 0, .25] }
const Y_LEAP: Pose = { thighL: [-.9, 0, .15], kneeL: [1.3, 0, 0], thighR: [.4, 0, -.1], kneeR: [.8, 0, 0], spine: [.3, 0, 0], chest: [.1, 0, 0], neck: [-.3, 0, 0], shoulderR: [-1.4, 0, .3], elbowR: [-.5, 0, 0], shoulderL: [-1.4, 0, -.3], elbowL: [-.5, 0, 0] }
const Y_CATCH: Pose = { ...Y_LEAP, spine: [.1, 0, 0], shoulderR: [-1.15, 0, .35], elbowR: [-1.0, 0, 0], shoulderL: [-1.2, 0, -.3], elbowL: [-1.0, 0, 0] }
const Y_CARRY: Pose = { ...legsReady, spine: [-.08, 0, 0], chest: [-.05, 0, 0], shoulderR: [-.9, 0, .35], elbowR: [-1.2, 0, 0], wristR: [.2, 0, 0], shoulderL: [-.6, 0, -.35], elbowL: [-1.0, 0, 0] }
const Y_CARRY_AIR: Pose = { ...Y_CARRY, thighL: [-.9, 0, .15], kneeL: [1.2, 0, 0], thighR: [-.5, 0, -.15], kneeR: [1.0, 0, 0], drop: 0 }
const Y_CARRY_LAND: Pose = { ...Y_CARRY, thighL: [-1.3, 0, .2], kneeL: [2.0, 0, 0], ankleL: [-.7, 0, 0], thighR: [-.3, 0, -.2], kneeR: [1.7, 0, 0], ankleR: [-.2, 0, 0], drop: .45, spine: [.25, 0, 0] }
const Y_CARRY_LOOK: Pose = { ...Y_CARRY, neck: [.35, .35, 0], head: [.15, .15, 0] }

export const yoruichiTrack = bakeTrack([
  { t: 0, pose: Y_SIT },
  { t: GD.burst, pose: Y_SIT },
  { t: GD.burst + .4, pose: Y_LEAN },
  { t: GD.standoff, pose: Y_LEAN },
  { t: GD.reveal, pose: Y_SIT },
])
export const yoruichiFinish = bakeTrack([
  { t: F, pose: Y_SIT },
  { t: GD.hit, pose: Y_LEAN },
  { t: GD.leap, pose: Y_LEAN },
  { t: GD.appear, pose: Y_LEAP, ease: 'snap' },
  { t: GD.catch, pose: Y_CATCH },
  { t: GD.catch + .2, pose: Y_CARRY_AIR },
  { t: GD.touchdown, pose: Y_CARRY_AIR },
  { t: GD.touchdown + .12, pose: Y_CARRY_LAND, ease: 'snap' },
  { t: GD.rise, pose: Y_CARRY_LAND },
  { t: GD.rise + .5, pose: Y_CARRY },
  { t: GD.lookUp + .3, pose: Y_CARRY_LOOK },
  { t: GD.end - .9, pose: Y_CARRY },
])

/** Flash-step moments for Soi Fon, derived from the paths: where she vanished and reappeared. */
export function soiFlashSteps() {
  const out: { t: number; from: V3; to: V3; toTime: number }[] = []
  for (const path of [soiPath, soiFinishPath]) path.forEach((k, i) => { if (k.hide && path[i + 1]) out.push({ t: k.t, from: k.p, to: path[i + 1].p, toTime: path[i + 1].t }) })
  return out
}
export const STING_POINT: V3 = [IX, G + 1.17, IZ + .17]
export const SOI_HAND_AT_CALL: V3 = [SX - .05, G + 1.2, SZ + .3]

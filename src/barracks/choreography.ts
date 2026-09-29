// Keyframed performances for the Division barracks (see finale/rig.ts for conventions).
import { bakeTrack } from '../finale/rig'
import type { Pose } from '../finale/rig'
import { I_STAND } from '../finale/choreography'
import type { CaptainKind } from './characters'
import { BARRACKS_FINISH as F, BT } from './timeline'

const legsReady: Pose = { thighL: [-.14, 0, .1], kneeL: [.26, 0, 0], ankleL: [-.12, 0, 0], thighR: [.14, 0, -.1], kneeR: [.22, 0, 0], ankleR: [-.1, 0, 0], drop: .035 }
const legsWide: Pose = { thighL: [-.32, 0, .2], kneeL: [.46, 0, 0], ankleL: [-.14, 0, 0], thighR: [.22, 0, -.2], kneeR: [.42, 0, 0], ankleR: [-.2, 0, 0], drop: .09 }

// --- Ichigo (Shikai) -------------------------------------------------------------------------
const I_READY: Pose = { ...I_STAND, ...legsWide, drop: .07, shoulderR: [-.62, 0, -.1], elbowR: [-.75, 0, 0], wristR: [.7, 0, 0] }
const I_LOOK_UP: Pose = { ...I_READY, neck: [-.3, .05, 0], head: [-.25, 0, 0], spine: [-.05, -.1, 0] }
const I_GUARD: Pose = { ...legsWide, drop: .12, spine: [.1, -.05, 0], chest: [.02, 0, 0], neck: [-.2, .05, 0], shoulderR: [-1.3, 0, .35], elbowR: [-.85, 0, 0], wristR: [1.0, .6, 0], shoulderL: [-1.15, 0, -.45], elbowL: [-1.1, 0, 0], wristL: [.2, 0, 0] }
const I_BRACED: Pose = { ...I_GUARD, drop: .2, spine: [-.12, -.05, 0], chest: [-.14, 0, 0], thighL: [-.15, 0, .2], kneeL: [.55, 0, 0], thighR: [.5, 0, -.2], kneeR: [.4, 0, 0] }
/** Legs locked in the ice; the upper body strains and twists. */
export const I_FROZEN: Pose = { ...I_BRACED, drop: .12, thighL: [-.2, 0, .18], kneeL: [.35, 0, 0], thighR: [.3, 0, -.18], kneeR: [.3, 0, 0], spine: [.15, .25, 0], chest: [.1, .1, 0], neck: [-.15, -.2, 0], shoulderR: [-.9, 0, .1], elbowR: [-1.1, 0, 0], wristR: [1.2, 0, 0], shoulderL: [-.6, 0, -.2], elbowL: [-1.2, 0, 0] }
const I_FLARE: Pose = { ...legsWide, drop: .1, spine: [-.1, 0, 0], chest: [-.15, 0, 0], neck: [-.1, 0, 0], shoulderR: [-.6, 0, -.75], elbowR: [-.2, 0, 0], wristR: [1.3, 0, 0], shoulderL: [-.4, 0, .9], elbowL: [-.2, 0, 0] }
const I_WINDUP: Pose = {
  thighL: [-.58, 0, .17], kneeL: [.78, 0, 0], ankleL: [-.2, 0, 0], thighR: [.36, 0, -.15], kneeR: [.48, 0, 0], ankleR: [-.1, 0, 0], drop: .14, offset: [0, 0, -.12],
  spine: [-.04, -.5, 0], chest: [-.1, -.2, .05], neck: [.02, .38, 0], head: [.04, .3, 0],
  shoulderR: [-2.55, 0, -.35], elbowR: [-1.1, 0, 0], wristR: [.9, 0, 0], shoulderL: [-2.25, 0, -.5], elbowL: [-1.2, 0, 0], wristL: [.3, 0, 0],
}
const I_SLASH: Pose = {
  thighL: [-1.05, 0, .1], kneeL: [1.02, 0, 0], ankleL: [.05, 0, 0], thighR: [.55, 0, -.1], kneeR: [.36, 0, 0], ankleR: [.22, 0, 0], drop: .2, offset: [0, 0, .55],
  spine: [.22, .45, 0], chest: [.25, .2, 0], neck: [-.12, -.32, 0], head: [-.14, -.26, 0],
  shoulderR: [-.78, 0, .55], elbowR: [-.15, 0, 0], wristR: [1.35, 0, 0], shoulderL: [.35, 0, .45], elbowL: [-.4, 0, 0],
}
const I_SHOULDER: Pose = { ...I_STAND, shoulderR: [-1.9, 0, -.4], elbowR: [-1.95, 0, 0], wristR: [.9, 0, 0], neck: [.05, .1, 0] }

export const hallIchigoTrack = bakeTrack([
  { t: 0, pose: I_STAND },
  { t: 1.6, pose: I_READY },
  { t: BT.dragonOut, pose: I_READY },
  { t: BT.dragonOut + .6, pose: I_LOOK_UP },
  { t: BT.settle, pose: I_LOOK_UP },
  { t: BT.dragon + .3, pose: I_READY },
  { t: BT.dive + .1, pose: I_GUARD },
  { t: BT.impact - .05, pose: I_GUARD },
  { t: BT.impact + .08, pose: I_BRACED, ease: 'snap' },
  { t: BT.impact + .8, pose: I_BRACED },
  { t: BT.circle + .9, pose: I_FROZEN },
  { t: BT.reveal, pose: I_FROZEN },
])
export const hallIchigoFinish = bakeTrack([
  { t: F, pose: I_FROZEN },
  { t: BT.breakFree - .05, pose: { ...I_FROZEN, drop: .16 } },
  { t: BT.breakFree + .1, pose: I_FLARE, ease: 'snap' },
  { t: BT.windup + .45, pose: I_WINDUP },
  { t: BT.finishSwing, pose: { ...I_WINDUP, drop: .16, chest: [-.14, -.24, .05] } },
  { t: BT.release, pose: I_SLASH, ease: 'snap' },
  { t: F + 2.2, pose: { ...I_SLASH, drop: .18 } },
  { t: F + 3.1, pose: I_READY },
  { t: F + 3.9, pose: I_SHOULDER },
])

// --- Tōshirō ------------------------------------------------------------------------------------
const T_STAND: Pose = { ...legsReady, drop: .02, shoulderR: [.05, 0, -.08], elbowR: [-.2, 0, 0], shoulderL: [.05, 0, .08], elbowL: [-.2, 0, 0] }
const T_DRAW: Pose = { ...legsReady, shoulderR: [-2.9, 0, -.25], elbowR: [-1.9, 0, 0], wristR: [.5, 0, 0], neck: [0, -.2, 0], shoulderL: [-.3, 0, .3], elbowL: [-.6, 0, 0] }
const T_CALL: Pose = { ...legsWide, spine: [.05, -.25, 0], shoulderR: [-1.4, 0, -.1], elbowR: [-.15, 0, 0], wristR: [1.55, 0, 0], shoulderL: [-1.2, 0, -.55], elbowL: [-.6, 0, 0], neck: [0, .25, 0] }
const T_SWING: Pose = { ...legsWide, drop: .12, spine: [-.15, .3, 0], chest: [-.2, .1, 0], neck: [-.25, -.1, 0], shoulderR: [-3.0, 0, .2], elbowR: [-.1, 0, 0], wristR: [1.2, 0, 0], shoulderL: [.3, 0, .6], elbowL: [-.3, 0, 0] }
const T_COMMAND: Pose = { ...legsReady, spine: [-.05, .1, 0], neck: [-.3, 0, 0], shoulderR: [-2.4, 0, -.2], elbowR: [-.2, 0, 0], wristR: [.9, 0, 0], shoulderL: [-.2, 0, .45], elbowL: [-.3, 0, 0] }
const T_POINT: Pose = { ...legsWide, drop: .1, spine: [.12, -.15, 0], shoulderR: [-1.5, 0, .05], elbowR: [-.05, 0, 0], wristR: [1.57, 0, 0], shoulderL: [.4, 0, .5], elbowL: [-.3, 0, 0] }
const T_THRUST: Pose = { ...T_POINT, offset: [0, 0, .3], drop: .16, spine: [.28, -.1, 0], chest: [.15, 0, 0] }
const T_READY: Pose = { ...legsReady, shoulderR: [-.4, 0, -.2], elbowR: [-.5, 0, 0], wristR: [1.3, 0, 0], shoulderL: [.05, 0, .12], elbowL: [-.3, 0, 0] }
const T_GUARD: Pose = { ...legsWide, drop: .12, shoulderR: [-1.3, 0, .4], elbowR: [-1.0, 0, 0], wristR: [.95, .6, 0], shoulderL: [-1.1, 0, -.4], elbowL: [-1.1, 0, 0] }
const T_HIT: Pose = { thighL: [-.45, 0, .12], kneeL: [.3, 0, 0], thighR: [.32, 0, -.12], kneeR: [.22, 0, 0], drop: .06, offset: [0, 0, -1.3], spine: [-.35, 0, 0], chest: [-.3, 0, 0], neck: [-.3, 0, 0], shoulderR: [-.8, 0, -1.0], elbowR: [-.3, 0, 0], shoulderL: [-.6, 0, .9], elbowL: [-.3, 0, 0] }
const T_KNEEL: Pose = {
  offset: [0, 0, -1.5], drop: .47, thighL: [-1.5, 0, .12], kneeL: [1.5, 0, 0], thighR: [.05, 0, -.08], kneeR: [1.55, 0, 0], ankleR: [.5, 0, 0],
  spine: [.22, 0, 0], chest: [.15, 0, 0], neck: [.28, 0, 0], shoulderR: [-.9, 0, -.1], elbowR: [-.2, 0, 0], wristR: [2.2, 0, 0], shoulderL: [-.6, 0, .05], elbowL: [-.9, 0, 0],
}
export const toshiroTrack = bakeTrack([
  { t: 0, pose: T_STAND },
  { t: BT.draw - .05, pose: T_STAND },
  { t: BT.drawn - .1, pose: T_DRAW },
  { t: BT.call, pose: T_CALL },
  { t: BT.swing - .08, pose: { ...T_CALL, drop: .1, shoulderR: [-1.0, 0, -.1], wristR: [1.9, 0, 0] } },
  { t: BT.swing + .12, pose: T_SWING, ease: 'snap' },
  { t: 4.0, pose: T_COMMAND },
  { t: BT.settle, pose: T_COMMAND },
  { t: BT.dragon + .1, pose: T_READY },
  { t: BT.dive - .05, pose: T_POINT },
  { t: BT.dive + .2, pose: T_THRUST, ease: 'snap' },
  { t: BT.impact + .4, pose: T_THRUST },
  { t: BT.circle + .6, pose: T_READY },
  { t: BT.reveal, pose: T_READY },
])
export const toshiroFinish = bakeTrack([
  { t: F, pose: T_READY },
  { t: BT.windup + .3, pose: T_POINT },
  { t: BT.intercept, pose: T_GUARD },
  { t: BT.hit - .02, pose: T_GUARD },
  { t: BT.hit + .2, pose: T_HIT, ease: 'snap' },
  { t: F + 2.9, pose: T_KNEEL },
])

// --- Captains watching from the sides ----------------------------------------------------------------
export const captainPoses: Record<CaptainKind, Pose> = {
  // Hands folded into opposite sleeves.
  ukitake: { thighL: [0, 0, .05], thighR: [.02, 0, -.05], shoulderR: [-.62, 0, .38], elbowR: [-1.5, 0, 0], shoulderL: [-.62, 0, -.38], elbowL: [-1.5, 0, 0] },
  // A hand at his hat brim, weight on one leg.
  shunsui: { thighL: [-.12, 0, .12], kneeL: [.2, 0, 0], thighR: [.05, 0, -.05], drop: .03, spine: [0, .12, .04], shoulderR: [-2.25, 0, .35], elbowR: [-1.75, 0, 0], shoulderL: [.1, 0, .2], elbowL: [-.5, 0, 0] },
  // Hands folded in front of the waist.
  unohana: { thighL: [0, 0, .04], thighR: [0, 0, -.04], shoulderR: [-.3, 0, .28], elbowR: [-1.2, 0, 0], shoulderL: [-.3, 0, -.28], elbowL: [-1.2, 0, 0] },
  // Arms crossed high across the chest.
  komamura: { thighL: [-.05, 0, .12], thighR: [.05, 0, -.12], shoulderR: [-.95, 0, .58], elbowR: [-1.95, 0, 0], shoulderL: [-.85, 0, -.52], elbowL: [-1.95, 0, 0] },
  // One hand at his chin, the other across his waist.
  mayuri: { thighL: [-.05, 0, .08], thighR: [.05, 0, -.08], spine: [.04, -.1, 0], shoulderR: [-1.05, 0, .45], elbowR: [-2.25, 0, 0], shoulderL: [-.35, 0, -.35], elbowL: [-1.3, 0, 0] },
}

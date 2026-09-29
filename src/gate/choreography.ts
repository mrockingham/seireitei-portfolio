// Keyframed performances for the Spirit Gate encounter (see finale/rig.ts for conventions).
// Pre-reveal tracks run on the gate clock; finish tracks are keyed from GATE_FINISH.
import { bakeTrack } from '../finale/rig'
import type { Pose } from '../finale/rig'
import { I_STAND } from '../finale/choreography'
import { GATE_FINISH as F, GT } from './timeline'

const legsReady: Pose = { thighL: [-.14, 0, .1], kneeL: [.26, 0, 0], ankleL: [-.12, 0, 0], thighR: [.14, 0, -.1], kneeR: [.22, 0, 0], ankleR: [-.1, 0, 0], drop: .035 }
const legsWide: Pose = { thighL: [-.32, 0, .2], kneeL: [.46, 0, 0], ankleL: [-.14, 0, 0], thighR: [.22, 0, -.2], kneeR: [.42, 0, 0], ankleR: [-.2, 0, 0], drop: .09 }

// --- Ichigo (Shikai) ---------------------------------------------------------------------
const I_LOOK_DOWN: Pose = { ...I_STAND, neck: [.35, .1, 0], head: [.25, .05, 0], spine: [.08, -.14, 0] }
const I_CROUCH: Pose = { ...legsWide, drop: .22, thighL: [-.7, 0, .2], kneeL: [1.2, 0, 0], ankleL: [-.5, 0, 0], thighR: [-.5, 0, -.2], kneeR: [1.1, 0, 0], ankleR: [-.6, 0, 0], spine: [.35, 0, 0], chest: [.15, 0, 0], shoulderR: [-.6, 0, -.3], elbowR: [-.8, 0, 0], wristR: [1.1, 0, 0], shoulderL: [.4, 0, .5], elbowL: [-.5, 0, 0] }
const I_AIR: Pose = { thighL: [-1.2, 0, .15], kneeL: [1.5, 0, 0], thighR: [-.8, 0, -.15], kneeR: [1.6, 0, 0], ankleR: [.3, 0, 0], spine: [-.1, 0, 0], chest: [-.1, 0, 0], shoulderR: [-.3, 0, -.6], elbowR: [-.6, 0, 0], wristR: [1.2, 0, 0], shoulderL: [-.4, 0, .9], elbowL: [-.4, 0, 0] }
const I_GUARD_HIGH: Pose = { ...legsWide, spine: [.12, -.05, 0], chest: [.08, 0, 0], neck: [-.08, .05, 0], shoulderR: [-1.25, 0, .35], elbowR: [-.9, 0, 0], wristR: [.95, .6, 0], shoulderL: [-1.1, 0, -.45], elbowL: [-1.1, 0, 0], wristL: [.2, 0, 0] }
const I_BRACED: Pose = { ...I_GUARD_HIGH, drop: .16, spine: [-.08, -.05, 0], chest: [-.1, 0, 0], thighL: [-.2, 0, .2], kneeL: [.5, 0, 0], thighR: [.45, 0, -.2], kneeR: [.35, 0, 0] }
const I_GUARD_LOW: Pose = { ...legsWide, drop: .14, spine: [.22, .15, 0], chest: [.15, 0, 0], neck: [-.15, -.1, 0], shoulderR: [-.5, 0, .5], elbowR: [-.3, 0, 0], wristR: [1.9, 0, 0], shoulderL: [-.7, 0, -.4], elbowL: [-.6, 0, 0] }
const I_READY: Pose = { ...I_STAND, ...legsWide, drop: .07, shoulderR: [-.62, 0, -.1], elbowR: [-.75, 0, 0], wristR: [.7, 0, 0] }
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

export const gateIchigoTrack = bakeTrack([
  { t: 0, pose: I_STAND },
  { t: GT.danceStart + .3, pose: I_READY },
  { t: GT.notice - .1, pose: I_READY },
  { t: GT.notice + .1, pose: I_LOOK_DOWN, ease: 'snap' },
  { t: GT.dodge, pose: I_CROUCH, ease: 'snap' },
  { t: GT.dodge + .18, pose: I_AIR, ease: 'out' },
  { t: GT.dodge + .36, pose: { ...I_CROUCH, drop: .28 }, ease: 'in' },
  { t: GT.dodge + .9, pose: I_READY },
  { t: GT.lashRelease - .1, pose: I_READY },
  { t: GT.lashHit - .12, pose: I_GUARD_HIGH },
  { t: GT.lashHit + .06, pose: I_BRACED, ease: 'snap' },
  { t: GT.lashHit + .5, pose: I_GUARD_HIGH },
  { t: GT.sweepRelease, pose: I_GUARD_HIGH },
  { t: GT.sweepHit - .08, pose: I_GUARD_LOW },
  { t: GT.sweepHit + .06, pose: { ...I_GUARD_LOW, drop: .2 }, ease: 'snap' },
  { t: GT.retract + .4, pose: I_READY },
  { t: GT.reveal, pose: I_READY },
])
export const gateIchigoFinish = bakeTrack([
  { t: F, pose: I_READY },
  { t: F + .7, pose: I_WINDUP },
  { t: GT.finishSwing, pose: { ...I_WINDUP, drop: .16, chest: [-.14, -.24, .05] } },
  { t: GT.finishRelease, pose: I_SLASH, ease: 'snap' },
  { t: F + 1.7, pose: { ...I_SLASH, drop: .18 } },
  { t: F + 2.6, pose: I_READY },
  { t: F + 3.3, pose: I_SHOULDER },
])

// --- Rukia ---------------------------------------------------------------------------------
const R_IDLE: Pose = { thighL: [0, 0, .05], thighR: [.03, 0, -.05], kneeR: [.05, 0, 0], shoulderR: [-.2, 0, -.1], elbowR: [-.3, 0, 0], wristR: [1.0, 0, 0], shoulderL: [.03, 0, .08], elbowL: [-.25, 0, 0] }
const R_RAISE: Pose = { ...R_IDLE, offset: [0, 0, .45], shoulderR: [-1.35, 0, .3], elbowR: [-.9, 0, 0], wristR: [.68, 0, 0], shoulderL: [-.7, 0, -.5], elbowL: [-1.3, 0, 0] }
const R_DANCE: Pose = { ...legsReady, offset: [0, 0, .55], spine: [.04, .1, 0], shoulderR: [-1.5, 0, .12], elbowR: [-.1, 0, 0], wristR: [1.57, 0, 0], shoulderL: [-.5, 0, .6], elbowL: [-1.2, 0, 0] }
const R_POINT: Pose = { ...legsWide, offset: [0, 0, .7], spine: [.18, .2, 0], chest: [.1, 0, 0], neck: [-.1, -.1, 0], shoulderR: [-1.12, 0, .16], elbowR: [-.12, 0, 0], wristR: [1.75, 0, 0], shoulderL: [.5, 0, .7], elbowL: [-.3, 0, 0] }
const R_WATCH: Pose = { ...R_IDLE, offset: [0, 0, .3], shoulderR: [-.35, 0, -.15], elbowR: [-.5, 0, 0], wristR: [1.1, 0, 0] }
const R_ASIDE: Pose = { ...R_WATCH, offset: [.75, 0, -.25], spine: [0, -.2, 0], neck: [0, -.25, 0] }
const R_HIT: Pose = { thighL: [-.4, 0, .1], kneeL: [.3, 0, 0], thighR: [.3, 0, -.1], kneeR: [.2, 0, 0], drop: .05, offset: [.75, 0, -1.4], spine: [-.35, 0, 0], chest: [-.3, 0, 0], neck: [-.3, 0, 0], shoulderR: [-.6, 0, -.9], elbowR: [-.3, 0, 0], shoulderL: [-.6, 0, .9], elbowL: [-.3, 0, 0] }
const R_KNEEL: Pose = {
  offset: [.75, 0, -1.55], drop: .47, thighL: [-1.5, 0, .12], kneeL: [1.5, 0, 0], thighR: [.05, 0, -.08], kneeR: [1.55, 0, 0], ankleR: [.5, 0, 0],
  spine: [.25, 0, 0], chest: [.2, 0, 0], neck: [.3, 0, 0], head: [.2, 0, 0], shoulderR: [-.4, 0, -.1], elbowR: [-.3, 0, 0], wristR: [1.7, 0, 0], shoulderL: [-.62, 0, .05], elbowL: [-.9, 0, 0],
}
export const rukiaTrack = bakeTrack([
  { t: 0, pose: R_IDLE },
  { t: GT.rukiaStep, pose: R_IDLE },
  { t: GT.danceStart - .05, pose: R_RAISE },
  { t: GT.danceStart + .2, pose: R_DANCE },
  { t: GT.danceEnd, pose: R_DANCE },
  { t: GT.point, pose: R_POINT, ease: 'snap' },
  { t: GT.pillar + .5, pose: R_POINT },
  { t: GT.shatter + .4, pose: R_WATCH },
  { t: GT.renji + .1, pose: R_WATCH },
  { t: GT.renji + .7, pose: R_ASIDE },
  { t: GT.reveal, pose: R_ASIDE },
])
export const rukiaFinish = bakeTrack([
  { t: F, pose: R_ASIDE },
  { t: GT.finishHit - .05, pose: { ...R_ASIDE, spine: [.1, -.2, 0], shoulderL: [-1.3, 0, -.3], elbowL: [-1.4, 0, 0] } },
  { t: GT.finishHit + .2, pose: R_HIT, ease: 'snap' },
  { t: F + 2.4, pose: R_KNEEL },
])

// --- Renji -----------------------------------------------------------------------------------
const N_SHOULDER: Pose = { thighL: [-.05, 0, .1], thighR: [.08, 0, -.1], kneeR: [.1, 0, 0], spine: [-.03, .1, 0], neck: [.02, -.05, 0], shoulderR: [-1.95, 0, -.35], elbowR: [-1.95, 0, 0], wristR: [.95, 0, 0], shoulderL: [.1, 0, .2], elbowL: [-.9, 0, 0], wristL: [.3, 0, 0] }
const N_STEP: Pose = { ...N_SHOULDER, ...legsReady, offset: [0, 0, .55] }
const N_HOWL: Pose = { ...legsWide, offset: [0, 0, .6], spine: [-.08, -.1, 0], chest: [-.1, 0, 0], neck: [-.15, 0, 0], shoulderR: [-2.3, 0, -.25], elbowR: [-.2, 0, 0], wristR: [.5, 0, 0], shoulderL: [.2, 0, .4], elbowL: [-.4, 0, 0] }
const N_LASH_WINDUP: Pose = { ...legsWide, offset: [0, 0, .5], drop: .12, spine: [-.12, -.35, 0], chest: [-.15, -.1, 0], shoulderR: [-2.9, 0, -.2], elbowR: [-.9, 0, 0], wristR: [.4, 0, 0], shoulderL: [-.8, 0, .5], elbowL: [-.3, 0, 0] }
const N_LASH: Pose = { ...legsWide, offset: [0, 0, .75], drop: .18, spine: [.25, .25, 0], chest: [.2, .1, 0], shoulderR: [-.9, 0, .15], elbowR: [-.1, 0, 0], wristR: [1.3, 0, 0], shoulderL: [.4, 0, .5], elbowL: [-.4, 0, 0] }
const N_FLOURISH: Pose = { ...legsWide, offset: [0, 0, .6], spine: [0, .1, 0], shoulderR: [-2.6, 0, -.6], elbowR: [-.4, 0, 0], wristR: [.8, 0, 0], shoulderL: [.2, 0, .5], elbowL: [-.5, 0, 0] }
const N_SWEEP_WINDUP: Pose = { ...legsWide, offset: [0, 0, .6], drop: .14, spine: [.1, .55, 0], chest: [.05, .2, 0], neck: [0, -.5, 0], shoulderR: [-1.1, 0, .95], elbowR: [-.5, 0, 0], wristR: [1.1, 0, 0], shoulderL: [.2, 0, .6], elbowL: [-.6, 0, 0] }
const N_SWEEP: Pose = { ...legsWide, offset: [0, 0, .7], drop: .16, spine: [.15, -.55, 0], chest: [.1, -.2, 0], neck: [0, .45, 0], shoulderR: [-1.25, 0, -1.2], elbowR: [-.1, 0, 0], wristR: [1.2, 0, 0], shoulderL: [-.4, 0, .2], elbowL: [-.6, 0, 0] }
const N_REST: Pose = { ...N_SHOULDER, offset: [0, 0, .55], spine: [-.06, .15, 0], neck: [-.04, -.1, 0], thighL: [-.12, 0, .14], thighR: [.1, 0, -.12] }
const N_HIT: Pose = { thighL: [-.45, 0, .12], kneeL: [.3, 0, 0], thighR: [.32, 0, -.12], kneeR: [.22, 0, 0], drop: .06, offset: [0, 0, -1.2], spine: [-.35, 0, 0], chest: [-.3, 0, 0], neck: [-.3, 0, 0], shoulderR: [-.8, 0, -1.0], elbowR: [-.3, 0, 0], shoulderL: [-.6, 0, .9], elbowL: [-.3, 0, 0] }
const N_KNEEL: Pose = {
  offset: [0, 0, -1.4], drop: .47, thighL: [-1.5, 0, .12], kneeL: [1.5, 0, 0], thighR: [.05, 0, -.08], kneeR: [1.55, 0, 0], ankleR: [.5, 0, 0],
  spine: [.2, 0, 0], chest: [.15, 0, 0], neck: [.25, 0, 0], shoulderR: [-.9, 0, -.1], elbowR: [-.2, 0, 0], wristR: [2.2, 0, 0], shoulderL: [-.6, 0, .05], elbowL: [-.9, 0, 0],
}
export const renjiTrack = bakeTrack([
  { t: 0, pose: N_SHOULDER },
  { t: GT.renji, pose: N_SHOULDER },
  { t: GT.renji + .4, pose: N_STEP },
  { t: GT.howl, pose: N_HOWL, ease: 'snap' },
  { t: GT.lashWindup + .15, pose: N_LASH_WINDUP },
  { t: GT.lashRelease + .12, pose: N_LASH, ease: 'snap' },
  { t: GT.flourish, pose: N_LASH },
  { t: GT.flourish + .35, pose: N_FLOURISH },
  { t: GT.sweepWindup + .1, pose: N_SWEEP_WINDUP },
  { t: GT.sweepRelease + .2, pose: N_SWEEP, ease: 'snap' },
  { t: GT.retract + .2, pose: N_SWEEP },
  { t: GT.shoulder, pose: N_REST },
  { t: GT.reveal, pose: N_REST },
])
export const renjiFinish = bakeTrack([
  { t: F, pose: N_REST },
  { t: GT.finishHit - .1, pose: { ...N_REST, shoulderR: [-1.4, 0, .2], elbowR: [-1.2, 0, 0], wristR: [1.4, 0, 0] } },
  { t: GT.finishHit + .2, pose: N_HIT, ease: 'snap' },
  { t: F + 2.5, pose: N_KNEEL },
])

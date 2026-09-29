// Keyframed performances for the finale. Each strike follows anticipation → contact →
// follow-through → recovery; see rig.ts for rotation conventions.
import { T } from './timeline'
import { bakeTrack } from './rig'
import type { Pose } from './rig'

const legsReady: Pose = { thighL: [-.14, 0, .1], kneeL: [.26, 0, 0], ankleL: [-.12, 0, 0], thighR: [.14, 0, -.1], kneeR: [.22, 0, 0], ankleR: [-.1, 0, 0], drop: .035 }
const legsWide: Pose = { thighL: [-.32, 0, .2], kneeL: [.46, 0, 0], ankleL: [-.14, 0, 0], thighR: [.22, 0, -.2], kneeR: [.42, 0, 0], ankleR: [-.2, 0, 0], drop: .09 }
const legsLunge: Pose = { thighL: [-1.05, 0, .1], kneeL: [1.02, 0, 0], ankleL: [.05, 0, 0], thighR: [.55, 0, -.1], kneeR: [.36, 0, 0], ankleR: [.22, 0, 0], drop: .2 }

// --- Ichigo --------------------------------------------------------------------------
export const I_STAND: Pose = {
  ...legsReady, spine: [.03, -.14, 0], chest: [.04, -.05, 0], neck: [0, .1, 0], head: [-.04, .08, 0],
  shoulderR: [-.42, 0, -.2], elbowR: [-.55, 0, 0], wristR: [.6, 0, 0],
  shoulderL: [.05, 0, .16], elbowL: [-.28, 0, 0],
}
const I_GUARD: Pose = {
  ...legsWide, spine: [.1, -.1, 0], chest: [.08, 0, 0], neck: [-.05, .08, 0], head: [-.05, .06, 0],
  shoulderR: [-.72, 0, .14], elbowR: [-.95, 0, 0], wristR: [.28, 0, 0],
  shoulderL: [-.55, 0, -.25], elbowL: [-.9, 0, 0], wristL: [.1, 0, 0],
}
const I_WINDUP: Pose = {
  thighL: [-.58, 0, .17], kneeL: [.78, 0, 0], ankleL: [-.2, 0, 0], thighR: [.36, 0, -.15], kneeR: [.48, 0, 0], ankleR: [-.1, 0, 0], drop: .14, offset: [0, 0, -.12],
  spine: [-.04, -.5, 0], chest: [-.1, -.2, .05], neck: [.02, .38, 0], head: [.04, .3, 0],
  shoulderR: [-2.55, 0, -.35], elbowR: [-1.1, 0, 0], wristR: [.9, 0, 0],
  shoulderL: [-2.25, 0, -.5], elbowL: [-1.2, 0, 0], wristL: [.3, 0, 0],
}
const I_SLASH: Pose = {
  ...legsLunge, offset: [0, 0, .55],
  spine: [.22, .45, 0], chest: [.25, .2, 0], neck: [-.12, -.32, 0], head: [-.14, -.26, 0],
  shoulderR: [-.78, 0, .55], elbowR: [-.15, 0, 0], wristR: [1.35, 0, 0],
  shoulderL: [.35, 0, .45], elbowL: [-.4, 0, 0],
}
const I_TENSE: Pose = {
  ...legsWide, drop: .12, spine: [.16, .05, 0], chest: [.12, 0, 0], neck: [-.1, -.05, 0], head: [-.1, -.1, 0],
  shoulderR: [-.4, 0, -.3], elbowR: [-.7, 0, 0], wristR: [.9, 0, 0],
  shoulderL: [-1.25, 0, -.4], elbowL: [-1.55, 0, 0], wristL: [.2, 0, 0],
}
const I_BANKAI_CALL: Pose = {
  ...legsWide, drop: .11, spine: [.05, .18, 0], chest: [.06, .1, 0], neck: [0, -.18, 0], head: [-.04, -.12, 0],
  shoulderR: [-1.52, 0, .14], elbowR: [-.05, 0, 0], wristR: [1.56, 0, 0],
  shoulderL: [-1.22, 0, -.66], elbowL: [-.98, 0, 0], wristL: [.2, 0, 0],
}
const I_BANKAI_POWER: Pose = { ...I_BANKAI_CALL, spine: [-.06, .18, 0], chest: [-.12, .1, 0], neck: [-.12, -.18, 0], drop: .14 }
export const I_BANKAI_STANCE: Pose = {
  thighL: [-.2, 0, .13], kneeL: [.3, 0, 0], ankleL: [-.1, 0, 0], thighR: [.15, 0, -.12], kneeR: [.26, 0, 0], ankleR: [-.11, 0, 0], drop: .05,
  spine: [.02, -.2, 0], chest: [.02, -.08, 0], neck: [0, .18, 0], head: [0, .12, 0],
  shoulderR: [-.3, 0, -.32], elbowR: [-.35, 0, 0], wristR: [1.25, 0, 0],
  shoulderL: [.05, 0, .12], elbowL: [-.2, 0, 0],
}
const I_FINAL_WINDUP: Pose = {
  thighL: [-.65, 0, .18], kneeL: [.86, 0, 0], ankleL: [-.2, 0, 0], thighR: [.4, 0, -.16], kneeR: [.5, 0, 0], ankleR: [-.1, 0, 0], drop: .16, offset: [0, 0, -.12],
  spine: [-.12, -.22, 0], chest: [-.18, -.1, 0], neck: [.06, .2, 0], head: [.1, .14, 0],
  shoulderR: [-2.85, 0, -.12], elbowR: [-.55, 0, 0], wristR: [.25, 0, 0],
  shoulderL: [-2.78, 0, -.28], elbowL: [-.62, 0, 0], wristL: [.2, 0, 0],
}
const I_FINAL_SLASH: Pose = {
  thighL: [-1.15, 0, .1], kneeL: [1.1, 0, 0], ankleL: [.05, 0, 0], thighR: [.62, 0, -.1], kneeR: [.42, 0, 0], ankleR: [.25, 0, 0], drop: .24, offset: [0, 0, .7],
  spine: [.3, .15, 0], chest: [.3, .05, 0], neck: [-.2, -.1, 0], head: [-.2, -.1, 0],
  shoulderR: [-.95, 0, .2], elbowR: [-.05, 0, 0], wristR: [1.45, 0, 0],
  shoulderL: [-.9, 0, -.36], elbowL: [-.25, 0, 0], wristL: [.3, 0, 0],
}

export const ichigoTrack = bakeTrack([
  { t: 0, pose: I_STAND },
  { t: 1.9, pose: I_STAND },
  { t: 2.5, pose: I_GUARD },
  { t: 4.3, pose: I_GUARD },
  // First Getsuga: long readable wind-up, a snap, then a held follow-through.
  { t: 5.05, pose: I_WINDUP },
  { t: T.firstSwing, pose: { ...I_WINDUP, drop: .16, chest: [-.14, -.24, .05] } },
  { t: T.firstRelease, pose: I_SLASH, ease: 'snap' },
  { t: 5.95, pose: { ...I_SLASH, drop: .18 } },
  { t: 6.7, pose: I_GUARD },
  { t: 7.9, pose: I_GUARD },
  { t: 8.6, pose: I_STAND },
  { t: 10.6, pose: I_STAND },
  { t: 11.1, pose: I_GUARD },
  { t: 13.3, pose: I_GUARD },
  { t: 14.1, pose: I_TENSE },
  { t: 15.05, pose: I_TENSE },
  { t: 15.55, pose: I_BANKAI_CALL },
  { t: T.bankaiBurst - .05, pose: I_BANKAI_CALL },
  { t: T.bankaiBurst + .15, pose: I_BANKAI_POWER, ease: 'snap' },
  { t: 16.9, pose: I_BANKAI_POWER },
  { t: 17.6, pose: I_BANKAI_STANCE },
  { t: T.finalWindup, pose: I_BANKAI_STANCE },
  // Final Getsuga: overhead two-handed charge, then a deep lunge.
  { t: 20.02, pose: I_FINAL_WINDUP },
  { t: T.finalSwing, pose: { ...I_FINAL_WINDUP, drop: .18 } },
  { t: T.finalRelease, pose: I_FINAL_SLASH, ease: 'snap' },
  { t: 21.4, pose: { ...I_FINAL_SLASH, drop: .22 } },
  { t: 22.7, pose: I_BANKAI_STANCE },
])

// --- Player avatar (exploration and the finishing move in the earlier encounters) --------
export const I_EXPLORE: Pose = {
  thighL: [-.04, 0, .05], kneeL: [.08, 0, 0], thighR: [.04, 0, -.05], kneeR: [.06, 0, 0], drop: .01,
  spine: [.02, 0, 0], shoulderR: [.02, 0, -.1], elbowR: [-.2, 0, 0], shoulderL: [.02, 0, .1], elbowL: [-.2, 0, 0],
}
export const playerFinishTrack = bakeTrack([
  { t: 0, pose: I_STAND },
  { t: .28, pose: { ...I_WINDUP, offset: [0, 0, 0] } },
  { t: .42, pose: { ...I_SLASH, offset: [0, 0, .25] }, ease: 'snap' },
  { t: .95, pose: { ...I_SLASH, offset: [0, 0, .25] } },
  { t: 1.45, pose: I_STAND },
])

// --- Byakuya ------------------------------------------------------------------------------
const legsComposed: Pose = { thighL: [0, 0, .05], thighR: [.02, 0, -.05], kneeR: [.04, 0, 0] }
export const B_IDLE: Pose = {
  ...legsComposed, chest: [-.02, 0, 0], neck: [.02, 0, 0], head: [.04, 0, 0],
  shoulderR: [-.16, 0, -.08], elbowR: [-.34, 0, 0], wristR: [.9, 0, 0],
  shoulderL: [.03, 0, .08], elbowL: [-.14, 0, 0],
}
const B_RAISE: Pose = { ...B_IDLE, shoulderR: [-1.25, 0, .42], elbowR: [-1.45, 0, 0], wristR: [1.12, 0, 0], head: [.06, 0, 0] }
const B_HILT: Pose = { ...B_IDLE, shoulderR: [-.34, 0, -.12], elbowR: [-.45, 0, 0], wristR: [.4, 0, 0] }
const B_COMMAND: Pose = { ...B_HILT, spine: [0, .12, 0], shoulderL: [-1.38, 0, -.06], elbowL: [-.12, 0, 0], wristL: [-.25, 0, 0] }
const B_SWORD_DOWN: Pose = { ...B_IDLE, shoulderR: [-1.4, 0, .26], elbowR: [-.2, 0, 0], wristR: [3.1, 0, 0] }
const B_EMPTY: Pose = { ...B_IDLE, shoulderR: [-.05, 0, -.06], elbowR: [-.1, 0, 0], wristR: [.1, 0, 0], shoulderL: [.03, 0, .06], elbowL: [-.1, 0, 0] }
const B_FLINCH: Pose = { ...B_EMPTY, spine: [-.06, 0, 0], shoulderL: [-1.5, 0, -.5], elbowL: [-1.6, 0, 0], head: [-.05, .2, 0], offset: [0, 0, -.1] }
const B_TORRENT: Pose = { ...B_EMPTY, spine: [.04, .1, 0], shoulderL: [-1.45, 0, 0], elbowL: [-.05, 0, 0], wristL: [-.3, 0, 0] }
const B_HIT: Pose = {
  thighL: [-.42, 0, .12], kneeL: [.3, 0, 0], thighR: [.3, 0, -.12], kneeR: [.22, 0, 0], drop: .06, offset: [0, 0, -1.35],
  spine: [-.35, 0, 0], chest: [-.3, 0, 0], neck: [-.3, 0, 0], head: [-.2, 0, 0],
  shoulderR: [-.6, 0, -.9], elbowR: [-.3, 0, 0], shoulderL: [-.6, 0, .9], elbowL: [-.3, 0, 0],
}
const B_KNEEL: Pose = {
  offset: [0, 0, -1.6], drop: .47,
  thighL: [-1.5, 0, .12], kneeL: [1.5, 0, 0], ankleL: [0, 0, 0],
  thighR: [.05, 0, -.08], kneeR: [1.55, 0, 0], ankleR: [.5, 0, 0],
  spine: [.25, 0, 0], chest: [.2, 0, 0], neck: [.32, 0, 0], head: [.25, 0, 0],
  shoulderR: [-.1, 0, -.1], elbowR: [-.2, 0, 0], shoulderL: [-.62, 0, .05], elbowL: [-.9, 0, 0],
}
const B_STAND_AFTER: Pose = { ...B_EMPTY, offset: [0, 0, -1.6], head: [.18, 0, 0], neck: [.08, 0, 0] }

export const byakuyaTrack = bakeTrack([
  { t: 0, pose: B_IDLE },
  { t: T.byakuyaRaise, pose: B_IDLE },
  { t: 1.5, pose: B_RAISE },
  { t: 2.9, pose: B_RAISE },
  { t: 3.5, pose: B_HILT },
  { t: T.shieldGather - .05, pose: B_HILT },
  { t: T.shieldGather + .35, pose: B_COMMAND },
  { t: T.firstImpact + .06, pose: { ...B_COMMAND, chest: [-.07, 0, 0], offset: [0, 0, -.08] }, ease: 'snap' },
  { t: T.firstImpact + .6, pose: B_COMMAND },
  { t: T.shieldRelease + .2, pose: B_COMMAND },
  { t: 8.3, pose: B_HILT },
  // Bankai: the reformed sword is held point-down, released, and sinks into the ground.
  { t: T.swordBankai + .1, pose: B_HILT },
  { t: 9.65, pose: B_SWORD_DOWN },
  { t: T.swordDrop, pose: B_SWORD_DOWN },
  { t: T.swordDrop + .3, pose: { ...B_SWORD_DOWN, wristR: [1.9, 0, 0], elbowR: [-.3, 0, 0] } },
  { t: 11.2, pose: B_EMPTY },
  { t: 14.55, pose: B_EMPTY },
  { t: 15.1, pose: B_TORRENT },
  { t: T.bankaiBurst, pose: B_TORRENT },
  { t: T.bankaiBurst + .25, pose: B_FLINCH, ease: 'snap' },
  { t: 16.9, pose: B_FLINCH },
  { t: 17.7, pose: B_EMPTY },
  { t: T.torrent, pose: B_EMPTY },
  { t: 19.95, pose: B_TORRENT },
  { t: T.finalImpact, pose: B_TORRENT },
  { t: T.finalImpact + .22, pose: B_HIT, ease: 'snap' },
  { t: 21.75, pose: { ...B_HIT, drop: .12, offset: [0, 0, -1.6] } },
  { t: 22.55, pose: B_KNEEL },
  { t: 25.2, pose: B_KNEEL },
  { t: 27.2, pose: B_STAND_AFTER },
])

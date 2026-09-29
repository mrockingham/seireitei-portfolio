// Shot list for the Division barracks fight. The hall interior spans x 19.3–36.7,
// z -20.7 to -0.2, floor 0.6, timber ceiling 7.0; captains line x 23 and x 33.
import type { ShotList } from '../finale/camera'
import { BARRACKS_FINISH as F, BT, HALL_BOUNDS } from './timeline'

export const hallShots: ShotList = {
  shots: [
    // From the entrance: the hall, the captains, Tōshirō stepping out of the line.
    { start: 0, end: 1.5, blend: 0, from: { pos: [31.6, 3.5, -1.2], look: [28.8, 1.7, -12.5], fov: 46 }, to: { pos: [31.0, 3.2, -1.9], look: [28.6, 1.6, -12.8], fov: 43 } },
    // Over Ichigo's right shoulder: Hyōrinmaru is drawn and called.
    { start: 1.5, end: BT.swing - .05, blend: .5, from: { pos: [29.25, 1.75, -4.3], look: [27.9, 1.3, -13.2], fov: 34 }, to: { pos: [29.05, 1.7, -4.7], look: [27.9, 1.4, -13.2], fov: 31 } },
    // Low and wide past the right-hand captains: the dragon pours out and spirals up.
    { start: BT.swing - .05, end: BT.roar - .15, blend: 0, from: { pos: [35.6, 1.25, -6.6], look: [28, 3.2, -13.2], fov: 60 }, to: { pos: [35.8, 1.45, -7.6], look: [28, 4.3, -13.6], fov: 60 } },
    // Looking up at the roar, Tōshirō small beneath it.
    { start: BT.roar - .15, end: BT.dragon, blend: 0, from: { pos: [25.9, 1.1, -8.5], look: [27.6, 4.9, -14.6], fov: 56 }, to: { pos: [26.3, 1.0, -8.2], look: [27.7, 4.7, -14.2], fov: 54 } },
    // Over Ichigo's shoulder as the dragon rears back.
    { start: BT.dragon, end: BT.dive + .05, blend: 0, from: { pos: [29.4, 1.9, -3.5], look: [27.8, 3.8, -13.5], fov: 46 }, to: { pos: [29.2, 2.0, -3.8], look: [27.8, 4.1, -13.8], fov: 46 } },
    // Side and wide: the dive into Ichigo's guard.
    { start: BT.dive + .05, end: BT.circle, blend: 0, from: { pos: [35.3, 2.7, -9.0], look: [28, 2.5, -9.6], fov: 58 }, to: { pos: [35.1, 2.4, -8.2], look: [28, 2.1, -8.6], fov: 56 }, ease: 'linear' },
    // High in the back corner: the dragon circles the hall above the captains.
    { start: BT.circle, end: BT.coil, blend: 0, from: { pos: [21.0, 5.5, -19.4], look: [28.2, 3.2, -10.2], fov: 60 }, to: { pos: [20.8, 5.3, -18.6], look: [28, 3.0, -10], fov: 58 } },
    // Two-shot, low beside Ichigo: the dragon coils around Tōshirō.
    { start: BT.coil, end: BT.reveal, blend: .4, from: { pos: [30.9, 1.3, -4.3], look: [27.8, 2.9, -12.8], fov: 48 }, to: { pos: [30.6, 1.4, -4.7], look: [27.8, 3.0, -12.9], fov: 46 } },
    // Reveal: Ichigo, Tōshirō, and the dragon left of the Experience panel.
    { start: BT.reveal, end: BT.reveal + 4, blend: .9, from: { pos: [33.0, 2.5, -2.3], look: [26.9, 2.7, -11.4], fov: 50 }, to: { pos: [33.3, 2.7, -2.0], look: [26.7, 2.7, -11.3], fov: 50 } },
    { start: BT.reveal + 4, end: F, blend: 0, from: { pos: [33.3, 2.7, -2.0], look: [26.7, 2.7, -11.3], fov: 50 }, to: { pos: [33.3, 2.7, -2.0], look: [26.7, 2.7, -11.3], fov: 50 } },
    // Finish: low in front of Ichigo as the ice on his legs bursts.
    { start: F, end: BT.windup, blend: 0, from: { pos: [29.5, 1.05, -9.0], look: [28, 1.05, -6.5], fov: 44 }, to: { pos: [29.3, 1.2, -9.2], look: [28, 1.2, -6.5], fov: 42 } },
    // Behind Tōshirō and the coiled dragon: Ichigo winds up.
    { start: BT.windup, end: BT.release, blend: 0, from: { pos: [29.8, 2.3, -17.8], look: [28, 1.6, -6.5], fov: 40 }, to: { pos: [29.5, 2.2, -17.4], look: [28, 1.6, -6.5], fov: 38 } },
    // Side: the Getsuga cuts the intercepting dragon apart and reaches Tōshirō.
    { start: BT.release, end: F + 2.9, blend: 0, from: { pos: [35.2, 2.4, -9.6], look: [28, 2.2, -10.1], fov: 58 }, to: { pos: [35.5, 2.6, -10.8], look: [28, 2.0, -11.2], fov: 58 }, ease: 'linear' },
    // Aftermath over Ichigo's shoulder; control returns after this.
    { start: F + 2.9, end: F + 5, blend: .3, from: { pos: [29.6, 1.9, -2.7], look: [27.6, 1.2, -13.4], fov: 44 }, to: { pos: [29.9, 2.3, -2.3], look: [27.6, 1.2, -13.6], fov: 46 } },
  ],
  shakes: [[BT.swing, .05, 6], [BT.dragonOut + .3, .06, 5], [BT.roar, .12, 4], [BT.impact, .18, 5], [BT.breakFree, .08, 6], [BT.intercept, .14, 5], [BT.hit, .1, 5]],
  settle: [BT.reveal + 3.5, BT.reveal + 5],
  reveal: { start: BT.reveal, end: F - 1, lift: 1.6, shiftX: -1.6 },
  maxFov: 78, maxDolly: 1.3,
  bounds: HALL_BOUNDS,
}

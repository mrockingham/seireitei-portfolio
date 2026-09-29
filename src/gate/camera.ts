// Shot list for the Spirit Gate encounter. The courtyard platform spans x ±6 and z -1..11
// (back wall at z -3, gate towers from z 12.5), so every camera stays inside that space.
import type { ShotList } from '../finale/camera'
import { GATE_FINISH as F, GT } from './timeline'
import { SWEEP_TARGET } from './effects'

export const gateShots: ShotList = {
  shots: [
    // Establishing, over the gate steps: Rukia and Renji waiting on the platform.
    { start: 0, end: 1.45, blend: 0, from: { pos: [3.2, 2.6, 11.9], look: [-.5, 1.15, 3.6], fov: 40 }, to: { pos: [2.6, 2.3, 11.2], look: [-.4, 1.2, 3.3], fov: 37 } },
    // Over Ichigo's left shoulder: Sode no Shirayuki's dance.
    { start: 1.45, end: 2.95, blend: .5, from: { pos: [-1.15, 1.8, 9.7], look: [.35, 1.2, 2.8], fov: 36 }, to: { pos: [-.95, 1.72, 9.3], look: [.35, 1.15, 2.8], fov: 33 } },
    // High above Ichigo: the circle draws itself around him.
    { start: 2.95, end: 3.75, blend: 0, from: { pos: [2.6, 4.6, 10.9], look: [0, .35, 6.8], fov: 46 }, to: { pos: [2.4, 5.0, 10.5], look: [0, .3, 6.9], fov: 44 } },
    // Wide from the side: Tsukishiro erupts as Ichigo flash-steps clear.
    { start: 3.75, end: 5.45, blend: 0, from: { pos: [6.2, 1.25, 7.9], look: [0, 2.9, 6.4], fov: 56 }, to: { pos: [5.9, 1.5, 8.6], look: [0, 2.6, 6.3], fov: 54 } },
    { start: 5.45, end: GT.renji, blend: .25, from: { pos: [5.9, 1.5, 8.6], look: [0, 2.0, 6.0], fov: 54 }, to: { pos: [5.3, 1.6, 8.3], look: [-.3, 1.6, 5.4], fov: 50 } },
    // Over Ichigo's right shoulder toward Renji: "Roar, Zabimaru."
    { start: GT.renji, end: GT.lashRelease - .1, blend: 0, from: { pos: [1.25, 1.85, 10.9], look: [-1.6, 1.45, 3.2], fov: 35 }, to: { pos: [1.05, 1.8, 10.5], look: [-1.6, 1.55, 3.2], fov: 32 } },
    // Side and high: the whip arcs across the courtyard into Ichigo's guard.
    { start: GT.lashRelease - .1, end: GT.sweepWindup, blend: 0, from: { pos: [5.4, 3.3, 5.6], look: [-1, 1.5, 5.9], fov: 54 }, to: { pos: [5.2, 3.0, 6.3], look: [-.9, 1.4, 6.1], fov: 52 }, ease: 'linear' },
    // Behind Renji: the low sweep toward Ichigo's legs.
    { start: GT.sweepWindup, end: GT.retract, blend: 0, from: { pos: [-3.3, 2.1, .5], look: [SWEEP_TARGET[0], 1.0, SWEEP_TARGET[2]], fov: 48 }, to: { pos: [-2.9, 2.0, .9], look: [SWEEP_TARGET[0], .9, SWEEP_TARGET[2]], fov: 46 } },
    // Two-shot as Zabimaru comes back to rest on Renji's shoulder.
    { start: GT.retract, end: GT.reveal, blend: .6, from: { pos: [2.7, 1.75, 10.1], look: [-.9, 1.35, 3.3], fov: 42 }, to: { pos: [2.3, 1.7, 9.7], look: [-.9, 1.35, 3.3], fov: 40 } },
    // Reveal: calm framing with the fighters left of the About Me panel.
    { start: GT.reveal, end: GT.reveal + 4, blend: .9, from: { pos: [4.4, 2.3, 11.6], look: [1.3, 1.2, 4.8], fov: 46 }, to: { pos: [4.9, 2.6, 12.0], look: [1.8, 1.15, 4.7], fov: 46 } },
    { start: GT.reveal + 4, end: F, blend: 0, from: { pos: [4.9, 2.6, 12.0], look: [1.8, 1.15, 4.7], fov: 46 }, to: { pos: [4.9, 2.6, 12.0], look: [1.8, 1.15, 4.7], fov: 46 } },
    // Finish: past Rukia and Renji toward Ichigo's wind-up.
    { start: F, end: GT.finishSwing + .08, blend: 0, from: { pos: [2.9, 2.7, -1.6], look: [-.1, 1.25, 8.8], fov: 36 }, to: { pos: [2.6, 2.55, -1.1], look: [-.1, 1.3, 8.8], fov: 34 } },
    // Side: the Getsuga crosses the courtyard and bowls both lieutenants over.
    { start: GT.finishSwing + .08, end: F + 2.3, blend: 0, from: { pos: [6.3, 1.8, 6.3], look: [-.4, 1.2, 6.2], fov: 54 }, to: { pos: [6.5, 1.9, 5.3], look: [-.6, 1.1, 4.6], fov: 52 }, ease: 'linear' },
    // Aftermath over Ichigo's shoulder; control returns after this.
    { start: F + 2.3, end: F + 4, blend: .3, from: { pos: [1.5, 1.9, 11.6], look: [-.6, 1.0, 3.4], fov: 42 }, to: { pos: [1.7, 2.25, 12.0], look: [-.6, 1.0, 3.6], fov: 44 } },
  ],
  shakes: [[GT.pillar, .12, 6], [GT.shatter, .07, 6], [GT.howl, .03, 6], [GT.lashHit, .09, 7], [GT.sweepHit, .08, 7], [GT.finishRelease, .05, 6], [GT.finishHit, .16, 5]],
  settle: [GT.reveal + 3.5, GT.reveal + 5],
  reveal: { start: GT.reveal, end: F - 1, lift: 1.3, shiftX: -1.4, shiftZ: -.4 },
  // The courtyard is walled in: on narrow screens widen the lens further and never back the
  // camera through the back wall (z -3), the gate towers (z 12.5), or the side buildings.
  maxFov: 78, maxDolly: 1.35,
  bounds: { min: [-6.4, .7, -2.3], max: [6.9, 6.5, 12.2] },
}

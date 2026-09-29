// Beat times for the Kuchiki garden encounter (Soi Fon, with Yoruichi watching).
// Same pattern as the other fights: one clock, pure functions of time, and the finishing move
// on its own time base after the Skills reveal.
import type { EncounterPhase } from '../encounter-state'
import type { V3 } from '../finale/figure-kit'
import { window4 } from '../finale/timeline'

/** Top of the stone sparring court. */
export const GARDEN_GROUND = .22
const G = GARDEN_GROUND
export const ICHIGO_GARDEN_MARK: V3 = [-22, G, -29.2]
/** The first clash slides Ichigo back to here; he finishes the fight on this mark. */
export const ICHIGO_GARDEN_END: V3 = [-22, G, -28.6]
export const SOI_MARK: V3 = [-22, G, -34.8]
/** Yoruichi sits on the front edge of the veranda deck, left of the stairs. */
export const YORUICHI_SEAT: V3 = [-26.3, .61, -37.12]
/** Open garden between the stream and the veranda, clear of the trees and walls. */
export const GARDEN_BOUNDS = { min: [-33.5, .45, -36.7] as V3, max: [-10.5, 6.5, -19.5] as V3 }
export const GARDEN_FINISH = 100
const F = GARDEN_FINISH

export const GD = {
  // Soi Fon releases Suzumebachi and marks Ichigo with a flash-step sting.
  reach: .6, draw: 1.0, call: 1.5, shikai: 2.0, stinger: 2.35, flash: 2.75, afterA: 2.85, afterB: 3.0, afterC: 3.15, sting: 3.36, spin: 3.55, back: 3.95,
  // Shunkō, then three flash-step attacks.
  shunko: 4.9, gather: 5.0, burst: 5.6, dash1: 6.55, clash1: 6.62, dash2: 7.42, clash2: 7.58, dash3: 8.28, clash3: 8.48, standoff: 9.3,
  reveal: 10.6,
  // Ichigo's finishing move, and Yoruichi's catch.
  crouch: F + .25, windup: F + .3, dash: F + .7, lunge: F + .82, finishSwing: F + .85, release: F + .95, hit: F + 1.23,
  fling: F + 1.55, leap: F + 1.62, appear: F + 1.98, catch: F + 2.1, touchdown: F + 2.6, rise: F + 3.1, lookUp: F + 3.3, end: F + 5.2,
} as const

export function gardenPhaseStart(phase: EncounterPhase) {
  return phase === 'shunko' ? GD.shunko : phase === 'reveal' ? GD.reveal : phase === 'finish' ? F : phase === 'catch' ? GD.appear : 0
}
export function gardenPhaseEnd(phase: EncounterPhase) {
  return phase === 'intro' ? GD.shunko : phase === 'shunko' ? GD.reveal : phase === 'finish' ? GD.appear : phase === 'catch' ? GD.end : Infinity
}
export function gardenNextPhase(phase: EncounterPhase): EncounterPhase {
  return phase === 'intro' ? 'shunko' : phase === 'shunko' ? 'reveal' : phase === 'finish' ? 'catch' : 'complete'
}

/** Clock rate: the catch plays in slow motion. Everything else runs in real time. */
export const gardenRate = (t: number) => 1 - .72 * window4(t, GD.fling + .3, GD.appear + .02, GD.catch + .2, GD.touchdown - .05)

/** Where the finishing Getsuga meets Soi Fon's guard. */
export const GARDEN_HIT_Z = -32.45
/** The finishing Getsuga flies from Ichigo toward Soi Fon (toward -Z). */
export const gardenWaveZ = (t: number) => {
  const start = ICHIGO_GARDEN_END[2] - 1.05, stop = GARDEN_HIT_Z
  const x = Math.min(1, Math.max(0, (t - GD.release) / (GD.hit - GD.release)))
  return start + (stop - start) * (x * .8 + x * x * .2)
}

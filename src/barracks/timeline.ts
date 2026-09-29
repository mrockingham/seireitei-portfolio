// Beat times for the Division barracks encounter (Tōshirō Hitsugaya and Hyōrinmaru).
// Same pattern as the gate: one clock, pure functions of time, and the finishing move on its
// own time base after the Experience reveal.
import type { EncounterPhase } from '../encounter-state'
import type { V3 } from '../finale/figure-kit'

export const HALL_FLOOR = .61
export const ICHIGO_HALL_MARK: V3 = [28, HALL_FLOOR, -7]
/** Where the dragon's strike drives Ichigo back to; he stays here, legs frozen, until the finish. */
export const ICHIGO_HALL_END: V3 = [28, HALL_FLOOR, -6.45]
export const TOSHIRO_START: V3 = [33, HALL_FLOOR, -9]
export const TOSHIRO_MARK: V3 = [28, HALL_FLOOR, -13.2]
/** The hall interior (walls and timber ceiling) for keeping cameras and the dragon inside. */
export const HALL_BOUNDS = { min: [20.4, .9, -19.6] as V3, max: [35.6, 5.8, -.8] as V3 }
export const BARRACKS_FINISH = 100
const F = BARRACKS_FINISH

export const BT = {
  // Tōshirō steps out and releases Hyōrinmaru.
  stepOut: .35, stepIn: 1.75, draw: 1.95, drawn: 2.35, call: 2.6, swing: 3.0, dragonOut: 3.08, roar: 4.75, settle: 5.5,
  // The ice dragon strikes.
  dragon: 6.0, rear: 6.2, dive: 6.75, impact: 7.28, circle: 8.05, coil: 9.2,
  reveal: 10.6,
  // Ichigo's finishing move.
  breakFree: F + .3, windup: F + .7, finishSwing: F + 1.3, release: F + 1.42, intercept: F + 1.72, hit: F + 1.98, end: F + 4.4,
} as const

export function barracksPhaseStart(phase: EncounterPhase) {
  return phase === 'dragon' ? BT.dragon : phase === 'reveal' ? BT.reveal : phase === 'finish' ? F : 0
}
export function barracksPhaseEnd(phase: EncounterPhase) {
  return phase === 'intro' ? BT.dragon : phase === 'dragon' ? BT.reveal : phase === 'finish' ? BT.end : Infinity
}
export function barracksNextPhase(phase: EncounterPhase): EncounterPhase {
  return phase === 'intro' ? 'dragon' : phase === 'dragon' ? 'reveal' : 'complete'
}

/** The finishing Getsuga flies from Ichigo toward Tōshirō (toward -Z). */
export const hallWaveZ = (t: number) => {
  const start = ICHIGO_HALL_END[2] - 1.05, stop = TOSHIRO_MARK[2] + .55
  const x = Math.min(1, Math.max(0, (t - BT.release) / (BT.hit - BT.release)))
  return start + (stop - start) * (x * .8 + x * x * .2)
}

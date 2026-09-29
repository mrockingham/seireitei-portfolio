// Beat times for the Spirit Gate encounter (Rukia and Renji). Like the finale, every pose,
// effect, and camera move is a pure function of one clock. The About Me reveal sits between
// Renji's attack and Ichigo's finishing move, so the finish runs on its own time base.
import type { EncounterPhase } from '../encounter-state'
import type { V3 } from '../finale/figure-kit'

export const GATE_GROUND = .22
export const ICHIGO_GATE_MARK: V3 = [0, GATE_GROUND, 7]
/** Ichigo flash-steps back out of Tsukishiro and fights from here; the player resumes here. */
export const ICHIGO_GATE_END: V3 = [0, GATE_GROUND, 8.8]
export const RUKIA_MARK: V3 = [.45, GATE_GROUND, 2.6]
export const RENJI_MARK: V3 = [-1.9, GATE_GROUND, 2.8]
/** The finish plays at GATE_FINISH + x so it never overlaps the open-ended reveal. */
export const GATE_FINISH = 100

export const GT = {
  // Rukia: "Dance, Sode no Shirayuki. Some no mai, Tsukishiro."
  rukiaStep: .7, danceStart: 1.35, danceEnd: 2.8, point: 2.95, circleStart: 3.05, circleEnd: 3.6,
  notice: 3.55, dodge: 3.72, pillar: 3.86, shatter: 5.45,
  // Renji: "Roar, Zabimaru."
  renji: 6.5, howl: 6.95, lashWindup: 7.3, lashRelease: 7.62, lashHit: 8.05, flourish: 8.25,
  sweepWindup: 8.85, sweepRelease: 9.05, sweepHit: 9.42, retract: 9.7, shoulder: 10.5,
  reveal: 11.5,
  // Ichigo's finishing move (after the reveal)
  finishWindup: GATE_FINISH + .05, finishSwing: GATE_FINISH + .82, finishRelease: GATE_FINISH + .95,
  finishHit: GATE_FINISH + 1.55, finishEnd: GATE_FINISH + 3.7,
} as const

/** Start of each phase on the gate clock. */
export function gatePhaseStart(phase: EncounterPhase) {
  return phase === 'renji' ? GT.renji : phase === 'reveal' ? GT.reveal : phase === 'finish' ? GATE_FINISH : 0
}
/** When a timed phase hands over to the next one (the reveal waits for the visitor). */
export function gatePhaseEnd(phase: EncounterPhase) {
  return phase === 'intro' ? GT.renji : phase === 'renji' ? GT.reveal : phase === 'finish' ? GT.finishEnd : Infinity
}
export function gateNextPhase(phase: EncounterPhase): EncounterPhase {
  return phase === 'intro' ? 'renji' : phase === 'renji' ? 'reveal' : 'complete'
}

/** The finishing Getsuga flies from Ichigo toward Rukia and Renji (toward -Z). */
export const gateWaveZ = (t: number) => {
  const start = ICHIGO_GATE_END[2] - 1.05, stop = RUKIA_MARK[2] + 1.05
  const x = Math.min(1, Math.max(0, (t - GT.finishRelease) / (GT.finishHit - GT.finishRelease)))
  return start + (stop - start) * (x * .8 + x * x * .2)
}

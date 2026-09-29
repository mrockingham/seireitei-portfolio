// Single source of truth for the Sōkyoku Hill finale.
// Every visual in the finale is a pure function of one clock (seconds since the
// cinematic began), so skipping, replaying, and frame rate never desynchronize it.
import type { EncounterPhase } from '../encounter-state'

export type V3 = [number, number, number]

export const GROUND_Y = 22.04
export const ICHIGO_MARK: V3 = [-14, GROUND_Y, -83]
export const BYAKUYA_MARK: V3 = [-14, GROUND_Y, -91]
export const ARENA_CENTER: V3 = [-14, GROUND_Y, -87]

/** Beat times in seconds. Phase starts are the boundaries the UI captions follow. */
export const T = {
  // 1. Senbonzakura
  byakuyaRaise: .8, scatter: 1.75, swirlFormed: 3.1,
  // 2. First Getsuga Tenshō
  firstStrike: 4.2, firstWindup: 4.35, firstSwing: 5.22, firstRelease: 5.36,
  // 3. Petal shield
  petalBlock: 5.5, shieldGather: 5.42, firstImpact: 6.3, shieldRelease: 7.7,
  // 4. Senbonzakura Kageyoshi
  swordBankai: 9.0, reform: 9.05, swordDrop: 10.05, bladesRise: 10.5, gleam: 12.1, dissolve: 13.0,
  // 5. Tensa Zangetsu
  cocoon: 14.6, ichigoBankai: 15.0, bankaiBurst: 15.95, wipeStart: 16.05, wipeEnd: 16.95,
  // 6. Final Getsuga Tenshō
  finalStrike: 19.2, torrent: 19.35, finalWindup: 19.45, finalSwing: 20.12, finalRelease: 20.28, finalImpact: 21.2,
  // 7. Settle and reveal
  reveal: 23.6,
} as const

export const finalePhases: { phase: EncounterPhase; start: number }[] = [
  { phase: 'intro', start: 0 },
  { phase: 'first-strike', start: T.firstStrike },
  { phase: 'petal-block', start: T.petalBlock },
  { phase: 'sword-bankai', start: T.swordBankai },
  { phase: 'ichigo-bankai', start: T.ichigoBankai },
  { phase: 'final-strike', start: T.finalStrike },
  { phase: 'reveal', start: T.reveal },
]

export function finalePhaseStart(phase: EncounterPhase) {
  return finalePhases.find(p => p.phase === phase)?.start ?? 0
}
/** End of a cinematic beat, or Infinity for the open-ended reveal. */
export function finalePhaseEnd(phase: EncounterPhase) {
  const i = finalePhases.findIndex(p => p.phase === phase)
  return i >= 0 && i < finalePhases.length - 1 ? finalePhases[i + 1].start : Infinity
}
export function finaleNextPhase(phase: EncounterPhase): EncounterPhase {
  const i = finalePhases.findIndex(p => p.phase === phase)
  return i >= 0 && i < finalePhases.length - 1 ? finalePhases[i + 1].phase : 'complete'
}

/** Shared mutable clock: owned by App, advanced by the finale director inside the Canvas. */
export type FinaleClock = { time: number; completeAt: number; paused: boolean; seek?: number }
export const createFinaleClock = (): FinaleClock => ({ time: 0, completeAt: -1, paused: false })

/** Environment tint the cinematic directors write and Environment reads each frame. */
export type FinaleMood = { pink: number; dusk: number; gold: number; cold: number }
export const createFinaleMood = (): FinaleMood => ({ pink: 0, dusk: 0, gold: 0, cold: 0 })

export const clamp01 = (x: number) => x < 0 ? 0 : x > 1 ? 1 : x
/** 0 → 1 over [a, b] with smoothstep easing. */
export const ramp = (t: number, a: number, b: number) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x) }
/** Linear 0 → 1 over [a, b]. */
export const lin = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
/** Rises over [a, b], holds, falls over [c, d]. */
export const window4 = (t: number, a: number, b: number, c: number, d: number) => ramp(t, a, b) * (1 - ramp(t, c, d))
export const easeOutCubic = (x: number) => 1 - (1 - clamp01(x)) ** 3
export const easeInCubic = (x: number) => clamp01(x) ** 3
export const easeOutBack = (x: number) => { const c = 1.9, y = clamp01(x) - 1; return 1 + (c + 1) * y * y * y + c * y * y }
/** Exponentially decaying impulse that starts at time a. */
export const impulse = (t: number, a: number, decay = 6) => t < a ? 0 : Math.exp(-(t - a) * decay)
/** Deterministic hash in [0, 1). */
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
/** Smooth 1D value noise in [-1, 1], used for handheld camera motion and flutter. */
export function noise1(x: number) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f)
  return (hash(i) * (1 - u) + hash(i + 1) * u) * 2 - 1
}

/** Getsuga travel along the arena axis (Ichigo at +z, Byakuya at -z); returns the wave's world z. */
export const firstWaveZ = (t: number) => {
  const start = ICHIGO_MARK[2] - .95, stop = BYAKUYA_MARK[2] + 2.25
  const x = lin(t, T.firstRelease, T.firstImpact)
  return start + (stop - start) * (x * .8 + x * x * .2)
}
export const finalWaveZ = (t: number) => {
  const start = ICHIGO_MARK[2] - 1.1, stop = BYAKUYA_MARK[2] + .35
  const x = lin(t, T.finalRelease, T.finalImpact)
  return start + (stop - start) * (x * .75 + x * x * .25)
}

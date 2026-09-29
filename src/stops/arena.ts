// Captains' training arena: Sajin Komamura and Kaname Tōsen spar on a 26-second loop in a walled
// sand arena in the open north-west corner, west of Sōkyoku Hill. They clash, Komamura strikes with
// Tenken's phantom arm, Tōsen seals them both inside Enma Kōrogi's black dome, and Komamura's
// Bankai, Kokujō Tengen Myō'ō, grows inside it and bursts out. Everything is a pure function of time.
import { bakeTrack } from '../finale/rig'
import type { Key, Pose } from '../finale/rig'
import type { V3 } from '../finale/figure-kit'
import { bakePath, createPathSample, samplePath } from '../finale/paths'
import type { Burst, FlashEvent, RingEvent } from '../finale/effects'
import type { StreakEvent } from '../garden/effects'

export const ARENA_CENTER: V3 = [-50, 0, -88]
export const ARENA_GROUND = .03
/** Half extents of the sand floor inside the walls (x, z). */
export const ARENA_HALF: [number, number] = [8.5, 13]
export const ARENA_LOOP = 26
const G = ARENA_GROUND
const [AX, , AZ] = ARENA_CENTER
/** A point in the arena, relative to its centre. */
export const ar = (dx: number, dz: number, dy = 0): V3 => [AX + dx, G + dy, AZ + dz]

export const AB = {
  dash: 1.2, clash1: 1.55, clash2: 2.2, clash3: 2.9, part: 3.3,
  tenkenRaise: 3.7, tenkenSwing: 3.95, tenken: 4.3, tenkenEnd: 5.0,
  draw: 5.5, spin: 5.8, rings: 6.15, ringsOut: 6.9, ringsRise: 7.3, ringsTop: 8.4, dome: 8.0, domeFull: 9.1,
  bankai: 12.2, giant: 12.6, burst: 13.5, burstEnd: 14.3, giantFull: 14.6, roar: 15.0,
  raise: 16.6, slash: 17.6, slashEnd: 18.5, fade: 20.4, fadeEnd: 21.8, walk: 22.2, home: 25.2,
} as const

/** Starting marks, facing each other across the arena (Komamura west, Tōsen east). */
export const KOMAMURA_MARK = ar(-2.5, 2)
export const TOSEN_MARK = ar(2.5, 2)
/** Enma Kōrogi: the black dome's centre and radius. */
export const DOME_CENTER = ar(0, 2, 1.2)
export const DOME_RADIUS = 6.5
/** Kokujō Tengen Myō'ō stands behind Komamura, facing where Tōsen lands after the burst. */
const TOSEN_THROWN = ar(5.4, 3.4)
export const GIANT_AT = ar(-3.4, -3.2)
export const GIANT_YAW = Math.atan2(TOSEN_THROWN[0] - GIANT_AT[0], TOSEN_THROWN[2] - GIANT_AT[2]) + .12
/** World-space scale of the giant (the shared body is about 1.85 m tall at scale 1). */
export const GIANT_SCALE = 7.2
/** Tenken: the phantom arm's shoulder in the air behind Komamura, and where its blade lands. */
export const TENKEN_PIVOT = ar(-4.4, 2, 6.9)
export const TENKEN_TARGET = ar(2.3, 2)
/** Where the giant's blade strikes the ground. */
export const SLASH_POINT = TOSEN_THROWN

const face = (a: V3, b: V3) => Math.atan2(b[0] - a[0], b[2] - a[2])
const KY = Math.PI / 2, TY = -Math.PI / 2
const TOSEN_DODGE = ar(3.8, 5.4), TOSEN_SAFE = ar(4.6, 8.6)

export const komamuraPath = bakePath([
  { t: 0, p: KOMAMURA_MARK, yaw: KY },
  { t: AB.dash, p: KOMAMURA_MARK },
  { t: AB.clash1, p: ar(-.8, 2), ease: 'out' },
  { t: 1.9, p: ar(-1.15, 2) },
  { t: AB.clash2, p: ar(-.75, 2.1), ease: 'out' },
  { t: 2.6, p: ar(-1.05, 2) },
  { t: AB.clash3, p: ar(-.85, 2), ease: 'out' },
  { t: AB.part, p: ar(-2.7, 2), arc: .35, ease: 'out' },
  { t: AB.slash - .2, p: ar(-2.7, 2), yaw: KY },
  { t: AB.slash, p: ar(-2.4, 2.3), yaw: face(ar(-2.7, 2), TOSEN_THROWN), ease: 'out' },
  { t: AB.walk, p: ar(-2.4, 2.3) },
  { t: AB.home, p: KOMAMURA_MARK, yaw: KY },
  { t: ARENA_LOOP, p: KOMAMURA_MARK, yaw: KY },
])

export const tosenPath = bakePath([
  { t: 0, p: TOSEN_MARK, yaw: TY },
  { t: AB.dash + .05, p: TOSEN_MARK },
  { t: AB.clash1, p: ar(.8, 2), ease: 'out' },
  { t: 1.9, p: ar(1.15, 2) },
  { t: AB.clash2, p: ar(.75, 1.9), ease: 'out' },
  { t: 2.6, p: ar(1.05, 2) },
  { t: AB.clash3, p: ar(.85, 2), ease: 'out' },
  { t: AB.part, p: ar(2.5, 2), arc: .35, ease: 'out' },
  // Tenken's blade comes down where he stood: he flash-steps aside.
  { t: AB.tenken - .2, p: ar(2.5, 2) },
  { t: AB.tenken - .18, p: ar(2.5, 2), hide: true },
  { t: AB.tenken - .04, p: TOSEN_DODGE, yaw: face(TOSEN_DODGE, ar(-2.7, 2)) },
  { t: AB.draw - .2, p: ar(2.9, 2.8), yaw: face(ar(2.9, 2.8), ar(-2.7, 2)) },
  // Thrown back when the dome bursts.
  { t: AB.burst, p: ar(2.9, 2.8) },
  { t: AB.burstEnd, p: TOSEN_THROWN, arc: .8, ease: 'out', yaw: face(TOSEN_THROWN, GIANT_AT) },
  // The giant's blade comes down on him: another flash step.
  { t: AB.slash - .12, p: TOSEN_THROWN },
  { t: AB.slash - .1, p: TOSEN_THROWN, hide: true },
  { t: AB.slash + .12, p: TOSEN_SAFE, yaw: face(TOSEN_SAFE, ar(-2.4, 2.3)) },
  { t: AB.walk, p: TOSEN_SAFE },
  { t: AB.home, p: TOSEN_MARK, yaw: TY },
  { t: ARENA_LOOP, p: TOSEN_MARK, yaw: TY },
])

const legsReady: Pose = { thighL: [-.14, 0, .1], kneeL: [.26, 0, 0], ankleL: [-.12, 0, 0], thighR: [.14, 0, -.1], kneeR: [.22, 0, 0], ankleR: [-.1, 0, 0], drop: .035 }
const legsWide: Pose = { thighL: [-.32, 0, .2], kneeL: [.46, 0, 0], ankleL: [-.14, 0, 0], thighR: [.22, 0, -.2], kneeR: [.42, 0, 0], ankleR: [-.2, 0, 0], drop: .09 }
const legsLunge: Pose = { thighL: [-1.05, 0, .1], kneeL: [1.02, 0, 0], ankleL: [.05, 0, 0], thighR: [.55, 0, -.1], kneeR: [.36, 0, 0], ankleR: [.22, 0, 0], drop: .2 }
const legsPlant: Pose = { thighL: [-.55, 0, .22], kneeL: [.75, 0, 0], ankleL: [-.12, 0, 0], thighR: [.35, 0, -.22], kneeR: [.5, 0, 0], ankleR: [-.1, 0, 0], drop: .16 }
const tuck: Pose = { thighL: [-1.6, 0, .15], kneeL: [1.8, 0, 0], thighR: [-1.2, 0, -.15], kneeR: [1.7, 0, 0], drop: .1 }
const crouch: Pose = { thighL: [-1.25, 0, .3], kneeL: [1.9, 0, 0], ankleL: [-.5, 0, 0], thighR: [-.2, 0, -.3], kneeR: [1.5, 0, 0], ankleR: [-.3, 0, 0], drop: .42 }

// --- Komamura (also drives Kokujō Tengen Myō'ō, which mirrors him) --------------------------------
const KO_READY: Pose = { ...legsWide, spine: [.08, .25, 0], neck: [0, -.25, 0], shoulderR: [-.95, 0, .2], elbowR: [-.55, 0, 0], wristR: [1.0, 0, 0], shoulderL: [-.85, 0, -.35], elbowL: [-.7, 0, 0], wristL: [.6, 0, 0] }
const KO_CUT: Pose = { ...legsLunge, spine: [.3, .35, 0], neck: [-.15, -.3, 0], shoulderR: [-1.25, 0, -.35], elbowR: [-.05, 0, 0], wristR: [1.35, 0, 0], shoulderL: [-1.1, 0, -.4], elbowL: [-.25, 0, 0], wristL: [.6, 0, 0] }
const KO_GUARD: Pose = { ...legsWide, drop: .14, spine: [.12, .15, 0], shoulderR: [-1.5, 0, .55], elbowR: [-1.15, 0, 0], wristR: [.2, 1.3, 0], shoulderL: [-1.4, 0, -.4], elbowL: [-1.1, 0, 0] }
const KO_OVERHEAD: Pose = { ...legsPlant, spine: [-.12, .2, 0], neck: [-.1, -.2, 0], shoulderR: [-2.75, 0, .15], elbowR: [-.55, 0, 0], wristR: [.5, 0, 0], shoulderL: [-2.6, 0, -.25], elbowL: [-.7, 0, 0], wristL: [.4, 0, 0] }
const KO_SLASH: Pose = { ...legsLunge, drop: .26, spine: [.45, .25, 0], neck: [-.25, -.2, 0], shoulderR: [-1.0, 0, -.25], elbowR: [-.05, 0, 0], wristR: [1.55, 0, 0], shoulderL: [-.95, 0, -.3], elbowL: [-.2, 0, 0], wristL: [1.0, 0, 0] }
const KO_ROAR: Pose = { ...legsPlant, spine: [-.2, 0, 0], neck: [-.55, 0, 0], head: [-.2, 0, 0], shoulderR: [-.9, 0, .7], elbowR: [-.6, 0, 0], wristR: [1.0, 0, 0], shoulderL: [-.4, 0, -.8], elbowL: [-.9, 0, 0] }
const KO_REST: Pose = { ...legsReady, spine: [.02, 0, 0], shoulderR: [-.35, 0, .12], elbowR: [-.3, 0, 0], wristR: [1.3, 0, 0], shoulderL: [.05, 0, -.1], elbowL: [-.2, 0, 0] }
const komamuraKeys: Key[] = [
  { t: 0, pose: KO_READY }, { t: AB.dash, pose: KO_READY },
  { t: AB.clash1, pose: KO_CUT, ease: 'snap' }, { t: 1.9, pose: KO_READY }, { t: AB.clash2, pose: KO_GUARD, ease: 'snap' }, { t: 2.6, pose: KO_READY },
  { t: AB.clash3, pose: KO_CUT, ease: 'snap' }, { t: AB.part, pose: { ...KO_READY, ...tuck }, ease: 'out' }, { t: 3.5, pose: KO_READY },
  { t: AB.tenkenRaise, pose: KO_OVERHEAD }, { t: AB.tenkenSwing, pose: KO_OVERHEAD }, { t: AB.tenken, pose: KO_SLASH, ease: 'snap' }, { t: AB.tenkenEnd, pose: KO_SLASH },
  { t: 5.6, pose: KO_READY }, { t: AB.bankai, pose: KO_READY }, { t: AB.bankai + .4, pose: KO_OVERHEAD },
  { t: AB.burst, pose: KO_OVERHEAD }, { t: AB.giantFull, pose: KO_READY }, { t: AB.roar, pose: KO_ROAR, ease: 'out' }, { t: 16.0, pose: KO_ROAR },
  { t: AB.raise, pose: KO_OVERHEAD }, { t: AB.slash - .15, pose: KO_OVERHEAD }, { t: AB.slash, pose: KO_SLASH, ease: 'snap' }, { t: AB.fade - .6, pose: KO_SLASH },
  { t: AB.fade + .4, pose: KO_READY }, { t: AB.walk, pose: KO_REST }, { t: AB.home, pose: KO_REST }, { t: ARENA_LOOP, pose: KO_READY },
]
export const komamuraTrack = bakeTrack(komamuraKeys)
/** A longer reach than Komamura's cut, so the giant's blade lands where Tōsen stood. */
const GI_SLASH: Pose = { ...KO_SLASH, spine: [.5, .1, 0], neck: [-.3, 0, 0], shoulderR: [-1.3, 0, -.1], elbowR: [-.05, 0, 0], wristR: [.55, 0, 0], shoulderL: [-1.2, 0, -.25], elbowL: [-.2, 0, 0], wristL: [.5, 0, 0] }
/** The giant only exists from the bankai on; it mirrors Komamura's track (the director runs it a beat behind). */
export const giantTrack = bakeTrack(komamuraKeys.map(k => k.pose === KO_SLASH && k.t >= AB.slash ? { ...k, pose: GI_SLASH } : k))

// --- Tōsen ------------------------------------------------------------------------------------------
const TO_READY: Pose = { ...legsReady, drop: .06, spine: [.05, .15, 0], neck: [0, -.15, 0], shoulderR: [-.85, 0, .15], elbowR: [-.6, 0, 0], wristR: [1.0, 0, 0], shoulderL: [-.1, 0, .25], elbowL: [-.9, 0, 0] }
const TO_CUT: Pose = { ...legsLunge, spine: [.25, .4, 0], neck: [-.1, -.35, 0], shoulderR: [-1.1, 0, -.55], elbowR: [-.1, 0, 0], wristR: [1.3, 0, 0], shoulderL: [.35, 0, .55], elbowL: [-.4, 0, 0] }
const TO_PARRY: Pose = { ...legsWide, spine: [.05, .25, 0], shoulderR: [-1.35, 0, .5], elbowR: [-1.0, 0, 0], wristR: [.6, 1.0, 0], shoulderL: [.2, 0, .5], elbowL: [-.6, 0, 0] }
const TO_RAISE: Pose = { ...legsReady, spine: [-.08, 0, 0], neck: [-.25, 0, 0], shoulderR: [-3.0, 0, -.1], elbowR: [-.1, 0, 0], wristR: [.1, 0, 0], shoulderL: [.1, 0, .35], elbowL: [-.3, 0, 0] }
const TO_SPREAD: Pose = { ...legsWide, spine: [0, 0, 0], neck: [-.1, 0, 0], shoulderR: [-1.55, 0, -1.2], elbowR: [-.1, 0, 0], wristR: [.4, 0, 0], shoulderL: [-1.55, 0, 1.2], elbowL: [-.1, 0, 0] }
const TO_LAND: Pose = { ...crouch, spine: [.35, .2, 0], shoulderR: [-.7, 0, -.6], elbowR: [-.3, 0, 0], wristR: [1.2, 0, 0], shoulderL: [-.2, 0, .9], elbowL: [-.2, 0, 0] }
const TO_REST: Pose = { ...legsReady, spine: [.02, 0, 0], shoulderR: [-.3, 0, .1], elbowR: [-.35, 0, 0], wristR: [1.2, 0, 0], shoulderL: [.05, 0, .1], elbowL: [-.2, 0, 0] }
export const tosenTrack = bakeTrack([
  { t: 0, pose: TO_READY }, { t: AB.dash, pose: TO_READY },
  { t: AB.clash1, pose: TO_PARRY, ease: 'snap' }, { t: 1.9, pose: TO_READY }, { t: AB.clash2, pose: TO_CUT, ease: 'snap' }, { t: 2.6, pose: TO_READY },
  { t: AB.clash3, pose: TO_PARRY, ease: 'snap' }, { t: AB.part, pose: { ...TO_READY, ...tuck }, ease: 'out' }, { t: 3.6, pose: TO_READY },
  { t: AB.tenken, pose: TO_LAND, ease: 'snap' }, { t: 4.8, pose: TO_LAND }, { t: 5.2, pose: TO_READY },
  { t: AB.draw, pose: TO_RAISE }, { t: AB.ringsOut, pose: TO_RAISE }, { t: AB.ringsRise, pose: TO_SPREAD }, { t: AB.burst, pose: TO_SPREAD },
  { t: AB.burst + .3, pose: { ...TO_READY, ...tuck }, ease: 'out' }, { t: AB.burstEnd, pose: TO_LAND, ease: 'snap' }, { t: 15.0, pose: TO_LAND }, { t: 15.5, pose: TO_READY },
  { t: AB.slash + .12, pose: TO_LAND, ease: 'snap' }, { t: 19.0, pose: TO_LAND }, { t: 19.6, pose: TO_READY },
  { t: AB.walk, pose: TO_REST }, { t: AB.home, pose: TO_REST }, { t: ARENA_LOOP, pose: TO_READY },
])

// --- Event lists (loop time) ------------------------------------------------------------------------
const sparks = ['#fff4d0', '#ffd58a', '#ffffff', '#ffb45c']
const dirt = ['#d8c8a2', '#c9b68d', '#e3d6b6']
const shards = ['#0b0a10', '#17131f', '#241c33', '#35294a']
const mist = ['#2a1f3d', '#3b2d57', '#1c1628']
const meet = (t: number, dy = 1.35): V3 => {
  const a = samplePath(komamuraPath, t, createPathSample()).pos, b = samplePath(tosenPath, t, createPathSample()).pos
  return [(a.x + b.x) / 2, G + dy, (a.z + b.z) / 2]
}
export const ARENA_CLASHES: { t: number; p: V3; big?: boolean }[] = [
  { t: AB.clash1, p: meet(AB.clash1) }, { t: AB.clash2, p: meet(AB.clash2, 1.7) }, { t: AB.clash3, p: meet(AB.clash3, 1.2), big: true },
]
export function arenaSparks(): Burst[] {
  const out: Burst[] = ARENA_CLASHES.map(c => ({ t: c.t, spread: .03, count: c.big ? 150 : 70, origin: c.p, box: [.06, .08, .06] as V3, radial: true, speed: (c.big ? [2.5, 7.5] : [1.5, 5]) as [number, number], vel: [0, .8, 0] as V3, gravity: 6, drag: 1.2, life: [.25, .7] as [number, number], size: [.035, .075] as [number, number], colors: sparks }))
  out.push({ t: AB.tenken, count: 120, origin: [TENKEN_TARGET[0], G + .2, TENKEN_TARGET[2]], box: [.3, .1, .3], radial: true, speed: [3, 9], vel: [0, 2.5, 0], gravity: 7, drag: 1, life: [.3, .8], size: [.04, .09], colors: sparks })
  out.push({ t: AB.slash, count: 220, origin: [SLASH_POINT[0], G + .3, SLASH_POINT[2]], box: [.6, .1, .6], radial: true, speed: [4, 12], vel: [0, 3, 0], gravity: 7, drag: .9, life: [.35, 1.0], size: [.05, .12], colors: sparks })
  return out
}
export function arenaDust(): Burst[] {
  const out: Burst[] = []
  for (const [t, which] of [[AB.clash1 - .05, 'k'], [AB.clash3, 't'], [AB.part, 'k'], [AB.part, 't'], [AB.burstEnd, 't']] as [number, string][]) {
    const p = samplePath(which === 'k' ? komamuraPath : tosenPath, t, createPathSample()).pos
    out.push({ t, count: 12, origin: [p.x, G + .06, p.z], box: [.2, .02, .15], radial: true, flat: true, up: .2, speed: [.6, 1.8], drag: 2.2, life: [.6, 1.1], size: [.25, .5], colors: dirt })
  }
  out.push({ t: AB.tenken, count: 50, origin: [TENKEN_TARGET[0], G + .08, TENKEN_TARGET[2]], box: [.5, .02, .5], radial: true, flat: true, up: .35, speed: [2, 5], drag: 1.8, life: [.9, 1.6], size: [.45, .9], colors: dirt })
  out.push({ t: AB.burst, count: 90, origin: [DOME_CENTER[0], G + .1, DOME_CENTER[2]], box: [DOME_RADIUS * .7, .05, DOME_RADIUS * .7], radial: true, flat: true, up: .25, speed: [3, 7], drag: 1.5, life: [1.2, 2.2], size: [.8, 1.6], colors: dirt })
  out.push({ t: AB.slash, count: 110, origin: [SLASH_POINT[0], G + .1, SLASH_POINT[2]], box: [.8, .05, .8], radial: true, flat: true, up: .45, speed: [3, 8], drag: 1.4, life: [1.2, 2.2], size: [.7, 1.5], colors: dirt })
  return out
}
/** Black shards of the dome, and the dark mist the giant leaves as it fades (normal blending). */
export function arenaShards(): Burst[] {
  const out: Burst[] = [{
    t: AB.burst, spread: .15, count: 320, origin: [DOME_CENTER[0], DOME_CENTER[1] + 2.5, DOME_CENTER[2]], box: [DOME_RADIUS * .6, 2.4, DOME_RADIUS * .6],
    radial: true, up: .35, speed: [4, 11], gravity: 5, drag: .8, life: [.8, 1.8], size: [.12, .32], colors: shards,
  }]
  for (let k = 0; k < 6; k++) {
    out.push({ t: AB.fade + k * .22, count: 40, origin: [GIANT_AT[0], G + 12.5 - k * 2.1, GIANT_AT[2]], box: [1.8, .6, 1.8], radial: true, up: .8, speed: [.3, 1.2], vel: [0, 1.2, 0], drag: .6, life: [1.2, 2.0], size: [.5, 1.1], colors: mist })
  }
  return out
}
export function arenaRings(): RingEvent[] {
  return [
    { t: AB.tenken, x: TENKEN_TARGET[0], y: G + .04, z: TENKEN_TARGET[2], radius: 3.2, duration: .8, color: '#bfeaff', alpha: .7, width: .05 },
    { t: AB.burst, x: DOME_CENTER[0], y: G + .05, z: DOME_CENTER[2], radius: 11, duration: 1.2, color: '#ffd9a8', alpha: .75, width: .04 },
    { t: AB.slash, x: SLASH_POINT[0], y: G + .05, z: SLASH_POINT[2], radius: 7, duration: 1.0, color: '#fff0c8', alpha: .8, width: .05 },
    { t: AB.clash3, x: meet(AB.clash3)[0], y: G + 1.2, z: meet(AB.clash3)[2], radius: 1.1, duration: .35, color: '#fff4d8', alpha: .85, width: .07, vertical: true },
  ]
}
export function arenaFlashes(): FlashEvent[] {
  return [
    { t: AB.tenkenRaise + .1, p: [TENKEN_PIVOT[0], TENKEN_PIVOT[1], TENKEN_PIVOT[2]], from: .3, to: 2.2, duration: .5, color: '#7fd8ff', alpha: .6 },
    { t: AB.rings, p: ar(2.9, 2.8, 2.45), from: .1, to: .9, duration: .35, color: '#e8ecff', alpha: .8 },
    { t: AB.burst, p: [DOME_CENTER[0], DOME_CENTER[1] + 3, DOME_CENTER[2]], from: 3, to: 9, duration: .7, color: '#ffe2b8', alpha: .55 },
    { t: AB.slash, p: [SLASH_POINT[0], G + .8, SLASH_POINT[2]], from: .5, to: 3.2, duration: .45, color: '#fff2cc', alpha: .7 },
  ]
}
export const arenaStreaks = (): StreakEvent[] => [
  { t: AB.tenken - .18, from: [TOSEN_MARK[0], G + .9, TOSEN_MARK[2]], to: [TOSEN_DODGE[0], G + .9, TOSEN_DODGE[2]], duration: .3, radius: .05, color: '#d8dcff', alpha: .7 },
  { t: AB.slash - .1, from: [TOSEN_THROWN[0], G + .9, TOSEN_THROWN[2]], to: [TOSEN_SAFE[0], G + .9, TOSEN_SAFE[2]], duration: .3, radius: .05, color: '#d8dcff', alpha: .7 },
]

// Who lives in the world and what they do: Soul Reapers with jobs (patrols, gate guards, chats,
// sweeping, sword drills, watching the side stops), plus where the butterflies, leaves, petals,
// and banners go. Coordinates are world meters (x east, z south; streets are near y = 0).
import { bakeTrack } from '../finale/rig'
import type { Pose } from '../finale/rig'
import type { NpcLook } from './npc'
import type { ButterflyHome } from './critters'
import type { DriftSource } from './drift'
import type { BannerSpec } from './banner'
import { RING } from '../stops/eleventh'
import { TRAINING_CENTER } from '../stops/training'
import { ARENA_CENTER } from '../stops/arena'

type V3 = [number, number, number]
export type NpcJob =
  | { kind: 'patrol'; path: [number, number][]; speed: number; offset: number; side?: number; y?: number }
  | { kind: 'guard'; at: V3; yaw: number }
  | { kind: 'chat'; at: V3; face: V3; offset: number }
  | { kind: 'sweep'; at: V3; yaw: number }
  | { kind: 'watch'; at: V3; target: V3; cheer: 'eleventh' | 'training' | 'arena' }
  | { kind: 'kata'; at: V3; yaw: number; offset: number }
export type NpcSpec = { look: NpcLook; job: NpcJob }

const skins = ['#f1d5c0', '#e8c4a6', '#dcae8c', '#caa07e', '#f3d9c6', '#e4bc9c']
const look = (hair: NpcLook['hair'], hairColor: string, skin: number, scale: number, prop?: NpcLook['prop']): NpcLook => ({ hair, hairColor, skin: skins[skin], scale, prop })

export const npcs: NpcSpec[] = [
  // Gate guards, just inside the gate.
  { look: look('short', '#1b1b22', 1, 1.0), job: { kind: 'guard', at: [-4.6, .16, 11.2], yaw: 0 } },
  { look: look('spiky', '#3a2a1e', 2, 1.03), job: { kind: 'guard', at: [4.6, .16, 11.2], yaw: 0 } },
  // A pair patrolling the street from the gate to the barracks.
  { look: look('pony', '#20202a', 0, .95), job: { kind: 'patrol', path: [[9, 5.6], [26, 5.6]], speed: 1.15, offset: 0, side: .45 } },
  { look: look('bald', '#000000', 3, 1.05), job: { kind: 'patrol', path: [[9, 5.6], [26, 5.6]], speed: 1.15, offset: 0, side: -.45 } },
  // Sweeping leaves under the tree by the barracks sign.
  { look: look('bun', '#2a1b16', 4, .94, 'broom'), job: { kind: 'sweep', at: [7.6, 0, -8.4], yaw: 2.4 } },
  // Two chatting behind the barracks.
  { look: look('short', '#4a3322', 5, 1.0), job: { kind: 'chat', at: [16.6, 0, -27.3], face: [17.9, 0, -26.5], offset: 0 } },
  { look: look('long', '#15151c', 0, .95), job: { kind: 'chat', at: [17.9, 0, -26.5], face: [16.6, 0, -27.3], offset: 3.1 } },
  // A messenger walking from the barracks' rear doors toward the Kuchiki compound and back.
  { look: look('spiky', '#1e1e26', 2, 1.0), job: { kind: 'patrol', path: [[27.5, -26], [27.5, -32.4], [1, -32.4], [-3, -30], [-3, -20.8], [-12, -19.6]], speed: 1.3, offset: 10 } },
  // Eleventh Division members watching the spar (they cheer the big clashes).
  { look: look('bald', '#000000', 3, 1.12), job: { kind: 'watch', at: [21.0, 0, -41.9], target: RING, cheer: 'eleventh' } },
  { look: look('spiky', '#26201c', 1, 1.04), job: { kind: 'watch', at: [23.4, 0, -39.4], target: RING, cheer: 'eleventh' } },
  { look: look('short', '#1a1a20', 5, .98), job: { kind: 'watch', at: [13.3, 0, -41.9], target: RING, cheer: 'eleventh' } },
  // Onlookers at the training grounds.
  { look: look('pony', '#3b2519', 0, .96), job: { kind: 'watch', at: [15.3, 0, 21.9], target: TRAINING_CENTER, cheer: 'training' } },
  { look: look('short', '#15151c', 4, 1.0), job: { kind: 'watch', at: [15.5, 0, 15.6], target: TRAINING_CENTER, cheer: 'training' } },
  // Seventh and Ninth Division members in the arena stands and by its gate.
  { look: look('spiky', '#2a2019', 2, 1.05), job: { kind: 'watch', at: [-53.2, .45, -101.85], target: ARENA_CENTER, cheer: 'arena' } },
  { look: look('short', '#16161d', 0, .98), job: { kind: 'watch', at: [-48.4, .9, -102.8], target: ARENA_CENTER, cheer: 'arena' } },
  { look: look('bun', '#2b1d18', 4, .95), job: { kind: 'watch', at: [-45.3, .45, -101.85], target: ARENA_CENTER, cheer: 'arena' } },
  { look: look('bald', '#000000', 3, 1.08), job: { kind: 'watch', at: [-56.2, 0, -73.6], target: ARENA_CENTER, cheer: 'arena' } },
  { look: look('pony', '#1e1a24', 1, .97), job: { kind: 'watch', at: [-43.4, 0, -73.8], target: ARENA_CENTER, cheer: 'arena' } },
  // Sword drills at the foot of the hill stairs.
  { look: look('short', '#18181f', 1, 1.0, 'sword'), job: { kind: 'kata', at: [-29.2, 0, -66.2], yaw: Math.PI, offset: 0 } },
  { look: look('bun', '#2b1d18', 0, .96, 'sword'), job: { kind: 'kata', at: [-27.2, 0, -66.4], yaw: Math.PI, offset: .05 } },
  // A patrol down the narrow lane east of the barracks.
  { look: look('short', '#2a2a32', 2, 1.02), job: { kind: 'patrol', path: [[41.0, 8], [41.0, -40]], speed: 1.2, offset: 20 } },
]

const legsReady: Pose = { thighL: [-.14, 0, .1], kneeL: [.26, 0, 0], ankleL: [-.12, 0, 0], thighR: [.14, 0, -.1], kneeR: [.22, 0, 0], ankleR: [-.1, 0, 0], drop: .035 }
const legsWide: Pose = { thighL: [-.32, 0, .2], kneeL: [.46, 0, 0], ankleL: [-.14, 0, 0], thighR: [.22, 0, -.2], kneeR: [.42, 0, 0], ankleR: [-.2, 0, 0], drop: .09 }
const legsLunge: Pose = { thighL: [-1.05, 0, .1], kneeL: [1.02, 0, 0], ankleL: [.05, 0, 0], thighR: [.55, 0, -.1], kneeR: [.36, 0, 0], ankleR: [.22, 0, 0], drop: .2 }
const N_STAND: Pose = { ...legsReady, shoulderR: [.05, 0, -.1], elbowR: [-.2, 0, 0], shoulderL: [.05, 0, .1], elbowL: [-.2, 0, 0] }
const N_GUARD: Pose = { ...legsReady, drop: .02, shoulderR: [-.55, 0, .55], elbowR: [-1.35, 0, 0], shoulderL: [-.15, 0, .2], elbowL: [-.9, 0, 0] }
const N_CHAT_A: Pose = { ...N_STAND, shoulderR: [-.8, 0, .15], elbowR: [-1.3, 0, 0], wristR: [.3, 0, 0], neck: [0, 0, .05] }
const N_CHAT_B: Pose = { ...N_STAND, shoulderR: [-.8, 0, .55], elbowR: [-1.9, 0, 0], shoulderL: [-.75, 0, -.5], elbowL: [-1.9, 0, 0] }
const N_CHAT_C: Pose = { ...N_STAND, shoulderL: [-.9, 0, -.2], elbowL: [-1.4, 0, 0], wristL: [.4, 0, 0], neck: [.1, 0, -.05] }
const N_SWEEP: Pose = { ...legsWide, drop: .06, spine: [.25, 0, 0], neck: [-.1, 0, 0], shoulderR: [-.9, 0, .2], elbowR: [-.5, 0, 0], wristR: [1.6, 0, 0], shoulderL: [-1.0, 0, -.3], elbowL: [-.8, 0, 0] }
const N_WATCH: Pose = { ...legsReady, shoulderR: [-.8, 0, .55], elbowR: [-1.9, 0, 0], shoulderL: [-.75, 0, -.5], elbowL: [-1.9, 0, 0] }
const N_CHEER: Pose = { ...legsWide, shoulderR: [-2.7, 0, -.3], elbowR: [-.4, 0, 0], shoulderL: [-.75, 0, -.5], elbowL: [-1.9, 0, 0], neck: [-.15, 0, 0] }
const K_READY: Pose = { ...legsWide, shoulderR: [-.9, 0, .25], elbowR: [-.9, 0, 0], wristR: [.9, 0, 0], shoulderL: [-.9, 0, -.3], elbowL: [-1.0, 0, 0] }
const K_RAISE: Pose = { ...legsWide, spine: [-.05, 0, 0], shoulderR: [-2.6, 0, .15], elbowR: [-1.0, 0, 0], wristR: [.6, 0, 0], shoulderL: [-2.5, 0, -.2], elbowL: [-1.1, 0, 0] }
const K_CUT: Pose = { ...legsLunge, offset: [0, 0, .35], spine: [.2, 0, 0], shoulderR: [-1.2, 0, .1], elbowR: [-.1, 0, 0], wristR: [1.5, 0, 0], shoulderL: [-1.15, 0, -.15], elbowL: [-.25, 0, 0] }
const K_SIDE: Pose = { ...legsWide, spine: [.1, .6, 0], shoulderR: [-1.3, 0, -.8], elbowR: [-.2, 0, 0], wristR: [1.3, .5, 0], shoulderL: [-.4, 0, .3], elbowL: [-.6, 0, 0] }

export const npcPoses = {
  stand: bakeTrack([{ t: 0, pose: N_STAND }]),
  guard: bakeTrack([{ t: 0, pose: N_GUARD }]),
  sweep: bakeTrack([{ t: 0, pose: N_SWEEP }]),
  watch: bakeTrack([{ t: 0, pose: N_WATCH }]),
  cheer: bakeTrack([{ t: 0, pose: N_CHEER }]),
}
export const CHAT_LOOP = 6.2, KATA_LOOP = 5.2
export const chatTrack = bakeTrack([{ t: 0, pose: N_CHAT_A }, { t: 1.6, pose: N_CHAT_A }, { t: 2.2, pose: N_CHAT_B }, { t: 3.8, pose: N_CHAT_B }, { t: 4.3, pose: N_CHAT_C }, { t: 5.6, pose: N_CHAT_C }, { t: CHAT_LOOP, pose: N_CHAT_A }])
export const kataTrack = bakeTrack([
  { t: 0, pose: K_READY }, { t: 1.0, pose: K_READY }, { t: 1.5, pose: K_RAISE }, { t: 1.9, pose: K_RAISE }, { t: 2.05, pose: K_CUT, ease: 'snap' }, { t: 2.8, pose: K_CUT },
  { t: 3.3, pose: K_READY }, { t: 3.7, pose: K_SIDE, ease: 'snap' }, { t: 4.3, pose: K_SIDE }, { t: 4.9, pose: K_READY }, { t: KATA_LOOP, pose: K_READY },
])

export const butterflyHomes: ButterflyHome[] = [
  { center: [0, .2, 7], radius: 3, count: 3 }, { center: [28, 0, 7], radius: 2.5, count: 2 }, { center: [28, 1.6, -11], radius: 5, count: 3 },
  { center: [10, 0, -31], radius: 4, count: 2 }, { center: [-22, .2, -30], radius: 5, count: 4 }, { center: [-22, .6, -50], radius: 4, count: 2 },
  { center: [24, 0, 18], radius: 6, count: 1 }, { center: [14, 0, -37], radius: 4, count: 2 }, { center: [4, 11, -67], radius: 2, count: 2 }, { center: [-8, 22, -80], radius: 4, count: 3 },
]
const trees: [number, number][] = [[-9.9, 3], [9.8, -5.3], [2.5, -29.5], [18.5, -29], [42, -38], [4, -62], [38, -73], [-40, -68], [-44, -28], [-35.2, -19.6], [-9, -19.7], [-35.3, -28.8], [-8.8, -29], [-34.8, -34.6], [-9.1, -35], [-35.8, -38.5], [14, 25.5], [19.5, 26], [29, 25.8], [34, 24.5]]
export const leafSources: DriftSource[] = trees.map(([x, z]) => ({ x, z, top: 4.6, spread: 1.8, ground: .02 }))
export const petalSources: DriftSource[] = [0, 1, 2, 3, 4].flatMap(i => [0, 1, 2, 3].map(j => ({ x: -33 + i * 5.5, z: -37 + j * 5.3, top: 7.8, spread: 2.9, ground: .24 })))
export const ambientBanners: BannerSpec[] = [
  { position: [-7.3, .16, 10.2], text: '瀞霊廷', cloth: '#f2eee3', ink: '#1d2230', height: 3 },
  { position: [7.3, .16, 10.2], text: '瀞霊廷', cloth: '#f2eee3', ink: '#1d2230', height: 3 },
  { position: [22.2, 0, 3.4], text: '十番隊', cloth: '#f2eee3', ink: '#1d2230', height: 3.2 },
  { position: [33.8, 0, 3.4], text: '十番隊', cloth: '#f2eee3', ink: '#1d2230', height: 3.2 },
]

// Shot list for the Kuchiki garden fight. The stone court spans x -30 to -14 and z -27 to -37,
// with the stream and bridge to the south, the veranda (Yoruichi's seat) to the north.
import type { ShotList } from '../finale/camera'
import { GARDEN_BOUNDS, GARDEN_FINISH as F, GD } from './timeline'

export const gardenShots: ShotList = {
  shots: [
    // From behind Ichigo on the bridge side: the court, Soi Fon, and Yoruichi on the veranda.
    { start: 0, end: 1.4, blend: 0, from: { pos: [-19.2, 3.3, -23.4], look: [-22.6, 1.1, -34.2], fov: 48 }, to: { pos: [-19.6, 3.1, -24.2], look: [-22.6, 1.1, -34.4], fov: 45 } },
    // Soi Fon draws and releases Suzumebachi.
    { start: 1.4, end: GD.flash - .1, blend: .5, from: { pos: [-20.9, 1.45, -31.9], look: [-22.05, 1.15, -34.8], fov: 34 }, to: { pos: [-21.0, 1.35, -32.35], look: [-22.05, 1.2, -34.8], fov: 30 } },
    // High orbit as her afterimages ring Ichigo.
    { start: GD.flash - .1, end: GD.sting - .08, blend: 0, from: { pos: [-17.4, 3.4, -25.6], look: [-22, .9, -29.3], fov: 54 }, to: { pos: [-25.8, 3.3, -25.4], look: [-22, .9, -29.3], fov: 54 }, ease: 'linear' },
    // Profile: the sting from behind, the mark blooming, his spinning backhand.
    { start: GD.sting - .08, end: GD.back - .05, blend: 0, from: { pos: [-18.6, 1.4, -28.3], look: [-22, 1.2, -28.55], fov: 36 }, to: { pos: [-18.8, 1.35, -28.5], look: [-22, 1.2, -28.6], fov: 34 } },
    // Two-shot as he turns back to find her on her mark.
    { start: GD.back - .05, end: GD.shunko, blend: 0, from: { pos: [-18.4, 1.9, -26.4], look: [-22.4, 1.15, -32.6], fov: 44 }, to: { pos: [-18.9, 1.85, -26.8], look: [-22.4, 1.15, -32.6], fov: 42 } },
    // Low on Soi Fon as the wind gathers.
    { start: GD.shunko, end: GD.burst, blend: 0, from: { pos: [-21.1, .8, -31.6], look: [-22, 1.2, -34.8], fov: 40 }, to: { pos: [-21.2, .78, -32.1], look: [-22, 1.2, -34.8], fov: 36 } },
    // Shunkō erupts: a fast pull back to a two-shot.
    { start: GD.burst, end: GD.dash1 - .05, blend: 0, from: { pos: [-20.4, 1.1, -31.9], look: [-22, 1.4, -34.8], fov: 48 }, to: { pos: [-18.6, 1.8, -29.8], look: [-22, 1.3, -34.6], fov: 54 }, ease: 'out' },
    // Side and wide: the lunge, the block, her back flip.
    { start: GD.dash1 - .05, end: GD.dash2 - .07, blend: 0, from: { pos: [-15.4, 1.7, -30.6], look: [-22, 1.2, -31.0], fov: 50 }, to: { pos: [-15.6, 1.75, -31.3], look: [-22, 1.2, -31.2], fov: 50 }, ease: 'linear' },
    // From the bridge behind Ichigo: the spinning kick at his left.
    { start: GD.dash2 - .07, end: GD.dash3 - .08, blend: 0, from: { pos: [-23.4, 1.45, -25.8], look: [-22.5, 1.35, -28.8], fov: 46 }, to: { pos: [-23.5, 1.4, -26.1], look: [-22.5, 1.35, -28.8], fov: 44 } },
    // Low, looking up: the dive onto his guard; she flips back overhead.
    { start: GD.dash3 - .08, end: GD.standoff, blend: 0, from: { pos: [-19.4, .75, -32.8], look: [-22, 2.0, -29.3], fov: 56 }, to: { pos: [-19.6, .8, -33.3], look: [-22, 2.0, -29.5], fov: 56 } },
    // Stand-off.
    { start: GD.standoff, end: GD.reveal, blend: .3, from: { pos: [-15.8, 2.3, -27.6], look: [-22.4, 1.2, -32.0], fov: 46 }, to: { pos: [-16.1, 2.25, -28.0], look: [-22.4, 1.2, -32.0], fov: 45 } },
    // Reveal: Ichigo, Soi Fon, and Yoruichi left of the Skills panel.
    { start: GD.reveal, end: GD.reveal + 4, blend: .9, from: { pos: [-19.9, 2.1, -25.4], look: [-20.4, 1.25, -33.5], fov: 44 }, to: { pos: [-20.2, 2.2, -25.2], look: [-20.5, 1.25, -33.5], fov: 44 }, portrait: { from: { pos: [-21.0, 2.3, -24.9], look: [-22.7, 1.3, -33.0], fov: 44 }, to: { pos: [-21.2, 2.4, -24.8], look: [-22.8, 1.3, -33.0], fov: 44 } } },
    { start: GD.reveal + 4, end: F, blend: 0, from: { pos: [-20.2, 2.2, -25.2], look: [-20.5, 1.25, -33.5], fov: 44 }, to: { pos: [-20.2, 2.2, -25.2], look: [-20.5, 1.25, -33.5], fov: 44 }, portrait: { from: { pos: [-21.2, 2.4, -24.8], look: [-22.8, 1.3, -33.0], fov: 44 }, to: { pos: [-21.2, 2.4, -24.8], look: [-22.8, 1.3, -33.0], fov: 44 } } },
    // Finish: behind Soi Fon's Shunkō, Ichigo winds up.
    { start: F, end: GD.release - .02, blend: 0, from: { pos: [-25.2, 1.25, -36.5], look: [-20.95, 1.3, -32.3], fov: 44 }, to: { pos: [-25.0, 1.2, -36.3], look: [-20.95, 1.3, -32.3], fov: 42 } },
    // Profile: the Getsuga meets her guard.
    { start: GD.release - .02, end: GD.fling - .05, blend: 0, from: { pos: [-15.2, 1.6, -31.0], look: [-22, 1.25, -31.3], fov: 54 }, to: { pos: [-15.4, 1.65, -31.6], look: [-22, 1.25, -31.6], fov: 54 }, ease: 'linear' },
    // Low and wide as she is thrown, and Yoruichi catches her (slow motion).
    { start: GD.fling - .05, end: GD.touchdown + .1, blend: 0, from: { pos: [-17.4, .95, -30.4], look: [-22.3, 2.2, -35.3], fov: 38 }, to: { pos: [-18.0, 1.0, -31.2], look: [-22.1, 1.8, -35.7], fov: 34 } },
    // Close on Yoruichi holding Soi Fon as she looks up at her.
    { start: GD.touchdown + .1, end: GD.lookUp + 1.1, blend: .35, from: { pos: [-20.0, 1.4, -33.5], look: [-21.75, 1.15, -36.0], fov: 38 }, to: { pos: [-20.2, 1.35, -33.8], look: [-21.75, 1.15, -36.0], fov: 35 } },
    // Side two-shot as Yoruichi turns to Ichigo. Control returns after this.
    { start: GD.lookUp + 1.1, end: GD.end + 1, blend: 0, from: { pos: [-15.2, 1.6, -31.4], look: [-21.0, 1.25, -32.1], fov: 44 }, to: { pos: [-15.5, 1.65, -31.6], look: [-21.0, 1.25, -32.1], fov: 43 }, portrait: { from: { pos: [-20.7, 1.95, -25.9], look: [-21.8, 1.15, -33.6], fov: 44 }, to: { pos: [-20.8, 2.0, -26.1], look: [-21.8, 1.15, -33.6], fov: 43 } } },
  ],
  shakes: [[GD.sting, .05, 6], [GD.burst, .16, 4], [GD.clash1, .1, 6], [GD.clash2, .09, 6], [GD.clash3, .16, 5], [GD.release, .05, 6], [GD.hit, .14, 5], [GD.fling, .08, 6], [GD.touchdown, .04, 6]],
  settle: [GD.reveal + 3.5, GD.reveal + 5],
  reveal: { start: GD.reveal, end: F - 1, lift: 2.2, shiftX: 0 },
  maxFov: 78, maxDolly: 1.35,
  bounds: GARDEN_BOUNDS,
}

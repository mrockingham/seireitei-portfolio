// PROCEDURAL PLACEHOLDER Soul Reapers who populate the streets: the shared shihakushō body with
// varied hair, skin, height, and a sheathed sword at the hip. A broom or drawn practice sword
// sits in a part group for the jobs that need one.
import { memo, useImperativeHandle, useRef } from 'react'
import type { Ref } from 'react'
import * as THREE from 'three'
import { bladeGeometry, box, cone, cyl, sph } from '../finale/materials'
import { spikes, useBindings, useFigureMaterials } from '../finale/figure-kit'
import type { Figure } from '../finale/figure-kit'
import { P } from '../finale/characters'
import { Shihakusho } from '../finale/shihakusho'

export type NpcLook = { hair: 'short' | 'spiky' | 'bun' | 'pony' | 'bald' | 'long'; hairColor: string; skin: string; scale: number; prop?: 'broom' | 'sword' }
const make = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra })
const spiky = spikes([[.1, 0, .16], [.5, .7, .17], [.5, -.7, .17], [.7, 1.8, .15], [.7, -1.8, .15], [.9, .2, .16], [1.0, 1.0, .14], [1.0, -1.0, .14]], .125, [0, .15, -.005], .4)
const shortBangs = spikes([[.95, 2.8, .09], [.95, -2.8, .09], [1.0, 3.14, .1]], .12, [0, .14, 0], -.9)

function SoulReaperFigure({ look, figure }: { look: NpcLook; figure: Ref<Figure> }) {
  const root = useRef<THREE.Group>(null)
  const { joints, parts, bind } = useBindings()
  const m = useFigureMaterials(() => ({
    black: make('#17171e'), belt: make('#efece3'), collar: make('#f3f1ea'), tabi: make('#f1efe8'), sandal: make('#5a4230'),
    skin: make(look.skin, { roughness: .6 }), hair: make(look.hairColor, { roughness: .5, flatShading: true }), eye: make('#2a2622'),
    sheath: make('#1f1b22', { roughness: .4 }), grip: make('#2d2833'), guard: make('#8d7a4a', { metalness: .5, roughness: .4 }),
    blade: make('#d9e0e4', { metalness: .85, roughness: .25 }), broom: make('#8a6a3e'), straw: make('#c9ad62', { flatShading: true }),
  }), [look.skin, look.hairColor])
  useImperativeHandle(figure, () => ({ root: root.current!, joints: joints.current, parts: parts.current, hipsY: .92 }), [joints, parts])
  const h = look.hair
  return <group ref={root} scale={look.scale}>
    <Shihakusho bind={bind} m={m} slots={{
      head: <>
        <P g={sph(.114, 12, 10)} m={m.skin} p={[0, .12, .005]} s={[.95, 1.08, 1]} />
        <P g={box(.1, .055, .07)} m={m.skin} p={[0, .045, .05]} r={[.3, 0, 0]} />
        {[-1, 1].map(s => <P key={s} g={box(.03, .012, .01)} m={m.eye} p={[s * .042, .125, .115]} />)}
        {h !== 'bald' && <P g={sph(.124, 12, 8, 0, Math.PI * 2, 0, Math.PI * (h === 'short' ? .5 : .58))} m={m.hair} p={[0, .15, -.012]} r={[-.3, 0, 0]} />}
        {h === 'spiky' && spiky.map((s, i) => <P key={i} g={cone(.045, s.length, 5)} m={m.hair} p={s.p} r={s.r} />)}
        {(h === 'short' || h === 'bun' || h === 'pony' || h === 'long') && shortBangs.map((s, i) => <P key={i} g={cone(.035, s.length, 4)} m={m.hair} p={s.p} r={s.r} />)}
        {h === 'bun' && <P g={sph(.06, 8, 6)} m={m.hair} p={[0, .22, -.1]} />}
        {h === 'pony' && <P g={cyl(.04, .02, .32, 6)} m={m.hair} p={[0, .04, -.14]} r={[.25, 0, 0]} />}
        {h === 'long' && <P g={box(.22, .42, .06)} m={m.hair} p={[0, -.05, -.09]} r={[.1, 0, 0]} />}
      </>,
      // A sheathed sword thrust through the sash on the left hip.
      waist: <group position={[.17, .02, .05]} rotation={[.35, 0, .12]}>
        <P g={cyl(.018, .021, .75, 6)} m={m.sheath} p={[0, -.2, -.02]} r={[Math.PI / 2 - .35, 0, 0]} />
        <P g={cyl(.017, .017, .2, 6)} m={m.grip} p={[0, .03, .3]} r={[Math.PI / 2 - .35, 0, 0]} />
      </group>,
      hand: look.prop === 'broom'
        ? <group ref={bind.part('broom')} position={[0, -.045, .01]} rotation={[Math.PI / 2, 0, 0]}>
          <group rotation={[0, -Math.PI / 2, 0]}>
            <P g={cyl(.016, .016, 1.3, 6)} m={m.broom} p={[0, -.2, 0]} />
            <P g={cone(.1, .3, 6)} m={m.straw} p={[0, -.95, 0]} />
          </group>
        </group>
        : look.prop === 'sword'
          ? <group ref={bind.part('sword')} position={[0, -.045, .01]} rotation={[Math.PI / 2, 0, 0]}>
            <group rotation={[0, -Math.PI / 2, 0]}>
              <P g={cyl(.017, .018, .24, 6)} m={m.grip} p={[0, -.02, 0]} />
              <P g={cyl(.04, .04, .012, 8)} m={m.guard} p={[0, .11, 0]} />
              <group position={[0, .12, 0]}><P g={bladeGeometry('npc-katana', [[-.016, 0], [.017, 0], [.017, .8], [-.016, .86]], .011, .003)} m={m.blade} /></group>
            </group>
          </group>
          : undefined,
    }} />
  </group>
}

export const SoulReaper = memo(SoulReaperFigure)

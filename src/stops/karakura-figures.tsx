// PROCEDURAL PLACEHOLDER CHARACTERS for the training grounds: original low-poly stand-ins for
// Chad, Uryū, and Orihime on the shared joint layout. Weapons and powers live in part groups
// (armour, bow, pendant) so the director can summon and dismiss them.
import { memo, useImperativeHandle, useMemo, useRef } from 'react'
import type { Ref } from 'react'
import * as THREE from 'three'
import { box, cone, cyl, sph, torus } from '../finale/materials'
import { spikes, useBindings, useFigureMaterials } from '../finale/figure-kit'
import type { Figure } from '../finale/figure-kit'
import { P } from '../finale/characters'
import { Casual } from './body'

const make = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra })
const glow = (color: string, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
const orihimeBangs = spikes([[.95, 2.7, .11], [.95, -2.7, .11], [1.02, 3.14, .12], [1.1, 2.25, .1], [1.1, -2.25, .1]], .116, [0, .14, 0], -.9)
const uryuBangs = spikes([[.95, 2.9, .12], [1.0, 2.5, .13], [.9, -2.8, .09]], .118, [0, .14, 0], -.95)

function useFigureHandle(figure: Ref<Figure>, root: React.RefObject<THREE.Group | null>, bindings: ReturnType<typeof useBindings>) {
  const { joints, parts } = bindings
  useImperativeHandle(figure, () => ({ root: root.current!, joints: joints.current, parts: parts.current, hipsY: .92 }), [root, joints, parts])
}

/** Chad: tall and broad, wavy hair over his eyes; Brazo Derecha de Gigante armours his right arm. */
function ChadFigure({ figure }: { figure: Ref<Figure> }) {
  const root = useRef<THREE.Group>(null)
  const bindings = useBindings(), { bind } = bindings
  const m = useFigureMaterials(() => ({
    skin: make('#96633f', { roughness: .6 }), hair: make('#2a1c14', { roughness: .5, flatShading: true }),
    top: make('#b8403a', { roughness: .75 }), under: make('#efece4'), pants: make('#2e3342'), shoe: make('#4a3426'), belt: make('#1c1b1f'),
    armor: make('#17141b', { metalness: .35, roughness: .35 }), stripe: make('#c21e30', { emissive: '#5a0710', roughness: .4 }),
  }), [])
  useFigureHandle(figure, root, bindings)
  const curls = useMemo(() => Array.from({ length: 9 }, (_, i) => { const a = (i / 8 - .5) * 2.4; return [Math.sin(a) * .1, .1 + Math.cos(a * 1.3) * .03, .1 + Math.cos(a) * .02] as [number, number, number] }), [])
  return <group ref={root} scale={1.14}>
    <Casual bind={bind} width={1.14} m={{ top: m.top, skin: m.skin, pants: m.pants, shoe: m.shoe, belt: m.belt }} slots={{
      head: <>
        <P g={sph(.118, 14, 12)} m={m.skin} p={[0, .12, .005]} s={[.98, 1.1, 1.02]} />
        <P g={box(.125, .075, .09)} m={m.skin} p={[0, .04, .05]} r={[.3, 0, 0]} />
        <P g={sph(.132, 12, 8, 0, Math.PI * 2, 0, Math.PI * .6)} m={m.hair} p={[0, .15, -.012]} r={[-.25, 0, 0]} />
        <P g={sph(.12, 10, 8)} m={m.hair} p={[0, .1, -.06]} s={[1.12, .95, .85]} />
        {/* Wavy fringe that hides his eyes. */}
        {curls.map((p, i) => <P key={i} g={sph(.045, 7, 6)} m={m.hair} p={p} s={[1, 1.35, .8]} />)}
        {[-1, 1].map(s => <P key={s} g={sph(.06, 8, 6)} m={m.hair} p={[s * .115, .08, .01]} s={[.8, 1.4, 1]} />)}
      </>,
      chest: <>
        <P g={box(.09, .12, .02)} m={m.under} p={[0, .11, .128]} r={[-.12, 0, 0]} />
        {[-1, 1].map(s => <P key={s} g={box(.05, .16, .018)} m={m.top} p={[s * .045, .1, .135]} r={[-.12, 0, -s * .38]} />)}
      </>,
      upperR: <group ref={bind.part('armorShoulder')} scale={.001}>
        <P g={cyl(.105, .09, .3, 10)} m={m.armor} p={[0, -.12, 0]} />
        <P g={box(.2, .26, .05)} m={m.armor} p={[-.06, -.05, 0]} r={[0, 0, .2]} />
        {[-1, 1].map(s => <P key={s} g={box(.02, .28, .055)} m={m.stripe} p={[-.06 + s * .06, -.05, 0]} r={[0, 0, .2]} />)}
      </group>,
      forearmR: <group ref={bind.part('armorForearm')} scale={.001}>
        <P g={cyl(.09, .075, .25, 10)} m={m.armor} p={[0, -.11, 0]} />
        <P g={cyl(.11, .085, .06, 10)} m={m.armor} p={[0, -.015, 0]} />
        {[0, 1, 2].map(k => <P key={k} g={box(.018, .22, .02)} m={m.stripe} p={[Math.sin(k * 2.1) * .08, -.11, Math.cos(k * 2.1) * .08]} r={[0, k * 2.1, 0]} />)}
      </group>,
      handR: <group ref={bind.part('armorHand')} scale={.001}>
        <P g={box(.09, .12, .07)} m={m.armor} p={[0, -.04, .004]} />
        <P g={box(.092, .02, .072)} m={m.stripe} p={[0, -.005, .004]} />
      </group>,
    }} />
  </group>
}

/** Uryū: white Quincy uniform with a short cape and blue crosses, glasses, a spirit bow of light. */
function UryuFigure({ figure }: { figure: Ref<Figure> }) {
  const root = useRef<THREE.Group>(null)
  const bindings = useBindings(), { bind } = bindings
  const m = useFigureMaterials(() => ({
    skin: make('#f1dccb', { roughness: .6 }), hair: make('#1b2130', { roughness: .45, flatShading: true }), eye: make('#27313f'),
    white: make('#f3f4f6', { roughness: .7 }), blue: make('#2d5fa8', { roughness: .6 }), frame: make('#26324a'), lens: make('#cfe4f0', { roughness: .2 }),
    silver: make('#d9dde2', { metalness: .8, roughness: .25 }), shoe: make('#e7e8ea'),
    bow: glow('#9fe9ff', .95), string: glow('#e6fbff', .9),
  }), [])
  useFigureHandle(figure, root, bindings)
  return <group ref={root} scale={.98}>
    <Casual bind={bind} sleeves="long" width={.98} m={{ top: m.white, skin: m.skin, pants: m.white, shoe: m.shoe, belt: m.blue }} slots={{
      head: <>
        <P g={sph(.112, 14, 12)} m={m.skin} p={[0, .12, .005]} s={[.93, 1.08, 1]} />
        <P g={box(.1, .055, .07)} m={m.skin} p={[0, .045, .05]} r={[.3, 0, 0]} />
        {[-1, 1].map(s => <P key={s} g={box(.03, .012, .01)} m={m.eye} p={[s * .042, .125, .114]} />)}
        {/* Glasses */}
        {[-1, 1].map(s => <P key={s} g={box(.046, .03, .006)} m={m.lens} p={[s * .043, .125, .123]} />)}
        {[-1, 1].map(s => <P key={s} g={box(.05, .006, .008)} m={m.frame} p={[s * .043, .141, .124]} />)}
        <P g={box(.03, .006, .006)} m={m.frame} p={[0, .128, .125]} />
        {[-1, 1].map(s => <P key={s} g={box(.006, .006, .1)} m={m.frame} p={[s * .092, .135, .075]} />)}
        <P g={sph(.122, 14, 8, 0, Math.PI * 2, 0, Math.PI * .58)} m={m.hair} p={[0, .15, -.012]} r={[-.3, 0, 0]} />
        {uryuBangs.map((s, i) => <P key={i} g={cone(.04, s.length, 4)} m={m.hair} p={s.p} r={s.r} />)}
        {[-1, 1].map(s => <P key={s} g={box(.04, .17, .09)} m={m.hair} p={[s * .104, .07, 0]} />)}
      </>,
      chest: <>
        {/* High collar and short cape with blue trim and crosses. */}
        <P g={cyl(.078, .09, .1, 10)} m={m.white} p={[0, .2, 0]} />
        <P g={cyl(.092, .092, .016, 10)} m={m.blue} p={[0, .245, 0]} />
        <P g={cyl(.215, .29, .22, 14, true)} m={m.white} p={[0, .06, 0]} s={[1, 1, .8]} />
        <P g={cyl(.292, .292, .02, 14, true)} m={m.blue} p={[0, -.05, 0]} s={[1, 1, .8]} />
        {[-1, 1].map(s => <group key={s} position={[s * .2, .12, .08]} rotation={[0, s * .5, 0]}>
          <P g={box(.012, .07, .01)} m={m.blue} />
          <P g={box(.05, .012, .01)} m={m.blue} p={[0, .012, 0]} />
        </group>)}
        <P g={box(.024, .3, .012)} m={m.blue} p={[0, -.02, .135]} />
      </>,
      handL: <>
        {/* Quincy cross pendant on the left wrist. */}
        <group position={[.035, .02, 0]}>
          <P g={torus(.03, .004, 4, 12)} m={m.silver} r={[Math.PI / 2, 0, 0]} />
          <group position={[.025, -.05, 0]}>
            <P g={box(.008, .05, .006)} m={m.silver} />
            <P g={box(.035, .008, .006)} m={m.silver} p={[0, .01, 0]} />
          </group>
        </group>
        <group ref={bind.part('bow')} position={[0, -.06, 0]} scale={.001}>
          <group rotation={[0, Math.PI / 2, 0]}>
            <mesh geometry={torus(.46, .014, 6, 40, 2.2)} material={m.bow} rotation={[0, 0, -1.1 - Math.PI / 2]} position={[0, .3, 0]} />
            <mesh geometry={box(.006, .006, .78)} material={m.string} position={[0, -.08, 0]} rotation={[Math.PI / 2, 0, 0]} />
          </group>
        </group>
      </>,
    }} />
  </group>
}

/** Orihime: long auburn hair with Shun Shun Rikka hairpins, white blouse, red ribbon, grey skirt. */
function OrihimeFigure({ figure }: { figure: Ref<Figure> }) {
  const root = useRef<THREE.Group>(null)
  const bindings = useBindings(), { bind } = bindings
  const m = useFigureMaterials(() => ({
    skin: make('#f5ddcb', { roughness: .6 }), hair: make('#df7a31', { roughness: .45, flatShading: true }), eye: make('#6a4432'),
    top: make('#f3f1ec', { roughness: .72 }), skirt: make('#6f717b'), sock: make('#f4f4f2'), shoe: make('#5b3a28'), ribbon: make('#c9303b'),
    pin: make('#4a80e2', { roughness: .35, emissive: '#10306b', emissiveIntensity: .6 }),
  }), [])
  useFigureHandle(figure, root, bindings)
  return <group ref={root} scale={.92}>
    <Casual bind={bind} legs="skirt" width={.9} m={{ top: m.top, skin: m.skin, pants: m.skirt, shoe: m.shoe, sock: m.sock }} slots={{
      head: <>
        <P g={sph(.11, 14, 12)} m={m.skin} p={[0, .12, .005]} s={[.94, 1.06, 1]} />
        <P g={box(.095, .052, .066)} m={m.skin} p={[0, .047, .05]} r={[.3, 0, 0]} />
        {[-1, 1].map(s => <P key={s} g={box(.034, .02, .01)} m={m.eye} p={[s * .042, .124, .113]} />)}
        <P g={sph(.12, 14, 8, 0, Math.PI * 2, 0, Math.PI * .6)} m={m.hair} p={[0, .15, -.012]} r={[-.25, 0, 0]} />
        {orihimeBangs.map((s, i) => <P key={i} g={cone(.035, s.length, 4)} m={m.hair} p={s.p} r={s.r} />)}
        {[-1, 1].map(s => <P key={s} g={box(.045, .34, .06)} m={m.hair} p={[s * .102, -.03, .02]} r={[.08, 0, s * -.06]} />)}
        <P g={box(.24, .6, .07)} m={m.hair} p={[0, -.13, -.09]} r={[.12, 0, 0]} />
        {/* Shun Shun Rikka: six-petal hairpins. */}
        {[-1, 1].map(s => <group key={s} position={[s * .112, .17, .03]} rotation={[0, 0, s * Math.PI / 2]}>
          {[0, 1, 2, 3, 4, 5].map(k => <P key={k} g={sph(.012, 6, 4)} m={m.pin} p={[Math.cos(k * Math.PI / 3) * .016, 0, Math.sin(k * Math.PI / 3) * .016]} />)}
        </group>)}
      </>,
      chest: <>
        {[-1, 1].map(s => <P key={s} g={box(.05, .03, .015)} m={m.ribbon} p={[s * .028, .15, .125]} r={[0, 0, s * .4]} />)}
        {[-1, 1].map(s => <P key={s} g={box(.018, .08, .012)} m={m.ribbon} p={[s * .012, .1, .128]} r={[0, 0, s * .2]} />)}
      </>,
    }} />
  </group>
}

// Memoized: figures only re-render when their own props change.
export const Chad = memo(ChadFigure)
export const Uryu = memo(UryuFigure)
export const Orihime = memo(OrihimeFigure)

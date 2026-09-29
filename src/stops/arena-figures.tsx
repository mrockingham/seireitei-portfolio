// PROCEDURAL PLACEHOLDER CHARACTERS for the captains' training arena: original low-poly stand-ins
// for Sajin Komamura, Kaname Tōsen, and Komamura's Bankai, Kokujō Tengen Myō'ō, all on the shared
// shihakushō body and joint layout (so the giant can mirror Komamura's pose track exactly).
import { memo, useImperativeHandle, useMemo, useRef } from 'react'
import type { ReactNode, Ref, RefObject } from 'react'
import * as THREE from 'three'
import { bladeGeometry, box, cone, cyl, sph, torus } from '../finale/materials'
import { useBindings, useFigureMaterials } from '../finale/figure-kit'
import type { Figure, V3 } from '../finale/figure-kit'
import { P } from '../finale/characters'
import { Shihakusho } from '../finale/shihakusho'

const make = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra })
const base = () => ({ black: make('#17171e'), belt: make('#efece3'), collar: make('#f3f1ea'), tabi: make('#f1efe8'), sandal: make('#5a4230') })

function useHandle(figure: Ref<Figure>, root: RefObject<THREE.Group | null>, b: ReturnType<typeof useBindings>) {
  useImperativeHandle(figure, () => ({ root: root.current!, joints: b.joints.current, parts: b.parts.current, hipsY: .92 }), [root, b])
}

/** A katana on the standard hand mount (blade along the wrist's +Z). */
function Katana({ m, blade, length = .9, guard, grip = .25 }: { m: { grip: THREE.Material; guard: THREE.Material; blade: THREE.Material }; blade: string; length?: number; guard?: ReactNode; grip?: number }) {
  return <group position={[0, -.045, .01]} rotation={[Math.PI / 2, 0, 0]}>
    <group rotation={[0, -Math.PI / 2, 0]}>
      <P g={cyl(.017, .018, grip, 8)} m={m.grip} p={[0, -.02, 0]} />
      {guard ?? <P g={box(.075, .012, .075)} m={m.guard} p={[0, .112, 0]} />}
      <P g={bladeGeometry(blade, [[-.016, 0], [.017, 0], [.017, length * .93], [-.016, length]], .011, .003)} m={m.blade} p={[0, .12, 0]} />
    </group>
  </group>
}

/** Komamura: a towering wolf-headed captain in a sleeveless haori, with armoured gauntlets and Tenken. */
function KomamuraFigure({ figure }: { figure: Ref<Figure> }) {
  const root = useRef<THREE.Group>(null)
  const b = useBindings(), { bind } = b
  const m = useFigureMaterials(() => ({
    ...base(), skin: make('#a8784c', { roughness: .95, flatShading: true }), hair: make('#7a5433', { roughness: .5, flatShading: true }),
    eye: make('#e0b030', { emissive: '#6b4a00' }), muzzle: make('#dcbb90', { flatShading: true }), nose: make('#141214'),
    haori: make('#f4f2eb', { roughness: .74, side: THREE.DoubleSide }), gauntlet: make('#3b3a42', { roughness: .45, metalness: .45 }), cord: make('#b9a57a'),
    grip: make('#2a2622'), guard: make('#4a4038', { metalness: .5, roughness: .45 }), blade: make('#cbd2d6', { metalness: .85, roughness: .32 }),
  }), [])
  useHandle(figure, root, b)
  const bracer = <group position={[0, .11, 0]}>
    <P g={cyl(.068, .06, .19, 8)} m={m.gauntlet} />
    {[-.05, .05].map(y => <P key={y} g={cyl(.071, .071, .02, 8)} m={m.cord} p={[0, y, 0]} />)}
  </group>
  return <group ref={root} scale={1.34}>
    <Shihakusho bind={bind} m={{ ...m, hand: m.skin }} haori={{ outer: m.haori, lining: m.haori, sleeves: false, length: .74 }} slots={{
      head: <>
        <P g={sph(.14, 12, 10)} m={m.skin} p={[0, .13, 0]} s={[1, 1, 1.05]} />
        <P g={box(.12, .1, .2)} m={m.muzzle} p={[0, .08, .15]} r={[.12, 0, 0]} />
        <P g={box(.05, .035, .04)} m={m.nose} p={[0, .115, .255]} />
        {[-1, 1].map(s => <group key={s}>
          <P g={box(.034, .02, .012)} m={m.eye} p={[s * .055, .17, .128]} r={[0, 0, s * .2]} />
          <P g={cone(.055, .16, 4)} m={m.skin} p={[s * .09, .3, -.02]} r={[-.15, 0, s * -.3]} />
        </group>)}
        <P g={cone(.2, .2, 10)} m={m.hair} p={[0, -.03, -.02]} r={[Math.PI, 0, 0]} />
      </>,
      hand: <>{bracer}<group ref={bind.part('sword')}><Katana m={m} blade="tenken" length={1.05} grip={.3} /></group></>,
      handL: bracer,
    }} />
  </group>
}

// Tōsen's dreadlocks: [azimuth around the back of the head, length, sideways splay].
const dreads: [number, number, number][] = [[-1.3, .34, -.25], [-.9, .42, -.15], [-.45, .48, -.06], [0, .5, 0], [.45, .48, .06], [.9, .42, .15], [1.3, .34, .25], [-.2, .44, -.02], [.2, .44, .02]]

/** Tōsen: dark skin, dreadlocks, white visor and orange scarf, purple sash; Suzumushi has a ring guard. */
function TosenFigure({ figure }: { figure: Ref<Figure> }) {
  const root = useRef<THREE.Group>(null)
  const b = useBindings(), { bind } = b
  const m = useFigureMaterials(() => ({
    ...base(), belt: make('#6a58a6', { roughness: .6 }), skin: make('#5e3d2c', { roughness: .6 }), hair: make('#141216', { roughness: .6, flatShading: true }),
    visor: make('#eef1f2', { roughness: .25, side: THREE.DoubleSide }), lens: make('#b9c2c8', { roughness: .15, metalness: .3 }), scarf: make('#e07a30', { roughness: .7 }),
    haori: make('#f4f2eb', { roughness: .74, side: THREE.DoubleSide }),
    grip: make('#e9e4d6'), guard: make('#c8ccd0', { metalness: .8, roughness: .25 }), blade: make('#d6dde1', { metalness: .88, roughness: .25 }),
  }), [])
  useHandle(figure, root, b)
  const hair = useMemo(() => dreads.map(([a, len, splay]) => ({
    p: [Math.sin(a) * .1, .16 - len / 2 + .02, -Math.cos(a) * .1 - .02] as V3, r: [.28, 0, splay] as V3, len,
  })), [])
  return <group ref={root} scale={1.02}>
    <Shihakusho bind={bind} m={m} haori={{ outer: m.haori, lining: m.haori, sleeves: true, length: .74 }} slots={{
      head: <>
        <P g={sph(.116, 14, 12)} m={m.skin} p={[0, .12, .005]} s={[.95, 1.08, 1]} />
        <P g={box(.105, .06, .075)} m={m.skin} p={[0, .045, .05]} r={[.3, 0, 0]} />
        {/* The visor wraps the front of his head at eye level. */}
        <P g={cyl(.124, .124, .05, 18, true, -1.25, 2.5)} m={m.visor} p={[0, .128, .006]} />
        <P g={box(.16, .026, .012)} m={m.lens} p={[0, .128, .118]} />
        <P g={sph(.124, 14, 8, 0, Math.PI * 2, 0, Math.PI * .5)} m={m.hair} p={[0, .15, -.012]} r={[-.35, 0, 0]} />
        {hair.map((h, i) => <P key={i} g={cyl(.017, .013, h.len, 5)} m={m.hair} p={h.p} r={h.r} />)}
      </>,
      chest: <>
        <P g={torus(.085, .036, 6, 14)} m={m.scarf} p={[0, .24, .005]} r={[Math.PI / 2 - .15, 0, 0]} />
        <group ref={bind.part('scarfTail')} position={[-.07, .22, -.08]}>
          <P g={box(.07, .34, .018)} m={m.scarf} p={[0, -.17, 0]} r={[.2, 0, .25]} />
        </group>
      </>,
      hand: <group ref={bind.part('sword')}>
        <Katana m={m} blade="suzumushi" length={.92} guard={<P g={torus(.05, .008, 6, 18)} m={m.guard} p={[0, .112, 0]} r={[Math.PI / 2, 0, 0]} />} />
      </group>,
    }} />
  </group>
}

/**
 * Kokujō Tengen Myō'ō: a giant armoured warrior with a horned helmet and red mask, purple cord loops
 * rising behind its back, and a vast sword. Built at human scale; the director scales it up.
 */
function GiantFigure({ figure }: { figure: Ref<Figure> }) {
  const root = useRef<THREE.Group>(null)
  const b = useBindings(), { bind } = b
  const m = useFigureMaterials(() => ({
    black: make('#1d1b24', { roughness: .85 }), belt: make('#b9a57a', { roughness: .9 }), collar: make('#4a4658', { flatShading: true }), skin: make('#23202a'),
    tabi: make('#35323f', { flatShading: true }), sandal: make('#35323f', { flatShading: true }), upper: make('#1d1b24'),
    armor: make('#3a3646', { roughness: .5, metalness: .3, flatShading: true }), plate: make('#524d63', { roughness: .45, metalness: .3, flatShading: true }),
    horn: make('#c9bfd1', { roughness: .55, flatShading: true }), mask: make('#b01c33', { roughness: .5, flatShading: true }), shade: make('#0c0a10'),
    cord: make('#5a2a86', { roughness: .6 }), grip: make('#2b2533'), guard: make('#4a4038', { metalness: .5, roughness: .45 }), blade: make('#c3cacf', { metalness: .85, roughness: .3 }),
  }), [])
  useHandle(figure, root, b)
  const sode = (s: number) => <group position={[s * .05, -.02, 0]} rotation={[0, 0, s * .3]}>
    {[0, 1, 2].map(k => <P key={k} g={box(.2, .07, .25)} m={k % 2 ? m.plate : m.armor} p={[s * .03, -k * .07, 0]} />)}
  </group>
  const skirt = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const a = (i + .5) / 8 * Math.PI * 2
    return { p: [Math.sin(a) * .2, -.2, Math.cos(a) * .17] as V3, r: [Math.cos(a) * .18, a, 0] as V3 }
  }), [])
  return <group ref={root}>
    <Shihakusho bind={bind} m={m} arms={.14} slots={{
      head: <>
        <P g={sph(.15, 12, 10)} m={m.armor} p={[0, .14, -.01]} s={[1, 1.05, 1.05]} />
        {/* The face: a dark hollow behind a red half-mask. */}
        <P g={box(.17, .07, .04)} m={m.shade} p={[0, .15, .125]} />
        <P g={box(.15, .1, .06)} m={m.mask} p={[0, .065, .115]} r={[.15, 0, 0]} />
        {[-1, 0, 1].map(k => <P key={k} g={box(.012, .07, .01)} m={m.shade} p={[k * .035, .06, .15]} />)}
        <P g={box(.26, .025, .12)} m={m.plate} p={[0, .205, .09]} r={[.2, 0, 0]} />
        <P g={cone(.03, .14, 4)} m={m.plate} p={[0, .31, .05]} r={[.3, 0, 0]} />
        {/* Curled ram horns. */}
        {[-1, 1].map(s => <group key={s} position={[s * .15, .2, -.03]} rotation={[0, s * Math.PI / 2, 0]}>
          <P g={torus(.1, .032, 6, 14, Math.PI * 1.45)} m={m.horn} r={[0, 0, .6]} />
        </group>)}
        {/* Neck guard. */}
        <P g={cyl(.16, .2, .1, 12, true, Math.PI * .6, Math.PI * .8)} m={m.armor} p={[0, .02, -.02]} />
      </>,
      chest: <>
        <P g={box(.42, .34, .3)} m={m.armor} p={[0, .02, .01]} />
        {[0, 1, 2].map(k => <P key={k} g={box(.44, .05, .02)} m={m.plate} p={[0, -.1 + k * .09, .165]} />)}
        <P g={box(.2, .1, .05)} m={m.mask} p={[0, .12, .165]} />
      </>,
      back: <group ref={bind.part('loops')} position={[0, .12, -.2]}>
        {[[-.28, .3, .6], [-.2, .5, .3], [0, .58, 0], [.2, .5, -.3], [.28, .3, -.6], [-.34, .08, .9], [.34, .08, -.9]].map(([x, y, rz], i) =>
          <P key={i} g={torus(.12, .022, 6, 18)} m={m.cord} p={[x, y, -.04]} r={[0, 0, rz]} />)}
      </group>,
      leftArm: sode(1),
      rightArm: sode(-1),
      waist: <>{skirt.map((k, i) => <P key={i} g={box(.15, .26, .03)} m={i % 2 ? m.plate : m.armor} p={k.p} r={k.r} />)}</>,
      hand: <group ref={bind.part('sword')}><Katana m={m} blade="kokujo" length={1.3} grip={.32} /></group>,
    }} />
  </group>
}

// Memoized: figures only re-render when their own props change.
export const Komamura = memo(KomamuraFigure)
export const Tosen = memo(TosenFigure)
export const KokujoGiant = memo(GiantFigure)

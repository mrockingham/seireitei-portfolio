// PROCEDURAL PLACEHOLDER CHARACTERS for the Eleventh Division yard: original low-poly stand-ins
// for Kenpachi, Yachiru, Ikkaku, and Yumichika on the shared shihakushō body and joint layout.
import { memo, useImperativeHandle, useMemo, useRef } from 'react'
import type { ReactNode, Ref } from 'react'
import * as THREE from 'three'
import { bladeGeometry, box, cone, cyl, sph, torus } from '../finale/materials'
import { spikes, useBindings, useFigureMaterials } from '../finale/figure-kit'
import type { Figure, V3 } from '../finale/figure-kit'
import { P } from '../finale/characters'
import { Shihakusho } from '../finale/shihakusho'

const make = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra })
const base = () => ({ black: make('#17171e'), belt: make('#efece3'), collar: make('#f3f1ea'), tabi: make('#f1efe8'), sandal: make('#5a4230') })
const kenpachiSpikes = spikes([[.3, 0, .26], [.6, .8, .3], [.6, -.8, .3], [.75, 1.8, .27], [.75, -1.8, .27], [1.0, .3, .3], [1.0, -.3, .3], [1.15, 1.15, .27], [1.15, -1.15, .27], [1.3, 2.3, .22], [1.3, -2.3, .22], [.5, 2.8, .2], [.5, -2.8, .2]], .13, [0, .15, -.01], .55)
const kenpachiBells = kenpachiSpikes.map(s => {
  const dir = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(...s.r))
  return new THREE.Vector3(...s.p).addScaledVector(dir, s.length / 2 + .012).toArray() as V3
})
const yachiruBangs = spikes([[.95, 2.8, .07], [.95, -2.8, .07], [1.0, 3.14, .08]], .12, [0, .14, 0], -.9)
const yumichikaBangs = spikes([[1.0, 2.9, .1], [1.0, -2.9, .1], [1.02, 3.14, .1], [1.05, 2.5, .1], [1.05, -2.5, .1]], .12, [0, .14, 0], -1.0)

function useHandle(figure: Ref<Figure>, root: React.RefObject<THREE.Group | null>, b: ReturnType<typeof useBindings>) {
  useImperativeHandle(figure, () => ({ root: root.current!, joints: b.joints.current, parts: b.parts.current, hipsY: .92 }), [root, b])
}

/** A plain katana on the standard hand mount (blade along the wrist's +Z). */
function Katana({ m, blade, length = .9, guard, bladeRef }: { m: { grip: THREE.Material; guard: THREE.Material; blade: THREE.Material }; blade: string; length?: number; guard?: ReactNode; bladeRef?: React.Ref<THREE.Group> }) {
  return <group position={[0, -.045, .01]} rotation={[Math.PI / 2, 0, 0]}>
    <group rotation={[0, -Math.PI / 2, 0]}>
      <P g={cyl(.017, .018, .25, 8)} m={m.grip} p={[0, -.02, 0]} />
      {guard ?? <P g={cyl(.04, .04, .012, 10)} m={m.guard} p={[0, .112, 0]} />}
      <group ref={bladeRef} position={[0, .12, 0]}>
        <P g={bladeGeometry(blade, [[-.016, 0], [.017, 0], [.017, length * .93], [-.016, length]], .011, .003)} m={m.blade} />
      </group>
    </group>
  </group>
}

/** Kenpachi: towering, bells on every spike of his hair, eyepatch and scar, a tattered sleeveless haori. */
function KenpachiFigure({ figure }: { figure: Ref<Figure> }) {
  const root = useRef<THREE.Group>(null)
  const b = useBindings(), { bind } = b
  const m = useFigureMaterials(() => ({
    ...base(), skin: make('#e1b596', { roughness: .6 }), hair: make('#141419', { roughness: .45, flatShading: true }), eye: make('#2a2622'),
    haori: make('#efece4', { roughness: .8, side: THREE.DoubleSide }), bell: make('#d9b24a', { metalness: .6, roughness: .3 }), patch: make('#0d0d10'), scar: make('#8a3b35'), teeth: make('#f6f3ea'),
    grip: make('#2a2622'), guard: make('#3a3531', { metalness: .5, roughness: .5 }), blade: make('#c9cfd3', { metalness: .85, roughness: .35 }),
  }), [])
  useHandle(figure, root, b)
  const hem = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2
    if (Math.abs(Math.sin(a / 2)) < .12) return null
    const len = .12 + (i % 4) * .04
    return { p: [Math.sin(a) * .34, -.62 - len / 2, Math.cos(a) * .34 * .84] as V3, r: [Math.PI, a, 0] as V3, len }
  }).filter(x => x !== null), [])
  return <group ref={root} scale={1.2}>
    <Shihakusho bind={bind} m={m} haori={{ outer: m.haori, lining: m.haori, sleeves: false, length: .7 }} slots={{
      head: <>
        <P g={sph(.12, 14, 12)} m={m.skin} p={[0, .12, .005]} s={[.96, 1.1, 1]} />
        <P g={box(.12, .07, .085)} m={m.skin} p={[0, .04, .05]} r={[.3, 0, 0]} />
        <P g={box(.034, .012, .01)} m={m.eye} p={[.043, .125, .12]} />
        {/* Eyepatch over his right eye, and the scar across his left. */}
        <P g={box(.05, .038, .01)} m={m.patch} p={[-.045, .125, .121]} />
        <P g={box(.24, .008, .006)} m={m.patch} p={[0, .15, .07]} r={[0, 0, -.35]} />
        <P g={box(.007, .13, .006)} m={m.scar} p={[.05, .12, .121]} r={[0, 0, .15]} />
        <P g={box(.05, .012, .008)} m={m.teeth} p={[0, .065, .117]} />
        <P g={sph(.13, 14, 8, 0, Math.PI * 2, 0, Math.PI * .6)} m={m.hair} p={[0, .15, -.012]} r={[-.25, 0, 0]} />
        {kenpachiSpikes.map((s, i) => <P key={i} g={cone(.045, s.length, 5)} m={m.hair} p={s.p} r={s.r} />)}
        {kenpachiBells.map((p, i) => <P key={i} g={sph(.018, 6, 5)} m={m.bell} p={p} />)}
      </>,
      waist: <>{hem.map((h, i) => <P key={i} g={cone(.05, h.len, 3)} m={m.haori} p={h.p} r={h.r} />)}</>,
      hand: <group ref={bind.part('sword')}><Katana m={m} blade="nozarashi" length={1.02} /></group>,
    }} />
  </group>
}

/** Yachiru: tiny, short pink hair, big eyes, the lieutenant's armband. */
function YachiruFigure({ figure }: { figure: Ref<Figure> }) {
  const root = useRef<THREE.Group>(null)
  const b = useBindings(), { bind } = b
  const m = useFigureMaterials(() => ({
    ...base(), skin: make('#f6dccb', { roughness: .6 }), hair: make('#f19bbd', { roughness: .45, flatShading: true }), eye: make('#c9315a'), band: make('#f1efe8'), candy: make('#ffd1e6'),
  }), [])
  useHandle(figure, root, b)
  return <group ref={root} scale={.6}>
    <Shihakusho bind={bind} m={m} arms={.07} slots={{
      head: <group scale={1.18} position={[0, .01, 0]}>
        <P g={sph(.112, 14, 12)} m={m.skin} p={[0, .12, .005]} s={[1, 1.02, 1]} />
        {[-1, 1].map(s => <P key={s} g={box(.036, .028, .01)} m={m.eye} p={[s * .042, .12, .113]} />)}
        <P g={sph(.124, 14, 8, 0, Math.PI * 2, 0, Math.PI * .58)} m={m.hair} p={[0, .15, -.012]} r={[-.25, 0, 0]} />
        {yachiruBangs.map((s, i) => <P key={i} g={cone(.04, s.length, 4)} m={m.hair} p={s.p} r={s.r} />)}
        {[-1, 1].map(s => <P key={s} g={box(.05, .12, .1)} m={m.hair} p={[s * .104, .1, 0]} />)}
      </group>,
      leftArm: <P g={cyl(.08, .08, .07, 10)} m={m.band} p={[0, -.1, 0]} />,
      hand: <P g={sph(.035, 8, 6)} m={m.candy} p={[0, -.08, .03]} />,
    }} />
  </group>
}

/**
 * Ikkaku: bald, red marks at the corners of his eyes. Hōzukimaru is a sword and sheath that join
 * into a spear with a red tassel; the spear can split into three sections joined by chains.
 */
function IkkakuFigure({ figure }: { figure: Ref<Figure> }) {
  const root = useRef<THREE.Group>(null)
  const b = useBindings(), { bind } = b
  const m = useFigureMaterials(() => ({
    ...base(), skin: make('#efcfb4', { roughness: .45 }), eye: make('#2a2622'), mark: make('#c7303b'),
    grip: make('#27222c'), guard: make('#b58a3a', { metalness: .6, roughness: .35 }), blade: make('#dfe6ea', { metalness: .9, roughness: .2 }),
    shaft: make('#5d3b24', { roughness: .6 }), tassel: make('#c62e3a', { roughness: .9, flatShading: true }), sheath: make('#1d1a22', { roughness: .4 }), chain: make('#9aa2aa', { metalness: .8, roughness: .3 }),
  }), [])
  useHandle(figure, root, b)
  // Spear sections along the hand mount's blade axis (+Y inside the mount): grip, middle, head.
  const link = (k: number) => <P key={k} g={torus(.02, .006, 4, 8)} m={m.chain} p={[0, .03 + k * .04, 0]} r={[0, k % 2 ? Math.PI / 2 : 0, 0]} />
  return <group ref={root} scale={1.0}>
    <Shihakusho bind={bind} m={m} slots={{
      head: <>
        <P g={sph(.118, 14, 12)} m={m.skin} p={[0, .125, .003]} s={[.97, 1.1, 1.02]} />
        <P g={box(.11, .06, .08)} m={m.skin} p={[0, .045, .05]} r={[.3, 0, 0]} />
        {[-1, 1].map(s => <group key={s}>
          <P g={box(.03, .012, .01)} m={m.eye} p={[s * .043, .125, .118]} />
          <P g={box(.022, .01, .008)} m={m.mark} p={[s * .068, .128, .11]} r={[0, s * .5, s * -.3]} />
        </group>)}
      </>,
      hand: <>
        <group ref={bind.part('sword')}><Katana m={m} blade="hozukimaru" length={.86} /></group>
        <group ref={bind.part('spear')} position={[0, -.045, .01]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
          <group ref={bind.part('spearSpin')} rotation={[0, -Math.PI / 2, 0]}>
            <P g={cyl(.019, .019, .75, 8)} m={m.shaft} p={[0, .05, 0]} />
            <group ref={bind.part('sec1')} position={[0, .43, 0]}>
              <group ref={bind.part('chain1')} visible={false}>{[0, 1, 2].map(link)}</group>
              <group ref={bind.part('sec1body')}>
                <P g={cyl(.019, .019, .62, 8)} m={m.shaft} p={[0, .31, 0]} />
                <group ref={bind.part('sec2')} position={[0, .62, 0]}>
                  <group ref={bind.part('chain2')} visible={false}>{[0, 1, 2].map(link)}</group>
                  <group ref={bind.part('sec2body')}>
                    <P g={cyl(.019, .02, .3, 8)} m={m.shaft} p={[0, .15, 0]} />
                    <P g={cone(.05, .16, 6)} m={m.tassel} p={[0, .26, 0]} r={[Math.PI, 0, 0]} />
                    <P g={cyl(.03, .03, .02, 8)} m={m.guard} p={[0, .31, 0]} />
                    <group position={[0, .32, 0]}><P g={bladeGeometry('hozukimaru-spear', [[-.02, 0], [.024, 0], [.03, .2], [.0, .36], [-.02, .22]], .012, .003)} m={m.blade} /></group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </>,
      // The sheath rides in his left hand while Hōzukimaru is sealed.
      handL: <group ref={bind.part('sheath')} position={[0, -.045, .01]} rotation={[Math.PI / 2, 0, 0]}>
        <group rotation={[0, -Math.PI / 2, 0]}>
          <P g={cyl(.021, .024, .8, 8)} m={m.sheath} p={[0, .42, 0]} />
          <P g={cyl(.025, .025, .03, 8)} m={m.guard} p={[0, .02, 0]} />
        </group>
      </group>,
    }} />
  </group>
}

/** Yumichika: glossy black bob, yellow and red feathers at his right eye, an orange collar. */
function YumichikaFigure({ figure }: { figure: Ref<Figure> }) {
  const root = useRef<THREE.Group>(null)
  const b = useBindings(), { bind } = b
  const m = useFigureMaterials(() => ({
    ...base(), skin: make('#f3dccb', { roughness: .55 }), hair: make('#18161f', { roughness: .3, flatShading: true }), eye: make('#4a3a5c'),
    featherA: make('#f2c230', { roughness: .5 }), featherB: make('#e3522f', { roughness: .5 }), orange: make('#e3843a', { roughness: .6 }),
    grip: make('#5b2f6b'), guard: make('#c9a24a', { metalness: .6, roughness: .35 }), blade: make('#e2e8ec', { metalness: .9, roughness: .18 }),
  }), [])
  useHandle(figure, root, b)
  return <group ref={root} scale={.98}>
    <Shihakusho bind={bind} m={m} slots={{
      head: <>
        <P g={sph(.112, 14, 12)} m={m.skin} p={[0, .12, .005]} s={[.93, 1.08, 1]} />
        <P g={box(.098, .052, .068)} m={m.skin} p={[0, .045, .05]} r={[.3, 0, 0]} />
        {[-1, 1].map(s => <P key={s} g={box(.034, .014, .01)} m={m.eye} p={[s * .042, .125, .114]} />)}
        {/* Feathers at the outer corner of his right eye. */}
        <P g={box(.012, .06, .004)} m={m.featherA} p={[-.075, .15, .1]} r={[0, .4, .7]} />
        <P g={box(.012, .05, .004)} m={m.featherB} p={[-.082, .128, .098]} r={[0, .4, 1.1]} />
        <P g={sph(.124, 14, 8, 0, Math.PI * 2, 0, Math.PI * .62)} m={m.hair} p={[0, .15, -.012]} r={[-.2, 0, 0]} />
        {yumichikaBangs.map((s, i) => <P key={i} g={cone(.04, s.length, 4)} m={m.hair} p={s.p} r={s.r} />)}
        {/* Chin-length bob. */}
        <P g={cyl(.132, .14, .16, 14, true)} m={m.hair} p={[0, .09, -.01]} s={[1, 1, .98]} />
      </>,
      chest: <P g={cyl(.07, .082, .08, 10)} m={m.orange} p={[0, .21, 0]} />,
      hand: <group ref={bind.part('sword')}><Katana m={m} blade="fujikujaku" length={.88} guard={<>{[0, 1, 2, 3].map(k => <P key={k} g={sph(.02, 6, 4)} m={m.guard} p={[Math.cos(k * Math.PI / 2) * .03, .112, Math.sin(k * Math.PI / 2) * .03]} />)}</>} /></group>,
    }} />
  </group>
}

// Memoized: figures only re-render when their own props change.
export const Kenpachi = memo(KenpachiFigure)
export const Yachiru = memo(YachiruFigure)
export const Ikkaku = memo(IkkakuFigure)
export const Yumichika = memo(YumichikaFigure)

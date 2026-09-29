// PROCEDURAL PLACEHOLDER CHARACTERS for the Division barracks: original low-poly stand-ins
// for Tōshirō Hitsugaya and the five captains watching from the sides of the hall. They use
// the shared shihakushō body and joint layout, so the pose tracks transfer to real models.
import { memo, useImperativeHandle, useMemo, useRef } from 'react'
import type { ReactNode, Ref } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { bladeGeometry, box, cone, cyl, getEnvMap, sph, torus } from '../finale/materials'
import { spikes, useBindings, useFigureMaterials } from '../finale/figure-kit'
import type { Figure, V3 } from '../finale/figure-kit'
import { P } from '../finale/characters'
import { Shihakusho } from '../finale/shihakusho'

const make = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra })
const toshiroSpikes = spikes([[.1, 0, .22], [.5, .6, .24], [.5, -.6, .24], [.62, 1.55, .2], [.62, -1.55, .2], [.85, .1, .23], [.95, .9, .2], [.95, -.9, .2], [1.2, .4, .17], [1.2, -.4, .17], [.35, 2.7, .17], [1.0, 2.1, .15], [1.0, -2.1, .15]], .126, [0, .16, -.005], .45)
const toshiroBangs = spikes([[.95, 2.7, .12], [.95, -2.7, .12], [1.05, 3.1, .13]], .12, [0, .14, 0], -.9)
const ukitakeBangs = spikes([[.9, 2.8, .1], [.9, -2.8, .1]], .12, [0, .14, 0], -.9)

/** Four-pointed star used for Hyōrinmaru's guard and Tōshirō's sash clasp. */
function Star({ m, r, p, rot }: { m: THREE.Material; r: number; p: V3; rot?: V3 }) {
  return <group position={p} rotation={rot}>
    {[0, 1, 2, 3].map(k => <P key={k} g={cone(r * .32, r, 4)} m={m} p={[Math.cos(k * Math.PI / 2) * r * .45, Math.sin(k * Math.PI / 2) * r * .45, 0]} r={[0, 0, k * Math.PI / 2 - Math.PI / 2]} />)}
  </group>
}

/** Tōshirō: white spiky hair, sleeveless haori, green sash; Hyōrinmaru drawn from his back. */
function ToshiroFigure({ figure }: { figure: Ref<Figure> }) {
  const { gl } = useThree()
  const env = useMemo(() => getEnvMap(gl), [gl])
  const root = useRef<THREE.Group>(null)
  const { joints, parts, bind } = useBindings()
  const m = useFigureMaterials(() => ({
    skin: make('#f1dac9', { roughness: .6 }), hair: make('#eef5f7', { roughness: .4, flatShading: true, emissive: '#9fb6c0', emissiveIntensity: .12 }), eye: make('#1f9f95'),
    black: make('#17171e'), belt: make('#efece3'), collar: make('#f3f1ea'), tabi: make('#f1efe8'), sandal: make('#5a4230'),
    haori: make('#f4f2eb', { roughness: .74, side: THREE.DoubleSide }), sash: make('#3d7a4f', { roughness: .6 }), clasp: make('#d7d3c2', { metalness: .6, roughness: .3, envMap: env }),
    blade: make('#e3eef2', { metalness: .9, roughness: .18, envMap: env, envMapIntensity: 1.2, emissive: '#000000' }), grip: make('#1d4250'),
    steel: make('#c9d6dc', { metalness: .85, roughness: .3, envMap: env }),
  }), [env])
  useImperativeHandle(figure, () => ({ root: root.current!, joints: joints.current, parts: parts.current, hipsY: .92 }), [joints, parts])
  const katana = (withChain: boolean) => <group rotation={[0, -Math.PI / 2, 0]}>
    <P g={cyl(.017, .018, .25, 8)} m={m.grip} p={[0, -.02, 0]} />
    <Star m={m.steel} r={.07} p={[0, .112, 0]} rot={[Math.PI / 2, 0, 0]} />
    <group ref={withChain ? bind.part('blade') : undefined} position={[0, .12, 0]}>
      <P g={bladeGeometry('hyorinmaru', [[-.017, 0], [.018, 0], [.018, .93], [-.017, 1.0]], .011, .003)} m={m.blade} />
    </group>
    {withChain && <group ref={bind.part('chain')} position={[0, -.15, 0]}>
      {Array.from({ length: 11 }, (_, k) => k).reduceRight<ReactNode>((child, k) => <group key={k} name={`link${k}`} position={[0, k === 0 ? 0 : -.075, 0]}>
        <P g={torus(.022, .006, 5, 10)} m={m.steel} p={[0, -.035, 0]} r={[0, k % 2 ? Math.PI / 2 : 0, 0]} />
        {k === 10 ? <group position={[0, -.08, 0]}><P g={bladeGeometry('hyorin-crescent', [[0, 0], [.1, -.05], [.16, -.16], [.12, -.1], [.02, -.05]], .01, .002)} m={m.blade} /></group> : child}
      </group>, null)}
    </group>}
  </group>
  return <group ref={root} scale={.76}>
    <Shihakusho bind={bind} m={m} arms={.08} haori={{ outer: m.haori, lining: m.haori, sleeves: false, length: .72 }} slots={{
      head: <>
        <P g={sph(.116, 14, 12)} m={m.skin} p={[0, .12, .005]} s={[.95, 1.06, 1]} />
        <P g={box(.105, .055, .07)} m={m.skin} p={[0, .045, .05]} r={[.3, 0, 0]} />
        {[-1, 1].map(s => <P key={s} g={box(.036, .02, .01)} m={m.eye} p={[s * .043, .125, .119]} />)}
        <P g={sph(.127, 14, 8, 0, Math.PI * 2, 0, Math.PI * .55)} m={m.hair} p={[0, .15, -.01]} r={[-.35, 0, 0]} />
        {toshiroSpikes.map((s, i) => <P key={i} g={cone(.05, s.length, 5)} m={m.hair} p={s.p} r={s.r} />)}
        {toshiroBangs.map((s, i) => <P key={i} g={cone(.036, s.length, 4)} m={m.hair} p={s.p} r={s.r} />)}
      </>,
      chest: <>
        <P g={box(.075, .64, .03)} m={m.sash} p={[0, 0, .14]} r={[-.08, 0, -.62]} />
        <P g={box(.075, .64, .03)} m={m.sash} p={[0, 0, -.14]} r={[.08, 0, -.62]} />
        <Star m={m.clasp} r={.06} p={[.03, .03, .16]} />
      </>,
      back: <group ref={bind.part('backSword')} position={[.13, .2, -.17]} rotation={[0, 0, 2.75]}>
        <group rotation={[0, Math.PI / 2, 0]}>{katana(false)}</group>
      </group>,
      hand: <group ref={bind.part('handSword')} position={[0, -.045, .01]} rotation={[Math.PI / 2, 0, 0]} visible={false}>{katana(true)}</group>,
    }} />
  </group>
}

export type CaptainKind = 'ukitake' | 'shunsui' | 'unohana' | 'komamura' | 'mayuri'
const captainScale: Record<CaptainKind, number> = { ukitake: 1.04, shunsui: 1.06, unohana: .98, komamura: 1.34, mayuri: 1.0 }

/** A captain watching the fight: shared body and white haori, each with a distinct head. */
function CaptainFigure({ kind, figure }: { kind: CaptainKind; figure: Ref<Figure> }) {
  const root = useRef<THREE.Group>(null)
  const { joints, parts, bind } = useBindings()
  const m = useFigureMaterials(() => {
    const skin = kind === 'komamura' ? '#a8784c' : kind === 'mayuri' ? '#f4f2ec' : kind === 'shunsui' ? '#e1ad8c' : '#f1d9c8'
    const hair = kind === 'ukitake' ? '#f0f0ea' : kind === 'shunsui' ? '#3b2821' : kind === 'unohana' ? '#16161e' : '#7a5433'
    return {
      skin: make(skin, { roughness: kind === 'komamura' ? .95 : .6, flatShading: kind === 'komamura' }), hair: make(hair, { roughness: .5, flatShading: true }),
      eye: make(kind === 'komamura' || kind === 'mayuri' ? '#e0b030' : '#2d2a30', kind === 'komamura' || kind === 'mayuri' ? { emissive: '#6b4a00' } : {}),
      black: make('#17171e'), belt: make('#efece3'), collar: make('#f3f1ea'), tabi: make('#f1efe8'), sandal: make('#5a4230'),
      haori: make(kind === 'shunsui' ? '#e59bb3' : '#f4f2eb', { roughness: .74, side: THREE.DoubleSide }),
      accent: make(kind === 'mayuri' ? '#d4a93a' : kind === 'shunsui' ? '#c9ae78' : '#1b1b21', kind === 'mayuri' ? { metalness: .6, roughness: .35 } : {}),
      muzzle: make('#dcbb90', { flatShading: true }), nose: make('#141214'), paint: make('#131316'),
    }
  }, [kind])
  useImperativeHandle(figure, () => ({ root: root.current!, joints: joints.current, parts: parts.current, hipsY: .92 }), [joints, parts])
  const face = <>
    <P g={sph(.116, 14, 12)} m={m.skin} p={[0, .12, .005]} s={[.95, 1.08, 1]} />
    {kind !== 'komamura' && <P g={box(.11, .06, .075)} m={m.skin} p={[0, .045, .05]} r={[.3, 0, 0]} />}
    {[-1, 1].map(s => <P key={s} g={box(.034, .016, .01)} m={m.eye} p={[s * .043, .125, .12]} />)}
  </>
  const heads: Record<CaptainKind, ReactNode> = {
    ukitake: <>{face}
      <P g={sph(.126, 14, 8, 0, Math.PI * 2, 0, Math.PI * .55)} m={m.hair} p={[0, .15, -.01]} r={[-.3, 0, 0]} />
      <P g={box(.25, .72, .07)} m={m.hair} p={[0, -.15, -.08]} r={[.06, 0, 0]} />
      {[-1, 1].map(s => <P key={s} g={box(.045, .42, .05)} m={m.hair} p={[s * .11, -.06, .06]} r={[0, 0, s * -.04]} />)}
      {ukitakeBangs.map((s, i) => <P key={i} g={cone(.035, s.length, 4)} m={m.hair} p={s.p} r={s.r} />)}
    </>,
    shunsui: <>{face}
      <P g={sph(.126, 14, 8, 0, Math.PI * 2, 0, Math.PI * .5)} m={m.hair} p={[0, .15, -.01]} r={[-.4, 0, 0]} />
      <P g={cone(.07, .42, 6)} m={m.hair} p={[0, -.02, -.12]} r={[2.7, 0, 0]} />
      <P g={box(.1, .04, .03)} m={m.hair} p={[0, .02, .095]} r={[.3, 0, 0]} />
      {/* Straw hat with a wide brim */}
      <P g={cone(.3, .15, 16)} m={m.accent} p={[0, .3, 0]} />
      <P g={cyl(.4, .4, .014, 20)} m={m.accent} p={[0, .235, 0]} r={[.08, 0, 0]} />
    </>,
    unohana: <>{face}
      <P g={sph(.126, 14, 8, 0, Math.PI * 2, 0, Math.PI * .55)} m={m.hair} p={[0, .15, -.01]} r={[-.3, 0, 0]} />
      <P g={box(.22, .24, .08)} m={m.hair} p={[0, .06, -.07]} />
      {[-1, 1].map(s => <P key={s} g={box(.04, .2, .05)} m={m.hair} p={[s * .105, .06, .06]} />)}
    </>,
    komamura: <>
      <P g={sph(.14, 12, 10)} m={m.skin} p={[0, .13, 0]} s={[1, 1, 1.05]} />
      <P g={box(.12, .1, .2)} m={m.muzzle} p={[0, .08, .15]} r={[.12, 0, 0]} />
      <P g={box(.05, .035, .04)} m={m.nose} p={[0, .115, .255]} />
      {[-1, 1].map(s => <group key={s}>
        <P g={box(.034, .02, .012)} m={m.eye} p={[s * .055, .17, .128]} r={[0, 0, s * .2]} />
        <P g={cone(.055, .16, 4)} m={m.skin} p={[s * .09, .3, -.02]} r={[-.15, 0, s * -.3]} />
      </group>)}
      <P g={cone(.2, .2, 10, )} m={m.hair} p={[0, -.03, -.02]} r={[Math.PI, 0, 0]} />
    </>,
    mayuri: <>{face}
      <P g={box(.21, .035, .012)} m={m.paint} p={[0, .125, .117]} />
      <P g={box(.06, .012, .01)} m={m.paint} p={[0, .05, .1]} />
      {/* Golden headdress with swept horns */}
      <P g={cyl(.13, .125, .14, 14)} m={m.accent} p={[0, .24, -.01]} />
      <P g={sph(.13, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2)} m={m.accent} p={[0, .31, -.01]} />
      {[-1, 1].map(s => <P key={s} g={cone(.05, .34, 6)} m={m.accent} p={[s * .2, .2, -.02]} r={[0, 0, s * -1.3]} />)}
    </>,
  }
  const chest = kind === 'unohana'
    // Unohana's long braid falls over the front of her haori.
    ? <group position={[0, .16, .145]}>{Array.from({ length: 7 }, (_, k) => <P key={k} g={sph(.045 - k * .003, 8, 6)} m={m.hair} p={[.01, -k * .075, k * .004]} s={[1, 1.25, .8]} />)}</group>
    : undefined
  return <group ref={root} scale={captainScale[kind]}>
    <Shihakusho bind={bind} m={{ ...m, hand: kind === 'komamura' ? m.skin : undefined }} haori={{ outer: m.haori, lining: m.haori, sleeves: true, length: .74, collar: kind === 'mayuri' }} slots={{ head: heads[kind], chest }} />
  </group>
}

// Memoized: figures only re-render when their own props change.
export const Toshiro = memo(ToshiroFigure)
export const Captain = memo(CaptainFigure)

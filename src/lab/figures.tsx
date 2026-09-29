// PROCEDURAL PLACEHOLDER CHARACTER for the lab: Nemu Kurotsuchi, on the everyday-clothes body so
// her short black dress reads as a skirt. (Mayuri appears as a hologram of the captain figure.)
import { memo, useImperativeHandle, useRef } from 'react'
import type { ReactNode, Ref } from 'react'
import * as THREE from 'three'
import { box, cone, cyl, sph } from '../finale/materials'
import { spikes, useBindings, useFigureMaterials } from '../finale/figure-kit'
import type { Figure } from '../finale/figure-kit'
import { P } from '../finale/characters'
import { Casual } from '../stops/body'

const make = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra })
const nemuBangs = spikes([[.95, 2.85, .1], [.95, -2.85, .1], [1.0, 3.14, .11], [1.02, 2.5, .1], [1.02, -2.5, .1]], .118, [0, .14, 0], -.95)

/** Nemu: black bangs and a long braid, a short black dress, the lieutenant's armband. */
function NemuFigure({ figure }: { figure: Ref<Figure> }) {
  const root = useRef<THREE.Group>(null)
  const { joints, parts, bind } = useBindings()
  const m = useFigureMaterials(() => ({
    skin: make('#f1dccc', { roughness: .6 }), hair: make('#16161f', { roughness: .4, flatShading: true }), eye: make('#3f8f6a'),
    black: make('#17171e'), sock: make('#f1efe8'), shoe: make('#4e3a28'), band: make('#f1efe8'), tie: make('#e9e4d8'),
  }), [])
  useImperativeHandle(figure, () => ({ root: root.current!, joints: joints.current, parts: parts.current, hipsY: .92 }), [joints, parts])
  const braid = Array.from({ length: 7 }, (_, k) => k).reduceRight<ReactNode>((child, k) => <group key={k} name={`seg${k}`} position={[0, k === 0 ? 0 : -.1, 0]}>
    <P g={sph(.042 - k * .003, 8, 6)} m={m.hair} p={[0, -.05, 0]} s={[1, 1.35, .9]} />
    {k === 6 && <P g={cyl(.022, .022, .03, 6)} m={m.tie} p={[0, -.11, 0]} />}
    {child}
  </group>, null)
  return <group ref={root} scale={.94}>
    <Casual bind={bind} sleeves="long" legs="skirt" width={.9} m={{ top: m.black, skin: m.skin, pants: m.black, shoe: m.shoe, sock: m.sock }} slots={{
      head: <>
        <P g={sph(.11, 14, 12)} m={m.skin} p={[0, .12, .005]} s={[.94, 1.06, 1]} />
        <P g={box(.095, .052, .066)} m={m.skin} p={[0, .047, .05]} r={[.3, 0, 0]} />
        {[-1, 1].map(s => <P key={s} g={box(.034, .016, .01)} m={m.eye} p={[s * .042, .124, .113]} />)}
        <P g={sph(.12, 14, 8, 0, Math.PI * 2, 0, Math.PI * .6)} m={m.hair} p={[0, .15, -.012]} r={[-.25, 0, 0]} />
        {nemuBangs.map((s, i) => <P key={i} g={cone(.036, s.length, 4)} m={m.hair} p={s.p} r={s.r} />)}
        {[-1, 1].map(s => <P key={s} g={box(.042, .24, .06)} m={m.hair} p={[s * .104, .02, .02]} />)}
        <group ref={bind.part('braid')} position={[0, .06, -.1]}>{braid}</group>
      </>,
      upperL: <P g={cyl(.074, .074, .08, 10)} m={m.band} p={[0, -.12, 0]} />,
    }} />
  </group>
}

export const Nemu = memo(NemuFigure)

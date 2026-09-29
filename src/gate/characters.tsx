// PROCEDURAL PLACEHOLDER CHARACTERS for the Spirit Gate encounter: original low-poly
// stand-ins for Rukia and Renji built from primitives. They share the joint layout in
// finale/rig.ts, so the keyframed poses carry over when real rigged models replace them.
import { memo, useImperativeHandle, useMemo, useRef } from 'react'
import type { Ref } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { bladeGeometry, box, cone, cyl, getEnvMap, sph, torus } from '../finale/materials'
import { spikes, useBindings, useFigureMaterials } from '../finale/figure-kit'
import type { Figure } from '../finale/figure-kit'
import { P } from '../finale/characters'
import { Shihakusho } from '../finale/shihakusho'

const renjiTail = spikes([[.55, .0, .3], [.4, .5, .26], [.4, -.5, .26], [.75, .35, .28], [.75, -.35, .28], [.25, 0, .24], [.9, 0, .32]], .08, [0, .26, -.1], .9)
const renjiFringe = spikes([[1.0, 2.6, .11], [1.0, -2.6, .11], [1.1, 3.14, .12]], .12, [0, .14, 0], -.9)

/** Rukia: short black hair with a strand between the eyes; Sode no Shirayuki with ribbon. */
function RukiaFigure({ figure }: { figure: Ref<Figure> }) {
  const { gl } = useThree()
  const env = useMemo(() => getEnvMap(gl), [gl])
  const root = useRef<THREE.Group>(null)
  const { joints, parts, bind } = useBindings()
  const m = useFigureMaterials(() => {
    const make = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra })
    return {
      skin: make('#f1d7c6', { roughness: .6 }), hair: make('#14131c', { roughness: .45, flatShading: true }), eye: make('#3b2d5c'),
      black: make('#17171e'), belt: make('#efece3'), collar: make('#f3f1ea'), tabi: make('#f1efe8'), sandal: make('#5a4230'),
      // Shared, animated by the director as the blade turns white on release.
      blade: make('#dfe6ea', { metalness: .9, roughness: .2, envMap: env, envMapIntensity: 1.1, emissive: '#000000' }),
      grip: make('#2e2a35'), tsuba: make('#4c4a50', { metalness: .6, roughness: .4, envMap: env }),
      white: make('#fbfdff', { roughness: .35, emissive: '#bfe9ff', emissiveIntensity: .35 }),
    }
  }, [env])
  useImperativeHandle(figure, () => ({ root: root.current!, joints: joints.current, parts: parts.current, hipsY: .92 }), [joints, parts])
  return <group ref={root} scale={.84}>
    <Shihakusho bind={bind} m={m} arms={.07} slots={{
      head: <>
        <P g={sph(.112, 14, 12)} m={m.skin} p={[0, .12, .005]} s={[.94, 1.08, 1]} />
        <P g={box(.1, .055, .07)} m={m.skin} p={[0, .045, .048]} r={[.3, 0, 0]} />
        {[-1, 1].map(s => <P key={s} g={box(.034, .02, .01)} m={m.eye} p={[s * .042, .125, .117]} />)}
        <P g={sph(.124, 14, 8, 0, Math.PI * 2, 0, Math.PI * .55)} m={m.hair} p={[0, .15, -.008]} r={[-.28, 0, 0]} />
        {[-1, 1].map(s => <P key={s} g={box(.05, .19, .1)} m={m.hair} p={[s * .102, .06, .015]} r={[0, 0, s * -.08]} />)}
        <P g={box(.21, .17, .1)} m={m.hair} p={[0, .085, -.07]} />
        <P g={box(.02, .13, .016)} m={m.hair} p={[.004, .13, .119]} r={[0, 0, .08]} />
      </>,
      hand: <group ref={bind.part('handSword')} position={[0, -.045, .01]} rotation={[Math.PI / 2, 0, 0]}>
        <group rotation={[0, -Math.PI / 2, 0]}>
          <P g={cyl(.016, .017, .22, 8)} m={m.grip} p={[0, -.01, 0]} />
          <group ref={bind.part('tsubaSealed')}><P g={cyl(.04, .04, .012, 12)} m={m.tsuba} p={[0, .105, 0]} /></group>
          <group ref={bind.part('tsubaRing')} visible={false}><P g={torus(.05, .009, 6, 20)} m={m.white} p={[0, .105, 0]} r={[Math.PI / 2, 0, 0]} /></group>
          <group ref={bind.part('blade')} position={[0, .11, 0]}>
            <P g={bladeGeometry('shirayuki', [[-.015, 0], [.016, 0], [.016, .86], [-.015, .92]], .01, .003)} m={m.blade} />
          </group>
          {/* Release ribbon: a chain of thin segments trailing from the pommel. */}
          <group ref={bind.part('ribbon')} position={[0, -.13, 0]} scale={.001}>
            {Array.from({ length: 9 }, (_, k) => k).reduceRight<React.ReactNode>((child, k) => <group key={k} name={`rib${k}`} position={[0, k === 0 ? 0 : -.15, 0]}>
              <P g={box(.034 - k * .002, .15, .004)} m={m.white} p={[0, -.075, 0]} />
              {child}
            </group>, null)}
          </group>
        </group>
      </group>,
    }} />
  </group>
}

/** Renji: tall, red spiked ponytail, white bandana, lieutenant's badge; Zabimaru's hilt. */
function RenjiFigure({ figure }: { figure: Ref<Figure> }) {
  const root = useRef<THREE.Group>(null)
  const { joints, parts, bind } = useBindings()
  const m = useFigureMaterials(() => {
    const make = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra })
    return {
      skin: make('#d9a488', { roughness: .62 }), hair: make('#c3263c', { roughness: .5, flatShading: true }), eye: make('#2a1c14'), tattoo: make('#141014'),
      black: make('#18171d'), belt: make('#efece3'), collar: make('#f1efe8'), tabi: make('#f1efe8'), sandal: make('#5a4230'),
      bandana: make('#f2efe6'), badge: make('#e8e2d0'), badgeWood: make('#8a6a44'), grip: make('#6b1d2c'), tsuba: make('#3a3330', { metalness: .5, roughness: .45 }),
    }
  }, [])
  useImperativeHandle(figure, () => ({ root: root.current!, joints: joints.current, parts: parts.current, hipsY: .92 }), [joints, parts])
  return <group ref={root} scale={1.05}>
    <Shihakusho bind={bind} m={m} slots={{
      head: <>
        <P g={sph(.117, 14, 12)} m={m.skin} p={[0, .12, .005]} s={[.95, 1.1, 1.02]} />
        <P g={box(.115, .065, .08)} m={m.skin} p={[0, .04, .05]} r={[.28, 0, 0]} />
        {[-1, 1].map(s => <group key={s}>
          <P g={box(.034, .016, .01)} m={m.eye} p={[s * .043, .12, .12]} />
          {/* Sharp eyebrow tattoo */}
          <P g={box(.05, .011, .01)} m={m.tattoo} p={[s * .046, .146, .119]} r={[0, 0, s * .28]} />
        </group>)}
        <P g={sph(.127, 14, 8, 0, Math.PI * 2, 0, Math.PI * .5)} m={m.hair} p={[0, .15, -.012]} r={[-.38, 0, 0]} />
        {renjiTail.map((s, i) => <P key={i} g={cone(.06 - (i % 2) * .01, s.length, 5)} m={m.hair} p={s.p} r={s.r} />)}
        {renjiFringe.map((s, i) => <P key={i} g={cone(.035, s.length, 4)} m={m.hair} p={s.p} r={s.r} />)}
        {/* Bandana across the brow, tied at the back */}
        <P g={cyl(.122, .124, .045, 16, true)} m={m.bandana} p={[0, .185, .004]} r={[-.18, 0, 0]} s={[1, 1, 1.02]} />
        <P g={box(.05, .12, .012)} m={m.bandana} p={[.03, .14, -.13]} r={[.3, 0, -.4]} />
        <P g={box(.05, .11, .012)} m={m.bandana} p={[-.03, .14, -.13]} r={[.3, 0, .35]} />
      </>,
      leftArm: <group position={[.066, -.1, 0]}>
        <P g={cyl(.074, .074, .05, 10, true)} m={m.badge} />
        <P g={box(.016, .11, .085)} m={m.badgeWood} p={[.018, -.005, 0]} />
      </group>,
      hand: <group ref={bind.part('handSword')} position={[0, -.045, .01]} rotation={[Math.PI / 2, 0, 0]}>
        <group rotation={[0, -Math.PI / 2, 0]}>
          <P g={cyl(.018, .019, .27, 8)} m={m.grip} p={[0, -.03, 0]} />
          <P g={cyl(.042, .042, .014, 10)} m={m.tsuba} p={[0, .112, 0]} s={[1.25, 1, 1]} />
          {/* The segmented blade is drawn in world space by the director; this marks its base. */}
          <group ref={bind.part('bladeBase')} position={[0, .125, 0]} />
        </group>
      </group>,
    }} />
  </group>
}

// Memoized: figures only re-render when their own props change.
export const Rukia = memo(RukiaFigure)
export const Renji = memo(RenjiFigure)

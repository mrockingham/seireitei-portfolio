// PROCEDURAL PLACEHOLDER CHARACTERS.
// Stylized, original low-poly stand-ins built from primitives so the finale can be
// choreographed now. Replace with rigged, licensed/original character models later;
// keep the joint names in rig.ts so the pose tracks continue to apply.
import { memo, useImperativeHandle, useMemo, useRef } from 'react'
import type { ReactNode, Ref, RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { bladeGeometry, box, cloth, cone, cyl, getEnvMap, sph, torus } from './materials'
import { spikes, useBindings, useFigureMaterials } from './figure-kit'
import type { Figure, V3 } from './figure-kit'

export type { Figure } from './figure-kit'

/** One shadow-casting primitive part of a figure. */
export function P({ g, m, p, r, s, children }: { g: THREE.BufferGeometry; m: THREE.Material; p?: V3; r?: V3; s?: V3 | number; children?: ReactNode }) {
  return <mesh geometry={g} material={m} position={p} rotation={r} scale={s} castShadow receiveShadow>{children}</mesh>
}

const ichigoSpikes = spikes([[.05, 0, .25], [.45, .55, .24], [.45, -.55, .24], [.55, 1.5, .21], [.55, -1.5, .21], [.8, 0, .24], [.9, .85, .22], [.9, -.85, .22], [1.2, .35, .2], [1.2, -.35, .2], [1.0, 2.1, .17], [1.0, -2.1, .17], [.35, 2.65, .18], [1.35, 1.35, .15], [1.35, -1.35, .15]], .128, [0, .15, -.005])
const ichigoBangs = spikes([[.95, 2.75, .14], [.95, -2.75, .14], [1.05, 3.14, .15]], .122, [0, .14, 0], -.9)

function sleeveCuffs(m: THREE.Material, y: number, r: number, n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const a = i / n * Math.PI * 2
    return <P key={i} g={cone(.026, .1, 4)} m={m} p={[Math.sin(a) * r, y, Math.cos(a) * r]} r={[Math.PI, 0, 0]} />
  })
}
function hem(m: THREE.Material, y: number, r: number, from: number, to: number, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const a = from + (to - from) * (i + .5) / n
    return <P key={i} g={cone(.05, .16 + (i % 3) * .05, 4)} m={m} p={[Math.sin(a) * r, y - .06 - (i % 3) * .025, Math.cos(a) * r]} r={[Math.PI, a, 0]} />
  })
}


/** Ichigo: white shihakushō with a black belt (Shikai) and black coat, red belt, black blade (Bankai). */
function IchigoFigure({ figure }: { figure: Ref<Figure> }) {
  const { gl } = useThree()
  const env = useMemo(() => getEnvMap(gl), [gl])
  const root = useRef<THREE.Group>(null)
  const { joints, parts, bind } = useBindings()
  const planes = useMemo(() => ({ shikai: new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e4), bankai: new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e4) }), [])
  const m = useFigureMaterials(() => {
    const make = (color: string, set: 'shikai' | 'bankai' | null, extra: THREE.MeshStandardMaterialParameters = {}) => {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: .82, ...extra, ...(set ? { clippingPlanes: [planes[set]], clipShadows: true } : {}) })
      mat.userData.form = set
      return mat
    }
    return {
      skin: make('#e0ae8b', null, { roughness: .65 }), hair: make('#ee7424', null, { roughness: .55, flatShading: true }),
      brow: make('#b04d17', null), eye: make('#1c1512', null), tabi: make('#efece4', null), sandal: make('#5f432c', null),
      white: make('#f3f0e7', 'shikai'), whiteShade: make('#d9d4c6', 'shikai'), belt: make('#121318', 'shikai'), collar: make('#1a1b21', 'shikai'), strap: make('#7a1d24', 'shikai'),
      blade: make('#e2e8ec', 'shikai', { metalness: .92, roughness: .22, envMap: env, envMapIntensity: 1.15 }), bladeEdge: make('#f8fbff', 'shikai', { metalness: .6, roughness: .12, envMap: env }), wrap: make('#f6f3ec', 'shikai'),
      coat: make('#15151c', 'bankai', { roughness: .72 }), lining: make('#9f1229', 'bankai', { side: THREE.BackSide, roughness: .7 }), red: make('#c81d3a', 'bankai', { roughness: .6 }),
      hakama: make('#17171e', 'bankai'), black: make('#0c0c11', 'bankai', { metalness: .75, roughness: .28, envMap: env, envMapIntensity: .9 }),
      chain: make('#3a3a45', 'bankai', { metalness: .85, roughness: .3, envMap: env }), redEdge: make('#d42a45', 'bankai', { emissive: '#4a0710' }),
    }
  }, [env, planes])
  useImperativeHandle(figure, () => {
    const shikai: THREE.Mesh[] = [], bankai: THREE.Mesh[] = []
    root.current!.traverse(o => { if (o instanceof THREE.Mesh) { const f = (o.material as THREE.Material).userData.form; if (f === 'shikai') shikai.push(o); if (f === 'bankai') bankai.push(o) } })
    const setForm = (form: 'shikai' | 'bankai' | number) => {
      const wipe = typeof form === 'number'
      shikai.forEach(o => { o.visible = form !== 'bankai' })
      bankai.forEach(o => { o.visible = form !== 'shikai' })
      // eslint-disable-next-line react/immutability -- clipping planes are owned by this figure and animated per frame.
      planes.shikai.constant = wipe ? -form : 1e4
      planes.bankai.constant = wipe ? form : 1e4
    }
    setForm('shikai')
    return { root: root.current!, joints: joints.current, parts: parts.current, hipsY: .92, setForm }
  }, [joints, parts, planes])

  const gap = .95
  return <group ref={root}>
    <group ref={bind.joint('hips')} position={[0, .92, 0]}>
      {/* Shikai: white hakama and black belt */}
      <P g={cyl(.168, .205, .27)} m={m.white} p={[0, -.08, 0]} s={[1, 1, .82]} />
      <P g={cyl(.172, .172, .08)} m={m.belt} p={[0, .03, 0]} s={[1, 1, .8]} />
      {/* Bankai: black hakama, red belt, long coat with red lining */}
      <P g={cyl(.168, .205, .27)} m={m.hakama} p={[0, -.08, 0]} s={[1, 1, .82]} />
      <P g={cyl(.176, .176, .085)} m={m.red} p={[0, .03, 0]} s={[1, 1, .82]} />
      {(['coatL', 'coatR'] as const).map((name, side) => {
        const t0 = side === 0 ? gap / 2 : Math.PI, tl = Math.PI - gap / 2
        return <group key={name} ref={bind.part(name)} position={[0, .06, 0]}>
          <P g={cloth(.2, .4, .96, 10, true, t0, tl)} m={m.coat} p={[0, -.48, 0]} s={[1, 1, .86]} />
          <P g={cloth(.195, .39, .95, 10, true, t0, tl)} m={m.lining} p={[0, -.48, 0]} s={[1, 1, .86]} />
          <group scale={[1, 1, .86]}>{hem(m.coat, -.96, .39, t0, t0 + tl, 7)}</group>
        </group>
      })}
      <group ref={bind.joint('spine')} position={[0, .08, 0]}>
        <P g={cyl(.158, .166, .17)} m={m.white} p={[0, .04, 0]} s={[1, 1, .74]} />
        <P g={cyl(.164, .172, .17)} m={m.coat} p={[0, .04, 0]} s={[1, 1, .76]} />
        <group ref={bind.joint('chest')} position={[0, .2, 0]}>
          <P g={cyl(.2, .158, .37)} m={m.white} s={[1, 1, .7]} />
          <P g={cyl(.208, .165, .37)} m={m.coat} s={[1, 1, .72]} />
          {[-1, 1].map(s => <group key={s}>
            <P g={box(.04, .31, .02)} m={m.collar} p={[s * .045, .03, .135]} r={[-.12, 0, -s * .36]} />
            <P g={box(.045, .33, .022)} m={m.redEdge} p={[s * .05, .03, .142]} r={[-.12, 0, -s * .36]} />
            <P g={sph(.085, 10, 8)} m={m.white} p={[s * .19, .13, 0]} s={[1, .85, .9]} />
            <P g={sph(.09, 10, 8)} m={m.coat} p={[s * .19, .13, 0]} s={[1, .85, .9]} />
          </group>)}
          <P g={box(.055, .6, .02)} m={m.strap} p={[0, .0, .137]} r={[-.1, 0, .72]} />
          <P g={box(.055, .6, .02)} m={m.strap} p={[0, .0, -.137]} r={[.1, 0, .72]} />
          <P g={torus(.078, .026, 6, 14)} m={m.coat} p={[0, .19, -.01]} r={[Math.PI / 2 + .2, 0, 0]} />
          <group ref={bind.part('mark')} position={[0, .03, -.15]} />
          <group ref={bind.joint('neck')} position={[0, .2, 0]}>
            <P g={cyl(.048, .055, .1, 8)} m={m.skin} p={[0, .02, 0]} />
            <group ref={bind.joint('head')} position={[0, .07, 0]}>
              <P g={sph(.118, 14, 12)} m={m.skin} p={[0, .12, .005]} s={[.96, 1.08, 1.02]} />
              <P g={box(.12, .06, .08)} m={m.skin} p={[0, .045, .05]} r={[.3, 0, 0]} />
              {[-1, 1].map(s => <group key={s}>
                <P g={box(.032, .014, .01)} m={m.eye} p={[s * .043, .125, .123]} />
                <P g={box(.05, .014, .012)} m={m.brow} p={[s * .045, .152, .121]} r={[0, 0, s * -.28]} />
              </group>)}
              <P g={sph(.129, 14, 8, 0, Math.PI * 2, 0, Math.PI * .56)} m={m.hair} p={[0, .15, -.012]} r={[-.42, 0, 0]} />
              {ichigoSpikes.map((s, i) => <P key={i} g={cone(.05 + (i % 3) * .008, s.length, 5)} m={m.hair} p={s.p} r={s.r} />)}
              {ichigoBangs.map((s, i) => <P key={i} g={cone(.04, s.length, 4)} m={m.hair} p={s.p} r={s.r} />)}
            </group>
          </group>
          {(['L', 'R'] as const).map(side => {
            const s = side === 'L' ? 1 : -1
            return <group key={side} ref={bind.joint(`shoulder${side}`)} position={[s * .2, .13, 0]}>
              <P g={cyl(.07, .062, .27, 8)} m={m.white} p={[0, -.13, 0]} />
              <P g={cyl(.074, .066, .27, 8)} m={m.coat} p={[0, -.13, 0]} />
              <group ref={bind.joint(`elbow${side}`)} position={[0, -.27, 0]}>
                <P g={cyl(.062, .1, .2, 8)} m={m.white} p={[0, -.09, 0]} />
                <P g={cyl(.064, .115, .22, 8, true)} m={m.coat} p={[0, -.1, 0]} />
                <P g={cyl(.06, .11, .21, 8, true)} m={m.lining} p={[0, -.1, 0]} />
                {sleeveCuffs(m.coat, -.23, .11)}
                <P g={cyl(.035, .038, .18, 6)} m={m.skin} p={[0, -.14, 0]} />
                <group ref={bind.joint(`wrist${side}`)} position={[0, -.24, 0]}>
                  <P g={box(.07, .095, .05)} m={m.skin} p={[0, -.035, .005]} />
                  {side === 'R' && <group ref={bind.part('handSword')} position={[0, -.045, .01]} rotation={[Math.PI / 2, 0, 0]}>
                    <group rotation={[0, -Math.PI / 2, 0]}>
                      {/* Zangetsu (Shikai): oversized cleaver with a cloth-wrapped hilt */}
                      <P g={cyl(.02, .022, .3, 8)} m={m.wrap} p={[0, -.02, 0]} />
                      <P g={bladeGeometry('zangetsu', [[-.105, .13], [.115, .13], [.115, 1.26], [-.105, 1.46]], .024)} m={m.blade} />
                      <P g={box(.012, 1.13, .03)} m={m.bladeEdge} p={[.118, .695, 0]} />
                      <group ref={bind.part('swordCloth')} position={[0, -.17, 0]}><P g={box(.035, .42, .006)} m={m.wrap} p={[0, -.21, 0]} /></group>
                      {/* Tensa Zangetsu (Bankai): slim black blade, pinwheel guard, broken chain */}
                      <P g={cyl(.016, .017, .24, 8)} m={m.black} p={[0, -.02, 0]} />
                      <P g={box(.07, .013, .07)} m={m.black} p={[0, .115, 0]} />
                      {[0, 1, 2, 3].map(k => <group key={k} rotation={[0, k * Math.PI / 2, 0]}>
                        <P g={box(.028, .013, .075)} m={m.black} p={[0, .115, .06]} />
                        <P g={box(.045, .013, .022)} m={m.black} p={[.02, .115, .092]} />
                      </group>)}
                      <P g={bladeGeometry('tensa', [[-.024, .12], [.026, .12], [.026, 1.1], [-.024, 1.18]], .012, .003)} m={m.black} />
                      <P g={box(.006, .95, .014)} m={m.chain} p={[.028, .6, 0]} />
                      <group ref={bind.part('chain')} position={[0, -.15, 0]}>
                        {[0, 1, 2, 3, 4].map(k => <P key={k} g={torus(.017, .0045, 5, 10)} m={m.chain} p={[0, -k * .027, 0]} r={[0, k % 2 ? Math.PI / 2 : 0, 0]} />)}
                      </group>
                    </group>
                  </group>}
                </group>
              </group>
            </group>
          })}
          {/* Exploration: the Shikai blade rides on the back. */}
          <group ref={bind.part('backSword')} position={[-.13, .2, -.17]} rotation={[0, 0, -2.8]} scale={.86} visible={false}>
            <P g={cyl(.02, .022, .3, 8)} m={m.wrap} p={[0, -.02, 0]} />
            <P g={bladeGeometry('zangetsu', [[-.105, .13], [.115, .13], [.115, 1.26], [-.105, 1.46]], .024)} m={m.blade} />
          </group>
        </group>
      </group>
      {(['L', 'R'] as const).map(side => {
        const s = side === 'L' ? 1 : -1
        return <group key={side} ref={bind.joint(`thigh${side}`)} position={[s * .095, -.05, 0]}>
          <P g={cloth(.1, .13, .44)} m={m.white} p={[0, -.2, 0]} />
          <P g={cloth(.1, .13, .44)} m={m.hakama} p={[0, -.2, 0]} />
          <group ref={bind.joint(`knee${side}`)} position={[0, -.42, 0]}>
            <P g={cloth(.128, .15, .36)} m={m.white} p={[0, -.17, 0]} />
            <P g={cloth(.128, .15, .36)} m={m.hakama} p={[0, -.17, 0]} />
            <group ref={bind.joint(`ankle${side}`)} position={[0, -.4, 0]}>
              <P g={box(.085, .065, .2)} m={m.tabi} p={[0, -.01, .045]} />
              <P g={box(.095, .02, .23)} m={m.sandal} p={[0, -.05, .045]} />
            </group>
          </group>
        </group>
      })}
    </group>
  </group>
}

/** Byakuya: white haori over black shihakushō, silver-green scarf, kenseikan, katana. */
function ByakuyaFigure({ figure }: { figure: Ref<Figure> }) {
  const { gl } = useThree()
  const env = useMemo(() => getEnvMap(gl), [gl])
  const root = useRef<THREE.Group>(null)
  const { joints, parts, bind } = useBindings()
  const m = useFigureMaterials(() => {
    const make = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra })
    return {
      skin: make('#efd6c3', { roughness: .6 }), hair: make('#121219', { roughness: .45, flatShading: true }), eye: make('#2b2f38'),
      black: make('#16161d'), haori: make('#f4f2eb', { roughness: .74 }), haoriShade: make('#dcd9cf'), glove: make('#f7f5ee'),
      scarf: make('#dbe6de', { roughness: .5, metalness: .1, emissive: '#1c2622' }), kenseikan: make('#fbfbf6', { roughness: .35 }),
      belt: make('#23232d'), cord: make('#e8e4d6'), tabi: make('#f1efe8'), sandal: make('#4a3727'),
      blade: make('#e6ecef', { metalness: .92, roughness: .18, envMap: env, envMapIntensity: 1.2 }), tsuba: make('#5f5641', { metalness: .6, roughness: .4, envMap: env }), grip: make('#2c2433'),
    }
  }, [env])
  useImperativeHandle(figure, () => ({ root: root.current!, joints: joints.current, parts: parts.current, hipsY: .95 }), [joints, parts])

  const gap = .85
  return <group ref={root}>
    <group ref={bind.joint('hips')} position={[0, .95, 0]}>
      <P g={cyl(.17, .21, .28)} m={m.black} p={[0, -.08, 0]} s={[1, 1, .82]} />
      <P g={cyl(.175, .175, .08)} m={m.belt} p={[0, .03, 0]} s={[1, 1, .8]} />
      <P g={box(.12, .018, .02)} m={m.cord} p={[.05, .03, .15]} r={[0, 0, .2]} />
      {(['haoriL', 'haoriR'] as const).map((name, side) => {
        const t0 = side === 0 ? gap / 2 : Math.PI, tl = Math.PI - gap / 2
        return <group key={name} ref={bind.part(name)} position={[0, .07, 0]}>
          <P g={cloth(.215, .34, .66, 10, true, t0, tl)} m={m.haori} p={[0, -.33, 0]} s={[1, 1, .84]} />
          <P g={cloth(.21, .335, .65, 10, true, t0, tl)} m={m.haoriShade} p={[0, -.33, 0]} s={[1, 1, .84]} />
        </group>
      })}
      <group ref={bind.joint('spine')} position={[0, .08, 0]}>
        <P g={cyl(.16, .168, .18)} m={m.black} p={[0, .04, 0]} s={[1, 1, .74]} />
        <group ref={bind.joint('chest')} position={[0, .21, 0]}>
          <P g={cyl(.198, .158, .38)} m={m.black} s={[1, 1, .7]} />
          <P g={cyl(.214, .172, .39, 12, true, .5, Math.PI * 2 - 1)} m={m.haori} p={[0, -.005, 0]} s={[1, 1, .72]} />
          <P g={cyl(.21, .168, .385, 12, true, .5, Math.PI * 2 - 1)} m={m.haoriShade} p={[0, -.005, 0]} s={[1, 1, .72]} />
          {[-1, 1].map(s => <group key={s}>
            <P g={box(.035, .3, .018)} m={m.cord} p={[s * .045, .04, .136]} r={[-.12, 0, -s * .34]} />
            <P g={sph(.09, 10, 8)} m={m.haori} p={[s * .19, .14, 0]} s={[1, .85, .9]} />
          </group>)}
          <P g={torus(.085, .036, 6, 14)} m={m.scarf} p={[0, .19, 0]} r={[Math.PI / 2 + .15, 0, 0]} />
          {/* Scarf tails: chained segments so they can flutter. */}
          {[-1, 1].map(s => <group key={s} ref={bind.part(s < 0 ? 'scarfA' : 'scarfB')} position={[s * .05, .16, -.1]}>
            {[0, 1, 2, 3, 4, 5].reduceRight<ReactNode>((child, k) => <group key={k} name={`seg${k}`} position={[0, k === 0 ? 0 : -.17, 0]}>
              <P g={box(.075 - k * .005, .18, .01)} m={m.scarf} p={[0, -.085, 0]} />
              {child}
            </group>, null)}
          </group>)}
          <group ref={bind.joint('neck')} position={[0, .21, 0]}>
            <P g={cyl(.046, .052, .1, 8)} m={m.skin} p={[0, .02, 0]} />
            <group ref={bind.joint('head')} position={[0, .07, 0]}>
              <P g={sph(.116, 14, 12)} m={m.skin} p={[0, .125, .005]} s={[.94, 1.1, 1]} />
              <P g={box(.11, .06, .075)} m={m.skin} p={[0, .045, .05]} r={[.3, 0, 0]} />
              {[-1, 1].map(s => <P key={s} g={box(.034, .012, .01)} m={m.eye} p={[s * .042, .13, .12]} r={[0, 0, s * .1]} />)}
              <P g={sph(.126, 14, 8, 0, Math.PI * 2, 0, Math.PI * .55)} m={m.hair} p={[0, .15, -.01]} r={[-.3, 0, 0]} />
              <P g={cyl(.118, .07, .36, 8)} m={m.hair} p={[0, .04, -.07]} r={[.1, 0, 0]} s={[1, 1, .55]} />
              {[-1, 1].map(s => <P key={s} g={box(.045, .3, .05)} m={m.hair} p={[s * .105, .03, .055]} r={[0, 0, s * -.05]} />)}
              <P g={box(.022, .15, .018)} m={m.hair} p={[.012, .125, .118]} r={[0, 0, -.12]} />
              {/* Kenseikan hair ornaments */}
              {[0, 1, 2].map(k => <P key={k} g={cyl(.016, .016, .12, 6)} m={m.kenseikan} p={[.035 + k * .033, .235 - k * .012, .02 - k * .01]} r={[0, 0, -.45]} />)}
              <P g={cyl(.012, .012, .14, 6)} m={m.kenseikan} p={[-.09, .2, .01]} r={[.1, 0, .6]} />
            </group>
          </group>
          {(['L', 'R'] as const).map(side => {
            const s = side === 'L' ? 1 : -1
            return <group key={side} ref={bind.joint(`shoulder${side}`)} position={[s * .2, .14, 0]}>
              <P g={cyl(.074, .066, .28, 8)} m={m.haori} p={[0, -.13, 0]} />
              <group ref={bind.joint(`elbow${side}`)} position={[0, -.28, 0]}>
                <P g={cyl(.066, .125, .23, 8, true)} m={m.haori} p={[0, -.1, 0]} />
                <P g={cyl(.062, .12, .22, 8, true)} m={m.black} p={[0, -.1, 0]} />
                <P g={cyl(.038, .042, .2, 6)} m={m.glove} p={[0, -.14, 0]} />
                <group ref={bind.joint(`wrist${side}`)} position={[0, -.25, 0]}>
                  <P g={box(.07, .095, .05)} m={m.glove} p={[0, -.035, .005]} />
                  {side === 'R' && <group ref={bind.part('handSword')} position={[0, -.045, .01]} rotation={[Math.PI / 2, 0, 0]}>
                    <group rotation={[0, -Math.PI / 2, 0]}>
                      <P g={cyl(.017, .018, .25, 8)} m={m.grip} p={[0, -.02, 0]} />
                      <P g={cyl(.046, .046, .012, 12)} m={m.tsuba} p={[0, .112, 0]} />
                      <group ref={bind.part('blade')} position={[0, .12, 0]}>
                        <P g={bladeGeometry('senbonzakura', [[-.016, 0], [.017, 0], [.017, .84], [-.016, .9]], .011, .003)} m={m.blade} />
                      </group>
                    </group>
                  </group>}
                </group>
              </group>
            </group>
          })}
        </group>
      </group>
      {(['L', 'R'] as const).map(side => {
        const s = side === 'L' ? 1 : -1
        return <group key={side} ref={bind.joint(`thigh${side}`)} position={[s * .097, -.05, 0]}>
          <P g={cloth(.1, .13, .45)} m={m.black} p={[0, -.2, 0]} />
          <group ref={bind.joint(`knee${side}`)} position={[0, -.44, 0]}>
            <P g={cloth(.128, .152, .38)} m={m.black} p={[0, -.18, 0]} />
            <group ref={bind.joint(`ankle${side}`)} position={[0, -.41, 0]}>
              <P g={box(.085, .065, .2)} m={m.tabi} p={[0, -.01, .045]} />
              <P g={box(.095, .02, .23)} m={m.sandal} p={[0, -.05, .045]} />
            </group>
          </group>
        </group>
      })}
    </group>
  </group>
}

/** World-space katana used when Byakuya lets his sword fall into the ground. */
function LooseKatanaFigure({ object }: { object: RefObject<THREE.Group | null> }) {
  const { gl } = useThree()
  const env = useMemo(() => getEnvMap(gl), [gl])
  const m = useFigureMaterials(() => ({
    blade: new THREE.MeshStandardMaterial({ color: '#e6ecef', metalness: .92, roughness: .18, envMap: env, envMapIntensity: 1.2 }),
    tsuba: new THREE.MeshStandardMaterial({ color: '#5f5641', metalness: .6, roughness: .4, envMap: env }),
    grip: new THREE.MeshStandardMaterial({ color: '#2c2433', roughness: .8 }),
  }), [env])
  // Matches the hand mount's inner rotation so the drop continues seamlessly.
  return <group ref={object} visible={false}>
    <group rotation={[0, -Math.PI / 2, 0]}>
      <P g={cyl(.017, .018, .25, 8)} m={m.grip} p={[0, -.02, 0]} />
      <P g={cyl(.046, .046, .012, 12)} m={m.tsuba} p={[0, .112, 0]} />
      <P g={bladeGeometry('senbonzakura', [[-.016, 0], [.017, 0], [.017, .84], [-.016, .9]], .011, .003)} m={m.blade} p={[0, .12, 0]} />
    </group>
  </group>
}

// Memoized: figures only re-render when their own props change.
export const Ichigo = memo(IchigoFigure)
export const Byakuya = memo(ByakuyaFigure)
export const LooseKatana = memo(LooseKatanaFigure)

// PROCEDURAL PLACEHOLDER CHARACTERS for the Kuchiki garden: original low-poly stand-ins for
// Soi Fon and Yoruichi on the shared joint layout, so the pose tracks transfer to real models.
import { memo, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react'
import type { ReactNode, Ref } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { bladeGeometry, box, cone, cyl, getEnvMap, sph, torus } from '../finale/materials'
import { spikes, useBindings, useFigureMaterials } from '../finale/figure-kit'
import type { Figure } from '../finale/figure-kit'
import { P } from '../finale/characters'
import { Shihakusho } from '../finale/shihakusho'

const make = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra })
const soiBangs = spikes([[.95, 2.75, .1], [.95, -2.75, .1], [1.0, 3.14, .11], [1.05, 2.35, .09], [1.05, -2.35, .09]], .118, [0, .14, 0], -.9)
const yoruBangs = spikes([[.9, 2.8, .11], [.9, -2.8, .11], [1.0, 3.14, .1], [1.1, 2.4, .1], [1.1, -2.4, .1]], .116, [0, .14, 0], -.85)

/**
 * A hanging chain of segments (braid, ponytail, sash tail). Each segment is a group named
 * `seg{k}` nested in the previous one, so the director can sway it and let it hang with gravity.
 */
function Chain({ count, length, children }: { count: number; length: number; children: (k: number) => ReactNode }) {
  return <>{Array.from({ length: count }, (_, k) => k).reduceRight<ReactNode>((child, k) => <group key={k} name={`seg${k}`} position={[0, k === 0 ? 0 : -length, 0]}>
    {children(k)}
    {child}
  </group>, null)}</>
}

/**
 * Soi Fon: black bob with two long braids wrapped in white cloth and tipped with gold rings,
 * sleeveless captain's haori, yellow sash, and Suzumebachi (a wakizashi worn across the small of
 * her back that becomes a gold stinger on her right middle finger). With `ghost`, every part uses
 * that one material: the flash-step afterimages.
 */
function SoiFonFigure({ figure, ghost }: { figure: Ref<Figure>; ghost?: THREE.Material }) {
  const { gl } = useThree()
  const env = useMemo(() => getEnvMap(gl), [gl])
  const root = useRef<THREE.Group>(null)
  const { joints, parts, bind } = useBindings()
  const base = useFigureMaterials(() => ({
    skin: make('#f2d9c7', { roughness: .6 }), hair: make('#15151c', { roughness: .45, flatShading: true }), eye: make('#50545e'),
    black: make('#16161d'), belt: make('#dba73a', { roughness: .55 }), collar: make('#f1eee6'), tabi: make('#f1efe8'), sandal: make('#4e3a28'),
    haori: make('#f4f2eb', { roughness: .74, side: THREE.DoubleSide }), cloth: make('#f2efe7', { roughness: .7 }),
    gold: make('#d8aa3c', { metalness: .75, roughness: .28, envMap: env, emissive: '#000000' }), lacquer: make('#1d1a21', { metalness: .3, roughness: .35, envMap: env }),
    blade: make('#e6ecef', { metalness: .92, roughness: .18, envMap: env, envMapIntensity: 1.2, emissive: '#000000' }), grip: make('#c59a32', { roughness: .6 }),
  }), [env])
  const m = useMemo(() => ghost ? Object.fromEntries(Object.keys(base).map(k => [k, ghost])) as typeof base : base, [base, ghost])
  useImperativeHandle(figure, () => {
    // The director tears the haori away when Shunkō erupts.
    root.current!.userData.haori = ghost ? undefined : base.haori
    return { root: root.current!, joints: joints.current, parts: parts.current, hipsY: .92 }
  }, [joints, parts, ghost, base])
  useLayoutEffect(() => {
    // Afterimages glow but cast no shadows.
    if (ghost) root.current?.traverse(o => { o.castShadow = false })
  }, [ghost])
  const braid = (side: 1 | -1) => <group ref={bind.part(side > 0 ? 'braidL' : 'braidR')} position={[side * .07, .08, -.1]}>
    <Chain count={5} length={.105}>{k => <>
      <P g={cyl(.021, .019, .1, 6)} m={m.cloth} p={[0, -.05, 0]} />
      <P g={cyl(.023, .023, .012, 6)} m={m.hair} p={[0, -.1, 0]} />
      {k === 4 && <P g={torus(.042, .008, 5, 14)} m={m.gold} p={[0, -.15, 0]} r={[0, Math.PI / 2, 0]} />}
    </>}</Chain>
  </group>
  return <group ref={root} scale={.86}>
    <Shihakusho bind={bind} m={{ ...m, upper: m.skin }} arms={0} haori={{ outer: m.haori, lining: m.haori, sleeves: false, length: .6 }} slots={{
      head: <>
        <P g={sph(.112, 14, 12)} m={m.skin} p={[0, .12, .005]} s={[.94, 1.06, 1]} />
        <P g={box(.1, .055, .07)} m={m.skin} p={[0, .048, .05]} r={[.3, 0, 0]} />
        {[-1, 1].map(s => <P key={s} g={box(.034, .014, .01)} m={m.eye} p={[s * .042, .125, .116]} r={[0, 0, s * -.12]} />)}
        <P g={sph(.122, 14, 8, 0, Math.PI * 2, 0, Math.PI * .6)} m={m.hair} p={[0, .15, -.012]} r={[-.25, 0, 0]} />
        {soiBangs.map((s, i) => <P key={i} g={cone(.034, s.length, 4)} m={m.hair} p={s.p} r={s.r} />)}
        {[-1, 1].map(s => <P key={s} g={box(.04, .15, .11)} m={m.hair} p={[s * .104, .1, -.008]} />)}
        <P g={box(.19, .12, .06)} m={m.hair} p={[0, .085, -.095]} />
        {braid(1)}{braid(-1)}
      </>,
      waist: <>
        {/* Sash bow and tails at the back. */}
        <P g={box(.09, .07, .05)} m={m.belt} p={[0, .04, -.16]} />
        {[-1, 1].map(s => <P key={s} g={torus(.045, .016, 5, 10, Math.PI * 1.4)} m={m.belt} p={[s * .06, .05, -.17]} r={[0, 0, s > 0 ? -.6 : Math.PI + .6]} s={[1, .8, 1]} />)}
        <group ref={bind.part('sash')} position={[0, .01, -.17]}>
          {[-1, 1].map(s => <group key={s} position={[s * .025, 0, 0]} rotation={[0, 0, s * .12]}>
            <Chain count={3} length={.12}>{() => <P g={box(.05, .12, .012)} m={m.belt} p={[0, -.06, 0]} />}</Chain>
          </group>)}
        </group>
        {/* Scabbard across the small of the back; the hilt rides on her right. */}
        <group position={[0, -.06, -.2]} rotation={[0, 0, Math.PI / 2]}>
          <P g={cyl(.018, .021, .42, 8)} m={m.lacquer} />
          <P g={cyl(.022, .022, .03, 8)} m={m.gold} p={[0, -.2, 0]} />
          <group ref={bind.part('sheathedHilt')}>
            <P g={cyl(.03, .03, .01, 10)} m={m.gold} p={[0, .215, 0]} />
            <P g={cyl(.016, .017, .15, 8)} m={m.grip} p={[0, .3, 0]} />
          </group>
        </group>
      </>,
      hand: <>
        {/* Sealed Suzumebachi, drawn. */}
        <group ref={bind.part('handBlade')} position={[0, -.045, .01]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
          <group rotation={[0, -Math.PI / 2, 0]}>
            <P g={cyl(.016, .017, .15, 8)} m={m.grip} p={[0, -.01, 0]} />
            <P g={cyl(.03, .03, .01, 10)} m={m.gold} p={[0, .07, 0]} />
            <group ref={bind.part('blade')} position={[0, .075, 0]}>
              <P g={bladeGeometry('suzumebachi', [[-.013, 0], [.014, 0], [.014, .36], [-.013, .4]], .009, .003)} m={m.blade} />
            </group>
          </group>
        </group>
        {/* Shikai: a gold stinger on the middle finger, a hand guard, and a short chain. */}
        <group ref={bind.part('stinger')} visible={false}>
          <P g={cyl(.047, .047, .03, 10, true)} m={m.gold} p={[0, .005, 0]} />
          <P g={box(.07, .065, .012)} m={m.lacquer} p={[0, -.035, .03]} />
          <P g={box(.05, .035, .014)} m={m.gold} p={[0, -.03, .036]} />
          <P g={torus(.014, .005, 5, 10)} m={m.gold} p={[0, -.078, 0]} r={[Math.PI / 2, 0, 0]} />
          <P g={cone(.017, .21, 6)} m={m.gold} p={[0, -.185, 0]} r={[Math.PI, 0, 0]} />
          <P g={cyl(.019, .019, .02, 6)} m={m.lacquer} p={[0, -.1, 0]} />
          {[0, 1, 2, 3].map(k => <P key={k} g={torus(.009, .003, 4, 8)} m={m.gold} p={[.036, -.012 - k * .018, .02]} r={[0, k % 2 ? Math.PI / 2 : 0, 0]} />)}
        </group>
      </>,
    }} />
  </group>
}

/**
 * Yoruichi: dark skin, a long purple ponytail, gold eyes; a sleeveless orange top over a black
 * bodysuit, tan sash, and wrapped shins. Slimmer than the shihakushō figures, same joints.
 */
function YoruichiFigure({ figure }: { figure: Ref<Figure> }) {
  const root = useRef<THREE.Group>(null)
  const { joints, parts, bind } = useBindings()
  const m = useFigureMaterials(() => ({
    skin: make('#8c5a3c', { roughness: .55 }), hair: make('#4b2d68', { roughness: .45, flatShading: true }), eye: make('#e8b63a', { emissive: '#6b4a00' }),
    top: make('#cf6d2a', { roughness: .7 }), suit: make('#18181f', { roughness: .65 }), sash: make('#c29b62', { roughness: .7 }),
    wrap: make('#ebe5d8'), shoe: make('#1c1b21'), band: make('#e9e4d8'),
  }), [])
  useImperativeHandle(figure, () => ({ root: root.current!, joints: joints.current, parts: parts.current, hipsY: .92 }), [joints, parts])
  return <group ref={root} scale={.92}>
    <group ref={bind.joint('hips')} position={[0, .92, 0]}>
      <P g={cyl(.148, .165, .22, 10)} m={m.suit} p={[0, -.07, 0]} s={[1, 1, .8]} />
      <P g={cyl(.157, .157, .075, 10)} m={m.sash} p={[0, .02, 0]} s={[1, 1, .82]} />
      <P g={box(.085, .065, .05)} m={m.sash} p={[0, .02, -.135]} />
      <group ref={bind.part('sash')} position={[0, .0, -.14]}>
        {[-1, 1].map(s => <group key={s} position={[s * .03, 0, 0]} rotation={[0, 0, s * .1]}>
          <Chain count={3} length={.13}>{() => <P g={box(.055, .13, .012)} m={m.sash} p={[0, -.065, 0]} />}</Chain>
        </group>)}
      </group>
      <group ref={bind.joint('spine')} position={[0, .08, 0]}>
        <P g={cyl(.138, .152, .17, 10)} m={m.top} p={[0, .03, 0]} s={[1, 1, .74]} />
        <group ref={bind.joint('chest')} position={[0, .2, 0]}>
          <P g={cyl(.182, .142, .34, 10)} m={m.top} s={[1, 1, .72]} />
          <P g={sph(.12, 12, 8)} m={m.top} p={[0, .02, .055]} s={[1.3, .72, .7]} />
          <P g={cyl(.09, .11, .07, 10)} m={m.top} p={[0, .165, 0]} s={[1, 1, .85]} />
          {[-1, 1].map(s => <P key={s} g={sph(.072, 10, 8)} m={m.suit} p={[s * .18, .12, 0]} s={[1, .85, .9]} />)}
          <group ref={bind.joint('neck')} position={[0, .2, 0]}>
            <P g={cyl(.058, .064, .1, 8)} m={m.suit} p={[0, .015, 0]} />
            <group ref={bind.joint('head')} position={[0, .07, 0]}>
              <P g={sph(.108, 14, 12)} m={m.skin} p={[0, .12, .005]} s={[.93, 1.07, 1]} />
              <P g={box(.098, .055, .07)} m={m.skin} p={[0, .045, .05]} r={[.3, 0, 0]} />
              {[-1, 1].map(s => <P key={s} g={box(.036, .016, .01)} m={m.eye} p={[s * .041, .127, .112]} r={[0, 0, s * .16]} />)}
              <P g={sph(.12, 14, 8, 0, Math.PI * 2, 0, Math.PI * .58)} m={m.hair} p={[0, .15, -.012]} r={[-.3, 0, 0]} />
              {yoruBangs.map((s, i) => <P key={i} g={cone(.035, s.length, 4)} m={m.hair} p={s.p} r={s.r} />)}
              {[-1, 1].map(s => <P key={s} g={box(.04, .25, .05)} m={m.hair} p={[s * .1, .03, .045]} r={[.05, 0, s * -.05]} />)}
              <P g={torus(.032, .012, 5, 10)} m={m.band} p={[0, .21, -.11]} r={[.9, 0, 0]} />
              <group ref={bind.part('pony')} position={[0, .21, -.13]}>
                <Chain count={6} length={.1}>{k => <P g={cyl(.045 - k * .004, .04 - k * .004, .11, 6)} m={m.hair} p={[0, -.05, 0]} />}</Chain>
              </group>
            </group>
          </group>
          {(['L', 'R'] as const).map(side => {
            const s = side === 'L' ? 1 : -1
            return <group key={side} ref={bind.joint(`shoulder${side}`)} position={[s * .185, .12, 0]}>
              <P g={cyl(.056, .05, .27, 8)} m={m.suit} p={[0, -.13, 0]} />
              <group ref={bind.joint(`elbow${side}`)} position={[0, -.27, 0]}>
                <P g={cyl(.05, .043, .22, 8)} m={m.suit} p={[0, -.1, 0]} />
                <P g={cyl(.049, .049, .06, 8)} m={m.wrap} p={[0, -.19, 0]} />
                <group ref={bind.joint(`wrist${side}`)} position={[0, -.24, 0]}>
                  <P g={box(.058, .085, .042)} m={m.skin} p={[0, -.032, .004]} />
                </group>
              </group>
            </group>
          })}
        </group>
      </group>
      {(['L', 'R'] as const).map(side => {
        const s = side === 'L' ? 1 : -1
        return <group key={side} ref={bind.joint(`thigh${side}`)} position={[s * .085, -.05, 0]}>
          <P g={cyl(.082, .1, .44, 8)} m={m.suit} p={[0, -.2, 0]} />
          <group ref={bind.joint(`knee${side}`)} position={[0, -.42, 0]}>
            <P g={cyl(.066, .082, .38, 8)} m={m.suit} p={[0, -.18, 0]} />
            {[0, 1, 2].map(k => <P key={k} g={cyl(.075 - k * .004, .078 - k * .004, .05, 8)} m={m.wrap} p={[0, -.14 - k * .075, 0]} />)}
            <group ref={bind.joint(`ankle${side}`)} position={[0, -.4, 0]}>
              <P g={box(.072, .055, .19)} m={m.shoe} p={[0, -.015, .045]} />
            </group>
          </group>
        </group>
      })}
    </group>
  </group>
}

// Memoized: figures only re-render when their own props change.
export const SoiFon = memo(SoiFonFigure)
export const Yoruichi = memo(YoruichiFigure)

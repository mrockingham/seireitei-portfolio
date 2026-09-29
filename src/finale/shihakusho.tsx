// Shared procedural shihakushō body (black kimono and hakama) on the standard joint layout
// from rig.ts, with an optional captain's haori and extra attachment slots.
// Used by Rukia, Renji, Tōshirō, the captains watching the barracks fight, and Soi Fon.
import type { ReactNode } from 'react'
import type * as THREE from 'three'
import { box, cyl, sph } from './materials'
import type { useBindings } from './figure-kit'
import { P } from './characters'

type Side = 'L' | 'R'
export type HaoriSpec = { outer: THREE.Material; lining: THREE.Material; sleeves: boolean; length?: number; collar?: boolean }
/** upper: the upper-arm sleeves and shoulders (e.g. skin for a sleeveless top); defaults to black. */
export type ShihakushoMaterials = { black: THREE.Material; belt: THREE.Material; collar: THREE.Material; skin: THREE.Material; tabi: THREE.Material; sandal: THREE.Material; hand?: THREE.Material; upper?: THREE.Material }

/** slots: head (on the head joint), hand and handL (wrists), leftArm and rightArm (upper arms), chest and back (on the chest), waist (on the hips). */
export function Shihakusho({ bind, m, slots, arms, haori }: {
  bind: ReturnType<typeof useBindings>['bind']
  m: ShihakushoMaterials
  slots: { head: ReactNode; hand?: ReactNode; handL?: ReactNode; leftArm?: ReactNode; rightArm?: ReactNode; chest?: ReactNode; back?: ReactNode; waist?: ReactNode }
  arms?: number
  haori?: HaoriSpec
}) {
  const sleeve = arms ?? .1
  const gap = .85, len = haori?.length ?? .66
  const upper = m.upper ?? m.black
  return <group ref={bind.joint('hips')} position={[0, .92, 0]}>
    <P g={cyl(.165, .2, .27)} m={m.black} p={[0, -.08, 0]} s={[1, 1, .82]} />
    <P g={cyl(.17, .17, .08)} m={m.belt} p={[0, .03, 0]} s={[1, 1, .8]} />
    {slots.waist}
    {haori && (['haoriL', 'haoriR'] as const).map((name, side) => {
      const t0 = side === 0 ? gap / 2 : Math.PI, tl = Math.PI - gap / 2
      return <group key={name} ref={bind.part(name)} position={[0, .07, 0]}>
        <P g={cyl(.212, .34, len, 12, true, t0, tl)} m={haori.outer} p={[0, -len / 2, 0]} s={[1, 1, .84]} />
      </group>
    })}
    <group ref={bind.joint('spine')} position={[0, .08, 0]}>
      <P g={cyl(.155, .163, .17)} m={m.black} p={[0, .04, 0]} s={[1, 1, .74]} />
      <group ref={bind.joint('chest')} position={[0, .2, 0]}>
        <P g={cyl(.196, .155, .37)} m={m.black} s={[1, 1, .7]} />
        {haori && <>
          <P g={cyl(.212, .17, .39, 12, true, .5, Math.PI * 2 - 1)} m={haori.outer} p={[0, -.005, 0]} s={[1, 1, .72]} />
          {haori.collar && <P g={cyl(.12, .1, .2, 12, true, .6, Math.PI * 2 - 1.2)} m={haori.outer} p={[0, .24, -.01]} />}
        </>}
        {[-1, 1].map(s => <group key={s}>
          <P g={box(.04, .31, .02)} m={m.collar} p={[s * .045, .03, .133]} r={[-.12, 0, -s * .36]} />
          <P g={sph(.084, 10, 8)} m={haori && !m.upper ? haori.outer : upper} p={[s * .19, .13, 0]} s={haori && !m.upper ? [1.08, .9, .96] : [1, .85, .9]} />
          {haori && m.upper && <P g={sph(.084, 10, 8)} m={haori.outer} p={[s * .19, .14, 0]} s={[1.14, .78, 1.02]} />}
        </group>)}
        {slots.chest}
        {slots.back}
        <group ref={bind.joint('neck')} position={[0, .2, 0]}>
          <P g={cyl(.046, .053, .1, 8)} m={m.skin} p={[0, .02, 0]} />
          <group ref={bind.joint('head')} position={[0, .07, 0]}>{slots.head}</group>
        </group>
        {(['L', 'R'] as Side[]).map(side => {
          const s = side === 'L' ? 1 : -1
          const sleeved = haori?.sleeves
          return <group key={side} ref={bind.joint(`shoulder${side}`)} position={[s * .2, .13, 0]}>
            <P g={cyl(.07, .062, .27, 8)} m={upper} p={[0, -.13, 0]} />
            {sleeved && <P g={cyl(.08, .076, .28, 8)} m={haori.outer} p={[0, -.13, 0]} />}
            {side === 'L' ? slots.leftArm : slots.rightArm}
            <group ref={bind.joint(`elbow${side}`)} position={[0, -.27, 0]}>
              <P g={cyl(.062, .062 + sleeve, .21, 8, true)} m={m.black} p={[0, -.095, 0]} />
              <P g={cyl(.058, .058 + sleeve, .2, 8, true)} m={m.collar} p={[0, -.095, 0]} s={[.96, 1, .96]} />
              {sleeved && <P g={cyl(.072, .13, .24, 8, true)} m={haori.outer} p={[0, -.1, 0]} />}
              <P g={cyl(.034, .037, .18, 6)} m={m.hand ?? m.skin} p={[0, -.14, 0]} />
              <group ref={bind.joint(`wrist${side}`)} position={[0, -.24, 0]}>
                <P g={box(.066, .09, .048)} m={m.hand ?? m.skin} p={[0, -.033, .005]} />
                {side === 'R' ? slots.hand : slots.handL}
              </group>
            </group>
          </group>
        })}
      </group>
    </group>
    {(['L', 'R'] as Side[]).map(side => {
      const s = side === 'L' ? 1 : -1
      return <group key={side} ref={bind.joint(`thigh${side}`)} position={[s * .093, -.05, 0]}>
        <P g={cyl(.098, .128, .44, 8)} m={m.black} p={[0, -.2, 0]} />
        <group ref={bind.joint(`knee${side}`)} position={[0, -.42, 0]}>
          <P g={cyl(.126, .148, .36, 8)} m={m.black} p={[0, -.17, 0]} />
          <group ref={bind.joint(`ankle${side}`)} position={[0, -.4, 0]}>
            <P g={box(.082, .062, .19)} m={m.tabi} p={[0, -.01, .045]} />
            <P g={box(.092, .02, .22)} m={m.sandal} p={[0, -.05, .045]} />
          </group>
        </group>
      </group>
    })}
  </group>
}

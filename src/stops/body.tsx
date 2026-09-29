// Shared procedural body in everyday clothes (shirt, trousers or skirt, shoes) on the standard
// joint layout from rig.ts, so pose tracks transfer between every figure in the world.
import type { ReactNode } from 'react'
import type * as THREE from 'three'
import { box, cyl, sph } from '../finale/materials'
import type { useBindings } from '../finale/figure-kit'
import { P } from '../finale/characters'

type Side = 'L' | 'R'
export type CasualMaterials = { top: THREE.Material; skin: THREE.Material; pants: THREE.Material; shoe: THREE.Material; sleeve?: THREE.Material; sock?: THREE.Material; hand?: THREE.Material; belt?: THREE.Material }
export type CasualSlots = { head: ReactNode; chest?: ReactNode; waist?: ReactNode; handR?: ReactNode; handL?: ReactNode; forearmR?: ReactNode; forearmL?: ReactNode; upperR?: ReactNode; upperL?: ReactNode }

/**
 * sleeves: 'short' (skin forearms), 'long' (sleeve to the wrist) or 'none'.
 * legs: 'pants' or 'skirt' (bare legs with socks). width scales the shoulders and chest.
 */
export function Casual({ bind, m, slots, sleeves = 'short', legs = 'pants', width = 1 }: {
  bind: ReturnType<typeof useBindings>['bind']
  m: CasualMaterials
  slots: CasualSlots
  sleeves?: 'short' | 'long' | 'none'
  legs?: 'pants' | 'skirt'
  width?: number
}) {
  const sleeve = m.sleeve ?? m.top, hand = m.hand ?? m.skin
  const skirt = legs === 'skirt'
  return <group ref={bind.joint('hips')} position={[0, .92, 0]}>
    <P g={cyl(.155, .17, .22, 10)} m={skirt ? m.top : m.pants} p={[0, -.05, 0]} s={[width * .96, 1, .8]} />
    {m.belt && <P g={cyl(.162, .162, .05, 10)} m={m.belt} p={[0, .04, 0]} s={[width * .96, 1, .82]} />}
    {skirt && <P g={cyl(.165, .3, .36, 12)} m={m.pants} p={[0, -.18, 0]} s={[1, 1, .85]} />}
    {slots.waist}
    <group ref={bind.joint('spine')} position={[0, .08, 0]}>
      <P g={cyl(.148, .157, .17, 10)} m={m.top} p={[0, .04, 0]} s={[width, 1, .74]} />
      <group ref={bind.joint('chest')} position={[0, .2, 0]}>
        <P g={cyl(.19, .15, .37, 10)} m={m.top} s={[width, 1, .7]} />
        {[-1, 1].map(s => <P key={s} g={sph(.082, 10, 8)} m={sleeves === 'none' ? m.skin : sleeve} p={[s * .19 * width, .13, 0]} s={[1, .85, .9]} />)}
        {slots.chest}
        <group ref={bind.joint('neck')} position={[0, .2, 0]}>
          <P g={cyl(.047, .054, .1, 8)} m={m.skin} p={[0, .02, 0]} />
          <group ref={bind.joint('head')} position={[0, .07, 0]}>{slots.head}</group>
        </group>
        {(['L', 'R'] as Side[]).map(side => {
          const s = side === 'L' ? 1 : -1
          return <group key={side} ref={bind.joint(`shoulder${side}`)} position={[s * .2 * width, .13, 0]}>
            <P g={cyl(.062, .055, .27, 8)} m={sleeves === 'none' ? m.skin : sleeves === 'short' ? m.skin : sleeve} p={[0, -.13, 0]} />
            {sleeves === 'short' && <P g={cyl(.075, .072, .15, 8)} m={sleeve} p={[0, -.06, 0]} />}
            {side === 'R' ? slots.upperR : slots.upperL}
            <group ref={bind.joint(`elbow${side}`)} position={[0, -.27, 0]}>
              <P g={cyl(.054, .045, .22, 8)} m={sleeves === 'long' ? sleeve : m.skin} p={[0, -.1, 0]} />
              {side === 'R' ? slots.forearmR : slots.forearmL}
              <group ref={bind.joint(`wrist${side}`)} position={[0, -.24, 0]}>
                <P g={box(.066, .09, .046)} m={hand} p={[0, -.034, .004]} />
                {side === 'R' ? slots.handR : slots.handL}
              </group>
            </group>
          </group>
        })}
      </group>
    </group>
    {(['L', 'R'] as Side[]).map(side => {
      const s = side === 'L' ? 1 : -1
      return <group key={side} ref={bind.joint(`thigh${side}`)} position={[s * .09, -.05, 0]}>
        <P g={skirt ? cyl(.07, .078, .44, 8) : cyl(.09, .1, .44, 8)} m={skirt ? m.skin : m.pants} p={[0, -.2, 0]} />
        <group ref={bind.joint(`knee${side}`)} position={[0, -.42, 0]}>
          <P g={skirt ? cyl(.062, .07, .4, 8) : cyl(.082, .088, .4, 8)} m={skirt ? m.skin : m.pants} p={[0, -.19, 0]} />
          {skirt && m.sock && <P g={cyl(.066, .066, .2, 8)} m={m.sock} p={[0, -.29, 0]} />}
          <group ref={bind.joint(`ankle${side}`)} position={[0, -.4, 0]}>
            <P g={box(.088, .07, .22)} m={m.shoe} p={[0, -.015, .05]} />
          </group>
        </group>
      </group>
    })}
  </group>
}

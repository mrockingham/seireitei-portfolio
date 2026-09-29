// Shared plumbing for the procedural character figures (Ichigo, Byakuya, Rukia, Renji).
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Joint, Joints } from './rig'

export type V3 = [number, number, number]
export type Figure = {
  root: THREE.Group
  joints: Joints
  parts: Record<string, THREE.Object3D>
  hipsY: number
  /** Ichigo only: 'shikai', 'bankai', or a world-space wipe height during the transformation. */
  setForm?: (form: 'shikai' | 'bankai' | number) => void
}

/** Collects named joints and parts through stable ref callbacks. */
export function useBindings() {
  const joints = useRef<Joints>({})
  const parts = useRef<Record<string, THREE.Object3D>>({})
  const bind = useMemo(() => {
    const cache = new Map<string, (o: THREE.Object3D | null) => void>()
    const make = (store: 'joint' | 'part', name: string) => {
      const key = store + name
      let fn = cache.get(key)
      if (!fn) {
        fn = o => {
          const target = (store === 'joint' ? joints.current : parts.current) as Record<string, THREE.Object3D>
          if (o) target[name] = o; else delete target[name]
        }
        cache.set(key, fn)
      }
      return fn
    }
    return { joint: (name: Joint) => make('joint', name), part: (name: string) => make('part', name) }
  }, [])
  return { joints, parts, bind }
}

/** Materials created once per figure and disposed with it. */
export function useFigureMaterials<T extends Record<string, THREE.Material>>(make: () => T, deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const materials = useMemo(make, deps)
  useLayoutEffect(() => () => Object.values(materials).forEach(m => m.dispose()), [materials])
  return materials
}

// Hair spikes are generated once: [polar angle from crown, azimuth from the back, length].
const upY = new THREE.Vector3(0, 1, 0)
export function spikes(defs: [number, number, number][], radius: number, center: V3, tiltBack = .35) {
  return defs.map(([phi, theta, length]) => {
    const n = new THREE.Vector3(Math.sin(phi) * Math.sin(theta), Math.cos(phi), -Math.sin(phi) * Math.cos(theta))
    const dir = n.clone().add(new THREE.Vector3(0, 0, -tiltBack)).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(upY, dir)
    const p = new THREE.Vector3(...center).addScaledVector(n, radius * .82).addScaledVector(dir, length * .42)
    return { p: p.toArray() as V3, r: new THREE.Euler().setFromQuaternion(q).toArray().slice(0, 3) as V3, length }
  })
}

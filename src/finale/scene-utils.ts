import * as THREE from 'three'

/**
 * Finds a flat encounter ring baked into the world GLB (about 5.2 m across, or `span` meters)
 * so a cinematic can hide it while it plays. Returns null if the world no longer has one there.
 */
export function findFlatMarker(scene: THREE.Object3D, cx: number, cz: number, groundY: number, span: [number, number] = [4.4, 6.2]) {
  const box = new THREE.Box3(), size = new THREE.Vector3(), center = new THREE.Vector3()
  let found: THREE.Object3D | null = null
  scene.traverse(o => {
    if (found || !(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh) return
    box.setFromObject(o).getSize(size); box.getCenter(center)
    if (size.y < .3 && size.x > span[0] && size.x < span[1] && size.z > span[0] && size.z < span[1] && Math.hypot(center.x - cx, center.z - cz) < 1.2 && Math.abs(center.y - groundY) < .4) found = o
  })
  return found as THREE.Object3D | null
}

/**
 * One moving effect light and one rim light shared by every cinematic. Only one cinematic
 * plays at a time, and keeping a fixed light count avoids shader recompiles.
 */
export type CinemaLights = { fx: THREE.PointLight; rim: THREE.DirectionalLight }
export function createCinemaLights(): CinemaLights {
  return { fx: new THREE.PointLight('#ffffff', 0, 14, 1.6), rim: new THREE.DirectionalLight('#dfe8ff', 0) }
}

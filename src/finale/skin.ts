// Collapses a procedural figure's body into rigidly skinned meshes, so a crowd stays cheap.
// A figure built from primitives costs ~40 draw calls (plus as many shadow draws); after
// rigidSkin it costs one per shading style. The joints become the bones, so every pose track
// keeps working unchanged. Only meshes sitting directly on a joint are merged: parts under their
// own groups (weapons, armour, toggled props) and transparent materials stay as they are.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { JOINTS } from './rig'
import type { Figure } from './figure-kit'

const m4 = new THREE.Matrix4(), color = new THREE.Color()

export function rigidSkin(fig: Figure, roughness = .78) {
  const root = fig.root
  root.updateWorldMatrix(true, true)
  const rootInv = root.matrixWorld.clone().invert()
  const bones: THREE.Object3D[] = []
  JOINTS.forEach(n => { const j = fig.joints[n]; if (j) bones.push(j) })
  const buckets = new Map<string, { geos: THREE.BufferGeometry[]; flat: boolean; side: THREE.Side }>()
  const merged: THREE.Mesh[] = []
  bones.forEach((bone, bi) => {
    for (const child of bone.children) {
      if (!(child instanceof THREE.Mesh) || child instanceof THREE.SkinnedMesh || child.children.length) continue
      const mat = child.material as THREE.MeshStandardMaterial
      if (!mat?.isMeshStandardMaterial || mat.transparent || !child.visible) continue
      const src = child.geometry
      const g = src.index ? src.toNonIndexed() : src.clone()
      for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name)
      g.morphAttributes = {}
      g.applyMatrix4(m4.multiplyMatrices(rootInv, child.matrixWorld))
      const n = g.attributes.position.count
      color.copy(mat.color).lerp(mat.emissive, Math.min(1, mat.emissiveIntensity * .6))
      const colors = new Float32Array(n * 3), index = new Uint16Array(n * 4), weight = new Float32Array(n * 4)
      for (let i = 0; i < n; i++) { colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b; index[i * 4] = bi; weight[i * 4] = 1 }
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(index, 4))
      g.setAttribute('skinWeight', new THREE.BufferAttribute(weight, 4))
      const key = `${mat.flatShading ? 1 : 0}:${mat.side}`
      let bucket = buckets.get(key)
      if (!bucket) buckets.set(key, bucket = { geos: [], flat: mat.flatShading, side: mat.side })
      bucket.geos.push(g)
      merged.push(child)
    }
  })
  merged.forEach(o => { o.visible = false })
  const skeleton = new THREE.Skeleton(bones as THREE.Bone[])
  const meshes = [...buckets.values()].map(b => {
    const geometry = mergeGeometries(b.geos)!
    b.geos.forEach(g => g.dispose())
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, flatShading: b.flat, side: b.side })
    const mesh = new THREE.SkinnedMesh(geometry, material)
    mesh.castShadow = true
    mesh.name = 'rigid-skin'
    root.add(mesh)
    mesh.bind(skeleton)
    // A generous fixed bound: poses never reach beyond it, and it spares per-frame recomputation.
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .95, 0), 1.7)
    return mesh
  })
  return {
    meshes,
    dispose() {
      meshes.forEach(x => { x.removeFromParent(); x.geometry.dispose(); (x.material as THREE.Material).dispose() })
      merged.forEach(o => { o.visible = true })
    },
  }
}

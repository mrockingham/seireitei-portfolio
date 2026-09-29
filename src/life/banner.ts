// A tall nobori banner on a pole: vertical text drawn to a canvas, the cloth waving in a
// vertex shader. Pure function of the time passed to update().
import * as THREE from 'three'

export type BannerSpec = { position: [number, number, number]; yaw?: number; text: string; cloth: string; ink: string; height?: number }

export class Banner {
  readonly group = new THREE.Group()
  private readonly texture: THREE.CanvasTexture
  private readonly cloth: THREE.MeshStandardMaterial
  private readonly pole: THREE.MeshStandardMaterial
  private readonly time = { value: 0 }
  private readonly geometries: THREE.BufferGeometry[] = []
  constructor(spec: BannerSpec) {
    const h = spec.height ?? 3.2, w = .62
    const canvas = document.createElement('canvas')
    canvas.width = 128; canvas.height = 512
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = spec.cloth; ctx.fillRect(0, 0, 128, 512)
    ctx.fillStyle = spec.ink; ctx.fillRect(8, 8, 112, 6); ctx.fillRect(8, 498, 112, 6)
    ctx.font = 'bold 82px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const chars = [...spec.text], step = Math.min(96, 440 / chars.length)
    chars.forEach((c, i) => ctx.fillText(c, 64, 256 + (i - (chars.length - 1) / 2) * step))
    this.texture = new THREE.CanvasTexture(canvas)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.anisotropy = 4
    this.cloth = new THREE.MeshStandardMaterial({ map: this.texture, roughness: .85, side: THREE.DoubleSide })
    this.cloth.onBeforeCompile = shader => {
      shader.uniforms.uTime = this.time
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float along = (position.x + ${(w / 2).toFixed(3)}) / ${w.toFixed(3)};
        transformed.z += sin(uTime * 2.3 + position.y * 1.7 + along * 2.5) * .09 * along + sin(uTime * 3.7 + position.y * 3.1) * .025 * along;`)
    }
    this.cloth.customProgramCacheKey = () => 'banner-wave'
    this.pole = new THREE.MeshStandardMaterial({ color: '#2b2521', roughness: .6 })
    const poleGeo = new THREE.CylinderGeometry(.04, .05, h + .6, 8), barGeo = new THREE.CylinderGeometry(.025, .025, w + .15, 6), clothGeo = new THREE.PlaneGeometry(w, h, 8, 12)
    this.geometries.push(poleGeo, barGeo, clothGeo)
    const pole = new THREE.Mesh(poleGeo, this.pole); pole.position.y = (h + .6) / 2; pole.castShadow = true
    const bar = new THREE.Mesh(barGeo, this.pole); bar.rotation.z = Math.PI / 2; bar.position.set(w / 2, h + .45, 0)
    const flag = new THREE.Mesh(clothGeo, this.cloth); flag.position.set(w / 2 + .05, h / 2 + .45, 0); flag.castShadow = true
    this.group.add(pole, bar, flag)
    this.group.position.set(...spec.position)
    this.group.rotation.y = spec.yaw ?? 0
  }
  dispose() { this.texture.dispose(); this.cloth.dispose(); this.pole.dispose(); this.geometries.forEach(g => g.dispose()) }
  update(t: number) { this.time.value = t }
}

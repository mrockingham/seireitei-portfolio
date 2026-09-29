// Senbonzakura Kageyoshi: two rows of giant blades rise from the ground, gleam, then
// dissolve from the tip down. One InstancedMesh; the dissolve runs in the shader and a
// matching depth material keeps the shadows in sync.
import * as THREE from 'three'
import { ARENA_CENTER, GROUND_Y, T, easeOutBack, hash, lin } from './timeline'

export type Blade = { x: number; z: number; yaw: number; tilt: number; width: number; height: number; order: number }
const PER_ROW = 11
export const DISSOLVE_DURATION = 1.3
export const BLADES: Blade[] = [-1, 1].flatMap(side => Array.from({ length: PER_ROW }, (_, i) => {
  const n = i + (side > 0 ? 40 : 0)
  return {
    x: ARENA_CENTER[0] + side * (4.25 + (hash(n * 3.1) - .5) * .5 + Math.abs(i - 5) * .06),
    z: -95.6 + i * 1.72 + (hash(n * 7.7) - .5) * .35,
    // Broad faces toward the corridor so the rows read as walls of steel.
    yaw: side * Math.PI / 2 + (hash(n * 1.9) - .5) * .55,
    tilt: side * (.03 + hash(n * 4.3) * .05),
    width: .52 + hash(n * 5.3) * .16,
    height: 7.2 + hash(n * 2.2) * 2.2 - Math.abs(i - 3) * .12,
    // Rise in a wave that starts behind Byakuya and rolls toward Ichigo.
    order: i + (side > 0 ? .45 : 0),
  }
}))
export const bladeRiseStart = (b: Blade) => T.bladesRise + b.order * .1
export const bladeRiseAmount = (b: Blade, t: number) => easeOutBack(lin(t, bladeRiseStart(b), bladeRiseStart(b) + .5))
export const bladeDissolveStart = (b: Blade) => T.dissolve + b.order * .065
export const bladeDissolveAmount = (b: Blade, t: number) => lin(t, bladeDissolveStart(b), bladeDissolveStart(b) + DISSOLVE_DURATION)

/** Faceted katana-style blade: spine at x=-0.5, cutting edge at x=+0.5, height 0..1. */
function bladeGeometry() {
  const rings = [0, .25, .5, .7, .8, .86, .9, .935, .965, .985, 1]
  const thickness = .13
  const section = (y: number) => {
    const tip = Math.max(0, (y - .86) / .14)
    const edge = -.5 + Math.sqrt(Math.max(0, 1 - tip * tip))
    const ridge = -.5 + (edge + .5) * .62
    const th = thickness * (1 - Math.max(0, (y - .78) / .22) * .88)
    return [[-.5, th / 2], [ridge, th * .44], [edge, 0], [ridge, -th * .44], [-.5, -th / 2]]
  }
  const positions: number[] = []
  for (let r = 0; r < rings.length - 1; r++) {
    const a = section(rings[r]), b = section(rings[r + 1]), ya = rings[r], yb = rings[r + 1]
    for (let k = 0; k < 5; k++) {
      const k2 = (k + 1) % 5
      const p = [[a[k][0], ya, a[k][1]], [a[k2][0], ya, a[k2][1]], [b[k2][0], yb, b[k2][1]], [b[k][0], yb, b[k][1]]]
      positions.push(...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3])
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.computeVertexNormals()
  return g
}

const noiseChunk = `
float bladeHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float bladeNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(bladeHash(i),bladeHash(i+vec2(1,0)),f.x),mix(bladeHash(i+vec2(0,1)),bladeHash(i+vec2(1,1)),f.x),f.y);}
float bladeCut(float localY, vec3 world, float dissolve){
  float n = bladeNoise(world.xz * 3.0 + world.y * 2.1) * .7 + bladeNoise(world.xy * 9.0) * .3;
  return (1.0 - dissolve * 1.3) - localY + (n - .5) * .22;
}
`
const vertexHead = 'attribute float aDissolve;\nvarying float vDissolve;\nvarying float vBladeY;\nvarying float vBladeX;\nvarying vec3 vBladeWorld;\n'
const vertexBody = `
vDissolve = aDissolve; vBladeY = position.y; vBladeX = position.x;
vec4 bladeWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
bladeWorld = instanceMatrix * bladeWorld;
#endif
vBladeWorld = (modelMatrix * bladeWorld).xyz;`
const fragmentHead = 'uniform float uGround;\nuniform float uGleam;\nvarying float vDissolve;\nvarying float vBladeY;\nvarying float vBladeX;\nvarying vec3 vBladeWorld;\n' + noiseChunk

export class KageyoshiBlades {
  readonly mesh: THREE.InstancedMesh
  private dissolve: THREE.InstancedBufferAttribute
  private readonly gleam = { value: -1 }
  private readonly matrix = new THREE.Matrix4()
  private readonly q = new THREE.Quaternion()
  private readonly e = new THREE.Euler()
  private readonly p = new THREE.Vector3()
  private readonly s = new THREE.Vector3()

  constructor(envMap: THREE.Texture) {
    const geometry = bladeGeometry()
    this.dissolve = new THREE.InstancedBufferAttribute(new Float32Array(BLADES.length), 1)
    this.dissolve.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aDissolve', this.dissolve)
    const ground = { value: GROUND_Y - .02 }
    const material = new THREE.MeshStandardMaterial({ color: '#b3c2cc', metalness: .86, roughness: .24, envMap, envMapIntensity: .8, flatShading: true })
    material.onBeforeCompile = shader => {
      shader.uniforms.uGround = ground
      shader.uniforms.uGleam = this.gleam
      shader.vertexShader = vertexHead + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>' + vertexBody)
      shader.fragmentShader = fragmentHead + shader.fragmentShader
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          if (vBladeWorld.y < uGround) discard;
          float bladeEdge = bladeCut(vBladeY, vBladeWorld, vDissolve);
          if (bladeEdge < 0.0) discard;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          // Darker spine, bright edge, and a wavy temper line (hamon) near the cutting edge.
          diffuseColor.rgb *= mix(.42, 1.12, smoothstep(-.5, .35, vBladeX));
          float hamonX = .2 + .045 * sin(vBladeY * 58.0) + .025 * sin(vBladeY * 21.0);
          diffuseColor.rgb += vec3(.35, .38, .42) * smoothstep(.03, .0, abs(vBladeX - hamonX)) * step(vBladeY, .9);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float burn = vDissolve > 0.0 ? 1.0 - smoothstep(0.0, .07, bladeEdge) : 0.0;
          totalEmissiveRadiance += vec3(1.0, .42, .68) * burn * 3.0;
          totalEmissiveRadiance += vec3(1.0, .96, .9) * exp(-pow((vBladeY - uGleam) * 22.0, 2.0)) * .55 * smoothstep(-.3, .3, vBladeX);`)
    }
    material.customProgramCacheKey = () => 'kageyoshi-blade-v2'
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
    depth.onBeforeCompile = shader => {
      shader.uniforms.uGround = ground
      shader.uniforms.uGleam = this.gleam
      shader.vertexShader = vertexHead + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>' + vertexBody)
      shader.fragmentShader = fragmentHead + shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (vBladeWorld.y < uGround || bladeCut(vBladeY, vBladeWorld, vDissolve) < 0.0) discard;`)
    }
    depth.customProgramCacheKey = () => 'kageyoshi-blade-depth-v1'
    this.mesh = new THREE.InstancedMesh(geometry, material, BLADES.length)
    this.mesh.customDepthMaterial = depth
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.mesh.frustumCulled = false
    this.mesh.visible = false
    this.mesh.name = 'kageyoshi-blades'
  }

  dispose() {
    this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); this.mesh.customDepthMaterial?.dispose(); this.mesh.dispose()
  }

  update(t: number) {
    const active = t >= T.bladesRise && t < T.dissolve + 3.2
    this.mesh.visible = active
    if (!active) return
    const arr = this.mesh.instanceMatrix.array as Float32Array
    BLADES.forEach((b, i) => {
      const rise = bladeRiseAmount(b, t)
      // Sink the blade below the ground plane until it erupts; the shader hides the buried part.
      this.p.set(b.x, GROUND_Y - (1 - rise) * b.height - .05, b.z)
      this.e.set(0, b.yaw, b.tilt)
      this.q.setFromEuler(this.e)
      this.s.set(b.width, b.height, b.width)
      this.matrix.compose(this.p, this.q, this.s).toArray(arr, i * 16)
      this.dissolve.array[i] = bladeDissolveAmount(b, t)
    })
    this.gleam.value = t > T.gleam && t < T.gleam + .9 ? -.1 + (t - T.gleam) / .9 * 1.3 : -1
    this.mesh.instanceMatrix.needsUpdate = true
    this.dissolve.needsUpdate = true
  }
}

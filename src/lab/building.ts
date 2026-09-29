// The lab's architecture and furniture, built imperatively: a white drum with dark ribs and a dome,
// sliding doors under a 技術開発局 plaque; inside, a circuit-lit floor, a curved console, server
// racks, specimen tanks, and a hologram projector. Also returns the collider boxes and a camera
// proxy (walls and dome) for the follow camera's obstruction raycast.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { hash } from '../finale/timeline'
import { Banner } from '../life/banner'
import { DataScreens, Leds, floorTextures } from './screens'
import {
  DOOR_HALF, DOOR_HEIGHT, DOOR_PHI, LAB_CENTER, LAB_FLOOR, LAB_INNER, LAB_RADIUS, LAB_WALL, SCREEN_COLS, SCREEN_H, SCREEN_PHI, SCREEN_R, SCREEN_ROWS, SCREEN_W, around, dir,
} from './layout'

type V3 = [number, number, number]
export type Box = { position: V3; half: V3; yaw: number }
const [CX, , CZ] = LAB_CENTER
/** Where Nemu works and where Mayuri's projection stands. */
export const NEMU_SPOT = { phi: SCREEN_PHI + .86, r: 4.75 }
export const HOLO_SPOT = { phi: SCREEN_PHI - .98, r: 4.35 }
export const TANK_PHIS = [1.0, 2.14]
const RACK_PHIS = [2.58, 2.93, 3.28, -.22, .12]

function plaqueTexture(text: string, height = 192, font = 'bold 118px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif') {
  const c = document.createElement('canvas'); c.width = 1024; c.height = height
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#1b2530'; ctx.fillRect(0, 0, 1024, height)
  ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, 1004, height - 20)
  ctx.fillStyle = '#f2eee3'; ctx.font = font
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 512, height / 2 + height * .03, 960)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

export function buildLab() {
  const shell = new THREE.Group(), interior = new THREE.Group()
  shell.name = 'lab-shell'; interior.name = 'lab-interior'
  const geos: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [], textures: THREE.Texture[] = []
  const mat = <T extends THREE.Material>(m: T) => { mats.push(m); return m }
  const white = mat(new THREE.MeshStandardMaterial({ color: '#eef0ee', roughness: .75 }))
  // The surfaces that fill the screen from inside use cheaper Lambert shading.
  const inner = mat(new THREE.MeshLambertMaterial({ color: '#f4f6f7', side: THREE.BackSide }))
  const dark = mat(new THREE.MeshStandardMaterial({ color: '#2c3640', roughness: .6 }))
  const steel = mat(new THREE.MeshStandardMaterial({ color: '#8d99a3', roughness: .35, metalness: .6 }))
  const dome = mat(new THREE.MeshStandardMaterial({ color: '#cfdfe2', roughness: .55, side: THREE.DoubleSide }))
  const rack = mat(new THREE.MeshStandardMaterial({ color: '#1e252e', roughness: .5, metalness: .3 }))
  const rackFace = mat(new THREE.MeshStandardMaterial({ color: '#2b3541', roughness: .45, metalness: .3 }))
  const consoleMat = mat(new THREE.MeshStandardMaterial({ color: '#dfe5e8', roughness: .5 }))
  const glow = mat(new THREE.MeshBasicMaterial({ color: '#7fe3ff', toneMapped: false }))
  const glass = mat(new THREE.MeshStandardMaterial({ color: '#cfeee6', roughness: .05, transparent: true, opacity: .22, depthWrite: false }))
  const liquid = mat(new THREE.MeshStandardMaterial({ color: '#1f9f7a', emissive: '#1fcf8f', emissiveIntensity: .7, roughness: .2, transparent: true, opacity: .55, depthWrite: false }))
  const specimen = mat(new THREE.MeshStandardMaterial({ color: '#1a2a24', roughness: .8 }))
  const cable = mat(new THREE.MeshStandardMaterial({ color: '#23282e', roughness: .7 }))
  /** A piece that moves or has several materials: its own mesh. */
  const solo = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], p: V3, rot: V3 = [0, 0, 0], shadow = true) => {
    geos.push(g); const mesh = new THREE.Mesh(g, m); mesh.position.set(...p); mesh.rotation.set(...rot); mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh
  }
  // Static pieces are baked into one mesh per group, material, and shadow flag (see bake below):
  // the lab has about a hundred of them, and each would otherwise be a draw call, twice with shadows.
  const batches = new Map<string, { parent: THREE.Object3D; m: THREE.Material; shadow: boolean; geos: THREE.BufferGeometry[] }>()
  const placer = new THREE.Object3D()
  const add = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, p: V3, rot: V3 = [0, 0, 0], castShadow = true) => {
    // Nothing inside casts sun shadows: the drum and dome already shade the whole room.
    const shadow = castShadow && parent !== interior
    placer.position.set(...p); placer.rotation.set(...rot); placer.updateMatrix()
    g.applyMatrix4(placer.matrix)
    const key = `${parent.uuid}|${m.uuid}|${shadow}`
    const b = batches.get(key) ?? { parent, m, shadow, geos: [] }
    b.geos.push(g); batches.set(key, b)
  }
  const bake = () => batches.forEach(({ parent, m, shadow, geos: parts }) => {
    const g = mergeGeometries(parts)!
    parts.forEach(q => q.dispose())
    solo(parent, g, m, [0, 0, 0], [0, 0, 0], shadow)
  })
  const gap = DOOR_HALF / LAB_RADIUS, gapIn = DOOR_HALF / LAB_INNER
  const wallGeo = (r: number, a: number, h = LAB_WALL, y0 = 0) => { const g = new THREE.CylinderGeometry(r, r, h, 72, 1, true, DOOR_PHI + a, Math.PI * 2 - 2 * a); g.translate(0, y0 + h / 2, 0); return g }
  const lintelGeo = (r: number, a: number) => { const g = new THREE.CylinderGeometry(r, r, LAB_WALL - DOOR_HEIGHT, 8, 1, true, DOOR_PHI - a, 2 * a); g.translate(0, DOOR_HEIGHT + (LAB_WALL - DOOR_HEIGHT) / 2, 0); return g }

  // --- Shell ---
  add(shell, wallGeo(LAB_RADIUS, gap), white, [CX, 0, CZ])
  add(shell, lintelGeo(LAB_RADIUS, gap), white, [CX, 0, CZ])
  add(shell, new THREE.CylinderGeometry(LAB_RADIUS + .12, LAB_RADIUS + .12, .4, 72, 1, true, DOOR_PHI + gap, Math.PI * 2 - 2 * gap).translate(0, .2, 0), dark, [CX, 0, CZ])
  add(shell, new THREE.CylinderGeometry(LAB_RADIUS + .2, LAB_RADIUS + .2, .35, 72, 1, true).translate(0, LAB_WALL - .1, 0), dark, [CX, 0, CZ])
  for (let k = 0; k < 16; k++) {
    const phi = k * Math.PI / 8 + Math.PI / 16
    if (Math.abs(Math.atan2(Math.sin(phi - DOOR_PHI), Math.cos(phi - DOOR_PHI))) < .35) continue
    add(shell, new THREE.BoxGeometry(.28, LAB_WALL, .12), dark, around(phi, LAB_RADIUS + .06, LAB_WALL / 2), [0, phi, 0])
  }
  add(shell, new THREE.SphereGeometry(LAB_RADIUS + .15, 56, 14, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, .4, 1), dome, [CX, LAB_WALL + .05, CZ])
  add(shell, new THREE.CylinderGeometry(.08, .12, 3.2, 8), steel, [CX, LAB_WALL + 3 + 1.6, CZ])
  add(shell, new THREE.SphereGeometry(.22, 12, 8), glow, [CX, LAB_WALL + 3 + 3.25, CZ], [0, 0, 0], false)
  add(shell, new THREE.TorusGeometry(.55, .05, 6, 24), steel, [CX, LAB_WALL + 3 + 2.2, CZ], [Math.PI / 2, 0, 0])
  // Door frame, plaque, and a division banner.
  const doorCenter = around(DOOR_PHI, LAB_RADIUS, 0)
  for (const s of [-1, 1]) add(shell, new THREE.BoxGeometry(.35, DOOR_HEIGHT + .2, .7), dark, [doorCenter[0] + .05, (DOOR_HEIGHT + .2) / 2, doorCenter[2] + s * (DOOR_HALF + .12)])
  add(shell, new THREE.BoxGeometry(.45, .3, DOOR_HALF * 2 + .6), dark, [doorCenter[0] + .05, DOOR_HEIGHT + .12, doorCenter[2]])
  const plaqueTex = plaqueTexture('技術開発局'); textures.push(plaqueTex)
  const plaque = mat(new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: .6 }))
  solo(shell, new THREE.BoxGeometry(.08, .62, 3.3), [plaque, dark, dark, dark, dark, dark], [doorCenter[0] + .28, DOOR_HEIGHT + .75, doorCenter[2]])
  // The same name in English, on a strip above.
  const englishTex = plaqueTexture('RESEARCH & DEVELOPMENT INSTITUTE', 96, '600 54px "Manrope", "DM Sans", sans-serif'); textures.push(englishTex)
  const english = mat(new THREE.MeshStandardMaterial({ map: englishTex, roughness: .6 }))
  solo(shell, new THREE.BoxGeometry(.06, .3, 3.3), [english, dark, dark, dark, dark, dark], [doorCenter[0] + .26, DOOR_HEIGHT + 1.27, doorCenter[2]])
  const doors = [-1, 1].map(s => solo(shell, new THREE.BoxGeometry(.1, DOOR_HEIGHT, DOOR_HALF), steel, [doorCenter[0] - .05, DOOR_HEIGHT / 2, doorCenter[2] + s * DOOR_HALF / 2]))
  const banner = new Banner({ position: [doorCenter[0] + 1.6, 0, doorCenter[2] + 3.4], yaw: Math.PI / 2, text: '十二番隊', cloth: '#f2eee3', ink: '#1d2230', height: 3.2 })
  shell.add(banner.group)

  // --- Interior ---
  const [floorMap, floorGlow] = floorTextures(); textures.push(floorMap, floorGlow)
  const floorMat = mat(new THREE.MeshLambertMaterial({ map: floorMap, emissiveMap: floorGlow, emissive: '#ffffff', emissiveIntensity: .9 }))
  add(interior, new THREE.CircleGeometry(LAB_INNER, 72), floorMat, [CX, LAB_FLOOR, CZ], [-Math.PI / 2, 0, 0], false)
  add(interior, wallGeo(LAB_INNER, gapIn), inner, [CX, 0, CZ], [0, 0, 0], false)
  add(interior, lintelGeo(LAB_INNER, gapIn).scale(1, 1, 1), inner, [CX, 0, CZ], [0, 0, 0], false)
  const band = (y: number, h: number, m: THREE.Material) => add(interior, new THREE.CylinderGeometry(LAB_INNER - .02, LAB_INNER - .02, h, 72, 1, true, DOOR_PHI + gapIn, Math.PI * 2 - 2 * gapIn).translate(0, y, 0), m, [CX, 0, CZ], [0, 0, 0], false)
  const trim = mat(new THREE.MeshLambertMaterial({ color: '#2c3640', side: THREE.BackSide }))
  band(.2, .3, trim); band(5.75, .12, trim)
  add(interior, new THREE.TorusGeometry(3.3, .07, 8, 72), glow, [CX, 5.95, CZ], [Math.PI / 2, 0, 0], false)
  add(interior, new THREE.TorusGeometry(1.4, .05, 8, 48), glow, [CX, 6.35, CZ], [Math.PI / 2, 0, 0], false)

  // The screen wall's bezels (the site screens themselves are live meshes in the director).
  const screenFrames: { position: THREE.Vector3; yaw: number; w: number; h: number; pitch?: number }[] = []
  for (const colOff of SCREEN_COLS) for (const y of SCREEN_ROWS) {
    const phi = SCREEN_PHI - colOff
    add(interior, new THREE.BoxGeometry(SCREEN_W + .16, SCREEN_H + .16, .1), dark, around(phi, SCREEN_R + .07, y), [0, phi + Math.PI, 0], false)
  }
  // Surrounding data screens: a band above the site screens and columns on either side.
  for (let k = 0; k < 13; k++) {
    const phi = SCREEN_PHI - 1.02 + k * (2.04 / 12)
    screenFrames.push({ position: new THREE.Vector3(...around(phi, LAB_INNER - .12, 4.85)), yaw: phi + Math.PI, w: .9, h: .62 })
  }
  for (const side of [-1, 1]) for (const [off, w] of [[.98, .86], [1.2, .8]] as [number, number][]) for (const y of [1.3, 2.3, 3.3]) {
    const phi = SCREEN_PHI + side * off
    screenFrames.push({ position: new THREE.Vector3(...around(phi, LAB_INNER - .12, y)), yaw: phi + Math.PI, w, h: .82 })
  }
  // The curved console, with keyboards and small tilted screens.
  const consoleBoxes: Box[] = []
  for (let k = 0; k < 9; k++) {
    const phi = SCREEN_PHI - .78 + k * (1.56 / 8)
    const p = around(phi, 5.35, .42)
    add(interior, new THREE.BoxGeometry(.9, .84, .66), consoleMat, p, [0, phi, 0])
    add(interior, new THREE.BoxGeometry(.9, .06, .5), dark, around(phi, 5.3, .87), [-.35, phi, 0], false)
    add(interior, new THREE.BoxGeometry(.6, .015, .14), glow, around(phi, 5.2, .91), [-.35, phi, 0], false)
    screenFrames.push({ position: new THREE.Vector3(...around(phi, 5.62, 1.12)), yaw: phi + Math.PI, w: .62, h: .4, pitch: -.25 })
    consoleBoxes.push({ position: p, half: [.45, .45, .34], yaw: phi })
  }
  const data = new DataScreens(screenFrames)
  data.mesh.name = 'lab-data'
  interior.add(data.mesh)

  // Server racks with blinking lights.
  const ledPoints: { position: THREE.Vector3; yaw: number }[] = []
  const rackBoxes: Box[] = []
  RACK_PHIS.forEach(phi => {
    const p = around(phi, LAB_INNER - .5, 1.3)
    add(interior, new THREE.BoxGeometry(.85, 2.6, .8), rack, p, [0, phi, 0])
    const f = dir(phi + Math.PI)
    add(interior, new THREE.BoxGeometry(.72, 2.35, .02), rackFace, [p[0] + f.x * .41, 1.3, p[2] + f.z * .41], [0, phi + Math.PI, 0], false)
    for (let row = 0; row < 16; row++) for (let colIdx = 0; colIdx < 5; colIdx++) {
      if (hash(row * 13 + colIdx * 7 + phi * 10) < .25) continue
      const lateral = (colIdx - 2) * .12, side = new THREE.Vector3(-f.z, 0, f.x)
      ledPoints.push({ position: new THREE.Vector3(p[0] + f.x * .425 + side.x * lateral, .35 + row * .135, p[2] + f.z * .425 + side.z * lateral), yaw: phi + Math.PI })
    }
    rackBoxes.push({ position: p, half: [.45, 1.3, .42], yaw: phi })
  })
  const leds = new Leds(ledPoints)
  leds.mesh.name = 'lab-leds'
  interior.add(leds.mesh)

  // Specimen tanks.
  const bubbles = new THREE.BufferGeometry()
  const seeds = new Float32Array(TANK_PHIS.length * 40 * 4)
  const origins = new Float32Array(TANK_PHIS.length * 40 * 3)
  TANK_PHIS.forEach((phi, ti) => {
    const p = around(phi, 5.4, 0)
    add(interior, new THREE.CylinderGeometry(.66, .72, .4, 20), dark, [p[0], .2, p[2]])
    add(interior, new THREE.CylinderGeometry(.5, .5, 2.1, 20), liquid, [p[0], 1.45, p[2]], [0, 0, 0], false)
    add(interior, new THREE.CylinderGeometry(.56, .56, 2.3, 24, 1, true), glass, [p[0], 1.55, p[2]], [0, 0, 0], false)
    add(interior, new THREE.CylinderGeometry(.62, .62, .25, 20), steel, [p[0], 2.82, p[2]])
    if (ti === 0) {
      add(interior, new THREE.SphereGeometry(.2, 10, 8), specimen, [p[0], 1.8, p[2]], [0, 0, 0], false)
      add(interior, new THREE.CylinderGeometry(.09, .03, .7, 6), specimen, [p[0] + .05, 1.35, p[2]], [0, 0, .2], false)
    }
    for (let k = 0; k < 40; k++) {
      const i = ti * 40 + k
      origins.set([p[0] + (hash(i * 3.1) - .5) * .7, .5, p[2] + (hash(i * 5.7) - .5) * .7], i * 3)
      seeds.set([hash(i * 1.3), hash(i * 7.7), hash(i * 2.9), 0], i * 4)
    }
  })
  bubbles.setAttribute('position', new THREE.BufferAttribute(origins, 3))
  bubbles.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
  const bubbleMat = mat(new THREE.ShaderMaterial({
    vertexShader: `attribute vec4 aSeed; uniform float uTime; uniform float uPixel; varying float vA;
      void main(){ float life = fract(uTime * (.25 + aSeed.x * .3) + aSeed.y); vec3 p = position; p.y += life * 1.9; p.x += sin(uTime * 3.0 + aSeed.z * 9.0) * .03;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; vA = smoothstep(0., .1, life) * (1. - smoothstep(.85, 1., life));
        gl_PointSize = (.03 + .03 * aSeed.z) * uPixel / max(.1, -mv.z); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5) * 2.0; float a = smoothstep(1.0, .6, d) * (1.0 - smoothstep(.5, .2, d) * .6) * vA; if (a < .01) discard; gl_FragColor = vec4(.8, 1.0, .9, a * .8); }`,
    uniforms: { uTime: { value: 0 }, uPixel: { value: 500 } }, transparent: true, depthWrite: false,
  }))
  const bubblePoints = new THREE.Points(bubbles, bubbleMat); geos.push(bubbles)
  bubblePoints.frustumCulled = false
  interior.add(bubblePoints)
  const tankBoxes: Box[] = TANK_PHIS.map(phi => ({ position: around(phi, 5.4, 1.4), half: [.62, 1.4, .62], yaw: 0 }))

  // Hologram projector.
  const hp = around(HOLO_SPOT.phi, HOLO_SPOT.r, 0)
  add(interior, new THREE.CylinderGeometry(.75, .85, .32, 28), dark, [hp[0], .16, hp[2]])
  add(interior, new THREE.TorusGeometry(.62, .035, 6, 40), glow, [hp[0], .34, hp[2]], [Math.PI / 2, 0, 0], false)
  const beamMat = mat(new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; varying vec2 vUv; void main(){ float a = (1.0 - vUv.y) * .22 * (.8 + .2 * sin(vUv.x * 60.0 + uTime * 3.0)); gl_FragColor = vec4(.55, .9, 1.0, a); }`,
    uniforms: { uTime: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  }))
  add(interior, new THREE.CylinderGeometry(.95, .6, 2.9, 32, 1, true), beamMat, [hp[0], .35 + 1.45, hp[2]], [0, 0, 0], false)
  // Cables snaking from the racks to the console.
  // Rack to console, along the wall on the far side from the door: [from, via, to] azimuths.
  for (const [a, m, b] of [[2.58, 3.3, 3.9], [3.28, 3.55, 3.82], [-.22, -.5, -.86]] as [number, number, number][]) {
    const pts = [around(a, LAB_INNER - .6, .06), around(m, 6.2, .05), around(b, 5.75, .06)].map(p => new THREE.Vector3(...p))
    add(interior, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .045, 5), cable, [0, 0, 0], [0, 0, 0], false)
  }
  bake()

  // The lab light lives on the shell: a light that comes and goes with culling would force
  // every material to recompile, so it stays in the scene and only reaches just past the walls.
  const light = new THREE.PointLight('#e6f4ff', 36, 9.5, 1)
  light.position.set(CX, 4.6, CZ)
  shell.add(light)

  // Colliders: the drum (in segments, leaving the doorway), furniture, projector.
  const walls: Box[] = []
  const N = 36
  for (let k = 0; k < N; k++) {
    const phi = (k + .5) * Math.PI * 2 / N
    if (Math.abs(Math.atan2(Math.sin(phi - DOOR_PHI), Math.cos(phi - DOOR_PHI))) < gap + Math.PI / N) continue
    walls.push({ position: around(phi, LAB_RADIUS - .15, 1.5), half: [LAB_RADIUS * Math.sin(Math.PI / N) + .1, 1.5, .25], yaw: phi })
  }
  const colliders = [...walls, ...consoleBoxes, ...rackBoxes, ...tankBoxes, { position: [hp[0], .3, hp[2]] as V3, half: [.8, .3, .8] as V3, yaw: 0 }]

  // Camera proxy: the drum and dome, for the follow camera's obstruction raycast.
  const proxy = new THREE.Group()
  proxy.name = 'lab-camera-proxy'
  const proxyMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }); mats.push(proxyMat)
  const pw = new THREE.Mesh(wallGeo(LAB_RADIUS, gap), proxyMat); pw.position.set(CX, 0, CZ)
  const pl = new THREE.Mesh(lintelGeo(LAB_RADIUS, gap), proxyMat); pl.position.set(CX, 0, CZ)
  const pd = new THREE.Mesh(new THREE.SphereGeometry(LAB_RADIUS, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), proxyMat); pd.position.set(CX, LAB_WALL, CZ); pd.scale.y = .4
  geos.push(pw.geometry, pl.geometry, pd.geometry)
  proxy.add(pw, pl, pd)
  proxy.updateMatrixWorld(true)

  return {
    shell, interior, doors, doorCenter, banner, data, leds, bubbleMat, beamMat, colliders, proxy,
    update(t: number, pixel: number, doorOpen: number) {
      data.update(t); leds.update(t)
      bubbleMat.uniforms.uTime.value = t; bubbleMat.uniforms.uPixel.value = pixel
      beamMat.uniforms.uTime.value = t
      banner.update(t)
      doors.forEach((d, i) => { d.position.z = doorCenter[2] + (i === 0 ? -1 : 1) * (DOOR_HALF / 2 + doorOpen * (DOOR_HALF - .1)) })
    },
    dispose() { geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); data.dispose(); leds.dispose(); banner.dispose() },
  }
}

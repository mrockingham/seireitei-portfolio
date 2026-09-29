// Everything that glows in the lab: the website screens (a screenshot, or a drawn page when there is
// none), the wall of animated data screens, blinking server lights, the floor's circuit pattern,
// and the hologram material for Mayuri's projection.
import * as THREE from 'three'
import { hash } from '../finale/timeline'
import type { Website } from '../portfolio-content'

export type SiteSlot = { site: Website | null; index: number }

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
const host = (url: string) => { try { return new URL(url).host } catch { return url } }

/** A page drawn in the lab's palette: the site's title and address, or a clearly marked placeholder. */
export function drawSiteTexture(slot: SiteSlot) {
  const W = 1280, H = 720
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#0c2438'); g.addColorStop(1, '#071522')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  // Browser chrome.
  ctx.fillStyle = '#123650'; ctx.fillRect(0, 0, W, 70)
  ;['#ff6b6b', '#ffc86b', '#6bdc8f'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(40 + i * 34, 35, 11, 0, Math.PI * 2); ctx.fill() })
  ctx.fillStyle = '#0a2233'; roundRect(ctx, 170, 16, 760, 38, 19); ctx.fill()
  ctx.fillStyle = '#8fd6f0'; ctx.font = '500 24px "DM Sans", Arial, sans-serif'; ctx.textBaseline = 'middle'
  const n = String(slot.index + 1).padStart(2, '0')
  ctx.fillText(slot.site ? host(slot.site.url) : `your-website-${n}.com`, 196, 36)
  // Hero block and page skeleton.
  const hero = ctx.createLinearGradient(80, 120, W - 80, 380)
  hero.addColorStop(0, '#1b6f8f'); hero.addColorStop(1, '#0f3f5e')
  ctx.fillStyle = hero; roundRect(ctx, 80, 110, W - 160, 290, 16); ctx.fill()
  ctx.strokeStyle = '#4fd1ff55'; ctx.lineWidth = 2; ctx.stroke()
  ctx.fillStyle = '#e8fbff'; ctx.font = '700 64px Georgia, serif'; ctx.textBaseline = 'alphabetic'
  const title = slot.site ? slot.site.title : `Your website ${n}`
  ctx.fillText(title.length > 30 ? title.slice(0, 29) + '…' : title, 130, 230)
  ctx.fillStyle = '#a9e3f5'; ctx.font = '400 28px "DM Sans", Arial, sans-serif'
  const sub = slot.site ? (slot.site.description || host(slot.site.url)) : 'Placeholder · add it in src/portfolio-content.ts'
  ctx.fillText(sub.length > 62 ? sub.slice(0, 61) + '…' : sub, 132, 290)
  ctx.fillStyle = '#4fd1ff'; roundRect(ctx, 130, 322, 210, 50, 25); ctx.fill()
  ctx.fillStyle = '#062033'; ctx.font = '700 24px "DM Sans", Arial, sans-serif'; ctx.fillText(slot.site ? 'Visit site' : 'Coming soon', 162, 355)
  for (let k = 0; k < 3; k++) {
    const x = 80 + k * ((W - 160 - 40) / 3 + 20), w = (W - 160 - 40) / 3
    ctx.fillStyle = '#0f2e45'; roundRect(ctx, x, 440, w, 220, 12); ctx.fill()
    ctx.fillStyle = '#1e5a78'; roundRect(ctx, x + 22, 462, w - 44, 90, 8); ctx.fill()
    ctx.fillStyle = '#35779a'; for (let l = 0; l < 3; l++) { ctx.fillRect(x + 22, 574 + l * 24, (w - 44) * (1 - l * .22), 10) }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/** Loads a screenshot from public/assets/websites (or any URL) and crops it to cover the screen. */
export function loadSiteImage(image: string, aspect: number, onLoad: (t: THREE.Texture) => void) {
  const url = /^(https?:)?\/\//.test(image) || image.startsWith('/') ? image : `/assets/websites/${image}`
  new THREE.TextureLoader().load(url, tex => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    const img = tex.image as { width: number; height: number }
    const r = img.width / img.height
    if (r > aspect) { tex.repeat.set(aspect / r, 1); tex.offset.set((1 - aspect / r) / 2, 0) }
    else { tex.repeat.set(1, r / aspect); tex.offset.set(0, 1 - r / aspect) }
    onLoad(tex)
  }, undefined, () => { /* Missing screenshot: keep the drawn page. */ })
}

// --- Data screens ------------------------------------------------------------------------------------
const dataVertex = `attribute vec2 aData; varying vec2 vUv; varying vec2 vData;
void main(){ vUv = uv; vData = aData;
  #ifdef USE_INSTANCING
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  #else
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #endif
}`
const dataFragment = `uniform float uTime; varying vec2 vUv; varying vec2 vData;
float h(float n){ return fract(sin(n * 127.1) * 43758.5453); }
void main(){
  vec2 uv = vUv; float kind = floor(vData.x); float s = vData.y; float t = uTime;
  vec3 bg = vec3(.03, .12, .2), ink = vec3(.3, .85, 1.0), warm = vec3(1.0, .75, .35);
  vec3 c = bg + vec3(0., .02, .04) * (1.0 - uv.y);
  float edge = step(uv.x, .012) + step(.988, uv.x) + step(uv.y, .02) + step(.98, uv.y);
  float g = step(.985, fract(uv.x * 12.0)) + step(.98, fract(uv.y * 8.0));
  c += ink * g * .06;
  if (kind < .5) { // waveforms
    for (int k = 0; k < 3; k++) { float fk = float(k);
      float y = .5 + .22 * sin(uv.x * (8.0 + fk * 5.0 + s * 6.0) + t * (1.5 + fk) + s * 10.0) * sin(uv.x * 3.0 + t * .7 + fk);
      c += mix(ink, warm, fk * .5) * smoothstep(.015, 0.0, abs(uv.y - (y * .6 + .2 + fk * .05))) * .9; }
  } else if (kind < 1.5) { // bar graph
    float b = floor(uv.x * 18.0); float hgt = .15 + .7 * (.5 + .5 * sin(t * 1.3 + b * .7 + s * 9.0)) * h(b + s * 17.0);
    c += ink * step(uv.y, hgt) * step(.15, fract(uv.x * 18.0)) * .7;
  } else if (kind < 2.5) { // radar sweep
    vec2 p = uv * 2.0 - 1.0; p.x *= 1.6; float r = length(p); float a = atan(p.y, p.x);
    float sweep = fract((a / 6.2832) - t * .25 + s);
    c += ink * (smoothstep(.02, 0., abs(fract(r * 4.0) - .5) - .47) * .35 + pow(sweep, 12.0) * step(r, 1.0) * .8);
    c += warm * step(.97, h(floor(a * 6.0) + floor(r * 5.0) + s)) * step(r, 1.0) * (.5 + .5 * sin(t * 4.0));
  } else if (kind < 3.5) { // scrolling text lines
    float line = floor(uv.y * 14.0 + t * 1.5 + s * 30.0); float len = .3 + .6 * h(line + s);
    c += ink * .55 * step(.25, fract(uv.y * 14.0 + t * 1.5)) * step(uv.x, len) * step(.04, uv.x) * step(.5, h(line * 3.1 + floor(uv.x * 30.0)));
  } else { // helix
    float y = uv.y * 6.28 * 1.5 + t;
    float x1 = .5 + .3 * sin(y + s * 6.0), x2 = .5 - .3 * sin(y + s * 6.0);
    c += ink * (smoothstep(.02, 0., abs(uv.x - x1)) + smoothstep(.02, 0., abs(uv.x - x2))) * .8;
    c += warm * .5 * step(.9, fract(uv.y * 12.0)) * step(min(x1, x2), uv.x) * step(uv.x, max(x1, x2));
  }
  c += ink * edge * .5;
  gl_FragColor = vec4(c, 1.0);
}`
/** Many small animated screens in one draw call: waveforms, bars, radar, text, helices. */
export class DataScreens {
  readonly mesh: THREE.InstancedMesh
  private readonly mat: THREE.ShaderMaterial
  constructor(frames: { position: THREE.Vector3; yaw: number; w: number; h: number; pitch?: number }[]) {
    const geo = new THREE.PlaneGeometry(1, 1)
    const data = new Float32Array(frames.length * 2)
    frames.forEach((_, i) => data.set([Math.floor(hash(i * 3.7) * 5), hash(i * 9.1 + 2)], i * 2))
    geo.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 2))
    this.mat = new THREE.ShaderMaterial({ vertexShader: dataVertex, fragmentShader: dataFragment, uniforms: { uTime: { value: 0 } }, toneMapped: false })
    this.mesh = new THREE.InstancedMesh(geo, this.mat, frames.length)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), s = new THREE.Vector3()
    frames.forEach((f, i) => { q.setFromEuler(e.set(f.pitch ?? 0, f.yaw, 0)); this.mesh.setMatrixAt(i, m.compose(f.position, q, s.set(f.w, f.h, 1))) })
    this.mesh.frustumCulled = false
  }
  dispose() { this.mesh.geometry.dispose(); this.mat.dispose(); this.mesh.dispose() }
  update(t: number) { this.mat.uniforms.uTime.value = t }
}

// --- Server lights -----------------------------------------------------------------------------------
/** Blinking status lights on the server racks, one draw call. */
export class Leds {
  readonly mesh: THREE.InstancedMesh
  private readonly mat: THREE.ShaderMaterial
  constructor(points: { position: THREE.Vector3; yaw: number }[]) {
    const geo = new THREE.PlaneGeometry(.035, .02)
    const data = new Float32Array(points.length * 2)
    points.forEach((_, i) => data.set([hash(i * 1.37), hash(i * 7.3 + 1)], i * 2))
    geo.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 2))
    this.mat = new THREE.ShaderMaterial({
      vertexShader: dataVertex,
      fragmentShader: `uniform float uTime; varying vec2 vData;
        void main(){ float on = step(.45, fract(uTime * (.4 + vData.x * 2.5) + vData.y));
          vec3 c = vData.y < .7 ? vec3(.3, 1.0, .6) : vData.y < .92 ? vec3(.35, .8, 1.0) : vec3(1.0, .35, .3);
          gl_FragColor = vec4(c * (.25 + on * 1.4), 1.0); }`,
      uniforms: { uTime: { value: 0 } }, toneMapped: false,
    })
    this.mesh = new THREE.InstancedMesh(geo, this.mat, points.length)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1)
    points.forEach((p, i) => this.mesh.setMatrixAt(i, m.compose(p.position, q.setFromAxisAngle(up, p.yaw), one)))
    this.mesh.frustumCulled = false
  }
  dispose() { this.mesh.geometry.dispose(); this.mat.dispose(); this.mesh.dispose() }
  update(t: number) { this.mat.uniforms.uTime.value = t }
}

/** Floor: pale panels with glowing circuit rings, drawn once. Returns [color map, emissive map]. */
export function floorTextures() {
  const S = 1024
  const make = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c }
  const base = make(), glowC = make()
  const b = base.getContext('2d')!, e = glowC.getContext('2d')!
  b.fillStyle = '#d9dee2'; b.fillRect(0, 0, S, S)
  e.fillStyle = '#000'; e.fillRect(0, 0, S, S)
  b.strokeStyle = '#b9c1c7'; b.lineWidth = 3
  for (let r = 80; r < S / 2; r += 80) { b.beginPath(); b.arc(S / 2, S / 2, r, 0, Math.PI * 2); b.stroke() }
  for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; b.beginPath(); b.moveTo(S / 2 + Math.cos(a) * 80, S / 2 + Math.sin(a) * 80); b.lineTo(S / 2 + Math.cos(a) * S / 2, S / 2 + Math.sin(a) * S / 2); b.stroke() }
  e.strokeStyle = '#3fc9ff'; e.lineWidth = 5
  for (const r of [120, 250, 380]) { e.beginPath(); e.arc(S / 2, S / 2, r, 0, Math.PI * 2); e.stroke() }
  e.lineWidth = 3
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + .2, r0 = 120 + (k % 3) * 130
    e.beginPath(); e.moveTo(S / 2 + Math.cos(a) * r0, S / 2 + Math.sin(a) * r0)
    e.lineTo(S / 2 + Math.cos(a) * (r0 + 110), S / 2 + Math.sin(a) * (r0 + 110)); e.lineTo(S / 2 + Math.cos(a + .12) * (r0 + 130), S / 2 + Math.sin(a + .12) * (r0 + 130)); e.stroke()
  }
  const map = new THREE.CanvasTexture(base), emissive = new THREE.CanvasTexture(glowC)
  map.colorSpace = emissive.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = emissive.anisotropy = 8
  return [map, emissive] as const
}

/** Mayuri's projection: skinned body colours washed with a shifting rainbow and scanlines. */
export function createHologramMaterial(time: { value: number }, vertexColors: boolean) {
  // Normal blending: an additive projection would wash out to white against the lab's pale walls.
  const mat = new THREE.MeshBasicMaterial({ vertexColors, color: vertexColors ? '#ffffff' : '#bfe9ff', transparent: true, opacity: .72, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
  mat.onBeforeCompile = shader => {
    shader.uniforms.uTime = time
    shader.vertexShader = 'varying vec3 vHoloPos;\n' + shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vHoloPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader = 'uniform float uTime; varying vec3 vHoloPos;\n' + shader.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      vec3 rainbow = .68 + .32 * cos(6.2832 * (vHoloPos.y * .55 + (vHoloPos.x + vHoloPos.z) * .25 + uTime * .18 + vec3(0., .33, .67)));
      float dots = step(.35, length(fract(vHoloPos.xy * vec2(26.0, 26.0)) - .5));
      float scan = .75 + .25 * step(.5, fract(vHoloPos.y * 22.0 - uTime * 2.0));
      gl_FragColor.rgb = mix(gl_FragColor.rgb * .6, rainbow, .78) * scan * (.8 + .2 * dots);
      gl_FragColor.a *= .75 + .25 * dots;`)
  }
  mat.customProgramCacheKey = () => `lab-hologram-${vertexColors}`
  return mat
}

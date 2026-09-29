// Arrival through the Senkaimon: when the journey is finished, Ichigo is carried to the front of the
// Twelfth Division lab. As the gate's doors part on screen, a column of light stands where he lands,
// a ring runs out across the paving, sparks rise, and hell butterflies spiral up and scatter.
// Everything is a function of the time since the arrival; nothing shows otherwise.
import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Flashes, Particles, Rings } from './finale/effects'
import { ButterflyBurst } from './life/critters'
import type { Vec3 } from './World'

export type Arrival = { serial: number; at: Vec3 }

const pillarVertex = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
const pillarFragment = `
uniform float uAlpha; uniform float uTime; varying vec2 vUv;
void main(){
  float fade = pow(1.0 - vUv.y, 1.6);
  float streak = .65 + .35 * sin(vUv.x * 40.0 + uTime * 6.0 + vUv.y * 8.0);
  gl_FragColor = vec4(mix(vec3(.75, .85, 1.0), vec3(1.0), fade), fade * streak * uAlpha);
}`

function ArrivalFx({ arrival }: { arrival: Arrival | null }) {
  const { camera, size, gl } = useThree()
  const group = useRef<THREE.Group>(null)
  const start = useRef<{ serial: number; t: number }>({ serial: -1, t: -100 })
  const fx = useMemo(() => {
    const pillarMat = new THREE.ShaderMaterial({
      vertexShader: pillarVertex, fragmentShader: pillarFragment, uniforms: { uAlpha: { value: 0 }, uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    })
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 14, 32, 1, true).translate(0, 7, 0), pillarMat)
    pillar.renderOrder = 12
    const rings = new Rings([
      { t: 0, x: 0, y: .05, z: 0, radius: 7, duration: 1.3, color: '#e8f2ff', alpha: .8, width: .04 },
      { t: .25, x: 0, y: .05, z: 0, radius: 4, duration: 1.0, color: '#c9b8ff', alpha: .6, width: .05 },
    ])
    const flashes = new Flashes([{ t: 0, p: [0, 1.1, 0], from: .4, to: 2.6, duration: .7, color: '#f2f6ff', alpha: .8 }])
    const sparks = new Particles([
      { t: 0, spread: .6, count: 140, origin: [0, .2, 0], box: [.7, .1, .7], vel: [0, 3.2, 0], speed: [.4, 1.6], radial: true, drag: .6, life: [1.0, 2.2], size: [.04, .09], colors: ['#ffffff', '#dfe8ff', '#c9b8ff', '#fff4d0'] },
    ], true, false, .02)
    const dust = new Particles([
      { t: 0, count: 36, origin: [0, .06, 0], box: [.4, .02, .4], radial: true, flat: true, up: .2, speed: [1.5, 4], drag: 1.8, life: [.9, 1.6], size: [.35, .8], colors: ['#e6e1d6', '#d4cfc3'] },
    ], false, true, .02)
    const butterflies = new ButterflyBurst(18)
    return { pillarMat, pillar, rings, flashes, sparks, dust, butterflies }
  }, [])
  useEffect(() => () => {
    fx.pillar.geometry.dispose(); fx.pillarMat.dispose(); fx.rings.dispose(); fx.flashes.dispose(); fx.sparks.dispose(); fx.dust.dispose(); fx.butterflies.dispose()
  }, [fx])

  useFrame(state => {
    const g = group.current
    if (!g) return
    if (arrival && arrival.serial !== start.current.serial) {
      start.current = { serial: arrival.serial, t: state.clock.elapsedTime }
      g.position.set(...arrival.at)
    }
    const t = state.clock.elapsedTime - start.current.t
    const live = !!arrival && t < 4.5
    // eslint-disable-next-line react/immutability -- scene objects are updated per frame by design.
    g.visible = live
    if (!live) return
    const a = THREE.MathUtils.smoothstep(t, 0, .25) * (1 - THREE.MathUtils.smoothstep(t, .9, 2.4))
    // eslint-disable-next-line react/immutability -- the arrival effect objects are owned here and animated per frame.
    fx.pillar.visible = a > .01
    fx.pillar.scale.set(1.2 - .7 * THREE.MathUtils.smoothstep(t, .3, 2.2), 1, 1.2 - .7 * THREE.MathUtils.smoothstep(t, .3, 2.2))
    fx.pillarMat.uniforms.uAlpha.value = a * .9
    fx.pillarMat.uniforms.uTime.value = t
    fx.rings.update(t); fx.flashes.update(t); fx.butterflies.update(t)
    const pixel = size.height * gl.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) / 2))
    fx.sparks.update(t, pixel); fx.dust.update(t, pixel)
  })

  return <group ref={group} visible={false} name="arrival-fx">
    <primitive object={fx.pillar} />
    <primitive object={fx.rings.group} />
    <primitive object={fx.flashes.group} />
    <primitive object={fx.dust.points} />
    <primitive object={fx.sparks.points} />
    <primitive object={fx.butterflies.mesh} />
  </group>
}

export default memo(ArrivalFx)

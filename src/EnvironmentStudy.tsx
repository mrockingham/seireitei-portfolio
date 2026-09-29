// Development-only, repeatable cameras for environment art comparisons.
import { Suspense, useCallback, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import World from './World'
import type { Controls, Vec3 } from './World'

const shots: Record<string, { eye: Vec3; target: Vec3; feet: Vec3 }> = {
  gate: { eye: [9, 3.7, 18], target: [0, 5, 12], feet: [0, .3, 8] },
  street: { eye: [10, 2.7, 6], target: [28, 4.2, -3], feet: [15, .2, 5] },
  hall: { eye: [28, 2.8, -2.5], target: [27, 3.5, -18], feet: [28, .7, -5] },
  garden: { eye: [-29, 3.4, -18], target: [-21, 2.2, -35], feet: [-22, .4, -20] },
  hill: { eye: [-25, 24.2, -80], target: [8, 25, -93], feet: [-22, 22.2, -79] },
}
function StudyCamera({ shot }: { shot: typeof shots[string] }) {
  useFrame(({ camera, gl, scene }) => {
    camera.position.set(...shot.eye)
    camera.lookAt(...shot.target)
    gl.render(scene, camera)
  }, 1)
  return null
}
export default function EnvironmentStudy({ name }: { name: string }) {
  const shot = shots[name] ?? shots.gate
  const controls = useRef<Controls>({ keys: new Set(), yaw: 0, pitch: .33, distance: 6, cameraMode: 'free', stick: { x: 0, y: 0 } })
  const noop = useCallback(() => {}, [])
  return <main>
    <div className="scene" aria-label={`Environment study: ${name}`}>
      <Canvas shadows="percentage" dpr={[1, 1.5]} camera={{ fov: 52, near: .08, far: 350 }}>
        <color attach="background" args={['#b5cfdd']} />
        <fog attach="fog" args={['#b5cfdd', 110, 250]} />
        <Suspense fallback={null}>
          <Physics timeStep={1 / 60} interpolate={false}>
            <World stage={0} gateComplete={false} nextStage={0} arrival={null} phase="idle" playing={false} entered controls={controls} travel={{ serial: 0, position: shot.feet }} onReady={noop} onPosition={noop} gallery={null} onSelectSite={noop} />
          </Physics>
          <StudyCamera shot={shot} />
        </Suspense>
      </Canvas>
    </div>
    <nav style={{ position: 'absolute', bottom: 16, left: 20, display: 'flex', gap: 18, padding: '10px 16px', background: '#172a2ed9', fontSize: 12 }}>
      {Object.keys(shots).map(key => <a key={key} href={`?artReview=${key}`} style={{ color: key === name ? '#f2c58d' : '#fff' }}>{key}</a>)}
      <a href="/" style={{ color: '#fff' }}>Play world ↗</a>
    </nav>
  </main>
}

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { FinaleMood } from './finale/timeline'

const skyVertex=`varying vec3 vDirection;
void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`
const skyFragment=`
varying vec3 vDirection;
uniform vec3 zenith;
uniform vec3 horizon;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
  vec3 d=normalize(vDirection);
  float elevation=max(d.y,0.0);
  vec3 color=mix(horizon,zenith,pow(elevation,0.48));
  vec2 p=d.xz/max(d.y+0.12,0.12)*2.0;
  p*=vec2(0.70,1.6);
  float cloud=noise(p)*0.6+noise(p*2.03)*0.27+noise(p*4.1)*0.13;
  float w=smoothstep(0.57,0.77,cloud)*smoothstep(0.025,0.15,elevation);
  color=mix(color,vec3(0.91,0.93,0.86),w*0.8);
  gl_FragColor=vec4(color,1.0);
  #include <colorspace_fragment>
}`

// Cinematic tints: pink during Senbonzakura, a crimson dusk for Tensa Zangetsu, gold as it settles,
// and a pale frost while Sode no Shirayuki's ice fills the gate courtyard.
const moodPresets={
  base:{zenith:new THREE.Color('#5b9fc8'),horizon:new THREE.Color('#c9dcd9'),sun:new THREE.Color('#fff0d8')},
  pink:{zenith:new THREE.Color('#7d93c9'),horizon:new THREE.Color('#f1c9d6'),sun:new THREE.Color('#ffe2ea')},
  dusk:{zenith:new THREE.Color('#2a2436'),horizon:new THREE.Color('#7a3a47'),sun:new THREE.Color('#ff9a8a')},
  gold:{zenith:new THREE.Color('#6aa6d6'),horizon:new THREE.Color('#f4ddb2'),sun:new THREE.Color('#ffd9a2')},
  cold:{zenith:new THREE.Color('#8fbfe2'),horizon:new THREE.Color('#e9f6fb'),sun:new THREE.Color('#e8f4ff')},
}

export default function Environment({ anchor, mood }: {
  anchor: React.RefObject<THREE.Vector3>
  mood?: React.RefObject<FinaleMood>
}) {
  const sun=useRef<THREE.DirectionalLight>(null)
  const fill=useRef<THREE.DirectionalLight>(null)
  const sky=useRef<THREE.Mesh>(null)
  const hemi=useRef<THREE.HemisphereLight>(null)
  const fog=useRef<THREE.Fog>(null)
  const target=useMemo(()=>new THREE.Object3D(),[])
  const skyMaterial=useMemo(()=>new THREE.ShaderMaterial({
    vertexShader:skyVertex,fragmentShader:skyFragment,
    uniforms:{zenith:{value:new THREE.Color('#5b9fc8')},horizon:{value:new THREE.Color('#c9dcd9')}},
    side:THREE.BackSide,depthWrite:false,toneMapped:false,
  }),[])
  useEffect(()=>()=>skyMaterial.dispose(),[skyMaterial])
  useFrame(({ camera })=>{
    if(sky.current)sky.current.position.copy(camera.position)
    const m=mood?.current
    if(m){
      const {base,pink,dusk,gold,cold}=moodPresets
      const z=skyMaterial.uniforms.zenith.value as THREE.Color, h=skyMaterial.uniforms.horizon.value as THREE.Color
      z.copy(base.zenith).lerp(cold.zenith,m.cold).lerp(pink.zenith,m.pink).lerp(gold.zenith,m.gold).lerp(dusk.zenith,m.dusk)
      h.copy(base.horizon).lerp(cold.horizon,m.cold).lerp(pink.horizon,m.pink).lerp(gold.horizon,m.gold).lerp(dusk.horizon,m.dusk)
      if(fog.current)fog.current.color.copy(h)
      if(sun.current){
        sun.current.color.copy(base.sun).lerp(cold.sun,m.cold).lerp(pink.sun,m.pink).lerp(gold.sun,m.gold).lerp(dusk.sun,m.dusk)
        sun.current.intensity=2.5*(1-m.dusk*.5)*(1+m.gold*.08)
      }
      if(fill.current)fill.current.intensity=.65*(1-m.dusk*.8)
      if(hemi.current)hemi.current.intensity=1.5*(1-m.dusk*.45)
    }
    if(sun.current){
      // One 2048 map follows the player; stable increments reduce shadow shimmer.
      const x=Math.round(anchor.current.x*16)/16
      const y=Math.round(anchor.current.y*16)/16
      const z=Math.round(anchor.current.z*16)/16
      target.position.set(x,y,z);target.updateMatrixWorld()
      sun.current.position.set(x+36,y+58,z+24)
      fill.current?.position.set(x-32,y+18,z+36)
    }
  })
  return <>
    <fog ref={fog} attach="fog" args={['#c9dcd9',75,230]} />
    <mesh ref={sky} renderOrder={-1000} material={skyMaterial} frustumCulled={false}>
      <sphereGeometry args={[290,32,16]} />
    </mesh>
    <hemisphereLight ref={hemi} args={['#dcecff','#a49d86',1.5]} />
    <ambientLight intensity={.14} />
    <primitive object={target} />
    <directionalLight ref={sun} target={target} position={[36,58,24]} intensity={2.5} color="#fff0d8" castShadow
      shadow-mapSize={[2048,2048]} shadow-camera-left={-44} shadow-camera-right={44}
      shadow-camera-top={44} shadow-camera-bottom={-44} shadow-camera-near={1} shadow-camera-far={155}
      shadow-bias={-.00015} shadow-normalBias={.03} />
    {/* Broad sky bounce: no second shadow map, and it dims with the Bankai mood. */}
    <directionalLight ref={fill} target={target} position={[-32,18,36]} intensity={.65} color="#c4ddff" />
    <pointLight position={[28,5,-11]} intensity={48} distance={22} decay={1} color="#ffddb2" />
    <pointLight position={[-22,4,-51]} intensity={32} distance={21} decay={1} color="#ffedcc" />
  </>
}

import { useMemo } from 'react'
import * as THREE from 'three'

export default function ButterflyMark(){
  const shape=useMemo(()=>{
    const s=new THREE.Shape()
    s.moveTo(0,0);s.bezierCurveTo(.04,.13,.16,.20,.25,.25);s.bezierCurveTo(.24,.08,.16,.01,0,0)
    const hole=new THREE.Path();hole.moveTo(.055,.047);hole.bezierCurveTo(.12,.06,.19,.1,.20,.19);hole.bezierCurveTo(.13,.17,.08,.10,.055,.047);s.holes.push(hole)
    return s
  },[])
  return <group position={[0,1.12,-.335]} rotation={[0,Math.PI,0]} scale={.55}>
    {[0,1,2,3].map(i=><mesh key={i} rotation={[0,0,i*Math.PI/2]}><shapeGeometry args={[shape]}/><meshBasicMaterial color="#101019" side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2}/></mesh>)}
  </group>
}

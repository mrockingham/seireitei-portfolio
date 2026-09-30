import * as THREE from 'three'

const surfaceNoise = `
varying vec3 vArtPosition;
float artHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float artNoise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(artHash(i),artHash(i+vec2(1,0)),f.x),mix(artHash(i+vec2(0,1)),artHash(i+vec2(1,1)),f.x),f.y);
}`
const surfaceFragments: Record<string, string> = {
  paving: `
    vec2 p=vec2(vArtPosition.x,-vArtPosition.z)/vec2(1.65,1.05);
    p.x+=mod(floor(p.y),2.0)*0.5;
    vec2 cell=fract(p), fw=max(fwidth(p),vec2(0.0001));
    vec2 joints=smoothstep(vec2(0.012),vec2(0.012)+fw*1.2,min(cell,1.0-cell));
    float joint=mix(1.0,min(joints.x,joints.y),1.0-smoothstep(0.10,0.38,max(fw.x,fw.y)));
    float stone=0.91+0.12*artHash(floor(p));
    diffuseColor.rgb*=mix(0.78,stone,joint)*(0.97+0.04*artNoise(vArtPosition.xz*4.0));
  `,
  plaster: `diffuseColor.rgb*=0.96+0.045*artNoise(vArtPosition.xy*3.0+vArtPosition.z);`,
  wood: `
    float grain=artNoise(vec2(vArtPosition.x*23.0+vArtPosition.y*3.0,vArtPosition.z*0.65));
    diffuseColor.rgb*=0.85+0.23*grain;
  `,
  rock: `
    float n=artNoise(vArtPosition.xz*0.7+vArtPosition.y*0.2);
    float strata=sin(vArtPosition.y*2.6+n*3.5)*0.055;
    diffuseColor.rgb*=0.85+n*0.24+strata;
  `,
  sand: `diffuseColor.rgb*=0.92+0.12*artNoise(vArtPosition.xz*1.7);`,
  moss: `diffuseColor.rgb*=0.83+0.28*artNoise(vArtPosition.xz*1.3);`,
  water: `
    vec2 p=vArtPosition.xz;
    float ripple=sin(p.x*2.2+p.y*3.4-artTime*.7+sin(p.x*.9+artTime*.3)*.6);
    float glint=smoothstep(.96,1.0,ripple)*smoothstep(.45,.85,artNoise(p*.85));
    float fresnel=pow(1.0-clamp(normalize(cameraPosition-vArtPosition).y,0.0,1.0),3.0);
    diffuseColor.rgb*=.94+.06*sin(p.x*.7+artTime*.3);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.30,.43,.46),fresnel*.45);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.45,.62,.57),glint*.14);
  `,
}

// Clone once per source material, keeping GLTFLoader's shared cache unmodified.
export function makeEnvironmentMaterial(source: THREE.Material) {
  const mat=source.clone()
  const surface=source.userData.surface as string | undefined
  if (surface && surfaceFragments[surface] && mat instanceof THREE.MeshStandardMaterial) {
    // Runtime treatment follows the exported surface tag, so future Blender exports retain it.
    if (surface === 'water') {
      mat.color.setRGB(.052,.185,.16)
      mat.roughness=.34
    }
    const time=new THREE.Uniform(0)
    mat.userData.artTime=time
    mat.onBeforeCompile=shader => {
      shader.uniforms.artTime=time
      shader.vertexShader=shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vArtPosition;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvArtPosition=(modelMatrix*vec4(transformed,1.0)).xyz;')
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float artTime;\n'+surfaceNoise)
        .replace('#include <color_fragment>', '#include <color_fragment>\n'+surfaceFragments[surface])
      if (surface === 'water') {
        // Small normal ripples catch the existing sun; no reflection render pass or new texture.
        shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          vec2 waterP=vArtPosition.xz;
          float slopeX=.022*cos(waterP.x*2.2+waterP.y*3.4-artTime*.7);
          float slopeZ=.018*cos(waterP.y*2.8-waterP.x*.9+artTime*.45);
          normal=normalize(normal+mat3(viewMatrix)*vec3(-slopeX,0.0,-slopeZ));
        `)
      }
    }
    mat.customProgramCacheKey=()=>'seireitei-surface-v2-'+surface
  }
  return mat
}


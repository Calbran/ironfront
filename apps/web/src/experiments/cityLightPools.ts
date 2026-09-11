import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** One surface batch for static fixture spill; no additional shadow cameras. */
export function cityLightPools(points: {x:number;z:number;radius:number}[], height:(x:number,z:number)=>number) {
  if (!points.length) return undefined;
  const parts = points.map(p => {
    const g = new T.CircleGeometry(p.radius, 16).rotateX(-Math.PI / 2);
    const pos = g.getAttribute("position");
    for (let i=0;i<pos.count;i++) {
      const x=p.x+pos.getX(i), z=p.z+pos.getZ(i);
      pos.setXYZ(i,x,height(x,z)+.305,z);
    }
    return g;
  });
  const geometry=mergeGeometries(parts)!;
  parts.forEach(g=>g.dispose());
  const material=new T.ShaderMaterial({
    transparent:true, depthWrite:false, blending:T.AdditiveBlending,
    uniforms:{strength:{value:0}},
    vertexShader:`varying vec2 poolUV;void main(){poolUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec2 poolUV;uniform float strength;void main(){float r=length(poolUV-.5)*2.;float falloff=pow(max(0.,1.-r*r),2.);gl_FragColor=vec4(vec3(1.,.58,.22)*strength,falloff*.32);}`,
  });
  const mesh=new T.Mesh(geometry,material);
  mesh.name="Batched fixture light pools";
  mesh.renderOrder=2;
  return {mesh, setDusk:(enabled:boolean)=>{material.uniforms.strength.value=enabled?1:0;mesh.visible=enabled;}};
}

import * as T from "three";

/** Screen-door cutaway keeps the opaque batches and reveals selected units through buildings. */
export function cityOcclusion(materials: Iterable<T.Material>) {
  const eye={value:new T.Vector3()}, targets={value:Array.from({length:8},()=>new T.Vector3())}, count={value:0};
  const obscures=(point:T.Vector3)=>targets.value.slice(0,count.value).some(target=>{
    const line=target.clone().sub(eye.value), delta=point.clone().sub(eye.value);
    const t=delta.dot(line)/Math.max(line.lengthSq(),.001);
    return t>.01 && t<.99 && delta.addScaledVector(line,-t).length()<1.8;
  });
  for(const material of new Set(materials)) {
    const old=material.onBeforeCompile, oldKey=material.customProgramCacheKey();
    material.onBeforeCompile=(shader,renderer)=>{
      old.call(material,shader,renderer);
      shader.uniforms.cityEye=eye;shader.uniforms.cityTargets=targets;shader.uniforms.cityTargetCount=count;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 citySurface;').replace('#include <project_vertex>',`#include <project_vertex>
        vec4 cityLocal=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          cityLocal=instanceMatrix*cityLocal;
        #endif
        citySurface=(modelMatrix*cityLocal).xyz;`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 citySurface;uniform vec3 cityEye;uniform vec3 cityTargets[8];uniform int cityTargetCount;').replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
        float cityFade=0.;
        for(int i=0;i<8;i++){
          if(i>=cityTargetCount)break;
          vec3 line=cityTargets[i]-cityEye,delta=citySurface-cityEye;
          float t=dot(delta,line)/max(dot(line,line),.001);
          float d=length(delta-line*t);
          if(t>.01&&t<.99)cityFade=max(cityFade,1.-smoothstep(1.2,2.2,d));
        }
        float stipple=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
        if(stipple<cityFade*.88)discard;`);
    };
    material.customProgramCacheKey=()=>oldKey+'-selection-cutaway-v1';
    material.userData.cityCutawayPoint=obscures;
    material.needsUpdate=true;
  }
  return {update(camera:T.Camera,points:T.Vector3[]){eye.value.copy(camera.position);count.value=Math.min(8,points.length);points.slice(0,8).forEach((p,i)=>targets.value[i].copy(p));}};
}

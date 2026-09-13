import * as T from "three";

// One shared moving cloud field drives the sky and its ground projection.
const field = `
uniform float cloudTime;
uniform float cloudDay;
uniform vec3 cloudSun;
float cloudHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float cloudNoise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(cloudHash(i),cloudHash(i+vec2(1,0)),f.x),
             mix(cloudHash(i+vec2(0,1)),cloudHash(i+vec2(1,1)),f.x),f.y);
}
float cloudField(vec2 world) {
  vec2 p=(world-vec2(cloudTime*2.,cloudTime*.65))*.003;
  float n=cloudNoise(p)*.7+cloudNoise(p*2.1+17.)*.3;
  return smoothstep(.48,.69,n);
}`;

export function countryAtmosphere(scene: T.Scene) {
  const uniforms = {
    cloudTime: { value: 0 },
    cloudDay: { value: 1 },
    cloudSun: { value: new T.Vector3(0, 1, 0) },
  };
  const skyMaterial = new T.ShaderMaterial({
    uniforms,
    side: T.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `varying vec3 skyRay;
      void main(){skyRay=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `${field}
      varying vec3 skyRay;
      void main(){
        vec3 ray=normalize(skyRay);
        float up=smoothstep(-.08,.75,ray.y);
        vec3 day=mix(vec3(.54,.65,.69),vec3(.18,.38,.55),up);
        vec3 night=mix(vec3(.025,.045,.075),vec3(.006,.012,.033),up);
        vec3 sky=mix(night,day,cloudDay);
        float glow=pow(max(0.,dot(ray,cloudSun)),80.);
        sky+=vec3(1.,.75,.4)*glow*.45*cloudDay;
        // Clouds occupy a physical horizontal layer at world height 420.
        float t=(420.-cameraPosition.y)/ray.y;
        if(t>0. && t<16000.) {
          vec2 p=(cameraPosition+ray*t).xz;
          float cloud=cloudField(p)*(1.-smoothstep(8000.,16000.,t));
          float edge=cloudField(p+cloudSun.xz*48.);
          vec3 lit=mix(vec3(.035,.055,.09),mix(vec3(.59,.64,.65),vec3(.96,.93,.83),1.-edge*.65),cloudDay);
          sky=mix(sky,lit,cloud*.88);
        }
        gl_FragColor=vec4(sky,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const geometry = new T.SphereGeometry(10000, 24, 12);
  const sky = new T.Mesh(geometry, skyMaterial);
  sky.frustumCulled = false;
  sky.renderOrder = -100;
  scene.add(sky);
  return {
    shadeGround(shader: T.WebGLProgramParametersWithUniforms) {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 cloudWorld;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ncloudWorld=(modelMatrix*vec4(position,1.)).xyz;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>\nvarying vec3 cloudWorld;\n${field}`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          // Soldier-scale soil flecks and worn patches; no repeating bitmap.
          float closeDetail=1.-smoothstep(65.,220.,distance(cameraPosition,cloudWorld));
          // Skip soldier-scale procedural work outside its visible range. This
          // uniform branch removes three noise fields from strategic terrain.
          if(closeDetail>.001) {
            float grainFade=1.-smoothstep(.3,.9,length(fwidth(cloudWorld.xz*12.)));
            float soil=cloudNoise(cloudWorld.xz*.7)*.65+cloudNoise(cloudWorld.xz*2.3)*.35;
            float grit=cloudNoise(cloudWorld.xz*12.);
            vec2 stoneCell=floor(cloudWorld.xz*3.);
            vec2 stoneLocal=fract(cloudWorld.xz*3.)-vec2(cloudHash(stoneCell),cloudHash(stoneCell+23.));
            float pebble=(1.-smoothstep(.06,.17,length(stoneLocal)))*step(.82,cloudHash(stoneCell+49.));
            vec3 detailed=diffuseColor.rgb*(.78+soil*.34+(grit-.5)*.20*grainFade);
            vec3 stoneTone=mix(vec3(.105,.10,.075),vec3(.28,.27,.21),smoothstep(-.06,.08,stoneLocal.y));
            detailed=mix(detailed,stoneTone,pebble*grainFade*.75);
            diffuseColor.rgb=mix(diffuseColor.rgb,detailed,closeDetail);
          }
        `,
        )
        .replace(
          "#include <opaque_fragment>",
          `
          vec2 projectedCloud=cloudWorld.xz+cloudSun.xz*(420.-cloudWorld.y)/max(.25,cloudSun.y);
          outgoingLight*=1.-cloudField(projectedCloud)*.23*cloudDay;
          #include <opaque_fragment>`,
        );
    },
    update(camera: T.Camera, sun: T.Vector3, daylight: number) {
      sky.position.copy(camera.position);
      uniforms.cloudSun.value.copy(sun);
      uniforms.cloudDay.value = daylight;
      // Absolute phase prevents catch-up animation on tab resume.
      uniforms.cloudTime.value = (Date.now() / 1000) % 100000;
    },
    dispose() {
      sky.removeFromParent();
      geometry.dispose();
      skyMaterial.dispose();
    },
  };
}

import * as T from 'three';
import {createMiniatureKit} from './referenceAssets';
import {bakeInfantry} from '../infantryModel';
import type {MiniatureData} from './miniatureData';
import {WORLD_TO_MODEL as S} from './miniatureData';
export function worldDetail(scene:T.Scene,data:MiniatureData){
 const kit=createMiniatureKit(),chunkSize=70;
 type Placement={x:number;z:number;scale:number;angle:number;variant:string};
 const placements=new Map<string,Placement[]>();
 function push(p:Placement){const key=`${Math.floor(p.x/chunkSize)},${Math.floor(p.z/chunkSize)}`;const list=placements.get(key)??[];list.push(p);placements.set(key,list);}
 data.cities.forEach(c=>c.layout.buildings.forEach((b,i)=>push({x:b.x*S,z:b.y*S,scale:b.width*S/7,angle:b.angle,variant:b.role==='landmark'?'hall':b.role==='industry'?'factory':i%4===0?'shop':'home'})));
 data.scenery.filter(t=>t.kind==='tree').forEach((t,i)=>push({x:t.x*S,z:t.y*S,scale:t.width*S/4*.9,angle:i*.71,variant:i%4===0?'pine':'tree'}));
 const resident=new Map<string,{group:T.Group;last:number}>(),frustum=new T.Frustum(),matrix=new T.Matrix4(),dummy=new T.Object3D(),box=new T.Box3();
 let tick=0,created=0,mode='regional';
 function build(key:string){const group=new T.Group();const rows=placements.get(key)!;for(const variant of new Set(rows.map(p=>p.variant))){const objects=rows.filter(p=>p.variant===variant);for(const part of kit.variants.get(variant)!){const mesh=new T.InstancedMesh(part.geometry,part.material,objects.length);objects.forEach((p,i)=>{dummy.position.set(p.x,0,p.z);dummy.scale.setScalar(p.scale);dummy.rotation.set(0,p.angle,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.snow=part.snow;mesh.userData.building=variant!=='tree'&&variant!=='pine';group.add(mesh);}}scene.add(group);created++;return group;}
 function remove(key:string){const entry=resident.get(key)!;scene.remove(entry.group);entry.group.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose();});resident.delete(key);}
 const cityMarkers=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:'#c5b590'}),data.cities.length);data.cities.forEach((c,i)=>{dummy.position.set(c.feature.x*S,.4,c.feature.y*S);dummy.scale.set(2,.8,2);dummy.rotation.set(0,0,0);dummy.updateMatrix();cityMarkers.setMatrixAt(i,dummy.matrix);});cityMarkers.computeBoundingSphere();scene.add(cityMarkers);
 const rig=bakeInfantry(0),material=new T.MeshStandardMaterial({vertexColors:true,roughness:.9}),soldiers=rig.parts.map(p=>{const m=new T.InstancedMesh(p.geometry,material,8000);m.count=0;m.frustumCulled=false;m.castShadow=true;scene.add(m);return m;});
 let population=0,concentrated=false,animate=true;const point=new T.Vector3(),local=new T.Matrix4(),combined=new T.Matrix4();
 let shown=0,visibleChunks=0;
 function update(camera:T.OrthographicCamera,winter:boolean,strategy:boolean,full:boolean,time:number,focus:T.Vector3,sprites=false){
  tick++;mode=full?'full':camera.zoom>1?'tactical':camera.zoom>.3?'regional':'continent';
  camera.updateMatrixWorld();matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);
  const detail=!strategy&&(full||mode==='tactical');let budget=8;visibleChunks=0;
  for(const [key]of placements){const [cx,cz]=key.split(',').map(Number);box.min.set(cx*chunkSize-12,-2,cz*chunkSize-12);box.max.set((cx+1)*chunkSize+12,30,(cz+1)*chunkSize+12);const visible=detail&&frustum.intersectsBox(box);let entry=resident.get(key);if(visible){visibleChunks++;if(!entry&&budget-->0){entry={group:build(key),last:tick};resident.set(key,entry);}if(entry)entry.last=tick;}if(entry){entry.group.visible=visible;for(const child of entry.group.children)child.visible=(!child.userData.snow||winter)&&(!sprites||!child.userData.building);}}
  // Keep a small nearby cache, then release instance buffers; shared assets remain reusable.
  for(const [key,entry]of resident)if(!entry.group.visible&&(tick-entry.last>180||resident.size>32))remove(key);
  cityMarkers.visible=!strategy&&mode==='continent';shown=0;
  if(!strategy&&mode!=='continent')for(let i=0;i<population;i++){const city=data.cities[i%data.cities.length];const rank=Math.floor(i/data.cities.length),angle=i*2.399;const x=concentrated?focus.x+Math.cos(angle)*Math.sqrt(i)*.35:city.feature.x*S+(rank%16-8)*.65;const z=concentrated?focus.z+Math.sin(angle)*Math.sqrt(i)*.35:city.feature.y*S+(Math.floor(rank/16)-4)*.65;point.set(x,.1,z);if(!frustum.containsPoint(point))continue;dummy.position.copy(point);dummy.rotation.set(0,angle,0);dummy.scale.setScalar(.36);dummy.updateMatrix();const frame=animate?Math.floor((time*.0017+i*.13)%1*64):0;rig.parts.forEach((_,k)=>{local.fromArray(rig.walk[frame][k]);combined.multiplyMatrices(dummy.matrix,local);soldiers[k].setMatrixAt(shown,combined);});shown++;}
  for(const mesh of soldiers){mesh.count=shown;mesh.visible=shown>0;mesh.instanceMatrix.needsUpdate=true;}
  return mode;
 }
 return {update,setLoad(count:number,battle:boolean,motion=true){population=Math.max(0,Math.min(8000,count));concentrated=battle;animate=motion;},stats:()=>({mode,residentChunks:resident.size,visibleChunks,totalChunks:placements.size,createdChunks:created,population,visibleSoldiers:shown}),dispose(){for(const key of [...resident.keys()])remove(key);kit.dispose();cityMarkers.geometry.dispose();(cityMarkers.material as T.Material).dispose();cityMarkers.dispose();scene.remove(cityMarkers);soldiers.forEach(m=>{m.dispose();scene.remove(m);});material.dispose();}};
}

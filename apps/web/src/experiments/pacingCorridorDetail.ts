import * as T from 'three';
import type {World} from '../../../../packages/game-core/src';
import {onLocalLand} from '../../../../packages/game-core/src/localMovement';
import type {generatePacingCountryside} from '../../../../packages/game-core/src/pacingCountryside';
import type {PacingCorridor} from '../../../../packages/game-core/src/pacingCorridor';
import type {MiniatureKit} from './referenceAssets';
export function createCorridorDetail(scene:T.Scene,world:World,rural:ReturnType<typeof generatePacingCountryside>,corridor:PacingCorridor,kit:MiniatureKit,point:(x:number,y:number,h?:number)=>T.Vector3,worldPoint:(p:T.Vector3)=>{x:number;y:number}){
 const roads=corridor?.path.map(p=>point(p.x,p.y))??[],fields=rural.farms.flatMap(f=>f.fields.map(f=>({...f,p:point(f.x,f.y)}))),pois=rural.pois.map(p=>({...p,p:point(p.x,p.y)}));
 const root=new T.Group();scene.add(root);const chunks=new Map<string,T.Group>();
 const pebble=new T.IcosahedronGeometry(1,0),bush=new T.IcosahedronGeometry(1,1),grass=new T.ConeGeometry(.12,.65,3);grass.translate(0,.325,0);
 const stoneMat=new T.MeshStandardMaterial({color:0x96917d,roughness:1}),bushMat=new T.MeshStandardMaterial({color:0x617746,roughness:1}),grassMat=new T.MeshStandardMaterial({color:0x8c995e,roughness:1});
 const distance=(p:T.Vector3)=>{let min=Infinity;for(let i=1;i<roads.length;i++){const a=roads[i-1],b=roads[i],dx=b.x-a.x,dz=b.z-a.z,t=T.MathUtils.clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);min=Math.min(min,Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz));}return min;};
 function remove(key:string){const g=chunks.get(key)!;g.removeFromParent();g.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose();});chunks.delete(key);}
 function create(x:number,z:number,key:string){
  const g=new T.Group(),lists=[[],[],[],[]] as T.Matrix4[][],pose=new T.Object3D();let seed=(Math.imul(x,73856093)^Math.imul(z,19349663))>>>0;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<350;i++){
   const p=new T.Vector3((x+rand())*96,.12,(z+rand())*96),d=distance(p);if(d<4||d>100)continue;
   if(pois.some(s=>Math.abs(s.p.x-p.x)<s.extent+8&&Math.abs(s.p.z-p.z)<s.extent+8)||fields.some(f=>Math.abs(f.p.x-p.x)<f.width/2+2&&Math.abs(f.p.z-p.z)<f.depth/2+2))continue;
   const w=worldPoint(p);if(!world.regions.some(r=>r.terrain!=='mountains'&&onLocalLand(r,w,'ground')))continue;
   const type=i%35===0&&d>12?3:i%11===0?2:i%3===0?0:1,s=type===0?.06+rand()*.18:type===1?.6+rand()*.9:type===2?.4+rand()*.65:1;
   pose.position.copy(p);pose.rotation.set(0,rand()*Math.PI*2,0);pose.scale.set(s,type===0?s*.6:s,s);pose.updateMatrix();lists[type].push(pose.matrix.clone());
  }
  function batch(geo:T.BufferGeometry,mat:T.Material,poses:T.Matrix4[]){if(!poses.length)return;const m=new T.InstancedMesh(geo,mat,poses.length);poses.forEach((p,i)=>m.setMatrixAt(i,p));g.add(m);}
  batch(pebble,stoneMat,lists[0]);batch(grass,grassMat,lists[1]);batch(bush,bushMat,lists[2]);for(const part of kit.variants.get('tree')??[])if(!part.snow)batch(part.geometry,part.material,lists[3]);
  root.add(g);chunks.set(key,g);
 }
 let last=0;
 return {update(camera:T.Camera,target:T.Vector3,time:number){if(time-last<300)return;last=time;const wanted=new Set<string>();if(roads.length&&camera.position.distanceTo(target)<600){const x=Math.floor(target.x/96),z=Math.floor(target.z/96);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const key=`${x+dx}:${z+dz}`;wanted.add(key);if(!chunks.has(key))create(x+dx,z+dz,key);}}
  for(const key of chunks.keys())if(!wanted.has(key))remove(key);
 },dispose(){for(const key of chunks.keys())remove(key);root.removeFromParent();[pebble,bush,grass].forEach(g=>g.dispose());[stoneMat,bushMat,grassMat].forEach(m=>m.dispose());}};
}

import * as T from 'three';
import {reliefHeight,type ReliefSite} from '../../../../packages/game-core/src/pacingRelief';
import {refinedGrain,refineSurface} from './refinedSurface';

export function createPacingReliefScene(scene:T.Scene,sites:ReliefSite[],scale:number,point:(x:number,y:number,h?:number)=>T.Vector3){
 const root=new T.Group();scene.add(root);const geometry:T.BufferGeometry[]=[],materials:T.Material[]=[];
 const grain=refinedGrain();
 const mat=(color:number)=>{const m=new T.MeshStandardMaterial({color,roughness:1});refineSurface(m,grain);materials.push(m);return m;};
 const rock=mat(0x77786b),hill=mat(0x7c8955),road=mat(0x94846a);
 for(const s of sites){
  const g=new T.PlaneGeometry(s.radius*2*scale,s.radius*2*scale,96,96);g.rotateX(-Math.PI/2);
  const p=g.getAttribute('position'),colors:number[]=[];
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=reliefHeight(s,s.x+x/scale,s.y+z/scale);p.setY(i,h);const base=new T.Color(s.mountain?0x777e79:0x8b8871),upper=new T.Color(s.mountain?(h>s.height*.63?0xc8c4b1:0x999c8d):0x879460),c=base.lerp(upper,Math.min(1,h/(s.height*.2)));colors.push(c.r,c.g,c.b);}
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();geometry.push(g);
  const material=(s.mountain?rock:hill).clone();material.color.set(0xffffff);material.vertexColors=true;refineSurface(material,grain);materials.push(material);
  // Trim the flat square skirt: only triangles with a raised vertex are needed.
  const index=g.getIndex()!,indices:number[]=[];for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);if(p.getY(a)+p.getY(b)+p.getY(c)>.001)indices.push(a,b,c);}g.setIndex(indices);
  const mesh=new T.Mesh(g,material);mesh.position.copy(point(s.x,s.y,.015));root.add(mesh);
  if(s.mountain){const lane=new T.PlaneGeometry(s.radius*2*scale,5);lane.rotateX(-Math.PI/2);geometry.push(lane);const mesh=new T.Mesh(lane,road);mesh.position.copy(point(s.x,s.y,.12));root.add(mesh);}
 }
 // Hollow cut-and-cover tunnel study in the first pass: an actual open bore,
 // not a dark decal. Campaign pathfinding deliberately remains untouched.
 const first=sites.find(s=>s.mountain);let tunnel:T.Vector3|undefined;
 if(first){
  tunnel=point(first.x,first.y,.12);
  const shape=new T.Shape();shape.moveTo(-32,-1);shape.lineTo(-32,14);shape.lineTo(-15,29);shape.lineTo(15,29);shape.lineTo(32,14);shape.lineTo(32,-1);shape.closePath();
  const hole=new T.Path();hole.moveTo(-6,-.4);hole.lineTo(6,-.4);hole.lineTo(6,3);hole.absarc(0,3,6,0,Math.PI,false);hole.lineTo(-6,-.4);shape.holes.push(hole);
  const g=new T.ExtrudeGeometry(shape,{depth:100,bevelEnabled:false,curveSegments:20});g.translate(0,0,-50);g.rotateY(Math.PI/2);geometry.push(g);
  const mesh=new T.Mesh(g,rock);mesh.position.copy(tunnel);root.add(mesh);
 }
 return {tunnel,dispose(){root.removeFromParent();geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());grain.dispose();}};
}

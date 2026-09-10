import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export interface KitPart {geometry:T.BufferGeometry; material:T.Material; snow:boolean}
export interface MiniatureKit {architecture:{walls:T.MeshStandardMaterial;roof:T.MeshStandardMaterial};variants:Map<string,KitPart[]>;dispose:()=>void}
/** Shared art-scene models. Callers instance these parts; source geometry is owned here. */
export function createMiniatureKit():MiniatureKit {
 const groundHeight=(_x:number,_z:number)=>0;
  let randomSeed=93842;const rand=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
  const textures:T.Texture[]=[];
  function pattern(kind:'slate'|'brick'|'grain'){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;
    ctx.fillStyle=kind==='slate'?'#89939a':kind==='brick'?'#c7b4a1':'#d8d8c9';ctx.fillRect(0,0,256,256);
    for(let i=0;i<6000;i++){const shade=120+rand()*100;ctx.fillStyle=`rgba(${shade},${shade},${shade},.12)`;ctx.fillRect(rand()*256,rand()*256,1+rand()*3,1+rand()*3);}
    if(kind!=='grain'){const rows=kind==='slate'?16:24,cols=kind==='slate'?8:6;for(let y=0;y<rows;y++)for(let x=-1;x<cols;x++){ctx.strokeStyle=kind==='slate'?'#53616b88':'#80766c70';ctx.lineWidth=1.5;ctx.strokeRect((x+(y%2)*.5)*256/cols,y*256/rows,256/cols,256/rows);}}
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4;textures.push(texture);return texture;
  }
  const grain=pattern('grain');grain.repeat.set(22,22);
  const mat=(color:T.ColorRepresentation,map?:T.Texture)=>new T.MeshStandardMaterial({color,roughness:.91,map:map??null});
  const stone=mat('#8e9080'),wood=mat('#776043'),trim=mat('#b5a27a'),roof=mat('#8e9aa7',pattern('slate')),walls=mat('#b1a082',pattern('brick')),glass=mat('#34464c'),brass=mat('#ae8950'),soil=mat('#65523b'),leaves=mat('#67783d',pattern('grain')),trunk=mat('#685342'),snowMat=mat('#e1e7e5');
  const batches=new Map<T.Material,T.BufferGeometry[]>();
  function add(geo:T.BufferGeometry,material:T.Material,x:number,y:number,z:number,sx=1,sy=1,sz=1,rotation=0){const matrix=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(0,rotation,0)),new T.Vector3(sx,sy,sz));geo.applyMatrix4(matrix);const list=batches.get(material)??[];list.push(geo);batches.set(material,list);}
  const box=(m:T.Material,x:number,y:number,z:number,w:number,h:number,d:number,a=0)=>add(new T.BoxGeometry(1,1,1),m,x,y,z,w,h,d,a);
  function cylinder(m:T.Material,x:number,y:number,z:number,r:number,h:number){add(new T.CylinderGeometry(r,r,h,10),m,x,y,z);}
  const snowPieces:T.BufferGeometry[]=[];
  function snowCap(geo:T.BufferGeometry,x:number,y:number,z:number,sx:number,sy:number,sz:number){geo.scale(sx,sy,sz);geo.translate(x,y,z);snowPieces.push(geo);}
  const townSites=[{x:12,z:18,w:7,d:6,h:4.5,type:'hall'},{x:25,z:17,w:6,d:5,h:3.2,type:'home'},{x:10,z:31,w:10,d:7,h:3.6,type:'factory'},{x:25,z:31,w:7,d:6,h:3.2,type:'shop'},{x:38,z:28,w:6,d:5,h:3,type:'home'}];  function tree(x:number,z:number,size:number,pine=false){const y=groundHeight(x,z);cylinder(trunk,x,y+size*.5,z,size*.085,size);
    if(pine){for(let k=0;k<4;k++){const h=size*(1.0-k*.15),r=size*(.43-k*.075),cy=y+size*(.55+k*.23);add(new T.ConeGeometry(r,h,9),leaves,x,cy,z);snowCap(new T.ConeGeometry(r*.89,h*.84,9),x,cy+h*.12,z,1,1,1);}}
    else{for(let k=0;k<9;k++){const a=k*2.399,rad=k===0?0:size*.3,cx=x+Math.cos(a)*rad,cz=z+Math.sin(a)*rad,cy=y+size*(.96+(k%3)*.13),r=size*(.32+rand()*.08);add(new T.IcosahedronGeometry(r,2),leaves,cx,cy,cz,1,.95,1);snowCap(new T.SphereGeometry(r,7,4,0,Math.PI*2,0,Math.PI*.43),cx,cy+.06,cz,1,1,1);}}
  }
  function building(b:typeof townSites[number]){const {x,z,w,d,h,type}=b,y=groundHeight(x,z);box(stone,x,y+.22,z,w+.45,.45,d+.45);box(walls,x,y+h/2+.4,z,w,h,d);
    const gable=(cx:number,cz:number,width:number,depth:number,baseY:number,rise:number)=>{const shape=new T.Shape();shape.moveTo(-width/2,0);shape.lineTo(0,rise);shape.lineTo(width/2,0);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false});g.translate(0,0,-depth/2);add(g,roof,cx,baseY,cz);
      for(const side of [-1,1]){const snowG=new T.PlaneGeometry(Math.hypot(width/2,rise),depth+.12);snowG.rotateX(-Math.PI/2);snowG.rotateZ(-side*Math.atan2(rise,width/2));snowG.translate(cx+side*width/4,baseY+rise/2+.08,cz);snowPieces.push(snowG);}}
    if(type==='factory')for(let i=0;i<3;i++)gable(x-w/2+w/6+i*w/3,z,w/3+.12,d+.5,y+h+.4,1.1);else gable(x,z,w+.7,d+.7,y+h+.4,type==='hall'?2.7:1.8);
    for(const side of [-1,1]){box(trim,x+side*(w/2-.13),y+h/2+.4,z,.23,h,d+.03);for(let j=0;j<3;j++){const wx=x-w*.32+j*w*.32;box(trim,wx,y+h*.60,z+side*(d/2+.04),.98,1.4,.12);box(glass,wx,y+h*.60,z+side*(d/2+.12),.72,1.13,.05);box(trim,wx,y+h*.60,z+side*(d/2+.16),.06,1.1,.04);}}
    box(wood,x,y+1.0,z+d/2+.14,1.2,1.9,.2);box(trim,x,y+.12,z+d/2+.65,1.8,.22,1.1);
    box(walls,x+w*.28,y+h+1.7,z-d*.2,.66,2.5,.72);box(stone,x+w*.28,y+h+3,z-d*.2,.83,.18,.88);
    if(type==='hall'){box(walls,x-w*.28,y+h+1.5,z+d*.1,2.1,3.2,2.2);gable(x-w*.28,z+d*.1,2.5,2.6,y+h+3.1,1.7);add(new T.CylinderGeometry(.46,.46,.1,20),brass,x-w*.28,y+h+2.3,z+d*.1+1.15,1,1,1,0);}
    if(type==='shop'){for(let i=0;i<7;i++)box(i%2?trim:mat('#9b5544'),x-w*.4+i*w*.133,y+2.3,z+d/2+1,w*.133,.15,1.8);for(const side of [-1,1])box(wood,x+side*w*.45,y+1.1,z+d/2+1.7,.13,2.2,.13);}
  }

 const variants=new Map<string,KitPart[]>();
 function capture(name:string,draw:()=>void){batches.clear();snowPieces.length=0;draw();const parts:KitPart[]=[];for(const [material,geos]of batches){const normalized=geos.map(g=>g.index?g.toNonIndexed():g);const geometry=mergeGeometries(normalized)!;parts.push({geometry,material,snow:false});new Set([...geos,...normalized]).forEach(g=>g.dispose());}if(snowPieces.length){parts.push({geometry:mergeGeometries(snowPieces)!,material:snowMat,snow:true});snowPieces.forEach(g=>g.dispose());}variants.set(name,parts);}
 for(const b of townSites)if(!variants.has(b.type))capture(b.type,()=>building({...b,x:0,z:0}));
 capture('urbanBuild',()=>{
   for(const y of [.2,3.2,6.2]){box(stone,0,y,0,5,.25,11);for(const x of [-2.2,2.2])for(const z of [-5,5])box(wood,x,y+1.4,z,.22,2.8,.22);}
   for(const x of [-2.55,2.55])for(const z of [-4.5,0,4.5])box(brass,x,4.3,z,.13,8.6,.13);
   for(const y of [2.6,5.6,8.6])for(const x of [-2.55,2.55])box(wood,x,y,0,.7,.13,10.8);
   box(walls,0,1.3,-5.35,5,2.5,.3);box(wood,0,6.55,0,2,.45,3);
 });
 const litWindows=mat('#bd9966');litWindows.emissive.set('#da8c35');litWindows.emissiveIntensity=.35;
 // Dense street-wall kit: narrow footprints, deep parcels and three readable floors.
 for(const name of ['urbanHome','urbanRed','urbanShop'])capture(name,()=>{
   const facade=name==='urbanRed'?mat('#94674e',walls.map!):walls;
   box(stone,0,.2,0,5,.4,11);box(facade,0,4.6,0,5,8.8,11);
   box(roof,0,9.12,0,5.1,.25,11.1);
   for(const z of [-5.45,5.45])box(trim,0,9.35,z,5.1,.5,.2);
   for(const y of [1.8,4.5,7.2])for(const z of [-5.55,5.55])for(const x of [-1.35,1.35]){
     box(trim,x,y,z,1.35,1.8,.12);box(litWindows,x,y,z+Math.sign(z)*.08,1.06,1.5,.08);
     box(trim,x,y,z+Math.sign(z)*.13,.07,1.5,.04);
   }
   for(const y of [3.1,5.8,8.6])box(trim,0,y,5.56,5,.13,.15);
   box(wood,0,1,5.6,.85,1.8,.15);box(stone,0,.12,5.8,1.2,.24,.5);
   box(facade,1.6,9.6,-3,.65,1,.65);
   box(brass,-2.3,4.5,-5.58,.12,8.4,.12);
   box(roof,-1.2,9.45,-2,1.4,.35,2.3);
   if(name==='urbanRed'){cylinder(wood,0,10.2,1.5,.8,1.5);box(brass,0,10.9,1.5,1.7,.1,1.7);}
   if(name==='urbanShop'){
     box(wood,0,2.8,5.65,4.7,.6,.2);box(brass,0,2.8,5.78,3.8,.18,.05);
     box(trim,0,2.2,5.85,4.8,.12,.65);
   }
   if(name==='urbanRed'){
     add(new T.ConeGeometry(1,2.5,4).rotateY(Math.PI/4),roof,0,10.3,0,5.3/Math.SQRT2,1,11.3/Math.SQRT2);
     snowCap(new T.ConeGeometry(1,2.5,4).rotateY(Math.PI/4),0,10.36,0,5.35/Math.SQRT2,1,11.35/Math.SQRT2);
   }else snowCap(new T.BoxGeometry(5.1,.12,11.1),0,9.31,0,1,1,1);
 });
 capture('tree',()=>tree(0,0,4,false));capture('pine',()=>tree(0,0,4,true));
 return {variants,architecture:{walls,roof},dispose(){const materials=new Set<T.Material>();for(const parts of variants.values())for(const p of parts){p.geometry.dispose();materials.add(p.material);}materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}

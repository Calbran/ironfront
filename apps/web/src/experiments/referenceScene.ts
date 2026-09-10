import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bakeInfantry } from '../infantryModel';
import { createMiniatureKit } from './referenceAssets';
import { createJeep } from '../prototypes/jeepModel';

export interface ReferenceOptions { winter:boolean; strategy:boolean; shadows:boolean }
export interface ReferenceStats { fps:number; calls:number; triangles:number; textures:number }
const riverX=(z:number)=>-23+Math.sin(z*.061)*5+Math.sin(z*.13)*1.2;
const riverHalfWidth=(z:number)=>3.1+Math.sin(z*.12)*.35+Math.sin(z*.29)*.12;
const roadZ=(x:number)=>-1+11/(1+Math.exp(-(x+5)/7));
const noise=(x:number,z:number)=>Math.sin(x*.41+Math.sin(z*.33))*Math.cos(z*.27)+Math.sin(x*1.33+z*.74)*.18;
export function groundHeight(x:number,z:number){
  const d=Math.abs(x-riverX(z));
  const hill=6*Math.exp(-((x-24)**2/150+(z+26)**2/110));
  const base=.65+Math.sin(x*.052)*.32+Math.cos(z*.065)*.3+noise(x,z)*.11+hill;
  const bank=T.MathUtils.smoothstep(d,riverHalfWidth(z),riverHalfWidth(z)+3.6);
  return T.MathUtils.lerp(-1.8,base,bank);
}
export function referenceScene(host:HTMLElement, report:(stats:ReferenceStats)=>void, selected:(ids:number[])=>void){
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(host.clientWidth,host.clientHeight);
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  host.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','Miniature reference scene. Left drag selects troops. Right drag pans. Scroll zooms.');
  const scene=new T.Scene();scene.background=new T.Color('#25332f');
  const camera=new T.OrthographicCamera(-65,65,55,-55,.1,2000);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableRotate=false;controls.enableDamping=true;controls.mouseButtons={LEFT:-1 as T.MOUSE,MIDDLE:T.MOUSE.PAN,RIGHT:T.MOUSE.PAN};controls.touches={ONE:T.TOUCH.PAN,TWO:T.TOUCH.DOLLY_PAN};controls.minZoom=.65;controls.maxZoom=5;
  const ambient=new T.HemisphereLight(0xe3edff,0x586044,2);scene.add(ambient);
  const sun=new T.DirectionalLight(0xffe5bb,3);sun.position.set(-55,95,35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-78,right:78,top:78,bottom:-78,near:1,far:240});sun.shadow.normalBias=.06;sun.shadow.bias=-.0001;scene.add(sun);
  const detail=new T.Group(),snow=new T.Group(),political=new T.Group();scene.add(detail,snow,political);snow.visible=false;political.visible=false;
  let options:ReferenceOptions={winter:false,strategy:false,shadows:true},disposed=false;
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
  // Continuous ground: channel and banks are geometry, material transitions share its coordinates.
  const terrainGeo=new T.PlaneGeometry(108,108,256,256);terrainGeo.rotateX(-Math.PI/2);
  const positions=terrainGeo.attributes.position,summer:number[]=[],winter:number[]=[],strategy:number[]=[];
  const c=new T.Color();
  const townSites=[{x:12,z:18,w:7,d:6,h:4.5,type:'hall'},{x:25,z:17,w:6,d:5,h:3.2,type:'home'},{x:10,z:31,w:10,d:7,h:3.6,type:'factory'},{x:25,z:31,w:7,d:6,h:3.2,type:'shop'},{x:38,z:28,w:6,d:5,h:3,type:'home'}];
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i),height=groundHeight(x,z);positions.setY(i,height);
    const bank=Math.abs(x-riverX(z)),road=Math.abs(z-roadZ(x)),yard=Math.min(...townSites.map(b=>Math.hypot((x-b.x)*.8,z-b.z)-Math.max(b.w,b.d)*.63));
    const grass=new T.Color('#8c9654').multiplyScalar(.94+noise(x,z)*.055+Math.sin(x*3.7+z*5.1)*.016);
    const wear=Math.max(1-T.MathUtils.smoothstep(road,2.2,4.5),1-T.MathUtils.smoothstep(yard,0,3));
    grass.lerp(new T.Color('#9b8b66'),wear*.84);grass.lerp(new T.Color('#858777'),1-T.MathUtils.smoothstep(bank,4,7));
    grass.toArray(summer,i*3);c.copy(grass).lerp(new T.Color('#e3e7e3').multiplyScalar(1+noise(x,z)*.025),.96-wear*.70-(1-T.MathUtils.smoothstep(bank,3,5))*.65);c.toArray(winter,i*3);
    c.set(x<riverX(z)?'#708477':'#a7a273').toArray(strategy,i*3);
  }
  terrainGeo.computeVertexNormals();terrainGeo.setAttribute('color',new T.Float32BufferAttribute(summer,3));
  const terrainMat=new T.MeshStandardMaterial({vertexColors:true,map:grain,roughness:1});const terrain=new T.Mesh(terrainGeo,terrainMat);terrain.receiveShadow=true;scene.add(terrain);
  // Cutaway base gives the bounded art study a physical miniature-table edge.
  const base=new T.Mesh(new T.BoxGeometry(108,2.8,108),mat('#514f3e'));base.position.y=-3.3;scene.add(base);base.receiveShadow=true;
  function roadSurface(x:number,z:number){const bx=riverX(roadZ(-23)),distance=Math.abs(x-bx),base=groundHeight(x,z)+.08;const approach=(1-T.MathUtils.smoothstep(distance,7,12))*(1-T.MathUtils.smoothstep(Math.abs(z-roadZ(x)),2.5,4));return T.MathUtils.lerp(base,Math.max(base,1.93),approach);}
  function strip(points:T.Vector3[],width:number,material:T.Material,parent:T.Object3D=detail,conform=false){const verts:number[]=[],uv:number[]=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dir=b.clone().sub(a),len=Math.hypot(dir.x,dir.z),nx=-dir.z/len*width/2,nz=dir.x/len*width/2;for(const [p,side]of [[a,1],[a,-1],[b,1],[b,1],[a,-1],[b,-1]] as const){verts.push(p.x+nx*side,conform?roadSurface(p.x+nx*side,p.z+nz*side):p.y,p.z+nz*side);uv.push(side*.5+.5,i/8);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();const mesh=new T.Mesh(g,material);mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  const waterMat=new T.MeshStandardMaterial({color:'#427378',roughness:.32,metalness:.18,side:T.DoubleSide});
  const riverPoints=Array.from({length:217},(_,i)=>{const z=-54+i*.5;return new T.Vector3(riverX(z),-.32,z);});const waterVertices:number[]=[],waterIndices:number[]=[];for(let i=0;i<riverPoints.length;i++){const p=riverPoints[i],w=riverHalfWidth(p.z)+.3;waterVertices.push(p.x-w,p.y,p.z,p.x+w,p.y,p.z);if(i){const a=(i-1)*2,b=i*2;waterIndices.push(a,b,a+1,a+1,b,b+1);}}const waterGeo=new T.BufferGeometry();waterGeo.setAttribute('position',new T.Float32BufferAttribute(waterVertices,3));waterGeo.setIndex(waterIndices);waterGeo.computeVertexNormals();const riverMesh=new T.Mesh(waterGeo,waterMat);riverMesh.receiveShadow=false;scene.add(riverMesh);
  const shimmerGeo=new T.BufferGeometry();const shimmer:number[]=[];for(let i=0;i<260;i++){const z=rand()*106-53,x=riverX(z)+(rand()-.5)*5;shimmer.push(x,-.30,z,x+(rand()-.5)*.5,-.30,z+.15+rand()*.6);}shimmerGeo.setAttribute('position',new T.Float32BufferAttribute(shimmer,3));const shimmerMat=new T.LineBasicMaterial({color:'#b6d4cb',transparent:true,opacity:.26});const ripples=new T.LineSegments(shimmerGeo,shimmerMat);scene.add(ripples);
  const pathMat=new T.MeshStandardMaterial({color:'#b2a07c',roughness:1,side:T.DoubleSide});
  const roadPoints=Array.from({length:217},(_,i)=>{const x=-54+i*.5,z=roadZ(x);return new T.Vector3(x,groundHeight(x,z)+.045,z);});strip(roadPoints,4.4,pathMat,detail,true);
  for(const offset of [-1.2,1.2])strip(roadPoints.map(p=>new T.Vector3(p.x,groundHeight(p.x,p.z+offset)+.11,p.z+offset)),.16,new T.MeshStandardMaterial({color:'#786d52',side:T.DoubleSide,roughness:1}));
  const townLane=Array.from({length:65},(_,i)=>{const z=10+i*.5;return new T.Vector3(19,groundHeight(19,z)+.05,z);});strip(townLane,3,pathMat,detail,true);
  // Arched bridge mesh with masonry parapets and real clearance over water.
  const bridgeX=riverX(roadZ(-23)),bridgeZ=roadZ(bridgeX),bridgeY=1.65;
  const arch=new T.Shape();arch.moveTo(-7,0);arch.lineTo(-7,1.45);arch.lineTo(7,1.45);arch.lineTo(7,0);arch.lineTo(4.7,0);for(let i=0;i<=24;i++){const x=4.7-i*9.4/24;arch.lineTo(x,Math.sqrt(Math.max(0,1-(x/4.7)**2))*.85);}arch.lineTo(-7,0);
  const archGeo=new T.ExtrudeGeometry(arch,{depth:5,bevelEnabled:false,curveSegments:16});archGeo.translate(0,0,-2.5);add(archGeo,stone,bridgeX,bridgeY-1.2,bridgeZ);
  for(const side of [-1,1])for(let i=0;i<18;i++){const x=bridgeX-6.8+i*.8;box(stone,x,bridgeY+.65,bridgeZ+side*2.55,.77,.75,.48);box(trim,x,bridgeY+1.08,bridgeZ+side*2.55,.81,.13,.60);}
  for(let i=0;i<16;i++)box(stone,bridgeX-6+i*.8,bridgeY+.3,bridgeZ, .76,.12,4.6);
  // Banks contain varied stone clusters instead of a uniform border.
  function rock(x:number,z:number,size:number){const y=groundHeight(x,z);const geo=new T.IcosahedronGeometry(1,0);const p=geo.attributes.position;for(let i=0;i<p.count;i++){const factor=.92+Math.sin(p.getX(i)*7+p.getY(i)*9+p.getZ(i)*13)*.09;p.setXYZ(i,p.getX(i)*factor,p.getY(i)*factor,p.getZ(i)*factor);}geo.computeVertexNormals();add(geo,stone,x,y+size*.34,z,size,size*.82,size*.8,rand()*6);snowCap(new T.SphereGeometry(1,7,4,0,Math.PI*2,0,Math.PI*.42),x,y+size*.40,z,size*.81,size*.6,size*.67);}
  for(let z=-51;z<52;z+=1.7+rand()*1.8){if(Math.abs(z-bridgeZ)<4)continue;for(const side of [-1,1])rock(riverX(z)+side*(4.1+rand()*1.7),z,.45+rand()*.75);}
  for(let i=0;i<22;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*8;rock(25+Math.cos(a)*r,-27+Math.sin(a)*r,1.5+rand()*2.8);}
  for(let i=0;i<55;i++){const x=rand()*98-49,z=rand()*98-49;if(Math.abs(x-riverX(z))>7&&Math.abs(z-roadZ(x))>6&&!(x>2&&z>10))rock(x,z,.25+rand()*.55);}
  const sharedKit=createMiniatureKit();
  function kitObject(name:string,x:number,y:number,z:number,scale=1){for(const part of sharedKit.variants.get(name)!){const geo=part.geometry.clone();geo.scale(scale,scale,scale);geo.translate(x,y,z);if(part.snow)snowPieces.push(geo);else{const list=batches.get(part.material)??[];list.push(geo);batches.set(part.material,list);}}}

  function tree(x:number,z:number,size:number,pine=false){kitObject(pine?'pine':'tree',x,groundHeight(x,z),z,size/4);}
  for(let x=-49;x<-29;x+=4.5)for(let z=-48;z<42;z+=4.6){const tx=x+rand()*2,tz=z+rand()*2;if(Math.abs(tz-roadZ(tx))>6&&Math.abs(tx-riverX(tz))>8)tree(tx,tz,3.4+rand()*1.8,rand()<.25);}
  for(let i=0;i<42;i++){const x=rand()*95-47,z=rand()*94-47;if(Math.abs(x-riverX(z))<7||Math.abs(z-roadZ(x))<5||x>0&&z>8||x>8&&x<30&&z<2)continue;tree(x,z,2+rand()*2,rand()<.4);}
  // Five modular building silhouettes share roof/wall materials and small trim parts.
  townSites.forEach(b=>kitObject(b.type,b.x,groundHeight(b.x,b.z),b.z));
  // Industrial fittings, yard barrels and fenced crop rows add localized detail.
  const fy=groundHeight(35,16);cylinder(walls,38,fy+4.1,17,1,8);cylinder(brass,38,fy+8.1,17,1.2,.3);cylinder(brass,34,fy+1.2,17,1.3,2.4);box(wood,34,fy+.2,17,3.4,.4,3.4);
  for(let i=0;i<9;i++){const x=29+(i%3)*.9,z=37+Math.floor(i/3)*.9,y=groundHeight(x,z);cylinder(wood,x,y+.45,z,.35,.9);cylinder(brass,x,y+.72,z,.36,.06);}
  for(let i=0;i<10;i++){const x=12+i*1.35;const rows=Array.from({length:26},(_,j)=>{const z=-15+j*.5;return new T.Vector3(x,groundHeight(x,z)+.06,z);});strip(rows,.65,new T.MeshStandardMaterial({color:i%2?'#6f6545':'#5b573b',roughness:1,side:T.DoubleSide}));}
  function fence(x1:number,z1:number,x2:number,z2:number){const len=Math.hypot(x2-x1,z2-z1),n=Math.ceil(len/2);for(let i=0;i<=n;i++){const x=T.MathUtils.lerp(x1,x2,i/n),z=T.MathUtils.lerp(z1,z2,i/n),y=groundHeight(x,z);box(wood,x,y+.65,z,.16,1.3,.16);if(i<n){const nx=T.MathUtils.lerp(x1,x2,(i+1)/n),nz=T.MathUtils.lerp(z1,z2,(i+1)/n);for(const h of [.45,1])box(wood,(x+nx)/2,y+h,(z+nz)/2,len/n,.12,.12,-Math.atan2(z2-z1,x2-x1));}}}
  fence(10,-17,27,-17);fence(27,-17,27,-1);fence(10,-17,10,-1);fence(10,-1,27,-1);
  // Merge static pieces by material to keep this detailed scene inexpensive to submit.
  for(const [material,geometries]of batches){const normalized=geometries.map(g=>g.index?g.toNonIndexed():g);const merged=mergeGeometries(normalized,false)!;const mesh=new T.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;detail.add(mesh);new Set([...geometries,...normalized]).forEach(g=>g.dispose());}
  const normalizedSnow=snowPieces.map(g=>g.index?g.toNonIndexed():g);const snowGeometry=mergeGeometries(normalizedSnow,false)!;normalizedSnow.forEach(g=>g.dispose());const snowMesh=new T.Mesh(snowGeometry,snowMat);snowMesh.castShadow=true;snowMesh.receiveShadow=true;snow.add(snowMesh);snowPieces.forEach(g=>g.dispose());
  const rig=bakeInfantry(0),troopMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.9}),troops=new T.Group();scene.add(troops);
  const unitPositions=[new T.Vector3(1,groundHeight(1,8),8),new T.Vector3(5,groundHeight(5,10),10)];
  for(let squad=0;squad<2;squad++)for(let i=0;i<6;i++){const root=new T.Group();root.position.copy(unitPositions[squad]).add(new T.Vector3((i%3)*.6,0,Math.floor(i/3)*.65));root.scale.setScalar(.55);rig.parts.forEach((part,k)=>{const mesh=new T.Mesh(part.geometry,troopMat);mesh.matrix.fromArray(rig.walk[0][k]);mesh.matrixAutoUpdate=false;mesh.castShadow=true;root.add(mesh);});troops.add(root);}
  const jeep=createJeep();jeep.root.scale.setScalar(.65);jeep.root.position.set(12,groundHeight(12,roadZ(12))+.1,roadZ(12));jeep.root.rotation.y=Math.PI/2;troops.add(jeep.root);
  const rings=unitPositions.map(p=>{const mesh=new T.Mesh(new T.RingGeometry(1.6,1.75,40),new T.MeshBasicMaterial({color:'#ffe39b',side:T.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.position.copy(p).add(new T.Vector3(.6,.1,.3));mesh.visible=false;scene.add(mesh);return mesh;});
  const chosen=new Set<number>();function select(ids:number[],add=false){if(!add)chosen.clear();ids.forEach(i=>chosen.add(i));rings.forEach((r,i)=>r.visible=chosen.has(i)&&!options.strategy);selected([...chosen]);}
  const marquee=document.createElement('div');marquee.className='selection-marquee';marquee.hidden=true;host.append(marquee);let start={x:0,y:0},drag=false;
  const point=(p:T.Vector3)=>{const v=p.clone().project(camera);return {x:(v.x+1)*host.clientWidth/2,y:(1-v.y)*host.clientHeight/2};};
  const down=(e:PointerEvent)=>{if(e.button!==0||e.pointerType==='touch')return;start={x:e.clientX,y:e.clientY};drag=true;renderer.domElement.setPointerCapture(e.pointerId);};
  const move=(e:PointerEvent)=>{if(!drag)return;const r=host.getBoundingClientRect();marquee.hidden=false;Object.assign(marquee.style,{left:`${Math.min(start.x,e.clientX)-r.left}px`,top:`${Math.min(start.y,e.clientY)-r.top}px`,width:`${Math.abs(e.clientX-start.x)}px`,height:`${Math.abs(e.clientY-start.y)}px`});};
  const up=(e:PointerEvent)=>{if(!drag)return;drag=false;marquee.hidden=true;if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);if(options.strategy||e.type==='pointercancel')return;const r=host.getBoundingClientRect(),click=Math.hypot(start.x-e.clientX,start.y-e.clientY)<5;select(unitPositions.flatMap((p,i)=>{const q=point(p);return(click?Math.hypot(q.x-e.clientX+r.left,q.y-e.clientY+r.top)<22:q.x>=Math.min(start.x,e.clientX)-r.left&&q.x<=Math.max(start.x,e.clientX)-r.left&&q.y>=Math.min(start.y,e.clientY)-r.top&&q.y<=Math.max(start.y,e.clientY)-r.top)?[i]:[];}),e.shiftKey);};
  const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.matches('input,select,textarea'))return;if(e.key==='Escape')select([]);};window.addEventListener('keydown',key);
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
  function configure(next:ReferenceOptions){options=next;snow.visible=next.winter&&!next.strategy;detail.visible=!next.strategy;troops.visible=!next.strategy;renderer.shadowMap.enabled=next.shadows;terrainGeo.setAttribute('color',new T.Float32BufferAttribute(next.strategy?strategy:next.winter?winter:summer,3));terrainMat.map=next.strategy?null:grain;terrainMat.needsUpdate=true;waterMat.color.set(next.winter?'#3f646e':'#427378');sun.color.set(next.winter?'#edf1f5':'#ffe5bb');ambient.groundColor.set(next.winter?'#859195':'#586044');rings.forEach((r,i)=>r.visible=chosen.has(i)&&!next.strategy);}
  function focus(mode:'scene'|'town'|'bridge'){const target=mode==='town'?new T.Vector3(20,0,24):mode==='bridge'?new T.Vector3(bridgeX,0,bridgeZ):new T.Vector3(0,0,0);controls.target.copy(target);camera.position.copy(target).add(new T.Vector3(150,150,150));camera.zoom=mode==='scene'?1:mode==='town'?2.4:3.2;camera.updateProjectionMatrix();controls.update();}
  function resize(){const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height);const aspect=width/height;camera.left=-65*aspect;camera.right=65*aspect;const span=Math.max(65,80/aspect);camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix();}const observer=new ResizeObserver(resize);observer.observe(host);resize();focus('scene');
  let raf=0,last=performance.now(),frames=0;const render=()=>{if(disposed)return;controls.update();const now=performance.now();shimmerMat.opacity=.23+Math.sin(now*.0006)*.035;if(!document.hidden){renderer.render(scene,camera);frames++;}if(now-last>1500){report({fps:Math.round(frames*1000/(now-last)),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures});last=now;frames=0;}raf=requestAnimationFrame(render);};render();
  return {configure,focus,select,dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();window.removeEventListener('keydown',key);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);marquee.remove();const geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.LineSegments){geos.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());sharedKit.dispose();renderer.dispose();renderer.domElement.remove();}};
}

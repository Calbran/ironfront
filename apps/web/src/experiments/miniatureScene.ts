import { riverRoadClipper } from "./riverRoadClipping";
import { presentationRivers } from "./riverPresentation";
import {generatedLandscape} from './generatedLandscape';
import {liveUnits,type LiveCallbacks} from './liveUnits';
import type {World} from '../../../../packages/game-core/src/index';
import {worldDetail} from './worldDetail';
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { signedArea } from "../../../../packages/game-core/src/geography";
import { mapGeometry } from "../mapGeometry";
import { bakeInfantry } from "../infantryModel";
import { createJeep } from "../prototypes/jeepModel";
import { initialCity, WORLD_TO_MODEL as S, type MiniatureData, type StudyCity } from "./miniatureData";

export interface StudySettings { strategy: boolean; textures: boolean; snow: boolean; sprites: boolean; borders: boolean; motion: boolean; shadows: boolean }
export interface StudyStats { residentChunks?:number; visibleSoldiers?:number; mode?:string; fps: number; calls: number; triangles: number; trees: number; buildings: number; view: string }
export function miniatureScene(host: HTMLElement, data: MiniatureData, onSelect: (id: number) => void, onStats: (s: StudyStats) => void, onError: (text: string) => void, onArmies: (ids: number[]) => void, live?:LiveCallbacks) {
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.16;
  renderer.domElement.setAttribute("aria-label", "Three-dimensional map. Left-drag selects friendly armies; Shift adds. Right/middle-drag pans, scroll zooms. Escape clears. Camera angle is fixed. Use territory selection and view buttons for keyboard access.");
  host.append(renderer.domElement);
  const scene = new T.Scene(); scene.background = new T.Color(0x253e40);
  const camera = new T.OrthographicCamera(-50, 50, 35, -35, 0.1, 40000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.12;
  controls.enableRotate = false;
  controls.mouseButtons = { LEFT: -1 as T.MOUSE, MIDDLE: T.MOUSE.PAN, RIGHT: T.MOUSE.PAN };
  controls.touches = { ONE: T.TOUCH.PAN, TWO: T.TOUCH.DOLLY_PAN };
  controls.minZoom = 0.05; controls.maxZoom = 10;
  controls.screenSpacePanning = false;
  const hemi = new T.HemisphereLight(0xf0efdc, 0x485646, 2.3); scene.add(hemi);
  const sun = new T.DirectionalLight(0xffe4b9, 3.1); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.055;
  scene.add(sun, sun.target);
  const sunCamera = sun.shadow.camera;
  Object.assign(sunCamera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 650 });
  sunCamera.updateProjectionMatrix();
  let disposed = false, settings: StudySettings = { strategy: false, textures: false, snow: false, sprites: false, borders: false, motion: true, shadows: true };
  const resources = new Set<T.Texture>();
  const loader = new T.TextureLoader();
  const load = (url: string, apply: (t: T.Texture) => void) => {
    loader.load(url, texture => { if (disposed) { texture.dispose(); return; } resources.add(texture); texture.colorSpace = T.SRGBColorSpace; apply(texture); }, undefined, () => { if (!disposed) onError(`Some retained artwork could not load (${url.split("/").at(-1)}). Model colors remain available.`); });
  };
  const material = (color: number) => new T.MeshStandardMaterial({ color, roughness: 0.93, metalness: 0 });
  const palette = { plains: 0x95a36b, forest: 0x657b4d, highlands: 0xaaa389, mountains: 0x8b9185 };
  const grounds = Object.fromEntries(Object.entries(palette).map(([k, color]) => [k, material(color)])) as Record<keyof typeof palette, T.MeshStandardMaterial>;
  for (const [key, mat] of Object.entries(grounds)) {
    load(`/art/biomes/${key}-v1.webp`, texture => {
      texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.repeat.set(0.06, 0.06); texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      mat.userData.retainedMap = texture; mat.map = settings.textures && !settings.snow ? texture : null; mat.needsUpdate = true;
    });
  }
  const waterMat = new T.MeshStandardMaterial({ color: 0x406a70, roughness: 0.46, metalness: 0.08 });
  const water = new T.Mesh(new T.PlaneGeometry(100000, 100000), waterMat); water.rotation.x = -Math.PI / 2; water.position.y = -0.8; scene.add(water);
  const geometries = mapGeometry(data.world);
  const land = new T.Group(); scene.add(land);
  const terrainMeshes: T.Mesh[] = [];
  function terrain(rings: number[][][], mat: T.Material, y: number, region?: number) {
    const shapes: T.Shape[] = [];
    for (const ring of rings) {
      if (ring.length < 3) continue;
      const points = ring.map(p => new T.Vector2(p[0] * S, -p[1] * S));
      if (signedArea(ring) > 0) shapes.push(new T.Shape(points));
      else {
        const probe = points[0];
        const outer = shapes.find(shape => { const pts = shape.getPoints(); let inside = false; for (let i=0,j=pts.length-1;i<pts.length;j=i++) if ((pts[i].y>probe.y)!==(pts[j].y>probe.y) && probe.x < (pts[j].x-pts[i].x)*(probe.y-pts[i].y)/(pts[j].y-pts[i].y)+pts[i].x) inside=!inside; return inside; });
        outer?.holes.push(new T.Path(points));
      }
    }
    if (!shapes.length) return;
    const geo = new T.ShapeGeometry(shapes); geo.rotateX(-Math.PI / 2);
    const mesh = new T.Mesh(geo, mat); mesh.position.y = y; mesh.receiveShadow = true; land.add(mesh);
    if (region !== undefined) { mesh.userData.region = region; terrainMeshes.push(mesh); }
    return mesh;
  }
  for (const r of data.world.regions) terrain(geometries.rings[r.id], grounds[r.terrain], 0, r.id);
  for (const patch of data.world.geography?.terrainPatches ?? []) { const mesh=terrain(patch.contours, grounds[patch.terrain], 0.012); if(mesh)mesh.userData.detailPatch=true; }
  for (const island of data.world.geography?.islands ?? []) terrain([island], grounds.plains, 0);
  const landscapeStudy=live?null:generatedLandscape(scene,data,terrainMeshes);
  const borderGroup = new T.Group(); scene.add(borderGroup); borderGroup.visible = false;
  for (const r of data.world.regions) {
    const color = r.owner === null ? 0xc9c7a2 : new T.Color(data.world.nations[r.owner].color).getHex();
    for (const ring of geometries.rings[r.id]) {
      const geo = new T.BufferGeometry().setFromPoints([...ring, ring[0]].map(p => new T.Vector3(p[0]*S, 0.075, p[1]*S)));
      borderGroup.add(new T.Line(geo, new T.LineBasicMaterial({ color, transparent: true, opacity: 0.65 })));borderGroup.children[borderGroup.children.length-1].userData.region=r.id;
    }
  }
  let selection: T.Object3D | null = null;
  function select(id: number) {
    if (selection) { scene.remove(selection); selection.traverse(o => { if (o instanceof T.Line) { o.geometry.dispose(); (o.material as T.Material).dispose(); } }); }
    selection = new T.Group();
    for (const ring of geometries.rings[id] ?? []) (selection as T.Group).add(new T.Line(new T.BufferGeometry().setFromPoints([...ring,ring[0]].map(p=>new T.Vector3(p[0]*S,0.1,p[1]*S))),new T.LineBasicMaterial({color:0xf4dd97})));
    scene.add(selection);
  }
  const ribbons: T.Mesh[] = [];
  function ribbon(points: {x:number;y:number}[], width: number, mat: T.Material, y = 0.055, joined=false, parts?:{x:number;y:number}[][]) {
    if(points.length<2)return;
    const positions:number[]=[];
    if(joined){
      const sides=points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dz=b.y-a.y,len=Math.hypot(dx,dz)||1;return [[p.x*S-dz/len*width/2,p.y*S+dx/len*width/2],[p.x*S+dz/len*width/2,p.y*S-dx/len*width/2]];});
      for(let i=1;i<sides.length;i++)for(const p of [sides[i-1][0],sides[i-1][1],sides[i][0],sides[i][0],sides[i-1][1],sides[i][1]])positions.push(p[0],y,p[1]);
    }
    for(const path of parts??[points])for(let i=1;!joined&&i<path.length;i++){
      const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.y-a.y,len=Math.hypot(dx,dz);if(len<0.001)continue;
      const nx=-dz/len*width/2,nz=dx/len*width/2;
      for(const p of [[a.x*S+nx,a.y*S+nz],[a.x*S-nx,a.y*S-nz],[b.x*S+nx,b.y*S+nz],[b.x*S+nx,b.y*S+nz],[a.x*S-nx,a.y*S-nz],[b.x*S-nx,b.y*S-nz]]) positions.push(p[0],y,p[1]);
    }
    const geometry = new T.BufferGeometry();geometry.setAttribute("position",new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
    const mesh=new T.Mesh(geometry,mat);mesh.receiveShadow=true;scene.add(mesh);ribbons.push(mesh);
  }
  const roadMat = new T.MeshStandardMaterial({ color: 0xb7a17a, side: T.DoubleSide, roughness: 1 });
  const riverMat = new T.MeshStandardMaterial({ color:0x4c858b,side:T.DoubleSide,roughness:0.5,metalness:0.04 });
  for(const river of live ? data.world.geography?.rivers ?? [] : presentationRivers(data)) ribbon(river.map(p=>({x:p[0],y:p[1]})),1.35,riverMat,0.035,!live);
  const clipRoad=live?((points:{x:number;y:number}[])=>[points]):riverRoadClipper(data);
  function drawRoad(points:{x:number;y:number}[],width:number){const parts=clipRoad(points,width);if(parts.length)ribbon(parts[0],width,roadMat,.055,false,parts);}
  for(const road of data.roads)drawRoad(road.points,road.kind==="main"?.8:.5);
  for(const city of data.cities)for(const road of city.layout.roads)drawRoad(road,.8);

  const modelBuildings = new T.Group(), spriteBuildings = new T.Group(); scene.add(modelBuildings,spriteBuildings); spriteBuildings.visible=false;
  const buildingRecords = data.cities.flatMap(city=>city.layout.buildings.map(b=>({...b,region:city.region})));
  const brick = material(0xa47a58), roofMat = material(0x48565b), windowMat = material(0xdbc79a), stoneMat=material(0xb2aa8c), chimneyMat=material(0x80593f);
  const boxGeometry = new T.BoxGeometry(1,1,1);
  const roofGeometry = new T.BufferGeometry();
  roofGeometry.setAttribute("position", new T.Float32BufferAttribute([
    -.5,0,-.5,.5,0,-.5,0,.38,-.5, -.5,0,.5,0,.38,.5,.5,0,.5,
    -.5,0,-.5,0,.38,-.5,0,.38,.5, -.5,0,-.5,0,.38,.5,-.5,0,.5,
    .5,0,-.5,.5,0,.5,0,.38,.5, .5,0,-.5,0,.38,.5,0,.38,-.5,
  ],3)); roofGeometry.computeVertexNormals(); roofMat.side=T.DoubleSide;
  const count=buildingRecords.length;
  const bodies=new T.InstancedMesh(boxGeometry,brick,count),roofs=new T.InstancedMesh(roofGeometry,roofMat,count),foundations=new T.InstancedMesh(boxGeometry,stoneMat,count),chimneys=new T.InstancedMesh(boxGeometry,chimneyMat,count), windows=new T.InstancedMesh(boxGeometry,windowMat,count*4);
  for(const m of [bodies,roofs,foundations,chimneys,windows]){m.castShadow=true;m.receiveShadow=true;modelBuildings.add(m);}
  const dummy=new T.Object3D();
  function place(mesh:T.InstancedMesh,i:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,angle=0){dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,angle,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
  const atlasMaterials=new Map<number,T.SpriteMaterial>();
  load("/art/city-kit/buildings-atlas.png", texture=>{
    for(let i=0;i<36;i++){const tile=texture.clone();resources.add(tile);tile.repeat.set(1/6,1/6);tile.offset.set((i%6)/6,1-(Math.floor(i/6)+1)/6);tile.needsUpdate=true;atlasMaterials.set(i,new T.SpriteMaterial({map:tile,alphaTest:0.08,depthWrite:true}));}
    for(const b of buildingRecords){const sprite=new T.Sprite(atlasMaterials.get(b.sprite%36));sprite.scale.set(b.width*S*1.25,b.height*S*1.25,1);sprite.position.set(b.x*S,b.height*S*0.55,b.y*S);spriteBuildings.add(sprite);}
  });
  buildingRecords.forEach((b,i)=>{
    const x=b.x*S,z=b.y*S,w=b.width*S,d=b.height*S,h=Math.max(0.85,Math.min(w,d)*(b.role==="landmark"?0.65:0.4));
    place(foundations,i,x,.08,z,w*1.1,.16,d*1.1,-b.angle);
    place(bodies,i,x,h/2+.15,z,w,h,d,-b.angle);
    place(roofs,i,x,h+.15,z,w*1.12,w*.65,d*1.14,-b.angle);
    place(chimneys,i,x-w*.24,h+.45,z+d*.22,w*.13,h*.9,w*.13,-b.angle);
    for(let j=0;j<4;j++) place(windows,i*4+j,x+(j%2===0?-1:1)*w*.24,h*.57,z+(j<2?-1:1)*(d*.5+.02),w*.16,h*.32,.05);
    bodies.setColorAt(i,new T.Color().setHSL(.065+(i%5)*.008,.19,.55+(i%4)*.025));
  });
  for(const m of [bodies,roofs,foundations,chimneys,windows]){m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();}
  const trees=data.scenery.filter(s=>s.kind==="tree");
  // Chunked instance batches allow Three's frustum culling to skip distant forests.
  const treeChunks=new Map<string,typeof trees>();
  for(const tree of trees){const key=`${Math.floor(tree.x/700)}:${Math.floor(tree.y/700)}`;const chunk=treeChunks.get(key)??[];chunk.push(tree);treeChunks.set(key,chunk);}
  const trunkMat=material(0x675340),leafMat=material(0x668348),snowLeafMat=material(0xdde6dc);
  const crownParts = [new T.SphereGeometry(.46,6,5),new T.SphereGeometry(.4,6,5),new T.SphereGeometry(.38,6,5)];
  crownParts[0].translate(0,.95,0);crownParts[1].translate(-.2,.62,.05);crownParts[2].translate(.21,.68,-.05);
  const crownGeometry=mergeGeometries(crownParts)!;crownParts.forEach(g=>g.dispose());
  const treeGroups:T.Group[]=[];
  for(const chunk of treeChunks.values()){
    const g=new T.Group(),trunks=new T.InstancedMesh(new T.CylinderGeometry(.07,.1,.8,5),trunkMat,chunk.length),crowns=new T.InstancedMesh(crownGeometry,leafMat,chunk.length);
    for(const m of [trunks,crowns]){m.castShadow=true;m.receiveShadow=true;g.add(m);}
    chunk.forEach((t,i)=>{const size=t.width*S*.9;place(trunks,i,t.x*S,size*.3,t.y*S,size,size,size);place(crowns,i,t.x*S,0,t.y*S,size,size,size,i*.72);crowns.setColorAt(i,new T.Color().setHSL(.20+(i%7)*.004,.22,.65+(i%4)*.03));});
    trunks.computeBoundingSphere();crowns.computeBoundingSphere();treeGroups.push(g);scene.add(g);
  }
  const rocks = data.world.mountainScenery?.length ? data.world.mountainScenery : data.scenery.filter(s=>s.kind==="rock");
  const rockMat=material(0x9a9d90),rockGeo=new T.IcosahedronGeometry(1,0),rockMesh=new T.InstancedMesh(rockGeo,rockMat,rocks.length*3);
  rocks.forEach((r,i)=>{const size=r.width*S*.38;for(let j=0;j<3;j++)place(rockMesh,i*3+j,r.x*S+Math.sin(i+j)*size*.32,size*(.3+j*.12),r.y*S+Math.cos(i+j)*size*.2,size*(.8-j*.13),size*(.65+j*.15),size*.7,i+j);});
  rockMesh.castShadow=true;rockMesh.receiveShadow=true;rockMesh.computeBoundingSphere();scene.add(rockMesh);

  // Generated roster positions are read-only. Selection references real army IDs.
  const forces=data.world.armies.filter(a=>a.strength>0).map(a=>{
    const squad=data.world.tactics?.squads.find(s=>s.army===a.id&&s.strength>0);
    const region=data.world.regions[a.region];
    return {army:a,x:(squad?.x??region.x)*S,z:(squad?.y??region.y)*S};
  });
  const infantry=forces.filter(f=>f.army.squadKind!=="motorized");
  const rig=bakeInfantry(0),troopMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.9});
  const troopMeshes=rig.parts.map(p=>{const m=new T.InstancedMesh(p.geometry,troopMat,infantry.length*6);m.castShadow=true;m.frustumCulled=false;scene.add(m);return m;});
  const vehicles=forces.filter(f=>f.army.squadKind==="motorized").map(f=>{const jeep=createJeep();jeep.root.scale.setScalar(.42);jeep.root.position.set(f.x,.07,f.z);scene.add(jeep.root);return jeep.root;});
  const actorWorld=new T.Matrix4(),local=new T.Matrix4(),combined=new T.Matrix4();
  let actorTime=0,studyCity=initialCity(data);
  const updateActors=(dt:number)=>{
    if(settings.motion)actorTime+=dt;
    infantry.forEach((f,index)=>{for(let member=0;member<6;member++){
      dummy.position.set(f.x+(member%3-1)*.45,.07,f.z+Math.floor(member/3)*.5);dummy.rotation.set(0,0,0);dummy.scale.setScalar(.36);dummy.updateMatrix();actorWorld.copy(dummy.matrix);
      const frame=settings.motion?Math.floor((actorTime*1.7+member*.17)%1*64):0;
      rig.parts.forEach((_,part)=>{local.fromArray(rig.walk[frame][part]);combined.multiplyMatrices(actorWorld,local);troopMeshes[part].setMatrixAt(index*6+member,combined);});
    }});
    for(const mesh of troopMeshes)mesh.instanceMatrix.needsUpdate=true;
  };
  const overlay=document.createElement("div");overlay.className="force-overlay";host.append(overlay);
  const selectedArmies=new Set<number>(),owner=data.world.vision?.owner??0;
  function selectArmies(ids:number[],additive=false){if(!additive)selectedArmies.clear();for(const id of ids)if(data.world.armies.some(a=>a.id===id&&a.owner===owner))selectedArmies.add(id);onArmies([...selectedArmies]);}
  const markers=forces.map(f=>{
    const button=document.createElement("button");button.className="force-marker";button.textContent=f.army.squadKind==="motorized"?"▰":"⚑";
    button.title=`${data.world.nations[f.army.owner].name} · Army ${f.army.id} · ${f.army.squadKind??"infantry"}`;
    button.setAttribute("aria-label",button.title);button.style.borderColor=data.world.nations[f.army.owner].color;
    button.addEventListener("pointerdown",e=>e.stopPropagation());button.onclick=e=>{selectArmies([f.army.id],e.shiftKey);};overlay.append(button);return {f,button};
  });
  const nationLabels: {element:HTMLElement,x:number,z:number}[]=[];
  let ownershipKey='';
  function refreshLabels(){const key=data.world.regions.map(r=>r.owner).join(',');if(key===ownershipKey)return;ownershipKey=key;nationLabels.forEach(l=>l.element.remove());nationLabels.length=0;
  const remaining=new Set(data.world.regions.filter(r=>r.owner!==null).map(r=>r.id));
  while(remaining.size){const first=remaining.values().next().value!;remaining.delete(first);const component=[data.world.regions[first]];
    for(let i=0;i<component.length;i++)for(const id of component[i].neighbors)if(remaining.has(id)&&data.world.regions[id].owner===component[0].owner){remaining.delete(id);component.push(data.world.regions[id]);}
    const anchor=component.reduce((a,b)=>a.area>b.area?a:b),element=document.createElement("span");element.className="nation-label";element.textContent=data.world.nations[anchor.owner!].name;overlay.append(element);nationLabels.push({element,x:anchor.x*S,z:anchor.y*S});
  }
  }
  refreshLabels();
  const projection=new T.Vector3();
  function screenPoint(x:number,z:number){projection.set(x,.5,z).project(camera);return {x:(projection.x+1)*host.clientWidth/2,y:(1-projection.y)*host.clientHeight/2,visible:projection.z>=-1&&projection.z<=1&&Math.abs(projection.x)<=1&&Math.abs(projection.y)<=1};}
  function updateOverlay(){for(const {f,button} of markers){const p=screenPoint(f.x,f.z);button.hidden=settings.strategy||!p.visible;button.style.left=`${p.x}px`;button.style.top=`${p.y-18}px`;button.setAttribute("aria-pressed",String(selectedArmies.has(f.army.id)));}
    for(const label of nationLabels){const p=screenPoint(label.x,label.z);label.element.hidden=!settings.strategy||!p.visible;label.element.style.left=`${p.x}px`;label.element.style.top=`${p.y}px`;}
  }
  const fogGroup=new T.Group();scene.add(fogGroup);const fogMat=new T.MeshBasicMaterial({color:0x15272b,transparent:true,opacity:.44,depthWrite:false});
  const fogMeshes=live?terrainMeshes.map(source=>{const m=new T.Mesh(source.geometry,fogMat);m.position.y=.25;m.userData.region=source.userData.region;fogGroup.add(m);return m;}):[];
  const originalGrounds=new Map(terrainMeshes.map(mesh=>[mesh,mesh.material]));
  const politicalMats=new Map(data.world.regions.map(r=>[r.id,new T.MeshBasicMaterial({color:r.owner===null?0x969e8a:data.world.nations[r.owner].color})]));
  const detailed=worldDetail(scene,data);const liveLayer=live?liveUnits(scene,host,data.world,live):undefined;let fullDetail=false;
  const target=new T.Vector3();
  function focus(x:number,z:number,span:number){
    target.set(x,0,z);controls.target.copy(target);camera.position.copy(target).add(new T.Vector3(5000,5000,5000));
    camera.zoom=100/span;camera.updateProjectionMatrix();controls.update();
  }
  function view(mode:"continent"|"town"|"ground"|"regional"){
    if(mode==="continent"){
      const bounds=new T.Box3().setFromObject(land),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
      const aspect=host.clientWidth/host.clientHeight;
      focus(center.x,center.z,Math.max((size.x+size.z)/Math.sqrt(6),(size.x+size.z)/Math.sqrt(2)/aspect)*1.18);
    }
    else if(studyCity)focus(studyCity.feature.x*S,studyCity.feature.y*S,mode==="ground"?28:mode==="regional"?300:85);
  }
  function chooseCity(id:string){const city=data.cities.find(c=>c.feature.id===id);if(!city)return;studyCity=city;actorTime=0;select(city.region);onSelect(city.region);if(city.feature.id===data.studyCityId)focus(city.layout.plaza.x*S,city.layout.plaza.y*S,48);else view("town");}
  function configure(next:StudySettings){
    settings={...next};borderGroup.visible=settings.borders||settings.strategy;modelBuildings.visible=!settings.strategy&&!settings.sprites;spriteBuildings.visible=!settings.strategy&&settings.sprites;
    for(const mesh of terrainMeshes)mesh.material=settings.strategy?politicalMats.get(mesh.userData.region)!:originalGrounds.get(mesh)!;
    for(const child of land.children)if(!terrainMeshes.includes(child as T.Mesh))child.visible=!settings.strategy||!child.userData.detailPatch;
    for(const item of [...ribbons,...treeGroups,rockMesh,...troopMeshes,...vehicles])item.visible=!settings.strategy;
renderer.shadowMap.enabled=settings.shadows;
    for(const [name,mat]of Object.entries(grounds)){mat.map=settings.textures&&!settings.snow?mat.userData.retainedMap??null:null;mat.needsUpdate=true;mat.color.setHex(settings.snow?(name==="forest"?0xb8c8c0:0xe5e6db):palette[name as keyof typeof palette]);}
    leafMat.color.setHex(settings.snow?0xc5d5cf:0x668348);roofMat.color.setHex(settings.snow?0xc8d4d7:0x48565b);rockMat.color.setHex(settings.snow?0xc5cbc6:0x9a9d90);
    hemi.color.setHex(settings.snow?0xe0ebf5:0xf0efdc);sun.color.setHex(settings.snow?0xfff1da:0xffe4b9);
  }
  const raycaster=new T.Raycaster(),pointer=new T.Vector2();let down={x:0,y:0},selecting=false,pointerId=-1;
  const marquee=document.createElement("div");marquee.className="selection-marquee";marquee.hidden=true;host.append(marquee);
  const onDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};selecting=e.button===0&&e.pointerType!=="touch";pointerId=e.pointerId;if(selecting)renderer.domElement.setPointerCapture(e.pointerId);};
  const onMove=(e:PointerEvent)=>{if(!selecting||e.pointerId!==pointerId)return;const rect=host.getBoundingClientRect();marquee.hidden=false;Object.assign(marquee.style,{left:`${Math.min(down.x,e.clientX)-rect.left}px`,top:`${Math.min(down.y,e.clientY)-rect.top}px`,width:`${Math.abs(e.clientX-down.x)}px`,height:`${Math.abs(e.clientY-down.y)}px`});};
  const onUp=(e:PointerEvent)=>{const wasSelecting=selecting;selecting=false;marquee.hidden=true;if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);if(e.type==="pointercancel")return;
    const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y)>5,rect=renderer.domElement.getBoundingClientRect();
    if(wasSelecting&&moved){if(!settings.strategy){const ids=liveLayer?liveLayer.box(Math.min(down.x,e.clientX)-rect.left,Math.min(down.y,e.clientY)-rect.top,Math.max(down.x,e.clientX)-rect.left,Math.max(down.y,e.clientY)-rect.top,camera):forces.filter(f=>{const p=screenPoint(f.x,f.z);return f.army.owner===owner&&p.visible&&p.x>=Math.min(down.x,e.clientX)-rect.left&&p.x<=Math.max(down.x,e.clientX)-rect.left&&p.y>=Math.min(down.y,e.clientY)-rect.top&&p.y<=Math.max(down.y,e.clientY)-rect.top;}).map(f=>f.army.id);selectArmies(ids,e.shiftKey);}return;}
    if(moved)return;
    if(liveLayer){const squad=liveLayer.hit(e.clientX-rect.left,e.clientY-rect.top,camera);if(squad){if(e.button===2&&squad.owner!==data.world.vision?.owner){live?.onAttackTarget?.(squad.id);return;}if(e.button===0&&squad.owner===data.world.vision?.owner){live?.onSelectSquad?.(squad.id,e.shiftKey);return;}}if(e.button===2){pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(terrainMeshes,false)[0];if(hit)live?.onLocalPoint?.(hit.point.x/S,hit.point.z/S,e.shiftKey);return;}}
    if(e.button!==0)return;
    if(!settings.strategy&&!liveLayer){const hit=forces.find(f=>{const p=screenPoint(f.x,f.z);return p.visible&&Math.hypot(p.x-(e.clientX-rect.left),p.y-(e.clientY-rect.top))<14;});if(hit){selectArmies([hit.army.id],e.shiftKey);return;}}
    pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(terrainMeshes,false)[0];if(hit){if(live?.onMapTap?.(hit.point.x/S,hit.point.z/S))return;const id=hit.object.userData.region as number;select(id);onSelect(id);}
  };
  const keys=new Set<string>();
  const editable=()=>document.activeElement?.matches("input,select,textarea,[contenteditable=true]");
  const onKey=(e:KeyboardEvent)=>{if(editable())return;if(e.key==="Escape"){selectArmies([]);marquee.hidden=true;selecting=false;}if("wasd".includes(e.key.toLowerCase())&&e.key.length===1){keys.add(e.key.toLowerCase());e.preventDefault();}};
  const onKeyUp=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase()),onBlur=()=>{keys.clear();selecting=false;marquee.hidden=true;};
  window.addEventListener("keydown",onKey);window.addEventListener("keyup",onKeyUp);window.addEventListener("blur",onBlur);
  renderer.domElement.addEventListener("pointerdown",onDown);renderer.domElement.addEventListener("pointermove",onMove);renderer.domElement.addEventListener("pointerup",onUp);renderer.domElement.addEventListener("pointercancel",onUp);
  const resize=()=>{const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);camera.left=-50*width/height;camera.right=50*width/height;camera.top=50;camera.bottom=-50;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();view("town");
  function memory(){const geometries=new Set<T.BufferGeometry>();scene.traverse(o=>{if(o instanceof T.Mesh)geometries.add(o.geometry);});let geometryBytes=0;for(const g of geometries){for(const a of Object.values(g.attributes))geometryBytes+=a.array.byteLength;geometryBytes+=g.index?.array.byteLength??0;}scene.traverse(o=>{if(o instanceof T.InstancedMesh)geometryBytes+=o.instanceMatrix.array.byteLength;});return {geometryMiB:geometryBytes/1048576,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,jsHeapMiB:(performance as Performance & {memory?:{usedJSHeapSize:number}}).memory?.usedJSHeapSize! /1048576||null};}
  let sample: {frames:number[];last:number;end:number;calls:number;triangles:number;peakVisibleSoldiers:number;resolve:(v:unknown)=>void}|undefined;
  let previous=performance.now(),sampleAt=previous,frames=0,raf=0;
  const render=()=>{if(disposed)return;const now=performance.now(),dt=Math.min(.05,(now-previous)/1000);previous=now;if(!document.hidden){if(keys.size&&!editable()){const speed=40/camera.zoom*dt;const x=(Number(keys.has("d"))-Number(keys.has("a")))*speed,z=(Number(keys.has("s"))-Number(keys.has("w")))*speed;const delta=new T.Vector3(x+z,0,z-x).multiplyScalar(Math.SQRT1_2);camera.position.add(delta);controls.target.add(delta);}controls.update();updateActors(dt);updateOverlay();
    sun.target.position.copy(controls.target);sun.position.copy(controls.target).add(new T.Vector3(-85,160,90));
    const lod=detailed.update(camera,settings.snow,settings.strategy,fullDetail,now,controls.target,settings.sprites);
    if(!settings.strategy){modelBuildings.visible=lod==='regional'&&!settings.sprites;spriteBuildings.visible=settings.sprites&&lod!=='continent';treeGroups.forEach(g=>g.visible=lod==='regional');ribbons.forEach(m=>m.visible=lod!=='continent');rockMesh.visible=lod!=='continent';}
    renderer.shadowMap.enabled=settings.shadows&&!settings.strategy&&(lod==='tactical'||lod==='full');
    landscapeStudy?.update(camera,settings.snow,settings.strategy,land);
    if(liveLayer){troopMeshes.forEach(m=>m.visible=false);vehicles.forEach(m=>m.visible=false);markers.forEach(({button})=>button.hidden=true);liveLayer.render(camera,settings.strategy,now);}
    renderer.render(scene,camera);frames++;
    if(sample){sample.frames.push(now-sample.last);sample.last=now;sample.peakVisibleSoldiers=Math.max(sample.peakVisibleSoldiers,detailed.stats().visibleSoldiers);sample.calls=Math.max(sample.calls,renderer.info.render.calls);sample.triangles=Math.max(sample.triangles,renderer.info.render.triangles);if(now>=sample.end){const current=sample;sample=undefined;const sorted=current.frames.slice(1).sort((a,b)=>a-b);const q=(p:number)=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]??0;current.resolve({p50:q(.5),p95:q(.95),p99:q(.99),over33:sorted.filter(t=>t>33.4).length,frames:sorted.length,maxCalls:current.calls,maxTriangles:current.triangles,peakVisibleSoldiers:current.peakVisibleSoldiers,...detailed.stats(),...memory()});}}

    if(now-sampleAt>1200){onStats({...detailed.stats(),fps:Math.round(frames*1000/(now-sampleAt)),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,trees:trees.length,buildings:count,view:camera.zoom<.3?"Continent":camera.zoom>2?"Ground":"Regional"});sampleAt=now;frames=0;}
  }else{sampleAt=now;frames=0;}raf=requestAnimationFrame(render);};render();
  return {view,chooseCity,configure,select,selectArmies,refineRegion(){if(landscapeStudy){landscapeStudy.setEnabled(true);chooseCity(landscapeStudy.city.feature.id);if(selection)selection.visible=false;}},landscapeStats:()=>landscapeStudy?.stats,setLandscape(enabled:boolean){landscapeStudy?.setEnabled(enabled);},focusRegion(id:number){const r=data.world.regions[id];if(r)focus(r.x*S,r.y*S,85);},project(x:number,y:number){const p=screenPoint(x*S,y*S);return p;},liveSnapshot:()=>liveLayer?.snapshot(),setSelectedSquads(ids:string[]){liveLayer?.setSelected(ids);if(liveLayer){selectedArmies.clear();for(const s of data.world.tactics?.squads??[])if(ids.includes(s.id)&&s.army!==null)selectedArmies.add(s.army);}},updateWorld(world:World){data.world=world;liveLayer?.update(world);refreshLabels();const visible=new Set(world.vision?.visible??world.regions.map(r=>r.id));fogMeshes.forEach(m=>m.visible=!visible.has(m.userData.region));for(const line of borderGroup.children){const r=world.regions[line.userData.region];((line as T.Line).material as T.LineBasicMaterial).color.set(r.owner===null?0xc9c7a2:world.nations[r.owner].color);}for(const r of world.regions)politicalMats.get(r.id)?.color.set(r.owner===null?0x969e8a:world.nations[r.owner].color);},setLoad:detailed.setLoad,setFullDetail(value:boolean){fullDetail=value;},pan(dx:number,dz:number){camera.position.x+=dx;camera.position.z+=dz;controls.target.x+=dx;controls.target.z+=dz;},benchmark(ms=4000){if(sample)throw Error('Benchmark already running');return new Promise(resolve=>{sample={frames:[],last:performance.now(),end:performance.now()+ms,calls:0,triangles:0,peakVisibleSoldiers:0,resolve};});},focusArmy(id:number){const f=forces.find(f=>f.army.id===id);if(f)focus(f.x,f.z,28);},dispose(){disposed=true;sample?.resolve({cancelled:true});sample=undefined;landscapeStudy?.dispose();liveLayer?.dispose();detailed.dispose();cancelAnimationFrame(raf);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener("pointerdown",onDown);renderer.domElement.removeEventListener("pointerup",onUp);
    overlay.remove();marquee.remove();window.removeEventListener("keydown",onKey);window.removeEventListener("keyup",onKeyUp);window.removeEventListener("blur",onBlur);renderer.domElement.removeEventListener("pointermove",onMove);renderer.domElement.removeEventListener("pointercancel",onUp);politicalMats.forEach(m=>m.dispose());
    const geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh || o instanceof T.Line || o instanceof T.Sprite){if("geometry" in o)geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());resources.forEach(t=>t.dispose());snowLeafMat.dispose();atlasMaterials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();
  }};
}

import React,{useEffect,useMemo,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createMiniatureKit} from './referenceAssets';
import {createInfantryReference,createMilitaryModel} from '../prototypes/militaryModels';
import {WORLD_TO_MODEL as S} from './miniatureData';
import {SETTLEMENT_RADII} from '../../../../packages/game-core/src/campaignScale';
import {SITE_RULES,type ResourceKind} from '../../../../packages/game-core/src/resourceSites';
import type {createPacingStudy} from '../../../../packages/game-core/src/campaignPacingStudy';
import type {TimedObjective} from '../../../../packages/game-core/src/timedSettlementStudy';
import {physicalAnchor,PHYSICAL_SEPARATION} from './pacingPhysicalScale';
import './pacingWorld3D.css';
import {generatePacingCountryside} from '../../../../packages/game-core/src/pacingCountryside';
import {createPacingRuralScene} from './pacingRuralScene';
import {buildPacingCorridor,corridorClearsField} from '../../../../packages/game-core/src/pacingCorridor';
import {buildCountryRoadNetwork,countryRoadFieldFilter} from '../../../../packages/game-core/src/countryRoadNetwork';
import {pacingRoadDestinations} from '../../../../packages/game-core/src/pacingRoadDestinations';
import {createCountryRoadScene} from './countryRoadScene';
import {constrainPacingCamera} from './pacingCameraLimits';
import {buildConnectedTerrain,terrainHeight as sampleTerrainHeight} from '../../../../packages/game-core/src/connectedTerrain';
import {createConnectedTerrainScene} from './connectedTerrainScene';
import {createCorridorDetail} from './pacingCorridorDetail';
import {refinedGrain,refineSurface} from './refinedSurface';
type Props={study:ReturnType<typeof createPacingStudy>;objectives:TimedObjective[];physical:boolean};
export function PacingWorld3D({study,objectives,physical}:Props){
 const host=useRef<HTMLDivElement>(null),api=useRef<{focus:(id:string)=>void;zoom:(factor:number)=>void;roadside:()=>void}|undefined>(undefined);
 const [focused,setFocused]=useState('overview');
 const [error,setError]=useState('');
 const [showLocations,setShowLocations]=useState(true);
 const locations=[...study.world.regions.flatMap(r=>(r.features??[]).filter(f=>f.kind==='settlement').map(f=>({id:`existing-${r.id}-${f.id}`,name:f.name,x:f.x,y:f.y,size:f.size??'hamlet' as const}))),...objectives];
 const rural=useMemo(()=>physical?generatePacingCountryside(study.world,S*PHYSICAL_SEPARATION,[...locations.map(c=>({x:c.x,y:c.y,radius:SETTLEMENT_RADII[c.size]/PHYSICAL_SEPARATION})),...study.sites.map(s=>({x:s.x,y:s.y,radius:12/(S*PHYSICAL_SEPARATION)}))]):{farms:[],pois:[]},[study,objectives,physical]);
 const corridor=useMemo(()=>physical?buildPacingCorridor(study.world,locations.filter(c=>c.size==='city'||c.size==='metropolis').map(c=>({...c,radius:SETTLEMENT_RADII[c.size]*S})),rural,S*PHYSICAL_SEPARATION):null,[study,objectives,physical,rural]);
 const dressedRural=useMemo(()=>({...rural,farms:rural.farms.map(f=>({...f,fields:f.fields.filter(p=>corridorClearsField(p,corridor,S*PHYSICAL_SEPARATION))}))}),[rural,corridor]);
 const surface=useMemo(()=>{
  if(!physical)return undefined;
  const reserves=[...locations.map(c=>({x:c.x,y:c.y,radius:SETTLEMENT_RADII[c.size]/PHYSICAL_SEPARATION})),...rural.farms.map(f=>({x:f.x,y:f.y,radius:f.extent/(S*PHYSICAL_SEPARATION)})),...rural.pois.map(p=>({x:p.x,y:p.y,radius:p.extent/(S*PHYSICAL_SEPARATION)})),...study.sites.map(s=>({x:s.x,y:s.y,radius:12/(S*PHYSICAL_SEPARATION)}))];
  return buildConnectedTerrain(study.world,S*PHYSICAL_SEPARATION,reserves,corridor?[corridor.path]:[]);
 },[study,objectives,rural,corridor,physical]);
 const destinations=useMemo(()=>pacingRoadDestinations(locations.map(c=>({...c,radius:SETTLEMENT_RADII[c.size]*S,major:c.size==='city'||c.size==='metropolis'})),rural.pois,study.sites,S*PHYSICAL_SEPARATION),[study,objectives,rural]);
 const roads=useMemo(()=>surface?buildCountryRoadNetwork(study.world,surface,destinations):undefined,[surface,destinations,study]);
 const roadRural=useMemo(()=>{const clear=roads?countryRoadFieldFilter(roads):()=>true;return {...dressedRural,farms:dressedRural.farms.map(f=>({...f,fields:f.fields.filter(clear)}))};},[dressedRural,roads]);
 const relief=surface?.ranges??[];
 useEffect(()=>{
  if(!host.current)return;const el=host.current;let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});}catch(e){setError(String(e));return;}
  const separation=physical?PHYSICAL_SEPARATION:1;
  const origin={x:(study.world.geography?.width??0)/2,y:(study.world.geography?.height??0)/2};
  const anchor=(x:number,y:number)=>physicalAnchor({x,y},separation,origin);
  const point=(x:number,y:number,height=0)=>{const p=anchor(x,y);return new T.Vector3(p.x,height,p.y);};
  const logical=(p:{x:number;z:number})=>({x:p.x/(S*separation)+origin.x,y:p.z/(S*separation)+origin.y});
  const terrainHeight=(p:{x:number;z:number})=>{const w=logical(p);return surface?sampleTerrainHeight(surface,w.x,w.y):0;};
  const scene=new T.Scene();scene.background=new T.Color('#183c48');
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(el.clientWidth,600);el.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','3D pacing world: drag to orbit, right-drag to pan, scroll to zoom');
  const camera=new T.PerspectiveCamera(45,el.clientWidth/600,1,20000),controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2-.08;controls.minDistance=10;
  controls.zoomToCursor=true;
  controls.screenSpacePanning=false;
  const guardGround=()=>constrainPacingCamera(camera.position,controls.target,terrainHeight);
  controls.addEventListener('change',guardGround);
  scene.add(new T.HemisphereLight('#e6eee7','#4b4935',2));const sun=new T.DirectionalLight('#ffe3b0',2.4);sun.position.set(300,900,100);scene.add(sun);
  const kit=createMiniatureKit(),ownedGeometry:T.BufferGeometry[]=[],ownedMaterials:T.Material[]=[];
  const ruralScene=createPacingRuralScene(scene,kit,roadRural,point,null);
  const roadScene=roads&&surface?createCountryRoadScene(scene,roads,surface,point):undefined;
  const reliefScene=surface?createConnectedTerrainScene(scene,surface,point):undefined;
  const corridorDetail=createCorridorDetail(scene,study.world,roadRural,corridor,kit,point,logical,roads,terrainHeight);
  const grain=refinedGrain();
  const mat=(color:string)=>{const m=new T.MeshStandardMaterial({color,roughness:1});refineSurface(m,grain);ownedMaterials.push(m);return m;};
  const terrain={plains:mat('#8c9566'),forest:mat('#526e4b'),highlands:mat('#8b8871'),mountains:mat('#777e79')};
  const colors=['#7bcee1','#ebad77','#aaca83','#c9a4df'];
  const line=(points:T.Vector3[],color:string)=>{const g=new T.BufferGeometry().setFromPoints(points),m=new T.LineBasicMaterial({color});ownedGeometry.push(g);ownedMaterials.push(m);scene.add(new T.Line(g,m));};
  const bounds=new T.Box3();
  for(const r of study.world.regions){
   for(const ring of r.contours??[r.polygon]){
    const shape=new T.Shape(ring.map(p=>{const a=anchor(p[0],p[1]);return new T.Vector2(a.x,-a.y);})),g=new T.ShapeGeometry(shape);g.rotateX(-Math.PI/2);ownedGeometry.push(g);
    scene.add(new T.Mesh(g,terrain[r.terrain]));
    ring.forEach(p=>bounds.expandByPoint(point(p[0],p[1])));
    const zone=study.zones.find(z=>z.region===r.id);
    if(zone)line([...ring,ring[0]].map(p=>point(p[0],p[1],.8)),colors[zone.player]);
   }
  }
  for(const river of study.world.geography?.rivers??[])line(river.map(p=>point(p[0],p[1],.15)),'#69b5cb');
  const batches=new Map<string,T.Matrix4[]>(),pose=new T.Object3D();
  function model(name:string,x:number,z:number,scale=1,angle=0){pose.position.set(x,terrainHeight({x,z}),z);pose.rotation.set(0,angle,0);pose.scale.setScalar(scale);pose.updateMatrix();const list=batches.get(name)??[];list.push(pose.matrix.clone());batches.set(name,list);}
  const ground=mat('#b8ae85');
  function disk(x:number,z:number,radius:number,color?:string){const g=new T.CircleGeometry(radius,40);g.rotateX(-Math.PI/2);ownedGeometry.push(g);const m=color?mat('#'+new T.Color(color).lerp(new T.Color('#a39c79'),.75).getHexString()):ground;const mesh=new T.Mesh(g,m);mesh.position.set(x,.12,z);scene.add(mesh);}
  for(const c of locations){
   const radius=SETTLEMENT_RADII[c.size]*S,{x,y:z}=anchor(c.x,c.y);
   const resource='resourceKind' in c?c.resourceKind as ResourceKind:undefined;
   disk(x,z,radius,resource?SITE_RULES[resource].color:undefined);
   if(resource==='fuel'){
    model('boilerHouse',x-4,z,1);
    const g=new T.CylinderGeometry(.5,3,18,4,1,true),m=new T.MeshStandardMaterial({color:'#4a4031',wireframe:true});ownedGeometry.push(g);ownedMaterials.push(m);const rig=new T.Mesh(g,m);rig.position.set(x+4,9,z);scene.add(rig);continue;
   }
   if(resource==='industry'||resource==='agriculture'){model(resource==='industry'?'mill':'warehouse',x,z,1);continue;}
   const step=6;
   for(let dx=-radius+6;dx<radius-5;dx+=step)for(let dz=-radius+6;dz<radius-5;dz+=step){
    if(Math.hypot(dx,dz)>radius-6||Math.abs(dx)<3||Math.abs(dz)<3)continue;
    const index=Math.abs(Math.round(dx*3+dz*7));model(c.size==='city'&&Math.hypot(dx,dz)<radius*.4?'commercialTower':index%3===0?'urbanRed':index%2?'urbanShop':'urbanHome',x+dx,z+dz,.65,index%2?Math.PI:0);
   }
   model(c.size==='city'?'commercialTower':'urbanHome',x,z,.85);
  }
  for(const r of study.world.regions)for(const f of r.features??[])if(f.kind==='forest'){const p=anchor(f.x,f.y);model('tree',p.x,p.y,2);}
  for(const s of study.sites){const p=anchor(s.x,s.y);disk(p.x,p.y,5,colors[s.player]);model('warehouse',p.x,p.y,.45);}
  // Use the city-diorama military scale, not enlarged overview icons.
  const scaleCity=locations.find(c=>c.size==='city')??locations[0];
  const scalePoint=scaleCity?point(scaleCity.x,scaleCity.y,.14).add(new T.Vector3(0,0,SETTLEMENT_RADII[scaleCity.size]*S-3)):bounds.getCenter(new T.Vector3());
  const infantry=createInfantryReference(),tank=createMilitaryModel('tank');
  infantry.scale.setScalar(.55);tank.root.scale.setScalar(.55);
  infantry.position.copy(scalePoint).add(new T.Vector3(-2,0,0));tank.root.position.copy(scalePoint).add(new T.Vector3(1,0,0));
  scene.add(infantry,tank.root);ownedGeometry.push(infantry.geometry);ownedMaterials.push(infantry.material);
  for(const [dx,color] of [[-2,'#9aeee4'],[1,'#f5d678']] as const){const g=new T.RingGeometry(.65,.75,32);g.rotateX(-Math.PI/2);ownedGeometry.push(g);const ring=new T.Mesh(g,mat(color));ring.position.copy(scalePoint).add(new T.Vector3(dx,.02,0));scene.add(ring);}
  for(const [name,matrices] of batches)for(const part of kit.variants.get(name)??[]){if(part.snow)continue;const mesh=new T.InstancedMesh(part.geometry,part.material,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);}
  const center=bounds.getCenter(new T.Vector3()),span=bounds.getSize(new T.Vector3()).length();
  camera.far=Math.max(20000,span*12/Math.min(1,camera.aspect));camera.updateProjectionMatrix();controls.maxDistance=camera.far/3;
  function focus(id:string){if(id==='unit-scale'){controls.target.copy(scalePoint).add(new T.Vector3(0,.7,0));camera.position.copy(controls.target).add(new T.Vector3(7,6,12));controls.update();return;}const target=locations.find(l=>l.id===id)??study.sites.find(s=>s.id===id)??rural.farms.find(s=>s.id===id)??rural.pois.find(s=>s.id===id);const p=target?point(target.x,target.y):center;const distance=target?('extent' in target?target.extent*3:'size' in target?SETTLEMENT_RADII[target.size]*S*4:90):span*.9/Math.min(1,camera.aspect);controls.target.copy(p);camera.position.copy(p).add(new T.Vector3(.6,.8,.8).normalize().multiplyScalar(distance));controls.update();}
  const ordinaryFocus=focus;
  function roadside(){const road=roads?.roads.find(r=>r.id.startsWith('entrance-'));if(!road)return;const p=road.path[0];controls.target.copy(point(p.x,p.y,surface?sampleTerrainHeight(surface,p.x,p.y)+.5:.5));camera.position.copy(controls.target).add(new T.Vector3(18,12,25));controls.update();}
  function visit(id:string){if(id==='road-bridge'&&roads?.bridges[0]){const b=roads.bridges[0];controls.target.copy(point(b.x,b.y,surface?sampleTerrainHeight(surface,b.x,b.y):0));camera.position.copy(controls.target).add(new T.Vector3(30,24,30));controls.update();return;}const mountain=relief.find(s=>s.mountain),hill=relief.find(s=>!s.mountain);const s=relief.find(s=>s.id===id)??(id==='mountain-study'?mountain:id==='hill-study'?hill:undefined);if(s){controls.target.copy(point(s.x,s.y,s.height*.25));camera.position.copy(controls.target).add(new T.Vector3(.5,.65,1).normalize().multiplyScalar(s.radius*S*separation*2.4/Math.min(1,camera.aspect)));controls.update();return;}if(id==='review-corridor'&&corridor){const box=new T.Box3().setFromPoints(corridor.path.map(p=>point(p.x,p.y))),p=box.getCenter(new T.Vector3());controls.target.copy(p);camera.position.copy(p).add(new T.Vector3(.25,1,.6).normalize().multiplyScalar(Math.max(100,box.getSize(new T.Vector3()).length()*1.25)));controls.update();}else ordinaryFocus(id);}
  // HTML markers retain a fixed screen footprint; local world meshes stay true scale.
  const overlay=document.createElement('div');overlay.className='pacing-label-layer';el.append(overlay);
  const markers:{button:HTMLButtonElement;label:HTMLSpanElement;position:T.Vector3;range:number}[]=[];
  function marker(id:string,name:string,glyph:string,color:string,position:T.Vector3,range=Infinity){
   const button=document.createElement('button');button.className='pacing-map-marker';button.title=`Visit ${name}`;button.setAttribute('aria-label',`Visit ${name}`);
   button.style.setProperty('--marker-color',color);
   const icon=document.createElement('span');icon.className='pacing-marker-icon';icon.textContent=glyph;
   const label=document.createElement('span');label.className='pacing-marker-name';label.textContent=name;
   button.append(icon,label);button.onclick=()=>{focus(id);setFocused(id);};overlay.append(button);markers.push({button,label,position,range});
  }
  // Regional cities win label space before resource sites and sampled bases.
  for(const c of [...locations].sort((a,b)=>Number(b.size==='city')-Number(a.size==='city'))){const resource='resourceKind' in c?c.resourceKind as ResourceKind:undefined;marker(c.id,c.name,resource==='fuel'?'F':resource==='industry'?'I':resource==='agriculture'?'A':'◆',resource?SITE_RULES[resource].color:'#f7e6ad',point(c.x,c.y,12));}
  for(const s of study.sites)marker(s.id,`P${s.player+1} base ${s.id.split('-')[1]}`,'⌂',colors[s.player],point(s.x,s.y,6));
  marker('unit-scale','Soldier + tank','●','#9aeee4',scalePoint.clone().add(new T.Vector3(0,2,0)));
  for(const f of rural.farms)marker(f.id,f.name,'▧','#cfce83',point(f.x,f.y,8));
  for(const p of rural.pois)marker(p.id,p.name,'⌂','#c6b894',point(p.x,p.y,8),25000);
  const projected=new T.Vector3();
  function updateMarkers(){
   const width=el.clientWidth,height=600,occupied:{x:number;y:number;w:number}[]=[];
   for(const m of markers){projected.copy(m.position).project(camera);const visible=camera.position.distanceTo(m.position)<m.range&&projected.z>=-1&&projected.z<=1&&Math.abs(projected.x)<.98&&Math.abs(projected.y)<.96;m.button.hidden=!visible;if(!visible)continue;
    const x=(projected.x+1)*width/2,y=(1-projected.y)*height/2;m.button.style.left=`${x}px`;m.button.style.top=`${y}px`;
    const w=Math.min(190,m.label.textContent!.length*7+16);let placed=false;
    for(const dy of [-30,4,-56,30]){const lx=Math.max(4,Math.min(width-w-4,x+14)),ly=y+dy;if(ly<0||ly+24>height||occupied.some(r=>lx<r.x+r.w+4&&lx+w+4>r.x&&ly<r.y+28&&ly+28>r.y))continue;
     m.label.style.left=`${lx-x+11}px`;m.label.style.top=`${dy+11}px`;occupied.push({x:lx,y:ly,w});placed=true;break;}
    m.label.style.visibility=placed?'visible':'hidden';
   }
  }
  const zoom=(factor:number)=>{const offset=camera.position.clone().sub(controls.target);offset.setLength(T.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();};
  api.current={focus:visit,zoom,roadside};focus('overview');setFocused('overview');let raf=0;
  const observer=new ResizeObserver(()=>{camera.aspect=el.clientWidth/600;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,600);});observer.observe(el);
  const render=()=>{controls.zoomSpeed=camera.position.distanceTo(controls.target)>1000?5:1.5;controls.update();guardGround();const near=Math.max(.15,camera.position.distanceTo(controls.target)/1200);if(Math.abs(camera.near-near)>.01){camera.near=near;camera.updateProjectionMatrix();}camera.updateMatrixWorld();updateMarkers();ruralScene.update(camera,controls.target,performance.now());corridorDetail.update(camera,controls.target,performance.now());roadScene?.update(camera,controls.target);renderer.render(scene,camera);raf=requestAnimationFrame(render);};render();
  return ()=>{api.current=undefined;cancelAnimationFrame(raf);observer.disconnect();overlay.remove();controls.dispose();tank.dispose();corridorDetail.dispose();reliefScene?.dispose();roadScene?.dispose();grain.dispose();ruralScene.dispose();scene.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose();});ownedGeometry.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());kit.dispose();renderer.dispose();renderer.domElement.remove();};
 },[study,objectives,physical]);
 return <section><h2>3D world placement review</h2>
 <p>{physical?'Physical country scale: expanded countryside, unchanged local models.':'Compact comparison: countryside detail is available in Physical country scale.'} Representative cities; full tactical cities are not connected.</p>
 {physical&&<p>{relief.filter(s=>s.mountain).length} connected mountain ranges · {relief.filter(s=>!s.mountain).length} upland areas. Continuous ridges, foothills and river valleys follow the land. Select a range below to inspect it. Ground detail appears near roads.</p>}
 {physical&&<p>{rural.farms.length} farmland districts · {roadRural.farms.reduce((n,f)=>n+f.fields.length,0)} crop parcels · {rural.pois.length} compact country POIs. Scenery only: no extra income or ownership. At most six nearby POIs load detailed assets. Generated roads join local entrances to the country network.</p>}
 {roads&&<p>{roads.connectedSites}/{destinations.length} locations connected · {roads.components} land networks · {roads.bridges.length} river bridges. Highways 6 model units wide; local roads 3. Visual routes only; campaign travel rules are unchanged.</p>}
 {roads&&roads.unreachable.length>0&&<details><summary>{roads.unreachable.length} locations without a safe road</summary>{roads.unreachable.map(s=><p key={s.id}>{s.name}: {s.reason}</p>)}</details>}
 <p>Click markers to visit. ◆ Settlement · F Fuel · I Industry · A Agriculture · ▧ Farmlands · ⌂ Base/country POI. Minor POI markers appear at regional zoom; every site is available in Focus. Hover crowded markers for names.</p>
 <div className="pacing-map-tools"><button onClick={()=>{api.current?.focus('overview');setFocused('overview');}}>Fit country</button><button onClick={()=>api.current?.zoom(.25)}>Zoom in 4×</button><button onClick={()=>api.current?.zoom(4)}>Zoom out 4×</button>
 <label><input type="checkbox" checked={showLocations} onChange={e=>setShowLocations(e.target.checked)}/>Show locations</label>
 {rural.farms[0]&&<button onClick={()=>{api.current?.focus(rural.farms[0].id);setFocused(rural.farms[0].id);}}>Visit farmlands</button>}
 {rural.pois[0]&&<button onClick={()=>{api.current?.focus(rural.pois[0].id);setFocused(rural.pois[0].id);}}>Visit country POI</button>}
 {relief.some(s=>s.mountain)&&<button onClick={()=>api.current?.focus('mountain-study')}>Mountain ranges</button>}
 {relief.length>0&&<label>Terrain <select defaultValue="" onChange={e=>api.current?.focus(e.target.value)}><option value="" disabled>Visit a range or upland</option>{relief.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
 {relief.some(s=>!s.mountain)&&<button onClick={()=>api.current?.focus('hill-study')}>Visit hills</button>}
 {roads&&<button onClick={()=>api.current?.roadside()}>Refined roadside</button>}
 {roads&&roads.bridges.length>0&&<button onClick={()=>api.current?.focus('road-bridge')}>Visit river bridge</button>}
 {corridor&&<><button onClick={()=>{api.current?.focus(corridor.id);setFocused(corridor.id);}}>Review corridor</button><button onClick={()=>{api.current?.focus(corridor.cityId);setFocused(corridor.cityId);}}>Corridor city</button><button onClick={()=>{api.current?.focus(corridor.farmsteadId);setFocused(corridor.farmsteadId);}}>Corridor farm</button><button onClick={()=>{api.current?.focus(corridor.outpostId);setFocused(corridor.outpostId);}}>Corridor outpost</button></>}
 <label>Focus <select value={focused} onChange={e=>{setFocused(e.target.value);api.current?.focus(e.target.value);}}><option value="overview">Whole map</option><option value="unit-scale">Soldier + tank scale review</option>{corridor&&<option value="review-corridor">Review corridor</option>}{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}{study.sites.map(s=><option key={s.id} value={s.id}>Player {s.player+1} base {s.id}</option>)}<optgroup label="Farmland districts">{rural.farms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</optgroup><optgroup label="Compact countryside POIs">{rural.pois.map(p=><option key={p.id} value={p.id}>{p.name} [{p.id}]</option>)}</optgroup></select></label></div>
 <p>Soldier and tank are static scale references. Drag to orbit; right-drag to pan. Wheel zoom is faster at country scale and gentler near the ground.</p>{error&&<p role="alert">{error}</p>}<div ref={host} className={showLocations?'':'pacing-hide-locations'} style={{position:'relative',height:600,width:'100%',border:'1px solid #728d7a',marginTop:12}}/></section>;
}

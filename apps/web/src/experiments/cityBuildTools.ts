import * as T from 'three';
import {CITY_BUILD_ITEMS,validateCityBuild,type CityBuildKind,type CityBuildPlacement} from '../../../../packages/game-core/src/cityBuildPlacement';
import type {createCityTactics} from '../../../../packages/game-core/src/cityTactics';
import type {TrialUnit} from '../../../../packages/game-core/src/cityUnitTrial';
import './cityBuildTools.css';
function model(kind:CityBuildKind){
 const group=new T.Group();
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:number)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:1}));mesh.position.set(x,y,z);group.add(mesh);return mesh;};
 const instances=(positions:number[][],size:number[],color:number)=>{const mesh=new T.InstancedMesh(new T.BoxGeometry(...size as [number,number,number]),new T.MeshStandardMaterial({color}),positions.length),o=new T.Object3D();positions.forEach(([x,y,z],i)=>{o.position.set(x,y,z);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});group.add(mesh);};
 if(kind==='sandbags')instances(Array.from({length:16},(_,i)=>[-1.75+(i%8)*.5,(Math.floor(i/8)+.5)*.3,Math.floor(i/8)*.12]),[.48,.3,.72],0x9b9170);
 if(kind==='warehouse'){box(0,1.25,0,7,2.5,5,0x727966);box(0,2.6,0,7.3,.25,5.3,0x414c49);box(0,1,2.51,2.1,2,.08,0x393e38);}
 if(kind==='trenches'){box(0,.035,0,6,.07,2.5,0x332e23);box(0,.3,-1.05,6,.6,.4,0x77694c);box(0,.3,1.05,6,.6,.4,0x77694c);instances(Array.from({length:10},(_,i)=>[-2.7+i*.6,.09,0]),[.35,.1,1.5],0x706451);}
 if(kind==='artillery'){box(0,.6,0,1.4,.45,1.8,0x59644a);box(0,1.1,-1, .25,.25,2.7,0x3d493d);box(0,.9,-.2,2,.95,.18,0x697354);for(const x of [-1,1]){const wheel=new T.Mesh(new T.CylinderGeometry(.5,.5,.25,12),new T.MeshStandardMaterial({color:0x303631}));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.5,.3);group.add(wheel);}box(-.6,.15,1.3,.16,.2,1.5,0x4f5947);box(.6,.15,1.3,.16,.2,1.5,0x4f5947);}
 if(kind==='wire'){instances([-2,-.67,.67,2].map(x=>[x,.5,0]),[.1,1,.1],0x5e5948);const points:T.Vector3[]=[];for(let i=0;i<160;i++){const x=-2.5+i/159*5,a=i/159*Math.PI*24;points.push(new T.Vector3(x,.45+Math.sin(a)*.4,Math.cos(a)*.55));}group.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x8b9088})));}
 return group;
}
function dispose(group:T.Group){group.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}if(o instanceof T.InstancedMesh)o.dispose();});group.removeFromParent();}
export function cityBuildTools(canvas:HTMLCanvasElement,layer:T.Group,tactics:ReturnType<typeof createCityTactics>,ground:(e:PointerEvent)=>{x:number;z:number}|undefined,units:TrialUnit[],server:{buildSandbags:(p:{x:number;z:number;angle:number})=>Promise<string>;removeSandbags:(id:number)=>Promise<string>}){
 const panel=document.createElement('section');panel.className='city-build';panel.setAttribute('aria-label','Construction');
 const toggle=document.createElement('button');toggle.className='build-toggle';toggle.textContent='＋ Build';toggle.setAttribute('aria-expanded','false');
 const menu=document.createElement('div');menu.className='build-menu';menu.hidden=true;
 const title=document.createElement('strong');title.textContent='FIELD CONSTRUCTION';
 const note=document.createElement('p');note.textContent='Sandbags provide cover and tanks can crush them. Other items are visual prototypes. Free placement in this battle.';
 const grid=document.createElement('div');grid.className='build-grid';
 const controls=document.createElement('div');controls.className='build-actions';
 const rotate=document.createElement('button');rotate.textContent='Rotate ↻ (R)';const cancel=document.createElement('button');cancel.textContent='Cancel';const undo=document.createElement('button');undo.textContent='Undo last';
 const status=document.createElement('p');status.className='build-status';status.setAttribute('role','status');status.textContent='Choose an emplacement.';
 const hint=document.createElement('p');hint.textContent='Click ground to place · R rotates · right-click or Esc cancels';
 controls.append(rotate,cancel,undo);menu.append(title,note,grid,controls,hint);panel.append(toggle,status,menu);canvas.parentElement!.append(panel);
 let kind:CityBuildKind|undefined,angle=0,ghost:T.Group|undefined,position:{x:number;z:number}|undefined,lastPreview=0;
 const placed:{data:CityBuildPlacement;object:T.Group;id?:number}[]=[],buttons=new Map<CityBuildKind,HTMLButtonElement>();
 const updateButtons=()=>{buttons.forEach((b,k)=>b.setAttribute('aria-pressed',String(kind===k)));rotate.disabled=cancel.disabled=!kind;undo.disabled=!placed.length;};
 function clear(){kind=undefined;if(ghost)dispose(ghost);ghost=undefined;position=undefined;updateButtons();}
 function preview(){if(!kind||!ghost||!position)return;const data={...position,kind,angle},reason=validateCityBuild(data,placed.map(p=>p.data),p=>tactics.walkable(p),p=>tactics.surfaceHeight(p),units.filter(u=>u.health>0&&u.visible!==false));ghost.position.set(position.x,tactics.surfaceHeight(position),position.z);ghost.rotation.y=angle;ghost.visible=true;ghost.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){const m=o.material as T.MeshStandardMaterial;m.transparent=true;m.opacity=.55;m.depthWrite=false;m.color.set(reason?0xdf705e:0x93d9b1);}});status.textContent=reason||CITY_BUILD_ITEMS[kind].name+' ready · click ground to place.';return reason;}
 for(const [key,item] of Object.entries(CITY_BUILD_ITEMS)){const k=key as CityBuildKind,b=document.createElement('button');b.textContent=item.name;const small=document.createElement('small');small.textContent=item.description;b.append(small);b.onclick=()=>{clear();kind=k;ghost=model(k);ghost.visible=false;layer.add(ghost);status.textContent='Place '+item.name+' · R rotates · Esc cancels';menu.hidden=true;toggle.setAttribute('aria-expanded','false');updateButtons();};buttons.set(k,b);grid.append(b);}
 toggle.onclick=()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));if(menu.hidden)clear();};
 rotate.onclick=()=>{angle+=Math.PI/4;preview();};cancel.onclick=()=>{clear();status.textContent='Placement cancelled.';};undo.onclick=()=>{const last=placed.at(-1);if(last?.id!==undefined){void server.removeSandbags(last.id).then(message=>{status.textContent=message;});status.textContent="Removing sandbags…";return;}placed.pop();if(last)dispose(last.object);status.textContent='Removed last emplacement. '+placed.length+' placed.';updateButtons();preview();};
 const move=(e:PointerEvent)=>{if(!kind||e.target!==canvas)return;position=ground(e);if(!position){if(ghost)ghost.visible=false;return;}const now=performance.now();if(now-lastPreview<50)return;lastPreview=now;preview();};
 const down=(e:PointerEvent)=>{if(!kind||e.target!==canvas||![0,2].includes(e.button))return;e.preventDefault();e.stopImmediatePropagation();if(e.button===2){clear();status.textContent='Placement cancelled.';return;}position=ground(e);if(!position)return;const reason=preview();if(reason)return;const data={...position,kind,angle};if(kind==="sandbags"){void server.buildSandbags(data).then(message=>{status.textContent=message;});clear();status.textContent="Sending sandbag placement…";return;}const object=model(kind);object.position.set(position.x,tactics.surfaceHeight(position),position.z);object.rotation.y=angle;layer.add(object);placed.push({data,object});clear();status.textContent=CITY_BUILD_ITEMS[data.kind].name+' placed · '+placed.length+' total.';updateButtons();};
 let consumed=false;
 const captureDown=(e:PointerEvent)=>{consumed=!!kind&&e.target===canvas&&[0,2].includes(e.button);down(e);};
 const up=(e:PointerEvent)=>{if(consumed){e.preventDefault();e.stopImmediatePropagation();consumed=false;}};
 const key=(e:KeyboardEvent)=>{if(!kind||e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;if(e.key==='Escape'||e.key.toLowerCase()==='r'){e.preventDefault();e.stopImmediatePropagation();if(e.key==='Escape'){clear();status.textContent='Placement cancelled.';}else{angle+=Math.PI/4;preview();}}};
 window.addEventListener('pointerdown',captureDown,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointermove',move,true);window.addEventListener('keydown',key,true);updateButtons();
 let signature="";
 return {sync(items:{id:number;x:number;z:number;angle:number}[],message:string){
 const next=JSON.stringify(items);if(next===signature){if(status.textContent?.startsWith("Sending")||status.textContent?.startsWith("Removing"))status.textContent=message;return;}signature=next;
 for(let i=placed.length-1;i>=0;i--)if(placed[i].id!==undefined&&!items.some(p=>p.id===placed[i].id)){dispose(placed[i].object);placed.splice(i,1);}
 for(const p of items)if(!placed.some(q=>q.id===p.id)){const object=model("sandbags");object.position.set(p.x,tactics.surfaceHeight(p),p.z);object.rotation.y=p.angle;layer.add(object);placed.push({data:{...p,kind:"sandbags"},object,id:p.id});}
 if(!kind)status.textContent=message;updateButtons();
 },dispose(){clear();placed.forEach(p=>dispose(p.object));panel.remove();window.removeEventListener('pointerdown',captureDown,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointermove',move,true);window.removeEventListener('keydown',key,true);}};
}

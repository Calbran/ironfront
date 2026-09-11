import * as T from 'three';
import {citySightBoundary,citySightRange,CITY_CONTACT_SECONDS} from '../../../../packages/game-core/src/cityAwareness';
import type {TrialUnit} from '../../../../packages/game-core/src/cityUnitTrial';
import type {createCityTactics} from '../../../../packages/game-core/src/cityTactics';
export function cityAwarenessOverlay(canvas:HTMLCanvasElement,layer:T.Group,tactics:ReturnType<typeof createCityTactics>){
 const overlay=document.createElement('div');overlay.setAttribute('aria-label','Last-known enemy contacts');
 Object.assign(overlay.style,{position:'absolute',inset:'0',pointerEvents:'none',overflow:'hidden'});canvas.parentElement!.append(overlay);
 const contacts=new Map<number,HTMLDivElement>(),outlines=new Map<number,T.LineLoop>();
 const material=new T.LineBasicMaterial({color:0x96c9bb,transparent:true,opacity:.22,depthWrite:false});
 let nextOutline=0;
 return {
 update(now:number,units:TrialUnit[],selected:number[],remembered:{id:number;x:number;z:number;age:number}[],project:(u:{x:number;z:number},height:number)=>{x:number;y:number},camera:T.Camera,root:T.Group){
  const active=new Set(remembered.map(c=>c.id));for(const [id,el] of contacts)if(!active.has(id)){el.remove();contacts.delete(id);}
  const rect=canvas.getBoundingClientRect();
  for(const contact of remembered){
   let el=contacts.get(contact.id);if(!el){el=document.createElement('div');el.textContent='?';el.setAttribute('role','img');Object.assign(el.style,{position:'absolute',width:'24px',height:'24px',border:'1px dashed #d7b888',borderRadius:'50%',color:'#efd4ac',background:'#25292388',textAlign:'center',lineHeight:'22px',transform:'translate(-50%,-50%)',fontWeight:'bold'});overlay.append(el);contacts.set(contact.id,el);}
   const world=root.localToWorld(new T.Vector3(contact.x,tactics.surfaceHeight(contact)+.2,contact.z)),ndc=world.clone().project(camera);
   const p=project(contact,.2),age=Math.floor(contact.age);el.hidden=ndc.z< -1||ndc.z>1;
   el.setAttribute('aria-label','Last known enemy '+contact.id+', '+age+' seconds ago; location uncertain');
   Object.assign(el.style,{left:(p.x-rect.left)+'px',top:(p.y-rect.top)+'px',opacity:String(Math.max(0,1-contact.age/CITY_CONTACT_SECONDS))});
  }
  for(const [id,line] of outlines)line.visible=selected.includes(id)&&units.some(u=>u.id===id&&u.friendly&&u.health>0);
  if(now<nextOutline)return;nextOutline=now+.25;
  for(const unit of units.filter(u=>u.friendly&&u.health>0&&selected.includes(u.id))){
   let line=outlines.get(unit.id);if(!line){line=new T.LineLoop(new T.BufferGeometry(),material);layer.add(line);outlines.set(unit.id,line);}
   line.visible=true;const points=citySightBoundary(unit,citySightRange(unit.kind),tactics.obstacles);
   line.geometry.setFromPoints(points.map(p=>new T.Vector3(p.x,tactics.surfaceHeight(p)+.06,p.z)));
  }
 },dispose(){overlay.remove();for(const line of outlines.values()){layer.remove(line);line.geometry.dispose();}material.dispose();}
 };
}

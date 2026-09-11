import type {CityPoint} from './organicCity';
import type {CityObstacle} from './cityTactics';
export const CITY_CONTACT_SECONDS=30;
export const citySightRange=(kind:string)=>kind==='vehicle'?45:40;
export type CityContact={id:number;x:number;z:number;seenAt:number};
/** Frozen observations, never references to live enemy state. */
export function createContactMemory(){
 const memory=new Map<number,CityContact>();
 return {update(time:number,observed:{id:number;x:number;z:number;health:number}[],canSee:(p:CityContact)=>boolean){
   const visible=new Set(observed.map(u=>u.id));
   for(const u of observed){if(u.health>0)memory.set(u.id,{id:u.id,x:u.x,z:u.z,seenAt:time});else memory.delete(u.id);}
   for(const [id,c] of memory)if(!visible.has(id)&&(time-c.seenAt>=CITY_CONTACT_SECONDS||canSee(c)))memory.delete(id);
   return [...memory.values()].filter(c=>!visible.has(c.id)).map(c=>({...c,age:Math.max(0,time-c.seenAt)}));
 }};
}
/** Presentation outline: sample rays against nearby building rectangles, never low cover. */
export function citySightBoundary(origin:CityPoint,range:number,obstacles:CityObstacle[],segments=64):CityPoint[]{
 const buildings=obstacles.filter(o=>o.kind==='building'&&Math.hypot(o.x-origin.x,o.z-origin.z)<=range+Math.hypot(o.width,o.depth)/2);
 return Array.from({length:segments},(_,i)=>{
  const a=i/segments*Math.PI*2,dx=Math.cos(a),dz=Math.sin(a);let reach=range;
  for(const o of buildings){
   const c=Math.cos(o.angle),s=Math.sin(o.angle),x=(origin.x-o.x)*c-(origin.z-o.z)*s,z=(origin.x-o.x)*s+(origin.z-o.z)*c;
   const vx=dx*c-dz*s,vz=dx*s+dz*c;let near=0,far=range;
   for(const [p,v,half] of [[x,vx,o.width/2],[z,vz,o.depth/2]]){
    if(Math.abs(v)<1e-9){if(Math.abs(p)>half){far=-1;break;}continue;}
    const t1=(-half-p)/v,t2=(half-p)/v;near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2));
   }
   if(near<=far&&far>=0)reach=Math.min(reach,near);
  }
  return {x:origin.x+dx*reach,z:origin.z+dz*reach};
 });
}

import type {World} from './index';
import {onLocalLand} from './localMovement';
import type {generatePacingCountryside,RuralField} from './pacingCountryside';
type P={x:number;y:number};
type City=P&{id:string;name:string;radius:number};
export const CORRIDOR_WIDTH=5;
export function hitsRect(a:P,b:P,c:P,w:number,d:number){
 let lo=0,hi=1;
 for(const [start,delta,min,max] of [[a.x,b.x-a.x,c.x-w/2,c.x+w/2],[a.y,b.y-a.y,c.y-d/2,c.y+d/2]]){
  if(Math.abs(delta)<1e-12){if(start<min||start>max)return false;continue;}
  const t0=(min-start)/delta,t1=(max-start)/delta;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(lo>hi)return false;
 }return true;
}
export function buildPacingCorridor(world:World,cities:City[],rural:ReturnType<typeof generatePacingCountryside>,scale:number){
 const land=(p:P)=>world.regions.some(r=>r.terrain!=='mountains'&&onLocalLand(r,p,'ground'));
 const cross=(a:P,b:P,c:P)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const intersects=(a:P,b:P,c:P,d:P)=>Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))&&Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y))<=Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y))&&cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0;
 const rivers=(world.geography?.rivers??[]).flatMap(r=>r.slice(1).map((b,i)=>[{x:r[i][0],y:r[i][1]},{x:b[0],y:b[1]}] as const));
 const pairs=rural.farms.flatMap(f=>cities.map(c=>({f,c,d:Math.hypot(f.x-c.x,f.y-c.y)}))).sort((a,b)=>a.d-b.d).slice(0,40);
 for(const {f,c} of pairs){
  const farm=rural.pois.find(p=>p.kind==='farmstead'&&Math.hypot(p.x-f.x,p.y-f.y)<.01);if(!farm)continue;
  const outposts=rural.pois.filter(p=>['ribbon-hamlet','crossroads-market','road-redoubt','miners-terrace'].includes(p.kind)).sort((a,b)=>Math.hypot(a.x-f.x,a.y-f.y)-Math.hypot(b.x-f.x,b.y-f.y)).slice(0,4);
  for(const outpost of outposts){
   const ignored=new Set([farm.id,outpost.id,c.id]);
   const blockers=[...cities.map(p=>({...p,extent:p.radius})),...rural.pois].filter(p=>!ignored.has(p.id));
   function valid(a:P,b:P){
    if(blockers.some(p=>hitsRect(a,b,p,(p.extent*2+12)/scale,(p.extent*2+12)/scale)))return false;
    if(rivers.some(([u,v])=>intersects(a,b,u,v)))return false;
    const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2)),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
    for(let i=0;i<=n;i++)for(const side of [-1,0,1])if(!land({x:a.x+dx*i/n-side*dy/len*CORRIDOR_WIDTH/2/scale,y:a.y+dy*i/n+side*dx/len*CORRIDOR_WIDTH/2/scale}))return false;
    return true;
   }
   function connect(a:P,b:P,verticalFirst=false){
    const candidates=[[a,{x:b.x,y:a.y},b],[a,{x:a.x,y:b.y},b],[a,{x:(a.x+b.x)/2,y:a.y},{x:(a.x+b.x)/2,y:b.y},b]];
    if(verticalFirst)[candidates[0],candidates[1]]=[candidates[1],candidates[0]];
    return candidates.find(path=>path.slice(1).every((p,i)=>valid(path[i],p)));
   }
   const cityExit={x:c.x+Math.sign(f.x-c.x||1)*c.radius/scale,y:c.y};
   const west={x:farm.x-farm.extent/scale,y:farm.y},east={x:farm.x+farm.extent/scale,y:farm.y};
   const entry={x:outpost.x-Math.sign(outpost.x-f.x||1)*outpost.extent/scale,y:outpost.y};
   const first=connect(cityExit,west),second=connect(east,entry,true);if(!first||!second)continue;
   // The representative city has a central landmark: join its open perimeter
   // street, not the landmark's center. Detailed-city sockets remain future work.
   const cityMouth={x:c.x+Math.sign(f.x-c.x||1)*Math.max(0,c.radius-4)/scale,y:c.y};
   const path=[cityMouth,...first,west,east,...second,entry,{x:outpost.x,y:outpost.y}].filter((p,i,all)=>!i||Math.hypot(p.x-all[i-1].x,p.y-all[i-1].y)>1e-9);
   if(!path.slice(1).every((p,i)=>valid(path[i],p)))continue;
   const modelLength=path.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-path[i].x,p.y-path[i].y)*scale,0);
   return {id:'review-corridor',name:`${c.name} → ${f.name} → ${outpost.name}`,cityId:c.id,farmId:f.id,farmsteadId:farm.id,outpostId:outpost.id,path,modelLength,width:CORRIDOR_WIDTH};
  }
 }return null;
}
export type PacingCorridor=ReturnType<typeof buildPacingCorridor>;
export function corridorClearsField(field:RuralField,corridor:PacingCorridor,scale:number){
 return !corridor||!corridor.path.slice(1).some((p,i)=>hitsRect(corridor.path[i],p,field,(field.width+18)/scale,(field.depth+18)/scale));
}

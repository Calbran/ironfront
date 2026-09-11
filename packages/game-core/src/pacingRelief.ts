import type {World} from './index';
import {onLocalLand} from './localMovement';
import type {RuralReserve} from './pacingCountryside';
export type ReliefSite={id:string;name:string;x:number;y:number;radius:number;height:number;mountain:boolean;seed:number};
/** Geographic centers/radii in logical coordinates; heights in model units. */
export function planPacingRelief(world:World,scale:number,reserves:readonly RuralReserve[]=[]){
 const result:ReliefSite[]=[];
 for(const r of world.regions){
  if(r.terrain!=='mountains'&&r.terrain!=='highlands')continue;
  let radius=Math.sqrt(r.area)*.3;
  for(const p of reserves)radius=Math.min(radius,Math.hypot(p.x-r.x,p.y-r.y)-p.radius-20/scale);
  for(const river of world.geography?.rivers??[])for(let i=1;i<river.length;i++){
   const a=river[i-1],b=river[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((r.x-a[0])*dx+(r.y-a[1])*dy)/(dx*dx+dy*dy||1)));
   radius=Math.min(radius,Math.hypot(r.x-a[0]-t*dx,r.y-a[1]-t*dy)-12/scale);
  }
  while(radius*scale>200){let valid=true;for(let i=0;i<32;i++){const a=i*Math.PI/16;if(!onLocalLand(r,{x:r.x+Math.cos(a)*radius,y:r.y+Math.sin(a)*radius},'air')){valid=false;break;}}if(valid&&onLocalLand(r,{x:r.x,y:r.y},'air'))break;radius*=.75;}
  if(radius*scale<=200)continue;
  result.push({id:`relief-${r.id}`,name:`${r.name} ${r.terrain==='mountains'?'range & pass':'hills'}`,x:r.x,y:r.y,radius,height:radius*scale*(r.terrain==='mountains'?.55:.14),mountain:r.terrain==='mountains',seed:r.id*19+world.seed.length});
 }return result;
}
export function reliefHeight(site:ReliefSite,x:number,y:number){
 const u=(x-site.x)/site.radius,v=(y-site.y)/site.radius,d=Math.hypot(u,v);if(d>=1)return 0;
 const envelope=(1-d*d)**2;
 const ridges=.52+.28*Math.abs(Math.sin(u*8+v*3+site.seed))+.2*Math.abs(Math.sin(v*11-u*4));
 // A continuous open east/west valley through every mountain study.
 const pass=site.mountain?Math.min(1,Math.max(0,(Math.abs(v)-.04)/.12))**1.4:1;
 return site.height*envelope*ridges*pass;
}

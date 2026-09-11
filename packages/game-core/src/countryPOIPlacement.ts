import type {World} from './index';
import type {CityRoad} from './cityRoads';
import {onLocalLand} from './localMovement';
import {generateCountryPOI,POI_CATALOG,type POIKind} from './countryPOI';
export type CountryPOISite={id:string;kind:POIKind;seed:number;x:number;y:number;angle:number;radius:number;region:number};
/** Conservative preview placement: no minimum site quota and no campaign mutation. */
export function placeCountryPOIs(world:World,roads:CityRoad[],limit=48):CountryPOISite[]{
 let salt=2166136261;for(const c of world.seed)salt=Math.imul(salt^c.charCodeAt(0),16777619)>>>0;
 const bounds=world.regions.map(r=>{const points=(r.contours??[r.polygon]).flat();return {r,minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))};});
 const land=(x:number,y:number)=>bounds.find(b=>x>=b.minX&&x<=b.maxX&&y>=b.minY&&y<=b.maxY&&onLocalLand(b.r,{x,y}))?.r;
 const candidates=roads.flatMap((road,i)=>road.points.slice(1).filter((_,j)=>j%2===0).map((b,j)=>({a:road.points[j*2],b,serial:i*1000+j})));
 const sites:CountryPOISite[]=[],settlements=world.regions.flatMap(r=>r.features?.filter(f=>f.kind==='settlement')??[]);
 for(let i=0;i<candidates.length&&sites.length<limit;i++){
  const {a,b,serial}=candidates[i];
  const x=(a.x+b.x)/2,y=(a.y+b.y)/2,seed=(salt+Math.imul(serial+1,2654435761))>>>0,kind=POI_CATALOG[seed%POI_CATALOG.length][0],plan=generateCountryPOI(kind,seed),radius=plan.extent*12*Math.SQRT2;
  const nearRiver=(world.geography?.rivers??[]).some(river=>river.slice(1).some((b,j)=>{const a=river[j],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)<radius+80;}));
  if(nearRiver)continue;
  if(settlements.some(c=>Math.hypot(c.x-x,c.y-y)<radius+380)||sites.some(p=>Math.hypot(p.x-x,p.y-y)<p.radius+radius+120))continue;
  const region=land(x,y);if(!region)continue;
  const angle=-Math.atan2(b.y-a.y,b.x-a.x),c=Math.cos(angle),s=Math.sin(angle);let valid=true;
  for(let u=-plan.extent;u<=plan.extent;u+=plan.extent/4)for(let v=-plan.extent;v<=plan.extent;v+=plan.extent/4)if(!land(x+(u*c+v*s)*12,y+(-u*s+v*c)*12))valid=false;
  if(valid)sites.push({id:'country:'+i,kind,seed,x,y,angle,radius,region:region.id});
 }
 return sites;
}

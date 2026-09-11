import {createWorld,type World} from './index';
import {onLocalLand,localSpeed} from './localMovement';
import {crossRegionPath,type RoutePoint} from './crossRegionPath';
import type {Squad} from './tactics';

export const PACING_TARGETS={firstExpansion:[1,2],nearbyObjectives:[2,4],contested:[6,12],crossMap:24} as const;
export type BaseSite={id:string;player:number;region:number;x:number;y:number;setting:string};
export function infantryTravelHours(world:World,start:BaseSite,path:RoutePoint[]) {
  let at={x:start.x,y:start.y},region=start.region,hours=0;
  for(const p of path){
    const speed=localSpeed(world,{region,kind:'infantry',suppression:0} as Squad);
    hours+=Math.hypot(p.x-at.x,p.y-at.y)/speed;
    region=p.region??region;at=p;
  }
  return hours;
}

/** Read-only study: legacy allocation proposes zones; it grants no new ownership. */
export function createPacingStudy(seed:string){
  const world=createWorld('pacing-study',seed,4,3600000,0);
  const sites:BaseSite[]=[];
  const zones=world.nations.map(n=>({player:n.id,region:n.capital}));
  for(const zone of zones){
    const r=world.regions[zone.region],offset=Math.sqrt(r.area)*.16;
    const candidates=[{x:r.x,y:r.y},...([[-1,0],[1,0],[0,-1],[0,1]] as const).map(([x,y])=>({x:r.x+x*offset,y:r.y+y*offset}))];
    candidates.forEach((p,i)=>{
      if(onLocalLand(r,p,'ground'))sites.push({...p,id:`${zone.player}-${i}`,player:zone.player,region:r.id,
        setting:r.landUse==='agricultural'?'farmland':r.landUse==='settled'?'settled district':r.terrain});
    });
  }
  return {world,zones,sites};
}
export function auditBaseSite(world:World,site:BaseSite){
  const objectives=world.regions.flatMap(r=>(r.features??[]).filter(f=>f.kind==='settlement').map(f=>({...f,region:r.id})))
    .filter(f=>Math.hypot(f.x-site.x,f.y-site.y)>1)
    .sort((a,b)=>Math.hypot(a.x-site.x,a.y-site.y)-Math.hypot(b.x-site.x,b.y-site.y)).slice(0,6);
  const routes=objectives.map(p=>{
    try{
      const path=crossRegionPath(world,site,site.region,p);
      return {name:p.name,x:p.x,y:p.y,region:p.region,path,hours:infantryTravelHours(world,site,path)};
    }catch{return {name:p.name,x:p.x,y:p.y,region:p.region,path:[] as RoutePoint[],hours:null};}
  });
  const reachable=routes.filter(r=>r.hours!==null);
  const first=reachable.length?Math.min(...reachable.map(r=>r.hours!)):null;
  return {routes,first,passesNearby:reachable.filter(r=>r.hours!>=2&&r.hours!<=4).length>=3,
    passesFirst:first!==null&&first>=1&&first<=2};
}

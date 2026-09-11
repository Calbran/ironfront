import {SETTLEMENT_RADII} from './campaignScale';
import {createPacingStudy,infantryTravelHours,type BaseSite} from './campaignPacingStudy';
import {crossRegionPath} from './crossRegionPath';
import {localSpeed,onLocalLand} from './localMovement';
import type {Squad} from './tactics';
import type {ResourceKind} from './resourceSites';
export const STUDY_TRAVEL_MULTIPLIER=6;
type Study=ReturnType<typeof createPacingStudy>;
export type TimedObjective={id:string;name:string;x:number;y:number;region:number;player:number;size:keyof typeof SETTLEMENT_RADII;role:string;resourceKind:ResourceKind;band:readonly[number,number]};
export function objectiveRoutes(world:Study['world'],site:BaseSite,objectives:TimedObjective[]){
  return objectives.map(o=>{
    try{const path=crossRegionPath(world,site,site.region,o);return {...o,path,hours:infantryTravelHours(world,site,path)/STUDY_TRAVEL_MULTIPLIER};}
    catch{return {...o,path:[],hours:null};}
  });
}
/** Experimental placement only: never changes live features, ownership or speed. */
export function placeTimedSettlements(study:Study){
  const {world,sites}=study,objectives:TimedObjective[]=[],failures:string[]=[];
  const occupied=world.regions.flatMap(r=>(r.features??[]).filter(f=>f.kind==='settlement').map(f=>({x:f.x,y:f.y,radius:SETTLEMENT_RADII[f.size??'hamlet']})));
  const land=(x:number,y:number)=>world.regions.find(r=>onLocalLand(r,{x,y},'ground'));
  // Regional cities are map-wide opportunities, not a per-player entitlement.
  const cityRegions=world.regions.filter(r=>r.terrain!=='mountains');
  for(const zone of [...study.zones,...Array.from({length:5},(_,i)=>({player:-i-1,region:0}))]){
    const shared=zone.player<0;
    const base=sites.find(s=>s.player===(shared?(-zone.player-1)%study.zones.length:zone.player));
    const center=shared?cityRegions[Math.floor(((-zone.player-.5)/5)*cityRegions.length)]:base;
    if(!base){failures.push(`Player ${zone.player+1}: no base candidate`);continue;}
    const speed=localSpeed(world,{region:base.region,kind:'infantry',suppression:0} as Squad)*STUDY_TRAVEL_MULTIPLIER;
    const slots=[{role:'Expansion hamlet',resourceKind:'settlement',size:'hamlet',band:[1,2]},
      {role:'Agricultural site',resourceKind:'agriculture',size:'village',band:[2,4]},
      {role:'Fuel deposit',resourceKind:'fuel',size:'hamlet',band:[2,4]},
      {role:'Industrial site',resourceKind:'industry',size:'town',band:[2,4]},
      {role:'Regional city',resourceKind:'city',size:'city',band:[6,12]}] as const;
    (shared?slots.filter(s=>s.resourceKind==='city'):slots.filter(s=>s.resourceKind!=='city')).forEach((slot,index)=>{
      const radius=SETTLEMENT_RADII[slot.size];
      for(let attempt=0;attempt<(shared?128:40);attempt++){
        const angle=(attempt%(shared?32:16))*Math.PI/(shared?16:8)+zone.player*.71+index*1.3;
        const distance=speed*(slot.band[0]+(slot.band[1]-slot.band[0])*(shared?.2+Math.floor(attempt/32)*.2:.4+Math.floor(attempt/16)*.15));
        const x=center!.x+Math.cos(angle)*distance,y=center!.y+Math.sin(angle)*distance,r=land(x,y);
        if(!r||occupied.some(o=>Math.hypot(o.x-x,o.y-y)<o.radius+radius+80)||sites.some(s=>Math.hypot(s.x-x,s.y-y)<radius+80))continue;
        // Sample the footprint, not only its center, without scaling the city art.
        if(Array.from({length:16},(_,i)=>i*Math.PI/8).some(a=>!land(x+Math.cos(a)*radius,y+Math.sin(a)*radius)))continue;
        const proposed:TimedObjective={id:`timed-${zone.player}-${index}`,name:shared?`Shared regional city ${-zone.player}`:`P${zone.player+1} ${slot.role}`,player:zone.player,x,y,region:r.id,size:slot.size,role:slot.role,resourceKind:slot.resourceKind,band:slot.band};
        const route=objectiveRoutes(world,base,[proposed])[0];
        if(route.hours===null||(!shared&&(route.hours<slot.band[0]||route.hours>slot.band[1])))continue;
        objectives.push(proposed);occupied.push({x,y,radius});return;
      }
      failures.push(shared?`Shared city ${-zone.player}: no suitable connected footprint found`:`Player ${zone.player+1}: could not fit ${slot.role} within ${slot.band.join('–')}h`);
    });
  }
  const audits=sites.map(site=>{
    const routes=objectiveRoutes(world,site,objectives.filter(o=>o.player===site.player));
    const first=routes.find(r=>r.role==='Expansion hamlet');
    return {site:site.id,passes:first?.hours!==null&&first?.hours!==undefined&&first.hours>=1&&first.hours<=2&&routes.filter(r=>r.band[0]===2&&r.hours!==null&&r.hours>=2&&r.hours<=4).length===3,
      routes:routes.map(r=>({id:r.id,hours:r.hours}))};
  });
  return {objectives,failures,audits};
}

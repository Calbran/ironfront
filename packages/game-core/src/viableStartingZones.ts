import {createPacingStudy,type BaseSite} from './campaignPacingStudy';
import {placeTimedSettlements,objectiveRoutes} from './timedSettlementStudy';
import {onLocalLand} from './localMovement';
import {SETTLEMENT_RADII} from './campaignScale';

/** Bounded deterministic fallback search; no ownership/save mutation. */
export function repairStartingZones(input:ReturnType<typeof createPacingStudy>){
 let study={...input,zones:input.zones.map(z=>({...z})),sites:input.sites.map(s=>({...s}))};
 let placement=placeTimedSettlements(study);
 const changes:string[]=[];
 const passes=(player:number,p=placement,s=study)=>p.audits.filter(a=>a.passes&&s.sites.some(site=>site.id===a.site&&site.player===player)).length;
 const occupied=input.world.regions.flatMap(r=>(r.features??[]).filter(f=>f.kind==='settlement').map(f=>({...f,radius:SETTLEMENT_RADII[f.size??'hamlet']})));
 const legal=(site:BaseSite)=>!occupied.some(o=>Math.hypot(o.x-site.x,o.y-site.y)<o.radius+80)&&Array.from({length:9},(_,k)=>k===8?site:{x:site.x+Math.cos(k*Math.PI/4)*60,y:site.y+Math.sin(k*Math.PI/4)*60}).every(p=>onLocalLand(input.world.regions[site.region],p));
 study={...study,sites:study.sites.filter(legal)};
 const illegalCount=input.sites.length-study.sites.length;
 placement=placeTimedSettlements(study);
 for(const zone of study.zones){
   if(passes(zone.player)>0)continue;
   const original=input.world.regions[zone.region];
   const alternatives=input.world.regions.filter(r=>r.terrain!=='mountains'&&!study.zones.some(z=>z.player!==zone.player&&z.region===r.id))
     .sort((a,b)=>Math.hypot(a.x-original.x,a.y-original.y)-Math.hypot(b.x-original.x,b.y-original.y)||a.id-b.id).slice(0,20);
   for(const region of alternatives){
     const otherSites=study.sites.filter(s=>s.player!==zone.player);
     const candidates:BaseSite[]=[];
     for(const [i,[dx,dy]] of [[0,0],[-90,0],[90,0],[0,-90],[0,90]].entries()){
       const x=region.x+dx,y=region.y+dy;
       if(otherSites.some(s=>Math.hypot(s.x-x,s.y-y)<1800)||occupied.some(o=>Math.hypot(o.x-x,o.y-y)<o.radius+80))continue;
       if(!Array.from({length:9},(_,k)=>k===8?{x,y}:{x:x+Math.cos(k*Math.PI/4)*60,y:y+Math.sin(k*Math.PI/4)*60}).every(p=>onLocalLand(region,p)))continue;
       candidates.push({id:`${zone.player}-${i}r${region.id}`,player:zone.player,region:region.id,x,y,setting:region.landUse==='agricultural'?'farmland':region.landUse==='settled'?'settled district':region.terrain});
     }
     if(!candidates.length)continue;
     const next={...study,zones:study.zones.map(z=>z.player===zone.player?{...z,region:region.id}:z),sites:[...otherSites,...candidates]};
     const trial=placeTimedSettlements(next);
     if(passes(zone.player,trial,next)===0)continue;
     if(study.zones.some(z=>z.player!==zone.player&&passes(z.player)>0&&passes(z.player,trial,next)===0))continue;
     study=next;placement=trial;changes.push(`Player ${zone.player+1}: moved candidate zone from ${original.name} to ${region.name}`);break;
   }
 }
 const rejected=study.sites.filter(s=>!placement.audits.some(a=>a.site===s.id&&a.passes));
 // Only validated sampled sites are published for selection, never unchecked zone interiors.
 study={...study,sites:study.sites.filter(s=>!rejected.includes(s))};
 const missing=study.zones.filter(z=>!study.sites.some(s=>s.player===z.player)).map(z=>z.player);
 return {study,placement:{...placement,audits:placement.audits.filter(a=>study.sites.some(s=>s.id===a.site))},changes,rejected:illegalCount+rejected.length,missing,ready:missing.length===0};
}

export function auditStartingSeed(seed:string){
 const result=repairStartingZones(createPacingStudy(seed));
 const players=result.study.zones.map(z=>{
   const sites=result.study.sites.filter(s=>s.player===z.player);
   const measured=sites.map(site=>{
     const routes=objectiveRoutes(result.study.world,site,result.placement.objectives.filter(o=>o.player===site.player||o.player<0));
     const time=(kind:string)=>routes.find(r=>r.player===site.player&&r.resourceKind===kind)?.hours??null;
     const cities=routes.filter(r=>r.player<0&&r.hours!==null).map(r=>r.hours!);
     const exits=routes.filter(r=>r.player===site.player).map(r=>r.path.find(p=>p.region!==undefined&&p.region!==site.region)?.region).filter(r=>r!==undefined);
     return {site:site.id,fuel:time('fuel'),industry:time('industry'),nearestCity:cities.length?Math.min(...cities):null,resourceExitRegions:[...new Set(exits)],sharedExit:exits.length>=2&&new Set(exits).size===1};
   });
   return {player:z.player+1,candidates:sites.length,measured};
 });
 return {seed,ready:result.ready,changes:result.changes,rejected:result.rejected,missing:result.missing,players};
}

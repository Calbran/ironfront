import type {World} from './index';
import {onLocalLand} from './localMovement';
import {POI_CATALOG,type POIKind} from './countryPOI';

export type RuralField={x:number;y:number;width:number;depth:number;crop:number};
export type RuralPOI={id:string;name:string;x:number;y:number;kind:POIKind;seed:number;extent:number};
export type FarmDistrict={id:string;name:string;x:number;y:number;extent:number;fields:RuralField[]};
export type RuralReserve={x:number;y:number;radius:number};
/** Preview scenery only. Positions use logical geography, extents use unscaled model units. */
export function generatePacingCountryside(world:World,modelPerWorld:number,reserves:readonly RuralReserve[]=[]){
 if(!Number.isFinite(modelPerWorld)||modelPerWorld<=0)throw Error('Invalid countryside scale');
 let seed=2166136261;for(const c of world.seed)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const farms:FarmDistrict[]=[],pois:RuralPOI[]=[],occupied=[...reserves];
 const riverSegments=(world.geography?.rivers??[]).flatMap(r=>r.slice(1).map((b,i)=>({a:r[i],b})));
 function clear(r:World['regions'][number],x:number,y:number,w:number,d:number){
  const radius=Math.hypot(w,d)/2/modelPerWorld;
  if(occupied.some(p=>Math.hypot(p.x-x,p.y-y)<p.radius+radius+8/modelPerWorld))return false;
  for(const {a,b} of riverSegments){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));if(Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<radius+12/modelPerWorld)return false;}
  for(let u=-2;u<=2;u++)for(let v=-2;v<=2;v++)if(!onLocalLand(r,{x:x+u*w/4/modelPerWorld,y:y+v*d/4/modelPerWorld},'ground'))return false;
  return true;
 }
 function poi(r:World['regions'][number],x:number,y:number,kind:POIKind){
  const extent=['farmstead','orchard','hop-garden'].includes(kind)?66:44;
  if(!clear(r,x,y,extent*2,extent*2))return;
  const id=`rural-${r.id}-${pois.length}`;
  pois.push({id,name:`${r.name} · ${POI_CATALOG.find(p=>p[0]===kind)![1]}`,x,y,kind,seed:Math.floor(random()*4294967296),extent});
  occupied.push({x,y,radius:extent*Math.SQRT2/modelPerWorld});
 }
 for(const r of world.regions){
  if(r.terrain==='mountains')continue;
  const spread=Math.sqrt(r.area)*.32;
  // Farms are regional expanses of many parcels, never scaled-up farmstead models.
  if(r.terrain==='plains'&&(r.landUse==='agricultural'||random()<.48)){
   const x=r.x+(random()-.5)*spread,y=r.y+(random()-.5)*spread;
   const cell=Math.min(1100,Math.max(180,Math.sqrt(r.area)*modelPerWorld*.035));
   const fields:RuralField[]=[];
   for(let row=0;row<8;row++)for(let col=0;col<10;col++){
    if(random()<.16)continue;
    const dx=(col-4.5)*cell+Math.sign(col-4.5)*90,dy=(row-3.5)*cell+Math.sign(row-3.5)*90;
    const width=cell-8-random()*cell*.12,depth=cell-8-random()*cell*.12;
    const fx=x+dx/modelPerWorld,fy=y+dy/modelPerWorld;
    if(clear(r,fx,fy,width,depth))fields.push({x:fx,y:fy,width,depth,crop:Math.floor(random()*6)});
   }
   if(fields.length>=12&&clear(r,x,y,140,140)){
    farms.push({id:`farmland-${r.id}`,name:`${r.name} farmlands`,x,y,extent:cell*6+180,fields});
    // Reserve fields before placing compact settlements; retain open central lanes.
    fields.forEach(f=>occupied.push({x:f.x,y:f.y,radius:Math.hypot(f.width,f.depth)/2/modelPerWorld}));
    poi(r,x,y,'farmstead');poi(r,x+cell*2/modelPerWorld,y,'orchard');poi(r,x-cell*2/modelPerWorld,y,'farmstead');
   }
  }
  const kinds:POIKind[]=r.terrain==='forest'?['sawmill','ruined-manor','road-redoubt','coach-inn']:r.terrain==='highlands'?['miners-terrace','coal-yard','boiler-yard','road-redoubt']:['ribbon-hamlet','crossroads-market','coach-inn','telegraph-office','fuel-station','chapel-yard','field-hospital','pumping-station'];
  for(let i=0;i<5;i++)poi(r,r.x+(random()-.5)*spread*2,r.y+(random()-.5)*spread*2,kinds[Math.floor(random()*kinds.length)]);
 }
 return {farms,pois};
}

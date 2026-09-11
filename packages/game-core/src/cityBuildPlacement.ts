import type {CityPoint} from './organicCity';
export const CITY_BUILD_ITEMS={
 sandbags:{name:'Sandbags',width:4,depth:1,description:'Low defensive barrier'},
 wire:{name:'Barbed wire',width:5,depth:1.5,description:'Wire obstacle'},
 artillery:{name:'Artillery',width:3,depth:4,description:'Field gun emplacement'},
 warehouse:{name:'Warehouse',width:7,depth:5,description:'Supply storage building'},
 trenches:{name:'Trenches',width:6,depth:2.5,description:'Infantry earthworks'},
} as const;
export type CityBuildKind=keyof typeof CITY_BUILD_ITEMS;
export type CityBuildPlacement=CityPoint&{kind:CityBuildKind;angle:number};
export function buildPoint(p:CityBuildPlacement,x:number,z:number){return {x:p.x+x*Math.cos(p.angle)+z*Math.sin(p.angle),z:p.z-x*Math.sin(p.angle)+z*Math.cos(p.angle)};}
function overlaps(a:CityBuildPlacement,b:CityBuildPlacement){
 const rect=(p:CityBuildPlacement)=>{const d=CITY_BUILD_ITEMS[p.kind];return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>buildPoint(p,x*(d.width/2+.15),z*(d.depth/2+.15)));};
 const ac=rect(a),bc=rect(b);
 for(const angle of [a.angle,b.angle])for(const [x,z] of [[Math.cos(angle),-Math.sin(angle)],[Math.sin(angle),Math.cos(angle)]]){
  const ap=ac.map(p=>p.x*x+p.z*z),bp=bc.map(p=>p.x*x+p.z*z);if(Math.max(...ap)<Math.min(...bp)||Math.max(...bp)<Math.min(...ap))return false;
 }
 return true;
}
export function validateCityBuild(p:CityBuildPlacement,placed:CityBuildPlacement[],walkable:(p:CityPoint)=>boolean,height:(p:CityPoint)=>number,units:CityPoint[]=[]){
 if(!Number.isFinite(p.x+p.z+p.angle))return 'Choose a ground position.';
 if(placed.length>=48)return 'Prototype limit: 48 emplacements.';
 if(placed.some(other=>overlaps(p,other)))return 'Too close to another emplacement.';
 const d=CITY_BUILD_ITEMS[p.kind];let low=Infinity,high=-Infinity;
 for(let x=-d.width/2;x<=d.width/2+.01;x+=.5)for(let z=-d.depth/2;z<=d.depth/2+.01;z+=.5){
  const q=buildPoint(p,x,z);if(!walkable(q))return 'Needs clear, accessible ground.';
  const y=height(q);if(!Number.isFinite(y))return 'Choose stable ground.';low=Math.min(low,y);high=Math.max(high,y);
 }
 if(high-low>.65)return 'Ground is too steep.';
 if(units.some(u=>{const dx=u.x-p.x,dz=u.z-p.z,c=Math.cos(p.angle),s=Math.sin(p.angle);return Math.abs(dx*c-dz*s)<d.width/2+.7&&Math.abs(dx*s+dz*c)<d.depth/2+.7;}))return 'Move units out of the footprint first.';
 return '';
}

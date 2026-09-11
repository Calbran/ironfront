import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCityUnitTrial} from '../packages/game-core/src/cityUnitTrial';
import {obstacleDistance,type CityObstacle,type createCityTactics} from '../packages/game-core/src/cityTactics';
const walls:CityObstacle[]=[{id:'south',x:0,z:0,width:10,depth:.5,angle:0,kind:'wall'},{id:'east',x:5,z:3,width:.5,depth:6,angle:0,kind:'wall'}];
function fixture(obstacles=walls){
 const tactics={obstacles,walkable:(p:{x:number;z:number})=>obstacles.every(o=>obstacleDistance(p,o)>.25),coverAt:(p:{x:number;z:number})=>{const o=obstacles.find(o=>obstacleDistance(p,o)<=1.1);return {level:o?'partial':'none',damageScale:o?.5:1,normal:o?.id==='south'?{x:0,z:1}:{x:-1,z:0}};}} as unknown as ReturnType<typeof createCityTactics>;
 const trial=createCityUnitTrial(tactics);trial.units.splice(3);for(let i=4;i<=6;i++)trial.units.push({...structuredClone(trial.units[0]),id:i});trial.selectMany([1,2,3,4,5,6]);return trial;
}
test('click and drag previews fit all six infantry behind an L-shaped wall',()=>{
 for(const facing of [undefined,Math.PI]){
  const t=fixture(),slots=t.previewOrder({x:4,z:1},facing);assert.equal(slots.length,6);
  for(const slot of slots){assert(slot.valid);assert(slot.x<4.5&&slot.z>.5);assert.equal(slot.cover,'partial');for(const other of slots)if(other.id!==slot.id)assert(Math.hypot(slot.x-other.x,slot.z-other.z)>=.9);}
 }
});
test('open-ground orders retain their straightforward formation',()=>{
 const slots=fixture().previewOrder({x:0,z:15});assert(slots.every(p=>p.valid&&p.z===15));
});

import {createCityBattle} from '../packages/game-core/src/cityBattle';
test('nearby cover reactions are bounded and Hold position prevents relocation',()=>{
 const obstacle=walls[0];
 const terrain={segmentClear:()=>true,obstacles:[obstacle],walkable:(p:{x:number;z:number})=>obstacleDistance(p,obstacle)>.25,coverAt:(p:{x:number;z:number})=>({level:obstacleDistance(p,obstacle)<=1.1?'partial':'none',damageScale:obstacleDistance(p,obstacle)<=1.1?.5:1,normal:{x:0,z:1}}),route:(a:{x:number;z:number},b:{x:number;z:number})=>[{x:a.x,z:a.z},{x:b.x,z:b.z}]} as unknown as ReturnType<typeof createCityTactics>;
 const run=(hold:boolean)=>{const b=createCityBattle(terrain);b.trial.units.splice(0,b.trial.units.length,...b.trial.units.filter(u=>u.id===1||u.id===101));const u=b.trial.units[0],enemy=b.trial.units[1];u.x=0;u.z=2;enemy.x=0;enemy.z=-10;if(hold)b.command([1],'hold');b.command([],'run');for(let i=0;i<60;i++)b.tick(.05);return u;};
 const reacting=run(false),held=run(true);assert(reacting.z<2);assert(Math.hypot(reacting.x,reacting.z-2)<=4);assert.equal(held.x,0);assert.equal(held.z,2);
});

 test('cover orders activate with breathing room, without extending physical cover',()=>{
 const trial=fixture([walls[0]]);
 const slots=trial.previewOrder({x:0,z:3});
 assert(slots.every(p=>p.valid&&p.z<1.4));
 const outside=trial.previewOrder({x:0,z:4});
 assert(outside.every(p=>p.valid&&p.z===4&&p.cover==='none'));
 });

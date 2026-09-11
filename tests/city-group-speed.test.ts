import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCityUnitTrial} from '../packages/game-core/src/cityUnitTrial';
import type {createCityTactics} from '../packages/game-core/src/cityTactics';
const fixture=()=>createCityUnitTrial({obstacles:[],walkable:()=>true,segmentClear:()=>true,route:(a:{x:number;z:number},b:{x:number;z:number})=>[a,b],coverAt:()=>({level:'none',damageScale:1,normal:{x:0,z:1}})} as unknown as ReturnType<typeof createCityTactics>);
test('mixed move group matches tank acceleration, turning pauses and speed',()=>{
 const t=fixture();t.units.splice(0,t.units.length,...t.units.filter(u=>u.id===1||u.id===4));
 const soldier=t.units.find(u=>u.id===1)!,tank=t.units.find(u=>u.id===4)!;
 Object.assign(soldier,{x:-1.25,z:0});Object.assign(tank,{x:1.25,z:0,angle:0});t.selectMany([1,4]);assert(t.order({x:0,z:20}));
 tank.angle=Math.PI/2;t.tick(.05);assert.equal(tank.speed,0);assert.equal(soldier.speed,0);tank.angle=0;
 for(let i=0;i<80;i++){t.tick(.05);assert(Math.abs(soldier.speed-tank.speed)<1e-8);assert(soldier.speed<=1.05);}
 soldier.firing=true;t.tick(.05);assert(soldier.speed<=1.43*.65);assert(tank.speed<=1.43*.65);
});
test('individual orders detach a soldier from a slower group',()=>{
 const t=fixture();t.selectMany([1,4]);t.order({x:0,z:20});const u=t.units.find(u=>u.id===1)!;assert(u.moveGroup);t.select(1);t.order({x:-10,z:20});assert.equal(u.moveGroup,undefined);
});

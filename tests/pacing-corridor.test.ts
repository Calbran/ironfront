import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildPacingCorridor,corridorClearsField,hitsRect} from '../packages/game-core/src/pacingCorridor';
import type {World} from '../packages/game-core/src';
import type {generatePacingCountryside} from '../packages/game-core/src/pacingCountryside';
import {generatePacingCountryside as generate} from '../packages/game-core/src/pacingCountryside';
import {createPacingStudy} from '../packages/game-core/src/campaignPacingStudy';
import {SETTLEMENT_RADII} from '../packages/game-core/src/campaignScale';
const world={regions:[{id:0,terrain:'plains',polygon:[[-500,-500],[500,-500],[500,500],[-500,500]]}],geography:{rivers:[]}} as unknown as World;
const cities=[{id:'city',name:'City',x:-100,y:0,radius:26}];
const rural:ReturnType<typeof generatePacingCountryside>={farms:[{id:'farm',name:'Farm',x:0,y:0,extent:1000,fields:[]}],pois:[{id:'farmstead',name:'Farmstead',x:0,y:0,kind:'farmstead',seed:1,extent:66},{id:'outpost',name:'Outpost',x:100,y:30,kind:'ribbon-hamlet',seed:2,extent:44}]};
test('review road is deterministic, uses fixed width and joins local entrance sockets',()=>{
 const before=JSON.stringify(rural),c=buildPacingCorridor(world,cities,rural,14.3);assert.ok(c);
 assert.equal(c.width,5);assert.deepEqual(c,buildPacingCorridor(world,cities,rural,14.3));assert.equal(JSON.stringify(rural),before);
 assert.deepEqual(c.path[0],{x:-100+22/14.3,y:0});assert.deepEqual(c.path.at(-1),{x:100,y:30});
 for(const x of [-66/14.3,66/14.3])assert.ok(c.path.some(p=>p.x===x&&p.y===0));
 assert.ok(c.modelLength>200*14.3);
});
test('no forced water crossings, and crop clearance includes road margins',()=>{
 const blocked={...world,geography:{rivers:[[[-50,-500],[-50,500]]]}} as unknown as World;
 assert.equal(buildPacingCorridor(blocked,cities,rural,14.3),null);
 const c=buildPacingCorridor(world,cities,rural,14.3);
 assert.equal(corridorClearsField({x:-50,y:0,width:20,depth:20,crop:0},c,14.3),false);
 assert.equal(corridorClearsField({x:-50,y:80,width:20,depth:20,crop:0},c,14.3),true);
 assert.equal(hitsRect({x:0,y:0},{x:0,y:10},{x:0,y:5},2,2),true);
});
test('Meridian has a city farmland outpost review connection',()=>{
 const {world}=createPacingStudy('Meridian');
 const cities=world.regions.flatMap(r=>(r.features??[]).filter(f=>f.kind==='settlement'&&f.size==='city').map(f=>({id:String(f.id),name:f.name,x:f.x,y:f.y,radius:SETTLEMENT_RADII[f.size!]/12})));
 const result=buildPacingCorridor(world,cities,generate(world,14.3),14.3);assert.ok(result);console.log('Meridian corridor',result.name,(result.modelLength/1.43/3600).toFixed(2)+'h');
});

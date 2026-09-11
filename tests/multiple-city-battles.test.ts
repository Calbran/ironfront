import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCityBattle} from '../packages/game-core/src/cityBattle';
import {createCityTactics} from '../packages/game-core/src/cityTactics';
import {planCombinedDistrict} from '../packages/game-core/src/combinedDistrict';
test('multiple firefights stage separated valid troops and resolve real remote combat',()=>{
 const tactics=createCityTactics(planCombinedDistrict(732,'worldgen',true),732,'worldgen');
 const battle=createCityBattle(tactics,true);
 const extra=battle.trial.units.filter(u=>u.id>=200);
 assert.equal(extra.length,12);
 assert(extra.every(u=>tactics.walkable(u)));
 const west=extra.find(u=>u.id===210)!,east=extra.find(u=>u.id===220)!;
 assert(Math.hypot(west.x-east.x,west.z-east.z)>75);
 assert.equal(battle.state().running,false);
 battle.command([],'run');
 const firing=new Set<number>();
 for(let i=0;i<400;i++){battle.tick(.05);for(const shot of battle.state().shots)if(shot.from>=200)firing.add(Math.floor(shot.from/10));}
 assert(firing.has(21)&&firing.has(22));
 assert(extra.some(u=>u.health<100));
});

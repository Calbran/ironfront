import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCityBattle} from '../packages/game-core/src/cityBattle';
import {createCityTactics} from '../packages/game-core/src/cityTactics';
import {planCombinedDistrict} from '../packages/game-core/src/combinedDistrict';
test('built sandbags block infantry, provide directional cover, permit tanks and disappear when crushed',()=>{
 const t=createCityTactics(planCombinedDistrict(732,'worldgen',true),732,'worldgen'),b=createCityBattle(t);
 for(let z=0;z<14&&!b.playerState().sandbags.length;z+=2)for(let x=-12;x<13&&!b.playerState().sandbags.length;x+=2)if(t.walkable({x,z},'vehicle'))b.buildSandbags(x,z,0);
 const bag=b.playerState().sandbags[0];assert(bag,'found a legal placement');
 assert(!t.walkable(bag,'infantry'));assert(t.walkable(bag,'vehicle'));
 assert.notEqual(t.coverAt({x:bag.x,z:bag.z+.9},{x:bag.x,z:bag.z-10}).level,'none');
 assert(t.obstacles.some(o=>o.id==='built-sandbag:'+bag.id));
 const tank=b.trial.units.find(u=>u.kind==='vehicle')!;Object.assign(tank,{x:bag.x,z:bag.z});
 b.command([],'run');b.tick(.05);
 assert.equal(b.playerState().sandbags.length,0);assert(!t.obstacles.some(o=>o.id==='built-sandbag:'+bag.id));
 assert(t.walkable(bag,'infantry'));
});

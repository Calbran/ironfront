import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCityUnitTrial} from '../packages/game-core/src/cityUnitTrial';
import type {createCityTactics} from '../packages/game-core/src/cityTactics';
test('infantry firing on the move travels less distance without stopping',()=>{
 const ground={segmentClear:()=>true,walkable:()=>true,coverAt:()=>({level:'none',normal:{x:0,z:1},damageScale:1})} as unknown as ReturnType<typeof createCityTactics>;
 const normal=createCityUnitTrial(ground),firing=createCityUnitTrial(ground);
 for(const trial of [normal,firing]){const u=trial.units[0];u.path=[{x:u.x,z:u.z+30}];u.moving=true;}
 firing.units[0].firing=true;
 for(let i=0;i<40;i++){normal.tick(.05);firing.tick(.05);}
 assert(firing.units[0].distance>0);assert(firing.units[0].distance<normal.units[0].distance*.75);
});

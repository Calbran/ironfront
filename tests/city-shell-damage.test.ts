import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCityBattle} from '../packages/game-core/src/cityBattle';
import {cityShellImpact} from '../packages/game-core/src/cityBallistics';
import type {createCityTactics} from '../packages/game-core/src/cityTactics';
test('shell misses land off target deterministically',()=>{
 const p=cityShellImpact(0,0,false,42);assert.deepEqual(p,cityShellImpact(0,0,false,42));
 assert(Math.hypot(p.x,p.z)>=3.5);assert(Math.hypot(p.x,p.z)<=5);
 assert.deepEqual(cityShellImpact(2,3,true,42),{x:2,z:3});
});
test('a landed city tank shell kills full-health exposed infantry after flight',()=>{
 const tactics={obstacles:[],walkable:()=>true,segmentClear:()=>true,coverAt:()=>({level:'none',damageScale:1,normal:{x:0,z:1}})} as unknown as ReturnType<typeof createCityTactics>;
 const b=createCityBattle(tactics);b.trial.units.splice(0,b.trial.units.length,...b.trial.units.filter(u=>u.id===4||u.id===101));
 const tank=b.trial.units.find(u=>u.id===4)!,enemy=b.trial.units.find(u=>u.id===101)!;
 Object.assign(tank,{x:0,z:0,angle:0,turretAngle:0});Object.assign(enemy,{x:0,z:10,stance:'hold'});
 b.command([],'run');let direct=false;
 for(let i=0;i<800&&enemy.health>0;i++){
  b.tick(.05);
  const impact=b.state().shots.find(s=>s.shell&&s.impact&&s.tx===0&&s.tz===10);
  if(impact){direct=true;assert.equal(enemy.health,0);}
 }
 assert(direct,'close stationary target should be hit'); assert.equal(b.state().shots.filter(s=>s.shell&&!s.impact).length,1,'close stationary target dies to the first shell');
});

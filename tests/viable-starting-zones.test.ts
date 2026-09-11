import test from 'node:test';
import assert from 'node:assert/strict';
import {createPacingStudy} from '../packages/game-core/src/campaignPacingStudy';
import {repairStartingZones,auditStartingSeed} from '../packages/game-core/src/viableStartingZones';
test('Meridian relocates its failed zone and publishes only resource-vetted candidates without mutating input',()=>{
 const input=createPacingStudy('Meridian'),before=JSON.stringify(input);
 const result=repairStartingZones(input);
 assert.equal(JSON.stringify(input),before);
 assert.equal(result.ready,true);
 assert.ok(result.changes.some(c=>c.startsWith('Player 2:')));
 assert.equal(new Set(result.study.zones.map(z=>z.region)).size,4);
 assert.ok(result.study.sites.every(s=>result.placement.audits.some(a=>a.site===s.id&&a.passes)));
 assert.deepEqual(repairStartingZones(input),result);
});
test('five-seed access audit retains fuel and industry targets for every published candidate',()=>{
 for(const seed of ['Meridian','Boreal','Ironfront','Survey-1','Survey-2']){
  const a=auditStartingSeed(seed);assert.equal(a.ready,true,seed);
  for(const p of a.players){assert.ok(p.candidates>0);for(const s of p.measured){assert.ok(s.fuel!==null&&s.fuel>=2&&s.fuel<=4);assert.ok(s.industry!==null&&s.industry>=2&&s.industry<=4);}}
 }
});

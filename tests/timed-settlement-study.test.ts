import test from 'node:test';
import assert from 'node:assert/strict';
import {createPacingStudy} from '../packages/game-core/src/campaignPacingStudy';
import {placeTimedSettlements,objectiveRoutes} from '../packages/game-core/src/timedSettlementStudy';
import {SETTLEMENT_RADII} from '../packages/game-core/src/campaignScale';
test('timed placement preserves city scale, audits every candidate and never mutates the world',()=>{
 const study=createPacingStudy('Meridian'),before=JSON.stringify(study.world);
 const result=placeTimedSettlements(study);
 assert.ok(result.objectives.length>0);
 assert.equal(JSON.stringify(study.world),before);
 assert.equal(result.audits.length,study.sites.length);
 assert.equal(result.objectives.length+result.failures.length,21);
 assert.ok(result.objectives.filter(o=>o.player<0).length>=1);
 assert.ok(result.objectives.filter(o=>o.resourceKind==='city').every(o=>o.player<0));
 for(const o of result.objectives){
   const base=study.sites.find(s=>s.player===(o.player<0?(-o.player-1)%study.zones.length:o.player))!;
   const route=objectiveRoutes(study.world,base,[o])[0];
   assert.ok(route.hours!==null);
   if(o.player>=0)assert.ok(route.hours!>=o.band[0]&&route.hours!<=o.band[1]);
   for(const other of result.objectives)if(other.id!==o.id)assert.ok(Math.hypot(o.x-other.x,o.y-other.y)>=SETTLEMENT_RADII[o.size]+SETTLEMENT_RADII[other.size]+80);
 }
 assert.deepEqual(placeTimedSettlements(study),result);
});

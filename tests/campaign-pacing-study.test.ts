import test from 'node:test';
import assert from 'node:assert/strict';
import {infantryTravelHours,createPacingStudy,auditBaseSite} from '../packages/game-core/src/campaignPacingStudy';
import {onLocalLand} from '../packages/game-core/src/localMovement';
import type {World} from '../packages/game-core/src/index';
test('route timing follows distance and each region speed rather than straight-line separation',()=>{
  const world={regions:[{area:1e6},{area:10000}]} as World;
  const site={id:'0',player:0,region:0,x:0,y:0,setting:'plains'};
  assert.equal(infantryTravelHours(world,site,[]),0);
  const hours=infantryTravelHours(world,site,[{x:60,y:0,region:1},{x:60,y:13.2,region:1}]);
  assert.ok(Math.abs(hours-2)<1e-9);
});
test('start candidates belong to their reserved zone and route audits do not establish ownership',()=>{
  const study=createPacingStudy('Meridian');
  assert.equal(study.zones.length,4);
  assert.equal(new Set(study.zones.map(z=>z.region)).size,4);
  assert.ok(study.sites.length>0);
  for(const site of study.sites){
    assert.equal(site.region,study.zones[site.player].region);
    assert.ok(onLocalLand(study.world.regions[site.region],site));
  }
  const before=study.world.regions.map(r=>r.owner);
  const audit=auditBaseSite(study.world,study.sites[0]);
  assert.deepEqual(study.world.regions.map(r=>r.owner),before);
  assert.ok(audit.routes.length<=6);
  assert.ok(audit.routes.every(r=>r.hours===null||Number.isFinite(r.hours)&&r.hours>=0));
});

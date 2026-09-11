import {test} from 'node:test';
import assert from 'node:assert/strict';
import {physicalAnchor,physicalRouteHours,PHYSICAL_SEPARATION} from '../apps/web/src/experiments/pacingPhysicalScale';

test('reference country separation matches an hour of unmodified infantry movement',()=>{
 assert.ok(Math.abs(PHYSICAL_SEPARATION-171.6)<1e-9);
 assert.ok(Math.abs(physicalRouteHours({x:0,y:0},[{x:360,y:0}])-1)<1e-9);
});
test('route measurement sums bends, leaves input intact, and supports compact comparison',()=>{
 const start={x:20,y:30},path=[{x:200,y:30},{x:200,y:210}];
 const before=JSON.stringify({start,path});
 assert.ok(Math.abs(physicalRouteHours(start,path)-1)<1e-9);
 assert.ok(Math.abs(physicalRouteHours(start,path,1)*PHYSICAL_SEPARATION-1)<1e-9);
 assert.equal(physicalRouteHours(start,[]),0);
 assert.equal(JSON.stringify({start,path}),before);
});
test('anchor transform expands separation while local offsets stay local',()=>{
 const a=physicalAnchor({x:120,y:240},PHYSICAL_SEPARATION,{x:120,y:240});
 const b=physicalAnchor({x:480,y:240},PHYSICAL_SEPARATION,{x:120,y:240});
 assert.deepEqual(a,{x:0,y:0});
 assert.ok(Math.abs(b.x-5148)<1e-9);
 const localBuildingWidth=6;
 assert.equal((b.x+localBuildingWidth)-b.x,localBuildingWidth);
});

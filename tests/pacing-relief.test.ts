import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planPacingRelief,reliefHeight,type ReliefSite} from '../packages/game-core/src/pacingRelief';
import {constrainPacingCamera} from '../apps/web/src/experiments/pacingCameraLimits';
import {createPacingStudy} from '../packages/game-core/src/campaignPacingStudy';
test('mountain profiles are bounded, taper to ground and retain a continuous pass',()=>{
 const s:ReliefSite={id:'x',name:'range',x:0,y:0,radius:100,height:900,mountain:true,seed:17};
 for(let x=-100;x<=100;x+=2){assert.equal(reliefHeight(s,x,0),0);for(let y=-100;y<=100;y+=2){const h=reliefHeight(s,x,y);assert.ok(Number.isFinite(h)&&h>=0&&h<=s.height);}}
 assert.equal(reliefHeight(s,100,10),0);assert.ok(reliefHeight(s,0,40)>100);
});
test('relief planning is repeatable, respects reservations, and leaves world untouched',()=>{
 const {world}=createPacingStudy('Meridian'),before=JSON.stringify(world),sites=planPacingRelief(world,14.3);
 assert.ok(sites.some(s=>s.mountain));assert.ok(sites.some(s=>!s.mountain));assert.deepEqual(sites,planPacingRelief(world,14.3));assert.equal(JSON.stringify(world),before);
 const first=sites[0];assert.ok(!planPacingRelief(world,14.3,[{x:first.x,y:first.y,radius:first.radius+10}]).some(s=>s.id===first.id));
});
test('camera clearance follows elevated terrain, not only the sea-level plane',()=>{
 const camera={x:0,y:2,z:0},target={x:1,y:0,z:1};constrainPacingCamera(camera,target,()=>100);assert.equal(target.y,100);assert.equal(camera.y,104);
});

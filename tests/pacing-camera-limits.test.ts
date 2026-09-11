import {test} from 'node:test';
import assert from 'node:assert/strict';
import {constrainPacingCamera,PACING_MIN_CAMERA_HEIGHT} from '../apps/web/src/experiments/pacingCameraLimits';
test('cursor zoom cannot carry the camera or pivot below the floor',()=>{
 const camera={x:12,y:-20,z:18},target={x:8,y:-30,z:0};constrainPacingCamera(camera,target);
 assert.equal(target.y,0);assert.equal(camera.y,10);assert.equal(camera.x,12);assert.equal(target.x,8);
 for(let i=0;i<100;i++){camera.y-=2;target.y-=.5;constrainPacingCamera(camera,target);assert.ok(camera.y>=PACING_MIN_CAMERA_HEIGHT);assert.ok(target.y>=0);}
});
test('low-angle zoom stops above near-plane clearance and normal views are unchanged',()=>{
 const camera={x:0,y:.8,z:10},target={x:0,y:0,z:0};constrainPacingCamera(camera,target);assert.equal(camera.y,4);
 const high={x:100,y:60000,z:400},pivot={x:5,y:0,z:10},before=JSON.stringify([high,pivot]);constrainPacingCamera(high,pivot);assert.equal(JSON.stringify([high,pivot]),before);
});

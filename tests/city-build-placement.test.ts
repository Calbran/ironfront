import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateCityBuild,buildPoint,type CityBuildPlacement} from '../packages/game-core/src/cityBuildPlacement';
const base:CityBuildPlacement={kind:'sandbags',x:0,z:0,angle:0};
test('build footprints reject obstacles, steep terrain and occupied positions',()=>{
 assert.equal(validateCityBuild(base,[],()=>true,()=>0),'');
 assert.match(validateCityBuild(base,[],p=>p.x<1,()=>0),/clear/);
 assert.match(validateCityBuild(base,[],()=>true,p=>p.x),/steep/);
 assert.match(validateCityBuild(base,[],()=>true,()=>0,[{x:0,z:0}]),/units/);
});
test('rotated placement footprints reject overlap and allow separated structures',()=>{
 const rotated={...base,angle:Math.PI/2};
 assert.match(validateCityBuild(rotated,[base],()=>true,()=>0),/close/);
 assert.equal(validateCityBuild({...rotated,x:8},[base],()=>true,()=>0),'');
 const p=buildPoint(rotated,2,0);assert(Math.abs(p.x)<1e-8);assert.equal(p.z,-2);
});
test('placement caps and nonfinite coordinates are rejected',()=>{
 assert.match(validateCityBuild({...base,x:NaN},[],()=>true,()=>0),/ground/);
 assert.match(validateCityBuild({...base,x:100},Array(48).fill(base),()=>true,()=>0),/limit/);
});

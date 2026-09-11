import test from 'node:test';
import assert from 'node:assert/strict';
import {cityIdleMotion} from '../apps/web/src/experiments/cityIdleMotion';
test('idle motion stays subtle and soldiers have different timing',()=>{
  for(let t=0;t<60;t+=.1){
    const p=cityIdleMotion(t,1,0,false,false,'none');
    assert.ok(Math.abs(p.breath)<=.006&&Math.abs(p.sway)<=.009);
  }
  assert.notDeepEqual(cityIdleMotion(3,1,0,false,false,'none'),cityIdleMotion(3,2,0,false,false,'none'));
});
test('running, aiming and cover take precedence over idle motion',()=>{
  for(const [speed,moving,aiming,cover] of [[1,true,false,'none'],[0,false,true,'none'],[0,false,false,'partial'],[0,false,false,'full']] as const){
    const p=cityIdleMotion(3,1,speed,moving,aiming,cover);
    assert.equal(Math.abs(p.breath)+Math.abs(p.sway),0);
  }
});

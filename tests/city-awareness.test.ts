import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createContactMemory,citySightBoundary} from '../packages/game-core/src/cityAwareness';
test('unseen contacts freeze, expire, and never include live combat data',()=>{
 const memory=createContactMemory(),enemy={id:9,x:10,z:2,health:100};
 assert.deepEqual(memory.update(0,[enemy],()=>false),[]);
 enemy.x=50;
 assert.deepEqual(memory.update(10,[],()=>false),[{id:9,x:10,z:2,seenAt:0,age:10}]);
 assert.deepEqual(memory.update(30,[],()=>false),[]);
});
test('reacquisition, observed death, and scouting an empty last-known location clear ghosts',()=>{
 const memory=createContactMemory(),enemy={id:9,x:10,z:2,health:100};
 memory.update(0,[enemy],()=>false);assert.equal(memory.update(1,[],()=>false).length,1);
 assert.deepEqual(memory.update(2,[{...enemy,x:12}],()=>false),[]);
 assert.equal(memory.update(3,[],()=>false)[0].x,12);
 assert.deepEqual(memory.update(4,[],()=>true),[]);
 memory.update(5,[enemy],()=>false);memory.update(6,[{...enemy,health:0}],()=>false);
 assert.deepEqual(memory.update(7,[],()=>false),[]);
});
test('sight outline clips buildings while low cover preserves sight',()=>{
 const building={id:'b',kind:'building' as const,x:5,z:0,width:2,depth:4,angle:0};
 const outline=citySightBoundary({x:0,z:0},40,[building]);
 assert.equal(outline[0].x,4);assert.equal(outline[32].x,-40);
 assert.equal(citySightBoundary({x:0,z:0},40,[{...building,kind:'wall'}])[0].x,40);
 const rotated=citySightBoundary({x:0,z:0},40,[{...building,angle:Math.PI/2}]);assert(Math.abs(rotated[0].x-3)<1e-6);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blendAngle,tacticalShotBatchDelays,tacticalShotDelay,tracerSegment} from '../apps/web/src/experiments/battlePresentation';
test('turn interpolation takes the short arc across the angle seam',()=>{
 const halfway=blendAngle(Math.PI-.1,-Math.PI+.1,.5);assert(Math.abs(halfway-Math.PI)<1e-9);
});
test('tracers travel forward, remain short, and expire instead of becoming beams',()=>{
 for(const shell of [true,false]){const a=tracerSegment(24,.03,shell)!,b=tracerSegment(24,.05,shell)!;assert(b.head>a.head);assert((b.head-b.tail)*24<=(shell?2.201:.651));assert.equal(tracerSegment(24,1,shell),undefined);}
 assert.equal(tracerSegment(0,.01,false),undefined);assert.equal(tracerSegment(24,-.1,false),undefined);
});
test('squad reports use small stable per-soldier phases',()=>{
 const delays=Array.from({length:6},(_,i)=>tacticalShotDelay(i+1,100+i));
 assert.equal(new Set(delays).size,6);assert(delays.every(d=>d>=0&&d<.2));
 assert.equal(tacticalShotDelay(7,102),tacticalShotDelay(7,102));
});
test('snapshot batches preserve authoritative volley order within a bounded replay window',()=>{
 assert.deepEqual(tacticalShotBatchDelays([{at:4},{at:4.25},{at:4.5}]),[0,.25,.5]);
 const compressed=tacticalShotBatchDelays([{at:1},{at:2},{at:3}]);
 assert.equal(compressed[0],0);assert.equal(compressed[2],.65);
 assert.deepEqual(tacticalShotBatchDelays([{},{}]),[0,0]);
});

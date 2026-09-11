import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blendAngle,tracerSegment} from '../apps/web/src/experiments/battlePresentation';
test('turn interpolation takes the short arc across the angle seam',()=>{
 const halfway=blendAngle(Math.PI-.1,-Math.PI+.1,.5);assert(Math.abs(halfway-Math.PI)<1e-9);
});
test('tracers travel forward, remain short, and expire instead of becoming beams',()=>{
 for(const shell of [true,false]){const a=tracerSegment(24,.03,shell)!,b=tracerSegment(24,.05,shell)!;assert(b.head>a.head);assert((b.head-b.tail)*24<=.651);assert.equal(tracerSegment(24,1,shell),undefined);}
 assert.equal(tracerSegment(0,.01,false),undefined);assert.equal(tracerSegment(24,-.1,false),undefined);
});

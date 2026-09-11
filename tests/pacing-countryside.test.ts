import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generatePacingCountryside} from '../packages/game-core/src/pacingCountryside';
import {createPacingStudy} from '../packages/game-core/src/campaignPacingStudy';
import {onLocalLand} from '../packages/game-core/src/localMovement';

test('country scenery is deterministic, non-mutating and keeps compact local POIs',()=>{
 const {world}=createPacingStudy('Meridian'),before=JSON.stringify(world),scale=14.3;
 const a=generatePacingCountryside(world,scale);
 assert.deepEqual(a,generatePacingCountryside(world,scale));assert.equal(JSON.stringify(world),before);
 assert.ok(a.farms.length>0);assert.ok(a.pois.length>0);
 assert.ok(a.farms.every(f=>f.fields.length>=12&&f.extent>1000));
 assert.ok(a.pois.every(p=>p.extent===44||p.extent===66));
 assert.equal(new Set(a.pois.map(p=>p.id)).size,a.pois.length);
 for(const farm of a.farms)for(const f of farm.fields){
  for(const dx of [-.5,0,.5])for(const dy of [-.5,0,.5])assert.ok(world.regions.some(r=>r.terrain==='plains'&&onLocalLand(r,{x:f.x+dx*f.width/scale,y:f.y+dy*f.depth/scale},'ground')));
 }
});
test('country scenery honors reserved footprints and seed variation',()=>{
 const {world}=createPacingStudy('Meridian'),scale=14.3,a=generatePacingCountryside(world,scale),reserve={x:a.pois[0].x,y:a.pois[0].y,radius:600};
 const b=generatePacingCountryside(world,scale,[reserve]);
 for(const p of b.pois)assert.ok(Math.hypot(p.x-reserve.x,p.y-reserve.y)>reserve.radius+p.extent*Math.SQRT2/scale);
 for(const farm of b.farms)for(const f of farm.fields)assert.ok(Math.hypot(f.x-reserve.x,f.y-reserve.y)>reserve.radius+Math.hypot(f.width,f.depth)/2/scale);
 assert.notDeepEqual(a,generatePacingCountryside({...world,seed:'changed'},scale));
 assert.throws(()=>generatePacingCountryside(world,0));
});

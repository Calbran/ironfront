import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bakeInfantry} from '../apps/web/src/infantryModel.ts';
import {inInfantryViewport,infantryDetail} from '../apps/web/src/infantryVisibility.ts';
import {SquadMotion} from '../apps/web/src/squadMotion.ts';
import type {Squad} from '../packages/game-core/src/tactics.ts';
test('approved infantry geometry and baked movement remain finite and articulated',()=>{
 for(const team of [0,1]){
  const rig=bakeInfantry(team);
  assert.equal(rig.parts.reduce((n,p)=>n+p.geometry.attributes.position.count/3,0),348);
  for(const frame of [...rig.walk,...rig.aim])for(const matrix of frame){assert.equal(matrix.length,16);assert([...matrix].every(Number.isFinite));}
  assert.notDeepEqual(rig.walk[0],rig.walk[16]);assert.notDeepEqual(rig.aim[0],rig.aim[4]);
  for(const part of rig.parts)part.geometry.dispose();
 }
});
test('viewport padding includes edge formations, excludes offscreen units and zoom suppresses models',()=>{
 const v={x:-100,y:-200,scale:2,width:800,height:600};
 assert(inInfantryViewport({x:25,y:100},v));assert(!inInfantryViewport({x:-1000,y:100},v));
 assert(inInfantryViewport({x:490,y:300},v));assert(!inInfantryViewport({x:510,y:300},v));
 assert(infantryDetail(6,12));assert(!infantryDetail(1,12));assert(!infantryDetail(6,3));assert(!infantryDetail(6,12,true));
});
test('offscreen member animation is omitted and re-entry uses current authoritative position',()=>{
 const s={id:'test',army:0,owner:0,region:0,kind:'infantry',strength:6,capacity:6,unitCount:6,morale:1,suppression:0,x:10,y:10,previousX:10,previousY:10,action:'moving',target:null,fire:0} as Squad;
 const motion=new SquadMotion();let result=motion.update([s],1,100,1,false,false,new Set());
 assert.equal(result.members.get(s.id)?.length,0);assert(result.centers.has(s.id));
 s.x=100;s.y=100;result=motion.update([s],2,3100,1,false,false,new Set([s.id]));
 assert.equal(result.members.get(s.id)?.length,6);assert(result.members.get(s.id)!.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 assert.equal(s.x,100);assert.equal(s.strength,6);
});

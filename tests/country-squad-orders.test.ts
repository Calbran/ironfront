import test from "node:test";
import assert from "node:assert/strict";
import {createSliceState,ensureSliceSquads,commandSlice,advanceSlice,type SlicePlan,type createSliceNavigation} from "../packages/game-core/src/countrySlice";
import {obstacleDistance,coverAtObstacles} from "../packages/game-core/src/cityTactics";
import {coverReactionPosition} from "../packages/game-core/src/cityCoverReaction";
const obstacles=[{id:"wall",kind:"sandbag" as const,x:0,z:0,width:8,depth:1,angle:0}];
const plan={obstacles,cover:[]} as unknown as SlicePlan;
const nav={walkable:(p:{x:number;z:number})=>obstacleDistance(p,obstacles[0])>.2,route:(_a:unknown,b:unknown)=>[b],clear:()=>true} as unknown as ReturnType<typeof createSliceNavigation>;
test("a squad order fans out to independent, non-overlapping protected member slots",()=>{
  const s=createSliceState(0);ensureSliceSquads(s);
  commandSlice(plan,nav,s,[1],"move",{x:0,z:1});
  const members=s.units[0].members!,ends=members.map(m=>m.path.at(-1)!);
  assert.equal(ends.length,6);
  for(let i=0;i<6;i++){assert.ok(members[i].cover);assert.ok(ends[i].z>.5);for(let j=0;j<i;j++)assert.ok(Math.hypot(ends[i].x-ends[j].x,ends[i].z-ends[j].z)>=.9);}
  assert.notDeepEqual(members[0].path,members[1].path);
  const before=structuredClone(s);assert.throws(()=>commandSlice(plan,nav,s,[1,1],"move",{x:0,z:1}));assert.deepEqual(s,before);
});
test("a dead member stays put while surviving members follow their own paths",()=>{
  const s=createSliceState(0);ensureSliceSquads(s);s.running=true;
  const [dead,a,b]=s.units[0].members!;dead.health=0;a.path=[{x:a.x+10,z:a.z}];b.path=[{x:b.x,z:b.z+10}];
  const origin={x:dead.x,z:dead.z},ax=a.x,bz=b.z;
  advanceSlice(s,1000);assert.deepEqual({x:dead.x,z:dead.z},origin);assert.ok(a.x>ax);assert.ok(b.z>bz);
});
test("shared city reaction chooses nearby protection without crossing to the threat side",()=>{
  const u={x:0,z:3},threat={x:0,z:-10};
  const p=coverReactionPosition(u,u,obstacles,[],p=>coverAtObstacles(p,threat,obstacles).damageScale,nav.walkable as never,()=>true);
  assert.ok(p);assert.ok(p.z>.5);assert.ok(Math.hypot(p.x-u.x,p.z-u.z)<=4);assert.equal(coverAtObstacles(p,threat,obstacles).damageScale,.5);
});

test("open squad orders form a stable loose group with depth and independent spacing",()=>{
 const s=createSliceState(0);ensureSliceSquads(s);
 commandSlice(plan,nav,s,[1],"move",{x:30,z:30},false,0);
 const ends=s.units[0].members!.map(m=>m.path.at(-1)!);
 assert.ok(Math.max(...ends.map(p=>p.z))-Math.min(...ends.map(p=>p.z))>1);
 for(let i=0;i<ends.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(ends[i].x-ends[j].x,ends[i].z-ends[j].z)>=.9);
 const again=createSliceState(0);ensureSliceSquads(again);commandSlice(plan,nav,again,[1],"move",{x:30,z:30},false,0);
 assert.deepEqual(again.units[0].members!.map(m=>m.path.at(-1)),ends);
});

test("group orders use the slowest member and a separate order detaches its unit",()=>{
 const s=createSliceState(0);ensureSliceSquads(s);
 commandSlice(plan,nav,s,[1,3],"move",{x:30,z:30});
 const squad=s.units[0].members!,tank=s.units[2],group=tank.moveGroup;
 assert.ok(group);assert.ok(squad.every(m=>m.moveGroup===group));
 for(const u of [...squad,tank]){u.angle=Math.PI/2;u.path=[{x:u.x+100,z:u.z}];u.distance=0;}
 tank.angle=0;s.running=true;advanceSlice(s,100);
 assert.ok(squad.every(m=>m.distance===0),"the group waits while its tank turns");
 for(const u of [...squad,tank])u.angle=Math.PI/2;
 const before=[...squad,tank].map(u=>u.distance);advanceSlice(s,1100);
 const travelled=[...squad,tank].map((u,i)=>u.distance-before[i]);
 assert.ok(Math.max(...travelled)-Math.min(...travelled)<1e-8);
 commandSlice(plan,nav,s,[3],"move",{x:60,z:30});
 assert.equal(tank.moveGroup,undefined);
 assert.ok(squad.every(m=>m.moveGroup===group));
});

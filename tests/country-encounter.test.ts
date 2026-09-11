import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {Store} from "../apps/api/src/store";
import {CountrySliceStore} from "../apps/api/src/countrySliceRoutes";
import { createSliceState, type SlicePlan } from "../packages/game-core/src/countrySlice";
import { advanceEncounter, encounterSight, sliceSurvivors } from "../packages/game-core/src/countryEncounter";
const battle=()=>{
  const s=createSliceState(0);s.running=true;
  s.units=s.units.slice(0,2);s.units[0].x=0;s.units[0].z=0;s.units[1].x=20;s.units[1].z=0;s.units[1].enemy=true;
  s.encounter={elapsed:0,remainder:0,stage:"bridge",progress:0,bridge:{x:100,z:0},outpost:{x:200,z:0},shots:[],sequence:0};return s;
};
test("country combat is invariant to polling and serialized restart, including magazines and casualties",()=>{
  const a=battle();advanceEncounter(a,80000,()=>1);
  let b=battle();for(let t=250;t<=40000;t+=250)advanceEncounter(b,t,()=>1);
  b=JSON.parse(JSON.stringify(b));for(let t=40250;t<=80000;t+=250)advanceEncounter(b,t,()=>1);
  assert.deepEqual(JSON.parse(JSON.stringify(b)),JSON.parse(JSON.stringify(a)));assert.ok(a.encounter!.sequence>0);assert.ok(a.units.some(u=>(u.health??100)<100));
});
test("squads retain a last survivor; blocked sight prevents damage and suppression",()=>{
  const s=battle();assert.equal(sliceSurvivors(s.units[0]),6);s.units[0].health=1;assert.equal(sliceSurvivors(s.units[0]),1);
  advanceEncounter(s,5000,()=>0);assert.equal(s.units[0].health,1);assert.equal(s.encounter!.sequence,0);
  s.units[0].members!.forEach(m=>m.health=0);assert.equal(sliceSurvivors(s.units[0]),0);
});
test("capture requires living infantry, completes in order, and offline work is bounded",()=>{
  const s=battle();s.units=s.units.slice(0,1);s.units[0].x=100;
  advanceEncounter(s,10000,()=>1);assert.equal(s.encounter!.stage,"outpost");
  s.units[0].members!.forEach(m=>m.x+=100);advanceEncounter(s,20000,()=>1);assert.equal(s.encounter!.stage,"victory");assert.equal(s.running,false);
  const timeout=battle();advanceEncounter(timeout,30*86400000,()=>0);assert.equal(timeout.encounter!.stage,"defeat");assert.equal(timeout.encounter!.elapsed,600);
});
test("a terrain ridge blocks country sight independently of ground colors",()=>{
  const heights=new Float32Array(33);for(let z=0;z<3;z++)heights[z*11+5]=10;
  const plan={obstacles:[],surface:{cols:11,rows:3,step:2,heights}} as unknown as SlicePlan;
  const s=battle();s.units.forEach(u=>u.z=2);
  assert.equal(encounterSight(plan)(s.units[0],s.units[1]),0);
});
test("SQLite reopen retains independent combat health, clocks and fire memory atomically",()=>{
  const dir=mkdtempSync(join(tmpdir(),"slice-fight-")),file=join(dir,"state.db");let store=new Store(file);
  const advance=(s:ReturnType<typeof createSliceState>,now:number)=>advanceEncounter(s,now,()=>1);
  try{
    let saves=new CountrySliceStore(store,advance);saves.create("test-private",0);
    saves.mutate("test-private",0,s=>Object.assign(s,battle()));
    const before=saves.mutate("test-private",40000);
    assert.throws(()=>saves.mutate("test-private",50000,()=>{throw Error("reject");}));
    assert.deepEqual(JSON.parse(JSON.stringify(saves.mutate("test-private",40000))),JSON.parse(JSON.stringify(before)));
    store.close();store=new Store(file);saves=new CountrySliceStore(store,advance);
    const resumed=saves.mutate("test-private",80000),expected=battle();advance(expected,80000);
    assert.deepEqual(JSON.parse(JSON.stringify(resumed)),JSON.parse(JSON.stringify(expected)));
  }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});

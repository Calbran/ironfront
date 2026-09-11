import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomyStudy,buildResourceSite,advanceEconomy,siteIncome} from '../packages/game-core/src/resourceSites';
test('production requires control, construction and a connection; no retroactive output',()=>{
 let s=createEconomyStudy([{id:'deposit',resourceKind:'fuel'}]);
 assert.throws(()=>buildResourceSite(s,'deposit'),/Secure/);
 s={...s,sites:s.sites.map(o=>({...o,controlled:true}))};
 s=buildResourceSite(s,'deposit');assert.equal(s.stock.industry,44);
 assert.throws(()=>buildResourceSite(s,'deposit'),/already/);
 s=advanceEconomy(s,18);assert.equal(s.stock.fuel,40+18+6*2);
 assert.equal(siteIncome(s).fuel,3);
 s={...s,sites:s.sites.map(o=>({...o,connected:false}))};
 const fuel=s.stock.fuel;s=advanceEconomy(s,12);assert.equal(s.stock.fuel,fuel+12);
 assert.equal(siteIncome(s).fuel,1);
});
test('construction costs are atomic and economy is deterministic across time chunks',()=>{
 const original=createEconomyStudy([{id:'factory',resourceKind:'industry'}]);
 const owned={...original,sites:original.sites.map(s=>({...s,controlled:true}))};
 const built=buildResourceSite(owned,'factory');
 assert.equal(original.stock.industry,80);
 assert.deepEqual(advanceEconomy(built,24),advanceEconomy(advanceEconomy(built,6),18));
 assert.throws(()=>buildResourceSite({...owned,stock:{...owned.stock,industry:0}},'factory'),/Not enough/);
 assert.throws(()=>advanceEconomy(built,-1),/Invalid/);
 const lost={...built,sites:built.sites.map(s=>({...s,controlled:false}))};
 assert.equal(advanceEconomy(lost,24).stock.industry,built.stock.industry+48);
});

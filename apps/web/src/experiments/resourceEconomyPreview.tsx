import React,{useState} from 'react';
import {createEconomyStudy,buildResourceSite,advanceEconomy,siteIncome,SITE_RULES} from '../../../../packages/game-core/src/resourceSites';
import type {TimedObjective} from '../../../../packages/game-core/src/timedSettlementStudy';
export function ResourceEconomyPreview({objectives}:{objectives:TimedObjective[]}){
 const [state,setState]=useState(()=>createEconomyStudy(objectives)),[error,setError]=useState('');
 const income=siteIncome(state);
 function change(id:string,key:'controlled'|'connected'){setState(s=>({...s,sites:s.sites.map(o=>o.id===id?{...o,[key]:!o[key]}:o)}));setError('');}
 return <section><h2>Resource-site economy sandbox</h2><p>Provisional values. Capture and connection switches below simulate control; they do not issue orders or change a campaign. Time advances only when you press the test button. Selecting another base resets this sandbox.</p>
 <p>Hour {state.hour} · Industry {state.stock.industry.toFixed(1)} · Fuel {state.stock.fuel.toFixed(1)} · Manpower {state.stock.manpower.toFixed(1)}</p>
 <p>Automatic hourly income: {income.industry} industry / {income.fuel} fuel / {income.manpower} manpower. Home base provides 2 / 1 / 1 regardless of terrain.</p>
 <button onClick={()=>setState(s=>advanceEconomy(s,12))}>Simulate 12 hours</button> <button onClick={()=>{setState(createEconomyStudy(objectives));setError('');}}>Reset economy sandbox</button>
 {error&&<p role="alert">{error}</p>}
 {state.sites.map(s=>{const rule=SITE_RULES[s.kind],name=objectives.find(o=>o.id===s.id)!.name;
 return <fieldset key={s.id}><legend>{name}</legend><p>{rule.building}: {rule.cost} industry · {rule.hours}h construction · +{rule.income.industry} industry / +{rule.income.fuel} fuel / +{rule.income.manpower} manpower per hour</p>
 <label><input type="checkbox" checked={s.controlled} onChange={()=>change(s.id,'controlled')}/> Simulate friendly control</label> <label><input type="checkbox" checked={s.connected} onChange={()=>change(s.id,'connected')}/> Simulate supply connection</label>
 <p>{s.readyAt===null?'Undeveloped — no output':state.hour<s.readyAt?`Completes at hour ${s.readyAt}`:s.controlled&&s.connected?'Producing automatically':'Output suspended'}</p>
 <button disabled={!s.controlled||!s.connected||s.readyAt!==null||state.stock.industry<rule.cost} onClick={()=>{try{setState(buildResourceSite(state,s.id));setError('');}catch(e){setError(String(e));}}}>{rule.building}</button></fieldset>;})}
 <p>Warehouses/depot capacity and live supply routing are not implemented here. A warehouse is logistics/storage, not a producer. Deposit quantities, depletion and final output balance remain undecided.</p></section>;
}

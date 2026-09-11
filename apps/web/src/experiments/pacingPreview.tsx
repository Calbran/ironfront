import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createPacingStudy,auditBaseSite} from '../../../../packages/game-core/src/campaignPacingStudy';
import './pacingPreview.css';
import {placeTimedSettlements,objectiveRoutes,STUDY_TRAVEL_MULTIPLIER} from '../../../../packages/game-core/src/timedSettlementStudy';
import {SETTLEMENT_RADII} from '../../../../packages/game-core/src/campaignScale';
import {SITE_RULES} from '../../../../packages/game-core/src/resourceSites';
import {ResourceEconomyPreview} from './resourceEconomyPreview';
import {repairStartingZones} from '../../../../packages/game-core/src/viableStartingZones';
import {PacingWorld3D} from './pacingWorld3D';
import {PHYSICAL_SEPARATION,CITY_RUN_SPEED,physicalRouteHours} from './pacingPhysicalScale';
const colors=['#7bcee1','#ebad77','#aaca83','#c9a4df'];
function App(){
  const [seed,setSeed]=useState('Meridian'),[study,setStudy]=useState<ReturnType<typeof createPacingStudy>>(),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [siteId,setSiteId]=useState(''),[audit,setAudit]=useState<ReturnType<typeof auditBaseSite>>();
  const [placement,setPlacement]=useState<ReturnType<typeof placeTimedSettlements>>();
  const [show3D,setShow3D]=useState(false);
  const [physical,setPhysical]=useState(true);
  const [zoneReport,setZoneReport]=useState<string[]>([]);
  function place(){if(!study)return;setBusy(true);setError('');setTimeout(()=>{try{const result=repairStartingZones(study);setStudy(result.study);setPlacement(result.placement);setZoneReport([...result.changes,`${result.rejected} unsuitable candidates removed.`,result.ready?'All four players have resource-viable sampled starts.':`Map rejected: players ${result.missing.map(p=>p+1).join(', ')} lack a viable start.`]);setAudit(undefined);setSiteId('');}catch(e){setError(String(e));}finally{setBusy(false);}},30);}
  function generate(){setBusy(true);setError('');setAudit(undefined);setPlacement(undefined);setTimeout(()=>{try{setStudy(createPacingStudy(seed));setSiteId('');}catch(e){setError(String(e));}finally{setBusy(false);}},30);}
  function choose(id:string){if(!study)return;setSiteId(id);setBusy(true);setAudit(undefined);setTimeout(()=>{try{const s=study.sites.find(s=>s.id===id)!;if(placement){const routes=objectiveRoutes(study.world,s,placement.objectives.filter(o=>o.player===s.player||o.player<0));const hs=routes.filter(r=>r.player===s.player).flatMap(r=>r.hours===null?[]:[r.hours]);const first=hs.length?Math.min(...hs):null;setAudit({routes,first,passesFirst:first!==null&&first>=1&&first<=2,passesNearby:hs.filter(h=>h>=2&&h<=4).length>=3});}else setAudit(auditBaseSite(study.world,s));}catch(e){setError(String(e));}finally{setBusy(false);}},30);}
  const site=study?.sites.find(s=>s.id===siteId),geo=study?.world.geography;
  return <main><header><small>IRONFRONT · ASYNCHRONOUS CAMPAIGN LAB</small><h1>Distance is a commitment.</h1><p>Reserved placement zones and actual infantry route-time estimates. Study only — no campaign ownership or base is created.</p></header>
  <section className="toolbar"><label>Map seed <input value={seed} onChange={e=>setSeed(e.target.value)}/></label><button disabled={busy} onClick={generate}>{busy?'Calculating…':'Generate study'}</button><a href="/">City battle ↗</a><a href="/country-slice.html">Playable country sector ↗</a></section>
  {error&&<p role="alert">{error}</p>}
  <button disabled={!study||!placement||busy} onClick={()=>setShow3D(v=>!v)}>{show3D?'Hide 3D world':'Show 3D world'}</button>
  {placement&&<section><label><input type="checkbox" checked={physical} onChange={e=>setPhysical(e.target.checked)}/> Physical country scale ({PHYSICAL_SEPARATION.toFixed(1)}× separation)</label><p>Expands geography and distances between locations, not buildings, units or local footprints. Infantry reference: {CITY_RUN_SPEED} model units/second; animation unchanged. Uncheck to compare the compact world. The 2D diagram remains a schematic.</p><p>Walking ETAs below measure the existing route shape at this scale and a constant soldier speed. They are not authoritative movement orders; terrain penalties, local city entrances and future transport remain to be integrated.</p></section>}
  {show3D&&study&&placement&&<PacingWorld3D key={physical?'physical':'compact'} study={study} objectives={placement.objectives} physical={physical}/>}
  {placement&&<section aria-label="Starting zone validation">{zoneReport.map((line,i)=><p key={i}>{line}</p>)}<p>Only vetted sample points are selectable; zone interiors are not approved placement areas. City access remains deliberately uneven. Supply chokepoints and competitive balance are not certified.</p></section>}
  <section className="toolbar"><button disabled={!study||busy} onClick={place}>Place timed cities &amp; objectives</button><span>{placement?`${placement.objectives.length} placed · ${placement.audits.filter(a=>a.passes).length}/${placement.audits.length} candidates meet nearby targets`:'Experimental pass; preserves existing cities and adds new objectives.'}</span></section>
  {placement&&<section><p>Preview-only strategic speed: {STUDY_TRAVEL_MULTIPLIER}×. City footprints stay unchanged. Colored footprints identify resource types; small cream dots are existing settlements. Candidates failing nearby targets are not approved starts.</p>{placement.failures.map(f=><p key={f}>{f}</p>)}<p>Choose a base candidate to inspect its routes and test resource construction in the economy sandbox below. Regional cities are not yet validated as shared contested frontiers. No production is connected to live campaign saves.</p></section>}
  <div className="layout"><aside><h2>Choose a base site</h2><p>Colored territory is a placement allowance, not owned land. Only the displayed land-valid candidates are selectable in this study.</p>
  {study?.zones.map(z=><section key={z.player}><h3 style={{color:colors[z.player]}}>Player {z.player+1}</h3>{study.sites.filter(s=>s.player===z.player).map(s=><button disabled={busy} aria-pressed={s.id===siteId} key={s.id} onClick={()=>choose(s.id)}>Site {s.id.split('-')[1]} · {s.setting}</button>)}{!study.sites.some(s=>s.player===z.player)&&<p>No valid candidate — reject zone.</p>}</section>)}
  </aside><section className="map">{study&&geo?<svg viewBox={`0 0 ${geo.width} ${geo.height}`} aria-label="Starting zones and travel routes">
  {study.world.regions.map(r=><g key={r.id}>{(r.contours??[r.polygon]).map((ring,i)=><polygon key={i} points={ring.map(p=>p.join(',')).join(' ')} fill={colors[study.zones.find(z=>z.region===r.id)?.player??-1]??(r.terrain==='forest'?'#344d3e':r.terrain==='mountains'?'#62615a':'#77785c')} stroke="#b6b495" strokeWidth={geo.width/1600}/>)}</g>)}
  {study.world.regions.flatMap(r=>(r.features??[]).filter(f=>f.kind==='settlement').map(f=><circle key={`${r.id}-${f.id}`} cx={f.x} cy={f.y} r={geo.width/500} fill="#ece1bd"><title>{f.name}</title></circle>))}
  {placement?.objectives.map(o=><g key={o.id}><circle cx={o.x} cy={o.y} r={SETTLEMENT_RADII[o.size]} fill={SITE_RULES[o.resourceKind].color} fillOpacity=".85" stroke="#e6fff8" strokeWidth={geo.width/1600}/><title>{o.name} · {SITE_RULES[o.resourceKind].building} · {o.player<0?'variable travel time':`${o.band.join('–')}h target`}</title></g>)}
  {audit?.routes.filter(r=>r.hours!==null).map(r=><g key={`${r.region}-${r.name}`}><polyline points={[site!,...r.path].map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke={r.hours!<=4?'#f2df86':'#ed987e'} strokeWidth={geo.width/700}/><text x={r.x} y={r.y-geo.width/180} fontSize={geo.width/90} fill="white" stroke="#182e31" paintOrder="stroke" strokeWidth={geo.width/1200}>{r.hours!.toFixed(1)}h</text></g>)}
  {study.sites.map(s=><circle key={s.id} cx={s.x} cy={s.y} r={geo.width/(s.id===siteId?180:300)} fill={colors[s.player]} stroke="#fff" strokeWidth={geo.width/1400}><title>Player {s.player+1}, site {s.id}</title></circle>)}
  </svg>:<p className="empty">Generate a map, then choose a candidate site to measure routes.</p>}</section>
  <aside><h2>Travel-time audit</h2><p>Normal pace: one campaign hour = one real hour. Unsuppressed infantry, existing land routing. No road-speed bonus, embarkation or combat delays are modeled.</p>
  {audit&&<><p>Nearest sampled settlement: <strong>{audit.first===null?'Unreachable':`${audit.first.toFixed(1)} hours`}</strong></p><p>Strategic targets (not physical-route certification):</p><p>1–2h first opportunity: {audit.passesFirst?'within target':'outside target'}</p><p>Three alternatives at 2–4h: {audit.passesNearby?'within target':'outside target'}</p><ul>{audit.routes.map(r=><li key={`${r.region}-${r.name}`}>{r.name}: {r.hours===null?'no land route':`${r.hours.toFixed(2)}h strategic · ${physicalRouteHours(site!,r.path,physical?PHYSICAL_SEPARATION:1).toFixed(2)}h walking`}</li>)}</ul></>}
  <h3>Provisional targets</h3><p>First opportunity: 1–2h<br/>Nearby alternatives: 2–4h<br/>Contested frontier: 6–12h<br/>Cross-map commitment: 24h+</p><p>Route samples are not full fairness certification. Frontier, supply and cross-map audits remain required before approving starts.</p><h3>Resource legend</h3>{Object.entries(SITE_RULES).map(([kind,r])=><p key={kind} style={{color:r.color}}>{r.name} → {r.building}</p>)}</aside></div>
  {placement&&site&&<ResourceEconomyPreview key={siteId} objectives={placement.objectives.filter(o=>o.player===site.player||o.player<0)}/>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);

import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initialCity, type MiniatureData } from './miniatureData';
import { miniatureScene, type StudySettings, type StudyStats } from './miniatureScene';
import './threePreview.css';
const PixiMap = lazy(() => import('../ContinentalMap').then(m => ({default:m.MapView})));
function Study() {
  const [seed,setSeed]=useState('Meridian'),[request,setRequest]=useState('Meridian');
  const [data,setData]=useState<MiniatureData>(),[error,setError]=useState(''),[engine,setEngine]=useState('three');
  const [city,setCity]=useState(''),[selected,setSelected]=useState<number|null>(null),[stats,setStats]=useState<StudyStats>();
  const [settings,setSettings]=useState<StudySettings>({textures:false,snow:false,sprites:false,borders:false,motion:true,shadows:true});
  const host=useRef<HTMLDivElement>(null),scene=useRef<ReturnType<typeof miniatureScene>>(undefined);
  useEffect(()=>{setData(undefined);setError('');const worker=new Worker(new URL('./miniature.worker.ts',import.meta.url),{type:'module'});worker.onmessage=e=>{if(e.data.error){setError(e.data.error);return;}const next=e.data as MiniatureData;setData(next);const first=initialCity(next);setCity(first?.feature.id??'');setSelected(first?.region??null);};worker.onerror=e=>setError(e.message);worker.postMessage({seed:request});return()=>worker.terminate();},[request]);
  useEffect(()=>{if(!data||engine!=='three'||!host.current)return;try{const next=miniatureScene(host.current,data,setSelected,setStats,setError);scene.current=next;next.configure(settings);next.chooseCity(city);return()=>{next.dispose();scene.current=undefined;};}catch(e){setError(String(e));}},[data,engine]);
  useEffect(()=>{scene.current?.configure(settings);},[settings]);
  useEffect(()=>{scene.current?.chooseCity(city);},[city]);
  return <main><header><div><span className="eyebrow">IRONFRONT / RENDERER EXPERIMENT</span><h1>A world in miniature</h1></div><a href="/">Original game ↗</a></header>
    <section className="viewport" aria-label="Map preview">
      {data ? engine==='three'?<div className="scene" ref={host}/>:<Suspense fallback={<p className="loading">Loading Pixi…</p>}><div className="scene pixi"><PixiMap world={data.world} selected={selected} onSelect={setSelected} preview focus={selected===null?null:{region:selected,revision:selected}}/></div></Suspense>:<div className="loading" role="status">{error||'Generating the existing world, settlements and roads…'}</div>}
      <div className="view-controls" aria-label="Camera presets">{(['continent','town','ground'] as const).map(mode=><button key={mode} disabled={!data||engine!=='three'} onClick={()=>scene.current?.view(mode)}>{mode}</button>)}</div>
      <div className="map-caption">{engine==='three'?'Fixed isometric view · drag to pan · scroll to zoom':'Original Pixi renderer · same generated world'}</div>
    </section>
    <aside><div className="switch" aria-label="Renderer">{['three','pixi'].map(value=><button key={value} aria-pressed={engine===value} onClick={()=>setEngine(value)}>{value==='three'?'Three.js study':'Pixi baseline'}</button>)}</div>
      <p className="intro">Existing geography, city layouts and artwork, explored with depth, light and miniature models.</p>
      <form onSubmit={e=>{e.preventDefault();if(seed.trim())setRequest(seed.trim());}}><label htmlFor="seed">World seed</label><div className="seed"><input id="seed" value={seed} onChange={e=>setSeed(e.target.value)}/><button disabled={!data||seed.trim()===request}>Generate</button></div></form>
      <label htmlFor="settlement">Visit a settlement</label><select id="settlement" value={city} disabled={!data} onChange={e=>{setCity(e.target.value);setSelected(data?.cities.find(c=>c.feature.id===e.target.value)?.region??null);}}>{data?.cities.map(c=><option key={c.feature.id} value={c.feature.id}>{data.world.regions[c.region].name} · {c.feature.size}</option>)}</select>
      <fieldset disabled={engine!=='three'}><legend>Visual study</legend>{([['textures','Retained ground textures'],['snow','Winter palette'],['sprites','Retained building sprites'],['borders','Political borders'],['motion','Staged infantry & jeep'],['shadows','Sun shadows']] as const).map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={settings[key]} onChange={e=>setSettings({...settings,[key]:e.target.checked})}/>{label}</label>)}</fieldset>
      <div className="metrics" aria-live="off"><strong>{engine==='three'&&stats?`${stats.fps} FPS`:engine==='pixi'?'Pixi baseline':'Preparing…'}</strong><span>{data?.world.regions.length??'—'} regions · {data?.cities.length??'—'} settlements</span>{engine==='three'&&stats&&<span>{stats.calls} draw calls · {Math.round(stats.triangles/1000)}k triangles</span>}</div>
      <details><summary>What this experiment proves</summary><p>The current world can drive either renderer. Infantry and the jeep reuse existing models; buildings are simple volume studies or retained sprites. Forests use instancing.</p><p>Terrain remains flat beneath scenery. Winter is a visual palette, not a shipped biome. Units follow a staged route; combat, cover and campaign saves are not connected.</p><p>Performance numbers reflect this browser and view, not a production benchmark.</p></details>
      {error&&data&&<p role="alert" className="error">{error}</p>}
      <footer>ISOLATED EXPERIMENT · NO CAMPAIGN WRITES</footer>
    </aside>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Study/>);

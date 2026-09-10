import {chromium} from 'playwright';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Store} from '../apps/api/src/store';
import {makeServer} from '../apps/api/src/server';
import {createWorld,makeArmy,command} from '../packages/game-core/src/index';
import {advanceTactics,beginEngagement,ensureTactics} from '../packages/game-core/src/tactics';
const minutes=Number(process.env.SOAK_MINUTES??30),port=3191;
const store=new Store(':memory:'),token=randomBytes(32).toString('hex');
const world=createWorld('THREE-LIVE-SOAK','Boreal',4,3600000,Date.now());world.nations.forEach(n=>{n.bot=false;n.fuel=1000;});world.armies=[];ensureTactics(world);world.tactics!.squads=[];world.tactics!.engagements=[];
const used=new Set<number>(),battleRegions:number[]=[];
for(const source of world.regions){if(battleRegions.length===4)break;if(used.has(source.id)||source.terrain==='mountains')continue;const target=source.neighbors.map(id=>world.regions[id]).find(r=>!used.has(r.id)&&r.terrain!=='mountains');if(!target)continue;used.add(source.id);used.add(target.id);source.owner=0;target.owner=1;target.garrison=20;
 const attack=makeArmy(world.armies.length,0,source.id,'assault'),defend=makeArmy(world.armies.length+1,1,target.id,'line');world.armies.push(attack,defend);command(world,0,{type:'order',army:attack.id,order:'advance',target:target.id});beginEngagement(world,attack,target.id);battleRegions.push(target.id);
}
const moveRegion=world.regions.find(r=>!used.has(r.id)&&r.terrain==='plains')!;moveRegion.owner=0;const mover=makeArmy(world.armies.length,0,moveRegion.id,'line');world.armies.push(mover);
advanceTactics(world,.03);store.create(world,token);store.resume();const app=await makeServer(store);const requestTimes:number[]=[],tickTimes:number[]=[];const starts=new WeakMap<object,number>();app.addHook('onRequest',async req=>{starts.set(req,performance.now());});app.addHook('onResponse',async req=>{requestTimes.push(performance.now()-(starts.get(req)??performance.now()));});await app.listen({host:'127.0.0.1',port});
const timer=setInterval(()=>{const t=performance.now();store.tick(world.id);tickTimes.push(performance.now()-t);},1000);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH??'/Users/brutus-mac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const samples:unknown[]=[],checks:Record<string,unknown>={};const directory='/private/tmp/ironfront-live-soak';await mkdir(directory,{recursive:true});
try{
 await page.addInitScript(t=>localStorage.setItem('warfare-session',t),token);const started=performance.now();await page.goto(`http://127.0.0.1:${port}/?renderer=three`);await page.waitForFunction(()=>!!window.__liveStudy,{timeout:120000});checks.readyMs=performance.now()-started;
 await page.getByRole('button',{name:'Close information panel',exact:true}).click().catch(()=>{});
 await page.evaluate(id=>window.__liveStudy!.focusRegion(id),moveRegion.id);await page.waitForTimeout(1200);
 const live=await page.evaluate(()=>window.__liveStudy!.liveSnapshot());assert(live&&live.squads>0);checks.initialSquads=live.squads;checks.initialEngagements=store.get(world.id)!.tactics!.engagements.filter(e=>e.status==='active').length;
 const own=store.get(world.id)!.tactics!.squads.find(s=>s.owner===0&&s.strength>0&&s.army===mover.id)!;assert(own);
 await page.locator(`.live-force-marker[aria-label="Squad ${own.id} ${own.kind}"]`).click();await page.waitForFunction(id=>window.__liveStudy!.liveSnapshot()?.selected.includes(id),own.id);checks.selection=true;
 // Move through the actual map's right-click path; choose a small valid ground destination.
 const saved=store.get(world.id)!;let destination:{x:number;y:number}|undefined;
 for(const dx of [180,-180,300,-300]){const candidate={x:own.x+dx,y:own.y};try{command(structuredClone(saved),0,{type:'squad-order',squads:[own.id],mode:'move',points:[candidate]});destination=candidate;break;}catch{}}
 assert(destination,'No valid nearby route');
 const point=await page.evaluate(p=>window.__liveStudy!.project(p.x,p.y),destination),rect=await page.locator('.live-three-host').boundingBox();assert(rect);const response=page.waitForResponse(r=>r.url().endsWith('/api/command'));
 await page.mouse.click(rect.x+point.x,rect.y+point.y,{button:'right'});const moveResponse=await response;assert.equal(moveResponse.status(),200);assert.equal(moveResponse.request().postDataJSON().type,'squad-order');assert.equal(store.get(world.id)!.tactics!.squads.find(s=>s.id===own.id)!.localOrder?.mode,'move');checks.mapMove=true;
 const before=store.get(world.id)!.tactics!.squads.find(s=>s.id===own.id)!;store.mutate(world.id,w=>advanceTactics(w,.01));await page.waitForTimeout(3500);const after=store.get(world.id)!.tactics!.squads.find(s=>s.id===own.id)!;checks.authoritativeMovement=Math.hypot(after.x-before.x,after.y-before.y);assert(Number(checks.authoritativeMovement)>0);
 const revision=live.revision;await page.waitForFunction(r=>(window.__liveStudy!.liveSnapshot()?.revision??0)>(r??0),revision,{timeout:15000});checks.pollUpdates=true;await page.waitForFunction(({id,x,y})=>{const p=window.__liveStudy!.liveSnapshot()?.positions[id];return p&&Math.hypot(p.x-x,p.y-y)>.001;},{id:own.id,x:before.x,y:before.y},{timeout:15000});checks.renderedMovement=true;
 await page.getByLabel('Strategy view',{exact:true}).click();await page.waitForTimeout(150);assert.equal(await page.locator('.live-force-marker:visible').count(),0);await page.getByLabel('Strategy view',{exact:true}).click();checks.strategy=true;
 const stateForAttack=store.get(world.id)!;const attacker=stateForAttack.tactics!.squads.find(s=>s.owner===0&&s.region===battleRegions[0]&&s.strength>0)!,enemy=stateForAttack.tactics!.squads.find(s=>s.owner===1&&s.region===battleRegions[0]&&s.strength>0)!;
 await page.evaluate(id=>window.__liveStudy!.focusRegion(id),battleRegions[0]);await page.waitForTimeout(300);
 await page.locator(`.live-force-marker[aria-label="Squad ${attacker.id} ${attacker.kind}"]`).click();const attackResponse=page.waitForResponse(r=>r.url().endsWith('/api/command'));await page.locator(`.live-force-marker[aria-label="Squad ${enemy.id} ${enemy.kind}"]`).click({button:'right'});const attackResult=await attackResponse;assert.equal(attackResult.status(),200);assert.equal(attackResult.request().postDataJSON().type,'squad-attack');checks.mapAttack=true;
 await page.screenshot({path:`${directory}/live.png`});
 const soakStart=performance.now();let cycle=0;console.log(JSON.stringify({stage:'soak-start',minutes,checks}));
 while(performance.now()-soakStart<minutes*60000){
  if(cycle%6===1||cycle%6===4){const status=await page.evaluate(async({id,destination,hold})=>{const r=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('warfare-session')}`},body:JSON.stringify({type:'squad-order',squads:[id],mode:hold?'hold':'move',points:hold?[]:[destination]})});return r.status;},{id:own.id,destination,hold:cycle%6===1});assert.equal(status,200);checks.recurringCommands=Number(checks.recurringCommands??0)+1;}
  const region=battleRegions[cycle%battleRegions.length];await page.evaluate(({region,cycle})=>{const api=window.__liveStudy!;if(cycle%3===0)api.view('continent');else api.focusRegion(region);api.configure({strategy:cycle%5===0,snow:cycle%2===0,sprites:false,textures:false,borders:true,motion:true,shadows:true});},{region,cycle});
  const metric=await page.evaluate(async()=>{const id=window.setInterval(()=>window.__liveStudy!.pan(.3,.1),100);try{return await window.__liveStudy!.benchmark(4000);}finally{clearInterval(id);}});
  const state=store.get(world.id)!;const entry={elapsedSeconds:Math.round((performance.now()-soakStart)/1000),cycle,metric,squads:state.tactics!.squads.length,activeEngagements:state.tactics!.engagements.filter(e=>e.status==='active').length,revision:state.tactics!.revision};samples.push(entry);
  await writeFile(`${directory}/progress.json`,JSON.stringify({checks,errors,samples},null,2));if(cycle%3===0)console.log(JSON.stringify({stage:'progress',...entry}));cycle++;
  await page.waitForTimeout(Math.min(16000,Math.max(0,minutes*60000-(performance.now()-soakStart))));
 }
 await page.getByRole('button',{name:'Pixi',exact:true}).click();await page.locator('.campaign-view canvas').first().waitFor({timeout:60000});await page.getByRole('button',{name:'Three.js live · experimental',exact:true}).click();await page.waitForFunction(()=>!!window.__liveStudy,{timeout:60000});checks.rendererRoundTrip=true;
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1500);await page.screenshot({path:`${directory}/phone.png`,fullPage:true});checks.phoneOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 const percentile=(a:number[],q:number)=>{const b=[...a].sort((x,y)=>x-y);return b[Math.min(b.length-1,Math.floor(q*b.length))]??0;};
 const result={durationSeconds:(performance.now()-soakStart)/1000,checks,errors,samples,server:{ticks:tickTimes.length,tickP95Ms:percentile(tickTimes,.95),tickMaxMs:Math.max(...tickTimes),requests:requestTimes.length,requestP95Ms:percentile(requestTimes,.95)},scope:'Isolated in-memory real server; four seeded engagements, own movement order; normal campaign pace. Local desktop browser, phone viewport only. No real saves.'};await writeFile(`${directory}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({stage:'complete',durationSeconds:result.durationSeconds,checks,errors,server:result.server}));assert.equal(errors.length,0);
}catch(error){await page.screenshot({path:`${directory}/failure.png`}).catch(()=>{});throw error;}finally{clearInterval(timer);await browser.close();await app.close();store.close();}

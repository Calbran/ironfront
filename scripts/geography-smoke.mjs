import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const dir='.impeccable/review';fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
try{
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:3000');await page.locator('canvas').waitFor();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:dir+'/ironfront-lobby.png'});
await page.getByRole('button',{name:'Begin campaign'}).click();await page.locator('.campaign-view canvas').waitFor();assert.equal(await page.title(),'Ironfront — Campaign command');
const token=await page.evaluate(()=>localStorage.getItem('warfare-session'));const response=await page.request.get('http://127.0.0.1:3000/api/world',{headers:{Authorization:'Bearer '+token}});const {world}=await response.json();assert(world.regions.length>=72);assert(world.geography.provinces.length>=4);assert(world.geography.rivers.length>0);
await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
await page.screenshot({path:dir+'/desktop.png'});
await page.getByRole('button',{name:'Command',exact:true}).click();const mountain=world.regions.find(r=>r.terrain==='mountains');await page.getByLabel('Inspect region').selectOption(String(mountain.id));await page.getByText(/Impassable/).first().waitFor();await page.screenshot({path:dir+'/mountains.png'});
await page.getByRole('button',{name:'Close information panel'}).click();await page.mouse.move(900,470);await page.mouse.wheel(0,-480);await page.waitForTimeout(500);await page.mouse.wheel(0,-480);await page.waitForTimeout(500);await page.mouse.wheel(0,-480);await page.waitForTimeout(500);await page.screenshot({path:dir+'/territory-detail.png'});
await page.getByRole('button',{name:'Fit continent'}).click();assert.equal(await page.getByLabel('Map zoom').textContent(),'100%');
const phone=await context.newPage({viewport:{width:390,height:844}}).catch(()=>null);
const mobile=phone??await context.newPage();await mobile.setViewportSize({width:390,height:844});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto('http://127.0.0.1:3000');await mobile.locator('.campaign-view canvas').waitFor();await mobile.getByRole('button',{name:'Close information panel'}).click();await mobile.evaluate(()=>document.fonts.ready);await mobile.screenshot({path:dir+'/mobile.png'});assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(errors.length,0,errors.join('\n'));console.log(JSON.stringify({territories:world.regions.length,mountains:world.regions.filter(r=>r.terrain==='mountains').length,provinces:world.geography.provinces.length,rivers:world.geography.rivers.length,errors}));
}finally{await browser.close();}

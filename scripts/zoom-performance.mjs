import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH});
try {
 const page = await browser.newPage({viewport:{width:1968,height:1450}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3000');
 await page.locator('select').first().selectOption('8');
 await page.getByRole('button',{name:'Begin campaign'}).click();
 await page.locator('.campaign-view canvas').waitFor();
 await page.getByRole('button',{name:'Close information panel'}).click();
 await page.waitForTimeout(750);
 const gaps = await page.evaluate(async()=>{
   const canvas=document.querySelector('canvas'); const gaps=[]; let running=true,previous=performance.now();
   const sample=now=>{gaps.push(now-previous);previous=now;if(running)requestAnimationFrame(sample)};requestAnimationFrame(sample);
   for(let i=0;i<100;i++) {canvas.dispatchEvent(new WheelEvent('wheel',{clientX:1200,clientY:650,deltaY:i<50?-12:12,bubbles:true,cancelable:true})); await new Promise(r=>setTimeout(r,16));}
   running=false;return gaps.sort((a,b)=>a-b);
 });
 await page.waitForTimeout(250);
 while(await page.getByRole('button',{name:'Zoom out',exact:true}).isEnabled())await page.getByRole('button',{name:'Zoom out',exact:true}).click();
 assert.equal(await page.getByLabel('Map zoom').textContent(),'35%');
 await page.waitForTimeout(250);
 await page.screenshot({path:'.impeccable/review/zoom-out.png'});
 await page.getByRole('button',{name:'Fit continent',exact:true}).click();
 await page.waitForTimeout(250);
 assert.equal(await page.getByLabel('Map zoom').textContent(),'100%');
 await page.screenshot({path:'.impeccable/review/zoom-fit.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
 await page.screenshot({path:'.impeccable/review/zoom-phone.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({wheelEvents:100,frames:gaps.length,medianFrameMs:gaps[Math.floor(gaps.length*.5)],p95FrameMs:gaps[Math.floor(gaps.length*.95)],maxFrameMs:gaps.at(-1),zoomRange:'35–600%',errors}));
}finally{await browser.close()}

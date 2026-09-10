import {chromium} from "@playwright/test";
import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";
const browser=await chromium.launch({executablePath:"/usr/bin/chromium",headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors:string[]=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.goto("http://127.0.0.1:5181/city-diorama.html?seed=732&case=citywide");
 await page.waitForFunction(()=>window.__cityDiorama?.testUnitState()?.units.length===4,undefined,{timeout:120000});
 await page.evaluate(()=>window.__cityDiorama!.selectTestUnit(4));
 await page.waitForTimeout(400);
 const before=await page.evaluate(()=>window.__cityDiorama!.testUnitState()!.units.find(u=>u.id===4)!);
 const p=await page.evaluate(()=>window.__cityDiorama!.projectTestPoint({x:6,z:19})!);
 await page.mouse.click(p.x,p.y,{button:"right"});
 await page.waitForTimeout(400);
 const after=await page.evaluate(()=>window.__cityDiorama!.testUnitState()!.units.find(u=>u.id===4)!);
 assert(after.moving,JSON.stringify({p,before,after,state:await page.evaluate(()=>window.__cityDiorama!.testUnitState())}));assert(Math.abs(after.angle-before.angle)>0);
 assert(Math.abs(after.angle-before.angle)<.6);
 assert(Math.hypot(after.x-before.x,after.z-before.z)<.01);
 assert(after.leftTrack*after.rightTrack<0);
 await mkdir(".impeccable/review/city-tank",{recursive:true});
 await page.screenshot({path:".impeccable/review/city-tank/pivot.png"});
 assert.deepEqual(errors,[]);console.log("City tank pivots gradually, counter-rotates tracks and does not slide sideways.");
}finally{await browser.close();}

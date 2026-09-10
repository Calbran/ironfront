import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

// Run against Vite: production does not exercise StrictMode's setup/cleanup replay.
// This only regenerates previews; it never creates a campaign or changes a save.
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH});
try {
  for (const width of [1440,390]) {
    const page = await browser.newPage({viewport:{width,height:1000}});
    const errors:string[]=[]; page.on("pageerror",e=>errors.push(e.message));
    await page.goto(process.env.DEV_TEST_URL || "http://127.0.0.1:5173");
    await page.locator("canvas").waitFor();
    await page.getByLabel("Map seed",{exact:true}).fill("Boreal");
    await page.getByText(/^Boreal · \d+ territories$/).waitFor();
    await page.getByRole("button",{name:"Generate new map",exact:true}).click();
    const seed=await page.getByLabel("Map seed",{exact:true}).inputValue();
    await page.getByText(new RegExp(`^${seed} · \\d+ territories$`)).waitFor();
    assert.equal(await page.locator("canvas").count(),1);
    await page.reload();
    await page.locator("canvas").waitFor();
    await page.waitForTimeout(300);
    assert.equal(await page.locator("canvas").count(),1);
    assert.deepEqual(errors,[]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.close();
    console.log(`${width}px: Vite mount, regeneration and reload pass without page errors`);
  }
} finally { await browser.close(); }

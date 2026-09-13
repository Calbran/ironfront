import { createMassiveCampaignPlan } from "../packages/game-core/src/massiveCampaign.ts";
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { Store, hash } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
import {
  CampaignBattlefieldStore,
  restoreCampaignPlan,
  serializeCampaignPlan,
} from "../apps/api/src/campaignBattlefieldRoutes.ts";
import {
  createCampaignPlan,
  createCampaignState,
  campaignRuntime,
  advanceCampaign,
} from "../packages/game-core/src/campaignBattlefield.ts";
import { createCountrySlice } from "../packages/game-core/src/countrySlice.ts";
import { parseOSMSample } from "../packages/game-core/src/countryOSM.ts";

const massive = process.argv.includes("--massive");
const directory = resolve(
  ".impeccable/review/" + (massive ? "massive-campaign" : "campaign-alpha"),
);
mkdirSync(directory, { recursive: true });
const generate = massive ? createMassiveCampaignPlan : createCampaignPlan;
const plan = process.env.CAMPAIGN_TEST_PLAN
  ? restoreCampaignPlan(
      JSON.parse(readFileSync(process.env.CAMPAIGN_TEST_PLAN, "utf8")),
    )
  : generate(
      createCountrySlice(
        parseOSMSample(
          JSON.parse(
            readFileSync(
              "apps/web/public/data/country-osm/painswick.json",
              "utf8",
            ),
          ),
        ),
      ),
    );
const benchmarkState = createCampaignState(plan, 0),
  runtime = campaignRuntime(plan, benchmarkState),
  ticks = [];
if (plan.campaignMap?.version === 3) {
  const metros = plan.sites.filter((s) => s.rank === "metropolis");
  assert.ok(metros.length >= 2);
  assert.ok(metros.every((s) => s.poi.buildings.length > 5000));
  for (const site of plan.sites)
    for (const b of site.poi?.buildings ?? []) {
      const x = site.x + b.x,
        z = site.z + b.z,
        i =
          Math.round(z / plan.surface.step) * plan.surface.cols +
          Math.round(x / plan.surface.step);
      assert.ok(plan.surface.land[i], `Building outside land: ${site.name}`);
    }
  assert.ok(plan.campaignMap.fields.every((f) => f.polygon?.length >= 3));
  assert.ok(plan.sites.some((s) => s.scenic));
  assert.ok(
    benchmarkState.campaign.territories.every(
      (t) => !plan.sites.find((s) => s.id === t.id)?.scenic,
    ),
  );
  console.log(
    JSON.stringify({
      worldVersion: 3,
      sites: plan.sites.length,
      connectedSites:plan.roads.connectedSites,
      roadSections:plan.roads.roads.length,
      fields: plan.campaignMap.fields.length,
      buildings: plan.sites.reduce(
        (n, s) => n + (s.poi?.buildings.length ?? 0),
        0,
      ),
      settlements: plan.sites
        .filter((s) => s.rank && s.rank !== "site")
        .map((s) => ({
          name: s.name,
          rank: s.rank,
          buildings: s.poi?.buildings.length,
          extent: s.extent,
        })),
    }),
  );
}
for (let t = 250; t <= 30000; t += 250) {
  const started = performance.now();
  advanceCampaign(
    benchmarkState,
    t,
    runtime.plan,
    runtime.nav,
    runtime.sight,
    runtime.vision,
  );
  ticks.push(performance.now() - started);
}
ticks.sort((a, b) => a - b);
const store = new Store(":memory:"),
  saves = new CampaignBattlefieldStore(store),
  key = "1".repeat(48);
store.db
  .prepare("INSERT INTO campaign_geography VALUES(?,?)")
  .run(
    plan.campaignMap?.version ?? 1,
    JSON.stringify(serializeCampaignPlan(plan)),
  );
saves.create(key, createCampaignState(plan, Date.now()));
const app = await makeServer(store);
await app.listen({ host: "127.0.0.1", port: 3193 });
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ?? (existsSync(chrome) ? chrome : undefined),
});
const deviceScaleFactor = Number(process.env.CAMPAIGN_TEST_DPR ?? 1),
  page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor,
  }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.stack ?? e.message));
async function current() {
  const r = await app.inject({
    url: "/api/battlefield/state",
    headers: { authorization: "Bearer " + key },
  });
  assert.equal(r.statusCode, 200);
  return r.json();
}
const sampleFrames = (duration = 4000) =>
  page.evaluate(
    (sampleDuration) =>
      new Promise((resolve) => {
        const times = [],
          start = performance.now();
        let last = start;
        function tick(t) {
          times.push(t - last);
          last = t;
          if (t - start < sampleDuration) requestAnimationFrame(tick);
          else {
            times.sort((a, b) => a - b);
            resolve({
              frames: times.length,
              medianMs: times[Math.floor(times.length * 0.5)],
              p95Ms: times[Math.floor(times.length * 0.95)],
            });
          }
        }
        requestAnimationFrame(tick);
      }),
    duration,
  );
let overviewFrame, overviewStats, metropolisFrame;
try {
  await page.addInitScript(
    (key) => localStorage.setItem("ironfront-campaign-alpha-v1", key),
    key,
  );
  await page.goto("http://127.0.0.1:3193/");
  await page
    .locator('canvas[aria-label="Persistent campaign battlefield"]')
    .waitFor({ timeout: 120000 });
  await page
    .getByRole("button", { name: /1st Meridian Rifles/ })
    .waitFor({ timeout: 120000 });
  if (plan.campaignMap) {
    await page.waitForTimeout(800);
    overviewFrame = await sampleFrames(4000);
    const campaignCanvas = page.locator(
      'canvas[aria-label="Persistent campaign battlefield"]',
    );
    overviewStats = await campaignCanvas.evaluate((canvas) => ({
      ...canvas.parentElement.dataset,
    }));
    await page.screenshot({ path: directory + "/initial-overview.png" });
    const visibleLabel = page.locator(".slice-site-label:visible").first(),
      labelBounds = await visibleLabel.boundingBox(),
      distanceBeforeLabelWheel = Number(overviewStats.cameraDistance);
    assert.ok(labelBounds, "Overview needs a visible settlement label");
    await page.mouse.move(
      labelBounds.x + labelBounds.width / 2,
      labelBounds.y + labelBounds.height / 2,
    );
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(250);
    const distanceAfterLabelWheel = Number(
      await campaignCanvas.evaluate(
        (canvas) => canvas.parentElement.dataset.cameraDistance,
      ),
    );
    assert.ok(
      distanceAfterLabelWheel < distanceBeforeLabelWheel,
      "Wheel input over settlement labels must zoom the campaign camera",
    );
    if (plan.campaignMap.version === 3) {
      const metro = plan.sites.find((s) => s.rank === "metropolis");
      await page.getByRole("button", { name: "Places", exact: true }).click();
      await page
        .getByRole("textbox", { name: "Find a place" })
        .fill(metro.name);
      await page.locator(".alpha-panel .alpha-territory").first().click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: directory + "/metropolis-region.png" });
      await page.mouse.move(800, 490);
      for (let zoom = 0; zoom < 16; zoom++) {
        await page.mouse.wheel(0, 900);
        await page.waitForTimeout(100);
        if (
          Number(
            await campaignCanvas.evaluate(
              (c) => c.parentElement.dataset.cameraDistance,
            ),
          ) < 500
        )
          break;
      }
      await page.waitForTimeout(1000);
      await page.screenshot({ path: directory + "/metropolis-detail.png" });
      metropolisFrame = await sampleFrames();
    }
    await page.getByRole("button", { name: /1st Meridian Rifles/ }).dblclick();
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: directory + "/city.png" });
  const before = await current();
  const movement = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/battlefield/command") &&
      r.request().method() === "POST",
  );
  await page.mouse.click(805, 590, { button: "right" });
  const moved = await movement;
  assert.equal(moved.status(), 200, await moved.text());
  await page.waitForTimeout(2200);
  const after = await current();
  assert.ok(
    Math.hypot(
      after.units[0].x - before.units[0].x,
      after.units[0].z - before.units[0].z,
    ) > 0.1,
    "Right-click movement must reach authority and animate forward",
  );
  await page
    .getByRole("button", { name: "Hold position", exact: true })
    .click();
  await page.getByRole("button", { name: "Build", exact: true }).click();
  let built = false;
  for (const [x, y] of [
    [815, 417],
    [770, 390],
    [850, 395],
    [760, 570],
  ]) {
    const buildButton = page.getByRole("button", {
      name: /Sandbags 10 supplies/,
    });
    if ((await buildButton.getAttribute("aria-pressed")) !== "true")
      await buildButton.click();
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/battlefield/command") &&
        r.request().postDataJSON()?.action === "build",
    );
    await page.mouse.click(x, y, { button: "right" });
    if ((await response).status() === 200) {
      built = true;
      break;
    }
  }
  assert.ok(built, "UI must place physical sandbags near the player infantry");
  await page.waitForTimeout(500);
  await page.screenshot({ path: directory + "/construction.png" });
  await page.getByRole("button", { name: "Close panel", exact: true }).click();
  const frame = await sampleFrames();
  await page.getByRole("button", { name: "Whole map", exact: true }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: directory + "/overview.png" });
  await page.getByRole("button", { name: /Northfield Rifles/ }).dblclick();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: directory + "/northfield.png" });
  await page.reload();
  await page
    .getByRole("button", { name: /1st Meridian Rifles/ })
    .waitFor({ timeout: 120000 });
  const restored = await current();
  assert.equal(restored.sandbags.length, 1);
  assert.equal(restored.encounter, undefined);
  assert.ok(restored.battlefield.elapsed > after.battlefield.elapsed);
  await page.setViewportSize({ width: 800, height: 900 });
  await page.waitForTimeout(500);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({ path: directory + "/compact.png" });
  const sharedChecks = { country: false, poi: false, city: false };
  if (process.argv.includes("--shared")) {
    await page.close();
    for(const [name,path] of [['country','country-slice.html'],['poi','country-poi.html'],['city','city-diorama.html']]){
      // Each uncached preview loads many assets through the production IP limiter.
      console.log(`Checking shared ${name} after the request-limit window resets`);
      await new Promise(resolve => setTimeout(resolve, 60000));
      const review=await browser.newPage({viewport:{width:1400,height:950}});
      review.on('pageerror',e=>errors.push(`${name}: ${e.message}`));
      review.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))errors.push(`${name}: ${r.status()} ${r.url()}`);});
      try{
        await review.goto(`http://127.0.0.1:3193/${path}`);
        if(name==='country')await review.locator('canvas[aria-label="Playable country sector"]').waitFor({timeout:120000});
        else if(name==='poi'){
          await review.getByLabel('Layout source').selectOption('campaign-city');
          await review.waitForFunction(()=>document.querySelector('#stats')?.textContent.includes('buildings'));
        }else await review.waitForFunction(()=>!!window.__cityDiorama,undefined,{timeout:120000});
        await review.waitForTimeout(700);await review.screenshot({path:directory+`/shared-${name}.png`});sharedChecks[name]=true;
      }catch(e){await review.screenshot({path:directory+`/shared-${name}-failure.png`}).catch(()=>{});throw e;}
      finally{await review.close();}
    }
  }
  const result = {
    errors,
    frame,
    overviewFrame,
    metropolisFrame,
    overviewStats,
    deviceScaleFactor,
    sharedChecks,
    server: {
      ticks: ticks.length,
      medianMs: ticks[Math.floor(ticks.length * 0.5)],
      p95Ms: ticks[Math.floor(ticks.length * 0.95)],
      maxMs: ticks.at(-1),
    },
    checks: {
      rightClickMove: true,
      physicalBuild: true,
      reload: true,
      hiddenEnemies: saves
        .read(hash(key))
        .units.some(
          (u) =>
            u.enemy &&
            u.health !== 0 &&
            !restored.units.some((v) => v.id === u.id),
        ),
      labelWheelZoom: true,
    },
    scope:
      "Local headless Chrome, one 64-individual campaign, four-second overview and close-city frame samples, and 30 seconds of authoritative ticks. Not a sustained load or unit-ceiling benchmark.",
  };
  console.log(JSON.stringify(result));
  writeFileSync(directory + "/results.json", JSON.stringify(result, null, 2));
  assert.equal(errors.length, 0);
  assert.ok(
    result.checks.hiddenEnemies,
    "Unseen surviving enemy formations remain undisclosed",
  );
} catch (e) {
  console.log(JSON.stringify({errors}));
  await page.screenshot({ path: directory + "/failure.png" }).catch(() => {});
  throw e;
} finally {
  await browser.close();
  await app.close();
  store.close();
}

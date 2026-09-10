import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
import { createWorld } from "../packages/game-core/src/index.ts";
import { syncSquads } from "../packages/game-core/src/tactics.ts";
import { onLocalLand } from "../packages/game-core/src/localMovement.ts";
const w = createWorld("CITYVIEW", "Boreal", 4, 3600000, Date.now());
syncSquads(w);
const unit = w.tactics!.squads.find(
  (s) => s.owner === 0 && s.kind === "infantry",
)!;
const region = w.regions[unit.region];
const spot = Array.from({ length: 24 }, (_, i) => ({
  x: unit.x + 500 * Math.cos((i * Math.PI) / 12),
  y: unit.y + 500 * Math.sin((i * Math.PI) / 12),
})).find((p) => onLocalLand(region, p))!;
assert(spot);
region.features!.push({
  id: "browser-town",
  name: "Brasswick",
  kind: "settlement",
  size: "city",
  ...spot,
});
const store = new Store(":memory:");

const app = await makeServer(store);
await app.listen({ host: "127.0.0.1", port: 3122 });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
try {
  for (const width of [1440, 390]) {
    const fixture = structuredClone(w);
    fixture.id = `CITYVIEW${width}`;
    store.create(fixture, `city-browser-${width}`);
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((token) =>
      localStorage.setItem("warfare-session", token), `city-browser-${width}`
    );
    await page.goto("http://127.0.0.1:3122");
    await page.locator(".campaign-view canvas").waitFor();
    await page.locator('.map-canvas[data-settlement-icons="ready"]').waitFor({timeout:60000});
    await page.locator('.map-canvas[data-ocean-texture="ready"][data-biome-textures="ready"]').waitFor({timeout:60000});
    await page.waitForTimeout(700);
    await page.screenshot({
      path: `.impeccable/review/terrain-opening-${width}.png`,
    });
    const point = async (p: { x: number; y: number }) =>
      page.locator(".map-canvas").evaluate((el, p) => {
        const b = el.getBoundingClientRect();
        return {
          x:
            b.x +
            Number(el.getAttribute("data-camera-x")) +
            p.x * Number(el.getAttribute("data-camera-scale")),
          y:
            b.y +
            Number(el.getAttribute("data-camera-y")) +
            p.y * Number(el.getAttribute("data-camera-scale")),
        };
      }, p);
    // Center the town/unit pair, preserving the current zoom.
    const midpoint = await point({
      x: (unit.x + spot.x) / 2,
      y: (unit.y + spot.y) / 2,
    });
    await page.mouse.move(width / 2, 400);
    await page.mouse.down({ button: "middle" });
    await page.mouse.move(width - midpoint.x, 800 - midpoint.y, { steps: 8 });
    await page.mouse.up({ button: "middle" });
    await page.waitForTimeout(700);
    if (width < 700) {
      await page.mouse.move(width / 2, 400);
      for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(100); }
    }
    let at = await point(unit);
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(700);
    at = await point(spot);
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(700);
    await page.screenshot({path: `.impeccable/review/city-click-${width}.png`});
    assert.match(
      await page.locator(".current-selection").innerText(),
      /Brasswick/,
    );
    const response = page.waitForResponse((r) =>
      r.url().endsWith("/api/command"),
    );
    await page.getByRole("button", { name: "Garrison", exact: true }).click();
    assert.equal((await response).status(), 200);
    await page.screenshot({
      path: `.impeccable/review/settlement-${width}.png`,
    });
    at = await point(spot);
    await page.mouse.move(at.x, at.y);
    for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(100); }
    await page.screenshot({path: `.impeccable/review/settlement-detail-${width}.png`});
    await page.getByRole("button", {name: "Fit continent", exact: true}).click();
    await page.screenshot({path: `.impeccable/review/settlement-overview-${width}.png`});
    assert.deepEqual(errors, []);
    await page.close();
    console.log(
      `${width}: clickable settlement, retained squad selection, authorized Garrison passed`,
    );
  }
} finally {
  await browser.close();
  await app.close();
  store.close();
}

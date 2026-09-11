import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
import { createWorld } from "../packages/game-core/src/index.ts";

const seeds = ["Boreal", "Ironfront", "Meridian"];
const store = new Store(":memory:");
const app = await makeServer(store);
await app.listen({ host: "127.0.0.1", port: 3123 });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});

try {
  for (const seed of seeds) {
    const world = createWorld(
      `LANDSCAPE-${seed}`,
      seed,
      4,
      3_600_000,
      Date.now(),
    );
    const token = `landscape-browser-${seed}`;
    store.create(world, token);
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(
      ({ token }) => localStorage.setItem("warfare-session", token),
      { token },
    );
    await page.goto("http://127.0.0.1:3123");
    const map = page.locator(".map-canvas");
    await map.locator("canvas").waitFor();
    await page
      .locator('.map-canvas[data-settlement-art="ready"][data-field-parcels]')
      .waitFor({ timeout: 60_000 });
    const fieldCount = Number(await map.getAttribute("data-field-parcels"));
    assert(fieldCount > 0, `${seed}: expected generated field parcels`);
    const focus = JSON.parse((await map.getAttribute("data-field-focus"))!);
    const screen = await map.evaluate((element, point) => {
      const box = element.getBoundingClientRect();
      return {
        x:
          box.x +
          Number(element.getAttribute("data-camera-x")) +
          point.x * Number(element.getAttribute("data-camera-scale")),
        y:
          box.y +
          Number(element.getAttribute("data-camera-y")) +
          point.y * Number(element.getAttribute("data-camera-scale")),
      };
    }, focus);
    const start = { x: 720, y: 430 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down({ button: "middle" });
    await page.mouse.move(
      start.x + (720 - screen.x),
      start.y + (430 - screen.y),
      { steps: 8 },
    );
    await page.mouse.up({ button: "middle" });
    await page.mouse.move(720, 430);
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `.impeccable/review/landscape-${seed.toLowerCase()}.png`,
    });
    assert.deepEqual(errors, []);
    const passableArea = world.regions
      .filter((region) => region.terrain !== "mountains")
      .reduce((sum, region) => sum + region.area, 0);
    const farmArea = world.regions
      .filter((region) => region.landUse === "agricultural")
      .reduce((sum, region) => sum + region.area, 0);
    console.log(
      `${seed}: ${fieldCount} fields, ${(farmArea / passableArea).toFixed(3)} farmland ratio, no page errors`,
    );
    await page.close();
  }
} finally {
  await browser.close();
  await app.close();
  store.close();
}

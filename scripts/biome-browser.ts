import { generateCityRoads } from "../packages/game-core/src/cityRoads.ts";
import { generateTerrainAccents } from "../packages/game-core/src/terrainAccents.ts";
import { generateCityLayout } from "../packages/game-core/src/cityLayout.ts";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
import { createWorld } from "../packages/game-core/src/index.ts";
import { generateBiomeScenery } from "../packages/game-core/src/biomeScenery.ts";
const world = createWorld("TEXTURES", "Boreal", 4, 3600000, Date.now());
const grove =
  process.env.SCENERY_FOCUS === "accents"
    ? generateTerrainAccents(
        world,
        world.regions.flatMap((r) =>
          (r.features ?? [])
            .filter((f) => f.kind === "settlement")
            .map((f) => ({
              ...f,
              region: r.id,
              layout: generateCityLayout(world, r, f),
            })),
        ),
        generateCityRoads(world),
      ).lines.find((l) => l.kind === "utility")!.points[0]
    : generateBiomeScenery(world).find(
        (p) =>
          p.kind ===
          (process.env.SCENERY_FOCUS === "mountains" ? "rock" : "tree"),
      )!;
const store = new Store(":memory:");
store.create(world, "texture-browser");
const app = await makeServer(store);
await app.listen({ host: "127.0.0.1", port: 3124 });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() =>
      localStorage.setItem("warfare-session", "texture-browser"),
    );
    await page.addInitScript(`
      window.__previousMapFrame = performance.now();
      window.__mapLongTasks = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          window.__mapLongTasks.push({
            start: entry.startTime,
            duration: entry.duration,
          });
      }).observe({ entryTypes: ["longtask"] });
      function trackMapFrame(now) {
        window.__maxMapFrameGap = Math.max(
          window.__maxMapFrameGap || 0,
          now - window.__previousMapFrame,
        );
        window.__previousMapFrame = now;
        requestAnimationFrame(trackMapFrame);
      }
      requestAnimationFrame(trackMapFrame);
    `);
    await page.goto("http://127.0.0.1:3124");
    await page.locator(".map-canvas canvas").waitFor();
    await page.evaluate(() => {
      (
        window as typeof window & {
          __maxMapFrameGap?: number;
          __previousMapFrame?: number;
        }
      ).__maxMapFrameGap = 0;
      (
        window as typeof window & { __previousMapFrame?: number }
      ).__previousMapFrame = performance.now();
    });
    await page.locator('[data-biome-textures="ready"]').waitFor();
    await page.locator("[data-biome-sprites]").waitFor();
    const spriteCount = Number(
      await page.locator(".map-canvas").getAttribute("data-biome-sprites"),
    );
    assert(spriteCount > 100 && spriteCount < 18000);
    await page.locator("[data-city-roads]").waitFor();
    assert(
      Number(
        await page.locator(".map-canvas").getAttribute("data-city-roads"),
      ) > 0,
    );
    await page.locator("[data-terrain-accents]").waitFor();
    assert(
      Number(
        await page.locator(".map-canvas").getAttribute("data-field-parcels"),
      ) > 10,
    );
    assert(
      Number(
        await page.locator(".map-canvas").getAttribute("data-terrain-accents"),
      ) > 100,
    );
    assert(
      Number(
        await page.locator(".map-canvas").getAttribute("data-utility-lines"),
      ) > 0,
    );
    const maxFrameGap = await page.evaluate(
      () =>
        (window as typeof window & { __maxMapFrameGap?: number })
          .__maxMapFrameGap ?? 0,
    );
    const attachmentTimes = await page
      .locator(".map-canvas")
      .evaluate((el) =>
        ["terrain", "scenery", "ground"].map((name) =>
          el.getAttribute(`data-${name}-attach-ms`),
        ),
      );
    const bakeTimes = await page
      .locator(".map-canvas")
      .getAttribute("data-ground-bake-ms");
    const uploadTimes = await page
      .locator(".map-canvas")
      .getAttribute("data-ground-upload-ms");
    const overlayTime = await page
      .locator(".map-canvas")
      .getAttribute("data-overlay-render-ms");
    const longTasks = await page.evaluate(
      () =>
        (
          window as typeof window & {
            __mapLongTasks?: { start: number; duration: number }[];
          }
        ).__mapLongTasks ?? [],
    );
    assert(
      maxFrameGap < 2500,
      `map blocked animation for ${maxFrameGap}ms; long tasks ${JSON.stringify(longTasks)}; overlay ms ${overlayTime}; attachment ms ${attachmentTimes.join(", ")}; bake ms ${bakeTimes}; upload ms ${uploadTimes}`,
    );
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `.impeccable/review/biomes-map-${width}.png`,
    });
    const target = await page.locator(".map-canvas").evaluate((el, p) => {
      const box = el.getBoundingClientRect(),
        scale = Number(el.getAttribute("data-camera-scale"));
      return {
        x: box.x + Number(el.getAttribute("data-camera-x")) + p.x * scale,
        y: box.y + Number(el.getAttribute("data-camera-y")) + p.y * scale,
      };
    }, grove);
    await page.mouse.move(width / 2, 450);
    await page.mouse.down({ button: "middle" });
    await page.mouse.move(width - target.x, 900 - target.y, { steps: 10 });
    await page.mouse.up({ button: "middle" });
    for (let i = 0; i < 5; i++)
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.waitForTimeout(700);
    await page.screenshot({
      path: `.impeccable/review/biomes-detail-${width}.png`,
    });
    const mode = page.getByRole("button", {
      name: "Strategy view",
      exact: true,
    });
    const camera = () =>
      page
        .locator(".map-canvas")
        .evaluate((el) =>
          ["data-camera-x", "data-camera-y", "data-camera-scale"].map((name) =>
            el.getAttribute(name),
          ),
        );
    const beforeMode = await camera();
    assert.equal(await mode.getAttribute("aria-pressed"), "false");
    await mode.click();
    assert.equal(await mode.getAttribute("aria-pressed"), "true");
    assert.deepEqual(
      await camera(),
      beforeMode,
      "mode switch preserves viewport",
    );
    await page.waitForTimeout(200);
    await page.screenshot({
      path: `.impeccable/review/strategy-toggle-${width}.png`,
    });
    await page.getByRole("button", { name: "Zoom out", exact: true }).click();
    assert.equal(
      await mode.getAttribute("aria-pressed"),
      "true",
      "zoom preserves map mode",
    );
    const beforeTerrain = await camera();
    await mode.click();
    assert.equal(await mode.getAttribute("aria-pressed"), "false");
    assert.deepEqual(await camera(), beforeTerrain);
    await page
      .getByRole("button", { name: "Fit continent", exact: true })
      .click();
    await page.waitForTimeout(300);
    assert.equal(
      await mode.getAttribute("aria-pressed"),
      "false",
      "Fit preserves terrain mode",
    );
    assert.deepEqual(errors, []);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    if (width === 1440) {
      await page.goto("http://127.0.0.1:3124/art/biomes/preview.html");
      await page.locator("img").last().waitFor();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: ".impeccable/review/biome-patterns.png",
        fullPage: true,
      });
    }
    await page.close();
    console.log(
      `${width}: biome textures and seeded scenery loaded, max frame gap ${maxFrameGap.toFixed(1)}ms, zoom/Fit and rendering passed`,
    );
  }
} finally {
  await browser.close();
  await app.close();
  store.close();
}

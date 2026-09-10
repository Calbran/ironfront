import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
import { createWorld } from "../packages/game-core/src/index.ts";
import { syncSquads } from "../packages/game-core/src/tactics.ts";
import { mkdirSync } from "node:fs";
const w = createWorld("STARTER", "Boreal", 4, 3600000, Date.now());
syncSquads(w);
const store = new Store(":memory:");
store.create(w, "starter-browser");
const app = await makeServer(store);
await app.listen({ host: "127.0.0.1", port: 3118 });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
mkdirSync(".impeccable/review", { recursive: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } }),
      errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() =>
      localStorage.setItem("warfare-session", "starter-browser"),
    );
    await page.goto("http://127.0.0.1:3118");
    await page.locator(".campaign-view canvas").waitFor();
    await page
      .getByRole("button", { name: "Close information panel", exact: true })
      .click();
    const r = w.regions[w.nations[0].capital],
      points = w.regions.flatMap((r) => r.polygon);
    const minX = Math.min(...points.map((p) => p[0])),
      maxX = Math.max(...points.map((p) => p[0]));
    const minY = Math.min(...points.map((p) => p[1])),
      maxY = Math.max(...points.map((p) => p[1]));
    const scale = Math.min(
      (width - (width > 800 ? 380 : 48)) / (maxX - minX),
      860 / (maxY - minY),
    );
    const x =
      width / 2 + (width > 800 ? 170 : 0) + (r.x - (minX + maxX) / 2) * scale;
    const y = 500 + (r.y - (minY + maxY) / 2) * scale;
    await page.mouse.move(x, y);
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(400);
    const zoom =
      Number(
        (await page.getByLabel("Map zoom").textContent())!.replace("%", ""),
      ) / 100;
    const cameraX = Number(
      await page.locator(".map-canvas").getAttribute("data-camera-x"),
    );
    const cameraY = Number(
      await page.locator(".map-canvas").getAttribute("data-camera-y"),
    );
    await page.screenshot({
      path: `.impeccable/review/starting-roster-before-${width}.png`,
    });
    const squad = w.tactics!.squads.find(
      (s) => s.owner === 0 && s.kind === "infantry",
    )!;
    await page.mouse.click(
      squad.x * scale * zoom + cameraX,
      squad.y * scale * zoom + cameraY,
    );
    await page.locator(".squad-orders").waitFor();
    assert.match(
      (await page.locator(".squad-orders").textContent()) ?? "",
      /6 soldiers/,
    );
    await page
      .getByRole("button", { name: "Close information panel", exact: true })
      .click();
    await page.screenshot({
      path: `.impeccable/review/starting-roster-${width}.png`,
    });
    assert.deepEqual(errors, []);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.close();
    console.log(
      `${width}px: fresh 6/6/2 roster, squad inspector, zoom and no errors/overflow`,
    );
  }
} finally {
  await browser.close();
  await app.close();
  store.close();
}

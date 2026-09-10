import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
import { createWorld } from "../packages/game-core/src/index.ts";
import { onLocalLand } from "../packages/game-core/src/localMovement.ts";
import { syncSquads } from "../packages/game-core/src/tactics.ts";
import { mkdirSync } from "node:fs";
const w = createWorld("STARTER", "Boreal", 4, 3600000, Date.now());
syncSquads(w);
const capital = w.regions[w.nations[0].capital];
const deployment = Array.from({ length: 48 }, (_, i) => {
  const angle = (i / 48) * Math.PI * 2;
  return {
    x: capital.x + Math.cos(angle) * 25,
    y: capital.y + Math.sin(angle) * 25,
  };
}).find((point) => onLocalLand(capital, point));
assert(deployment);
for (const squad of w.tactics!.squads.filter((s) => s.owner === 0)) {
  squad.x = deployment.x;
  squad.y = deployment.y;
  squad.previousX = deployment.x;
  squad.previousY = deployment.y;
}
const store = new Store(":memory:");
store.create(w, "starter-browser");
const app = await makeServer(store);
await app.listen({ host: "127.0.0.1", port: 3119 });
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
    await page.goto("http://127.0.0.1:3119");
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
    await page.waitForTimeout(400);
    const zoom =
      Number(
        (await page.getByLabel("Map zoom").textContent())!.replace("%", ""),
      ) / 100;
    const canvasBox = await page.locator(".map-canvas canvas").boundingBox();
    const cameraX =
      canvasBox!.x +
      Number(await page.locator(".map-canvas").getAttribute("data-camera-x"));
    const cameraY =
      canvasBox!.y +
      Number(await page.locator(".map-canvas").getAttribute("data-camera-y"));
    await page.screenshot({
      path: `.impeccable/review/group-orders-before-${width}.png`,
    });
    const actualScale = Number(
      await page.locator(".map-canvas").getAttribute("data-camera-scale"),
    );
    const own = w.tactics!.squads.filter((s) => s.owner === 0);
    const left = Math.min(...own.map((s) => s.x)) * actualScale + cameraX - 14;
    const right = Math.max(...own.map((s) => s.x)) * actualScale + cameraX + 14;
    const top = Math.min(...own.map((s) => s.y)) * actualScale + cameraY - 14;
    const bottom =
      Math.max(...own.map((s) => s.y)) * actualScale + cameraY + 14;
    await page.mouse.move(left, top);
    await page.mouse.down();
    await page.mouse.move(right, bottom, { steps: 12 });
    await page.mouse.up();
    await page.screenshot({
      path: `.impeccable/review/group-selection-debug-${width}.png`,
    });
    await page
      .getByRole("region", { name: "Selected squads", exact: true })
      .waitFor();
    assert.equal(await page.locator(".selected-squad-card").count(), 3);
    const response = page.waitForResponse((res) =>
      res.url().endsWith("/api/command"),
    );
    await page.mouse.click(
      (r.x - 25) * actualScale + cameraX,
      (r.y - 35) * actualScale + cameraY,
      { button: "right" },
    );
    const result = await response;
    assert.equal(result.status(), 200, await result.text());
    await page.getByText(/3 move orders active/).waitFor();
    const commanded = store
      .get(w.id)!
      .tactics!.squads.filter((s) => s.owner === 0);
    assert(commanded.every((s) => s.localOrder?.path.length));
    assert.equal(
      new Set(commanded.map((s) => s.localOrder!.movementGroup)).size,
      1,
    );
    assert.equal(
      new Set(
        commanded.map((s) => {
          const point = s.localOrder!.waypoints[0];
          return `${point.x},${point.y}`;
        }),
      ).size,
      3,
    );
    await page.screenshot({
      path: `.impeccable/review/group-orders-${width}.png`,
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
      `${width}px: drag-selected 3 cards, right-click accepted for all squads, group pace and no errors/overflow`,
    );
  }
} finally {
  await browser.close();
  await app.close();
  store.close();
}

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
const ownSquad = w.tactics!.squads.find((s) => s.owner === 0)!;
const home = w.regions[ownSquad.region];
const destination = [250, 180, 120]
  .flatMap((radius) =>
    Array.from({ length: 16 }, (_, i) => ({
      x: home.x + Math.cos((i * Math.PI) / 8) * radius,
      y: home.y + Math.sin((i * Math.PI) / 8) * radius,
    })),
  )
  .find((p) => onLocalLand(home, p))!;
assert(destination);
Object.assign(ownSquad, destination, {
  previousX: destination.x,
  previousY: destination.y,
  independent: true,
});
// Neutral defenders must remain visually distinct from hostile nation troops.
w.tactics!.squads.push({...ownSquad, id: `garrison-${ownSquad.region}`, army: null,
  owner: null, kind: "garrison", x: ownSquad.x + 30, previousX: ownSquad.x + 30, unitCount: 3});
const store = new Store(":memory:");
store.create(w, "starter-browser");
const app = await makeServer(store);
await app.listen({ host: "127.0.0.1", port: 3120 });
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
    await page.goto("http://127.0.0.1:3120");
    await page.locator(".campaign-view canvas").waitFor();
    await page
      .getByRole("button", { name: "Close information panel", exact: true })
      .click();
    for (const detailed of [false, true]) {
      const canvas = page.locator(".map-canvas");
      const box = (await canvas.locator("canvas").boundingBox())!;
      const x = Number(await canvas.getAttribute("data-camera-x")) + box.x;
      const y = Number(await canvas.getAttribute("data-camera-y")) + box.y;
      const scale = Number(await canvas.getAttribute("data-camera-scale"));
      const px = destination.x * scale + x,
        py = destination.y * scale + y;
      await page.mouse.click(px, py);
      await page.getByText("Infantry squad", { exact: true }).first().waitFor();
      assert.match(
        await page.locator(".current-selection").innerText(),
        /Infantry squad/,
      );
      assert.equal(await page.getByLabel("Selected squad health", {exact: true}).getAttribute("value"), "100");
      assert.equal(await page.getByLabel("Selected squad morale", {exact: true}).getAttribute("value"), "100");
      await page.screenshot({
        path: `.impeccable/review/overview-position-${width}-${detailed}.png`,
      });
      await page
        .getByRole("button", { name: "Close information panel", exact: true })
        .click();
      if (!detailed) {
        await page.mouse.move(px, py);
        for (let i = 0; i < 4; i++) {
          await page.mouse.wheel(0, -120);
          await page.waitForTimeout(80);
        }
      }
    }
    assert.deepEqual(errors, []);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.close();
    console.log(
      `${width}px: overview and detail select the same squad away from its territory center; no errors/overflow`,
    );
  }
} finally {
  await browser.close();
  await app.close();
  store.close();
}

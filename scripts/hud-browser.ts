import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
import { createWorld } from "../packages/game-core/src/index.ts";
import { syncSquads } from "../packages/game-core/src/tactics.ts";
import { mkdirSync } from "node:fs";
const w = createWorld("HUD", "Boreal", 4, 3600000, Date.now());
syncSquads(w);
const store = new Store(":memory:");
store.create(w, "hud-browser");
const app = await makeServer(store);
await app.listen({ host: "127.0.0.1", port: 3119 });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
mkdirSync(".impeccable/review", { recursive: true });
try {
  for (const width of [1440, 900, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() =>
      localStorage.setItem("warfare-session", "hud-browser"),
    );
    await page.goto("http://127.0.0.1:3119");
    const resources = page.getByRole("definition");
    await page.locator(".hud-resources").waitFor();
    const bar = await page.locator(".hud-resources").boundingBox();
    assert(bar && bar.y < 60);
    const dock = await page
      .getByRole("complementary", { name: "Command information" })
      .boundingBox();
    assert(dock && dock.y >= 550 && dock.y + dock.height === 1000);
    const canvas = await page.locator(".campaign-view canvas").boundingBox();
    assert(canvas && canvas.y + canvas.height <= dock.y + 1);
    await page
      .getByRole("button", { name: /Infantry.*health/ })
      .first()
      .click();
    await page.getByLabel("Selected squad health", { exact: true }).waitFor();
    await page.locator(".squad-controls").scrollIntoViewIfNeeded();
    let response = page.waitForResponse((r) =>
      r.url().endsWith("/api/command"),
    );
    await page
      .getByRole("button", { name: "Hold position", exact: true })
      .click();
    assert.equal((await response).status(), 200);
    await page
      .locator(".selection-content")
      .evaluate((el) => (el.scrollTop = 0));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `.impeccable/review/hud-${width}.png` });
    await page.getByRole("button", { name: "Nation", exact: true }).click();
    assert(await page.locator(".hud-resources").isVisible());
    await page.getByRole("button", { name: "Dispatches", exact: true }).click();
    await page.locator(".dispatch-list").waitFor();
    await page.getByRole("button", { name: "Session", exact: true }).click();
    await page.getByLabel("Private session key").waitFor();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page
      .getByRole("button", { name: "Close information panel", exact: true })
      .click();
    await page.getByRole("button", { name: /Open command/ }).click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    await page.close();
    console.log(
      `${width}px: resources, bottom dock, squad selection/Hold, tabs, session and collapse passed`,
    );
  }
} finally {
  await browser.close();
  await app.close();
  store.close();
}

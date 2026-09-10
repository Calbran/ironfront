import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
import { generateContinent } from "../packages/game-core/src/geography.ts";
import { mkdirSync } from "node:fs";
const store = new Store(":memory:"),
  app = await makeServer(store);
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
    await page.goto("http://127.0.0.1:3120");
    await page.getByLabel("Map seed", { exact: true }).fill("Boreal");
    await page.getByText("Boreal · 96 territories", { exact: true }).waitFor();
    await page
      .getByText("World size: 14,400 × 9,600 · 4 nations", { exact: true })
      .waitFor();
    await page.getByLabel(/^Nations/).selectOption("8");
    await page.getByText("Boreal · 192 territories", { exact: true }).waitFor();
    await page
      .getByText("World size: 20,376 × 13,584 · 8 nations", { exact: true })
      .waitFor();
    await page.getByLabel(/^Nations/).selectOption("4");
    await page.getByText("Boreal · 96 territories", { exact: true }).waitFor();
    await page.screenshot({
      path: `.impeccable/review/grand-preview-${width}.png`,
    });
    await page.getByLabel("Campaign pace").selectOption("normal");
    await page
      .getByRole("button", { name: "Begin campaign", exact: true })
      .click();
    await page.locator(".campaign-view canvas").waitFor();
    const saved = await page.evaluate(async () => {
      const r = await fetch("/api/world", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("warfare-session")}`,
        },
      });
      const { world } = await r.json();
      return { geography: world.geography, count: world.regions.length };
    });
    assert.deepEqual(saved.geography, generateContinent("Boreal", 4).geography);
    assert.equal(saved.count, 96);
    for (let i = 0; i < 7; i++)
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    assert.equal(await page.getByLabel("Map zoom").textContent(), "1200%");
    await page
      .getByRole("button", { name: "Fit continent", exact: true })
      .click();
    await page.waitForTimeout(250);
    assert.equal(await page.getByLabel("Map zoom").textContent(), "100%");
    await page.screenshot({
      path: `.impeccable/review/grand-map-${width}.png`,
    });
    assert.deepEqual(errors, []);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    console.log(
      `${width}px: larger preview, expanded territory counts, matching campaign, 1200% zoom and Fit passed`,
    );
    await page.close();
  }
} finally {
  await browser.close();
  await app.close();
  store.close();
}

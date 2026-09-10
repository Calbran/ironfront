import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { createWorld } from "../packages/game-core/src/index.ts";

const url = process.env.LOBBY_TEST_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
mkdirSync(".impeccable/review", { recursive: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    await page.locator("canvas").waitFor();
    await page
      .getByText(
        `${await page.getByLabel("Map seed", { exact: true }).inputValue()} · 32 territories`,
        { exact: true },
      )
      .waitFor();
    await page.getByLabel("Map seed", { exact: true }).fill("Boreal");
    await page.getByText("Boreal · 32 territories", { exact: true }).waitFor();
    await page
      .getByText("World size: 2,400 × 1,600 · 4 nations", { exact: true })
      .waitFor();
    await page.getByLabel(/^Nations/).selectOption("2");
    await page.getByText("Boreal · 16 territories", { exact: true }).waitFor();
    await page
      .getByText("World size: 1,696 × 1,128 · 2 nations", { exact: true })
      .waitFor();
    await page.getByLabel(/^Nations/).selectOption("8");
    await page.getByText("Boreal · 64 territories", { exact: true }).waitFor();
    await page
      .getByText("World size: 3,392 × 2,264 · 8 nations", { exact: true })
      .waitFor();
    await page.getByLabel(/^Nations/).selectOption("6");
    await page.getByText("Boreal · 48 territories", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Generate new map", exact: true })
      .click();
    const seed = await page
      .getByLabel("Map seed", { exact: true })
      .inputValue();
    assert.match(seed, /^Map-[a-f0-9]{8}$/);
    await page.getByText(`${seed} · 48 territories`, { exact: true }).waitFor();
    await page.locator("canvas").waitFor();
    await page.getByLabel("Campaign pace").selectOption("normal");
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `.impeccable/review/lobby-clean-${width}.png`,
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page
      .getByRole("button", { name: "Begin campaign", exact: true })
      .click();
    await page.locator(".campaign-view canvas").waitFor();
    const world = await page.evaluate(async () => {
      const response = await fetch("/api/world", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("warfare-session")}`,
        },
      });
      return (await response.json()).world;
    });
    const expected = createWorld("EXPECTED", seed, 6, 3600000, 0);
    assert.equal(world.seed, seed);
    assert.deepEqual(world.geography, expected.geography);
    assert.deepEqual(world.regions, expected.regions);
    const populated = world.regions.find((r: { features?: { kind: string }[] }) => r.features?.some((f) => f.kind === "settlement"));
    assert(populated, "Generated campaign has settlements");
    await page.getByRole("button", { name: "Command", exact: true }).click();
    await page.getByLabel("Inspect region").selectOption(String(populated.id));
    await page.getByRole("heading", { name: "Places & terrain", exact: true }).waitFor();
    for (const feature of populated.features) {
      assert((await page.locator(".region-features").innerText()).includes(feature.name));
    }
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.waitForTimeout(350);
    await page.screenshot({
      path: `.impeccable/review/campaign-clean-${width}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      `${width}px: seed edits, seats, regeneration, preview/campaign equality, and overflow passed`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}

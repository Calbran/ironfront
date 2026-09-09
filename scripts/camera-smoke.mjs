import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:3000");
  await page.getByRole("button", { name: "Begin campaign" }).click();
  await page.locator(".campaign-view canvas").waitFor();
  const canvas = page.locator("canvas");
  const rect = await canvas.boundingBox();
  assert.deepEqual(
    { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    { x: 0, y: 0, width: 1440, height: 1000 },
  );
  assert.equal(await page.getByLabel("Map zoom").textContent(), "100%");
  await page.getByRole("button", { name: "Close information panel" }).click();
  await page.mouse.click(820, 450);
  await page.getByLabel("Inspect region").waitFor();
  const selected = await page.getByLabel("Inspect region").inputValue();
  assert((await page.locator(".context-panel").boundingBox()).x < 30);
  await page.getByRole("button", { name: "Close information panel" }).click();
  await page.mouse.move(820, 450);
  await page.mouse.wheel(0, -100);
  await page.waitForTimeout(150);
  assert.notEqual(await page.getByLabel("Map zoom").textContent(), "100%");
  await page.mouse.click(820, 450);
  assert.equal(
    await page.getByLabel("Inspect region").inputValue(),
    selected,
    "Wheel zoom should stay anchored under the cursor",
  );
  await page.getByRole("button", { name: "Close information panel" }).click();
  await page.mouse.move(820, 450);
  await page.mouse.down();
  await page.mouse.move(940, 510, { steps: 10 });
  await page.mouse.up();
  assert.equal(
    await page.locator(".context-panel").isVisible(),
    false,
    "Dragging must not select a region",
  );
  await page.waitForTimeout(3300);
  await page.mouse.click(940, 510);
  assert.equal(
    await page.getByLabel("Inspect region").inputValue(),
    selected,
    "Panning survives world polling",
  );
  await page.getByRole("button", { name: "Fit continent" }).click();
  assert.equal(await page.getByLabel("Map zoom").textContent(), "100%");
  await page.getByRole("button", { name: "Close information panel" }).click();
  await page.mouse.click(720, 450);
  await page.getByLabel("Inspect region").waitFor();
  const fitSelected = await page.getByLabel("Inspect region").inputValue();
  await page.getByRole("button", { name: "Close information panel" }).click();
  await page.mouse.move(720, 450);
  await page.mouse.down();
  await page.mouse.move(780, 480, { steps: 8 });
  await page.mouse.up();
  await page.mouse.click(780, 480);
  assert.equal(
    await page.getByLabel("Inspect region").inputValue(),
    fitSelected,
    "Pan is available at fit zoom",
  );
  await page.getByRole("button", { name: "Session", exact: true }).click();
  assert((await page.locator(".session-panel").boundingBox()).x < 40);
  assert.equal(errors.length, 0);
  console.log(
    "PASS: viewport map, 100% start, cursor zoom, pan, click suppression, polling persistence, fit, left context/session.",
  );
} finally {
  await browser.close();
}

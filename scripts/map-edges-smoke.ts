import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
mkdirSync(".impeccable/review", { recursive: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      deviceScaleFactor: 2,
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:5173");
    await page.getByLabel("Map seed", { exact: true }).fill("Boreal");
    await page.getByText(/^Boreal · \d+ territories$/).waitFor();
    await page.locator("canvas").waitFor();
    await page
      .getByRole("button", { name: "Fit continent", exact: true })
      .click();
    await page.screenshot({
      path: `.impeccable/review/edges-fit-${width}.png`,
      fullPage: true,
    });
    for (let i = 0; i < 9; i++)
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    assert.equal(await page.getByLabel("Map zoom").textContent(), "600%");
    await page.waitForTimeout(350);
    await page.screenshot({
      path: `.impeccable/review/edges-detail-${width}.png`,
      fullPage: true,
    });
    const box = await page.locator("canvas").boundingBox();
    assert(box);
    await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.8, {
      steps: 12,
    });
    await page.mouse.up();
    await page.screenshot({
      path: `.impeccable/review/edges-coast-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Fit continent", exact: true })
      .click();
    assert.equal(await page.getByLabel("Map zoom").textContent(), "100%");
    assert.deepEqual(errors, []);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.close();
    console.log(
      `${width}px: vector map, 600% zoom, pan, Fit, no page errors/overflow`,
    );
  }
} finally {
  await browser.close();
}

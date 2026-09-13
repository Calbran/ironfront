import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";

const store = new Store(":memory:");
const app = await makeServer(store);
await app.listen({ host: "127.0.0.1", port: 3126 });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
try {
  const out = ".impeccable/review";
  await mkdir(out, { recursive: true });
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:3126");
    await page.getByRole("button", { name: "Establish command" }).click();
    await page.locator(".alpha-map canvas").waitFor({ timeout: 120000 });
    await page
      .locator('[data-strategy-textures="ready"]')
      .waitFor({ timeout: 120000 });
    await page.waitForFunction(
      () =>
        document
          .querySelector(".alpha-map")
          ?.getAttribute("data-terrain-lod") === "strategic",
      undefined,
      { timeout: 120000 },
    );
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${out}/campaign-strategy-survey-${width}.png`,
    });
    assert.equal(errors.length, 0, errors.join("\n"));
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    console.log(`${width}: strategic textures loaded; overview rendered`);
    await page.close();
  }
} finally {
  await browser.close();
  await app.close();
  store.close();
}

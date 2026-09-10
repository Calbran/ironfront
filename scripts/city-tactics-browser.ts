import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const out = ".impeccable/review/city-tactics";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
});
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    "http://127.0.0.1:5173/city-diorama.html?seed=732&case=citywide",
  );
  await page.waitForFunction(
    () => window.__cityDiorama?.tacticalState().available,
    { timeout: 120000 },
  );
  await page.getByRole("button", { name: "city", exact: true }).click();
  const results = [];
  for (const mode of ["infantry", "vehicle"]) {
    const before = Date.now();
    await page
      .getByRole("button", { name: `Inspect ${mode} routes` })
      .click({ timeout: 120000 });
    const state = await page.evaluate(() =>
      window.__cityDiorama!.tacticalState(),
    );
    assert.ok(state.visible && state.obstacles > 600 && state.cover > 100);
    assert.ok(state.routePoints > 0, `${mode} route missing`);
    results.push({ mode, ...state, milliseconds: Date.now() - before });
    await page.screenshot({ path: `${out}/${mode}.png` });
  }
  await page.getByRole("button", { name: "Hide tactical overlay" }).click();
  assert.equal(
    await page.evaluate(() => window.__cityDiorama!.tacticalState().visible),
    false,
  );
  assert.deepEqual(errors, []);
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  console.log(results);
} finally {
  await browser.close();
}

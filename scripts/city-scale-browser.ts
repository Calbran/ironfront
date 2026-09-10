import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
});
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 700 } }),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    "http://127.0.0.1:5181/city-diorama.html?seed=732&case=citywide",
  );
  await page.waitForFunction(
    () => (window.__cityDiorama?.testUnitState()?.units.length ?? 0) >= 4,
    undefined,
    { timeout: 120000 },
  );
  await page.evaluate(() => window.__cityDiorama!.configure(false, false));
  await page.evaluate(() => window.__cityDiorama!.selectTestUnit(1));
  await page.waitForTimeout(400);
  const target = await page.evaluate(() =>
    window.__cityDiorama!.projectTestPoint({ x: 8.5, z: 10 })!,
  );
  await page.mouse.click(target.x, target.y, { button: "right" });
  await page.waitForFunction(
    () => window.__cityDiorama!.testUnitState()!.units[0].moving,
    undefined,
    { timeout: 10000 },
  );
  await page.evaluate(() => window.__cityDiorama!.advanceTestUnits(60));
  const arrived = await page.evaluate(
    () => window.__cityDiorama!.testUnitState()!.units[0],
  );
  assert(!arrived.moving);
  assert(
    Math.hypot(arrived.x - 8.5, arrived.z - 10) < 2,
    JSON.stringify(arrived),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.__cityDiorama!.configure(false, true));
  await page.evaluate(() => window.__cityDiorama!.selectTestUnit(1));
  await page.mouse.move(1000, 500);
  await page.mouse.wheel(0, 1800);
  await page.waitForTimeout(500);
  await mkdir(".impeccable/review/city-scale", { recursive: true });
  await page.screenshot({
    path: ".impeccable/review/city-scale/bench-soldier.png",
  });
  assert.deepEqual(errors, []);
  console.log(
    "City scale view rendered; soldier reached the civic bench for comparison.",
  );
} finally {
  await browser.close();
}

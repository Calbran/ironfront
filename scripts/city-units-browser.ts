import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const out = ".impeccable/review/city-units";
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
    process.env.CITY_TEST_URL ??
      "http://127.0.0.1:5173/city-diorama.html?seed=732&case=citywide",
  );
  await page.waitForFunction(
    () => window.__cityDiorama?.testUnitState()?.units.length === 5,
    { timeout: 120000 },
  );
  await page.getByRole("button", { name: "capital", exact: true }).click();
  await page.waitForTimeout(400);
  const screen = await page.evaluate(() =>
    window.__cityDiorama!.testUnitScreen(1)!,
  );
  await page.mouse.click(screen.x, screen.y);
  assert.equal(
    await page.evaluate(() => window.__cityDiorama!.testUnitState()?.selected),
    1,
  );
  const end = await page.evaluate(() =>
    window.__cityDiorama!.projectTestPoint({ x: -3, z: 12 })!,
  );
  await page.mouse.click(end.x, end.y, { button: "right" });
  await page.waitForFunction(
    () => window.__cityDiorama!.testUnitState()?.units[0].moving === true,
  );
  await page.screenshot({ path: `${out}/moving.png` });
  await page.waitForFunction(
    () => window.__cityDiorama!.testUnitState()?.units[0].moving === false,
    { timeout: 60000 },
  );
  const arrived = await page.evaluate(() =>
    window.__cityDiorama!.testUnitState()!,
  );
  assert.ok(Math.abs(arrived.units[0].z - 12) < 0.6);
  const blocked = await page.evaluate(() =>
    window.__cityDiorama!.projectTestPoint({ x: 0, z: -5 })!,
  );
  await page.mouse.click(blocked.x, blocked.y, { button: "right" });
  await page.waitForFunction(() =>
    window.__cityDiorama!.testUnitState()!.message.startsWith("No safe route"),
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page.evaluate(() => window.__cityDiorama!.testUnitState()?.selected),
    undefined,
  );
  await page
    .getByRole("button", { name: "Select soldier 2", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => window.__cityDiorama!.testUnitState()?.selected),
    2,
  );
  await page.mouse.move(1050, 450);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(1160, 470, { steps: 10 });
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(300);
  const rotated = await page.evaluate(() =>
    window.__cityDiorama!.testUnitScreen(3)!,
  );
  await page.mouse.click(rotated.x, rotated.y);
  assert.equal(
    await page.evaluate(() => window.__cityDiorama!.testUnitState()?.selected),
    3,
  );
  const destination = await page.evaluate(() =>
    window.__cityDiorama!.projectTestPoint({ x: 3, z: 12 })!,
  );
  await page.mouse.click(destination.x, destination.y, { button: "right" });
  await page
    .getByRole("button", { name: "Stop selected units", exact: true })
    .click();
  assert.equal(
    await page.evaluate(
      () => window.__cityDiorama!.testUnitState()?.units[2].moving,
    ),
    false,
  );
  await page.screenshot({ path: `${out}/selected.png` });
  // Regeneration must discard units, selection and old input handlers.
  await page.evaluate(() =>
    window.__cityDiorama!.generate(
      128,
      735,
      true,
      false,
      false,
      true,
      "worldgen",
      true,
    ),
  );
  assert.equal(
    await page.evaluate(
      () => window.__cityDiorama!.testUnitState()?.units.length,
    ),
    3,
  );
  assert.equal(
    await page.evaluate(() => window.__cityDiorama!.testUnitState()?.selected),
    undefined,
  );
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/results.json`,
    JSON.stringify({ arrived, errors }, null, 2),
  );
  console.log(
    "Selection, movement, arrival, blocked orders, deselection and regeneration passed.",
  );
} finally {
  await browser.close();
}

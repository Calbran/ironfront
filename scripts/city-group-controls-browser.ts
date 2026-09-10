import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const out = ".impeccable/review/city-group-controls";
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
    () => window.__cityDiorama?.testUnitState()?.units.length === 5,
    undefined,
    { timeout: 120000 },
  );
  await page
    .getByRole("button", { name: "Select soldier 2", exact: true })
    .click();
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  const cameraBefore = await page.evaluate(() =>
    window.__cityDiorama!.cameraState(),
  );
  const points = await page.evaluate(() =>
    [1, 2, 3].map((id) => window.__cityDiorama!.testUnitScreen(id)!),
  );
  await page.mouse.move(
    Math.min(...points.map((p) => p.x)) - 20,
    Math.min(...points.map((p) => p.y)) - 20,
  );
  await page.mouse.down();
  await page.mouse.move(
    Math.max(...points.map((p) => p.x)) + 20,
    Math.max(...points.map((p) => p.y)) + 20,
    { steps: 12 },
  );
  await page.screenshot({ path: `${out}/marquee.png` });
  await page.mouse.up();
  assert.deepEqual(
    await page.evaluate(
      () => window.__cityDiorama!.testUnitState()!.selectedIds,
    ),
    [1, 2, 3],
  );
  assert.deepEqual(
    await page.evaluate(() => window.__cityDiorama!.cameraState()),
    cameraBefore,
    "left drag must not orbit",
  );
  await page.mouse.move(1050, 450);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(1180, 490, { steps: 12 });
  await page.mouse.up({ button: "middle" });
  await page.waitForTimeout(400);
  const rotated = await page.evaluate(() =>
    window.__cityDiorama!.cameraState(),
  );
  assert.notDeepEqual(rotated.position, cameraBefore.position);
  assert.ok(
    (
      await page.evaluate(() => window.__cityDiorama!.testUnitState()!.units)
    ).every((u) => !u.moving),
    "middle drag must not issue orders",
  );
  const destination = await page.evaluate(() =>
    window.__cityDiorama!.projectTestPoint({ x: 0, z: 12 })!,
  );
  await page.mouse.click(destination.x, destination.y, { button: "right" });
  const ordered = await page.evaluate(() =>
    window.__cityDiorama!.testUnitState()!,
  );
  assert.ok(
    ordered.units.filter((u) => u.kind === "infantry").every((u) => u.moving),
  );
  await page.waitForTimeout(1400);
  const moved = await page.evaluate(() =>
    window.__cityDiorama!.testUnitState()!,
  );
  assert.ok(
    moved.units
      .filter((u) => u.kind === "infantry")
      .every((u, i) => u.distance > ordered.units[i].distance),
  );
  await page.screenshot({ path: `${out}/walking.png` });
  await page
    .getByRole("button", { name: "Stop selected units", exact: true })
    .click();
  assert.ok(
    (
      await page.evaluate(() => window.__cityDiorama!.testUnitState()!.units)
    ).every((u) => !u.moving),
  );
  await page.getByRole("button", { name: "Select tank", exact: true }).click();
  assert.equal(
    await page.evaluate(() => window.__cityDiorama!.testUnitState()!.selected),
    4,
  );
  const tankGoal = await page.evaluate(() =>
    window.__cityDiorama!.projectTestPoint({ x: 18, z: 19 })!,
  );
  await page.mouse.click(tankGoal.x, tankGoal.y, { button: "right" });
  assert.ok(
    await page.evaluate(
      () => window.__cityDiorama!.testUnitState()!.units[3].moving,
    ),
  );
  await page
    .getByRole("button", { name: "Stop selected units", exact: true })
    .click();
  const checkbox = page.getByRole("checkbox", {
    name: "Sun shadows",
    exact: true,
  });
  await checkbox.click();
  assert.equal(
    await page.evaluate(() => document.activeElement?.tagName),
    "CANVAS",
  );
  const panBefore = await page.evaluate(() =>
    window.__cityDiorama!.cameraState(),
  );
  await page.keyboard.down("w");
  await page.waitForTimeout(500);
  await page.keyboard.up("w");
  assert.notDeepEqual(
    (await page.evaluate(() => window.__cityDiorama!.cameraState())).target,
    panBefore.target,
  );
  await page.screenshot({ path: `${out}/tank.png` });
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/results.json`,
    JSON.stringify({ ordered, moved, errors }, null, 2),
  );
  console.log(
    "Box selection, group orders, middle-drag orbit, WASD pan and group stop passed.",
  );
} finally {
  await browser.close();
}

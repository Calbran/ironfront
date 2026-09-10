import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const out = ".impeccable/review/city-orders-preview";
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
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  const points = await page.evaluate(() =>
    [1, 2, 3].map((id) => window.__cityDiorama!.testUnitScreen(id)!),
  );
  const before = await page.evaluate(() => window.__cityDiorama!.cameraState());
  await page.mouse.move(
    Math.min(...points.map((p) => p.x)) - 20,
    Math.min(...points.map((p) => p.y)) - 20,
  );
  await page.mouse.down();
  await page.mouse.move(
    Math.max(...points.map((p) => p.x)) + 20,
    Math.max(...points.map((p) => p.y)) + 20,
    { steps: 10 },
  );
  await page.mouse.up();
  assert.deepEqual(
    await page.evaluate(
      () => window.__cityDiorama!.testUnitState()!.selectedIds,
    ),
    [1, 2, 3],
  );
  assert.deepEqual(
    await page.evaluate(() => window.__cityDiorama!.cameraState()),
    before,
  );
  await page.mouse.move(1050, 450);
  await page.mouse.down({ button: "middle" });
  const held = await page.evaluate(() => window.__cityDiorama!.cameraState());
  assert.deepEqual(held, before, "anchoring must not jump on mouse down");
  await page.mouse.move(1110, 470, { steps: 10 });
  await page.mouse.up({ button: "middle" });
  assert.notDeepEqual(
    (await page.evaluate(() => window.__cityDiorama!.cameraState())).position,
    before.position,
  );
  assert.ok(
    (
      await page.evaluate(() => window.__cityDiorama!.testUnitState()!.units)
    ).every((u) => !u.moving),
  );
  await page
    .getByRole("button", { name: "Select soldier 1", exact: true })
    .click();
  const goal = await page.evaluate(() =>
      window.__cityDiorama!.projectTestPoint({ x: 8, z: 10 })!,
    ),
    aim = await page.evaluate(() =>
      window.__cityDiorama!.projectTestPoint({ x: 8, z: 5 })!,
    );
  const camera = await page.evaluate(() => window.__cityDiorama!.cameraState());
  await page.mouse.move(goal.x, goal.y);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(aim.x, aim.y, { steps: 12 });
  const preview = await page.evaluate(() =>
    window.__cityDiorama!.testOrderPreview()!,
  );
  assert.equal(preview.length, 1);
  assert.equal(preview[0].cover, "partial");
  assert.ok(preview[0].valid);
  assert.deepEqual(
    await page.evaluate(() => window.__cityDiorama!.cameraState()),
    camera,
    "selected right drag must not orbit",
  );
  assert.equal(
    await page.evaluate(
      () => window.__cityDiorama!.testUnitState()!.units[0].moving,
    ),
    false,
    "preview does not issue order",
  );
  await page.screenshot({ path: `${out}/partial-cover-preview.png` });
  await page.mouse.up({ button: "right" });
  const ordered = await page.evaluate(
    () => window.__cityDiorama!.testUnitState()!.units[0],
  );
  assert.equal(ordered.facing, preview[0].angle);
  assert.deepEqual(ordered.path.at(-1), { x: preview[0].x, z: preview[0].z });
  assert.equal(
    await page.evaluate(() => window.__cityDiorama!.testOrderPreview()!.length),
    0,
  );
  await page
    .getByRole("button", { name: "Stop selected units", exact: true })
    .click();
  const wall = await page.evaluate(() =>
    window.__cityDiorama!.projectTestPoint({ x: 7.4, z: -5 })!,
  );
  const wallAim = await page.evaluate(() =>
    window.__cityDiorama!.projectTestPoint({ x: 3, z: -5 })!,
  );
  await page.mouse.move(wall.x, wall.y);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(wallAim.x, wallAim.y, { steps: 10 });
  const fitted = await page.evaluate(() =>
    window.__cityDiorama!.testOrderPreview()!,
  );
  assert.ok(
    fitted[0].valid && fitted[0].x > 7.56 && fitted[0].cover === "full",
  );
  await page.screenshot({ path: `${out}/wall-fit-preview.png` });
  await page.mouse.up({ button: "right" });
  await page
    .getByRole("button", { name: "Stop selected units", exact: true })
    .click();
  await page.getByRole("button", { name: "Select tank", exact: true }).click();
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
  await page
    .getByRole("checkbox", { name: "Sun shadows", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => document.activeElement?.tagName),
    "CANVAS",
  );
  const pan = await page.evaluate(() => window.__cityDiorama!.cameraState());
  await page.keyboard.down("w");
  await page.waitForTimeout(500);
  await page.keyboard.up("w");
  assert.notDeepEqual(
    (await page.evaluate(() => window.__cityDiorama!.cameraState())).target,
    pan.target,
  );
  await page.screenshot({ path: `${out}/tank.png` });
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/results.json`,
    JSON.stringify({ preview, ordered, errors }, null, 2),
  );
  console.log(
    "Box select, middle-button click-anchored orbit, facing/cover ghost preview, commit-on-release, tank orders and WASD pan passed.",
  );
} finally {
  await browser.close();
}

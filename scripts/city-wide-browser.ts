import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const seed = Number(process.argv[2] ?? 733);
const out = ".impeccable/review/city-wide";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    `${process.env.CITY_TEST_URL ?? "http://127.0.0.1:5173"}/city-diorama.html?seed=${seed}&case=citywide`,
  );
  await page.waitForFunction(() => !!window.__cityDiorama, { timeout: 120000 });
  await page.getByRole("button", { name: "city", exact: true }).click();
  await page.waitForTimeout(800);
  const models = await page.evaluate(() => window.__cityDiorama!.modelCounts());
  const metrics = await page.evaluate(() =>
    window.__cityDiorama!.benchmark(1200),
  );
  await writeFile(
    `${out}/models-performance.json`,
    JSON.stringify({ models, metrics }, null, 2),
  );
  const full = page.getByRole("checkbox", { name: "Full city", exact: true });
  if (!(await full.isChecked()))
    throw Error("Full city case did not select full tile mode");
  await page.getByRole("button", { name: `Vary blocks · ${seed}` }).click();
  if (!(await full.isChecked())) throw Error("Seed change lost full city mode");
  await page.getByRole("button", { name: "city", exact: true }).click();
  await page.screenshot({ path: `${out}/overview-${seed + 1}.png` });
  await page.getByRole("button", { name: "waterfront", exact: true }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/waterfront.png` });
  await page.getByRole("button", { name: "capital", exact: true }).click();
  await page.screenshot({ path: `${out}/square.png` });
  await page.mouse.move(1000, 500);
  await page.mouse.down();
  await page.mouse.move(650, 560, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/rotated-square.png` });
  if (errors.length) throw Error(errors.join("\n"));
  console.log({ errors });
} finally {
  await browser.close();
}

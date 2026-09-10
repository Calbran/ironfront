import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const out = ".impeccable/review/civic-square";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors: string[] = [];
  const missing: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().endsWith("/favicon.ico"))
      missing.push(r.url());
  });
  await page.goto(
    `${process.env.CITY_TEST_URL ?? "http://127.0.0.1:5173"}/city-diorama.html`,
  );
  await page.waitForFunction(() => !!window.__cityDiorama);
  const results = [];
  for (const count of [160, 28]) {
    await page
      .getByLabel("Buildings", { exact: true })
      .selectOption(String(count));
    await page.getByRole("button", { name: "capital", exact: true }).click();
    for (const dusk of [false, true, false]) {
      await page.getByLabel("Dusk lighting", { exact: true }).setChecked(dusk);
      await page.waitForTimeout(600);
      await page.screenshot({
        path: `${out}/${count}-${dusk ? "dusk" : "day"}.png`,
      });
    }
    results.push(
      await page.evaluate(() => window.__cityDiorama!.benchmark(1500)),
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Winter", { exact: true }).check();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/phone.png`, fullPage: true });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    errors.push("Horizontal overflow");
  await writeFile(
    `${out}/results.json`,
    JSON.stringify({ results, errors, missing }, null, 2),
  );
  console.log(JSON.stringify({ errors, missing }));
  if (errors.length || missing.length) process.exitCode = 1;
} finally {
  await browser.close();
}

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const out = ".impeccable/review/terrain-district";
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
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("404"))
      errors.push(m.text());
  });
  await page.goto(
    `${process.env.CITY_TEST_URL ?? "http://127.0.0.1:5173"}/city-diorama.html`,
  );
  await page.waitForFunction(() => !!window.__cityDiorama);
  await page.getByLabel("Angled streets", { exact: true }).check();
  await page.getByLabel("Fit to hills & river",{exact:true}).check();
  await page.waitForTimeout(800);
  if (!(await page.getByLabel("Buildings", { exact: true }).isDisabled()))
    throw new Error("Study budget control should be disabled");
  await page.screenshot({ path: `${out}/day.png` });
  await page.getByRole("button", { name: /Vary blocks/ }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/varied.png` });
  await page.getByLabel("Dusk lighting", { exact: true }).check();
  await page.getByLabel("Winter", { exact: true }).check();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/winter-dusk.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${out}/phone.png` });
  await page.getByLabel("Angled streets", { exact: true }).uncheck();
  await page.waitForTimeout(500);
  if (await page.getByLabel("Buildings", { exact: true }).isDisabled())
    throw new Error("Regular budget control not restored");
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(JSON.stringify({ errors }));
} finally {
  await browser.close();
}

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const out = process.env.CITY_REVIEW_DIR ?? ".impeccable/review/city-diorama";
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
  await page.waitForFunction(() => !!window.__cityDiorama, { timeout: 60000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: out + "/city.png" });
  for (const view of ["capital", "depot", "street"]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${view}.png` });
  }
  const effects = await page.evaluate(() => window.__cityDiorama!.effects());
  if (!effects.smokeSources || effects.particles > 72 || effects.lights !== 3)
    throw new Error(`Invalid effects: ${JSON.stringify(effects)}`);
  await page.getByLabel("Dusk lighting", { exact: true }).check();
  await page.getByRole("button", { name: "capital", exact: true }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/dusk.png` });
  if (!(await page.evaluate(() => window.__cityDiorama!.effects().dusk)))
    throw new Error("Dusk toggle did not update lighting");
  await page.getByLabel("Dusk lighting", { exact: true }).uncheck();
  const results = [];
  for (const count of [128, 256, 512, 1024]) {
    await page
      .getByLabel("Buildings", { exact: true })
      .selectOption(String(count));
    await page.waitForTimeout(600);
    for (const view of ["city", "street"] as const) {
      await page.evaluate((view) => window.__cityDiorama!.focus(view), view);
      await page.waitForTimeout(300);
      const result = await page.evaluate(() =>
        window.__cityDiorama!.benchmark(4000),
      );
      results.push({ view, ...(result as object) });
      console.log(JSON.stringify(results.at(-1)));
    }
  }
  await page.getByLabel("Buildings", { exact: true }).selectOption("256");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(() => window.__cityDiorama!.focus("city"));
  await page.waitForTimeout(500);
  results.push({
    view: "city-cpu4x",
    ...((await page.evaluate(() =>
      window.__cityDiorama!.benchmark(4000),
    )) as object),
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await page.getByLabel("Buildings", { exact: true }).selectOption("160");
  await page.getByRole("button", { name: "capital", exact: true }).click();
  await page.getByLabel("Winter", { exact: true }).check();
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + "/winter.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + "/phone.png", fullPage: true });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    errors.push("Horizontal overflow");
  await writeFile(
    out + "/results.json",
    JSON.stringify(
      {
        results,
        errors,
        scope:
          "Local headless Chrome, DPR1, 144 infantry, two jeeps, shared instanced kit, shadows. Not campaign simulation or low-end device certification.",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ errors }));
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}

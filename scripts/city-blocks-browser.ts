import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const out = ".impeccable/review/city-blocks";
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
  const geometry = await page.evaluate(async () => {
    const kitPath = "/src/experiments/referenceAssets.ts",
      boundsPath =
        "/@fs/home/brutus/Documents/ChatGPT/Ironfront/packages/game-core/src/cityBuildingKit.ts";
    const kit = (await import(kitPath)).createMiniatureKit();
    const { cityBuildingEnvelope } = await import(boundsPath);
    const results = [];
    try {
      for (const [name, parts] of kit.variants) {
        if (["tree", "pine"].includes(name)) continue;
        const e = cityBuildingEnvelope(name);
        let full = 0,
          low = 0;
        for (const p of parts) {
          p.geometry.computeBoundingBox();
          const b = p.geometry.boundingBox;
          if (
            Math.max(Math.abs(b.min.x), Math.abs(b.max.x)) >
              e.width / 2 + 0.015 ||
            Math.max(Math.abs(b.min.z), Math.abs(b.max.z)) > e.depth / 2 + 0.015
          )
            throw new Error(`Envelope too small: ${name} ${JSON.stringify(b)}`);
          full += p.geometry.getAttribute("position").count;
        }
        for (const p of kit.distantVariants.get(name))
          low += p.geometry.getAttribute("position").count;
        if (low >= full) throw new Error(`No detail reduction: ${name}`);
        results.push({ name, full, low });
      }
    } finally {
      kit.dispose();
    }
    return results;
  });
  const metrics = [];
  await page.getByLabel("Buildings", { exact: true }).selectOption("1024");
  await page.waitForTimeout(700);
  if (
    (await page.evaluate(() => window.__cityDiorama!.detailLevel())) !==
    "distant"
  )
    throw new Error("Overview did not simplify");
  metrics.push({
    view: "overview",
    ...((await page.evaluate(() =>
      window.__cityDiorama!.benchmark(1500),
    )) as object),
  });
  await page.screenshot({ path: `${out}/overview.png` });
  await page.getByRole("button", { name: "street", exact: true }).click();
  await page.waitForTimeout(500);
  if (
    (await page.evaluate(() => window.__cityDiorama!.detailLevel())) !== "full"
  )
    throw new Error("Close view did not restore detail");
  await page.getByLabel("Buildings", { exact: true }).selectOption("160");
  for (let i = 0; i < 2; i++) {
    await page.screenshot({ path: `${out}/seed-${i}.png` });
    await page.getByRole("button", { name: /Vary blocks/ }).click();
    await page.waitForTimeout(500);
  }
  await page.getByRole("button", { name: "street", exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/street.png` });
  await page.getByLabel("Dusk lighting", { exact: true }).check();
  await page.getByLabel("Winter", { exact: true }).check();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${out}/phone.png`, fullPage: true });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    errors.push("Overflow");
  await writeFile(
    `${out}/results.json`,
    JSON.stringify({ geometry, metrics, errors }, null, 2),
  );
  console.log(JSON.stringify({ errors }));
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}

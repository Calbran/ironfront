import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const out = ".impeccable/review/final-city";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
  args: process.env.FUNNEL_TEST_IP ? [`--host-resolver-rules=MAP brutus.tail250251.ts.net ${process.env.FUNNEL_TEST_IP}`] : [],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    "https://brutus.tail250251.ts.net/city-diorama.html?seed=732&case=citywide",
    { timeout: 120000 },
  );
  await page.waitForFunction(() => !!window.__cityDiorama, { timeout: 120000 });
  await page.getByRole("button", { name: "city", exact: true }).click();
  await page.waitForTimeout(800);
  const models = await page.evaluate(() => window.__cityDiorama!.modelCounts());
  if ((models.streetCarSaloon ?? 0) + (models.streetCarVan ?? 0) < 2)
    throw Error("Missing derelict cars");
  if(models.home || models.shop)throw Error("Old town buildings remain in full city");
  if(!(models.streetManhole>0))throw Error("Missing manholes");
  const effects=await page.evaluate(()=>window.__cityDiorama!.effects());
  if(effects.smokeSources<=12)throw Error("Missing ground steam sources");
  await page.screenshot({ path: `${out}/overview.png` });
  await page.getByRole("button", { name: "capital", exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/square.png` });
  await page.mouse.move(1100, 550);
  await page.mouse.down();
  await page.mouse.move(750, 570, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/orbit.png` });
  const before = await page.evaluate(() => window.__cityDiorama!.cameraState());
  await page.keyboard.down("w");
  await page.waitForTimeout(600);
  await page.keyboard.up("w");
  const after = await page.evaluate(() => window.__cityDiorama!.cameraState());
  if (JSON.stringify(before.target) === JSON.stringify(after.target))
    throw Error("WASD did not pan");

  await writeFile(
    `${out}/results.json`,
    JSON.stringify({ models, effects, errors }, null, 2),
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log({ models, errors });
} finally {
  await browser.close();
}

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const out = ".impeccable/review/city-seeds";
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
  await page.goto("http://127.0.0.1:5173/city-seeds.html");
  await page
    .getByRole("button", { name: "Generate 12 seeds", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelectorAll("article").length === 12,
    {},
    { timeout: 180000 },
  );
  await page
    .getByRole("button", { name: "Generate 12 seeds", exact: true })
    .waitFor({ state: "visible" });
  if (
    !(await page
      .locator("article img")
      .evaluateAll((imgs) =>
        imgs.every((i) => (i as HTMLImageElement).naturalWidth > 0),
      ))
  )
    throw Error("Missing captures");
  await page.screenshot({ path: `${out}/gallery.png` });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export report" }).click();
  await (await download).saveAs(`${out}/report.json`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${out}/phone.png` });
  await page.goto(
    "http://127.0.0.1:5173/city-diorama.html?seed=739&case=tight-bend",
  );
  await page.waitForFunction(() => !!window.__cityDiorama);
  if ((await page.getByLabel("Terrain profile").inputValue()) !== "tight-bend")
    throw Error("Lost profile");
  await page.getByRole("button", { name: /Vary blocks/ }).click();
  if ((await page.getByLabel("Terrain profile").inputValue()) !== "tight-bend")
    throw Error("Lost varied profile");
  await page.getByRole("button", { name: "angled", exact: true }).click();
  await page.screenshot({ path: `${out}/stress.png` });
  if (errors.length) throw Error(errors.join("\n"));
  console.log(JSON.stringify({ cards: 12, errors }));
} finally {
  await browser.close();
}

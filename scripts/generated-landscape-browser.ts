import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const out = "/private/tmp/ironfront-landscape-review";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Users/brutus-mac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("404"))
      errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().endsWith("/favicon.ico"))
      errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto("http://127.0.0.1:5187/three-preview.html");
  await page.waitForFunction(() => !!window.__worldStudy, { timeout: 120000 });
  await page.getByRole("button", { name: "Visit refined region" }).click();
  await page.waitForTimeout(1500);
  const stats = await page.evaluate(() =>
    window.__worldStudy!.landscapeStats(),
  );
  const detailed = await page.evaluate(() =>
    window.__worldStudy!.benchmark(5000),
  );
  await page.screenshot({ path: out + "/summer.png" });
  await page.getByLabel("Refined landscape study").uncheck();
  await page.waitForTimeout(300);
  const baseline = await page.evaluate(() =>
    window.__worldStudy!.benchmark(5000),
  );
  await page.screenshot({ path: out + "/baseline.png" });
  await page.getByLabel("Refined landscape study").check();
  await page.getByLabel("Winter palette").check();
  await page.waitForTimeout(500);
  await page.screenshot({ path: out + "/winter.png" });
  await page.getByLabel("Strategy view", { exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + "/strategy.png" });
  await page.getByLabel("Strategy view", { exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + "/mobile.png", fullPage: true });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    errors.push("Horizontal overflow");
  const result = { stats, detailed, baseline, errors };
  await writeFile(out + "/results.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}

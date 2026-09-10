import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const out = "/private/tmp/ironfront-town-patterns";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Users/brutus-mac/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
});
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
    }),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5187/three-preview.html");
  await page.waitForFunction(() => !!window.__worldStudy, { timeout: 120000 });
  await page.getByRole("button", { name: "Visit refined region" }).click();
  const options = await page
    .locator("#settlement option")
    .evaluateAll((os) =>
      os.map((o) => ({
        value: (o as HTMLOptionElement).value,
        label: o.textContent ?? "",
      })),
    );
  const visited = [];
  for (const pattern of ["riverside", "farming", "industrial"]) {
    const option = options.find((o) => o.label.endsWith(pattern));
    if (!option) throw Error(`Missing ${pattern} town`);
    await page.locator("#settlement").selectOption(option.value);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/${pattern}.png` });
    visited.push(option.label);
  }
  await page.getByLabel("Winter palette").check();
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + "/winter-industrial.png" });
  const report = { visited, errors };
  await writeFile(out + "/results.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}

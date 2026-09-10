import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const seed = Number(process.argv[2] ?? 733);
const out = ".impeccable/review/waterfront-roads";
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
    `http://127.0.0.1:5173/city-diorama.html?seed=${seed}&case=worldgen`,
  );
  await page.waitForFunction(() => !!window.__cityDiorama);
  await page.screenshot({ path: `${out}/overview-${seed}.png` });
  await page.getByRole("button", { name: "waterfront", exact: true }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/waterfront.png` });
  if (errors.length) throw Error(errors.join("\n"));
  console.log({ errors });
} finally {
  await browser.close();
}

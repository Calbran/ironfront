import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir(".impeccable/review/animations", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5181/animation-review.html");
  await page.locator('#stage[data-ready="true"]').waitFor();
  async function seek(t: number) {
    await page.locator("#timeline").evaluate((e, value) => {
      (e as HTMLInputElement).value = String(value);
      e.dispatchEvent(new Event("input"));
    }, t);
  }
  await seek(7.1);
  await page.screenshot({ path: ".impeccable/review/animations/overview.png" });
  for (const [focus, clip, time] of [
    ["rifle", "sequence", 7.1],
    ["rifle", "crouch", 2],
    ["guards", "lean", 3],
      ["lmg", "reload", 1.1],
      ["lmg", "fire", 2.23],
      ["armor", "sequence", 4.1],
      ["armor", "sequence", 7.1],
      ["rifle", "sequence", 13],
      ["rifle", "run", 2.76],
      ["antitank", "sequence", 2.4],
      ["antitank", "reload", 1.1],
    ["air", "sequence", 4.1],
  ] as const) {
    await page.selectOption("#focus", focus);
    await page.selectOption("#clip", clip);
    await seek(time);
    await page.screenshot({
      path: `.impeccable/review/animations/${focus}-${clip}.png`,
    });
    assert.equal(
      await page.locator("#stage").getAttribute("data-time"),
      time.toFixed(3),
    );
  }
  await page.click("#step");
  assert.equal(await page.locator("#play").textContent(), "Play");
  const before = Number(await page.locator("#stage").getAttribute("data-time"));
  await page.selectOption("#speed", "0.25");
  await page.click("#play");
  await page.waitForTimeout(700);
  await page.click("#play");
  const after = Number(await page.locator("#stage").getAttribute("data-time"));
  assert(after > before && after - before < 0.5);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".impeccable/review/animations/mobile.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Animation diorama rendered; seek, pause, step, speed, focuses and mobile checks passed.",
  );
} finally {
  await browser.close();
}

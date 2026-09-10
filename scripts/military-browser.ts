import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
});
await mkdir(".impeccable/review/military", { recursive: true });
await mkdir("apps/web/public/art/military", { recursive: true });
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
    }),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5181/military-preview.html");
  for (const kind of [
    "tank",
    "airship",
    "artillery",
    "sandbags",
    "wire",
    "lmg",
    "landship",
    "guards",
    "gunship",
    "engineers",
  ]) {
    await page.selectOption("#model", kind);
    await page.locator(`#stage[data-model="${kind}"]`).waitFor();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `.impeccable/review/military/${kind}.png` });
    const download = page.waitForEvent("download");
    await page.click("#export");
    const result = await download;
    const path = `apps/web/public/art/military/${kind}.glb`;
    await result.saveAs(path);
    const bytes = await readFile(path);
    assert.equal(bytes.toString("utf8", 0, 4), "glTF");
    assert(bytes.length > 1000);
    const jsonLength = bytes.readUInt32LE(12);
    const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
    const asset = gltf.nodes.find(
      (n: { extras?: { modelKind?: string } }) => n.extras?.modelKind === kind,
    );
    assert(asset, "export retains model identity");
    assert.equal(asset.extras.referenceHeight, 1.925);
    if (kind === "lmg") assert.equal(asset.extras.members, 6);
    await page.click("#top");
    await page.waitForTimeout(100);
    await page.screenshot({
      path: `.impeccable/review/military/${kind}-top.png`,
    });
    assert(
      Number(await page.locator("#stage").getAttribute("data-triangles")) <
        6500,
    );
  }
  await page.click("#motion");
  await page.waitForTimeout(200);
  await page.click("#motion");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.selectOption("#model", "tank");
  await page.waitForTimeout(200);
  await page.screenshot({ path: ".impeccable/review/military/mobile.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Ten models rendered and exported; desktop/mobile, camera controls and runtime checks passed.",
  );
} finally {
  await browser.close();
}

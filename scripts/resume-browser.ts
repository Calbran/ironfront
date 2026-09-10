import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
import { createWorld } from "../packages/game-core/src/index.ts";
import { syncSquads } from "../packages/game-core/src/tactics.ts";
const w = createWorld("RESUME", "Boreal", 4, 3600000, Date.now());
syncSquads(w);
const store = new Store(":memory:");
store.create(w, "resume-browser");
const app = await makeServer(store);
await app.listen({ host: "127.0.0.1", port: 3121 });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } }),
      errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() =>
      localStorage.setItem("warfare-session", "resume-browser"),
    );
    await page.goto("http://127.0.0.1:3121");
    await page.locator(".campaign-view canvas").waitFor();
    await page.waitForTimeout(300);
    const camera = () =>
      page
        .locator(".map-canvas")
        .evaluate((el) => [
          el.getAttribute("data-camera-x"),
          el.getAttribute("data-camera-y"),
          el.getAttribute("data-camera-scale"),
        ]);
    const before = await camera();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Page.setWebLifecycleState", { state: "frozen" });
    store.mutate(w.id, (draft) => {
      const s = draft.tactics!.squads.find((s) => s.owner === 0)!;
      s.x += 20;
      draft.tactics!.revision += 10;
    });
    const response = page.waitForResponse((r) =>
      r.url().endsWith("/api/world"),
    );
    await cdp.send("Page.setWebLifecycleState", { state: "active" });
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    const returned = (await response).json();
    assert.equal(
      (await returned).world.tactics.revision,
      store.get(w.id)!.tactics!.revision,
    );
    await page.waitForTimeout(150);
    assert.deepEqual(await camera(), before);
    // A visibility return must refresh immediately as well, without waiting for polling.
    const visible = page.waitForResponse((r) => r.url().endsWith("/api/world"));
    await page.evaluate(() =>
      document.dispatchEvent(new Event("visibilitychange")),
    );
    assert.equal((await visible).status(), 200);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(
      `${width}px: frozen-tab return and visibility refresh receive current server state without moving camera`,
    );
  }
} finally {
  await browser.close();
  await app.close();
  store.close();
}

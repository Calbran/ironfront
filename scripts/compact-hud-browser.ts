import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
import { createWorld } from "../packages/game-core/src/index.ts";
import { syncSquads } from "../packages/game-core/src/tactics.ts";
import { mkdirSync } from "node:fs";
const w = createWorld("COMPACT", "Boreal", 4, 3600000, Date.now());
syncSquads(w);
const store = new Store(":memory:");
store.create(w, "compact-browser");
const app = await makeServer(store);
await app.listen({ host: "127.0.0.1", port: 3119 });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
mkdirSync(".impeccable/review", { recursive: true });
try {
  for (const [width, height] of [
    [1440, 900],
    [900, 700],
    [390, 844],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } }),
      errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() =>
      localStorage.setItem("warfare-session", "compact-browser"),
    );
    await page.goto("http://127.0.0.1:3119");
    await page.locator(".compact-command").waitFor();
    assert.equal(await page.locator(".force-rail").count(), 0);
    const dock = await page.locator(".context-panel").boundingBox();
    assert(dock && dock.height <= (width > 700 ? 100 : 140));
    const camera = () =>
      page
        .locator(".map-canvas")
        .evaluate((el) => ({
          x: el.getAttribute("data-camera-x"),
          y: el.getAttribute("data-camera-y"),
          scale: el.getAttribute("data-camera-scale"),
          width: el.clientWidth,
          height: el.clientHeight,
        }));
    await page.waitForTimeout(400);
    const before = await camera();
    await page
      .getByRole("button", { name: "Close information panel", exact: true })
      .click();
    await page.waitForTimeout(100);
    assert.deepEqual(await camera(), before);
    await page.getByRole("button", { name: /Open command/ }).click();
    await page.waitForTimeout(100);
    assert.deepEqual(await camera(), before);
    const point = async (p: { x: number; y: number }) => {
      const c = await camera(),
        box = await page.locator(".map-canvas").boundingBox();
      return {
        x: box!.x + Number(c.x) + p.x * Number(c.scale),
        y: box!.y + Number(c.y) + p.y * Number(c.scale),
      };
    };
    const unit = w.tactics!.squads.find(
      (s) => s.owner === 0 && s.kind === "infantry",
    )!;
    let at = await point(unit);
    await page.mouse.move(at.x, at.y);
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(300);
    at = await point(unit);
    const zoomed = await camera();
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(150);
    assert.match(
      await page.locator(".current-selection").innerText(),
      /health/,
    );
    assert.deepEqual(await camera(), zoomed);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    assert.deepEqual(await camera(), zoomed);
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(100);
    assert.deepEqual(await camera(), zoomed);
    let response = page.waitForResponse((r) =>
      r.url().endsWith("/api/command"),
    );
    await page.getByRole("button", { name: "Hold", exact: true }).click();
    assert.equal((await response).status(), 200);
    await page.screenshot({
      path: `.impeccable/review/compact-hud-${width}.png`,
    });
    for (const name of ["Details", "Nation", "Reports"]) {
      await page.getByRole("button", { name, exact: true }).click();
      await page.locator("dialog[open]").waitFor();
      assert.equal(
        await page
          .locator("dialog[open]")
          .evaluate(
            (el) =>
              el.scrollHeight > el.clientHeight ||
              el.scrollWidth > el.clientWidth,
          ),
        false,
      );
      const next = page.getByRole("button", { name: "Next", exact: true });
      if ((await next.isVisible()) && (await next.isEnabled()))
        await next.click();
      await page
        .getByRole("button", { name: "Close details", exact: true })
        .click();
    }
    const scrolling = await page.locator(".context-panel").evaluate((root) =>
      [root, ...root.querySelectorAll("*")]
        .filter((el) => {
          const s = getComputedStyle(el);
          return (
            /(auto|scroll)/.test(s.overflow + s.overflowX + s.overflowY) &&
            (el.scrollHeight > el.clientHeight + 1 ||
              el.scrollWidth > el.clientWidth + 1)
          );
        })
        .map((el) => el.className),
    );
    assert.deepEqual(scrolling, []);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    await page.close();
    console.log(
      `${width}x${height}: compact dock, no force list/scrolling, stable camera on selection/deselection, Hold and detail pages passed`,
    );
  }
} finally {
  await browser.close();
  await app.close();
  store.close();
}

import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
import { createWorld } from "../packages/game-core/src/index.ts";
import { syncSquads } from "../packages/game-core/src/tactics.ts";
import {
  localPath,
  onLocalLand,
} from "../packages/game-core/src/localMovement.ts";
import { blockedByMountains } from "../packages/game-core/src/mountainObstacles.ts";
const w = createWorld("MOUNTAIN", "Boreal", 4, 3600000, Date.now());
syncSquads(w);
const choices = w
  .mountainScenery!.flatMap((p) =>
    w.regions
      .filter((r) => r.terrain !== "mountains")
      .map((r) => ({
        p,
        r,
        start: { x: p.x - p.width * 0.7, y: p.y },
        end: { x: p.x + p.width * 0.7, y: p.y },
      })),
  )
  .filter((c) => onLocalLand(c.r, c.start) && onLocalLand(c.r, c.end));
const c = choices.find((c) => {
  try {
    return localPath(c.r, c.start, c.end).length > 1;
  } catch {
    return false;
  }
})!;
assert(c);
const s = w.tactics!.squads.find((s) => s.owner === 0)!;
Object.assign(s, c.start, { region: c.r.id, independent: true });
const army = w.armies.find((a) => a.id === s.army)!;
army.region = c.r.id;
army.route = [];
army.order = "hold";
c.r.owner = 0;
w.nations[0].capital = c.r.id;
const store = new Store(":memory:");
store.create(w, "mountain-browser");
const app = await makeServer(store);
await app.listen({ host: "127.0.0.1", port: 3125 });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem("warfare-session", "mountain-browser"),
  );
  await page.goto("http://127.0.0.1:3125");
  await page.locator("[data-biome-sprites]").waitFor();
  await page.waitForTimeout(500);
  const point = async (p: { x: number; y: number }) =>
    page.locator(".map-canvas").evaluate((el, p) => {
      const b = el.getBoundingClientRect(),
        scale = Number(el.getAttribute("data-camera-scale"));
      return {
        x: b.x + Number(el.getAttribute("data-camera-x")) + p.x * scale,
        y: b.y + Number(el.getAttribute("data-camera-y")) + p.y * scale,
      };
    }, p);
  const center = await point(c.p);
  await page.mouse.move(720, 450);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(1440 - center.x, 900 - center.y, { steps: 8 });
  await page.mouse.up({ button: "middle" });
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.waitForTimeout(600);
  let at = await point(c.start);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(400);
  let response = page.waitForResponse((r) => r.url().endsWith("/api/command"));
  at = await point(c.end);
  await page.mouse.click(at.x, at.y, { button: "right" });
  assert.equal((await response).status(), 200);
  const saved = store.get(w.id)!.tactics!.squads.find((v) => v.id === s.id)!;
  assert(saved.localOrder!.path.length > 1);
  let anchor = c.start;
  for (const p of saved.localOrder!.path) {
    assert(!blockedByMountains(c.r.mountainObstacles, anchor, p));
    anchor = p;
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: ".impeccable/review/mountain-detour.png" });
  response = page.waitForResponse((r) => r.url().endsWith("/api/command"));
  at = await point(c.p);
  await page.mouse.click(at.x, at.y, { button: "right" });
  assert.equal((await response).status(), 400);
  assert.deepEqual(errors, []);
  console.log(
    "Visible mountain detour accepted; interior destination rejected; server route avoids footprint.",
  );
} finally {
  await browser.close();
  await app.close();
  store.close();
}

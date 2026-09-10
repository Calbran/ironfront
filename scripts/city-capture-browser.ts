import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
import { createWorld } from "../packages/game-core/src/index.ts";
import { onLocalLand } from "../packages/game-core/src/localMovement.ts";
import { advanceTactics, syncSquads } from "../packages/game-core/src/tactics.ts";

const world = createWorld("CAPTURE-VIEW", "Boreal", 4, 3_600_000, Date.now());
syncSquads(world);
const squad = world.tactics!.squads.find(
  (candidate) => candidate.owner === 0 && candidate.kind === "infantry",
)!;
const region = world.regions[squad.region];
const site = Array.from({ length: 32 }, (_, index) => ({
  x: squad.x + 100 * Math.cos((index * Math.PI) / 16),
  y: squad.y + 100 * Math.sin((index * Math.PI) / 16),
})).find((point) => onLocalLand(region, point));
assert(site);
region.features ??= [];
region.features.push({
  id: "capture-browser-city",
  kind: "settlement",
  name: "Rivetford",
  size: "city",
  owner: 1,
  ...site,
});

const store = new Store(":memory:");
store.create(world, "capture-browser-token");
const app = await makeServer(store);
await app.listen({ host: "127.0.0.1", port: 3126 });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
mkdirSync(".impeccable/review", { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("warfare-session", "capture-browser-token"),
  );
  await page.goto("http://127.0.0.1:3126");
  await page.locator('.map-canvas[data-settlement-icons="ready"]').waitFor({
    timeout: 60_000,
  });
  await page.waitForTimeout(600);
  const screenPoint = (point: { x: number; y: number }) =>
    page.locator(".map-canvas").evaluate((element, value) => {
      const box = element.getBoundingClientRect();
      return {
        x:
          box.x +
          Number(element.getAttribute("data-camera-x")) +
          value.x * Number(element.getAttribute("data-camera-scale")),
        y:
          box.y +
          Number(element.getAttribute("data-camera-y")) +
          value.y * Number(element.getAttribute("data-camera-scale")),
      };
    }, point);
  let at = await screenPoint(squad);
  await page.mouse.click(at.x, at.y);
  at = await screenPoint(site);
  await page.mouse.click(at.x, at.y, { button: "right" });
  await page.getByRole("menu", { name: "Capture order" }).waitFor();
  const response = page.waitForResponse((candidate) =>
    candidate.url().endsWith("/api/command"),
  );
  await page.getByRole("menuitem", { name: "Capture", exact: true }).click();
  assert.equal((await response).status(), 200);
  const ordered = store
    .get(world.id)!
    .tactics!.squads.find(
      (candidate) =>
        candidate.captureSite?.region === region.id &&
        candidate.captureSite.feature === "capture-browser-city",
    );
  assert(ordered);
  store.mutate(world.id, (current) => {
    const moving = current.tactics!.squads.find(
      (candidate) => candidate.id === ordered.id,
    )!;
    moving.region = region.id;
    moving.x = site.x;
    moving.y = site.y;
    if (moving.localOrder) moving.localOrder.path = [];
    advanceTactics(current, 0.1);
  });
  await page.waitForTimeout(3_300);
  assert.equal(
    store
      .get(world.id)!
      .regions[region.id].features!.find(
        (feature) => feature.id === "capture-browser-city",
      )!.owner,
    0,
  );
  await page.screenshot({ path: ".impeccable/review/city-captured.png" });
  assert.deepEqual(errors, []);
  await page.close();
  console.log("right-click Capture submitted and captured city refreshed");
} finally {
  await browser.close();
  await app.close();
  store.close();
}

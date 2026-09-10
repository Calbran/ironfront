import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
import {
  createWorld,
  makeArmy,
  command,
} from "../packages/game-core/src/index.ts";
import {
  advanceTactics,
  beginEngagement,
} from "../packages/game-core/src/tactics.ts";

const store = new Store(":memory:");
const w = createWorld("BATTLE", "Boreal", 4, 60000, Date.now());
w.nations.forEach((n) => {
  n.bot = false;
  n.fuel = 100;
});
const source = w.regions.find(
  (r) =>
    r.terrain !== "mountains" &&
    r.neighbors.some((id) => w.regions[id].terrain !== "mountains"),
)!;
const target =
  w.regions[
    source.neighbors.find((id) => w.regions[id].terrain !== "mountains")!
  ];
source.owner = 0;
target.owner = 1;
target.garrison = 20;
w.armies = [
  makeArmy(0, 0, source.id, "assault"),
  makeArmy(1, 1, target.id, "line"),
];
command(w, 0, { type: "order", army: 0, order: "advance", target: target.id });
beginEngagement(w, w.armies[0], target.id);
advanceTactics(w, 0.2);
store.create(w, "browser-fixture");
store.resume();
const app = await makeServer(store);
await app.listen({ host: "127.0.0.1", port: 3107 });
const timer = setInterval(() => store.tick(w.id), 1000);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
mkdirSync(".impeccable/review", { recursive: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } }),
      errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() =>
      localStorage.setItem("warfare-session", "browser-fixture"),
    );
    await page.goto("http://127.0.0.1:3107");
    await page.locator(".campaign-view canvas").waitFor();
    await page.getByText(/You command/).waitFor();
    const playerView = await page.evaluate(async () => {
      const response = await fetch("/api/world", {
        headers: { Authorization: "Bearer browser-fixture" },
      });
      return response.json();
    });
    assert.equal(playerView.world.vision.owner, 0);
    assert(
      playerView.world.vision.visible.length < playerView.world.regions.length,
    );
    assert(
      playerView.world.regions.some(
        (r: { garrison: number }) => r.garrison === -1,
      ),
    );
    await page.getByRole("region", { name: "Active engagements" }).waitFor();
    await page
      .getByRole("region", { name: "Active engagements" })
      .getByRole("button")
      .first()
      .click();
    await page.getByText(/squads ·/).waitFor();
    assert.equal(await page.getByLabel("Map zoom").textContent(), "300%");
    await page.getByRole("button", { name: "Close information panel" }).click();
    await page.waitForTimeout(400);
    const centerX = width / 2 + (width > 800 ? 170 : 0);
    await page.mouse.move(centerX, 486);
    await page.waitForTimeout(100);
    assert.match(
      (await page.locator(".map-interaction").textContent()) ?? "",
      /Other army/,
    );
    assert.match(
      await page
        .locator(".campaign-view canvas")
        .evaluate((el) => getComputedStyle(el).cursor),
      /data:image/,
    );
    await page.mouse.click(centerX, 486);
    await page.getByRole("button", { name: "Close information panel" }).click();
    await page.mouse.move(20, 20);
    await page.waitForTimeout(100);
    assert.match(
      (await page.locator(".map-interaction").textContent()) ?? "",
      /Selected army/,
    );
    await page.mouse.move(centerX + 28, 520);
    await page.waitForTimeout(100);
    assert.match(
      (await page.locator(".map-interaction").textContent()) ?? "",
      /Territory/,
    );
    await page.mouse.click(centerX + 28, 520);
    await page.getByRole("button", { name: "Close information panel" }).click();
    await page.mouse.move(20, 20);
    await page.waitForTimeout(100);
    assert.match(
      (await page.locator(".map-interaction").textContent()) ?? "",
      /Selected territory/,
    );
    const identityBox = await page.locator(".command-identity").boundingBox();
    assert(
      identityBox &&
        identityBox.y >= 92 &&
        identityBox.x >= 0 &&
        identityBox.x + identityBox.width <= width,
    );
    await page.screenshot({
      path: `.impeccable/review/tactical-battle-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Fit continent", exact: true })
      .click();
    await page.waitForTimeout(400);
    assert.equal(await page.getByLabel("Map zoom").textContent(), "100%");
    assert.equal(await page.locator(".map-mode").textContent(), "Terrain");
    await page.getByRole("button", { name: "Zoom out", exact: true }).click();
    await page.waitForTimeout(400);
    assert.equal(await page.locator(".map-mode").textContent(), "Strategy");
    await page.screenshot({
      path: `.impeccable/review/tactical-strategy-${width}.png`,
    });
    await page
      .getByRole("button", { name: "Fit continent", exact: true })
      .click();
    for (let i = 0; i < 9; i++)
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.waitForTimeout(400);
    assert.equal(await page.getByLabel("Map zoom").textContent(), "600%");
    await page.screenshot({
      path: `.impeccable/review/tactical-detail-${width}.png`,
    });
    const first = store.get(w.id)!.tactics!.revision;
    await page.waitForTimeout(3500);
    assert(store.get(w.id)!.tactics!.revision > first);
    assert(store.get(w.id)!.tactics!.squads.some((s) => s.action === "firing"));
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    await page
      .getByRole("button", { name: "Fit continent", exact: true })
      .click();
    await page.waitForTimeout(400);
    const points = w.regions.flatMap((r) => r.polygon);
    const minX = Math.min(...points.map((p) => p[0])),
      maxX = Math.max(...points.map((p) => p[0]));
    const minY = Math.min(...points.map((p) => p[1])),
      maxY = Math.max(...points.map((p) => p[1]));
    const fit = Math.min(
      (width - (width > 800 ? 380 : 48)) / (maxX - minX),
      860 / (maxY - minY),
    );
    const project = (r: typeof source) => ({
      x: width / 2 + (width > 800 ? 170 : 0) + (r.x - (minX + maxX) / 2) * fit,
      y: 500 + (r.y - (minY + maxY) / 2) * fit,
    });
    const own = project(source),
      destination = project(target);
    await page.mouse.click(own.x, own.y - 14);
    await page.getByRole("button", { name: "Close information panel" }).click();
    let commands = 0;
    page.on("request", (req) => {
      if (req.url().endsWith("/api/command")) commands++;
    });
    const sent = page.waitForResponse((r) => r.url().endsWith("/api/command"));
    await page.mouse.click(destination.x, destination.y, { button: "right" });
    const response = await sent;
    assert.equal(response.status(), 200);
    assert.deepEqual(response.request().postDataJSON(), {
      type: "order",
      army: 0,
      order: "advance",
      target: target.id,
    });
    const count = commands;
    await page.mouse.move(destination.x, destination.y);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(destination.x + 45, destination.y + 25, { steps: 5 });
    await page.mouse.up({ button: "right" });
    await page.waitForTimeout(200);
    assert.equal(commands, count, "right-drag must pan without issuing orders");
    await page.keyboard.press("Escape");
    await page.mouse.move(20, 20);
    await page.waitForTimeout(3200);
    assert.match(
      (await page.locator(".map-interaction").textContent()) ?? "",
      /Hover to inspect/,
    );
    assert(
      await page
        .locator(".context-panel")
        .evaluate((el) => (el as HTMLElement).hidden),
    );
    const beforeCamera = await page
      .locator(".map-canvas")
      .getAttribute("data-camera-x");
    await page.keyboard.down("KeyD");
    await page.waitForTimeout(250);
    await page.keyboard.up("KeyD");
    const afterCamera = await page
      .locator(".map-canvas")
      .getAttribute("data-camera-x");
    assert(Number(afterCamera) < Number(beforeCamera));
    await page
      .getByRole("button", { name: "Fit continent", exact: true })
      .click();
    if (width === 390) {
      store.mutate(w.id, (state) => {
        state.armies.push(makeArmy(2, 0, source.id, "line"));
        state.regions[source.id].building = "fort";
      });
      await page.waitForTimeout(3300);
      await page.mouse.move(own.x - 16, own.y - 31);
      await page.mouse.down();
      await page.mouse.move(own.x + 36, own.y + 3, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(200);
      assert.match(
        (await page.locator(".context-panel").textContent()) ?? "",
        /2 armies selected/,
      );
      assert.equal(
        await page.locator(".context-panel .region-info").count(),
        0,
      );
      await page
        .getByRole("button", { name: "Close information panel" })
        .click();
      await page.mouse.click(own.x, own.y, { button: "right" });
      await page.getByRole("menu", { name: "Cover orders" }).waitFor();
      await page
        .getByRole("menuitem", { name: "Take cover", exact: true })
        .click();
      await page.waitForTimeout(800);
      assert(
        store
          .get(w.id)!
          .armies.filter((a) => a.owner === 0)
          .every((a) => a.cover?.feature === "fort"),
      );
      await page.keyboard.press("Escape");
    }
    await page.close();
    console.log(
      `${width}px: live engagement, squad telemetry, polling, no errors/overflow`,
    );
  }
  // Recovery cancels the offensive and its firing on the next server update.
  store.mutate(w.id, (w) =>
    command(w, 0, { type: "order", army: 0, order: "recover" }),
  );
  store.tick(w.id, Date.now() + 1000);
  assert(store.get(w.id)!.tactics!.squads.every((s) => s.action !== "firing"));
} finally {
  await browser.close();
  clearInterval(timer);
  await app.close();
  store.close();
}

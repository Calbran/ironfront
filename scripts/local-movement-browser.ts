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
const w = createWorld("LOCAL-BROWSER", "Boreal", 4, 60000, Date.now());
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
await app.listen({ host: "127.0.0.1", port: 3112 });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
mkdirSync(".impeccable/review", { recursive: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() =>
      localStorage.setItem("warfare-session", "browser-fixture"),
    );
    await page.goto("http://127.0.0.1:3112");
    await page
      .getByRole("region", { name: "Active engagements" })
      .getByRole("button")
      .first()
      .click();
    const panel = page.locator(".squad-orders");
    await panel.getByRole("checkbox").first().check();
    const selected = store
      .get(w.id)!
      .tactics!.squads.find((s) => s.army === 0)!;
    await panel.getByText("Position coordinates", { exact: true }).click();
    await panel
      .getByLabel("Position X", { exact: true })
      .fill(String(source.x));
    await panel
      .getByLabel("Position Y", { exact: true })
      .fill(String(source.y));
    let response = page.waitForResponse((r) =>
      r.url().endsWith("/api/command"),
    );
    await panel
      .getByRole("button", { name: "Move to position", exact: true })
      .click();
    assert.equal((await response).status(), 200);
    assert.equal(
      store.get(w.id)!.tactics!.squads.find((s) => s.id === selected.id)!
        .localOrder!.mode,
      "move",
    );
    assert(
      store
        .get(w.id)!
        .tactics!.squads.find((s) => s.id === selected.id)!
        .localOrder!.path.some((p) => p.region === source.id),
    );
    await panel
      .getByLabel("Position X", { exact: true })
      .fill(String(target.x));
    await panel
      .getByLabel("Position Y", { exact: true })
      .fill(String(target.y));
    response = page.waitForResponse((r) => r.url().endsWith("/api/command"));
    await panel
      .getByRole("button", { name: "Add waypoint", exact: true })
      .click();
    assert.equal((await response).status(), 200);
    assert.equal(
      store.get(w.id)!.tactics!.squads.find((s) => s.id === selected.id)!
        .localOrder!.waypoints.length,
      2,
    );
    response = page.waitForResponse((r) => r.url().endsWith("/api/command"));
    await panel
      .getByRole("button", { name: "Hold position", exact: true })
      .click();
    assert.equal((await response).status(), 200);
    assert.equal(
      store.get(w.id)!.tactics!.squads.find((s) => s.id === selected.id)!
        .localOrder!.path.length,
      0,
    );
    await panel
      .getByRole("button", { name: "Choose position on map", exact: true })
      .click();
    const box = await page.locator(".campaign-view canvas").boundingBox();
    assert(box);
    const px = box.x + box.width / 2,
      py = box.y + box.height / 2;
    // On phones close the drawer to expose the map while retaining placement mode.
    await page
      .getByRole("button", { name: "Close information panel", exact: true })
      .click();
    response = page.waitForResponse((r) => r.url().endsWith("/api/command"));
    const refreshed = page.waitForResponse((r) =>
      r.url().endsWith("/api/world"),
    );
    await page
      .getByText("Choose a position · Tap land to move", { exact: true })
      .waitFor();
    await page.waitForTimeout(150);
    await page.mouse.click(px, py);

    assert.equal((await response).status(), 200);
    await refreshed;
    await page.waitForTimeout(100);
    response = page.waitForResponse((r) => r.url().endsWith("/api/command"));
    await page.keyboard.down("Shift");
    await page.mouse.click(px, py, { button: "right" });
    await page.keyboard.up("Shift");
    assert.equal((await response).status(), 200);
    assert.equal(
      store.get(w.id)!.tactics!.squads.find((s) => s.id === selected.id)!
        .localOrder!.waypoints.length,
      2,
    );
    // Reopen the command panel and issue one atomic movement order to the whole group.
    await page
      .getByRole("button", { name: "Open command", exact: false })
      .click();
    await panel
      .getByRole("button", { name: "Select whole group", exact: true })
      .click();
    await panel
      .getByRole("button", { name: "Choose position on map", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Close information panel", exact: true })
      .click();
    await page
      .getByText("Choose a position · Tap land to move", { exact: true })
      .waitFor();
    await page.waitForTimeout(150);
    response = page.waitForResponse((r) => r.url().endsWith("/api/command"));
    await page.mouse.click(px, py);
    assert.equal((await response).status(), 200);
    assert(
      store
        .get(w.id)!
        .tactics!.squads.filter((s) => s.army === 0 && s.strength > 0)
        .every((s) => s.localOrder?.mode === "move"),
    );
    await page.waitForTimeout(350);
    await page.screenshot({
      path: `.impeccable/review/local-movement-${width}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.close();
    console.log(
      `${width}px: squad selection, cross-region move, append, Hold, map placement, Shift-right-click and whole-group orders passed`,
    );
  }
} finally {
  await browser.close();
  await app.close();
  store.close();
}

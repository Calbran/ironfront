import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
import { createWorld, makeArmy } from "../packages/game-core/src/index.ts";
import { syncSquads } from "../packages/game-core/src/tactics.ts";
import { localSegment } from "../packages/game-core/src/localMovement.ts";

const world = createWorld("THEMED-REGIONS", "Boreal", 4, 3600000, Date.now());
for (const n of world.nations) n.bot = false;
for (const r of world.regions) if (r.terrain !== "mountains") r.owner = 0;
const lake = world.regions.find((r) => r.terrainLayout?.theme === "lake")!;
const bridge = lake.terrainLayout!.crossings[0];
const army = makeArmy(0, 0, lake.id, "line");
army.squadKind = "infantry";
army.unitCount = 6;
world.armies = [army];
world.tactics = undefined;
syncSquads(world);
for (const s of world.tactics!.squads)
  Object.assign(s, {
    region: lake.id,
    x: bridge.points[0].x,
    y: bridge.points[0].y,
    previousX: bridge.points[0].x,
    previousY: bridge.points[0].y,
    localOrder: { region: lake.id, mode: "hold", waypoints: [], path: [] },
  });
const store = new Store(":memory:");
store.create(world, "terrain-preview");
const app = await makeServer(store);
await app.listen({ host: "127.0.0.1", port: 3138 });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
mkdirSync(".impeccable/review", { recursive: true });
try {
  for (const theme of ["scrapyard", "mountain-pass", "lake"] as const) {
    const r = world.regions.find((r) => r.terrainLayout?.theme === theme)!;
    assert(r, theme);
    const page = await browser.newPage({
        viewport: { width: 1440, height: 950 },
      }),
      errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() =>
      localStorage.setItem("warfare-session", "terrain-preview"),
    );
    await page.goto("http://127.0.0.1:3138");
    const map = page.locator(
      '.map-canvas[data-settlement-art="ready"][data-field-parcels]',
    );
    await map.waitFor({ timeout: 90000 });
    const focus =
      theme === "lake"
        ? {
            x: bridge.points[0].x,
            y: (bridge.points[0].y + bridge.points[1].y) / 2,
          }
        : r;
    async function screen(p: { x: number; y: number }) {
      return map.evaluate((el, p) => {
        const b = el.getBoundingClientRect();
        return {
          x:
            b.x +
            Number(el.getAttribute("data-camera-x")) +
            p.x * Number(el.getAttribute("data-camera-scale")),
          y:
            b.y +
            Number(el.getAttribute("data-camera-y")) +
            p.y * Number(el.getAttribute("data-camera-scale")),
        };
      }, p);
    }
    const f = await screen(focus);
    await page.mouse.move(720, 440);
    await page.mouse.down({ button: "middle" });
    await page.mouse.move(1440 - f.x, 880 - f.y, { steps: 8 });
    await page.mouse.up({ button: "middle" });
    await page.mouse.move(720, 440);
    for (let i = 0; i < 7; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: `.impeccable/review/terrain-layout-${theme}.png`,
    });
    if (theme === "lake") {
      const start = await screen(bridge.points[0]),
        end = await screen(bridge.points[1]);
      await page.mouse.click(start.x, start.y);
      await page.waitForTimeout(300);
      const response = page.waitForResponse(
        (r) => r.url().endsWith("/api/command"),
        { timeout: 10000 },
      );
      await page.mouse.click(end.x, end.y, { button: "right" });
      assert.equal(
        (await response).status(),
        200,
        "bridge movement accepted through map interaction",
      );
      const ordered = store
        .get(world.id)!
        .tactics!.squads.find((s) => s.localOrder?.mode === "move")!;
      assert(ordered?.localOrder?.path.length);
      let at = { x: ordered.x, y: ordered.y };
      for (const p of ordered.localOrder!.path) {
        assert(localSegment(lake, at, p));
        at = p;
      }
      const rejected = await page.request.post(
        "http://127.0.0.1:3138/api/command",
        {
          headers: { authorization: "Bearer terrain-preview" },
          data: {
            type: "squad-order",
            squads: [ordered.id],
            mode: "move",
            points: [{ x: focus.x + bridge.width, y: focus.y }],
          },
        },
      );
      assert.equal(rejected.status(), 400, "open lake water is rejected");
      const solid=lake.terrainLayout!.obstacles.find(o=>o.kind==="ridge")!;
      const coverPoint={x:Math.max(...solid.polygon.map(p=>p.x))+12,y:solid.polygon.reduce((sum,p)=>sum+p.y,0)/solid.polygon.length};
      store.mutate(world.id,w=>{const s=w.tactics!.squads.find(s=>s.id===ordered.id)!;Object.assign(s,coverPoint,{localOrder:{region:lake.id,mode:"hold",waypoints:[],path:[]}});});
      await page.getByText("Terrain cover",{exact:false}).waitFor({timeout:10000});
      console.log("Terrain cover indicator displayed for the selected squad");
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);
      const mobileFocus=await screen(coverPoint);
      await page.mouse.move(195,380);await page.mouse.down({button:"middle"});
      await page.mouse.move(390-mobileFocus.x,760-mobileFocus.y,{steps:8});await page.mouse.up({button:"middle"});
      await page.waitForTimeout(300);
      await page.screenshot({
        path: ".impeccable/review/terrain-layout-phone.png",
      });
    }
    assert.deepEqual(errors, []);
    console.log(`${theme}: rendered without browser errors`);
    await page.close();
  }
} finally {
  await browser.close();
  await app.close();
  store.close();
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createWorld,
  makeArmy,
  command,
  upgradeWorld,
  type Region,
} from "../packages/game-core/src/index.ts";
import {
  syncSquads,
  beginEngagement,
  advanceTactics,
} from "../packages/game-core/src/tactics.ts";
import {
  stepLocal,
  localSegment,
} from "../packages/game-core/src/localMovement.ts";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
const box = (x: number, y: number, w: number, h: number) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];
function fixture() {
  const w = createWorld("PHYSICAL-TERRAIN", "Boreal", 4, 3600000, Date.now());
  const r: Region = {
    id: 0,
    name: "Lake",
    x: 100,
    y: 300,
    polygon: [
      [0, 0],
      [800, 0],
      [800, 600],
      [0, 600],
    ],
    area: 480000,
    neighbors: [],
    terrain: "plains",
    owner: 0,
    garrison: 0,
    consolidation: 0,
    building: null,
    construction: null,
    navigationCellSize: 20,
    terrainLayout: {
      version: 1,
      theme: "lake",
      obstacles: [
        { id: "water", kind: "water", polygon: box(300, 100, 200, 400) },
      ],
      crossings: [
        {
          id: "bridge",
          polygon: box(260, 270, 280, 60),
          points: [
            { x: 260, y: 300 },
            { x: 540, y: 300 },
          ],
          width: 60,
        },
      ],
      routes: [],
    },
  };
  w.regions = [r];
  w.mountainScenery = [];
  w.armies = [makeArmy(0, 0, 0, "line")];
  w.armies[0].squadKind = "infantry";
  w.tactics = undefined;
  for (const n of w.nations) {
    n.capital = 0;
    n.bot = false;
  }
  syncSquads(w);
  const s = w.tactics!.squads[0];
  Object.assign(s, { x: 100, y: 300, previousX: 100, previousY: 300 });
  return { w, r, s };
}
test("accepted bridge orders move across the deck, and stale routes across water reroute before displacement", () => {
  const { w, r, s } = fixture();
  command(w, 0, {
    type: "squad-order",
    squads: [s.id],
    mode: "move",
    points: [{ x: 700, y: 300 }],
  });
  for (let i = 0; i < 20 && s.localOrder?.mode === "move"; i++) {
    const before = { x: s.x, y: s.y };
    stepLocal(w, s, 0.1, 1000);
    assert(localSegment(r, before, s));
  }
  assert.equal(s.x, 700);
  assert.equal(s.y, 300);
  Object.assign(s, {
    x: 100,
    y: 150,
    localOrder: {
      region: 0,
      mode: "move",
      waypoints: [{ x: 700, y: 150 }],
      path: [{ x: 700, y: 150, region: 0 }],
    },
  });
  stepLocal(w, s, 0.1, 1000);
  assert(localSegment(r, { x: 100, y: 150 }, s));
  assert(
    s.localOrder!.path.length > 1,
    "stale water-crossing path is replaced with a detour",
  );
});
test("open-water API rejection is atomic and bridge commands survive database reopen", async () => {
  const { w, s } = fixture(),
    dir = mkdtempSync(join(tmpdir(), "ironfront-physical-")),
    file = join(dir, "world.sqlite");
  let store = new Store(file);
  store.create(w, "physical-test");
  const app = await makeServer(store);
  try {
    const before = JSON.stringify(store.get(w.id));
    const response = await app.inject({
      method: "POST",
      url: "/api/command",
      headers: { authorization: "Bearer physical-test" },
      payload: {
        type: "squad-order",
        squads: [s.id],
        mode: "move",
        points: [{ x: 400, y: 200 }],
      },
    });
    assert.equal(response.statusCode, 400);
    assert.equal(JSON.stringify(store.get(w.id)), before);
    store.mutate(w.id, (state) =>
      command(state, 0, {
        type: "squad-order",
        squads: [s.id],
        mode: "move",
        points: [{ x: 700, y: 300 }],
      }),
    );
    const saved = store.get(w.id)!;
    await app.close();
    store.close();
    store = new Store(file);
    const restored = store.get(w.id)!;
    assert.deepEqual(
      restored.regions[0].terrainLayout,
      saved.regions[0].terrainLayout,
    );
    assert.deepEqual(
      restored.tactics!.squads[0].localOrder,
      saved.tactics!.squads[0].localOrder,
    );
    delete restored.regions[0].terrainLayout;
    upgradeWorld(restored);
    assert.equal(
      restored.regions[0].terrainLayout,
      undefined,
      "legacy saves do not gain new physical terrain",
    );
  } finally {
    await app.close();
    store.close();
    for (const suffix of ["", "-wal", "-shm"])
      rmSync(file + suffix, { force: true });
    rmdirSync(dir);
  }
});
test("physical cover reduces live incoming damage for troops that do not own the region", () => {
  const { w, r } = fixture();
  r.terrainLayout = {
    version: 1,
    theme: "scrapyard",
    obstacles: [{ id: "heap", kind: "scrap", polygon: box(380, 220, 20, 60) }],
    crossings: [],
    routes: [],
  };
  w.armies.push(makeArmy(1, 1, 0, "line"));
  w.armies[1].squadKind = "infantry";
  w.tactics = undefined;
  syncSquads(w);
  beginEngagement(w, w.armies[1], 0);
  for (const s of w.tactics!.squads)
    Object.assign(s, {
      independent: true,
      region: 0,
      x: s.owner === 0 ? 350 : 410,
      y: 250,
      localOrder: { region: 0, mode: "hold", waypoints: [], path: [] },
    });
  const open = structuredClone(w);
  delete open.regions[0].terrainLayout;
  advanceTactics(open, 0.1);
  advanceTactics(w, 0.1);
  assert(open.armies[1].strength < 100, "the control actually receives fire");
  assert(
    w.armies[1].strength > open.armies[1].strength,
    "scrap blocks incoming fire enough to provide cover to either faction",
  );
});

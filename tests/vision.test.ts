import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createWorld,
  makeArmy,
  report,
} from "../packages/game-core/src/index.ts";
import {
  syncSquads,
  ensureTactics,
} from "../packages/game-core/src/tactics.ts";
import {
  visibleRegions,
  worldForPlayer,
} from "../packages/game-core/src/vision.ts";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
function fixture() {
  const w = createWorld("VISION01", "Vision", 4, 3600000, 0);
  w.regions = w.regions
    .slice(0, 5)
    .map((r, id) => ({
      ...r,
      id,
      terrain: "plains" as const,
      owner: id === 0 ? 0 : 1,
      neighbors: [id - 1, id + 1].filter((i) => i >= 0 && i < 5),
    }));
  w.armies = [
    makeArmy(0, 0, 0, "line"),
    makeArmy(1, 1, 1, "line"),
    makeArmy(2, 1, 4, "assault"),
  ];
  w.armies[1].route = [2, 3, 4];
  w.armies[1].target = 4;
  w.tactics = undefined;
  syncSquads(w);
  report(w, "secret enemy operation", "order", 1, 1);
  report(w, "distant battle", "combat", 4, 1);
  w.regions[4].building = "fort";
  w.regions[4].garrison = 63;
  ensureTactics(w).engagements.push({
    id: "hidden-battle",
    region: 4,
    attackers: [2],
    started: 0,
    elapsed: 1,
    status: "active",
  });
  return w;
}
test("vision conceals distant military state and secrets without changing authoritative state", () => {
  const w = fixture(),
    before = structuredClone(w),
    view = worldForPlayer(w, 0);
  assert.deepEqual([...visibleRegions(w, 0)].sort(), [0, 1]);
  assert.deepEqual(
    view.armies.map((a) => a.id),
    [0, 1],
  );
  assert.deepEqual(view.armies[1].route, []);
  assert.equal(view.armies[1].target, null);
  assert.equal(view.regions[4].garrison, -1);
  assert.equal(view.regions[4].building, null);
  assert.equal(view.nations[1].fuel, 0);
  assert(view.tactics!.squads.every((s) => s.region < 2));
  assert.equal(view.tactics!.engagements.length, 0);
  assert(!JSON.stringify(view).includes("secret enemy operation"));
  assert(!JSON.stringify(view).includes("distant battle"));
  assert.deepEqual(w, before);
});
test("advancing scouts reveal neighboring regions and withdrawing removes live intelligence", () => {
  const w = fixture(),
    s = w.tactics!.squads.find((s) => s.owner === 0)!;
  s.region = 3;
  assert(worldForPlayer(w, 0).armies.some((a) => a.id === 2));
  s.region = 0;
  assert(!worldForPlayer(w, 0).armies.some((a) => a.id === 2));
  w.regions[1].terrain = "mountains";
  assert(!visibleRegions(w, 0).has(1));
});
test("authenticated world API filters by session owner, including the host; saved state stays complete", async () => {
  const store = new Store(":memory:");
  store.create(fixture(), "vision-host");
  store.addSession("vision-other", "VISION01", 1);
  const app = await makeServer(store);
  try {
    const a = (
      await app.inject({
        method: "GET",
        url: "/api/world",
        headers: { authorization: "Bearer vision-host" },
      })
    ).json();
    const b = (
      await app.inject({
        method: "GET",
        url: "/api/world",
        headers: { authorization: "Bearer vision-other" },
      })
    ).json();
    assert.equal(a.host, true);
    assert.equal(a.world.vision.owner, 0);
    assert.equal(b.world.vision.owner, 1);
    assert(!a.world.armies.some((army: { id: number }) => army.id === 2));
    assert(b.world.armies.some((army: { id: number }) => army.id === 2));
    assert.equal(store.get("VISION01")!.armies.length, 3);
    assert.equal(store.get("VISION01")!.vision, undefined);
  } finally {
    await app.close();
    store.close();
  }
});

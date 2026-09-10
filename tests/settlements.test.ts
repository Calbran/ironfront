import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, command } from "../packages/game-core/src/index.ts";
import {
  syncSquads,
  advanceTactics,
} from "../packages/game-core/src/tactics.ts";
import { inCover } from "../packages/game-core/src/cover.ts";
import {
  resolveSettlementCaptures,
  settlementOwner,
} from "../packages/game-core/src/settlementCapture.ts";
import { worldForPlayer } from "../packages/game-core/src/vision.ts";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
function fixture() {
  const w = createWorld("CITY", "Boreal", 4, 3600000, 0);
  syncSquads(w);
  const s = w.tactics!.squads.find((s) => s.owner === 0)!;
  const r = w.regions[s.region];
  r.features ??= [];
  r.features.push({
    id: "test-town",
    name: "Brasswick",
    kind: "settlement",
    size: "town",
    x: s.x + 50,
    y: s.y,
  });
  return { w, s, r };
}
test("garrison command requires physical arrival, persists, and loses cover after moving or losing ownership", () => {
  const { w, s, r } = fixture();
  const a = w.armies.find((a) => a.id === s.army)!;
  command(w, 0, {
    type: "garrison-squads",
    squads: [s.id],
    region: r.id,
    feature: "test-town",
  });
  assert(!inCover(w, a, s));
  for (let i = 0; i < 100 && s.localOrder?.path.length; i++)
    advanceTactics(w, 0.1);
  assert(inCover(w, a, s));
  const restored = JSON.parse(JSON.stringify(w));
  const saved = restored.tactics.squads.find(
    (v: { id: string }) => v.id === s.id,
  );
  assert(inCover(restored, a, saved));
  r.owner = 1;
  assert(!inCover(w, a, s));
  r.owner = 0;
  command(w, 0, {
    type: "squad-order",
    squads: [s.id],
    mode: "hold",
    points: [],
  });
  assert(!inCover(w, a, s));
  assert(
    worldForPlayer(w, 1).tactics!.squads.every(
      (s) => s.owner === 1 || !s.garrisonSite,
    ),
  );
});
test("a ground squad captures a city only after uncontested physical arrival", () => {
  const { w, s, r } = fixture();
  const site = r.features!.find((f) => f.id === "test-town")!;
  site.owner = 1;
  command(w, 0, {
    type: "capture-settlement",
    squads: [s.id],
    region: r.id,
    feature: site.id,
  });
  assert.equal(settlementOwner(r, site), 1);
  assert.deepEqual(s.captureSite, { region: r.id, feature: site.id });
  for (let i = 0; i < 150 && site.owner !== 0; i++) advanceTactics(w, 0.1);
  assert.equal(site.owner, 0);
  assert.equal(s.captureSite, undefined);
  assert.deepEqual(s.garrisonSite, { region: r.id, feature: site.id });
  assert(w.events.some((event) => event.text.includes("captured Brasswick")));
  const restored = JSON.parse(JSON.stringify(w));
  const restoredSite = restored.regions[r.id].features.find(
    (feature: { id: string }) => feature.id === site.id,
  );
  assert.equal(restoredSite.owner, 0);
});
test("a hostile squad at the city blocks capture", () => {
  const { w, s, r } = fixture();
  const site = r.features!.find((f) => f.id === "test-town")!;
  site.owner = 1;
  command(w, 0, {
    type: "capture-settlement",
    squads: [s.id],
    region: r.id,
    feature: site.id,
  });
  s.region = r.id;
  s.x = site.x;
  s.y = site.y;
  const enemy = w.tactics!.squads.find((unit) => unit.owner === 1)!;
  enemy.region = r.id;
  enemy.x = site.x;
  enemy.y = site.y;
  assert.deepEqual(resolveSettlementCaptures(w), []);
  assert.equal(site.owner, 1);
  enemy.strength = 0;
  assert.equal(resolveSettlementCaptures(w)[0].owner, 0);
  assert.equal(site.owner, 0);
});
test("settlement group validation is atomic and API requires ownership", async () => {
  const { w, s, r } = fixture();
  const enemy = w.tactics!.squads.find((s) => s.owner === 1)!;
  const old = structuredClone(w);
  assert.throws(
    () =>
      command(w, 0, {
        type: "garrison-squads",
        squads: [s.id, enemy.id],
        region: r.id,
        feature: "test-town",
      }),
    /own/,
  );
  assert.deepEqual(w, old);
  const store = new Store(":memory:");
  store.create(w, "city-test");
  const app = await makeServer(store);
  try {
    const payload = {
      type: "garrison-squads",
      squads: [s.id],
      region: r.id,
      feature: "test-town",
    };
    assert.equal(
      (await app.inject({ method: "POST", url: "/api/command", payload }))
        .statusCode,
      401,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/command",
          headers: { authorization: "Bearer city-test" },
          payload,
        })
      ).statusCode,
      200,
    );
  } finally {
    await app.close();
    store.close();
  }
});
test("the API accepts an authorized settlement capture order", async () => {
  const { w, s, r } = fixture();
  r.features!.find((feature) => feature.id === "test-town")!.owner = 1;
  const store = new Store(":memory:");
  store.create(w, "capture-test");
  const app = await makeServer(store);
  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/command",
      headers: { authorization: "Bearer capture-test" },
      payload: {
        type: "capture-settlement",
        squads: [s.id],
        region: r.id,
        feature: "test-town",
      },
    });
    assert.equal(response.statusCode, 200);
  } finally {
    await app.close();
    store.close();
  }
});

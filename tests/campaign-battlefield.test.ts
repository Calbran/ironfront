import test, { before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createCountrySlice,
  createSliceState,
  commandSlice,
  type SlicePlan,
} from "../packages/game-core/src/countrySlice";
import {
  createCampaignPlan,
  createCampaignState,
  advanceCampaign,
  campaignRuntime,
  buildCampaignSandbags,
  type CampaignState,
} from "../packages/game-core/src/campaignBattlefield";
import {
  advanceCountryCombat,
  countryPlayerState,
} from "../packages/game-core/src/countryEncounter";
import { parseOSMSample } from "../packages/game-core/src/countryOSM";
import {
  CampaignBattlefieldStore,
  serializeCampaignPlan,
} from "../apps/api/src/campaignBattlefieldRoutes";
import { Store, hash } from "../apps/api/src/store";
import { makeServer } from "../apps/api/src/server";

let base: SlicePlan,
  plan: SlicePlan,
  runtime: ReturnType<typeof campaignRuntime>;
before(() => {
  const sample = parseOSMSample(
    JSON.parse(
      readFileSync("apps/web/public/data/country-osm/painswick.json", "utf8"),
    ),
  );
  base = createCountrySlice(sample);
  plan = createCampaignPlan(base);
  runtime = campaignRuntime(plan, createCampaignState(plan, 0));
});
test("campaign expands the shared geography without inflating buildings or detaching the city", () => {
  assert.equal(plan.width * plan.depth, 4 * base.width * base.depth);
  assert.equal(plan.roads.connectedSites, plan.sites.length);
  assert.equal(plan.sites.length, 11);
  assert.deepEqual(plan.city, base.city);
  assert.deepEqual(plan.cityContext, base.cityContext);
  for (const s of base.sites)
    assert.deepEqual(
      plan.sites.find((p) => p.id === s.id),
      s,
    );
  assert.equal(
    plan.surface.heights.length,
    plan.surface.cols * plan.surface.rows,
  );
  const s = createCampaignState(plan, 0, runtime.nav);
  assert.equal(s.units.flatMap((u) => u.members ?? [u]).length, 64);
  assert.equal(s.encounter, undefined);
  assert.equal(s.running, true);
  assert.ok(
    s.units
      .flatMap((u) => u.members ?? [u])
      .every((u) => runtime.nav.walkable(u, u.kind)),
  );
});
test("campaign combat has no ten-minute scenario deadline and retains bounded offline backlog", () => {
  const s = createSliceState(0);
  s.units = [];
  s.running = true;
  s.battlefield = { elapsed: 601, remainder: 0, shots: [], sequence: 0 };
  advanceCountryCombat(s, 86400000, () => 0);
  assert.equal(s.running, true);
  assert.equal(s.encounter, undefined);
  assert.equal(s.battlefield.elapsed, 603);
  assert.equal(s.battlefield.remainder, 86398);
  const restored = JSON.parse(JSON.stringify(s));
  advanceCountryCombat(restored, 86400000, () => 0);
  assert.equal(restored.battlefield.elapsed, 605);
  assert.equal(restored.battlefield.remainder, 86396);
});
test("occupation, movement and supplies are independent of snapshot frequency and serialized restart", () => {
  const original = createCampaignState(plan, 0, runtime.nav);
  original.units = original.units.filter((u) => !u.enemy);
  const territory = original.campaign.territories.find(
    (t) => t.id === "north-farm",
  )!;
  territory.owner = 1;
  const occupier = original.units.find((u) => u.id === 5)!;
  occupier.members!.forEach((m) => {
    m.x = territory.x;
    m.z = territory.z;
  });
  const a = structuredClone(original);
  let b = structuredClone(original);
  advanceCampaign(
    a,
    65000,
    runtime.plan,
    runtime.nav,
    () => 0,
    () => false,
  );
  while (a.battlefield!.remainder >= 0.25)
    advanceCampaign(
      a,
      65000,
      runtime.plan,
      runtime.nav,
      () => 0,
      () => false,
    );
  for (let t = 250; t <= 65000; t += 250) {
    advanceCampaign(
      b,
      t,
      runtime.plan,
      runtime.nav,
      () => 0,
      () => false,
    );
    if (t === 32000) b = JSON.parse(JSON.stringify(b));
  }
  assert.deepEqual(
    JSON.parse(JSON.stringify(a)),
    JSON.parse(JSON.stringify(b)),
  );
  assert.equal(
    a.campaign.territories.find((t) => t.id === "north-farm")!.owner,
    0,
  );
  assert.ok(a.campaign.supplies > 100);
});
test("unseen campaign enemies and ballistics stay private while coarse hearing survives", () => {
  const s = createCampaignState(plan, 0, runtime.nav),
    friendly = s.units[0].members![0],
    enemy = s.units.find((u) => u.enemy)!.members![0];
  enemy.x = friendly.x + 100;
  enemy.z = friendly.z;
  s.battlefield!.shots = [
    {
      id: 1,
      from: enemy.id,
      to: friendly.id,
      x: enemy.x,
      z: enemy.z,
      tx: friendly.x,
      tz: friendly.z,
      at: 0,
      shell: false,
    },
  ];
  s.battlefield!.pending = [
    { due: 1, x: enemy.x, z: enemy.z, enemy: true, antiTank: false },
  ];
  const view = countryPlayerState(s, () => false);
  assert.ok(view.units.every((u) => !u.enemy));
  assert.deepEqual(view.battlefield!.shots, []);
  assert.equal(view.battlefield!.pending, undefined);
  assert.equal(view.sounds?.length, 1);
  assert.equal("from" in view.sounds![0], false);
  assert.notEqual(view.sounds![0].x, enemy.x);
  assert.equal(s.battlefield!.pending.length, 1);
});
test("built sandbags block infantry, provide cover and can be crossed and crushed by a tank", () => {
  const s = createCampaignState(plan, 0, runtime.nav);
  const infantry = s.units[0].members![0];
  let p: { x: number; z: number } | undefined;
  for (let r = 5; r < 35 && !p; r += 2)
    for (let a = 0; a < 16 && !p; a++) {
      const q = {
        x: infantry.x + Math.cos((a * Math.PI) / 8) * r,
        z: infantry.z + Math.sin((a * Math.PI) / 8) * r,
      };
      try {
        buildCampaignSandbags(s, plan, runtime.nav, q, 0);
        p = q;
      } catch {}
    }
  assert.ok(
    p,
    "There must be a legal construction site near the starting infantry",
  );
  const built = campaignRuntime(plan, s);
  assert.equal(built.nav.walkable(p, "infantry"), false);
  assert.equal(built.nav.walkable(p, "tank"), true);
  assert.equal(s.campaign.supplies, 90);
  const tank = s.units.find((u) => u.kind === "tank")!;
  tank.x = p.x;
  tank.z = p.z;
  advanceCampaign(
    s,
    250,
    built.plan,
    built.nav,
    () => 0,
    () => false,
  );
  assert.equal(s.sandbags?.length, 0);
  const cleared = campaignRuntime(plan, s);
  assert.equal(cleared.nav.walkable(p, "infantry"), true);
});
test("campaign storage is atomic, survives SQLite reopen and leaves older worlds untouched", () => {
  const dir = mkdtempSync(join(tmpdir(), "ironfront-alpha-")),
    file = join(dir, "save.sqlite"),
    key = "2".repeat(48);
  let store = new Store(file);
  try {
    let saves = new CampaignBattlefieldStore(store);
    const s = createCampaignState(plan, 123, runtime.nav);
    saves.create(key, s);
    assert.throws(() =>
      saves.mutate(hash(key), (s) => {
        s.campaign.supplies = 0;
        throw Error("invalid order");
      }),
    );
    assert.equal(saves.read(hash(key)).campaign.supplies, 100);
    assert.equal(store.ids().length, 0);
    store.close();
    store = new Store(file);
    saves = new CampaignBattlefieldStore(store);
    assert.deepEqual(saves.read(hash(key)), JSON.parse(JSON.stringify(s)));
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("the server simulates without polling, rejects enemy orders and resumes the same campaign", async () => {
  const store = new Store(":memory:"),
    saves = new CampaignBattlefieldStore(store),
    key = "3".repeat(48),
    id = hash(key);
  store.db
    .prepare("INSERT INTO campaign_geography VALUES(1,?)")
    .run(JSON.stringify(serializeCampaignPlan(plan)));
  saves.create(key, createCampaignState(plan, Date.now(), runtime.nav));
  const app = await makeServer(store),
    headers = { authorization: "Bearer " + key };
  try {
    assert.equal(
      (await app.inject({ url: "/api/battlefield/state" })).statusCode,
      401,
    );
    const first = (
      await app.inject({ url: "/api/battlefield/state", headers })
    ).json();
    await new Promise((r) => setTimeout(r, 1100));
    assert.ok(
      saves.read(id).battlefield!.elapsed > first.battlefield.elapsed,
      "background scheduler must advance with no requests",
    );
    const denied = await app.inject({
      method: "POST",
      url: "/api/battlefield/command",
      headers,
      payload: { action: "hold", ids: [21] },
    });
    assert.equal(denied.statusCode, 400);
    const ordered = await app.inject({
      method: "POST",
      url: "/api/battlefield/command",
      headers,
      payload: { action: "hold", ids: [5] },
    });
    assert.equal(
      ordered.statusCode,
      200,
      "friendly IDs beyond the old four-unit roster must work",
    );
    assert.equal(ordered.json().encounter, undefined);
    const noLaunch = await app.inject({
      method: "POST",
      url: "/api/battlefield/command",
      headers,
      payload: { action: "encounter" },
    });
    assert.equal(noLaunch.statusCode, 400);
  } finally {
    await app.close();
    store.close();
  }
});

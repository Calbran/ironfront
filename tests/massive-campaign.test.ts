import test, { before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createCountrySlice,
  createSliceNavigation,
  type SlicePlan,
} from "../packages/game-core/src/countrySlice";
import { parseOSMSample } from "../packages/game-core/src/countryOSM";
import { createMassiveCampaignPlan } from "../packages/game-core/src/massiveCampaign";
import { createPacingStudy } from "../packages/game-core/src/campaignPacingStudy";
import { CAMPAIGN_MODEL_PER_WORLD } from "../packages/game-core/src/campaignPhysicalScale";
import { PHYSICAL_SEPARATION } from "../apps/web/src/experiments/pacingPhysicalScale";
import { WORLD_TO_MODEL } from "../apps/web/src/experiments/miniatureData";
import {
  countryLandscapeSamples,
  countryLandscapeTile,
  countryTreesNear,
} from "../packages/game-core/src/countryLandscape";
import {
  countryLongSegmentClear,
  createCountryTravelGraph,
} from "../packages/game-core/src/countryTravelGraph";
import {
  createCampaignState,
  campaignRuntime,
  advanceCampaign,
} from "../packages/game-core/src/campaignBattlefield";
import { countryObstaclesNear } from "../packages/game-core/src/countryObstacleIndex";
import { coverAtObstacles } from "../packages/game-core/src/cityTactics";
import {
  serializeCampaignPlan,
  restoreCampaignPlan,
  CampaignBattlefieldStore,
} from "../apps/api/src/campaignBattlefieldRoutes";
import { Store, hash } from "../apps/api/src/store";
import { makeServer } from "../apps/api/src/server";
let base: SlicePlan, plan: SlicePlan;
before(() => {
  base = createCountrySlice(
    parseOSMSample(
      JSON.parse(
        readFileSync("apps/web/public/data/country-osm/painswick.json", "utf8"),
      ),
    ),
  );
  plan = createMassiveCampaignPlan(base, 2);
});
test("campaign uses the entire scale-test continent while retaining local city dimensions", () => {
  const world = createPacingStudy("Meridian").world;
  assert.equal(CAMPAIGN_MODEL_PER_WORLD, PHYSICAL_SEPARATION * WORLD_TO_MODEL);
  assert.equal(plan.width, world.geography!.width * CAMPAIGN_MODEL_PER_WORLD);
  assert.equal(plan.depth, world.geography!.height * CAMPAIGN_MODEL_PER_WORLD);
  assert.ok(plan.width > 400000);
  assert.deepEqual(plan.city, base.city);
  assert.deepEqual(plan.cityContext, base.cityContext);
  assert.ok(plan.surface.land.some((v) => v === 0));
  assert.ok(plan.surface.land.some((v) => v === 1));
  assert.ok(plan.sites.length > 300);
  assert.ok(plan.campaignMap!.fields.length > 1000);
  assert.equal(plan.rivers.length, world.geography!.rivers.length);
  assert.equal(plan.roads.scale, 1);
  const restored = restoreCampaignPlan(
    JSON.parse(JSON.stringify(serializeCampaignPlan(plan))),
  );
  assert.deepEqual(restored.surface.land, plan.surface.land);
  assert.deepEqual(restored.campaignMap, plan.campaignMap);
});
test("forest tiles are deterministic across eviction, share query samples, and reject whole-world allocation", () => {
  assert.throws(() => countryLandscapeSamples(plan), /bounded tile/);
  const home = plan.sites[0],
    x = Math.floor(home.x / 160) + 6,
    z = Math.floor(home.z / 160),
    first = structuredClone(countryLandscapeTile(plan, x, z));
  for (let i = 0; i < 130; i++) countryLandscapeTile(plan, x + 20 + i, z);
  assert.deepEqual(countryLandscapeTile(plan, x, z), first);
  assert.ok(
    first.trees.every((p) => p.x >= x * 160 - 2 && p.x <= (x + 1) * 160 + 2),
  );
  const p = { x: x * 160 + 80, z: z * 160 + 80 };
  assert.deepEqual(
    countryTreesNear(plan, p, 12),
    first.trees.filter((t) => Math.hypot(t.x - p.x, t.z - p.z) <= 12),
  );
});
test("shared city navigation, local cover, and continuous combat run at continental coordinates", () => {
  const state = createCampaignState(plan, 0),
    r = campaignRuntime(plan, state);
  assert.equal(state.campaign.mapVersion, 2);
  assert.equal(state.encounter, undefined);
  for (const u of state.units.flatMap((u) => u.members ?? [u]))
    assert.ok(r.nav.walkable(u, u.kind));
  const from = state.units[0],
    to = state.units[4],
    path = r.nav.route(from, to, "infantry");
  assert.ok(path.length);
  assert.ok(
    path.every((p, i) => r.nav.clear(i ? path[i - 1] : from, p, "infantry")),
  );
  const at = plan.obstacles[0],
    p = { x: at.x + at.width / 2 + 1, z: at.z };
  assert.deepEqual(
    coverAtObstacles(p, undefined, countryObstaclesNear(plan, p)),
    coverAtObstacles(p, undefined, plan.obstacles),
  );
  advanceCampaign(state, 1000, plan, r.nav, r.sight, r.vision);
  assert.equal(state.battlefield!.elapsed, 1);
  const ocean = { x: 100, z: 100 };
  assert.equal(r.nav.walkable(ocean, "tank"), false);
  assert.equal(r.nav.walkable(ocean, "airship"), true);
});
test("country road routing detours around a thin wall and refuses a disconnected water crossing", () => {
  const surface = {
    ...plan.surface,
    step: 40,
    cols: 251,
    rows: 51,
    land: new Uint8Array(251 * 51).fill(1),
    biomes: new Uint8Array(251 * 51).fill(1),
    heights: new Float32Array(251 * 51),
  };
  const p = {
    ...plan,
    width: 10000,
    depth: 2000,
    surface,
    rivers: [],
    obstacles: [
      {
        id: "wall",
        kind: "wall" as const,
        x: 5000,
        z: 100,
        width: 2,
        depth: 800,
        angle: 0,
      },
    ],
    roads: {
      ...plan.roads,
      bridges: [],
      roads: [
        {
          id: "detour",
          width: 6,
          highway: true,
          path: [
            { x: 100, y: 100 },
            { x: 100, y: 1000 },
            { x: 9000, y: 1000 },
            { x: 9000, y: 100 },
          ],
        },
      ],
    },
  };
  const a = { x: 100, z: 100 },
    b = { x: 9000, z: 100 },
    clear = (a: { x: number; z: number }, b: { x: number; z: number }) =>
      countryLongSegmentClear(p, a, b, "infantry");
  assert.equal(clear(a, b), false);
  const route = createCountryTravelGraph(p, clear)(a, b, "infantry");
  assert.ok(route.every((q, i) => clear(i ? route[i - 1] : a, q)));
  const island = { ...p, surface: { ...surface, land: surface.land.slice() } };
  for (let z = 0; z < 51; z++) island.surface.land[z * 251 + 125] = 0;
  assert.throws(
    () =>
      createCountryTravelGraph(island, (a, b) =>
        countryLongSegmentClear(island, a, b, "infantry"),
      )(a, b, "infantry"),
    /connected land route/,
  );
});
test("old and full campaigns restore their own geography on the same server", async () => {
  const store = new Store(":memory:"),
    saves = new CampaignBattlefieldStore(store),
    oldKey = "3".repeat(48),
    newKey = "4".repeat(48);
  store.db
    .prepare("INSERT INTO campaign_geography VALUES(1,?)")
    .run(JSON.stringify(serializeCampaignPlan(base)));
  store.db
    .prepare("INSERT INTO campaign_geography VALUES(2,?)")
    .run(JSON.stringify(serializeCampaignPlan(plan)));
  const currentPlan = structuredClone(plan);
  currentPlan.campaignMap!.version = 3;
  store.db
    .prepare("INSERT INTO campaign_geography VALUES(3,?)")
    .run(JSON.stringify(serializeCampaignPlan(currentPlan)));
  // The earlier fixture has only four sites; reuse valid deployed state while testing map-version dispatch only.
  const old = createCampaignState(plan, Date.now());
  old.campaign.mapVersion = 1;
  old.running = false;
  old.units = [];
  old.campaign.territories = [];
  saves.create(oldKey, old);
  saves.create(newKey, createCampaignState(plan, Date.now()));
  const app = await makeServer(store);
  try {
    for (const [key, width] of [
      [oldKey, base.width],
      [newKey, plan.width],
    ] as const) {
      const response = await app.inject({
        url: "/api/battlefield/plan",
        headers: { authorization: "Bearer " + key },
      });
      assert.equal(response.statusCode, 200);
      assert.equal(response.json().width, width);
    }
    assert.equal(saves.read(hash(oldKey)).campaign.mapVersion, 1);
    const created = await app.inject({
      method: "POST",
      url: "/api/battlefield",
      payload: {},
    });
    assert.equal(created.statusCode, 200);
    assert.equal(created.json().state.campaign.mapVersion, 3);
  } finally {
    await app.close();
    store.close();
  }
});

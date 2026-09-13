import { parseOSMSample } from "../packages/game-core/src/countryOSM";
import { segmentDistance } from "../packages/game-core/src/organicCity";
import {
  countryBridgeDeckHeight,
  countryRoadSurfaceHeight,
} from "../packages/game-core/src/countryRoadNetwork";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createCountrySlice,
  createSliceNavigation,
  createSliceState,
  advanceSlice,
  commandSlice,
  upgradeSliceCity,
  type SlicePlan,
} from "../packages/game-core/src/countrySlice";
import { Store } from "../apps/api/src/store";
import { CountrySliceStore } from "../apps/api/src/countrySliceRoutes";
import { makeServer } from "../apps/api/src/server";
let cached: SlicePlan;
const plan = () =>
  (cached ??= createCountrySlice(
    parseOSMSample(
      JSON.parse(
        readFileSync(
          new URL(
            "../apps/web/public/data/country-osm/painswick.json",
            import.meta.url,
          ),
          "utf8",
        ),
      ),
    ),
  ));
test("geographic sector preserves city scale and joins city, hamlet and bridged outpost", () => {
  const p = plan();
  assert.equal(p.source.seed, "Meridian");
  assert.ok(p.city.lots.length >= 250 && p.city.lots.length <= 440);
  assert.equal(p.cityContext.setting, "inland");
  assert.ok(p.city.parcels.every((parcel) => parcel.lotIndices.length > 0));
  assert.equal(p.roads.connectedSites, p.sites.length);
  assert.ok(p.roads.bridges.length);
  assert.ok(p.surface.heights.every((h) => Number.isFinite(h) && h >= -2 && h < 60));
  assert.ok(p.surface.heights.some((h) => h < -1), "river bed lies below its water surface");
  assert.ok(
    p.surface.heights.some((h) => h > 18),
    "country relief rises above the previously flat sector",
  );
  const n = createSliceNavigation(p);
  for (const u of createSliceState(0).units) assert.ok(n.walkable(u, u.kind));
  const house = p.obstacles.find((o) => o.kind === "building")!;
  assert.equal(n.walkable(house, "infantry"), false);
  assert.equal(n.walkable(house, "airship"), true);
});
test("ground units use bridge and collision-tested paths; air can cross water directly", () => {
  const p = plan(),
    n = createSliceNavigation(p),
    state = createSliceState(0),
    end = { x: 2300, z: 970 };
  for (const kind of ["infantry", "tank"] as const) {
    const start = state.units.find((u) => u.kind === kind)!,
      path = n.route(start, end, kind);
    let a = start;
    for (const b of path) {
      assert.ok(n.clear(a, b, kind));
      a = { ...a, ...b };
    }
    assert.ok(
      path.some((q) =>
        p.roads.bridges.some(
          (b) => Math.hypot(q.x - b.x, q.z - b.y) < b.length + 30,
        ),
      ),
    );
  }
  const bridge = p.roads.bridges[0],
    deck = countryBridgeDeckHeight(p.surface, bridge, p.roads.scale),
    segment = p.rivers
      .flatMap((r) => r.slice(1).map((b, i) => ({ a: r[i], b })))
      .find(
        ({ a, b }) => segmentDistance({ x: bridge.x, z: bridge.y }, a, b) < 1,
      )!;
  assert.ok(segment);
  assert.ok(
    Math.abs(n.height({ x: bridge.x, z: bridge.y }) - (deck + 0.15)) < 1e-9,
    "unit feet use the same raised deck as the rendered bridge",
  );
  assert.ok(
    Math.abs(
      countryRoadSurfaceHeight(p.roads, p.surface, {
        x: bridge.x,
        y: bridge.y,
      }) - deck,
    ) < 1e-9,
  );
  const length = Math.hypot(
      segment.b.x - segment.a.x,
      segment.b.z - segment.a.z,
    ),
    water = {
      x: bridge.x + ((segment.b.x - segment.a.x) / length) * 80,
      z: bridge.y + ((segment.b.z - segment.a.z) / length) * 80,
    };
  assert.equal(n.walkable(water, "tank"), false);
  assert.equal(n.walkable(water, "airship"), true);
  assert.deepEqual(n.route(state.units[3], end, "airship"), [end]);
});
test("orders reject atomically, queue routes and occupy distinct available cover slots", () => {
  const p = plan(),
    n = createSliceNavigation(p),
    s = createSliceState(0),
    before = structuredClone(s);
  assert.throws(() =>
    commandSlice(p, n, s, [1, 999], "move", { x: 550, z: 919 }),
  );
  assert.deepEqual(s, before);
  assert.throws(() => commandSlice(p, n, s, [1, 3], "cover", p.cover[0]));
  assert.deepEqual(s, before);
  commandSlice(p, n, s, [1, 2], "cover", p.cover[0]);
  assert.notDeepEqual(s.units[0].path.at(-1), s.units[1].path.at(-1));
  commandSlice(p, n, s, [1], "hold");
  assert.equal(s.units[0].path.length, 0);
  commandSlice(p, n, s, [1], "move", { x: 520, z: 919 });
  const first = s.units[0].path.length;
  commandSlice(p, n, s, [1], "move", { x: 550, z: 919 }, true);
  assert.ok(s.units[0].path.length > first);
});
test("tank turns on its treads and elapsed movement is independent of polling frequency", () => {
  const a = createSliceState(0);
  a.running = true;
  const tank = a.units[2];
  tank.angle = 0;
  tank.path = [{ x: tank.x + 10, z: tank.z }];
  advanceSlice(a, 500);
  assert.equal(tank.x, 512);
  assert.ok(tank.angle > 0 && tank.angle < Math.PI / 2);
  const b = structuredClone(a);
  for (let time = 600; time <= 20000; time += 100) advanceSlice(a, time);
  advanceSlice(b, 20000);
  assert.ok(Math.abs(a.units[2].x - b.units[2].x) < 1e-8);
  assert.equal(b.units[2].path.length, 0);
  advanceSlice(b, 10);
  assert.equal(b.time, 20000);
});
test("saved routes resume after SQLite reopen and failed updates roll back", () => {
  const dir = mkdtempSync(join(tmpdir(), "ironfront-slice-")),
    file = join(dir, "test.sqlite");
  let store = new Store(file);
  try {
    let saves = new CountrySliceStore(store);
    saves.create("private-key", 0);
    saves.mutate("private-key", 0, (s) => {
      s.running = true;
      for(const m of s.units[0].members??[s.units[0]])m.path = [{ x: 643, z: 919 }];
    });
    const beforeFailure=saves.mutate("private-key",0);
    assert.throws(() =>
      saves.mutate("private-key", 10, (s) => {
        s.units[0].x = 0;
        throw Error("reject");
      }),
    );
    assert.deepEqual(saves.mutate("private-key", 0),beforeFailure);
    assert.throws(() => saves.mutate("wrong-key", 1));
    store.close();
    store = new Store(file);
    saves = new CountrySliceStore(store);
    const result = saves.mutate("private-key", 120000);
    assert.ok(Math.abs(result.units[0].x - 643) < 1e-8);
    assert.equal(result.units[0].path.length, 0);
    const raw = store.db.prepare("SELECT token FROM country_slices").get() as {
      token: string;
    };
    assert.notEqual(raw.token, "private-key");
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("slice API requires its own bearer session and validates commands", async () => {
  const store = new Store(":memory:"),
    app = await makeServer(store);
  try {
    const saves = new CountrySliceStore(store);
    saves.create("test-session", Date.now());
    const unauth = await app.inject({
      method: "GET",
      url: "/api/country-slice/state",
    });
    assert.notEqual(unauth.statusCode, 200);
    const ok = await app.inject({
      method: "GET",
      url: "/api/country-slice/state",
      headers: { authorization: "Bearer test-session" },
    });
    assert.equal(ok.statusCode, 200);
    assert.ok(!ok.body.includes("test-session"));
    saves.mutate("test-session", Date.now(), (state) =>
      state.units.push({
        id: 99,
        name: "secret distant enemy",
        kind: "tank",
        enemy: true,
        health: 100,
        x: 2990,
        z: 1790,
        angle: 0,
        distance: 0,
        path: [{ x: 2500, z: 1500 }],
        cover: false,
      }),
    );
    const concealed = await app.inject({
      method: "GET",
      url: "/api/country-slice/state",
      headers: { authorization: "Bearer test-session" },
    });
    assert.equal(concealed.statusCode, 200);
    assert.ok(!concealed.body.includes("secret distant enemy"));
    const night = await app.inject({
      method: "POST",
      url: "/api/country-slice/command",
      headers: { authorization: "Bearer test-session" },
      payload: { action: "lighting", lighting: "night" },
    });
    assert.equal(night.statusCode, 200);
    assert.equal(night.json().lighting, "night");
    const invalid = await app.inject({
      method: "POST",
      url: "/api/country-slice/command",
      headers: { authorization: "Bearer test-session" },
      payload: { action: "move", ids: [1], x: 999999, z: 0 },
    });
    assert.equal(invalid.statusCode, 400);
    const preview = await app.inject({
      method: "POST",
      url: "/api/country-slice/preview",
      headers: { authorization: "Bearer test-session" },
      payload: { action: "move", ids: [1], x: 500, z: 919, facing: 1 },
    });
    assert.equal(preview.statusCode, 200);
    assert.equal(preview.json().valid, true);
    const after = await app.inject({
      method: "GET",
      url: "/api/country-slice/state",
      headers: { authorization: "Bearer test-session" },
    });
    assert.ok(
      after
        .json()
        .units.every(
          (u: { path: unknown[]; facing?: number }) =>
            u.path.length === 0 && u.facing === undefined,
        ),
    );
    const blocked = await app.inject({
      method: "POST",
      url: "/api/country-slice/preview",
      payload: { action: "move", ids: [1], x: 500, z: 919 },
    });
    assert.notEqual(blocked.statusCode, 200);
  } finally {
    await app.close();
    store.close();
  }
});

test("city geometry migration clears obsolete orders and relocates only blocked units", () => {
  const p = plan(),
    nav = createSliceNavigation(p),
    state = createSliceState(0),
    valid = { x: state.units[1].x, z: state.units[1].z };
  state.version = 8;
  state.running = true;
  const building = p.obstacles.find((o) => o.kind === "building")!;
  Object.assign(state.units[0], {
    x: building.x,
    z: building.z,
    path: [{ x: 100, z: 100 }],
    cover: true,
  });
  upgradeSliceCity(state, nav);
  assert.equal(state.version, 9);
  assert.equal(state.running, false);
  assert.ok(
    state.units.every(
      (u) => u.path.length === 0 && !u.cover && nav.walkable(u, u.kind),
    ),
  );
  assert.deepEqual({ x: state.units[1].x, z: state.units[1].z }, valid);
  const revision = state.revision;
  upgradeSliceCity(state, nav);
  assert.equal(state.revision, revision);
});

test("drag facing centers a formation and tanks finish turning at a bounded rate", () => {
  const state = createSliceState(0),
    p = plan();
  const nav = {
    route: (_a: unknown, b: { x: number; z: number }) => [{ ...b }],
    walkable: () => true,
    clear: () => true,
    height: () => 0,
  } satisfies ReturnType<typeof createSliceNavigation>;
  commandSlice(
    p,
    nav,
    state,
    [1, 2],
    "move",
    { x: 100, z: 100 },
    false,
    Math.PI / 2,
  );
  assert.deepEqual(
    state.units.slice(0, 2).map((u) => u.path.at(-1)!.x),
    [100, 100],
  );
  const ends = state.units.slice(0, 2).map((u) => u.path.at(-1)!);
  assert.equal((ends[0].z + ends[1].z) / 2, 100);
  assert.ok(Math.abs(ends[0].z - ends[1].z) >= 1.4);
  const tank = state.units[2];
  tank.angle = 0;
  tank.facing = Math.PI / 2;
  state.running = true;
  advanceSlice(state, 500);
  assert.ok(Math.abs(tank.angle - 0.4) < 1e-8);
  const restored = JSON.parse(JSON.stringify(state));
  advanceSlice(restored, 2500);
  assert.ok(Math.abs(restored.units[2].angle - Math.PI / 2) < 1e-8);
});

 test("clear routes across city outskirts do not detour through the road portal", () => {
  const p = plan(), nav = createSliceNavigation(p);
  let checked = 0;
  for (const kind of ["infantry", "tank"] as const) {
    for (let z = 780; z <= 1020; z += 12) {
      const a = {x: 650, z}, b = {x: 670, z};
      if (!nav.clear(a, b, kind)) continue;
      assert.deepEqual(nav.route(a, b, kind), [b]);
      assert.deepEqual(nav.route(b, a, kind), [a]);
      checked++;
    }
  }
  assert.ok(checked >= 4, "exercise several clear edge crossings in both directions");
});

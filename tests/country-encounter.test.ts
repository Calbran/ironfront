import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../apps/api/src/store";
import { CountrySliceStore } from "../apps/api/src/countrySliceRoutes";
import {
  createSliceState,
  type SlicePlan,
} from "../packages/game-core/src/countrySlice";
import {
  advanceEncounter,
  COUNTRY_AIRSHIP_ALTITUDE,
  countryDetectionRange,
  countryDaylight,
  countryPlayerState,
  countryVisibility,
  countryVisionRange,
  encounterSight,
  sliceSurvivors,
  startEncounter,
  encounterFinished,
} from "../packages/game-core/src/countryEncounter";
import type { SliceUnit } from "../packages/game-core/src/countrySlice";
const battle = () => {
  const s = createSliceState(0);
  s.running = true;
  s.units = s.units.slice(0, 2);
  s.units[0].x = 0;
  s.units[0].z = 0;
  s.units[1].x = 20;
  s.units[1].z = 0;
  s.units[1].enemy = true;
  s.encounter = {
    elapsed: 0,
    remainder: 0,
    stage: "bridge",
    progress: 0,
    bridge: { x: 100, z: 0 },
    outpost: { x: 200, z: 0 },
    shots: [],
    sequence: 0,
  };
  return s;
};
test("country combat is invariant to polling and serialized restart, including magazines and casualties", () => {
  const a = battle();
  advanceEncounter(a, 80000, () => 1);
  let b = battle();
  for (let t = 250; t <= 40000; t += 250) advanceEncounter(b, t, () => 1);
  b = JSON.parse(JSON.stringify(b));
  for (let t = 40250; t <= 80000; t += 250) advanceEncounter(b, t, () => 1);
  assert.deepEqual(
    JSON.parse(JSON.stringify(b)),
    JSON.parse(JSON.stringify(a)),
  );
  assert.ok(a.encounter!.sequence > 0);
  assert.ok(a.units.some((u) => (u.health ?? 100) < 100));
});
test("squads retain a last survivor; blocked sight prevents damage and suppression", () => {
  const s = battle();
  assert.equal(sliceSurvivors(s.units[0]), 6);
  s.units[0].health = 1;
  assert.equal(sliceSurvivors(s.units[0]), 1);
  advanceEncounter(s, 5000, () => 0);
  assert.equal(s.units[0].health, 1);
  assert.equal(s.encounter!.sequence, 0);
  s.units[0].members!.forEach((m) => (m.health = 0));
  assert.equal(sliceSurvivors(s.units[0]), 0);
});
test("capture requires living infantry, completes in order, and offline work is bounded", () => {
  const s = battle();
  s.units = s.units.slice(0, 1);
  s.units[0].x = 100;
  advanceEncounter(s, 10000, () => 1);
  assert.equal(s.encounter!.stage, "outpost");
  s.units[0].members!.forEach((m) => (m.x += 100));
  advanceEncounter(s, 20000, () => 1);
  assert.equal(s.encounter!.stage, "victory");
  assert.equal(s.running, false);
  const timeout = battle();
  advanceEncounter(timeout, 30 * 86400000, () => 0);
  assert.equal(timeout.encounter!.stage, "defeat");
  assert.equal(timeout.encounter!.elapsed, 600);
});
test("a terrain ridge blocks country sight independently of ground colors", () => {
  assert.equal(COUNTRY_AIRSHIP_ALTITUDE, 45);
  const heights = new Float32Array(33);
  for (let z = 0; z < 3; z++) heights[z * 11 + 5] = 10;
  const plan = {
    obstacles: [],
    surface: { cols: 11, rows: 3, step: 2, heights },
  } as unknown as SlicePlan;
  const s = battle();
  s.units.forEach((u) => (u.z = 2));
  assert.equal(encounterSight(plan)(s.units[0], s.units[1]), 0);
  const airship = {
    ...s.units[0],
    kind: "airship" as const,
  };
  assert.equal(encounterSight(plan)(airship, s.units[1]), 1);
  for (let z = 0; z < 3; z++) heights[z * 11 + 5] = 30;
  assert.equal(encounterSight(plan)(airship, s.units[1]), 0);
});
test("airships observe over ground-level buildings", () => {
  const plan = {
    obstacles: [
      { id: "house", kind: "building", x: 10, z: 2, width: 4, depth: 4, angle: 0 },
    ],
    surface: { cols: 11, rows: 3, step: 2, heights: new Float32Array(33) },
  } as unknown as SlicePlan;
  const s = battle();
  s.units.forEach((unit) => (unit.z = 2));
  const sight = encounterSight(plan);
  assert.equal(sight(s.units[0], s.units[1]), 0);
  assert.equal(sight({ ...s.units[0], kind: "airship" }, s.units[1]), 1);
});
test("forest concealment shortens mutual detection while scout airships see much farther", () => {
  const unit = (
    id: number,
    kind: SliceUnit["kind"],
    x: number,
    path: SliceUnit["path"] = [],
  ): SliceUnit => ({
    id,
    name: String(id),
    kind,
    x,
    z: 0,
    angle: 0,
    distance: 0,
    path,
    cover: false,
  });
  const infantry = unit(1, "infantry", 0),
    tank = unit(2, "tank", 0),
    airship = unit(3, "airship", 0),
    hidden = unit(4, "infantry", 0),
    moving = unit(5, "infantry", 0, [{ x: 10, z: 0 }]);
  assert.equal(countryVisionRange(infantry), 180);
  assert.equal(countryVisionRange(tank), 500);
  assert.equal(countryVisionRange(airship), 1000);
  assert.equal(countryVisionRange(airship, 0, 0), 450);
  assert.equal(countryDaylight("day", 0), 1);
  assert.equal(countryDaylight("night", 0), 0);
  assert.ok(
    Math.abs(countryDetectionRange(infantry, hidden, 1, 1) - 40.95) < 1e-9,
  );
  assert.ok(
    Math.abs(countryDetectionRange(infantry, moving, 1, 1) - 52.65) < 1e-9,
  );
  assert(countryDetectionRange(airship, hidden, 0, 1) > 500);
  assert(countryDetectionRange(airship, hidden, 0, 1) > countryDetectionRange(tank, hidden, 0, 1));
});
test("airship contacts clear beyond current daylight-adjusted sight", () => {
  const state = createSliceState(0),
    airship = state.units.find((u) => u.kind === "airship")!;
  airship.x = 0;
  airship.z = 0;
  state.units = [
    airship,
    {
      ...airship,
      id: 99,
      name: "distant enemy",
      kind: "infantry",
      enemy: true,
      x: 600,
    },
  ];
  const visible = countryVisibility({} as SlicePlan, () => 1);
  state.lighting = "day";
  assert.equal(countryPlayerState(state, visible).units.length, 2);
  state.lighting = "night";
  assert.equal(countryPlayerState(state, visible).units.length, 1);
  state.lighting = "day";
  state.units[1].x = 1001;
  assert.equal(countryPlayerState(state, visible).units.length, 1);
});
test("country player state omits unseen enemies, their orders and pending fire", () => {
  const state = battle(),
    enemy = state.units[1];
  enemy.name = "hidden enemy";
  enemy.path = [{ x: 99, z: 99 }];
  state.encounter!.shots = [
    { id: 1, from: state.units[0].id, to: enemy.id, x: 0, z: 0, tx: 20, tz: 0, at: 0, shell: false },
  ];
  state.encounter!.pending = [
    { due: 1, x: 20, z: 0, enemy: true, antiTank: false },
  ];
  const hidden = countryPlayerState(state, () => false);
  assert.equal(hidden.units.some((u) => u.enemy), false);
  assert.deepEqual(hidden.encounter!.shots, []);
  assert.equal(hidden.encounter!.pending, undefined);
  const visible = countryPlayerState(state, () => true),
    disclosed = visible.units.find((u) => u.enemy)!;
  assert(disclosed);
  assert.deepEqual(disclosed.path, []);
  assert.equal(visible.encounter!.shots.length, 1);
});
test("SQLite reopen retains independent combat health, clocks and fire memory atomically", () => {
  const dir = mkdtempSync(join(tmpdir(), "slice-fight-")),
    file = join(dir, "state.db");
  let store = new Store(file);
  const advance = (s: ReturnType<typeof createSliceState>, now: number) =>
    advanceEncounter(s, now, () => 1);
  try {
    let saves = new CountrySliceStore(store, advance);
    saves.create("test-private", 0);
    saves.mutate("test-private", 0, (s) => Object.assign(s, battle()));
    const before = saves.mutate("test-private", 40000);
    assert.throws(() =>
      saves.mutate("test-private", 50000, () => {
        throw Error("reject");
      }),
    );
    assert.deepEqual(
      JSON.parse(JSON.stringify(saves.mutate("test-private", 40000))),
      JSON.parse(JSON.stringify(before)),
    );
    store.close();
    store = new Store(file);
    saves = new CountrySliceStore(store, advance);
    const resumed = saves.mutate("test-private", 80000),
      expected = battle();
    advance(expected, 80000);
    assert.deepEqual(
      JSON.parse(JSON.stringify(resumed)),
      JSON.parse(JSON.stringify(expected)),
    );
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("finished encounters can redeploy fresh troops while active encounters reject replacement", () => {
  const plan = {
    roads: { bridges: [{ x: 100, z: 0, y: 100, angle: 0 }] },
    sites: [{ id: "outpost", x: 300, z: 100 }],
  } as unknown as SlicePlan;
  const nav = { walkable: () => true } as unknown as Parameters<
    typeof startEncounter
  >[2];
  for (const stage of ["victory", "defeat"] as const) {
    const s = battle();
    s.encounter!.stage = stage;
    s.encounter!.elapsed = 600;
    sliceSurvivors(s.units[0]);
    s.units[0].health = 0;
    assert.equal(encounterFinished(s), true);
    startEncounter(s, plan, nav);
    assert.equal(encounterFinished(s), false);
    assert.equal(s.encounter!.elapsed, 0);
    assert.equal(s.running, false);
    assert.equal(sliceSurvivors(s.units[0]), 6);
    assert.equal(s.encounter!.sequence, 0);
    const before = JSON.stringify(s);
    assert.throws(() => startEncounter(s, plan, nav), /already deployed/);
    assert.equal(JSON.stringify(s), before);
  }
});

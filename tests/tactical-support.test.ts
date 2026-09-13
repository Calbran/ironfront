import test from "node:test";
import assert from "node:assert/strict";
import {
  updateTacticalSupport,
  SUPPORT_LEASH,
  type SupportUnit,
  type SupportGroup,
} from "../packages/game-core/src/tacticalSupport";
import { countryEncounterRoster } from "../packages/game-core/src/countryEncounterRoster";
import {
  createSliceState,
  type SlicePlan,
} from "../packages/game-core/src/countrySlice";
import {
  startEncounter,
  advanceEncounter,
} from "../packages/game-core/src/countryEncounter";
const unit = (id: number, x: number): SupportUnit => ({
  id,
  x,
  z: 0,
  path: [],
  health: 100,
});
const rules = { range: () => 26, visible: () => true, clear: () => true };
const scenario = () =>
  [
    { id: 0, enemy: false, units: [unit(1, 0), unit(2, -10)] },
    { id: 4, enemy: true, units: [unit(3, 20)] },
  ] as SupportGroup[];
test("whole squad shares a visible engagement while only out-of-range members reposition", () => {
  const g = scenario();
  updateTacticalSupport(g, 0, rules);
  assert.equal(g[0].units[0].supportTarget, 3);
  assert.equal(g[0].units[1].supportTarget, 3);
  assert.equal(g[0].units[0].path.length, 0);
  assert.equal(g[0].units[1].path.length, 1);
  assert.ok(g[0].units[1].path[0].x > -10);
});
test("reserve squads support nearby fighting but never unseen or isolated distant targets", () => {
  const run = (visible = true, engaged = true) => {
    const g: SupportGroup[] = [
      { id: 0, enemy: false, units: [unit(1, -25)] },
      { id: 4, enemy: false, units: [unit(2, engaged ? 0 : -200)] },
      { id: 8, enemy: true, units: [unit(3, 20)] },
    ];
    updateTacticalSupport(g, 0, { ...rules, visible: () => visible });
    return g[0].units[0];
  };
  assert.ok(run().path.length);
  assert.equal(run(false).path.length, 0);
  assert.equal(run(true, false).path.length, 0);
});
test("Hold and explicit moving orders take priority; blocked movement stays blocked", () => {
  for (const held of [true, false]) {
    const g = scenario(),
      u = g[0].units[1];
    u.stance = held ? "hold" : "move";
    u.path = held ? [] : [{ x: -80, z: 0 }];
    const before = structuredClone(u.path);
    updateTacticalSupport(g, 0, rules);
    assert.deepEqual(u.path, before);
    assert.equal(g[0].units[0].supportTarget, undefined);
  }
  const g = scenario();
  updateTacticalSupport(g, 0, { ...rules, clear: () => false });
  assert.equal(g[0].units[1].path.length, 0);
});
test("support is leashed, bounded and stable across save/reload", () => {
  const a: SupportGroup[] = [
    { id: 0, enemy: false, units: [unit(1, 0)] },
    { id: 4, enemy: false, units: [unit(2, 30)] },
    { id: 8, enemy: true, units: [unit(3, 50)] },
  ];
  let b = structuredClone(a);
  for (let tick = 0; tick < 20; tick++) {
    for (const g of [a, b]) {
      g[1].units[0].x = 30 + tick;
      g[2].units[0].x = 50 + tick;
      updateTacticalSupport(g, tick * 2, rules);
      const u = g[0].units[0];
      if (u.path.length) {
        Object.assign(u, u.path.at(-1));
        u.path = [];
      }
      assert.ok(u.x <= SUPPORT_LEASH);
    }
    b = JSON.parse(JSON.stringify(b));
    assert.deepEqual(JSON.parse(JSON.stringify(a)), b);
  }
  const many = Array.from(
    { length: 10 },
    (_, i) =>
      ({ id: i * 4, enemy: false, units: [unit(i, 0)] }) as SupportGroup,
  );
  updateTacticalSupport(many, 0, rules);
  assert.equal(many.filter((g) => (g.memory?.next ?? 0) > 0).length, 2);
});
test("expanded scenario has four mixed enemy pockets with unique IDs and complete healthy squads", () => {
  const s = createSliceState(0),
    plan = {
      roads: { bridges: [{ x: 100, y: 100, angle: 0 }] },
      sites: [{ id: "outpost", x: 600, z: 100 }],
    } as unknown as SlicePlan;
  startEncounter(s, plan, { walkable: () => true } as unknown as Parameters<
    typeof startEncounter
  >[2]);
  assert.equal(s.units.length, countryEncounterRoster.length);
  assert.equal(new Set(s.units.map((u) => u.id)).size, s.units.length);
  assert.equal(
    new Set(countryEncounterRoster.filter((u) => u.enemy).map((u) => u.pocket))
      .size,
    4,
  );
  assert.ok(s.units.filter((u) => u.enemy && u.kind === "tank").length >= 3);
  assert.ok(s.units.filter((u) => u.enemy && u.antiTank).length >= 3);
  assert.ok(
    s.units
      .filter((u) => u.members)
      .every(
        (u) =>
          u.members!.length === 6 && u.members!.every((m) => m.health === 100),
      ),
  );
});

test("country authority persists shared squad support and resumes the same movement", () => {
  const s = createSliceState(0);
  s.running = true;
  const base = s.units[0];
  s.units = [
    {
      ...base,
      id: 1,
      x: 0,
      z: 0,
      path: [],
      members: [
        { ...base, id: 100, x: 0, z: 0, path: [] },
        { ...base, id: 101, x: -35, z: 0, path: [], antiTank: true },
      ],
    },
    {
      ...base,
      id: 5,
      enemy: true,
      x: 23,
      z: 0,
      path: [],
      members: [{ ...base, id: 500, enemy: true, x: 23, z: 0, path: [] }],
    },
  ];
  s.encounter = {
    elapsed: 0,
    remainder: 0,
    stage: "bridge",
    progress: 0,
    bridge: { x: 1000, z: 0 },
    outpost: { x: 2000, z: 0 },
    shots: [],
    sequence: 0,
  };
  const plan = { obstacles: [] } as unknown as SlicePlan;
  const nav = {
    walkable: () => true,
    clear: () => true,
  } as unknown as Parameters<typeof startEncounter>[2];
  advanceEncounter(s, 750, () => 1, plan, nav);
  assert.ok(s.units[0].support);
  assert.equal(
    s.units[0].members![0].supportTarget,
    s.units[0].members![1].supportTarget,
  );
  assert.ok(s.units[0].members![1].path.length);
  const resumed = JSON.parse(JSON.stringify(s));
  advanceEncounter(s, 1750, () => 1, plan, nav);
  advanceEncounter(resumed, 1750, () => 1, plan, nav);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), resumed);
});

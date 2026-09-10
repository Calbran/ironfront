import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createWorld,
  makeArmy,
  command,
  type World,
} from "../packages/game-core/src/index.ts";
import {
  advanceTactics,
  beginEngagement,
  ensureTactics,
  syncSquads,
} from "../packages/game-core/src/tactics.ts";
import { Store } from "../apps/api/src/store.ts";
function battle(): World {
  const w = createWorld("TACTICS", "Tactics", 4, 10000, 0);
  const template = w.regions[0];
  w.regions = [0, 1, 1].map((owner, id) => ({
    ...structuredClone(template),
    id,
    owner,
    x: 100 + id * 240,
    y: 120,
    area: 40000,
    terrain: "plains",
    polygon: [
      [id * 240, 0],
      [(id + 1) * 240, 0],
      [(id + 1) * 240, 240],
      [id * 240, 240],
    ],
    contours: undefined,
    neighbors: id === 1 ? [0, 2] : [1],
    garrison: 15,
    consolidation: 0,
    building: null,
    construction: null,
  }));
  w.nations.forEach((n) => {
    n.bot = false;
    n.fuel = 100;
    n.capital = n.id === 0 ? 0 : 1;
  });
  w.armies = [makeArmy(0, 0, 0, "assault"), makeArmy(1, 1, 1, "line")];
  w.tactics = undefined;
  command(w, 0, { type: "order", army: 0, order: "advance", target: 1 });
  beginEngagement(w, w.armies[0], 1);
  return w;
}
test("squads resolve deterministic ongoing exchanges with persistent identities and no predetermined winner", () => {
  const a = battle(),
    b = structuredClone(a);
  advanceTactics(a, 0.5);
  advanceTactics(b, 0.5);
  assert.deepEqual(a, b);
  const t = ensureTactics(a);
  assert.equal(t.engagements[0].status, "active");
  assert(t.squads.some((s) => s.action === "firing" && s.target));
  assert(a.armies.every((a) => a.strength < 100));
  const ids = t.squads.filter((s) => s.army !== null).map((s) => s.id);
  advanceTactics(a, 0.1);
  assert.deepEqual(
    t.squads.filter((s) => s.army !== null).map((s) => s.id),
    ids,
  );
  for (const a0 of a.armies)
    assert(
      Math.abs(
        a0.strength -
          t.squads
            .filter((s) => s.army === a0.id)
            .reduce((n, s) => n + s.strength, 0),
      ) < 1e-7,
    );
});
test("air support and arriving reinforcements alter an already active engagement", () => {
  const base = battle();
  advanceTactics(base, 0.25);
  const air = structuredClone(base),
    reinforced = structuredClone(base),
    control = structuredClone(base);
  command(air, 0, { type: "air", army: 0, enabled: true });
  reinforced.armies.push(makeArmy(2, 1, 1, "assault"));
  advanceTactics(air, 0.5);
  advanceTactics(reinforced, 0.5);
  advanceTactics(control, 0.5);
  assert(air.armies[1].strength < control.armies[1].strength);
  assert(air.nations[0].fuel < control.nations[0].fuel);
  assert(reinforced.armies[0].strength < control.armies[0].strength);
  assert(
    ensureTactics(reinforced).squads.some(
      (s) => s.army === 2 && s.action === "firing",
    ),
  );
});
test("artillery suppresses enemies; a withdrawal command ends fire before the next campaign hour", () => {
  const w = battle();
  advanceTactics(w, 0.25);
  assert(ensureTactics(w).squads.some((s) => s.suppression > 0));
  command(w, 0, { type: "order", army: 0, order: "recover" });
  advanceTactics(w, 0.01);
  assert.equal(ensureTactics(w).engagements[0].status, "ended");
  assert(
    ensureTactics(w).squads.every(
      (s) => s.action !== "firing" && s.target === null,
    ),
  );
});
test("squad range and cover affect damage rather than merely the animation", () => {
  const near = battle();
  syncSquads(near);
  const far = structuredClone(near);
  // Deploy, then place one infantry squad out of range within the defending region.
  advanceTactics(near, 0);
  advanceTactics(far, 0);
  const s = ensureTactics(far).squads.find(
    (s) => s.army === 0 && s.kind === "infantry",
  )!;
  s.x = 245;
  s.y = 5;
  advanceTactics(near, 0.01);
  advanceTactics(far, 0.01);
  assert(far.armies[1].strength > near.armies[1].strength);
  const forest = battle(),
    plain = battle();
  forest.regions[1].terrain = "forest";
  advanceTactics(forest, 0.25);
  advanceTactics(plain, 0.25);
  assert(forest.armies[1].strength > plain.armies[1].strength);
});
test("sub-hour combat persists, deduplicates updates and pauses across restart", () => {
  const dir = mkdtempSync(join(tmpdir(), "ironfront-tactics-"));
  const file = join(dir, "test.sqlite");
  let store = new Store(file);
  try {
    store.create(battle(), "fixture-only");
    store.resume(1000);
    store.tick("TACTICS", 2000);
    const first = store.get("TACTICS")!;
    assert.equal(first.hour, 0);
    assert(first.armies[0].strength < 100);
    store.tick("TACTICS", 2000);
    assert.deepEqual(store.get("TACTICS"), first);
    store.close();
    store = new Store(file);
    assert.deepEqual(store.get("TACTICS"), first);
    store.resume(1000000);
    const resumed = store.get("TACTICS")!;
    assert.deepEqual(resumed.tactics!.squads, first.tactics!.squads);
    store.tick("TACTICS", 1001000);
    assert.equal(store.get("TACTICS")!.hour, 0);
    assert(
      store.get("TACTICS")!.armies[0].strength < resumed.armies[0].strength,
    );
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("campaign completion ends engagements without resolving further losses", () => {
  const w = battle();
  advanceTactics(w, 0.2);
  const strength = w.armies.map((a) => a.strength);
  w.winner = [0];
  advanceTactics(w, 1);
  assert.deepEqual(
    w.armies.map((a) => a.strength),
    strength,
  );
  assert(ensureTactics(w).engagements.every((e) => e.status !== "active"));
  assert(
    ensureTactics(w).squads.every(
      (s) => s.action !== "firing" && s.target === null,
    ),
  );
});

test("coincident squads spread deterministically on land and retain formation at rest", () => {
  const w = battle();
  command(w, 0, { type: "order", army: 0, order: "recover" });
  syncSquads(w);
  const squads = ensureTactics(w).squads.filter((s) => s.army === 0);
  for (const s of squads) {
    s.x = 100;
    s.y = 120;
  }
  const copy = structuredClone(w);
  for (let i = 0; i < 30; i++) {
    advanceTactics(w, 0.1);
    advanceTactics(copy, 0.1);
  }
  assert.deepEqual(w, copy);
  for (const a of squads) {
    assert(a.x > 0 && a.x < 240 && a.y > 0 && a.y < 240);
    for (const b of squads)
      if (a !== b) assert(Math.hypot(a.x - b.x, a.y - b.y) > 8);
  }
});

test("taking cover reduces live incoming damage and does not grant a distant cover bonus", () => {
  const control = battle();
  control.regions[1].features = [
    { id: "shelter", kind: "settlement", name: "Shelter", x: 340, y: 120 },
  ];
  const covered = structuredClone(control);
  command(covered, 1, {
    type: "cover",
    army: 1,
    region: 1,
    feature: "shelter",
  });
  advanceTactics(control, 0.2);
  advanceTactics(covered, 0.2);
  assert(covered.armies[1].strength > control.armies[1].strength);
});

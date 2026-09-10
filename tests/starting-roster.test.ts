import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createWorld,
  upgradeWorld,
  command,
} from "../packages/game-core/src/index.ts";
import {
  advanceTactics,
  syncSquads,
} from "../packages/game-core/src/tactics.ts";
import { SquadMotion } from "../apps/web/src/squadMotion.ts";
import { Store } from "../apps/api/src/store.ts";

test("each nation starts with two six-soldier squads and one two-vehicle squad", () => {
  for (const seats of [2, 4, 8]) {
    const w = createWorld(`START${seats}`, "Starter", seats, 10000, 0);
    syncSquads(w);
    for (const n of w.nations) {
      const squads = w.tactics!.squads.filter((s) => s.owner === n.id);
      assert.equal(squads.length, 3);
      assert.deepEqual(
        squads.map((s) => [s.kind, s.unitCount]),
        [
          ["infantry", 6],
          ["infantry", 6],
          ["motorized", 2],
        ],
      );
      assert(
        squads.every(
          (s) =>
            s.strength === 100 && s.capacity === 100 && s.region === n.capital,
        ),
      );
      assert.equal(new Set(squads.map((s) => s.army)).size, 3);
      const view = new SquadMotion().update(squads, 0, 100, 2);
      assert.deepEqual(
        squads.map((s) => view.members.get(s.id)!.length),
        [6, 6, 2],
      );
    }
    const before = structuredClone(w);
    upgradeWorld(w);
    assert.deepEqual(w, before);
  }
});
test("fixed roster and orders persist; issuing an order to one squad does not order its peers", () => {
  const w = createWorld("STARTSAVE", "Starter", 4, 10000, 0);
  syncSquads(w);
  const own = w.tactics!.squads.filter((s) => s.owner === 0);
  command(w, 0, {
    type: "squad-order",
    squads: [own[0].id],
    mode: "hold",
    points: [],
  });
  assert(own[0].localOrder);
  assert(own.slice(1).every((s) => !s.localOrder));
  const store = new Store(":memory:");
  try {
    store.create(w, "starter-fixture");
    const saved = store.get(w.id)!;
    assert.deepEqual(saved.tactics, w.tactics);
    // Health damage must not spawn or invent additional visual units.
    const s = own[2];
    s.strength = 40;
    assert.equal(
      new SquadMotion().update([s], 0, 100, 2).members.get(s.id)!.length,
      2,
    );
  } finally {
    store.close();
  }
});

test("unordered squads hold their exact positions across tactical updates and reload", () => {
  const w = createWorld("STILL", "Starter", 4, 3600000, 0);
  syncSquads(w);
  const positions = () =>
    w.tactics!.squads.map(({ id, x, y }) => ({ id, x, y }));
  const before = positions();
  for (let i = 0; i < 60; i++) advanceTactics(w, 1 / 3600);
  assert.deepEqual(positions(), before);
  upgradeWorld(w);
  advanceTactics(w, 1 / 12);
  assert.deepEqual(positions(), before);
});

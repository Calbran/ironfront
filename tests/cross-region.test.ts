import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createWorld,
  makeArmy,
  command,
  advance,
} from "../packages/game-core/src/index.ts";
import {
  syncSquads,
  advanceTactics,
} from "../packages/game-core/src/tactics.ts";
import { crossRegionPath } from "../packages/game-core/src/crossRegionPath.ts";
function fixture() {
  const w = createWorld("CROSS", "Boreal", 4, 3600000, 0);
  w.nations.forEach((n) => (n.bot = false));
  w.regions = w.regions.slice(0, 3).map((r, id) => ({
    ...r,
    id,
    terrain: "plains",
    owner: 0,
    garrison: 0,
    consolidation: 0,
    x: id * 100 + 50,
    y: 50,
    area: 10000,
    polygon: [
      [id * 100, 0],
      [id * 100 + 100, 0],
      [id * 100 + 100, 100],
      [id * 100, 100],
    ],
    contours: undefined,
    neighbors: [id - 1, id + 1].filter((n) => n >= 0 && n < 3),
  }));
  w.armies = [makeArmy(0, 0, 0, "line")];
  syncSquads(w);
  const s = w.tactics!.squads[0];
  s.x = 50;
  s.y = 50;
  return { w, s };
}
test("continuous border movement preserves sibling positions and survives restart", () => {
  const { w, s } = fixture();
  const sibling = w.tactics!.squads[1];
  command(w, 0, {
    type: "squad-order",
    squads: [s.id],
    mode: "move",
    points: [{ x: 250, y: 50 }],
  });
  const held = { x: sibling.x, y: sibling.y, region: sibling.region };
  let crossed = false;
  for (let i = 0; i < 100; i++) {
    const before = { x: s.x, y: s.y };
    advanceTactics(w, 0.1);
    assert(Math.hypot(s.x - before.x, s.y - before.y) <= 1.321);
    assert.deepEqual(
      { x: sibling.x, y: sibling.y, region: sibling.region },
      held,
    );
    if (s.region === 1) {
      crossed = true;
      break;
    }
  }
  assert(crossed);
  const restored = JSON.parse(JSON.stringify(w));
  for (let i = 0; i < 180; i++) {
    advanceTactics(w, 0.1);
    advanceTactics(restored, 0.1);
  }
  assert.deepEqual(restored, JSON.parse(JSON.stringify(w)));
  assert.equal(s.region, 2);
  assert.equal(s.x, 250);
  assert.equal(s.localOrder!.mode, "hold");
  assert.equal(w.armies[0].region, 0);
  // Losing the old headquarters must not surrender detached squads.
  w.regions[0].owner = 1;
  advance(w, 0);
  assert(s.strength > 0);
  assert.equal(s.region, 2);
});
test("hostile entry starts combat and cannot capture or march through living defenders", () => {
  const { w, s } = fixture();
  w.regions[1].owner = 1;
  w.regions[1].garrison = 100;
  command(w, 0, {
    type: "squad-order",
    squads: [s.id],
    mode: "move",
    points: [{ x: 250, y: 50 }],
  });
  for (let i = 0; i < 60; i++) advanceTactics(w, 0.1);
  assert.equal(w.regions[1].owner, 1);
  assert(w.tactics!.engagements.some((e) => e.region === 1 && e.direct));
  assert.notEqual(s.region, 2);
});
test("undefended territory captures on physical arrival and waits for consolidation", () => {
  const { w, s } = fixture();
  w.regions[1].owner = null;
  w.regions[2].owner = null;
  command(w, 0, {
    type: "squad-order",
    squads: [s.id],
    mode: "move",
    points: [{ x: 250, y: 50 }],
  });
  assert.equal(w.regions[1].owner, null);
  for (let i = 0; i < 140; i++) advanceTactics(w, 0.1);
  assert.equal(w.regions[1].owner, 0);
  assert.equal(w.regions[2].owner, null);
  assert.equal(s.region, 1);
  assert.equal(w.armies[0].region, 0);
  w.regions[1].consolidation = 0;
  for (let i = 0; i < 120; i++) advanceTactics(w, 0.1);
  assert.equal(w.regions[2].owner, 0);
  assert.equal(s.x, 250);
});
test("disconnected and mountainous routes reject atomically; real generated borders route", () => {
  const { w, s } = fixture();
  w.regions[1].terrain = "mountains";
  const before = structuredClone(w);
  assert.throws(
    () =>
      command(w, 0, {
        type: "squad-order",
        squads: [s.id],
        mode: "move",
        points: [{ x: 250, y: 50 }],
      }),
    /route/,
  );
  assert.deepEqual(w, before);
  const world = createWorld("REAL", "Boreal", 4, 3600000, 0);
  let count = 0;
  for (const r of world.regions.filter((r) => r.terrain !== "mountains"))
    for (const n of r.neighbors) {
      const next = world.regions[n];
      if (next.terrain === "mountains") continue;
      const path = crossRegionPath(world, r, r.id, next);
      assert.equal(path.at(-1)!.region, next.id);
      count++;
    }
  assert(count > 50);
});

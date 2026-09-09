import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advance,
  command,
  coverage,
  createWorld,
  makeArmy,
  supplied,
  supplyNetwork,
  upgradeWorld,
  type World,
} from "../packages/game-core/src/index.ts";

function fixture(owners: (number | null)[], edges?: number[][]): World {
  const w = createWorld("FRONTS", "Fronts", 4, 10000, 0);
  const template = w.regions[0];
  w.regions = owners.map((owner, id) => ({
    ...structuredClone(template),
    id,
    name: `Region ${id}`,
    owner,
    neighbors:
      edges?.[id] ??
      [id - 1, id + 1].filter((n) => n >= 0 && n < owners.length),
    area: 1,
    terrain: "plains",
    garrison: 0,
    building: null,
    construction: null,
    consolidation: 0,
  }));
  w.nations.forEach((n) => {
    n.bot = false;
    n.capital = Math.max(0, owners.indexOf(n.id));
    n.manpower = 0;
    n.industry = 100;
    n.fuel = 100;
  });
  w.armies = [];
  return w;
}

test("three army presets have distinct composition and stable unique identities", () => {
  const w = createWorld("t", "Roster", 4, 1, 0);
  assert.equal(new Set(w.armies.map((a) => a.id)).size, 12);
  for (const n of w.nations) {
    const armies = w.armies.filter((a) => a.owner === n.id);
    assert.deepEqual(
      armies.map((a) => a.role),
      ["line", "assault", "mobile"],
    );
    assert(
      armies.every(
        (a) => a.infantry + a.motorized + a.artillery + a.tanks === 100,
      ),
    );
  }
});
test("depots relay connected supply but neither isolated depots nor fresh captures bridge a corridor", () => {
  const w = fixture([0, 0, 0, 0, 0, 0, 0, 1]);
  const a = makeArmy(0, 0, 6, "assault");
  w.armies = [a];
  assert.equal(supplied(w, a), false);
  w.regions[3].building = "depot";
  assert.equal(supplied(w, a), true);
  w.regions[2].owner = 1;
  assert.equal(supplied(w, a), false);
  w.regions[2].owner = 0;
  w.regions[2].consolidation = 4;
  assert(supplyNetwork(w, 0).has(2));
  assert.equal(supplied(w, a), false);
  w.regions[2].consolidation = 0;
  assert.equal(supplied(w, a), true);
});
test("redeployment cannot cross hostile land and offensives cannot transit a third nation", () => {
  const w = fixture([0, 1, 0, 2]);
  w.armies = [makeArmy(0, 0, 0, "line")];
  assert.throws(() =>
    command(w, 0, { type: "order", army: 0, order: "redeploy", target: 2 }),
  );
  assert.throws(() =>
    command(w, 0, { type: "order", army: 0, order: "advance", target: 3 }),
  );
});
test("offensive corridors persist and halt when a third party takes the next region", () => {
  const w = fixture([0, null, null, 1]);
  const a = makeArmy(0, 0, 0, "assault");
  w.armies = [a];
  command(w, 0, { type: "order", army: 0, order: "advance", target: 2 });
  assert.deepEqual(a.route, [1, 2]);
  w.regions[1].owner = 1;
  advance(w);
  assert.equal(a.region, 0);
  assert.equal(a.order, "hold");
  assert.match(a.status, /blocked/);
});
test("capture changes land ownership but requires consolidation before onward travel", () => {
  const w = fixture([0, null, null, 1]);
  const a = makeArmy(0, 0, 0, "assault");
  w.armies = [a];
  command(w, 0, { type: "order", army: 0, order: "advance", target: 2 });
  for (let i = 0; i < 4; i++) advance(w);
  assert.equal(a.region, 1);
  assert.equal(w.regions[1].owner, 0);
  const delay = w.regions[1].consolidation;
  assert(delay >= 3);
  for (let i = 0; i < delay - 1; i++) {
    advance(w);
    assert.equal(a.region, 1);
    assert.equal(a.progress, 0);
  }
  for (let i = 0; i < 4; i++) advance(w);
  assert.equal(a.region, 2);
});
test("a wider sector divides defense and cannot deploy instantly", () => {
  const w = fixture([0, 1, 1, 1], [[1], [0, 2, 3], [1], [1]]);
  const a = makeArmy(0, 0, 0, "assault"),
    d = makeArmy(1, 1, 1, "line");
  w.armies = [a, d];
  command(w, 1, { type: "sector", army: 1, regions: [1, 2, 3] });
  assert.deepEqual(coverage(w, d), [1]);
  for (let i = 0; i < 4; i++) advance(w);
  assert.deepEqual(coverage(w, d), [1, 2, 3]);
  const narrow = structuredClone(w);
  narrow.armies[1].sector = [1];
  for (const world of [w, narrow]) {
    command(world, 0, { type: "order", army: 0, order: "advance", target: 1 });
    for (let i = 0; i < 4; i++) advance(world);
  }
  assert(
    w.armies[0].strength > narrow.armies[0].strength + 5,
    "Concentrated defenders should inflict more losses",
  );
  assert.throws(() =>
    command(w, 1, { type: "sector", army: 1, regions: [0, 1] }),
  );
});
test("reserves respond automatically but take ordinary travel time", () => {
  const w = fixture([0, 0, 1, 1]);
  const reserve = makeArmy(0, 0, 0, "mobile"),
    enemy = makeArmy(1, 1, 2, "line");
  reserve.sector = [0, 1];
  w.armies = [reserve, enemy];
  command(w, 0, { type: "order", army: 0, order: "reserve" });
  command(w, 1, { type: "order", army: 1, order: "advance", target: 1 });
  advance(w);
  assert.equal(reserve.region, 0);
  assert.deepEqual(reserve.route, [1]);
  advance(w);
  assert.equal(reserve.region, 1);
  assert.equal(reserve.order, "hold");
});
test("cut-off armies consume finite depot reserves, cannot replenish, and eventually surrender", () => {
  const w = fixture([0, 1, 0, 1]);
  const a = makeArmy(0, 0, 2, "line");
  w.armies = [a];
  w.regions[2].building = "depot";
  a.strength = 40;
  a.supplies = 3;
  for (let i = 0; i < 2; i++) advance(w);
  assert.equal(a.strength, 40);
  assert.equal(a.supplies, 1);
  advance(w);
  assert.equal(a.region, 2);
  assert.equal(a.strength, 38);
  for (let i = 0; i < 20; i++) advance(w);
  assert.equal(w.armies.length, 0);
  assert(w.events.some((e) => /surrendered/.test(e.text)));
});
test("dislodged formations cannot teleport to disconnected friendly land", () => {
  const w = fixture([0, 1, 1, 0]);
  const a = makeArmy(0, 0, 1, "line");
  w.armies = [a];
  // Immediate neighboring retreat is legal, even though the army lost its headquarters.
  advance(w);
  assert.equal(a.region, 0);
  const isolated = fixture([0, 1, 1, 1, 0]);
  isolated.armies = [makeArmy(0, 0, 2, "line")];
  advance(isolated);
  assert.equal(isolated.armies.length, 0);
});
test("legacy campaign upgrade preserves land, resources, strength and identity and is idempotent", () => {
  const w = createWorld("t", "Legacy", 4, 1, 0);
  w.version = 1;
  w.armies = w.armies.filter((a) => a.role === "line");
  w.armies[0].strength = 37;
  const land = w.regions.map((r) => r.owner),
    nations = structuredClone(w.nations);
  upgradeWorld(w);
  assert.equal(w.version, 2);
  assert.equal(w.armies[0].strength, 37);
  assert.deepEqual(
    w.regions.map((r) => r.owner),
    land,
  );
  assert.deepEqual(w.nations, nations);
  assert.equal(w.armies.length, 12);
  const once = structuredClone(w);
  upgradeWorld(w);
  assert.deepEqual(w, once);
});

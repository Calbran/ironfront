import {
  GENERATED_WORLD_SCALE,
  SETTLEMENT_RADII,
} from "../packages/game-core/src/campaignScale.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  placeSettlements,
  settlementSeparation,
  worldSettlementSeparation,
  planSettlementReservations,
  type SettlementSite,
} from "../packages/game-core/src/settlementPlacement.ts";

function landscape(seed = 1): SettlementSite[] {
  return Array.from({ length: 60 * 40 }, (_, id) => ({
    id,
    region: Math.floor(id / 25),
    x: (id % 60) * 80,
    y: Math.floor(id / 60) * 80,
    suitability: ((id * 31 + seed * 71) % 101) / 101,
    ruralOnly: false,
    variation: ((id * 17 + seed * 13) % 97) / 97,
  }));
}

test("settlement locations ignore political subdivisions and candidate order", () => {
  const sites = landscape();
  const a = placeSettlements(sites, 6000000);
  const b = placeSettlements([...sites].reverse(), 6000000);
  assert.deepEqual(a, b);
  const merged = placeSettlements(
    sites.map((s) => ({ ...s, region: 0 })),
    6000000,
  );
  assert.deepEqual(
    a.map((s) => [s.id, s.size]),
    merged.map((s) => [s.id, s.size]),
  );
  assert(
    new Set(a.map((s) => s.region)).size <
      new Set(sites.map((s) => s.region)).size / 2,
  );
});

test("global density and city limits hold across varied landscapes", () => {
  for (let seed = 0; seed < 20; seed++) {
    const placed = placeSettlements(landscape(seed), 6000000);
    assert(
      placed.length > 10,
      "A viable landscape still has an inhabited network",
    );
    assert(placed.length <= 33, "Land area caps the entire network");
    const majors = placed.filter(
      (s) => s.size === "city" || s.size === "metropolis",
    );
    assert(majors.length > 0 && majors.length <= 3);
    assert(placed.filter((s) => s.size === "metropolis").length <= 1);
    assert(placed.some((s) => s.size === "town"));
    assert(placed.some((s) => s.size === "hamlet" || s.size === "village"));
    for (let i = 0; i < placed.length; i++)
      for (const b of placed.slice(i + 1)) {
        const a = placed[i];
        assert(
          Math.hypot(a.x - b.x, a.y - b.y) >=
            settlementSeparation(a.size, b.size),
        );
      }
  }
});

test("a high-scoring corner cannot absorb the city network", () => {
  const sites = landscape().map((s) => ({
    ...s,
    suitability: s.x < 1000 && s.y < 1000 ? 1 : 0.6,
  }));
  const placed = placeSettlements(sites, 6000000);
  const corner = placed.filter((s) => s.x < 1000 && s.y < 1000);
  assert(corner.length <= 4);
  assert(
    corner.filter((s) => s.size === "city" || s.size === "metropolis").length <=
      1,
  );
  assert(placed.some((s) => s.x > 3000));
  assert(placed.some((s) => s.y > 2000));
});

test("scarce space is left sparse instead of relaxing separation to meet budgets", () => {
  const sites = landscape().slice(0, 5);
  assert.equal(placeSettlements(sites, 6000000).length, 1);
  assert.deepEqual(placeSettlements([], 6000000), []);
  assert.deepEqual(placeSettlements(landscape(), 10000), []);
  assert.deepEqual(placeSettlements(landscape(), 0), []);
});

test("agricultural districts only receive a single rural settlement", () => {
  const placed = placeSettlements(
    landscape().map((s) => ({
      ...s,
      ruralOnly: true,
      region: Math.floor(s.x / 1000),
    })),
    6000000,
  );
  assert(placed.length > 0);
  assert(placed.every((s) => s.size === "hamlet" || s.size === "village"));
  assert.equal(new Set(placed.map((s) => s.region)).size, placed.length);
});

test("expanding suitable land grows the network while keeping physical spacing", () => {
  const sites = landscape();
  const small = placeSettlements(sites, 1800000);
  const large = placeSettlements(sites, 6000000);
  assert(small.length <= 10);
  assert(large.length > small.length);
});

test("every size pairing reserves four city widths beyond conservative artwork edges", () => {
  const sizes = Object.keys(
    SETTLEMENT_RADII,
  ) as (keyof typeof SETTLEMENT_RADII)[];
  for (const a of sizes)
    for (const b of sizes) {
      const edges = (SETTLEMENT_RADII[a] + SETTLEMENT_RADII[b]) * 1.15;
      const openLand = worldSettlementSeparation(a, b) - edges;
      assert(
        openLand >= 8 * Math.max(SETTLEMENT_RADII[a], SETTLEMENT_RADII[b]),
      );
      assert.equal(
        worldSettlementSeparation(a, b),
        worldSettlementSeparation(b, a),
      );
    }
});

test("reserved settlements consume the existing global settlement budget", () => {
  const reserved = [{ ...landscape()[0], size: "town" as const }];
  const generated = placeSettlements(landscape(), 6000000, reserved);
  assert(generated.length + reserved.length <= 33);
  assert(!generated.some((s) => s.id === reserved[0].id));
  for (const site of generated)
    assert(
      Math.hypot(site.x - reserved[0].x, site.y - reserved[0].y) >=
        settlementSeparation(site.size, "town"),
    );
  assert.deepEqual(placeSettlements(landscape(), 0, reserved), []);
  // Doubling final coordinates quadruples area, without increasing the generator budget.
  assert.equal(GENERATED_WORLD_SCALE, 6);
  assert.equal(4800 * GENERATED_WORLD_SCALE, 28800);
  assert.equal(3200 * GENERATED_WORLD_SCALE, 19200);
});

test("settlement reservation planning backtracks instead of violating spacing", () => {
  const a = { x: 0, y: 0, size: "town" as const };
  const alternative = { ...a, x: 12000 };
  const b = { ...a, x: 1000 };
  assert.deepEqual(
    planSettlementReservations([[a, alternative], [b]], [], () => true),
    [alternative, b],
  );
  assert.equal(
    planSettlementReservations([[a], [b]], [], () => true),
    null,
  );
  assert.equal(
    planSettlementReservations([[a]], [b], () => true),
    null,
  );
  assert.deepEqual(
    planSettlementReservations(
      [[a, alternative]],
      [],
      (s) => s === alternative,
    ),
    [alternative],
  );
});

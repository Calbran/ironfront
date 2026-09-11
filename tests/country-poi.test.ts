import { roadEnds } from "../packages/game-core/src/countryLayoutGeometry";
import { cityBuildingFootprint } from "../packages/game-core/src/cityBuildingKit";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateCountryPOI,
  POI_CATALOG,
} from "../packages/game-core/src/countryPOI";
import { placeCountryPOIs } from "../packages/game-core/src/countryPOIPlacement";
import { obstacleDistance } from "../packages/game-core/src/cityTactics";
import type { World } from "../packages/game-core/src";
test("every country template is deterministic, bounded and keeps its road entrances clear", () => {
  for (const [kind] of POI_CATALOG)
    for (const seed of [1, 732, 90210]) {
      const p = generateCountryPOI(kind, seed);
      assert.deepEqual(p, generateCountryPOI(kind, seed));
      assert(p.obstacles.length > 0);
      assert.equal(
        new Set(p.obstacles.map((o) => o.id)).size,
        p.obstacles.length,
      );
      for (const o of p.obstacles) {
        assert(Number.isFinite(o.x + o.z + o.angle));
        assert(Math.abs(o.x) + Math.hypot(o.width, o.depth) / 2 <= p.extent);
        assert(Math.abs(o.z) + Math.hypot(o.width, o.depth) / 2 <= p.extent);
      }
      for (const entrance of p.entrances)
        assert(p.obstacles.every((o) => obstacleDistance(entrance, o) > 1));
      // Main road remains open to tanks across every site.
      for (const r of p.roads) {
        const [a, b] = roadEnds(r);
        for (let t = 0; t <= 1; t += 0.1)
          assert(
            p.obstacles.every(
              (o) =>
                obstacleDistance(
                  { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t },
                  o,
                ) > Math.min(1.4, r.depth / 2),
            ),
          );
      }
    }
});
test("farmlands use six separated crop parcels and seed-driven crop variation", () => {
  const p = generateCountryPOI("strip-fields", 732);
  assert.equal(p.fields.length, 6);
  assert(new Set(p.fields.map((f) => f.crop)).size >= 3);
  assert.notDeepEqual(p.fields, generateCountryPOI("strip-fields", 733).fields);
  for (const a of p.fields)
    for (const b of p.fields)
      if (a !== b)
        assert(
          Math.abs(a.x - b.x) >= (a.width + b.width) / 2 ||
            Math.abs(a.z - b.z) >= (a.depth + b.depth) / 2,
        );
});
test("country placement rejects insufficient ground and separates valid sites", () => {
  const region = {
    id: 0,
    terrain: "plains",
    features: [],
    polygon: [
      [-5000, -5000],
      [5000, -5000],
      [5000, 5000],
      [-5000, 5000],
    ],
  };
  const world = { seed: "country-test", regions: [region] } as unknown as World;
  const roads = [-2500, 0, 2500].map((x) => ({
    from: "a",
    to: "b",
    kind: "local" as const,
    utilities: false,
    bridges: [],
    points: [
      { x: x - 100, y: 0 },
      { x: x + 100, y: 0 },
    ],
  }));
  const sites = placeCountryPOIs(world, roads);
  assert(sites.length > 0);
  assert.deepEqual(sites, placeCountryPOIs(world, roads));
  for (const a of sites)
    for (const b of sites)
      if (a !== b)
        assert(Math.hypot(a.x - b.x, a.y - b.y) >= a.radius + b.radius + 120);
  assert.equal(
    placeCountryPOIs(
      {
        ...world,
        regions: [
          {
            ...region,
            polygon: [
              [-10, -10],
              [10, -10],
              [10, 10],
              [-10, 10],
            ],
          } as unknown as World["regions"][number],
        ],
      },
      roads,
    ).length,
    0,
  );
});

test("roadside sites do not straddle mapped rivers", () => {
  const region = {
    id: 0,
    terrain: "plains",
    features: [],
    polygon: [
      [-5000, -5000],
      [5000, -5000],
      [5000, 5000],
      [-5000, 5000],
    ],
  };
  const world = {
    seed: "river",
    regions: [region],
    geography: {
      rivers: [
        [
          [-4000, 0],
          [4000, 0],
        ],
      ],
    },
  } as unknown as World;
  const road = {
    from: "a",
    to: "b",
    kind: "local" as const,
    utilities: false,
    bridges: [],
    points: [
      { x: -100, y: 0 },
      { x: 100, y: 0 },
    ],
  };
  assert.equal(placeCountryPOIs(world, [road]).length, 0);
});

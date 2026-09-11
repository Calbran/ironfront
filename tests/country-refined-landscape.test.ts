import test from "node:test";
import assert from "node:assert/strict";
import { countryLandscapeSamples } from "../apps/web/src/experiments/countryRefinedLandscape";

test("refined country scenery is deterministic and leaves roads, rivers and settlement reservations clear", () => {
  const cols = 31,
    rows = 21,
    count = cols * rows;
  const plan = {
    width: 300,
    depth: 200,
    surface: {
      version: 1 as const,
      seed: "scenery-test",
      scale: 1,
      mountainWeight: new Float32Array(count),
      ranges: [],
      peak: 0,
      cols,
      rows,
      step: 10,
      heights: new Float32Array(count),
      land: new Uint8Array(count).fill(1),
      biomes: new Uint8Array(count),
    },
    sites: [{ id: "town", name: "Town", x: 50, z: 50, extent: 25 }],
    rivers: [
      [
        { x: 220, z: 0 },
        { x: 220, z: 200 },
      ],
    ],
    roads: {
      roads: [
        {
          id: "road",
          highway: true,
          width: 6,
          path: [
            { x: 0, y: 100 },
            { x: 300, y: 100 },
          ],
        },
      ],
      bridges: [],
      scale: 1,
      step: 10,
      connections: [],
      unreachable: [],
      connectedSites: 1,
      components: 1,
    },
  };
  const first = countryLandscapeSamples(plan);
  assert.deepEqual(first, countryLandscapeSamples(plan));
  const all = Object.values(first).flat();
  assert.ok(all.length > 50);
  for (const p of all) {
    assert.ok(Math.abs(p.z - 100) >= 8, "road and furniture corridor clear");
    assert.ok(Math.abs(p.x - 220) >= 8, "water corridor clear");
    assert.ok(Math.hypot(p.x - 50, p.z - 50) >= 33, "settlement remains clear");
  }
  assert.ok(
    plan.surface.heights.every((h) => h === 0),
    "presentation does not alter movement terrain",
  );
});

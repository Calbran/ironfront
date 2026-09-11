import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseOSMSample,
  generateOSMCountryPOI,
  clipCountrySegment,
} from "../packages/game-core/src/countryOSM";
import { generateCountryPOI } from "../packages/game-core/src/countryPOI";
import {
  roadEnds,
  segmentDistance,
} from "../packages/game-core/src/countryLayoutGeometry";
import { cityBuildingFootprint } from "../packages/game-core/src/cityBuildingKit";
test("real samples preserve curved roads, source attribution, deterministic selection and safe model placement", () => {
  for (const name of ["castle-combe", "bibury", "painswick"]) {
    const data = parseOSMSample(
      JSON.parse(
        readFileSync(
          new URL(
            "../apps/web/public/data/country-osm/" + name + ".json",
            import.meta.url,
          ),
          "utf8",
        ),
      ),
    );
    for (const size of ["site", "estate", "district"] as const) {
      const plan = generateOSMCountryPOI(data, 732, size, 0.7);
      assert.deepEqual(plan, generateOSMCountryPOI(data, 732, size, 0.7));
      assert(plan.buildings.length > 5);
      assert.equal(plan.source?.license, "ODbL-1.0");
      assert(plan.roads.length > 10);
      assert(
        new Set(plan.roads.map((r) => Math.round((r.angle ?? 0) * 10))).size >
          5,
      );
      assert.equal(
        new Set(plan.obstacles.map((o) => o.id)).size,
        plan.obstacles.length,
      );
      for (const b of plan.buildings) {
        const f = cityBuildingFootprint(b.variant),
          radius = Math.hypot(f.width, f.depth) / 2;
        assert(Math.max(Math.abs(b.x), Math.abs(b.z)) + radius < plan.extent);
        const o = plan.obstacles.find((o) => o.id === b.id)!;
        assert.equal(o.width, f.width);
        assert.equal(o.depth, f.depth);
        for (const r of plan.roads) {
          const [a, c] = roadEnds(r);
          assert(segmentDistance(b, a, c) > radius + r.depth / 2);
        }
      }
      for (const r of plan.roads)
        for (const p of roadEnds(r))
          assert(
            Math.max(Math.abs(p.x), Math.abs(p.z)) <= plan.extent + 0.000001,
          );
    }
    assert(
      generateOSMCountryPOI(data, 732, "district", 1).buildings.length >
        generateOSMCountryPOI(data, 732, "district", 0.35).buildings.length,
    );
  }
});
test("input validation rejects invalid data and clipping retains crossing geometry", () => {
  assert.throws(() => parseOSMSample(null));
  assert.throws(() =>
    parseOSMSample({
      name: "bad",
      center: { lat: 0, lon: 0 },
      elements: [
        {
          type: "way",
          id: 1,
          tags: {},
          geometry: [
            { lat: NaN, lon: 0 },
            { lat: 0, lon: 0 },
          ],
        },
      ],
    }),
  );
  assert.deepEqual(clipCountrySegment({ x: -20, z: 0 }, { x: 20, z: 0 }, 10), [
    { x: -10, z: 0 },
    { x: 10, z: 0 },
  ]);
  assert.equal(
    clipCountrySegment({ x: -20, z: 12 }, { x: 20, z: 12 }, 10),
    undefined,
  );
});
test("procedural settlement seeds change road structure and density instead of repeating blocks", () => {
  const a = generateCountryPOI("crossroads-market", 732, {
      size: "district",
      density: 1,
    }),
    b = generateCountryPOI("crossroads-market", 733, {
      size: "district",
      density: 1,
    }),
    sparse = generateCountryPOI("crossroads-market", 732, {
      size: "district",
      density: 0.35,
    });
  assert.notDeepEqual(a.roads, b.roads);
  assert(a.buildings.length > sparse.buildings.length);
  assert(new Set(a.buildings.map((b) => Math.round(b.angle * 10))).size > 8);
  assert(new Set(a.roads.map((r) => Math.round((r.angle ?? 0) * 10))).size > 8);
});

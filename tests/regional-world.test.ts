import test from "node:test";
import assert from "node:assert/strict";
import { generateCountrySettlement } from "../packages/game-core/src/countrySettlement";
import { cityBuildingFootprint } from "../packages/game-core/src/cityBuildingKit";
import { generateCountryPOI } from "../packages/game-core/src/countryPOI";
import {
  ruralFieldAt,
  ruralFieldContains,
} from "../packages/game-core/src/regionalFarmland";
import {
  roadEnds,
  segmentDistance,
} from "../packages/game-core/src/countryLayoutGeometry";

test("settlement hierarchy adds connected streets and physical buildings, with urban and industrial districts", () => {
  let previous = 0;
  for (const rank of [
    "hamlet",
    "village",
    "town",
    "city",
    "metropolis",
  ] as const) {
    const p = generateCountrySettlement(732, rank);
    assert.ok(p.buildings.length > previous, `${rank}: ${p.buildings.length}`);
    previous = p.buildings.length;
    assert.ok(p.entrances.length >= 2);
    const nodes = new Map<string, Set<string>>();
    for (const road of p.roads) {
      const [a, b] = roadEnds(road),
        key = (q: { x: number; z: number }) =>
          `${q.x.toFixed(4)}:${q.z.toFixed(4)}`,
        ak = key(a),
        bk = key(b);
      (nodes.get(ak) ?? nodes.set(ak, new Set()).get(ak)!).add(bk);
      (nodes.get(bk) ?? nodes.set(bk, new Set()).get(bk)!).add(ak);
    }
    const seen = new Set<string>(),
      queue = [nodes.keys().next().value!];
    for (let i = 0; i < queue.length; i++) {
      const k = queue[i];
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push(...nodes.get(k)!);
    }
    assert.equal(seen.size, nodes.size, "every street belongs to one network");
    for (const b of p.buildings) {
      const o = p.obstacles.find((o) => o.id === b.id)!;
      const footprint = cityBuildingFootprint(b.variant);
      assert.equal(o.width, footprint.width);
      assert.equal(o.depth, footprint.depth);
      assert.ok(Math.hypot(b.x, b.z) < p.extent * 1.2);
    }
    if (rank === "metropolis") {
      assert.ok(p.buildings.length > 5000);
      assert.ok(
        !p.buildings.some((b) => b.variant === "urbanBuild"),
        "Established cities use finished buildings, not construction frames",
      );
      assert.ok(p.buildings.some((b) => b.variant === "commercialTower"));
      assert.ok(p.buildings.some((b) => b.variant === "factory"));
    }
  }
});
test("reference districts reproduce exactly and preserve the headquarters clearance", () => {
  assert.deepEqual(
    generateCountrySettlement(91, "town"),
    generateCountrySettlement(91, "town"),
  );
  const p = generateCountrySettlement(732, "city", 340);
  assert.ok(p.obstacles.every((o) => Math.hypot(o.x, o.z) > 340));
  assert.ok(
    p.buildings.every((b) =>
      p.roads.every((r) => {
        const [a, c] = roadEnds(r);
        return segmentDistance(b, a, c) > r.depth / 2 + 2;
      }),
    ),
  );
});
test("industrial complexes expand without changing legacy POI geometry", () => {
  const small = generateCountryPOI("foundry", 732, { size: "district" }),
    large = generateCountryPOI("foundry", 732, {
      size: "district",
      industrialComplex: true,
    });
  assert.equal(small.extent, 185);
  assert.ok(large.extent > small.extent);
  assert.ok(large.buildings.length > small.buildings.length);
});
test("polygon field queries preserve open corners, including across index cells", () => {
  const f = {
    x: 2048,
    y: 2048,
    width: 200,
    depth: 200,
    crop: 0,
    polygon: [
      { x: 0, z: -100 },
      { x: 100, z: 0 },
      { x: 0, z: 100 },
      { x: -100, z: 0 },
    ],
  };
  assert.ok(ruralFieldContains(f, 2048, 2048));
  assert.ok(!ruralFieldContains(f, 2138, 2138));
  const fields = [f];
  assert.ok(ruralFieldAt(fields, 2028, 2028));
  assert.ok(!ruralFieldAt(fields, 2138, 2138));
});

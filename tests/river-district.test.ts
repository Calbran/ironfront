import test from "node:test";
import assert from "node:assert/strict";
import {
  planAngledDistrict,
  lotCorners,
  blockContains,
} from "../packages/game-core/src/angledDistrict";
import {
  lotsOverlap,
  lotIntersectsStreet,
  lineDistance,
} from "../packages/game-core/src/organicCity";
test("river splits parcels before fitting waterfront buildings and two crossings", () => {
  for (const seed of [0, 731, 732]) {
    const p = planAngledDistrict(seed, true);
    assert.deepEqual(p, planAngledDistrict(seed, true));
    assert.ok(p.parcels.length > 6);
    assert.ok(p.lots.length > 60);
    for (const parcel of p.parcels) {
      assert.ok(
        parcel.boundary.every((v) => v.z <= -101 + 1e-7) ||
          parcel.boundary.every((v) => v.z >= -87 - 1e-7),
      );
      for (const i of parcel.lotIndices) {
        const lot = p.lots[i];
        assert.ok(
          lotCorners(lot).every(
            (v) =>
              Math.abs(v.z + 94) > 6 && blockContains(parcel.boundary, v, 2.8),
          ),
        );
        assert.ok(!p.streets.some((s) => lotIntersectsStreet(lot, s)));
        for (const [j, q] of p.lots.entries())
          if (i !== j) assert.ok(!lotsOverlap(lot, q));
      }
    }
    const crossings = new Set<number>();
    for (const s of p.streets)
      for (let i = 1; i < s.points.length; i++) {
        const a = s.points[i - 1],
          b = s.points[i];
        if (Math.abs((a.z + b.z) / 2 + 94) < 3) {
          assert.equal(a.x, b.x);
          crossings.add(a.x);
        }
      }
    assert.equal(crossings.size, 2);
    for (const a of p.access) {
      assert.ok(p.streets.some((s) => lineDistance(a.street, s.points) < 1e-6));
      for (const [i, lot] of p.lots.entries())
        if (i !== a.lotIndex)
          assert.ok(
            !lotIntersectsStreet(lot, {
              points: [a.entrance, a.street],
              width: 1.25,
              alley: true,
            }),
          );
    }
  }
});

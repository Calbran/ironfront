import test from "node:test";
import assert from "node:assert/strict";
import {
  planAngledDistrict,
  blockContains,
  lotCorners,
} from "../packages/game-core/src/angledDistrict";
import {
  lotsOverlap,
  lotIntersectsStreet,
  lineDistance,
} from "../packages/game-core/src/organicCity";

test("angled parcels fit full envelopes with clear street-facing access", () => {
  for (const seed of [0, 1, 731, 732, 98765]) {
    const plan = planAngledDistrict(seed);
    assert.deepEqual(plan, planAngledDistrict(seed));
    assert.ok(plan.parcels.length >= 6);
    assert.ok(plan.lots.length > 65);
    for (const parcel of plan.parcels) {
      for (const i of parcel.lotIndices) {
        const lot = plan.lots[i];
        assert.equal(lot.scale, 0.85);
        assert.ok(
          lotCorners(lot).every((p) => blockContains(parcel.boundary, p, 2.8)),
        );
        assert.ok(!plan.streets.some((s) => lotIntersectsStreet(lot, s)));
        for (const [j, other] of plan.lots.entries())
          if (i !== j) assert.ok(!lotsOverlap(lot, other));
      }
    }
    assert.equal(plan.access.length, plan.lots.length - 27);
    for (const a of plan.access) {
      const lot = plan.lots[a.lotIndex];
      assert.ok(
        (a.street.x - a.entrance.x) * Math.sin(lot.angle) +
          (a.street.z - a.entrance.z) * Math.cos(lot.angle) >
          0,
      );
      assert.ok(
        plan.streets.some((s) => lineDistance(a.street, s.points) < 1e-6),
      );
      for (const [i, other] of plan.lots.entries())
        if (i !== a.lotIndex)
          assert.ok(
            !lotIntersectsStreet(other, {
              points: [a.entrance, a.street],
              width: 1.25,
              alley: true,
            }),
          );
    }
  }
  assert.notDeepEqual(
    planAngledDistrict(731).parcels,
    planAngledDistrict(732).parcels,
  );
});

test("consecutive seeds change street composition and combine district roles", () => {
  const plans = [731, 732, 733, 734].map((seed) =>
    planAngledDistrict(seed, true),
  );
  assert.equal(new Set(plans.map((p) => p.composition)).size, 4);
  assert.ok(new Set(plans.map((p) => p.parcels.length)).size > 1);
  const angles = plans.map(
    (p) =>
      new Set(
        p.streets.map((s) =>
          Math.round(
            Math.atan2(
              s.points.at(-1)!.z - s.points[0].z,
              s.points.at(-1)!.x - s.points[0].x,
            ) * 100,
          ),
        ),
      ),
  );
  assert.ok(angles.some((a) => [...a].some((angle) => !angles[0].has(angle))));
  for (const p of plans) {
    for (const kind of ["commercial", "industrial", "residential"])
      assert.ok(
        p.parcels.some((b) => b.kind === kind && b.lotIndices.length > 0),
      );
    assert.ok(p.lots.some((l) => l.variant === "commercialTower"));
    assert.ok(
      p.lots.some((l) => l.variant === "warehouse" || l.variant === "mill"),
    );
  }
});

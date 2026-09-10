import test from "node:test";
import assert from "node:assert/strict";
import {
  planCombinedDistrict,
  combinedLot,
  combinedPosition,
  riverBend,
  combinedHeight,
  combinedCanonicalZ,
} from "../packages/game-core/src/combinedDistrict";
import {
  planAngledDistrict,
  lotCorners,
} from "../packages/game-core/src/angledDistrict";
import {
  lotsOverlap,
  lotIntersectsStreet,
} from "../packages/game-core/src/organicCity";
test("combined bend and hill preserve rigid buildings and clear entrances across seeds", () => {
  for (const seed of [0, 731, 732, 98765]) {
    const p = planCombinedDistrict(seed),
      world = p.lots.map((l) => combinedLot(l, seed));
    assert.deepEqual(p, planCombinedDistrict(seed));
    assert.ok(world.length > 45);
    assert.equal(
      world.length + p.rejected,
      planAngledDistrict(seed, true).lots.length + p.infill,
    );
    const streets = p.streets.map((s) => ({
      ...s,
      points: s.points.map((q) => combinedPosition(q, seed)),
    }));
    for (let i = 27; i < world.length; i++) {
      assert.ok(
        lotCorners(world[i]).every(
          (q) => Math.abs(q.z + 94 - riverBend(q.x, seed)) >= 7,
        ),
      );
      assert.ok(!streets.some((s) => lotIntersectsStreet(world[i], s)));
      for (let j = 0; j < i; j++) assert.ok(!lotsOverlap(world[i], world[j]));
    }
    for (const a of p.access)
      for (let j = 0; j < world.length; j++)
        if (j !== a.lotIndex)
          assert.ok(
            !lotIntersectsStreet(world[j], {
              points: [
                combinedPosition(a.entrance, seed),
                combinedPosition(a.street, seed),
              ],
              width: 1.25,
              alley: true,
            }),
          );
    for (const f of p.foundations.filter((f) => f.lotIndex >= 27)) {
      for (const q of lotCorners(world[f.lotIndex]))
        assert.ok(
          f.base >= combinedHeight(q.x, combinedCanonicalZ(q, seed)) - 1e-7,
        );
      assert.ok(f.base - f.low <= 1.2);
    }
    assert.ok(p.foundations.some((f) => f.base - f.low > 0.2));
  }
});

test("river deformation leaves inland block edges fixed and remains invertible", () => {
  for (const profile of ["normal", "tight-bend", "worldgen"] as const) {
    for (const x of [-80, -20, 30, 80]) {
      for (const z of [-180, -138, -50, 0])
        assert.deepEqual(combinedPosition({ x, z }, 731, profile), { x, z });
      for (const z of [-101, -94, -87])
        assert.equal(
          combinedPosition({ x, z }, 731, profile).z,
          z + riverBend(x, 731, profile),
        );
      let previous = -Infinity;
      for (let z = -145; z <= -45; z++) {
        const p = combinedPosition({ x, z }, 731, profile);
        assert.ok(p.z > previous);
        previous = p.z;
        assert.ok(Math.abs(combinedCanonicalZ(p, 731, profile) - z) < 1e-7);
      }
    }
  }
});

test("commercial and industrial infill recovers sites without obstructing yard access", () => {
  const plan = planCombinedDistrict(733, "worldgen");
  assert.ok(plan.recovered > 0);
  assert.ok(plan.decorations.length > 0);
  const lots = plan.lots.map((l) => combinedLot(l, 733, "worldgen"));
  for (const feature of plan.decorations) {
    const proxy = combinedLot(
      { ...feature, angle: 0, scale: 0.7, variant: "home" },
      733,
      "worldgen",
    );
    assert.ok(lots.every((l) => !lotsOverlap(l, proxy)));
    for (const access of plan.access)
      assert.ok(
        !lotIntersectsStreet(proxy, {
          points: [
            combinedPosition(access.entrance, 733, "worldgen"),
            combinedPosition(access.street, 733, "worldgen"),
          ],
          width: 2,
          alley: true,
        }),
      );
  }
});

test("final frontage bearings point directly from the doorway to the road", () => {
  const plan = planCombinedDistrict(732, "worldgen");
  assert.ok(plan.infill > 0);
  assert.ok(plan.lots.some((l) => l.variant === "workshopRow"));
  for (const access of plan.access) {
    const lot = combinedLot(plan.lots[access.lotIndex], 732, "worldgen");
    const a = combinedPosition(access.entrance, 732, "worldgen"),
      b = combinedPosition(access.street, 732, "worldgen");
    const dx = b.x - a.x,
      dz = b.z - a.z;
    assert.ok(dx * Math.sin(lot.angle) + dz * Math.cos(lot.angle) > 0);
    assert.ok(
      Math.abs(dx * Math.cos(lot.angle) - dz * Math.sin(lot.angle)) < 1e-6,
    );
  }
});

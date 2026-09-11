import test from "node:test";
import assert from "node:assert/strict";
import {
  OCEAN_CITY_WATERFRONT,
  portZoneForParcel,
  portInfrastructure,
} from "../packages/game-core/src/portDistrict";
import {
  planCombinedDistrict,
  combinedLot,
} from "../packages/game-core/src/combinedDistrict";
import { lotCorners } from "../packages/game-core/src/angledDistrict";
import { auditCitySeed } from "../packages/game-core/src/citySeedAudit";
import { createCityTactics } from "../packages/game-core/src/cityTactics";

const block = [
  { x: 80, z: 125 },
  { x: 120, z: 125 },
  { x: 120, z: 160 },
  { x: 80, z: 160 },
];
test("split waterfront parcels share one berth without duplicate piers", () => {
  const piers = portInfrastructure(OCEAN_CITY_WATERFRONT, [
    { portZone: "cargo-quay", boundary: [block[0], block[1], block[2]] },
    { portZone: "cargo-quay", boundary: [block[0], block[2], block[3]] },
  ]);
  assert.equal(piers.length, 1);
  assert.equal(piers[0].x, 100);
  assert.equal(
    portInfrastructure({ ...OCEAN_CITY_WATERFRONT, kind: "lake" }, [
      { portZone: "cargo-quay", boundary: block },
    ]).length,
    0,
  );
});
test("port zoning requires an adjacent ocean frontage, never a river, lake or distant coastline", () => {
  assert.equal(portZoneForParcel(block), undefined);
  for (const kind of ["river", "lake"] as const)
    assert.equal(
      portZoneForParcel(block, { ...OCEAN_CITY_WATERFRONT, kind }),
      undefined,
    );
  assert.equal(
    portZoneForParcel(block, { ...OCEAN_CITY_WATERFRONT, shoreZ: 300 }),
    undefined,
  );
  assert.equal(
    portZoneForParcel(block, { ...OCEAN_CITY_WATERFRONT, shoreZ: 150 }),
    undefined,
  );
  assert.equal(
    portZoneForParcel(block, { ...OCEAN_CITY_WATERFRONT, minX: -30, maxX: 30 }),
    undefined,
  );
  assert.equal(portZoneForParcel(block, OCEAN_CITY_WATERFRONT), "cargo-quay");
});
test("ordinary full cities and small river studies never acquire ocean port districts", () => {
  for (const [profile, full] of [
    ["normal", true],
    ["ocean", false],
  ] as const) {
    const plan = planCombinedDistrict(732, profile, full);
    assert.equal(plan.parcels.filter((p) => p.portZone).length, 0);
    assert.equal(plan.portInfrastructure.length, 0);
    assert.equal(plan.waterfront, undefined);
  }
});
test("coastal city preserves land footprints, street access and all three port zones across seeds", () => {
  for (const seed of [731, 732, 733]) {
    const plan = planCombinedDistrict(seed, "ocean", true);
    assert.deepEqual(
      [
        ...new Set(
          plan.parcels.flatMap((p) => (p.portZone ? [p.portZone] : [])),
        ),
      ].sort(),
      ["bonded-warehouses", "cargo-quay", "harbor-market"],
    );
    assert.ok(plan.portInfrastructure.length >= 2);
    assert.ok(
      plan.lots.every((l) =>
        lotCorners(combinedLot(l, seed, "ocean")).every((p) => p.z < 164),
      ),
    );
    for (const parcel of plan.parcels.filter((p) => p.portZone)) {
      assert.ok(parcel.lotIndices.length > 0);
      for (const i of parcel.lotIndices)
        assert.ok(plan.access.some((a) => a.lotIndex === i));
      assert.ok(
        parcel.lotIndices.every(
          (i) => !plan.lots[i].variant.startsWith("commercialTower"),
        ),
      );
    }
    const report = auditCitySeed(seed, "ocean-port");
    assert.deepEqual(report.failures, [], JSON.stringify(report));
  }
});
test("coastal planning is deterministic and ocean remains outside the ground movement area", () => {
  const plan = planCombinedDistrict(732, "ocean", true);
  assert.deepEqual(plan, planCombinedDistrict(732, "ocean", true));
  const tactics = createCityTactics(plan, 732, "ocean");
  assert.equal(tactics.walkable({ x: 0, z: 180 }), false);
});

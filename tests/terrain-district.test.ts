import test from "node:test";
import assert from "node:assert/strict";
import {
  planTerrainDistrict,
  districtHeight,
  TERRAIN_RIVER_Z,
} from "../packages/game-core/src/terrainDistrict";
import { lotCorners } from "../packages/game-core/src/angledDistrict";
test("terrain foundations clear the hill and preserve a dry river corridor", () => {
  for (const seed of [0, 731, 732]) {
    const plan = planTerrainDistrict(seed);
    assert.deepEqual(plan, planTerrainDistrict(seed));
    assert.ok(plan.foundations.some((f) => f.base - f.low > 0.3));
    for (const f of plan.foundations) {
      for (const p of lotCorners(plan.lots[f.lotIndex])) {
        assert.ok(f.base >= districtHeight(p.z) - 1e-8);
        assert.ok(Math.abs(p.z - TERRAIN_RIVER_Z) > 6);
      }
      assert.ok(f.base - f.low <= 1.2);
    }
    for (const street of plan.streets)
      for (let i = 1; i < street.points.length; i++) {
        const a = street.points[i - 1],
          b = street.points[i],
          length = Math.hypot(a.x - b.x, a.z - b.z);
        // Existing quay slope is steeper; new northern streets are bounded to 11%.
        if (a.z < -41 && length > 0)
          assert.ok(
            Math.abs(districtHeight(a.z) - districtHeight(b.z)) / length <=
              0.11,
          );
      }
  }
  const steep = planTerrainDistrict(731, (z) => z * -2);
  assert.ok(steep.rejected > 0);
  assert.equal(steep.lots.length, 27);
});

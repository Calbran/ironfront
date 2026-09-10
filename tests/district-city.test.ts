import test from "node:test";
import assert from "node:assert/strict";
import { planDistrictCity } from "../packages/game-core/src/districtCity";
test("district growth meets budgets with distinct level zones", () => {
  for (const count of [128, 160, 256, 512, 1024]) {
    const p = planDistrictCity(count);
    assert.equal(p.lots.length + 1, count);
    assert.equal(
      p.districts.reduce((n, d) => n + d.buildings, 28),
      count,
    );
    assert.ok(p.districts.some((d) => d.kind === "commercial"));
    assert.ok(p.districts.some((d) => d.kind === "residential"));
    assert.ok(
      p.districts
        .filter((d) => d.kind === "industrial")
        .every((d) => d.z === 45),
    );
    for (const d of p.districts) assert.ok(d.buildings > 0);
  }
  assert.deepEqual(planDistrictCity(), planDistrictCity());
  assert.throws(() => planDistrictCity(10000));
});

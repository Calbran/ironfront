import test from "node:test";
import assert from "node:assert/strict";
import {
  planOrganicCity,
  lineDistance,
  lotsOverlap,
  lotIntersectsStreet,
} from "../packages/game-core/src/organicCity";
test("organic city budgets, determinism and clear frontages", () => {
  for (const count of [128, 160, 256, 512, 1024]) {
    const p = planOrganicCity(count);
    assert.equal(p.lots.length + 1, count);
    for (let i = 0; i < p.lots.length; i++) {
      const lot = p.lots[i];
      assert.ok(p.rivers.every((r) => lineDistance(lot, r) >= 7));
      assert.ok(p.streets.every((s) => !lotIntersectsStreet(lot, s)));
      assert.ok(p.lots.slice(i + 1).every((q) => !lotsOverlap(lot, q)));
    }
  }
  assert.deepEqual(planOrganicCity(160), planOrganicCity(160));
  assert.notDeepEqual(
    planOrganicCity(160, 3).lots,
    planOrganicCity(160, 4).lots,
  );
});
test("parks stay open and outskirts retain settlement space", () => {
  const p = planOrganicCity();
  assert.ok(p.lots.some((l) => Math.hypot(l.x, l.z) > p.extent * 0.75));
  assert.ok(
    p.parks.every((k) =>
      p.lots.every((l) => Math.hypot(l.x - k.x, l.z - k.z) >= k.r + 4),
    ),
  );
  assert.throws(() => planOrganicCity(50000));
});

import test from "node:test";
import assert from "node:assert/strict";
import { planCombinedDistrict } from "../packages/game-core/src/combinedDistrict";

test("full city occupies every tile quadrant with a protected civic core and mixed districts", () => {
  const plan = planCombinedDistrict(732, "worldgen", true);
  assert.ok(plan.lots.length > 700);
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      assert.ok(
        plan.lots.filter((l) => l.x * x > 80 && l.z * z > 80).length >= 20,
      );
    }
  for (const kind of ["commercial", "industrial", "residential"]) {
    assert.ok(plan.parcels.filter((p) => p.kind === kind).length >= 4);
  }
  // New lots cannot invade the authored civic square.
  assert.ok(
    plan.lots
      .slice(plan.civicLotCount)
      .every((l) => Math.abs(l.x) > 24 || l.z < -18 || l.z > 19),
  );
  assert.ok(
    plan.lots.every((l) => l.variant !== "home" && l.variant !== "shop"),
    "no rural canopy buildings in the civic center",
  );
  assert.equal(
    plan.rivers.length,
    1,
    "full city uses only the generated river",
  );
  assert.ok(
    plan.lots.some((l) => Math.abs(l.x) < 38 && l.z > 25 && l.z < 55),
    "former dock is developed",
  );
  assert.ok(
    plan.parcels.some((p) => p.boundary.length === 3),
    "diagonal cross streets form corner parcels",
  );
  const angled = plan.streets.filter((s) => {
    const a = s.points[0],
      b = s.points.at(-1)!;
    return Math.abs(a.x - b.x) > 1 && Math.abs(a.z - b.z) > 1;
  });
  assert.ok(
    angled.length > 15,
    "street junctions vary bearings across the city",
  );
  const towers = plan.lots.filter((l) =>
    l.variant.startsWith("commercialTower"),
  );
  assert.ok(towers.length > 4);
  assert.ok(towers.some((l) => (l.heightScale ?? 1) > 1.2));
  assert.ok(towers.every((l) => Math.hypot(l.x, l.z) < 120));
});

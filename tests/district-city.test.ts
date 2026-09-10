import { lotIntersectsStreet } from "../packages/game-core/src/organicCity";
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

test("urban kit preserves dense clear frontages across seeds and partial budgets", () => {
  for (const seed of [0, 1, 731, 98765]) {
    for (const count of [29, 47, 160, 257]) {
      const plan = planDistrictCity(count, seed);
      assert.equal(plan.lots.length + 1, count);
      assert.deepEqual(plan, planDistrictCity(count, seed));
      // The planner itself rejects overlapping lots and street intersections.
      if (count >= 160) {
        const variants = new Set(plan.lots.map((lot) => lot.variant));
        for (const variant of ["urbanCorner", "urbanTenement", "warehouse"])
          assert.ok(variants.has(variant), `${seed}: missing ${variant}`);
      }
    }
  }
  const small = planDistrictCity(160).lots;
  const large = planDistrictCity(1024).lots;
  for (const variant of ["urbanCorner", "urbanTenement", "warehouse"]) {
    assert.equal(
      small.find((p) => p.variant === variant)!.scale,
      large.find((p) => p.variant === variant)!.scale,
    );
  }
});

test("mills and skyline towers occupy larger plots at fixed architectural scale", () => {
  for (const count of [160, 256, 1024]) {
    const plan = planDistrictCity(count);
    assert.equal(plan.lots.length + 1, count);
    for (const name of ["mill", "boilerHouse", "commercialTower"])
      assert.ok(
        plan.lots.some((p) => p.variant === name),
        name,
      );
    for (const tower of plan.lots.filter(
      (p) => p.variant === "commercialTower",
    )) {
      assert.equal(tower.scale, 0.85);
      assert.equal(tower.heightScale, 1);
      assert.ok(tower.z < -30 || Math.abs(tower.x) >= 60);
    }
  }
});

test("seeded courtyard and stepped blocks vary geometry while retaining budgets", () => {
  const a = planDistrictCity(256, 731),
    b = planDistrictCity(256, 732);
  assert.notDeepEqual(
    a.lots.map((p) => [p.x, p.z, p.angle]),
    b.lots.map((p) => [p.x, p.z, p.angle]),
  );
  for (const plan of [a, b]) {
    assert.equal(plan.lots.length + 1, 256);
    assert.ok(plan.districts.some((d) => d.pattern === "courtyard"));
    assert.ok(plan.districts.some((d) => d.pattern === "crescent"));
    assert.ok(plan.lots.every((p) => p.fullEnvelope));
  }
});

test("courtyard wings leave a usable rear-window court", () => {
  const plan = planDistrictCity(256);
  for (const d of plan.districts.filter((d) => d.pattern === "courtyard")) {
    const wings = plan.lots.filter(
      (p) => Math.abs(p.x - d.x) < 21 && Math.abs(p.z - d.z) < 14,
    );
    assert.ok(wings.every((p) => p.variant === "urbanCourt"));
    // The planted 15-by-5 court plus walking margin stays clear of all wings.
    for (const p of wings) {
      const hx =
        ((Math.abs(Math.cos(p.angle)) * 5.4 + Math.abs(Math.sin(p.angle)) * 8) *
          p.scale) /
        2;
      const hz =
        ((Math.abs(Math.sin(p.angle)) * 5.4 + Math.abs(Math.cos(p.angle)) * 8) *
          p.scale) /
        2;
      assert.ok(
        Math.abs(p.x - d.x) - hx >= 9 || Math.abs(p.z - d.z) - hz >= 3.5,
      );
    }
  }
});

test("front doors reach their block street without crossing another building", () => {
  for (const seed of [0, 731, 732]) {
    const plan = planDistrictCity(257, seed);
    assert.ok(plan.districts.some((d) => d.pattern === "terraces"));
    for (const d of plan.districts) {
      assert.equal(d.access.length, d.buildings);
      for (const access of d.access) {
        const lot = plan.lots[access.lotIndex];
        const dx = access.street.x - access.entrance.x;
        const dz = access.street.z - access.entrance.z;
        assert.ok(dx * Math.sin(lot.angle) + dz * Math.cos(lot.angle) > 0);
        for (const other of plan.lots) {
          if (other === lot) continue;
          assert.ok(
            !lotIntersectsStreet(other, {
              points: [access.entrance, access.street],
              width: 1.25,
              alley: true,
            }),
            `blocked entrance in ${d.id}`,
          );
        }
      }
    }
  }
});

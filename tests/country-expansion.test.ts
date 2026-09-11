import { roadEnds } from "../packages/game-core/src/countryLayoutGeometry";
import { cityBuildingFootprint } from "../packages/game-core/src/cityBuildingKit";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateCountryPOI,
  POI_CATALOG,
} from "../packages/game-core/src/countryPOI";
import { obstacleDistance } from "../packages/game-core/src/cityTactics";
import { countryFieldGeometry } from "../apps/web/src/experiments/countryFieldGeometry";
test("expanded sites grow land and content without scaling buildings or blocking their spine road", () => {
  for (const [kind] of POI_CATALOG)
    for (const size of ["site", "estate", "district"] as const) {
      const plan = generateCountryPOI(kind, 732, { size });
      assert.deepEqual(plan, generateCountryPOI(kind, 732, { size }));
      const compact = generateCountryPOI(kind, 732);
      for (const b of plan.buildings) {
        const o = plan.obstacles.find((o) => o.id === b.id)!,
          f = cityBuildingFootprint(b.variant);
        assert.equal(o.width, f.width);
        assert.equal(o.depth, f.depth);
      }
      assert.equal(
        new Set(plan.obstacles.map((o) => o.id)).size,
        plan.obstacles.length,
      );
      for (const r of plan.roads) {
        const [a, b] = roadEnds(r);
        for (let t = 0; t <= 1; t += 0.1)
          assert(
            plan.obstacles.every(
              (o) =>
                obstacleDistance(
                  { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t },
                  o,
                ) > Math.min(1.4, r.depth / 2),
            ),
          );
      }
      for (const o of plan.obstacles) {
        assert(Number.isFinite(o.x + o.z + o.angle));
        assert(Math.abs(o.x) <= plan.extent && Math.abs(o.z) <= plan.extent);
      }
    }
});
test("farmland parcels are bounded, convex, separated, varied and render with finite clipped rows", () => {
  for (const seed of [1, 732, 90210])
    for (const size of ["site", "estate", "district"] as const) {
      const p = generateCountryPOI("strip-fields", seed, { size });
      assert(new Set(p.fields.map((f) => f.crop)).size >= 3);
      for (const f of p.fields) {
        const poly = f.polygon!;
        assert.equal(poly.length, 4);
        for (let i = 0; i < 4; i++) {
          const a = poly[i],
            b = poly[(i + 1) % 4],
            c = poly[(i + 2) % 4];
          assert((b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x) > 0);
          assert(Math.abs(a.x) < p.extent && Math.abs(a.z) < p.extent);
        }
      }
      // Separating-axis theorem: no two convex crop surfaces overlap.
      for (let i = 0; i < p.fields.length; i++)
        for (let j = i + 1; j < p.fields.length; j++) {
          const a = p.fields[i].polygon!,
            b = p.fields[j].polygon!;
          const separated = [a, b].some((poly) =>
            poly.some((v, k) => {
              const n = poly[(k + 1) % 4],
                nx = n.z - v.z,
                nz = v.x - n.x,
                A = a.map((v) => v.x * nx + v.z * nz),
                B = b.map((v) => v.x * nx + v.z * nz);
              return (
                Math.max(...A) < Math.min(...B) ||
                Math.max(...B) < Math.min(...A)
              );
            }),
          );
          assert(separated);
        }
      const g = countryFieldGeometry(p.fields);
      assert(Array.from(g.attributes.position.array).every(Number.isFinite));
      assert(g.attributes.position.count < 150000);
      g.dispose();
    }
  assert(
    generateCountryPOI("strip-fields", 732, { size: "district" }).fields
      .length >
      generateCountryPOI("strip-fields", 732, { size: "site" }).fields.length,
  );
});

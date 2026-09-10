import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld } from "../packages/game-core/src/index.ts";
import { mapGeometry } from "../apps/web/src/mapGeometry.ts";
import { signedArea } from "../packages/game-core/src/geography.ts";

test("display polygons tile exactly and every stroke follows the same edge as its fills", () => {
  for (const seed of ["Meridian", "Boreal", "Ironfront"]) {
    const world = createWorld("mesh", seed, 4, 10000, 0);
    const before = JSON.stringify(world.geography);
    const geometry = mapGeometry(world);
    const id = (p: number[]) => p.join(",");
    const key = (a: number[], b: number[]) => [id(a), id(b)].sort().join("|");
    const fillEdges = new Map<
      string,
      { directions: string[]; regions: number[] }
    >();
    geometry.rings.forEach((rings, region) => {
      assert(rings.reduce((sum, r) => sum + signedArea(r), 0) > 0);
      for (const ring of rings)
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i],
            b = ring[(i + 1) % ring.length],
            k = key(a, b);
          const entry = fillEdges.get(k) ?? { directions: [], regions: [] };
          entry.directions.push(`${id(a)}>${id(b)}`);
          entry.regions.push(region);
          fillEdges.set(k, entry);
        }
    });
    assert.equal(fillEdges.size, geometry.edges.length);
    for (const edge of geometry.edges) {
      const entry = fillEdges.get(key(edge.a, edge.b));
      assert(entry);
      assert.deepEqual(entry.regions, edge.regions);
      if (edge.regions.length === 2) {
        assert.notEqual(
          entry.directions[0],
          entry.directions[1],
          "Adjacent fills must traverse the shared edge in opposite directions",
        );
      } else assert.equal(edge.regions.length, 1);
    }
    assert.equal(
      JSON.stringify(world.geography),
      before,
      "Display smoothing must not mutate saved geography",
    );
  }
});

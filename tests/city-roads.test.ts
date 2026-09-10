import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld } from "../packages/game-core/src/index.ts";
import { generateCityRoads } from "../packages/game-core/src/cityRoads.ts";
import { localSegment } from "../packages/game-core/src/localMovement.ts";
import { blockedByMountains } from "../packages/game-core/src/mountainObstacles.ts";
test("nearby-town roads are reproducible, curved and respect ground obstacles", () => {
  const w = createWorld("ROADS", "Boreal", 4, 3600000, 0),
    before = JSON.stringify(w),
    roads = generateCityRoads(w);
  assert(roads.length > 5);
  assert.equal(JSON.stringify(w), before);
  assert.deepEqual(generateCityRoads(JSON.parse(before)), roads);
  const sites = w.regions.flatMap((r) =>
    (r.features ?? []).filter((f) => f.kind === "settlement"),
  );
  const reachable = new Set([sites[0].id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const road of roads)
      if (reachable.has(road.from) !== reachable.has(road.to)) {
        reachable.add(road.from);
        reachable.add(road.to);
        changed = true;
      }
  }
  assert.equal(
    reachable.size,
    sites.length,
    "all settlements share one road network",
  );
  assert(
    roads.length >= sites.length - 1 &&
      roads.length <= sites.length - 1 + Math.ceil(sites.length * 0.12),
  );
  assert(roads.some((r) => r.kind === "main"));
  assert(roads.some((r) => r.kind === "local"));
  assert(roads.some((r) => r.bridges.length));
  for (const road of roads) {
    const from = sites.find((f) => f.id === road.from)!,
      to = sites.find((f) => f.id === road.to)!;
    assert(from && to);
    assert.equal(road.points[0].x, from.x);
    assert.equal(road.points.at(-1)!.x, to.x);
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1],
        b = road.points[i];
      if (a.region === b.region)
        assert(localSegment(w.regions[a.region!], a, b));
      else assert(Math.hypot(a.x - b.x, a.y - b.y) <= 1.01);
      assert(!blockedByMountains(w.regions[b.region!].mountainObstacles, a, b));
    }
  }
  assert(
    roads.some((r) => {
      const a = r.points[0],
        b = r.points.at(-1)!;
      return r.points.some(
        (p) =>
          Math.abs((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) /
            Math.hypot(b.x - a.x, b.y - a.y) >
          10,
      );
    }),
  );
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld } from "../packages/game-core/src/index.ts";
import { generateBiomeScenery } from "../packages/game-core/src/biomeScenery.ts";
import { onLocalLand } from "../packages/game-core/src/localMovement.ts";
test("biome scenery is deterministic cosmetic state, stays on land, and clears settlements", () => {
  const w = createWorld("SCENERY", "Boreal", 4, 3600000, 0);
  const clearing = { x: w.regions[0].x, y: w.regions[0].y, radius: 400 };
  const before = JSON.stringify(w),
    points = generateBiomeScenery(w, [clearing]);
  assert(points.length > 100);
  assert(points.length < 18000);
  assert(points.some((p) => p.kind === "tree"));
  assert(points.some((p) => p.kind === "rock"));
  assert.deepEqual(
    generateBiomeScenery(JSON.parse(before), [clearing]),
    points,
  );
  assert.equal(JSON.stringify(w), before);
  const land = w.regions.map((r) => ({
    ...r,
    terrain: "plains" as const,
    mountainObstacles: [],
  }));
  for (const p of points) {
    assert(
      land.some((r) => onLocalLand(r, p)),
      "scenery stays on mainland",
    );
    assert(
      Math.hypot(p.x - clearing.x, p.y - clearing.y) >=
        clearing.radius + p.width * 0.55,
    );
    assert(
      p.variant >= (p.kind === "tree" ? 0 : 4) &&
        p.variant < (p.kind === "tree" ? 4 : 8),
    );
  }
  // Campaign time, control, and force state must never reseed scenery.
  w.hour += 8;
  w.regions[0].owner = 2;
  w.armies = [];
  assert.deepEqual(generateBiomeScenery(w, [clearing]), points);
});
test("plain ground receives no forest or mountain sprites; a biome patch can cross territory lines", () => {
  const w = createWorld("SCENERY2", "Boreal", 4, 3600000, 0);
  for (const r of w.regions) r.terrain = "plains";
  w.geography!.terrainPatches = [];
  assert.equal(generateBiomeScenery(w).length, 0);
  const forest = w.regions
    .slice(0, 3)
    .flatMap((r) => r.contours ?? [r.polygon]);
  w.geography!.terrainPatches = [
    { terrain: "forest", contours: forest as [number, number][][] },
  ];
  const points = generateBiomeScenery(w);
  assert(points.length > 0);
  assert(points.every((p) => p.kind === "tree"));
});

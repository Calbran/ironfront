import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld } from "../packages/game-core/src/index.ts";
import { planMiniatureTown } from "../packages/game-core/src/miniatureTown.ts";
import {
  buildingCorners,
  buildingsOverlap,
} from "../packages/game-core/src/cityLayout.ts";
const world = createWorld("TOWN", "Meridian", 4, 3600000, 0),
  region = world.regions[0];
region.terrain = "plains";
region.polygon = [
  [-400, -400],
  [400, -400],
  [400, 400],
  [-400, 400],
];
region.contours = [region.polygon as [number,number][]];
region.mountainObstacles = [];
const site = {
  id: "study",
  kind: "settlement" as const,
  name: "River town",
  x: 30,
  y: 40,
};
const roads = [
  {
    from: "a",
    to: "b",
    points: [
      { x: -300, y: 0 },
      { x: 300, y: 0 },
    ],
    kind: "main" as const,
    utilities: false,
    bridges: [{ x: 0, y: 0, angle: 0 }],
  },
];
const rivers = [
  [
    [0, -400],
    [0, 400],
  ],
];
test("town is deterministic, connected, street-facing and keeps building envelopes dry", () => {
  const before = JSON.stringify({ world, roads, rivers });
  const plan = planMiniatureTown(world, 0, site, roads, rivers);
  assert(plan);
  assert(plan.buildings.length >= 4);
  assert.deepEqual(plan, planMiniatureTown(world, 0, site, roads, rivers));
  assert.equal(before, JSON.stringify({ world, roads, rivers }));
  for (const road of plan.roads) assert.deepEqual(road[0], plan.plaza);
  for (const [i, b] of plan.buildings.entries()) {
    for (const p of buildingCorners({ ...b, width: 54, height: 54 }))
      assert(Math.abs(p.x) > 16, "building footprint overlaps river");
    const dx = b.frontage.x - b.x,
      dy = b.frontage.y - b.y;
    assert(
      (-Math.sin(b.angle) * dx + Math.cos(b.angle) * dy) / Math.hypot(dx, dy) >
        0.999,
      "door faces away from its frontage",
    );
    for (const c of plan.buildings.slice(i + 1))
      assert(
        !buildingsOverlap(
          { ...b, width: 54, height: 54 },
          { ...c, width: 54, height: 54 },
        ),
      );
  }
  assert(plan.buildings.some((b) => b.model === "hall"));
  assert(plan.buildings.some((b) => b.model === "factory"));
});
test("unbuildable terrain produces no town instead of invalid lots", () => {
  const blocked = structuredClone(world);
  blocked.regions[0].terrain = "mountains";
  assert.equal(planMiniatureTown(blocked, 0, site, roads, rivers), null);
});

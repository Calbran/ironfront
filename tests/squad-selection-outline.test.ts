import test from "node:test";
import assert from "node:assert/strict";
import { squadSelectionOutline } from "../apps/web/src/experiments/squadSelectionOutline";

test("squad selection outline expands to contain every member", () => {
  const compact = squadSelectionOutline([{ x: 4, z: 7 }], 1.5, 40),
    spread = squadSelectionOutline(
      [
        { x: -4, z: -2 },
        { x: 4, z: -2 },
        { x: -3, z: 3 },
        { x: 3, z: 3 },
      ],
      1.5,
      40,
    ),
    bounds = (points: readonly { x: number; z: number }[]) => ({
      minX: Math.min(...points.map((p) => p.x)),
      maxX: Math.max(...points.map((p) => p.x)),
      minZ: Math.min(...points.map((p) => p.z)),
      maxZ: Math.max(...points.map((p) => p.z)),
    });
  assert.deepEqual(bounds(compact), {
    minX: 2.5,
    maxX: 5.5,
    minZ: 5.5,
    maxZ: 8.5,
  });
  assert.deepEqual(bounds(spread), {
    minX: -5.5,
    maxX: 5.5,
    minZ: -3.5,
    maxZ: 4.5,
  });
  assert.ok(bounds(spread).maxX - bounds(spread).minX > 10);
});

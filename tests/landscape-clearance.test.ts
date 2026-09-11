import { test } from "node:test";
import assert from "node:assert/strict";
import { landscapeClearance } from "../packages/game-core/src/landscapeClearance.ts";
test("scenery footprint clears farmland and the complete road shoulder", () => {
  const clear = landscapeClearance(
    [
      {
        region: 0,
        kind: "crop",
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ],
      },
    ],
    [
      {
        from: "a",
        to: "b",
        kind: "main",
        utilities: false,
        bridges: [],
        points: [
          { x: 200, y: 0 },
          { x: 200, y: 100 },
        ],
      },
    ],
    5,
  );
  assert(!clear({ x: 50, y: 50 }, 5));
  assert(
    !clear({ x: 110, y: 50 }, 20),
    "hill center outside field still overlaps by its footprint",
  );
  assert(!clear({ x: 215, y: 50 }, 10), "wide road shoulder is protected");
  assert(clear({ x: 150, y: 50 }, 10));
});

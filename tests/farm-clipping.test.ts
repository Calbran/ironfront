import { test } from "node:test";
import assert from "node:assert/strict";
import {
  farmClipper,
  farmCorridor,
  polygonArea,
} from "../packages/game-core/src/farmClipping.ts";
import type { Region } from "../packages/game-core/src/index.ts";
test("edge fields cover an irregular region while preserving its lake and road corridor", () => {
  const outer = [
    [0, 0],
    [100, 0],
    [100, 60],
    [60, 60],
    [60, 100],
    [0, 100],
  ];
  const hole = [
    [20, 20],
    [20, 40],
    [40, 40],
    [40, 20],
  ];
  const region = { polygon: outer, contours: [outer, hole] } as Region;
  const parcel = [
    { x: -10, y: -10 },
    { x: 110, y: -10 },
    { x: 110, y: 110 },
    { x: -10, y: 110 },
  ];
  const area = (p: ReturnType<ReturnType<typeof farmClipper>>) =>
    p.reduce((n, q) => n + polygonArea(q), 0);
  assert(Math.abs(area(farmClipper(region, [])(parcel)) - 8000) < 0.01);
  assert(
    Math.abs(
      area(
        farmClipper(region, [
          farmCorridor({ x: 50, y: -10 }, { x: 50, y: 110 }, 2),
        ])(parcel),
      ) - 7600,
    ) < 0.01,
  );
});

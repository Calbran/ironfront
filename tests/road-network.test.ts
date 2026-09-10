import { test } from "node:test";
import assert from "node:assert/strict";
import {
  consolidateRoads,
  uniqueRoadSegments,
} from "../packages/game-core/src/roadNetwork.ts";
import type { CityRoad } from "../packages/game-core/src/cityRoads.ts";
const road = (from: string, to: string, points: number[][]): CityRoad => ({
  from,
  to,
  points: points.map(([x, y]) => ({ x, y, region: 0 })),
  utilities: true,
  kind: "local",
  bridges: [],
});
test("intersecting town routes form one shared junction and have no duplicate physical circuits", () => {
  const roads = [
    road("a", "b", [
      [0, 0],
      [100, 100],
    ]),
    road("c", "d", [
      [0, 100],
      [100, 0],
    ]),
    road("a", "c", [
      [0, 0],
      [0, 100],
    ]),
  ];
  const endpoints = roads.map((r) => [r.points[0], r.points.at(-1)]);
  consolidateRoads(roads);
  for (let i = 0; i < roads.length; i++)
    assert.deepEqual(
      [roads[i].points[0], roads[i].points.at(-1)],
      endpoints[i],
    );
  const physical = uniqueRoadSegments(roads),
    vertices = new Set(
      physical.flatMap((r) => r.points.map((p) => `${p.x},${p.y}`)),
    );
  assert.equal(
    physical.length,
    vertices.size - 1,
    "redundant circuits are removed",
  );
  assert(
    physical.filter((r) => r.points.some((p) => p.x === 50 && p.y === 50))
      .length >= 3,
    "roads share a real intersection",
  );
});
test("partially overlapping road stretches are split and rendered once", () => {
  const roads = [
    road("a", "b", [
      [0, 0],
      [100, 0],
    ]),
    road("c", "d", [
      [50, 0],
      [150, 0],
    ]),
  ];
  consolidateRoads(roads);
  const physical = uniqueRoadSegments(roads);
  assert.equal(physical.length, 3);
  assert.equal(
    physical.reduce(
      (sum, r) =>
        sum +
        Math.hypot(
          r.points[1].x - r.points[0].x,
          r.points[1].y - r.points[0].y,
        ),
      0,
    ),
    150,
  );
});

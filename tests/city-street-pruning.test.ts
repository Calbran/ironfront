import test from "node:test";
import assert from "node:assert/strict";
import { pruneCityStreets } from "../packages/game-core/src/cityStreetPruning";
import {
  lineDistance,
  type CityStreet,
} from "../packages/game-core/src/organicCity";
test("pruning removes disconnected empty roads and preserves served frontage", () => {
  const streets: CityStreet[] = [
    {
      points: [
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        { x: 20, z: 0 },
      ],
      width: 3,
      alley: false,
    },
    {
      points: [
        { x: 10, z: 0 },
        { x: 10, z: 10 },
      ],
      width: 1,
      alley: true,
    },
    {
      points: [
        { x: 100, z: 100 },
        { x: 110, z: 100 },
      ],
      width: 1,
      alley: true,
    },
  ];
  const lot = { x: 10, z: 8, angle: 0, scale: 0.8, variant: "home" };
  const result = pruneCityStreets(streets, [lot]);
  assert.ok(result.length > 0);
  assert.ok(result.every((s) => s.points.every((p) => p.x < 100)));
  assert.ok(Math.min(...result.map((s) => lineDistance(lot, s.points))) <= 2);
  assert.deepEqual(pruneCityStreets(streets, []), []);
  assert.deepEqual(result, pruneCityStreets(streets, [lot]));
});

test("an empty side spur is removed while the occupied route stays connected", () => {
  const streets: CityStreet[] = [
    {
      points: [
        { x: 0, z: 0 },
        { x: 20, z: 0 },
        { x: 40, z: 0 },
      ],
      width: 3,
      alley: false,
    },
    {
      points: [
        { x: 20, z: 0 },
        { x: 20, z: 2 },
      ],
      width: 1,
      alley: true,
    },
  ];
  const result = pruneCityStreets(streets, [
    { x: 40, z: 3, angle: 0, scale: 0.8, variant: "home" },
  ]);
  assert.ok(result.every((s) => s.points.every((p) => p.z === 0)));
  assert.ok(result.some((s) => s.points.some((p) => p.x === 40)));
});

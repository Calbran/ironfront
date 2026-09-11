import { test } from "node:test";
import assert from "node:assert/strict";
import { trimSettlementStreets } from "../packages/game-core/src/trimSettlementStreets";
import { countryRoadWidthAt } from "../packages/game-core/src/countryRoadNetwork";
const road = (x: number, z: number, bx: number, bz: number) => ({
  width: 3,
  alley: false,
  points: [
    { x, z },
    { x: bx, z: bz },
  ],
});
test("unused spurs disappear while frontage and a country exit remain reachable", () => {
  const streets = [
    road(0, 19, 40, 19),
    road(40, 19, 160, 19),
    road(40, 19, 40, 70),
    road(40, 70, 70, 70),
    road(0, 19, 0, 90),
  ];
  const result = trimSettlementStreets(streets, [{ x: 0, z: 55 }]);
  assert.ok(
    result.some((s) => s.points.some((p) => p.x === 160 && p.z === 19)),
  );
  assert.ok(!result.some((s) => s.points.some((p) => p.z === 70)));
  assert.ok(result.some((s) => s.points.some((p) => p.x === 0 && p.z === 61)));
  assert.ok(!result.some((s) => s.points.some((p) => p.z === 90)));
});
test("country entrance retains city width then widens smoothly at authored scale", () => {
  const road = {
    id: "approach",
    width: 6,
    startWidth: 3,
    transitionLength: 32,
    highway: true,
    path: [],
  };
  assert.equal(countryRoadWidthAt(road, 0), 3);
  assert.equal(countryRoadWidthAt(road, 6), 3);
  assert.equal(countryRoadWidthAt(road, 38), 6);
  let previous = 3;
  for (let d = 0; d < 45; d++) {
    const width = countryRoadWidthAt(road, d);
    assert.ok(width >= previous && width <= 6);
    previous = width;
  }
});

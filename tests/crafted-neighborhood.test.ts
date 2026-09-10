import test from "node:test";
import assert from "node:assert/strict";
import {
  planCraftedNeighborhood,
  neighborhoodHeight,
} from "../packages/game-core/src/craftedNeighborhood";
test("crafted neighborhood has a fixed budget and level building foundations", () => {
  const p = planCraftedNeighborhood();
  assert.equal(p.lots.length, 27);
  for (const lot of p.lots)
    assert.equal(
      neighborhoodHeight(lot.z - 2.5),
      neighborhoodHeight(lot.z + 2.5),
    );
  assert.equal(neighborhoodHeight(0), 2);
  assert.equal(neighborhoodHeight(40), 0);
  for (let z = 20; z < 34; z++)
    assert.ok(
      Math.abs(neighborhoodHeight(z + 1) - neighborhoodHeight(z)) < 0.15,
    );
  assert.deepEqual(p, planCraftedNeighborhood());
});

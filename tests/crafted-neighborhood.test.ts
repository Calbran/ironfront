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

test("street-bounded civic block stays free of other building footprints", () => {
  for (const lot of planCraftedNeighborhood().lots) {
    // Largest non-civic model is 10 by 7; this conservative bound includes roofs.
    const halfX = (Math.abs(Math.cos(lot.angle)) * 5.4 + Math.abs(Math.sin(lot.angle)) * 3.9) * lot.scale;
    const halfZ = (Math.abs(Math.sin(lot.angle)) * 5.4 + Math.abs(Math.cos(lot.angle)) * 3.9) * lot.scale;
    assert.ok(lot.x + halfX < -22.5 || lot.x - halfX > 22.5 ||
      lot.z + halfZ < -16.5 || lot.z - halfZ > 17, `Building intrudes into civic grounds: ${JSON.stringify(lot)}`);
  }
});

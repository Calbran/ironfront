import { test } from "node:test";
import assert from "node:assert/strict";
import { createSliceState } from "../packages/game-core/src/countrySlice";
import { sampleSliceMotion } from "../apps/web/src/experiments/sliceMotion";
test("render playback continues between snapshots without mutating authority or replaying absence", () => {
  const state = createSliceState(1000);
  state.running = true;
  state.units[0].path = [{ x: 510, z: 919 }];
  const before = JSON.stringify(state);
  const positions = [200, 400, 600, 750].map(
    (t) => sampleSliceMotion(state, t).units[0].x,
  );
  assert.ok(positions.every((x, i) => i === 0 || x > positions[i - 1]));
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(
    sampleSliceMotion(state, 300000),
    sampleSliceMotion(state, 2000),
  );
  state.running = false;
  assert.equal(sampleSliceMotion(state, 600).units[0].x, 500);
});

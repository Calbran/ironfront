import { advanceEncounter } from "../packages/game-core/src/countryEncounter";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSliceState,
  ensureSliceSquads,
} from "../packages/game-core/src/countrySlice";
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

test("battle playback does not rewind when snapshots arrive between movement batches", () => {
  for (const pace of [1, 20]) {
    const state = createSliceState(0);
    state.running = true;
    state.pace = pace;
    state.units = [state.units.find((u) => u.kind === "tank")!, state.units[0]];
    ensureSliceSquads(state);
    for (const unit of state.units.flatMap((u) => u.members ?? [u])) {
      unit.angle = Math.PI / 2;
      unit.path = [{ x: unit.x + 1000, z: unit.z }];
    }
    state.encounter = {
      elapsed: 0,
      remainder: 0,
      stage: "bridge",
      progress: 0,
      bridge: { x: -10000, z: -10000 },
      outpost: { x: -10000, z: -10000 },
      shots: [],
      sequence: 0,
    };
    for (const time of [73, 191, 267, 389, 511, 699, 803]) {
      const before = sampleSliceMotion(state, time - state.time).units.flatMap(
        (u) => u.members ?? [u],
      );
      advanceEncounter(state, time, () => 0);
      const after = sampleSliceMotion(state, 0).units.flatMap(
        (u) => u.members ?? [u],
      );
      for (let i = 0; i < before.length; i++) {
        assert.ok(
          Math.abs(before[i].x - after[i].x) < 1e-7,
          "snapshot must not rewind position",
        );
        assert.ok(
          Math.abs(before[i].distance - after[i].distance) < 1e-7,
          "snapshot must not rewind stride",
        );
      }
    }
    for (const stage of ["victory", "defeat"] as const) {
      state.encounter.stage = stage;
      assert.deepEqual(sampleSliceMotion(state, 500), state);
    }
  }
});

test("fractional render playback preserves a mixed group's shared pace", () => {
  const state = createSliceState(0);
  state.running = true;
  state.units = [state.units[2], state.units[0]];
  ensureSliceSquads(state);
  const members = state.units[1].members!, tank = state.units[0];
  for (const unit of [tank, ...members]) {
    unit.moveGroup = 1;
    unit.angle = Math.PI / 2;
    unit.path = [{ x: unit.x + 100, z: unit.z }];
  }
  tank.angle = 0;
  const turning = sampleSliceMotion(state, 25);
  assert.ok(turning.units[1].members!.every((unit, i) => unit.x === members[i].x));
  tank.angle = Math.PI / 2;
  const moving = sampleSliceMotion(state, 25),
    distances = [moving.units[0], ...moving.units[1].members!].map(
      (unit) => unit.distance,
    );
  assert.ok(Math.max(...distances) - Math.min(...distances) < 1e-8);
});

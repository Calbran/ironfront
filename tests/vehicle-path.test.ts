import test from "node:test";
import assert from "node:assert/strict";
import { smoothVehiclePath } from "../packages/game-core/src/vehiclePath";
import {
  advanceSlice,
  createSliceState,
} from "../packages/game-core/src/countrySlice";

test("vehicle rounding preserves endpoints and every obstacle-clear segment", () => {
  const clear = (a: { x: number; z: number }, b: { x: number; z: number }) => {
    for (let i = 0; i <= 100; i++) {
      const x = a.x + ((b.x - a.x) * i) / 100,
        z = a.z + ((b.z - a.z) * i) / 100;
      if (x > 3 && z < 17) return false;
    }
    return true;
  };
  const path = [
    { x: 0, z: 0 },
    { x: 0, z: 20 },
    { x: 20, z: 20 },
  ];
  const result = smoothVehiclePath(path, clear);
  assert.deepEqual(result[0], path[0]);
  assert.deepEqual(result.at(-1), path.at(-1));
  assert.ok(result.length > 3, "corner is rounded with intermediate points");
  assert.ok(result.every((p, i) => !i || clear(result[i - 1], p)));
});

test("gentle tank steering continues moving and is independent of snapshot cadence", () => {
  const a = createSliceState(0);
  a.running = true;
  const tank = a.units[2];
  tank.angle = 0;
  tank.path = [
    { x: tank.x + 1, z: tank.z + 10 },
    { x: tank.x + 3, z: tank.z + 20 },
  ];
  const b = structuredClone(a),
    start = tank.z;
  advanceSlice(a, 100);
  assert.ok(tank.z > start && tank.angle > 0, "turn and travel occur together");
  for (let t = 200; t <= 5000; t += 100) advanceSlice(a, t);
  advanceSlice(b, 5000);
  assert.ok(Math.hypot(tank.x - b.units[2].x, tank.z - b.units[2].z) < 1e-8);
  assert.ok(Math.abs(tank.angle - b.units[2].angle) < 1e-8);
});

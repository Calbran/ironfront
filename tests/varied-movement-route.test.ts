import test from "node:test";
import assert from "node:assert/strict";
import { variedMovementRoute } from "../packages/game-core/src/variedMovementRoute";
test("shared infantry routes simplify guides, vary by identity and preserve exact endpoints", () => {
  const route = [
    { x: 0, z: 0 },
    { x: 5, z: 0 },
    { x: 15, z: 0 },
  ];
  const a = variedMovementRoute(route, 1, true, () => true),
    b = variedMovementRoute(route, 2, true, () => true);
  assert.equal(a.guide.length, 2);
  assert.ok(a.path.some((p) => Math.abs(p.z) > 0.05));
  assert.notDeepEqual(a.path, b.path);
  assert.deepEqual(a.path.at(-1), route.at(-1));
  assert.deepEqual(
    a,
    variedMovementRoute(route, 1, true, () => true),
  );
});
test("narrow corridors suppress deviations and long country routes have bounded sampling", () => {
  const clear = (a: { z: number }, b: { z: number }) =>
    Math.abs(a.z) < 0.01 && Math.abs(b.z) < 0.01;
  const a = variedMovementRoute(
    [
      { x: 0, z: 0 },
      { x: 3000, z: 0 },
    ],
    1,
    true,
    clear,
  );
  assert.ok(a.path.length < 400);
  assert.ok(a.path.every((p) => Math.abs(p.z) < 0.01));
});

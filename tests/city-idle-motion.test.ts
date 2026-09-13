import test from "node:test";
import assert from "node:assert/strict";
import { cityIdleMotion } from "../apps/web/src/experiments/cityIdleMotion";
test("idle motion stays subtle and soldiers have different timing", () => {
  for (let t = 0; t < 60; t += 0.1) {
    const p = cityIdleMotion(t, 1, 0, false, false, "none");
    assert.ok(Math.abs(p.breath) <= 0.006 && Math.abs(p.sway) <= 0.009);
  }
  assert.notDeepEqual(
    cityIdleMotion(3, 1, 0, false, false, "none"),
    cityIdleMotion(3, 2, 0, false, false, "none"),
  );
});
test("movement suppresses idle while aimed and covered stances keep restrained breathing", () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(cityIdleMotion(3, 1, 1, true, false, "none")).map(
        ([k, v]) => [k, Math.abs(v)],
      ),
    ),
    {
      breath: 0,
      sway: 0,
    },
  );
  for (const cover of ["none", "partial", "full"]) {
    const a = cityIdleMotion(3, 1, 0, false, true, cover);
    const b = cityIdleMotion(4, 1, 0, false, true, cover);
    assert.notEqual(a.breath, b.breath);
    assert.ok(Math.abs(a.breath) <= 0.0033);
    assert.equal(a.sway, 0);
  }
});

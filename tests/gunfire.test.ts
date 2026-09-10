import { test } from "node:test";
import assert from "node:assert/strict";
import { gunfire } from "../apps/web/src/gunfire.ts";
test("riflemen fire independently with small bounded tracers", () => {
  let mixed = false,
    overlap = false;
  for (let now = 0; now < 4000; now += 20) {
    const shots = gunfire("army-0-0", 6, now, "semi");
    if (shots.length > 0 && shots.length < 6) mixed = true;
    if (shots.length && gunfire("army-1-0", 6, now, "semi").length)
      overlap = true;
    assert(
      shots.every(
        (s) =>
          s.length === 2 && s.width < 0.5 && s.progress >= 0 && s.progress < 1,
      ),
    );
    assert.deepEqual(shots, gunfire("army-0-0", 6, now, "semi"));
  }
  assert(mixed);
  assert(overlap);
});
test("burst and automatic profiles create denser fire than semi-auto", () => {
  const counts = ["semi", "burst", "automatic"].map((p) => {
    let sum = 0;
    for (let now = 0; now < 10000; now += 10)
      sum += gunfire("rifle", 6, now, p as "semi").length;
    return sum;
  });
  assert(counts[1] > counts[0] * 2);
  assert(counts[2] > counts[1]);
});

test("seeded shot timing varies across sequences and does not depend on sampled frames", () => {
  for (const profile of ["semi", "burst", "automatic"] as const) {
    const times = new Set<number>();
    for (let now = 0; now < 20000; now += 25) {
      for (const shot of gunfire("cadence", 1, now, profile))
        times.add(shot.firedAt);
    }
    const ordered = [...times].sort((a, b) => a - b);
    const gaps = ordered.slice(1).map((t, i) => Math.round(t - ordered[i]));
    assert(
      new Set(gaps).size > 6,
      `${profile} must not repeat a fixed cadence`,
    );
    assert(Math.max(...gaps) > Math.min(...gaps) * 2);
    const first = gunfire("cadence", 6, 1567, profile);
    gunfire("cadence", 6, 99999, profile);
    assert.deepEqual(gunfire("cadence", 6, 1567, profile), first);
  }
});

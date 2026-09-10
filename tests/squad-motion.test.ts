import { test } from "node:test";
import assert from "node:assert/strict";
import { SquadMotion } from "../apps/web/src/squadMotion.ts";
import type { Squad } from "../packages/game-core/src/tactics.ts";
const squad = (id = "army-0-0"): Squad => ({
  id,
  army: 0,
  owner: 0,
  region: 0,
  kind: "infantry",
  strength: 24,
  capacity: 30,
  morale: 1,
  suppression: 0,
  x: 0,
  y: 0,
  previousX: 0,
  previousY: 0,
  action: "moving",
  target: null,
  fire: 0,
});

test("motion continues throughout three-second polling gaps and does not jump backwards on update", () => {
  const motion = new SquadMotion(),
    s = squad();
  motion.update([s], 0, 100, 1);
  s.x = 30;
  let previous = 0;
  for (let now = 133; now <= 6100; now += 33) {
    const revision = now < 3100 ? 1 : 2;
    if (revision === 2) {
      s.previousX = 39;
      s.x = 60;
    }
    const p = motion.update([s], revision, now, 1).centers.get(s.id)!;
    assert(p.x > previous, `movement stopped at ${now}`);
    assert(p.x - previous < 2, "snapshot should not teleport");
    assert(p.x <= s.x);
    previous = p.x;
  }
});

test("stationary formations stay separated and still, expire cleanly, and respect relocation/reduced motion", () => {
  const motion = new SquadMotion(),
    s = squad(),
    other = squad("army-0-1");
  let result = motion.update([s, other], 0, 100, 2);
  const initial = structuredClone(result.members.get(s.id)!);
  for (let now = 133; now < 2000; now += 33)
    result = motion.update([s, other], 0, now, 2);
  const points = [...result.members.values()].flat();
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      assert(
        Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) > 1.8,
      );
  assert.deepEqual(
    result.members.get(s.id)!.map(({ x, y }) => ({ x, y })),
    initial.map(({ x, y }) => ({ x, y })),
    "Unchanged moving snapshots must not produce cosmetic shuffling",
  );
  s.region = 1;
  s.x = 500;
  result = motion.update([s], 1, 2100, 2, true);
  assert.equal(result.centers.get(s.id)!.x, 500);
  assert.equal(result.members.has(other.id), false);
  assert.equal(motion.update([s], 1, 9000, 2).fresh, false);
});

test("formation layout is stable when snapshot ordering changes", () => {
  const motion = new SquadMotion(),
    a = squad("a"),
    b = squad("b");
  const first = structuredClone(motion.update([a, b], 0, 100, 1).members);
  const next = motion.update([b, a], 1, 133, 1).members;
  assert.deepEqual(next, first);
});

test("soldiers follow a forward order slowly without lateral wandering", () => {
  const motion = new SquadMotion(),
    s = squad();
  const first = structuredClone(
    motion.update([s], 0, 100, 1).members.get(s.id)!,
  );
  s.x = 30;
  let previous = first;
  for (let now = 133; now < 3100; now += 33) {
    const result = motion.update([s], 1, now, 1);
    const dots = result.members.get(s.id)!;
    dots.forEach((p, i) => {
      assert(p.x >= previous[i].x);
      assert(p.x - previous[i].x < 0.5, "No fast hops between frames");
      assert(
        Math.abs(p.y - first[i].y) < 1e-8,
        "No artificial side-to-side motion",
      );
    });
    previous = structuredClone(dots);
  }
  assert(
    previous[0].x > first[0].x + 3,
    "A real order still moves the formation",
  );
  assert(
    previous[0].x < first[0].x + 22,
    "Movement eases over several seconds",
  );
});

test("vehicle poses follow member positions, stay idle, and clean up on removal", () => {
  const motion = new SquadMotion(),
    s = squad();
  s.kind = "motorized";
  s.unitCount = 2;
  s.action = "holding";
  const first = structuredClone(motion.update([s], 0, 100, 1));
  for (let now = 133; now < 3000; now += 33) {
    const result = motion.update([s], 0, now, 1);
    assert.deepEqual(result.poses, first.poses);
    assert.deepEqual(result.members, first.members);
  }
  s.x = 30;
  let result = motion.update([s], 1, 3100, 1);
  for (let now = 3133; now < 6000; now += 33)
    result = motion.update([s], 1, now, 1);
  assert(
    result.poses.get(s.id)![0].heading !== first.poses.get(s.id)![0].heading,
  );
  assert.deepEqual(
    result.poses.get(s.id)!.map(({ x, y }) => ({ x, y })),
    result.members.get(s.id),
  );
  assert.equal(motion.update([], 2, 6100, 1).poses.size, 0);
  const reset = motion.update([s], 3, 6200, 1, true);
  assert(reset.poses.get(s.id)!.every((p) => Number.isFinite(p.heading)));
});

test("returning after suspension snaps to authoritative positions instead of fast-forwarding", () => {
  for (const kind of ["infantry", "motorized", "armor"] as const) {
    const motion = new SquadMotion(),
      s = { ...squad(), kind, independent: true };
    motion.update([s], 1, 100, 1);
    s.x = 900;
    s.y = 400;
    const result = motion.update([s], 20, 180100, 1);
    assert.deepEqual(result.centers.get(s.id), { x: 900, y: 400, region: 0 });
    const positions = structuredClone(result.members.get(s.id));
    assert.deepEqual(
      motion.update([s], 20, 180133, 1).members.get(s.id),
      positions,
    );
  }
});
test("fresh foreground snapshot resets all interpolation even if frames kept running", () => {
  const motion = new SquadMotion(),
    s = squad();
  motion.update([s], 1, 100, 1);
  s.x = 600;
  const resynced = motion.update([s], 2, 133, 1, false, true);
  assert.equal(resynced.centers.get(s.id)!.x, 600);
  s.x = 610;
  const next = motion.update([s], 3, 166, 1);
  assert(
    next.centers.get(s.id)!.x > 600 && next.centers.get(s.id)!.x < 601,
    "Normal smooth movement resumes after resync",
  );
});

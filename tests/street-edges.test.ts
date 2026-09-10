import test from "node:test";
import assert from "node:assert/strict";
import {
  streetOutlines,
  offsetOutline,
} from "../apps/web/src/experiments/streetEdges";
const road = (x1: number, z1: number, x2: number, z2: number) => ({
  points: [
    { x: x1, z: z1 },
    { x: x2, z: z2 },
  ],
  width: 3,
  alley: false,
});
test("curb outlines close around straight, T and angled junctions without internal seams", () => {
  for (const roads of [
    [road(-10, 0, 10, 0)],
    [road(-10, 0, 10, 0), road(0, 0, 0, 10)],
    [road(-10, -5, 10, 5), road(0, -12, 0, 12)],
  ]) {
    const loops = streetOutlines(roads);
    assert.equal(loops.length, 1);
    const loop = loops[0];
    assert.ok(loop.length >= 4);
    assert.ok(
      offsetOutline(loop, 0.8).every(
        (p) => Number.isFinite(p.x) && Number.isFinite(p.z),
      ),
    );
    // Every boundary point is on an outside edge, never across the middle of the junction.
    for (const p of loop) assert.ok(Math.hypot(p.x, p.z) >= 1.5);
  }
  const single = streetOutlines([road(-10, 0, 10, 0)]);
  assert.deepEqual(
    streetOutlines([road(-10, 0, 10, 0), road(-10, 0, 10, 0)]),
    single,
  );
});

test("curved road joins form a smooth strip without repeated square caps", () => {
  const points = Array.from({ length: 21 }, (_, i) => ({
    x: 40 * Math.cos((i * Math.PI) / 40),
    z: 40 * Math.sin((i * Math.PI) / 40),
  }));
  const loops = streetOutlines([{ points, width: 3, alley: false }]);
  assert.equal(loops.length, 1);
  const length = (ps: typeof points) =>
    ps
      .slice(1)
      .reduce((sum, p, i) => sum + Math.hypot(p.x - ps[i].x, p.z - ps[i].z), 0);
  const perimeter = length([...loops[0], loops[0][0]]);
  assert.ok(Math.abs(perimeter - (2 * length(points) + 8 * 1.62)) < 0.1);
});

test("an angled road ending at a through-road does not project a cap beyond it", () => {
  const streets = [road(-20, 0, 20, 0), road(-12, -12, 0, 0)];
  const loops = streetOutlines(streets);
  assert.equal(loops.length, 1);
  assert.ok(loops.flat().every((p) => p.z <= 1.620001));
  const triangle = [
    { x: 0, z: 0 },
    { x: 20, z: -1 },
    { x: 20, z: 1 },
  ];
  const offset = offsetOutline(triangle, 0.8);
  for (let i = 0; i < triangle.length; i++)
    assert.ok(
      Math.hypot(offset[i].x - triangle[i].x, offset[i].z - triangle[i].z) <=
        1.200001,
    );
});

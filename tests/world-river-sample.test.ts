import test from "node:test";
import assert from "node:assert/strict";
import { generateContinent } from "../packages/game-core/src/geography";
import { worldRiverSample } from "../packages/game-core/src/worldRiverSample";
test("city river preserves generated source reach under uniform scale and rotation", () => {
  const sample = worldRiverSample(731),
    world = generateContinent(sample.worldSeed, 4);
  const source = world.geography.rivers[sample.river].slice(
    sample.sourceStart,
    sample.sourceStart + sample.points.length,
  );
  const length = Math.hypot(
      source.at(-1)![0] - source[0][0],
      source.at(-1)![1] - source[0][1],
    ),
    scale = 330 / length;
  for (let i = 1; i < source.length; i++) {
    const actual = Math.hypot(
      sample.points[i].x - sample.points[i - 1].x,
      sample.points[i].z - sample.points[i - 1].z,
    );
    const expected =
      Math.hypot(
        source[i][0] - source[i - 1][0],
        source[i][1] - source[i - 1][1],
      ) * scale;
    assert.ok(Math.abs(actual - expected) < 1e-7);
  }
  assert.ok(sample.points.some((p) => Math.abs(p.z) > 3));
  assert.notEqual(sample.angle, worldRiverSample(732).angle);
});

test("river smoothing rounds corners without moving endpoints or reversing the corridor", async () => {
  const { smoothRiverReach } =
    await import("../packages/game-core/src/worldRiverSample");
  const source = [
    { x: 0, z: 0 },
    { x: 10, z: 0 },
    { x: 20, z: 10 },
    { x: 30, z: 10 },
  ];
  const smooth = smoothRiverReach(source);
  assert.deepEqual(smooth[0], source[0]);
  assert.deepEqual(smooth.at(-1), source.at(-1));
  const maxTurn = (ps: typeof source) =>
    Math.max(
      ...ps.slice(1, -1).map((p, i) => {
        const a = ps[i],
          b = ps[i + 2];
        return Math.abs(
          Math.atan2(b.z - p.z, b.x - p.x) - Math.atan2(p.z - a.z, p.x - a.x),
        );
      }),
    );
  assert.ok(maxTurn(smooth) < maxTurn(source) / 3);
  assert.ok(
    smooth.every(
      (p, i) => p.z >= 0 && p.z <= 10 && (i === 0 || p.x > smooth[i - 1].x),
    ),
  );
  assert.deepEqual(smoothRiverReach(source), smooth);
});

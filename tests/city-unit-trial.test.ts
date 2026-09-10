import test from "node:test";
import assert from "node:assert/strict";
import {
  createCityUnitTrial,
  CITY_TANK_TURN_RATE,
} from "../packages/game-core/src/cityUnitTrial";
import { createCityTactics } from "../packages/game-core/src/cityTactics";
import {
  planCombinedDistrict,
  combinedPosition,
} from "../packages/game-core/src/combinedDistrict";
test("tank pivots on opposing tracks before driving, respects angular speed and stops its belts", () => {
  const tactics = createCityTactics(
    planCombinedDistrict(732, "worldgen", true),
    732,
    "worldgen",
  );
  const trial = createCityUnitTrial(tactics),
    tank = trial.units.find((u) => u.kind === "vehicle")!;
  // Exercise a checked local route, initially facing away from its first segment.
  trial.select(tank.id);
  const goal = [
    { x: 10, z: 15 },
    { x: 13, z: 19 },
    { x: 10, z: 22 },
  ].find((p) => tactics.route(tank, p, "vehicle").length)!;
  assert(goal);
  assert(trial.order(goal));
  const first = tank.path[0];
  tank.angle = Math.atan2(first.x - tank.x, first.z - tank.z) + Math.PI;
  const start = { x: tank.x, z: tank.z };
  trial.tick(0.1);
  assert.equal(tank.x, start.x);
  assert.equal(tank.z, start.z);
  assert(tank.leftTrack * tank.rightTrack < 0);
  for (let i = 0; i < 2000 && tank.moving; i++) {
    const before = { ...tank };
    trial.tick(0.05);
    const turn = Math.atan2(
      Math.sin(tank.angle - before.angle),
      Math.cos(tank.angle - before.angle),
    );
    assert(Math.abs(turn) <= CITY_TANK_TURN_RATE * 0.05 + 1e-8);
    assert(tactics.segmentClear(before, tank, "vehicle"));
    const dx = tank.x - before.x,
      dz = tank.z - before.z;
    assert(
      Math.abs(dx * Math.cos(tank.angle) - dz * Math.sin(tank.angle)) < 1e-6,
      "no sideways hull slide",
    );
  }
  assert.equal(tank.moving, false);
  assert(Math.hypot(tank.x - goal.x, tank.z - goal.z) < 1e-6);
  const belts = [tank.leftTrack, tank.rightTrack];
  trial.stop();
  trial.tick(0.1);
  assert.deepEqual([tank.leftTrack, tank.rightTrack], belts);
});
test("preview soldiers follow valid routes, reject blocked orders, stop and replace orders", () => {
  const tactics = createCityTactics(
      planCombinedDistrict(732, "worldgen", true),
      732,
      "worldgen",
    ),
    trial = createCityUnitTrial(tactics);
  assert.equal(trial.units.length, 5);
  assert.equal(trial.order({ x: -3, z: 12 }), false);
  trial.select(1);
  assert.ok(trial.order({ x: -3, z: 12 }));
  assert.ok(
    trial.units[0].path.some((p) => Math.abs(p.x + 3) > 0.01),
    "clear routes have subtle lateral variation",
  );
  const path = JSON.stringify(trial.units[0].path);
  assert.equal(trial.order({ x: 0, z: -5 }), false);
  assert.equal(
    JSON.stringify(trial.units[0].path),
    path,
    "blocked order preserves current route",
  );
  const before = { ...trial.units[0] };
  trial.tick(0.1);
  assert.ok(
    Math.hypot(before.x - trial.units[0].x, before.z - trial.units[0].z) <=
      0.30001,
  );
  trial.stop();
  const stopped = { x: trial.units[0].x, z: trial.units[0].z };
  trial.tick(0.1);
  assert.equal(trial.units[0].z, stopped.z);
  assert.ok(trial.order({ x: -3, z: 12 }));
  for (let i = 0; i < 1000 && trial.units[0].moving; i++) {
    const p = { ...trial.units[0] };
    trial.tick(0.1);
    assert.ok(tactics.segmentClear(p, trial.units[0]));
  }
  assert.ok(Math.abs(trial.units[0].z - 12) < 1e-8);
  assert.equal(trial.units[0].moving, false);
  const u = trial.units[0],
    start = combinedPosition({ x: 80, z: -106 }, 732, "worldgen"),
    end = combinedPosition({ x: 80, z: -82 }, 732, "worldgen");
  Object.assign(u, start);
  assert.ok(trial.order(end));
  for (let i = 0; i < 1500 && u.moving; i++) {
    const p = { x: u.x, z: u.z };
    trial.tick(0.1);
    assert.ok(tactics.segmentClear(p, u));
  }
  assert.equal(u.moving, false);
  assert.ok(Math.hypot(u.x - end.x, u.z - end.z) < 1e-8);
  const mid = combinedPosition({ x: 80, z: -94 }, 732, "worldgen");
  assert.ok(
    tactics.surfaceHeight(mid) - tactics.height(mid) > 0.7,
    "soldier stands on arched bridge deck",
  );
  const group = createCityUnitTrial(tactics);
  group.selectMany([1, 2]);
  group.selectMany([3], true);
  assert.deepEqual(group.state().selectedIds, [1, 2, 3]);
  assert.ok(group.order({ x: 0, z: 12 }));
  const targets = group.units
    .filter((u) => u.kind === "infantry")
    .map((u) => u.path.at(-1)!);
  assert.equal(new Set(targets.map((p) => `${p.x},${p.z}`)).size, 3);
  const origins = group.units.map((u) => ({ ...u }));
  for (let i = 0; i < 10; i++) group.tick(0.1);
  for (let i = 0; i < 3; i++)
    assert.ok(
      Math.hypot(
        origins[i].x - group.units[i].x,
        origins[i].z - group.units[i].z,
      ) < 1.6,
      "running stays below 1.6 scene units per second",
    );
  group.stop();
  assert.ok(group.units.every((u) => !u.moving && u.path.length === 0));
  const partial = tactics.coverAt({ x: 8, z: 9.7 }, { x: 8, z: -20 });
  assert.equal(partial.level, "partial");
  assert.equal(partial.damageScale, 0.5);
  assert.equal(
    tactics.coverAt({ x: 8, z: 9.7 }, { x: 8, z: 30 }).level,
    "none",
  );
  assert.equal(
    tactics.coverAt({ x: 8, z: -5 }, { x: -30, z: -5 }).level,
    "full",
  );
  assert.equal(
    tactics.coverAt({ x: 8, z: -5 }, { x: 30, z: -5 }).level,
    "none",
  );
  trial.select(1);
  Object.assign(trial.units[0], {
    x: 8,
    z: 9.7,
    path: [],
    moving: false,
    facing: Math.PI,
  });
  trial.tick(0.1);
  assert.equal(trial.units[0].cover, "partial");
  trial.testFire();
  assert.equal(trial.units[0].health, 90);
  trial.testFire(true);
  assert.equal(trial.units[0].health, 70);
  trial.resetHealth();
  assert.equal(trial.units[0].health, 100);
  assert.equal(
    trial.previewOrder({ x: 8, z: 9.7 }, Math.PI)[0].cover,
    "partial",
  );
  assert.equal(trial.previewOrder({ x: 8, z: 9.7 }, 0)[0].cover, "none");
  assert.equal(trial.previewOrder({ x: 0, z: -5 }, 0)[0].valid, false);
  assert.equal(
    trial.previewOrder({ x: 8, z: -5 }, -Math.PI / 2)[0].cover,
    "full",
  );
  const wallGroup = createCityUnitTrial(tactics);
  wallGroup.selectMany([1, 2, 3]);
  const fitted = wallGroup.previewOrder({ x: 7.4, z: -5 }, -Math.PI / 2);
  assert.ok(
    fitted.every(
      (p) => p.valid && p.cover === "full" && p.x > 7.56 && p.x < 8.1,
    ),
    "formation flows onto the nearby building face",
  );
  for (let i = 1; i < fitted.length; i++)
    assert.ok(
      Math.hypot(
        fitted[i].x - fitted[i - 1].x,
        fitted[i].z - fitted[i - 1].z,
      ) >= 0.9,
    );
  assert.ok(wallGroup.order({ x: 7.4, z: -5 }, -Math.PI / 2));
  for (const p of fitted)
    assert.deepEqual(
      wallGroup.units.find((u) => u.id === p.id)!.path.at(-1),
      { x: p.x, z: p.z },
      "committed slots match preview",
    );
  trial.select(4);
  assert.equal(trial.order({ x: 16, z: 8 }), false, "tank cannot cross a lawn");
  assert.ok(trial.order({ x: 18, z: 19 }), "tank can drive along its road");
  trial.stop();
  const movingCover = createCityUnitTrial(tactics),
    tank = movingCover.units.find((u) => u.id === 4)!,
    jeep = movingCover.units.find((u) => u.id === 5)!;
  assert.equal(
    movingCover.coverAt({ x: 10, z: 20.3 }, { x: 10, z: 15 }).level,
    "full",
  );
  assert.equal(
    movingCover.coverAt({ x: 10, z: 20.3 }, { x: 10, z: 25 }).level,
    "none",
  );
  assert.equal(
    movingCover.coverAt({ x: -10, z: 20.15 }, { x: -10, z: 15 }).level,
    "partial",
  );
  movingCover.select(1);
  Object.assign(movingCover.units[0], { x: 10, z: 20.3, facing: Math.PI });
  movingCover.tick(0.1);
  assert.equal(movingCover.units[0].cover, "full");
  tank.x = 25;
  movingCover.tick(0.1);
  assert.equal(movingCover.units[0].cover, "none");
  tank.x = 10;
  tank.friendly = false;
  assert.equal(
    movingCover.coverAt({ x: 10, z: 20.3 }, { x: 10, z: 15 }).level,
    "none",
  );
  tank.friendly = true;
  tank.health = 0;
  assert.equal(
    movingCover.coverAt({ x: 10, z: 20.3 }, { x: 10, z: 15 }).level,
    "none",
  );
  jeep.z = 28;
  assert.equal(
    movingCover.coverAt({ x: -10, z: 20.15 }, { x: -10, z: 15 }).level,
    "none",
  );
  trial.select(999);
  assert.equal(trial.selectedId(), undefined);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { createCityBattle } from "../packages/game-core/src/cityBattle";
import { createCityTactics } from "../packages/game-core/src/cityTactics";
import { planCombinedDistrict } from "../packages/game-core/src/combinedDistrict";
const setup = () =>
  createCityBattle(
    createCityTactics(
      planCombinedDistrict(732, "worldgen", true),
      732,
      "worldgen",
    ),
  );
test("city battle stages two squads and a tank, pauses and rejects enemy commands", () => {
  const b = setup();
  assert.equal(b.trial.units.filter((u) => u.friendly).length, 7);
  assert.equal(b.trial.units.filter((u) => !u.friendly).length, 6);
  const before = structuredClone(b.state());
  b.tick(1);
  assert.deepEqual(b.state(), before);
  b.command([101], "move", 0, 21);
  assert.equal(b.trial.units.find((u) => u.id === 101)!.path.length, 0);
  b.command([1], "move", 0, 24);
  assert(b.trial.units.find((u) => u.id === 1)!.path.length > 0);
});
test("city battle fires real shots and applies casualties deterministically", () => {
  const a = setup(),
    b = setup();
  for (const battle of [a, b]) {
    battle.command([], "run");
    for (let i = 0; i < 1200; i++) battle.tick(0.05);
  }
  assert.deepEqual(a.state(), b.state());
  assert(a.state().shots.length > 0);
  assert(a.trial.units.some((u) => u.health < 100));
  for (const u of a.trial.units)
    if (u.health === 0) assert.equal(u.path.length, 0);
});

test("turret aiming does not steer the hull toward its target", () => {
  const b = setup(),
    tank = b.trial.units.find((u) => u.kind === "vehicle")!;
  b.command([tank.id], "hold"); // Isolate turret aiming from the new autonomous support movement.
  const hull = tank.angle;
  b.command([], "run");
  for (let i = 0; i < 80; i++) b.tick(0.05);
  assert.equal(tank.angle, hull);
  assert.notEqual(tank.turretAngle, hull);
  assert(Number.isFinite(tank.turretAngle));
});

test("city tank shots respect a five-second reload under sustained fire", () => {
  const b = setup(),
    seen = new Set<number>(),
    times: number[] = [];
  b.command([], "run");
  for (let i = 0; i < 300; i++) {
    for (const u of b.trial.units) u.health = 100;
    b.tick(0.05);
    for (const shot of b.state().shots)
      if (shot.shell && !shot.impact && !seen.has(shot.id)) {
        seen.add(shot.id);
        times.push(i * 0.05);
      }
  }
  assert(times.length >= 2);
  assert(times.length <= 3);
  for (let i = 1; i < times.length; i++)
    assert(times[i] - times[i - 1] >= 4.99);
});

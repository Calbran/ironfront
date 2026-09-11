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

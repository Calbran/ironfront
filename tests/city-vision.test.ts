import { test } from "node:test";
import assert from "node:assert/strict";
import { createCityBattle } from "../packages/game-core/src/cityBattle";
import type {
  createCityTactics,
  CityObstacle,
} from "../packages/game-core/src/cityTactics";
function fixture(kind?: CityObstacle["kind"]) {
  const tactics = {
    obstacles: kind
      ? [{ id: "block", x: 5, z: 0, width: 2, depth: 12, angle: 0, kind }]
      : [],
    walkable: () => true,
    coverAt: () => ({ level: "none", normal: { x: 0, z: 1 }, damageScale: 1 }),
    route: (a: unknown, b: unknown) => [a, b],
    segmentClear: () => true,
  } as unknown as ReturnType<typeof createCityTactics>;
  const b = createCityBattle(tactics);
  b.trial.units.splice(
    0,
    b.trial.units.length,
    ...b.trial.units.filter((u) => [1, 2, 101].includes(u.id)),
  );
  const [one, two, enemy] = [1, 2, 101].map((id) =>
    b.trial.units.find((u) => u.id === id)!,
  );
  Object.assign(one, { x: 0, z: 0 });
  Object.assign(two, { x: 0, z: 1 });
  Object.assign(enemy, { x: 10, z: 0 });
  return { b, one, two, enemy };
}
test("vision is range-limited, shared, and removed when the last observer loses sight", () => {
  const { b, one, two, enemy } = fixture();
  assert(b.playerState().units.some((u) => u.id === enemy.id));
  one.x = -250;
  assert(b.playerState().units.some((u) => u.id === enemy.id));
  two.x = -250;
  assert(!b.playerState().units.some((u) => u.id === enemy.id));
  two.x = 0;
  two.health = 0;
  assert(!b.playerState().units.some((u) => u.id === enemy.id));
});
test("buildings block vision; low walls permit sight", () => {
  assert(
    !fixture("building")
      .b.playerState()
      .units.some((u) => !u.friendly),
  );
  assert(
    fixture("wall")
      .b.playerState()
      .units.some((u) => !u.friendly),
  );
});
test("hidden attack IDs are rejected and enemy routes are never disclosed", () => {
  const { b, enemy } = fixture("building");
  b.command([1], "attack", undefined, undefined, enemy.id);
  assert.match(b.playerState().message, /not currently visible/);
  enemy.z = 20;
  enemy.path = [{ x: 15, z: 25 }];
  enemy.guide = [{ x: 15, z: 25 }];
  const observed = b.playerState().units.find((u) => u.id === enemy.id)!;
  assert(observed);
  assert.deepEqual(observed.path, []);
  assert.deepEqual(observed.guide, []);
});

test("player snapshots retain only the last observed location after contact is lost", () => {
  const { b, one, two, enemy } = fixture();
  b.playerState();
  one.x = -250;
  two.x = -250;
  enemy.x = 25;
  const state = b.playerState();
  assert(!state.units.some((u) => u.id === enemy.id));
  assert.equal(state.contacts[0].x, 10);
  assert.equal(state.contacts[0].z, 0);
  b.command([1], "attack", undefined, undefined, enemy.id);
  assert.match(b.playerState().message, /not currently visible/);
});

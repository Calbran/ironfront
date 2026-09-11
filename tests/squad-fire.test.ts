import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FIRE_STEP,
  fireVolley,
  FireIndex,
  FireVisibility,
} from "../packages/game-core/src/squadFire.ts";
import type { Squad } from "../packages/game-core/src/tactics.ts";
function unit(
  id: string,
  owner = 0,
  x = 0,
  kind: Squad["kind"] = "infantry",
): Squad {
  return {
    id,
    owner,
    x,
    y: 0,
    kind,
    army: null,
    region: 0,
    strength: 100,
    capacity: 100,
    unitCount: 6,
    morale: 1,
    suppression: 0,
    previousX: x,
    previousY: 0,
    action: "holding",
    target: null,
    fire: 0,
  };
}
test("rifles barely damage armor, armor weapons remain effective", () => {
  const soft = unit("s", 1, 10),
    tank = unit("t", 1, 10, "armor");
  const shoot = (kind: Squad["kind"], d: Squad) => {
    const s = unit("a", 0, 0, kind);
    let total = 0;
    for (let i = 0; i < 400; i++)
      total += fireVolley(s, d, 10, 100, 1, 1).damage;
    return total;
  };
  assert.ok(shoot("infantry", tank) < shoot("infantry", soft) * 0.01);
  assert.ok(shoot("armor", tank) > shoot("infantry", tank) * 50);
});
test("saved magazine and RNG state reproduce future damage exactly", () => {
  const s = unit("a"),
    d = unit("b", 1, 10);
  for (let i = 0; i < 17; i++) fireVolley(s, d, 10, 100, 1, 1);
  const copy = JSON.parse(JSON.stringify(s));
  for (let i = 0; i < 100; i++)
    assert.deepEqual(
      fireVolley(s, d, 10, 100, 1, 1),
      fireVolley(copy, d, 10, 100, 1, 1),
    );
});
test("fixed volleys have stable elapsed-time accounting and actual reload pauses", () => {
  const s = unit("a"),
    d = unit("b", 1, 10);
  let shots = 0;
  for (let i = 0; i < 11; i++)
    shots += Number(fireVolley(s, d, 10, 100, 1, 1).fired);
  assert.equal(shots, 8);
  assert.equal(FIRE_STEP * 40, 1);
});
test("buildings stop shots, partial cover lowers expected hits, movement invalidates cached LOS", () => {
  const a = unit("a"),
    b = unit("b", 1, 10);
  const polygon = [
    { x: 4, y: -2 },
    { x: 6, y: -2 },
    { x: 6, y: 2 },
    { x: 4, y: 2 },
  ];
  const sight = new FireVisibility([{ id: "wall", polygon, exposure: 0 }]);
  assert.equal(sight.exposure(a, b), 0);
  a.y = b.y = 3;
  assert.equal(sight.exposure(a, b), 1);
  const full = unit("fire"),
    covered = unit("fire");
  let open = 0,
    partial = 0;
  for (let i = 0; i < 1000; i++) {
    open += fireVolley(full, b, 10, 100, 1, 1).damage;
    partial += fireVolley(covered, b, 10, 100, 0.5, 1).damage;
  }
  assert.ok(partial < open * 0.65 && partial > open * 0.35);
  assert.equal(fireVolley(a, b, 10, 100, 0, 1).damage, 0);
});
test("target retention, ordered override, dead targets, and deterministic tie breaking", () => {
  const a = unit("a"),
    b = unit("b", 1, 10),
    c = unit("c", 1, 5);
  const index = new FireIndex([a, b, c], 20);
  a.target = "b";
  assert.equal(index.target(a, 100, () => 1)?.id, "b");
  b.strength = 0;
  assert.equal(index.target(a, 100, () => 1)?.id, "c");
  b.strength = 100;
  c.x = 10;
  a.target = null;
  assert.equal(index.target(a, 100, () => 1)?.id, "b");
  assert.equal(
    index.target(a, 100, (_a, d) => (d.id === "b" ? 0 : 1))?.id,
    "c",
  );
});

test('moving fire reduces hit damage at the same range',()=>{
 const target=unit('target',1,10),standing=unit('shooter'),moving=unit('shooter');
 moving.localOrder={path:[{x:20,y:0}]} as typeof moving.localOrder;
 let still=0,mobile=0;
 for(let i=0;i<1000;i++){still+=fireVolley(standing,target,10,100,1,1).damage;mobile+=fireVolley(moving,target,10,100,1,1).damage;}
 assert(mobile<still*.75);assert(mobile>0);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FIRE_STEP,
  fireVolley,
  FireIndex,
  FireVisibility,
} from "../packages/game-core/src/squadFire.ts";
import type { Squad } from "../packages/game-core/src/tactics.ts";
import type { TacticalWeaponRole } from "../packages/game-core/src/cityCombatRules.ts";
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
test("long sightlines traverse crossed spatial cells without missing corner obstacles", () => {
  const a = unit("a");
  a.y = -150;
  const b = unit("b", 1, 220);
  b.y = 150;
  const sight = new FireVisibility(
    [{
      id: "corner-wall",
      exposure: 0,
      polygon: [
        { x: 95, y: -8 },
        { x: 105, y: -8 },
        { x: 105, y: 8 },
        { x: 95, y: 8 },
      ],
    }],
    24,
  );
  assert.equal(sight.exposure(a, b), 0);
  b.y = 80;
  assert.equal(sight.exposure(a, b), 1);
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
test("semi-auto rifles use staggered aimed shots, breathing pauses and full reloads", () => {
  const target = unit("cadence-target", 1, 10), firstShots: number[] = [];
  for (let member = 0; member < 6; member++) {
    const shooter = unit(`cadence-${member}`), fired: number[] = [];
    for (let step = 0; step < 80; step++) {
      const result = fireVolley(shooter, target, 10, 100, 1, 1, "rifle");
      if (result.fired) fired.push(step);
    }
    assert(fired.length >= 6 && fired.length <= 10);
    const gaps = fired.slice(1).map((step, i) => step - fired[i]);
    assert(Math.min(...gaps) >= 6, "aimed shots remain at least 1.5 seconds apart");
    assert(Math.max(...gaps) >= 10, "short strings include a longer breathing pause");
    firstShots.push(fired[0]);
  }
  assert.ok(new Set(firstShots).size > 1);
});

test("tactical profiles lose accuracy and damage through their maximum range", () => {
  const total = (distance: number) => {
    const shooter = unit("profile-shooter"),
      target = unit("profile-target", 1, distance);
    let damage = 0;
    for (let i = 0; i < 1200; i++)
      damage += fireVolley(shooter, target, distance, 165, 1, 1, "rifle").damage;
    return damage;
  };
  const close = total(55),
    effective = total(110),
    distant = total(160);
  assert(close > effective);
  assert(effective > distant * 2);
  assert.equal(total(166), 0);
});

test("LMGs suppress while rocket teams threaten armor", () => {
  const totals = (
    role: TacticalWeaponRole,
    targetKind: Squad["kind"] = "infantry",
  ) => {
    const shooter = unit(`profile-${role}`),
      target = unit(`target-${targetKind}`, 1, 20, targetKind);
    let damage = 0,
      suppression = 0;
    for (let i = 0; i < 800; i++) {
      const volley = fireVolley(shooter, target, 20, 500, 1, 1, role);
      damage += volley.damage;
      suppression += volley.suppression;
    }
    return { damage, suppression };
  };
  const rifle = totals("rifle"),
    lmg = totals("lmg"),
    rifleArmor = totals("rifle", "armor"),
    rocketArmor = totals("antiTank", "armor");
  assert(lmg.suppression > rifle.suppression * 2);
  assert(rocketArmor.damage > rifleArmor.damage * 40);
  assert(rifle.damage > rifleArmor.damage * 100);
});

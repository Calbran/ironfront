import test from "node:test";
import assert from "node:assert/strict";
import {
  CITY_ANTI_TANK_FIRE_RANGE,
  CITY_INFANTRY_FIRE_RANGE,
  CITY_TANK_FIRE_RANGE,
  tacticalEffectiveFireRange,
  tacticalFireRange,
  tacticalRangeAccuracy,
  tacticalRangeDamage,
  tacticalRangeMeters,
  tacticalWeaponProfile,
} from "../packages/game-core/src/cityCombatRules";

test("shared tactical profiles distinguish effective and maximum ranges", () => {
  assert.equal(Math.round(tacticalRangeMeters(tacticalEffectiveFireRange("rifle"))), 200);
  assert.equal(Math.round(tacticalRangeMeters(CITY_INFANTRY_FIRE_RANGE)), 300);
  assert.equal(Math.round(tacticalRangeMeters(tacticalEffectiveFireRange("tank"))), 400);
  assert.equal(Math.round(tacticalRangeMeters(CITY_TANK_FIRE_RANGE)), 900);
  assert.equal(tacticalFireRange("rifle"), CITY_INFANTRY_FIRE_RANGE);
  assert.equal(tacticalFireRange("antiTank"), CITY_ANTI_TANK_FIRE_RANGE);
  assert.equal(tacticalFireRange("tank"), CITY_TANK_FIRE_RANGE);
  assert.equal(tacticalEffectiveFireRange("lmg"), 165);
  assert.equal(tacticalFireRange("lmg"), 275);
  assert(CITY_TANK_FIRE_RANGE >= CITY_INFANTRY_FIRE_RANGE * 3);
  assert(CITY_ANTI_TANK_FIRE_RANGE < CITY_TANK_FIRE_RANGE);
  assert(tacticalWeaponProfile("lmg").suppression > tacticalWeaponProfile("rifle").suppression * 2);
});

test("accuracy and damage fall continuously beyond effective range", () => {
  const effective = tacticalEffectiveFireRange("rifle"),
    maximum = tacticalFireRange("rifle");
  assert(tacticalRangeAccuracy("rifle", effective - 0.001) > tacticalRangeAccuracy("rifle", effective + 0.001));
  assert(tacticalRangeAccuracy("rifle", effective) > tacticalRangeAccuracy("rifle", maximum));
  assert.equal(tacticalRangeAccuracy("rifle", maximum + 0.001), 0);
  assert.equal(tacticalRangeDamage("rifle", effective), 1);
  assert(tacticalRangeDamage("rifle", maximum) < 0.6);
  assert.equal(tacticalRangeDamage("rifle", maximum + 0.001), 0);
});

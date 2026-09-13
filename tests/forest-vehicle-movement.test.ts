import test from "node:test";
import assert from "node:assert/strict";
import {
  campaignTravelHours,
  countryTankTerrainSpeedFactor,
} from "../packages/game-core/src/forestVehicleMovement";
import {
  advanceSlice,
  createSliceState,
  type SlicePlan,
} from "../packages/game-core/src/countrySlice";
import { countryForestDensity } from "../packages/game-core/src/countryLandscape";
import { countryTerrainNoise } from "../packages/game-core/src/countryTerrainNoise";
import { localSpeed } from "../packages/game-core/src/localMovement";
import type { World } from "../packages/game-core/src/index";
import type { Squad } from "../packages/game-core/src/tactics";

const emptyPlan = (): SlicePlan =>
  ({
    roads: { roads: [] },
    sites: [],
  }) as unknown as SlicePlan;

function woodlandPoint() {
  let best = { x: 0, z: 0, density: -Infinity };
  for (let z = 20; z <= 1600; z += 20)
    for (let x = 20; x <= 2800; x += 20) {
      const density = countryForestDensity(x, z);
      if (
        countryTerrainNoise(x * 0.035, z * 0.035) <= 0.72 &&
        density > best.density
      )
        best = { x, z, density };
    }
  assert(best.density > 0.57);
  return best;
}

test("country tank movement uses broad woodland density while roads remain fast", () => {
  const point = woodlandPoint(),
    plan = emptyPlan(),
    dense = countryTankTerrainSpeedFactor(plan, point);
  assert(dense >= 0.35 && dense < 0.4);
  plan.roads.roads = [
    {
      id: "forest-road",
      highway: false,
      width: 3,
      path: [
        { x: point.x - 20, y: point.z },
        { x: point.x + 20, y: point.z },
      ],
    },
  ];
  assert.equal(countryTankTerrainSpeedFactor(plan, point), 0.9);
  plan.sites = [
    { x: point.x, z: point.z, extent: 10 } as SlicePlan["sites"][number],
  ];
  assert.equal(countryTankTerrainSpeedFactor(plan, point), 1);
});

test("only tanks slow during authoritative and projected country movement", () => {
  const point = woodlandPoint(),
    plan = emptyPlan(),
    forestState = createSliceState(0),
    tank = forestState.units.find((unit) => unit.kind === "tank")!,
    infantry = forestState.units.find((unit) => unit.kind === "infantry")!;
  for (const unit of [tank, infantry]) {
    unit.x = point.x;
    unit.z = point.z;
    unit.angle = Math.PI / 2;
    unit.path = [{ x: point.x + 100, z: point.z }];
  }
  forestState.units = [tank, infantry];
  forestState.running = true;
  const openState = structuredClone(forestState);
  advanceSlice(forestState, 1000, plan);
  advanceSlice(openState, 1000);
  const openTank = openState.units.find((unit) => unit.kind === "tank")!,
    openInfantry = openState.units.find((unit) => unit.kind === "infantry")!;
  assert(tank.x - point.x < (openTank.x - point.x) * 0.4);
  assert(Math.abs(infantry.x - openInfantry.x) < 1e-7);
  assert(Math.abs(infantry.z - openInfantry.z) < 1e-7);
});

test("campaign armor slows in forests and mobile armies lose rapid forest transit", () => {
  const world = {
      regions: [{ area: 100000, terrain: "plains" }],
    } as unknown as World,
    armor = {
      region: 0,
      kind: "armor",
      suppression: 0,
    } as Squad,
    infantry = { ...armor, kind: "infantry" } as Squad;
  const armorPlain = localSpeed(world, armor),
    infantryPlain = localSpeed(world, infantry);
  world.regions[0].terrain = "forest";
  assert.equal(localSpeed(world, armor), armorPlain * 0.4);
  assert.equal(localSpeed(world, infantry), infantryPlain);
  assert.equal(campaignTravelHours("plains", 55, true), 2);
  assert.equal(campaignTravelHours("forest", 55, true), 4);
  assert.equal(campaignTravelHours("highlands", 55, true), 6);
});

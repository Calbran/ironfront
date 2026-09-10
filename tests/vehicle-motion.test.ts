import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stepVehicle,
  angleDifference,
  type VehiclePose,
} from "../apps/web/src/vehicleMotion.ts";
import {
  vehicleProfile,
  type VehicleProfile,
} from "../packages/game-core/src/vehicleTypes.ts";
const pose = (): VehiclePose => ({ x: 0, y: 0, heading: 0, turretHeading: 0 });
test("tracks and fixed walkers pivot before advancing; wheels arc without sideways sliding", () => {
  for (const profile of ["tracked", "walker-fixed"] as const) {
    const p = pose();
    stepVehicle(p, { x: 0, y: 20 }, profile, 0.1);
    assert(Math.abs(p.x) < 1e-9);
    assert.equal(p.y, 0);
    assert(p.heading > 0);
    for (let i = 0; i < 40; i++) stepVehicle(p, { x: 0, y: 20 }, profile, 0.1);
    assert(p.y > 0);
  }
  const p = pose();
  stepVehicle(p, { x: 0, y: 20 }, "wheeled", 0.1);
  assert(p.x > 0 && p.y > 0);
  assert(Math.abs(Math.atan2(p.y, p.x) - p.heading) < 1e-9);
});
test("spider walkers strafe and aim separately; fixed walkers have no independent upper body", () => {
  const p = pose();
  stepVehicle(p, { x: 0, y: 20 }, "walker-turret", 0.1, 1, { x: -20, y: 0 });
  assert.equal(p.heading, 0);
  assert(Math.abs(p.x) < 1e-9);
  assert(p.y > 0);
  assert.notEqual(p.turretHeading, p.heading);
  const fixed = pose();
  stepVehicle(fixed, { x: 0, y: 20 }, "walker-fixed", 0.1, 1, { x: -20, y: 0 });
  assert.equal(fixed.turretHeading, fixed.heading);
});
test("all profiles settle after a reversal and remain still without an order", () => {
  for (const profile of [
    "wheeled",
    "tracked",
    "walker-turret",
    "walker-fixed",
  ] satisfies VehicleProfile[]) {
    const p = pose(),
      target = { x: -20, y: 0 };
    for (let i = 0; i < 400; i++) stepVehicle(p, target, profile, 0.05);
    assert(Math.hypot(p.x - target.x, p.y - target.y) < 0.05, profile);
    for (let i = 0; i < 100; i++) stepVehicle(p, target, profile, 0.05);
    const previous = { ...p };
    for (let i = 0; i < 100; i++) stepVehicle(p, target, profile, 0.05);
    assert.deepEqual(p, previous);
  }
  assert(Math.abs(angleDifference(-Math.PI + 0.1, Math.PI - 0.1) - 0.2) < 1e-9);
  assert.equal(vehicleProfile({ kind: "motorized" }), "wheeled");
  assert.equal(vehicleProfile({ kind: "armor" }), "tracked");
  assert.equal(
    vehicleProfile({ kind: "motorized", vehicleProfile: "walker-fixed" }),
    "walker-fixed",
  );
});

test("arrival corrections retain the last body and turret headings", () => {
  for (const profile of [
    "wheeled",
    "tracked",
    "walker-turret",
    "walker-fixed",
  ] satisfies VehicleProfile[]) {
    const p = { x: 10, y: 10, heading: 0.8, turretHeading: 0.8 };
    if (profile === "tracked" || profile === "walker-turret")
      p.turretHeading = 2.1;
    const body = p.heading,
      upper = p.turretHeading;
    // A small northward remainder must not turn the parked body north.
    for (let i = 0; i < 100; i++)
      stepVehicle(p, { x: 10, y: 9.7 }, profile, 0.1);
    assert.equal(p.heading, body);
    assert.equal(p.turretHeading, upper);
    assert.equal(p.y, 9.7);
  }
});

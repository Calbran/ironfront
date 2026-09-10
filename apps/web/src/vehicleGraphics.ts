import type { Graphics } from "pixi.js";
import {
  VEHICLE_PROFILES,
  type VehicleProfile,
} from "../../../packages/game-core/src/vehicleTypes";
import type { VehiclePose } from "./vehicleMotion";

export function drawVehicle(
  g: Graphics,
  p: VehiclePose,
  profile: VehicleProfile,
  scale: number,
  color: string,
  alpha: number,
) {
  const point = (
    x: number,
    y: number,
    heading = p.heading,
  ): [number, number] => [
    p.x + (Math.cos(heading) * x - Math.sin(heading) * y) / scale,
    p.y + (Math.sin(heading) * x + Math.cos(heading) * y) / scale,
  ];
  const line = (a: [number, number], b: [number, number], width: number) =>
    g
      .moveTo(...a)
      .lineTo(...b)
      .stroke({ color, width: width / scale, alpha });
  if (profile.startsWith("walker")) {
    for (const side of [-1, 1])
      for (const x of profile === "walker-fixed" ? [0] : [-1.5, 0, 1.5]) {
        line(point(x, side), point(x - 0.6, side * 2.7), 0.55);
        line(point(x - 0.6, side * 2.7), point(x + 0.4, side * 3.2), 0.55);
      }
  } else if (profile === "tracked") {
    for (const side of [-1, 1])
      line(point(-2.5, side * 1.9), point(2.5, side * 1.9), 1.1);
  } else {
    for (const x of [-1.5, 1.5])
      for (const side of [-1, 1])
        line(point(x - 0.6, side * 1.8), point(x + 0.6, side * 1.8), 0.8);
  }
  g.poly(
    [
      point(-2.5, -1.5),
      point(1.7, -1.5),
      point(2.6, 0),
      point(1.7, 1.5),
      point(-2.5, 1.5),
    ].flat(),
  )
    .fill({ color, alpha })
    .stroke({ color: "#172c2f", width: 0.55 / scale, alpha });
  // The nose makes body heading readable; turrets aim independently where supported.
  if (VEHICLE_PROFILES[profile].turret) {
    g.circle(p.x, p.y, 0.9 / scale).fill({ color: "#172c2f", alpha });
    line(point(0, 0, p.turretHeading), point(3.7, 0, p.turretHeading), 0.75);
  } else line(point(0.5, -1), point(0.5, 1), 0.4);
}

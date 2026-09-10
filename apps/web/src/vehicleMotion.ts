import {
  VEHICLE_PROFILES,
  type VehicleProfile,
} from "../../../packages/game-core/src/vehicleTypes";
export type VehiclePose = {
  x: number;
  y: number;
  heading: number;
  turretHeading: number;
};
export const angleDifference = (to: number, from: number) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));
const turn = (from: number, to: number, amount: number) =>
  from + Math.max(-amount, Math.min(amount, angleDifference(to, from)));

/** Follow a confirmed formation slot, keeping orientation stable while idle. */
export function stepVehicle(
  p: VehiclePose,
  target: { x: number; y: number },
  profile: VehicleProfile,
  seconds: number,
  variation = 1,
  aim?: { x: number; y: number },
) {
  const dt = Math.max(0, Math.min(0.1, seconds));
  const spec = VEHICLE_PROFILES[profile];
  const dx = target.x - p.x,
    dy = target.y - p.y,
    distance = Math.hypot(dx, dy);
  // Final slot corrections should not steer a parked vehicle toward tiny offsets.
  if (distance > 0.5) {
    const bearing = Math.atan2(dy, dx);
    if (!spec.strafe)
      p.heading = turn(p.heading, bearing, spec.turnRate * variation * dt);
    const error = Math.abs(angleDifference(bearing, p.heading));
    const aligned = !spec.pivot || error < 0.12;
    if (aligned) {
      // Wheels keep rolling through a bend; slow down sharply during a U-turn.
      const speed = spec.strafe
        ? 1
        : spec.pivot
          ? 1
          : Math.max(0.12, Math.cos(error));
      const step = distance * (1 - Math.exp(-dt / 0.9)) * speed;
      const direction = spec.strafe ? bearing : p.heading;
      p.x += Math.cos(direction) * step;
      p.y += Math.sin(direction) * step;
    }
  } else {
    const settle = distance < 0.04 ? 1 : 1 - Math.exp(-dt / 0.9);
    p.x += dx * settle;
    p.y += dy * settle;
  }
  if (spec.turret) {
    if (aim) {
      const facing = Math.atan2(aim.y - p.y, aim.x - p.x);
      p.turretHeading = turn(p.turretHeading, facing, 2.5 * dt);
    }
  } else p.turretHeading = p.heading;
  return p;
}

import type { Squad } from "./tactics.ts";

export type VehicleProfile =
  "wheeled" | "tracked" | "walker-turret" | "walker-fixed";
/** Presentation tuning in radians/second; does not change server travel or damage. */
export const VEHICLE_PROFILES = {
  wheeled: { turnRate: 1.4, pivot: false, strafe: false, turret: false },
  tracked: { turnRate: 1.9, pivot: true, strafe: false, turret: true },
  "walker-turret": { turnRate: 1.6, pivot: false, strafe: true, turret: true },
  "walker-fixed": { turnRate: 1.1, pivot: true, strafe: false, turret: false },
} as const;
export function vehicleProfile(
  s: Pick<Squad, "kind" | "vehicleProfile">,
): VehicleProfile | undefined {
  return (
    s.vehicleProfile ??
    (s.kind === "motorized"
      ? "wheeled"
      : s.kind === "armor"
        ? "tracked"
        : undefined)
  );
}

import type {
  SliceState,
  SliceUnit,
} from "../../../../packages/game-core/src/countrySlice";
import type { PresentedUnit } from "./tacticalPresentation";
import type { CityShot } from "../../../../packages/game-core/src/cityBattle";
import { tacticalWeaponProfile } from "../../../../packages/game-core/src/cityCombatRules";
/** One pose per soldier, never the aggregate squad masquerading as a soldier. */
export function countryPresentedUnits(state: SliceState): PresentedUnit[] {
  return state.units
    .flatMap((group) => group.members ?? [group])
    .filter((u) => u.kind !== "airship")
    .map((u) => ({
      id: u.id,
      x: u.x,
      z: u.z,
      kind: u.kind === "tank" ? "vehicle" : "infantry",
      vehicleType: u.kind === "tank" ? "tank" : undefined,
      health: u.health ?? 100,
      friendly: !u.enemy,
      angle: u.angle,
      turretAngle: u.turretAngle,
      distance: u.distance,
      speed: state.running ? (u.speed ?? (u.path.length ? 2.3 : 0)) : 0,
      moving: state.running && u.path.length > 0,
      cover: u.cover ? (u.coverLevel ?? "partial") : "none",
      reload: u.fireMemory?.reload
        ? Math.max(
            0,
            Math.min(
              1,
              1 -
                u.fireMemory.reload /
                  tacticalWeaponProfile(
                    u.antiTank ? "antiTank" : u.kind === "tank" ? "tank" : "rifle",
                  ).reload,
            ),
          )
        : -1,
      facing: u.facing ?? (u.firing ? u.angle : undefined),
      aimAngle: u.aimAngle,
      firing: u.firing,
    }));
}
export function countryPresentedShots(state: SliceState): CityShot[] {
  return ((state.battlefield ?? state.encounter)?.shots ?? []).map((s) => ({
    ...s,
    impact: s.impact ?? false,
  }));
}

export type DisplayedPose = {
  x: number;
  z: number;
  angle: number;
  distance: number;
  turretAngle?: number;
};
export function blendDisplayedPose(
  from: DisplayedPose,
  to: DisplayedPose,
  t: number,
): DisplayedPose {
  // A snapshot can arrive after the pending animation frame timestamp. Never extrapolate backward.
  t = Math.max(0, Math.min(1, t));
  const blend = (a: number, b: number) => a + (b - a) * t;
  const turn = (a: number, b: number) =>
    a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
  return {
    x: blend(from.x, to.x),
    z: blend(from.z, to.z),
    angle: turn(from.angle, to.angle),
    distance: blend(from.distance, to.distance),
    turretAngle:
      to.turretAngle === undefined
        ? undefined
        : turn(from.turretAngle ?? to.turretAngle, to.turretAngle),
  };
}

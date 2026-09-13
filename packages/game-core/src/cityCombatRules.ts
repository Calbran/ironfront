/** Physical presentation scale used by the city and country tactical scenes. */
export const TACTICAL_MODEL_UNITS_PER_METER = 0.55;

/** Canonical tactical weapon profiles in model units, shared by both simulations. */
export type TacticalWeaponRole = "rifle" | "lmg" | "antiTank" | "tank";
export type TacticalWeaponProfile = {
  effectiveRange: number;
  maxRange: number;
  baseAccuracy: number;
  movingAccuracy: number;
  soft: number;
  armor: number;
  suppression: number;
  magazine: number;
  reload: number;
};

export const TACTICAL_WEAPON_PROFILES = {
  rifle: {
    effectiveRange: 110,
    maxRange: 165,
    baseAccuracy: 0.8,
    movingAccuracy: 0.55,
    soft: 1,
    armor: 0.005,
    suppression: 1,
    magazine: 10,
    reload: 16,
  },
  lmg: {
    effectiveRange: 165,
    maxRange: 275,
    baseAccuracy: 0.72,
    movingAccuracy: 0.2,
    soft: 1.08,
    armor: 0.008,
    suppression: 2.4,
    magazine: 24,
    reload: 5,
  },
  antiTank: {
    effectiveRange: 38,
    maxRange: 55,
    baseAccuracy: 0.68,
    movingAccuracy: 0.15,
    soft: 0.55,
    armor: 0.45,
    suppression: 0.7,
    magazine: 1,
    reload: 5,
  },
  tank: {
    effectiveRange: 220,
    maxRange: 495,
    baseAccuracy: 0.78,
    movingAccuracy: 0.45,
    soft: 1.35,
    armor: 1,
    suppression: 1.6,
    magazine: 1,
    reload: 3,
  },
} as const satisfies Record<TacticalWeaponRole, TacticalWeaponProfile>;

export const CITY_INFANTRY_FIRE_RANGE = TACTICAL_WEAPON_PROFILES.rifle.maxRange;
export const CITY_ANTI_TANK_FIRE_RANGE = TACTICAL_WEAPON_PROFILES.antiTank.maxRange;
export const CITY_TANK_FIRE_RANGE = TACTICAL_WEAPON_PROFILES.tank.maxRange;
export const CITY_VOLLEY_STEP = .25;

export const tacticalWeaponProfile = (role: TacticalWeaponRole) =>
  TACTICAL_WEAPON_PROFILES[role];

export const tacticalFireRange = (role: TacticalWeaponRole) =>
  tacticalWeaponProfile(role).maxRange;

export const tacticalEffectiveFireRange = (role: TacticalWeaponRole) =>
  tacticalWeaponProfile(role).effectiveRange;

/** Accuracy multiplier is stable through close range, then degrades to 12% at maximum range. */
export function tacticalRangeAccuracy(role: TacticalWeaponRole, distance: number) {
  const { effectiveRange, maxRange } = tacticalWeaponProfile(role);
  if (distance >= maxRange) return distance === maxRange ? 0.12 : 0;
  if (distance <= effectiveRange)
    return 1 - 0.28 * Math.max(0, distance / effectiveRange);
  const t = (distance - effectiveRange) / (maxRange - effectiveRange);
  return 0.72 + (0.12 - 0.72) * t;
}

/** Hits past effective range retain some energy but lose damage toward the hard limit. */
export function tacticalRangeDamage(role: TacticalWeaponRole, distance: number) {
  const { effectiveRange, maxRange } = tacticalWeaponProfile(role);
  if (distance <= effectiveRange) return 1;
  if (distance > maxRange) return 0;
  return 1 - 0.45 * ((distance - effectiveRange) / (maxRange - effectiveRange));
}

export const tacticalRangeMeters = (range: number) =>
  range / TACTICAL_MODEL_UNITS_PER_METER;

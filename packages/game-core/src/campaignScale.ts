/** Expand geography without enlarging cities or increasing the terrain raster. */
export const GENERATED_WORLD_SCALE = 6;

/** Fixed world-unit layout radii, shared by artwork and settlement clearance. */
export const SETTLEMENT_RADII = {
  hamlet: 110,
  village: 160,
  town: 230,
  city: 320,
  metropolis: 430,
} as const;

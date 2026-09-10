import { planAngledDistrict, lotCorners } from "./angledDistrict";
import { neighborhoodHeight } from "./craftedNeighborhood";
/** Bounded hill rising six units to a northern river terrace. */
export function districtHeight(z: number) {
  const t = Math.max(0, Math.min(1, (-z - 50) / 88));
  return neighborhoodHeight(z) + 6 * t * t * (3 - 2 * t);
}
export const TERRAIN_RIVER_Z = -148;
export function districtGroundHeight(z: number) {
  const bank = Math.max(0, 1 - Math.abs(z - TERRAIN_RIVER_Z) / 6);
  return districtHeight(z) - 2.6 * bank;
}
export function planTerrainDistrict(
  seed = 731,
  height: (z: number) => number = districtHeight,
) {
  const plan = planAngledDistrict(seed, false, -138);
  const west = Math.min(
    ...plan.parcels.flatMap((p) => p.boundary.map((v) => v.x)),
  );
  const foundations: { lotIndex: number; base: number; low: number }[] = [];
  const kept: typeof plan.lots = [];
  const remap = new Map<number, number>();
  let rejected = 0;
  for (const [i, lot] of plan.lots.entries()) {
    const samples = [...lotCorners(lot), lot].map((p) => height(p.z));
    const low = Math.min(...samples),
      base = Math.max(...samples);
    const entrance = plan.access.find((a) => a.lotIndex === i);
    if (
      i >= 27 &&
      (!samples.every(Number.isFinite) ||
        base - low > 1.2 ||
        (entrance && base - height(entrance.street.z) > 1.1))
    ) {
      rejected++;
      continue;
    }
    remap.set(i, kept.length);
    foundations.push({ lotIndex: kept.length, base, low });
    kept.push(lot);
  }
  return {
    ...plan,
    lots: kept,
    foundations,
    rejected,
    parcels: plan.parcels.map((p) => ({
      ...p,
      lotIndices: p.lotIndices
        .filter((i) => remap.has(i))
        .map((i) => remap.get(i)!),
    })),
    access: plan.access
      .filter((a) => remap.has(a.lotIndex))
      .map((a) => ({ ...a, lotIndex: remap.get(a.lotIndex)! })),
    rivers: [
      ...plan.rivers,
      [
        { x: -170, z: TERRAIN_RIVER_Z },
        { x: 170, z: TERRAIN_RIVER_Z },
      ],
    ],
    streets: [
      ...plan.streets,
      {
        points: Array.from({ length: 31 }, (_, i) => ({
          x: west,
          z: -138 - i,
        })),
        width: 3,
        alley: false,
      },
    ],
    extent: 180,
    sample: "terrain",
  };
}

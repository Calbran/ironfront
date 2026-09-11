import { trimSettlementStreets } from "./trimSettlementStreets";
import { cityBuildingFootprint } from "./cityBuildingKit";
import {
  lotIntersectsStreet,
  lotsOverlap,
  segmentDistance,
} from "./organicCity";
import { planCombinedDistrict, type TerrainProfile } from "./combinedDistrict";

export type SettlementContext = {
  seed: number;
  size: "town" | "city" | "metropolis";
  setting: "inland" | "river";
};
export const settlementProfile = (
  context: SettlementContext,
): TerrainProfile => (context.setting === "inland" ? "inland" : "normal");
/** Reuse street/parcel/building rules, retaining authored model dimensions at every size. */
export function planSettlementCity(context: SettlementContext) {
  const plan = planCombinedDistrict(
    context.seed,
    settlementProfile(context),
    true,
  );
  const budget = { town: 120, city: 440, metropolis: 950 }[context.size];
  const fringe = { town: 105, city: 170, metropolis: 230 }[context.size];
  const random = (i: number) =>
    ((Math.imul(i + context.seed, 1103515245) >>> 0) % 10007) / 10007;
  // Seeded density falloff creates gaps in the outskirts, not a hard disk of buildings.
  const indices = plan.lots
    .map((lot, i) => ({
      i,
      d: Math.hypot(lot.x, lot.z) / (0.32 + 0.68 * random(i)),
    }))
    .filter((v) => Math.hypot(plan.lots[v.i].x, plan.lots[v.i].z) < fringe)
    .sort((a, b) => a.d - b.d)
    .slice(0, budget)
    .map((v) => v.i)
    .sort((a, b) => a - b);
  const lots = indices.map((i) => ({ ...plan.lots[i] }));
  for (let i = 0; i < lots.length; i++) {
    const lot = lots[i];
    if (Math.hypot(lot.x, lot.z) < fringe * 0.32) continue;
    const variants =
      random(indices[i] + 83) > 0.76
        ? ["shop", "home", "workshopRow"]
        : ["home", "workshopRow"];
    const access = plan.access.find((a) => a.lotIndex === indices[i]);
    for (const variant of [...variants, lot.variant]) {
      const candidate = { ...lot, variant };
      if (access) {
        const street = plan.streets.reduce(
          (best, s) => {
            const distance = Math.min(
              ...s.points
                .slice(1)
                .map((b, j) => segmentDistance(access.street, s.points[j], b)),
            );
            return distance < best.distance
              ? { distance, width: s.width }
              : best;
          },
          { distance: Infinity, width: 3 },
        );
        const setback =
          (cityBuildingFootprint(variant).depth * lot.scale) / 2 +
          street.width / 2 +
          1.1;
        candidate.x = access.street.x - Math.sin(lot.angle) * setback;
        candidate.z = access.street.z - Math.cos(lot.angle) * setback;
      }
      if (
        plan.streets.some((street) => lotIntersectsStreet(candidate, street)) ||
        lots.some((other, j) => i !== j && lotsOverlap(candidate, other))
      )
        continue;
      lots[i] = candidate;
      break;
    }
  }
  const remap = new Map(indices.map((old, i) => [old, i]));
  return {
    ...plan,
    lots,
    streets: trimSettlementStreets(
      plan.streets,
      plan.access.filter((a) => remap.has(a.lotIndex)).map((a) => a.street),
    ),
    decorations: plan.decorations.filter(
      (p) => Math.hypot(p.x, p.z) < fringe * 0.45,
    ),
    foundations: plan.foundations
      .filter((f) => remap.has(f.lotIndex))
      .map((f) => ({ ...f, lotIndex: remap.get(f.lotIndex)! })),
    access: plan.access
      .filter((a) => remap.has(a.lotIndex))
      .map((a) => {
        const lotIndex = remap.get(a.lotIndex)!,
          lot = lots[lotIndex],
          depth = (cityBuildingFootprint(lot.variant).depth * lot.scale) / 2;
        return {
          ...a,
          lotIndex,
          entrance: {
            x: lot.x + Math.sin(lot.angle) * depth,
            z: lot.z + Math.cos(lot.angle) * depth,
          },
        };
      }),
    parcels: plan.parcels
      .map((p) => ({
        ...p,
        lotIndices: p.lotIndices
          .filter((i) => remap.has(i))
          .map((i) => remap.get(i)!),
      }))
      .filter((p) => p.lotIndices.length),
  };
}

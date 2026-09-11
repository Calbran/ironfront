import {
  CURVED_OCEAN_WATERFRONT,
  coastDisplacement,
  shoreAt,
  validateWaterfront,
  coastalFootprintOnLand,
  portInfrastructure,
  portVariants,
  type CityWaterfront,
} from "./portDistrict";
import { cityBuildingFootprint, cityBuildingEnvelope } from "./cityBuildingKit";
import { worldRiverBend } from "./worldRiverSample";
import {
  planAngledDistrict,
  lotCorners,
  blockContains,
} from "./angledDistrict";
import { neighborhoodHeight } from "./craftedNeighborhood";
import {
  lotsOverlap,
  lotIntersectsStreet,
  type CityPoint,
  type CityLot,
} from "./organicCity";
export type TerrainProfile =
  "normal" | "tight-bend" | "steep" | "worldgen" | "ocean";
export function riverBend(
  x: number,
  seed = 731,
  profile: TerrainProfile = "normal",
) {
  if (profile === "worldgen") return worldRiverBend(x, seed);
  return (
    (3 + ((seed >>> 0) % 3)) *
    (profile === "tight-bend" ? 2 : 1) *
    Math.sin(x / (profile === "tight-bend" ? 24 : 48))
  );
}
// Only the waterfront band follows the full bend. Its outer street edges
// remain fixed; a linear transition cannot overshoot or fold the corridor.
const influence = (z: number) =>
  z < -101
    ? Math.max(0, (z + 138) / 37)
    : z > -87
      ? Math.max(0, (-50 - z) / 37)
      : 1;
export function combinedCanonicalZ(
  p: CityPoint,
  seed = 731,
  profile: TerrainProfile = "normal",
  coast: CityWaterfront | undefined = profile === "ocean"
    ? CURVED_OCEAN_WATERFRONT
    : undefined,
) {
  // The coast's linear inland fade has an exact inverse. Its band is disjoint
  // from the river, so ordinary city sampling keeps the existing fast path.
  if (p.z >= 60) {
    if (coast?.kind !== "ocean" || !coast.shoreline) return p.z;
    const delta = shoreAt(coast, p.x) - coast.shoreZ;
    return p.z <= coast.shoreZ + delta
      ? 60 + (p.z - 60) / (1 + delta / (coast.shoreZ - 60))
      : p.z - delta;
  }
  const bend = riverBend(p.x, seed, profile);
  let lo = p.z - Math.abs(bend) - 1,
    hi = p.z + Math.abs(bend) + 1;
  for (let i = 0; i < 36; i++) {
    const mid = (lo + hi) / 2;
    if (mid + bend * influence(mid) < p.z) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
export function combinedPosition(
  p: CityPoint,
  seed = 731,
  profile: TerrainProfile = "normal",
  coast: CityWaterfront | undefined = profile === "ocean"
    ? CURVED_OCEAN_WATERFRONT
    : undefined,
) {
  return {
    x: p.x,
    z:
      p.z +
      riverBend(p.x, seed, profile) * influence(p.z) +
      coastDisplacement(coast, p),
  };
}
export function combinedHeight(
  x: number,
  z: number,
  profile: TerrainProfile = "normal",
  fullTile = false,
) {
  const away = Math.max(0, Math.abs(z + 94) - 8);
  const civic = Math.max(0, Math.min(1, (-z - 41) / 18));
  return (
    (fullTile ? 2 : neighborhoodHeight(z)) +
    (profile === "steep" ? 3 : 1) *
      Math.min(2.6, away * 0.055) *
      (1 + 0.2 * Math.sin(x / 35)) *
      civic
  );
}
export function combinedLot(
  lot: CityLot,
  seed = 731,
  profile: TerrainProfile = "normal",
  coast: CityWaterfront | undefined = profile === "ocean"
    ? CURVED_OCEAN_WATERFRONT
    : undefined,
): CityLot {
  const center = combinedPosition(lot, seed, profile, coast);
  const tip = combinedPosition(
    { x: lot.x + Math.sin(lot.angle), z: lot.z + Math.cos(lot.angle) },
    seed,
    profile,
    coast,
  );
  return {
    ...lot,
    ...center,
    angle: lot.worldAngle ?? Math.atan2(tip.x - center.x, tip.z - center.z),
  };
}
/** Shared corridor coordinates fit curved water, two-dimensional slopes and rigid models. */
export function planCombinedDistrict(
  seed = 731,
  profile: TerrainProfile = "normal",
  fullTile = false,
  waterfront: CityWaterfront | undefined = profile === "ocean"
    ? CURVED_OCEAN_WATERFRONT
    : undefined,
) {
  validateWaterfront(waterfront);
  const position = (p: CityPoint, s = seed, profileArg = profile) =>
    combinedPosition(p, s, profileArg, waterfront);
  const canonicalZ = (p: CityPoint, s = seed, profileArg = profile) =>
    combinedCanonicalZ(p, s, profileArg, waterfront);
  const worldLot = (p: CityLot, s = seed, profileArg = profile) =>
    combinedLot(p, s, profileArg, waterfront);
  const source = planAngledDistrict(
    seed,
    true,
    undefined,
    fullTile,
    waterfront ? { ...waterfront, shoreline: undefined } : undefined,
  );
  const streets = source.streets.map((s) => ({
    ...s,
    points: s.points.map((p) => position(p, seed, profile)),
  }));
  const kept: CityLot[] = [],
    world: CityLot[] = [],
    remap = new Map<number, number>();
  const foundations: { lotIndex: number; base: number; low: number }[] = [];
  let rejected = 0;
  const fittedAccess = new Map<number, (typeof source.access)[number]>();
  let recovered = 0;
  for (const [i, original] of source.lots.entries()) {
    const parcel = source.parcels.find((p) => p.lotIndices.includes(i));
    const variants =
      original.variant.startsWith("urban") ||
      original.variant.startsWith("commercialTower")
        ? [original.variant, "urbanCourt"]
        : [original.variant, "workshopRow", "warehouse"];
    const originalAccess = source.access.find((a) => a.lotIndex === i);
    const canonical = (p: CityPoint) => ({
      x: p.x,
      z: canonicalZ(p, seed, profile),
    });
    const tangent = {
      x: Math.cos(original.angle),
      z: -Math.sin(original.angle),
    };
    const anchor = originalAccess?.street ?? original;
    const start = position(
      { x: anchor.x - tangent.x * 0.5, z: anchor.z - tangent.z * 0.5 },
      seed,
      profile,
    );
    const end = position(
      { x: anchor.x + tangent.x * 0.5, z: anchor.z + tangent.z * 0.5 },
      seed,
      profile,
    );
    const length = Math.hypot(end.x - start.x, end.z - start.z);
    const facing = {
      x: -(end.z - start.z) / length,
      z: (end.x - start.x) / length,
    };
    const streetPoint = position(anchor, seed, profile);
    const attempts =
      i < source.civicLotCount
        ? [original]
        : variants.flatMap((variant) =>
            [0, 0.6, 1.2].map((offset) => {
              const setback =
                2.9 +
                (cityBuildingEnvelope(variant).depth * original.scale) / 2 +
                offset;
              const center = canonical({
                x: streetPoint.x - facing.x * setback,
                z: streetPoint.z - facing.z * setback,
              });
              return {
                ...original,
                ...center,
                variant,
                worldAngle: Math.atan2(facing.x, facing.z),
              };
            }),
          );
    let accepted = false;
    for (const [attempt, lot] of attempts.entries()) {
      const placed = worldLot(lot, seed, profile),
        corners = lotCorners(placed);
      const heights = corners.map((p) =>
        combinedHeight(p.x, canonicalZ(p, seed, profile), profile, fullTile),
      );
      const low = Math.min(...heights),
        base = Math.max(...heights);
      const front = (cityBuildingFootprint(lot.variant).depth * lot.scale) / 2;
      const access = originalAccess
        ? {
            ...originalAccess,
            entrance: canonical({
              x: placed.x + Math.sin(placed.angle) * front,
              z: placed.z + Math.cos(placed.angle) * front,
            }),
          }
        : undefined;
      const path = access
        ? {
            points: [
              position(access.entrance, seed, profile),
              position(access.street, seed, profile),
            ],
            width: 1.25,
            alley: true,
          }
        : undefined;
      if (!coastalFootprintOnLand(corners, waterfront, 1)) continue;
      if (
        i >= source.civicLotCount &&
        ((parcel &&
          (!corners.every((p) =>
            blockContains(parcel.boundary, canonical(p), 2.8),
          ) ||
            (parcel.court.length >= 3 &&
              (blockContains(parcel.court, lot) ||
                lotIntersectsStreet(placed, {
                  points: [...parcel.court, parcel.court[0]].map((p) =>
                    position(p, seed, profile),
                  ),
                  width: 0.6,
                  alley: true,
                }))))) ||
          base - low > 1.2 ||
          corners.some(
            (p) => Math.abs(p.z + 94 - riverBend(p.x, seed, profile)) < 7,
          ) ||
          streets.some((s) => lotIntersectsStreet(placed, s)) ||
          world.some(
            (p) =>
              lotsOverlap(p, placed) || (path && lotIntersectsStreet(p, path)),
          ))
      )
        continue;
      remap.set(i, kept.length);
      foundations.push({ lotIndex: kept.length, base, low });
      kept.push(lot);
      world.push(placed);
      if (access) fittedAccess.set(i, access);
      if (attempt > 0) recovered++;
      accepted = true;
      break;
    }
    if (!accepted) rejected++;
  }
  // Repack leftover frontage against the final road shape, including sites that
  // never survived the initial straight-block candidate pass.
  let infill = 0;
  const canonicalPoint = (p: CityPoint) => ({
    x: p.x,
    z: canonicalZ(p, seed, profile),
  });
  for (const parcel of source.parcels) {
    const variants = parcel.portZone
      ? portVariants(parcel.portZone)
      : parcel.kind === "industrial"
        ? fullTile
          ? [
              "workshopRowCanopy",
              "workshopRow",
              "warehouseFoundry",
              "warehouseEngine",
            ]
          : ["workshopRow", "warehouse"]
        : ["urbanShop", "urbanCourt"];
    for (const variant of variants)
      for (let edge = 0; edge < parcel.boundary.length; edge++) {
        const a = parcel.boundary[edge],
          b = parcel.boundary[(edge + 1) % parcel.boundary.length];
        const dx = b.x - a.x,
          dz = b.z - a.z,
          length = Math.hypot(dx, dz);
        for (const rear of parcel.kind === "industrial" ? [0, 9, 18] : [0])
          for (let along = 5; along < length - 5; along += 2) {
            const anchor = {
              x: a.x + (dx * along) / length,
              z: a.z + (dz * along) / length,
            };
            const wp = position(anchor, seed, profile),
              tip = position(
                {
                  x: anchor.x + (dx / length) * 0.25,
                  z: anchor.z + (dz / length) * 0.25,
                },
                seed,
                profile,
              );
            const dl = Math.hypot(tip.x - wp.x, tip.z - wp.z),
              facing = { x: (tip.z - wp.z) / dl, z: -(tip.x - wp.x) / dl };
            const scale = 0.85,
              setback =
                2.9 + (cityBuildingEnvelope(variant).depth * scale) / 2 + rear;
            const center = {
              x: wp.x - facing.x * setback,
              z: wp.z - facing.z * setback,
            };
            const lot: CityLot = {
              ...canonicalPoint(center),
              angle: Math.atan2(dz, -dx),
              worldAngle: Math.atan2(facing.x, facing.z),
              scale,
              heightScale: 1,
              variant,
              fullEnvelope: true,
            };
            const placed = worldLot(lot, seed, profile),
              corners = lotCorners(placed);
            if (!coastalFootprintOnLand(corners, waterfront, 1)) continue;
            if (
              !corners.every((p) =>
                blockContains(parcel.boundary, canonicalPoint(p), 2.8),
              )
            )
              continue;
            if (
              parcel.court.length >= 3 &&
              (blockContains(parcel.court, lot) ||
                lotIntersectsStreet(placed, {
                  points: [...parcel.court, parcel.court[0]].map((p) =>
                    position(p, seed, profile),
                  ),
                  width: 0.6,
                  alley: true,
                }))
            )
              continue;
            const heights = corners.map((p) =>
                combinedHeight(
                  p.x,
                  canonicalZ(p, seed, profile),
                  profile,
                  fullTile,
                ),
              ),
              low = Math.min(...heights),
              base = Math.max(...heights);
            if (
              base - low > 1.2 ||
              corners.some(
                (p) => Math.abs(p.z + 94 - riverBend(p.x, seed, profile)) < 7,
              ) ||
              streets.some((s) => lotIntersectsStreet(placed, s)) ||
              world.some((l) => lotsOverlap(l, placed))
            )
              continue;
            const front = (cityBuildingFootprint(variant).depth * scale) / 2,
              entrance = {
                x: center.x + facing.x * front,
                z: center.z + facing.z * front,
              };
            const path = { points: [entrance, wp], width: 1.25, alley: true };
            if (
              world.some((l) => lotIntersectsStreet(l, path)) ||
              [...fittedAccess.values()].some((access) =>
                lotIntersectsStreet(placed, {
                  points: [
                    position(access.entrance, seed, profile),
                    position(access.street, seed, profile),
                  ],
                  width: 1.25,
                  alley: true,
                }),
              )
            )
              continue;
            const index = source.lots.length;
            source.lots.push(lot);
            parcel.lotIndices.push(index);
            remap.set(index, kept.length);
            foundations.push({ lotIndex: kept.length, base, low });
            kept.push(lot);
            world.push(placed);
            fittedAccess.set(index, {
              lotIndex: index,
              entrance: canonicalPoint(entrance),
              street: anchor,
            });
            infill++;
          }
      }
  }
  // Reject remaining entrance obstructions after rigid placement in the bent street frame.
  const blocked = new Set<number>();
  for (const a of fittedAccess.values()) {
    const i = remap.get(a.lotIndex);
    if (i === undefined) continue;
    const path = {
      points: [
        position(a.entrance, seed, profile),
        position(a.street, seed, profile),
      ],
      width: 1.25,
      alley: true,
    };
    if (world.some((p, j) => j !== i && lotIntersectsStreet(p, path)))
      blocked.add(i);
  }
  const finalMap = new Map<number, number>();
  const lots = kept.filter((_, i) => {
    if (blocked.has(i)) return false;
    finalMap.set(i, finalMap.size);
    return true;
  });
  const decorations: {
    x: number;
    z: number;
    kind: "cargo" | "tank" | "plaza";
  }[] = [];
  const decorationLots: CityLot[] = [];
  for (const parcel of source.parcels) {
    if (parcel.kind === "residential") continue;
    const xs = parcel.boundary.map((p) => p.x),
      zs = parcel.boundary.map((p) => p.z);
    let placed = 0;
    for (
      let z = Math.min(...zs) + 5;
      z < Math.max(...zs) - 4 && placed < 8;
      z += 7
    )
      for (
        let x = Math.min(...xs) + 5;
        x < Math.max(...xs) - 4 && placed < 8;
        x += 7
      ) {
        const local: CityLot = { x, z, angle: 0, scale: 0.7, variant: "home" };
        if (
          !lotCorners(local).every((p) => blockContains(parcel.boundary, p, 4))
        )
          continue;
        if (
          parcel.court.length >= 3 &&
          (blockContains(parcel.court, local) ||
            lotIntersectsStreet(local, {
              points: [...parcel.court, parcel.court[0]],
              width: 1,
              alley: true,
            }))
        )
          continue;
        const candidate = worldLot(local, seed, profile),
          corners = lotCorners(candidate);
        const heights = corners.map((p) =>
          combinedHeight(p.x, canonicalZ(p, seed, profile), profile, fullTile),
        );
        if (
          Math.max(...heights) - Math.min(...heights) > 0.3 ||
          corners.some(
            (p) => Math.abs(p.z + 94 - riverBend(p.x, seed, profile)) < 8,
          )
        )
          continue;
        if (
          world.some((l, i) => !blocked.has(i) && lotsOverlap(l, candidate)) ||
          decorationLots.some((l) => lotsOverlap(l, candidate)) ||
          streets.some((s) =>
            lotIntersectsStreet(candidate, { ...s, width: s.width + 2 }),
          )
        )
          continue;
        if (
          [...fittedAccess.values()].some((a) =>
            lotIntersectsStreet(candidate, {
              points: [
                position(a.entrance, seed, profile),
                position(a.street, seed, profile),
              ],
              width: 2,
              alley: true,
            }),
          )
        )
          continue;
        decorations.push({
          x,
          z,
          kind:
            parcel.kind === "commercial"
              ? "plaza"
              : placed % 3 === 2
                ? "tank"
                : "cargo",
        });
        decorationLots.push(candidate);
        placed++;
      }
  }
  return {
    ...source,
    waterfront: source.waterfront ? waterfront : undefined,
    portInfrastructure: portInfrastructure(waterfront, source.parcels, true),
    lots,
    foundations: foundations
      .filter((f) => !blocked.has(f.lotIndex))
      .map((f) => ({ ...f, lotIndex: finalMap.get(f.lotIndex)! })),
    rejected: rejected + blocked.size,
    recovered,
    infill,
    decorations,
    parcels: source.parcels.map((p) => ({
      ...p,
      lotIndices: p.lotIndices.flatMap((i) => {
        const old = remap.get(i),
          next = old === undefined ? undefined : finalMap.get(old);
        return next === undefined ? [] : [next];
      }),
    })),
    access: [...fittedAccess.values()].flatMap((a) => {
      const old = remap.get(a.lotIndex),
        next = old === undefined ? undefined : finalMap.get(old);
      return next === undefined ? [] : [{ ...a, lotIndex: next }];
    }),
    sample: "combined",
  };
}

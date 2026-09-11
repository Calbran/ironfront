import type { CityPoint } from "./organicCity";

/** Local city frame: waterfront lies on +Z, with land on the -Z side.
 * A world placement adapter must supply an actual ocean edge, not a coastal-region flag.
 */
export type CityWaterfront = {
  kind: "ocean" | "river" | "lake";
  shoreZ: number;
  minX: number;
  maxX: number;
  /** Ordered local coastline, one Z per X; shoreZ is the seaward reference. */
  shoreline?: readonly CityPoint[];
};
export type PortZone = "cargo-quay" | "bonded-warehouses" | "harbor-market";
export const PORT_ZONE_LABELS: Record<PortZone, string> = {
  "cargo-quay": "Cargo quays",
  "bonded-warehouses": "Bonded warehouses",
  "harbor-market": "Harbor quarter",
};
/** Explicit ocean-shore fixture for the full-city study. Inland profiles have no coast. */
export const OCEAN_CITY_WATERFRONT: CityWaterfront = {
  kind: "ocean",
  shoreZ: 164,
  minX: -160,
  maxX: 160,
};
export const CURVED_OCEAN_WATERFRONT: CityWaterfront = {
  ...OCEAN_CITY_WATERFRONT,
  shoreline: Array.from({ length: 41 }, (_, i) => {
    const x = -160 + i * 8;
    return { x, z: 148 + 12 * Math.sin(x / 48) + 4 * Math.sin(x / 21) };
  }),
};
export function validateWaterfront(coast?: CityWaterfront) {
  if (!coast?.shoreline) return;
  const points = coast.shoreline;
  if (
    coast.shoreZ <= 108 ||
    points.length < 2 ||
    points[0].x > coast.minX ||
    points.at(-1)!.x < coast.maxX ||
    points.some(
      (p, i) =>
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.z) ||
        p.z > coast.shoreZ ||
        p.z < coast.shoreZ - 48 ||
        (i > 0 && p.x <= points[i - 1].x),
    )
  )
    throw new Error(
      "Coastline must be ordered along X, cover its frontage, and stay within 48 units inland of shoreZ",
    );
}
export function shoreAt(coast: CityWaterfront, x: number) {
  const points = coast.shoreline;
  if (!points?.length) return coast.shoreZ;
  if (x <= points[0].x) return points[0].z;
  if (x >= points.at(-1)!.x) return points.at(-1)!.z;
  let lo = 0,
    hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >>> 1;
    if (points[mid].x < x) lo = mid;
    else hi = mid;
  }
  const a = points[lo],
    b = points[hi];
  return a.z + ((b.z - a.z) * (x - a.x)) / (b.x - a.x);
}
export function shoreSlope(coast: CityWaterfront, x: number) {
  return (shoreAt(coast, x + 2) - shoreAt(coast, x - 2)) / 4;
}
/** Fade the shore displacement inland; the bounded derivative cannot fold streets. */
export function coastDisplacement(
  coast: CityWaterfront | undefined,
  p: CityPoint,
) {
  if (coast?.kind !== "ocean" || !coast.shoreline || p.z <= 60) return 0;
  const influence = Math.max(0, Math.min(1, (p.z - 60) / (coast.shoreZ - 60)));
  return (shoreAt(coast, p.x) - coast.shoreZ) * influence;
}
export function coastalFootprintOnLand(
  points: readonly CityPoint[],
  coast?: CityWaterfront,
  margin = 0,
) {
  if (coast?.kind !== "ocean") return true;
  return points.every((a, i) => {
    const b = points[(i + 1) % points.length];
    // Check each coast breakpoint too, so a narrow inlet cannot hide between corners.
    const ts = [
      0,
      1,
      ...(coast.shoreline ?? []).flatMap((p) => {
        const t = (p.x - a.x) / (b.x - a.x);
        return t > 0 && t < 1 ? [t] : [];
      }),
    ];
    return ts.every((t) => {
      const x = a.x + (b.x - a.x) * t,
        z = a.z + (b.z - a.z) * t;
      return z <= shoreAt(coast, x) - margin;
    });
  });
}
export function portZoneForParcel(
  boundary: readonly CityPoint[],
  coast?: CityWaterfront,
): PortZone | undefined {
  if (
    !coast ||
    coast.kind !== "ocean" ||
    boundary.length < 3 ||
    !Number.isFinite(coast.shoreZ) ||
    !Number.isFinite(coast.minX) ||
    !Number.isFinite(coast.maxX) ||
    coast.maxX - coast.minX < 40
  )
    return;
  // Require the whole parcel to be on land and within this coast's serviced frontage.
  if (boundary.some((p) => p.x < coast.minX || p.x > coast.maxX)) return;
  if (!coastalFootprintOnLand(boundary, coast)) return;
  const distances = boundary.map((p) => shoreAt(coast, p.x) - p.z);
  const nearest = Math.min(...distances);
  const farthest = Math.max(...distances);
  if (nearest > 42 || farthest > 84) return;
  const x = boundary.reduce((sum, p) => sum + p.x / boundary.length, 0);
  const center = (coast.minX + coast.maxX) / 2;
  if (Math.abs(x - center) < 44) return "harbor-market";
  return nearest <= 8 ? "cargo-quay" : "bonded-warehouses";
}
export function portVariants(zone: PortZone): readonly string[] {
  return zone === "harbor-market"
    ? ["urbanArcade", "urbanShop", "urbanMansard", "urbanCopper"]
    : zone === "cargo-quay"
      ? ["warehouse", "warehouseEngine", "workshopRowCanopy"]
      : ["warehouseFoundry", "warehouse", "workshopRow"];
}
export function portInfrastructure(
  coast: CityWaterfront | undefined,
  parcels: readonly { portZone?: PortZone; boundary: CityPoint[] }[],
  canonical = false,
) {
  if (!coast || coast.kind !== "ocean") return [];
  return parcels
    .filter((p) => p.portZone === "cargo-quay")
    .flatMap((p) => {
      // A diagonal split can touch the waterfront at only one corner. It must
      // not claim the neighboring parcel's berth or duplicate its pier.
      const frontage = p.boundary.filter(
        (v) => (canonical ? coast.shoreZ : shoreAt(coast, v.x)) - v.z <= 8,
      );
      if (frontage.length < 2) return [];
      const minX = Math.min(...frontage.map((v) => v.x));
      const maxX = Math.max(...frontage.map((v) => v.x));
      if (maxX - minX < 24) return [];
      const x = (minX + maxX) / 2,
        z = shoreAt(coast, x),
        slope = shoreSlope(coast, x);
      // Leave sharply changing shore sections unbuilt rather than forcing a berth.
      if (
        Math.abs(slope) > 0.85 ||
        Math.abs(shoreSlope(coast, x - 7) - shoreSlope(coast, x + 7)) > 0.5
      )
        return [];
      return [
        {
          x,
          z,
          angle: Math.atan2(-slope, 1),
          width: 7,
          length: 23,
          quayMinX: minX + 3,
          quayMaxX: maxX - 3,
        },
      ];
    })
    .filter((p, i, all) => {
      // Reserve the entire berth, including its alongside ship and crane jib.
      const at = (a: typeof p, u: number, v: number) => ({
        x: a.x + u * Math.cos(a.angle) + v * Math.sin(a.angle),
        z: a.z - u * Math.sin(a.angle) + v * Math.cos(a.angle),
      });
      for (let v = 2; v <= 24; v += 2)
        for (const u of [-4, 0, 6, 12]) {
          const q = at(p, u, v);
          if (q.z < shoreAt(coast, q.x) + 0.15) return false;
        }
      return all.slice(0, i).every((other) => {
        for (let a = 0; a <= 24; a += 4)
          for (let b = 0; b <= 24; b += 4) {
            const u = at(p, 4, a),
              v = at(other, 4, b);
            if (Math.hypot(u.x - v.x, u.z - v.z) < 20) return false;
          }
        return true;
      });
    });
}

import { countryForestDensity } from "./countryLandscape";
import { countryTerrainNoise } from "./countryTerrainNoise";
import type { SlicePlan, SlicePoint } from "./countrySlice";
import { ruralFieldAt } from "./regionalFarmland";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function segmentDistance(point: SlicePoint, a: SlicePoint, b: SlicePoint) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = clamp(
    ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1),
    0,
    1,
  );
  return Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t);
}

/** Vehicle speed through the same broad woodland field used to place trees.
 * This deliberately avoids per-tree collision tests. Roads and developed sites
 * are cleared corridors, while sparse/dense woodland ranges from 72% to 35%.
 */
export function countryTankTerrainSpeedFactor(
  plan: SlicePlan,
  point: SlicePoint,
) {
  if (
    plan.sites.some(
      (site) =>
        Math.hypot(point.x - site.x, point.z - site.z) < site.extent + 8,
    )
  )
    return 1;
  for (const road of plan.roads.roads)
    for (let i = 1; i < road.path.length; i++)
      if (
        segmentDistance(
          point,
          { x: road.path[i - 1].x, z: road.path[i - 1].y },
          { x: road.path[i].x, z: road.path[i].y },
        ) <=
        road.width / 2 + 5
      )
        return 0.9;
  if (
    plan.campaignMap?.version === 3 &&
    ruralFieldAt(plan.campaignMap.fields, point.x, point.z)
  )
    return 1;
  const density = countryForestDensity(
    point.x,
    point.z,
    plan.campaignMap?.version === 3,
  );
  // Match the renderer's woodland threshold and seeded interior clearings.
  if (
    density < 0.12 ||
    countryTerrainNoise(point.x * 0.035, point.z * 0.035) > 0.72
  )
    return 1;
  const t = clamp((density - 0.12) / 0.45, 0, 1);
  const eased = t * t * (3 - 2 * t);
  return 0.72 - eased * 0.37;
}

/** Forest regions remove the rapid redeployment benefit of heavy motorization. */
export function campaignTravelHours(
  terrain: "plains" | "forest" | "highlands" | "mountains",
  motorized: number,
  fueled: boolean,
) {
  if (terrain === "highlands") return 6;
  if (terrain === "forest") return 4;
  return motorized >= 40 && fueled ? 2 : 4;
}

import { CITY_RUN_SPEED } from "../../../../packages/game-core/src/cityUnitTrial";
import { CAMPAIGN_MODEL_PER_WORLD } from "../../../../packages/game-core/src/campaignPhysicalScale";
import { WORLD_TO_MODEL } from "./miniatureData";

// Match the capped, unsuppressed infantry reference used by the strategic study.
// Smaller regions can have slower strategic speeds; report both ETAs, not equality.
export const PHYSICAL_SEPARATION = CAMPAIGN_MODEL_PER_WORLD / WORLD_TO_MODEL;
export { CITY_RUN_SPEED };
type Point = { x: number; y: number };

/** Geography/anchor transform only. Never apply this to local meshes or widths. */
export function physicalAnchor(
  point: Point,
  separation: number,
  origin: Point = { x: 0, y: 0 },
): Point {
  return {
    x: (point.x - origin.x) * WORLD_TO_MODEL * separation,
    y: (point.y - origin.y) * WORLD_TO_MODEL * separation,
  };
}
export function physicalRouteHours(
  start: Point,
  path: readonly Point[],
  separation = PHYSICAL_SEPARATION,
): number {
  let previous = start,
    length = 0;
  for (const point of path) {
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return (length * WORLD_TO_MODEL * separation) / CITY_RUN_SPEED / 3600;
}

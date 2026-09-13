import type { SlicePlan, SlicePoint } from "./countrySlice";
import type { CityObstacle } from "./cityTactics";
const cache = new WeakMap<SlicePlan, Map<string, CityObstacle[]>>();
/** Plans are immutable geometry snapshots; construction creates a new plan/index. */
export function countryObstaclesNear(
  plan: SlicePlan,
  p: SlicePoint,
  radius = 2,
) {
  let grid = cache.get(plan);
  if (!grid) {
    grid = new Map();
    for (const o of plan.obstacles) {
      const r = Math.hypot(o.width, o.depth) / 2;
      for (
        let z = Math.floor((o.z - r) / 48);
        z <= Math.floor((o.z + r) / 48);
        z++
      )
        for (
          let x = Math.floor((o.x - r) / 48);
          x <= Math.floor((o.x + r) / 48);
          x++
        ) {
          const k = x + ":" + z,
            a = grid.get(k) ?? [];
          a.push(o);
          grid.set(k, a);
        }
    }
    cache.set(plan, grid);
  }
  const result = new Set<CityObstacle>();
  for (
    let z = Math.floor((p.z - radius) / 48);
    z <= Math.floor((p.z + radius) / 48);
    z++
  )
    for (
      let x = Math.floor((p.x - radius) / 48);
      x <= Math.floor((p.x + radius) / 48);
      x++
    )
      for (const o of grid.get(x + ":" + z) ?? []) result.add(o);
  return [...result];
}

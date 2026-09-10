import type { World } from "./index.ts";
import type { Squad } from "./tactics.ts";
import { orderSquads } from "./localMovement.ts";
import { crossRegionPath } from "./crossRegionPath.ts";
import { visibleRegions } from "./vision.ts";
export function attackRange(w: World, s: Squad) {
  return (
    Math.max(20, Math.min(100, Math.sqrt(w.regions[s.region].area) * 0.22)) *
    (s.kind === "artillery" ? 3.5 : s.kind === "armor" ? 1.25 : 0.95)
  );
}
export function orderAttack(
  w: World,
  owner: number,
  ids: string[],
  targetId: string,
) {
  const target = w.tactics?.squads.find(
    (s) => s.id === targetId && s.strength > 0,
  );
  if (
    !target ||
    target.owner === owner ||
    !visibleRegions(w, owner).has(target.region)
  )
    throw Error("Choose a visible hostile squad or neutral defender.");
  orderSquads(w, owner, ids, "move", [{ x: target.x, y: target.y }]);
  for (const s of w.tactics!.squads.filter((s) => ids.includes(s.id)))
    s.localOrder!.attackTarget = targetId;
}
/** Track only visible targets. Invalid or lost targets stop pursuit at the current location. */
export function refreshAttack(w: World, s: Squad) {
  const order = s.localOrder;
  if (!order?.attackTarget || s.owner === null) return;
  const target = w.tactics!.squads.find((d) => d.id === order.attackTarget);
  if (
    !target ||
    target.strength <= 0 ||
    target.owner === s.owner ||
    !visibleRegions(w, s.owner).has(target.region)
  ) {
    delete order.attackTarget;
    order.path = [];
    order.waypoints = [];
    order.mode = "hold";
    s.target = null;
    return;
  }
  if (
    target.region === s.region &&
    Math.hypot(target.x - s.x, target.y - s.y) <= attackRange(w, s) * 0.9
  ) {
    order.path = [];
    order.waypoints = [];
    order.mode = "hold";
    return;
  }
  const end = order.path.at(-1);
  if (
    !end ||
    end.region !== target.region ||
    Math.hypot(end.x - target.x, end.y - target.y) > 5
  ) {
    try {
      order.path = crossRegionPath(w, s, s.region, target, s.movementLayer);
      order.waypoints = [{ x: target.x, y: target.y }];
      order.mode = "move";
    } catch {
      delete order.attackTarget;
      order.path = [];
      order.waypoints = [];
      order.mode = "hold";
    }
  }
}

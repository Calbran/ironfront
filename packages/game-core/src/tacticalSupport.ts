export type SupportPoint = { x: number; z: number };
export type SupportMemory = {
  anchor: SupportPoint;
  next: number;
  target?: number;
};
export type SupportUnit = SupportPoint & {
  id: number;
  kind?: string;
  health?: number;
  path: SupportPoint[];
  guide?: SupportPoint[];
  stance?: string;
  supportMove?: boolean;
  supportTarget?: number;
  facing?: number;
  aimAngle?: number;
  moving?: boolean;
  cover?: unknown;
};
export type SupportGroup = {
  id: number;
  kind?: string;
  enemy: boolean;
  units: SupportUnit[];
  memory?: SupportMemory;
};
export const SUPPORT_SIGHT = 60,
  SUPPORT_NEARBY = 45,
  SUPPORT_LEASH = 32;
/** Shared, bounded local support. Adapters supply real visibility and collision rules.
 * Two squad decisions per call; no global pathfinding or unseen-target pursuit.
 */
export function updateTacticalSupport(
  groups: SupportGroup[],
  time: number,
  rules: {
    range(u: SupportUnit): number;
    visible(a: SupportUnit, b: SupportUnit): boolean;
    clear(a: SupportUnit, b: SupportPoint): boolean;
  },
) {
  const distance = (a: SupportPoint, b: SupportPoint) =>
    Math.hypot(a.x - b.x, a.z - b.z);
  const live = groups.map((g) => ({
    ...g,
    units: g.units.filter((u) => (u.health ?? 100) > 0),
  }));
  let budget = 2;
  for (const group of groups) {
    const members = group.units.filter((u) => (u.health ?? 100) > 0);
    if (!members.length) continue;
    // Keep explicit player routes and Hold. An entire squad waits for its order.
    if (
      members.some(
        (u) => u.stance === "hold" || (u.path.length && !u.supportMove),
      )
    ) {
      group.memory = undefined;
      continue;
    }
    const memory = (group.memory ??= {
      anchor: { x: members[0].x, z: members[0].z },
      next: time + (group.id % 4) * 0.25,
    });
    if (time < memory.next || budget <= 0) continue;
    budget--;
    memory.next = time + 1.5 + (group.id % 3) * 0.2;
    const enemies = live
      .filter((g) => g.enemy !== group.enemy)
      .flatMap((g) => g.units)
      .filter((v) => members.some((u) => distance(u, v) <= SUPPORT_SIGHT))
      .sort(
        (a, b) =>
          distance(members[0], a) - distance(members[0], b) || a.id - b.id,
      );
    const target = enemies.find(
      (v) =>
        members.some(
          (u) => distance(u, v) <= SUPPORT_SIGHT && rules.visible(u, v),
        ) &&
        live
          .filter((g) => g.enemy === group.enemy)
          .some((g) =>
            g.units.some(
              (ally) =>
                members.some((u) => distance(u, ally) <= SUPPORT_NEARBY) &&
                distance(ally, v) <= rules.range(ally) &&
                rules.visible(ally, v),
            ),
          ),
    );
    memory.target = target?.id;
    for (let i = 0; i < members.length; i++) {
      const u = members[i];
      u.supportTarget = target?.id;
      if (!target) {
        if (u.supportMove) {
          u.path = [];
          u.guide = [];
          u.supportMove = false;
        }
        continue;
      }
      u.aimAngle = Math.atan2(target.x - u.x, target.z - u.z);
      if (distance(u, target) <= rules.range(u) && rules.visible(u, target)) {
        if (u.supportMove) {
          u.path = [];
          u.guide = [];
          u.supportMove = false;
        }
        if (u.kind !== "tank" && u.kind !== "vehicle") u.facing = u.aimAngle;
        continue;
      }
      if (u.path.length) continue;
      const angle = Math.atan2(target.z - u.z, target.x - u.x);
      const travel = Math.min(
        10,
        Math.max(2, distance(u, target) - rules.range(u) * 0.8),
      );
      // Fan out locally for a clear angle. Never walk through scenery or pursue
      // beyond the initial support anchor, even across repeated decisions.
      for (const turn of [
        0,
        (i % 2 ? 1 : -1) * 0.35,
        -(i % 2 ? 1 : -1) * 0.35,
        0.8,
        -0.8,
      ]) {
        const p = {
          x: u.x + Math.cos(angle + turn) * travel,
          z: u.z + Math.sin(angle + turn) * travel,
        };
        if (distance(p, memory.anchor) > SUPPORT_LEASH || !rules.clear(u, p))
          continue;
        if (
          live.some((g) =>
            g.units.some(
              (v) => v.id !== u.id && distance(v.path.at(-1) ?? v, p) < 1.2,
            ),
          )
        )
          continue;
        u.path = [p];
        u.guide = [{ x: u.x, z: u.z }, p];
        u.supportMove = true;
        u.moving = true;
        break;
      }
    }
  }
}

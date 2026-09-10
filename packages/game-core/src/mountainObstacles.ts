import { crossRegionPath } from "./crossRegionPath.ts";
import { invalidateLocalPaths } from "./localMovement.ts";
import type { World } from "./index.ts";
import { generateBiomeScenery, type ScenerySprite } from "./biomeScenery.ts";
import { generateCityLayout } from "./cityLayout.ts";
export type MovementLayer = "ground" | "air";
export interface MountainObstacle {
  x: number;
  y: number;
  radius: number;
}
/** Ground footprint, independent of texture resolution and transparent atlas margins. */
export const mountainRadius = (p: ScenerySprite) => p.width * 0.42;
export function blockedByMountains(
  obstacles: readonly MountainObstacle[] | undefined,
  a: { x: number; y: number },
  b = a,
  layer: MovementLayer = "ground",
) {
  if (layer === "air") return false;
  return (obstacles ?? []).some((o) => {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      length = dx * dx + dy * dy;
    const t = length
      ? Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.y - a.y) * dy) / length))
      : 0;
    return Math.hypot(a.x + t * dx - o.x, a.y + t * dy - o.y) <= o.radius;
  });
}
/** Freeze the displayed mountains and their collision footprints together on creation/save upgrade. */
export function ensureMountainObstacles(w: World) {
  if (w.mountainScenery) return;
  const clearings = w.regions.flatMap((r) =>
    (r.features ?? [])
      .filter((f) => f.kind === "settlement")
      .map((f) => ({
        x: f.x,
        y: f.y,
        radius: generateCityLayout(w, r, f).radius,
      })),
  );
  // Old saves may contain units in formerly decorative rocks; preserve those positions.
  const protectedSites = [
    ...w.regions.map((r) => ({ x: r.x, y: r.y, radius: 100 })),
    ...(w.tactics?.squads ?? [])
      .filter((s) => s.strength > 0)
      .map((s) => ({ x: s.x, y: s.y, radius: 20 })),
  ];
  // Keep indispensable land passages open when converting old decorative terrain.
  const corridors: {
    a: { x: number; y: number };
    b: { x: number; y: number };
  }[] = [];
  for (const r of w.regions.filter((r) => r.terrain !== "mountains"))
    for (const n of r.neighbors) {
      if (n <= r.id || w.regions[n].terrain === "mountains") continue;
      const seen = new Set([r.id]),
        queue = [r.id];
      for (let i = 0; i < queue.length; i++)
        for (const to of w.regions[queue[i]].neighbors) {
          if (
            (queue[i] === r.id && to === n) ||
            (queue[i] === n && to === r.id) ||
            seen.has(to) ||
            w.regions[to].terrain === "mountains"
          )
            continue;
          seen.add(to);
          queue.push(to);
        }
      if (seen.has(n)) continue;
      try {
        let at: { x: number; y: number } = r;
        for (const p of crossRegionPath(w, r, r.id, w.regions[n])) {
          corridors.push({ a: at, b: p });
          at = p;
        }
      } catch {
        /* Preserve legacy geography with no existing local connection. */
      }
    }
  const mountains = generateBiomeScenery(w, clearings).filter(
    (p) =>
      p.kind === "rock" &&
      !protectedSites.some(
        (s) => Math.hypot(s.x - p.x, s.y - p.y) < mountainRadius(p) + s.radius,
      ) &&
      !corridors.some((c) =>
        blockedByMountains(
          [
            {
              x: p.x,
              y: p.y,
              radius: mountainRadius(p) + (w.geography?.cellSize ?? 8),
            },
          ],
          c.a,
          c.b,
        ),
      ),
  );
  for (const r of w.regions) r.mountainObstacles = [];
  for (const p of mountains) {
    const obstacle = { x: p.x, y: p.y, radius: mountainRadius(p) };
    // Placement envelopes keep each rock on land; include nearby regions for border segment checks.
    for (const r of w.regions) {
      const pts = r.polygon;
      if (
        p.x + obstacle.radius >= Math.min(...pts.map((p) => p[0])) &&
        p.x - obstacle.radius <= Math.max(...pts.map((p) => p[0])) &&
        p.y + obstacle.radius >= Math.min(...pts.map((p) => p[1])) &&
        p.y - obstacle.radius <= Math.max(...pts.map((p) => p[1]))
      )
        r.mountainObstacles!.push(obstacle);
    }
  }
  for (const r of w.regions) invalidateLocalPaths(r);
  w.mountainScenery = mountains;
}

import type { Region } from "./index.ts";

export type TerrainPoint = { x: number; y: number };
export interface TerrainObstacle {
  id: string;
  kind: "scrap" | "ridge" | "water";
  polygon: TerrainPoint[];
}
export interface TerrainCrossing {
  id: string;
  polygon: TerrainPoint[];
  points: TerrainPoint[];
  width: number;
}
export interface TerrainLayout {
  version: 1;
  theme: "scrapyard" | "lake" | "mountain-pass";
  obstacles: TerrainObstacle[];
  crossings: TerrainCrossing[];
  routes: { points: TerrainPoint[]; width: number }[];
}
export const TERRAIN_THEME_NAMES = {
  scrapyard: "Scrapyard district",
  lake: "Lake crossing",
  "mountain-pass": "Mountain pass",
};

export function segmentDistance(
  p: TerrainPoint,
  a: TerrainPoint,
  b: TerrainPoint,
) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
    ),
  );
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
export function polygonContains(
  poly: readonly TerrainPoint[],
  p: TerrainPoint,
) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j],
      b = poly[i];
    if (segmentDistance(p, a, b) < 1e-7) return true;
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export function polygonDistance(
  poly: readonly TerrainPoint[],
  p: TerrainPoint,
) {
  if (polygonContains(poly, p)) return 0;
  return Math.min(
    ...poly.map((a, i) => segmentDistance(p, a, poly[(i + 1) % poly.length])),
  );
}
const polygonBounds = new WeakMap<
  readonly TerrainPoint[],
  { minX: number; maxX: number; minY: number; maxY: number }
>();
function bounds(poly: readonly TerrainPoint[]) {
  let box = polygonBounds.get(poly);
  if (!box) {
    box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    for (const p of poly) {
      box.minX = Math.min(box.minX, p.x);
      box.maxX = Math.max(box.maxX, p.x);
      box.minY = Math.min(box.minY, p.y);
      box.maxY = Math.max(box.maxY, p.y);
    }
    polygonBounds.set(poly, box);
  }
  return box;
}
function cutsFor(
  poly: readonly TerrainPoint[],
  a: TerrainPoint,
  b: TerrainPoint,
  cuts: number[],
) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  for (let i = 0; i < poly.length; i++) {
    const c = poly[i],
      d = poly[(i + 1) % poly.length],
      ex = d.x - c.x,
      ey = d.y - c.y;
    const det = dx * ey - dy * ex;
    if (Math.abs(det) < 1e-10) continue;
    const t = ((c.x - a.x) * ey - (c.y - a.y) * ex) / det;
    const u = ((c.x - a.x) * dy - (c.y - a.y) * dx) / det;
    if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
  }
}
/** Swept tests split at every shoreline and bridge edge; no tunneling or global water exemption. */
export function blockedByTerrainLayout(
  layout: TerrainLayout | undefined,
  a: TerrainPoint,
  b = a,
  layer: "ground" | "air" = "ground",
) {
  if (!layout || layer === "air") return false;
  for (const obstacle of layout.obstacles) {
    const box = bounds(obstacle.polygon);
    if (
      Math.max(a.x, b.x) < box.minX ||
      Math.min(a.x, b.x) > box.maxX ||
      Math.max(a.y, b.y) < box.minY ||
      Math.min(a.y, b.y) > box.maxY
    )
      continue;
    const blocked = (p: TerrainPoint) =>
      polygonContains(obstacle.polygon, p) &&
      !(
        obstacle.kind === "water" &&
        layout.crossings.some((c) => polygonContains(c.polygon, p))
      );
    if (blocked(a) || blocked(b)) return true;
    const cuts = [0, 1];
    cutsFor(obstacle.polygon, a, b, cuts);
    if (obstacle.kind === "water")
      for (const bridge of layout.crossings)
        cutsFor(bridge.polygon, a, b, cuts);
    cuts.sort((x, y) => x - y);
    for (let i = 1; i < cuts.length; i++) {
      const t = (cuts[i - 1] + cuts[i]) / 2;
      if (blocked({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }))
        return true;
    }
  }
  return false;
}

/** Physical cover belongs to either side, only close to the solid edge facing incoming fire. */
export function terrainCover(
  region: Region | undefined,
  p: TerrainPoint & { movementLayer?: "ground" | "air" },
  source?: TerrainPoint,
) {
  if (
    !region?.terrainLayout ||
    p.movementLayer === "air" ||
    blockedByTerrainLayout(region.terrainLayout, p)
  )
    return false;
  return region.terrainLayout.obstacles.some(
    (o) =>
      o.kind !== "water" &&
      polygonDistance(o.polygon, p) <= 24 &&
      (!source ||
        blockedByTerrainLayout(
          { ...region.terrainLayout!, obstacles: [o], crossings: [] },
          p,
          source,
        )),
  );
}

export function clearsTerrainLayout(
  region: Region,
  p: TerrainPoint,
  radius: number,
) {
  return (
    !region.terrainLayout ||
    (region.terrainLayout.obstacles.every(
      (o) => polygonDistance(o.polygon, p) > radius,
    ) &&
      region.terrainLayout.crossings.every(
        (c) => polygonDistance(c.polygon, p) > radius,
      ))
  );
}

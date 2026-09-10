import type { CityRoad } from "./cityRoads.ts";
import type { FieldParcel } from "./landscape.ts";
/** Shared conservative footprints for decorative scenery around cultivated land and roads. */
export function landscapeClearance(
  fields: readonly FieldParcel[],
  roads: readonly CityRoad[],
  roadWidth: number,
) {
  const distance = (
    p: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
        ),
      );
    return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
  };
  const parcels = fields
    .flatMap((f) => (f.fragments ?? [f.points]).map((points) => ({ points })))
    .map((f) => ({
      points: f.points,
      minX: Math.min(...f.points.map((p) => p.x)),
      maxX: Math.max(...f.points.map((p) => p.x)),
      minY: Math.min(...f.points.map((p) => p.y)),
      maxY: Math.max(...f.points.map((p) => p.y)),
    }));
  const segments = roads.flatMap((r) =>
    r.points.slice(1).map((b, i) => ({
      a: r.points[i],
      b,
      half: roadWidth * (r.kind === "main" ? 1.6 : 1) * 1.05,
    })),
  );
  return (p: { x: number; y: number }, radius: number) => {
    if (segments.some((s) => distance(p, s.a, s.b) < radius + s.half))
      return false;
    for (const f of parcels) {
      if (
        p.x + radius < f.minX ||
        p.x - radius > f.maxX ||
        p.y + radius < f.minY ||
        p.y - radius > f.maxY
      )
        continue;
      let inside = false;
      for (let i = 0, j = f.points.length - 1; i < f.points.length; j = i++) {
        const a = f.points[i],
          b = f.points[j];
        if (distance(p, a, b) < radius) return false;
        if (
          a.y > p.y !== b.y > p.y &&
          p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
        )
          inside = !inside;
      }
      if (inside) return false;
    }
    return true;
  };
}

import type { MiniatureData } from "./miniatureData";
import { presentationRivers } from "./riverPresentation";
import { WORLD_TO_MODEL as S } from "./miniatureData";
type Point = { x: number; y: number };
/** Clip cosmetic road ribbons to dry banks. Raised bridge geometry is independent. */
export function riverRoadClipper(data: MiniatureData) {
  const rivers = presentationRivers(data).flatMap((r) =>
    r.slice(1).map((b, i) => [r[i], b] as const),
  );
  return (points: Point[], width: number): Point[][] => {
    const margin = (0.675 + width / 2) / S,
      step = 3,
      clearance = margin + step / 2;
    const minX = Math.min(...points.map((p) => p.x)) - clearance,
      maxX = Math.max(...points.map((p) => p.x)) + clearance,
      minY = Math.min(...points.map((p) => p.y)) - clearance,
      maxY = Math.max(...points.map((p) => p.y)) + clearance;
    const nearby = rivers.filter(
      ([a, b]) =>
        Math.max(a[0], b[0]) >= minX &&
        Math.min(a[0], b[0]) <= maxX &&
        Math.max(a[1], b[1]) >= minY &&
        Math.min(a[1], b[1]) <= maxY,
    );
    if (!nearby.length) return [points];
    const dry = (p: Point) =>
      nearby.every(([a, b]) => {
        const dx = b[0] - a[0],
          dy = b[1] - a[1],
          t = Math.max(
            0,
            Math.min(
              1,
              ((p.x - a[0]) * dx + (p.y - a[1]) * dy) /
                (dx * dx + dy * dy || 1),
            ),
          );
        return Math.hypot(p.x - a[0] - dx * t, p.y - a[1] - dy * t) > clearance;
      });
    const runs: Point[][] = [];
    let run: Point[] = [];
    const flush = () => {
      if (run.length > 1) runs.push([run[0], run[run.length - 1]]);
      run = [];
    };
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
      // Reset at bends so a ribbon cannot cut across a corner between sample segments.
      flush();
      for (let j = 0; j <= steps; j++) {
        const t = j / steps,
          p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        if (dry(p)) run.push(p);
        else flush();
      }
    }
    flush();
    return runs;
  };
}

import type { MiniatureData } from "./miniatureData";
type Point = [number, number];
/** Round visual bends inside the original polyline's corridor; preserve mouths and bridge approaches. */
export function presentationRivers(data: MiniatureData): Point[][] {
  const bridges = data.roads.flatMap((r) => r.bridges);
  return (data.world.geography?.rivers ?? []).map((river) => {
    if (river.length < 3) return river.map((p) => [p[0], p[1]]);
    const result: Point[] = [[...river[0]]];
    for (let i = 1; i < river.length - 1; i++) {
      const a = river[i - 1],
        b = river[i],
        c = river[i + 1];
      if (bridges.some((p) => Math.hypot(p.x - b[0], p.y - b[1]) < 36)) {
        result.push([b[0], b[1]]);
        continue;
      }
      // A bounded quadratic stays inside the corner triangle and cannot overshoot a bank.
      const start: Point = [
        b[0] + (a[0] - b[0]) * 0.28,
        b[1] + (a[1] - b[1]) * 0.28,
      ];
      const end: Point = [
        b[0] + (c[0] - b[0]) * 0.28,
        b[1] + (c[1] - b[1]) * 0.28,
      ];
      for (let j = 0; j <= 4; j++) {
        const t = j / 4,
          u = 1 - t;
        result.push([
          u * u * start[0] + 2 * u * t * b[0] + t * t * end[0],
          u * u * start[1] + 2 * u * t * b[1] + t * t * end[1],
        ]);
      }
    }
    result.push([...river[river.length - 1]]);
    return result;
  });
}

import earcut from "earcut";
import type { Region } from "./index.ts";
import type { CityPoint } from "./cityLayout.ts";
type P = CityPoint;
export const polygonArea = (p: P[]) =>
  Math.abs(
    p.reduce((sum, a, i) => {
      const b = p[(i + 1) % p.length];
      return sum + a.x * b.y - a.y * b.x;
    }, 0),
  ) / 2;
const bounds = (p: P[]) => ({
  minX: Math.min(...p.map((p) => p.x)),
  maxX: Math.max(...p.map((p) => p.x)),
  minY: Math.min(...p.map((p) => p.y)),
  maxY: Math.max(...p.map((p) => p.y)),
});
const overlaps = (a: ReturnType<typeof bounds>, b: ReturnType<typeof bounds>) =>
  a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
function halfPlane(poly: P[], a: P, b: P, inside: boolean): P[] {
  const result: P[] = [];
  const side = (p: P) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i],
      q = poly[(i + 1) % poly.length],
      u = side(p),
      v = side(q),
      pin = inside ? u >= 0 : u <= 0,
      qin = inside ? v >= 0 : v <= 0;
    if (pin) result.push(p);
    if (pin !== qin) {
      const t = u / (u - v);
      result.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return result;
}
function intersect(poly: P[], clip: P[]) {
  for (let i = 0; i < clip.length && poly.length; i++)
    poly = halfPlane(poly, clip[i], clip[(i + 1) % clip.length], true);
  return poly;
}
function subtract(poly: P[], clip: P[]) {
  const out: P[][] = [];
  for (let i = 0; i < clip.length && poly.length; i++) {
    const a = clip[i],
      b = clip[(i + 1) % clip.length],
      outside = halfPlane(poly, a, b, false);
    if (outside.length >= 3 && polygonArea(outside) > 0.01) out.push(outside);
    poly = halfPlane(poly, a, b, true);
  }
  return out;
}
export function farmCircle(x: number, y: number, radius: number): P[] {
  return Array.from({ length: 16 }, (_, i) => ({
    x: x + (Math.cos((i * Math.PI) / 8) * radius) / Math.cos(Math.PI / 16),
    y: y + (Math.sin((i * Math.PI) / 8) * radius) / Math.cos(Math.PI / 16),
  }));
}
export function farmCorridor(a: P, b: P, width: number): P[] {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    l = Math.hypot(dx, dy) || 1,
    nx = (-dy / l) * width,
    ny = (dx / l) * width;
  return [
    { x: a.x + nx, y: a.y + ny },
    { x: a.x - nx, y: a.y - ny },
    { x: b.x - nx, y: b.y - ny },
    { x: b.x + nx, y: b.y + ny },
  ];
}
/** Triangulation handles concave coasts and lake holes. Every resulting fragment is convex. */
export function farmClipper(region: Region, exclusions: P[][]) {
  const rings = region.contours ?? [region.polygon];
  const coords = rings.flatMap((r) => r.flat());
  let total = 0;
  const holes = rings.slice(0, -1).map((r) => (total += r.length));
  const indices = earcut(coords, holes),
    triangles: { poly: P[]; box: ReturnType<typeof bounds> }[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    let poly = indices
      .slice(i, i + 3)
      .map((k) => ({ x: coords[k * 2], y: coords[k * 2 + 1] }));
    triangles.push({ poly, box: bounds(poly) });
  }
  const masks = exclusions.map((poly) => ({ poly, box: bounds(poly) }));
  return (parcel: P[]) => {
    const box = bounds(parcel);
    let pieces = triangles
      .filter((t) => overlaps(t.box, box))
      .map((t) => intersect(t.poly, parcel))
      .filter((p) => p.length >= 3 && polygonArea(p) > 0.1);
    for (const mask of masks)
      if (overlaps(box, mask.box))
        pieces = pieces.flatMap((p) =>
          overlaps(bounds(p), mask.box) ? subtract(p, mask.poly) : [p],
        );
    return pieces.filter((p) => polygonArea(p) > 0.1);
  };
}

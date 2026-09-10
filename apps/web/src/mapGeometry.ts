import type { World } from "../../../packages/game-core/src/index";
import type { Point } from "../../../packages/game-core/src/geography";

export interface MapEdge {
  a: Point;
  b: Point;
  regions: number[];
}
export interface MapGeometry {
  rings: Point[][][];
  edges: MapEdge[];
}
const key = (p: Point) => p.map((n) => n.toFixed(4)).join(",");

/** Shared vertices make borders, hit areas and fills agree exactly, including junctions. */
export function mapGeometry(world: World): MapGeometry {
  const vertices = new Map<string, Point>();
  const neighbors = new Map<string, Set<string>>();
  const edges = new Map<string, { a: string; b: string; regions: number[] }>();
  const cell = world.geography?.cellSize ?? 8;
  const rings = world.regions.map((region) =>
    (region.contours ?? [region.polygon as Point[]]).map((ring) => {
      const ids: string[] = [];
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i],
          b = ring[(i + 1) % ring.length];
        const steps = region.contours
          ? Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / cell))
          : 1;
        for (let j = 0; j < steps; j++) {
          const p: Point = [
            a[0] + ((b[0] - a[0]) * j) / steps,
            a[1] + ((b[1] - a[1]) * j) / steps,
          ];
          const id = key(p);
          vertices.set(id, p);
          ids.push(id);
        }
      }
      for (let i = 0; i < ids.length; i++) {
        const a = ids[i],
          b = ids[(i + 1) % ids.length];
        for (const [from, to] of [
          [a, b],
          [b, a],
        ]) {
          const links = neighbors.get(from) ?? new Set<string>();
          links.add(to);
          neighbors.set(from, links);
        }
        const edgeKey = a < b ? `${a}|${b}` : `${b}|${a}`;
        const edge = edges.get(edgeKey);
        if (edge) {
          if (!edge.regions.includes(region.id)) edge.regions.push(region.id);
        } else edges.set(edgeKey, { a, b, regions: [region.id] });
      }
      return ids;
    }),
  );
  let positions = vertices;
  if (world.geography)
    for (let pass = 0; pass < 8; pass++) {
      const next = new Map(positions);
      for (const [id, links] of neighbors) {
        // Anchor every junction. Only degree-two points along a shared edge move.
        if (links.size !== 2) continue;
        const [a, b] = [...links].map((id) => positions.get(id)!);
        const p = positions.get(id)!,
          original = vertices.get(id)!;
        const target: Point = [
          (a[0] + p[0] * 2 + b[0]) / 4,
          (a[1] + p[1] * 2 + b[1]) / 4,
        ];
        // Small bounded visual correction protects narrow channels and land necks.
        const dx = target[0] - original[0],
          dy = target[1] - original[1];
        const amount = Math.min(1, (cell * 0.65) / (Math.hypot(dx, dy) || 1));
        next.set(id, [original[0] + dx * amount, original[1] + dy * amount]);
      }
      positions = next;
    }
  return {
    rings: rings.map((group) =>
      group.map((ring) => ring.map((id) => positions.get(id)!)),
    ),
    edges: [...edges.values()].map((e) => ({
      a: positions.get(e.a)!,
      b: positions.get(e.b)!,
      regions: e.regions,
    })),
  };
}

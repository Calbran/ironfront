import { visualScale } from "./visualScale.ts";
import type { World } from "./index.ts";
import type { Point } from "./geography.ts";
export interface ScenerySprite {
  x: number;
  y: number;
  width: number;
  variant: number;
  kind: "tree" | "rock";
}
export interface SceneryClearing {
  x: number;
  y: number;
  radius: number;
}

/** Cosmetic, seeded layout. Rasterizing once avoids testing every sprite against every contour. */
export function generateBiomeScenery(
  world: World,
  clearings: readonly SceneryClearing[] = [],
): ScenerySprite[] {
  const cell = world.geography?.cellSize ?? 8;
  const sizes = visualScale(world);
  const width =
    world.geography?.width ?? Math.max(...world.regions.map((r) => r.x)) * 1.5;
  const height =
    world.geography?.height ?? Math.max(...world.regions.map((r) => r.y)) * 1.5;
  const cols = Math.ceil(width / cell),
    rows = Math.ceil(height / cell);
  const land = new Uint8Array(cols * rows),
    biomes = new Uint8Array(cols * rows);
  const codes = { plains: 1, forest: 2, highlands: 3, mountains: 4 };
  function paint(rings: number[][][], grid: Uint8Array, code: number) {
    const points = rings.flat();
    if (!points.length) return;
    const low = Math.max(
      0,
      Math.floor(Math.min(...points.map((p) => p[1])) / cell),
    );
    const high = Math.min(
      rows - 1,
      Math.ceil(Math.max(...points.map((p) => p[1])) / cell),
    );
    for (let row = low; row <= high; row++) {
      const y = (row + 0.5) * cell,
        hits: number[] = [];
      for (const ring of rings)
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const a = ring[i],
            b = ring[j];
          if (a[1] > y !== b[1] > y)
            hits.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
        }
      hits.sort((a, b) => a - b);
      for (let i = 0; i + 1 < hits.length; i += 2)
        grid.fill(
          code,
          row * cols + Math.max(0, Math.ceil(hits[i] / cell - 0.5)),
          row * cols + Math.min(cols, Math.ceil(hits[i + 1] / cell - 0.5)),
        );
    }
  }
  for (const r of world.regions) {
    const rings = r.contours ?? [r.polygon];
    paint(rings, land, 1);
    paint(rings, biomes, codes[r.terrain]);
  }
  for (const patch of world.geography?.terrainPatches ?? [])
    paint(patch.contours, biomes, codes[patch.terrain]);
  for (const r of world.regions) if(r.terrainLayout) paint(r.contours??[r.polygon],biomes,0);
  const sample = (x: number, y: number) => {
    const c = Math.floor(x / cell),
      r = Math.floor(y / cell);
    return c < 0 || r < 0 || c >= cols || r >= rows || !land[r * cols + c]
      ? 0
      : biomes[r * cols + c];
  };
  // Mark river corridors once, including between sampled river vertices.
  const water = new Uint8Array(cols * rows);
  for (const river of world.geography?.rivers ?? [])
    for (let i = 1; i < river.length; i++) {
      const a = river[i - 1],
        b = river[i],
        steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / cell);
      for (let j = 0; j <= steps; j++) {
        const t = steps ? j / steps : 0,
          c = Math.floor((a[0] + (b[0] - a[0]) * t) / cell),
          r = Math.floor((a[1] + (b[1] - a[1]) * t) / cell);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (c + dx >= 0 && c + dx < cols && r + dy >= 0 && r + dy < rows)
              water[(r + dy) * cols + c + dx] = 1;
      }
    }
  let seed = 2166136261;
  for (const c of world.seed)
    seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  const noise = (x: number, y: number, salt: number) => {
    let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed ^ salt;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const out: ScenerySprite[] = [];
  for (const kind of ["tree", "rock"] as const) {
    const step = kind === "tree" ? sizes.treeSpacing : cell * 11;
    for (let row = 0; row * step < height; row++)
      for (let col = 0; col * step < width; col++) {
        const x = (col + 0.2 + noise(col, row, 1) * 0.6) * step,
          y = (row + 0.2 + noise(col, row, 2) * 0.6) * step;
        const biome = sample(x, y);
        if (kind === "tree" ? biome !== 2 : biome !== 3 && biome !== 4)
          continue;
        const density =
          kind === "tree"
            ? 0.72 +
              0.24 * Math.sin(x / (cell * 17)) * Math.cos(y / (cell * 19))
            : biome === 4
              ? 0.86
              : 0.23;
        if (noise(col, row, 3) > density) continue;
        const size =
          (kind === "tree" ? sizes.tree : sizes.mountain) *
          (0.75 + noise(col, row, 4) * 0.5);
        const half = size * 0.55;
        // A conservative envelope keeps art off sea, biome edges and river beds.
        const probes: Point[] = [
          [x, y],
          [x - half, y - half],
          [x + half, y - half],
          [x - half, y + half],
          [x + half, y + half],
        ];
        if (
          probes.some(
            ([px, py]) =>
              sample(px, py) !== biome ||
              water[Math.floor(py / cell) * cols + Math.floor(px / cell)],
          )
        )
          continue;
        if (
          clearings.some((p) => Math.hypot(p.x - x, p.y - y) < p.radius + half)
        )
          continue;
        out.push({
          x,
          y,
          width: size,
          kind,
          variant:
            kind === "tree"
              ? Math.floor(noise(col, row, 5) * 4)
              : biome === 3
                ? 6 + Math.floor(noise(col, row, 5) * 2)
                : 4 + Math.floor(noise(col, row, 5) * 4),
        });
      }
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}

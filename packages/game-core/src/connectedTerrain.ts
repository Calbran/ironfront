import type { World } from "./index";
import { noise } from "./relief";
import type { RuralReserve } from "./pacingCountryside";

type Point = { x: number; y: number };
export type TerrainRange = Point & {
  id: string;
  name: string;
  radius: number;
  height: number;
  mountain: boolean;
};
/** Logical XY, model-unit heights. Shared lattice independent of territory borders. */
export type TerrainSurface = {
  version: 1;
  seed: string;
  scale: number;
  step: number;
  cols: number;
  rows: number;
  heights: Float32Array;
  land: Uint8Array;
  biomes: Uint8Array;
  mountainWeight: Float32Array;
  ranges: TerrainRange[];
  peak: number;
};
const kinds = { plains: 1, forest: 2, highlands: 3, mountains: 4 };
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};

/** Even/odd scan conversion preserves holes in land contours. */
function rasterize(
  rings: number[][][],
  cols: number,
  rows: number,
  step: number,
  write: (i: number) => void,
) {
  let minY = rows - 1,
    maxY = 0;
  for (const ring of rings)
    for (const p of ring) {
      minY = Math.min(minY, Math.ceil(p[1] / step));
      maxY = Math.max(maxY, Math.floor(p[1] / step));
    }
  for (let row = Math.max(0, minY); row <= Math.min(rows - 1, maxY); row++) {
    const y = row * step,
      crossings: number[] = [];
    for (const ring of rings)
      for (let j = 0; j < ring.length; j++) {
        const a = ring[j],
          b = ring[(j + 1) % ring.length];
        if (a[1] > y !== b[1] > y)
          crossings.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
    crossings.sort((a, b) => a - b);
    for (let j = 0; j + 1 < crossings.length; j += 2)
      for (
        let x = Math.max(0, Math.ceil(crossings[j] / step));
        x < cols && x * step < crossings[j + 1];
        x++
      )
        write(row * cols + x);
  }
}

/** Eight-neighbour distance transform, in lattice cells. */
function distance(mask: Uint8Array, cols: number, rows: number) {
  const d = Float32Array.from(mask, (v) => (v ? 0 : 1e6));
  for (const direction of [1, -1]) {
    for (let yy = 0; yy < rows; yy++)
      for (let xx = 0; xx < cols; xx++) {
        const x = direction === 1 ? xx : cols - 1 - xx,
          y = direction === 1 ? yy : rows - 1 - yy,
          i = y * cols + x;
        for (const [dx, dy] of [
          [-direction, 0],
          [0, -direction],
          [-1, -direction],
          [1, -direction],
        ]) {
          const nx = x + dx,
            ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < cols && ny < rows)
            d[i] = Math.min(
              d[i],
              d[ny * cols + nx] + (dx && dy ? Math.SQRT2 : 1),
            );
        }
      }
  }
  return d;
}

/** Preview terrain foundation: no save mutation or authoritative mountain shortcuts. */
export function buildConnectedTerrain(
  world: World,
  scale: number,
  reserves: readonly RuralReserve[] = [],
  corridors: readonly Point[][] = [],
): TerrainSurface {
  if (!(Number.isFinite(scale) && scale > 0))
    throw Error("Invalid terrain scale");
  const points = world.regions.flatMap((r) => r.polygon);
  const width =
    world.geography?.width ?? Math.max(...points.map((p) => p[0])) + 1;
  const height =
    world.geography?.height ?? Math.max(...points.map((p) => p[1])) + 1;
  const step = Math.max(width, height) / 512,
    cols = Math.ceil(width / step) + 1,
    rows = Math.ceil(height / step) + 1;
  const count = cols * rows,
    biomes = new Uint8Array(count),
    land = new Uint8Array(count);
  for (const r of world.regions)
    rasterize(r.contours ?? [r.polygon], cols, rows, step, (i) => {
      land[i] = 1;
      biomes[i] = kinds[r.terrain];
    });
  // Original biome patches follow the geography beneath administrative regions.
  for (const patch of world.geography?.terrainPatches ?? [])
    rasterize(patch.contours, cols, rows, step, (i) => {
      if (land[i]) biomes[i] = kinds[patch.terrain];
    });
  const mountain = Uint8Array.from(biomes, (v) => Number(v === 4)),
    upland = Uint8Array.from(biomes, (v) => Number(v >= 3));
  const coast = distance(
    Uint8Array.from(land, (v) => Number(!v)),
    cols,
    rows,
  );
  const fromMountain = distance(mountain, cols, rows),
    fromUpland = distance(upland, cols, rows);
  const inMountain = distance(
    Uint8Array.from(mountain, (v) => Number(!v)),
    cols,
    rows,
  );
  const inUpland = distance(
    Uint8Array.from(upland, (v) => Number(!v)),
    cols,
    rows,
  );
  const clearance = new Float32Array(count).fill(1);
  const carve = (a: Point, b: Point, radius: number) => {
    // Pad interpolation cells so sub-grid buildings/roads stay above the surface.
    const inner = radius + step * Math.SQRT2,
      outer = inner + step * 5;
    const left = Math.max(0, Math.floor((Math.min(a.x, b.x) - outer) / step)),
      right = Math.min(
        cols - 1,
        Math.ceil((Math.max(a.x, b.x) + outer) / step),
      );
    const top = Math.max(0, Math.floor((Math.min(a.y, b.y) - outer) / step)),
      bottom = Math.min(
        rows - 1,
        Math.ceil((Math.max(a.y, b.y) + outer) / step),
      );
    const dx = b.x - a.x,
      dy = b.y - a.y,
      len2 = dx * dx + dy * dy;
    for (let y = top; y <= bottom; y++)
      for (let x = left; x <= right; x++) {
        const t = len2
          ? clamp(((x * step - a.x) * dx + (y * step - a.y) * dy) / len2)
          : 0;
        const d = Math.hypot(x * step - a.x - t * dx, y * step - a.y - t * dy),
          i = y * cols + x;
        clearance[i] = Math.min(
          clearance[i],
          smooth((d - inner) / (outer - inner)),
        );
      }
  };
  for (const r of reserves) carve(r, r, r.radius);
  for (const river of world.geography?.rivers ?? [])
    for (let i = 1; i < river.length; i++)
      carve(
        { x: river[i - 1][0], y: river[i - 1][1] },
        { x: river[i][0], y: river[i][1] },
        12 / scale,
      );
  for (const path of corridors)
    for (let i = 1; i < path.length; i++)
      carve(path[i - 1], path[i], 10 / scale);
  let seed = 2166136261;
  for (const c of world.seed)
    seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  const heights = new Float32Array(count),
    mountainWeight = new Float32Array(count);
  const amplitude = Math.max(width, height) * scale * 0.025;
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      if (!land[i]) continue;
      const x = col / 512,
        y = row / 512;
      const wx = x * 13 + (noise(x * 9, y * 9, seed) - 0.5) * 2.4;
      const wy = y * 13 + (noise(x * 9 + 31, y * 9, seed + 1) - 0.5) * 2.4;
      const m = smooth((inMountain[i] - fromMountain[i] + 16) / 28),
        h = smooth((inUpland[i] - fromUpland[i] + 12) / 24);
      const ridge =
        (1 - Math.abs(noise(wx * 2, wy * 2, seed + 2) * 2 - 1)) ** 2;
      const secondary =
        (1 - Math.abs(noise(wx * 5, wy * 5, seed + 3) * 2 - 1)) ** 2;
      const detail = noise(wx * 14, wy * 14, seed + 4),
        rolling = 0.3 + 0.7 * noise(wx * 1.4, wy * 1.4, seed + 5);
      mountainWeight[i] = m;
      // Continuous country-relative ridges, broad foothills and river valleys.
      heights[i] =
        amplitude *
        (m * (0.25 + 0.47 * ridge + 0.21 * secondary + 0.07 * detail) +
          (1 - m) * h * 0.17 * rolling) *
        smooth((coast[i] - 1.5) / 6) *
        clearance[i];
    }
  const surface: TerrainSurface = {
    version: 1,
    seed: world.seed,
    scale,
    step,
    cols,
    rows,
    heights,
    land,
    biomes,
    mountainWeight,
    ranges: [],
    peak: heights.reduce((a, b) => Math.max(a, b), 0),
  };
  const seen = new Uint8Array(count);
  for (let start = 0; start < count; start++) {
    if (seen[start] || biomes[start] < 3) continue;
    const queue = [start];
    seen[start] = 1;
    let minX = cols,
      maxX = 0,
      minY = rows,
      maxY = 0,
      summit = start,
      isMountain = false;
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q],
        x = i % cols,
        y = Math.floor(i / cols);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      isMountain ||= biomes[i] === 4;
      if (heights[i] > heights[summit]) summit = i;
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          n = ny * cols + nx;
        if (
          nx < 0 ||
          ny < 0 ||
          nx >= cols ||
          ny >= rows ||
          seen[n] ||
          biomes[n] !== biomes[start]
        )
          continue;
        seen[n] = 1;
        queue.push(n);
      }
    }
    if (queue.length < 8 || heights[summit] < 1) continue;
    const sx = (summit % cols) * step,
      sy = Math.floor(summit / cols) * step;
    const nearest = world.regions.reduce((a, b) =>
      Math.hypot(a.x - sx, a.y - sy) < Math.hypot(b.x - sx, b.y - sy) ? a : b,
    );
    surface.ranges.push({
      id: `range-${start}`,
      name: `${nearest.name} ${isMountain ? "range" : "uplands"}`,
      x: ((minX + maxX) * step) / 2,
      y: ((minY + maxY) * step) / 2,
      radius: (Math.hypot(maxX - minX + 12, maxY - minY + 12) * step) / 2,
      height: heights[summit],
      mountain: isMountain,
    });
  }
  surface.ranges.sort(
    (a, b) => Number(b.mountain) - Number(a.mountain) || b.radius - a.radius,
  );
  return surface;
}

/** Same diagonal triangles as the rendered surface; no separate visual height rule. */
export function terrainHeight(
  surface: TerrainSurface,
  x: number,
  y: number,
): number {
  const gx = x / surface.step,
    gy = y / surface.step;
  if (gx < 0 || gy < 0 || gx >= surface.cols - 1 || gy >= surface.rows - 1)
    return 0;
  const col = Math.floor(gx),
    row = Math.floor(gy),
    u = gx - col,
    v = gy - row;
  const i = row * surface.cols + col,
    h = surface.heights;
  return u + v <= 1
    ? h[i] + u * (h[i + 1] - h[i]) + v * (h[i + surface.cols] - h[i])
    : h[i + surface.cols + 1] +
        (1 - u) * (h[i + surface.cols] - h[i + surface.cols + 1]) +
        (1 - v) * (h[i + 1] - h[i + surface.cols + 1]);
}

/** Rise/run for future physical route validation; not campaign movement authority. */
export function terrainGrade(
  surface: TerrainSurface,
  x: number,
  y: number,
): number {
  const d = surface.step / 4;
  return (
    Math.hypot(
      terrainHeight(surface, x + d, y) - terrainHeight(surface, x - d, y),
      terrainHeight(surface, x, y + d) - terrainHeight(surface, x, y - d),
    ) /
    (2 * d * surface.scale)
  );
}

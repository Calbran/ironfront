import { Delaunay } from "d3-delaunay";
import type { Region } from "./index.ts";

export type Point = [number, number];
export interface Province {
  id: number;
  name: string;
  center: Point;
  regions: number[];
}
export interface Geography {
  version: 1;
  width: number;
  height: number;
  cellSize: number;
  coastlines: Point[][];
  islands: Point[][];
  rivers: Point[][];
  ridges: Point[][];
  provinces: Province[];
}
export interface GeographicRegion extends Region {
  province: number;
  elevation: number;
  moisture: number;
  coastal: boolean;
  contours: Point[][];
}
const W = 2400,
  H = 1600,
  S = 8,
  COLS = W / S,
  ROWS = H / S;
function randomSeed(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(x: number, y: number, s: number) {
  let v = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ s;
  v = Math.imul(v ^ (v >>> 13), 1274126177);
  return ((v ^ (v >>> 16)) >>> 0) / 4294967295;
}
function noise(x: number, y: number, seed: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  let tx = x - ix,
    ty = y - iy;
  tx = tx * tx * (3 - 2 * tx);
  ty = ty * ty * (3 - 2 * ty);
  return (
    (hash(ix, iy, seed) * (1 - tx) + hash(ix + 1, iy, seed) * tx) * (1 - ty) +
    (hash(ix, iy + 1, seed) * (1 - tx) + hash(ix + 1, iy + 1, seed) * tx) * ty
  );
}
function ellipse(
  x: number,
  y: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
) {
  return 1 - Math.hypot((x - cx) / rx, (y - cy) / ry);
}
export function signedArea(points: number[][]) {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i],
      q = points[(i + 1) % points.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}
// Trace exact shared raster edges. Adjacent territories share their land boundaries.
function trace(labels: Int32Array, value: number): Point[][] {
  const edges = new Map<number, number[]>(),
    stride = COLS + 1;
  const add = (a: number, b: number) => {
    const list = edges.get(a) || [];
    list.push(b);
    edges.set(a, list);
  };
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x;
      if (labels[i] !== value) continue;
      const a = y * stride + x;
      if (y === 0 || labels[i - COLS] !== value) add(a, a + 1);
      if (x === COLS - 1 || labels[i + 1] !== value) add(a + 1, a + 1 + stride);
      if (y === ROWS - 1 || labels[i + COLS] !== value)
        add(a + 1 + stride, a + stride);
      if (x === 0 || labels[i - 1] !== value) add(a + stride, a);
    }
  const rings: Point[][] = [];
  while (edges.size) {
    const start = edges.keys().next().value!;
    let at = start,
      previous = -1;
    const ring: Point[] = [];
    let guard = 0;
    do {
      ring.push([(at % stride) * S, Math.floor(at / stride) * S]);
      const options = edges.get(at);
      if (!options?.length) break;
      let index = 0;
      if (options.length > 1 && previous >= 0) {
        const dx = (at % stride) - (previous % stride),
          dy = Math.floor(at / stride) - Math.floor(previous / stride);
        let best = -Infinity;
        options.forEach((next, j) => {
          const nx = (next % stride) - (at % stride),
            ny = Math.floor(next / stride) - Math.floor(at / stride);
          const score =
            dx * ny - dy * nx === 1 ? 3 : dx * nx + dy * ny === 1 ? 2 : 1;
          if (score > best) {
            best = score;
            index = j;
          }
        });
      }
      const next = options.splice(index, 1)[0];
      if (!options.length) edges.delete(at);
      previous = at;
      at = next;
    } while (at !== start && ++guard < COLS * ROWS * 4);
    if (ring.length > 3) {
      const simple = ring.filter((p, i) => {
        const a = ring[(i + ring.length - 1) % ring.length],
          b = ring[(i + 1) % ring.length];
        return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
      });
      rings.push(simple);
    }
  }
  return rings.sort(
    (a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)),
  );
}
export function smooth(ring: Point[], passes = 2): Point[] {
  let points = ring;
  for (let k = 0; k < passes; k++) {
    const out: Point[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length];
      out.push(
        [a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25],
        [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75],
      );
    }
    points = out;
  }
  return points;
}
const provinceNames = [
  "Northwall",
  "Veyren Coast",
  "The Marches",
  "Greywater",
  "Aurelian Basin",
  "Dornwald",
  "Sable Reach",
  "Valenne",
  "Eastmere",
  "The Ironspine",
  "Low Arden",
  "Kestrel Highlands",
  "Southwatch",
  "Bracken Coast",
  "Velden",
  "Harrow Plain",
  "Windward",
  "Ostland",
  "The Fens",
  "Redwater",
  "Boreal Reach",
  "Corven",
  "Westfold",
  "The Pale Coast",
  "Calder",
  "High Voss",
  "Ashen Vale",
  "Severin",
  "Lorn",
  "Coldwater",
  "Dunmere",
  "Eastern Crown",
];
const townPrefixes = [
  "Alder",
  "Bracken",
  "Cinder",
  "Dorn",
  "Eisen",
  "Fair",
  "Grey",
  "Harrow",
  "Iron",
  "Kestrel",
  "Lorn",
  "Marsh",
  "North",
  "Ost",
  "Pale",
  "Raven",
  "South",
  "Stone",
  "Thorn",
  "Val",
  "West",
  "White",
  "Wind",
  "Wolfs",
];
const townSuffixes = [
  "wick",
  "haven",
  "ford",
  "bridge",
  "moor",
  "vale",
  "reach",
  "march",
  "ridge",
  "port",
  "field",
  "gate",
  "bank",
  "crest",
  "fall",
  "wood",
  "heath",
  "fen",
  "holm",
  "cross",
  "bury",
  "mere",
  "wald",
  "brook",
];
export function generateContinent(
  seed: string,
  seats: number,
): { regions: GeographicRegion[]; geography: Geography } {
  const random = randomSeed(seed),
    salt = Math.floor(random() * 0x7fffffff),
    phase = random() * 6.28;
  const land = new Int32Array(COLS * ROWS).fill(-1),
    heights = new Float32Array(COLS * ROWS),
    wetness = new Float32Array(COLS * ROWS);
  const ridges: Point[][] = [[], []];
  for (let j = 0; j < 2; j++)
    for (let i = 0; i < 52; i++) {
      const t = i / 51;
      const x = 550 + t * 1430;
      const y =
        (j === 0 ? 460 : 1000) +
        Math.sin(t * 5 + phase + j) * 120 +
        (noise(t * 8, j, salt) - 0.5) * 100;
      ridges[j].push([x, y]);
    }
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const px = (x + 0.5) * S,
        py = (y + 0.5) * S;
      let u = (px - W / 2) / (W * 0.46),
        v = (py - H / 2) / (H * 0.46);
      u += (noise(px / 420, py / 420, salt) - 0.5) * 0.15;
      v += (noise(px / 330, py / 330, salt + 1) - 0.5) * 0.13;
      let f = Math.max(
        ellipse(u, v, -0.13, -0.04, 0.63, 0.7),
        ellipse(u, v, 0.4, -0.05, 0.46, 0.55),
        ellipse(u, v, -0.17, 0.57, 0.24, 0.35),
        ellipse(u, v, -0.66, 0.02, 0.32, 0.22),
        ellipse(u, v, 0.52, -0.58, 0.21, 0.29),
      );
      f +=
        (noise(px / 130, py / 130, salt + 2) - 0.5) * 0.16 +
        (noise(px / 38, py / 38, salt + 3) - 0.5) * 0.08;
      // Bays penetrate the coast; the inland sea is a genuine hole in playable land.
      f = Math.min(
        f,
        -ellipse(u, v, 0.19, 0.61, 0.23, 0.37),
        -ellipse(u, v, -0.39, -0.64, 0.16, 0.26),
        -ellipse(u, v, 0.36, 0.03, 0.105, 0.135),
      );
      let distance = 10000;
      for (const ridge of ridges)
        for (const p of ridge)
          distance = Math.min(distance, Math.hypot(px - p[0], py - p[1]));
      const i = y * COLS + x;
      heights[i] = Math.min(
        1,
        0.13 +
          Math.exp((-distance * distance) / 15000) * 0.78 +
          noise(px / 100, py / 100, salt + 7) * 0.16,
      );
      wetness[i] =
        noise(px / 300, py / 300, salt + 11) * 0.65 +
        noise(px / 85, py / 85, salt + 8) * 0.35;
      if (f > 0) land[i] = 1;
    }
  // Only the connected mainland is playable until naval transport exists.
  const seen = new Uint8Array(land.length),
    components: number[][] = [];
  const neighbors = (i: number) =>
    [
      i % COLS ? i - 1 : -1,
      i % COLS < COLS - 1 ? i + 1 : -1,
      i >= COLS ? i - COLS : -1,
      i < land.length - COLS ? i + COLS : -1,
    ].filter((n) => n >= 0);
  for (let i = 0; i < land.length; i++)
    if (land[i] === 1 && !seen[i]) {
      const q = [i];
      seen[i] = 1;
      for (let k = 0; k < q.length; k++)
        for (const n of neighbors(q[k]))
          if (land[n] === 1 && !seen[n]) {
            seen[n] = 1;
            q.push(n);
          }
      components.push(q);
    }
  components.sort((a, b) => b.length - a.length);
  const mainland = components[0];
  land.fill(-1);
  mainland.forEach((i) => (land[i] = 1));
  const coastlines = trace(land, 1).map((r) => smooth(r));
  const islands: Point[][] = [];
  for (const c of components.slice(1).filter((c) => c.length >= 5)) {
    const mask = new Int32Array(land.length).fill(-1);
    c.forEach((i) => (mask[i] = 1));
    islands.push(
      ...trace(mask, 1)
        .filter((r) => signedArea(r) > 0)
        .map((r) => smooth(r)),
    );
  }
  // Small offshore island chains, kept separate from ownership and land victory.
  for (let chain = 0; chain < 3; chain++) {
    const angle = phase + chain * 2.1;
    for (let k = 0; k < 7; k++) {
      const cx = W / 2 + Math.cos(angle + k * 0.04) * (W * 0.44 + k * 4),
        cy = H / 2 + Math.sin(angle + k * 0.04) * (H * 0.44 + k * 6);
      if (cx < 30 || cx > W - 30 || cy < 30 || cy > H - 30) continue;
      const ix = Math.floor(cx / S),
        iy = Math.floor(cy / S);
      if (land[iy * COLS + ix] === 1) continue;
      const radius = 5 + random() * 13;
      const ring: Point[] = [];
      for (let j = 0; j < 12; j++) {
        const a = (j / 12) * Math.PI * 2,
          rr = radius * (0.6 + random() * 0.6);
        ring.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.65]);
      }
      islands.push(smooth(ring));
    }
  }
  const count = Math.max(72, seats * 24),
    candidates = mainland.filter((_, i) => i % 4 === 0),
    distances = new Float64Array(candidates.length).fill(Infinity),
    sites: Point[] = [];
  let choice = Math.floor(random() * candidates.length);
  for (let k = 0; k < count; k++) {
    const cell = candidates[choice];
    const p: Point = [
      ((cell % COLS) + 0.5) * S,
      (Math.floor(cell / COLS) + 0.5) * S,
    ];
    sites.push(p);
    let max = -1;
    for (let j = 0; j < candidates.length; j++) {
      const c = candidates[j],
        dx = ((c % COLS) + 0.5) * S - p[0],
        dy = (Math.floor(c / COLS) + 0.5) * S - p[1];
      distances[j] = Math.min(distances[j], dx * dx + dy * dy);
      const score = distances[j] * (0.8 + hash(j, k, salt) * 0.4);
      if (score > max) {
        max = score;
        choice = j;
      }
    }
  }
  const delaunay = Delaunay.from(sites),
    labels = new Int32Array(land.length).fill(-1);
  let hint = 0;
  for (const i of mainland) {
    hint = delaunay.find(
      ((i % COLS) + 0.5) * S,
      (Math.floor(i / COLS) + 0.5) * S,
      hint,
    );
    labels[i] = hint;
  }
  // A nearest-site cell can straddle a bay. Reassign disconnected fragments to adjacent territory.
  for (let pass = 0; pass < 4; pass++) {
    const visited = new Uint8Array(labels.length);
    let changed = false;
    for (let id = 0; id < count; id++) {
      const anchor =
          Math.floor(sites[id][1] / S) * COLS + Math.floor(sites[id][0] / S),
        q = [anchor];
      visited[anchor] = 1;
      for (let k = 0; k < q.length; k++)
        for (const n of neighbors(q[k]))
          if (labels[n] === id && !visited[n]) {
            visited[n] = 1;
            q.push(n);
          }
    }
    for (const i of mainland)
      if (!visited[i]) {
        const n = neighbors(i).find((n) => visited[n] && labels[n] >= 0);
        if (n !== undefined) {
          labels[i] = labels[n];
          visited[i] = 1;
          changed = true;
        }
      }
    if (!changed) break;
  }
  const cells: number[][] = Array.from({ length: count }, () => []),
    adj = Array.from({ length: count }, () => new Set<number>());
  for (const i of mainland) {
    const id = labels[i];
    cells[id].push(i);
    for (const n of neighbors(i))
      if (labels[n] >= 0 && labels[n] !== id) adj[id].add(labels[n]);
  }
  const regions: GeographicRegion[] = sites.map((p, id) => {
    const own = cells[id],
      contours = trace(labels, id);
    let e = 0,
      m = 0;
    for (const i of own) {
      e += heights[i];
      m += wetness[i];
    }
    e /= own.length;
    m /= own.length;
    return {
      id,
      name:
        townPrefixes[id % 24] +
        townSuffixes[Math.floor(id / 24) % 24] +
        (id >= 576 ? " Heights" : ""),
      x: p[0],
      y: p[1],
      polygon: contours[0],
      contours,
      area: own.length * S * S,
      neighbors: [...adj[id]].sort((a, b) => a - b),
      terrain: e > 0.52 ? "highlands" : m > 0.52 ? "forest" : "plains",
      elevation: e,
      moisture: m,
      coastal: own.some((i) => neighbors(i).some((n) => labels[n] < 0)),
      province: -1,
      owner: null,
      garrison: 18 + Math.floor(random() * 10),
      consolidation: 0,
      building: null,
      construction: null,
    };
  });
  // Impassable peaks never sever the connected playable mainland: leave navigable highland passes.
  const blocked = new Set<number>();
  for (const r of [...regions]
    .filter((r) => r.elevation > 0.78)
    .sort((a, b) => b.elevation - a.elevation)) {
    blocked.add(r.id);
    const start = regions.find((r) => !blocked.has(r.id))!.id,
      visit = new Set([start]),
      q = [start];
    for (let k = 0; k < q.length; k++)
      for (const n of regions[q[k]].neighbors)
        if (!blocked.has(n) && !visit.has(n)) {
          visit.add(n);
          q.push(n);
        }
    if (visit.size !== regions.length - blocked.size) blocked.delete(r.id);
  }
  for (const id of blocked) {
    regions[id].terrain = "mountains";
    regions[id].garrison = 0;
    regions[id].name += " Peaks";
  }
  // Contiguous provinces are administrative groups over the finer conquest territories.
  const provinceCount = seats * 2,
    provinceSeeds = [0];
  while (provinceSeeds.length < provinceCount) {
    let best = 0,
      score = -1;
    for (const r of regions) {
      const distance = Math.min(
        ...provinceSeeds.map((id) =>
          Math.hypot(r.x - regions[id].x, r.y - regions[id].y),
        ),
      );
      if (distance > score) {
        best = r.id;
        score = distance;
      }
    }
    provinceSeeds.push(best);
  }
  const q = provinceSeeds.map((id, p) => {
    regions[id].province = p;
    return id;
  });
  for (let k = 0; k < q.length; k++)
    for (const n of regions[q[k]].neighbors)
      if (regions[n].province === -1) {
        regions[n].province = regions[q[k]].province;
        q.push(n);
      }
  const provinces = provinceSeeds.map((_, id) => {
    const members = regions.filter((r) => r.province === id);
    return {
      id,
      name: provinceNames[id],
      center: [
        members.reduce((s, r) => s + r.x, 0) / members.length,
        members.reduce((s, r) => s + r.y, 0) / members.length,
      ] as Point,
      regions: members.map((r) => r.id),
    };
  });
  // Flood outward from sea outlets. The drainage parent follows low terrain,
  // with diagonal steps and a small slope through basins to avoid cycles.
  const distance = new Int32Array(land.length).fill(-1),
    downhill = new Int32Array(land.length).fill(-1),
    flooded = new Float64Array(land.length).fill(Infinity),
    heap: { cell: number; level: number }[] = [];
  const push = (cell: number, level: number) => {
    let at = heap.length;
    heap.push({ cell, level });
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if (heap[parent].level <= level) break;
      heap[at] = heap[parent];
      at = parent;
    }
    heap[at] = { cell, level };
  };
  const pop = () => {
    const first = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      let at = 0;
      while (at * 2 + 1 < heap.length) {
        let child = at * 2 + 1;
        if (
          child + 1 < heap.length &&
          heap[child + 1].level < heap[child].level
        )
          child++;
        if (heap[child].level >= last.level) break;
        heap[at] = heap[child];
        at = child;
      }
      heap[at] = last;
    }
    return first;
  };
  for (const i of mainland.filter((i) =>
    neighbors(i).some((n) => land[n] < 0),
  )) {
    flooded[i] = heights[i];
    distance[i] = 0;
    push(i, flooded[i]);
  }
  while (heap.length) {
    const { cell: i, level } = pop();
    if (level !== flooded[i]) continue;
    const x = i % COLS,
      y = Math.floor(i / COLS);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (
          (!dx && !dy) ||
          x + dx < 0 ||
          x + dx >= COLS ||
          y + dy < 0 ||
          y + dy >= ROWS
        )
          continue;
        const n = i + dy * COLS + dx;
        if (
          land[n] !== 1 ||
          (dx && dy && (land[i + dx] !== 1 || land[i + dy * COLS] !== 1))
        )
          continue;
        const next = Math.max(
          heights[n],
          level +
            Math.hypot(dx, dy) * (0.0008 + hash(x + dx, y + dy, salt) * 0.0004),
        );
        if (next >= flooded[n]) continue;
        flooded[n] = next;
        distance[n] = distance[i] + 1;
        downhill[n] = i;
        push(n, next);
      }
  }
  const rivers: Point[][] = [],
    sources = mainland
      .filter((i) => heights[i] > 0.68 && distance[i] > 14)
      .sort((a, b) => distance[b] - distance[a]),
    used: number[] = [];
  for (const source of sources) {
    if (
      used.some(
        (i) =>
          Math.hypot(
            (i % COLS) - (source % COLS),
            Math.floor(i / COLS) - Math.floor(source / COLS),
          ) < 24,
      )
    )
      continue;
    const points: Point[] = [];
    let at = source;
    while (at >= 0) {
      points.push([((at % COLS) + 0.5) * S, (Math.floor(at / COLS) + 0.5) * S]);
      at = downhill[at];
    }
    if (points.length > 15) {
      rivers.push(points);
      used.push(source);
    }
    if (rivers.length >= 14) break;
  }
  return {
    regions,
    geography: {
      version: 1,
      width: W,
      height: H,
      cellSize: S,
      coastlines,
      islands,
      rivers,
      ridges,
      provinces,
    },
  };
}

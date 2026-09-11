import { generateTerrainLayouts, supportsSettlement } from "./terrainLayoutGenerator.ts";
import { GENERATED_WORLD_SCALE } from "./campaignScale.ts";
import { openEnclosedTerritories } from "./territoryPartition.ts";
import { noise, generateRelief } from "./relief.ts";
import type { Region } from "./index.ts";
import { placeSettlements, type PlacedSettlement, type SettlementSite } from "./settlementPlacement.ts";

export type Point = [number, number];
export interface Province {
  id: number;
  name: string;
  center: Point;
  regions: number[];
}
export interface Geography {
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  terrainPatches?: { terrain: Region["terrain"]; contours: Point[][] }[];
  sources?: string[];
  wind?: number;
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
const S = 8;
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
function trace(
  labels: Int32Array,
  value: number,
  COLS: number,
  ROWS: number,
): Point[][] {
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
  reserveSettlements?: (map: { regions: GeographicRegion[]; geography: Geography }) => void,
): { regions: GeographicRegion[]; geography: Geography } {
  // Keep land area per nation constant instead of packing more cells into a fixed world.
  const scale = Math.sqrt(seats / 4);
  const W = Math.round((4800 * scale) / S) * S;
  const H = Math.round((3200 * scale) / S) * S;
  const COLS = W / S,
    ROWS = H / S;
  const random = randomSeed(seed),
    salt = Math.floor(random() * 0x7fffffff);
  const { land, heights, wetness, sources, wind } = generateRelief(
    seed,
    W,
    H,
    S,
  );
  const ridges: Point[][] = [];
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
  const coastlines = trace(land, 1, COLS, ROWS).map((r) => smooth(r));
  const islands: Point[][] = [];
  for (const c of components.slice(1).filter((c) => c.length >= 5)) {
    const mask = new Int32Array(land.length).fill(-1);
    c.forEach((i) => (mask[i] = 1));
    islands.push(
      ...trace(mask, 1, COLS, ROWS)
        .filter((r) => signedArea(r) > 0)
        .map((r) => smooth(r)),
    );
  }
  const count = seats * 24,
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
      const score = distances[j] * (0.15 + hash(j, k, salt) ** 3 * 1.85);
      if (score > max) {
        max = score;
        choice = j;
      }
    }
  }
  // Uneven, terrain-sensitive expansion. Every claimed cell has a cardinal
  // predecessor in its territory, so no enclave can jump a channel or a rival.
  const labels = new Int32Array(land.length).fill(-1);
  type Claim = { cell: number; id: number; cost: number };
  const claims: Claim[] = [];
  const enqueue = (claim: Claim) => {
    let at = claims.length;
    claims.push(claim);
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if (claims[parent].cost <= claim.cost) break;
      claims[at] = claims[parent];
      at = parent;
    }
    claims[at] = claim;
  };
  const take = () => {
    const first = claims[0],
      last = claims.pop()!;
    if (claims.length) {
      let at = 0;
      while (at * 2 + 1 < claims.length) {
        let child = at * 2 + 1;
        if (
          child + 1 < claims.length &&
          claims[child + 1].cost < claims[child].cost
        )
          child++;
        if (claims[child].cost >= last.cost) break;
        claims[at] = claims[child];
        at = child;
      }
      claims[at] = last;
    }
    return first;
  };
  // A broad, skewed growth range creates a few large hinterlands among
  // compact regions. Site spacing still prevents clusters of tiny territories.
  const speeds = sites.map(() => 0.5 + random() ** 2 * 2.5);
  const claimed = new Int32Array(count);
  const coreSize = Math.max(8, Math.floor((mainland.length / count) * 0.04));
  const resistance = (i: number) => {
    const x = i % COLS,
      y = Math.floor(i / COLS);
    return (
      1.3 +
      0.45 * Math.sin(x / 13 + Math.sin(y / 19) * 2 + salt) +
      0.35 * Math.cos(y / 11 + Math.sin(x / 23) * 2 + salt)
    );
  };
  sites.forEach((p, id) =>
    enqueue({
      cell: Math.floor(p[1] / S) * COLS + Math.floor(p[0] / S),
      id,
      cost: 0,
    }),
  );
  while (claims.length) {
    const { cell, id, cost } = take();
    if (labels[cell] !== -1) continue;
    labels[cell] = id;
    claimed[id]++;
    const x = cell % COLS,
      y = Math.floor(cell / COLS);
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
        const n = cell + dy * COLS + dx;
        if (land[n] !== 1 || labels[n] !== -1) continue;
        if (
          dx &&
          dy &&
          labels[cell + dx] !== id &&
          labels[cell + dy * COLS] !== id
        )
          continue;
        const slope = Math.abs(heights[cell] - heights[n]);
        const moistureEdge = Math.abs(wetness[cell] - wetness[n]);
        enqueue({
          cell: n,
          id,
          cost:
            cost +
            ((Math.hypot(dx, dy) *
              (resistance(n) + slope * 35 + moistureEdge * 8)) /
              speeds[id]) *
              (claimed[id] < coreSize ? 0.1 : 1),
        });
      }
  }
  openEnclosedTerritories(labels, COLS, ROWS);
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
      contours = trace(labels, id, COLS, ROWS);
    // Repairs can move a boundary across the old growth site. Keep the region
    // anchor on its own land, near the center of its new footprint.
    if (labels[Math.floor(p[1] / S) * COLS + Math.floor(p[0] / S)] !== id) {
      const cx = own.reduce((sum, i) => sum + (i % COLS), 0) / own.length;
      const cy =
        own.reduce((sum, i) => sum + Math.floor(i / COLS), 0) / own.length;
      const distance = (i: number) =>
        ((i % COLS) - cx) ** 2 + (Math.floor(i / COLS) - cy) ** 2;
      const center = own.reduce((best, i) =>
        distance(i) < distance(best) ? i : best,
      );
      p = [((center % COLS) + 0.5) * S, (Math.floor(center / COLS) + 0.5) * S];
      sites[id] = p;
    }
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
    .filter(
      (r) =>
        cells[r.id].filter((i) => heights[i] > 0.78).length /
          cells[r.id].length >
        0.3,
    )
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
  // Local geography is independent of administrative boundaries. These features
  // are map data, not yet separate combat positions or economic modifiers.
  const biome = new Int32Array(land.length).fill(-1);
  for (const i of mainland)
    biome[i] =
      heights[i] > 0.78 ? 3 : heights[i] > 0.52 ? 2 : wetness[i] > 0.52 ? 1 : 0;
  const terrainKinds = ["plains", "forest", "highlands", "mountains"] as const;
  const terrainPatches = terrainKinds.map((terrain, id) => ({
    terrain,
    contours: trace(biome, id, COLS, ROWS),
  }));
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
  const accumulation = new Float32Array(land.length);
  for (const i of mainland) accumulation[i] = 0.3 + wetness[i];
  for (const i of [...mainland].sort((a, b) => flooded[b] - flooded[a])) {
    if (downhill[i] >= 0) accumulation[downhill[i]] += accumulation[i];
  }
  const rivers: Point[][] = [];
  const riverSources = mainland
    .filter((i) => heights[i] > 0.5 && distance[i] > 12 && accumulation[i] > 35)
    .sort((a, b) => distance[b] - distance[a]);
  const used: number[] = [];
  const riverCells = new Set<number>();
  for (const source of riverSources) {
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
      if (riverCells.has(at)) break;
      at = downhill[at];
    }
    if (points.length > 15) {
      rivers.push(points);
      used.push(source);
      for (const [x, y] of points)
        riverCells.add(Math.floor(y / S) * COLS + Math.floor(x / S));
    }
    if (rivers.length >= Math.max(8, seats * 3)) break;
  }
  const settlementSites: SettlementSite[] = [];
  let usableSettlementArea = 0;
  const fertileByRegion = new Map(
    regions.map((r) => [
      r.id,
      cells[r.id].filter((i) => biome[i] === 0).length / cells[r.id].length,
    ]),
  );
  const passable = regions.filter((r) => r.terrain !== "mountains");
  const agricultural = new Set<number>();
  const farmAreaLimit =
    passable.reduce((sum, region) => sum + region.area, 0) * 0.24;
  const farmRegionLimit = Math.max(1, Math.floor(passable.length * 0.26));
  let farmArea = 0;
  const farmCandidates = passable
    .filter((r) => (fertileByRegion.get(r.id) ?? 0) > 0.6)
    .map((r) => ({
      region: r,
      score: noise(r.x / (S * 100), r.y / (S * 100), salt + 53),
    }))
    .sort((a, b) => a.score - b.score || a.region.id - b.region.id);
  for (const candidate of farmCandidates) {
    if (candidate.score >= 0.62 || agricultural.size >= farmRegionLimit) break;
    if (
      agricultural.size > 0 &&
      farmArea + candidate.region.area > farmAreaLimit
    )
      continue;
    agricultural.add(candidate.region.id);
    farmArea += candidate.region.area;
  }
  // Keep at least one rural district on unusually dry/noisy seeds.
  if (!agricultural.size && farmCandidates.length)
    agricultural.add(farmCandidates[0].region.id);
  for (const r of regions) {
    r.landUse =
      r.terrain === "mountains"
        ? "wilderness"
        : agricultural.has(r.id)
          ? "agricultural"
          : "settled";
    r.purpose =
      r.terrain === "mountains"
        ? "wilderness"
        : r.landUse === "agricultural"
          ? "farming basin"
          : r.terrain === "forest"
            ? "woodland district"
            : r.terrain === "highlands"
              ? r.neighbors.filter((id) => regions[id].terrain === "mountains")
                  .length >= 2
                ? "highland pass"
                : "upland district"
              : r.coastal
                ? "port hinterland"
                : "settled heartland";
    r.features = [];
    const point = (cell: number): Point => [
      ((cell % COLS) + 0.5) * S,
      (Math.floor(cell / COLS) + 0.5) * S,
    ];
    for (let kind = 0; kind < 4; kind++) {
      const patch = cells[r.id].filter((i) => biome[i] === kind);
      if (patch.length < 12) continue;
      const cell = patch[Math.floor(patch.length / 2)],
        [x, y] = point(cell);
      r.features.push({
        id: `${r.id}-terrain-${kind}`,
        kind: ["open", "forest", "ridge", "peaks"][kind] as
          "open" | "forest" | "ridge" | "peaks",
        name: ["Open country", "Woodland", "High ridge", "Mountain peaks"][
          kind
        ],
        x,
        y,
      });
    }
    if (r.terrain === "mountains") continue;
    for (const cell of cells[r.id]) {
      if (heights[cell] >= 0.72 || riverCells.has(cell)) continue;
      usableSettlementArea += S * S;
      // Sample physical space uniformly, without giving each territory a candidate quota.
      if (cell % COLS % 4 !== 0 || Math.floor(cell / COLS) % 4 !== 0) continue;
      const adjacent = neighbors(cell);
      if (adjacent.filter((n) => labels[n] === r.id).length < 4) continue;
      const slope = Math.max(...adjacent.map((n) => Math.abs(heights[n] - heights[cell])));
      if (slope > 0.12) continue;
      const coastal = adjacent.some((n) => neighbors(n).some((m) => land[m] < 0));
      const waterside = adjacent.some((n) => riverCells.has(n));
      const [x, y] = point(cell);
      settlementSites.push({
        id: cell,
        region: r.id,
        x,
        y,
        ruralOnly: r.landUse === "agricultural",
        variation: hash(cell, 71, salt),
        suitability:
          (1 - heights[cell]) * 0.45 - slope * 3 +
          noise(x / (S * 80), y / (S * 80), salt + 79) * 0.2 +
          hash(cell, 73, salt) * 0.15 +
          (waterside ? 0.15 : 0) + (coastal ? 0.12 : 0),
      });
    }
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
  // Expand world coordinates without multiplying the terrain raster workload.
  const worldScale = GENERATED_WORLD_SCALE;
  const scalePoint = ([x, y]: Point): Point => [x * worldScale, y * worldScale];
  const scaleRings = (rings: Point[][]) => rings.map((r) => r.map(scalePoint));
  for (const r of regions) {
    r.x *= worldScale;
    r.y *= worldScale;
    r.area *= worldScale * worldScale;
    r.navigationCellSize = S * worldScale;
    r.polygon = r.polygon.map((p) => scalePoint(p as Point));
    r.contours = scaleRings(r.contours);
    for (const f of r.features ?? []) {
      f.x *= worldScale;
      f.y *= worldScale;
    }
  }
  const map: { regions: GeographicRegion[]; geography: Geography } = {
    regions,
    geography: {
      version: 7,
      terrainPatches: terrainPatches.map((p) => ({
        ...p,
        contours: scaleRings(p.contours),
      })),
      sources,
      wind,
      width: W * worldScale,
      height: H * worldScale,
      cellSize: S * worldScale,
      coastlines: scaleRings(coastlines),
      islands: scaleRings(islands),
      rivers: scaleRings(rivers),
      ridges: scaleRings(ridges),
      provinces: provinces.map((p) => ({ ...p, center: scalePoint(p.center) })),
    },
  };
  // Physical layouts precede settlement reservations and all derived roads/scenery.
  generateTerrainLayouts(map, seed);
  // National ports claim space before the ordinary settlement budget is spent.
  reserveSettlements?.(map);
  const reserved: PlacedSettlement[] = regions.flatMap((r) =>
    (r.features ?? []).filter((f) => f.kind === "settlement").map((f, i) => ({
      id: -(r.id * 1000 + i + 1), region: r.id,
      x: f.x / worldScale, y: f.y / worldScale,
      size: f.size ?? "hamlet", ruralOnly: r.landUse === "agricultural",
      suitability: 1, variation: 0,
    })),
  );
  // Place major centers before towns and villages across the entire continent.
  // Territory ownership attaches afterward; borders do not demand settlements.
  const settlementCounts = new Map<number, number>();
  for (const site of placeSettlements(settlementSites.filter(site => supportsSettlement(regions[site.region], {x:site.x*worldScale,y:site.y*worldScale})), usableSettlementArea, reserved)) {
    const r = regions[site.region];
    const k = settlementCounts.get(r.id) ?? 0;
    settlementCounts.set(r.id, k + 1);
    r.features!.push({
      id: r.id + "-settlement-" + k,
      kind: "settlement",
      name: k === 0 ? r.name :
        townPrefixes[(r.id + k * 7) % 24] + townSuffixes[(r.id + k * 11) % 24],
      x: site.x * worldScale,
      y: site.y * worldScale,
      size: site.size,
      owner: r.owner,
    });
  }
  return map;

}

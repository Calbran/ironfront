import type { World, Region, RegionFeature } from "./index.ts";
import { localSegment, onLocalLand } from "./localMovement.ts";
export type CityArchetype =
  "port" | "riverside" | "market" | "industrial" | "woodland" | "fortified";
export type CityPoint = { x: number; y: number };
export interface CityBuilding extends CityPoint {
  width: number;
  height: number;
  angle: number;
  sprite: number;
  role: "house" | "industry" | "landmark" | "prop";
}
export interface CityLayout {
  archetype: CityArchetype;
  radius: number;
  buildings: CityBuilding[];
  blocks: { x: number; y: number; width: number; height: number }[];
  roads: CityPoint[][];
  docks: CityPoint[][];
  plaza: CityPoint;
}
// Authored normalized street plans. Buildings retain the source art's orientation.
// Geography clips these plans; seed variation chooses occupants, not arbitrary rotations.
export const CITY_TEMPLATES: Record<CityArchetype, number[][][]> = {
  port: [
    [
      [-0.8, -0.5],
      [0.8, -0.5],
    ],
    [
      [-0.8, 0.1],
      [0.8, 0.1],
    ],
    [
      [-0.45, -0.5],
      [-0.45, 0.7],
    ],
    [
      [0.45, -0.5],
      [0.45, 0.7],
    ],
  ],
  riverside: [
    [
      [-0.8, 0],
      [0.8, 0],
    ],
    [
      [-0.5, 0],
      [-0.5, 0.7],
    ],
    [
      [0.1, 0],
      [0.1, 0.7],
    ],
    [
      [0.7, 0],
      [0.7, 0.7],
    ],
  ],
  market: [
    [
      [-0.4, -0.4],
      [0.4, -0.4],
      [0.4, 0.4],
      [-0.4, 0.4],
      [-0.4, -0.4],
    ],
    [
      [-0.8, 0],
      [-0.4, 0],
    ],
    [
      [0.4, 0],
      [0.8, 0],
    ],
    [
      [0, 0.4],
      [0, 0.8],
    ],
  ],
  industrial: [
    [
      [-0.8, -0.65],
      [0.8, -0.65],
    ],
    [
      [-0.8, 0],
      [0.8, 0],
    ],
    [
      [-0.8, 0.65],
      [0.8, 0.65],
    ],
    [
      [-0.4, -0.65],
      [-0.4, 0.65],
    ],
    [
      [0.4, -0.65],
      [0.4, 0.65],
    ],
  ],
  woodland: [
    [
      [-0.8, 0],
      [0.8, 0],
    ],
    [
      [-0.45, 0],
      [-0.45, -0.65],
    ],
    [
      [0.35, 0],
      [0.35, 0.65],
    ],
  ],
  fortified: [
    [
      [-0.6, -0.6],
      [0.6, -0.6],
      [0.6, 0.6],
      [-0.6, 0.6],
      [-0.6, -0.6],
    ],
    [
      [0, -0.6],
      [0, 0.6],
    ],
    [
      [0, 0.6],
      [0, 0.9],
    ],
  ],
};
const sizes = ["hamlet", "village", "town", "city", "metropolis"];
function random(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), h | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function nearest(p: CityPoint, lines: number[][][]) {
  let result = { x: p.x, y: p.y, distance: Infinity, angle: 0 };
  for (const line of lines)
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1],
        b = line[i],
        dx = b[0] - a[0],
        dy = b[1] - a[1];
      const t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / (dx * dx + dy * dy || 1),
        ),
      );
      const x = a[0] + dx * t,
        y = a[1] + dy * t,
        distance = Math.hypot(x - p.x, y - p.y);
      if (distance < result.distance)
        result = { x, y, distance, angle: Math.atan2(dy, dx) };
    }
  return result;
}
export function buildingCorners(b: CityBuilding): CityPoint[] {
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, y]) => ({
    x:
      b.x +
      (Math.cos(b.angle) * x * b.width) / 2 -
      (Math.sin(b.angle) * y * b.height) / 2,
    y:
      b.y +
      (Math.sin(b.angle) * x * b.width) / 2 +
      (Math.cos(b.angle) * y * b.height) / 2,
  }));
}
/** Separating-axis test for oriented building lots, including a narrow alley gap. */
export function buildingsOverlap(
  a: CityBuilding,
  b: CityBuilding,
  gap = 0,
): boolean {
  const ac = buildingCorners(a),
    bc = buildingCorners(b);
  for (const angle of [a.angle, b.angle])
    for (const t of [angle, angle + Math.PI / 2]) {
      const project = (p: CityPoint) => p.x * Math.cos(t) + p.y * Math.sin(t);
      const aa = ac.map(project),
        bb = bc.map(project);
      if (
        Math.max(...aa) + gap <= Math.min(...bb) ||
        Math.max(...bb) + gap <= Math.min(...aa)
      )
        return false;
    }
  return true;
}
export function generateCityLayout(
  w: World,
  r: Region,
  f: RegionFeature,
): CityLayout {
  const rng = random(`${w.seed}:${f.id}:city-v5`);
  const rank = Math.max(0, sizes.indexOf(f.size ?? "hamlet"));
  const worldScale = (w.geography?.width ?? 14400) / 14400;
  let radius = [110, 160, 230, 320, 430][rank] * worldScale;
  for (const region of w.regions)
    for (const other of region.features ?? [])
      if (other.kind === "settlement" && other.id !== f.id)
        radius = Math.min(
          radius,
          Math.hypot(other.x - f.x, other.y - f.y) * 0.42,
        );
  const coast = nearest(f, w.geography?.coastlines ?? []);
  const river = nearest(f, w.geography?.rivers ?? []);
  const locationRadius = [65, 95, 140, 210, 290][rank] * worldScale;
  const port = (() => {
    if (
      !Number.isFinite(coast.distance) ||
      coast.distance <= 0 ||
      coast.distance > radius * 1.35
    )
      return null;
    const dx = (coast.x - f.x) / coast.distance,
      dy = (coast.y - f.y) / coast.distance,
      inland = {
        x: coast.x - dx * worldScale * 12,
        y: coast.y - dy * worldScale * 12,
      };
    if (!localSegment(r, f, inland)) return null;
    const docks: CityPoint[][] = [];
    for (let i = -1; i <= 1; i++) {
      const land = {
          x: inland.x - dy * i * worldScale * 14,
          y: inland.y + dx * i * worldScale * 14,
        },
        water = {
          x: land.x + dx * worldScale * 38,
          y: land.y + dy * worldScale * 38,
        };
      if (
        onLocalLand(r, land) &&
        !w.regions.some((region) => onLocalLand(region, water))
      )
        docks.push([land, water]);
    }
    return docks.length ? { inland, docks } : null;
  })();
  const archetype: CityArchetype = port
    ? "port"
    : river.distance < locationRadius * 1.4
      ? "riverside"
      : r.terrain === "highlands"
        ? "fortified"
        : r.terrain === "forest"
          ? "woodland"
          : rng() < 0.42 && rank >= 2
            ? "industrial"
            : "market";
  const transform = (x: number, y: number): CityPoint => ({
    x: f.x + x,
    y: f.y + y,
  });
  const roads: CityPoint[][] = [],
    docks: CityPoint[][] = port?.docks ?? [],
    buildings: CityBuilding[] = [];
  const extent = radius * 0.85;
  const addRoad = (points: CityPoint[]) => {
    let part: CityPoint[] = [];
    for (const p of points) {
      if (
        !onLocalLand(r, p) ||
        (part.length && !localSegment(r, part.at(-1)!, p))
      ) {
        if (part.length > 1) roads.push(part);
        part = [];
        if (!onLocalLand(r, p)) continue;
      }
      part.push(p);
    }
    if (part.length > 1) roads.push(part);
  };
  for (const street of CITY_TEMPLATES[archetype]) {
    const points: CityPoint[] = [];
    for (let i = 1; i < street.length; i++) {
      const a = street[i - 1],
        b = street[i];
      for (let j = 0; j <= 8; j++)
        points.push(
          transform(
            (a[0] + ((b[0] - a[0]) * j) / 8) * extent,
            (a[1] + ((b[1] - a[1]) * j) / 8) * extent,
          ),
        );
    }
    addRoad(points);
  }
  if (!roads.length) {
    for (let i = 0; i < 8; i++) {
      const road: CityPoint[] = [{ x: f.x, y: f.y }];
      for (let j = 1; j <= 5; j++) {
        const p = transform(
          (Math.cos((i * Math.PI) / 4) * radius * j) / 6,
          (Math.sin((i * Math.PI) / 4) * radius * j) / 6,
        );
        if (!localSegment(r, road.at(-1)!, p)) break;
        road.push(p);
      }
      if (road.length > 1) roads.push(road);
    }
  }
  if (archetype === "port" && port)
    roads.push([{ x: f.x, y: f.y }, port.inland]);
  const roadDistance = (p: CityPoint) =>
    nearest(
      p,
      roads.map((road) => road.map((p) => [p.x, p.y])),
    ).distance;
  // Larger roofs remain world-space sized; frontage spacing follows their footprint.
  const footprint = 48; // Fixed world units: city rank changes capacity, never building scale.
  // Partition the authored street plan into blocks, then fill each block with lots.
  // Narrow strips become small shops; broad parcels accommodate warehouses.
  const cuts = (axis: number) =>
    [
      ...new Set([
        -0.95,
        0.95,
        ...CITY_TEMPLATES[archetype].flatMap((street) =>
          street.map((p) => p[axis]),
        ),
      ]),
    ].sort((a, b) => a - b);
  const xs = cuts(0),
    ys = cuts(1),
    blocks: CityLayout["blocks"] = [];
  const lots: { x: number; y: number; width: number; height: number }[] = [];
  const streetMargin = 6,
    alley = 3;
  for (let ix = 1; ix < xs.length; ix++)
    for (let iy = 1; iy < ys.length; iy++) {
      const left = f.x + xs[ix - 1] * extent + streetMargin,
        top = f.y + ys[iy - 1] * extent + streetMargin;
      const width = (xs[ix] - xs[ix - 1]) * extent - streetMargin * 2,
        height = (ys[iy] - ys[iy - 1]) * extent - streetMargin * 2;
      if (width < footprint || height < footprint) continue;
      const block = { x: left, y: top, width, height };
      blocks.push(block);
      const cols = Math.max(
          1,
          Math.floor((width + alley) / (footprint + alley)),
        ),
        rows = Math.max(1, Math.floor((height + alley) / (footprint + alley)));
      const cw = width / cols,
        ch = height / rows;
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols; col++) {
          lots.push({
            x: left + (col + 0.5) * cw,
            y: top + (row + 0.5) * ch,
            width: footprint,
            height: footprint,
          });
        }
    }
  lots.sort(
    (a, b) =>
      Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y),
  );
  if (rank >= 2) {
    // Civic buildings need a substantial, roughly square lot, not a narrow shop strip.
    const landmark = lots.findIndex(
      (lot) =>
        lot.width / lot.height > 0.7 &&
        lot.width / lot.height < 1.5 &&
        lot.width > footprint * 0.7,
    );
    if (landmark > 0) lots.unshift(...lots.splice(landmark, 1));
  }
  let landmarkPlaced = false;
  for (const lot of lots) {
    const { x, y } = lot;
    const industry =
      (archetype === "industrial" ||
        archetype === "port" ||
        archetype === "woodland") &&
      lot.width >= footprint * 0.85 &&
      rng() < 0.65;
    const role =
      !landmarkPlaced &&
      rank >= 2 &&
      lot.width / lot.height > 0.7 &&
      lot.width / lot.height < 1.5 &&
      lot.width > footprint * 0.7
        ? "landmark"
        : industry
          ? "industry"
          : "house";
    const width = footprint,
      height = footprint;
    const p: CityBuilding = {
      x,
      y,
      width,
      height,
      angle: 0,
      role,
      sprite:
        role === "landmark"
          ? {
              port: 38,
              riverside: 20,
              market: 22,
              industrial: 14,
              woodland: 8,
              fortified: 24,
            }[archetype]
          : industry
            ? archetype === "port"
              ? 37
              : 12 + Math.floor(rng() * 8)
            : Math.floor(rng() * 12),
    };
    if (
      roads.some((road) =>
        road.slice(1).some((end, i) => {
          const start = road[i],
            dx = end.x - start.x,
            dy = end.y - start.y;
          return buildingsOverlap(p, {
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2,
            width: Math.hypot(dx, dy),
            height: 9,
            angle: Math.atan2(dy, dx),
            sprite: 0,
            role: "prop",
          });
        }),
      ) ||
      buildings.some((q) => buildingsOverlap(p, q, footprint * 0.035))
    )
      continue;
    const corners = buildingCorners(p);
    if (
      !corners.every((point, i) => localSegment(r, point, corners[(i + 1) % 4]))
    )
      continue;
    buildings.push(p);
    if (role === "landmark") landmarkPlaced = true;
  }
  // Props occupy leftover spaces, never replace whole neighborhoods with a stamp.
  for (let i = 0; i < rank * 3 + 3; i++) {
    const theta = rng() * Math.PI * 2,
      d = radius * (0.25 + rng() * 0.55),
      p = transform(Math.cos(theta) * d, Math.sin(theta) * d);
    const size = footprint * 0.45;
    if (
      !onLocalLand(r, p) ||
      roadDistance(p) < size ||
      buildings.some(
        (b) =>
          Math.hypot(b.x - p.x, b.y - p.y) <
          Math.hypot(b.width, b.height) / 2 + size,
      )
    )
      continue;
    const prop: CityBuilding = {
      ...p,
      width: size,
      height: size,
      angle: 0,
      sprite: (archetype === "port"
        ? [39, 40, 40]
        : archetype === "woodland"
          ? [31, 32, 34]
          : archetype === "industrial"
            ? [26, 27, 28]
            : [30, 32, 33])[Math.floor(rng() * 3)],
      role: "prop",
    };
    const corners = buildingCorners(prop);
    if (corners.every((p, i) => localSegment(r, p, corners[(i + 1) % 4])))
      buildings.push(prop);
  }
  return {
    archetype,
    radius,
    roads,
    docks,
    buildings,
    blocks,
    plaza: { x: f.x, y: f.y },
  };
}

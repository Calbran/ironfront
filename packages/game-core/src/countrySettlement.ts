import type { CountryPOI } from "./countryPOI";
import { addRoad, segmentDistance } from "./countryLayoutGeometry";
import { cityBuildingFootprint, cityBuildingEnvelope } from "./cityBuildingKit";

export type SettlementRank =
  "hamlet" | "village" | "town" | "city" | "metropolis";
export const settlementExtent: Record<SettlementRank, number> = {
  hamlet: 100,
  village: 240,
  town: 520,
  city: 1050,
  metropolis: 2200,
};
/** Connected blocks, several activity centers and a porous edge. Assets retain physical dimensions. */
export function generateCountrySettlement(
  seed: number,
  rank: SettlementRank,
  centralReserve = 0,
): CountryPOI {
  let state = seed >>> 0;
  const random = () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const extent = settlementExtent[rank],
    step = rank === "city" || rank === "metropolis" ? 52 : 70;
  const p: CountryPOI = {
    kind: "crossroads-market",
    seed,
    name: rank,
    extent,
    buildings: [],
    props: [],
    fields: [],
    trees: [],
    roads: [],
    paths: [],
    obstacles: [],
    entrances: [],
    developed: [],
  };
  const n = Math.floor((extent - 30) / step),
    phase = random() * 6;
  const turn = random() * Math.PI * 0.7,
    c = Math.cos(turn),
    s = Math.sin(turn);
  const point = (x: number, z: number) => {
    const px =
      x * step +
      Math.sin((z / n) * 2.4 + phase) * extent * 0.055 +
      Math.sin(z * 0.38 + phase) * 8;
    const pz =
      z * step +
      Math.sin((x / n) * 2.8 + phase) * extent * 0.055 +
      Math.sin(x * 0.31 + phase) * 8;
    return { x: px * c - pz * s, z: px * s + pz * c };
  };
  const occupied = new Set<string>();
  // A connected central body with uneven outer neighborhoods; never disconnected decorative blocks.
  for (let z = -n; z < n; z++)
    for (let x = -n; x < n; x++) {
      const radius = Math.hypot((x + 0.5) / n, (z + 0.5) / n);
      if (
        radius >
        0.88 + 0.1 * Math.sin(x * 0.6 + phase) + 0.08 * Math.cos(z * 0.5)
      )
        continue;
      occupied.add(`${x}:${z}`);
    }
  const roads = new Set<string>();
  const connected = new Set<string>(),
    pending = ["0:0"];
  for (let i = 0; i < pending.length; i++) {
    const key = pending[i];
    if (connected.has(key) || !occupied.has(key)) continue;
    connected.add(key);
    const [x, z] = key.split(":").map(Number);
    pending.push(
      `${x - 1}:${z}`,
      `${x + 1}:${z}`,
      `${x}:${z - 1}`,
      `${x}:${z + 1}`,
    );
  }
  for (const key of occupied) if (!connected.has(key)) occupied.delete(key);
  const approach = centralReserve
    ? { a: { x: 260, z: 0 }, b: { x: centralReserve + step * 2, z: 0 } }
    : undefined;
  if (approach) addRoad(p.roads, approach.a, approach.b, 7);
  for (const cell of occupied) {
    const [x, z] = cell.split(":").map(Number),
      corners = [
        point(x, z),
        point(x + 1, z),
        point(x + 1, z + 1),
        point(x, z + 1),
      ];
    const center = {
      x: (corners[0].x + corners[2].x) / 2,
      z: (corners[0].z + corners[2].z) / 2,
    };
    if (
      centralReserve &&
      Math.hypot(center.x, center.z) < centralReserve + step
    )
      continue;
    for (let i = 0; i < 4; i++) {
      const a = corners[i],
        b = corners[(i + 1) % 4],
        key = [`${a.x}:${a.z}`, `${b.x}:${b.z}`].sort().join("/");
      if (!roads.has(key)) {
        addRoad(p.roads, a, b, x === 0 || z === 0 ? 9 : 5);
        roads.add(key);
      }
    }
    const radius = Math.hypot(center.x, center.z) / extent;
    const industrial = center.x > extent * 0.32 && center.z > -extent * 0.3;
    const density = radius < 0.72 ? 0.98 : 0.65;
    // Frontage on all four block sides; clear interiors become gardens / working yards.
    const local: { x: number; z: number; radius: number }[] = [];
    for (let edge = 0; edge < 4; edge++)
      for (let slot = 0; slot < 4; slot++) {
        if (random() > density) continue;
        const a = corners[edge],
          b = corners[(edge + 1) % 4],
          t = (slot + 0.5) / 4;
        const on = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        const nx = -(b.z - a.z) / len,
          nz = (b.x - a.x) / len;
        const inward =
          (center.x - on.x) * nx + (center.z - on.z) * nz >= 0 ? 1 : -1;
        const q = {
          x: on.x + nx * 15 * inward,
          z: on.z + nz * 15 * inward,
        };
        const urban = rank === "city" || rank === "metropolis";
        const variant = industrial
          ? random() < 0.4
            ? "factory"
            : "warehouse"
          : urban && radius < 0.28 && random() < 0.24
            ? "commercialTower"
            : urban && radius < 0.65
              ? [
                  "urbanHome",
                  "urbanRed",
                  "urbanShop",
                  "urbanTenement",
                  "urbanCorner",
                ][(x * 7 + z * 11 + edge + slot + 10000) % 5]
              : random() < 0.17
                ? "shop"
                : "home";
        const envelope = cityBuildingEnvelope(variant),
          r = Math.hypot(envelope.width, envelope.depth) / 2;
        if (approach && segmentDistance(q, approach.a, approach.b) < r + 5)
          continue;
        if (
          corners.some(
            (a, i) => segmentDistance(q, a, corners[(i + 1) % 4]) < r + 5.5,
          ) ||
          local.some((o) => Math.hypot(o.x - q.x, o.z - q.z) < o.radius + r + 1)
        )
          continue;
        const id = `building:${p.buildings.length}`,
          angle = Math.atan2(on.x - q.x, on.z - q.z);
        p.buildings.push({ id, variant, ...q, angle });
        p.obstacles.push({
          id,
          kind: "building",
          ...q,
          angle,
          ...cityBuildingFootprint(variant),
        });
        local.push({ ...q, radius: r });
      }
    if (local.length)
      p.developed!.push({
        kind: industrial ? "yard" : radius < 0.75 ? "urban" : "garden",
        polygon: corners.map((q) => {
          const d = Math.hypot(q.x - center.x, q.z - center.z),
            t = Math.max(0, (d - 4) / d);
          return {
            x: center.x + (q.x - center.x) * t,
            z: center.z + (q.z - center.z) * t,
          };
        }),
      });
  }
  // Gateways attach to the actual connected street network, not imaginary extent corners.
  for (const direction of [-1, 1]) {
    const candidates = p.roads
      .filter((r) => Math.abs(r.z) < step * 1.5)
      .sort((a, b) => direction * (b.x - a.x));
    const r = candidates[0];
    if (r) p.entrances.push({ x: r.x, z: r.z });
  }
  return p;
}

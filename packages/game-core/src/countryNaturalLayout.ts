import type { CountryPOI, POIKind } from "./countryPOI";
import type { CountryPOISize } from "./countryPOIExpansion";
import {
  addRoad,
  nearestRoad,
  placeCountryBuilding,
  roadEnds,
  segmentDistance,
  type CountryPoint,
} from "./countryLayoutGeometry";
/** A road-led settlement grows around activity centers; it never repeats a rectangular module. */
export function generateNaturalCountryPOI(
  kind: POIKind,
  seed: number,
  size: CountryPOISize,
  occupancy = 0.8,
  industrialComplex = false,
): CountryPOI {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const level = { site: 0, estate: 1, district: 2 }[size];
  if (level === undefined) throw Error("Unknown country size");
  const villages = [
      "ribbon-hamlet",
      "crossroads-market",
      "miners-terrace",
      "mill-village",
      "estate-hamlet",
    ],
    village = villages.includes(kind),
    industry = [
      "abandoned-warehouse",
      "rail-freight",
      "boiler-yard",
      "sawmill",
      "foundry",
      "coal-yard",
    ].includes(kind),
    extent = (industry && industrialComplex ? [44, 115, 360] : [44, 115, 185])[
      level
    ];
  const plan: CountryPOI = {
    kind,
    seed,
    name: kind.replaceAll("-", " "),
    extent,
    details: [],
    buildings: [],
    props: [],
    fields: [],
    trees: [],
    roads: [],
    paths: [],
    obstacles: [],
    entrances: [],
  };
  const bend = (random() - 0.5) * extent * 0.7,
    tilt = (random() - 0.5) * 0.8;
  const spine = (t: number) => ({
    x: (t * 2 - 1) * extent,
    z: Math.sin(t * Math.PI * 2) * bend + (t - 0.5) * extent * tilt,
  });
  for (let i = 0; i < 32; i++)
    addRoad(plan.roads, spine(i / 32), spine((i + 1) / 32), 6);
  plan.entrances.push(spine(0), spine(1));
  const centers: CountryPoint[] = [spine(0.35 + random() * 0.3)];
  const branches = village
    ? kind === "ribbon-hamlet"
      ? 1
      : 2 + level
    : industry
      ? industrialComplex
        ? 1 + level
        : 1
      : 0;
  for (let branch = 0; branch < branches; branch++) {
    const junction = spine(0.22 + random() * 0.56),
      sign = branch % 2 ? -1 : 1,
      end = {
        x: junction.x + (random() - 0.5) * extent * 0.65,
        z: sign * extent * (0.5 + random() * 0.3),
      };
    const control = {
      x: junction.x + (random() - 0.5) * extent * 0.65,
      z: (junction.z + end.z) / 2,
    };
    let previous = junction;
    for (let i = 1; i <= 16; i++) {
      const t = i / 16,
        u = 1 - t,
        p = {
          x: u * u * junction.x + 2 * u * t * control.x + t * t * end.x,
          z: u * u * junction.z + 2 * u * t * control.z + t * t * end.z,
        };
      addRoad(plan.roads, previous, p, 4);
      previous = p;
    }
    centers.push({ x: (junction.x + end.x) / 2, z: (junction.z + end.z) / 2 });
  }
  if (!Number.isFinite(occupancy) || occupancy < 0 || occupancy > 1)
    throw Error("Invalid occupancy");
  const population = Math.round(
    (village
      ? [18, 45, 85][level]
      : industry
        ? (industrialComplex ? [6, 18, 90] : [6, 12, 20])[level]
        : [3, 5, 8][level]) * occupancy,
  );
  const density = (0.6 + random() * 0.4) * occupancy;
  for (
    let attempt = 0;
    attempt < population * 35 && plan.buildings.length < population;
    attempt++
  ) {
    const r = plan.roads[Math.floor(random() * plan.roads.length)],
      [a, b] = roadEnds(r),
      t = random(),
      on = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    const centerDistance = Math.min(
        ...centers.map((c) => Math.hypot(c.x - on.x, c.z - on.z)),
      ),
      concentration = Math.exp(-centerDistance / (extent * 0.35));
    if (random() > density * (0.12 + 0.88 * concentration)) continue;
    const side = random() < 0.5 ? -1 : 1,
      setback = 7 + random() * (centerDistance < extent * 0.3 ? 5 : 17),
      dx = b.x - a.x,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz),
      p = {
        x: on.x - (dz / len) * side * setback,
        z: on.z + (dx / len) * side * setback,
      };
    const variant =
      kind === "boiler-yard" || kind === "pumping-station"
        ? "boilerHouse"
        : kind === "foundry"
          ? "factory"
          : industry
            ? kind === "sawmill"
              ? "mill"
              : random() < 0.5
                ? "warehouse"
                : "workshopRow"
            : kind === "miners-terrace"
              ? "urbanCourt"
              : kind === "mill-village" && plan.buildings.length === 0
                ? "mill"
                : kind === "chapel-yard" || kind === "ruined-manor"
                  ? "hall"
                  : random() < 0.2
                    ? "shop"
                    : "home";
    placeCountryBuilding(
      plan,
      variant,
      p,
      Math.atan2(on.x - p.x, on.z - p.z),
      "building:" + plan.buildings.length,
    );
  }
  // Gardens and occasional cover follow individual houses, with a clear frontage.
  for (const building of plan.buildings) {
    if (random() < 0.4) continue;
    const road = nearestRoad(building, plan.roads),
      dx = building.x - road.x,
      dz = building.z - road.z,
      len = Math.hypot(dx, dz),
      p = { x: building.x + (dx / len) * 7, z: building.z + (dz / len) * 7 },
      width = 4 + random() * 4;
    if (
      Math.max(Math.abs(p.x), Math.abs(p.z)) + width > extent ||
      plan.obstacles.some(
        (o) =>
          Math.hypot(o.x - p.x, o.z - p.z) <
          Math.hypot(o.width, o.depth) / 2 + width / 2 + 1,
      ) ||
      plan.roads.some((r) => {
        const [a, b] = roadEnds(r);
        return segmentDistance(p, a, b) < width / 2 + r.depth / 2 + 2;
      })
    )
      continue;
    const id = "garden:" + plan.props.length,
      angle = building.angle,
      kind = random() < 0.55 ? "hedge" : "wall";
    plan.props.push({ id, kind, ...p, width, depth: 0.55, height: 0.8, angle });
    plan.obstacles.push({ id, kind: "wall", ...p, width, depth: 0.55, angle });
  }
  const features: Record<
    string,
    ("crate" | "boiler" | "pump" | "pole" | "grave" | "log" | "barricade")[]
  > = {
    "fuel-station": ["pump", "pump", "boiler"],
    "pumping-station": ["boiler", "boiler", "pole"],
    "telegraph-office": ["pole", "pole", "pole"],
    "toll-house": ["barricade", "crate"],
    sawmill: ["log", "log", "log"],
    "coal-yard": ["crate", "crate", "boiler"],
    "rail-freight": ["crate", "crate", "log"],
    foundry: ["boiler", "boiler", "crate"],
    "boiler-yard": ["boiler", "boiler", "boiler"],
    "chapel-yard": ["grave", "grave", "grave", "grave"],
    "field-hospital": ["crate", "crate"],
    "road-redoubt": ["barricade", "barricade", "barricade"],
  };
  for (const feature of features[kind] ?? [])
    for (let attempt = 0; attempt < 35; attempt++) {
      const anchor =
        plan.buildings[Math.floor(random() * plan.buildings.length)];
      if (!anchor) break;
      const theta = random() * Math.PI * 2,
        p = {
          x: anchor.x + Math.cos(theta) * 12,
          z: anchor.z + Math.sin(theta) * 12,
        },
        width =
          feature === "barricade"
            ? 6
            : feature === "log"
              ? 4
              : feature === "grave"
                ? 0.7
                : 1.5,
        depth = feature === "log" ? 1.4 : 1,
        height =
          feature === "boiler"
            ? 3
            : feature === "pole"
              ? 4
              : feature === "pump"
                ? 1.6
                : 0.8;
      if (
        Math.max(Math.abs(p.x), Math.abs(p.z)) + width > extent ||
        nearestRoad(p, plan.roads).distance < width / 2 + 4 ||
        plan.obstacles.some(
          (o) =>
            Math.hypot(o.x - p.x, o.z - p.z) <
            Math.hypot(o.width, o.depth) / 2 + width / 2 + 1,
        )
      )
        continue;
      const id = "feature:" + plan.props.length,
        angle = random() * Math.PI;
      plan.props.push({ id, kind: feature, ...p, width, depth, height, angle });
      plan.obstacles.push({
        id,
        kind:
          feature === "barricade"
            ? "sandbag"
            : height >= 2.2
              ? "building"
              : "wall",
        ...p,
        width,
        depth,
        angle,
      });
      break;
    }
  if (kind === "abandoned-warehouse" || kind === "ruined-manor") {
    const ruins = plan.buildings.filter((_, i) => i % 2 === 0);
    plan.buildings = plan.buildings.filter((b) => !ruins.includes(b));
    const ids = new Set(ruins.map((b) => b.id));
    plan.obstacles = plan.obstacles.filter((o) => !ids.has(o.id));
    for (const b of ruins)
      for (const side of [-1, 1]) {
        const id = "ruin:" + plan.props.length,
          x = b.x + Math.cos(b.angle) * side * 3,
          z = b.z - Math.sin(b.angle) * side * 3;
        plan.props.push({
          id,
          kind: "wall",
          x,
          z,
          angle: b.angle,
          width: 0.6,
          depth: 5,
          height: side < 0 ? 2.5 : 1.2,
        });
        plan.obstacles.push({
          id,
          kind: side < 0 ? "building" : "wall",
          x,
          z,
          angle: b.angle,
          width: 0.6,
          depth: 5,
        });
      }
  }
  // Sparse tree groups occupy unused land, leaving roads and model footprints clear.
  for (let i = 0; i < 30 + level * 30; i++) {
    const p = {
      x: (random() - 0.5) * extent * 1.8,
      z: (random() - 0.5) * extent * 1.8,
    };
    if (
      nearestRoad(p, plan.roads).distance < 7 ||
      plan.obstacles.some(
        (o) =>
          Math.hypot(o.x - p.x, o.z - p.z) <
          Math.hypot(o.width, o.depth) / 2 + 3,
      )
    )
      continue;
    plan.trees.push({ ...p, variant: random() < 0.25 ? "pine" : "tree" });
  }
  return plan;
}

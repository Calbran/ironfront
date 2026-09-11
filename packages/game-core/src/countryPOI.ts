import { generateNaturalCountryPOI } from "./countryNaturalLayout";
import { expandCountryPOI, type CountryPOISize } from "./countryPOIExpansion";
import { cityBuildingFootprint } from "./cityBuildingKit";
import type { CityObstacle } from "./cityTactics";
export const POI_CATALOG = [
  ["ribbon-hamlet", "Ribbon hamlet", "Settlement"],
  ["crossroads-market", "Crossroads market", "Settlement"],
  ["miners-terrace", "Miners’ terrace", "Settlement"],
  ["mill-village", "Mill village", "Settlement"],
  ["estate-hamlet", "Estate hamlet", "Settlement"],
  ["coach-inn", "Coaching inn", "Settlement"],
  ["abandoned-warehouse", "Abandoned warehouse", "Industry"],
  ["rail-freight", "Rail freight depot", "Industry"],
  ["boiler-yard", "Boiler works", "Industry"],
  ["sawmill", "Timber sawmill", "Industry"],
  ["foundry", "Rural foundry", "Industry"],
  ["coal-yard", "Coal yard", "Industry"],
  ["fuel-station", "Brass fuel station", "Roadside"],
  ["pumping-station", "Steam pumping station", "Roadside"],
  ["telegraph-office", "Telegraph exchange", "Roadside"],
  ["toll-house", "Toll house", "Roadside"],
  ["ruined-manor", "Ruined manor", "Frontier"],
  ["chapel-yard", "Chapel and cemetery", "Frontier"],
  ["field-hospital", "Field hospital", "Frontier"],
  ["road-redoubt", "Road redoubt", "Frontier"],
  ["farmstead", "Mixed farmstead", "Agriculture"],
  ["strip-fields", "Sectioned crop fields", "Agriculture"],
  ["orchard", "Walled orchard", "Agriculture"],
  ["hop-garden", "Hop garden", "Agriculture"],
] as const;
export type POIKind = (typeof POI_CATALOG)[number][0];
export type POIBuilding = {
  id: string;
  variant: string;
  x: number;
  z: number;
  angle: number;
};
export type POIProp = {
  id: string;
  kind:
    | "hedge"
    | "wall"
    | "crate"
    | "boiler"
    | "pump"
    | "pole"
    | "grave"
    | "log"
    | "barricade";
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  angle: number;
};
export type POIField = {
  x: number;
  z: number;
  width: number;
  depth: number;
  crop: "wheat" | "barley" | "potatoes" | "flax" | "beets" | "fallow";
  rows: number;
  polygon?: { x: number; z: number }[];
  rowAngle?: number;
};
export type POIRoad = {
  x: number;
  z: number;
  width: number;
  depth: number;
  angle?: number;
};
export type CountryPOI = {
  kind: POIKind;
  seed: number;
  name: string;
  extent: number;
  details?: { x: number; z: number }[];
  buildings: POIBuilding[];
  props: POIProp[];
  fields: POIField[];
  trees: { x: number; z: number; variant: string }[];
  roads: POIRoad[];
  paths?: POIRoad[];
  waterways?: POIRoad[];
  source?: { name: string; attribution: string; url: string; license: string };
  obstacles: CityObstacle[];
  entrances: { x: number; z: number }[];
};
function generateCompactCountryPOI(kind: POIKind, seed: number): CountryPOI {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const entry = POI_CATALOG.find((c) => c[0] === kind);
  if (!entry) throw Error("Unknown point of interest");
  const farm = entry[2] === "Agriculture",
    extent = farm ? 66 : 44;
  const p: CountryPOI = {
    kind,
    seed,
    name: entry[1],
    extent,
    buildings: [],
    props: [],
    fields: [],
    trees: [],
    roads: [{ x: 0, z: 0, width: extent * 2, depth: 7 }],
    obstacles: [],
    entrances: [
      { x: -extent, z: 0 },
      { x: extent, z: 0 },
    ],
  };
  const building = (variant: string, x: number, z: number, angle = 0) => {
    const id = "building:" + p.buildings.length;
    p.buildings.push({ id, variant, x, z, angle });
    p.obstacles.push({
      id,
      x,
      z,
      angle,
      kind: "building",
      ...cityBuildingFootprint(variant),
    });
  };
  const prop = (
    kind: POIProp["kind"],
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    angle = 0,
  ) => {
    const id = "prop:" + p.props.length;
    p.props.push({ id, kind, x, z, width, depth, height, angle });
    p.obstacles.push({
      id,
      x,
      z,
      width,
      depth,
      angle,
      kind:
        kind === "barricade" ? "sandbag" : height >= 2.2 ? "building" : "wall",
    });
  };
  const tree = (x: number, z: number) =>
    p.trees.push({ x, z, variant: random() < 0.25 ? "pine" : "tree" });
  if (entry[2] === "Settlement") {
    const cross = kind === "crossroads-market" || kind === "estate-hamlet";
    if (cross) {
      p.roads.push({ x: 0, z: 0, width: 7, depth: extent * 2 });
      p.entrances.push({ x: 0, z: -extent }, { x: 0, z: extent });
    }
    for (const side of [-1, 1])
      for (const x of [-27, -13, 13, 27]) {
        if (random() < 0.16 && kind !== "miners-terrace") continue;
        const variant =
          kind === "miners-terrace"
            ? "urbanCourt"
            : kind === "mill-village" && x === -27 && side === -1
              ? "mill"
              : kind === "coach-inn" && x === 13
                ? "shop"
                : random() < 0.25
                  ? "shop"
                  : "home";
        building(
          variant,
          x,
          side * (13 + random() * 2),
          side < 0 ? 0 : Math.PI,
        );
      }
    for (const x of [-31, -17, 17, 31]) prop("crate", x, 6, 1.2, 1.2, 0.9);
    if (kind === "crossroads-market") {
      for (const x of [-22, 22]) prop("boiler", x, -28, 2, 2, 2.8);
    }
  } else if (farm) {
    building("home", -40, 8.5, Math.PI);
    building("warehouse", 39, -9);
    const crops: POIField["crop"][] = [
      "wheat",
      "barley",
      "potatoes",
      "flax",
      "beets",
      "fallow",
    ];
    for (const z of [-35, 35])
      for (const x of [-32, 0, 32])
        p.fields.push({
          x,
          z,
          width: 28,
          depth: 40,
          crop: crops[Math.floor(random() * crops.length)],
          rows: 14 + Math.floor(random() * 8),
        });
    if (kind === "orchard" || kind === "hop-garden")
      for (const field of p.fields.slice(2))
        for (let x = -10; x <= 10; x += 5)
          for (let z = -16; z <= 16; z += 8) {
            if (kind === "orchard") tree(field.x + x, field.z + z);
            else prop("pole", field.x + x, field.z + z, 0.14, 0.14, 2.4);
          }
    for (const side of [-1, 1])
      for (const x of [-51, -22, 22, 51])
        prop("wall", x, side * 12, 12, 0.45, 0.7);
    prop("boiler", 49, -8, 2.8, 2.8, 3);
    prop("crate", 32, 8, 1.8, 1.8, 1.2);
  } else if (kind === "abandoned-warehouse" || kind === "ruined-manor") {
    // Open, fragmented walls leave genuinely traversable interiors and several breaches.
    for (const x of [-20, 0, 20]) {
      for (const side of [-1, 1]) prop("wall", x + side * 5, -18, 0.6, 11, 2.7);
      prop("wall", x - 2, -24, 5, 0.6, 3);
      prop("wall", x + 3, -12, 3, 0.6, 1.1);
      prop("crate", x, -20, 1.6, 1.6, 1);
    }
    if (kind === "ruined-manor") building("hall", 22, 18, Math.PI);
    else building("warehouse", -20, 16, Math.PI);
  } else if (kind === "road-redoubt") {
    building("home", -20, -17);
    for (const side of [-1, 1])
      for (const x of [-26, -14, 14, 26])
        prop("barricade", x, side * 8, 7, 0.9, 0.7);
    for (const x of [-20, 20]) prop("boiler", x, 19, 2.8, 2.8, 2.3);
  } else {
    const primary =
      kind === "foundry"
        ? "factory"
        : kind === "boiler-yard" || kind === "pumping-station"
          ? "boilerHouse"
          : kind === "sawmill"
            ? "mill"
            : kind === "rail-freight" || kind === "coal-yard"
              ? "warehouse"
              : kind === "chapel-yard"
                ? "hall"
                : kind === "field-hospital"
                  ? "home"
                  : "shop";
    building(primary, -14, -16);
    building(random() < 0.5 ? "home" : "workshopRow", 17, 16, Math.PI);
    if (kind === "fuel-station") {
      for (const x of [-25, -9]) prop("pole", x, -7.5, 0.2, 0.2, 3.1);
      for (const x of [-24, -17, -10]) prop("pump", x, -6, 1, 1, 1.6);
      prop("boiler", -29, -19, 3, 3, 4);
    } else if (kind === "chapel-yard") {
      for (const x of [-28, -23, -18, -13])
        for (const z of [15, 21, 27]) prop("grave", x, z, 0.7, 0.45, 0.9);
    } else if (kind === "telegraph-office" || kind === "toll-house") {
      for (const x of [-34, -17, 0, 17, 34]) prop("pole", x, -6, 0.25, 0.25, 5);
    } else if (kind === "sawmill") {
      for (let i = 0; i < 6; i++) prop("log", -26 + i * 4, 18, 2.5, 6, 0.9);
    } else {
      for (let i = 0; i < 5; i++)
        prop(
          kind === "coal-yard" ? "crate" : "boiler",
          -28 + i * 6,
          27,
          2.4,
          2.4,
          kind === "coal-yard" ? 1.2 : 3,
        );
    }
    if (kind === "rail-freight") {
      p.roads.push({ x: 0, z: -32, width: 80, depth: 3 });
      for (let x = -36; x <= 36; x += 3) prop("log", x, -32, 0.4, 3, 0.12);
    }
  }
  function sideSeed() {
    return random() < 0.5 ? -19 : 19;
  }
  // Small reusable cover clusters; lanes and doors stay clear.
  if (!farm)
    for (const side of [-1, 1])
      for (const x of [-31, -12, 12, 31]) {
        prop("wall", x, side * 31, 7, 0.55, 0.85);
        if (random() < 0.7) tree(x + 2, side * 37);
      }
  return p;
}

export function generateCountryPOI(
  kind: POIKind,
  seed: number,
  options?: { size: CountryPOISize; density?: number },
): CountryPOI {
  const base = generateCompactCountryPOI(kind, seed);
  if (!base.fields.length) {
    const plan = generateNaturalCountryPOI(
      kind,
      seed,
      options?.size ?? "site",
      options?.density,
    );
    plan.name = base.name;
    return plan;
  }
  return options ? expandCountryPOI(base, options.size) : base;
}

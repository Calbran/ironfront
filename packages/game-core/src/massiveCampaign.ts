import { createPacingStudy } from "./campaignPacingStudy";
import { CAMPAIGN_MODEL_PER_WORLD as scale } from "./campaignPhysicalScale";
import { buildConnectedTerrain } from "./connectedTerrain";
import { generatePacingCountryside } from "./pacingCountryside";
import { generateCountryPOI, type POIKind } from "./countryPOI";
import {
  buildCountryRoadNetwork,
  countryRoadFieldFilter,
} from "./countryRoadNetwork";
import type { SlicePlan } from "./countrySlice";
import type { World } from "./index";
import {
  generateCountrySettlement,
  settlementExtent,
  type SettlementRank,
} from "./countrySettlement";
import { generateRegionalFarmland } from "./regionalFarmland";
import { onLocalLand } from "./localMovement";

/** The scale-test continent, with tactical-sized settlements and authoritative physical coordinates. */
export function createMassiveCampaignPlan(
  base: SlicePlan,
  version: 2 | 3 = 3,
): SlicePlan {
  const world = createPacingStudy("Meridian").world;
  const locations: {
    id: string;
    name: string;
    x: number;
    y: number;
    size: string;
    scenic?: boolean;
  }[] = world.regions.flatMap((r) =>
    (r.features ?? [])
      .filter((f) => f.kind === "settlement")
      .map((f) => ({
        id: "settlement-" + r.id + "-" + f.id,
        name: f.name,
        x: f.x,
        y: f.y,
        size: f.size ?? "hamlet",
      })),
  );
  const home = locations.find((c) => c.size === "city") ?? locations[0];
  if (!home) throw Error("Continent has no settlement");
  // The fixed reference continent predates metropolis ranks. Give its four regional seats
  // differentiated urban roles while retaining all seeded locations and physical asset sizes.
  const towns = locations.filter((c) => c.size === "town");
  const riverSegments = world.geography!.rivers.flatMap((r) =>
    r.slice(1).map((b, i) => ({ a: r[i], b })),
  );
  const dryFootprint = (x: number, y: number, radius: number) => {
    for (let u = -2; u <= 2; u++)
      for (let v = -2; v <= 2; v++)
        if (
          !world.regions.some(
            (r) =>
              r.terrain !== "mountains" &&
              onLocalLand(
                r,
                { x: x + (u * radius) / 2, y: y + (v * radius) / 2 },
                "ground",
              ),
          )
        )
          return false;
    return !riverSegments.some(({ a, b }) => {
      const dx = b[0] - a[0],
        dy = b[1] - a[1],
        t = Math.max(
          0,
          Math.min(
            1,
            ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1),
          ),
        );
      return (
        Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) <
        radius * Math.SQRT2 + 20 / scale
      );
    });
  };
  const rankOf = (size: string, id?: string): SettlementRank => {
    const town = towns.findIndex((c) => c.id === id);
    if (version === 3 && town >= 0)
      return town < 2 ? "metropolis" : town === 2 ? "city" : "town";
    return size in settlementExtent ? (size as SettlementRank) : "village";
  };
  if (version === 3)
    for (const c of locations) {
      const radius =
        (settlementExtent[rankOf(c.size, c.id)] + surfaceMargin()) / scale;
      if (dryFootprint(c.x, c.y, radius)) continue;
      const origin = { x: c.x, y: c.y };
      let found = false;
      for (let ring = 1; ring <= 100 && !found; ring++)
        for (let direction = 0; direction < 16; direction++) {
          const x = origin.x + Math.cos((direction * Math.PI) / 8) * ring * 80,
            y = origin.y + Math.sin((direction * Math.PI) / 8) * ring * 80;
          if (
            locations.some(
              (other) =>
                other !== c &&
                Math.hypot(other.x - x, other.y - y) <
                  radius +
                    (settlementExtent[rankOf(other.size, other.id)] + 200) /
                      scale,
            )
          )
            continue;
          if (dryFootprint(x, y, radius)) {
            c.x = x;
            c.y = y;
            found = true;
            break;
          }
        }
      if (!found) throw Error(`No safe settlement footprint for ${c.name}`);
    }
  function surfaceMargin() {
    return (
      ((Math.max(world.geography!.width, world.geography!.height) * scale) /
        1024) *
      2
    );
  }
  if (version === 3)
    for (const parent of [...locations].filter((c) =>
      ["city", "metropolis"].includes(rankOf(c.size, c.id)),
    )) {
      let accepted = 0;
      for (let attempt = 0; attempt < 24 && accepted < 3; attempt++) {
        const size = accepted === 1 ? "town" : "village",
          extent = settlementExtent[size],
          angle = (attempt * Math.PI) / 6;
        const distance =
          (settlementExtent[rankOf(parent.size, parent.id)] +
            extent +
            1400 +
            Math.floor(attempt / 12) * 1600) /
          scale;
        const x = parent.x + Math.cos(angle) * distance,
          y = parent.y + Math.sin(angle) * distance,
          radius = (extent + surfaceMargin()) / scale;
        if (
          locations.some(
            (c) =>
              Math.hypot(c.x - x, c.y - y) <
              radius + (settlementExtent[rankOf(c.size, c.id)] + 200) / scale,
          ) ||
          !dryFootprint(x, y, radius)
        )
          continue;
        locations.push({
          id: `satellite-${parent.id}-${accepted}`,
          name: `${parent.name} · ${["Market suburb", "Works town", "Garden village"][accepted]}`,
          x,
          y,
          size,
          scenic: true,
        });
        accepted++;
      }
    }
  const reserves = locations.map((c) => ({
    x: c.x,
    y: c.y,
    radius:
      (version === 3
        ? settlementExtent[rankOf(c.size, c.id)] * Math.SQRT2 + 150
        : 300) / scale,
  }));
  const rural = generatePacingCountryside(
    world,
    scale,
    reserves,
    version === 3,
  );
  const surface = buildConnectedTerrain(
    world,
    scale,
    [
      ...reserves,
      ...(version === 3
        ? rural.pois.map((p) => ({
            x: p.x,
            y: p.y,
            radius: (p.extent * Math.SQRT2 + 150) / scale,
          }))
        : []),
      ...(version === 2
        ? rural.farms.map((f) => ({ x: f.x, y: f.y, radius: f.extent / scale }))
        : []),
    ],
    [],
    version === 3 ? { resolution: 1024, lowlandRelief: true } : {},
  );
  surface.step *= scale;
  surface.scale = 1;
  surface.ranges = surface.ranges.map((r) => ({
    ...r,
    x: r.x * scale,
    y: r.y * scale,
    radius: r.radius * scale,
  }));
  const sites: SlicePlan["sites"] = [
    {
      id: "city",
      name: home.name,
      x: home.x * scale,
      z: home.y * scale,
      extent: version === 3 ? settlementExtent.city : 176,
      ...(version === 3
        ? {
            rank: "city" as const,
            poi: generateCountrySettlement(732, "city", 340),
          }
        : {}),
    },
  ];
  for (const [i, c] of locations.entries())
    if (c !== home) {
      const kinds: POIKind[] = [
        "crossroads-market",
        "mill-village",
        "ribbon-hamlet",
        "estate-hamlet",
      ];
      const poi =
        version === 3
          ? generateCountrySettlement(732 + i * 97, rankOf(c.size, c.id))
          : generateCountryPOI(kinds[i % kinds.length], 732 + i * 97, {
              size:
                c.size === "city" || c.size === "metropolis"
                  ? "district"
                  : "estate",
            });
      sites.push({
        id: c.id,
        name: c.name,
        x: c.x * scale,
        z: c.y * scale,
        extent: poi.extent,
        poi,
        ...(version === 3 ? { rank: rankOf(c.size, c.id) } : {}),
        ...(c.scenic ? { scenic: true } : {}),
      });
    }
  for (const c of rural.pois) {
    const industry = [
      "foundry",
      "coal-yard",
      "sawmill",
      "boiler-yard",
      "rail-freight",
    ].includes(c.kind);
    const poi = generateCountryPOI(
      c.kind,
      c.seed,
      version === 3
        ? {
            size: industry ? "district" : "estate",
            industrialComplex: industry,
          }
        : undefined,
    );
    sites.push({
      id: c.id,
      name: c.name,
      x: c.x * scale,
      z: c.y * scale,
      extent: poi.extent,
      poi,
      ...(version === 3 ? { rank: "site" as const } : {}),
      ...(c.scenic ? { scenic: true } : {}),
    });
  }
  // Keep roster roles stable, choosing actual country locations near headquarters.
  const nearby = sites
    .slice(1)
    .sort(
      (a, b) =>
        Math.hypot(a.x - sites[0].x, a.z - sites[0].z) -
        Math.hypot(b.x - sites[0].x, b.z - sites[0].z),
    );
  if (version === 3) {
    const farm = nearby.findIndex(
      (s) => s.poi?.kind === "farmstead" && s.poi.fields.length > 0,
    );
    if (farm >= 0) nearby.unshift(nearby.splice(farm, 1)[0]);
  }
  for (const [i, id] of [
    "north-farm",
    "hamlet",
    "outpost",
    "mill-town",
    "east-town",
    "estate",
    "fuel-station",
  ].entries()) {
    nearby[i].id = id;
    delete nearby[i].scenic;
  }
  // Reserve flat, dry tactical footprints in the coarse country lattice. Buildings are never scaled.
  for (const site of version === 2 ? sites : []) {
    const cx = Math.floor(site.x / surface.step),
      cz = Math.floor(site.z / surface.step),
      r = Math.ceil((site.extent + 150) / surface.step);
    for (let z = cz - r; z <= cz + 1 + r; z++)
      for (let x = cx - r; x <= cx + 1 + r; x++) {
        const i = z * surface.cols + x;
        if (x < 0 || z < 0 || x >= surface.cols || z >= surface.rows) continue;
        if (surface.land[i]) {
          surface.heights[i] = 0;
          surface.biomes[i] = 1;
        }
      }
  }
  const rivers = world.geography!.rivers.map((r) =>
    r.map(([x, y]) => ({ x: x * scale, z: y * scale })),
  );
  const physicalWorld = {
    geography: { rivers: rivers.map((r) => r.map((p) => [p.x, p.z])) },
  } as unknown as World;
  const destinations = sites.map((s) => ({
    id: s.id,
    name: s.name,
    x: s.x,
    y: s.z,
    major:
      version === 3
        ? ["city", "metropolis", "town"].includes(s.rank ?? "") ||
          s.poi?.kind === "foundry" ||
          s.poi?.kind === "coal-yard"
        : !s.poi || s.poi.extent > 100,
    radius: s.extent * Math.SQRT2,
    entrances: s.poi
      ? s.poi.entrances.map((e) => ({ x: s.x + e.x, y: s.z + e.z }))
      : [{ x: s.x + 260, y: s.z }],
  }));
  const roads = buildCountryRoadNetwork(physicalWorld, surface, destinations);
  // Use the authored city street throat, connecting it to the country road entrance.
  for (const road of base.roads.roads.filter((r) => r.id === "city-approach"))
    roads.roads.push({
      ...road,
      path: road.path.map((p) => ({
        x: p.x - 500 + sites[0].x,
        y: p.y - 900 + sites[0].z,
      })),
    });
  const obstacles = base.obstacles
    .filter((o) => Math.abs(o.x - 500) < 220 && Math.abs(o.z - 900) < 220)
    .map((o) => ({
      ...o,
      x: o.x - 500 + sites[0].x,
      z: o.z - 900 + sites[0].z,
    }));
  for (const site of sites)
    for (const o of site.poi?.obstacles ?? [])
      obstacles.push({
        ...o,
        id: site.id + "-" + o.id,
        x: site.x + o.x,
        z: site.z + o.z,
      });
  const farms =
    version === 3
      ? generateRegionalFarmland(
          world,
          scale,
          sites.map((s) => ({
            x: s.x / scale,
            y: s.z / scale,
            radius: ((s.extent + 30) * Math.SQRT2) / scale,
          })),
          surface,
          roads,
        )
      : rural.farms;
  const fields = farms
    .flatMap((f) => f.fields)
    .map((f) => ({ ...f, x: f.x * scale, y: f.y * scale }))
    .filter(countryRoadFieldFilter(roads));
  return {
    ...base,
    width: world.geography!.width * scale,
    depth: world.geography!.height * scale,
    source: { seed: world.seed, x: 0, y: 0, scale },
    surface,
    roads,
    rivers,
    sites,
    obstacles,
    cover: [],
    campaignMap: { version, seed: world.seed, modelPerWorld: scale, fields },
  };
}

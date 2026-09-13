import {
  createSliceState,
  ensureSliceSquads,
  syncSliceSquads,
  createSliceNavigation,
  type SlicePlan,
  type SliceState,
  type SliceUnit,
  type SlicePoint,
} from "./countrySlice";
import {
  advanceCountryCombat,
  countryVisibility,
  encounterSight,
} from "./countryEncounter";
import { generateCountryPOI, type POIKind } from "./countryPOI";
import { buildCountryRoadNetwork } from "./countryRoadNetwork";
import { terrainHeight } from "./connectedTerrain";
import { countryTerrainNoise } from "./countryTerrainNoise";
import { segmentDistance } from "./organicCity";
import { obstacleDistance, coverAtObstacles } from "./cityTactics";
import { validateCityBuild } from "./cityBuildPlacement";
import type { World } from "./index";

/** A versioned campaign geography assembled from the shared city/country planners. */
export function createCampaignPlan(base: SlicePlan): SlicePlan {
  const width = 6000,
    depth = 3600,
    step = base.surface.step;
  const cols = width / step + 1,
    rows = depth / step + 1;
  const surface = {
    ...base.surface,
    seed: "Meridian-campaign-alpha-1",
    cols,
    rows,
    heights: new Float32Array(cols * rows),
    land: new Uint8Array(cols * rows).fill(1),
    biomes: new Uint8Array(cols * rows).fill(1),
    mountainWeight: new Float32Array(cols * rows),
  };
  const sites = structuredClone(base.sites);
  const extra: [string, string, POIKind, number, number][] = [
    ["north-farm", "Northfield farms", "farmstead", 750, 2450],
    ["mill-town", "Briar mill town", "mill-village", 2100, 2700],
    ["freight", "Alder freight yard", "rail-freight", 3570, 850],
    ["east-town", "Ashcombe", "crossroads-market", 4830, 2310],
    ["estate", "Harrow estate", "estate-hamlet", 3880, 2940],
    ["farmland", "Lower grainlands", "strip-fields", 5300, 720],
    [
      "warehouse",
      "Abandoned wool warehouse",
      "abandoned-warehouse",
      3000,
      1950,
    ],
  ];
  for (const [id, name, kind, x, z] of extra) {
    const poi = generateCountryPOI(kind, 732 + sites.length * 97);
    let point: SlicePoint | undefined;
    for (let r = 0; r <= 360 && !point; r += 36)
      for (let a = 0; a < 12 && !point; a++) {
        const p = {
          x: x + Math.cos((a * Math.PI) / 6) * r,
          z: z + Math.sin((a * Math.PI) / 6) * r,
        };
        if (
          p.x < poi.extent + 40 ||
          p.z < poi.extent + 40 ||
          p.x > width - poi.extent - 40 ||
          p.z > depth - poi.extent - 40
        )
          continue;
        if (
          base.rivers.some((r) =>
            r
              .slice(1)
              .some(
                (b, i) =>
                  segmentDistance(p, r[i], b) < poi.extent * Math.SQRT2 + 45,
              ),
          )
        )
          continue;
        if (
          sites.some(
            (s) =>
              Math.hypot(p.x - s.x, p.z - s.z) < s.extent + poi.extent + 250,
          )
        )
          continue;
        point = p;
      }
    if (!point) throw Error(`No safe campaign site for ${id}`);
    sites.push({ id, name, ...point, extent: poi.extent, poi });
  }
  for (let z = 0; z < rows; z++)
    for (let x = 0; x < cols; x++) {
      const px = x * step,
        pz = z * step,
        i = z * cols + x;
      if (px <= base.width && pz <= base.depth) {
        surface.heights[i] = terrainHeight(base.surface, px, pz);
        continue;
      }
      const bx = Math.min(base.width, px),
        bz = Math.min(base.depth, pz);
      const blend = Math.min(1, Math.hypot(px - bx, pz - bz) / 240);
      const relief = 10 + 9 * countryTerrainNoise(px * 0.003, pz * 0.003);
      let h =
        terrainHeight(base.surface, bx, bz) * (1 - blend) + relief * blend;
      const river = Math.min(
        ...base.rivers.flatMap((r) =>
          r.slice(1).map((b, j) => segmentDistance({ x: px, z: pz }, r[j], b)),
        ),
      );
      h =
        h * Math.min(1, Math.max(0, (river - 12) / 180)) -
        2 * Math.max(0, 1 - river / 12);
      surface.heights[i] = h;
    }
  // Site footprints and approach slopes agree with navigation and rendered ground.
  for (const site of sites.slice(base.sites.length))
    for (let z = 0; z < rows; z++)
      for (let x = 0; x < cols; x++) {
        const t = Math.max(
          0,
          Math.min(
            1,
            (Math.hypot(x * step - site.x, z * step - site.z) -
              site.extent * Math.SQRT2 -
              16) /
              180,
          ),
        );
        surface.heights[z * cols + x] *= t * t * (3 - 2 * t);
      }
  const destinations = sites.map((s) => ({
    id: s.id,
    name: s.name,
    x: s.x,
    y: s.z,
    major: s.id === "city" || s.id.includes("town"),
    radius: s.extent * Math.SQRT2,
    entrances: s.poi
      ? s.poi.entrances.map((e) => ({ x: s.x + e.x, y: s.z + e.z }))
      : [
          {
            ...base.roads.roads
              .find((r) => r.id === "city-approach")!
              .path.at(-1)!,
          },
        ],
  }));
  const world = {
    geography: { rivers: base.rivers.map((r) => r.map((p) => [p.x, p.z])) },
  } as unknown as World;
  const roads = buildCountryRoadNetwork(world, surface, destinations);
  roads.roads.push(...base.roads.roads.filter((r) => r.id === "city-approach"));
  if (roads.connectedSites !== sites.length)
    throw Error("Campaign road network is disconnected");
  const obstacles = [...base.obstacles];
  for (const site of sites.slice(base.sites.length))
    for (const o of site.poi?.obstacles ?? [])
      obstacles.push({
        ...o,
        id: site.id + "-" + o.id,
        x: site.x + o.x,
        z: site.z + o.z,
      });
  return { ...base, width, depth, surface, sites, roads, obstacles };
}

export const CAMPAIGN_ROSTER: readonly {
  id: number;
  name: string;
  kind: SliceUnit["kind"];
  enemy?: boolean;
  antiTank?: boolean;
  site: string;
  dx: number;
  dz: number;
}[] = [
  {
    id: 1,
    name: "1st Meridian Rifles",
    kind: "infantry",
    site: "city",
    dx: 0,
    dz: 19,
  },
  {
    id: 2,
    name: "2nd Meridian Rifles",
    kind: "infantry",
    site: "city",
    dx: 8,
    dz: 19,
  },
  {
    id: 3,
    name: "Meridian Landship",
    kind: "tank",
    site: "city",
    dx: 16,
    dz: 19,
  },
  {
    id: 4,
    name: "Scout airship",
    kind: "airship",
    site: "city",
    dx: 0,
    dz: 35,
  },
  {
    id: 5,
    name: "Northfield Rifles",
    kind: "infantry",
    site: "north-farm",
    dx: -40,
    dz: 110,
  },
  {
    id: 6,
    name: "Northfield AT",
    kind: "infantry",
    antiTank: true,
    site: "north-farm",
    dx: -55,
    dz: 110,
  },
  {
    id: 21,
    name: "Crown river guard",
    kind: "infantry",
    enemy: true,
    site: "hamlet",
    dx: 100,
    dz: 30,
  },
  {
    id: 22,
    name: "Crown AT section",
    kind: "infantry",
    antiTank: true,
    enemy: true,
    site: "outpost",
    dx: 30,
    dz: 80,
  },
  {
    id: 23,
    name: "Crown eastern landship",
    kind: "tank",
    enemy: true,
    site: "outpost",
    dx: 40,
    dz: 80,
  },
  {
    id: 24,
    name: "Crown northern patrol",
    kind: "infantry",
    enemy: true,
    site: "north-farm",
    dx: 55,
    dz: 120,
  },
  {
    id: 25,
    name: "Crown northern support",
    kind: "infantry",
    enemy: true,
    site: "north-farm",
    dx: 70,
    dz: 135,
  },
  {
    id: 26,
    name: "Crown mill guard",
    kind: "infantry",
    enemy: true,
    site: "mill-town",
    dx: 30,
    dz: 100,
  },
  {
    id: 27,
    name: "Crown reserve landship",
    kind: "tank",
    enemy: true,
    site: "east-town",
    dx: 30,
    dz: 100,
  },
  {
    id: 28,
    name: "Crown estate guard",
    kind: "infantry",
    enemy: true,
    site: "estate",
    dx: 40,
    dz: 110,
  },
];
export type CampaignTerritory = SlicePoint & {
  id: string;
  name: string;
  owner: 0 | 1 | null;
  occupier: 0 | 1 | null;
  progress: number;
  area: number;
};
export type CampaignState = SliceState & {
  campaign: {
    schema: 1;
    mapVersion?: 1 | 2 | 3;
    name: string;
    created: number;
    territories: CampaignTerritory[];
    supplies: number;
    incomeAt: number;
    log: { at: number; text: string }[];
  };
};
export function createCampaignState(
  plan: SlicePlan,
  now: number,
  nav = createSliceNavigation(plan),
): CampaignState {
  const s = createSliceState(now) as CampaignState;
  s.running = true;
  s.lighting = "day";
  s.battlefield = {
    elapsed: 0,
    remainder: 0,
    sequence: 0,
    shots: [],
    pending: [],
  };
  s.sandbags = [];
  const locate = (p: SlicePoint, kind: SliceUnit["kind"]) => {
    for (let r = 0; r < 100; r += 2)
      for (let a = 0; a < 16; a++) {
        const q = {
          x: p.x + Math.cos((a * Math.PI) / 8) * r,
          z: p.z + Math.sin((a * Math.PI) / 8) * r,
        };
        if (nav.walkable(q, kind)) return q;
      }
    throw Error("Campaign deployment is obstructed");
  };
  s.units = CAMPAIGN_ROSTER.map((spec) => {
    const site = plan.sites.find((p) => p.id === spec.site)!;
    const { id, name, kind, enemy, antiTank } = spec;
    return {
      id,
      name,
      kind,
      enemy,
      antiTank,
      ...locate({ x: site.x + spec.dx, z: site.z + spec.dz }, spec.kind),
      health: 100,
      angle: spec.enemy ? -Math.PI / 2 : Math.PI / 2,
      distance: 0,
      path: [],
      cover: false,
    };
  });
  ensureSliceSquads(s);
  for (const u of s.units)
    for (const m of u.members ?? []) Object.assign(m, locate(m, m.kind));
  const territories = plan.sites
    .filter((p) => !p.scenic)
    .map((p) => ({
      id: p.id,
      name: p.name,
      x: p.x,
      z: p.z,
      owner: (["city", "fuel-station", "north-farm"].includes(p.id)
        ? 0
        : ["hamlet", "outpost", "mill-town", "east-town", "estate"].includes(
              p.id,
            )
          ? 1
          : null) as 0 | 1 | null,
      occupier: null,
      progress: 0,
      area: 0,
    }));
  const areaStep = plan.campaignMap
    ? Math.max(plan.width, plan.depth) / 256
    : 60;
  for (let z = areaStep / 2; z < plan.depth; z += areaStep)
    for (let x = areaStep / 2; x < plan.width; x += areaStep) {
      if (
        plan.campaignMap &&
        !plan.surface.land[
          Math.round(z / plan.surface.step) * plan.surface.cols +
            Math.round(x / plan.surface.step)
        ]
      )
        continue;
      const nearest = territories.reduce((a, b) =>
        Math.hypot(a.x - x, a.z - z) < Math.hypot(b.x - x, b.z - z) ? a : b,
      );
      nearest.area += areaStep * areaStep;
    }
  s.campaign = {
    schema: 1,
    mapVersion: plan.campaignMap?.version ?? 1,
    name: "Meridian campaign",
    created: now,
    territories,
    supplies: 100,
    incomeAt: 60,
    log: [
      {
        at: 0,
        text: "Meridian command established. Northfield patrols report hostile activity.",
      },
    ],
  };
  return s;
}
export function advanceCampaign(
  state: CampaignState,
  now: number,
  plan: SlicePlan,
  nav: ReturnType<typeof createSliceNavigation>,
  sight = encounterSight(plan),
  vision = countryVisibility(plan, sight),
) {
  advanceCountryCombat(state, now, sight, plan, nav, vision, () =>
    advanceCampaignControl(state, 0.25, plan),
  );
}
function advanceCampaignControl(
  state: CampaignState,
  dt: number,
  plan: SlicePlan,
) {
  const living = state.units
    .flatMap((u) => u.members ?? [u])
    .filter((u) => u.health !== 0);
  for (const t of state.campaign.territories) {
    const radius = Math.max(45, plan.sites.find((s) => s.id === t.id)!.extent);
    const occupiers = new Set(
      living
        .filter(
          (u) =>
            u.kind === "infantry" &&
            (u.x - t.x) ** 2 + (u.z - t.z) ** 2 < radius * radius,
        )
        .map((u) => (u.enemy ? 1 : 0)),
    );
    const side =
      occupiers.size === 1 ? ([...occupiers][0] as 0 | 1) : undefined;
    if (side === undefined || side === t.owner) {
      t.progress = 0;
      t.occupier = null;
      continue;
    }
    if (t.occupier !== side) {
      t.progress = 0;
      t.occupier = side;
    }
    t.progress += dt;
    if (t.progress >= 30) {
      t.owner = side;
      t.progress = 0;
      t.occupier = null;
      state.campaign.log.push({
        at: state.battlefield!.elapsed,
        text: `${t.name} occupied by ${side === 0 ? "Meridian" : "Crown"} forces.`,
      });
    }
  }
  const income = Math.max(
    0,
    Math.floor((state.battlefield!.elapsed - state.campaign.incomeAt) / 60) + 1,
  );
  if (income) {
    state.campaign.supplies = Math.min(
      500,
      state.campaign.supplies +
        income *
          state.campaign.territories.filter((t) => t.owner === 0).length *
          5,
    );
    state.campaign.incomeAt += income * 60;
  }
  state.campaign.log = state.campaign.log.slice(-24);
  const crushed = new Set(
    (state.sandbags ?? [])
      .filter((b) =>
        living.some(
          (u) =>
            u.kind === "tank" &&
            obstacleDistance(u, {
              ...b,
              id: "bag",
              kind: "sandbag",
              width: 4,
              depth: 1,
            }) < 1.8,
        ),
      )
      .map((b) => b.id),
  );
  if (crushed.size) {
    state.sandbags = state.sandbags!.filter((b) => !crushed.has(b.id));
    state.revision++;
  }
  syncSliceSquads(state);
}
export function buildCampaignSandbags(
  state: CampaignState,
  plan: SlicePlan,
  nav: ReturnType<typeof createSliceNavigation>,
  p: SlicePoint,
  angle: number,
) {
  if (state.campaign.supplies < 10) throw Error("Need 10 supplies.");
  const units = state.units
    .flatMap((u) => u.members ?? [u])
    .filter((u) => u.health !== 0);
  if (
    !units.some(
      (u) =>
        !u.enemy &&
        u.kind === "infantry" &&
        Math.hypot(u.x - p.x, u.z - p.z) <= 40,
    )
  )
    throw Error("Build within 40 units of your infantry.");
  const placement = { ...p, angle, kind: "sandbags" as const };
  const reason = validateCityBuild(
    placement,
    (state.sandbags ?? []).map((b) => ({ ...b, kind: "sandbags" as const })),
    (q) => nav.walkable(q, "infantry"),
    (q) => terrainHeight(plan.surface, q.x, q.z),
    units,
  );
  if (reason) throw Error(reason);
  state.sandbags ??= [];
  state.sandbags.push({ ...p, angle, id: state.revision + 1 });
  state.campaign.supplies -= 10;
  state.revision++;
}

/** Dynamic cover is local to this campaign, never written into the shared base plan. */
const baseSightCache = new WeakMap<
  SlicePlan,
  ReturnType<typeof encounterSight>
>();
export function campaignRuntime(base: SlicePlan, state: CampaignState) {
  const plan = {
    ...base,
    obstacles: [
      ...base.obstacles,
      ...(state.sandbags ?? []).map((b) => ({
        ...b,
        id: `campaign-bag-${b.id}`,
        kind: "sandbag" as const,
        width: 4,
        depth: 1,
      })),
    ],
  };
  let baseSight = baseSightCache.get(base);
  if (!baseSight) {
    baseSight = encounterSight(base);
    baseSightCache.set(base, baseSight);
  }
  const bags = plan.obstacles.slice(base.obstacles.length);
  const sight = (a: SliceUnit, b: SliceUnit) =>
    baseSight!(a, b) * coverAtObstacles(b, a, bags).damageScale;
  const nav = createSliceNavigation(plan),
    vision = countryVisibility(base, sight);
  // Warm the forest index during setup, not in the first live combat update.
  const first = state.units[0];
  if (first) vision(first, first);
  return { plan, nav, sight, vision };
}

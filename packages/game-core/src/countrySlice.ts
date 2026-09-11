import {previewSlicePlacement} from "./slicePlacement";
import {stepCityInfantry} from "./cityInfantryMotion";
import { smoothVehiclePath } from "./vehiclePath";
import { variedMovementRoute } from "./variedMovementRoute";
import { coverSlots, COVER_ORDER_REACH } from "./cityCoverOrders";
import { coverAtObstacles } from "./cityTactics";
import { countryTerrainNoise } from "./countryTerrainNoise";
import { generateOSMCountryPOI, type OSMSample } from "./countryOSM";
import { createPacingStudy } from "./campaignPacingStudy";
import {
  buildConnectedTerrain,
  terrainHeight,
  type TerrainSurface,
} from "./connectedTerrain";
import {
  buildCountryRoadNetwork,
  type CountryRoadNetwork,
} from "./countryRoadNetwork";
import { generateCountryPOI, type CountryPOI } from "./countryPOI";
import {
  planCombinedDistrict,
  combinedHeight,
  combinedCanonicalZ,
} from "./combinedDistrict";
import { createCityTactics } from "./cityTactics";
import {
  planSettlementCity,
  settlementProfile,
  type SettlementContext,
} from "./settlementCity";
export const SLICE_CITY_SEED = 14664 ^ 15744;
import { cityBuildingEnvelope } from "./cityBuildingKit";
import { obstacleDistance, type CityObstacle } from "./cityTactics";
import { segmentDistance } from "./organicCity";
import type { World } from "./index";
export type SlicePoint = { x: number; z: number };
export type SlicePlan = {
  version: 9;
  source: { seed: string; x: number; y: number; scale: number };
  width: number;
  depth: number;
  surface: TerrainSurface;
  roads: CountryRoadNetwork;
  rivers: SlicePoint[][];
  cityContext: SettlementContext;
  city: ReturnType<typeof planCombinedDistrict>;
  sites: {
    id: string;
    name: string;
    x: number;
    z: number;
    extent: number;
    poi?: CountryPOI;
  }[];
  obstacles: CityObstacle[];
  cover: SlicePoint[];
};
const WIDTH = 3000,
  DEPTH = 1800,
  SCALE = 14.3;
/** A geographically anchored, bounded sector of the existing generated continent. */
export function createCountrySlice(sample?: OSMSample): SlicePlan {
  const world = createPacingStudy("Meridian").world,
    global = buildConnectedTerrain(world, SCALE),
    cityContext: SettlementContext = {
      seed: SLICE_CITY_SEED,
      size: "city",
      setting: "inland",
    },
    city = planSettlementCity(cityContext);
  const cityTactics = createCityTactics(
    city,
    cityContext.seed,
    settlementProfile(cityContext),
  );
  const exit = cityTactics.streets
    .flatMap((s) => s.points.map((p) => ({ ...p, width: s.width })))
    .filter((p) => p.x > 150 && cityTactics.walkable(p, "vehicle"))
    .sort((a, b) => Math.abs(a.z - 19) - Math.abs(b.z - 19) || b.x - a.x)[0];
  if (!exit) throw Error("City has no safe eastern street entrance");
  const candidates = (world.geography?.rivers ?? [])
    .flatMap((r) => r.slice(1).map((b, i) => ({ a: r[i], b })))
    .filter(({ a, b }) => Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]) * 1.5);
  const dry = (x: number, y: number) => {
    const ix = Math.round(x / global.step),
      iy = Math.round(y / global.step),
      i = iy * global.cols + ix;
    return (
      ix >= 0 &&
      iy >= 0 &&
      ix < global.cols &&
      iy < global.rows &&
      global.land[i] &&
      global.biomes[i] !== 4
    );
  };
  for (const { a, b } of candidates) {
    const source = {
      seed: "Meridian",
      x: (a[0] + b[0]) / 2,
      y: (a[1] + b[1]) / 2,
      scale: SCALE,
    };
    const toWorld = (x: number, z: number) => ({
      x: source.x + (x - WIDTH / 2) / SCALE,
      y: source.y + (z - DEPTH / 2) / SCALE,
    });
    if (
      ![0, 750, 1500, 2250, 3000].every((x) =>
        [0, 450, 900, 1350, 1800].every((z) => {
          const p = toWorld(x, z);
          return dry(p.x, p.y) && terrainHeight(global, p.x, p.y) < 2;
        }),
      )
    )
      continue;
    const sites: SlicePlan["sites"] = [
      {
        id: "city",
        name: "Meridian regional city",
        x: 500,
        z: 900,
        extent: 176,
      },
      {
        id: "fuel-station",
        name: "Fuel & provisions",
        x: 835,
        z: 900 + exit.z,
        extent: 44,
        poi: generateCountryPOI("fuel-station", SLICE_CITY_SEED + 1),
      },
      {
        id: "hamlet",
        name: sample ? "Riverward town" : "Riverward hamlet",
        x: 1150,
        z: 900,
        extent: sample ? 115 : 44,
        poi: sample
          ? generateOSMCountryPOI(sample, SLICE_CITY_SEED, "site", 0.65)
          : generateCountryPOI("ribbon-hamlet", 732),
      },
      {
        id: "outpost",
        name: "East-bank outpost",
        x: 2300,
        z: 900,
        extent: 44,
        poi: generateCountryPOI("road-redoubt", 733),
      },
    ];
    const step = 12,
      cols = WIDTH / step + 1,
      rows = DEPTH / step + 1,
      n = cols * rows;
    const surface: TerrainSurface = {
      version: 1,
      seed: "Meridian-sector-1",
      scale: 1,
      step,
      cols,
      rows,
      heights: new Float32Array(n),
      land: new Uint8Array(n).fill(1),
      biomes: new Uint8Array(n).fill(1),
      mountainWeight: new Float32Array(n),
      ranges: [],
      peak: 0,
    };
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x,
          p = toWorld(x * step, y * step);
        surface.land[i] = Number(!!dry(p.x, p.y));
        surface.heights[i] = terrainHeight(global, p.x, p.y);
      }
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        for (const site of sites) {
          const t = Math.max(
            0,
            Math.min(
              1,
              (Math.hypot(x * step - site.x, y * step - site.z) -
                site.extent * Math.SQRT2 -
                12) /
                48,
            ),
          );
          surface.heights[i] *= t * t * (3 - 2 * t);
        }
      }
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const wx = x * step - 500,
          wz = y * step - 900,
          d = Math.max(Math.abs(wx), Math.abs(wz)),
          blend = Math.max(0, Math.min(1, (208 - d) / 48));
        if (blend) {
          const lx = Math.max(-160, Math.min(160, wx)),
            lz = Math.max(-160, Math.min(160, wz));
          const h = combinedHeight(
            lx,
            combinedCanonicalZ({ x: lx, z: lz }, SLICE_CITY_SEED),
            settlementProfile(cityContext),
            true,
          );
          surface.heights[y * cols + x] =
            h * blend + surface.heights[y * cols + x] * (1 - blend);
        }
      }
    const rivers = (world.geography?.rivers ?? [])
      .map((r) =>
        r.map(([x, y]) => ({
          x: (x - source.x) * SCALE + WIDTH / 2,
          z: (y - source.y) * SCALE + DEPTH / 2,
        })),
      )
      .filter((r) =>
        r.some(
          (p) =>
            p.x > -500 && p.x < WIDTH + 500 && p.z > -500 && p.z < DEPTH + 500,
        ),
      );
    if (
      sites.some((s) =>
        rivers.some((r) =>
          r
            .slice(1)
            .some((b, i) => segmentDistance(s, r[i], b) < s.extent + 20),
        ),
      )
    )
      continue;
    // Actual gentle relief shared by scenery, road draping and authoritative movement.
    for (let z = 0; z < rows; z++)
      for (let x = 0; x < cols; x++) {
        const p = { x: x * step, z: z * step },
          i = z * cols + x;
        const smooth = (t: number) => {
          t = Math.max(0, Math.min(1, t));
          return t * t * (3 - 2 * t);
        };
        const reserve = Math.min(
          ...sites.map((s) =>
            smooth(
              (Math.hypot(p.x - s.x, p.z - s.z) - s.extent * Math.SQRT2 - 12) /
                400,
            ),
          ),
        );
        const riverDistance = Math.min(
          ...rivers.flatMap((r) =>
            r.slice(1).map((b, j) => segmentDistance(p, r[j], b)),
          ),
        );
        const bank = smooth((riverDistance - 12) / 320);
        const rolling = 20 * (0.5 + 0.5 * countryTerrainNoise(p.x * 0.003, p.z * 0.003));
        const ridge = Math.pow(1 - Math.abs(countryTerrainNoise(p.x * 0.0018 + 29, p.z * 0.0028 - 17)), 3);
        const relief = rolling + 18 * ridge;
        // Raised floodplain edges slope into the channel; settlements stay on
        // their authored ground and roads/navigation consume the same lattice.
        const channel = 2 * smooth((riverDistance - 12) / 32) * (1 - smooth((riverDistance - 44) / 80));
        const bed = -2 * (1 - smooth((riverDistance - 6) / 12));
        surface.heights[i] = (surface.heights[i] + relief * reserve) * bank + channel * reserve + bed;
      }
    const dest = sites.map((s) => ({
      id: s.id,
      name: s.name,
      x: s.x,
      y: s.z,
      major: s.id !== "hamlet",
      radius: s.extent * Math.SQRT2,
      entrances: s.poi
        ? s.poi.entrances.map((e) => ({ x: s.x + e.x, y: s.z + e.z }))
        : [{ x: s.x + 176 * Math.SQRT2 + 8, y: s.z + exit.z }],
    }));
    const localWorld = {
      geography: { rivers: rivers.map((r) => r.map((p) => [p.x, p.z])) },
    } as unknown as World;
    const roads = buildCountryRoadNetwork(localWorld, surface, dest);
    if (roads.connectedSites !== sites.length || !roads.bridges.length)
      continue;
    const obstacles: CityObstacle[] = cityTactics.obstacles.map((o) => ({
      ...o,
      id: `city-${o.id}`,
      x: o.x + 500,
      z: o.z + 900,
    }));
    sites.forEach((s) =>
      s.poi?.obstacles.forEach((o) =>
        obstacles.push({
          ...o,
          id: `${s.id}-${o.id}`,
          x: s.x + o.x,
          z: s.z + o.z,
        }),
      ),
    );
    // A serviced street reaches the regional socket; buildings keep their authored dimensions.
    roads.roads.push({
      id: "city-approach",
      startWidth: exit.width,
      transitionLength: 32,
      width: 6,
      highway: true,
      path: [
        { x: 500 + exit.x, y: 900 + exit.z },
        { x: 500 + 176 * Math.SQRT2 + 8, y: 900 + exit.z },
      ],
    });
    const cover: SlicePoint[] = [];
    for (const s of sites)
      for (const dx of [-8, 0, 8]) {
        const p = { x: s.x + dx, z: s.z + s.extent + 8 };
        if (obstacles.some((o) => obstacleDistance(p, o) < 5)) continue;
        obstacles.push({
          ...p,
          id: `cover-${cover.length}`,
          kind: "sandbag",
          width: 4,
          depth: 0.65,
          angle: 0,
        });
        cover.push({ x: p.x, z: p.z + 1.1 });
      }
    return {
      version: 9,
      source,
      width: WIDTH,
      depth: DEPTH,
      surface,
      roads,
      rivers,
      city,
      cityContext,
      sites,
      obstacles,
      cover,
    };
  }
  throw Error("No suitable dry river sector found in Meridian");
}
export type SliceUnit = SlicePoint & {
  members?: SliceUnit[];
  stance?: "move" | "hold";
  reaction?: {anchor:SlicePoint;next:number;health:number;target?:number};
  enemy?: boolean;
  health?: number;
  suppression?: number;
  antiTank?: boolean;
  fireMemory?: import("./squadFire").FireMemory;
  turretAngle?: number;
  nextShell?: number;
  speed?: number;
  firing?: boolean;
  motionRemainder?: number;
  id: number;
  name: string;
  kind: "infantry" | "tank" | "airship";
  angle: number;
  distance: number;
  path: SlicePoint[];
  guide?: SlicePoint[];
  cover: boolean;
  facing?: number;
};
export type SliceState = {
  encounter?: import("./countryEncounter").SliceEncounter;
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  time: number;
  running: boolean;
  pace: number;
  revision: number;
  units: SliceUnit[];
};
export function createSliceState(now: number): SliceState {
  return {
    version: 9,
    time: now,
    running: false,
    pace: 1,
    revision: 0,
    units: [
      { id: 1, name: "1st Rifles", kind: "infantry", x: 500, z: 919 },
      { id: 2, name: "2nd Rifles", kind: "infantry", x: 506, z: 919 },
      { id: 3, name: "Landship", kind: "tank", x: 512, z: 919 },
      { id: 4, name: "Scout airship", kind: "airship", x: 500, z: 930 },
    ].map((u) => ({
      ...u,
      kind: u.kind as SliceUnit["kind"],
      angle: Math.PI / 2,
      distance: 0,
      path: [],
      cover: false,
    })),
  };
}
const angleDelta = (a: number, b: number) =>
  Math.atan2(Math.sin(b - a), Math.cos(b - a));
export function ensureSliceSquads(state:SliceState) {
  for(const u of state.units)if(u.kind==="infantry"&&!u.members){
    const survivors=Math.ceil((u.health??100)*6/100);
    u.members=Array.from({length:6},(_,i)=>({...u,members:undefined,id:u.id*100+i,
      x:u.x+(i%3-1)*.7,z:u.z+(Math.floor(i/3)-.5)*.7,
      health:Math.max(0,Math.min(100,(u.health??100)*6-i*100)),path:u.path.map(p=>({...p})),guide:u.guide?.map(p=>({...p})),
      antiTank:u.antiTank&&i===0}));
  }
}
export function syncSliceSquads(state:SliceState){
  for(const u of state.units)if(u.members){
    const living=u.members.filter(m=>m.health!==0),lead=living.find(m=>m.path.length)||living[0];
    u.health=u.members.reduce((sum,m)=>sum+(m.health??100),0)/u.members.length;
    if(lead){u.x=lead.x;u.z=lead.z;u.angle=lead.angle;u.path=lead.path;u.guide=lead.guide;u.cover=living.every(m=>m.cover);u.suppression=Math.max(...living.map(m=>m.suppression??0));}
    else{u.path=[];u.guide=[];}
  }
}
export function advanceSlice(state: SliceState, now: number) {
  ensureSliceSquads(state);
  let seconds = (Math.max(0, now - state.time) / 1000) * state.pace;
  state.time = Math.max(state.time, now);
  if (!state.running) return;
  for (const u of state.units.flatMap(u=>u.members??[u])) {
    if (u.health === 0) continue;
    if(u.kind==="infantry"){
      const elapsed=seconds+(u.motionRemainder??0),steps=Math.floor((elapsed+1e-9)/.05);
      u.motionRemainder=Math.max(0,elapsed-steps*.05);
      const motion={...u,speed:u.speed??0,moving:!!u.path.length};
      for(let i=0;i<steps;i++){
        if(!motion.path.length&&(motion.facing===undefined||Math.abs(angleDelta(motion.angle,motion.facing))<1e-6)){motion.speed=0;break;}
        motion.moving=!!motion.path.length;
        stepCityInfantry(motion,.05,Infinity,()=>true);
      }
      u.x=motion.x;u.z=motion.z;u.angle=motion.angle;u.distance=motion.distance;u.speed=motion.speed;u.path=motion.path;
      if(!u.path.length)u.guide=[];
      else u.guide=u.guide?.filter(p=>u.path.some(q=>q.x===p.x&&q.z===p.z));
      continue;
    }
    let remaining = seconds;
    while (remaining > 0 && u.path.length) {
      const p = u.path[0],
        dx = p.x - u.x,
        dz = p.z - u.z,
        length = Math.hypot(dx, dz);
      if (length < 1e-7) {
        u.path.shift();
        continue;
      }
      const heading = Math.atan2(dx, dz),
        turn = angleDelta(u.angle, heading);
      if (u.kind === "tank" && Math.abs(turn) > 0.25) {
        const dt = Math.min(remaining, (Math.abs(turn) - 0.25) / 0.8);
        u.angle += Math.sign(turn) * dt * 0.8;
        remaining -= dt;
        if (remaining <= 0) break;
      } else if (u.kind !== "tank") u.angle = heading;
      const speed = u.kind === "tank" ? 2.3 : 6,
        travel = Math.min(length, remaining * speed);
      if (u.kind === "tank") {
        const steering = angleDelta(u.angle, heading);
        u.angle +=
          Math.sign(steering) *
          Math.min(Math.abs(steering), (travel / speed) * 0.8);
      }
      u.x += (dx / length) * travel;
      u.z += (dz / length) * travel;
      u.distance += travel;
      remaining -= travel / speed;
      if (travel >= length - 1e-7) {
        u.path.shift();
        while (
          u.guide?.length &&
          Math.hypot(u.guide[0].x - u.x, u.guide[0].z - u.z) < 1e-6
        )
          u.guide.shift();
      }
    }
    if (!u.path.length) u.guide = [];
    if (!u.path.length && u.facing !== undefined) {
      const turn = angleDelta(u.angle, u.facing);
      u.angle +=
        u.kind === "tank"
          ? Math.sign(turn) * Math.min(Math.abs(turn), remaining * 0.8)
          : turn;
    }
  }
  syncSliceSquads(state);
}
/** Fine local lattice uses the same building envelopes, terrain and bridge decks as the view. */
export function createSliceNavigation(plan: SlicePlan) {
  const cityNav = createCityTactics(
    plan.city,
    plan.cityContext.seed,
    settlementProfile(plan.cityContext),
  );
  const local = (p: SlicePoint) => ({ x: p.x - 500, z: p.z - 900 });
  const inCity = (p: SlicePoint) => {
    const q = local(p);
    return (
      Math.abs(q.x) < 159 &&
      Math.abs(
        combinedCanonicalZ(
          q,
          plan.cityContext.seed,
          settlementProfile(plan.cityContext),
        ),
      ) < 159
    );
  };
  const step = 3,
    cols = Math.ceil(plan.width / step) + 1,
    rows = Math.ceil(plan.depth / step) + 1;
  const obstacleCells = new Map<string, CityObstacle[]>();
  for (const o of plan.obstacles) {
    const r = Math.hypot(o.width, o.depth) / 2 + 3;
    for (
      let y = Math.floor((o.z - r) / 24);
      y <= Math.floor((o.z + r) / 24);
      y++
    )
      for (
        let x = Math.floor((o.x - r) / 24);
        x <= Math.floor((o.x + r) / 24);
        x++
      ) {
        const k = `${x}:${y}`,
          list = obstacleCells.get(k) ?? [];
        list.push(o);
        obstacleCells.set(k, list);
      }
  }
  const onBridge = (p: SlicePoint, radius: number) =>
    plan.roads.bridges.some((b) => {
      const dx = p.x - b.x,
        dz = p.z - b.y,
        c = Math.cos(b.angle),
        s = Math.sin(b.angle);
      return (
        Math.abs(dx * c + dz * s) <= b.length / 2 &&
        Math.abs(-dx * s + dz * c) < b.width / 2 - radius
      );
    });
  function walkable(p: SlicePoint, kind: SliceUnit["kind"]) {
    if (p.x < 3 || p.z < 3 || p.x > plan.width - 3 || p.z > plan.depth - 3)
      return false;
    if (kind === "airship") return true;
    if (inCity(p))
      return cityNav.walkable(
        local(p),
        kind === "tank" ? "vehicle" : "infantry",
      );
    const radius = kind === "tank" ? 1 : 0.3,
      s = plan.surface,
      i = Math.round(p.z / s.step) * s.cols + Math.round(p.x / s.step);
    if (!s.land[i] || s.biomes[i] === 4) return false;
    if (
      (
        obstacleCells.get(`${Math.floor(p.x / 24)}:${Math.floor(p.z / 24)}`) ??
        []
      ).some((o) => obstacleDistance(p, o) < (kind === "tank" ? 1.8 : radius))
    )
      return false;
    if (
      !onBridge(p, radius) &&
      plan.rivers.some((r) =>
        r.slice(1).some((b, i) => segmentDistance(p, r[i], b) < 6 + radius),
      )
    )
      return false;
    return true;
  }
  function clear(a: SlicePoint, b: SlicePoint, kind: SliceUnit["kind"]) {
    if (inCity(a) && inCity(b) && kind !== "airship")
      return cityNav.segmentClear(
        local(a),
        local(b),
        kind === "tank" ? "vehicle" : "infantry",
      );
    const d = Math.hypot(b.x - a.x, b.z - a.z),
      n = Math.max(1, Math.ceil(d));
    let h = terrainHeight(plan.surface, a.x, a.z);
    for (let i = 0; i <= n; i++) {
      const p = {
        x: a.x + ((b.x - a.x) * i) / n,
        z: a.z + ((b.z - a.z) * i) / n,
      };
      if (!walkable(p, kind)) return false;
      const next = terrainHeight(plan.surface, p.x, p.z);
      if (
        kind !== "airship" &&
        !inCity(p) &&
        i &&
        Math.abs(next - h) / (d / n || 1) > 0.18
      )
        return false;
      h = next;
    }
    return true;
  }
  function rawRoute(
    start: SlicePoint,
    end: SlicePoint,
    kind: SliceUnit["kind"],
  ): SlicePoint[] {
    if (!walkable(end, kind))
      throw Error("Destination blocked by terrain, water or cover");
    if (kind === "airship") return [{ ...end }];
    // Open ground can cross the settlement boundary anywhere, not only at its road portal.
    if (clear(start, end, kind)) return [{ ...end }];
    const cityKind = kind === "tank" ? "vehicle" : "infantry";
    if (inCity(start) && inCity(end)) {
      const path = cityNav.route(local(start), local(end), cityKind);
      if (!path.length) throw Error("No safe city street route");
      return path.slice(1).map((p) => ({ x: p.x + 500, z: p.z + 900 }));
    }
    const point = (i: number) => ({
        x: (i % cols) * step,
        z: Math.floor(i / cols) * step,
      }),
      near = (p: SlicePoint) =>
        Math.round(p.z / step) * cols + Math.round(p.x / step);
    const socket = (p: SlicePoint) => {
      const base = near(p),
        candidates = [];
      for (let y = -3; y <= 3; y++)
        for (let x = -3; x <= 3; x++) {
          const i = base + y * cols + x;
          if (i < 0 || i >= cols * rows) continue;
          const q = point(i);
          candidates.push({ i, q, d: Math.hypot(q.x - p.x, q.z - p.z) });
        }
      return candidates
        .sort((a, b) => a.d - b.d)
        .find((c) => clear(p, c.q, kind))?.i;
    };
    const first = socket(start),
      last = socket(end);
    if (first === undefined || last === undefined)
      throw Error("No safe approach to that position");
    const costs = new Map<number, number>([[first, 0]]),
      prev = new Map<number, number>(),
      closed = new Set<number>();
    const heap: { i: number; f: number }[] = [];
    const push = (i: number, f: number) => {
      let k = heap.length;
      heap.push({ i, f });
      while (k) {
        const p = (k - 1) >> 1;
        if (heap[p].f <= f) break;
        heap[k] = heap[p];
        k = p;
      }
      heap[k] = { i, f };
    };
    const pop = () => {
      const top = heap[0],
        v = heap.pop()!;
      if (heap.length) {
        let k = 0;
        while (k * 2 + 1 < heap.length) {
          let c = k * 2 + 1;
          if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++;
          if (heap[c].f >= v.f) break;
          heap[k] = heap[c];
          k = c;
        }
        heap[k] = v;
      }
      return top.i;
    };
    // Weighted A* bounds interactive search; all traversable ground has equal cost.
    const heuristic = (i: number) =>
      Math.hypot(point(i).x - end.x, point(i).z - end.z) * 1.35;
    push(first, heuristic(first));
    while (heap.length && closed.size < 350000) {
      const i = pop();
      if (closed.has(i)) continue;
      closed.add(i);
      if (i === last) {
        const path = [end];
        let at = i;
        while (at !== first) {
          path.push(point(at));
          at = prev.get(at)!;
        }
        path.push(point(first));
        path.reverse();
        const smooth: SlicePoint[] = [];
        let a = start;
        for (let k = 0; k < path.length; k++) {
          let j = k;
          while (
            j + 1 < path.length &&
            j < k + 24 &&
            clear(a, path[j + 1], kind)
          )
            j++;
          smooth.push(path[j]);
          a = path[j];
          k = j;
        }
        return smooth;
      }
      const a = point(i);
      for (const [dx, dz] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]) {
        const j = i + dx + dz * cols;
        if (j < 0 || j >= cols * rows || closed.has(j)) continue;
        const b = point(j);
        if (!clear(a, b, kind)) continue;
        const cost = costs.get(i)! + Math.hypot(dx, dz) * step;
        if (cost < (costs.get(j) ?? Infinity)) {
          costs.set(j, cost);
          prev.set(j, i);
          push(j, cost + heuristic(j));
        }
      }
    }
    throw Error("No safe route found within this sector");
  }
  function route(
    start: SlicePoint,
    end: SlicePoint,
    kind: SliceUnit["kind"],
  ): SlicePoint[] {
    const path = rawRoute(start, end, kind);
    return kind === "tank"
      ? smoothVehiclePath([start, ...path], (a, b) => clear(a, b, kind)).slice(
          1,
        )
      : path;
  }
  return {
    walkable,
    clear,
    route,
    height: (p: SlicePoint) =>
      inCity(p)
        ? cityNav.surfaceHeight(local(p))
        : terrainHeight(plan.surface, p.x, p.z) + 0.15,
  };
}
export function commandSlice(
  plan: SlicePlan,
  nav: ReturnType<typeof createSliceNavigation>,
  state: SliceState,
  ids: number[],
  action: "move" | "hold" | "cover",
  target?: SlicePoint,
  append = false,
  facing?: number,
) {
  if(ids.some(id=>state.units.find(u=>u.id===id)?.members)){
    const individual={...state,units:state.units.flatMap(u=>u.members??[u])};
    const members=state.units.filter(u=>ids.includes(u.id)).flatMap(u=>(u.members??[u]).filter(m=>m.health!==0));
    if(ids.some(id=>!state.units.some(u=>u.id===id))||new Set(ids).size!==ids.length)throw Error("Select valid squads");
    commandSlice(plan,nav,individual,members.map(m=>m.id),action,target,append,facing);
    syncSliceSquads(state);state.revision++;return;
  }
  const units = ids.map((id) => state.units.find((u) => u.id === id));
  if (units.some((u) => u?.enemy || u?.health === 0)) throw Error("Select surviving friendly squads");
  if (!ids.length || new Set(ids).size !== ids.length || units.some((u) => !u))
    throw Error("Select valid squads");
  let orderTarget=target;
  if(action==="cover"&&target&&!plan.obstacles.some(o=>o.kind!=="garden"&&obstacleDistance(target,o)<=COVER_ORDER_REACH)){
    orderTarget=[...plan.cover].sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z))[0];
    if(!orderTarget||Math.hypot(orderTarget.x-target.x,orderTarget.z-target.z)>120)throw Error("No nearby free cover");
  }
  const placements=orderTarget?previewSlicePlacement(plan,nav,state,ids,orderTarget,facing):[];
  const paths=units.map(u=>{
    if(action==="hold")return [];
    if(!orderTarget)throw Error("Choose a destination");
    if(action==="cover"&&u!.kind!=="infantry")throw Error("Only infantry can take low cover");
    const placement=placements.find(p=>p.id===u!.id);
    if(u!.kind!=="airship"&&!placement?.valid)throw Error("No safe formation position");
    const end=placement??orderTarget;
    return nav.route(append&&u!.path.length?u!.path.at(-1)!:u!,end,u!.kind);
  });
  if (
    units.some(
      (u, i) =>
        (append ? u!.guide?.length || u!.path.length : 0) + paths[i].length >
        512,
    )
  )
    throw Error("Waypoint queue is full");
  const varied = units.map((u, i) => {
    const start = append && u!.path.length ? u!.path.at(-1)! : u!;
    return u!.kind === "infantry" && paths[i].length
      ? variedMovementRoute([start, ...paths[i]], u!.id, true, (a, b) =>
          nav.clear(a, b, "infantry"),
        )
      : { path: [start, ...paths[i]], guide: [] };
  });
  if (
    units.some(
      (u, i) =>
        (append ? u!.path.length : 0) + varied[i].path.length - 1 > 4096,
    )
  )
    throw Error("Waypoint queue is full");
  units.forEach((u, i) => {
    u!.path =
      append && action === "move"
        ? [...u!.path, ...varied[i].path.slice(1)]
        : varied[i].path.slice(1);
    u!.guide =
      append && action === "move"
        ? [...(u!.guide ?? []), ...varied[i].guide.slice(1)]
        : varied[i].guide.slice(1);
    u!.cover = action!=="hold" && (placements.find(p=>p.id===u!.id)?.cover??"none")!=="none";
    u!.stance=action==="hold"?"hold":"move";
    u!.reaction=undefined;
    u!.facing = action!=="hold" ? placements.find(p=>p.id===u!.id)?.angle??facing : undefined;
  });
  state.revision++;
}

/** Old layouts cannot retain paths through new buildings. Preserve valid positions and pause for review. */
export function upgradeSliceCity(
  state: SliceState,
  nav: ReturnType<typeof createSliceNavigation>,
) {
  if (state.version === 9) return;
  const defaults = createSliceState(state.time);
  for (const u of state.units.flatMap(u=>u.members??[u])) {
    u.path = [];
    u.guide = [];
    u.cover = false;
    if (!nav.walkable(u, u.kind)) {
      const origin = defaults.units.find((d) => d.id === (u.id>=100?Math.floor(u.id/100):u.id)) ?? u;
      let found: SlicePoint | undefined;
      for (let r = 0; r < 40 && !found; r += 2)
        for (let a = 0; a < 16 && !found; a++) {
          const p = {
            x: origin.x + Math.cos((a * Math.PI) / 8) * r,
            z: origin.z + Math.sin((a * Math.PI) / 8) * r,
          };
          if (nav.walkable(p, u.kind)) found = p;
        }
      if (!found) throw Error("No safe city migration position");
      u.x = found.x;
      u.z = found.z;
    }
  }
  state.running = false;
  state.version = 9;
  syncSliceSquads(state);
  state.revision++;
}

import { ensureMountainObstacles } from "./mountainObstacles.ts";
import { orderAttack } from "./attackOrders.ts";
import { startingTerritories } from "./startingTerritories.ts";
import { orderSquads, type LocalPoint } from "./localMovement.ts";
import { coverSite } from "./cover.ts";
import { canCaptureSettlement, settlementOwner } from "./settlementCapture.ts";
import { advanceTactics, beginEngagement, ensureTactics, isEngaged, syncSquads, type TacticalState } from "./tactics.ts";
import { generateContinent, type Geography } from "./geography.ts";

export const FACTIONS = [
  {
    id: "iron",
    name: "Iron Directorate",
    short: "Directorate",
    description: "Heavy steel. Deliberate advances.",
    bonus: "+10% attack power",
  },
  {
    id: "crown",
    name: "Crownward League",
    short: "Crownward",
    description: "Hold the line. Rebuild the ranks.",
    bonus: "+15% defense power",
  },
  {
    id: "aether",
    name: "Aether Compact",
    short: "Aether",
    description: "Experimental engines. Air superiority.",
    bonus: "Air support costs half the fuel",
  },
] as const;
export type Faction = (typeof FACTIONS)[number]["id"];
export const COLORS = [
  "#527b9e",
  "#ad6355",
  "#5b8b7d",
  "#b29a50",
  "#8d769d",
  "#bb845a",
  "#728d4e",
  "#7299a7",
];
export type Building = "factory" | "refinery" | "depot" | "fort";
export const BUILDINGS: Record<
  Building,
  { name: string; cost: number; hours: number; effect: string }
> = {
  factory: {
    name: "Factory",
    cost: 36,
    hours: 8,
    effect: "+2 industry / hour",
  },
  refinery: { name: "Refinery", cost: 28, hours: 6, effect: "+2 fuel / hour" },
  depot: {
    name: "Supply depot",
    cost: 24,
    hours: 6,
    effect: "Extends connected supply; +2 recovery / hour",
  },
  fort: {
    name: "Fortifications",
    cost: 30,
    hours: 8,
    effect: "+35% regional defense",
  },
};
export interface RegionFeature {
  id: string;
  kind: "settlement" | "forest" | "ridge" | "open" | "peaks";
  name: string;
  x: number;
  y: number;
  size?: "hamlet" | "village" | "town" | "city" | "metropolis";
  /** Settlement controller. Missing values in legacy saves inherit region ownership. */
  owner?: number | null;
}
export interface Region {
  id: number;
  name: string;
  x: number;
  y: number;
  polygon: number[][];
  area: number;
  neighbors: number[];
  terrain: "plains" | "forest" | "highlands" | "mountains";
  province?: number;
  elevation?: number;
  moisture?: number;
  coastal?: boolean;
  features?: RegionFeature[];
  landUse?: "agricultural" | "settled" | "wilderness";
  purpose?: "farming basin" | "woodland district" | "highland pass" | "upland district" | "port hinterland" | "settled heartland" | "wilderness";
  mountainObstacles?: import("./mountainObstacles.ts").MountainObstacle[];
  navigationCellSize?:number;
  contours?: [number,number][][];
  owner: number | null;
  garrison: number;
  consolidation: number;
  building: Building | null;
  construction: { kind: Building; remaining: number } | null;
}
export interface Nation {
  id: number;
  name: string;
  faction: Faction;
  color: string;
  bot: boolean;
  industry: number;
  fuel: number;
  manpower: number;
  capital: number;
}
export interface Army {
  squadKind?: "infantry" | "motorized";
  unitCount?: number;
  cover?: { region: number; feature: string };
  id: number;
  owner: number;
  region: number;
  strength: number;
  infantry: number;
  artillery: number;
  tanks: number;
  role: ArmyRole;
  motorized: number;
  order: "hold" | "advance" | "redeploy" | "reserve" | "recover";
  route: number[];
  campaignOwner: number | null;
  sector: number[];
  deployment: number;
  entrenchment: number;
  supplies: number;
  risk: "cautious" | "balanced" | "aggressive";
  fallback: number | null;
  status: string;
  target: number | null;
  progress: number;
  air: boolean;
}
export interface Dispatch {
  id: number;
  hour: number;
  text: string;
  region: number | null;
  owner: number | null;
  kind: "combat" | "build" | "order" | "world";
}
export interface World {
  mountainScenery?: import("./biomeScenery.ts").ScenerySprite[];
  vision?: { owner: number; visible: number[] };
  tactics?: TacticalState;
  version: 1 | 2;
  id: string;
  name: string;
  seed: string;
  hour: number;
  tickMs: number;
  nextTickAt: number;
  regions: Region[];
  geography?: Geography;
  nations: Nation[];
  armies: Army[];
  events: Dispatch[];
  eventSeq: number;
  majority: { owner: number; hours: number } | null;
  winner: number[] | null;
}
export function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function generateRegions(seed: string, seats: number): Region[] {
  return generateContinent(seed,seats).regions;
}
export function report(
  w: World,
  text: string,
  kind: Dispatch["kind"] = "world",
  region: number | null = null,
  owner: number | null = null,
) {
  w.events.push({ id: ++w.eventSeq, hour: w.hour, text, region, owner, kind });
  if (w.events.length > 250) w.events.shift();
}
export function createWorld(
  id: string,
  seed: string,
  seats: number,
  tickMs: number,
  now = Date.now(),
): World {
  const {regions,geography} = generateContinent(seed,seats);
  const nations: Nation[] = [];
  const starts = startingTerritories(regions,seats);
  for (let i = 0; i < seats; i++) {
    const start = regions[starts[i][0]];
    for(const id of starts[i]) {
      regions[id].owner=i;
      regions[id].garrison=id===start.id?32:26;
    }
    nations.push({
      id: i,
      name: [
        "Bluehaven Union",
        "Cinder Republic",
        "Verdant Pact",
        "Brass Dominion",
        "Violet Assembly",
        "Ember League",
        "Moss Federation",
        "Storm Accord",
      ][i],
      faction: FACTIONS[i % 3].id,
      color: COLORS[i],
      bot: true,
      industry: 70,
      fuel: 60,
      manpower: 80,
      capital: start.id,
    });
    start.building = "factory";
  }
  for (const region of regions)
    for (const feature of region.features ?? [])
      if (feature.kind === "settlement") feature.owner = region.owner;
  const w: World = {
    version: 2,
    id,
    name: "The " + seed + " campaign",
    seed,
    hour: 0,
    tickMs,
    nextTickAt: now + tickMs,
    regions,
    geography,
    nations,
    armies: nations.flatMap((n) => (["line", "assault", "mobile"] as const).map((role, i) =>
      makeStartingSquad(n.id + i * seats, n.id, n.capital, role))),
    events: [],
    eventSeq: 0,
    majority: null,
    winner: null,
  };
  ensureMountainObstacles(w);
  report(
    w,
    "The continent is open. Establish your borders and give your first orders.",
  );
  return w;
}
export function ownership(w: World) {
  const total = w.regions.filter(r=>r.terrain!=="mountains").reduce((s, r) => s + r.area, 0);
  return w.nations.map((n) => ({
    owner: n.id,
    area: w.regions
      .filter((r) => r.owner === n.id && r.terrain!=="mountains")
      .reduce((s, r) => s + r.area, 0),
    percent:
      (w.regions
        .filter((r) => r.owner === n.id && r.terrain!=="mountains")
        .reduce((s, r) => s + r.area, 0) /
        total) *
      100,
  }));
}
export function path(w: World, from: number, to: number): number[] {
  if(!w.regions[from]||!w.regions[to]||w.regions[from].terrain==="mountains"||w.regions[to].terrain==="mountains")return [];
  const seen = new Set([from]),
    q = [[from]];
  while (q.length) {
    const p = q.shift()!;
    if (p.at(-1) === to) return p;
    for (const n of w.regions[p.at(-1)!].neighbors)
      if (!seen.has(n) && w.regions[n].terrain!=="mountains") {
        seen.add(n);
        q.push([...p, n]);
      }
  }
  return [];
}
export const ARMY_ROLES = {
  line: { name: "Line army", description: "Infantry holds a sector; artillery wears down defenses.", infantry: 70, motorized: 0, artillery: 25, tanks: 5 },
  assault: { name: "Assault army", description: "Combined arms for deliberate breakthroughs.", infantry: 35, motorized: 10, artillery: 25, tanks: 30 },
  mobile: { name: "Mobile army", description: "Motorized infantry and armor exploit openings or reinforce a sector.", infantry: 10, motorized: 55, artillery: 10, tanks: 25 },
} as const;
export type ArmyRole = keyof typeof ARMY_ROLES;
export function makeArmy(id: number, owner: number, region: number, role: ArmyRole): Army {
  const composition = ARMY_ROLES[role];
  return { id, owner, region, role, strength: 100, infantry: composition.infantry,
    motorized: composition.motorized, artillery: composition.artillery, tanks: composition.tanks,
    order: "hold", target: null, route: [], campaignOwner: null, progress: 0, air: false,
    sector: [region], deployment: 0, entrenchment: 0, supplies: 12, risk: "balanced",
    fallback: null, status: "Holding position" };
}
/** One commandable formation per squad; compositions no longer hide extra units. */
export function makeStartingSquad(id: number, owner: number, region: number, role: ArmyRole): Army {
  const a = makeArmy(id, owner, region, role);
  a.squadKind = role === "mobile" ? "motorized" : "infantry";
  a.unitCount = role === "mobile" ? 2 : 6;
  a.infantry = role === "mobile" ? 0 : 100;
  a.motorized = role === "mobile" ? 100 : 0;
  a.tanks = 0; a.artillery = 0;
  return a;
}
export function formationName(a: Army): string {
  return a.squadKind ? a.squadKind === "motorized" ? "Mobile infantry squad" : "Infantry squad" : ARMY_ROLES[a.role].name;
}
// Pure, idempotent save upgrade; the store persists this inside its next transaction.
export function upgradeWorld(w: World): World {
  ensureMountainObstacles(w);
  if (w.version === 2) { ensureTactics(w); syncSquads(w); return w; }
  for (const r of w.regions) r.consolidation = 0;
  let nextId = Math.max(-1, ...w.armies.map(a => a.id)) + 1;
  for (const a of w.armies) {
    const old = { ...a };
    Object.assign(a, makeArmy(a.id, a.owner, a.region, "line"), {
      strength: old.strength, air: old.air,
      infantry: old.infantry, artillery: old.artillery, tanks: old.tanks,
    });
  }
  if (w.winner === null) for (const n of w.nations) {
    const land = w.regions.filter(r => r.owner === n.id);
    if (!land.length) continue;
    for (const [i, role] of (["assault", "mobile"] as const).entries())
      w.armies.push(makeArmy(nextId++, n.id, land[i % land.length].id, role));
  }
  w.version = 2;
  ensureTactics(w); syncSquads(w);
  if (w.winner === null) report(w, "Front-line rules activated. Existing armies hold position; assault and mobile armies are ready. Review your sectors and objectives.");
  return w;
}
export function friendlyPath(w: World, from: number, to: number, owner: number): number[] {
  return restrictedPath(w, from, to, r => r.owner === owner);
}
function restrictedPath(w: World, from: number, to: number, allowed: (r: Region) => boolean): number[] {
  if (!w.regions[from] || !w.regions[to] || !allowed(w.regions[from])) return [];
  const seen = new Set([from]), queue = [[from]];
  while (queue.length) {
    const route = queue.shift()!;
    if (route.at(-1) === to) return route;
    for (const id of w.regions[route.at(-1)!].neighbors)
      if (!seen.has(id) && w.regions[id].terrain !== "mountains" && allowed(w.regions[id])) { seen.add(id); queue.push([...route, id]); }
  }
  return [];
}
export function offensivePath(w: World, a: Army, target: number): number[] {
  const enemy = w.regions[target]?.owner;
  if (enemy === undefined) return [];
  return restrictedPath(w, a.region, target, r => r.owner === a.owner || r.owner === enemy);
}
// Supply has four-region reach from the capital. Connected, consolidated depots relay it.
// Fresh conquests can receive supply but cannot carry it farther until consolidated.
export function supplyNetwork(w: World, owner: number): Set<number> {
  const capital = w.nations[owner].capital;
  const reach = new Map<number, number>();
  if (w.regions[capital]?.owner !== owner) return new Set();
  const queue: [number, number][] = [[capital, 4]];
  while (queue.length) {
    const [id, incoming] = queue.shift()!;
    const r = w.regions[id];
    if (r.owner !== owner || r.terrain === "mountains") continue;
    const remaining = r.building === "depot" && r.consolidation === 0 ? 4 : incoming;
    if ((reach.get(id) ?? -1) >= remaining) continue;
    reach.set(id, remaining);
    if (remaining <= 0 || r.consolidation > 0) continue;
    for (const next of r.neighbors) queue.push([next, remaining - 1]);
  }
  return new Set(reach.keys());
}
export function supplied(w: World, a: Army): boolean { return supplyNetwork(w, a.owner).has(a.region); }
export function reserveCapacity(w: World, a: Army): number {
  return w.regions[a.region].building === "depot" ? 24 : 12;
}
export function coverage(w: World, a: Army): number[] {
  if (a.order !== "hold" || a.deployment > 0) return [a.region];
  return a.sector.filter(id => w.regions[id]?.owner === a.owner &&
    (id === a.region || w.regions[a.region].neighbors.includes(id)));
}
export function retreatThreshold(a: Army): number {
  return a.risk === "cautious" ? 45 : a.risk === "aggressive" ? 15 : 30;
}
export type Command =
  | { type: "squad-attack"; squads: string[]; target: string }
  | { type: "capture-settlement"; squads: string[]; region: number; feature: string }
  | { type: "garrison-squads"; squads:string[]; region:number; feature:string }
  | { type: "squad-order"; squads: string[]; mode: "move" | "hold"; points: LocalPoint[]; append?: boolean }
  | { type: "cover"; army: number; region: number; feature: string }
  | { type: "build"; region: number; building: Building }
  | { type: "order"; army: number; order: Army["order"]; target?: number }
  | { type: "sector"; army: number; regions: number[] }
  | { type: "policy"; army: number; risk: Army["risk"]; fallback: number | null }
  | { type: "air"; army: number; enabled: boolean };
export function command(w: World, owner: number, c: Command) {
  if (w.winner !== null) throw Error("This campaign has ended. Create another campaign to play again.");
  const n = w.nations[owner];
  if (!n) throw Error("Nation not found.");
  if (c.type === "squad-attack") {
    orderAttack(w, owner, c.squads, c.target);
    report(w, `${c.squads.length} squad(s): engaging designated target.`, "order", null, owner);
    return;
  }
  if (c.type === "capture-settlement") {
    const region = w.regions[c.region];
    const site = region?.features?.find(
      (feature) => feature.id === c.feature && feature.kind === "settlement",
    );
    if (!site) throw Error("Choose a settlement to capture.");
    if (settlementOwner(region, site) === owner)
      throw Error("You already control this settlement.");
    const selected = c.squads.map((id) =>
      w.tactics?.squads.find((squad) => squad.id === id),
    );
    if (
      selected.some(
        (squad) =>
          !squad || squad.owner !== owner || !canCaptureSettlement(squad),
      )
    )
      throw Error("Only your living ground squads can capture a settlement.");
    orderSquads(w, owner, c.squads, "move", [{ x: site.x, y: site.y }]);
    for (const squad of selected as NonNullable<(typeof selected)[number]>[])
      squad.captureSite = { region: region.id, feature: site.id };
    report(
      w,
      `${c.squads.length} squad(s) ordered to capture ${site.name}.`,
      "order",
      region.id,
      owner,
    );
    return;
  }
  if(c.type === "garrison-squads") {
    const region=w.regions[c.region];
    const site=region?.features?.find(f=>f.id===c.feature && f.kind==="settlement");
    if(!site || settlementOwner(region, site)!==owner) throw Error("Choose a settlement you control.");
    orderSquads(w,owner,c.squads,"move",[{x:site.x,y:site.y}]);
    for(const id of c.squads) w.tactics!.squads.find(s=>s.id===id)!.garrisonSite={region:c.region,feature:c.feature};
    report(w,`${c.squads.length} squad(s) ordered to garrison ${site.name}.`,"order",c.region,owner);
    return;
  }
  if (c.type === "squad-order") {
    orderSquads(w, owner, c.squads, c.mode, c.points, c.append);
    report(w, `${c.squads.length} squad(s): ${c.mode === "hold" ? "holding position" : "following local waypoints"}.`, "order", null, owner);
    return;
  }
  if (c.type === "build") {
    const r = w.regions[c.region], b = BUILDINGS[c.building];
    if (!r || r.owner !== owner || r.terrain === "mountains") throw Error("Build in a region you own.");
    if (r.building || r.construction) throw Error("This region already has a building or construction underway.");
    if (n.industry < b.cost) throw Error("Not enough industry. Let production replenish your reserves.");
    n.industry -= b.cost; r.construction = { kind: c.building, remaining: b.hours };
    report(w, `${n.name} began ${b.name.toLowerCase()} at ${r.name}.`, "build", r.id, owner);
    return;
  }
  const a = w.armies.find(a => a.id === c.army && a.owner === owner);
  if (!a) throw Error("You can only command your own army.");
  if (c.type === "cover") {
    const proposed = { ...a, cover: { region: c.region, feature: c.feature } };
    const site = coverSite(w, proposed);
    if (!site) throw Error("Choose a friendly settlement or fort for cover.");
    command(w, owner, { type: "order", army: a.id, order: c.region === a.region ? "hold" : "redeploy", ...(c.region === a.region ? {} : { target: c.region }) });
    a.cover = proposed.cover; a.sector = [a.region];
    a.status = `Moving to cover: ${site.name}`;
    report(w, `${ARMY_ROLES[a.role].name} ordered to take cover at ${site.name}.`, "order", c.region, owner);
    return;
  }
  if (c.type === "air") { a.air = c.enabled; return; }
  if (c.type === "policy") {
    if (c.fallback !== null && !friendlyPath(w, a.region, c.fallback, owner).length)
      throw Error("Choose a fallback connected through friendly territory.");
    a.risk = c.risk; a.fallback = c.fallback; return;
  }
  if (c.type === "sector") {
    if (c.regions.length < 1 || c.regions.length > 3 || new Set(c.regions).size !== c.regions.length ||
      !c.regions.includes(a.region) || c.regions.some(id => w.regions[id]?.owner !== owner || w.regions[id].terrain === "mountains" ||
        (id !== a.region && !w.regions[a.region].neighbors.includes(id))))
      throw Error("A sector includes headquarters and up to two adjacent friendly regions.");
    for (const s of w.tactics?.squads ?? []) if (s.army === a.id) { delete s.localOrder; delete s.independent; delete s.garrisonSite; delete s.captureSite; }
    delete a.cover;
    a.sector = [...c.regions]; a.deployment = 4; a.entrenchment = 0;
    stop(a, "hold", "Deploying across sector (4h)");
    report(w, `${ARMY_ROLES[a.role].name} is deploying across ${a.sector.length} regions.`, "order", a.region, owner);
    return;
  }
  if (c.order === "advance" || c.order === "redeploy") {
    if (c.target === undefined || !w.regions[c.target] || c.target === a.region)
      throw Error("Choose another reachable region as the objective.");
    const route = c.order === "redeploy" ? friendlyPath(w, a.region, c.target, owner) : offensivePath(w, a, c.target);
    if (!route.length) throw Error("No legal route. Redeploy through friendly land or select an objective across one opposing territory.");
    if (c.order === "advance" && w.regions[c.target].owner === owner)
      throw Error("Use Redeploy to move to friendly territory.");
    a.route = route.slice(1); a.target = c.target;
    a.campaignOwner = w.regions[c.target].owner;
    a.sector = [a.region]; a.entrenchment = 0;
  } else { a.target = null; a.route = []; }
  for (const s of w.tactics?.squads ?? []) if (s.army === a.id) { delete s.localOrder; delete s.independent; delete s.garrisonSite; delete s.captureSite; }
  delete a.cover;
  a.order = c.order; a.progress = 0;
  a.status = c.order === "advance" ? "Advancing along planned corridor" : c.order === "redeploy" ? "Redeploying through friendly territory" : c.order === "reserve" ? "Watching sector for attacks" : c.order === "recover" ? "Recovering strength" : "Holding sector";
  report(w, `${ARMY_ROLES[a.role].name}: ${a.status.toLowerCase()}.`, "order", a.target ?? a.region, owner);
}
export function stop(a: Army, order: "hold" | "recover", status: string) {
  delete a.cover;
  a.order = order; a.target = null; a.route = []; a.progress = 0; a.status = status;
}
export function moveArmy(a: Army, target: number) {
  a.region = target; a.sector = [target]; a.entrenchment = 0; a.deployment = 0;
  if (a.route[0] === target) a.route.shift();
}
export function withdraw(w: World, a: Army, excluded: Set<number> = new Set()): boolean {
  const route = a.fallback === null ? [] : friendlyPath(w, a.region, a.fallback, a.owner);
  const choices = [route[1], ...w.regions[a.region].neighbors];
  const next = choices.find(id => id !== undefined && !excluded.has(id) && w.regions[id].owner === a.owner && w.regions[id].terrain !== "mountains");
  if (next === undefined) return false;
  moveArmy(a, next); stop(a, "recover", "Withdrew; recovering strength");
  // Continue toward a chosen fallback at ordinary travel speed on following ticks.
  if (a.fallback !== null && a.region !== a.fallback) {
    const remaining = friendlyPath(w, a.region, a.fallback, a.owner);
    if (remaining.length > 1) { a.route = remaining.slice(1); a.target = a.fallback; }
  }
  report(w, `${ARMY_ROLES[a.role].name} withdrew to ${w.regions[next].name}.`, "combat", next, a.owner);
  return true;
}
export function advance(w: World, tacticalHours = 1) {
  if (w.winner !== null) return;
  w.hour++;
  for (const n of w.nations) {
    const land = w.regions.filter(r => r.owner === n.id);
    n.industry += land.length * 0.25 + land.filter(r => r.building === "factory").length * 2;
    n.fuel += land.length * 0.12 + land.filter(r => r.building === "refinery").length * 2;
    n.manpower = Math.min(200, n.manpower + land.length * 0.3);
  }
  for (const r of w.regions) {
    if (r.consolidation > 0) r.consolidation--;
    if (r.construction && --r.construction.remaining <= 0) {
      r.building = r.construction.kind; r.construction = null;
      report(w, `${BUILDINGS[r.building].name} completed in ${r.name}.`, "build", r.id, r.owner);
    }
    if (r.owner !== null && r.consolidation === 0) r.garrison = Math.min(32, r.garrison + 0.5);
  }
  const networks = w.nations.map(n => supplyNetwork(w, n.id));
  for (const a of w.armies) {
    if (a.strength <= 0) continue;
    const direct = w.tactics?.squads.filter(s => s.army === a.id && s.independent) ?? [];
    if (direct.length) {
      // Group logistics follow its actual squads; HQ no longer moves or captures for them.
      const n = w.nations[a.owner];
      const connected = direct.every(s => s.strength <= 0 || networks[a.owner].has(s.region));
      a.supplies = connected ? Math.min(reserveCapacity(w,a),a.supplies+2) : Math.max(0,a.supplies-1);
      for (const s of direct) {
        if(s.strength <= 0) continue;
        if(!networks[a.owner].has(s.region) && a.supplies === 0) s.strength=Math.max(0,s.strength-.02*s.capacity);
        else if(networks[a.owner].has(s.region) && s.localOrder?.mode === "hold" &&
          !w.tactics!.engagements.some(e=>e.region===s.region && e.status==="active")) {
          const amount=Math.max(0,Math.min(s.capacity-s.strength,n.manpower,n.industry*2,s.capacity*.02));
          s.strength+=amount;n.manpower-=amount;n.industry-=amount/2;
        }
      }
      a.strength=direct.reduce((sum,s)=>sum+s.strength,0);
      a.status="Following squad orders";
      continue;
    }
    const n = w.nations[a.owner], connected = networks[a.owner].has(a.region);
    a.sector = a.sector.filter(id => w.regions[id].owner === a.owner);
    if (!a.sector.includes(a.region)) a.sector = [a.region];
    if (a.deployment > 0) a.deployment--;
    a.supplies = connected ? Math.min(reserveCapacity(w, a), a.supplies + 2) : Math.max(0, a.supplies - 1);
    if (!connected && a.supplies === 0) {
      a.strength = Math.max(0, a.strength - 2);
      if (a.order !== "recover" || !a.route.length) {
        if (!withdraw(w, a)) stop(a, "recover", "Encircled: supplies exhausted; losing strength");
      }
    }
    if (n.bot && a.order === "hold" && a.strength > 60 && connected) {
      // Search friendly travel once; the first hostile border is a legal objective.
      const seen = new Set([a.region]), queue = [a.region];
      let target: number | undefined;
      while (queue.length && target === undefined) {
        const id = queue.shift()!;
        for (const next of w.regions[id].neighbors) {
          if (seen.has(next) || w.regions[next].terrain === "mountains") continue;
          seen.add(next);
          if (w.regions[next].owner !== a.owner) { target = next; break; }
          queue.push(next);
        }
      }
      // Line armies protect a frontier; mobile and assault armies expand.
      const front = w.regions[a.region].neighbors.filter(id => w.regions[id].owner === a.owner &&
        w.regions[id].neighbors.some(next => w.regions[next].owner !== a.owner && w.regions[next].terrain !== "mountains"));
      if (a.role === "line" && front.length) a.sector = [a.region, ...front.slice(0, 2)];
      else if (target !== undefined) command(w, a.owner, { type: "order", army: a.id, order: "advance", target });
    }
    if (a.order === "advance" && a.strength < retreatThreshold(a)) stop(a, "recover", "Offensive halted: recovering strength");
    if ((a.order === "hold" || a.order === "recover" || a.order === "reserve") && !a.route.length) {
      const amount = Math.max(0, Math.min(100 - a.strength, n.manpower, n.industry * 2,
        connected ? (a.order === "recover" ? 5 : 2) + (w.regions[a.region].building === "depot" ? 2 : 0) : 0));
      a.strength += amount; n.manpower -= amount; n.industry -= amount / 2;
      if (n.bot && a.order === "recover" && a.strength >= 85) stop(a, "hold", "Ready for orders");
    }
    if (a.order === "hold" && a.deployment === 0) a.entrenchment = Math.min(6, a.entrenchment + 1);
    else a.entrenchment = 0;
    if (a.order === "hold" && a.deployment === 0) a.status = "Holding sector";
  }
  // Reserves react to standing hostile offensives, then physically travel to reinforce.
  for (const a of w.armies.filter(a => a.order === "reserve" && !a.route.length && a.strength >= retreatThreshold(a))) {
    const threatened = a.sector.find(id => w.armies.some(enemy => enemy.owner !== a.owner &&
      enemy.order === "advance" && enemy.route[0] === id));
    if (threatened === undefined) continue;
    const route = friendlyPath(w, a.region, threatened, a.owner);
    if (route.length > 1) { a.route = route.slice(1); a.target = threatened; a.status = "Reserve responding to attack"; }
    else if (route.length === 1) stop(a, "hold", "Reserve holding threatened region");
  }
  const intents: { army: Army; from: number; target: number }[] = [];
  for (const a of w.armies) {
    if (a.strength <= 0 || !a.route.length || isEngaged(w, a.id)) continue;
    const target = a.route[0], next = w.regions[target], local = w.regions[a.region];
    if (!local.neighbors.includes(target) || !next || next.terrain === "mountains" ||
      (a.order !== "advance" && next.owner !== a.owner) ||
      (a.order === "advance" && next.owner !== a.owner && next.owner !== a.campaignOwner)) {
      stop(a, "hold", "Route blocked: choose a new objective");
      report(w, `${ARMY_ROLES[a.role].name} halted: its planned route is blocked.`, "order", a.region, a.owner); continue;
    }
    if (a.order === "advance" && local.consolidation > 0) { a.status = `Consolidating ${local.name}: ${local.consolidation}h`; continue; }
    if (a.order === "advance" && a.supplies < 3) { a.status = "Offensive paused: waiting for supply"; continue; }
    const fuelCost = (a.tanks + a.motorized) / 100;
    const fueled = w.nations[a.owner].fuel >= fuelCost;
    const needed = next.terrain === "highlands" ? 6 : next.owner === a.owner && a.motorized >= 40 && fueled ? 2 : 4;
    if (++a.progress >= needed) {
      a.progress = 0;
      if (fueled) w.nations[a.owner].fuel -= fuelCost;
      intents.push({ army: a, from: a.region, target });
    }
  }
  const blocked = new Set<number>();
  for (const x of intents) for (const y of intents)
    if (x.army.owner !== y.army.owner && x.from === y.target && y.from === x.target) {
      blocked.add(x.army.id); blocked.add(y.army.id);
    }
  for (const x of intents) {
    const other = intents.find(y => x.army.owner !== y.army.owner && x.from === y.target && y.from === x.target);
    if (other && x.army.id < other.army.id) beginEngagement(w, x.army, x.target);
  }
  intents.sort((x, y) => ((x.army.owner + w.hour) % w.nations.length) - ((y.army.owner + w.hour) % w.nations.length) || x.army.id - y.army.id);
  for (const { army: a, from, target } of intents) {
    if (blocked.has(a.id) || a.strength <= 0 || a.region !== from || a.route[0] !== target || w.regions[from].owner !== a.owner) continue;
    const r = w.regions[target], n = w.nations[a.owner];
    if (r.owner === a.owner) { moveArmy(a, target); continue; }
    if (a.order !== "advance" || r.owner !== a.campaignOwner) { stop(a, "hold", "Route blocked: ownership changed"); continue; }
    beginEngagement(w, a, target);
  }
  advanceTactics(w, tacticalHours);
  for (const a of w.armies) {
    if (w.tactics?.squads.some(s=>s.army===a.id && s.independent)) continue;
    if (a.target === a.region && !a.route.length) { const cover = a.cover; stop(a, a.order === "recover" ? "recover" : "hold", "Objective reached"); if (cover?.region === a.region) a.cover = cover; }
    if (a.strength > 0 && w.regions[a.region].owner !== a.owner && !withdraw(w, a)) a.strength = 0;
    if (a.strength <= 0) report(w, `${ARMY_ROLES[a.role].name} of ${w.nations[a.owner].name} was destroyed or surrendered.`, "combat", a.region, a.owner);
  }
  w.armies = w.armies.filter(a => a.strength > 0);

  const scores = ownership(w),
    majority = scores.find((s) => s.percent > 50);
  if (majority) {
    w.majority =
      w.majority?.owner === majority.owner
        ? { owner: majority.owner, hours: w.majority.hours + 1 }
        : { owner: majority.owner, hours: 1 };
  } else w.majority = null;
  if (w.majority && w.majority.hours >= 48) w.winner = [w.majority.owner];
  else if (w.hour >= 672) {
    const top = Math.max(...scores.map((s) => s.area));
    w.winner = scores
      .filter((s) => Math.abs(s.area - top) < 0.000001)
      .map((s) => s.owner);
  }
  if (w.winner !== null) {
    advanceTactics(w, 0);
    report(
      w,
      `Campaign concluded. ${w.winner.map((id) => w.nations[id].name).join(" and ")} hold the winning land share.`,
    );
  }
}

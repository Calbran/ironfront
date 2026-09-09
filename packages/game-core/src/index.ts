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
  const chosen: number[] = [];
  for (let i = 0; i < seats; i++) {
    const angle = (i / seats) * Math.PI * 2;
    const target = [geography.width/2 + Math.cos(angle)*geography.width*.32, geography.height/2 + Math.sin(angle)*geography.height*.32];
    const available = regions.filter((r) => r.owner === null && r.terrain !== "mountains");
    const start = available.sort(
      (a, b) =>
        Math.hypot(a.x - target[0], a.y - target[1]) -
        Math.hypot(b.x - target[0], b.y - target[1]),
    )[0];
    chosen.push(start.id);
    start.owner = i;
    start.garrison = 32;
    const queue = [start.id];
    let owned = 1;
    while (queue.length && owned < 4) {
      const r = regions[queue.shift()!];
      for (const n of r.neighbors) {
        if (regions[n].owner === null && regions[n].terrain !== "mountains" && owned < 4) {
          regions[n].owner = i;
          regions[n].garrison = 26;
          queue.push(n);
          owned++;
        }
      }
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
      makeArmy(n.id + i * seats, n.id, regions.filter(r => r.owner === n.id)[i]?.id ?? n.capital, role))),
    events: [],
    eventSeq: 0,
    majority: null,
    winner: null,
  };
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
// Pure, idempotent save upgrade; the store persists this inside its next transaction.
export function upgradeWorld(w: World): World {
  if (w.version === 2) return w;
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
  | { type: "build"; region: number; building: Building }
  | { type: "order"; army: number; order: Army["order"]; target?: number }
  | { type: "sector"; army: number; regions: number[] }
  | { type: "policy"; army: number; risk: Army["risk"]; fallback: number | null }
  | { type: "air"; army: number; enabled: boolean };
export function command(w: World, owner: number, c: Command) {
  if (w.winner !== null) throw Error("This campaign has ended. Create another campaign to play again.");
  const n = w.nations[owner];
  if (!n) throw Error("Nation not found.");
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
  a.order = c.order; a.progress = 0;
  a.status = c.order === "advance" ? "Advancing along planned corridor" : c.order === "redeploy" ? "Redeploying through friendly territory" : c.order === "reserve" ? "Watching sector for attacks" : c.order === "recover" ? "Recovering strength" : "Holding sector";
  report(w, `${ARMY_ROLES[a.role].name}: ${a.status.toLowerCase()}.`, "order", a.target ?? a.region, owner);
}
function stop(a: Army, order: "hold" | "recover", status: string) {
  a.order = order; a.target = null; a.route = []; a.progress = 0; a.status = status;
}
function moveArmy(a: Army, target: number) {
  a.region = target; a.sector = [target]; a.entrenchment = 0; a.deployment = 0;
  if (a.route[0] === target) a.route.shift();
}
function withdraw(w: World, a: Army, excluded: Set<number> = new Set()): boolean {
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
function defenseMultiplier(w: World, r: Region, artillery: number) {
  return (1 + (r.building === "fort" ? 0.35 * (1 - Math.min(0.8, artillery / 40)) : 0)) *
    (r.terrain === "highlands" ? 1.2 : r.terrain === "forest" ? 1.1 : 1) *
    (r.owner !== null && w.nations[r.owner].faction === "crown" ? 1.15 : 1);
}
export function advance(w: World) {
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
    if (a.strength <= 0 || !a.route.length) continue;
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
  for (const id of blocked) {
    const a = w.armies.find(a => a.id === id)!;
    a.strength = Math.max(0, a.strength - 8); a.status = "Opposing advance: line holds";
  }
  // Snapshot the deployed frontage before any arrivals, so a region never gets the
  // whole army merely because another attack resolved first.
  const deployed = new Map(w.armies.map(a => [a.id, coverage(w, a)]));
  intents.sort((x, y) => ((x.army.owner + w.hour) % w.nations.length) - ((y.army.owner + w.hour) % w.nations.length) || x.army.id - y.army.id);
  for (const { army: a, from, target } of intents) {
    if (blocked.has(a.id) || a.strength <= 0 || a.region !== from || a.route[0] !== target || w.regions[from].owner !== a.owner) continue;
    const r = w.regions[target], n = w.nations[a.owner];
    if (r.owner === a.owner) { moveArmy(a, target); continue; }
    if (a.order !== "advance" || r.owner !== a.campaignOwner) { stop(a, "hold", "Route blocked: ownership changed"); continue; }
    const defenders = w.armies.filter(d => d.owner === r.owner && d.strength > 0 &&
      deployed.get(d.id)!.includes(target) && coverage(w, d).includes(target));
    const shares = defenders.map(d => ({ army: d, strength: d.strength / deployed.get(d.id)!.length }));
    const armorFuel = (a.tanks + a.motorized) / 25;
    const fueled = n.fuel >= armorFuel;
    if (fueled) n.fuel -= armorFuel;
    const airCost = n.faction === "aether" ? 1 : 2;
    const air = a.air && n.fuel >= airCost;
    if (air) n.fuel -= airCost;
    const armorFactor = r.terrain === "plains" ? 1.8 : r.terrain === "forest" ? 0.8 : 0.5;
    const power = (a.infantry + a.motorized * (fueled ? 1.1 : 0.7) + a.artillery * 1.3 + a.tanks * armorFactor * (fueled ? 1 : 0.35)) / 100;
    const attack = a.strength * power * (n.faction === "iron" ? 1.1 : 1) * (a.supplies >= 6 ? 1 : 0.65) * (air ? 1.2 : 1);
    const fieldDefense = shares.reduce((sum, s) => sum + s.strength *
      (0.8 + (s.army.infantry + s.army.motorized) / 200) *
      (1 + Math.max(0, s.army.entrenchment - a.artillery / 10) * 0.06), 0);
    const defense = (r.garrison + fieldDefense) * defenseMultiplier(w, r, a.artillery);
    const loss = Math.min(a.strength, Math.max(5, defense * 0.22));
    a.strength -= loss; a.supplies = Math.max(0, a.supplies - (a.role === "line" ? 1 : 2));
    let damage = Math.max(7, attack * 0.36);
    // Field formations take their share of fire even while a garrison survives.
    const total = r.garrison + shares.reduce((sum, s) => sum + s.strength, 0);
    const garrisonHit = Math.min(r.garrison, total ? damage * r.garrison / total : damage);
    r.garrison -= garrisonHit; damage -= garrisonHit;
    let contested = false;
    for (const share of shares) {
      const d = share.army;
      const hit = Math.min(share.strength, damage * share.strength / Math.max(1, total - (r.garrison + garrisonHit)));
      d.strength = Math.max(0, d.strength - hit);
      d.entrenchment = Math.max(0, d.entrenchment - a.artillery / 20);
      const overrun = hit >= share.strength - 0.001 || d.strength < retreatThreshold(d);
      if (overrun) {
        if (d.region === target) {
          if (!withdraw(w, d, new Set([from])) && d.strength > 0) contested = true;
        } else {
          d.sector = d.sector.filter(id => id !== target);
          d.deployment = 4;
          d.status = "Sector pushed back; regrouping";
        }
      } else contested = true;
    }
    // Tiny residual floating-point garrisons must not prevent a capture.
    if (r.garrison < 0.5) r.garrison = 0;
    if (r.garrison === 0 && !contested && a.strength > 0) {
      r.owner = a.owner; r.garrison = 6; r.construction = null;
      r.consolidation = Math.max(3, Math.ceil(8 - (a.infantry + a.motorized) / 20));
      moveArmy(a, target); a.status = `Consolidating ${r.name}: ${r.consolidation}h`;
      report(w, `${n.name} captured ${r.name}; consolidation takes ${r.consolidation} hours.`, "combat", target, a.owner);
    } else {
      a.status = `Fighting for ${r.name}`;
      report(w, `Fighting at ${r.name}: ${ARMY_ROLES[a.role].name} lost ${Math.round(loss)} strength.`, "combat", target, a.owner);
    }
    if (a.strength < retreatThreshold(a)) stop(a, "recover", "Offensive halted: recovering strength");
  }
  for (const a of w.armies) {
    if (a.target === a.region && !a.route.length) stop(a, a.order === "recover" ? "recover" : "hold", "Objective reached");
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
  if (w.winner !== null)
    report(
      w,
      `Campaign concluded. ${w.winner.map((id) => w.nations[id].name).join(" and ")} hold the winning land share.`,
    );
}

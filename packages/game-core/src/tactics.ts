import { blockedByMountains } from "./mountainObstacles.ts";
import { refreshAttack } from "./attackOrders.ts";
import { crossRegionPath } from "./crossRegionPath.ts";
import { stepLocal, movementSpeed, type LocalOrder } from "./localMovement.ts";
import { coverSite, inCover } from "./cover.ts";
import { resolveSettlementCaptures } from "./settlementCapture.ts";
import {
  coverage,
  moveArmy,
  report,
  retreatThreshold,
  stop,
  withdraw,
  type Army,
  type World,
} from "./index.ts";

export interface Squad {
  movementLayer?: import("./mountainObstacles.ts").MovementLayer;
  fireProfile?: "semi" | "burst" | "automatic" | "cannon";
  vehicleProfile?: import("./vehicleTypes.ts").VehicleProfile;
  unitCount?: number;
  id: string;
  army: number | null;
  owner: number | null;
  region: number;
  kind: "infantry" | "motorized" | "armor" | "artillery" | "garrison";
  strength: number;
  capacity: number;
  morale: number;
  suppression: number;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  action: "holding" | "moving" | "firing" | "retreating" | "destroyed";
  target: string | null;
  fire: number;
  localOrder?: LocalOrder;
  independent?: boolean;
  garrisonSite?: {region:number;feature:string};
  captureSite?: {region:number;feature:string};
}
export interface Engagement {
  id: string;
  region: number;
  attackers: number[];
  direct?: boolean;
  started: number;
  elapsed: number;
  status: "active" | "captured" | "ended";
}
export interface TacticalState {
  movementSequence?: number;
  version: 1;
  time: number;
  revision: number;
  lastWallAt: number;
  squads: Squad[];
  engagements: Engagement[];
}
export function ensureTactics(w: World): TacticalState {
  return (w.tactics ??= {
    version: 1,
    time: 0,
    revision: 0,
    lastWallAt: 0,
    squads: [],
    engagements: [],
  });
}
function inside(w: World, region: number, x: number, y: number, layer: import("./mountainObstacles.ts").MovementLayer = "ground") {
  let hit = false;
  for (const ring of w.regions[region].contours ?? [w.regions[region].polygon])
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i],
        b = ring[j];
      if (
        a[1] > y !== b[1] > y &&
        x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
      )
        hit = !hit;
    }
  return hit && !blockedByMountains(w.regions[region].mountainObstacles, {x,y}, {x,y}, layer);
}
function position(
  w: World,
  region: number,
  dx: number,
  dy: number,
): [number, number] {
  const r = w.regions[region];
  for (let f = 1; f > 0.03; f *= 0.5)
    if (inside(w, region, r.x + dx * f, r.y + dy * f))
      return [r.x + dx * f, r.y + dy * f];
  return [r.x, r.y];
}
const radius = (w: World, region: number) =>
  Math.max(20, Math.min(100, Math.sqrt(w.regions[region].area) * 0.22));
function roster(
  a: Army,
): { kind: Squad["kind"]; capacity: number; unitCount?: number }[] {
  if (a.squadKind)
    return [
      {
        kind: a.squadKind,
        capacity: 100,
        unitCount: a.unitCount ?? (a.squadKind === "infantry" ? 6 : 2),
      },
    ];
  const result: { kind: Squad["kind"]; capacity: number }[] = [];
  for (const [kind, capacity] of [
    ["infantry", a.infantry],
    ["motorized", a.motorized],
    ["armor", a.tanks],
    ["artillery", a.artillery],
  ] as const) {
    const count = kind === "infantry" ? 3 : kind === "motorized" ? 2 : 1;
    if (capacity > 0)
      for (let i = 0; i < count; i++)
        result.push({ kind, capacity: capacity / count });
  }
  return result;
}
/** Reconcile external replenishment/losses without replacing surviving squad identities. */
export function syncSquads(w: World) {
  const t = ensureTactics(w);
  t.squads = t.squads.filter(
    (s) => s.army === null || w.armies.some((a) => a.id === s.army),
  );
  for (const a of w.armies) {
    let squads = t.squads.filter((s) => s.army === a.id);
    if (!squads.length) {
      squads = roster(a).map((r, i) => {
        const [x, y] = position(
          w,
          a.region,
          (i - 2) * 8,
          ((a.id % 3) - 1) * 12,
        );
        return {
          id: `army-${a.id}-${i}`,
          army: a.id,
          owner: a.owner,
          region: a.region,
          ...r,
          strength: (r.capacity * a.strength) / 100,
          morale: 1,
          suppression: 0,
          x,
          y,
          previousX: x,
          previousY: y,
          action: "holding" as const,
          target: null,
          fire: 0,
        };
      });
      t.squads.push(...squads);
    }
    const total = squads.reduce((sum, s) => sum + s.strength, 0),
      delta = a.strength - total;
    const weight = squads.reduce(
      (sum, s) => sum + (delta > 0 ? s.capacity - s.strength : s.strength),
      0,
    );
    for (const s of squads)
      if (s.strength <= 0 || (!s.independent && a.order === "recover")) {
        delete s.localOrder;
        delete s.captureSite;
      }
    if (weight > 0 && Math.abs(delta) > 1e-8)
      for (const s of squads)
        s.strength = Math.max(
          0,
          Math.min(
            s.capacity,
            s.strength +
              (delta * (delta > 0 ? s.capacity - s.strength : s.strength)) /
                weight,
          ),
        );
  }
}
export function beginEngagement(w: World, a: Army, region: number) {
  const t = ensureTactics(w);
  let e = t.engagements.find(
    (e) => e.region === region && e.status === "active",
  );
  if (!e) {
    e = {
      id: `battle-${region}-${w.hour}-${t.revision}`,
      region,
      attackers: [],
      started: w.hour,
      elapsed: 0,
      status: "active",
    };
    t.engagements.push(e);
    report(
      w,
      `An engagement began at ${w.regions[region].name}.`,
      "combat",
      region,
      a.owner,
    );
  }
  if (!e.attackers.includes(a.id)) e.attackers.push(a.id);
  a.status = `Fighting for ${w.regions[region].name}`;
}
export function isEngaged(w: World, army: number) {
  return (
    w.tactics?.engagements.some(
      (e) => e.status === "active" && e.attackers.includes(army),
    ) ?? false
  );
}
function capture(w: World, e: Engagement, a: Army) {
  const r = w.regions[e.region];
  r.owner = a.owner;
  r.garrison = 6;
  r.construction = null;
  r.consolidation = Math.max(3, Math.ceil(8 - (a.infantry + a.motorized) / 20));
  moveArmy(a, e.region);
  a.status = `Consolidating ${r.name}: ${r.consolidation}h`;
  e.status = "captured";
  report(
    w,
    `${w.nations[a.owner].name} captured ${r.name}; consolidation takes ${r.consolidation} hours.`,
    "combat",
    r.id,
    a.owner,
  );
}
/** Stable formation slots prevent every squad from seeking the same point. */
function formation(s: Squad): [number, number] {
  const index = Number(s.id.split("-").at(-1)) || 0;
  const army = s.army ?? 0;
  const angle = army * 2.3999632297;
  return [
    Math.cos(angle) * 18 + ((index % 3) - 1) * 12,
    Math.sin(angle) * 18 + (Math.floor(index / 3) - 1) * 12,
  ];
}

/** Local collision relaxation, bounded by land and game-time movement speed. */
function separateSquads(w: World, hours: number) {
  const squads = ensureTactics(w).squads.filter(
    (s) => s.strength > 0 && !s.localOrder && !s.independent,
  );
  for (let pass = 0; pass < 4; pass++) {
    const shifts = squads.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < squads.length; i++)
      for (let j = i + 1; j < squads.length; j++) {
        const a = squads[i],
          b = squads[j];
        if (a.region !== b.region) continue;
        const gap = 10;
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= gap) continue;
        // Coincident units need a deterministic direction, never a random jitter.
        const angle = (i * 17 + j * 31) * 2.3999632297;
        const ux = distance > 1e-6 ? dx / distance : Math.cos(angle);
        const uy = distance > 1e-6 ? dy / distance : Math.sin(angle);
        const push = Math.min((gap - distance) * 0.5, (hours * 30) / 4);
        shifts[i].x -= ux * push;
        shifts[i].y -= uy * push;
        shifts[j].x += ux * push;
        shifts[j].y += uy * push;
      }
    squads.forEach((s, i) => {
      const shift = shifts[i],
        length = Math.hypot(shift.x, shift.y);
      const limit = Math.min(1, (hours * 30) / 4 / Math.max(1e-9, length));
      const x = s.x + shift.x * limit,
        y = s.y + shift.y * limit;
      if (inside(w, s.region, x, y, s.movementLayer) && !blockedByMountains(w.regions[s.region].mountainObstacles,s,{x,y},s.movementLayer)) {
        s.x = x;
        s.y = y;
      } else if (inside(w, s.region, x, s.y, s.movementLayer) && !blockedByMountains(w.regions[s.region].mountainObstacles,s,{x,y:s.y},s.movementLayer)) s.x = x;
      else if (inside(w, s.region, s.x, y, s.movementLayer) && !blockedByMountains(w.regions[s.region].mountainObstacles,s,{x:s.x,y},s.movementLayer)) s.y = y;
    });
  }
}
/** Pure incremental combat. Live scheduling and offline test stepping use the same bounded rounds. */
export function advanceTactics(w: World, hours: number) {
  if (w.winner !== null) {
    if (w.tactics) {
      for (const e of w.tactics.engagements)
        if (e.status === "active") e.status = "ended";
      for (const s of w.tactics.squads) {
        s.target = null;
        if (s.action !== "destroyed") s.action = "holding";
      }
    }
    return;
  }
  const t = ensureTactics(w);
  syncSquads(w);
  for (const a of w.armies)
    if (a.cover && !coverSite(w, a)) {
      delete a.cover;
      a.status = "Cover lost; awaiting orders";
    }
  for (const s of t.squads) {
    s.previousX = s.x;
    s.previousY = s.y;
    s.target = null;
    s.action = s.strength > 0 ? "holding" : "destroyed";
  }
  // A command can withdraw a formation between campaign-hour ticks.
  for (const e of t.engagements.filter((e) => e.status === "active")) {
    e.attackers = e.attackers.filter((id) =>
      w.armies.some(
        (a) =>
          a.id === id &&
          a.strength > 0 &&
          a.order === "advance" &&
          a.route[0] === e.region &&
          w.regions[a.region].owner === a.owner &&
          a.supplies >= 3 &&
          w.regions[e.region].owner === a.campaignOwner,
      ),
    );
    if (
      t.squads.some(
        (s) =>
          s.independent &&
          s.region === e.region &&
          s.owner !== w.regions[e.region].owner &&
          s.strength > 0,
      )
    )
      e.direct = true;
    if (!e.attackers.length && !e.direct) e.status = "ended";
  }
  const assigned = new Map<string, Engagement>();
  for (const e of t.engagements.filter((e) => e.status === "active")) {
    const r = w.regions[e.region];
    for (const a of w.armies) {
      const attack = e.attackers.includes(a.id),
        sectors = coverage(w, a);
      if (!attack && (a.owner !== r.owner || !sectors.includes(e.region)))
        continue;
      const units = t.squads.filter((s) => s.army === a.id && !s.independent);
      units.forEach((s, i) => {
        if (
          !assigned.has(s.id) &&
          (attack || sectors[i % sectors.length] === e.region)
        )
          assigned.set(s.id, e);
      });
    }
    let g = t.squads.find((s) => s.id === `garrison-${e.region}`);
    if (!g) {
      const [x, y] = position(w, r.id, radius(w, r.id) * 0.5, 0);
      g = {
        id: `garrison-${r.id}`,
        army: null,
        owner: r.owner,
        region: r.id,
        kind: "garrison",
        capacity: 100,
        strength: r.garrison,
        morale: 1,
        suppression: 0,
        x,
        y,
        previousX: x,
        previousY: y,
        action: "holding",
        target: null,
        fire: 0,
      };
      t.squads.push(g);
    }
    g.owner = r.owner;
    g.strength = r.garrison;
    assigned.set(g.id, e);
  }
  // Deploy once, then preserve actual positions during successive exchanges.
  for (const s of t.squads) {
    const e = assigned.get(s.id),
      a = w.armies.find((a) => a.id === s.army);
    if (s.independent) continue;
    if (e) {
      if (s.region !== e.region) {
        delete s.localOrder;
        const index = Number(s.id.split("-").at(-1)) || 0;
        [s.x, s.y] = position(
          w,
          e.region,
          -radius(w, e.region) * 0.65,
          (index - 2) * radius(w, e.region) * 0.13,
        );
        s.previousX = s.x;
        s.previousY = s.y;
        s.region = e.region;
      }
    } else if (a) {
      if (a.route.length) delete s.localOrder;
      if (s.region !== a.region) {
        delete s.localOrder;
        [s.x, s.y] = position(w, a.region, 0, 0);
        s.previousX = s.x;
        s.previousY = s.y;
        s.region = a.region;
      }
      if (s.localOrder) continue;
      if (a.cover?.region === s.region && !a.route.length) continue;
      const r = w.regions[a.region],
        next = w.regions[a.route[0]];
      const fraction = next
        ? Math.min(
            0.85,
            (a.progress + (t.time % 1)) /
              (next.terrain === "highlands" ? 6 : a.motorized >= 40 ? 2 : 4),
          )
        : 0;
      // Travel is drawn within the current region until the authoritative arrival.
      const [offsetX, offsetY] = formation(s);
      const [x, y] = position(
        w,
        a.region,
        (next ? (next.x - r.x) * fraction : 0) + offsetX,
        (next ? (next.y - r.y) * fraction : 0) + offsetY,
      );
      const blend = Math.min(1, hours * 2);
      if (next && !blockedByMountains(w.regions[s.region].mountainObstacles,s,{x,y},s.movementLayer)) {
        s.x += (x - s.x) * blend;
        s.y += (y - s.y) * blend;
      }
      s.action = next ? "moving" : "holding";
      s.suppression = Math.max(0, s.suppression - hours * 0.2);
      s.morale = Math.min(1, s.morale + hours * 0.12);
    }
  }
  for (let remaining = Math.max(0, hours); remaining > 1e-9;) {
    const dt = Math.min(1 / 12, remaining);
    remaining -= dt;
    t.time += dt;
    for (const s of t.squads) refreshAttack(w, s);
    const speeds = t.squads.map((s) => movementSpeed(w, s));
    t.squads.forEach((s, i) => stepLocal(w, s, dt, speeds[i]));
    for (const s of t.squads) {
      const a = w.armies.find((a) => a.id === s.army);
      const site = a && coverSite(w, a);
      if (
        s.localOrder ||
        !a ||
        !site ||
        a.cover?.region !== s.region ||
        a.route.length ||
        s.strength <= 0
      )
        continue;
      const [fx, fy] = formation(s);
      const r = w.regions[s.region];
      const [x, y] = position(
        w,
        s.region,
        site.x - r.x + fx * 0.25,
        site.y - r.y + fy * 0.25,
      );
      const distance = Math.hypot(x - s.x, y - s.y);
      const amount = Math.min(
        1,
        (radius(w, s.region) * dt * 0.6) / Math.max(0.001, distance),
      );
      const nextX = s.x + (x - s.x) * amount;
      const nextY = s.y + (y - s.y) * amount;
      if (inside(w, s.region, nextX, nextY, s.movementLayer) && !blockedByMountains(w.regions[s.region].mountainObstacles,s,{x:nextX,y:nextY},s.movementLayer)) {
        s.x = nextX;
        s.y = nextY;
      }
      s.action = distance > 2 ? "moving" : "holding";
      a.status = inCover(w, a, s)
        ? `Taking cover: ${site.name}`
        : `Moving to cover: ${site.name}`;
    }
    separateSquads(w, dt);
    // Individually routed squads enter combat where they actually stand.
    for (const s of t.squads.filter(
      (s) =>
        s.independent &&
        s.strength > 0 &&
        s.owner !== w.regions[s.region].owner,
    )) {
      let e = t.engagements.find(
        (e) => e.region === s.region && e.status === "active",
      );
      if (!e) {
        e = {
          id: `direct-${s.region}-${t.revision}-${t.time}`,
          region: s.region,
          attackers: [],
          direct: true,
          started: w.hour,
          elapsed: 0,
          status: "active",
        };
        t.engagements.push(e);
      }
      e.direct = true;
      let g = t.squads.find((g) => g.id === `garrison-${s.region}`);
      if (!g) {
        const r = w.regions[s.region];
        g = {
          id: `garrison-${r.id}`,
          army: null,
          owner: r.owner,
          region: r.id,
          kind: "garrison",
          capacity: 100,
          strength: r.garrison,
          morale: 1,
          suppression: 0,
          x: r.x,
          y: r.y,
          previousX: r.x,
          previousY: r.y,
          action: "holding",
          target: null,
          fire: 0,
        };
        t.squads.push(g);
      }
    }
    for (const e of t.engagements.filter((e) => e.status === "active")) {
      for (const s of t.squads) {
        if (s.independent) {
          if (s.region === e.region) assigned.set(s.id, e);
          else if (assigned.get(s.id) === e) assigned.delete(s.id);
        } else if (e.direct && s.region === e.region) assigned.set(s.id, e);
      }
    }
    for (const e of t.engagements.filter((e) => e.status === "active")) {
      e.elapsed += dt;
      const r = w.regions[e.region],
        rad = radius(w, e.region);
      const units = t.squads.filter(
        (s) => assigned.get(s.id) === e && s.strength > 0.001,
      );
      const hits = new Map<string, number>(),
        suppression = new Map<string, number>();
      for (const s of units) {
        const enemies = units.filter((d) => d.owner !== s.owner);
        const d =
          enemies.find((d) => d.id === s.localOrder?.attackTarget) ??
          enemies.sort(
            (a, b) =>
              Math.hypot(a.x - s.x, a.y - s.y) -
                Math.hypot(b.x - s.x, b.y - s.y) || a.id.localeCompare(b.id),
          )[0];
        if (!d) {
          s.action = s.localOrder?.path.length ? "moving" : "holding";
          s.target = null;
          continue;
        }
        const a = w.armies.find((a) => a.id === s.army),
          range =
            rad *
            (s.kind === "artillery" ? 3.5 : s.kind === "armor" ? 1.25 : 0.95);
        const distance = Math.hypot(d.x - s.x, d.y - s.y);
        s.suppression = Math.max(0, s.suppression - dt * 0.12);
        if (
          distance > range &&
          s.kind !== "garrison" &&
          !a?.cover &&
          !s.localOrder
        ) {
          const step = Math.min(
            distance - range * 0.9,
            rad *
              dt *
              (s.kind === "motorized" ? 0.9 : 0.6) *
              (1 - s.suppression * 0.6),
          );
          const x = s.x + ((d.x - s.x) / distance) * step,
            y = s.y + ((d.y - s.y) / distance) * step;
          if (inside(w, e.region, x, y, s.movementLayer) && !blockedByMountains(w.regions[e.region].mountainObstacles,s,{x,y},s.movementLayer)) {
            s.x = x;
            s.y = y;
          }
          s.action = "moving";
          s.target = null;
          continue;
        }
        if (distance > range) {
          s.action = s.localOrder?.path.length ? "moving" : "holding";
          s.target = null;
          continue;
        }
        const nation = a ? w.nations[a.owner] : null;
        const defendingArmy = w.armies.find((a) => a.id === d.army);
        const cover =
          d.owner === r.owner
            ? (r.terrain === "forest"
                ? 1.25
                : r.terrain === "highlands"
                  ? 1.4
                  : 1) *
              (r.building === "fort"
                ? s.kind === "artillery"
                  ? 1.1
                  : 1.25
                : 1) *
              (1 + (defendingArmy?.entrenchment ?? 0) * 0.06) *
              (inCover(w, defendingArmy, d) ? 1.3 : 1) *
              (d.owner !== null && w.nations[d.owner].faction === "crown"
                ? 1.15
                : 1)
            : 1;
        const armor =
          s.kind === "armor"
            ? (r.terrain === "plains" ? 1.65 : 0.8) *
              (nation && nation.fuel <= 0 ? 0.4 : 1)
            : 1;
        const support = s.kind === "artillery" ? 1.25 : 1;
        const supply = a && a.supplies < 6 ? 0.65 : 1;
        const damage =
          (s.strength *
            0.42 *
            dt *
            armor *
            support *
            supply *
            (nation?.faction === "iron" ? 1.1 : 1) *
            (0.5 + s.morale * 0.5) *
            (1 - s.suppression * 0.6)) /
          cover;
        hits.set(d.id, (hits.get(d.id) || 0) + damage);
        suppression.set(
          d.id,
          (suppression.get(d.id) || 0) +
            damage / (s.kind === "artillery" ? 25 : 65),
        );
        s.target = d.id;
        s.action = "firing";
        s.fire += dt;
      }
      for (const a of w.armies.filter((a) =>
        units.some((s) => s.army === a.id),
      )) {
        a.supplies = Math.max(0, a.supplies - dt * 0.45);
        const n = w.nations[a.owner];
        const armorCost = ((a.tanks + a.motorized) / 100) * dt * 0.3;
        n.fuel = Math.max(0, n.fuel - armorCost);
        const airCost = dt * (n.faction === "aether" ? 0.5 : 1);
        if (a.air && n.fuel >= airCost) {
          n.fuel -= airCost;
          const targets = units.filter((s) => s.owner !== a.owner);
          for (const s of targets) {
            hits.set(
              s.id,
              (hits.get(s.id) || 0) + (dt * 8) / Math.max(1, targets.length),
            );
            suppression.set(s.id, (suppression.get(s.id) || 0) + dt * 0.12);
          }
        }
      }
      // Simultaneous exchange: no squad gets a free first strike from iteration order.
      for (const s of units) {
        const damage = hits.get(s.id) || 0;
        s.strength = Math.max(0, s.strength - damage);
        s.morale = Math.max(
          0,
          s.morale - (damage / Math.max(1, s.capacity)) * 0.55 + dt * 0.015,
        );
        s.suppression = Math.min(
          0.95,
          s.suppression + (suppression.get(s.id) || 0),
        );
        if (s.strength <= 0.001) {
          s.strength = 0;
          s.action = "destroyed";
          s.target = null;
          delete s.captureSite;
        }
      }
      for (const s of units.filter(
        (s) => s.independent && s.strength > 0 && !s.localOrder?.retreat,
      )) {
        const a = w.armies.find((a) => a.id === s.army)!;
        if (
          s.strength / s.capacity >= retreatThreshold(a) / 100 &&
          s.morale >= 0.2
        )
          continue;
        const fallback = w.regions[s.region].neighbors.find(
          (id) =>
            w.regions[id].owner === s.owner &&
            w.regions[id].terrain !== "mountains",
        );
        if (fallback !== undefined) {
          const r = w.regions[fallback];
          try {
            const path = crossRegionPath(w, s, s.region, r, s.movementLayer);
            s.localOrder = {
              region: s.region,
              mode: "move",
              retreat: true,
              path,
              waypoints: [{ x: r.x, y: r.y }],
            };
            delete s.captureSite;
            s.action = "retreating";
          } catch {
            /* Encircled squads fight on. */
          }
        }
      }
      for (const a of w.armies) {
        const own = t.squads.filter((s) => s.army === a.id);
        a.strength = own.reduce((sum, s) => sum + s.strength, 0);
        if (!units.some((s) => s.army === a.id)) continue;
        const morale =
          own.reduce((sum, s) => sum + s.morale * s.strength, 0) /
          Math.max(1, a.strength);
        if (a.strength < retreatThreshold(a) || morale < 0.2) {
          if (own.every((s) => s.independent)) continue;
          if (e.attackers.includes(a.id)) {
            stop(a, "recover", "Withdrawing from engagement");
            e.attackers = e.attackers.filter((id) => id !== a.id);
          } else if (a.region !== e.region) {
            a.sector = a.sector.filter((id) => id !== e.region);
            a.deployment = 4;
          } else if (!withdraw(w, a)) continue;
          for (const s of own.filter((s) => !s.independent)) {
            assigned.delete(s.id);
            delete s.localOrder;
            delete s.captureSite;
            s.action = "retreating";
            s.target = null;
          }
        }
      }
      const g = t.squads.find((s) => s.id === `garrison-${e.region}`)!;
      r.garrison = g.strength < 0.5 ? 0 : g.strength;
      const attackers = w.armies.filter(
        (a) => e.attackers.includes(a.id) && a.strength > 0,
      );
      const defenders = t.squads.some(
        (s) =>
          assigned.get(s.id) === e && s.owner === r.owner && s.strength > 0.5,
      );
      const owners = new Set(attackers.map((a) => a.owner));
      if (e.direct) {
        const invaders = t.squads.filter(
          (s) =>
            s.region === e.region &&
            s.strength > 0.5 &&
            !s.localOrder?.retreat &&
            s.owner !== null &&
            s.owner !== r.owner &&
            (s.independent || e.attackers.includes(s.army!)),
        );
        const controlling = new Set(invaders.map((s) => s.owner));
        if (!invaders.length && !attackers.length) e.status = "ended";
        else if (!defenders && controlling.size === 1) {
          r.owner = invaders[0].owner;
          r.garrison = 6;
          r.construction = null;
          r.consolidation = 6;
          e.status = "captured";
          report(
            w,
            `${w.nations[r.owner!].name} captured ${r.name}; consolidating for 6h.`,
            "combat",
            r.id,
            r.owner,
          );
        }
      } else if (!attackers.length) e.status = "ended";
      else if (!defenders && owners.size === 1) {
        capture(w, e, attackers[0]);
        for (const s of units) {
          s.action = "holding";
          s.target = null;
        }
      }
    }
    for (const result of resolveSettlementCaptures(w))
      report(
        w,
        `${w.nations[result.owner].name} captured ${result.name}.`,
        "combat",
        result.region,
        result.owner,
      );
  }
  const live = new Set(
    t.engagements.filter((e) => e.status === "active").map((e) => e.region),
  );
  t.squads = t.squads.filter((s) => s.army !== null || live.has(s.region));
  for (const s of t.squads)
    if (s.independent && !live.has(s.region) && s.strength > 0) {
      s.suppression = Math.max(0, s.suppression - hours * 0.2);
      s.morale = Math.min(1, s.morale + hours * 0.12);
    }
  for (const s of t.squads)
    if (!live.has(s.region) && s.action === "firing") {
      s.action = "holding";
      s.target = null;
    }
  t.engagements = t.engagements
    .filter((e) => e.status === "active" || t.time - e.started < 48)
    .slice(-64);
  for (const s of t.squads)
    if (s.strength > 0 && s.localOrder?.retreat) s.action = "retreating";
  t.revision++;
}

import { countryObstaclesNear } from "./countryObstacleIndex";
import { countryTreesNear } from "./countryLandscape";
import { createCityHearing } from "./cityHearing";
import { updateTacticalSupport } from "./tacticalSupport";
import { countryEncounterRoster } from "./countryEncounterRoster";
import {
  advanceSlice,
  ensureSliceSquads,
  syncSliceSquads,
  type SliceState,
  type SliceUnit,
  type SlicePlan,
  type createSliceNavigation,
} from "./countrySlice";
import { coverReactionPosition } from "./cityCoverReaction";
import { coverAtObstacles } from "./cityTactics";
import {
  CITY_VOLLEY_STEP,
  tacticalEffectiveFireRange,
  tacticalFireRange,
  tacticalWeaponProfile,
  type TacticalWeaponRole,
} from "./cityCombatRules";
import {
  CITY_TANK_RELOAD_SECONDS,
  CITY_SHELL_DAMAGE,
  cityShellFlightSeconds,
  cityShellImpact,
} from "./cityBallistics";
import { countryLandscapeSamples } from "./countryLandscape";
import { terrainHeight } from "./connectedTerrain";
import { FireVisibility, fireVolley } from "./squadFire";
import type { Squad } from "./tactics";

export type CountryCombat = {
  elapsed: number;
  remainder: number;

  shots: {
    id: number;
    from: number;
    to: number;
    x: number;
    z: number;
    tx: number;
    tz: number;
    at: number;
    shell: boolean;
    impact?: boolean;
  }[];
  sequence: number;
  pending?: {
    due: number;
    x: number;
    z: number;
    enemy: boolean;
    antiTank: boolean;
    from?: number;
    to?: number;
  }[];
};
export type SliceEncounter = CountryCombat & {
  stage: "bridge" | "outpost" | "victory" | "defeat";
  progress: number;
  bridge: { x: number; z: number };
  outpost: { x: number; z: number };
};
export const sliceSurvivors = (u: SliceUnit) =>
  u.members
    ? u.members.filter((m) => m.health !== 0).length
    : u.kind === "infantry"
      ? Math.ceil(((u.health ?? 100) * 6) / 100)
      : Number((u.health ?? 100) > 0);
const squad = (u: SliceUnit): Squad => ({
  id: String(u.id),
  army: null,
  owner: u.enemy ? 1 : 0,
  region: 0,
  kind: u.antiTank ? "artillery" : u.kind === "tank" ? "armor" : "infantry",
  unitCount: 1,
  strength: u.health ?? 100,
  capacity: 100,
  morale: 1,
  suppression: u.suppression ?? 0,
  x: u.x,
  y: u.z,
  previousX: u.x,
  previousY: u.z,
  action: "holding",
  target: null,
  fire: 0,
  fireMemory: u.fireMemory,
});
export function encounterSight(plan: SlicePlan) {
  const trees =
    plan.rivers && !plan.campaignMap ? countryLandscapeSamples(plan).trees : [];
  const sight = new FireVisibility(
    [
      ...plan.obstacles.map((o) => ({
        id: o.id,
        exposure: o.kind === "building" ? 0 : o.kind === "garden" ? 1 : 0.55,
        polygon: [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([x, z]) => ({
          x:
            o.x +
            ((x * o.width) / 2) * Math.cos(o.angle) +
            ((z * o.depth) / 2) * Math.sin(o.angle),
          y:
            o.z -
            ((x * o.width) / 2) * Math.sin(o.angle) +
            ((z * o.depth) / 2) * Math.cos(o.angle),
        })),
      })),
      ...trees.map((p, i) => ({
        id: `grove:${i}`,
        exposure: 0.65,
        polygon: [
          { x: p.x - 1, y: p.z - 1 },
          { x: p.x + 1, y: p.z - 1 },
          { x: p.x + 1, y: p.z + 1 },
          { x: p.x - 1, y: p.z + 1 },
        ],
      })),
    ],
    24,
  );
  return (a: SliceUnit, b: SliceUnit) => {
    const ah =
        terrainHeight(plan.surface, a.x, a.z) +
        (a.kind === "airship" ? COUNTRY_AIRSHIP_ALTITUDE : 1.2),
      bh = terrainHeight(plan.surface, b.x, b.z) + 1.2;
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    for (let d = 2; d < length - 2; d += 2) {
      const t = d / length;
      if (
        terrainHeight(
          plan.surface,
          a.x + (b.x - a.x) * t,
          a.z + (b.z - a.z) * t,
        ) >
        ah + (bh - ah) * t
      )
        return 0;
    }
    // Airships observe above ground-level buildings and individual tree
    // crowns. Target-side forest density still reduces detection range.
    if (a.kind === "airship") return 1;
    let canopy = 1;
    if (plan.campaignMap) {
      // Only trees intersecting this local firing segment enter the query.
      const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
        dx = b.x - a.x,
        dz = b.z - a.z;
      for (const tree of countryTreesNear(plan, mid, length / 2 + 2)) {
        const t = Math.max(
          0,
          Math.min(
            1,
            ((tree.x - a.x) * dx + (tree.z - a.z) * dz) /
              (length * length || 1),
          ),
        );
        if (Math.hypot(tree.x - a.x - t * dx, tree.z - a.z - t * dz) < 1) {
          canopy *= 0.65;
          if (canopy < 0.05) break;
        }
      }
    }
    return (
      canopy *
      sight.exposure(squad(a), squad(b)) *
      coverAtObstacles(b, a, countryObstaclesNear(plan, b)).damageScale
    );
  };
}

export const COUNTRY_VISION_RANGE = {
  infantry: 180,
  tank: 500,
  airship: 1000,
} as const;
export const COUNTRY_AIRSHIP_ALTITUDE = 45;
export const COUNTRY_NIGHT_VISION_SCALE = 0.45;

export function countryLightingHour(
  lighting: SliceState["lighting"] = "cycle",
  now = Date.now(),
) {
  return lighting === "day"
    ? 14
    : lighting === "night"
      ? 0
      : (now / 50000) % 24;
}

export function countryDaylight(
  lighting: SliceState["lighting"] = "cycle",
  now = Date.now(),
) {
  const hour = countryLightingHour(lighting, now),
    altitude = Math.sin(((hour - 6) / 24) * Math.PI * 2),
    t = Math.max(0, Math.min(1, (altitude + 0.12) / 0.47));
  return t * t * (3 - 2 * t);
}

export const countryVisibilityScale = (daylight = 1) =>
  COUNTRY_NIGHT_VISION_SCALE +
  (1 - COUNTRY_NIGHT_VISION_SCALE) * Math.max(0, Math.min(1, daylight));

export const countryWeaponRole = (
  unit: Pick<SliceUnit, "kind" | "antiTank" | "weaponRole">,
): TacticalWeaponRole | undefined =>
  unit.kind === "airship"
    ? undefined
    : unit.kind === "tank"
      ? "tank"
      : unit.antiTank
        ? "antiTank"
        : (unit.weaponRole ?? "rifle");

export const countryFireRange = (
  unit: Pick<SliceUnit, "kind" | "antiTank" | "weaponRole">,
) => {
  const role = countryWeaponRole(unit);
  return role ? tacticalFireRange(role) : 0;
};

export const countryEffectiveFireRange = (
  unit: Pick<SliceUnit, "kind" | "antiTank" | "weaponRole">,
) => {
  const role = countryWeaponRole(unit);
  return role ? tacticalEffectiveFireRange(role) : 0;
};

type VisionPoint = Pick<
  SliceUnit,
  "id" | "x" | "z" | "kind" | "path" | "health" | "enemy"
>;

const forestCells = new WeakMap<
  SlicePlan,
  Map<string, { x: number; z: number }[]>
>();

function countryForestCells(plan: SlicePlan) {
  let cells = forestCells.get(plan);
  if (cells) return cells;
  cells = new Map();
  for (const tree of plan.rivers?.length
    ? countryLandscapeSamples(plan).trees
    : []) {
    const key = `${Math.floor(tree.x / 24)}:${Math.floor(tree.z / 24)}`,
      cell = cells.get(key) ?? [];
    cell.push(tree);
    cells.set(key, cell);
  }
  forestCells.set(plan, cells);
  return cells;
}

/** Canopy around the actual shared tree samples, from open (0) to dense (1). */
export function countryForestCover(
  plan: SlicePlan,
  point: Pick<SliceUnit, "x" | "z">,
) {
  if (plan.campaignMap) {
    const t = Math.max(
      0,
      Math.min(1, (countryTreesNear(plan, point, 12).length - 2) / 10),
    );
    return t * t * (3 - 2 * t);
  }
  const cells = countryForestCells(plan),
    cx = Math.floor(point.x / 24),
    cz = Math.floor(point.z / 24);
  let trees = 0;
  for (let x = cx - 1; x <= cx + 1; x++)
    for (let z = cz - 1; z <= cz + 1; z++)
      for (const tree of cells.get(`${x}:${z}`) ?? [])
        if (Math.hypot(tree.x - point.x, tree.z - point.z) <= 12) trees++;
  const t = Math.max(0, Math.min(1, (trees - 2) / 10));
  return t * t * (3 - 2 * t);
}

/** Nominal sight radius after accounting for canopy around the observer. */
export function countryVisionRange(
  observer: VisionPoint,
  forest = 0,
  daylight = 1,
) {
  const base = COUNTRY_VISION_RANGE[observer.kind];
  return (
    (observer.kind === "airship" ? base : base * (1 - forest * 0.35)) *
    countryVisibilityScale(daylight)
  );
}

/** Target-specific detection range. Movement is still much safer in woods than in open ground. */
export function countryDetectionRange(
  observer: VisionPoint,
  target: VisionPoint,
  observerForest = 0,
  targetForest = 0,
  daylight = 1,
) {
  const moving = target.path.length > 0,
    concealment =
      observer.kind === "airship"
        ? moving
          ? 0.35
          : 0.45
        : moving
          ? 0.55
          : 0.65;
  return (
    countryVisionRange(observer, observerForest, daylight) *
    (1 - targetForest * concealment)
  );
}

export function countryVisibility(
  plan: SlicePlan,
  exposure = encounterSight(plan),
) {
  const canopy = new Map<string, number>();
  const forest = (p: VisionPoint) => {
    const key = p.x + ":" + p.z;
    let v = canopy.get(key);
    if (v === undefined) {
      v = countryForestCover(plan, p);
      canopy.set(key, v);
      if (canopy.size > 1024) canopy.delete(canopy.keys().next().value!);
    }
    return v;
  };
  return (observer: VisionPoint, target: VisionPoint, daylight = 1) =>
    (observer.health ?? 100) > 0 &&
    (target.health ?? 100) > 0 &&
    Math.hypot(target.x - observer.x, target.z - observer.z) <=
      countryVisionRange(observer, 0, daylight) &&
    Math.hypot(target.x - observer.x, target.z - observer.z) <=
      countryDetectionRange(
        observer,
        target,
        forest(observer),
        forest(target),
        daylight,
      ) &&
    exposure(observer as SliceUnit, target as SliceUnit) > 0;
}

/** Server-facing state filter. Hidden enemies, future routes and pending shots never reach the browser. */
export function countryPlayerState(
  state: SliceState,
  canSee: (
    observer: VisionPoint,
    target: VisionPoint,
    daylight?: number,
  ) => boolean,
) {
  const parts = (unit: SliceUnit) => unit.members ?? [unit],
    friendly = state.units.filter((unit) => !unit.enemy).flatMap(parts),
    daylight = countryDaylight(state.lighting, state.time),
    visibleEnemies = new Set(
      state.units
        .filter(
          (unit) =>
            unit.enemy &&
            parts(unit).some((target) =>
              friendly.some((observer) => canSee(observer, target, daylight)),
            ),
        )
        .map((unit) => unit.id),
    ),
    view = structuredClone(state);
  view.units = view.units
    .filter((unit) => !unit.enemy || visibleEnemies.has(unit.id))
    .map((unit) => {
      if (!unit.enemy) return unit;
      unit.path = [];
      unit.guide = [];
      unit.support = undefined;
      unit.reaction = undefined;
      for (const member of unit.members ?? []) {
        member.path = [];
        member.guide = [];
        member.support = undefined;
        member.reaction = undefined;
      }
      return unit;
    });
  const feedback = view.battlefield ?? view.encounter;
  if (feedback) {
    const authorized = new Set(
      view.units.flatMap((unit) => parts(unit).map((p) => p.id)),
    );
    const hearing = createCityHearing();
    for (const shot of feedback.shots)
      if (!authorized.has(shot.from) || !authorized.has(shot.to))
        hearing.emit(
          { ...shot, impact: !!shot.impact },
          shot.at,
          friendly.map((u) => ({
            ...u,
            friendly: true,
            health: u.health ?? 100,
          })),
        );
    view.sounds = hearing.snapshot(feedback.elapsed);
    feedback.shots = feedback.shots.filter(
      (shot) => authorized.has(shot.from) && authorized.has(shot.to),
    );
    feedback.pending = undefined;
  }
  return view;
}
export function encounterFinished(state: Pick<SliceState, "encounter">) {
  return (
    state.encounter?.stage === "victory" || state.encounter?.stage === "defeat"
  );
}
export function startEncounter(
  state: SliceState,
  plan: SlicePlan,
  nav: ReturnType<typeof createSliceNavigation>,
) {
  if (state.encounter && !encounterFinished(state))
    throw Error("Encounter already deployed");
  const b = plan.roads.bridges[0],
    site = plan.sites.find((s) => s.id === "outpost") ?? plan.sites.at(-1)!;
  if (!b) throw Error("Encounter needs a bridge");
  const bridge = { x: b.x, z: b.y },
    outpost = { x: site.x, z: site.z };
  const sign =
    (outpost.x - b.x) * Math.cos(b.angle) +
      (outpost.z - b.y) * Math.sin(b.angle) >=
    0
      ? 1
      : -1;
  const locate = (x: number, z: number, kind: SliceUnit["kind"]) => {
    for (let r = 0; r < 60; r += 2)
      for (let i = 0; i < 16; i++) {
        const p = {
          x: x + Math.cos((i * Math.PI) / 8) * r,
          z: z + Math.sin((i * Math.PI) / 8) * r,
        };
        if (nav.walkable(p, kind)) return p;
      }
    throw Error("No safe deployment position");
  };
  const units: SliceUnit[] = [];
  for (const spec of countryEncounterRoster) {
    const { id, enemy, kind } = spec;
    const f =
      spec.pocket === 1
        ? 1
        : spec.pocket === 2
          ? 0.35
          : spec.pocket === 3
            ? 0.7
            : 0;
    const target = {
      x: bridge.x + (outpost.x - bridge.x) * f,
      z: bridge.z + (outpost.z - bridge.z) * f,
    };
    const offset = enemy ? 24 : -75;
    const p = locate(
      target.x + Math.cos(b.angle) * offset * sign + (id % 2) * 4,
      target.z +
        Math.sin(b.angle) * offset * sign +
        Math.floor(((id - 1) % 4) / 2) * 4,
      kind,
    );
    units.push({
      ...p,
      id,
      name: spec.name,
      kind,
      enemy,
      antiTank: !!spec.antiTank,
      health: 100,
      suppression: 0,
      angle: 0,
      distance: 0,
      path: [],
      guide: [],
      cover: false,
    });
  }
  state.units = units;
  ensureSliceSquads(state);
  for (const group of state.units)
    for (const m of group.members ?? [])
      Object.assign(m, locate(m.x, m.z, m.kind));
  state.encounter = {
    elapsed: 0,
    remainder: 0,
    stage: "bridge",
    progress: 0,
    bridge,
    outpost,
    shots: [],
    sequence: 0,
  };
  state.running = false;
  state.revision++;
}
/** Fixed-step authority. All randomness lives in saved fireMemory, never client frames. */
export function advanceCountryCombat(
  state: SliceState,
  now: number,
  exposure: (a: SliceUnit, b: SliceUnit) => number,
  plan?: SlicePlan,
  nav?: ReturnType<typeof createSliceNavigation>,
  canSee?: (
    observer: SliceUnit,
    target: SliceUnit,
    daylight?: number,
  ) => boolean,
  afterStep?: () => void,
) {
  const e = state.battlefield ?? state.encounter;
  const scenario = state.battlefield ? undefined : state.encounter;
  if (!e) {
    advanceSlice(state, now, plan);
    return;
  }
  const end = Math.max(state.time, now);
  if (
    !state.running ||
    scenario?.stage === "victory" ||
    scenario?.stage === "defeat"
  ) {
    state.time = end;
    return;
  }
  e.remainder += ((end - state.time) / 1000) * state.pace;
  state.time = end;
  // Campaign work is budgeted, with unprocessed time retained in the save.
  let steps = 0;
  while (
    e.remainder >= CITY_VOLLEY_STEP &&
    (scenario ? e.elapsed < 600 : steps < 8) &&
    scenario?.stage !== "victory" &&
    scenario?.stage !== "defeat"
  ) {
    steps++;
    e.remainder -= CITY_VOLLEY_STEP;
    e.elapsed += CITY_VOLLEY_STEP;
    const clock = state.time,
      pace = state.pace;
    state.pace = 1;
    advanceSlice(state, clock + 250, plan);
    state.time = clock;
    state.pace = pace;
    const alive = state.units
      .flatMap((u) => u.members ?? [u])
      .filter((u) => (u.health ?? 100) > 0 && u.kind !== "airship");
    const daylight = countryDaylight(
        state.lighting,
        state.battlefield
          ? state.time - (e.remainder * 1000) / state.pace
          : state.time,
      ),
      visible = canSee
        ? (a: SliceUnit, b: SliceUnit) => canSee(a, b, daylight)
        : (a: SliceUnit, b: SliceUnit) => exposure(a, b) > 0;
    if (plan && nav) {
      const groups = state.units
        .filter((g) => g.kind !== "airship")
        .map((g) => ({
          id: g.id,
          enemy: !!g.enemy,
          units: g.members ?? [g],
          memory: g.support,
        }));
      updateTacticalSupport(groups, e.elapsed, {
        range: (u) => {
          const v = u as SliceUnit;
          return countryFireRange(v);
        },
        visible: (a, b) => visible(a as SliceUnit, b as SliceUnit),
        clear: (a, b) =>
          nav.walkable(b, (a as SliceUnit).kind) &&
          nav.clear(a, b, (a as SliceUnit).kind),
      });
      for (const g of groups)
        state.units.find((u) => u.id === g.id)!.support = g.memory;
    }
    const damage = new Map<number, number>();
    e.pending ??= [];
    for (const impact of e.pending.filter((p) => p.due <= e.elapsed)) {
      e.shots.push({
        id: ++e.sequence,
        from: impact.from ?? -1,
        to: impact.to ?? -1,
        x: impact.x,
        z: impact.z,
        tx: impact.x,
        tz: impact.z,
        at: e.elapsed,
        shell: true,
        impact: true,
      });
      for (const u of alive) {
        const d = Math.hypot(u.x - impact.x, u.z - impact.z);
        if (!!u.enemy !== impact.enemy && d < 3)
          damage.set(
            u.id,
            (damage.get(u.id) ?? 0) +
              CITY_SHELL_DAMAGE *
                (1 - d / 4) *
                (squad(u).kind === "armor"
                  ? tacticalWeaponProfile(impact.antiTank ? "antiTank" : "tank")
                      .armor
                  : tacticalWeaponProfile(impact.antiTank ? "antiTank" : "tank")
                      .soft) *
                exposure({ ...u, id: -1, x: impact.x, z: impact.z }, u),
          );
      }
    }
    e.pending = e.pending.filter((p) => p.due > e.elapsed);
    for (const u of alive) {
      u.suppression = Math.max(0, (u.suppression ?? 0) - 0.015);
      const role = countryWeaponRole(u);
      if (!role) continue;
      const range = tacticalFireRange(role);
      const target = alive
        .filter(
          (v) =>
            !!v.enemy !== !!u.enemy &&
            Math.hypot(v.x - u.x, v.z - u.z) <= range &&
            visible(u, v),
        )
        .sort(
          (a, b) =>
            Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z),
        )[0];
      u.firing = !!target;
      if (!target) continue;
      if (
        plan &&
        nav &&
        u.kind === "infantry" &&
        u.stance !== "hold" &&
        !u.path.length
      ) {
        const memory = (u.reaction ??= {
          anchor: { x: u.x, z: u.z },
          next: e.elapsed + (u.id % 7) * 0.3,
          health: u.health ?? 100,
        });
        if (e.elapsed >= memory.next) {
          memory.next = e.elapsed + 3.5 + (u.id % 5) * 0.3;
          if (
            (u.health ?? 100) < memory.health - 0.01 ||
            memory.target !== target.id
          ) {
            const p = coverReactionPosition(
              u,
              memory.anchor,
              countryObstaclesNear(plan, u, 32),
              alive.filter((v) => v !== u).map((v) => v.path.at(-1) ?? v),
              (p) =>
                coverAtObstacles(p, target, countryObstaclesNear(plan, p))
                  .damageScale,
              (p) => nav.walkable(p, "infantry"),
              (a, b) => nav.clear(a, b, "infantry"),
            );
            if (p) {
              u.path = [p];
              u.supportMove = true;
              u.guide = [{ x: u.x, z: u.z }, p];
              u.cover = true;
              u.coverLevel = coverAtObstacles(
                p,
                target,
                countryObstaclesNear(plan, p),
              ).level;
            }
          }
          memory.health = u.health ?? 100;
          memory.target = target.id;
        }
      }
      const aim = Math.atan2(target.x - u.x, target.z - u.z);
      u.aimAngle = aim;
      if (u.kind === "tank") {
        const current = u.turretAngle ?? u.angle,
          error = Math.atan2(Math.sin(aim - current), Math.cos(aim - current));
        u.turretAngle = current + Math.max(-0.375, Math.min(0.375, error));
        if (Math.abs(error) > 0.12 || e.elapsed < (u.nextShell ?? 0)) continue;
      } else if (!u.path.length) u.angle = aim;
      const attacker = squad(u),
        defender = squad(target);
      const shell = u.kind === "tank" || !!u.antiTank;
      if (shell && e.elapsed < (u.nextShell ?? 0)) continue;
      if (shell && attacker.fireMemory) attacker.fireMemory.reload = 0;
      const shot = fireVolley(
        attacker,
        defender,
        Math.hypot(target.x - u.x, target.z - u.z),
        range,
        exposure(u, target) * (u.path.length ? 0.65 : 1),
        4,
        role,
      );
      u.fireMemory = attacker.fireMemory;
      if (!shot.fired) continue;
      const impact = shell
        ? cityShellImpact(
            target.x,
            target.z,
            shot.rawDamage > 0,
            e.sequence + 1 + u.id * 7919,
          )
        : target;
      if (shell) {
        u.nextShell = e.elapsed + CITY_TANK_RELOAD_SECONDS;
        e.pending.push({
          due:
            e.elapsed +
            cityShellFlightSeconds(Math.hypot(impact.x - u.x, impact.z - u.z)),
          x: impact.x,
          z: impact.z,
          enemy: !!u.enemy,
          antiTank: !!u.antiTank,
          from: u.id,
          to: target.id,
        });
      } else damage.set(target.id, (damage.get(target.id) ?? 0) + shot.damage);
      target.suppression = Math.min(
        1,
        (target.suppression ?? 0) + shot.suppression * 4,
      );
      e.shots.push({
        id: ++e.sequence,
        from: u.id,
        to: target.id,
        x: u.x,
        z: u.z,
        tx: impact.x,
        tz: impact.z,
        at: e.elapsed,
        shell,
      });
    }
    for (const u of alive) {
      u.health = Math.max(0, (u.health ?? 100) - (damage.get(u.id) ?? 0));
      if (!u.health) {
        u.path = [];
        u.guide = [];
        u.cover = false;
      }
    }
    syncSliceSquads(state);
    e.shots = e.shots.filter((s) => e.elapsed - s.at < 2).slice(-128);
    afterStep?.();
    if (!scenario) continue;
    const goal =
      scenario.stage === "bridge" ? scenario.bridge : scenario.outpost;
    const near = (u: SliceUnit, r: number) =>
      Math.hypot(u.x - goal.x, u.z - goal.z) < r;
    const survivors = alive.filter((u) => (u.health ?? 0) > 0);
    if (
      survivors.some((u) => !u.enemy && u.kind === "infantry" && near(u, 14)) &&
      !survivors.some((u) => u.enemy && near(u, 35))
    )
      scenario.progress += 0.25;
    else scenario.progress = 0;
    if (scenario.progress >= 10) {
      scenario.stage = scenario.stage === "bridge" ? "outpost" : "victory";
      scenario.progress = 0;
    }
    if (
      !survivors.some((u) => !u.enemy && u.kind === "infantry") ||
      e.elapsed >= 600
    )
      scenario.stage = "defeat";
  }
  if (scenario?.stage === "victory" || scenario?.stage === "defeat") {
    state.running = false;
    e.remainder = 0;
  }
}

/** Test harness compatibility: the combat owner is also used by the campaign. */
export const advanceEncounter = advanceCountryCombat;

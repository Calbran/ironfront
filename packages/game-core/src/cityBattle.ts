import { updateTacticalSupport, type SupportGroup } from "./tacticalSupport";
import { coverReactionPosition } from "./cityCoverReaction";
import {
  tacticalFireRange,
  tacticalWeaponProfile,
  type TacticalWeaponRole,
} from "./cityCombatRules";
import { createCityHearing } from "./cityHearing";
import { validateCityBuild } from "./cityBuildPlacement";
import { obstacleDistance } from "./cityTactics";
import { createContactMemory, citySightRange } from "./cityAwareness";
import { coverSlots } from "./cityCoverOrders";
import {
  CITY_SHELL_DAMAGE,
  cityShellImpact,
  CITY_TANK_RELOAD_SECONDS,
  cityShellFlightSeconds,
} from "./cityBallistics";
import { createCityUnitTrial, type TrialUnit } from "./cityUnitTrial";
import type { createCityTactics } from "./cityTactics";
import {
  FireIndex,
  FireVisibility,
  fireVolley,
} from "./squadFire";
import type { Squad } from "./tactics";

const cityWeaponRole = (unit: TrialUnit): TacticalWeaponRole =>
  unit.kind === "vehicle" ? "tank" : (unit.weaponRole ?? "rifle");

export function battleTrial(
  tactics: ReturnType<typeof createCityTactics>,
  multipleBattles = false,
) {
  const trial = createCityUnitTrial(tactics);
  // Keep the existing friendly IDs, replacing the transport with three riflemen.
  trial.units.splice(
    0,
    trial.units.length,
    ...trial.units.filter((u) => u.id !== 5),
  );
  const base = trial.units.find((u) => u.kind === "infantry")!;
  for (const [id, x, z, friendly] of [
    [6, -3, 24, true],
    [7, 0, 24, true],
    [8, 3, 24, true],
    [101, 29, 17, false],
    [102, 32, 17, false],
    [103, 35, 17, false],
    [104, 29, 21, false],
    [105, 32, 21, false],
    [106, 35, 21, false],
  ] as const) {
    let p = { x: Number(x), z: Number(z) };
    if (!tactics.walkable(p)) {
      const candidates = [];
      for (let r = 1; r < 12; r++)
        for (let i = 0; i < 16; i++)
          candidates.push({
            x: x + Math.cos((i * Math.PI) / 8) * r,
            z: z + Math.sin((i * Math.PI) / 8) * r,
          });
      p =
        candidates.find(
          (q) =>
            tactics.walkable(q) &&
            !trial.units.some((u) => Math.hypot(u.x - q.x, u.z - q.z) < 1),
        ) ?? p;
    }
    if (tactics.walkable(p))
      trial.units.push({
        ...structuredClone(base),
        ...p,
        id,
        friendly,
        path: [],
        guide: [],
        angle: -Math.PI / 2,
      });
  }
  if (multipleBattles) {
    // Find open, separated street engagements; never spawn troops inside scenery.
    const centers = [{ x: 15, z: 21 }];
    for (const desired of [
      { x: -110, z: -70 },
      { x: 115, z: 100 },
    ]) {
      let placed = false;
      for (let radius = 0; radius <= 80 && !placed; radius += 8) {
        for (let a = 0; a < 16 && !placed; a++) {
          const center = {
            x: desired.x + Math.cos((a * Math.PI) / 8) * radius,
            z: desired.z + Math.sin((a * Math.PI) / 8) * radius,
          };
          if (
            centers.some((p) => Math.hypot(p.x - center.x, p.z - center.z) < 75)
          )
            continue;
          for (let direction = 0; direction < 8 && !placed; direction++) {
            const dx = Math.cos((direction * Math.PI) / 4),
              dz = Math.sin((direction * Math.PI) / 4);
            const points = Array.from({ length: 6 }, (_, i) => ({
              x: center.x + dx * (i < 3 ? -9 : 9) - dz * ((i % 3) - 1) * 1.4,
              z: center.z + dz * (i < 3 ? -9 : 9) + dx * ((i % 3) - 1) * 1.4,
            }));
            if (
              !points.every((p) => tactics.walkable(p)) ||
              !points
                .slice(0, 3)
                .every((p, i) => tactics.segmentClear(p, points[i + 3]))
            )
              continue;
            const firstId = 200 + centers.length * 10;
            points.forEach((p, i) =>
              trial.units.push({
                ...structuredClone(base),
                ...p,
                id: firstId + i,
                friendly: i < 3,
                path: [],
                guide: [],
                angle: Math.atan2(dx, dz) + (i < 3 ? 0 : Math.PI),
              }),
            );
            centers.push(center);
            placed = true;
          }
        }
      }
    }
  }
  for (const u of trial.units) u.friendly ??= true;
  return trial;
}
export type CityShot = {
  id: number;
  from: number;
  to: number;
  x: number;
  z: number;
  tx: number;
  tz: number;
  shell: boolean;
  impact: boolean;
  at?: number;
};
export function createCityBattle(
  tactics: ReturnType<typeof createCityTactics>,
  multipleBattles = false,
) {
  const trial = battleTrial(tactics, multipleBattles),
    squads = new Map<number, Squad>();
  const supportGroups = new Map<string, SupportGroup>();
  const buildSight = () =>
    new FireVisibility(
      tactics.obstacles.map((o) => ({
        id: o.id,
        exposure: o.kind === "building" ? 0 : o.kind === "garden" ? 1 : 0.5,
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
      24,
    );
  let sight = buildSight();
  const sandbags: { id: number; x: number; z: number; angle: number }[] = [];
  let nextSandbag = 1;
  function syncSandbags() {
    tactics.setSandbags(sandbags);
    sight = buildSight();
  }
  function buildSandbags(x: number, z: number, angle: number) {
    const reason = validateCityBuild(
      { kind: "sandbags", x, z, angle },
      sandbags.map((p) => ({ ...p, kind: "sandbags" as const })),
      (p) => tactics.walkable(p),
      (p) => tactics.surfaceHeight(p),
      trial.units.filter((u) => u.health > 0),
    );
    if (reason) {
      message = reason;
      return;
    }
    if (
      !trial.units.some(
        (u) => u.friendly && u.health > 0 && Math.hypot(u.x - x, u.z - z) <= 40,
      )
    ) {
      message = "Build within 40 units of your troops.";
      return;
    }
    sandbags.push({ id: nextSandbag++, x, z, angle });
    syncSandbags();
    message = "Sandbags built: infantry cover; tanks can crush them.";
  }
  function removeSandbags(id: number) {
    const i = sandbags.findIndex((p) => p.id === id);
    if (i >= 0) {
      sandbags.splice(i, 1);
      syncSandbags();
      message = "Sandbags removed.";
    }
  }
  for (const u of trial.units)
    squads.set(u.id, {
      id: String(u.id),
      army: null,
      owner: u.friendly ? 0 : 1,
      region: 0,
      kind: u.kind === "vehicle" ? "armor" : "infantry",
      unitCount: 1,
      strength: 100,
      capacity: 100,
      morale: 1,
      suppression: 0,
      x: u.x,
      y: u.z,
      previousX: u.x,
      previousY: u.z,
      action: "holding",
      target: null,
      fire: 0,
    });
  let running = false,
    time = 0,
    accumulator = 0,
    sequence = 0,
    message = "Battle ready. Position your troops, then start battle.";
  const reactions = new Map<
    number,
    {
      anchor: { x: number; z: number };
      next: number;
      health: number;
      target: string | null;
    }
  >();
  const nextShell = new Map<number, number>();
  const shots: CityShot[] = [],
    pending: { due: number; shot: CityShot; damage: number }[] = [];
  const hearing = createCityHearing();
  const disclosedShots = new Set<number>();
  const emit = (shot: Omit<CityShot, "id">) => {
    const event = { ...shot, at: time, id: ++sequence };
    hearing.emit(event, time, trial.units);
    if (
      [shot.from, shot.to].every((id) => {
        const u = trial.units.find((v) => v.id === id);
        return u && visibleToFriendly(u);
      })
    )
      disclosedShots.add(event.id);
    shots.push(event);
    if (shots.length > 128) disclosedShots.delete(shots.shift()!.id);
    return event;
  };
  // Reuse the spatially indexed building LOS query. Low cover reduces fire, not sight.
  function visibleToFriendly(unit: TrialUnit) {
    if (unit.friendly) return true;
    return trial.units.some(
      (observer) =>
        observer.friendly &&
        observer.health > 0 &&
        Math.hypot(observer.x - unit.x, observer.z - unit.z) <=
          citySightRange(observer.kind) &&
        sight.exposure(
          { ...squads.get(observer.id)!, x: observer.x, y: observer.z },
          { ...squads.get(unit.id)!, x: unit.x, y: unit.z },
        ) > 0,
    );
  }
  const contactMemory = createContactMemory();
  function playerState() {
    const visible = new Set(
      trial.units.filter(visibleToFriendly).map((u) => u.id),
    );
    const contacts = contactMemory.update(
      time,
      trial.units.filter((u) => !u.friendly && visible.has(u.id)),
      (p) =>
        visibleToFriendly({
          ...trial.units.find((u) => !u.friendly)!,
          ...p,
          friendly: false,
        }),
    );
    const raw = trial.state();
    return {
      ...raw,
      message,
      running,
      time,
      contacts,
      sandbags: sandbags.map((p) => ({ ...p })),
      units: raw.units
        .filter((u) => visible.has(u.id))
        .map((u) =>
          u.friendly
            ? u
            : {
                ...u,
                path: [],
                guide: [],
                facing: undefined,
                aimAngle: undefined,
              },
        ),
      shots: shots.filter(
        (s) =>
          disclosedShots.has(s.id) && visible.has(s.from) && visible.has(s.to),
      ),
      sounds: hearing.snapshot(time),
    };
  }
  function command(
    ids: number[],
    action: "move" | "attack" | "stop" | "hold" | "run",
    x?: number,
    z?: number,
    target?: number,
    facing?: number,
  ) {
    if (action === "run") {
      running = !running;
      message = running
        ? "Battle underway. Right-click enemies to focus fire."
        : "Battle paused.";
      return;
    }
    const own = ids.filter((id) =>
      trial.units.some((u) => u.id === id && u.friendly && u.health > 0),
    );
    for (const id of own) {
      const u = trial.units.find((v) => v.id === id)!;
      u.supportMove = false;
      u.supportTarget = undefined;
    }
    for (const g of supportGroups.values())
      if (g.units.some((u) => own.includes(u.id))) g.memory = undefined;
    trial.selectMany(own);
    if (action === "stop" || action === "hold") {
      trial.stop();
      for (const id of own)
        trial.units.find((u) => u.id === id)!.stance = "hold";
    }
    if (action === "move" && x !== undefined && z !== undefined) {
      if (trial.order({ x, z }, facing))
        for (const id of own) {
          const u = trial.units.find((v) => v.id === id)!;
          u.stance = "move";
          reactions.set(id, {
            anchor: { ...(u.path.at(-1) ?? u) },
            next: time + 3,
            health: u.health,
            target: null,
          });
        }
      for (const id of own) squads.get(id)!.target = null;
    }
    if (action === "attack") {
      const enemy = trial.units.find(
        (u) => u.id === target && !u.friendly && u.health > 0,
      );
      if (!enemy || !visibleToFriendly(enemy)) {
        message = "Target is not currently visible.";
        return;
      }
      for (const id of own) {
        const unit = trial.units.find((u) => u.id === id)!,
          s = squads.get(id)!,
          d = squads.get(enemy.id)!;
        s.target = String(enemy.id);
        const range = tacticalFireRange(cityWeaponRole(unit));
        if (
          Math.hypot(unit.x - enemy.x, unit.z - enemy.z) > range ||
          sight.exposure(
            { ...s, x: unit.x, y: unit.z },
            { ...d, x: enemy.x, y: enemy.z },
          ) <= 0
        ) {
          const candidates = [];
          for (const r of [8, 14, 20])
            for (let i = 0; i < 24; i++) {
              const p = {
                x: enemy.x + Math.cos((i * Math.PI) / 12) * r,
                z: enemy.z + Math.sin((i * Math.PI) / 12) * r,
              };
              if (
                tactics.walkable(p, unit.kind) &&
                sight.exposure(
                  { ...s, x: p.x, y: p.z },
                  { ...d, x: enemy.x, y: enemy.z },
                ) > 0
              )
                candidates.push(p);
            }
          candidates.sort(
            (a, b) =>
              Math.hypot(a.x - unit.x, a.z - unit.z) -
              Math.hypot(b.x - unit.x, b.z - unit.z),
          );
          trial.select(id);
          for (const p of candidates.slice(0, 6)) if (trial.order(p)) break;
        }
      }
      for (const id of own) {
        const u = trial.units.find((v) => v.id === id)!;
        u.stance = "attack";
        reactions.set(id, {
          anchor: { ...(u.path.at(-1) ?? u) },
          next: time + 3,
          health: u.health,
          target: String(enemy.id),
        });
      }
      trial.selectMany(own);
      message = `${own.length} unit(s) engaging enemy ${enemy.id}. Approaching a firing position where a route is available.`;
    } else message = trial.state().message;
  }
  function tick(dt: number) {
    if (!running || !Number.isFinite(dt) || dt <= 0) return;
    accumulator += Math.min(dt, 1);
    while (accumulator >= 0.05) {
      accumulator -= 0.05;
      time += 0.05;
      trial.tick(0.05);
      const crushed = sandbags.filter((p) =>
        trial.units.some(
          (u) =>
            u.kind === "vehicle" &&
            u.health > 0 &&
            obstacleDistance(u, {
              ...p,
              id: String(p.id),
              kind: "sandbag",
              width: 4,
              depth: 1,
            }) < 0.7,
        ),
      );
      if (crushed.length) {
        for (const p of crushed) sandbags.splice(sandbags.indexOf(p), 1);
        syncSandbags();
      }
      for (const u of trial.units)
        if (u.kind === "vehicle" && u.health > 0) {
          const current = u.turretAngle ?? u.angle,
            target = u.aimAngle ?? u.angle;
          const error = Math.atan2(
            Math.sin(target - current),
            Math.cos(target - current),
          );
          u.turretAngle = current + Math.max(-0.075, Math.min(0.075, error));
        }
      if (Math.round(time * 20) % 5 !== 0) continue;
      const alive = trial.units.filter((u) => u.health > 0);
      for (const u of alive) {
        const s = squads.get(u.id)!;
        s.x = u.x;
        s.y = u.z;
        s.strength = u.health;
        s.suppression = Math.max(0, s.suppression - 0.025);
        s.localOrder = u.moving
          ? ({ path: [{ x: u.x, y: u.z }] } as Squad["localOrder"])
          : undefined;
      }
      // City spawn clusters adapt into the same squad support policy as country groups.
      for (const g of supportGroups.values()) g.units = [];
      for (const u of alive) {
        const key =
          u.kind === "vehicle"
            ? "vehicle:" + u.id
            : (u.friendly ? "friendly:" : "enemy:") +
              (u.id >= 200 ? Math.floor(u.id / 10) : 0);
        let g = supportGroups.get(key);
        if (!g) {
          g = { id: u.id, enemy: !u.friendly, units: [] };
          supportGroups.set(key, g);
        }
        g.units.push(u);
      }
      updateTacticalSupport([...supportGroups.values()], time, {
        range: (u) => tacticalFireRange(cityWeaponRole(u as TrialUnit)),
        visible: (a, b) =>
          sight.exposure(
            { ...squads.get(a.id)!, x: a.x, y: a.z },
            { ...squads.get(b.id)!, x: b.x, y: b.z },
          ) > 0,
        clear: (a, b) =>
          tactics.segmentClear(a, b, (a as TrialUnit).kind) &&
          tactics.walkable(b, (a as TrialUnit).kind),
      });
      // Bounded, staggered decisions. Moving orders finish before local reactions.
      const previousSelection = trial.selectedIds();
      for (const u of alive) {
        if (u.kind !== "infantry" || u.stance === "hold" || u.path.length)
          continue;
        const s = squads.get(u.id)!;
        let memory = reactions.get(u.id);
        if (!memory) {
          memory = {
            anchor: { x: u.x, z: u.z },
            next: time + (u.id % 7) * 0.3,
            health: u.health,
            target: null,
          };
          reactions.set(u.id, memory);
        }
        if (time < memory.next) continue;
        memory.next = time + 3.5 + (u.id % 5) * 0.3;
        const enemies = alive.filter(
          (v) =>
            v.friendly !== u.friendly && Math.hypot(v.x - u.x, v.z - u.z) < 30,
        );
        const threat =
          enemies.find((v) => String(v.id) === s.target) ??
          enemies.sort(
            (a, b) =>
              Math.hypot(a.x - u.x, a.z - u.z) -
              Math.hypot(b.x - u.x, b.z - u.z),
          )[0];
        if (!threat) continue;
        const d = squads.get(threat.id)!,
          exposure = sight.exposure(s, d),
          hurt = u.health < memory.health - 0.01,
          changed = memory.target !== d.id;
        memory.health = u.health;
        memory.target = d.id;
        if (!hurt && !changed && !(u.stance === "attack" && exposure === 0))
          continue;
        const position = coverReactionPosition(
          u,
          memory.anchor,
          tactics.obstacles,
          alive.filter((v) => v.id !== u.id).map((v) => v.path.at(-1) ?? v),
          (p) => trial.coverAt(p, threat).damageScale,
          (p) => tactics.walkable(p),
          (a, b) => tactics.segmentClear(a, b, "infantry"),
          u.stance === "attack" && exposure === 0
            ? (p) => sight.exposure({ ...s, x: p.x, y: p.z }, d) > 0
            : undefined,
        );
        if (position) {
          u.path = [position];
          u.supportMove = true;
          u.guide = [{ x: u.x, z: u.z }, position];
          u.moving = true;
          u.facing = Math.atan2(threat.x - position.x, threat.z - position.z);
        }
      }
      trial.selectMany(previousSelection);
      const index = new FireIndex(
          alive.map((u) => squads.get(u.id)!),
          26,
        ),
        damage = new Map<number, number>();
      for (let i = pending.length - 1; i >= 0; i--) {
        const p = pending[i];
        if (p.due > time) continue;
        pending.splice(i, 1);
        emit({ ...p.shot, impact: true });
        for (const u of alive) {
          const d = Math.hypot(u.x - p.shot.tx, u.z - p.shot.tz);
          if (d > 3 || u.friendly) continue;
          const s = squads.get(u.id)!,
            center = { ...s, id: "impact", x: p.shot.tx, y: p.shot.tz };
          const hit =
            p.damage *
            (1 - d / 4) *
            (s.kind === "armor"
              ? tacticalWeaponProfile("tank").armor
              : tacticalWeaponProfile("tank").soft) *
            sight.exposure(center, s);
          damage.set(u.id, (damage.get(u.id) ?? 0) + hit);
        }
      }
      for (const u of alive) {
        const s = squads.get(u.id)!,
          role = cityWeaponRole(u),
          range = tacticalFireRange(role);
        const d = index.target(s, range, (a, b) => sight.exposure(a, b));
        u.firing = !!d;
        if (!d) {
          u.aimAngle = undefined;
          continue;
        }
        s.target = d.id;
        const target = alive.find((v) => String(v.id) === d.id)!;
        u.aimAngle = Math.atan2(target.x - u.x, target.z - u.z);
        if (u.kind === "infantry" && !u.moving) u.facing = u.aimAngle;
        if (
          u.kind === "vehicle" &&
          Math.abs(
            Math.atan2(
              Math.sin(u.aimAngle - (u.turretAngle ?? u.angle)),
              Math.cos(u.aimAngle - (u.turretAngle ?? u.angle)),
            ),
          ) > 0.12
        )
          continue;
        if (u.kind === "vehicle") {
          if (time < (nextShell.get(u.id) ?? 0)) continue;
          // City tank reload uses real seconds; do not stack the campaign reload on top.
          if (s.fireMemory) s.fireMemory.reload = 0;
        }
        const volley = fireVolley(
          s,
          d,
          Math.hypot(s.x - d.x, s.y - d.y),
          range,
          sight.exposure(s, d),
          4,
          role,
        );
        u.reload = s.fireMemory?.reload
          ? Math.max(
              0,
              Math.min(
                1,
                1 - s.fireMemory.reload / tacticalWeaponProfile(role).reload,
              ),
            )
          : -1;
        if (!volley.fired) continue;
        if (u.kind === "vehicle")
          nextShell.set(u.id, time + CITY_TANK_RELOAD_SECONDS);
        const impact =
          u.kind === "vehicle"
            ? cityShellImpact(
                target.x,
                target.z,
                volley.rawDamage > 0 ||
                  (!u.moving &&
                    !target.moving &&
                    Math.hypot(target.x - u.x, target.z - u.z) <= 12),
                sequence + 1 + u.id * 7919,
              )
            : target;
        const shot = emit({
          from: u.id,
          to: target.id,
          x: u.x,
          z: u.z,
          tx: impact.x,
          tz: impact.z,
          shell: u.kind === "vehicle",
          impact: false,
        });
        if (shot.shell)
          pending.push({
            due:
              time +
              cityShellFlightSeconds(
                Math.hypot(shot.tx - shot.x, shot.tz - shot.z),
              ),
            shot,
            damage: CITY_SHELL_DAMAGE,
          });
        else
          damage.set(target.id, (damage.get(target.id) ?? 0) + volley.damage);
        d.suppression = Math.min(1, d.suppression + volley.suppression);
      }
      for (const u of alive) {
        u.health = Math.max(0, u.health - (damage.get(u.id) ?? 0));
        if (!u.health) {
          u.path = [];
          u.guide = [];
          u.moving = false;
          u.speed = 0;
          u.firing = false;
        }
      }
      if (
        !trial.units.some((u) => u.friendly && u.health > 0) ||
        !trial.units.some((u) => !u.friendly && u.health > 0)
      ) {
        running = false;
        message = trial.units.some((u) => u.friendly && u.health > 0)
          ? "Victory — enemy squad eliminated."
          : "Defeat — your force was eliminated.";
      }
    }
  }
  return {
    trial,
    playerState,
    buildSandbags,
    removeSandbags,
    tick,
    command,
    state: () => ({
      ...trial.state(),
      message,
      running,
      time,
      shots: [...shots],
    }),
  };
}

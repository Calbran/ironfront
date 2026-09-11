import { createCityUnitTrial, type TrialUnit } from "./cityUnitTrial";
import type { createCityTactics } from "./cityTactics";
import {
  FireIndex,
  FireVisibility,
  fireVolley,
  weaponEffectiveness,
} from "./squadFire";
import type { Squad } from "./tactics";

export function battleTrial(tactics: ReturnType<typeof createCityTactics>) {
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
};
export function createCityBattle(
  tactics: ReturnType<typeof createCityTactics>,
) {
  const trial = battleTrial(tactics),
    squads = new Map<number, Squad>();
  const sight = new FireVisibility(
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
    8,
  );
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
  const shots: CityShot[] = [],
    pending: { due: number; shot: CityShot; damage: number }[] = [];
  const emit = (shot: Omit<CityShot, "id">) => {
    const event = { ...shot, id: ++sequence };
    shots.push(event);
    if (shots.length > 128) shots.shift();
    return event;
  };
  function command(
    ids: number[],
    action: "move" | "attack" | "stop" | "run",
    x?: number,
    z?: number,
    target?: number,
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
    trial.selectMany(own);
    if (action === "stop") trial.stop();
    if (action === "move" && x !== undefined && z !== undefined) {
      trial.order({ x, z });
      for (const id of own) squads.get(id)!.target = null;
    }
    if (action === "attack") {
      const enemy = trial.units.find(
        (u) => u.id === target && !u.friendly && u.health > 0,
      );
      if (!enemy) return;
      for (const id of own) {
        const unit = trial.units.find((u) => u.id === id)!,
          s = squads.get(id)!,
          d = squads.get(enemy.id)!;
        s.target = String(enemy.id);
        const range = unit.kind === "vehicle" ? 38 : 26;
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
            weaponEffectiveness("armor", s.kind) *
            sight.exposure(center, s);
          damage.set(u.id, (damage.get(u.id) ?? 0) + hit);
        }
      }
      for (const u of alive) {
        const s = squads.get(u.id)!,
          range = u.kind === "vehicle" ? 38 : 26;
        const d = index.target(s, range, (a, b) => sight.exposure(a, b));
        if (!d) continue;
        s.target = d.id;
        const target = alive.find((v) => String(v.id) === d.id)!;
        u.facing = Math.atan2(target.x - u.x, target.z - u.z);
        const volley = fireVolley(
          s,
          d,
          Math.hypot(s.x - d.x, s.y - d.y),
          range,
          sight.exposure(s, d),
          4,
        );
        if (!volley.fired) continue;
        const shot = emit({
          from: u.id,
          to: target.id,
          x: u.x,
          z: u.z,
          tx: target.x,
          tz: target.z,
          shell: u.kind === "vehicle",
          impact: false,
        });
        if (shot.shell)
          pending.push({ due: time + 0.5, shot, damage: volley.rawDamage });
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

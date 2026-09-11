import type { CityPoint } from "./organicCity";
import {
  obstacleDistance,
  type CityObstacle,
  type createCityTactics,
} from "./cityTactics";
export const CITY_RUN_SPEED = 1.43;
export const CITY_RUN_STRIDE = 1.144;
export const CITY_TANK_TURN_RATE = 0.55;
export type TrialUnit = CityPoint & {
  id: number;
  kind: "infantry" | "vehicle";
  vehicleType?: "tank" | "jeep";
  friendly?: boolean;
  facing?: number;
  health: number;
  cover: "none" | "partial" | "full";
  angle: number;
  path: CityPoint[];
  moving: boolean;
  distance: number;
  guide: CityPoint[];
  speed: number;
  leftTrack: number;
  rightTrack: number;
};
/** Isolated city-preview state; never imported by campaign commands or persistence. */
export function createCityUnitTrial(
  tactics: ReturnType<typeof createCityTactics>,
) {
  const units: TrialUnit[] = [];
  for (const x of [-3, 0, 3]) {
    const p = { x, z: 21 };
    if (tactics.walkable(p))
      units.push({
        ...p,
        id: units.length + 1,
        kind: "infantry",
        health: 100,
        cover: "none",
        angle: Math.PI,
        path: [],
        moving: false,
        distance: 0,
        guide: [],
        speed: 0,
        leftTrack: 0,
        rightTrack: 0,
      });
  }
  if (tactics.walkable({ x: 10, z: 19 }, "vehicle"))
    units.push({
      id: 4,
      kind: "vehicle",
      vehicleType: "tank",
      health: 100,
      cover: "none",
      x: 10,
      z: 19,
      angle: Math.PI / 2,
      path: [],
      guide: [],
      speed: 0,
      leftTrack: 0,
      rightTrack: 0,
      moving: false,
      distance: 0,
    });
  if (tactics.walkable({ x: -10, z: 19 }, "vehicle"))
    units.push({
      id: 5,
      kind: "vehicle",
      vehicleType: "jeep",
      health: 100,
      cover: "none",
      x: -10,
      z: 19,
      angle: Math.PI / 2,
      path: [],
      guide: [],
      speed: 0,
      leftTrack: 0,
      rightTrack: 0,
      moving: false,
      distance: 0,
    });
  const vehicleCover = (): CityObstacle[] =>
    units
      .filter(
        (u) => u.kind === "vehicle" && u.friendly !== false && u.health > 0,
      )
      .map((u) => ({
        id: `vehicle:${u.id}`,
        x: u.x,
        z: u.z,
        width: (u.vehicleType === "jeep" ? 2.5 : 3.1) * 0.55,
        depth: 5.9 * 0.55,
        angle: u.angle,
        kind: "vehicle",
        coverLevel: u.vehicleType === "jeep" ? "partial" : "full",
      }));
  const coverAt = (p: CityPoint, threat?: CityPoint) =>
    tactics.coverAt(p, threat, vehicleCover());
  let selectedIds: number[] = [];
  let message = "Select soldiers, then right-click clear ground to move.";
  function selectMany(ids: number[], additive = false) {
    selectedIds = [
      ...new Set([...(additive ? selectedIds : []), ...ids]),
    ].filter((id) => units.some((u) => u.id === id));
    message = selectedIds.length
      ? `${selectedIds.length} unit(s) selected. Right-click to move.`
      : "Select soldiers, then right-click clear ground to move.";
  }
  function select(id?: number) {
    selectMany(id === undefined ? [] : [id]);
  }
  function variedRoute(
    route: CityPoint[],
    id: number,
    kind: "infantry" | "vehicle",
  ) {
    // Remove grid stair-steps first, then use small checked deviations in clear space.
    const smooth = [route[0]];
    for (let i = 0; i < route.length - 1;) {
      let next = route.length - 1;
      while (next > i + 1 && !tactics.segmentClear(route[i], route[next], kind))
        next--;
      smooth.push(route[next]);
      i = next;
    }
    const result = [smooth[0]];
    for (let i = 1; i < smooth.length; i++) {
      const a = smooth[i - 1],
        b = smooth[i],
        dx = b.x - a.x,
        dz = b.z - a.z,
        d = Math.hypot(dx, dz),
        n = Math.max(1, Math.ceil(d / 1.2));
      for (let j = 1; j <= n; j++) {
        const t = j / n,
          offset =
            (kind === "vehicle" ? 0 : 0.18) *
            Math.sin(t * Math.PI) *
            Math.sin((t * d) / 3 + id * 1.7);
        const base = { x: a.x + dx * t, z: a.z + dz * t };
        const q = {
          x: base.x - (dz / (d || 1)) * offset,
          z: base.z + (dx / (d || 1)) * offset,
        };
        // Reserve a safe continuation as well as the current step.
        result.push(
          tactics.segmentClear(result.at(-1)!, q, kind) &&
            tactics.segmentClear(q, b, kind)
            ? q
            : base,
        );
      }
    }
    // Never introduce a shortcut through a wall if a perturbed segment cannot reconnect.
    return result.every(
      (p, i) => !i || tactics.segmentClear(result[i - 1], p, kind),
    )
      ? result
      : smooth;
  }
  function previewOrder(p: CityPoint, facing?: number) {
    const selected = units.filter((u) => selectedIds.includes(u.id));
    const chosen: {
      id: number;
      kind: TrialUnit["kind"];
      x: number;
      z: number;
      angle: number;
      cover: TrialUnit["cover"];
      valid: boolean;
    }[] = [];
    for (let i = 0; i < selected.length; i++) {
      const unit = selected[i],
        spacing = selected.some((u) => u.kind === "vehicle") ? 2.5 : 1.5,
        offset = (i - (selected.length - 1) / 2) * spacing;
      const desired = {
        x: p.x + Math.cos(facing ?? 0) * offset,
        z: p.z - Math.sin(facing ?? 0) * offset,
      };
      const candidates: CityPoint[] = [desired];
      const clear = (q: CityPoint) =>
        tactics.walkable(q, unit.kind) &&
        !vehicleCover().some(
          (o) =>
            o.id !== `vehicle:${unit.id}` &&
            obstacleDistance(q, o) <= (unit.kind === "infantry" ? 0.25 : 0.9),
        ) &&
        !units.some(
          (u) =>
            !selectedIds.includes(u.id) &&
            Math.hypot(u.x - q.x, u.z - q.z) <
              (u.kind === "vehicle" || unit.kind === "vehicle" ? 1.5 : 0.9),
        ) &&
        !chosen.some((v) => Math.hypot(v.x - q.x, v.z - q.z) < 0.9);
      if (!clear(desired)) {
        const reach = 4.5,
          margin = unit.kind === "vehicle" ? 1 : 0.32;
        // Project onto real oriented faces, then slide along those faces to fit neighbors.
        for (const o of [
          ...tactics.obstacles,
          ...vehicleCover().filter((o) => o.id !== `vehicle:${unit.id}`),
        ]) {
          if (o.kind === "garden" && unit.kind === "infantry") continue;
          if (
            Math.hypot(o.x - desired.x, o.z - desired.z) >
            Math.hypot(o.width, o.depth) / 2 + reach
          )
            continue;
          const c = Math.cos(o.angle),
            s = Math.sin(o.angle),
            dx = desired.x - o.x,
            dz = desired.z - o.z;
          const lx = dx * c - dz * s,
            lz = dx * s + dz * c;
          const put = (x: number, z: number) =>
            candidates.push({ x: o.x + x * c + z * s, z: o.z - x * s + z * c });
          for (const sign of [-1, 1])
            for (const shift of [0, -0.95, 0.95, -1.9, 1.9, -2.85, 2.85]) {
              put(
                sign * (o.width / 2 + margin),
                Math.max(-o.depth / 2, Math.min(o.depth / 2, lz + shift)),
              );
              put(
                Math.max(-o.width / 2, Math.min(o.width / 2, lx + shift)),
                sign * (o.depth / 2 + margin),
              );
            }
        }
        // Also resolve occupied open-ground slots without requiring a nearby wall.
        for (const r of [0.5, 1, 1.5, 2, 3, 4])
          for (let j = 0; j < 16; j++)
            candidates.push({
              x: desired.x + Math.cos((j * Math.PI) / 8) * r,
              z: desired.z + Math.sin((j * Math.PI) / 8) * r,
            });
      }
      const distance = (q: CityPoint) =>
        Math.hypot(q.x - desired.x, q.z - desired.z);
      const goal =
        candidates
          .filter((q) => distance(q) <= 4.5 && clear(q))
          .sort(
            (a, b) => distance(a) - distance(b) || a.x - b.x || a.z - b.z,
          )[0] ?? desired;
      const valid = clear(goal),
        near = coverAt(goal);
      const angle =
        facing ??
        (near.level !== "none" && unit.kind === "infantry"
          ? Math.atan2(-near.normal.x, -near.normal.z)
          : Math.atan2(goal.x - unit.x, goal.z - unit.z));
      const cover =
        unit.kind === "infantry"
          ? coverAt(goal, {
              x: goal.x + Math.sin(angle) * 60,
              z: goal.z + Math.cos(angle) * 60,
            }).level
          : "none";
      chosen.push({
        id: unit.id,
        kind: unit.kind,
        x: goal.x,
        z: goal.z,
        angle,
        cover,
        valid,
      });
    }
    return chosen;
  }
  function order(p: CityPoint, facing?: number) {
    const preview = previewOrder(p, facing);
    if (!preview.length) return false;
    const planned: {
      unit: TrialUnit;
      path: CityPoint[];
      guide: CityPoint[];
      angle: number;
    }[] = [];
    for (const goal of preview) {
      const unit = units.find((u) => u.id === goal.id)!;
      const route = goal.valid
        ? tactics.route(unit, goal, unit.kind).map((p) => ({ x: p.x, z: p.z }))
        : [];
      if (!route.length) {
        message =
          "No safe route for the selection. Try a wider street or clear ground.";
        return false;
      }
      planned.push({
        unit,
        path: variedRoute(route, unit.id, unit.kind).slice(1),
        guide: route,
        angle: goal.angle,
      });
    }
    for (const { unit, path, guide, angle } of planned) {
      unit.facing = angle;
      unit.path = path;
      unit.guide = guide;
      unit.moving = path.length > 0;
    }
    message = `${planned.length} unit(s) moving.`;
    return true;
  }
  function tick(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (const unit of units) {
      if(unit.health<=0)continue;
      unit.cover =
        unit.kind === "infantry"
          ? coverAt(
              unit,
              unit.facing === undefined
                ? undefined
                : {
                    x: unit.x + Math.sin(unit.facing) * 60,
                    z: unit.z + Math.cos(unit.facing) * 60,
                  },
            ).level
          : "none";
      const elapsed = Math.min(dt, 0.1);
      if (unit.kind === "vehicle") {
        const p = unit.path[0];
        if (p) {
          const dx = p.x - unit.x,
            dz = p.z - unit.z,
            d = Math.hypot(dx, dz);
          const desired = Math.atan2(dx, dz),
            error = Math.atan2(
              Math.sin(desired - unit.angle),
              Math.cos(desired - unit.angle),
            );
          const turn = Math.max(
            -CITY_TANK_TURN_RATE * elapsed,
            Math.min(CITY_TANK_TURN_RATE * elapsed, error),
          );
          unit.angle += turn;
          // Track pivot first: never translate sideways while the hull catches up.
          const aligned = Math.abs(error - turn) < 0.001;
          unit.speed = aligned ? Math.min(1.05, unit.speed + elapsed * 0.7) : 0;
          const travel = aligned ? Math.min(d, unit.speed * elapsed) : 0;
          if (d > 1e-8) {
            unit.x += (dx / d) * travel;
            unit.z += (dz / d) * travel;
            unit.distance += travel;
          }
          const halfGauge = 1.28 * 0.55;
          unit.leftTrack += (travel + turn * halfGauge) / 0.55;
          unit.rightTrack += (travel - turn * halfGauge) / 0.55;
          if (d <= travel + 1e-8) unit.path.shift();
        }
        if (!unit.path.length) {
          unit.moving = false;
          unit.speed = 0;
          if (unit.facing !== undefined) {
            const error = Math.atan2(
              Math.sin(unit.facing - unit.angle),
              Math.cos(unit.facing - unit.angle),
            );
            const turn = Math.max(
              -CITY_TANK_TURN_RATE * elapsed,
              Math.min(CITY_TANK_TURN_RATE * elapsed, error),
            );
            // A path step already spent this frame's turn budget.
            if (!p) {
              unit.angle += turn;
              unit.leftTrack += turn * 1.28;
              unit.rightTrack -= turn * 1.28;
            }
          }
        }
        if (!unit.path.length && unit.facing !== undefined) {
          const delta = Math.atan2(
              Math.sin(unit.facing - unit.angle),
              Math.cos(unit.facing - unit.angle),
            ),
            turn = Math.max(
              -CITY_TANK_TURN_RATE * elapsed,
              Math.min(CITY_TANK_TURN_RATE * elapsed, delta),
            );
          unit.angle += turn;
          unit.leftTrack += turn * 1.28;
          unit.rightTrack -= turn * 1.28;
        }
        continue;
      }
      const targetSpeed = unit.moving
        ? CITY_RUN_SPEED *
          (1 + 0.035 * Math.sin(unit.id * 2)) *
          (1 + 0.06 * Math.sin((unit.distance / CITY_RUN_STRIDE) * Math.PI * 4))
        : 0;
      unit.speed += (targetSpeed - unit.speed) * Math.min(1, elapsed * 5);
      let remaining = elapsed * unit.speed;
      while (remaining > 0 && unit.path.length) {
        const p = unit.path[0],
          dx = p.x - unit.x,
          dz = p.z - unit.z,
          d = Math.hypot(dx, dz),
          step = Math.min(d, remaining);
        if (d > 1e-8) {
          const desired = Math.atan2(dx, dz),
            turn = Math.atan2(
              Math.sin(desired - unit.angle),
              Math.cos(desired - unit.angle),
            );
          unit.angle += turn * Math.min(1, elapsed * 8);
          unit.x += (dx / d) * step;
          unit.z += (dz / d) * step;
          unit.distance += step;
        }
        remaining -= step;
        if (d <= step + 1e-8) unit.path.shift();
      }
      if (!unit.path.length && unit.facing !== undefined) {
        const turn = Math.atan2(
          Math.sin(unit.facing - unit.angle),
          Math.cos(unit.facing - unit.angle),
        );
        unit.angle += turn * Math.min(1, elapsed * 8);
      }
      if (unit.moving && !unit.path.length) {
        unit.moving = false;
        if (selectedIds.includes(unit.id))
          message = `Soldier ${unit.id} arrived.`;
      }
    }
  }
  function refreshCover() {
    for (const u of units)
      u.cover =
        u.kind === "infantry"
          ? coverAt(
              u,
              u.facing === undefined
                ? undefined
                : {
                    x: u.x + Math.sin(u.facing) * 60,
                    z: u.z + Math.cos(u.facing) * 60,
                  },
            ).level
          : "none";
  }
  function stop() {
    for (const u of units.filter((u) => selectedIds.includes(u.id))) {
      u.path = [];
      u.guide = [];
      u.moving = false;
      u.speed = 0;
      u.facing = undefined;
    }
    message = "Selected soldiers stopped.";
  }
  function testFire(exposed = false) {
    for (const u of units.filter(
      (u) => selectedIds.includes(u.id) && u.kind === "infantry",
    )) {
      const nearby = coverAt(u),
        sign = exposed ? 1 : -1;
      const incoming = {
        x: u.x + nearby.normal.x * 60 * sign,
        z: u.z + nearby.normal.z * 60 * sign,
      };
      const hit = coverAt(u, incoming),
        damage = 20 * hit.damageScale;
      u.health = Math.max(0, u.health - damage);
      message = `Soldier ${u.id}: ${hit.level} cover, ${damage} test damage (${u.health}/100).`;
    }
  }
  return {
    vehicleCover,
    coverAt,
    previewOrder,
    testFire,
    resetHealth() {
      units.forEach((u) => (u.health = 100));
    },
    units,
    selectedId: () => selectedIds[0],
    selectedIds: () => [...selectedIds],
    selectMany,
    select,
    order,
    tick(dt: number) {
      tick(dt);
      refreshCover();
    },
    stop,
    state: () => ({
      selected: selectedIds[0],
      selectedIds: [...selectedIds],
      message,
      units: units.map((u) => ({
        ...u,
        path: u.path.map((p) => ({ ...p })),
        guide: u.guide.map((p) => ({ ...p })),
      })),
    }),
  };
}

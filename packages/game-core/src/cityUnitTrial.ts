import {stepCityInfantry,CITY_RUN_SPEED,CITY_RUN_STRIDE} from "./cityInfantryMotion";
import {previewTacticalOrder} from "./tacticalPlacement";
import { variedMovementRoute } from "./variedMovementRoute";
import {COVER_ORDER_REACH,coverSlots,sameCoverSide} from "./cityCoverOrders";
import type { CityPoint } from "./organicCity";
import {
  obstacleDistance,
  type CityObstacle,
  type createCityTactics,
} from "./cityTactics";
export {CITY_RUN_SPEED,CITY_RUN_STRIDE} from "./cityInfantryMotion";
export const CITY_TANK_TURN_RATE = 0.55;
export type TrialUnit = CityPoint & {
  visible?: boolean;
  moveGroup?: number;
  id: number;
  kind: "infantry" | "vehicle";
  vehicleType?: "tank" | "jeep";
  friendly?: boolean;
  facing?: number;
  aimAngle?: number;
  turretAngle?: number;
  firing?: boolean;
  stance?: "move"|"attack"|"hold";
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
    return variedMovementRoute(route, id, kind === "infantry", (a,b) => tactics.segmentClear(a,b,kind)).path;
  }

  function previewOrder(p:CityPoint,facing?:number){
    return previewTacticalOrder(p,facing,units,selectedIds,tactics,vehicleCover());
  }
  let nextMoveGroup=0;
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
    const group=planned.length>1?++nextMoveGroup:undefined;
    for (const { unit, path, guide, angle } of planned) {
      unit.moveGroup=group;
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
    const groupCaps=new Map<number,number>();
    for(const u of units){if(!u.moveGroup||u.health<=0||!u.path.length)continue;
      let speed=u.kind==='vehicle'?1.05:CITY_RUN_SPEED*(u.firing?.65:1);
      if(u.kind==='vehicle'){const p=u.path[0],desired=Math.atan2(p.x-u.x,p.z-u.z),error=Math.abs(Math.atan2(Math.sin(desired-u.angle),Math.cos(desired-u.angle)));speed=error>CITY_TANK_TURN_RATE*Math.min(dt,.1)+.001?0:Math.min(speed,u.speed+Math.min(dt,.1)*.7);}
      groupCaps.set(u.moveGroup,Math.min(groupCaps.get(u.moveGroup)??Infinity,speed));
    }
    for (const unit of units) {
      if(unit.health<=0)continue;
      const groupCap=unit.moveGroup?groupCaps.get(unit.moveGroup)??Infinity:Infinity;
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
          unit.speed = aligned ? Math.min(1.05, groupCap, unit.speed + elapsed * 0.7) : 0;
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
      stepCityInfantry(unit,elapsed,groupCap,(a,b)=>tactics.segmentClear(a,b,"infantry"));
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

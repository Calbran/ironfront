import { coverSlots } from "./cityCoverOrders";
import type { CityObstacle } from "./cityTactics";
import type { CityPoint } from "./organicCity";

/** Shared city-battle reaction: bounded nearby improvement, never a fresh strategic order. */
export function coverReactionPosition(
  unit: CityPoint, anchor: CityPoint, obstacles: CityObstacle[],
  occupied: CityPoint[], quality: (p:CityPoint)=>number,
  walkable:(p:CityPoint)=>boolean, clear:(a:CityPoint,b:CityPoint)=>boolean,
  regainSight?:(p:CityPoint)=>boolean,
) {
  const current=quality(unit);
  const useful=coverSlots(unit,obstacles,4).filter(p=>
    Math.hypot(p.x-anchor.x,p.z-anchor.z)<=4 && walkable(p) &&
    !occupied.some(v=>Math.hypot(v.x-p.x,v.z-p.z)<1) &&
    (quality(p)<current || regainSight?.(p)));
  useful.sort((a,b)=>(quality(a)*3+Math.hypot(a.x-unit.x,a.z-unit.z)*.15)-(quality(b)*3+Math.hypot(b.x-unit.x,b.z-unit.z)*.15));
  return useful.slice(0,3).find(p=>clear(unit,p));
}

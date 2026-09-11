import type {TrialUnit} from "./cityUnitTrial";
export const CITY_RUN_SPEED=1.43;
export const CITY_RUN_STRIDE=1.144;
type InfantryMotion=Pick<TrialUnit,"id"|"x"|"z"|"angle"|"distance"|"path"|"moving"|"speed"|"facing"|"firing"|"moveGroup">;
/** Canonical city infantry acceleration, personal stride speed and smooth facing. */
export function stepCityInfantry(unit:InfantryMotion,elapsed:number,groupCap:number,clear:(a:{x:number;z:number},b:{x:number;z:number})=>boolean){
      const targetSpeed = unit.moving
        ? Math.min(groupCap,CITY_RUN_SPEED * (unit.firing ? .65 : 1) *
          (unit.moveGroup ? 1 : 1 + 0.035 * Math.sin(unit.id * 2)) *
          (unit.moveGroup ? 1 : 1 + 0.06 * Math.sin((unit.distance / CITY_RUN_STRIDE) * Math.PI * 4)))
        : 0;
      unit.speed = unit.moveGroup ? targetSpeed : unit.speed + (targetSpeed - unit.speed) * Math.min(1, elapsed * 5);
      unit.speed=Math.min(unit.speed,groupCap);
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
          const next={x:unit.x+(dx/d)*step,z:unit.z+(dz/d)*step};
          if(!clear(unit,next)){unit.path=[];unit.speed=0;break;}
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
}

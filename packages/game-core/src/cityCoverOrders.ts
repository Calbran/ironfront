import {obstacleDistance,type CityObstacle} from './cityTactics';
import type {CityPoint} from './organicCity';
export const COVER_ORDER_REACH = 3;
/** Candidate positions on the same side of cover as the player's destination. */
export function sameCoverSide(anchor:CityPoint,p:CityPoint,obstacles:CityObstacle[]) {
  return obstacles.filter(o=>o.kind!=='garden'&&obstacleDistance(anchor,o)<=COVER_ORDER_REACH).every(o=>{
    const c=Math.cos(o.angle),s=Math.sin(o.angle);
    const local=(q:CityPoint)=>({x:(q.x-o.x)*c-(q.z-o.z)*s,z:(q.x-o.x)*s+(q.z-o.z)*c});
    const a=local(anchor),b=local(p);
    return Math.abs(a.x)-o.width/2>Math.abs(a.z)-o.depth/2 ? b.x*Math.sign(a.x)>=o.width/2+.25 : b.z*Math.sign(a.z)>=o.depth/2+.25;
  });
}
export function coverSlots(anchor:CityPoint,obstacles:CityObstacle[],reach=7):CityPoint[] {
  obstacles=obstacles.filter(o=>o.kind!=='garden'&&obstacleDistance(anchor,o)<=reach);
  const points:CityPoint[]=[];
  for(const o of obstacles){
    if(o.kind==='garden'||obstacleDistance(anchor,o)>reach)continue;
    const c=Math.cos(o.angle),s=Math.sin(o.angle),dx=anchor.x-o.x,dz=anchor.z-o.z,lx=dx*c-dz*s,lz=dx*s+dz*c;
    const put=(x:number,z:number)=>points.push({x:o.x+x*c+z*s,z:o.z-x*s+z*c});
    for(const side of [-1,1])for(let shift=-7;shift<=7;shift++){
      put(side*(o.width/2+.4),Math.max(-o.depth/2+.3,Math.min(o.depth/2-.3,lz+shift*.95)));
      put(Math.max(-o.width/2+.3,Math.min(o.width/2-.3,lx+shift*.95)),side*(o.depth/2+.4));
    }
  }
  return points.filter(p=>Math.hypot(p.x-anchor.x,p.z-anchor.z)<=reach&&sameCoverSide(anchor,p,obstacles));
}

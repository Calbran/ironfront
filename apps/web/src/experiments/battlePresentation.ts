import {cityShellFlightSeconds} from "../../../../packages/game-core/src/cityBallistics";
export const blendAngle=(a:number,b:number,t:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
/** A short moving trail, never a persistent muzzle-to-target beam. */
export function tracerSegment(distance:number,age:number,shell:boolean) {
  if(distance<=0||age<0)return undefined;
  const duration=shell?cityShellFlightSeconds(distance):Math.max(.06,distance/120);
  if(age>=duration)return undefined;
  const head=Math.min(distance, distance*age/duration);
  return {tail:Math.max(0,head-(shell?.45:.65))/distance,head:head/distance};
}

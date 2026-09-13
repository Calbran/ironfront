import {cityShellFlightSeconds} from "../../../../packages/game-core/src/cityBallistics";
export const blendAngle=(a:number,b:number,t:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
/** Stable per-soldier phase plus a small per-shot variation, capped below 200 ms. */
export function tacticalShotDelay(shotId:number,shooterId:number){
  const slot=((shooterId%6)+6)%6,
    variation=((shotId*17+shooterId*13)%31+31)%31;
  return slot*.032+variation/1000;
}
/** Preserve volley order when several authoritative ticks arrive in one snapshot. */
export function tacticalShotBatchDelays(shots:readonly {at?:number}[]){
  const times=shots
    .map(s=>s.at)
    .filter((at):at is number=>at!==undefined&&Number.isFinite(at));
  if(!times.length)return shots.map(()=>0);
  const first=Math.min(...times),span=Math.max(...times)-first,
    scale=span>.65?.65/span:1;
  return shots.map(s=>s.at===undefined?0:(s.at-first)*scale);
}
/** A short moving trail, never a persistent muzzle-to-target beam. */
export function tracerSegment(distance:number,age:number,shell:boolean) {
  if(distance<=0||age<0)return undefined;
  const duration=shell?cityShellFlightSeconds(distance):Math.max(.06,distance/120);
  if(age>=duration)return undefined;
  const head=Math.min(distance, distance*age/duration);
  return {tail:Math.max(0,head-(shell?2.2:.65))/distance,head:head/distance};
}

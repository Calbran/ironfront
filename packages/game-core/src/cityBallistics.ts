/** Provisional real-time tuning for the isolated city skirmish. */
export const CITY_TANK_RELOAD_SECONDS = 5;
export const cityShellFlightSeconds = (distance:number) => Math.max(.06, distance / 150);
export const CITY_CRATER_LIMIT = 64;
export const CITY_CRATER_SECONDS = 90;

/** Fixed explosive payload: tank health does not weaken a shell already fired. */
export const CITY_SHELL_DAMAGE = 120;
export function cityShellImpact(x:number,z:number,hit:boolean,seed:number) {
  if(hit)return {x,z};
  // A failed accuracy roll is a real off-target impact, never a zero-damage direct hit.
  let h=Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b)>>>0; h^=h>>>16;
  const angle=(h>>>0)/4294967296*Math.PI*2;
  const radius=3.5+((h>>>8)&255)/255*1.5;
  return {x:x+Math.cos(angle)*radius,z:z+Math.sin(angle)*radius};
}

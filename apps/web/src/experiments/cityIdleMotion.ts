/** Small, deterministic idle offsets; blend away as movement starts. */
export function cityIdleMotion(time:number,id:number,speed:number,moving:boolean,aiming:boolean,cover:string) {
  const weight=moving||aiming||cover!=='none'?0:Math.max(0,1-speed/.1);
  const phase=time*(1.45+(id%3)*.08)+id*2.399;
  return {breath:Math.sin(phase)*.006*weight,sway:Math.sin(time*.55+id*1.7)*.009*weight};
}

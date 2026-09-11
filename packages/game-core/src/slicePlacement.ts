import {previewTacticalOrder} from "./tacticalPlacement";
import {coverAtObstacles,type CityObstacle} from "./cityTactics";
import type {SliceState,SlicePlan,SlicePoint,createSliceNavigation} from "./countrySlice";
export function previewSlicePlacement(plan:SlicePlan,nav:Pick<ReturnType<typeof createSliceNavigation>,"walkable">,state:SliceState,ids:number[],p:SlicePoint,facing?:number){
  const all=state.units.flatMap(u=>u.members??[u]).filter(u=>u.kind!=="airship");
  const selected=state.units.filter(u=>ids.includes(u.id)).flatMap(u=>u.members??[u]).filter(u=>u.health!==0).map(u=>u.id);
  const units=all.map(u=>({...u,kind:(u.kind==="tank"?"vehicle":"infantry") as "vehicle"|"infantry",health:u.health??100,cover:"none" as const,moving:!!u.path.length,guide:u.guide??[],speed:0,leftTrack:0,rightTrack:0}));
  const vehicles:CityObstacle[]=all.filter(u=>u.kind==="tank"&&u.health!==0&&!u.enemy).map(u=>({id:`vehicle:${u.id}`,x:u.x,z:u.z,width:3.1*.55,depth:5.9*.55,angle:u.angle,kind:"vehicle",coverLevel:"full"}));
  return previewTacticalOrder(p,facing,units,selected,{
    obstacles:plan.obstacles,
    walkable:(q,kind)=>nav.walkable(q,kind==="vehicle"?"tank":"infantry"),
    coverAt:(q,threat,dynamic=[])=>coverAtObstacles(q,threat,[...plan.obstacles,...dynamic]),
  },vehicles);
}

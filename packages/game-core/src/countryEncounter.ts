import { advanceSlice, ensureSliceSquads, syncSliceSquads, type SliceState, type SliceUnit, type SlicePlan, type createSliceNavigation } from "./countrySlice";
import { coverReactionPosition } from "./cityCoverReaction";
import { coverAtObstacles } from "./cityTactics";
import {CITY_INFANTRY_FIRE_RANGE,CITY_VEHICLE_FIRE_RANGE,CITY_VOLLEY_STEP} from "./cityCombatRules";
import {CITY_TANK_RELOAD_SECONDS,CITY_SHELL_DAMAGE,cityShellFlightSeconds,cityShellImpact} from "./cityBallistics";
import {countryLandscapeSamples} from "./countryLandscape";
import { terrainHeight } from "./connectedTerrain";
import { FireVisibility, fireVolley, weaponEffectiveness } from "./squadFire";
import type { Squad } from "./tactics";

export type SliceEncounter = {
  elapsed: number; remainder: number; stage: "bridge" | "outpost" | "victory" | "defeat";
  progress: number; bridge: {x:number;z:number}; outpost: {x:number;z:number};
  shots: {id:number;from:number;to:number;x:number;z:number;tx:number;tz:number;at:number;shell:boolean}[];
  sequence: number;
  pending?: {due:number;x:number;z:number;enemy:boolean;antiTank:boolean}[];
};
export const sliceSurvivors = (u: SliceUnit) => u.members ? u.members.filter(m=>m.health!==0).length : u.kind === "infantry" ? Math.ceil((u.health ?? 100) * 6 / 100) : Number((u.health ?? 100)>0);
const squad = (u: SliceUnit): Squad => ({
  id:String(u.id),army:null,owner:u.enemy?1:0,region:0,
  kind:u.antiTank?"artillery":u.kind==="tank"?"armor":"infantry",
  unitCount:1,
  strength:u.health??100,capacity:100,morale:1,suppression:u.suppression??0,
  x:u.x,y:u.z,previousX:u.x,previousY:u.z,action:"holding",target:null,fire:0,fireMemory:u.fireMemory,
});
export function encounterSight(plan: SlicePlan) {
  const trees=plan.rivers?countryLandscapeSamples(plan).trees:[];
  const sight = new FireVisibility([
    ...plan.obstacles.map(o=>({id:o.id,exposure:o.kind==="building"?0:o.kind==="garden"?1:.55,
    polygon:[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>({x:o.x+x*o.width/2*Math.cos(o.angle)+z*o.depth/2*Math.sin(o.angle),y:o.z-x*o.width/2*Math.sin(o.angle)+z*o.depth/2*Math.cos(o.angle)}))})),
    ...trees.map((p,i)=>({id:`grove:${i}`,exposure:.65,polygon:[{x:p.x-1,y:p.z-1},{x:p.x+1,y:p.z-1},{x:p.x+1,y:p.z+1},{x:p.x-1,y:p.z+1}]})),
  ],24);
  return (a:SliceUnit,b:SliceUnit) => {
    const ah=terrainHeight(plan.surface,a.x,a.z)+1.2,bh=terrainHeight(plan.surface,b.x,b.z)+1.2;
    const length=Math.hypot(b.x-a.x,b.z-a.z);
    for(let d=2;d<length-2;d+=2){const t=d/length;
      if(terrainHeight(plan.surface,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t)>ah+(bh-ah)*t) return 0;
    }
    return sight.exposure(squad(a),squad(b)) * coverAtObstacles(b,a,plan.obstacles).damageScale;
  };
}
export function startEncounter(state:SliceState,plan:SlicePlan,nav:ReturnType<typeof createSliceNavigation>) {
  const b=plan.roads.bridges[0],site=plan.sites.find(s=>s.id==="outpost")??plan.sites.at(-1)!;
  if(!b)throw Error("Encounter needs a bridge");
  const bridge={x:b.x,z:b.y},outpost={x:site.x,z:site.z};
  const sign=((outpost.x-b.x)*Math.cos(b.angle)+(outpost.z-b.y)*Math.sin(b.angle))>=0?1:-1;
  const locate=(x:number,z:number,kind:SliceUnit["kind"])=>{
    for(let r=0;r<60;r+=2)for(let i=0;i<16;i++){
      const p={x:x+Math.cos(i*Math.PI/8)*r,z:z+Math.sin(i*Math.PI/8)*r};
      if(nav.walkable(p,kind))return p;
    }throw Error("No safe deployment position");
  };
  const units:SliceUnit[]=[];
  for(let id=1;id<=8;id++){
    const enemy=id>4,kind=id===3||id===8?"tank":id===4?"airship":"infantry";
    const target=id>6?outpost:bridge;
    const offset=enemy?24:-75;
    const p=locate(target.x+Math.cos(b.angle)*offset*sign+(id%2)*4,target.z+Math.sin(b.angle)*offset*sign+Math.floor((id-1)%4/2)*4,kind);
    units.push({...p,id,name:id===2?"AT squad":enemy?`Defender squad ${id-4}`:id===3?"Landship":id===4?"Scout airship":"1st Rifles",kind,enemy,antiTank:id===2||id===7,health:100,suppression:0,angle:0,distance:0,path:[],guide:[],cover:false});
  }
  state.units=units;
  ensureSliceSquads(state);
  for(const group of state.units)for(const m of group.members??[])Object.assign(m,locate(m.x,m.z,m.kind));
  state.encounter={elapsed:0,remainder:0,stage:"bridge",progress:0,bridge,outpost,shots:[],sequence:0};
  state.running=false;state.revision++;
}
/** Fixed-step authority. All randomness lives in saved fireMemory, never client frames. */
export function advanceEncounter(state:SliceState,now:number,exposure:(a:SliceUnit,b:SliceUnit)=>number,plan?:SlicePlan,nav?:ReturnType<typeof createSliceNavigation>){
  const e=state.encounter;
  if(!e){advanceSlice(state,now);return;}
  const end=Math.max(state.time,now);
  if(!state.running||e.stage==="victory"||e.stage==="defeat"){state.time=end;return;}
  e.remainder+=(end-state.time)/1000*state.pace;
  state.time=end;
  // A review encounter has a ten-minute simulated deadline, bounding offline work.
  while(e.remainder>=CITY_VOLLEY_STEP&&e.elapsed<600&&e.stage!=="victory"&&e.stage!=="defeat"){
    e.remainder-=CITY_VOLLEY_STEP;e.elapsed+=CITY_VOLLEY_STEP;
    const clock=state.time,pace=state.pace;state.pace=1;
    advanceSlice(state,clock+250);state.time=clock;state.pace=pace;
    const alive=state.units.flatMap(u=>u.members??[u]).filter(u=>(u.health??100)>0&&u.kind!=="airship");
    const damage=new Map<number,number>();
    e.pending??=[];
    for(const impact of e.pending.filter(p=>p.due<=e.elapsed))for(const u of alive){
      const d=Math.hypot(u.x-impact.x,u.z-impact.z);
      if(!!u.enemy!==impact.enemy&&d<3)damage.set(u.id,(damage.get(u.id)??0)+CITY_SHELL_DAMAGE*(1-d/4)*weaponEffectiveness(impact.antiTank?"artillery":"armor",squad(u).kind)*exposure({...u,id:-1,x:impact.x,z:impact.z},u));
    }
    e.pending=e.pending.filter(p=>p.due>e.elapsed);
    for(const u of alive){
      u.suppression=Math.max(0,(u.suppression??0)-.015);
      const range=u.kind==="tank"||u.antiTank?CITY_VEHICLE_FIRE_RANGE:CITY_INFANTRY_FIRE_RANGE;
      const target=alive.filter(v=>!!v.enemy!==!!u.enemy&&Math.hypot(v.x-u.x,v.z-u.z)<=range&&exposure(u,v)>0)
        .sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
      u.firing=!!target;
      if(!target)continue;
      if(plan&&nav&&u.kind==="infantry"&&u.stance!=="hold"&&!u.path.length){
        const memory=u.reaction??={anchor:{x:u.x,z:u.z},next:e.elapsed+(u.id%7)*.3,health:u.health??100};
        if(e.elapsed>=memory.next){
          memory.next=e.elapsed+3.5+(u.id%5)*.3;
          if((u.health??100)<memory.health-.01||memory.target!==target.id){
            const p=coverReactionPosition(u,memory.anchor,plan.obstacles,alive.filter(v=>v!==u).map(v=>v.path.at(-1)??v),
              p=>coverAtObstacles(p,target,plan.obstacles).damageScale,p=>nav.walkable(p,"infantry"),(a,b)=>nav.clear(a,b,"infantry"));
            if(p){u.path=[p];u.guide=[{x:u.x,z:u.z},p];u.cover=true;}
          }
          memory.health=u.health??100;memory.target=target.id;
        }
      }
      const aim=Math.atan2(target.x-u.x,target.z-u.z);
      if(u.kind==="tank"){
        const current=u.turretAngle??u.angle,error=Math.atan2(Math.sin(aim-current),Math.cos(aim-current));
        u.turretAngle=current+Math.max(-.375,Math.min(.375,error));
        if(Math.abs(error)>.12||e.elapsed<(u.nextShell??0))continue;
      }else if(!u.path.length)u.angle=aim;
      const attacker=squad(u),defender=squad(target);
      const shell=u.kind==="tank"||!!u.antiTank;
      if(shell&&e.elapsed<(u.nextShell??0))continue;
      if(shell&&attacker.fireMemory)attacker.fireMemory.reload=0;
      const shot=fireVolley(attacker,defender,Math.hypot(target.x-u.x,target.z-u.z),range,exposure(u,target)*(u.path.length?.65:1),4);
      u.fireMemory=attacker.fireMemory;
      if(!shot.fired)continue;
      const impact=shell?cityShellImpact(target.x,target.z,shot.rawDamage>0,e.sequence+1+u.id*7919):target;
      if(shell){u.nextShell=e.elapsed+CITY_TANK_RELOAD_SECONDS;e.pending.push({due:e.elapsed+cityShellFlightSeconds(Math.hypot(impact.x-u.x,impact.z-u.z)),x:impact.x,z:impact.z,enemy:!!u.enemy,antiTank:!!u.antiTank});}
      else damage.set(target.id,(damage.get(target.id)??0)+shot.damage);
      target.suppression=Math.min(1,(target.suppression??0)+shot.suppression*4);
      e.shots.push({id:++e.sequence,from:u.id,to:target.id,x:u.x,z:u.z,tx:impact.x,tz:impact.z,at:e.elapsed,shell});
    }
    for(const u of alive){u.health=Math.max(0,(u.health??100)-(damage.get(u.id)??0));if(!u.health){u.path=[];u.guide=[];u.cover=false;}}
    syncSliceSquads(state);
    e.shots=e.shots.filter(s=>e.elapsed-s.at<2).slice(-32);
    const goal=e.stage==="bridge"?e.bridge:e.outpost;
    const near=(u:SliceUnit,r:number)=>Math.hypot(u.x-goal.x,u.z-goal.z)<r;
    const survivors=alive.filter(u=>(u.health??0)>0);
    if(survivors.some(u=>!u.enemy&&u.kind==="infantry"&&near(u,14))&&!survivors.some(u=>u.enemy&&near(u,35)))e.progress+=.25;
    else e.progress=0;
    if(e.progress>=10){e.stage=e.stage==="bridge"?"outpost":"victory";e.progress=0;}
    if(!survivors.some(u=>!u.enemy&&u.kind==="infantry")||e.elapsed>=600)e.stage="defeat";
  }
  if(e.stage==="victory"||e.stage==="defeat"){state.running=false;e.remainder=0;}
}

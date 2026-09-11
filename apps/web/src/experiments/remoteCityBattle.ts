import {blendAngle} from "./battlePresentation";
import {
  battleTrial,
  type createCityBattle,
} from "../../../../packages/game-core/src/cityBattle";
import type { createCityTactics } from "../../../../packages/game-core/src/cityTactics";
import type { TerrainProfile } from "../../../../packages/game-core/src/combinedDistrict";
type State = ReturnType<ReturnType<typeof createCityBattle>["playerState"]>;
export function remoteCityBattle(
  tactics: ReturnType<typeof createCityTactics>,
  config: { seed: number; profile: TerrainProfile; multipleBattles?: boolean },
) {
  const local = battleTrial(tactics, config.multipleBattles);
  for (const u of local.units) if (!u.friendly) { u.visible=false; u.health=0; u.x=0; u.z=0; }
  let key = "",
    disposed = false,
    busy = false,
    message = "Connecting battle server…",
    snapshot: State | undefined;
  let chain = Promise.resolve();
  const fields=['x','z','angle','distance','speed','leftTrack','rightTrack'] as const;
  const poses=new Map<number,{from:State['units'][number];to:State['units'][number];elapsed:number}>();
  function apply(s: State) {
    if(snapshot && s.time < snapshot.time)return;
    if(JSON.stringify(snapshot?.sandbags)!==JSON.stringify(s.sandbags))tactics.setSandbags(s.sandbags);
    snapshot = s;
    message = s.message;
    const present = new Set(s.units.map(u=>u.id));
    for (const u of local.units) if (!u.friendly && !present.has(u.id)) {
      u.visible=false; u.health=0; u.path=[]; u.guide=[]; u.firing=false; poses.delete(u.id);
    }
    for (const u of s.units) {
      const target = local.units.find((v) => v.id === u.id);
      if(target){
        const from={...target};Object.assign(target,u); target.visible=true;
        if(poses.has(u.id))for(const field of fields)target[field]=from[field];
        target.turretAngle=from.turretAngle??u.turretAngle;
        poses.set(u.id,{from:poses.has(u.id)?from:{...u},to:{...u},elapsed:0});
      }
    }
  }
  async function request(path: string, method = "GET", body?: unknown) {
    const res = await fetch("/api/city-battle" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Battle server unavailable");
    return data;
  }
  const ready = request("", "POST", config)
    .then((data) => {
      key = data.key;
      if (disposed) {
        void request("", "DELETE");
        return;
      }
      apply(data.state);
    })
    .catch((e) => {
      message = String(e);
    });
  function send(action: string, extra = {}) {
    const ids = local.selectedIds();
    chain = chain
      .then(async () => {
        await ready;
        if (!key) return;
        apply(await request("/command", "POST", { action, ids, ...extra }));
      })
      .catch((e) => {
        message = String(e);
      });
    return chain;
  }
  const timer = setInterval(async () => {
    if (!key || busy || disposed) return;
    busy = true;
    try {
      apply(await request("/state"));
    } catch (e) {
      message = String(e);
    } finally {
      busy = false;
    }
  }, 150);
  const onPageHide=()=>{if(key)void fetch('/api/city-battle',{method:'DELETE',headers:{Authorization:'Bearer '+key},keepalive:true});};
  window.addEventListener('pagehide',onPageHide);
  return {
    ...local,
    tick(dt: number) {
      for(const u of local.units){const pose=poses.get(u.id);if(!pose)continue;
        pose.elapsed=Math.min(.15,pose.elapsed+Math.max(0,dt));const t=pose.elapsed/.15;
        if(pose.to.turretAngle!==undefined)u.turretAngle=blendAngle(pose.from.turretAngle??pose.to.turretAngle,pose.to.turretAngle,t);
        for(const field of fields)u[field]=field==='angle'?blendAngle(pose.from.angle,pose.to.angle,t):pose.from[field]+(pose.to[field]-pose.from[field])*t;
      }
    },
    selectMany(ids: number[], add = false) {
      local.selectMany(
        ids.filter((id) =>
          local.units.some((u) => u.id === id && u.friendly && u.health > 0),
        ),
        add,
      );
    },
    select(id?: number) {
      local.selectMany(
        id === undefined
          ? []
          : local.units
              .filter((u) => u.id === id && u.friendly && u.health > 0)
              .map((u) => u.id),
      );
    },
    order(p: { x: number; z: number }, facing?: number) {
      send("move", {...p,facing});
      return true;
    },
    stop() {
      send("hold");
    },
    attack(id: number) {
      send("attack", { target: id });
    },
    buildSandbags(p:{x:number;z:number;angle:number}) {return send("build-sandbags",{x:p.x,z:p.z,facing:p.angle}).then(()=>message);},
    removeSandbags(id:number) {return send("remove-sandbags",{target:id}).then(()=>message);},
    toggle() {
      send("run");
    },
    testFire(_exposed = false) {},
    resetHealth() {
      location.reload();
    },
    state: () => ({
      ...local.state(),
      units: local.state().units.filter(u=>u.visible!==false),
      message,
      running: snapshot?.running ?? false,
      shots: snapshot?.shots ?? [],
      sounds:snapshot?.sounds ?? [],
      contacts: snapshot?.contacts ?? [],
      sandbags: snapshot?.sandbags ?? [],
    }),
    dispose() {
      disposed = true;
      window.removeEventListener("pagehide",onPageHide);
      clearInterval(timer);
      if (key) void request("", "DELETE").catch(() => {});
    },
  };
}

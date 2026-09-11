import {
  battleTrial,
  type createCityBattle,
} from "../../../../packages/game-core/src/cityBattle";
import type { createCityTactics } from "../../../../packages/game-core/src/cityTactics";
import type { TerrainProfile } from "../../../../packages/game-core/src/combinedDistrict";
type State = ReturnType<ReturnType<typeof createCityBattle>["state"]>;
export function remoteCityBattle(
  tactics: ReturnType<typeof createCityTactics>,
  config: { seed: number; profile: TerrainProfile },
) {
  const local = battleTrial(tactics);
  let key = "",
    disposed = false,
    busy = false,
    message = "Connecting battle server…",
    snapshot: State | undefined;
  let chain = Promise.resolve();
  function apply(s: State) {
    snapshot = s;
    message = s.message;
    for (const u of s.units) {
      const target = local.units.find((v) => v.id === u.id);
      if (target) Object.assign(target, u);
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
    tick(_dt: number) {},
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
    order(p: { x: number; z: number }, _facing?: number) {
      send("move", p);
      return true;
    },
    stop() {
      send("stop");
    },
    attack(id: number) {
      send("attack", { target: id });
    },
    toggle() {
      send("run");
    },
    testFire(_exposed = false) {},
    resetHealth() {
      location.reload();
    },
    state: () => ({
      ...local.state(),
      message,
      running: snapshot?.running ?? false,
      shots: snapshot?.shots ?? [],
    }),
    dispose() {
      disposed = true;
      window.removeEventListener("pagehide",onPageHide);
      clearInterval(timer);
      if (key) void request("", "DELETE").catch(() => {});
    },
  };
}

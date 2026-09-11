import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  SlicePlan,
  SliceState,
  SlicePoint,
} from "../../../../packages/game-core/src/countrySlice";
import { countrySliceScene } from "./countrySliceScene";
import "./countrySlicePreview.css";
function App() {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<ReturnType<typeof countrySliceScene> | undefined>(undefined),
    selected = useRef([1]),
    latest = useRef<SliceState | undefined>(undefined),
    key = useRef(""),
    queue = useRef(Promise.resolve());
  const [state, setState] = useState<SliceState>(),
    [plan, setPlan] = useState<SlicePlan>(),
    [ids, setIds] = useState([1]),
    [message, setMessage] = useState("Preparing the Meridian sector…"),
    [cover, setCover] = useState(false);
  const coverMode = useRef(false);
  const choose = (ids: number[], add = false, toggle = false) => {
    const next = add
      ? toggle
        ? selected.current
            .filter((id) => !ids.includes(id))
            .concat(ids.filter((id) => !selected.current.includes(id)))
        : [...new Set([...selected.current, ...ids])]
      : ids;
    selected.current = next;
    setIds(next);
    view.current?.select(next);
  };
  async function request(path: string, method = "GET", body?: unknown) {
    const res = await fetch("/api/country-slice" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key.current,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw Error("Server reconnecting…");
    }
    if (!res.ok) throw Error(data.error ?? "Server unavailable");
    return data;
  }
  function apply(s: SliceState, immediate = false) {
    if (
      latest.current &&
      (s.time < latest.current.time ||
        (s.time === latest.current.time &&
          s.revision < latest.current.revision))
    )
      return;
    latest.current = s;
    setState(s);
    view.current?.update(s, immediate);
  }
  function command(action: string, extra = {}) {
    const ids = [...selected.current];
    queue.current = queue.current
      .then(async () => {
        const s = await request("/command", "POST", { action, ids, ...extra });
        apply(s);
        setMessage("Order accepted");
      })
      .catch((e) => setMessage(String(e)));
  }
  function order(p: SlicePoint, append: boolean, facing?: number) {
    command(coverMode.current ? "cover" : "move", { ...p, append, facing });
    coverMode.current = false;
    setCover(false);
  }
  useEffect(() => {
    let disposed = false,
      busy = false,
      timer: ReturnType<typeof setInterval> | undefined,
      retry: ReturnType<typeof setTimeout> | undefined;
    const poll = async (immediate = false) => {
      if (disposed || busy || document.hidden || !key.current) return;
      busy = true;
      try {
        const s = await request("/state");
        if (!disposed) apply(s, immediate);
      } catch (e) {
        if (!disposed) setMessage(String(e));
      } finally {
        busy = false;
      }
    };
    const resume = () => {
      if (!document.hidden) void poll(true);
    };
    document.addEventListener("visibilitychange", resume);
    const initialize = async () => {
      try {
        key.current = localStorage.getItem("ironfront-country-slice-v1") ?? "";
        let initial: SliceState;
        if (key.current) {
          initial = await request("/state");
        } else {
          const data = await request("", "POST", {});
          key.current = data.key;
          localStorage.setItem("ironfront-country-slice-v1", key.current);
          initial = data.state;
        }
        const p = (await request("/plan")) as SlicePlan;
        p.surface.heights = new Float32Array(p.surface.heights);
        p.surface.land = new Uint8Array(p.surface.land);
        p.surface.biomes = new Uint8Array(p.surface.biomes);
        p.surface.mountainWeight = new Float32Array(p.surface.mountainWeight);
        initial = await request("/state");
        if (disposed) return;
        setPlan(p);
        view.current = countrySliceScene(
          host.current!,
          p,
          choose,
          order,
          (target, append, facing) =>
            request("/preview", "POST", {
              action: coverMode.current ? "cover" : "move",
              ids: [...selected.current],
              ...target,
              append,
              facing,
            }),
        );
        apply(initial, true);
        setMessage(
          "Drag to select · Right-drag to face · Shift queues · Middle-drag orbits · WASD pans · Q/E rotates",
        );
        timer = setInterval(() => void poll(), 750);
      } catch (e) {
        if (!disposed) {
          setMessage(String(e));
          if (key.current) retry = setTimeout(() => void initialize(), 2000);
        }
      }
    };
    void initialize();
    return () => {
      disposed = true;
      if (timer) clearInterval(timer);
      if (retry) clearTimeout(retry);
      document.removeEventListener("visibilitychange", resume);
      view.current?.dispose();
      view.current = undefined;
    };
  }, []);
  return (
    <main className="slice">
      <header>
        <strong>IRONFRONT</strong>
        <span>Meridian · Playable sector</span>
        <a href="/pacing-preview.html">Country study</a>
        <button
          disabled={!state}
          onClick={() => command("run", { running: !state?.running })}
        >
          {state?.running ? "Pause" : "Run"}
        </button>
        <label>
          Pace{" "}
          <select
            disabled={!state}
            value={state?.pace ?? 1}
            onChange={(e) => command("pace", { pace: Number(e.target.value) })}
          >
            <option value={1}>1×</option>
            <option value={20}>20× review</option>
          </select>
        </label>
        <label>
          Light{" "}
          <select
            aria-label="Lighting"
            disabled={!state || !plan}
            defaultValue="cycle"
            onChange={(e) =>
              view.current?.setLighting(
                e.target.value as "cycle" | "day" | "night",
              )
            }
          >
            <option value="cycle">Day/night · 20m</option>
            <option value="day">Day</option>
            <option value="night">Night</option>
          </select>
        </label>
      </header>
      <div className="slice-tools">
        <button onClick={() => view.current?.overview()}>Sector</button>
        <button disabled={!state || !!state.encounter} onClick={() => command("encounter")}>Deploy encounter</button>
        {plan?.sites.map((s) => (
          <button
            key={s.id}
            onClick={() => view.current?.focus(s, s.id === "city" ? 420 : 160)}
          >
            {s.name}
          </button>
        ))}
        <button
          onClick={() => {
            const b = plan?.roads.bridges[0];
            if (b) view.current?.focus({ x: b.x, z: b.y }, 90);
          }}
        >
          Bridge
        </button>
      </div>
      <div ref={host} className="slice-map" />
      <footer>
        <div className="slice-units">
          {state?.units.filter(u=>!u.enemy).map((u) => (
            <button
              key={u.id}
              disabled={u.health===0}
              aria-pressed={ids.includes(u.id)}
              onClick={(e) => choose([u.id], e.shiftKey, true)}
              onDoubleClick={() => view.current?.focusUnit(u.id)}
            >
              {u.name}
              <small>
                {u.kind==="infantry" ? `${u.members?.filter(m=>m.health!==0).length??6}/6 · ` : ""}
                {u.health===0 ? "Lost" : (u.suppression??0)>.5 ? "Suppressed · " : ""}
                {u.path.length ? "Moving" : u.cover ? "In cover" : "Holding"}
              </small>
            </button>
          ))}
        </div>
        <div className="slice-orders">
          <button
            disabled={!state || !ids.length}
            onClick={() => view.current?.focusUnit(ids[0])}
          >
            Focus squad
          </button>
          <button
            disabled={!state || !ids.length}
            onClick={() => command("hold")}
          >
            Hold
          </button>
          <button
            disabled={!state || !ids.length}
            aria-pressed={cover}
            onClick={() => {
              coverMode.current = !coverMode.current;
              setCover(coverMode.current);
              setMessage("Right-click near sandbags to take cover");
            }}
          >
            Take cover
          </button>
        </div>
        <p role="status">{message}</p>
        <small>
          {state?.encounter ? `Encounter: ${state.encounter.stage} · Hold objective 10s (${state.encounter.progress.toFixed(0)}/10) · ${Math.max(0,600-state.encounter.elapsed).toFixed(0)}s left` : "Movement review · Deploy encounter to fight for the bridge and outpost"}
          {plan?.sites.some((s) => s.poi?.source) && (
            <>
              {" "}
              ·{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
              >
                © OpenStreetMap contributors
              </a>{" "}
              ·{" "}
              <a href="/data/country-osm/painswick.json" download>
                ODbL source
              </a>
            </>
          )}
        </small>
      </footer>
    </main>
  );
}
const hot = (
  import.meta as ImportMeta & {
    hot?: { data: { root?: ReturnType<typeof createRoot> } };
  }
).hot;
const root = hot?.data.root ?? createRoot(document.getElementById("root")!);
if (hot) hot.data.root = root;
root.render(<App />);

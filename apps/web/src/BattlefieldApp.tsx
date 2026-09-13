import { tacticalRangeMeters } from "../../../packages/game-core/src/cityCombatRules";
import React, { useEffect, useRef, useState } from "react";
import type { CampaignState } from "../../../packages/game-core/src/campaignBattlefield";
import { CAMPAIGN_ROSTER } from "../../../packages/game-core/src/campaignBattlefield";
import type {
  SlicePlan,
  SlicePoint,
} from "../../../packages/game-core/src/countrySlice";
import { sliceSurvivors } from "../../../packages/game-core/src/countryEncounter";
import { countrySliceScene } from "./experiments/countrySliceScene";
import "./experiments/countrySlicePreview.css";
import "./battlefield.css";

const STORAGE = "ironfront-campaign-alpha-v1";
export default function BattlefieldApp() {
  const [key, setKey] = useState(() => localStorage.getItem(STORAGE) ?? ""),
    [state, setState] = useState<CampaignState>(),
    [plan, setPlan] = useState<SlicePlan>();
  const [message, setMessage] = useState(
      "Establish a command in the Meridian countryside.",
    ),
    [busy, setBusy] = useState(false),
    [ids, setIds] = useState([1]),
    [mode, setMode] = useState<"move" | "cover" | "build">("move");
  const [panel, setPanel] = useState<
      "territories" | "places" | "build" | "session" | null
    >(null),
    [restore, setRestore] = useState("");
  const [placeSearch, setPlaceSearch] = useState("");
  const host = useRef<HTMLDivElement>(null),
    view = useRef<ReturnType<typeof countrySliceScene>>(undefined),
    selected = useRef([1]),
    orderMode = useRef(mode),
    latest = useRef<CampaignState>(undefined),
    queue = useRef(Promise.resolve());
  orderMode.current = mode;
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    token = key,
  ) {
    const res = await fetch("/api/battlefield" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw Error("Server reconnecting. Your campaign is saved.");
    }
    if (!res.ok) throw Error(data.error ?? "Campaign unavailable");
    return data;
  }
  function choose(next: number[], add = false, toggle = false) {
    const all = add
      ? toggle
        ? selected.current
            .filter((i) => !next.includes(i))
            .concat(next.filter((i) => !selected.current.includes(i)))
        : [...new Set([...selected.current, ...next])]
      : next;
    selected.current = all;
    setIds(all);
    view.current?.select(all);
  }
  function apply(s: CampaignState, immediate = false) {
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
    view.current?.territoryLabels(s.campaign.territories);
  }
  function command(action: string, extra = {}) {
    const selectedIds = [...selected.current];
    queue.current = queue.current
      .then(async () => {
        apply(
          await request("/command", "POST", {
            action,
            ids: selectedIds,
            ...extra,
          }),
        );
        setMessage(
          action === "build"
            ? "Sandbags built. Infantry can use the cover; tanks can crush it."
            : "Order accepted.",
        );
      })
      .catch((e) => setMessage((e as Error).message));
  }
  function order(p: SlicePoint, append: boolean, facing?: number) {
    command(orderMode.current, { ...p, append, facing });
    if (orderMode.current !== "move") setMode("move");
  }
  useEffect(() => {
    if (!key) return;
    let disposed = false,
      polling = false,
      timer: ReturnType<typeof setInterval> | undefined;
    const poll = async (immediate = false) => {
      if (disposed || polling || document.hidden) return;
      polling = true;
      try {
        const s = await request("/state");
        if (!disposed) apply(s, immediate);
      } catch (e) {
        if (!disposed) setMessage((e as Error).message);
      } finally {
        polling = false;
      }
    };
    const resume = () => {
      if (!document.hidden) void poll(true);
    };
    async function load() {
      setBusy(true);
      setMessage("Loading the persistent campaign landscape…");
      try {
        await request("/state");
        const p = (await request("/plan")) as SlicePlan;
        p.surface.heights = new Float32Array(p.surface.heights);
        p.surface.land = new Uint8Array(p.surface.land);
        p.surface.biomes = new Uint8Array(p.surface.biomes);
        p.surface.mountainWeight = new Float32Array(p.surface.mountainWeight);
        const s = (await request("/state")) as CampaignState;
        if (disposed) return;
        setPlan(p);
        view.current = countrySliceScene(
          host.current!,
          p,
          choose,
          order,
          (target, append, facing) =>
            request("/preview", "POST", {
              action: orderMode.current === "cover" ? "cover" : "move",
              ids: [...selected.current],
              ...target,
              append,
              facing,
            }),
          { roster: CAMPAIGN_ROSTER, campaign: true },
        );
        apply(s, true);
        choose([1]);
        if (p.campaignMap) view.current.overview();
        else view.current.focusUnit(1);
        setMessage(
          "Drag to select · Right-click to move · Right-drag to face · Shift queues · WASD pans · Q/E rotates",
        );
        timer = setInterval(() => void poll(), 500);
        document.addEventListener("visibilitychange", resume);
      } catch (e) {
        if (!disposed) setMessage((e as Error).message);
      } finally {
        if (!disposed) setBusy(false);
      }
    }
    void load();
    return () => {
      disposed = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
      view.current?.dispose();
      view.current = undefined;
      latest.current = undefined;
    };
  }, [key]);
  async function begin() {
    setBusy(true);
    setMessage("Generating the Meridian campaign. This can take a minute…");
    try {
      const data = await request("", "POST", {});
      if (key) {
        const saved = JSON.parse(
          localStorage.getItem(STORAGE + "-archive") ?? "[]",
        ) as string[];
        if (!saved.includes(key)) saved.push(key);
        localStorage.setItem(STORAGE + "-archive", JSON.stringify(saved));
      }
      localStorage.setItem(STORAGE, data.key);
      setKey(data.key);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const own = state?.units.filter((u) => !u.enemy) ?? [];
  const territories = state?.campaign.territories ?? [],
    total = territories.reduce((n, t) => n + t.area, 0) || 1;
  const land = (side: number) =>
    Math.round(
      (territories
        .filter((t) => t.owner === side)
        .reduce((n, t) => n + t.area, 0) /
        total) *
        100,
    );
  const elapsed = state?.battlefield?.elapsed ?? 0;
  return (
    <main className="alpha">
      <header className="alpha-header">
        <strong>IRONFRONT</strong>
        <span>
          MERIDIAN CAMPAIGN <b>ALPHA 01</b>
        </span>
        <div className="alpha-status">
          {state
            ? `Day ${1 + Math.floor(elapsed / 86400)} · ${Math.floor(elapsed / 60)} minutes`
            : "A living battlefield"}
        </div>
        <button
          onClick={() => setPanel(panel === "session" ? null : "session")}
        >
          Session
        </button>
      </header>
      {key && (
        <nav className="alpha-command">
          <button onClick={() => view.current?.overview()} disabled={!plan}>
            Whole map
          </button>
          <button
            onClick={() => {
              choose(own.filter((u) => u.health !== 0).map((u) => u.id));
              view.current?.focusUnit(1);
            }}
            disabled={!state}
          >
            Our forces
          </button>
          <button
            aria-pressed={panel === "territories"}
            onClick={() =>
              setPanel(panel === "territories" ? null : "territories")
            }
          >
            Territory
          </button>
          <button
            aria-pressed={panel === "build"}
            onClick={() => setPanel(panel === "build" ? null : "build")}
          >
            Build
          </button>
          <button
            aria-pressed={panel === "places"}
            onClick={() => setPanel(panel === "places" ? null : "places")}
          >
            Places
          </button>
          <span className="alpha-score">
            <i /> Meridian {land(0)}% <i className="enemy" /> Crown {land(1)}%
          </span>
          <span>{state?.campaign.supplies ?? 0} supplies</span>
          {state && plan?.campaignMap?.version !== 3 && (
            <button disabled={busy} onClick={() => void begin()}>
              Explore the new world
            </button>
          )}
          <label>
            Light{" "}
            <select
              value={state?.lighting ?? "day"}
              disabled={!state}
              onChange={(e) =>
                command("lighting", { lighting: e.target.value })
              }
            >
              <option value="day">Day</option>
              <option value="cycle">Cycle</option>
              <option value="night">Night</option>
            </select>
          </label>
        </nav>
      )}
      <div className="slice-map alpha-map" ref={host} />
      {!key && (
        <section className="alpha-welcome">
          <div className="alpha-eyebrow">FIRST CAMPAIGN ALPHA</div>
          <h1>
            The country is
            <br />
            the battlefield.
          </h1>
          <p>
            Command the Meridian Rifles across a city, river crossings, towns,
            farms and woodland. Your squads hold their orders and fight when
            enemies come into sight.
          </p>
          <p className="alpha-muted">
            Two factions · Continuous combat · Saved by the server
          </p>
          <button className="alpha-primary" onClick={begin} disabled={busy}>
            {busy ? "Preparing campaign…" : "Establish command →"}
          </button>
          <details>
            <summary>Restore a campaign key</summary>
            <input
              aria-label="Campaign key"
              type="password"
              value={restore}
              onChange={(e) => setRestore(e.target.value)}
            />
            <button
              disabled={!/^[a-f0-9]{48}$/.test(restore)}
              onClick={() => {
                localStorage.setItem(STORAGE, restore);
                setKey(restore);
              }}
            >
              Restore
            </button>
          </details>
          <a href="/legacy.html">Archived campaign saves</a>
          <p role="status">{message}</p>
        </section>
      )}
      {key && panel && (
        <aside className="alpha-panel">
          <div className="alpha-panel-title">
            <h2>
              {panel === "build"
                ? "Field construction"
                : panel === "territories"
                  ? "Territorial control"
                  : panel === "places"
                    ? "Places"
                    : "Campaign session"}
            </h2>
            <button aria-label="Close panel" onClick={() => setPanel(null)}>
              ×
            </button>
          </div>
          {panel === "build" ? (
            <>
              <p>
                Build near your infantry. Right-click the ground to place;
                right-drag sets its facing.
              </p>
              <button
                className="alpha-build-item"
                aria-pressed={mode === "build"}
                onClick={() => {
                  setMode(mode === "build" ? "move" : "build");
                  setMessage(
                    "Right-click clear ground within 40 units of your infantry. Right-drag sets the wall angle.",
                  );
                }}
              >
                <strong>
                  Sandbags <span>10 supplies</span>
                </strong>
                <small>Physical cover · Crushable by tanks</small>
              </button>
              <p className="alpha-muted">
                Wire, trenches, warehouses and artillery are still awaiting
                campaign integration.
              </p>
            </>
          ) : panel === "places" ? (
            <>
              <label>
                Find a place{" "}
                <input
                  aria-label="Find a place"
                  value={placeSearch}
                  onChange={(e) => setPlaceSearch(e.target.value)}
                  placeholder="City, village, industry…"
                />
              </label>
              <p className="alpha-muted">
                Names reveal as you zoom. Select a place to inspect its
                surroundings.
              </p>
              {(plan?.surface.ranges ?? [])
                .filter((r) =>
                  r.name.toLowerCase().includes(placeSearch.toLowerCase()),
                )
                .map((r) => (
                  <button
                    className="alpha-territory"
                    key={r.id}
                    onClick={() => {
                      view.current?.focus(
                        { x: r.x, z: r.y },
                        Math.max(500, r.radius * 2),
                      );
                      setPanel(null);
                    }}
                  >
                    <span>
                      {r.name}
                      <small>
                        Natural landmark ·{" "}
                        {r.mountain ? "Mountain range" : "Uplands"}
                      </small>
                    </span>
                  </button>
                ))}
              {[...(plan?.sites ?? [])]
                .filter((s) =>
                  (s.name + " " + (s.rank ?? "") + " " + (s.poi?.kind ?? ""))
                    .toLowerCase()
                    .includes(placeSearch.toLowerCase()),
                )
                .sort((a, b) => b.extent - a.extent)
                .map((s) => (
                  <button
                    className="alpha-territory"
                    key={s.id}
                    onClick={() => {
                      view.current?.focus(s, Math.max(230, s.extent * 2.6));
                      setPanel(null);
                    }}
                  >
                    <span>
                      {s.name}
                      <small>
                        {s.rank ?? "Local site"} ·{" "}
                        {s.poi?.buildings.length ?? plan?.city.lots.length}{" "}
                        buildings{s.scenic ? " · Landmark" : ""}
                      </small>
                    </span>
                  </button>
                ))}
            </>
          ) : panel === "territories" ? (
            <>
              <p>
                Uncontested infantry occupy a place in 30 seconds. Each place
                controls its surrounding land. Owned land generates supplies.
              </p>
              {territories.map((t) => (
                <button
                  className="alpha-territory"
                  key={t.id}
                  onClick={() =>
                    view.current?.focus(
                      t,
                      Math.max(
                        230,
                        (plan?.sites.find((s) => s.id === t.id)?.extent ??
                          100) * 2.6,
                      ),
                    )
                  }
                >
                  <i
                    className={
                      t.owner === 1
                        ? "enemy"
                        : t.owner === null
                          ? "neutral"
                          : ""
                    }
                  />
                  <span>
                    {t.name}
                    <small>
                      {t.owner === 0
                        ? "Meridian"
                        : t.owner === 1
                          ? "Crown"
                          : "Unoccupied"}
                      {t.progress > 0
                        ? ` · ${Math.floor((t.progress / 30) * 100)}% occupying`
                        : ""}
                    </small>
                  </span>
                </button>
              ))}
            </>
          ) : (
            <>
              <p>
                The server keeps simulating while this page is closed. Your
                session key restores the same world.
              </p>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(key);
                    setMessage("Private campaign key copied.");
                  } catch {
                    setMessage(
                      "Clipboard unavailable. Use the key field below.",
                    );
                  }
                }}
              >
                Copy session key
              </button>
              <input
                aria-label="Saved campaign key"
                type="password"
                value={key}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
              />
              <button disabled={busy} onClick={() => void begin()}>
                Start full-map campaign
              </button>
              <p className="alpha-muted">
                Your current campaign key is retained on this device.
              </p>
              {(
                JSON.parse(
                  localStorage.getItem(STORAGE + "-archive") ?? "[]",
                ) as string[]
              ).map((saved, i) => (
                <button
                  key={saved}
                  onClick={() => {
                    localStorage.setItem(STORAGE, saved);
                    setKey(saved);
                  }}
                >
                  Restore saved command {i + 1}
                </button>
              ))}
              <a href="/legacy.html">Open archived campaigns</a>
              <p className="alpha-muted">
                This alpha is one commander against Crown forces. Multiplayer
                joining and reinforcements are not connected yet.
              </p>
            </>
          )}
        </aside>
      )}
      {key && plan && state && (
        <div className="alpha-minimap">
          <svg
            viewBox={`0 0 ${plan.width} ${plan.depth}`}
            aria-label="Campaign overview"
          >
            {plan.campaignMap && (
              <path
                fill="#84916a"
                d={(() => {
                  const s = plan.surface;
                  let d = "";
                  for (let z = 0; z < s.rows; z++) {
                    let start = -1;
                    for (let x = 0; x <= s.cols; x++) {
                      const land = x < s.cols && s.land[z * s.cols + x];
                      if (land && start < 0) start = x;
                      if (!land && start >= 0) {
                        d +=
                          "M" +
                          start * s.step +
                          "," +
                          z * s.step +
                          "h" +
                          (x - start) * s.step +
                          "v" +
                          s.step +
                          "h" +
                          -(x - start) * s.step +
                          "z";
                        start = -1;
                      }
                    }
                  }
                  return d;
                })()}
              />
            )}
            {plan.roads.roads.map((r) => (
              <polyline
                key={r.id}
                points={r.path.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#8b9271"
                strokeWidth={plan.campaignMap ? plan.width / 1800 : 10}
              />
            ))}
            {plan.rivers.map((r, i) => (
              <polyline
                key={i}
                points={r.map((p) => `${p.x},${p.z}`).join(" ")}
                fill="none"
                stroke="#82b7c5"
                strokeWidth={plan.campaignMap ? plan.width / 800 : 20}
              />
            ))}
            {territories.map((t) => (
              <circle
                key={t.id}
                cx={t.x}
                cy={t.z}
                r={plan.campaignMap ? plan.width / 600 : 60}
                fill={
                  t.owner === 0
                    ? "#86c9b4"
                    : t.owner === 1
                      ? "#db8d79"
                      : "#bcb59b"
                }
                onClick={() => view.current?.focus(t, 350)}
              >
                <title>{t.name}</title>
              </circle>
            ))}
            {state.units
              .filter((u) => u.health !== 0)
              .map((u) => (
                <circle
                  key={u.id}
                  cx={u.x}
                  cy={u.z}
                  r={plan.campaignMap ? plan.width / 180 : 24}
                  fill={u.enemy ? "#ff766b" : "#ffe5a6"}
                  onClick={() => {
                    if (!u.enemy) choose([u.id]);
                    view.current?.focusUnit(u.id);
                  }}
                />
              ))}
          </svg>
          <small>
            {(tacticalRangeMeters(plan.width) / 1000).toFixed(1)} ×{" "}
            {(tacticalRangeMeters(plan.depth) / 1000).toFixed(1)} km · click to
            focus
          </small>
        </div>
      )}
      {key && (
        <footer className="alpha-footer">
          <div className="alpha-roster">
            {own.map((u) => (
              <button
                key={u.id}
                disabled={u.health === 0}
                aria-pressed={ids.includes(u.id)}
                onClick={(e) => choose([u.id], e.shiftKey, true)}
                onDoubleClick={() => view.current?.focusUnit(u.id)}
              >
                <strong>{u.name}</strong>
                <small>
                  {u.kind === "infantry"
                    ? `${sliceSurvivors(u)}/6 soldiers`
                    : `${Math.ceil(u.health ?? 100)}% condition`}{" "}
                  ·{" "}
                  {u.members?.some((m) => m.firing) || u.firing
                    ? "Engaged"
                    : u.path.length
                      ? "Moving"
                      : "Holding"}
                </small>
              </button>
            ))}
          </div>
          <div className="alpha-orders">
            <button
              disabled={!ids.length || !state}
              onClick={() => {
                setMode("move");
                command("hold");
              }}
            >
              Hold position
            </button>
            <button
              disabled={!ids.length || !state}
              aria-pressed={mode === "cover"}
              onClick={() => setMode(mode === "cover" ? "move" : "cover")}
            >
              Take cover
            </button>
            {mode !== "move" && (
              <button onClick={() => setMode("move")}>Cancel {mode}</button>
            )}
          </div>
          <p role="status">
            {busy
              ? "Loading campaign…"
              : (state?.battlefield?.remainder ?? 0) > 2
                ? "Catching up the saved simulation…"
                : message}
          </p>
          <small>{state?.campaign.log.at(-1)?.text}</small>
        </footer>
      )}
    </main>
  );
}

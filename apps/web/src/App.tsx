import { useState, useEffect, useCallback, useRef } from "react";
import {
  BUILDINGS,
  FACTIONS,
  createWorld,
  ownership,
  type World,
  type Faction,
  type Command,
} from "../../../packages/game-core/src/index";
import { MapView } from "./ContinentalMap";
import { ArmyOrders } from "./ArmyOrders";
type View = { world: World; owner: number; host: boolean };
const preview = createWorld("PREVIEW", "Meridian", 6, 10000, 0);
function Mark() {
  return (
    <svg
      width="30"
      height="32"
      viewBox="0 0 30 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 4h24v14L15 28 3 18V4Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="m9 10 12 10M21 10 9 20M15 7v16"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
export function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("warfare-session") || "",
  );
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<"nation" | "orders" | "dispatches">("nation");
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedArmy, setSelectedArmy] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState("Bluehaven Union"),
    [faction, setFaction] = useState<Faction>("iron"),
    [seed, setSeed] = useState("Meridian"),
    [seats, setSeats] = useState(4),
    [pace, setPace] = useState("test"),
    [code, setCode] = useState("");
  const [copied, setCopied] = useState(""),
    [credentials, setCredentials] = useState(false),
    [restore, setRestore] = useState("");
  const lastVisit = useRef<number | null>(null);
  const request = useCallback(
    async (path: string, body?: unknown) => {
      const response = await fetch("/api/" + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(
          result.error || "The server could not complete that request.",
        );
      return result;
    },
    [token],
  );
  const refresh = useCallback(async () => {
    const result = (await request("world")) as View;
    setView(result);
    setSelected((s) => s ?? result.world.nations[result.owner].capital);
    if (lastVisit.current === null)
      lastVisit.current = Number(
        localStorage.getItem("warfare-seen-" + result.world.id) || 0,
      );
    localStorage.setItem(
      "warfare-seen-" + result.world.id,
      String(result.world.hour),
    );
  }, [request]);
  useEffect(() => {
    if (!token) return;
    let active = true;
    const read = () =>
      refresh().catch((e) => {
        if (active) setError(e.message);
      });
    void read();
    const interval = setInterval(read, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [token, refresh]);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const enter = () =>
    act(async () => {
      const r = await request(
        joining ? "join" : "campaigns",
        joining
          ? { name, faction, code }
          : { name, faction, seed, seats, pace },
      );
      localStorage.setItem("warfare-session", r.token);
      lastVisit.current = null;
      setToken(r.token);
    });
  const send = (c: Command) =>
    act(async () => {
      await request("command", c);
      await refresh();
    });
  const leave = () => {
    localStorage.removeItem("warfare-session");
    setToken("");
    setView(null);
    setSelected(null);
    setSelectedArmy(null);
    setCredentials(false);
    setError("");
    lastVisit.current = null;
  };
  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(""), 2200);
    } catch {
      setError(
        "Clipboard unavailable. Select and copy the displayed value manually.",
      );
    }
  };
  const w = view?.world,
    n = view && w?.nations[view.owner],
    army =
      view &&
      (w?.armies.find((a) => a.owner === view.owner && a.id === selectedArmy) ??
        w?.armies.find((a) => a.owner === view.owner)),
    region = w && selected !== null ? w.regions[selected] : null;
  const scores = w ? ownership(w).sort((a, b) => b.area - a.area) : [];
  const completed = !!w && w.winner !== null;
  return (
    <div className={view ? "app campaign-view" : "app"}>
      <header className="masthead">
        <a className="brand" href="/" aria-label="Ironfront home">
          <Mark />
          <span>
            IRONFRONT
            <span className="brand-detail">A continent in contention</span>
          </span>
        </a>
        <div className="header-right">
          {w ? (
            <>
              <span className="campaign-name">{w.seed} campaign</span>
              <span className="clock">
                Day {Math.min(28, Math.floor(w.hour / 24) + 1)}{" "}
                <span>/ 28</span> · {String(w.hour % 24).padStart(2, "0")}:00
              </span>
              <button
                className="quiet"
                onClick={() => {
                  setCredentials((c) => !c);
                  setPanelOpen(true);
                }}
              >
                Session
              </button>
            </>
          ) : (
            <span className="proof-label">Playable proof · 0.1</span>
          )}
        </div>
      </header>
      {error && (
        <div className="error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
      {!token ? (
        <main className="lobby">
          <section className="lobby-intro">
            <div className="intro-copy">
              <h1>
                The front moves.
                <br />
                Your plans endure.
              </h1>
              <p>
                Build a nation. Give your orders. Return to a world changed by
                the war.
              </p>
            </div>
            <MapView
              initialZoom={1}
              world={preview}
              selected={null}
              onSelect={() => {}}
            />
            <div className="lobby-foot">
              <span>Generated continent · Illustrative preview</span>
              <span>Conquest, on your time.</span>
            </div>
          </section>
          <section className="enlist">
            <div className="tabs">
              <button
                className={!joining ? "active" : ""}
                onClick={() => setJoining(false)}
              >
                New campaign
              </button>
              <button
                className={joining ? "active" : ""}
                onClick={() => setJoining(true)}
              >
                Join friends
              </button>
            </div>
            <h2>{joining ? "Take your place." : "Found your nation."}</h2>
            <p className="muted">
              {joining
                ? "Enter an invite code to take command of an open nation."
                : "A small war with room for friends. Open nations are run by simple opponents until claimed."}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void enter();
              }}
            >
              <label>
                Nation name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={26}
                  required
                />
              </label>
              <fieldset>
                <legend>Choose your faction</legend>
                {FACTIONS.map((f) => (
                  <label
                    className={
                      "faction-option " + (faction === f.id ? "chosen" : "")
                    }
                    key={f.id}
                  >
                    <input
                      type="radio"
                      name="faction"
                      value={f.id}
                      checked={faction === f.id}
                      onChange={() => setFaction(f.id)}
                    />
                    <span>
                      <strong>{f.name}</strong>
                      <small>{f.description}</small>
                      <em>{f.bonus}</em>
                    </span>
                  </label>
                ))}
              </fieldset>
              {joining ? (
                <label>
                  Campaign invite code
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                    minLength={8}
                    maxLength={8}
                    placeholder="8-character code"
                  />
                </label>
              ) : (
                <>
                  <div className="form-row">
                    <label>
                      Map seed
                      <input
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                        pattern="[a-zA-Z0-9 \-]+"
                        maxLength={32}
                        required
                      />
                    </label>
                    <label>
                      Nations
                      <select
                        value={seats}
                        onChange={(e) => setSeats(Number(e.target.value))}
                      >
                        {[2, 3, 4, 5, 6, 7, 8].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    Campaign pace
                    <select
                      value={pace}
                      onChange={(e) => setPace(e.target.value)}
                    >
                      <option value="test">
                        Test · 1 game hour every 10 seconds
                      </option>
                      <option value="normal">Normal · 28 real days</option>
                    </select>
                  </label>
                </>
              )}
              <button className="primary full" disabled={busy}>
                {busy
                  ? "Preparing campaign…"
                  : joining
                    ? "Join campaign"
                    : "Begin campaign"}
                <span aria-hidden="true">→</span>
              </button>
            </form>
            <details className="restore">
              <summary>Resume with a saved session key</summary>
              <label>
                Private session key
                <input
                  value={restore}
                  onChange={(e) => setRestore(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <button
                disabled={restore.trim().length !== 64}
                onClick={() => {
                  const key = restore.trim();
                  localStorage.setItem("warfare-session", key);
                  setToken(key);
                }}
              >
                Resume nation
              </button>
            </details>
          </section>
        </main>
      ) : !view ? (
        <main className="loading">
          <h1>Opening command…</h1>
          <p>Retrieving your campaign from the server.</p>
          <button onClick={leave}>Return to lobby</button>
        </main>
      ) : w && n ? (
        <>
          <div className="campaign-strip">
            <span>
              <span className="live-dot" />
              {completed
                ? "Campaign concluded"
                : w.tickMs === 10000
                  ? "Test pace · 1 hour / 10 seconds"
                  : "Campaign active · hourly updates"}
            </span>
            <button
              className="text-button"
              onClick={() => copy(w.id, "invite")}
            >
              {copied === "invite"
                ? "Invite code copied"
                : `Invite friends · ${w.id}`}
            </button>
          </div>
          <main className="command-room">
            <section className="theater">
              <MapView
                world={w}
                selectedArmy={army?.id ?? null}
                onSelectArmy={(id) => {
                  const chosen = w.armies.find((a) => a.id === id);
                  if (chosen) {
                    if (chosen.owner === view.owner) setSelectedArmy(id);
                    setSelected(chosen.region);
                    setTab("orders");
                    setPanelOpen(true);
                    setCredentials(false);
                  }
                }}
                selected={selected}
                onSelect={(id) => {
                  setSelected(id);
                  setTab("orders");
                  setPanelOpen(true);
                  setCredentials(false);
                }}
              />
              <div className="map-legend">
                <span>
                  <i className="legend-neutral" />
                  Neutral territory
                </span>
                <span>
                  <i className="legend-front" />
                  National boundary
                </span>
                <span>Selected army defense</span>
                <span>Scroll to zoom · Drag to pan</span>
              </div>
            </section>
            {!panelOpen && (
              <button
                className="open-command"
                onClick={() => setPanelOpen(true)}
              >
                Open command →
              </button>
            )}
            <aside
              className="orders-panel context-panel"
              hidden={!panelOpen}
              aria-label="Command information"
            >
              <button
                className="close-command"
                aria-label="Close information panel"
                onClick={() => setPanelOpen(false)}
              >
                ×
              </button>
              {credentials && (
                <section className="session-panel">
                  <h2>Your campaign session</h2>
                  <p>
                    Keep this key private. Save it to resume your nation in
                    another browser. Invite friends with the campaign code
                    instead.
                  </p>
                  <label>
                    Private session key
                    <input readOnly value={token} />
                  </label>
                  <div className="button-row">
                    <button onClick={() => copy(token, "key")}>
                      {copied === "key" ? "Copied" : "Copy private key"}
                    </button>
                    <button onClick={leave}>Return to lobby</button>
                    <button
                      className="quiet"
                      onClick={() => setCredentials(false)}
                    >
                      Close
                    </button>
                  </div>
                </section>
              )}
              <div hidden={credentials}>
                <div className="tabs">
                  <button
                    className={tab === "nation" ? "active" : ""}
                    onClick={() => setTab("nation")}
                  >
                    Nation
                  </button>
                  <button
                    className={tab === "orders" ? "active" : ""}
                    onClick={() => setTab("orders")}
                  >
                    Command
                  </button>
                  <button
                    className={tab === "dispatches" ? "active" : ""}
                    onClick={() => {
                      setTab("dispatches");
                      setPanelOpen(true);
                      setCredentials(false);
                    }}
                  >
                    Dispatches
                  </button>
                </div>
                {(!w.geography ||
                  w.regions.length > Math.max(72, w.nations.length * 24)) && (
                  <section className="legacy-map-notice">
                    <strong>
                      Earlier map · {w.regions.length} territories
                    </strong>
                    <p>
                      This saved campaign uses an earlier territory layout.
                      Create a new campaign for the revised continent. Your
                      current map will stay intact.
                    </p>
                    <button onClick={() => setCredentials(true)}>
                      Save session &amp; open lobby
                    </button>
                  </section>
                )}
                {tab === "nation" ? (
                  <section className="nation-panel">
                    <div className="campaign-overview">
                      <h2>
                        {completed
                          ? "The campaign is decided"
                          : "Continental theater"}
                      </h2>
                      <span>
                        {completed
                          ? w
                              .winner!.map((id) => w.nations[id].name)
                              .join(" & ")
                          : `${w.regions.filter((r) => r.owner === view.owner).length} regions under your flag`}
                      </span>
                    </div>

                    <div className="nation-heading">
                      <span
                        className="nation-swatch"
                        style={{ background: n.color }}
                      />
                      <h1>{n.name}</h1>
                      <p>{FACTIONS.find((f) => f.id === n.faction)?.name}</p>
                    </div>
                    <dl className="resources">
                      <div>
                        <dt>Industry</dt>
                        <dd>
                          {Math.floor(n.industry)}
                          <small>Build & repair</small>
                        </dd>
                      </div>
                      <div>
                        <dt>Fuel</dt>
                        <dd>
                          {Math.floor(n.fuel)}
                          <small>Armor & aircraft</small>
                        </dd>
                      </div>
                      <div>
                        <dt>Manpower</dt>
                        <dd>
                          {Math.floor(n.manpower)}
                          <small>Replenishment</small>
                        </dd>
                      </div>
                    </dl>
                    <section className="land-section">
                      <h2>The balance of land</h2>
                      <p className="muted">
                        Every stretch of land counts equally.
                      </p>
                      {scores.map((s) => (
                        <div className="standing" key={s.owner}>
                          <div>
                            <span>
                              <i
                                style={{ background: w.nations[s.owner].color }}
                              />
                              {w.nations[s.owner].name}
                              {s.owner === view.owner ? " · You" : ""}
                            </span>
                            <strong>{s.percent.toFixed(1)}%</strong>
                          </div>
                          <div className="land-track">
                            <span
                              style={{
                                width: s.percent + "%",
                                background: w.nations[s.owner].color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                      <p className="rule-note">
                        Hold over 50% for 48 hours to win early. Otherwise, most
                        land at day 28 wins.
                      </p>
                      {w.majority && (
                        <p className="majority">
                          {w.nations[w.majority.owner].name}: {w.majority.hours}
                          /48 majority hours
                        </p>
                      )}
                    </section>
                    <div className="host-tools">
                      {view.host && w.tickMs === 10000 && (
                        <button
                          disabled={busy || completed}
                          onClick={() =>
                            act(async () => {
                              await request("advance", {});
                              await refresh();
                            })
                          }
                        >
                          Advance 1 hour
                        </button>
                      )}
                      <span>Orders persist while you’re away.</span>
                    </div>
                  </section>
                ) : tab === "dispatches" ? (
                  <section className="dispatch-list">
                    <h2>Your field report</h2>
                    <p className="muted">
                      {w.hour > (lastVisit.current ?? 0)
                        ? `${w.hour - (lastVisit.current ?? 0)} campaign hours since your previous visit.`
                        : "Orders and developments will appear here."}
                    </p>
                    {[...w.events].reverse().map((e) => (
                      <button
                        key={e.id}
                        onClick={() => {
                          if (e.region !== null) {
                            setSelected(e.region);
                            setTab("orders");
                          }
                        }}
                      >
                        <time>
                          Day {Math.floor(e.hour / 24) + 1} · {e.hour % 24}:00
                        </time>
                        <p>{e.text}</p>
                      </button>
                    ))}
                  </section>
                ) : (
                  <>
                    <label className="region-select">
                      Inspect region
                      <select
                        value={selected ?? ""}
                        onChange={(e) => setSelected(Number(e.target.value))}
                      >
                        {w.regions.map((r) => (
                          <option value={r.id} key={r.id}>
                            {r.name}
                            {r.owner === view.owner ? " · Yours" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    {region && (
                      <section className="region-info">
                        <h2>{region.name}</h2>
                        {region.province !== undefined && (
                          <p className="muted">
                            {w.geography?.provinces[region.province]?.name}
                          </p>
                        )}
                        {region.terrain === "mountains" && (
                          <p className="rule-note">
                            Impassable mountains. Cannot be occupied or
                            captured; excluded from land standings.
                          </p>
                        )}
                        <p className="region-owner">
                          <i
                            style={{
                              background:
                                region.owner === null
                                  ? "#9ca696"
                                  : w.nations[region.owner].color,
                            }}
                          />
                          {region.owner === null
                            ? "Neutral territory"
                            : w.nations[region.owner].name}
                        </p>
                        <dl className="region-facts">
                          <div>
                            <dt>Terrain</dt>
                            <dd>{region.terrain}</dd>
                          </div>
                          <div>
                            <dt>Garrison</dt>
                            <dd>{Math.round(region.garrison)}</dd>
                          </div>
                        </dl>
                        {region.consolidation > 0 && (
                          <p className="building-status">
                            Consolidating
                            <span>{region.consolidation}h remaining</span>
                          </p>
                        )}
                        {region.building && (
                          <p className="building-status">
                            {BUILDINGS[region.building].name}
                            <span>Operational</span>
                          </p>
                        )}
                        {region.construction && (
                          <p className="building-status">
                            {BUILDINGS[region.construction.kind].name}
                            <span>
                              {region.construction.remaining}h remaining
                            </span>
                          </p>
                        )}
                        {region.owner === view.owner &&
                          !region.building &&
                          !region.construction && (
                            <>
                              <h3>Develop this region</h3>
                              <div className="build-options">
                                {(
                                  Object.keys(
                                    BUILDINGS,
                                  ) as (keyof typeof BUILDINGS)[]
                                ).map((k) => (
                                  <button
                                    key={k}
                                    disabled={
                                      busy ||
                                      completed ||
                                      n.industry < BUILDINGS[k].cost
                                    }
                                    onClick={() =>
                                      send({
                                        type: "build",
                                        region: region.id,
                                        building: k,
                                      })
                                    }
                                  >
                                    <span>
                                      <strong>{BUILDINGS[k].name}</strong>
                                      <small>{BUILDINGS[k].effect}</small>
                                    </span>
                                    <span>
                                      {BUILDINGS[k].cost}
                                      <small>{BUILDINGS[k].hours}h</small>
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                      </section>
                    )}
                    {army ? (
                      <ArmyOrders
                        world={w}
                        owner={view.owner}
                        army={army}
                        selected={selected}
                        busy={busy}
                        completed={completed}
                        send={send}
                        selectArmy={setSelectedArmy}
                      />
                    ) : (
                      <section className="army-section">
                        <h2>No field army remains</h2>
                        <p>
                          No operational army remains. Your land still counts;
                          recruitment is planned for a later build.
                        </p>
                      </section>
                    )}
                  </>
                )}
              </div>
            </aside>
          </main>
        </>
      ) : null}
      <footer className="footer">
        <span>IRONFRONT · Experimental campaign rules</span>
        <span>Cold steel. Long horizons.</span>
      </footer>
    </div>
  );
}

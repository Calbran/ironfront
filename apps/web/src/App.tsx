import { CommandDock } from "./CommandDock";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  BUILDINGS,
  formationName,
  FACTIONS,
  ownership,
  type World,
  type Faction,
  type Command,
} from "../../../packages/game-core/src/index";
import { MapView } from "./ContinentalMap";
type View = { world: World; owner: number; host: boolean };
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
  const [battleFocus, setBattleFocus] = useState<{
    region: number;
    revision: number;
  } | null>(null);
  const [selectedSettlement, setSelectedSettlement] = useState<string | null>(
    null,
  );
  const [selectedSquads, setSelectedSquads] = useState<string[]>([]);
  const [placingSquads, setPlacingSquads] = useState(false);
  const [mapResync, setMapResync] = useState(0);
  const resumePending = useRef(false);
  const readSequence = useRef(0);
  const localCommandQueue = useRef<Promise<void>>(Promise.resolve());
  const [mapArmies, setMapArmies] = useState<number[]>([]);
  const mapArmy = mapArmies[0] ?? null;
  const setMapArmy = (id: number | null) =>
    setMapArmies(id === null ? [] : [id]);
  const [selectedArmy, setSelectedArmy] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState("Bluehaven Union"),
    [faction, setFaction] = useState<Faction>("iron"),
    [seed, setSeed] = useState(() => `Map-${crypto.randomUUID().slice(0, 8)}`),
    [seats, setSeats] = useState(4),
    [pace, setPace] = useState("test"),
    [code, setCode] = useState("");
  const [preview, setPreview] = useState<World | null>(null);
  const validSeed = /^[a-zA-Z0-9 -]{1,32}$/.test(seed.trim());
  const previewPending =
    validSeed &&
    (!preview ||
      preview.seed !== seed.trim() ||
      preview.nations.length !== seats);
  useEffect(() => {
    if (token || !validSeed) return;
    let worker: Worker | undefined;
    const timer = setTimeout(() => {
      worker = new Worker(new URL("./mapPreview.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event: MessageEvent<World>) => setPreview(event.data);
      worker.onerror = () =>
        setError("Map generation failed. Generate a new map to try again.");
      worker.postMessage({ seed: seed.trim(), seats });
    }, 250);
    return () => {
      clearTimeout(timer);
      worker?.terminate();
    };
  }, [seed, seats, token, validSeed]);
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
    const sequence = ++readSequence.current;
    const result = (await request("world")) as View;
    if (sequence !== readSequence.current) return;
    setView(result);
    if (resumePending.current) {
      resumePending.current = false;
      setMapResync((value) => value + 1);
    }
    if (lastVisit.current === null)
      setSelected(result.world.nations[result.owner].capital);
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
    const resume = () => {
      if (document.hidden) return;
      resumePending.current = true;
      void read();
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    const interval = setInterval(() => {
      if (!document.hidden) void read();
    }, 3000);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
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
    setSelectedSquads([]);
    setPlacingSquads(false);
    setMapArmy(null);
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
    <div
      className={
        view
          ? `app campaign-view ${panelOpen ? "dock-open" : "dock-closed"}`
          : "app"
      }
    >
      <header className="masthead">
        <a className="brand" href="/" aria-label="Ironfront home">
          <Mark />
          <span>
            IRONFRONT
            <span className="brand-detail">A continent in contention</span>
          </span>
        </a>
        {n && (
          <dl className="hud-resources" aria-label="National resources">
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
        )}
        <div className="header-right">
          {w ? (
            <>
              <span className="campaign-name">{n?.name}</span>
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
            {preview ? (
              <MapView
                preview
                key={preview.id}
                initialZoom={1}
                world={preview}
                selected={null}
                onSelect={() => {}}
              />
            ) : (
              <div className="map-shell preview-loading" role="status">
                Surveying new terrain…
              </div>
            )}
            {preview && (
              <div className="preview-size" aria-live="polite">
                World size: {preview.geography?.width.toLocaleString()} ×{" "}
                {preview.geography?.height.toLocaleString()} ·{" "}
                {preview.nations.length} nations
              </div>
            )}
            <div className="lobby-foot">
              <span aria-live="polite">
                {previewPending || !preview
                  ? "Generating map…"
                  : `${preview.seed} · ${preview.regions.length} territories`}
              </span>
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
                  <button
                    type="button"
                    className="full"
                    disabled={busy}
                    onClick={() =>
                      setSeed(`Map-${crypto.randomUUID().slice(0, 8)}`)
                    }
                  >
                    Generate new map
                  </button>
                  <p className="muted map-preview-note">
                    Change the seed or generate a new map to explore continents.
                    Your campaign will use this preview.
                  </p>
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
              <button
                className="primary full"
                disabled={
                  busy ||
                  (!joining && (previewPending || !preview || !validSeed))
                }
              >
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
                focus={battleFocus}
                resyncKey={mapResync}
                selectedArmy={mapArmy}
                selectedArmies={mapArmies}
                selectedSquads={selectedSquads}
                placingSquads={placingSquads}
                onSelectSquad={(id, additive) => {
                  setSelectedSettlement(null);
                  const squad = w.tactics?.squads.find(
                    (s) => s.id === id && s.owner === view.owner,
                  );
                  if (!squad || squad.army === null) return;
                  setSelectedSquads((current) =>
                    additive ? [...new Set([...current, id])] : [id],
                  );
                  setMapArmy(squad.army);
                  setSelectedArmy(squad.army);
                  setSelected(squad.region);
                  setTab("orders");
                  setPanelOpen(true);
                  setCredentials(false);
                }}
                onAttackTarget={(target) => {
                  const squads = selectedSquads.length
                    ? selectedSquads
                    : (w.tactics?.squads
                        .filter(
                          (s) =>
                            s.owner === view.owner &&
                            s.strength > 0 &&
                            mapArmies.includes(s.army!),
                        )
                        .map((s) => s.id) ?? []);
                  if (completed || !squads.length) return;
                  setPlacingSquads(false);
                  localCommandQueue.current = localCommandQueue.current.then(
                    () => send({ type: "squad-attack", squads, target }),
                  );
                }}
                onCaptureSettlement={(region, feature) => {
                  const squads = selectedSquads.filter((id) =>
                    w.tactics?.squads.some(
                      (s) =>
                        s.id === id &&
                        s.owner === view.owner &&
                        s.strength > 0.5 &&
                        s.kind !== "garrison" &&
                        s.movementLayer !== "air",
                    ),
                  );
                  if (completed || !squads.length) return;
                  setPlacingSquads(false);
                  localCommandQueue.current = localCommandQueue.current.then(
                    () =>
                      send({
                        type: "capture-settlement",
                        squads,
                        region,
                        feature,
                      }),
                  );
                }}
                onLocalPoint={(x, y, append) => {
                  const squads = selectedSquads.length
                    ? selectedSquads
                    : (w.tactics?.squads
                        .filter(
                          (s) =>
                            s.owner === view.owner &&
                            s.strength > 0 &&
                            mapArmies.includes(s.army!),
                        )
                        .map((s) => s.id) ?? []);
                  if (completed || !squads.length) return;
                  setPlacingSquads(false);
                  localCommandQueue.current = localCommandQueue.current.then(
                    () =>
                      send({
                        type: "squad-order",
                        squads,
                        mode: "move",
                        points: [{ x, y }],
                        append,
                      }),
                  );
                }}
                onSelectArmies={(ids, additive) => {
                  const armyIds = additive
                    ? [...new Set([...mapArmies, ...ids])]
                    : ids;
                  setSelectedSquads(
                    w.tactics?.squads
                      .filter(
                        (s) =>
                          s.owner === view.owner &&
                          s.strength > 0 &&
                          armyIds.includes(s.army!),
                      )
                      .map((s) => s.id) ?? [],
                  );
                  setPlacingSquads(false);
                  setMapArmies(armyIds);
                  if (ids.length) {
                    setSelectedArmy(ids[0]);
                    setTab("orders");
                    setPanelOpen(true);
                    setCredentials(false);
                  } else if (!additive) {
                    setSelected(null);
                    setPanelOpen(false);
                  }
                }}
                onDeselect={() => {
                  setSelectedSettlement(null);
                  setSelectedSquads([]);
                  setPlacingSquads(false);
                  setMapArmies([]);
                  setSelected(null);
                  setPanelOpen(false);
                }}
                onOrder={(id, cover) => {
                  if (busy || completed) return;
                  const units = w.armies.filter(
                    (a) =>
                      mapArmies.includes(a.id) &&
                      a.owner === view.owner &&
                      a.strength > 0,
                  );
                  if (!units.length) {
                    setError(
                      "Select one of your armies before giving a right-click order.",
                    );
                    return;
                  }
                  const target = w.regions[id];
                  if (target.terrain === "mountains") {
                    setError(
                      "Mountains are impassable. Choose a land territory.",
                    );
                    return;
                  }
                  void act(async () => {
                    const failures: string[] = [];
                    for (const unit of units) {
                      const order =
                        id === unit.region
                          ? "hold"
                          : target.owner === view.owner
                            ? "redeploy"
                            : "advance";
                      try {
                        await request(
                          "command",
                          cover
                            ? {
                                type: "cover",
                                army: unit.id,
                                region: id,
                                feature: cover,
                              }
                            : {
                                type: "order",
                                army: unit.id,
                                order,
                                ...(order === "hold" ? {} : { target: id }),
                              },
                        );
                      } catch (error) {
                        failures.push(
                          `${unit.role}: ${error instanceof Error ? error.message : "Order failed"}`,
                        );
                      }
                    }
                    await refresh();
                    if (failures.length) setError(failures.join(" · "));
                  });
                }}
                onSelectArmy={(id) => {
                  setSelectedSettlement(null);
                  setSelectedSquads([]);
                  setPlacingSquads(false);
                  setMapArmy(id);
                  const chosen = w.armies.find((a) => a.id === id);
                  if (chosen) {
                    if (chosen.owner === view.owner) setSelectedArmy(id);
                    setSelected(chosen.region);
                    setTab("orders");
                    setPanelOpen(true);
                    setCredentials(false);
                  }
                }}
                selectedSettlement={selectedSettlement}
                onSelectSettlement={(id, feature) => {
                  setSelected(id);
                  setSelectedSettlement(feature);
                  setPanelOpen(true);
                  setCredentials(false);
                }}
                selected={selected}
                onSelect={(id) => {
                  setSelectedSettlement(null);
                  setSelectedSquads([]);
                  setPlacingSquads(false);
                  setMapArmy(null);
                  setSelected(id);
                  setTab("orders");
                  setPanelOpen(true);
                  setCredentials(false);
                }}
              />
              <div className="command-identity" role="status">
                <strong>You command {n.name}</strong>
                <span>{FACTIONS.find((f) => f.id === n.faction)?.name}</span>
                <span>
                  ■ Your forces · ◆ Other forces · Shaded land: out of sight
                </span>
              </div>
              <div className="map-legend">
                <span>
                  <i className="legend-neutral" />
                  Neutral territory
                </span>
                <span>
                  <i className="legend-front" />
                  National boundary
                </span>
                <span className="legend-garrison">
                  <i /> Neutral defenders
                </span>
                <span title="1: Hamlet · 2: Village · 3: Town · 4: City · 5: Metropolis">City pips: 1–5</span>
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
              {!credentials && (
                <CommandDock
                  settlement={selectedSettlement}
                  inspectSquad={(id) => {
                    const s = w.tactics?.squads.find((s) => s.id === id);
                    if (!s || s.army === null) return;
                    setSelectedSquads([id]);
                    setMapArmy(s.army);
                    setSelectedArmy(s.army);
                    setSelected(s.region);
                  }}
                  world={w}
                  owner={view.owner}
                  selected={selectedSquads}
                  groups={mapArmies}
                  region={selected}
                  picking={placingSquads}
                  choosePosition={() => {
                    if (!selectedSquads.length)
                      setSelectedSquads(
                        w.tactics?.squads
                          .filter(
                            (s) =>
                              s.owner === view.owner &&
                              s.strength > 0 &&
                              mapArmies.includes(s.army!),
                          )
                          .map((s) => s.id) ?? [],
                      );
                    setPlacingSquads((v) => !v);
                  }}
                  send={send}
                  disabled={busy || completed}
                  host={view.host}
                  advance={() =>
                    void act(async () => {
                      await request("advance", {});
                      await refresh();
                    })
                  }
                  focus={(id) => {
                    setSelected(id);
                    setMapArmies([]);
                    setSelectedSquads([]);
                    setBattleFocus({ region: id, revision: Date.now() });
                  }}
                />
              )}
            </aside>
          </main>
        </>
      ) : null}
      <footer className="footer">
        <a href="/terrain-attribution.html" target="_blank" rel="noreferrer">
          Terrain sources
        </a>
        <span>IRONFRONT · Experimental campaign rules</span>
        <span>Cold steel. Long horizons.</span>
      </footer>
    </div>
  );
}

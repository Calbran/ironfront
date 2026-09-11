import type { TerrainProfile } from "../../../../packages/game-core/src/combinedDistrict";
import {
  seedCases,
  seedCaseOptions,
  type SeedCase,
} from "../../../../packages/game-core/src/citySeedAudit";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { cityDiorama } from "./cityDiorama";
import "./referencePreview.css";
import "./cityDiorama.css";
declare global {
  interface Window {
    __cityDiorama?: ReturnType<typeof cityDiorama>;
  }
}
function App() {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<ReturnType<typeof cityDiorama>>(undefined);
  const [unitStatus, setUnitStatus] =
    useState<ReturnType<ReturnType<typeof cityDiorama>["testUnitState"]>>();
  useEffect(() => {
    const timer = window.setInterval(
      () => setUnitStatus(api.current?.testUnitState()),
      250,
    );
    return () => window.clearInterval(timer);
  }, []);
  const [tacticalResult, setTacticalResult] = useState("");
  const [streetCamera, setStreetCamera] = useState(false);
  const inspectTactics = (mover: "infantry" | "vehicle") => {
    const result = api.current?.showTactics(true, mover);
    setTacticalResult(
      result
        ? `${result.obstacles} obstacles · ${result.cover} cover candidates · ${result.routePoints ? "approach route found" : "no approach route found"}`
        : "Select the full-city study to inspect routes.",
    );
  };
  const [profile, setProfile] = useState<TerrainProfile>("normal");
  const [fullTile, setFullTile] = useState(false);
  const [combined, setCombined] = useState(false);
  const [riverThrough, setRiverThrough] = useState(false);
  const [terrainFit, setTerrainFit] = useState(false);
  const [angled, setAngled] = useState(false);
  const [seed, setSeed] = useState(731);
  const [count, setCount] = useState(160),
    [dusk, setDusk] = useState(false),
    [winter, setWinter] = useState(false),
    [shadows, setShadows] = useState(true),
    [stats, setStats] = useState<{
      fps: number;
      calls: number;
      triangles: number;
      buildings: number;
      districts?: { kind: string; buildings: number }[];
    }>(),
    [result, setResult] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!host.current) return;
    try {
      api.current = cityDiorama(host.current, setStats);
      window.__cityDiorama = api.current;
      const query = new URLSearchParams(location.search),
        requested =
          query.get("case") ??
          (location.pathname === "/" || location.pathname === "/index.html"
            ? "citywide"
            : null);
      if (requested && seedCases.includes(requested as SeedCase)) {
        const seed = Number(query.get("seed") ?? 732) >>> 0,
          o = seedCaseOptions(requested as SeedCase);
        setSeed(seed);
        setCount(o.count);
        setCombined(o.combined);
        setFullTile(o.fullTile);
        setProfile(o.profile);
        setAngled(o.combined);
        api.current.generate(
          o.count,
          seed,
          o.combined,
          false,
          false,
          o.combined,
          o.profile,
          o.fullTile,
        );
      }

      return () => {
        api.current?.dispose();
        window.__cityDiorama = undefined;
      };
    } catch (e) {
      setError(String(e));
    }
  }, []);
  useEffect(() => setTacticalResult(""), [seed, fullTile, combined, profile]);
  useEffect(
    () => api.current?.configure(winter, shadows, dusk),
    [winter, shadows, dusk],
  );
  return (
    <main className="city-study">
      <header>
        <div>
          <span>IRONFRONT · LARGE CITY SCALE STUDY</span>
          <h1>
            {fullTile && combined ? "City planner" : "Capital & countryside"}
          </h1>
        </div>
        <nav>
          <a href="/city-seeds.html">Seed gallery ↗</a> ·{" "}
          <a href="/three-preview.html">Generated world ↗</a>
        </nav>
      </header>
      <div className="reference-canvas" ref={host} />
      <aside
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button"))
            host.current
              ?.querySelector("canvas")
              ?.focus({ preventScroll: true });
        }}
        onChange={(e) => {
          const t = e.target as HTMLElement;
          if (t.matches('select,input[type="checkbox"],input[type="radio"]'))
            host.current
              ?.querySelector("canvas")
              ?.focus({ preventScroll: true });
        }}
      >
        <p>
          {fullTile && combined
            ? profile === "ocean"
              ? "Ocean port: cargo quays and bonded warehouses line the shore, with a harbor quarter connecting them to the civic city."
              : "Full city: a central civic square and commercial skyline, connected residential blocks, and waterfront industry."
            : "District city study: commercial frontages near the civic core, residential blocks beyond them, and industry along the lower quay. Select 28 for the original neighborhood."}
        </p>
        {stats?.districts?.length ? (
          <p>
            {[...new Set(stats.districts.map((d) => d.kind))]
              .map(
                (kind) =>
                  `${kind}: ${stats.districts!.filter((d) => d.kind === kind).reduce((n, d) => n + d.buildings, 0)} buildings`,
              )
              .join(" · ")}
          </p>
        ) : null}
        <div className="views">
          {fullTile && combined && profile === "ocean" && (
            <button
              onClick={() => {
                api.current?.focusHarbor();
                setStreetCamera(false);
              }}
            >
              Harbor
            </button>
          )}
          {(["overview", "neighborhood", "overhead"] as const).map((view) => (
            <button
              key={view}
              onClick={() => {
                api.current?.cameraPreset(view);
                setStreetCamera(false);
              }}
            >
              {view === "overview"
                ? "Overview / Reset"
                : view === "neighborhood"
                  ? "Neighborhood"
                  : "Overhead"}
            </button>
          ))}
          <button
            aria-pressed={!streetCamera}
            onClick={() => {
              api.current?.setStreetMode(false);
              setStreetCamera(false);
            }}
          >
            Planning view
          </button>
          <button
            aria-pressed={streetCamera}
            onClick={() => {
              api.current?.setStreetMode(true);
              setStreetCamera(true);
            }}
          >
            Street view
          </button>
          <button onClick={() => api.current?.focusAirship()}>Airship</button>
          {(
            [
              "city",
              "capital",
              "depot",
              "street",
              "industry",
              "skyline",
              "angled",
              "waterfront",
            ] as const
          ).map((v) => (
            <button key={v} onClick={() => api.current?.focus(v)}>
              {v}
            </button>
          ))}
        </div>
        <p>
          <strong>Capital building</strong>
          <br />
          Intended city capture and ownership anchor. Visual study; capture
          rules are not connected.
        </p>
        <button
          onClick={() => {
            const next = seed + 1;
            setSeed(next);
            api.current?.generate(
              count,
              next,
              angled,
              terrainFit,
              riverThrough,
              combined,
              profile,
              fullTile,
            );
          }}
        >
          Vary blocks · {seed}
        </button>
        <label>
          <input
            type="checkbox"
            checked={angled}
            onChange={(e) => {
              setCombined(false);
              setFullTile(false);
              setAngled(e.target.checked);
              setTerrainFit(false);
              setRiverThrough(false);
              api.current?.generate(count, seed, e.target.checked);
            }}
          />{" "}
          Angled streets
        </label>
        <label>
          <input
            type="checkbox"
            checked={terrainFit}
            onChange={(e) => {
              setCombined(false);
              setFullTile(false);
              setTerrainFit(e.target.checked);
              setRiverThrough(false);
              setAngled(true);
              api.current?.generate(count, seed, true, e.target.checked);
            }}
          />{" "}
          Fit to hills & river
        </label>
        <label>
          <input
            type="checkbox"
            checked={riverThrough}
            onChange={(e) => {
              setCombined(false);
              setFullTile(false);
              setRiverThrough(e.target.checked);
              setTerrainFit(false);
              setAngled(true);
              api.current?.generate(count, seed, true, false, e.target.checked);
            }}
          />{" "}
          River through district
        </label>
        <label>
          <input
            type="checkbox"
            checked={combined}
            onChange={(e) => {
              setCombined(e.target.checked);
              setAngled(true);
              setTerrainFit(false);
              setRiverThrough(false);
              api.current?.generate(
                count,
                seed,
                true,
                false,
                false,
                e.target.checked,
                profile,
                fullTile,
              );
            }}
          />{" "}
          Combined terrain & river
        </label>
        <label>
          <input
            type="checkbox"
            checked={fullTile && combined}
            onChange={(e) => {
              const enabled = e.target.checked;
              setFullTile(enabled);
              setCombined(true);
              setAngled(true);
              setTerrainFit(false);
              setRiverThrough(false);
              api.current?.generate(
                count,
                seed,
                true,
                false,
                false,
                true,
                profile,
                enabled,
              );
              api.current?.focus("city");
            }}
          />{" "}
          Full city
        </label>
        {combined && (
          <label>
            Terrain profile
            <select
              aria-label="Terrain profile"
              value={profile}
              onChange={(e) => {
                const next = e.target.value as TerrainProfile;
                setProfile(next);
                api.current?.generate(
                  count,
                  seed,
                  true,
                  false,
                  false,
                  true,
                  next,
                  fullTile,
                );
              }}
            >
              {[
                "normal",
                "tight-bend",
                "steep",
                "worldgen",
                ...(fullTile ? ["ocean"] : []),
              ].map((p) => (
                <option key={p} value={p}>
                  {p === "ocean" ? "Ocean shore / port" : p}
                </option>
              ))}
            </select>
          </label>
        )}
        {angled && (
          <p>
            Street-first district · {stats?.buildings ?? "…"} buildings fitted
            to irregular blocks. Narrow corners stay paved; larger interiors
            become gardens.
          </p>
        )}
        {fullTile && combined && (
          <fieldset>
            <legend>City battle</legend>
            <p>
              Left-drag to box-select; Shift adds soldiers. Right-click to move;
              click red enemies to attack. WASD or Alt–middle-drag pans.
              Middle-drag orbits around the floor under the cursor with limited
              tilt. Q/E rotates. Scroll down zooms in toward the cursor. Escape
              deselects.
            </p>
            <button onClick={() => api.current?.selectBattleSquad()}>
              Select infantry squad
            </button>
            <p>
              {unitStatus?.units.filter((u) => u.friendly && u.health > 0)
                .length ?? 7}{" "}
              friendly ·{" "}
              {unitStatus?.units.filter((u) => !u.friendly && u.health > 0)
                .length ?? 0}{" "}
              enemies visible
            </p>
            {[1, 2, 3, 4, 6, 7, 8].map((id) => (
              <button
                key={id}
                aria-pressed={unitStatus?.selectedIds.includes(id)}
                onClick={() => api.current?.selectTestUnit(id)}
              >
                {id === 4
                  ? "Select tank"
                  : id === 5
                    ? "Select jeep"
                    : `Select soldier ${id}`}
              </button>
            ))}
            <button
              disabled={!unitStatus?.selected}
              onClick={() => api.current?.stopTestUnit()}
            >
              Hold position
            </button>
            {unitStatus?.units
              .filter((u) => unitStatus.selectedIds.includes(u.id))
              .map((u) => (
                <p key={u.id}>
                  {u.kind === "vehicle"
                    ? u.vehicleType === "jeep"
                      ? "Jeep"
                      : "Tank"
                    : `Soldier ${u.id}`}
                  : {u.cover} cover · {Math.ceil(u.health)}/100 health
                </p>
              ))}
            <p>
              Dashed ? markers show last-known enemies and fade over 30 battle
              seconds. Selected units show an approximate sight boundary,
              clipped by buildings. Stopped infantry crouch behind low cover or
              brace against buildings. Cover protects only from fire passing
              through it.
            </p>
            <button onClick={() => api.current?.toggleBattle()}>
              {unitStatus?.running ? "Pause battle" : "Start / resume battle"}
            </button>
            <button onClick={() => location.reload()}>Reset battle</button>
            <p>
              Select cyan units; click red enemies to focus fire. Infantry may
              adjust a few steps for cover; Hold position prevents relocation.
              Right-click ground to move. Units fire automatically when in range
              with a clear shot. Start the battle to execute orders.
            </p>
            <output aria-live="polite">
              {unitStatus?.message ?? "Preparing test soldiers…"}
            </output>
            <p>
              While right-dragging: blue ghosts have no cover, gold partial
              cover, green full cover; red positions are blocked. Release to
              commit. Reachability is checked on release.
            </p>
            <p>Server-controlled skirmish; orders do not affect a campaign.</p>
          </fieldset>
        )}
        <label>
          Buildings
          <select
            aria-label="Buildings"
            value={count}
            disabled={busy || angled}
            onChange={(e) => {
              const n = Number(e.target.value);
              setCount(n);
              api.current?.generate(
                n,
                seed,
                angled,
                terrainFit,
                riverThrough,
                combined,
                profile,
                fullTile,
              );
            }}
          >
            {[28, 128, 160, 256, 512, 1024].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        {fullTile && combined && (
          <fieldset>
            <legend>Tactical geometry study</legend>
            <button onClick={() => inspectTactics("infantry")}>
              Inspect infantry routes
            </button>
            <button onClick={() => inspectTactics("vehicle")}>
              Inspect vehicle routes
            </button>
            <button
              onClick={() => {
                api.current?.showTactics(false);
                setTacticalResult("");
              }}
            >
              Hide tactical overlay
            </button>
            <p>
              Coral: obstacles · cyan: candidate cover · gold: town-hall control
              area · green: sample route.
            </p>
            <p>
              Vehicles can use roads and the paved civic plaza. Walls and
              planted beds block vehicles. This is a local movement study.
            </p>
            {tacticalResult && <output>{tacticalResult}</output>}
          </fieldset>
        )}
        <label>
          <input
            type="checkbox"
            checked={winter}
            onChange={(e) => setWinter(e.target.checked)}
          />
          Winter
        </label>
        <label>
          <input
            type="checkbox"
            checked={shadows}
            onChange={(e) => setShadows(e.target.checked)}
          />
          Sun shadows
        </label>
        <label>
          <input
            type="checkbox"
            checked={dusk}
            onChange={(e) => setDusk(e.target.checked)}
          />
          Dusk lighting
        </label>
        <p>
          Dusk lights the windows, trade signs and tram shelters, with warm
          pools of light beneath street fixtures.
        </p>
        <p>
          {fullTile
            ? "Six friendly infantry and a tank face six enemy infantry."
            : "144 infantry and two jeeps establish scale."}{" "}
          Building counts include the capital.
        </p>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              setResult(
                JSON.stringify(await api.current?.benchmark(5000), null, 2),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Measuring…" : "Measure this view"}
        </button>
        {result && (
          <pre style={{ fontSize: 10, whiteSpace: "pre-wrap" }}>{result}</pre>
        )}
        <output>
          {stats
            ? `${stats.fps} FPS · ${stats.calls} calls · ${Math.round(stats.triangles / 1000)}k triangles`
            : error || "Building the city…"}
        </output>
        {error && <p role="alert">{error}</p>}
      </aside>
      <footer>
        360° CITY CAMERA
        <span>
          Left-drag selects · right-click orders · right-drag faces ·
          middle-drag orbits a floor anchor (40–75°) · WASD / Alt–middle-drag
          pans · Q/E rotates · scroll down zooms in · buildings and units retain
          their scale across density tests
        </span>
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);

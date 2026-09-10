import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { cityDiorama } from "./cityDiorama";
import {
  auditCitySeed,
  seedCases,
  seedCaseOptions,
  type SeedCase,
} from "../../../../packages/game-core/src/citySeedAudit";
import "./citySeedGallery.css";
type Result = ReturnType<typeof auditCitySeed> & {
  overview: string;
  detail: string;
};
function App() {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<ReturnType<typeof cityDiorama>>(undefined),
    cancel = useRef(false);
  const [base, setBase] = useState(731),
    [mode, setMode] = useState<SeedCase>("citywide"),
    [results, setResults] = useState<Result[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    try {
      api.current = cityDiorama(host.current!, () => {});
      api.current.configure(false, false, false);
    } catch (e) {
      setError(String(e));
    }
    return () => {
      cancel.current = true;
      api.current?.dispose();
    };
  }, []);
  const run = async () => {
    if (!api.current) return;
    setBusy(true);
    setResults([]);
    setError("");
    cancel.current = false;
    try {
      for (let i = 0; i < 12 && !cancel.current; i++) {
        const seed = (base + i) >>> 0,
          report = auditCitySeed(seed, mode),
          o = seedCaseOptions(mode);
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
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        const overview = api.current.capture("city"),
          detail = api.current.capture(o.combined ? "waterfront" : "street");
        setResults((r) => [...r, { ...report, overview, detail }]);
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  const exportReport = () => {
    const blob = new Blob(
        [
          JSON.stringify(
            results.map(({ overview, detail, ...r }) => r),
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "city-seed-audit.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <main>
      <header>
        <h1>City seed gallery</h1>
        <a href="/city-diorama.html">Open diorama</a>
      </header>
      <p>
        Compare 12 consecutive seeds with daylight overview cameras. Geometry
        checks are separate from visual review. Generation time excludes
        rendering and auditing.
      </p>
      <section className="controls">
        <label>
          Starting seed{" "}
          <input
            type="number"
            min="0"
            max="4294967295"
            value={base}
            disabled={busy}
            onChange={(e) => setBase(Number(e.target.value))}
          />
        </label>
        <label>
          Case{" "}
          <select
            value={mode}
            disabled={busy}
            onChange={(e) => setMode(e.target.value as SeedCase)}
          >
            {seedCases.map((c) => (
              <option key={c} value={c}>
                {c === "town" ? "town (authored reference)" : c}
              </option>
            ))}
          </select>
        </label>
        <button disabled={busy} onClick={run}>
          Generate 12 seeds
        </button>
        <button
          disabled={!busy}
          onClick={() => {
            cancel.current = true;
          }}
        >
          Stop after current seed
        </button>
        <button disabled={!results.length} onClick={exportReport}>
          Export report
        </button>
      </section>
      <p role="status">
        {busy ? "Generating · " : ""}
        {results.length}/12 reviewed ·{" "}
        {results.filter((r) => r.failures.length).length} flagged
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="render-host" ref={host} />
      <section className="gallery">
        {results.map((r) => (
          <article
            key={`${r.mode}-${r.seed}`}
            className={r.failures.length ? "failed" : ""}
          >
            <h2>
              Seed {r.seed} ·{" "}
              {r.failures.length ? "Needs review" : "Checks passed"}
            </h2>
            <p>
              {r.composition}
              {r.mode === "worldgen" || r.mode === "citywide"
                ? ` · World city-${r.seed}`
                : ""}
            </p>
            <img src={r.overview} alt={`Seed ${r.seed} overview`} />
            <details>
              <summary>Street detail</summary>
              <img src={r.detail} alt={`Seed ${r.seed} street detail`} />
            </details>
            <p>
              {r.buildings} buildings · {r.rejected} rejected ·{" "}
              {r.generationMs.toFixed(1)} ms generation
            </p>
            <p>
              {r.components} road component(s) · {r.maxRelief.toFixed(2)}{" "}
              maximum relief
            </p>
            {r.failures.length > 0 && (
              <ul>
                {r.failures.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
            <a href={`/city-diorama.html?seed=${r.seed}&case=${r.mode}`}>
              Inspect this seed ↗
            </a>
          </article>
        ))}
      </section>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);

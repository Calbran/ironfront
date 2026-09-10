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
  const [count, setCount] = useState(160),
    [winter, setWinter] = useState(false),
    [shadows, setShadows] = useState(true),
    [stats, setStats] = useState<{
      fps: number;
      calls: number;
      triangles: number;
      buildings: number;
    }>(),
    [result, setResult] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!host.current) return;
    try {
      api.current = cityDiorama(host.current, setStats);
      window.__cityDiorama = api.current;
      return () => {
        api.current?.dispose();
        window.__cityDiorama = undefined;
      };
    } catch (e) {
      setError(String(e));
    }
  }, []);
  useEffect(() => api.current?.configure(winter, shadows), [winter, shadows]);
  return (
    <main className="city-study">
      <header>
        <div>
          <span>IRONFRONT · LARGE CITY SCALE STUDY</span>
          <h1>Capital & countryside</h1>
        </div>
        <a href="/three-preview.html">Generated world ↗</a>
      </header>
      <div className="reference-canvas" ref={host} />
      <aside>
        <p>
          A large-city candidate: civic square, market streets, residential
          blocks and a supply yard.
        </p>
        <div className="views">
          {(["city", "capital", "depot", "street"] as const).map((v) => (
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
        <label>
          Buildings
          <select
            aria-label="Buildings"
            value={count}
            disabled={busy}
            onChange={(e) => {
              const n = Number(e.target.value);
              setCount(n);
              api.current?.generate(n);
            }}
          >
            {[128, 160, 256, 512, 1024].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
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
        <p>
          144 infantry and two jeeps establish scale. Building counts include
          the capital.
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
        FIXED ISOMETRIC CAMERA
        <span>
          Drag to pan · scroll to zoom · buildings and units retain their scale
          across density tests
        </span>
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);

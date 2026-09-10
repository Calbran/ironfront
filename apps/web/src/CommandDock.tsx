import { generateCityLayout } from "../../../packages/game-core/src/cityLayout";
import { SelectedUnitInfo } from "./SelectedUnitInfo";
import { useEffect, useRef, useState } from "react";
import {
  BUILDINGS,
  ownership,
  type World,
  type Command,
} from "../../../packages/game-core/src/index";
import {
  SQUAD_TYPES,
  squadHealth,
} from "../../../packages/game-core/src/squadTypes";
type Sheet =
  "nation" | "dispatches" | "region" | "support" | "coordinates" | null;
export function CommandDock({
  world: w,
  settlement,
  owner,
  selected,
  groups,
  region,
  choosePosition,
  picking,
  send,
  disabled,
  host,
  advance,
  focus,
  inspectSquad,
}: {
  world: World;
  settlement?: string | null;
  owner: number;
  selected: string[];
  groups: number[];
  region: number | null;
  choosePosition: () => void;
  picking: boolean;
  send: (c: Command) => unknown;
  disabled: boolean;
  host: boolean;
  advance: () => void;
  focus: (id: number) => void;
  inspectSquad: (id: string) => void;
}) {
  const [sheet, setSheet] = useState<Sheet>(null),
    [page, setPage] = useState(0),
    [x, setX] = useState(""),
    [y, setY] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const own =
    w.tactics?.squads.filter(
      (s) =>
        s.owner === owner &&
        s.strength > 0 &&
        (selected.length ? selected.includes(s.id) : groups.includes(s.army!)),
    ) ?? [];
  const unit = own[0],
    r = region === null ? null : w.regions[region],
    n = w.nations[owner];
  const site = r?.features?.find(
    (f) => f.id === settlement && f.kind === "settlement",
  );
  const siteLayout = site && r ? generateCityLayout(w, r, site) : null;
  const health = Math.round(
    own.reduce((v, s) => v + squadHealth(s), 0) / Math.max(1, own.length),
  );
  const morale = Math.round(
    own.reduce((v, s) => v + s.morale * 100, 0) / Math.max(1, own.length),
  );
  const army = w.armies.find((a) => a.id === unit?.army);
  const open = (next: Sheet) => {
    setPage(0);
    setSheet(next);
  };
  useEffect(() => {
    if (sheet) dialog.current?.showModal();
    else dialog.current?.close();
  }, [sheet]);
  const scores = ownership(w).sort((a, b) => b.area - a.area);
  const reports = [...w.events].reverse().flatMap((e) => {
    // Long reports have explicit continuation pages, never an internal scrollbar.
    const pieces = e.text.match(/[\s\S]{1,280}/g) ?? [""];
    return pieces.map((text, i) => ({
      ...e,
      text,
      part: i + 1,
      parts: pieces.length,
    }));
  });
  const sites = r?.features ?? [];
  const buildings = Object.keys(BUILDINGS) as (keyof typeof BUILDINGS)[];
  const pageCount =
    sheet === "dispatches"
      ? Math.max(1, reports.length)
      : sheet === "nation"
        ? scores.length + 1
        : sheet === "region"
          ? 1 +
            sites.length +
            (r?.owner === owner && !r.building && !r.construction
              ? buildings.length
              : 0)
          : 1;
  const current = Math.min(page, pageCount - 1);
  const valid =
    x.trim() !== "" &&
    y.trim() !== "" &&
    Number.isFinite(+x) &&
    Number.isFinite(+y);
  const move = (append: boolean) => {
    send({
      type: "squad-order",
      squads: own.map((s) => s.id),
      mode: "move",
      points: [{ x: +x, y: +y }],
      append,
    });
    setSheet(null);
  };
  return (
    <>
      <div className="compact-command">
        {own.length > 1 && (
          <div
            className="selected-squad-cards"
            role="region"
            aria-label="Selected squads"
          >
            {own.map((s, i) => (
              <button
                key={s.id}
                className="selected-squad-card"
                onClick={() => inspectSquad(s.id)}
                aria-label={`Inspect ${SQUAD_TYPES[s.kind].name} ${i + 1}`}
              >
                <strong>
                  {s.kind === "motorized"
                    ? "Mobile infantry"
                    : SQUAD_TYPES[s.kind].name}{" "}
                  · {i + 1}
                </strong>
                <span>
                  {s.unitCount ?? "—"}{" "}
                  {s.kind === "motorized" || s.kind === "armor"
                    ? "vehicles"
                    : "soldiers"}{" "}
                  · {squadHealth(s)}% health
                </span>
                <meter
                  min={0}
                  max={100}
                  value={squadHealth(s)}
                  aria-label="Squad health"
                />
                <small>
                  {s.action === "firing"
                    ? "Engaging"
                    : s.localOrder?.attackTarget
                      ? "Attacking"
                      : s.localOrder?.path.length
                        ? `Moving${s.localOrder.movementGroup !== undefined ? " · Group pace" : ""}`
                        : "Holding"}
                </small>
              </button>
            ))}
          </div>
        )}
        <div className="current-selection" hidden={own.length > 1}>
          {site ? (
            <>
              <strong>{site.name}</strong>
              <span>
                {siteLayout?.archetype} {site.size} ·{" "}
                {r?.owner === null ? "Neutral" : w.nations[r!.owner!].name}
              </span>
              <small>
                {own.length
                  ? `${own.length} squad(s) selected · Garrison grants cover on arrival`
                  : "Select squads, then click here to garrison"}
              </small>
            </>
          ) : unit ? (
            <SelectedUnitInfo squad={unit} picking={picking} />
          ) : (
            <>
              <strong>{r ? r.name : "No selection"}</strong>
              <span>
                {r
                  ? `${r.purpose ?? r.terrain} · ${r.owner === null ? "Neutral" : w.nations[r.owner].name}`
                  : "Select a squad or territory on the map"}
              </span>
            </>
          )}
        </div>
        <div className="essential-actions">
          {site && (
            <button
              disabled={disabled || !own.length || r?.owner !== owner}
              onClick={() =>
                send({
                  type: "garrison-squads",
                  squads: own.map((s) => s.id),
                  region: r!.id,
                  feature: site.id,
                })
              }
            >
              Garrison
            </button>
          )}
          {unit ? (
            <>
              <button disabled={disabled} onClick={choosePosition}>
                {picking ? "Cancel move" : "Move"}
              </button>
              <button
                disabled={disabled}
                onClick={() =>
                  send({
                    type: "squad-order",
                    squads: own.map((s) => s.id),
                    mode: "hold",
                    points: [],
                  })
                }
              >
                Hold
              </button>
              <button onClick={() => open("support")}>Details</button>
            </>
          ) : r ? (
            <button onClick={() => open("region")}>Inspect region</button>
          ) : null}
        </div>
        <nav className="command-shortcuts" aria-label="Campaign information">
          <button onClick={() => open("nation")}>Nation</button>
          <button onClick={() => open("dispatches")}>Reports</button>
        </nav>
      </div>
      <dialog
        className="command-sheet"
        ref={dialog}
        onCancel={() => setSheet(null)}
        onClose={() => setSheet(null)}
      >
        <header>
          <h2>
            {sheet === "nation"
              ? "Nation"
              : sheet === "dispatches"
                ? "Field reports"
                : sheet === "region"
                  ? r?.name
                  : sheet === "coordinates"
                    ? "Position coordinates"
                    : "Squad details"}
          </h2>
          <button onClick={() => setSheet(null)} aria-label="Close details">
            ×
          </button>
        </header>
        <div className="sheet-content">
          {sheet === "nation" &&
            (current === 0 ? (
              <>
                <h3>{n.name}</h3>
                <p>
                  {w.regions.filter((r) => r.owner === owner).length} regions
                  under your flag.
                </p>
                <p>
                  Hold over 50% of land for 48 hours, or own the most land at
                  day 28.
                </p>
                {w.majority && (
                  <p>
                    {w.nations[w.majority.owner].name}: {w.majority.hours}/48
                    majority hours
                  </p>
                )}
                {host && w.tickMs === 10000 && (
                  <button disabled={disabled} onClick={advance}>
                    Advance 1 hour
                  </button>
                )}
              </>
            ) : (
              <>
                <h3>{w.nations[scores[current - 1].owner].name}</h3>
                <p className="sheet-stat">
                  {scores[current - 1].percent.toFixed(1)}% of land
                </p>
              </>
            ))}
          {sheet === "dispatches" &&
            (reports[current] ? (
              <>
                <p className="muted">
                  Day {Math.floor(reports[current].hour / 24) + 1} ·{" "}
                  {reports[current].hour % 24}:00{" "}
                  {reports[current].parts > 1
                    ? `· Part ${reports[current].part}/${reports[current].parts}`
                    : ""}
                </p>
                <p>{reports[current].text}</p>
                {reports[current].region !== null && (
                  <button
                    onClick={() => {
                      focus(reports[current].region!);
                      setSheet(null);
                    }}
                  >
                    Show on map
                  </button>
                )}
              </>
            ) : (
              <p>No reports yet.</p>
            ))}
          {sheet === "region" &&
            r &&
            (current === 0 ? (
              <>
                <p>
                  {r.purpose ?? r.terrain} ·{" "}
                  {r.owner === null ? "Neutral" : w.nations[r.owner].name}
                </p>
                <p>
                  Garrison:{" "}
                  {r.garrison < 0 ? "Unknown" : Math.round(r.garrison)}
                </p>
                <p>
                  {r.construction
                    ? `${BUILDINGS[r.construction.kind].name}: ${r.construction.remaining}h remaining`
                    : r.building
                      ? `${BUILDINGS[r.building].name} operational`
                      : "No development"}
                </p>
                {r.consolidation > 0 && (
                  <p>Consolidating: {r.consolidation}h</p>
                )}
              </>
            ) : current <= sites.length ? (
              <>
                <h3>{sites[current - 1].name}</h3>
                <p>{sites[current - 1].kind}</p>
              </>
            ) : (
              <>
                <h3>{BUILDINGS[buildings[current - 1 - sites.length]].name}</h3>
                <p>{BUILDINGS[buildings[current - 1 - sites.length]].effect}</p>
                <p>
                  {BUILDINGS[buildings[current - 1 - sites.length]].cost}{" "}
                  industry ·{" "}
                  {BUILDINGS[buildings[current - 1 - sites.length]].hours}h
                </p>
                <button
                  disabled={
                    disabled ||
                    n.industry <
                      BUILDINGS[buildings[current - 1 - sites.length]].cost
                  }
                  onClick={() =>
                    send({
                      type: "build",
                      region: r.id,
                      building: buildings[current - 1 - sites.length],
                    })
                  }
                >
                  Build
                </button>
              </>
            ))}
          {sheet === "support" && unit && (
            <>
              <h3>
                {own.length === 1
                  ? SQUAD_TYPES[unit.kind].name
                  : `${own.length} squads`}
              </h3>
              <p>
                {health}% health · {morale}% morale
                {own.length > 1 ? " (averages)" : ""}
              </p>
              <p>
                {worldRegionNames(
                  w,
                  own.map((s) => s.region),
                )}
              </p>
              {army && (
                <div className="support-fields">
                  <label>
                    Withdrawal risk
                    <select
                      disabled={disabled}
                      value={army.risk}
                      onChange={(e) =>
                        send({
                          type: "policy",
                          army: army.id,
                          risk: e.target.value as typeof army.risk,
                          fallback: army.fallback,
                        })
                      }
                    >
                      <option value="cautious">Cautious</option>
                      <option value="balanced">Balanced</option>
                      <option value="aggressive">Aggressive</option>
                    </select>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={army.air}
                      disabled={disabled}
                      onChange={(e) =>
                        send({
                          type: "air",
                          army: army.id,
                          enabled: e.target.checked,
                        })
                      }
                    />{" "}
                    Air support
                  </label>
                </div>
              )}
              <button onClick={() => open("coordinates")}>
                Position coordinates
              </button>
            </>
          )}
          {sheet === "coordinates" && (
            <>
              <label>
                Position X
                <input
                  type="number"
                  value={x}
                  onChange={(e) => setX(e.target.value)}
                />
              </label>
              <label>
                Position Y
                <input
                  type="number"
                  value={y}
                  onChange={(e) => setY(e.target.value)}
                />
              </label>
              <div className="button-row">
                <button
                  disabled={disabled || !valid || !own.length}
                  onClick={() => move(false)}
                >
                  Move to position
                </button>
                <button
                  disabled={disabled || !valid || !own.length}
                  onClick={() => move(true)}
                >
                  Add waypoint
                </button>
              </div>
            </>
          )}
        </div>
        {pageCount > 1 && (
          <footer className="sheet-pages">
            <button
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </button>
            <span>
              {current + 1} / {pageCount}
            </span>
            <button
              disabled={current === pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
            </button>
          </footer>
        )}
      </dialog>
    </>
  );
}
function worldRegionNames(w: World, ids: number[]) {
  const unique = [...new Set(ids)];
  return unique.length === 1
    ? w.regions[unique[0]].name
    : `Across ${unique.length} regions`;
}

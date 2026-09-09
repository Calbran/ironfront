import { useEffect, useState } from "react";
import {
  ARMY_ROLES,
  coverage,
  friendlyPath,
  offensivePath,
  reserveCapacity,
  retreatThreshold,
  supplied,
  type Army,
  type Command,
  type World,
} from "../../../packages/game-core/src/index";

export function ArmyOrders({
  world: w,
  owner,
  army,
  selected,
  busy,
  completed,
  send,
  selectArmy,
}: {
  world: World;
  owner: number;
  army: Army;
  selected: number | null;
  busy: boolean;
  completed: boolean;
  send: (c: Command) => unknown;
  selectArmy: (id: number) => void;
}) {
  const [sector, setSector] = useState(army.sector);
  const sectorKey = army.sector.join(",");
  useEffect(() => {
    setSector(army.sector);
  }, [army.id, army.region, sectorKey]);
  const region = selected === null ? null : w.regions[selected];
  const friendly = region?.owner === owner;
  const route = region
    ? friendly
      ? friendlyPath(w, army.region, region.id, owner)
      : offensivePath(w, army, region.id)
    : [];
  const covered = coverage(w, army);
  const candidates = [
    army.region,
    ...w.regions[army.region].neighbors.filter(
      (id) => w.regions[id].owner === owner,
    ),
  ];
  const unavailable = busy || completed;
  return (
    <section className="army-section">
      <label>
        Command army
        <select
          value={army.id}
          onChange={(e) => selectArmy(Number(e.target.value))}
        >
          {w.armies
            .filter((a) => a.owner === owner)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {ARMY_ROLES[a.role].name} · {Math.round(a.strength)} ·{" "}
                {w.regions[a.region].name}
              </option>
            ))}
        </select>
      </label>
      <div className="army-title">
        <h2>{ARMY_ROLES[army.role].name}</h2>
        <strong>
          {Math.round(army.strength)}
          <small>/100</small>
        </strong>
      </div>
      <p className="muted">{ARMY_ROLES[army.role].description}</p>
      <p>Headquarters: {w.regions[army.region].name}</p>
      <div className="composition" aria-label="Army composition">
        <span title="Infantry">INF {army.infantry}</span>
        <span title="Motorized infantry">MOT {army.motorized}</span>
        <span title="Artillery">ART {army.artillery}</span>
        <span title="Armor">ARM {army.tanks}</span>
      </div>
      <dl className="region-facts">
        <div>
          <dt>Supply</dt>
          <dd>{supplied(w, army) ? "Connected" : "Isolated"}</dd>
        </div>
        <div>
          <dt>Reserves</dt>
          <dd>
            {army.supplies}/{reserveCapacity(w, army)}h*
          </dd>
        </div>
        <div>
          <dt>Entrenchment</dt>
          <dd>{Math.round(army.entrenchment)}/6</dd>
        </div>
        <div>
          <dt>Defending</dt>
          <dd>
            {covered.length} region{covered.length === 1 ? "" : "s"}
          </dd>
        </div>
      </dl>
      <p className="standing-order">
        {army.order === "advance" && army.target !== null
          ? `Advancing to ${w.regions[army.target].name}`
          : army.order === "redeploy" && army.target !== null
            ? `Redeploying to ${w.regions[army.target].name}`
            : army.order === "reserve"
              ? "Reserve watching sector"
              : army.order === "recover"
                ? "Recovering strength"
                : "Holding sector"}
      </p>
      <p className="muted" role="status">
        {army.deployment > 0
          ? `Sector deployment: ${army.deployment}h remaining`
          : army.status}
      </p>
      {w.regions[army.region].consolidation > 0 && (
        <p className="rule-note">
          Consolidation: {w.regions[army.region].consolidation}h before another
          advance.
        </p>
      )}
      {army.route.length > 0 && (
        <p className="route-summary">
          Planned route:{" "}
          {army.route.map((id) => w.regions[id].name).join(" → ")}
          <br />
          {army.progress}h into the next leg.
        </p>
      )}
      <div className="button-row">
        {(["hold", "recover", "reserve"] as const).map((order) => (
          <button
            key={order}
            disabled={unavailable || army.order === order}
            onClick={() => send({ type: "order", army: army.id, order })}
          >
            {order === "hold"
              ? "Hold"
              : order === "recover"
                ? "Recover"
                : "Reserve"}
          </button>
        ))}
      </div>
      <details className="army-planning">
        <summary>Defensive sector</summary>
        <p className="muted">
          Headquarters plus up to two neighbors. Strength is divided across the
          sector. Deployment takes 4h.
        </p>
        <fieldset disabled={unavailable}>
          <legend className="sr-only">Sector regions</legend>
          {candidates.map((id) => (
            <label className="sector-option" key={id}>
              <input
                type="checkbox"
                checked={sector.includes(id)}
                disabled={
                  id === army.region ||
                  (!sector.includes(id) && sector.length >= 3)
                }
                onChange={(e) =>
                  setSector(
                    e.target.checked
                      ? [...sector, id]
                      : sector.filter((x) => x !== id),
                  )
                }
              />
              <span>
                {w.regions[id].name}
                {id === army.region ? " · HQ" : ""}
              </span>
            </label>
          ))}
        </fieldset>
        <button
          disabled={
            unavailable ||
            [...sector].sort().join() === [...army.sector].sort().join()
          }
          onClick={() =>
            send({ type: "sector", army: army.id, regions: sector })
          }
        >
          Deploy to sector
        </button>
        <p className="rule-note">
          Reserve watches this sector and travels to a threatened region
          automatically. Only Hold spreads defense across it.
        </p>
      </details>
      <details className="army-planning">
        <summary>Fallback and support</summary>
        <label>
          Risk tolerance
          <select
            value={army.risk}
            disabled={unavailable}
            onChange={(e) =>
              send({
                type: "policy",
                army: army.id,
                risk: e.target.value as Army["risk"],
                fallback: army.fallback,
              })
            }
          >
            <option value="cautious">Cautious · withdraw below 45</option>
            <option value="balanced">Balanced · withdraw below 30</option>
            <option value="aggressive">Aggressive · withdraw below 15</option>
          </select>
        </label>
        <label>
          Fallback position
          <select
            value={army.fallback ?? ""}
            disabled={unavailable}
            onChange={(e) =>
              send({
                type: "policy",
                army: army.id,
                risk: army.risk,
                fallback: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          >
            <option value="">Nearest legal neighboring region</option>
            {w.regions
              .filter(
                (r) =>
                  r.id !== army.region &&
                  friendlyPath(w, army.region, r.id, owner).length,
              )
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            {army.fallback !== null &&
              !friendlyPath(w, army.region, army.fallback, owner).length && (
                <option value={army.fallback}>Fallback cut off</option>
              )}
          </select>
        </label>
        <label className="air-toggle">
          <input
            type="checkbox"
            checked={army.air}
            disabled={unavailable}
            onChange={(e) =>
              send({ type: "air", army: army.id, enabled: e.target.checked })
            }
          />
          <span>
            Request air support<small>Fuel spent during combat</small>
          </span>
        </label>
      </details>
      <div className="objective-plan">
        <h3>{friendly ? "Plan redeployment" : "Plan offensive"}</h3>
        <p className="route-summary">
          {route.length > 1
            ? route.map((id) => w.regions[id].name).join(" → ")
            : region?.id === army.region
              ? "Select another region on the map."
              : "No legal corridor to this region. Choose another objective."}
        </p>
        <button
          className="primary full"
          disabled={unavailable || route.length < 2}
          onClick={() =>
            send({
              type: "order",
              army: army.id,
              order: friendly ? "redeploy" : "advance",
              target: selected!,
            })
          }
        >
          {friendly ? "Redeploy to" : "Advance to"} {region?.name}
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className="rule-note">
        Offensives halt below {retreatThreshold(army)} strength. *Supply
        reserves last this many isolated hours at rest; combat consumes extra.
        Values are experimental.
      </p>
    </section>
  );
}

import {
  ARMY_ROLES,
  formationName,
  reserveCapacity,
  retreatThreshold,
  supplyNetwork,
  type Army,
  type Command,
  type World,
} from "../../../packages/game-core/src/index";

export function ArmyOrders({
  world: w,
  owner,
  army,
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
  const squads =
    w.tactics?.squads.filter((s) => s.army === army.id && s.strength > 0) ?? [];
  const network = supplyNetwork(w, owner);
  const covered = [...new Set(squads.map((s) => s.region))];
  const morale =
    squads.reduce((n, s) => n + s.morale * s.strength, 0) /
    Math.max(1, army.strength);
  const firing = squads.filter((s) => s.action === "firing").length;
  const unavailable = busy || completed;
  return (
    <section className="army-section">
      <label>
        Select squad
        <select
          value={army.id}
          onChange={(e) => selectArmy(Number(e.target.value))}
        >
          {w.armies
            .filter((a) => a.owner === owner)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {formationName(a)} · {Math.round(a.strength)} ·{" "}
                {w.regions[a.region].name}
              </option>
            ))}
        </select>
      </label>
      <div className="army-title">
        <h2>{formationName(army)}</h2>
        <strong>
          {Math.round(army.strength)}
          <small>/100</small>
        </strong>
      </div>
      <p className="muted">
        {army.squadKind
          ? `${army.unitCount} assigned ${army.squadKind === "infantry" ? "soldiers" : "vehicles"}. Select squads together to issue shared orders.`
          : ARMY_ROLES[army.role].description}
      </p>
      <p>Recruitment headquarters: {w.regions[army.region].name}</p>
      {squads.length > 0 && (
        <p className="tactical-summary" aria-live="polite">
          {squads.length} squads ·{" "}
          {firing ? `${firing} exchanging fire` : "No active fire"} · Morale{" "}
          {Math.round(morale * 100)}%
        </p>
      )}
      {!army.squadKind && (
        <div className="composition" aria-label="Army composition">
          <span title="Infantry">INF {army.infantry}</span>
          <span title="Motorized infantry">MOT {army.motorized}</span>
          <span title="Artillery">ART {army.artillery}</span>
          <span title="Armor">ARM {army.tanks}</span>
        </div>
      )}
      <dl className="region-facts">
        <div>
          <dt>Supply</dt>
          <dd>
            {squads.every((s) => network.has(s.region))
              ? "Connected"
              : "Isolated"}
          </dd>
        </div>
        <div>
          <dt>Reserves</dt>
          <dd>
            {army.supplies.toFixed(1)}/{reserveCapacity(w, army)}h*
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
        {squads.some((s) => s.independent)
          ? "Following squad orders"
          : army.order === "advance" && army.target !== null
            ? `Advancing to ${w.regions[army.target].name}`
            : army.order === "redeploy" && army.target !== null
              ? `Redeploying to ${w.regions[army.target].name}`
              : army.order === "reserve"
                ? "Reserve watching sector"
                : army.order === "recover"
                  ? "Recovering strength"
                  : "Holding sector"}
      </p>
      <details className="army-planning">
        <summary>Squad withdrawal and support</summary>
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
            <option value="cautious">Cautious · withdraw below 45%</option>
            <option value="balanced">Balanced · withdraw below 30%</option>
            <option value="aggressive">Aggressive · withdraw below 15%</option>
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
      <p className="rule-note">
        Squads withdraw toward adjacent friendly land below{" "}
        {retreatThreshold(army)}% strength. *Supply reserves last this many
        isolated hours at rest; combat consumes extra. Values are experimental.
      </p>
    </section>
  );
}

import {
  SQUAD_TYPES,
  squadHealth,
} from "../../../packages/game-core/src/squadTypes";
import { useState } from "react";
import type { Command, World } from "../../../packages/game-core/src/index";
export function SquadOrders({
  world,
  owner,
  army,
  selected,
  choose,
  picking,
  setPicking,
  send,
  disabled,
}: {
  world: World;
  owner: number;
  army: number;
  selected: string[];
  choose: (ids: string[]) => void;
  picking: boolean;
  setPicking: (v: boolean) => void;
  send: (c: Command) => unknown;
  disabled: boolean;
}) {
  const squads =
    world.tactics?.squads.filter(
      (s) => s.army === army && s.owner === owner && s.strength > 0,
    ) ?? [];
  const [x, setX] = useState(""),
    [y, setY] = useState("");
  const active =
    world.tactics?.squads.filter(
      (s) => s.owner === owner && s.strength > 0 && selected.includes(s.id),
    ) ?? [];
  const health = Math.round(
    active.reduce((sum, s) => sum + squadHealth(s), 0) /
      Math.max(1, active.length),
  );
  const morale = Math.round(
    active.reduce((sum, s) => sum + s.morale * 100, 0) /
      Math.max(1, active.length),
  );
  const pointsValid =
    x.trim() !== "" &&
    y.trim() !== "" &&
    Number.isFinite(Number(x)) &&
    Number.isFinite(Number(y));
  return (
    <section className="squad-orders">
      <div className="squad-roster">
        <h3>Squads</h3>

        <button
          disabled={disabled}
          onClick={() => choose(squads.map((s) => s.id))}
        >
          Select whole group
        </button>
        {squads.map((s, i) => (
          <label
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minHeight: 44,
            }}
          >
            <input
              type="checkbox"
              checked={selected.includes(s.id)}
              onChange={(e) =>
                choose(
                  e.target.checked
                    ? [...selected, s.id]
                    : selected.filter((id) => id !== s.id),
                )
              }
            />
            <span>
              {i + 1}. {SQUAD_TYPES[s.kind].name} ·{" "}
              {s.unitCount
                ? `${s.unitCount} ${s.kind === "infantry" ? "soldiers" : "vehicles"} · `
                : ""}
              {squadHealth(s)}% health ·{" "}
              {s.localOrder?.path.length
                ? "Moving to position"
                : s.localOrder
                  ? "Holding position"
                  : s.action}
              <small style={{ display: "block" }}>
                {SQUAD_TYPES[s.kind].role}
              </small>
            </span>
          </label>
        ))}
      </div>
      <div className="squad-controls">
        {active[0] && (
          <div className="unit-readiness">
            <h3>
              {active.length > 1
                ? `${active.length} squads selected`
                : SQUAD_TYPES[active[0].kind].name}
            </h3>
            <div>
              <span>{active.length > 1 ? "Avg health" : "Health"}</span>
              <meter
                min={0}
                max={100}
                value={health}
                aria-label="Selected squad health"
              />
              <strong>{health}%</strong>
            </div>
            <div>
              <span>{active.length > 1 ? "Avg morale" : "Morale"}</span>
              <meter
                min={0}
                max={100}
                value={morale}
                aria-label="Selected squad morale"
              />
              <strong>{morale}%</strong>
            </div>
          </div>
        )}
        <div className="button-row">
          <button
            disabled={disabled || !active.length}
            onClick={() => setPicking(!picking)}
          >
            {picking ? "Cancel placement" : "Choose position on map"}
          </button>
          <button
            disabled={disabled || !active.length}
            onClick={() => {
              setPicking(false);
              send({
                type: "squad-order",
                squads: active.map((s) => s.id),
                mode: "hold",
                points: [],
              });
            }}
          >
            Hold position
          </button>
        </div>
        {picking && (
          <p role="status">Tap a land position to move. Drag to pan.</p>
        )}
        {active.length > 0 && (
          <>
            <p className="muted">
              {active.length} selected · {active[0].x.toFixed(0)},{" "}
              {active[0].y.toFixed(0)} · {world.regions[active[0].region].name}
            </p>
            <p aria-live="polite">
              {active[0].localOrder?.path.length
                ? `${active[0].localOrder.waypoints.length} waypoint(s) queued`
                : active[0].localOrder
                  ? "Holding position"
                  : "Following group orders"}
            </p>
            <details>
              <summary>Position coordinates</summary>
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
                {[false, true].map((append) => (
                  <button
                    key={String(append)}
                    disabled={disabled || !pointsValid}
                    onClick={() =>
                      send({
                        type: "squad-order",
                        squads: active.map((s) => s.id),
                        mode: "move",
                        points: [{ x: Number(x), y: Number(y) }],
                        append,
                      })
                    }
                  >
                    {append ? "Add waypoint" : "Move to position"}
                  </button>
                ))}
              </div>
            </details>
          </>
        )}
        <p className="muted control-hint">
          Right-click to move · Shift-right-click to queue
        </p>
      </div>
    </section>
  );
}

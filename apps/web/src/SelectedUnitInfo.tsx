import type { Squad } from "../../../packages/game-core/src/tactics";
import {
  SQUAD_TYPES,
  squadHealth,
} from "../../../packages/game-core/src/squadTypes";

export function SelectedUnitInfo({
  squad: s,
  picking,
}: {
  squad: Squad;
  picking: boolean;
}) {
  const vehicle = s.kind === "motorized" || s.kind === "armor";
  const health = squadHealth(s);
  const morale = Math.max(0, Math.min(100, Math.round(s.morale * 100)));
  const status = picking
    ? "Choose destination"
    : s.action === "firing"
      ? "Engaging"
      : s.localOrder?.attackTarget
        ? "Attacking"
        : s.action === "retreating"
          ? "Retreating"
          : s.localOrder?.path.length || s.action === "moving"
            ? "Moving"
            : "Holding";
  return (
    <section className="unit-summary" aria-label="Selected squad information">
      <div className="unit-portrait" aria-hidden="true">
        <svg
          viewBox="0 0 40 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {vehicle ? (
            <>
              <path d="M10 9h20v22H10zM15 6v3m10-3v3M15 31v3m10-3v3M10 15h20" />
              <path d="M16 21h8v5h-8z" />
            </>
          ) : (
            <>
              <circle cx="20" cy="11" r="5" />
              <path d="M14 34V21l-4 5m16 8V21l4 5M14 21v-3h12v3M20 25v9" />
            </>
          )}
        </svg>
      </div>
      <div className="unit-summary-body">
        <div className="unit-summary-heading">
          <strong>{SQUAD_TYPES[s.kind].name}</strong>
          <span className={`unit-status status-${s.action}`}>{status}</span>
        </div>
        <span className="unit-summary-meta">
          {s.unitCount ?? "—"} assigned {vehicle ? "vehicles" : "soldiers"}
          {s.localOrder?.movementGroup !== undefined && s.localOrder.path.length
            ? " · Group pace"
            : ""}
          {s.suppression > 0.01
            ? ` · ${Math.round(s.suppression * 100)}% suppressed`
            : ""}
        </span>
        <div className="unit-vitals">
          <label>
            Health <b>{health}%</b>
            <meter
              min={0}
              max={100}
              value={health}
              aria-label="Selected squad health"
            />
          </label>
          <label>
            Morale <b>{morale}%</b>
            <meter
              min={0}
              max={100}
              value={morale}
              aria-label="Selected squad morale"
            />
          </label>
        </div>
      </div>
    </section>
  );
}

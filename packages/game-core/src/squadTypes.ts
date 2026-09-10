import type { Squad } from "./tactics.ts";

/** Player-facing roles. Vehicles are fighting units, not managed transports. */
export const SQUAD_TYPES: Record<
  Squad["kind"],
  { name: string; units: string; role: string }
> = {
  infantry: {
    name: "Infantry squad",
    units: "Soldiers",
    role: "Foot soldiers for holding ground and taking cover.",
  },
  motorized: {
    name: "Mobile infantry squad",
    units: "Light fighting vehicles",
    role: "Mounted battlefield support. Its units stay in their vehicles; no embark or dismount orders.",
  },
  armor: {
    name: "Armor squad",
    units: "Armored vehicles",
    role: "Direct-fire armored support. Vehicles fight as the squad’s assigned units.",
  },
  artillery: {
    name: "Artillery squad",
    units: "Artillery units",
    role: "Long-range fire support and suppression.",
  },
  garrison: {
    name: "Garrison",
    units: "Defenders",
    role: "Local territorial defenders.",
  },
};
export const squadHealth = (s: Pick<Squad, "strength" | "capacity">) =>
  Math.max(
    0,
    Math.min(100, Math.round((s.strength / Math.max(0.001, s.capacity)) * 100)),
  );

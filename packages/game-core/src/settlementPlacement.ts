import { GENERATED_WORLD_SCALE, SETTLEMENT_RADII } from "./campaignScale.ts";
export type SettlementSize = keyof typeof SETTLEMENT_RADII;

export interface SettlementSite {
  id: number;
  region: number;
  x: number;
  y: number;
  suitability: number;
  ruralOnly: boolean;
  variation: number;
}
export interface PlacedSettlement extends SettlementSite {
  size: SettlementSize;
}

/** Distances in generator coordinates; the land budget uses this same space. */
export function settlementSeparation(
  a: SettlementSize,
  b: SettlementSize,
): number {
  const rank = (size: SettlementSize) =>
    size === "city" || size === "metropolis" ? 2 : size === "town" ? 1 : 0;
  const high = Math.max(rank(a), rank(b)),
    low = Math.min(rank(a), rank(b));
  const baseline =
    high === 2
      ? low === 2
        ? 1200
        : 750
      : high === 1
        ? low === 1
          ? 750
          : 600
        : 450;
  // Include the port-art offset, then reserve four larger-city diameters of countryside.
  const edgeClearance =
    (SETTLEMENT_RADII[a] + SETTLEMENT_RADII[b]) * 1.15 +
    Math.max(SETTLEMENT_RADII[a], SETTLEMENT_RADII[b]) * 8;
  return Math.max(baseline, edgeClearance / GENERATED_WORLD_SCALE);
}

export function worldSettlementSeparation(
  a: SettlementSize,
  b: SettlementSize,
): number {
  return settlementSeparation(a, b) * GENERATED_WORLD_SCALE;
}

type Reservation = { x: number; y: number; size?: SettlementSize };

/** Plan reserved settlement groups together; never commit a partial or cramped plan. */
export function planSettlementReservations<T extends Reservation>(
  groups: readonly (readonly T[])[],
  occupied: readonly Reservation[],
  valid: (site: T) => boolean,
): T[] | null {
  let attempts = 20000;
  const plan = new Map<number, T>();
  const validity = new Map<T, boolean>();
  const search = (): boolean => {
    if (plan.size === groups.length) return true;
    const blocked = [...occupied, ...plan.values()];
    let next = -1,
      options: T[] = [];
    // Solve the most constrained coastline first and detect blocked nations early.
    for (let i = 0; i < groups.length; i++) {
      if (plan.has(i)) continue;
      const available = groups[i].filter(
        (site) =>
          validity.get(site) !== false &&
          !blocked.some(
            (other) =>
              Math.hypot(site.x - other.x, site.y - other.y) <
              worldSettlementSeparation(
                site.size ?? "hamlet",
                other.size ?? "hamlet",
              ),
          ),
      );
      if (!available.length) return false;
      if (next < 0 || available.length < options.length) {
        next = i;
        options = available;
      }
    }
    for (const site of options) {
      if (--attempts < 0) return false;
      if (!validity.has(site)) validity.set(site, valid(site));
      if (!validity.get(site)) continue;
      plan.set(next, site);
      if (search()) return true;
      plan.delete(next);
    }
    return false;
  };
  return search() ? groups.map((_, i) => plan.get(i)!) : null;
}

/** Global area budget, independent of the number or order of political territories.
 * Budgets are ceilings: blocked sites never trigger closer fallback placement.
 */
export function placeSettlements(
  sites: readonly SettlementSite[],
  usableArea: number,
  reserved: readonly PlacedSettlement[] = [],
): PlacedSettlement[] {
  const total = Math.max(0, Math.floor(usableArea / 180000));
  const major = Math.floor(total * 0.12),
    towns = Math.floor(total * 0.3);
  const placed: PlacedSettlement[] = [...reserved];
  const ruralRegions = new Set(
    reserved.filter((s) => s.ruralOnly).map((s) => s.region),
  );
  const remaining = Math.max(0, total - reserved.length);
  const majorCount = Math.min(
    remaining,
    Math.max(
      0,
      major -
        reserved.filter((s) => s.size === "city" || s.size === "metropolis")
          .length,
    ),
  );
  const townCount = Math.min(
    remaining - majorCount,
    Math.max(0, towns - reserved.filter((s) => s.size === "town").length),
  );
  const tiers = [
    { size: "city" as SettlementSize, count: majorCount },
    { size: "town" as SettlementSize, count: townCount },
    {
      size: "village" as SettlementSize,
      count: remaining - majorCount - townCount,
    },
  ];
  for (const tier of tiers) {
    for (let n = 0; n < tier.count; n++) {
      let best: SettlementSite | undefined;
      let bestScore = -Infinity;
      for (const site of sites) {
        if (
          site.ruralOnly &&
          (tier.size !== "village" || ruralRegions.has(site.region))
        )
          continue;
        let clearance = 2;
        for (const other of placed) {
          clearance = Math.min(
            clearance,
            Math.hypot(site.x - other.x, site.y - other.y) /
              settlementSeparation(
                tier.size === "city" ? "metropolis" : tier.size,
                other.size,
              ),
          );
        }
        if (clearance < 1) continue;
        // Reward breathing room, instead of filling every legal gap near a coast.
        const score =
          Math.max(0, Math.min(1, site.suitability)) + (clearance - 1) * 0.8;
        if (score > bestScore || (score === bestScore && site.id < best!.id)) {
          best = site;
          bestScore = score;
        }
      }
      if (!best) break;
      const size =
        tier.size === "city" &&
        n === 0 &&
        total >= 24 &&
        best.variation < 0.3 &&
        !placed.some((s) => s.size === "metropolis")
          ? "metropolis"
          : tier.size === "village" && best.variation < 0.5
            ? "hamlet"
            : tier.size;
      placed.push({ ...best, size });
      if (best.ruralOnly) ruralRegions.add(best.region);
    }
  }
  return placed.slice(reserved.length);
}

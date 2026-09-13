import type { Region, RegionFeature, World } from "./index.ts";
import type { Squad } from "./tactics.ts";

export const SETTLEMENT_CAPTURE_RADIUS = 24;

/** Older campaigns inherit settlement control from the surrounding region. */
export function settlementOwner(
  region: Pick<Region, "owner">,
  settlement: RegionFeature,
): number | null {
  return settlement.owner === undefined ? region.owner : settlement.owner;
}

export function canCaptureSettlement(squad: Squad): boolean {
  return (
    squad.owner !== null &&
    squad.strength > 0.5 &&
    squad.kind !== "garrison" &&
    squad.movementLayer !== "air" &&
    !squad.localOrder?.retreat
  );
}

export interface SettlementCapture {
  owner: number;
  region: number;
  feature: string;
  name: string;
}

/** Resolve only uncontested, physical occupation; issuing the order never flips control. */
export function resolveSettlementCaptures(w: World): SettlementCapture[] {
  const tactics = w.tactics;
  if (!tactics) return [];
  const captures: SettlementCapture[] = [];
  const targets = new Map<string, Squad[]>();
  for (const squad of tactics.squads) {
    const target = squad.captureSite;
    if (!target || !canCaptureSettlement(squad)) continue;
    const key = `${target.region}:${target.feature}`;
    const group = targets.get(key) ?? [];
    group.push(squad);
    targets.set(key, group);
  }
  for (const squads of targets.values()) {
    const target = squads[0].captureSite!;
    const region = w.regions[target.region];
    const site = region?.features?.find(
      (feature) =>
        feature.id === target.feature && feature.kind === "settlement",
    );
    if (!site) {
      for (const squad of squads) delete squad.captureSite;
      continue;
    }
    const arrived = squads.filter(
      (squad) =>
        squad.region === region.id &&
        Math.hypot(squad.x - site.x, squad.y - site.y) <=
          SETTLEMENT_CAPTURE_RADIUS,
    );
    const owners = new Set(arrived.map((squad) => squad.owner as number));
    if (owners.size !== 1) continue;
    const owner = arrived[0].owner as number;
    const contested = tactics.squads.some(
      (squad) =>
        squad.region === region.id &&
        squad.strength > 0.5 &&
        squad.owner !== owner &&
        Math.hypot(squad.x - site.x, squad.y - site.y) <=
          SETTLEMENT_CAPTURE_RADIUS,
    );
    if (contested) continue;
    const changed = settlementOwner(region, site) !== owner;
    site.owner = owner;
    for (const squad of squads) {
      delete squad.captureSite;
      squad.garrisonSite = { region: region.id, feature: site.id };
    }
    if (changed)
      captures.push({
        owner,
        region: region.id,
        feature: site.id,
        name: site.name,
      });
  }
  return captures;
}

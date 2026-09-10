import type { Army, World } from "./index.ts";
import { settlementOwner } from "./settlementCapture.ts";
export function coverSite(w: World, a: Army) {
  if (!a.cover) return null;
  const r = w.regions[a.cover.region];
  if (!r || r.owner !== a.owner) return null;
  if (a.cover.feature === "fort")
    return r.building === "fort"
      ? { x: r.x, y: r.y, name: `Fort at ${r.name}` }
      : null;
  const f = r.features?.find(
    (f) => f.id === a.cover!.feature && f.kind === "settlement",
  );
  return f && settlementOwner(r, f) === a.owner
    ? { x: f.x, y: f.y, name: f.name }
    : null;
}
export function inCover(
  w: World,
  a: Army | undefined,
  s: {
    x: number;
    y: number;
    region: number;
    owner?: number | null;
    garrisonSite?: { region: number; feature: string };
  },
) {
  if (s.garrisonSite) {
    const r = w.regions[s.garrisonSite.region];
    const f = r?.features?.find(
      (f) => f.id === s.garrisonSite!.feature && f.kind === "settlement",
    );
    if (
      f &&
      settlementOwner(r, f) === s.owner &&
      s.region === r.id &&
      Math.hypot(s.x - f.x, s.y - f.y) <= 24
    )
      return true;
  }
  const site = a && coverSite(w, a);
  return !!(
    site &&
    a!.cover?.region === s.region &&
    !a!.route.length &&
    Math.hypot(s.x - site.x, s.y - site.y) <= 24
  );
}

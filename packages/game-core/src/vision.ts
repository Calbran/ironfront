import type { World } from "./index.ts";

/** Public geography; local military intelligence. Never mutate the authoritative save. */
export function visibleRegions(w: World, owner: number): Set<number> {
  const sources = new Set(
    w.regions.filter((r) => r.owner === owner).map((r) => r.id),
  );
  for (const a of w.armies)
    if (a.owner === owner && a.strength > 0) sources.add(a.region);
  for (const s of w.tactics?.squads ?? [])
    if (s.owner === owner && s.strength > 0) sources.add(s.region);
  const visible = new Set(sources);
  for (const id of sources)
    for (const neighbor of w.regions[id]?.neighbors ?? [])
      if (w.regions[neighbor].terrain !== "mountains") visible.add(neighbor);
  return visible;
}

export function worldForPlayer(w: World, owner: number): World {
  const visible = visibleRegions(w, owner),
    view = structuredClone(w);
  view.vision = { owner, visible: [...visible] };
  view.armies = view.armies.filter(
    (a) => a.owner === owner || visible.has(a.region),
  );
  for (const a of view.armies)
    if (a.owner !== owner) {
      delete a.cover;
      // A spotted formation does not expose its standing orders or logistics.
      Object.assign(a, {
        route: [],
        target: null,
        campaignOwner: null,
        sector: [],
        deployment: 0,
        entrenchment: 0,
        supplies: 0,
        risk: "balanced",
        fallback: null,
        status: "Spotted formation",
        order: "hold",
        progress: 0,
        air: false,
      });
    }
  for (const r of view.regions)
    if (!visible.has(r.id)) {
      r.garrison = -1;
      r.building = null;
      r.construction = null;
      r.consolidation = 0;
    } else if (r.owner !== owner) r.construction = null;
  for (const n of view.nations)
    if (n.id !== owner) {
      n.industry = 0;
      n.fuel = 0;
      n.manpower = 0;
    }
  // Enemy orders and historical battles must not leak through the dispatch feed.
  view.events = view.events.filter(
    (e) => e.owner === owner || e.kind === "world",
  );
  view.eventSeq = view.events.at(-1)?.id ?? 0;
  if (view.tactics) {
    view.tactics.squads = view.tactics.squads.filter(
      (s) => s.owner === owner || visible.has(s.region),
    );
    const ids = new Set(view.tactics.squads.map((s) => s.id));
    const armies = new Set(view.armies.map((a) => a.id));
    for (const s of view.tactics.squads) {
      if (s.target && !ids.has(s.target)) s.target = null;
      if (s.localOrder?.attackTarget && !ids.has(s.localOrder.attackTarget))
        delete s.localOrder.attackTarget;
      if (s.army !== null && !armies.has(s.army)) s.army = null;
      if (s.owner !== owner) {
        delete s.localOrder;
        delete s.garrisonSite;
        delete s.captureSite;
        s.previousX = s.x;
        s.previousY = s.y;
      }
    }
    view.tactics.engagements = view.tactics.engagements.filter(
      (e) => e.status === "active" && visible.has(e.region),
    );
    for (const e of view.tactics.engagements)
      e.attackers = e.attackers.filter((id) => armies.has(id));
  }
  return view;
}

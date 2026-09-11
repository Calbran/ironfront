import {COVER_ORDER_REACH,coverSlots,sameCoverSide} from "./cityCoverOrders";
import {obstacleDistance,type CityObstacle,type createCityTactics} from "./cityTactics";
import type {CityPoint} from "./organicCity";
import type {TrialUnit} from "./cityUnitTrial";
export function previewTacticalOrder(p:CityPoint,facing:number|undefined,units:TrialUnit[],selectedIds:number[],tactics:Pick<ReturnType<typeof createCityTactics>,"obstacles"|"walkable"|"coverAt">,vehicles:CityObstacle[]) {
    const selected = units.filter((u) => selectedIds.includes(u.id));
    const nearby = [...tactics.obstacles, ...vehicles].filter(o => o.kind !== "garden" && obstacleDistance(p, o) <= 7);
    const coveredOrder = nearby.some(o => obstacleDistance(p, o) <= COVER_ORDER_REACH);
    const protectedSlots = coveredOrder ? coverSlots(p, nearby) : [];
    const previewCoverAt = (q: CityPoint, threat?: CityPoint) => tactics.coverAt(q, threat, vehicles);
    const coverLevels = new Map<CityPoint, ReturnType<typeof previewCoverAt>>();
    const cachedCover = (q: CityPoint) => { let result = coverLevels.get(q); if (!result) { result = previewCoverAt(q); coverLevels.set(q, result); } return result; };
    const chosen: {
      id: number;
      kind: TrialUnit["kind"];
      x: number;
      z: number;
      angle: number;
      cover: TrialUnit["cover"];
      valid: boolean;
    }[] = [];
    // Stable personal offsets: organic spacing without reshuffling on every drag event.
    const loose = !coveredOrder && selected.length >= 3 && selected.every(u=>u.kind==="infantry");
    const columns=Math.ceil(Math.sqrt(selected.length*1.5));
    const offsets=selected.map((u,i)=>({
      x:(i%columns)*1.9 + (Math.floor(i/columns)%2)*.55 + Math.sin(u.id*12.9898)*.28,
      z:Math.floor(i/columns)*1.9 + Math.sin(u.id*7.233)*.4,
    }));
    const center=offsets.reduce((a,b)=>({x:a.x+b.x/selected.length,z:a.z+b.z/selected.length}),{x:0,z:0});
    for (let i = 0; i < selected.length; i++) {
      const unit = selected[i],
        spacing = selected.some((u) => u.kind === "vehicle") ? 2.5 : 1.5,
        offset = (i - (selected.length - 1) / 2) * spacing;
      const lateral=loose?offsets[i].x-center.x:offset;
      const depth=loose?offsets[i].z-center.z:0;
      const desired = {
        x: p.x + Math.cos(facing ?? 0) * lateral + Math.sin(facing ?? 0)*depth,
        z: p.z - Math.sin(facing ?? 0) * lateral + Math.cos(facing ?? 0)*depth,
      };
      const candidates: CityPoint[] = [desired,...(unit.kind==="infantry"?protectedSlots:[])];
      const clear = (q: CityPoint) =>
        tactics.walkable(q, unit.kind) &&
        !vehicles.some(
          (o) =>
            o.id !== `vehicle:${unit.id}` &&
            obstacleDistance(q, o) <= (unit.kind === "infantry" ? 0.25 : 0.9),
        ) &&
        !units.some(
          (u) =>
            u.health>0 && !selectedIds.includes(u.id) &&
            Math.hypot(u.x - q.x, u.z - q.z) <
              (u.kind === "vehicle" || unit.kind === "vehicle" ? 1.5 : 0.9),
        ) &&
        !chosen.some((v) => Math.hypot(v.x - q.x, v.z - q.z) < 0.9);
      if (!clear(desired)) {
        const reach = 4.5,
          margin = unit.kind === "vehicle" ? 1 : 0.32;
        // Project onto real oriented faces, then slide along those faces to fit neighbors.
        for (const o of [
          ...tactics.obstacles,
          ...vehicles.filter((o) => o.id !== `vehicle:${unit.id}`),
        ]) {
          if (o.kind === "garden" && unit.kind === "infantry") continue;
          if (
            Math.hypot(o.x - desired.x, o.z - desired.z) >
            Math.hypot(o.width, o.depth) / 2 + reach
          )
            continue;
          const c = Math.cos(o.angle),
            s = Math.sin(o.angle),
            dx = desired.x - o.x,
            dz = desired.z - o.z;
          const lx = dx * c - dz * s,
            lz = dx * s + dz * c;
          const put = (x: number, z: number) =>
            candidates.push({ x: o.x + x * c + z * s, z: o.z - x * s + z * c });
          for (const sign of [-1, 1])
            for (const shift of [0, -0.95, 0.95, -1.9, 1.9, -2.85, 2.85]) {
              put(
                sign * (o.width / 2 + margin),
                Math.max(-o.depth / 2, Math.min(o.depth / 2, lz + shift)),
              );
              put(
                Math.max(-o.width / 2, Math.min(o.width / 2, lx + shift)),
                sign * (o.depth / 2 + margin),
              );
            }
        }
        // Also resolve occupied open-ground slots without requiring a nearby wall.
        for (const r of [0.5, 1, 1.5, 2, 3, 4])
          for (let j = 0; j < 16; j++)
            candidates.push({
              x: desired.x + Math.cos((j * Math.PI) / 8) * r,
              z: desired.z + Math.sin((j * Math.PI) / 8) * r,
            });
      }
      const distance = (q: CityPoint) =>
        Math.hypot(q.x - desired.x, q.z - desired.z);
      const protectedScore=(q:CityPoint)=>unit.kind==="infantry"&&coveredOrder&&sameCoverSide(p,q,nearby)&&cachedCover(q).level!=="none" ? 0 : 1;
      let goal = desired, bestScore = Infinity, bestDistance = Infinity;
      for (const q of candidates) {
        const d = distance(q);
        if (d > 4.5 || !clear(q) || (coveredOrder && unit.kind === "infantry" && !sameCoverSide(p,q,nearby))) continue;
        const score = protectedScore(q);
        if (score < bestScore || (score === bestScore && (d < bestDistance || (d === bestDistance && (q.x < goal.x || (q.x === goal.x && q.z < goal.z)))))) {
          goal = q; bestScore = score; bestDistance = d;
        }
      }
      const valid = clear(goal) && (!coveredOrder||unit.kind!=="infantry"||sameCoverSide(p,goal,nearby)),
        near = cachedCover(goal);
      const angle =
        facing ??
        (near.level !== "none" && unit.kind === "infantry"
          ? Math.atan2(-near.normal.x, -near.normal.z)
          : Math.atan2(goal.x - unit.x, goal.z - unit.z));
      const cover =
        unit.kind === "infantry"
          ? previewCoverAt(goal, {
              x: goal.x + Math.sin(angle) * 60,
              z: goal.z + Math.cos(angle) * 60,
            }).level
          : "none";
      chosen.push({
        id: unit.id,
        kind: unit.kind,
        x: goal.x,
        z: goal.z,
        angle,
        cover,
        valid,
      });
    }
    return chosen;
  }

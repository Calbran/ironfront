import { performance } from "node:perf_hooks";
import {
  FireIndex,
  FireVisibility,
  fireVolley,
} from "../packages/game-core/src/squadFire.ts";
import type { Squad } from "../packages/game-core/src/tactics.ts";
function scenario(b: number) {
  const units = Array.from({ length: 13 }, (_, i): Squad => ({
    id: `${b}-${i}`,
    army: null,
    owner: i < 6 ? 0 : 1,
    region: b,
    kind: i === 12 ? "armor" : "infantry",
    unitCount: i === 12 ? 1 : 6,
    capacity: 100,
    strength: 100,
    morale: 1,
    suppression: 0,
    x: i < 6 ? 0 : 30,
    y: (i % 6) * 8,
    previousX: 0,
    previousY: 0,
    action: "holding",
    target: null,
    fire: 0,
  }));
  return {
    units,
    sight: new FireVisibility([
      {
        id: "cover",
        exposure: 0.5,
        polygon: [
          { x: 13, y: 10 },
          { x: 15, y: 10 },
          { x: 15, y: 24 },
          { x: 13, y: 24 },
        ],
      },
    ]),
  };
}
for (const count of [100, 500, 1000]) {
  const battles = Array.from({ length: count }, (_, i) => scenario(i));
  const samples: number[] = [];
  for (let step = 0; step < 120; step++) {
    const start = performance.now();
    for (const b of battles) {
      const grid = new FireIndex(b.units, 100),
        hits = new Map<string, number>();
      for (const s of b.units) {
        const d = grid.target(s, 100, (a, d) => b.sight.exposure(a, d));
        if (!d) continue;
        s.target = d.id;
        const hit = fireVolley(
          s,
          d,
          Math.hypot(s.x - d.x, s.y - d.y),
          100,
          b.sight.exposure(s, d),
          1,
        );
        hits.set(d.id, (hits.get(d.id) || 0) + hit.damage);
      }
      for (const s of b.units) {
        s.strength = Math.max(0, 100 - (hits.get(s.id) || 0));
      }
    }
    if (step >= 20) samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      battles: count,
      squads: count * 13,
      medianStepMs: samples[50],
      p95StepMs: samples[95],
      scope:
        "sustained targeting/LOS/volley/aggregation kernel; excludes movement, scheduled impacts, persistence and networking",
    }),
  );
}

import { generateCityRoads } from "../packages/game-core/src/cityRoads.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld } from "../packages/game-core/src/index.ts";
import { generateCityLayout } from "../packages/game-core/src/cityLayout.ts";
import { generateTerrainAccents } from "../packages/game-core/src/terrainAccents.ts";
import {
  onLocalLand,
  localSegment,
} from "../packages/game-core/src/localMovement.ts";
test("terrain accents are stable, cosmetic, land-bound and include natural and settlement detail", () => {
  const w = createWorld("ACCENTS", "Boreal", 4, 3600000, 0);
  const cities = w.regions.flatMap((r) =>
    (r.features ?? [])
      .filter((f) => f.kind === "settlement")
      .map((f) => ({
        ...f,
        region: r.id,
        layout: generateCityLayout(w, r, f),
      })),
  );
  const before = JSON.stringify(w),
    roads = generateCityRoads(w),
    a = generateTerrainAccents(w, cities, roads);
  assert.equal(JSON.stringify(w), before);
  assert.deepEqual(
    generateTerrainAccents(JSON.parse(before), cities, roads),
    a,
  );
  assert(a.sprites.length > 100 && a.sprites.length < 10000);
  for (let i = 0; i < 8; i++)
    assert(
      a.sprites.some((p) => p.variant === i),
      `variant ${i} is represented`,
    );
  assert(a.fields.length > 10);
  assert(a.sprites.some((p) => p.atlas === "trees"));
  for (const field of a.fields)
    for (const fragment of field.fragments ?? [field.points]) {
      const center = {
        x: fragment.reduce((n, p) => n + p.x, 0) / fragment.length,
        y: fragment.reduce((n, p) => n + p.y, 0) / fragment.length,
      };
      const inset = fragment.map((p) => ({
        x: p.x + (center.x - p.x) * 0.0001,
        y: p.y + (center.y - p.y) * 0.0001,
      }));
      assert(
        w.regions.some((r) =>
          inset.every((p, i) =>
            localSegment(r, p, inset[(i + 1) % inset.length]),
          ),
        ),
        "clipped fields stay on traversable land",
      );
      for (const p of fragment)
        assert(
          cities.every(
            (c) => Math.hypot(c.x - p.x, c.y - p.y) > c.layout.radius,
          ),
          "fields clear settlements",
        );
    }
  assert(a.lines.some((l) => l.kind === "utility"));
  assert(a.lines.some((l) => l.kind === "field"));
  for (const p of a.sprites) {
    assert(w.regions.some((r) => onLocalLand(r, p)));
    assert(
      cities.every((c) => Math.hypot(c.x - p.x, c.y - p.y) > c.layout.radius),
    );
  }
  for (const line of a.lines)
    for (let i = 1; i < line.points.length; i++)
      assert(
        w.regions.some((r) =>
          localSegment(r, line.points[i - 1], line.points[i]),
        ) ||
          (line.kind === "utility" &&
            Array.from({ length: 21 }, (_, step) => {
              const t = step / 20,
                a = line.points[i - 1],
                b = line.points[i];
              return w.regions.some((r) =>
                onLocalLand(r, {
                  x: a.x + (b.x - a.x) * t,
                  y: a.y + (b.y - a.y) * t,
                }),
              );
            }).every(Boolean)),
      );
  w.hour += 12;
  assert.deepEqual(generateTerrainAccents(w, cities, roads), a);
});

test("utility poles stay on a roadside verge, including cross-region roads", () => {
  const w = createWorld("POWER", "Boreal", 4, 3600000, 0);
  const roads = generateCityRoads(w).filter((r) => r.utilities);
  assert(
    roads.some((r) =>
      r.points.some((p, i) => i > 0 && p.region !== r.points[i - 1].region),
    ),
  );
  for (const road of roads) {
    const spans = generateTerrainAccents(w, [], [road]).lines.filter(
      (l) => l.kind === "utility",
    );
    assert(spans.length > 0);
    const factor = w.geography!.cellSize / 24;
    const roadHalf = 4.8 * factor * (road.kind === "main" ? 1.6 : 1) * 1.05;
    for (const span of spans) {
      assert(
        Math.hypot(
          span.points[1].x - span.points[0].x,
          span.points[1].y - span.points[0].y,
        ) <=
          w.geography!.cellSize * 3.501,
      );
      for (const p of span.points) {
        assert(w.regions.some((r) => onLocalLand(r, p)));
        for (let i = 1; i < road.points.length; i++) {
          const a = road.points[i - 1],
            b = road.points[i];
          const dx = b.x - a.x,
            dy = b.y - a.y;
          const t = Math.max(
            0,
            Math.min(
              1,
              ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
            ),
          );
          assert(
            Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t) >=
              roadHalf + 8 * factor,
            "pole and projected wire height clear the full road width",
          );
        }
      }
    }
  }
});

test("agricultural regions cover broad land areas without requiring a town", async () => {
  const { generateLandscape } =
    await import("../packages/game-core/src/landscape.ts");
  const w = createWorld("FARMS", "Boreal", 4, 3600000, 0);
  const landscape = generateLandscape(w, [], []);
  const area = (p: { x: number; y: number }[]) =>
    Math.abs(
      p.reduce((n, a, i) => {
        const b = p[(i + 1) % p.length];
        return n + a.x * b.y - a.y * b.x;
      }, 0),
    ) / 2;
  const districts = new Map<string, number>();
  for (const field of landscape.fields) {
    assert(field.district);
    districts.set(field.district, (districts.get(field.district) ?? 0) + 1);
  }
  const coverage = w.regions
    .filter((r) => r.terrain === "plains")
    .map((r) => {
      const fragments = landscape.fields
        .flatMap((f) => f.fragments ?? [f.points])
        .filter((p) =>
          onLocalLand(r, {
            x: p.reduce((n, q) => n + q.x, 0) / p.length,
            y: p.reduce((n, q) => n + q.y, 0) / p.length,
          }),
        );
      return fragments.reduce((n, p) => n + area(p), 0) / r.area;
    });
  assert(
    coverage.some((fraction) => fraction > 0.9),
    "at least one region is predominantly agricultural without any town anchors",
  );
  assert(
    landscape.lanes.length > 10,
    "agricultural districts have rural lanes",
  );
});

import { landscapeClearance } from "../../../../packages/game-core/src/landscapeClearance";
import {
  createWorld,
  type World,
} from "../../../../packages/game-core/src/index";
import { generateCityLayout } from "../../../../packages/game-core/src/cityLayout";
import { generateCityRoads } from "../../../../packages/game-core/src/cityRoads";
import { generateBiomeScenery } from "../../../../packages/game-core/src/biomeScenery";
import { generateLandscape } from "../../../../packages/game-core/src/landscape";
import { planMiniatureTown } from "../../../../packages/game-core/src/miniatureTown";
import { clearRiverfrontBuildings } from "./riverfrontBuildings";
import { presentationRivers } from "./riverPresentation";
import type { MiniatureData } from "./miniatureData";
/** Dependency-ordered worker pipeline. Timings are diagnostic and excluded from seeded content. */
export function buildMiniatureData(
  seed: string,
  suppliedWorld?: World,
  seats = 4,
): MiniatureData {
  const started = performance.now(),
    timings: Record<string, number> = {};
  const stage = <T>(name: string, fn: () => T): T => {
    const start = performance.now();
    const result = fn();
    timings[name] = performance.now() - start;
    return result;
  };
  const world = stage(
    "world",
    () => suppliedWorld ?? createWorld("THREE-STUDY", seed, seats, 3600000, 0),
  );
  const roads = stage("regionalRoads", () => generateCityRoads(world));
  const data: MiniatureData = {
    world,
    roads,
    cities: [],
    scenery: [],
    generatedMs: 0,
    timings,
  };
  if (!suppliedWorld)
    stage("riverPresentation", () => presentationRivers(data));
  const sites = world.regions.flatMap((r) =>
    (r.features ?? [])
      .filter((f) => f.kind === "settlement")
      .map((feature) => ({ region: r.id, feature })),
  );
  const planned = new Set<string>();
  if (!suppliedWorld)
    stage("terrainTown", () => {
      const bridges = roads.flatMap((r) => r.bridges);
      const ranked = sites
        .filter((s) => s.feature.size !== "hamlet")
        .map((s) => ({
          ...s,
          distance: bridges.reduce(
            (d, b) =>
              Math.min(d, Math.hypot(b.x - s.feature.x, b.y - s.feature.y)),
            Infinity,
          ),
        }))
        .sort((a, b) => a.distance - b.distance);
      const ordered = [
        ...ranked,
        ...sites.filter((s) => s.feature.size === "hamlet"),
      ];
      for (const s of ordered) {
        const layout = planMiniatureTown(
          world,
          s.region,
          s.feature,
          roads,
          data.riverPaths!,
        );
        if (layout) {
          data.cities.push({ ...s, layout });
          planned.add(s.feature.id);
          data.studyCityId ??= s.feature.id;
        }
      }
    });
  stage("otherTownLayouts", () => {
    for (const s of sites)
      if (!planned.has(s.feature.id))
        data.cities.push({
          ...s,
          layout: generateCityLayout(world, world.regions[s.region], s.feature),
        });
  });
  if (!suppliedWorld) {
    const patterns: Record<string, number> = {};
    for (const c of data.cities) {
      const pattern = (c.layout as typeof c.layout & { pattern?: string })
        .pattern;
      if (pattern) patterns[pattern] = (patterns[pattern] ?? 0) + 1;
    }
    data.townSummary = {
      planned: planned.size,
      fallback: sites.length - planned.size,
      patterns,
    };
  }
  if (!suppliedWorld)
    stage("legacyRiverClearance", () =>
      clearRiverfrontBuildings({
        ...data,
        cities: data.cities.filter((c) => !planned.has(c.feature.id)),
      }),
    );
  data.fields = stage("fields", () =>
    suppliedWorld
      ? []
      : generateLandscape(
          world,
          data.cities.map((c) => ({
            region: c.region,
            layout: c.layout,
            x: c.feature.x,
            y: c.feature.y,
          })),
          roads,
        ).fields,
  );
  data.scenery = stage("vegetation", () =>
    generateBiomeScenery(
      world,
      data.cities.map((c) => ({
        x: c.feature.x,
        y: c.feature.y,
        radius: c.layout.radius + 12,
      })),
    ),
  );
  if (!suppliedWorld)
    stage("sceneryClearance", () => {
      const clear = landscapeClearance(data.fields ?? [], roads, 3);
      data.scenery = data.scenery.filter((p) => clear(p, p.width * 0.4));
    });
  data.generatedMs = performance.now() - started;
  return data;
}

import { createWorld } from "../../../../packages/game-core/src/index";
import { generateCityLayout } from "../../../../packages/game-core/src/cityLayout";
import { generateCityRoads } from "../../../../packages/game-core/src/cityRoads";
import { generateBiomeScenery } from "../../../../packages/game-core/src/biomeScenery";
import type { MiniatureData } from "./miniatureData";
self.onmessage = ({ data }: MessageEvent<{ seed: string }>) => {
  try {
    const started = performance.now();
    const world = createWorld("THREE-STUDY", data.seed, 4, 3600000, 0);
    const cities = world.regions.flatMap(r => (r.features ?? []).filter(f => f.kind === "settlement").map(feature => ({ region: r.id, feature, layout: generateCityLayout(world, r, feature) })));
    const roads = generateCityRoads(world);
    const scenery = generateBiomeScenery(world, cities.map(c => ({ x: c.feature.x, y: c.feature.y, radius: c.layout.radius + 12 })));
    self.postMessage({ world, cities, roads, scenery, generatedMs: performance.now() - started } satisfies MiniatureData);
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : "World generation failed." }); }
};

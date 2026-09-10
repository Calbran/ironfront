import { clearRiverfrontBuildings } from "./riverfrontBuildings";
import { createWorld } from "../../../../packages/game-core/src/index";
import { generateCityLayout } from "../../../../packages/game-core/src/cityLayout";
import { generateCityRoads } from "../../../../packages/game-core/src/cityRoads";
import { generateBiomeScenery } from "../../../../packages/game-core/src/biomeScenery";
import { generateLandscape } from "../../../../packages/game-core/src/landscape";
import type { MiniatureData } from "./miniatureData";
self.onmessage = ({ data }: MessageEvent<{ seed: string; world?: import("../../../../packages/game-core/src/index").World }>) => {
  try {
    const started = performance.now();
    const world = data.world ?? createWorld("THREE-STUDY", data.seed, 4, 3600000, 0);
    const cities = world.regions.flatMap(r => (r.features ?? []).filter(f => f.kind === "settlement").map(feature => ({ region: r.id, feature, layout: generateCityLayout(world, r, feature) })));
    const roads = generateCityRoads(world);
    if(!data.world)clearRiverfrontBuildings({world,cities,roads,scenery:[],generatedMs:0});
    const scenery = generateBiomeScenery(world, cities.map(c => ({ x: c.feature.x, y: c.feature.y, radius: c.layout.radius + 12 })));
    const fields = data.world ? [] : generateLandscape(world,cities.map(c=>({region:c.region,layout:c.layout,x:c.feature.x,y:c.feature.y})),roads).fields;
    self.postMessage({ world, cities, roads, scenery, fields, generatedMs: performance.now() - started } satisfies MiniatureData);
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : "World generation failed." }); }
};

import { generateBiomeScenery } from "../../../packages/game-core/src/biomeScenery.ts";
import type { CityLayout } from "../../../packages/game-core/src/cityLayout.ts";
import { generateCityRoads } from "../../../packages/game-core/src/cityRoads.ts";
import { generateTerrainAccents } from "../../../packages/game-core/src/terrainAccents.ts";
import type { World } from "../../../packages/game-core/src/index.ts";
import type { RegionFeature } from "../../../packages/game-core/src/index.ts";

export interface MapDetailCity {
  x: number;
  y: number;
  region: number;
  size?: RegionFeature["size"];
  layout: CityLayout;
}

export type MapDetails = {
  roads: ReturnType<typeof generateCityRoads>;
  accents: ReturnType<typeof generateTerrainAccents>;
  scenery: ReturnType<typeof generateBiomeScenery>;
};

self.onmessage = ({
  data,
}: MessageEvent<{ world: World; cities: MapDetailCity[] }>) => {
  const roads = generateCityRoads(data.world);
  const accents = generateTerrainAccents(data.world, data.cities, roads);
  const scenery = generateBiomeScenery(
    data.world,
    data.cities.map((city) => ({ x: city.x, y: city.y, radius: 35 })),
  );
  self.postMessage({ roads, accents, scenery } satisfies MapDetails);
};

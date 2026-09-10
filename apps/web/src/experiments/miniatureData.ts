import type { World, RegionFeature } from "../../../../packages/game-core/src/index";
import type { CityLayout } from "../../../../packages/game-core/src/cityLayout";
import type { CityRoad } from "../../../../packages/game-core/src/cityRoads";
import type { ScenerySprite } from "../../../../packages/game-core/src/biomeScenery";

/** Presentation conversion only. Persisted campaign coordinates are never changed. */
export const WORLD_TO_MODEL = 1 / 12;
export const modelPoint = (x: number, y: number): [number, number, number] => [x * WORLD_TO_MODEL, 0, y * WORLD_TO_MODEL];
export const worldPoint = (x: number, z: number) => ({ x: x / WORLD_TO_MODEL, y: z / WORLD_TO_MODEL });
export interface StudyCity { region: number; feature: RegionFeature; layout: CityLayout }
export interface MiniatureData {
  world: World;
  cities: StudyCity[];
  scenery: ScenerySprite[];
  roads: CityRoad[];
  fields?: import("../../../../packages/game-core/src/landscape").FieldParcel[];
  generatedMs: number;
  riverPaths?: [number,number][][];
  studyCityId?:string;
  townSummary?:{planned:number;fallback:number;patterns:Record<string,number>};
  timings?:Record<string,number>;
}
export function initialCity(data: MiniatureData): StudyCity | undefined {
  const capital = data.world.nations[0].capital;
  return data.cities.find(c => c.region === capital && c.feature.size !== "hamlet") ?? data.cities.find(c => c.layout.buildings.length >= 12) ?? data.cities[0];
}

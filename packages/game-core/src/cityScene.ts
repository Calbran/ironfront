import type { World, Region, RegionFeature } from "./index.ts";
import type { CityArchetype } from "./cityLayout.ts";
import { onLocalLand } from "./localMovement.ts";
export const SCENE_FAMILIES = [
  "border",
  "rural",
  "industrial",
  "port",
  "metropolis",
] as const;
export type SceneFamily = (typeof SCENE_FAMILIES)[number];
// Calibrated per illustration against house size, not atlas cell size.
// Rank adds districts; the same artwork always keeps its physical scale.
export const SCENE_WIDTH: Record<SceneFamily, readonly number[]> = {
  border: [90, 80, 87.5, 170],
  rural: [135, 125, 140, 160],
  industrial: [210, 200, 215, 280],
  port: [190, 180, 185, 220],
  metropolis: [470, 450, 490, 360, 380],
};
export function sceneTextureIndex(family: SceneFamily, variant: number) {
  if (variant < 3) return SCENE_FAMILIES.indexOf(family) * 3 + variant;
  return (
    17 +
    SCENE_FAMILIES.indexOf(family) +
    (family === "metropolis" ? variant - 3 : 0)
  );
}
export interface SceneDistrict {
  family: SceneFamily;
  variant: number;
  x: number;
  y: number;
  width: number;
}
export interface CityScenePlan {
  districts: SceneDistrict[];
  phase: number;
}
export function cityScenePlan(
  w: World,
  r: Region,
  f: RegionFeature,
  archetype: CityArchetype,
): CityScenePlan {
  let hash = 2166136261;
  for (const c of `${w.seed}:${f.id}:scene-v1`)
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  const seed = hash >>> 0,
    rank = Math.max(
      0,
      ["hamlet", "village", "town", "city", "metropolis"].indexOf(
        f.size ?? "hamlet",
      ),
    );
  const family: SceneFamily =
    rank === 4
      ? "metropolis"
      : rank === 0
        ? "border"
        : archetype === "port" && rank >= 2
          ? "port"
          : archetype === "industrial" && rank >= 2
            ? "industrial"
            : archetype === "fortified"
              ? "border"
              : "rural";
  const variant = seed % SCENE_WIDTH[family].length;
  const districts: SceneDistrict[] = [
    {
      family,
      variant,
      x: 0,
      y: 0,
      width: SCENE_WIDTH[family][variant],
    },
  ];
  if (rank >= 3) {
    const extras: SceneFamily[] =
      rank === 4
        ? [archetype === "port" ? "port" : "industrial", "rural"]
        : ["border"];
    extras.forEach((kind, i) => {
      const variant = (seed + i + 1) % SCENE_WIDTH[kind].length,
        width = SCENE_WIDTH[kind][variant],
        side = i === 0 ? -1 : 1;
      const x = side * (districts[0].width * 0.4 + width * 0.25),
        y = districts[0].width * 0.24;
      const center = { x: f.x + x, y: f.y + y };
      const fits = [
        [-0.35, -0.25],
        [0.35, -0.25],
        [-0.35, 0.25],
        [0.35, 0.25],
      ].every(([dx, dy]) =>
        onLocalLand(r, { x: center.x + dx * width, y: center.y + dy * width }),
      );
      const clear = w.regions.every((region) =>
        (region.features ?? []).every(
          (other) =>
            other.kind !== "settlement" ||
            other.id === f.id ||
            Math.hypot(other.x - center.x, other.y - center.y) >
              width * 0.6 + 90,
        ),
      );
      if (fits && clear)
        districts.push({
          family: kind,
          variant,
          x,
          y,
          width,
        });
    });
  }
  return { districts, phase: (seed % 10000) / 10000 };
}

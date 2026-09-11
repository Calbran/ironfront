import type { RoadDestination, RoadPoint } from "./countryRoadNetwork";
import { generateCountryPOI } from "./countryPOI";
import type { RuralPOI } from "./pacingCountryside";

export function pacingRoadDestinations(
  cities: (RoadPoint & {
    id: string;
    name: string;
    radius: number;
    major: boolean;
  })[],
  pois: RuralPOI[],
  bases: (RoadPoint & { id: string; player: number })[],
  scale: number,
): RoadDestination[] {
  const result: RoadDestination[] = cities.map((c) => ({
    ...c,
    radius: c.radius / scale,
    entrances: [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ].map(([x, y]) => ({
      x: c.x + (x * Math.max(0, c.radius - 1)) / scale,
      y: c.y + (y * Math.max(0, c.radius - 1)) / scale,
    })),
  }));
  for (const p of pois) {
    const plan = generateCountryPOI(p.kind, p.seed);
    result.push({
      id: p.id,
      name: p.name,
      x: p.x,
      y: p.y,
      major: false,
      radius: (plan.extent * Math.SQRT2) / scale,
      entrances: plan.entrances.map((e) => ({
        x: p.x + e.x / scale,
        y: p.y + e.z / scale,
      })),
    });
  }
  for (const b of bases)
    result.push({
      ...b,
      name: `Player ${b.player + 1} base`,
      major: false,
      radius: 12 / scale,
      entrances: [-1, 1].map((d) => ({ x: b.x + (d * 12) / scale, y: b.y })),
    });
  return result;
}

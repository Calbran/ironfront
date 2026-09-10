import { cityBuildingFootprint } from "./cityBuildingKit";
import {
  planCraftedNeighborhood,
  neighborhoodHeight,
} from "./craftedNeighborhood";
import {
  type CityLot,
  type CityStreet,
  lotsOverlap,
  lotIntersectsStreet,
} from "./organicCity";
export type DistrictKind = "commercial" | "residential" | "industrial";
export type CityDistrict = {
  id: string;
  kind: DistrictKind;
  x: number;
  z: number;
  width: number;
  depth: number;
  buildings: number;
  access: {
    lotIndex: number;
    entrance: { x: number; z: number };
    street: { x: number; z: number };
  }[];
  pattern: "terraces" | "frontages" | "courtyard" | "crescent" | "works";
};
/** Expand the validated civic neighborhood with serviced, level district blocks. */
export function planDistrictCity(target = 160, seed = 731) {
  if (!Number.isInteger(target) || target < 28 || target > 1024)
    throw new Error("District city budget must be 28–1024");
  const base = planCraftedNeighborhood(),
    lots: CityLot[] = [...base.lots],
    streets: CityStreet[] = [...base.streets],
    districts: CityDistrict[] = [];
  const columns =
    Math.max(1, Math.ceil(Math.sqrt((target - 28) / 160))) +
    ((seed >>> 0) % 3 === 1 ? 1 : 0);
  const candidates: { x: number; z: number; kind: DistrictKind }[] = [];
  // Waterfront industry first, then mixed commercial frontage and residential hinterland.
  for (let col = 0; col < columns; col++)
    for (const side of [-1, 1])
      candidates.push({ x: side * (60 + 44 * col), z: 45, kind: "industrial" });
  for (let row = 0; row < 40; row++) {
    candidates.push({
      x: 0,
      z: -55 - row * 32,
      kind: row < 2 ? "commercial" : "residential",
    });
    for (let col = 0; col < columns; col++)
      for (const side of [-1, 1])
        candidates.push({
          x: side * (60 + 44 * col),
          z: -16 - row * 32,
          kind: col === 0 && row < 1 ? "commercial" : "residential",
        });
  }
  // Alternate compact, broad and asymmetric growth while keeping serviced block sites.
  const growth = (seed >>> 0) % 3;
  if (growth !== 0) {
    const score = (b: (typeof candidates)[number]) =>
      b.kind === "industrial"
        ? -1000
        : growth === 1
          ? Math.abs(b.z + 16) + Math.abs(b.x) * 0.18
          : Math.abs(b.z + 16) + (b.x < 0 ? 85 : Math.abs(b.x) * 0.25);
    candidates.sort((a, b) => score(a) - score(b));
  }
  let minZ = -30,
    maxX = 38;
  const road = (a: { x: number; z: number }, b: { x: number; z: number }) =>
    streets.push({ points: [a, b], width: 3, alley: false });
  for (const block of candidates) {
    if (lots.length >= target - 1) break;
    const industrial = block.kind === "industrial",
      n = industrial ? 2 : 8,
      spacing = industrial ? 20 : 4.9;
    const district: CityDistrict = {
      id: `district-${districts.length}`,
      kind: block.kind,
      x: block.x,
      z: block.z,
      width: 42,
      depth: 28,
      buildings: 0,
      access: [],
      pattern: industrial
        ? "works"
        : block.kind === "commercial"
          ? "frontages"
          : (districts.length + seed) % 3 === 0
            ? "terraces"
            : (districts.length + seed) % 2 === 0
              ? "courtyard"
              : "crescent",
    };
    for (const side of [-1, 1])
      for (let i = 0; i < n; i++) {
        if (lots.length >= target - 1) break;
        const tower =
          !industrial &&
          block.kind === "commercial" &&
          side === -1 &&
          i === 3 &&
          districts.length % 2 === 0;
        const variant = tower
          ? "commercialTower"
          : industrial
            ? i === 0
              ? "mill"
              : side > 0
                ? "boilerHouse"
                : "warehouse"
            : block.kind === "commercial"
              ? i === 0 || i === n - 1
                ? (i === 0 ? side < 0 : side > 0)
                  ? "urbanCorner"
                  : "urbanCornerLeft"
                : "urbanShop"
              : (i + districts.length + seed) % 3 === 0
                ? "urbanRed"
                : (i + seed) % 2 === 0
                  ? "urbanTenement"
                  : "urbanHome";
        const courtyard = district.pattern === "courtyard";
        const terraces = district.pattern === "terraces";
        const cornerWing = courtyard && (i === 0 || i === 7);
        const px = cornerWing
          ? i === 0
            ? -15.2
            : 15.2
          : courtyard
            ? (i - 3.5) * 4.9
            : tower
              ? 0
              : (i - (n - 1) / 2) * spacing;
        const pz = industrial
          ? side * 6.5
          : courtyard
            ? cornerWing
              ? side * 3
              : side * 7.2
            : terraces
              ? side * 8
              : side *
                (district.pattern === "crescent" && (i < 2 || i > 5) ? 7.2 : 6);
        // Courtyard corners need vacant slots for the perpendicular wings.
        if (courtyard && (i === 1 || i === 6)) continue;
        lots.push({
          fullEnvelope: true,
          x: block.x + px,
          z: block.z + pz,
          angle: cornerWing
            ? i === 0
              ? -Math.PI / 2
              : Math.PI / 2
            : side > 0
              ? 0
              : Math.PI,
          scale: industrial ? 0.8 : 0.85,
          heightScale:
            industrial || tower
              ? 1
              : 0.85 + ((i * 7 + districts.length * 3 + seed) % 4) * 0.13,
          variant:
            !industrial &&
            !tower &&
            i > 0 &&
            i < n - 1 &&
            (i + districts.length * 5 + seed) % 23 === 0 &&
            !courtyard &&
            !terraces
              ? "urbanBuild"
              : courtyard || terraces
                ? "urbanCourt"
                : variant,
        });
        const lot = lots.at(-1)!;
        const front =
          (cityBuildingFootprint(lot.variant).depth * lot.scale) / 2;
        const nx = Math.sin(lot.angle),
          nz = Math.cos(lot.angle);
        district.access.push({
          lotIndex: lots.length - 1,
          entrance: { x: lot.x + nx * front, z: lot.z + nz * front },
          street:
            Math.abs(nx) > 0.5
              ? { x: block.x + Math.sign(nx) * 22, z: lot.z }
              : { x: lot.x, z: block.z + Math.sign(nz) * 14 },
        });
        district.buildings++;
        if (tower) i++; // One wide tower reserves two frontage slots, counts as one building.
      }
    districts.push(district);
    minZ = Math.min(minZ, block.z - 14);
    maxX = Math.max(maxX, Math.abs(block.x) + 22);
    for (const dz of [-14, 14])
      road(
        { x: block.x - 22, z: block.z + dz },
        { x: block.x + 22, z: block.z + dz },
      );
  }
  // Connected collectors follow block boundaries, avoiding the reserved central neighborhood.
  for (let col = 0; col <= columns; col++)
    for (const side of [-1, 1]) {
      const x = side * (38 + 44 * col);
      if (Math.abs(x) > maxX) continue;
      const adjoining = districts.filter((d) => Math.abs(d.x - x) === 22);
      if (adjoining.length)
        road(
          { x, z: Math.min(...adjoining.map((d) => d.z - 14)) },
          { x, z: Math.max(...adjoining.map((d) => d.z + 14)) },
        );
    }
  for (const side of [-1, 1])
    road({ x: side * 24, z: 19 }, { x: side * maxX, z: 19 });
  const central = districts.filter((d) => d.x === 0);
  if (central.length)
    for (const side of [-1, 1]) {
      road(
        { x: side * 22, z: Math.min(...central.map((d) => d.z - 14)) },
        { x: side * 22, z: -18 },
      );
      road({ x: side * 22, z: -35 }, { x: side * 38, z: -35 });
    }
  for (const lot of lots) {
    if (streets.some((s) => lotIntersectsStreet(lot, s)))
      throw new Error("District street intersects " + JSON.stringify(lot));
    if (
      Math.abs(neighborhoodHeight(lot.z - 3) - neighborhoodHeight(lot.z + 3)) >
      0.15
    )
      throw new Error("District needs terracing");
  }
  for (let i = 0; i < lots.length; i++)
    for (let j = 0; j < i; j++)
      if (lotsOverlap(lots[i], lots[j]))
        throw new Error("District lots overlap");
  // Sample roads for continuous grading and evenly spaced furniture in the renderer.
  for (const street of streets) {
    const source = street.points;
    street.points = [];
    for (let i = 1; i < source.length; i++) {
      const a = source[i - 1],
        b = source[i],
        steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z)));
      for (let j = 0; j < steps; j++)
        street.points.push({
          x: a.x + ((b.x - a.x) * j) / steps,
          z: a.z + ((b.z - a.z) * j) / steps,
        });
    }
    street.points.push(source.at(-1)!);
  }
  const extent = Math.max(60, maxX + 10, Math.abs(minZ) + 10);
  const river = [
    { x: -extent - 2, z: 65 },
    { x: extent + 2, z: 65 },
  ];
  return {
    ...base,
    lots,
    streets,
    districts,
    extent,
    river,
    rivers: [river],
    trees: [],
    composition: ["axial expansion", "broad quarters", "eastward growth"][
      growth
    ],
    sample: "districts",
  };
}

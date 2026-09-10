/** Miniature-study dimensions, not authoritative campaign collision or cover. */
export const URBAN_BUILDING = {
  width: 5,
  depth: 11,
  floors: 3,
  floorHeight: 2.7,
} as const;
export const WAREHOUSE_BUILDING = {
  width: 10,
  depth: 7,
  floors: 2,
  floorHeight: 2.7,
} as const;

export const MILL_BUILDING = { width: 18, depth: 8 };
export const TOWER_BUILDING = {
  width: 9,
  depth: 11,
  floors: 9,
  floorHeight: 2.7,
};

export function cityBuildingFootprint(variant: string) {
  if (variant === "urbanCourt" || variant.startsWith("workshopRow"))
    return { width: 5, depth: 7 };
  if (variant === "mill") return MILL_BUILDING;
  if (variant.startsWith("commercialTower")) return TOWER_BUILDING;
  if (variant === "boilerHouse") return { width: 8, depth: 8 };
  if (variant.startsWith("urban")) return URBAN_BUILDING;
  if (variant.startsWith("warehouse") || variant === "factory")
    return WAREHOUSE_BUILDING;
  if (variant === "home") return { width: 6, depth: 5 };
  return { width: 7, depth: 6 };
}

/** Local +Z faces the street; secondary doors serve the rear service alley. */
export function cityBuildingEntrances(variant: string) {
  const { depth } = cityBuildingFootprint(variant);
  return [
    { x: 0, z: depth / 2, role: "street" },
    { x: 0, z: -depth / 2, role: "service" },
  ] as const;
}

/** Conservative centered envelopes include roof eaves, steps, pipes and balconies. */
export function cityBuildingEnvelope(variant: string) {
  if (variant === "urbanCourt" || variant.startsWith("workshopRow"))
    return { width: 5.4, depth: 8 };
  if (variant.startsWith("commercialTower")) return { width: 9.4, depth: 11.6 };
  if (variant === "mill") return { width: 18.3, depth: 8.4 };
  if (variant === "boilerHouse") return { width: 8.3, depth: 8.3 };
  if (variant === "urbanBuild") return { width: 5.8, depth: 12.4 };
  if (variant.startsWith("urban")) return { width: 5.4, depth: 12.4 };
  if (variant.startsWith("warehouse")) return { width: 10.4, depth: 7.5 };
  if (variant === "factory") return { width: 10.5, depth: 9.4 };
  if (variant === "home") return { width: 6.8, depth: 7.4 };
  if (variant === "shop") return { width: 7.8, depth: 9.8 };
  return { width: 7.8, depth: 8.5 };
}

/** Scene-space dimensions anchored to infantry rendered at 0.55 model scale (~1 unit tall). */
export const CITY_PROP_SCALE = {
  bench: {
    width: 1.4,
    depth: 0.36,
    seatY: 0.36,
    backY: 0.55,
    backHeight: 0.32,
  },
  wall: { thickness: 0.36, height: 0.6 },
  pier: { width: 0.5, height: 0.82, finialRadius: 0.16 },
} as const;
export const CITY_STREET_PROP_SCALE: Record<string, number> = {
  streetCarSaloon: 0.55,
  streetCarVan: 0.55,
  streetKiosk: 0.75,
  streetClock: 0.7,
  streetHydrant: 0.55,
  streetBollard: 0.55,
  streetBoiler: 0.7,
  streetValve: 0.6,
  streetVent: 0.65,
  streetManhole: 0.6,
};

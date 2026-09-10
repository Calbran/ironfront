import {
  type CityLot,
  type CityStreet,
  lotsOverlap,
  lotIntersectsStreet,
} from "./organicCity";
/** One bounded composition used to establish reusable block rules before city rollout. */
export function neighborhoodHeight(z: number) {
  const t = Math.max(0, Math.min(1, (z - 20) / 14));
  return 2 * (1 - t);
}
export function planCraftedNeighborhood() {
  const streets: CityStreet[] = [
    {
      points: [
        { x: -24, z: -27 },
        { x: -24, z: 19 },
        { x: -24, z: 42 },
      ],
      width: 3,
      alley: false,
    },
    {
      points: [
        { x: 24, z: -27 },
        { x: 24, z: 19 },
        { x: 24, z: 42 },
      ],
      width: 3,
      alley: false,
    },
    {
      points: [
        { x: -24, z: -18 },
        { x: 24, z: -18 },
      ],
      width: 3,
      alley: false,
    },
    {
      points: [
        { x: -38, z: 19 },
        { x: 38, z: 19 },
      ],
      width: 4,
      alley: false,
    },
    {
      points: [
        { x: -24, z: 33 },
        { x: 48, z: 33 },
      ],
      width: 3,
      alley: false,
    },
  ];
  for (const street of streets) {
    const points = street.points;
    street.points = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
      for (let j = 0; j < steps; j++)
        street.points.push({
          x: a.x + ((b.x - a.x) * j) / steps,
          z: a.z + ((b.z - a.z) * j) / steps,
        });
    }
    street.points.push(points.at(-1)!);
  }
  const lots: CityLot[] = [];
  const place = (p: CityLot) => {
    if (
      lots.some((q) => lotsOverlap(p, q)) ||
      streets.some((s) => lotIntersectsStreet(p, s))
    )
      throw new Error("Crafted block violates frontage clearance");
    const depth = (p.variant === "factory" ? 7 : 6) * p.scale;
    if (
      Math.abs(
        neighborhoodHeight(p.z - depth / 2) -
          neighborhoodHeight(p.z + depth / 2),
      ) > 0.15
    )
      throw new Error("Block needs a level foundation");
    const connected = streets.some((s) =>
      s.points.some((q) => {
        const dx = q.x - p.x,
          dz = q.z - p.z,
          d = Math.hypot(dx, dz);
        return (
          d > 0 &&
          d < 9 &&
          (dx * Math.sin(p.angle) + dz * Math.cos(p.angle)) / d > 0.98
        );
      }),
    );
    if (!connected)
      throw new Error("Block entrance must face a connected street");
    lots.push(p);
  };
  for (const side of [-1, 1])
    for (let i = 0; i < 7; i++)
      place({
        x: side * 30,
        z: -24 + i * 6,
        angle: (-side * Math.PI) / 2,
        scale: 0.85,
        variant: i === 5 ? "shop" : "home",
      });
  for (let i = 0; i < 5; i++)
    place({ x: -14 + i * 7, z: -25, angle: 0, scale: 0.85, variant: "shop" });
  for (let i = 0; i < 4; i++)
    place({
      x: -17 + i * 11,
      z: 40,
      angle: Math.PI,
      scale: 0.85,
      variant: "factory",
    });
  for (const side of [-1, 1])
    for (let i = 0; i < 2; i++)
      place({
        x: side * (7 + i * 9),
        z: 12,
        angle: 0,
        scale: 0.8,
        variant: "shop",
      });
  const river = [
    { x: -62, z: 49 },
    { x: 62, z: 49 },
  ];
  return {
    lots,
    streets,
    rivers: [river],
    river,
    trees: [-1, 1].flatMap((side) =>
      [-25, -12, 3, 18, 36].map((z, i) => ({
        x: side * 43,
        z,
        angle: i,
        scale: 0.7,
        variant: i % 3 ? "tree" : "pine",
      })),
    ) as CityLot[],
    parks: [],
    extent: 60,
    sample: "crafted",
  };
}

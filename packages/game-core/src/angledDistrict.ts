import {
  portZoneForParcel,
  portVariants,
  portInfrastructure,
  type CityWaterfront,
  type PortZone,
} from "./portDistrict";
import { planCraftedNeighborhood } from "./craftedNeighborhood";
import { cityBuildingEnvelope, cityBuildingFootprint } from "./cityBuildingKit";
import {
  type CityPoint,
  type CityLot,
  type CityStreet,
  lotsOverlap,
  lotIntersectsStreet,
} from "./organicCity";

/** Clip a convex, counterclockwise polygon to the left of a directed line. */
export function clipBlock(
  poly: CityPoint[],
  a: CityPoint,
  b: CityPoint,
  inset = 0,
) {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const distance = (p: CityPoint) =>
    ((b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x)) / length - inset;
  const result: CityPoint[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i],
      q = poly[(i + 1) % poly.length],
      dp = distance(p),
      dq = distance(q);
    if (dp >= -1e-8) result.push(p);
    if (dp >= 0 !== dq >= 0) {
      const t = dp / (dp - dq);
      result.push({ x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t });
    }
  }
  return result;
}
export function insetBlock(poly: CityPoint[], inset: number) {
  return poly.reduce(
    (p, a, i) => clipBlock(p, a, poly[(i + 1) % poly.length], inset),
    poly,
  );
}
export function blockContains(poly: CityPoint[], p: CityPoint, margin = 0) {
  return poly.every((a, i) => {
    const b = poly[(i + 1) % poly.length];
    return (
      ((b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x)) /
        Math.hypot(b.x - a.x, b.z - a.z) >=
      margin - 1e-7
    );
  });
}
export function lotCorners(lot: CityLot) {
  const b = cityBuildingEnvelope(lot.variant),
    c = Math.cos(lot.angle),
    s = Math.sin(lot.angle);
  return [-1, 1].flatMap((x) =>
    [-1, 1].map((z) => ({
      x:
        lot.x +
        (c * x * b.width * lot.scale) / 2 +
        (s * z * b.depth * lot.scale) / 2,
      z:
        lot.z -
        (s * x * b.width * lot.scale) / 2 +
        (c * z * b.depth * lot.scale) / 2,
    })),
  );
}
/** Bounded street-first study. Parcel boundaries are street centerlines, not terrain. */
export function planAngledDistrict(
  seed = 731,
  riverThrough = false,
  northEdge?: number,
  fullTile = false,
  waterfront?: CityWaterfront,
) {
  const base = planCraftedNeighborhood(),
    lots: CityLot[] = fullTile ? [] : [...base.lots],
    streets: CityStreet[] = fullTile ? [] : [...base.streets];
  const civicLotCount = lots.length;
  // Seed the street skeleton before parcel subdivision or building placement.
  const family = (seed >>> 0) % 4;
  const composition =
    (fullTile ? "civic grid / " : "") +
    (fullTile
      ? ["compact blocks", "broad blocks", "offset blocks", "long blocks"]
      : [
          "diagonal quarter",
          "quay grid",
          "converging avenues",
          "cross-town boulevard",
        ])[family];
  const jitter = (((Math.imul(seed, 1664525) + 1013904223) >>> 8) % 13) - 6;
  const west = [-84, -88, -60, -70][family],
    east = [60, 88, 60, 94][family],
    north =
      northEdge ?? Math.min(-138, [-154, -136, -174, -148][family] + jitter),
    south = -50;
  const riverZ = -94;
  const fractions = family === 1 ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.34, 0.68, 1];
  const cuts = fractions.map(
    (f, i) =>
      west +
      (east - west) * f +
      (i > 0 && i < fractions.length - 1 ? jitter : 0),
  );
  const bridges = fullTile ? [-80, 80] : [cuts[1], cuts.at(-2)!];
  const avenues: CityPoint[][] =
    family === 0
      ? [
          [
            { x: west, z: south },
            { x: east, z: north },
          ],
        ]
      : family === 1
        ? [
            [
              { x: west, z: north + 28 },
              { x: east, z: north + 28 },
            ],
          ]
        : family === 2
          ? [
              [
                { x: west, z: north },
                { x: 0, z: south },
              ],
              [
                { x: east, z: north },
                { x: 0, z: south },
              ],
            ]
          : [
              [
                { x: west, z: north + 12 },
                { x: east, z: south - 8 },
              ],
            ];
  const parcels: {
    kind: "commercial" | "residential" | "industrial";
    portZone?: PortZone;
    boundary: CityPoint[];
    court: CityPoint[];
    lotIndices: number[];
  }[] = [];
  const access: { lotIndex: number; entrance: CityPoint; street: CityPoint }[] =
    [];
  const road = (a: CityPoint, b: CityPoint, width = 3) =>
    streets.push({ points: [a, b], width, alley: false });
  const cityCells: CityPoint[][] = [];
  if (fullTile) {
    // Shared junctions keep neighboring parcels watertight while streets change bearing.
    const noise = (x: number, z: number, salt = 0) =>
      (((Math.imul(seed ^ (x * 7919 + salt), 1664525) ^
        Math.imul(z + salt, 1013904223)) >>>
        0) %
        1001) /
        500 -
      1;
    const junction = (x: number, z: number): CityPoint => {
      if (
        Math.abs(x) === 160 ||
        Math.abs(z) === 160 ||
        z === -101 ||
        z === -87 ||
        (Math.abs(x) <= 38 && z >= -50 && z <= 19)
      )
        return { x, z };
      return { x: x + noise(x, z) * 4.5, z: z + noise(x, z, 97) * 3.5 };
    };
    const xs = [-160, -120 + jitter, -80, -38, 0, 38, 80, 120 + jitter, 160];
    const zs = [
      -160,
      -130 + jitter,
      -101,
      -87,
      -50,
      -10,
      19,
      57,
      90 + jitter,
      125,
      160,
    ];
    const edges = new Set<string>();
    for (let xi = 1; xi < xs.length; xi++)
      for (let zi = 1; zi < zs.length; zi++) {
        const x0 = xs[xi - 1],
          x1 = xs[xi],
          z0 = zs[zi - 1],
          z1 = zs[zi];
        if (z0 === -101 || (x0 >= -38 && x1 <= 38 && z0 >= -50 && z1 <= 19))
          continue;
        const poly = [
          junction(x0, z0),
          junction(x1, z0),
          junction(x1, z1),
          junction(x0, z1),
        ];
        // Occasional diagonal cross streets create smaller corner blocks.
        if (
          z0 > 57 &&
          ((zi === 9 && xi === 2 + ((seed >>> 0) % 5)) ||
            (xi * 7 + zi * 3 + (seed >>> 0)) % 11 === 0)
        ) {
          cityCells.push(
            [poly[0], poly[1], poly[2]],
            [poly[0], poly[2], poly[3]],
          );
          road(poly[0], poly[2]);
        } else cityCells.push(poly);
        for (let i = 0; i < 4; i++) {
          const a = poly[i],
            b = poly[(i + 1) % 4];
          const key = [JSON.stringify(a), JSON.stringify(b)].sort().join("/");
          if (!edges.has(key)) {
            edges.add(key);
            road(a, b);
          }
        }
      }
    for (const x of bridges) road({ x, z: -101 }, { x, z: -87 });
    // Urban frontage parcels surround only the actual hall square, not the old town template.
    const rectangle = (x0: number, x1: number, z0: number, z1: number) => [
      { x: x0, z: z0 },
      { x: x1, z: z0 },
      { x: x1, z: z1 },
      { x: x0, z: z1 },
    ];
    cityCells.push(
      rectangle(-38, -24, -50, 19),
      rectangle(24, 38, -50, 19),
      rectangle(-24, 24, -50, -18),
    );
    for (const x of [-24, 24]) road({ x, z: -50 }, { x, z: 19 });
    road({ x: -24, z: -18 }, { x: 24, z: -18 });
  } else {
    for (const avenue of avenues) road(avenue[0], avenue[1], 4);
    for (const x of cuts) road({ x, z: north }, { x, z: south });
    for (const z of [north, south]) road({ x: west, z }, { x: east, z });
    for (const [i, x] of [-24, 24].entries())
      road({ x: bridges[i], z: south }, { x, z: -41 });
  }
  if (riverThrough) {
    if (!fullTile)
      for (const z of [riverZ - 7, riverZ + 7])
        road({ x: west, z }, { x: east, z });
    // Only the two short cross streets receive bridges. Other approaches stop at the quays.
    const original = [...streets];
    streets.length = 0;
    for (const street of original) {
      const a = street.points[0],
        b = street.points.at(-1)!;
      if (
        (a.z - riverZ) * (b.z - riverZ) >= 0 ||
        (a.x === b.x && bridges.includes(a.x))
      ) {
        streets.push(street);
        continue;
      }
      const first = riverZ + Math.sign(a.z - riverZ) * 7,
        last = riverZ + Math.sign(b.z - riverZ) * 7;
      const at = (z: number) => ({
        x: a.x + ((b.x - a.x) * (z - a.z)) / (b.z - a.z),
        z,
      });
      streets.push(
        { ...street, points: [a, at(first)] },
        { ...street, points: [at(last), b] },
      );
    }
  }
  for (
    let column = 0;
    column < (fullTile ? cityCells.length : cuts.length - 1);
    column++
  ) {
    const rect = [
      { x: cuts[column], z: north },
      { x: cuts[column + 1], z: north },
      { x: cuts[column + 1], z: south },
      { x: cuts[column], z: south },
    ];
    const clean = (boundary: CityPoint[]) =>
      boundary.filter(
        (p, i) =>
          Math.hypot(
            p.x - boundary[(i + 1) % boundary.length].x,
            p.z - boundary[(i + 1) % boundary.length].z,
          ) > 1e-6,
      );
    let pieces = [fullTile ? cityCells[column] : rect];
    for (const [a, b] of fullTile ? [] : avenues)
      pieces = pieces
        .flatMap((poly) => [
          clean(clipBlock(poly, a, b)),
          clean(clipBlock(poly, b, a)),
        ])
        .filter((poly) => poly.length >= 3);
    for (const poly of pieces) {
      const polygons = riverThrough
        ? [
            clipBlock(
              poly,
              { x: east, z: riverZ - 7 },
              { x: west, z: riverZ - 7 },
            ),
            clipBlock(
              poly,
              { x: west, z: riverZ + 7 },
              { x: east, z: riverZ + 7 },
            ),
          ].filter((p) => p.length >= 3)
        : [poly];
      for (const poly of polygons) {
        const center = poly.reduce(
          (a, p) => ({
            x: a.x + p.x / poly.length,
            z: a.z + p.z / poly.length,
          }),
          { x: 0, z: 0 },
        );
        const portZone = fullTile
          ? portZoneForParcel(poly, waterfront)
          : undefined;
        const kind: "commercial" | "residential" | "industrial" = portZone
          ? portZone === "harbor-market"
            ? "commercial"
            : "industrial"
          : fullTile
            ? Math.abs(center.z - riverZ) < 40 && Math.abs(center.x) > 65
              ? "industrial"
              : Math.hypot(center.x, center.z) < 100
                ? "commercial"
                : "residential"
            : Math.abs(center.z - riverZ) < 32 &&
                (family % 2 ? center.x > 20 : center.x < -20)
              ? "industrial"
              : center.z > riverZ || Math.abs(center.x) < 22
                ? "commercial"
                : "residential";
        const parcel = {
          kind,
          portZone,
          boundary: poly,
          court: kind === "industrial" ? [] : insetBlock(poly, 17),
          lotIndices: [] as number[],
        };
        for (let edge = 0; edge < poly.length; edge++) {
          const a = poly[edge],
            b = poly[(edge + 1) % poly.length],
            length = Math.hypot(b.x - a.x, b.z - a.z);
          const tx = (b.x - a.x) / length,
            tz = (b.z - a.z) / length,
            nx = -tz,
            nz = tx;
          const slots = Math.floor((length - 8) / 4.9);
          // Reserve the broad landmark/works site first, then fill smaller frontages around it.
          const priority = Math.floor(slots / 2);
          const order = Array.from({ length: slots }, (_, i) => i).sort(
            (a, b) => Number(b === priority) - Number(a === priority),
          );
          for (const i of order) {
            const along = length / 2 + (i - (slots - 1) / 2) * 4.9;
            const street = { x: a.x + tx * along, z: a.z + tz * along };
            let variant =
              kind === "industrial"
                ? ["warehouse", "mill", "boilerHouse"][(i + edge) % 3]
                : kind === "commercial"
                  ? i === priority &&
                    !parcel.lotIndices.some((i) =>
                      lots[i].variant.startsWith("commercialTower"),
                    )
                    ? "commercialTower"
                    : "urbanShop"
                  : ["urbanCourt", "urbanRed", "urbanTenement", "urbanHome"][
                      (i + edge + (seed >>> 0)) % 4
                    ];
            if (fullTile) {
              const choice = ((seed >>> 0) + i * 7 + edge * 3 + column) >>> 0;
              if (variant === "commercialTower")
                variant = [
                  "commercialTower",
                  "commercialTowerCopper",
                  "commercialTowerClock",
                  "commercialTowerIron",
                  "commercialTowerCrown",
                ][choice % 5];
              else if (variant.startsWith("urban") && choice % 3 !== 0)
                variant = [
                  "urbanMansard",
                  "urbanGable",
                  "urbanArcade",
                  "urbanCopper",
                  "urbanBay",
                ][choice % 5];
              else if (variant === "warehouse")
                variant = choice % 2 ? "warehouseFoundry" : "warehouseEngine";
            }
            if (portZone)
              variant =
                portVariants(portZone)[
                  ((seed >>> 0) + i + edge) % portVariants(portZone).length
                ];
            const setback =
              2.9 + (cityBuildingEnvelope(variant).depth * 0.85) / 2;
            const lot: CityLot = {
              x: street.x + nx * setback,
              z: street.z + nz * setback,
              angle: Math.atan2(-nx, -nz),
              scale: 0.85,
              heightScale:
                kind === "industrial" || variant.startsWith("commercialTower")
                  ? fullTile && variant.startsWith("commercialTower")
                    ? 1 +
                      Math.max(0, 1 - Math.hypot(center.x, center.z) / 115) *
                        0.7
                    : 1
                  : 0.85 + (((i + edge + seed) >>> 0) % 3) * 0.13,
              variant,
              fullEnvelope: true,
            };
            if (!lotCorners(lot).every((p) => blockContains(poly, p, 2.8)))
              continue;
            const front =
              (cityBuildingFootprint(lot.variant).depth * lot.scale) / 2;
            const entrance = { x: lot.x - nx * front, z: lot.z - nz * front };
            const path = {
              points: [entrance, street],
              width: 1.25,
              alley: true,
            };
            if (
              streets.some((s) => lotIntersectsStreet(lot, s)) ||
              lots.some(
                (p) => lotsOverlap(p, lot) || lotIntersectsStreet(p, path),
              ) ||
              access.some((p) =>
                lotIntersectsStreet(lot, {
                  points: [p.entrance, p.street],
                  width: 1.25,
                  alley: true,
                }),
              )
            )
              continue;
            parcel.lotIndices.push(lots.length);
            access.push({ lotIndex: lots.length, entrance, street });
            lots.push(lot);
          }
        }
        parcels.push(parcel);
      }
    }
  }
  // Unit-spaced segments retain the renderer's lamp and road sampling convention.
  for (const street of streets) {
    const points: CityPoint[] = [];
    for (let i = 1; i < street.points.length; i++) {
      const a = street.points[i - 1],
        b = street.points[i],
        n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
      for (let j = 0; j < n; j++)
        points.push({
          x: a.x + ((b.x - a.x) * j) / n,
          z: a.z + ((b.z - a.z) * j) / n,
        });
    }
    points.push(street.points.at(-1)!);
    street.points = points;
  }
  return {
    ...base,
    lots,
    civicLotCount,
    waterfront:
      fullTile &&
      waterfront?.kind === "ocean" &&
      parcels.some((p) => p.portZone)
        ? waterfront
        : undefined,
    portInfrastructure: portInfrastructure(waterfront, parcels),
    rivers: riverThrough
      ? [
          ...(fullTile ? [] : base.rivers),
          [
            { x: -165, z: riverZ },
            { x: 165, z: riverZ },
          ],
        ]
      : base.rivers,
    streets,
    parcels,
    access,
    districts: [],
    trees: [
      ...(fullTile ? [] : base.trees),
      ...parcels.flatMap<CityLot>((p, i) => {
        if (p.court.length < 3) return [];
        const center = p.court.reduce(
          (a, v) => ({
            x: a.x + v.x / p.court.length,
            z: a.z + v.z / p.court.length,
          }),
          { x: 0, z: 0 },
        );
        return blockContains(p.court, center, 2.5)
          ? [
              {
                ...center,
                angle: 0,
                scale: 0.7,
                variant: i % 2 ? "pine" : "tree",
              },
            ]
          : [];
      }),
    ],
    composition,
    extent: fullTile
      ? 164
      : Math.max(150, Math.abs(north) + 12, east + 12, -west + 12),
    sample: "angled",
  };
}

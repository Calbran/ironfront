import * as T from "three";
import { shoreAt } from "../../../../packages/game-core/src/portDistrict";
import type {
  CityWaterfront,
  portInfrastructure,
} from "../../../../packages/game-core/src/portDistrict";

/** Small baked harbor kit; dimensions and materials match the existing city models. */
export function portWaterfront(
  coast: CityWaterfront,
  piers: ReturnType<typeof portInfrastructure>,
  m: Record<
    "water" | "stone" | "wood" | "iron" | "brass" | "roof" | "brick",
    T.Material
  >,
) {
  const parts: { geometry: T.BufferGeometry; material: T.Material }[] = [];
  const add = (
    geometry: T.BufferGeometry,
    material: T.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    geometry.translate(x, y, z);
    parts.push({ geometry, material });
  };
  const box = (
    material: T.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) => add(new T.BoxGeometry(w, h, d), material, x, y, z);
  const beam = (
    material: T.Material,
    a: T.Vector3,
    b: T.Vector3,
    width: number,
  ) => {
    const g = new T.CylinderGeometry(width, width, a.distanceTo(b), 5);
    g.applyQuaternion(
      new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        b.clone().sub(a).normalize(),
      ),
    );
    add(g, material, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  };
  // Open ocean continues beyond the city tile; it has no opposite bank.
  const coastline = coast.shoreline ?? [
    { x: coast.minX, z: coast.shoreZ },
    { x: coast.maxX, z: coast.shoreZ },
  ];
  const waterEdge = [
    { x: -600, z: coastline[0].z },
    ...coastline,
    { x: 600, z: coastline.at(-1)!.z },
  ];
  const vertices: number[] = [];
  for (let i = 1; i < waterEdge.length; i++) {
    const a = waterEdge[i - 1],
      b = waterEdge[i],
      far = coast.shoreZ + 620;
    vertices.push(
      a.x,
      0,
      a.z,
      b.x,
      0,
      far,
      b.x,
      0,
      b.z,
      a.x,
      0,
      a.z,
      a.x,
      0,
      far,
      b.x,
      0,
      far,
    );
  }
  const ocean = new T.BufferGeometry();
  ocean.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  ocean.setAttribute(
    "uv",
    new T.Float32BufferAttribute(
      vertices.flatMap((_, i) =>
        i % 3 === 0 ? [vertices[i] / 16, vertices[i + 2] / 16] : [],
      ),
      2,
    ),
  );
  ocean.computeVertexNormals();
  add(ocean, m.water, 0, -1.3, 0);
  for (let x = coast.minX; x < coast.maxX; x += 4) {
    const end = Math.min(coast.maxX, x + 4),
      a = { x, z: shoreAt(coast, x) },
      b = { x: end, z: shoreAt(coast, end) };
    const angle = -Math.atan2(b.z - a.z, b.x - a.x),
      length = Math.hypot(b.x - a.x, b.z - a.z);
    for (const [material, y, h, w] of [
      [m.brick, -0.75, 1.9, 0.9],
      [m.stone, 0.18, 0.35, 1.3],
    ] as const) {
      const g = new T.BoxGeometry(length + 0.03, h, w).rotateY(angle);
      add(g, material, (a.x + b.x) / 2, y, (a.z + b.z) / 2 - 0.15);
    }
  }
  for (const [i, p] of piers.entries()) {
    const firstPart = parts.length;
    const z = p.z + p.length / 2;
    box(m.stone, p.x, 0.06, p.z - 1.1, p.width, 0.22, 2.1);
    box(m.wood, p.x, 0.12, z, p.width, 0.35, p.length);
    for (let dz = 1; dz < p.length; dz += 0.75)
      box(m.iron, p.x, 0.303, p.z + dz, p.width, 0.016, 0.035);
    for (const side of [-1, 1])
      for (let dz = 1; dz < p.length; dz += 5) {
        add(
          new T.CylinderGeometry(0.23, 0.3, 2.8, 7),
          m.wood,
          p.x + side * (p.width / 2 - 0.35),
          -0.95,
          p.z + dz,
        );
        add(
          new T.CylinderGeometry(0.23, 0.3, 0.48, 8),
          m.iron,
          p.x + side * (p.width / 2 - 0.55),
          0.56,
          p.z + dz,
        );
      }
    // Riveted dock crane: open truss mast, angled jib, winch house and hanging hook.
    const cx = p.x - 1.4,
      cz = p.z + 5;
    box(m.stone, cx, 0.52, cz, 2.2, 0.5, 2.2);
    for (const side of [-1, 1]) {
      beam(
        m.iron,
        new T.Vector3(cx + side * 0.7, 0.7, cz),
        new T.Vector3(cx + side * 0.42, 8, cz),
        0.13,
      );
      for (let level = 1; level < 7; level += 1.7)
        beam(
          m.iron,
          new T.Vector3(cx + side * 0.6, level, cz),
          new T.Vector3(cx - side * 0.5, level + 1.7, cz),
          0.075,
        );
    }
    beam(
      m.iron,
      new T.Vector3(cx, 7.8, cz),
      new T.Vector3(cx + 6.8, 9.5, cz),
      0.18,
    );
    beam(
      m.iron,
      new T.Vector3(cx, 5.5, cz),
      new T.Vector3(cx + 6.8, 9.5, cz),
      0.12,
    );
    beam(
      m.brass,
      new T.Vector3(cx + 6.8, 9.5, cz),
      new T.Vector3(cx + 6.8, 2.2, cz),
      0.035,
    );
    box(m.iron, cx + 6.8, 2.1, cz, 0.3, 0.35, 0.2);
    box(m.brick, cx, 1.6, cz, 1.6, 1.6, 1.4);
    box(m.roof, cx, 2.48, cz, 1.8, 0.18, 1.6);
    for (let n = 0; n < 5; n++) {
      const x = p.x + (n % 2 ? 1.7 : -1.6),
        zz = p.z + 11 + Math.floor(n / 2) * 2.7;
      box(m.wood, x, 0.9, zz, 1.45, 1.15, 1.35);
      for (const dx of [-0.5, 0.5])
        box(m.iron, x + dx, 0.91, zz, 0.045, 1.2, 1.39);
    }
    if (i % 2 === 0) {
      // Coastal steam lighter: dark hull, timber hold, compact cream deckhouse.
      const sx = p.x + 9,
        sz = p.z + 12;
      const hull = new T.Shape();
      hull.moveTo(-2.6, -9);
      hull.lineTo(2.6, -9);
      hull.lineTo(2.8, 6);
      hull.lineTo(0, 11);
      hull.lineTo(-2.8, 6);
      hull.closePath();
      const g = new T.ExtrudeGeometry(hull, {
        depth: 1.6,
        bevelEnabled: false,
      }).rotateX(-Math.PI / 2);
      add(g, m.iron, sx, -1.15, sz);
      box(m.wood, sx, 0.49, sz, 4.4, 0.12, 12);
      box(m.stone, sx, 1.5, sz + 6, 3.5, 2, 3.3);
      box(m.roof, sx, 2.59, sz + 6, 3.8, 0.2, 3.6);
      box(m.iron, sx, 3.2, sz + 4.7, 0.7, 2.4, 0.7);
      for (const dx of [-1, 0, 1])
        box(m.roof, sx + dx, 1.9, sz + 7.67, 0.55, 0.65, 0.04);
      for (const dz of [-4, -1, 2])
        box(m.wood, sx, 0.95, sz + dz, 2.9, 0.85, 1.7);
    }
    for (const part of parts.slice(firstPart))
      part.geometry
        .translate(-p.x, 0, -p.z)
        .rotateY(p.angle)
        .translate(p.x, 0, p.z);
  }
  return parts;
}

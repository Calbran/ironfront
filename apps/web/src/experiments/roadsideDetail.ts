import {
  countryRoadSurfaceHeight,
  countryRoadWidthAt,
} from "../../../../packages/game-core/src/countryRoadNetwork";
import * as T from "three";
import type { CountryRoadNetwork } from "../../../../packages/game-core/src/countryRoadNetwork";
import type { TerrainSurface } from "../../../../packages/game-core/src/connectedTerrain";

/** Stream roadside furniture in model-space tiles, with continuous distance along each road. */
export function createRoadsideDetail(
  root: T.Group,
  network: CountryRoadNetwork,
  surface: TerrainSurface,
  point: (x: number, y: number, h?: number) => T.Vector3,
) {
  const tileSize = 240,
    radius = 720;
  const roads = network.roads.map((r) => {
    const points = r.path.map((p) => point(p.x, p.y, 0)),
      distances = [0];
    for (let i = 1; i < points.length; i++)
      distances.push(distances[i - 1] + points[i].distanceTo(points[i - 1]));
    return { ...r, points, distances, length: distances.at(-1)! };
  });
  type Span = { road: number; lo: number; hi: number };
  const tiles = new Map<string, Span[]>();
  roads.forEach((r, road) => {
    for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1],
        b = r.points[i];
      for (
        let x = Math.floor(Math.min(a.x, b.x) / tileSize);
        x <= Math.floor(Math.max(a.x, b.x) / tileSize);
        x++
      )
        for (
          let z = Math.floor(Math.min(a.z, b.z) / tileSize);
          z <= Math.floor(Math.max(a.z, b.z) / tileSize);
          z++
        ) {
          const key = `${x}:${z}`,
            list = tiles.get(key) ?? [];
          list.push({ road, lo: r.distances[i - 1], hi: r.distances[i] });
          tiles.set(key, list);
        }
    }
  });
  const box = new T.BoxGeometry(1, 1, 1),
    materials = [0xaba89a, 0xd2c8a5, 0x66513c, 0x333b38].map(
      (color) => new T.MeshStandardMaterial({ color, roughness: 1 }),
    );
  materials[1].polygonOffset = true;
  materials[1].polygonOffsetFactor = -4;
  materials[1].polygonOffsetUnits = -8;
  const wireMat = new T.LineBasicMaterial({ color: 0x313b39 });
  const loaded = new Map<string, { group: T.Group; dispose: () => void }>();
  const sample = (ri: number, d: number, offset = 0) => {
    const r = roads[ri];
    d = Math.max(0, Math.min(r.length, d));
    let lo = 1,
      hi = r.distances.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (r.distances[mid] < d) lo = mid + 1;
      else hi = mid;
    }
    const i = lo;
    const a = r.points[i - 1],
      b = r.points[i],
      length = r.distances[i] - r.distances[i - 1] || 1,
      t = (d - r.distances[i - 1]) / length;
    const x =
      r.path[i - 1].x +
      (r.path[i].x - r.path[i - 1].x) * t -
      (((b.z - a.z) / length) * offset) / network.scale;
    const y =
      r.path[i - 1].y +
      (r.path[i].y - r.path[i - 1].y) * t +
      (((b.x - a.x) / length) * offset) / network.scale;
    return point(
      x,
      y,
      countryRoadSurfaceHeight(network, surface, { x, y }),
    );
  };
  function build(key: string, spans: Span[]) {
    const group = new T.Group(),
      matrices: T.Matrix4[][] = [[], [], [], []],
      wires: number[] = [];
    const pose = new T.Object3D();
    const beam = (
      a: T.Vector3,
      b: T.Vector3,
      width: number,
      height: number,
      mat: number,
    ) => {
      const delta = b.clone().sub(a);
      if (delta.length() < 0.001) return;
      pose.position.copy(a).add(b).multiplyScalar(0.5);
      pose.quaternion.setFromUnitVectors(
        new T.Vector3(1, 0, 0),
        delta.clone().normalize(),
      );
      pose.scale.set(delta.length(), height, width);
      pose.updateMatrix();
      matrices[mat].push(pose.matrix.clone());
    };
    const owns = (p: T.Vector3) =>
      `${Math.floor(p.x / tileSize)}:${Math.floor(p.z / tileSize)}` === key;
    const seen = new Set<string>();
    for (const span of spans) {
      const r = roads[span.road];
      for (
        let d = Math.floor(span.lo / 2) * 2;
        d < Math.min(r.length, span.hi + 2);
        d += 2
      ) {
        const id = `c:${span.road}:${d}`,
          p = sample(span.road, d);
        if (seen.has(id) || !owns(p)) continue;
        seen.add(id);
        // Leave road junctions open; curbs belong along edges, never across a branch.
        if (d < r.width || d > r.length - r.width) continue;
        for (const side of [-1, 1]) {
          const a = sample(
              span.road,
              d,
              side * (countryRoadWidthAt(r, d) / 2 + 0.18),
            ),
            b = sample(
              span.road,
              Math.min(r.length, d + 2),
              side * (countryRoadWidthAt(r, d) / 2 + 0.18),
            );
          const crosses = spans.some(
            (other) =>
              other.road !== span.road &&
              (() => {
                const otherRoad = roads[other.road];
                return otherRoad.points.slice(1).some((v, i) => {
                  const u = otherRoad.points[i],
                    dx = v.x - u.x,
                    dz = v.z - u.z,
                    t = Math.max(
                      0,
                      Math.min(
                        1,
                        ((a.x - u.x) * dx + (a.z - u.z) * dz) /
                          (dx * dx + dz * dz || 1),
                      ),
                    );
                  return (
                    Math.hypot(a.x - u.x - dx * t, a.z - u.z - dz * t) <
                    otherRoad.width / 2 + 0.4
                  );
                });
              })(),
          );
          if (!crosses) {
            a.y += 0.17;
            b.y += 0.17;
            beam(a, b, 0.32, 0.2, 0);
          }
        }
        if (r.highway && d % 8 < 4) {
          const a = sample(span.road, d),
            b = sample(span.road, Math.min(d + 2, r.length));
          a.y += 0.205;
          b.y += 0.205;
          beam(a, b, 0.12, 0.015, 1);
        }
      }
      const poles: number[] = [];
      for (
        let d = Math.floor(span.lo / 24) * 24;
        d <= Math.min(r.length, span.hi + 24);
        d += 24
      )
        poles.push(d);
      if (span.hi >= r.length - 1e-6) poles.push(r.length);
      for (const d of poles) {
        const id = `p:${span.road}:${d}`,
          p = sample(span.road, d, countryRoadWidthAt(r, d) / 2 + 1.3);
        if (seen.has(id) || !owns(p)) continue;
        seen.add(id);
        const top = p.clone().add(new T.Vector3(0, 4.2, 0));
        beam(p, top, 0.13, 0.13, 2);
        const tangent = sample(span.road, Math.min(d + 1, r.length))
          .sub(sample(span.road, Math.max(0, d - 1)))
          .normalize();
        const cross = new T.Vector3(-tangent.z, 0, tangent.x);
        beam(
          top.clone().addScaledVector(cross, -0.65),
          top.clone().addScaledVector(cross, 0.65),
          0.12,
          0.1,
          2,
        );
        const next = Math.min(r.length, d + 24);
        if (next <= d) continue;
        const end = sample(
          span.road,
          next,
          countryRoadWidthAt(r, next) / 2 + 1.3,
        ).add(new T.Vector3(0, 4.2, 0));
        const endTangent = sample(span.road, Math.min(next + 1, r.length))
          .sub(sample(span.road, Math.max(0, next - 1)))
          .normalize();
        const endCross = new T.Vector3(-endTangent.z, 0, endTangent.x);
        for (const side of [-0.5, 0.5])
          for (let k = 0; k < 8; k++)
            for (const t of [k / 8, (k + 1) / 8]) {
              const v = top
                .clone()
                .lerp(end, t)
                .addScaledVector(cross, side * (1 - t))
                .addScaledVector(endCross, side * t);
              v.y -= Math.sin(t * Math.PI) * 0.35;
              wires.push(v.x, v.y, v.z);
            }
      }
    }
    const instances = matrices.map((list, i) => {
      const mesh = new T.InstancedMesh(box, materials[i], list.length);
      list.forEach((m, j) => mesh.setMatrixAt(j, m));
      mesh.computeBoundingSphere();
      group.add(mesh);
      return mesh;
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(wires, 3));
    group.add(new T.LineSegments(geo, wireMat));
    root.add(group);
    return {
      group,
      dispose() {
        group.removeFromParent();
        instances.forEach((m) => m.dispose());
        geo.dispose();
      },
    };
  }
  let last = "";
  return {
    update(camera: T.Camera, target: T.Vector3) {
      const close = camera.position.distanceTo(target) < 2200,
        cx = Math.floor(target.x / tileSize),
        cz = Math.floor(target.z / tileSize),
        stamp = `${close}:${cx}:${cz}`;
      if (stamp === last) return;
      last = stamp;
      const wanted = new Set<string>();
      if (close)
        for (let x = cx - 3; x <= cx + 3; x++)
          for (let z = cz - 3; z <= cz + 3; z++)
            if (Math.hypot(x - cx, z - cz) * tileSize <= radius) {
              const key = `${x}:${z}`;
              if (tiles.has(key)) wanted.add(key);
            }
      for (const [key, value] of loaded)
        if (!wanted.has(key)) {
          value.dispose();
          loaded.delete(key);
        }
      for (const key of wanted)
        if (!loaded.has(key)) loaded.set(key, build(key, tiles.get(key)!));
    },
    dispose() {
      loaded.forEach((v) => v.dispose());
      box.dispose();
      materials.forEach((m) => m.dispose());
      wireMat.dispose();
    },
  };
}

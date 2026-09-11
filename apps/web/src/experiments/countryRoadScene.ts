import { countryRoadWidthAt } from "../../../../packages/game-core/src/countryRoadNetwork";
import { createStreetTexture } from "./streetTexture";
import { createRoadsideDetail } from "./roadsideDetail";
import * as T from "three";
import type {
  CountryRoadNetwork,
  RoadPoint,
} from "../../../../packages/game-core/src/countryRoadNetwork";
import {
  terrainHeight,
  type TerrainSurface,
} from "../../../../packages/game-core/src/connectedTerrain";

/** Split at lattice axes and diagonals so the carriageway follows exact terrain triangles. */
export function drapedRoadPoints(path: RoadPoint[], step: number): RoadPoint[] {
  const points: RoadPoint[] = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i],
      times = new Set([0, 1]);
    for (const [start, end] of [
      [a.x, b.x],
      [a.y, b.y],
      [a.x + a.y, b.x + b.y],
    ]) {
      if (Math.abs(end - start) < 1e-9) continue;
      for (
        let k = Math.floor(Math.min(start, end) / step) + 1;
        k * step < Math.max(start, end);
        k++
      )
        times.add((k * step - start) / (end - start));
    }
    const sorted = [...times].sort((a, b) => a - b);
    for (const t of sorted) {
      if (i > 1 && t === 0) continue;
      points.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return points;
}

export function createCountryRoadScene(
  scene: T.Scene,
  network: CountryRoadNetwork,
  surface: TerrainSurface,
  point: (x: number, y: number, h?: number) => T.Vector3,
) {
  const root = new T.Group();
  scene.add(root);
  const geometries: T.BufferGeometry[] = [],
    materials: T.Material[] = [],
    ribbons: T.Mesh[] = [];
  const material = (color: number) => {
    const m = new T.MeshStandardMaterial({ color, roughness: 1 });
    materials.push(m);
    return m;
  };
  const highwayMat = material(0xc4c6bd),
    localMat = material(0xbabbb0),
    shoulderMat = material(0x706954),
    bridgeMat = material(0x777566),
    railMat = material(0x4d534a);
  // Explicit depth ordering prevents coplanar shoulders/terrain showing through at campaign zoom.
  shoulderMat.polygonOffset = true;
  shoulderMat.polygonOffsetFactor = -1;
  shoulderMat.polygonOffsetUnits = -2;
  for (const m of [highwayMat, localMat]) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = -3;
    m.polygonOffsetUnits = -6;
  }
  const streetTexture = createStreetTexture();
  for (const m of [highwayMat, localMat]) {
    m.map = streetTexture;
    m.bumpMap = streetTexture;
    m.bumpScale = 0.018;
  }
  function ribbon(highway: boolean, shoulder: boolean) {
    const positions: number[] = [],
      indices: number[] = [];
    for (const road of network.roads) {
      if (road.highway !== highway) continue;
      const path = drapedRoadPoints(road.path, surface.step);
      if (path.length < 2) continue;
      const base = positions.length / 3;
      let distance = 0;
      for (let i = 0; i < path.length; i++) {
        if (i)
          distance +=
            Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y) *
            network.scale;
        const half =
          (countryRoadWidthAt(road, distance) + (shoulder ? 1 : 0)) /
          2 /
          network.scale;
        const p = path[i],
          a = path[Math.max(0, i - 1)],
          b = path[Math.min(path.length - 1, i + 1)];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1,
          nx = -(b.y - a.y) / len,
          ny = (b.x - a.x) / len;
        for (const sign of [-1, 1]) {
          const x = p.x + nx * half * sign,
            y = p.y + ny * half * sign,
            v = point(
              x,
              y,
              terrainHeight(surface, x, y) + (shoulder ? 0.065 : 0.17),
            );
          for (const bridge of network.bridges) {
            const dx = (x - bridge.x) * network.scale,
              dy = (y - bridge.y) * network.scale,
              c = Math.cos(bridge.angle),
              s = Math.sin(bridge.angle),
              along = Math.abs(dx * c + dy * s),
              across = Math.abs(-dx * s + dy * c),
              ramp = Math.max(
                0,
                Math.min(1, (bridge.length / 2 + 8 - along) / 8),
              );
            if (ramp && across <= bridge.width / 2 + 1) {
              const deckTop =
                point(
                  bridge.x,
                  bridge.y,
                  Math.max(0, terrainHeight(surface, bridge.x, bridge.y)),
                ).y + 0.395;
              v.y = Math.max(
                v.y,
                v.y + (deckTop + (shoulder ? 0.005 : 0.02) - v.y) * ramp,
              );
            }
          }
          positions.push(v.x, v.y, v.z);
        }
        if (i) {
          const j = base + i * 2;
          indices.push(j - 2, j - 1, j, j, j - 1, j + 1);
        }
      }
      // Shared endpoint caps close the wedges where branches meet at an angle.
      for (const p of [path[0], path[path.length - 1]]) {
        if (p === path[0] && road.startWidth !== undefined) continue;
        const half =
          (countryRoadWidthAt(road, p === path[0] ? 0 : distance) +
            (shoulder ? 1 : 0)) /
          2 /
          network.scale;
        const base = positions.length / 3,
          v = point(
            p.x,
            p.y,
            terrainHeight(surface, p.x, p.y) + (shoulder ? 0.065 : 0.17),
          );
        positions.push(v.x, v.y, v.z);
        for (let k = 0; k <= 12; k++) {
          const angle = (k * Math.PI) / 6,
            x = p.x + Math.cos(angle) * half,
            y = p.y + Math.sin(angle) * half,
            q = point(
              x,
              y,
              terrainHeight(surface, x, y) + (shoulder ? 0.065 : 0.17),
            );
          positions.push(q.x, q.y, q.z);
          if (k) indices.push(base, base + k + 1, base + k);
        }
      }
    }
    if (!indices.length) return;
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    const uv: number[] = [];
    for (let i = 0; i < positions.length; i += 3)
      uv.push(positions[i] / 2, positions[i + 2] / 2);
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    geometries.push(g);
    const m = new T.Mesh(
      g,
      shoulder ? shoulderMat : highway ? highwayMat : localMat,
    );
    ribbons.push(m);
    root.add(m);
  }
  ribbon(true, true);
  ribbon(false, true);
  ribbon(true, false);
  ribbon(false, false);
  const mapPositions: number[] = [];
  for (const r of network.roads.filter((r) => r.highway)) {
    const path = drapedRoadPoints(r.path, surface.step);
    for (let i = 1; i < path.length; i++)
      for (const p of [path[i - 1], path[i]]) {
        const v = point(p.x, p.y, terrainHeight(surface, p.x, p.y) + 0.2);
        mapPositions.push(v.x, v.y, v.z);
      }
  }
  const mapGeo = new T.BufferGeometry();
  mapGeo.setAttribute(
    "position",
    new T.Float32BufferAttribute(mapPositions, 3),
  );
  geometries.push(mapGeo);
  const mapMat = new T.LineBasicMaterial({
    color: 0xcabb91,
    transparent: true,
    opacity: 0.65,
  });
  materials.push(mapMat);
  const mapLines = new T.LineSegments(mapGeo, mapMat);
  root.add(mapLines);
  const box = new T.BoxGeometry(1, 1, 1);
  geometries.push(box);
  const deck = new T.InstancedMesh(box, bridgeMat, network.bridges.length),
    rails = new T.InstancedMesh(box, railMat, network.bridges.length * 2),
    pose = new T.Object3D();
  network.bridges.forEach((b, i) => {
    const p = point(b.x, b.y, Math.max(0, terrainHeight(surface, b.x, b.y)));
    pose.position.copy(p);
    pose.position.y += 0.22;
    pose.rotation.set(0, -b.angle, 0);
    pose.scale.set(b.length, 0.35, b.width);
    pose.updateMatrix();
    deck.setMatrixAt(i, pose.matrix);
    for (const [j, sign] of [-1, 1].entries()) {
      pose.position
        .copy(p)
        .add(
          new T.Vector3(
            ((-Math.sin(b.angle) * b.width) / 2) * sign,
            0.65,
            ((Math.cos(b.angle) * b.width) / 2) * sign,
          ),
        );
      pose.scale.set(b.length, 0.65, 0.14);
      pose.updateMatrix();
      rails.setMatrixAt(i * 2 + j, pose.matrix);
    }
  });
  root.add(deck, rails);
  const roadside = createRoadsideDetail(root, network, surface, point);
  return {
    update(camera: T.Camera, target: T.Vector3) {
      roadside.update(camera, target);
      const strategic = camera.position.distanceTo(target) > 1500;
      mapLines.visible = strategic;
      ribbons.forEach((mesh) => (mesh.visible = !strategic));
      deck.visible = rails.visible = !strategic;
      return strategic ? "strategic" : "detailed";
    },
    dispose() {
      roadside.dispose();
      streetTexture.dispose();
      root.removeFromParent();
      deck.dispose();
      rails.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

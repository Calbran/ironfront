import * as T from "three";
import { createMiniatureKit } from "./referenceAssets";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { MiniatureData } from "./miniatureData";
import { WORLD_TO_MODEL as S } from "./miniatureData";
type P = { x: number; z: number };
const distance = (p: P, a: P, b: P) => {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    t = T.MathUtils.clamp(
      ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1),
      0,
      1,
    );
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
};
const noise = (x: number, z: number) =>
  Math.sin(x * 0.39 + Math.sin(z * 0.27)) * Math.cos(z * 0.32) +
  0.35 * Math.sin(x * 1.23 + z * 0.63) +
  0.12 * Math.sin(x * 3.7 - z * 4.3);
export function generatedLandscape(
  scene: T.Scene,
  data: MiniatureData,
  regionMeshes: T.Mesh[],
) {
  const rivers = (data.world.geography?.rivers ?? []).flatMap((r) =>
    r.slice(1).map(
      (b, i) =>
        [
          { x: r[i][0] * S, z: r[i][1] * S },
          { x: b[0] * S, z: b[1] * S },
        ] as const,
    ),
  );
  const nearest = (p: P, lines: readonly (readonly [P, P])[]) =>
    lines.reduce((n, [a, b]) => Math.min(n, distance(p, a, b)), 1e6);
  const city =
    [...data.cities]
      .filter((c) => c.layout.buildings.length >= 6)
      .sort(
        (a, b) =>
          nearest({ x: a.feature.x * S, z: a.feature.y * S }, rivers) -
          nearest({ x: b.feature.x * S, z: b.feature.y * S }, rivers),
      )[0] ?? data.cities[0];
  if (!city) return null;
  const region = data.world.regions[city.region],
    source = regionMeshes.find((m) => m.userData.region === region.id)!;
  const rings = (region.contours ?? [region.polygon]).map((r) =>
    r.map((p) => ({ x: p[0] * S, z: p[1] * S })),
  );
  const edges = rings.flatMap((r) =>
    r.map((b, i) => [r[(i + r.length - 1) % r.length], b] as const),
  );
  const bounds = new T.Box3().setFromObject(source),
    center = bounds.getCenter(new T.Vector3());
  const inside = (p: P) => {
    let hit = false;
    for (const r of rings)
      for (let i = 0, j = r.length - 1; i < r.length; j = i++)
        if (
          r[i].z > p.z !== r[j].z > p.z &&
          p.x <
            ((r[j].x - r[i].x) * (p.z - r[i].z)) / (r[j].z - r[i].z) + r[i].x
        )
          hit = !hit;
    return hit;
  };
  const nearBounds = (p: P, margin = 15) =>
    p.x > bounds.min.x - margin &&
    p.x < bounds.max.x + margin &&
    p.z > bounds.min.z - margin &&
    p.z < bounds.max.z + margin;
  const roads = data.roads
    .flatMap((r) =>
      r.points.slice(1).map(
        (b, i) =>
          [
            { x: r.points[i].x * S, z: r.points[i].y * S },
            { x: b.x * S, z: b.y * S },
          ] as const,
      ),
    )
    .concat(
      data.cities.flatMap((c) =>
        c.layout.roads.flatMap((r) =>
          r.slice(1).map(
            (b, i) =>
              [
                { x: r[i].x * S, z: r[i].y * S },
                { x: b.x * S, z: b.y * S },
              ] as const,
          ),
        ),
      ),
    )
    .filter(([a, b]) => nearBounds(a, 50) || nearBounds(b, 50));
  const localRivers = rivers.filter(
    ([a, b]) => nearBounds(a, 50) || nearBounds(b, 50),
  );
  const buildings = data.cities
    .flatMap((c) => c.layout.buildings)
    .filter((b) => nearBounds({ x: b.x * S, z: b.y * S }, 20));
  const roots = data.scenery.filter((t) =>
    nearBounds({ x: t.x * S, z: t.y * S }, 15),
  );
  function yard(p: P) {
    return buildings.reduce(
      (d, b) =>
        Math.min(
          d,
          Math.hypot(p.x - b.x * S, p.z - b.y * S) -
            Math.max(b.width, b.height) * S * 0.72,
        ),
      1e6,
    );
  }
  function height(x: number, z: number) {
    const p = { x, z };
    if (!nearBounds(p, 0) || !inside(p)) return 0;
    const river = nearest(p, localRivers),
      road = nearest(p, roads),
      clear = Math.min(
        road - 1.5,
        yard(p),
        ...roots.map(
          (t) => Math.hypot(x - t.x * S, z - t.y * S) - t.width * S * 0.32,
        ),
      );
    const edge = T.MathUtils.smoothstep(nearest(p, edges), 0, 5);
    const rolling =
      Math.max(0, 0.5 + noise(x * 0.14, z * 0.14) * 0.7) *
      T.MathUtils.smoothstep(clear, 0, 4);
    return (
      (river < 1.4
        ? -0.65 * (1 - T.MathUtils.smoothstep(river, 0.5, 1.4))
        : rolling) * edge
    );
  }
  const group = new T.Group();
  scene.add(group);
  let winter = false;
  const groundSummer: number[] = [],
    groundWinter: number[] = [],
    vertices: number[] = [],
    dummy = new T.Object3D();
  function vertex(p: P) {
    const road = nearest(p, roads),
      river = nearest(p, localRivers),
      wear = Math.max(
        1 - T.MathUtils.smoothstep(road, 0.6, 2.8),
        1 - T.MathUtils.smoothstep(yard(p), 0, 3),
      );
    const n = noise(p.x, p.z);
    const color = new T.Color("#8e9b60").multiplyScalar(0.95 + n * 0.09);
    color.lerp(new T.Color("#a8976f"), wear * 0.85);
    color.lerp(
      new T.Color("#8d8b77"),
      1 - T.MathUtils.smoothstep(river, 1.1, 3.4),
    );
    const border = T.MathUtils.smoothstep(nearest(p, edges), 0, 5);
    color.lerp(new T.Color("#95a36b"), 1 - border);
    vertices.push(p.x, height(p.x, p.z) + 0.028, p.z);
    color.toArray(groundSummer, groundSummer.length);
    color
      .lerp(
        new T.Color("#e0e5e2").multiplyScalar(1 + n * 0.025),
        0.94 - wear * 0.65,
      )
      .toArray(groundWinter, groundWinter.length);
  }
  function triangle(a: P, b: P, c: P, depth = 0) {
    const edge = Math.max(
      Math.hypot(a.x - b.x, a.z - b.z),
      Math.hypot(a.x - c.x, a.z - c.z),
      Math.hypot(b.x - c.x, b.z - c.z),
    );
    if (edge > 2 && depth < 7) {
      const ab = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
        ac = { x: (a.x + c.x) / 2, z: (a.z + c.z) / 2 },
        bc = { x: (b.x + c.x) / 2, z: (b.z + c.z) / 2 };
      triangle(a, ab, ac, depth + 1);
      triangle(ab, b, bc, depth + 1);
      triangle(ac, bc, c, depth + 1);
      triangle(ab, bc, ac, depth + 1);
    } else {
      vertex(a);
      vertex(b);
      vertex(c);
    }
  }
  const pos = source.geometry.attributes.position,
    index = source.geometry.index;
  for (let i = 0; i < (index?.count ?? pos.count); i += 3) {
    const points = [0, 1, 2].map((k) => {
      const n = index ? index.getX(i + k) : i + k;
      return { x: pos.getX(n), z: pos.getZ(n) };
    });
    triangle(points[0], points[1], points[2]);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new T.Float32BufferAttribute(groundSummer, 3));
  geometry.computeVertexNormals();
  const textureData = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4,
        n =
          220 +
          Math.sin(x * 17.3 + y * 31.7) * 14 +
          noise(x * 0.12, y * 0.12) * 9;
      textureData.set([n, n, n, 255], i);
    }
  const texture = new T.DataTexture(textureData, 128, 128);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.colorSpace = T.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.magFilter = T.LinearFilter;
  texture.needsUpdate = true;
  const material = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    side: T.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.groundGrain = { value: texture };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 groundUV;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ngroundUV=position.xz*.14;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 groundUV;uniform sampler2D groundGrain;",
      )
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.rgb*=texture2D(groundGrain,groundUV).rgb;",
      );
  };
  const mesh = new T.Mesh(geometry, material);
  mesh.receiveShadow = true;
  group.add(mesh);
  const materials: T.MeshStandardMaterial[] = [];
  const mat = (c: string) => {
    const m = new T.MeshStandardMaterial({ color: c, roughness: 1 });
    materials.push(m);
    return m;
  };
  const stone = mat("#929383"),
    shrub = mat("#78884a"),
    grass = mat("#81905b"),
    fence = mat("#756549");
  const rockGeo = new T.IcosahedronGeometry(1, 0),
    shrubGeo = new T.IcosahedronGeometry(1, 1),
    grassGeo = new T.ConeGeometry(0.1, 0.45, 3);
  const parcels = (data.fields ?? [])
    .filter((f) => f.points.every((p) => inside({ x: p.x * S, z: p.y * S })))
    .slice(0, 8);
  const fieldBounds = parcels.map((f) =>
    new T.Box2().setFromPoints(
      f.points.map((p) => new T.Vector2(p.x * S, p.y * S)),
    ),
  );
  const rocks: P[] = [],
    shrubs: P[] = [],
    tufts: P[] = [];
  let seed = 15789;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 1800; i++) {
    const p = {
      x: bounds.min.x + random() * (bounds.max.x - bounds.min.x),
      z: bounds.min.z + random() * (bounds.max.z - bounds.min.z),
    };
    if (
      !inside(p) ||
      yard(p) < 1 ||
      nearest(p, roads) < 1.8 ||
      fieldBounds.some((b) => b.containsPoint(new T.Vector2(p.x, p.z)))
    )
      continue;
    const d = nearest(p, localRivers);
    if (d < 0.8) continue;
    if (d < 3.4 && rocks.length < 180) rocks.push(p);
    else if (noise(p.x * 0.45, p.z * 0.45) > 0.55 && shrubs.length < 220)
      shrubs.push(p);
    else if (tufts.length < 550) tufts.push(p);
  }
  function instances(
    points: P[],
    geo: T.BufferGeometry,
    m: T.Material,
    size: number,
  ) {
    const model = new T.InstancedMesh(geo, m, points.length);
    points.forEach((p, i) => {
      const s = size * (0.7 + random() * 0.7);
      dummy.position.set(p.x, height(p.x, p.z) + s * 0.32, p.z);
      dummy.scale.set(s, s * 0.7, s);
      dummy.rotation.set(0, i * 0.73, 0);
      dummy.updateMatrix();
      model.setMatrixAt(i, dummy.matrix);
      model.setColorAt(i, new T.Color().setScalar(0.8 + random() * 0.3));
    });
    model.computeBoundingSphere();
    model.castShadow = true;
    model.receiveShadow = true;
    group.add(model);
    return model;
  }
  instances(rocks, rockGeo, stone, 0.5);
  instances(shrubs, shrubGeo, shrub, 0.6);
  instances(tufts, grassGeo, grass, 0.65);
  const treeKit = createMiniatureKit(),
    treeModels: T.InstancedMesh[] = [];
  const grove = shrubs
    .filter((p) => yard(p) > 4 && nearest(p, roads) > 3)
    .slice(0, 32);
  for (const part of treeKit.variants.get("tree")!) {
    const model = new T.InstancedMesh(
      part.geometry,
      part.material,
      grove.length,
    );
    grove.forEach((p, i) => {
      dummy.position.set(p.x, height(p.x, p.z), p.z);
      dummy.scale.setScalar(0.42 + (i % 5) * 0.035);
      dummy.rotation.set(0, i * 2.3, 0);
      dummy.updateMatrix();
      model.setMatrixAt(i, dummy.matrix);
    });
    model.castShadow = true;
    model.receiveShadow = true;
    model.userData.snow = part.snow;
    model.visible = !part.snow;
    model.computeBoundingSphere();
    treeModels.push(model);
    group.add(model);
  }
  const fields = parcels.flatMap((f) =>
    (f.fragments ?? [f.points]).map((points, index) => ({
      points: points.map((p) => ({ x: p.x * S, z: p.y * S })),
      boundary:
        index === 0 ? f.points.map((p) => ({ x: p.x * S, z: p.y * S })) : [],
      kind: f.kind,
    })),
  );
  const fieldMaterials: T.MeshStandardMaterial[] = [],
    fences: T.BufferGeometry[] = [];
  for (const field of fields) {
    const shape = new T.Shape(
        field.points.map((p) => new T.Vector2(p.x, -p.z)),
      ),
      g = new T.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setY(i, height(p.getX(i), p.getZ(i)) + 0.065);
    g.computeVertexNormals();
    const m = mat(
      field.kind === "pasture"
        ? "#839554"
        : field.kind === "crop"
          ? "#878854"
          : "#887355",
    );
    m.side = T.DoubleSide;
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec2 fieldUV;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nfieldUV=position.xz;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec2 fieldUV;",
        )
        .replace(
          "#include <color_fragment>",
          "#include <color_fragment>\nfloat furrow=smoothstep(.2,.4,fract((fieldUV.x+fieldUV.y*.22)*2.5));diffuseColor.rgb*=mix(.68,1.03,furrow);",
        );
    };
    const fieldMesh = new T.Mesh(g, m);
    fieldMesh.receiveShadow = true;
    group.add(fieldMesh);
    fieldMaterials.push(m);
    for (let i = 0; i < field.boundary.length; i++) {
      const a = field.boundary[i],
        b = field.boundary[(i + 1) % field.boundary.length],
        len = Math.hypot(a.x - b.x, a.z - b.z),
        steps = Math.ceil(len / 2.8);
      for (let j = 0; j <= steps; j++) {
        const x = T.MathUtils.lerp(a.x, b.x, j / steps),
          z = T.MathUtils.lerp(a.z, b.z, j / steps);
        if (
          !inside({ x, z }) ||
          nearest({ x, z }, roads) < 1.2 ||
          nearest({ x, z }, localRivers) < 2
        )
          continue;
        const pole = new T.BoxGeometry(0.11, 0.85, 0.11);
        pole.translate(x, height(x, z) + 0.43, z);
        fences.push(pole);
        if (j < steps) {
          const rail = new T.BoxGeometry(len / steps, 0.1, 0.09);
          rail.rotateY(-Math.atan2(b.z - a.z, b.x - a.x));
          rail.translate(
            x + (b.x - a.x) / steps / 2,
            height(x, z) + 0.62,
            z + (b.z - a.z) / steps / 2,
          );
          fences.push(rail);
        }
      }
    }
  }
  if (fences.length) {
    const g = mergeGeometries(fences)!;
    fences.forEach((g) => g.dispose());
    const m = new T.Mesh(g, fence);
    m.castShadow = true;
    group.add(m);
  }
  const bridges = data.roads
    .flatMap((r) => r.bridges)
    .filter((b) => inside({ x: b.x * S, z: b.y * S }));
  for (const b of bridges) {
    const bridge = new T.Group(),
      y = height(b.x * S, b.y * S);
    for (const side of [-1, 1]) {
      const rail = new T.Mesh(new T.BoxGeometry(4, 0.5, 0.22), stone);
      rail.position.set(0, 0.5, side * 0.65);
      rail.castShadow = true;
      bridge.add(rail);
    }
    const deck = new T.Mesh(new T.BoxGeometry(4, 0.2, 1.5), stone);
    deck.position.y = 0.15;
    deck.receiveShadow = true;
    bridge.add(deck);
    bridge.position.set(b.x * S, Math.max(y, 0) + 0.04, b.y * S);
    bridge.rotation.y = -b.angle;
    group.add(bridge);
  }
  let enabled = true;
  let patches: T.Object3D[] | undefined;
  return {
    city,
    region: region.id,
    center,
    height,
    stats: {
      triangles: vertices.length / 9,
      fields: parcels.length,
      shrubs: shrubs.length,
      trees: grove.length,
      rocks: rocks.length,
      tufts: tufts.length,
      bridges: bridges.length,
    },
    setEnabled(value: boolean) {
      enabled = value;
    },
    update(
      camera: T.OrthographicCamera,
      isWinter: boolean,
      strategy: boolean,
      land: T.Group,
    ) {
      const active = enabled && !strategy && camera.zoom > 0.8;
      group.visible = active;
      source.visible = !active;
      patches ??= land.children.filter(
        (child) =>
          child.userData.detailPatch &&
          new T.Box3().setFromObject(child).intersectsBox(bounds),
      );
      for (const child of patches) child.visible = active ? false : !strategy;
      if (winter !== isWinter) {
        winter = isWinter;
        treeModels.forEach((m) => (m.visible = !m.userData.snow || winter));
        (geometry.attributes.color.array as Float32Array).set(
          winter ? groundWinter : groundSummer,
        );
        geometry.attributes.color.needsUpdate = true;
        stone.color.set(winter ? "#c4cdc9" : "#929383");
        shrub.color.set(winter ? "#bccac0" : "#78884a");
        grass.color.set(winter ? "#c9d3c8" : "#81905b");
        fieldMaterials.forEach((m) =>
          m.color.set(winter ? "#c0beb0" : "#878854"),
        );
      }
    },
    dispose() {
      scene.remove(group);
      source.visible = true;
      const gs = new Set<T.BufferGeometry>(),
        ms = new Set<T.Material>();
      group.traverse((o) => {
        if (o instanceof T.Mesh) {
          gs.add(o.geometry);
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            ms.add(m),
          );
          if (o instanceof T.InstancedMesh) o.dispose();
        }
      });
      gs.forEach((g) => g.dispose());
      ms.forEach((m) => m.dispose());
      texture.dispose();
      treeKit.dispose();
    },
  };
}

import {
  planOrganicCity,
  lineDistance,
} from "../../../../packages/game-core/src/organicCity";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createMiniatureKit } from "./referenceAssets";
import { bakeInfantry } from "../infantryModel";
import { createJeep } from "../prototypes/jeepModel";
export function cityDiorama(
  host: HTMLElement,
  report: (s: {
    fps: number;
    calls: number;
    triangles: number;
    buildings: number;
  }) => void,
) {
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  host.append(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color("#263933");
  const camera = new T.OrthographicCamera(-110, 110, 90, -90, 0.1, 1500);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableRotate = false;
  controls.enableDamping = true;
  controls.mouseButtons = {
    LEFT: T.MOUSE.PAN,
    MIDDLE: T.MOUSE.PAN,
    RIGHT: T.MOUSE.PAN,
  };
  controls.minZoom = 0.45;
  controls.maxZoom = 8;
  const hemi = new T.HemisphereLight(0xe4ecf5, 0x686342, 2);
  scene.add(hemi);
  const sun = new T.DirectionalLight(0xffe4b6, 3);
  sun.position.set(-80, 140, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -180,
    right: 180,
    top: 180,
    bottom: -180,
    near: 1,
    far: 450,
  });
  sun.shadow.normalBias = 0.06;
  sun.shadow.bias = -0.0002;
  scene.add(sun);
  const kit = createMiniatureKit(),
    rig = bakeInfantry(0),
    dummy = new T.Object3D();
  let group = new T.Group(),
    count = 0,
    extent = 100,
    winter = false,
    disposed = false,
    raf = 0;
  scene.add(group);
  const ownedTextures: T.Texture[] = [];
  const materials: T.Material[] = [],
    geometries: T.BufferGeometry[] = [];
  let winterMeshes: T.Object3D[] = [],
    ground: T.MeshStandardMaterial | undefined;
  const shared = new Set(
    [...kit.variants.values()].flatMap((v) => v.map((p) => p.geometry)),
  );
  const sharedMats = new Set(
    [...kit.variants.values()].flatMap((v) => v.map((p) => p.material)),
  );
  const mat = (color: string) => {
    const m = new T.MeshStandardMaterial({ color, roughness: 0.9 });
    materials.push(m);
    return m;
  };
  function clear() {
    ownedTextures.splice(0).forEach((t) => t.dispose());
    group.traverse((o) => {
      if (o instanceof T.InstancedMesh) o.dispose();
      if (o instanceof T.Mesh) {
        if (
          !shared.has(o.geometry) &&
          !rig.parts.some((p) => p.geometry === o.geometry)
        )
          o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          if (!sharedMats.has(m)) m.dispose();
      }
    });
    scene.remove(group);
    group = new T.Group();
    scene.add(group);
    winterMeshes = [];
    materials.length = 0;
    geometries.length = 0;
  }
  function generate(target = 160) {
    clear();
    count = target;
    const stone = mat("#aba58c"),
      roof = mat("#485b61"),
      wood = mat("#755d42"),
      brass = mat("#bf9c58"),
      path = mat("#b1a17c"),
      paving = mat("#8f9387"),
      soil = mat("#827456"),
      leaves = mat("#778c51");
    ground = mat(winter ? "#dde3dc" : "#8f9c66");
    const batches = new Map<T.Material, T.BufferGeometry[]>();
    const add = (
      g: T.BufferGeometry,
      m: T.Material,
      x: number,
      y: number,
      z: number,
      angle = 0,
    ) => {
      g.rotateY(angle);
      g.translate(x, y, z);
      const gs = batches.get(m) ?? [];
      gs.push(g);
      batches.set(m, gs);
    };
    const box = (
      m: T.Material,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      a = 0,
    ) => add(new T.BoxGeometry(w, h, d), m, x, y, z, a);
    const layout = planOrganicCity(target);
    const lots = layout.lots;
    extent = layout.extent;
    count = lots.length + 1;
    sun.position.set(-extent * 0.8, extent * 1.4, extent * 0.6);
    Object.assign(sun.shadow.camera, {
      left: -extent * 1.5,
      right: extent * 1.5,
      top: extent * 1.5,
      bottom: -extent * 1.5,
      far: extent * 6,
    });
    sun.shadow.camera.updateProjectionMatrix();
    box(ground, 0, -0.65, 0, extent * 2 + 32, 1.2, extent * 2 + 32);
    box(paving, 0, 0.025, 0, 49, 0.1, 42);
    // World-aligned cobbles remain the same size on curved and straight streets.
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#595d59";
    ctx.fillRect(0, 0, 128, 128);
    for (let row = 0; row < 8; row++)
      for (let col = -1; col < 8; col++) {
        const shade = 125 + ((row * 17 + col * 23) % 35);
        ctx.fillStyle = `rgb(${shade + 8},${shade + 6},${shade})`;
        ctx.fillRect(col * 20 + (row % 2) * 10 + 1, row * 16 + 1, 18, 14);
      }
    const cobbles = new T.CanvasTexture(canvas);
    cobbles.wrapS = cobbles.wrapT = T.RepeatWrapping;
    cobbles.colorSpace = T.SRGBColorSpace;
    path.map = cobbles;
    paving.map = cobbles;
    path.bumpMap = cobbles;
    path.bumpScale = 0.06;
    ownedTextures.push(cobbles);
    const ribbon = (
      points: { x: number; z: number }[],
      width: number,
      m: T.Material,
      y: number,
    ) => {
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i],
          dx = b.x - a.x,
          dz = b.z - a.z;
        box(
          m,
          (a.x + b.x) / 2,
          y,
          (a.z + b.z) / 2,
          width,
          0.08,
          Math.hypot(dx, dz) + 0.06,
          Math.atan2(dx, dz),
        );
      }
    };
    const water = mat("#477d84");
    for (const river of layout.rivers) {
      ribbon(river, 7, soil, 0.015);
      ribbon(river, 4, water, 0.075);
    }
    const lampGlass = mat("#efd696");
    lampGlass.emissive.set("#d4a353");
    lampGlass.emissiveIntensity = 0.5;
    for (const street of layout.streets) {
      for (let i = 1; i < street.points.length; i++) {
        const a = street.points[i - 1],
          b = street.points[i],
          p = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
        if (
          (Math.abs(p.x) < 25 && p.z > -22 && p.z < 32) ||
          (p.x > 20 && p.x < 54 && p.z > 23 && p.z < 53)
        )
          continue;
        const bridge = layout.rivers.some((r) => lineDistance(p, r) < 4.5);
        ribbon(
          [a, b],
          street.width,
          bridge ? stone : path,
          bridge ? 0.25 : 0.13,
        );
        if (bridge) {
          const angle = Math.atan2(b.x - a.x, b.z - a.z),
            len = Math.hypot(b.x - a.x, b.z - a.z) + 0.05;
          for (const side of [-1, 1])
            box(
              stone,
              p.x + (Math.cos(angle) * side * street.width) / 2,
              0.65,
              p.z - (Math.sin(angle) * side * street.width) / 2,
              0.25,
              0.65,
              len,
              angle,
            );
        }
        if (!street.alley && !bridge && i % 12 === 0) {
          const dx = b.x - a.x,
            dz = b.z - a.z,
            l = Math.hypot(dx, dz),
            x = p.x + (dz / l) * (street.width / 2 + 0.6),
            z = p.z - (dx / l) * (street.width / 2 + 0.6);
          add(new T.CylinderGeometry(0.16, 0.28, 0.4, 6), roof, x, 0.2, z);
          add(new T.CylinderGeometry(0.07, 0.11, 2.7, 6), brass, x, 1.7, z);
          box(brass, x + 0.35, 3, z, 0.8, 0.12, 0.12);
          box(lampGlass, x + 0.68, 2.8, z, 0.36, 0.5, 0.36);
          add(
            new T.ConeGeometry(0.38, 0.3, 4),
            roof,
            x + 0.68,
            3.2,
            z,
            Math.PI / 4,
          );
          box(brass, x + 0.68, 2.52, z, 0.46, 0.1, 0.46);
        }
      }
    }
    // Capital: raised civic hall, portico, slate roof and a clock tower.
    box(stone, 0, 0.6, -7, 24, 1.2, 16);
    box(stone, 0, 4.6, -7, 21, 8, 13);
    add(
      new T.ConeGeometry(1, 3, 4)
        .rotateY(Math.PI / 4)
        .scale(23 / Math.SQRT2, 1, 15 / Math.SQRT2),
      roof,
      0,
      10,
      -7,
    );
    for (const y of [1.5, 4, 7.6]) box(stone, 0, y, -7, 21.4, 0.2, 13.4);
    box(stone, 0, 9.8, -10, 6, 19.6, 6);
    box(roof, 0, 20, -10, 7, 1, 7);
    add(new T.ConeGeometry(4.8, 5, 4), roof, 0, 23, -10, Math.PI / 4);
    box(brass, 0, 27, -10, 0.2, 5, 0.2);
    box(mat("#345d79"), 1.4, 28, -10, 2.8, 1.5, 0.08);
    for (const x of [-8, -4, 4, 8]) box(stone, x, 3.8, 1, 1, 6, 1);
    box(stone, 0, 7, 1, 21, 0.7, 3);
    for (let i = 0; i < 4; i++)
      box(stone, 0, 0.2 + i * 0.18, 4 - i * 0.6, 15, 0.4 + i * 0.36, 1.6);
    const glass = mat("#344b50");
    for (let x = -8; x <= 8; x += 4)
      for (const z of [-13.6, -0.4]) box(glass, x, 5, z, 1.5, 2.8, 0.08);
    box(wood, 0, 2.6, -0.35, 2.5, 4.2, 0.12);
    add(
      new T.CylinderGeometry(1.2, 1.2, 0.1, 24).rotateX(Math.PI / 2),
      brass,
      0,
      16,
      -6.94,
    ); // clock is mounted separately below
    const clock = new T.Mesh(new T.CircleGeometry(1, 24), mat("#e4dfbd"));
    clock.position.set(0, 16, -6.9);
    group.add(clock);
    box(roof, 0, 16.4, -6.83, 0.08, 0.8, 0.08);
    box(roof, 0.3, 16, -6.82, 0.6, 0.08, 0.08);
    // Market square, monument, gardens and a usable supply-depot yard.
    box(stone, 0, 0.5, 12, 3, 1, 3);
    add(new T.CylinderGeometry(0.45, 0.7, 4, 8), brass, 0, 3, 12);
    for (const x of [-17, 17]) {
      box(leaves, x, 0.08, 12, 7, 0.15, 10);
      box(stone, x, 0.1, 12, 7.5, 0.2, 10.5);
      box(leaves, x, 0.22, 12, 6.7, 0.12, 9.7);
    }
    box(soil, 36, 0.07, 37, 31, 0.12, 26);
    for (let i = 0; i < 10; i++) {
      box(wood, 26 + (i % 5) * 3, 0.6, 29 + Math.floor(i / 5) * 3, 2, 1.2, 2);
      box(
        brass,
        26 + (i % 5) * 3,
        1.23,
        29 + Math.floor(i / 5) * 3,
        2.1,
        0.07,
        0.13,
      );
    }
    for (let i = 0; i < 4; i++) box(wood, 29 + i * 3, 0.5, 44, 2.4, 1, 5);
    // Gardens and workshops rotate with the frontage rather than the world axes.
    for (const p of lots) {
      const local = (x: number, z: number) => ({
        x: p.x + Math.cos(p.angle) * x + Math.sin(p.angle) * z,
        z: p.z - Math.sin(p.angle) * x + Math.cos(p.angle) * z,
      });
      box(soil, p.x, 0.09, p.z, 6 * p.scale, 0.08, 5 * p.scale, p.angle);
      if (p.variant === "home" && Math.hypot(p.x, p.z) > extent * 0.8) {
        const q = local(0, -3.7);
        box(wood, q.x, 0.6, q.z, 7, 0.12, 0.12, p.angle);
        for (const x of [-3.4, 0, 3.4]) {
          const q = local(x, -3.7);
          box(wood, q.x, 0.45, q.z, 0.15, 0.9, 0.15);
        }
      }
    }
    for (const [m, gs] of batches) {
      const g = mergeGeometries(gs)!;
      if (m === path || m === paving) {
        const pos = g.getAttribute("position"),
          uv = g.getAttribute("uv");
        for (let i = 0; i < pos.count; i++)
          uv.setXY(i, pos.getX(i) / 4, pos.getZ(i) / 4);
      }
      gs.forEach((g) => g.dispose());
      const mesh = new T.Mesh(g, m);
      mesh.castShadow =
        m !== ground && m !== path && m !== paving && m !== soil && m !== water;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    const cap = new T.Mesh(
      new T.ConeGeometry(1, 3, 4)
        .rotateY(Math.PI / 4)
        .scale(23.1 / Math.SQRT2, 1, 15.1 / Math.SQRT2),
      mat("#e3e9e4"),
    );
    cap.position.set(0, 10.06, -7);
    cap.visible = winter;
    group.add(cap);
    winterMeshes.push(cap);
    const placements = [...lots, ...layout.trees];
    for (const x of [-17, 17])
      for (const z of [9, 15])
        placements.push({ x, z, angle: 0, scale: 0.55, variant: "tree" });
    for (const variant of new Set(placements.map((p) => p.variant))) {
      const ps = placements.filter((p) => p.variant === variant);
      for (const part of kit.variants.get(variant)!) {
        const mesh = new T.InstancedMesh(
          part.geometry,
          part.material,
          ps.length,
        );
        ps.forEach((p, i) => {
          dummy.position.set(p.x, 0, p.z);
          dummy.scale.setScalar(p.scale);
          dummy.rotation.set(0, p.angle, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.computeBoundingSphere();
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        if (part.snow) {
          mesh.visible = winter;
          winterMeshes.push(mesh);
        }
      }
    }
    const troopMat = mat("#ffffff");
    troopMat.vertexColors = true;
    for (const part of rig.parts) {
      const mesh = new T.InstancedMesh(part.geometry, troopMat, 144);
      for (let i = 0; i < 144; i++) {
        dummy.position.set(
          -10 + (i % 12) * 0.7,
          0,
          19 + Math.floor(i / 12) * 0.75,
        );
        dummy.scale.setScalar(0.55);
        dummy.rotation.set(0, Math.PI, 0);
        dummy.updateMatrix();
        const pose = new T.Matrix4().fromArray(
          rig.walk[0][rig.parts.indexOf(part)],
        );
        mesh.setMatrixAt(i, dummy.matrix.clone().multiply(pose));
      }
      mesh.computeBoundingSphere();
      mesh.castShadow = true;
      group.add(mesh);
    }
    for (let i = 0; i < 2; i++) {
      const jeep = createJeep();
      const obj = jeep.root;
      const model = obj as unknown as T.Object3D;
      model.position.set(30 + i * 7, 0, 39);
      model.scale.setScalar(0.6);
      group.add(model);
    }
    focus("city");
  }
  function focus(view: "city" | "capital" | "depot" | "street") {
    const target =
      view === "depot"
        ? new T.Vector3(36, 0, 37)
        : view === "street"
          ? new T.Vector3(40, 0, -35)
          : new T.Vector3(0, view === "capital" ? 7 : 0, 3);
    controls.target.copy(target);
    camera.position.copy(target).add(new T.Vector3(180, 180, 180));
    camera.zoom = view === "city" ? 85 / extent : view === "capital" ? 2.5 : 4;
    camera.updateProjectionMatrix();
    controls.update();
  }
  function configure(snow: boolean, shadows: boolean) {
    winter = snow;
    winterMeshes.forEach((m) => (m.visible = snow));
    ground?.color.set(snow ? "#dde3dc" : "#8f9c66");
    renderer.shadowMap.enabled = shadows;
  }
  const observer = new ResizeObserver(() => {
    const w = host.clientWidth,
      h = host.clientHeight;
    renderer.setSize(w, h);
    camera.left = (-90 * w) / h;
    camera.right = (90 * w) / h;
    camera.updateProjectionMatrix();
  });
  observer.observe(host);
  let last = performance.now(),
    frames = 0,
    sample:
      | {
          end: number;
          last: number;
          frames: number[];
          calls: number;
          triangles: number;
          resolve: (v: unknown) => void;
        }
      | undefined;
  const render = () => {
    if (disposed) return;
    controls.update();
    const now = performance.now();
    renderer.render(scene, camera);
    frames++;
    if (sample) {
      sample.frames.push(now - sample.last);
      sample.last = now;
      sample.calls = Math.max(sample.calls, renderer.info.render.calls);
      sample.triangles = Math.max(
        sample.triangles,
        renderer.info.render.triangles,
      );
      if (now >= sample.end) {
        const s = sample;
        sample = undefined;
        const times = s.frames.slice(1).sort((a, b) => a - b),
          q = (p: number) => times[Math.floor((times.length - 1) * p)] ?? 0;
        s.resolve({
          buildings: count,
          units: 144,
          p50: q(0.5),
          p95: q(0.95),
          p99: q(0.99),
          over33: times.filter((t) => t > 33.4).length,
          frames: times.length,
          calls: s.calls,
          triangles: s.triangles,
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
        });
      }
    }
    if (now - last > 1000) {
      report({
        fps: Math.round((frames * 1000) / (now - last)),
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        buildings: count,
      });
      last = now;
      frames = 0;
    }
    raf = requestAnimationFrame(render);
  };
  generate();
  render();
  return {
    generate,
    focus,
    configure,
    benchmark(ms = 4000) {
      return new Promise((resolve) => {
        sample = {
          end: performance.now() + ms,
          last: performance.now(),
          frames: [],
          calls: 0,
          triangles: 0,
          resolve,
        };
      });
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      sample?.resolve({ cancelled: true });
      observer.disconnect();
      controls.dispose();
      clear();
      kit.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

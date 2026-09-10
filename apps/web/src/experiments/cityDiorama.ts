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
  sun.shadow.bias=-.0002;
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
    type Placement = {
      x: number;
      z: number;
      angle: number;
      scale: number;
      variant: string;
    };
    const lots: Placement[] = [];
    // Blocks have shared streets, paired frontage and back gardens; reserve a civic precinct and depot yard.
    let ring = 1;
    fill: while (lots.length < target - 1) {
      for (let row = -ring; row <= ring; row++)
        for (let col = -ring; col <= ring; col++) {
          if (Math.max(Math.abs(row), Math.abs(col)) !== ring) continue;
          const x = col * 11 + Math.sign(col) * 7,
            z = row * 10 + Math.sign(row) * 6;
          if (
            Math.abs(x) < 7 ||
            Math.abs(z) < 5 ||
            (Math.abs(x) < 30 && Math.abs(z) < 25) ||
            (x > 22 && x < 52 && z > 24 && z < 52)
          )
            continue;
          const industrial = z < -34,
            variant = industrial
              ? "factory"
              : Math.abs(z) < 24
                ? "shop"
                : (row + col) % 7 === 0
                  ? "hall"
                  : "home";
          lots.push({
            x,
            z,
            angle:
              Math.sign(col) *
              (Math.abs(col) % 2 === 0 ? Math.PI / 2 : -Math.PI / 2),
            scale: industrial
              ? 0.76
              : 0.83 + (Math.abs(row * 7 + col) % 3) * 0.035,
            variant,
          });
          if (lots.length >= target - 1) break fill;
        }
      ring++;
    }
    // The inner square is the city's recognizable ownership landmark.
    extent = Math.max(
      75,
      ...lots.map((p) => Math.max(Math.abs(p.x), Math.abs(p.z)) + 13),
    );
    count=lots.length+1;
    sun.position.set(-extent*.8,extent*1.4,extent*.6);
    Object.assign(sun.shadow.camera,{left:-extent*1.5,right:extent*1.5,top:extent*1.5,bottom:-extent*1.5,far:extent*6});sun.shadow.camera.updateProjectionMatrix();
    box(ground, 0, -0.65, 0, extent * 2 + 32, 1.2, extent * 2 + 32);
    box(paving, 0, 0.025, 0, 49, 0.1, 42);
    box(path, 0, 0.05, 0, 8, 0.12, extent * 2 + 12);
    box(path, 0, 0.06, 0, extent * 2 + 12, 0.12, 6);
    for (let x = 34.5; x <= extent; x += 22)
      for (const side of [-1, 1])
        box(path, x * side, 0.045, 0, 2.2, 0.09, extent * 2 + 5);
    for (let z = 31; z <= extent; z += 30)
      for (const side of [-1, 1])
        box(path, 0, 0.04, z * side, extent * 2 + 5, 0.08, 2.2);
    // Capital: raised civic hall, portico, slate roof and a clock tower.
    box(stone, 0, 0.6, -7, 24, 1.2, 16);
    box(stone, 0, 4.6, -7, 21, 8, 13);
    add(new T.ConeGeometry(1,3,4).rotateY(Math.PI/4).scale(23/Math.SQRT2,1,15/Math.SQRT2),roof,0,10,-7);
    for(const y of [1.5,4,7.6])box(stone,0,y,-7,21.4,.2,13.4);
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
    // A river edge, bridge approach and lamps frame the city without changing its building budget.
    const water = mat("#477d84"),
      river: number[] = [];
    for (let z = -extent - 16; z < extent + 16; z += 2) {
      const x = -extent - 8 + Math.sin(z * 0.045) * 1.5,
        nx = -extent - 8 + Math.sin((z + 2) * 0.045) * 1.5;
      for (const p of [
        [x - 3, z],
        [x + 3, z],
        [nx - 3, z + 2],
        [nx - 3, z + 2],
        [x + 3, z],
        [nx + 3, z + 2],
      ])
        river.push(p[0], 0.025, p[1]);
    }
    const riverGeo = new T.BufferGeometry();
    riverGeo.setAttribute("position", new T.Float32BufferAttribute(river, 3));
    riverGeo.computeVertexNormals();
    water.side = T.DoubleSide;
    add(riverGeo, water, 0, 0, 0);
    box(stone, -extent - 8, 0.28, 0, 11, 0.55, 5);
    for (const z of [-2.5, 2.5]) box(stone, -extent - 8, 0.8, z, 11, 0.7, 0.4);
    for (let z = -extent + 12; z < extent; z += 18)
      for (const x of [-5, 5]) {
        if(x<0&&z>14&&z<32)continue;
        box(brass, x, 1.25, z, 0.14, 2.5, 0.14);
        box(brass, x, 2.55, z, 0.6, 0.35, 0.6);
      }
    // Merge street furniture and fences into material batches.
    for (const p of lots) {
      box(soil, p.x, 0.08, p.z, 8.6, 0.08, 8);
      if (p.variant === "home") {
        box(wood, p.x, 0.6, p.z - 4.2, 8.5, 0.12, 0.12);
        for (const dx of [-4, 0, 4])
          box(wood, p.x + dx, 0.45, p.z - 4.2, 0.15, 0.9, 0.15);
      }
      if (p.variant === "factory") {
        box(brass, p.x + 3, 1, p.z + 3, 1.2, 2, 1.2);
        box(wood, p.x - 3, 0.4, p.z + 3, 2, 0.8, 2);
      }
    }
    for (const [m, gs] of batches) {
      const g = mergeGeometries(gs)!;
      gs.forEach((g) => g.dispose());
      const mesh = new T.Mesh(g, m);
      mesh.castShadow =
        m !== ground && m !== path && m !== paving && m !== soil && m !== water;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    const cap = new T.Mesh(new T.ConeGeometry(1,3,4).rotateY(Math.PI/4).scale(23.1/Math.SQRT2,1,15.1/Math.SQRT2), mat("#e3e9e4"));
    cap.position.set(0,10.06,-7);
    cap.visible = winter;
    group.add(cap);
    winterMeshes.push(cap);
    const placements = [...lots];
    for (let i = 0; i < 40; i++) {
      const a = i * 2.399;
      placements.push({
        x: Math.cos(a) * (extent + 6),
        z: Math.sin(a) * (extent + 6),
        angle: a,
        scale: 0.65 + (i % 3) * 0.1,
        variant: i % 3 ? "tree" : "pine",
      });
    }
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
    const troopMat = mat("#ffffff");troopMat.vertexColors=true;
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
          : new T.Vector3(0, view==="capital"?7:0, 3);
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

import * as THREE from "three";
import { bakeInfantry } from "./infantryModel";
import { inInfantryViewport, type Viewport } from "./infantryVisibility";
export interface InfantryInstance {
  id: string;
  x: number;
  y: number;
  team: 0 | 1;
  heading: number;
  moving: boolean;
  firing: boolean;
  recoil: number;
}
/** A transparent, non-interactive overlay. Pixi owns picking and all world coordinates. */
export function infantryLayer(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0, 0);
  const canvas = renderer.domElement;
  canvas.className = "infantry-canvas";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    width: "100%",
    height: "100%",
  });
  host.appendChild(canvas);
  const scene = new THREE.Scene(),
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 5000);
  const elevation = 0.94,
    sin = Math.sin(elevation);
  camera.position.set(0, 1500 * sin, 1500 * Math.cos(elevation));
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xd9dfdb, 0x6d654d, 2.2));
  const sun = new THREE.DirectionalLight(0xffe9c5, 2.2);
  sun.position.set(-400, 800, 350);
  scene.add(sun);
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    flatShading: true,
  });
  const rigs = [bakeInfantry(0), bakeInfantry(1)];
  let capacity = 64,
    width = 0,
    height = 0;
  const makeBatches = () =>
    rigs.map((rig) =>
      rig.parts.map((part) => {
        const mesh = new THREE.InstancedMesh(part.geometry, material, capacity);
        mesh.count = 0;
        mesh.frustumCulled = false;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(mesh);
        return mesh;
      }),
    );
  let batches = makeBatches();
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x172c2f,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  const shadowGeometry = new THREE.CircleGeometry(1, 8);
  shadowGeometry.rotateX(-Math.PI / 2);
  let shadows = new THREE.InstancedMesh(
    shadowGeometry,
    shadowMaterial,
    capacity * 2,
  );
  shadows.frustumCulled = false;
  scene.add(shadows);
  const transform = new THREE.Object3D(),
    local = new THREE.Matrix4(),
    matrix = new THREE.Matrix4();
  const history = new Map<string, { x: number; y: number; phase: number }>();
  let wasVisible = false,
    failed = false;
  function hide() {
    canvas.style.display = "none";
    if (wasVisible) {
      renderer.clear();
      wasVisible = false;
    }
    host.dataset.infantryVisible = "0";
  }
  function render(
    units: InfantryInstance[],
    viewport: Viewport,
    size: number,
    now: number,
    reduced: boolean,
  ) {
    if (failed) return false;
    if (document.hidden || !units.length) {
      hide();
      return true;
    }
    try {
      if (width !== viewport.width || height !== viewport.height) {
        width = viewport.width;
        height = viewport.height;
        renderer.setSize(width, height, false);
        camera.left = -width / 2;
        camera.right = width / 2;
        camera.top = height / 2;
        camera.bottom = -height / 2;
        camera.updateProjectionMatrix();
      }
      const visible = units.filter((u) => inInfantryViewport(u, viewport, 48));
      if (!visible.length) {
        hide();
        return true;
      }
      const needed = Math.max(
        ...[0, 1].map((team) => visible.filter((u) => u.team === team).length),
      );
      if (needed > capacity) {
        while (capacity < needed) capacity *= 2;
        for (const team of batches)
          for (const mesh of team) {
            scene.remove(mesh);
            mesh.dispose();
          }
        batches = makeBatches();
        scene.remove(shadows);
        shadows.dispose();
        shadows = new THREE.InstancedMesh(
          shadowGeometry,
          shadowMaterial,
          capacity * 2,
        );
        shadows.frustumCulled = false;
        scene.add(shadows);
      }
      const counts = [0, 0],
        live = new Set<string>();
      let shadowCount = 0;
      for (const u of visible) {
        live.add(u.id);
        const previous = history.get(u.id);
        const seed = [...u.id].reduce(
          (h, c) => (h * 31 + c.charCodeAt(0)) >>> 0,
          7,
        );
        const phase = reduced
          ? 0
          : ((previous?.phase ?? (seed % 100) / 100) +
              (u.moving && previous
                ? Math.min(
                    1,
                    (Math.hypot(u.x - previous.x, u.y - previous.y) *
                      viewport.scale) /
                      Math.max(size * 0.7, 0.1),
                  )
                : 0)) %
            1;
        history.set(u.id, { x: u.x, y: u.y, phase });
        const rig = rigs[u.team],
          walk = phase * 64,
          index = Math.floor(walk);
        const a =
          u.moving && !reduced
            ? rig.walk[index]
            : rig.aim[
                reduced ? 0 : Math.round(Math.max(0, Math.min(1, u.recoil)) * 4)
              ];
        const b = u.moving && !reduced ? rig.walk[Math.min(64, index + 1)] : a,
          blend = u.moving && !reduced ? walk - index : 0;
        transform.position.set(
          u.x * viewport.scale + viewport.x - width / 2,
          0,
          (u.y * viewport.scale + viewport.y - height / 2) / sin,
        );
        transform.rotation.set(
          0,
          Math.atan2(Math.cos(u.heading), Math.sin(u.heading) / sin),
          0,
        );
        transform.scale.setScalar(size);
        transform.updateMatrix();
        const slot = counts[u.team]++;
        for (let part = 0; part < rig.parts.length; part++) {
          for (let j = 0; j < 16; j++)
            local.elements[j] = a[part][j] + (b[part][j] - a[part][j]) * blend;
          matrix.multiplyMatrices(transform.matrix, local);
          batches[u.team][part].setMatrixAt(slot, matrix);
        }
        transform.rotation.set(0, 0, 0);
        transform.scale.set(size * 0.45, 1, size * 0.3);
        transform.updateMatrix();
        shadows.setMatrixAt(shadowCount++, transform.matrix);
      }
      for (const id of history.keys()) if (!live.has(id)) history.delete(id);
      for (let team = 0; team < 2; team++)
        for (const mesh of batches[team]) {
          mesh.count = counts[team];
          mesh.instanceMatrix.clearUpdateRanges();
          if (mesh.count) {
            mesh.instanceMatrix.addUpdateRange(0, mesh.count * 16);
            mesh.instanceMatrix.needsUpdate = true;
          }
        }
      shadows.count = shadowCount;
      shadows.instanceMatrix.needsUpdate = true;
      canvas.style.display = "block";
      wasVisible = true;
      renderer.render(scene, camera);
      host.dataset.infantryVisible = String(visible.length);
      host.dataset.infantryDrawCalls = String(renderer.info.render.calls);
      host.dataset.infantryState = "ready";
      return true;
    } catch {
      failed = true;
      hide();
      host.dataset.infantryState = "fallback";
      return false;
    }
  }
  const lost = (event: Event) => {
    event.preventDefault();
    failed = true;
    hide();
    host.dataset.infantryState = "fallback";
  };
  canvas.addEventListener("webglcontextlost", lost);
  host.dataset.infantryState = "ready";
  hide();
  return {
    render,
    hide,
    available: () => !failed,
    destroy() {
      canvas.removeEventListener("webglcontextlost", lost);
      for (const team of batches) for (const mesh of team) mesh.dispose();
      for (const rig of rigs) for (const p of rig.parts) p.geometry.dispose();
      shadows.dispose();
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
      history.clear();
    },
  };
}

import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import {
  createMilitaryModel,
  createInfantryReference,
  MODEL_LABELS,
  type MilitaryModelKind,
} from "./militaryModels";
import "./militaryPreview.css";
const stage = document.querySelector<HTMLElement>("#stage")!,
  status = document.querySelector<HTMLElement>("#status")!;
try {
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  stage.append(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color(0x202928);
  const camera = new T.PerspectiveCamera(36, 1, 0.1, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 3;
  controls.maxDistance = 75;
  scene.add(new T.HemisphereLight(0xf7edd8, 0x66796b, 2.5));
  const sun = new T.DirectionalLight(0xffe3b6, 3);
  sun.position.set(-10, 20, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -14,
    right: 14,
    top: 14,
    bottom: -14,
    near: 1,
    far: 60,
  });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const ground = new T.Mesh(
    new T.PlaneGeometry(100, 100),
    new T.MeshStandardMaterial({ color: 0x454f42, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.06;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new T.GridHelper(40, 40, 0x66715d, 0x515d4f);
  grid.position.y = -0.04;
  scene.add(grid);
  const reference = createInfantryReference();
  scene.add(reference);
  let model = createMilitaryModel("tank"),
    kind: MilitaryModelKind = "tank",
    motion = false;
  scene.add(model.root);
  function fit(top = false) {
    const bounds = new T.Box3()
        .setFromObject(model.root)
        .expandByObject(reference),
      center = bounds.getCenter(new T.Vector3()),
      size = bounds.getSize(new T.Vector3());
    controls.target.copy(center);
    const radius = size.length() / 2,
      distance =
        (radius /
          Math.sin(T.MathUtils.degToRad(camera.fov / 2)) /
          Math.min(1, camera.aspect)) *
        1.12;
    camera.position
      .copy(center)
      .add(
        (top
          ? new T.Vector3(0.01, 1, 0.01)
          : new T.Vector3(1, 0.68, 1.25).normalize()
        ).multiplyScalar(distance),
      );
    controls.update();
  }
  function prepare() {
    status.textContent =
      "Model studies; campaign deployment and defense rules are unchanged.";
    const bounds = new T.Box3().setFromObject(model.root);
    reference.position.set(bounds.max.x + 1.3, 0, 0);
    const d = model.root.userData.dimensions;
    document.querySelector("#metrics")!.textContent =
      `${MODEL_LABELS[kind]} · ${d.length.toFixed(2)} L × ${d.width.toFixed(2)} W × ${d.height.toFixed(2)} H · ${model.triangles.toLocaleString()} triangles · Infantry: 1.925 nominal standing height`;
    stage.dataset.model = kind;
    stage.dataset.triangles = String(model.triangles);
    fit();
  }
  const resize = () => {
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
    fit();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  prepare();
  resize();
  document.querySelector<HTMLSelectElement>("#model")!.onchange = (e) => {
    scene.remove(model.root);
    model.dispose();
    kind = (e.target as HTMLSelectElement).value as MilitaryModelKind;
    model = createMilitaryModel(kind);
    scene.add(model.root);
    prepare();
  };
  document.querySelector<HTMLButtonElement>("#fit")!.onclick = () => fit();
  document.querySelector<HTMLButtonElement>("#top")!.onclick = () => fit(true);
  document.querySelector<HTMLButtonElement>("#motion")!.onclick = (e) => {
    motion = !motion;
    (e.target as HTMLElement).setAttribute("aria-pressed", String(motion));
  };
  document.querySelector<HTMLButtonElement>("#export")!.onclick = async () => {
    try {
      model.animate(0);
      const data = await new GLTFExporter().parseAsync(model.root, {
        binary: true,
      });
      const url = URL.createObjectURL(
        new Blob([data as ArrayBuffer], { type: "model/gltf-binary" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `ironfront-${kind}.glb`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = `Exported ${MODEL_LABELS[kind]} at original infantry scale.`;
    } catch (e) {
      status.textContent = `Export failed: ${String(e)}`;
    }
  };
  renderer.setAnimationLoop((time) => {
    if (document.hidden) return;
    if (motion) model.animate(time / 1000);
    controls.update();
    renderer.render(scene, camera);
  });
  window.addEventListener(
    "pagehide",
    () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      model.dispose();
      reference.geometry.dispose();
      (reference.material as T.Material).dispose();
      ground.geometry.dispose();
      (ground.material as T.Material).dispose();
      grid.geometry.dispose();
      (grid.material as T.Material).dispose();
      sun.shadow.map?.dispose();
      renderer.dispose();
    },
    { once: true },
  );
} catch (e) {
  status.textContent = `Preview unavailable: ${String(e)}`;
  stage.dataset.error = String(e);
}

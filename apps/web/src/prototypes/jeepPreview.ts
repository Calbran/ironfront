import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { createJeep, createScaleSoldier } from "./jeepModel";
import "@fontsource/barlow-condensed/600.css";
import "./jeepPreview.css";
const stage = document.querySelector<HTMLElement>("#stage")!;
const status = document.querySelector<HTMLElement>("#status")!;
try {
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  stage.append(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color(0x202928);
  const camera = new T.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(8, 6.5, 10);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.minDistance = 6;
  controls.maxDistance = 22;
  controls.maxPolarAngle = Math.PI * 0.49;
  scene.add(new T.HemisphereLight(0xf5e8cd, 0x566c64, 2.5));
  const sun = new T.DirectionalLight(0xffe0ab, 4);
  sun.position.set(-4, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
  sun.shadow.bias = -0.001;
  scene.add(sun);
  const fill = new T.DirectionalLight(0xbbd7e5, 2);
  fill.position.set(5, 3, -5);
  scene.add(fill);
  const ground = new T.Mesh(
    new T.PlaneGeometry(200, 200),
    new T.MeshStandardMaterial({ color: 0x343f39, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);
  const jeep = createJeep();
  scene.add(jeep.root);
  const occupants = jeep.seats.map((s) => {
    const person = createScaleSoldier(true);
    s.add(person);
    return person;
  });
  jeep.driver.add(createScaleSoldier(true));
  const reference = createScaleSoldier();
  reference.position.set(2.2, 0, -0.1);
  scene.add(reference);
  const render = () => {
    controls.update();
    renderer.render(scene, camera);
  };
  new ResizeObserver(() => {
    const { width, height } = stage.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }).observe(stage);
  controls.addEventListener("change", () => renderer.render(scene, camera));
  document.querySelector<HTMLButtonElement>("#passengers")!.onclick = (e) => {
    const visible = !occupants[0].visible;
    occupants.forEach((p) => (p.visible = visible));
    const b = e.currentTarget as HTMLButtonElement;
    b.textContent = visible ? "Hide passengers" : "Show six passengers";
    b.setAttribute("aria-pressed", String(visible));
    render();
  };
  document.querySelector<HTMLButtonElement>("#gate")!.onclick = (e) => {
    const open = jeep.tailgate.rotation.x === 0;
    jeep.tailgate.rotation.x = open ? -Math.PI / 2 : 0;
    const b = e.currentTarget as HTMLButtonElement;
    b.textContent = open ? "Raise tailgate" : "Lower tailgate";
    b.setAttribute("aria-pressed", String(open));
    render();
  };
  let overhead = false;
  document.querySelector<HTMLButtonElement>("#view")!.onclick = (e) => {
    overhead = !overhead;
    camera.position.set(
      ...((overhead ? [0, 12, 0.01] : [8, 6.5, 10]) as [
        number,
        number,
        number,
      ]),
    );
    (e.currentTarget as HTMLButtonElement).textContent = overhead
      ? "View three-quarter"
      : "View from above";
    render();
  };
  document.querySelector<HTMLButtonElement>("#export")!.onclick = async () => {
    try {
      const clean = createJeep();
      const result = await new GLTFExporter().parseAsync(clean.root, {
        binary: true,
      });
      const url = URL.createObjectURL(
        new Blob([result as ArrayBuffer], { type: "model/gltf-binary" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "ironfront-steam-jeep.glb";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent =
        "Downloaded vehicle with six passenger attachment points.";
    } catch {
      status.textContent =
        "Model export failed. Reload the preview and try again.";
    }
  };
  render();
} catch {
  status.textContent =
    "The 3D preview could not start. Enable WebGL and reload this page.";
}

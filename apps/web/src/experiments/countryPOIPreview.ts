import {
  parseOSMSample,
  generateOSMCountryPOI,
  type OSMSample,
} from "../../../../packages/game-core/src/countryOSM";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createMiniatureKit } from "./referenceAssets";
import { countryPOIAssets } from "./countryPOIAssets";
import {
  generateCountrySettlement,
  type SettlementRank,
} from "../../../../packages/game-core/src/countrySettlement";
import {
  generateCountryPOI,
  POI_CATALOG,
  type POIKind,
} from "../../../../packages/game-core/src/countryPOI";
import { obstacleDistance } from "../../../../packages/game-core/src/cityTactics";
import "./countryPOIPreview.css";
const root = document.querySelector("#root")!;
root.innerHTML =
  '<header><span>IRONFRONT / COUNTRY KIT</span><h1>Places between the cities.</h1><a href="/city-diorama.html">City battle ↗</a> · <a href="/three-preview.html">Global map ↗</a></header><main><section id="viewport" aria-label="Set piece viewport"><div id="caption"></div><div id="attribution"></div></section><aside><h2>24 reusable set pieces</h2><p>Victorian settlements, steam works, roadside stops and working countryside.</p><label>Layout source <select id="source"><option value="generated">Procedural countryside</option><option value="castle-combe" selected>Castle Combe · winding village</option><option value="bibury">Bibury · river clusters</option><option value="painswick">Painswick · dense hillside town</option></select></label><label>Building density <select id="density"><option value="0.35">Sparse</option><option value="0.7" selected>Mixed</option><option value="1">Dense</option></select></label><label>Layout size <select id="size"><option value="site">Small site</option><option value="estate" selected>Estate / expanded</option><option value="district">Country district</option></select></label><label>Variation seed <input id="seed" type="number" min="0" max="4294967295" value="732"></label><button id="vary">New variation</button><label><input id="cover" type="checkbox"> Show collision & cover</label><label><input id="mosaic" type="checkbox"> Country collection view</label><button id="export">Export this set piece</button><p id="stats" role="status"></p><p id="probe" role="status">Click ground to inspect clearance and nearby cover.</p><div id="catalog"></div><p>Drag to orbit · wheel to zoom · right-drag to pan. Cover geometry is compatible with city obstacles. Global-map placement is a visual study; campaign battles are not connected here.</p></aside></main>';
const host = document.querySelector<HTMLElement>("#viewport")!,
  caption = document.querySelector<HTMLElement>("#caption")!,
  stats = document.querySelector<HTMLElement>("#stats")!,
  probe = document.querySelector<HTMLElement>("#probe")!;
document
  .querySelector("#source")!
  .insertAdjacentHTML(
    "beforeend",
    '<option value="campaign-town">Campaign town</option><option value="campaign-city">Campaign regional city</option><option value="campaign-metropolis">Campaign metropolis</option><option value="campaign-industry">Campaign industrial complex</option>',
  );
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setClearColor(0x233c3b);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
host.prepend(renderer.domElement);
renderer.domElement.setAttribute("aria-label", "Country set piece 3D view");
const scene = new T.Scene(),
  camera = new T.PerspectiveCamera(42, 1, 2, 12000),
  controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.46;
controls.minDistance = 12;
controls.maxDistance = 6000;
scene.add(new T.HemisphereLight(0xfff2ce, 0x4d5e4c, 2.5));
const sun = new T.DirectionalLight(0xffe6bd, 3);
sun.position.set(-60, 120, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -90,
  right: 90,
  top: 90,
  bottom: -90,
  near: 1,
  far: 400,
});
sun.shadow.normalBias = 0.08;
scene.add(sun);
const kit = createMiniatureKit();
let kind: POIKind = "ribbon-hamlet",
  seed = 732,
  plan = generateCountryPOI(kind, seed),
  pieces: ReturnType<typeof countryPOIAssets>[] = [];
const overlays = new T.Group();
scene.add(overlays);
const overlayGeo = new T.BoxGeometry(1, 1, 1),
  low = new T.MeshBasicMaterial({
    color: 0xe7c875,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  }),
  high = new T.MeshBasicMaterial({
    color: 0xd98576,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
const buttons = new Map<string, HTMLButtonElement>();
let frame = 0,
  previous = performance.now();
const samples = new Map<string, OSMSample>();
let generation = 0;
async function show() {
  const request = ++generation,
    source = document.querySelector<HTMLSelectElement>("#source")!.value;
  const campaignLayout = source.startsWith("campaign-");
  for (const id of ["size", "density", "mosaic"])
    (document.getElementById(id) as HTMLInputElement).disabled = campaignLayout;
  if (campaignLayout)
    (document.getElementById("mosaic") as HTMLInputElement).checked = false;
  buttons.forEach((b) => (b.disabled = campaignLayout));
  controls.maxDistance = campaignLayout ? 18000 : 6000;
  let sample: OSMSample | undefined;
  if (source !== "generated" && !campaignLayout) {
    try {
      if (!samples.has(source)) {
        stats.textContent = "Loading local map sample…";
        const response = await fetch("/data/country-osm/" + source + ".json");
        if (!response.ok) throw Error("Sample unavailable");
        samples.set(source, parseOSMSample(await response.json()));
      }
      sample = samples.get(source);
    } catch {
      if (request === generation)
        stats.textContent =
          "Could not load this map sample. Select procedural countryside or try another sample.";
      return;
    }
  }
  if (request !== generation) return;
  pieces.forEach((p) => p.dispose());
  pieces = [];
  overlays.clear();
  const mosaic = document.querySelector<HTMLInputElement>("#mosaic")!.checked;
  const kinds = mosaic ? POI_CATALOG.map((c) => c[0]) : [kind];
  const size = document.querySelector<HTMLSelectElement>("#size")!.value as
      "site" | "estate" | "district",
    density = Number(
      document.querySelector<HTMLSelectElement>("#density")!.value,
    );
  document.querySelector<HTMLElement>("#attribution")!.innerHTML = sample
    ? 'Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors · ODbL</a> · <a href="/data/country-osm/' +
      source +
      '.json" download>Source data</a>'
    : "";
  kinds.forEach((key, i) => {
    const p = campaignLayout
        ? source === "campaign-industry"
          ? generateCountryPOI("foundry", seed, {
              size: "district",
              industrialComplex: true,
            })
          : generateCountrySettlement(seed, source.slice(9) as SettlementRank)
        : sample
          ? generateOSMCountryPOI(sample, seed, size, density)
          : generateCountryPOI(
              key,
              seed + i,
              mosaic ? undefined : { size, density },
            ),
      asset = countryPOIAssets(p, kit);
    asset.group.position.set(
      mosaic ? ((i % 6) - 2.5) * 145 : 0,
      0,
      mosaic ? (Math.floor(i / 6) - 1.5) * 145 : 0,
    );
    scene.add(asset.group);
    pieces.push(asset);
    if (!mosaic) {
      plan = p;
      for (const o of p.obstacles) {
        const m = new T.Mesh(overlayGeo, o.kind === "building" ? high : low);
        m.position.set(o.x, o.kind === "building" ? 1.5 : 0.5, o.z);
        m.scale.set(o.width, o.kind === "building" ? 3 : 1, o.depth);
        m.rotation.y = o.angle;
        overlays.add(m);
      }
    }
  });
  overlays.visible =
    document.querySelector<HTMLInputElement>("#cover")!.checked && !mosaic;
  const distance =
    (mosaic ? 650 : plan.extent * 2) * Math.max(1, 1.5 / camera.aspect);
  camera.position.set(distance * 0.75, distance, distance * 0.9);
  controls.target.set(0, 0, 0);
  controls.update();
  caption.textContent = mosaic
    ? "THE COUNTRY COLLECTION"
    : plan.name + " / " + seed;
  stats.textContent = mosaic
    ? "24 templates · seeded variation · shared city assets"
    : plan.buildings.length +
      " buildings · " +
      plan.obstacles.length +
      " obstacles · " +
      plan.fields.length +
      " crop parcels · " +
      plan.entrances.length +
      " road entrances · " +
      plan.extent * 2 +
      " model units across";
  buttons.forEach((b, k) => b.setAttribute("aria-pressed", String(k === kind)));
  probe.textContent = "Click ground to inspect clearance and nearby cover.";
}
const catalog = document.querySelector("#catalog")!;
let category = "";
for (const [key, label, group] of POI_CATALOG) {
  if (group !== category) {
    const h = document.createElement("h3");
    h.textContent = group;
    catalog.append(h);
    category = group;
  }
  const b = document.createElement("button");
  b.textContent = label;
  b.onclick = () => {
    kind = key;
    document.querySelector<HTMLSelectElement>("#source")!.value = "generated";
    document.querySelector<HTMLInputElement>("#mosaic")!.checked = false;
    show();
  };
  buttons.set(key, b);
  catalog.append(b);
}
document.querySelector("#size")!.addEventListener("change", () => {
  void show();
});
document.querySelector("#density")!.addEventListener("change", () => {
  void show();
});
document.querySelector("#source")!.addEventListener("change", () => {
  document.querySelector<HTMLInputElement>("#mosaic")!.checked = false;
  void show();
});
document.querySelector("#vary")!.addEventListener("click", () => {
  seed = (seed + 1) >>> 0;
  document.querySelector<HTMLInputElement>("#seed")!.value = String(seed);
  show();
});
document.querySelector("#seed")!.addEventListener("change", (e) => {
  seed = Number((e.target as HTMLInputElement).value) >>> 0;
  show();
});
document.querySelector("#cover")!.addEventListener("change", () => {
  overlays.visible =
    document.querySelector<HTMLInputElement>("#cover")!.checked &&
    !document.querySelector<HTMLInputElement>("#mosaic")!.checked;
});
document.querySelector("#mosaic")!.addEventListener("change", () => {
  document.querySelector<HTMLSelectElement>("#source")!.value = "generated";
  void show();
});
document.querySelector("#export")!.addEventListener("click", () => {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = (plan.source?.name ?? kind) + "-" + seed + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
let start = { x: 0, y: 0 };
renderer.domElement.addEventListener("pointerdown", (e) => {
  start = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener("pointerup", (e) => {
  if (
    e.button !== 0 ||
    Math.hypot(e.clientX - start.x, e.clientY - start.y) > 4 ||
    document.querySelector<HTMLInputElement>("#mosaic")!.checked
  )
    return;
  const rect = renderer.domElement.getBoundingClientRect(),
    ray = new T.Raycaster();
  ray.setFromCamera(
    new T.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    ),
    camera,
  );
  const p = new T.Vector3();
  if (!ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), p))
    return;
  const point = { x: p.x, z: p.z };
  const blocked = plan.obstacles.some((o) => obstacleDistance(point, o) < 0.25),
    cover = plan.obstacles.filter(
      (o) =>
        obstacleDistance(point, o) > 0.01 && obstacleDistance(point, o) <= 1.1,
    );
  probe.textContent =
    Math.abs(p.x) > plan.extent || Math.abs(p.z) > plan.extent
      ? "Outside set piece."
      : blocked
        ? "Blocked footprint."
        : cover.length
          ? "Clear ground · adjacent " +
            (cover.some((o) => o.kind === "building") ? "full" : "low") +
            " cover (protection depends on firing direction)."
          : "Clear ground · no nearby cover.";
});
const resize = new ResizeObserver(() => {
  renderer.setSize(host.clientWidth, host.clientHeight);
  camera.aspect = host.clientWidth / host.clientHeight;
  camera.updateProjectionMatrix();
});
resize.observe(host);
show();
let raf = 0;
const render = () => {
  controls.update();
  camera.near = Math.max(
    0.2,
    camera.position.distanceTo(controls.target) / 100,
  );
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  frame++;
  if (performance.now() - previous > 1000) {
    host.dataset.fps = String(
      Math.round((frame * 1000) / (performance.now() - previous)),
    );
    frame = 0;
    previous = performance.now();
  }
  raf = requestAnimationFrame(render);
};
render();
window.addEventListener(
  "pagehide",
  () => {
    cancelAnimationFrame(raf);
    resize.disconnect();
    controls.dispose();
    pieces.forEach((p) => p.dispose());
    kit.dispose();
    overlayGeo.dispose();
    low.dispose();
    high.dispose();
    renderer.dispose();
  },
  { once: true },
);

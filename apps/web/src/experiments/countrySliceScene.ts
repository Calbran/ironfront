import {countryForestDensity} from "../../../../packages/game-core/src/countryLandscape";
import { sampleSliceMotion } from "./sliceMotion";
import { countryAtmosphere } from "./countryAtmosphere";
import { createReviewInfantryKit } from "../prototypes/animatedInfantry";
import { soldierReview } from "../prototypes/animationTimeline";
import {previewSlicePlacement} from "../../../../packages/game-core/src/slicePlacement";
import {createSliceNavigation} from "../../../../packages/game-core/src/countrySlice";
import {tacticalPreviewColor,tacticalPreviewPose} from "./tacticalPreviewStyle";
import { segmentDistance } from "../../../../packages/game-core/src/organicCity";
import {
  countryRefinedLandscape,
  countryMeadowNoise,
} from "./countryRefinedLandscape";
import { tacticalViewportGestures } from "./anchoredCityOrbit";
import { tacticalSelection } from "./tacticalSelection";
import { tacticalKeyboardCamera } from "./tacticalKeyboardCamera";
import { cityUnitMarkers } from "./cityUnitMarkers";
import { settlementProfile } from "../../../../packages/game-core/src/settlementCity";
import { cityDiorama } from "./cityDiorama";
import { createCityTactics } from "../../../../packages/game-core/src/cityTactics";
import { SLICE_CITY_SEED } from "../../../../packages/game-core/src/countrySlice";
import {
  combinedCanonicalZ,
  combinedLot,
  combinedPosition,
} from "../../../../packages/game-core/src/combinedDistrict";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createMiniatureKit } from "./referenceAssets";
import { countryPOIAssets } from "./countryPOIAssets";
import { createCountryRoadScene } from "./countryRoadScene";
import { terrainHeight } from "../../../../packages/game-core/src/connectedTerrain";
import type {
  SlicePlan,
  SliceState,
  SlicePoint,
} from "../../../../packages/game-core/src/countrySlice";
import { bakeInfantry } from "../infantryModel";
import { createMilitaryModel } from "../prototypes/militaryModels";
import { createTankTracks } from "../prototypes/tankTracks";
import { refinedGrain, refineSurface, cityAppearance } from "./refinedSurface";
export function countrySliceScene(
  host: HTMLElement,
  plan: SlicePlan,
  select: (ids: number[], add: boolean, toggle?: boolean) => void,
  order: (p: SlicePoint, append: boolean, facing?: number) => void,
  preview: (
    p: SlicePoint,
    append: boolean,
    facing?: number,
  ) => Promise<{
    valid: boolean;
    error?: string;
    units: { id: number; path: SlicePoint[]; members?:{id:number;path:SlicePoint[]}[] }[];
  }>,
) {
  const scene = new T.Scene();
  const placementNavigation=createSliceNavigation(plan);
  const atmosphere = countryAtmosphere(scene);
  scene.background = new T.Color("#203d45");
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  host.append(renderer.domElement);
  renderer.domElement.setAttribute("aria-label", "Playable country sector");
  const camera = new T.PerspectiveCamera(45, 1, 0.15, 15000),
    controls = new OrbitControls(camera, renderer.domElement);
  controls.mouseButtons = {
    LEFT: -1 as T.MOUSE,
    MIDDLE: -1 as T.MOUSE,
    RIGHT: -1 as T.MOUSE,
  };
  renderer.domElement.tabIndex = 0;
  controls.minDistance = 8;
  controls.maxDistance = 7000;
  controls.maxPolarAngle = Math.PI / 2 - 0.08;
  controls.enableDamping = true;
  controls.screenSpacePanning = false;
  const ambient = new T.HemisphereLight("#d6e1e6", "#414934", 0.65);
  scene.add(ambient);
  const sun = new T.DirectionalLight("#ffe3b6", 1.5);
  let lighting: "cycle" | "day" | "night" = "cycle";
  const terrainOverview = { value: 0 };
  const terrainSun = { value: new T.Vector3(0, 1, 0) };
  const terrainDaylight = { value: 1 };
  const terrainInkDistance = { value: 0 };
  let windowsAtNight = false;
  scene.fog = new T.FogExp2(0x809397, 0.00007);
  sun.position.set(420, 140, 960);
  sun.target.position.set(500, 0, 900);
  scene.add(sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -200,
    right: 200,
    top: 200,
    bottom: -200,
    near: 1,
    far: 500,
  });
  sun.shadow.normalBias = 0.06;
  sun.shadow.bias = -0.0002;
  scene.add(sun);
  const geos: T.BufferGeometry[] = [],
    mats: T.Material[] = [],
    kit = createMiniatureKit(),
    grain = refinedGrain();
  const material = (color: number) => {
    const m = new T.MeshStandardMaterial({ color, roughness: 1 });
    refineSurface(m, grain);
    mats.push(m);
    return m;
  };
  const surface = plan.surface,
    positions: number[] = [],
    indices: number[] = [];
  for (let y = 0; y < surface.rows; y++)
    for (let x = 0; x < surface.cols; x++) {
      const i = y * surface.cols + x;
      positions.push(x * surface.step, surface.heights[i], y * surface.step);
      if (x && y) {
        const a = i - surface.cols - 1,
          b = i - surface.cols,
          c = i - 1;
        if ([a, b, c, i].every((j) => surface.land[j]))
          indices.push(a, c, b, b, c, i);
      }
    }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  const colors: number[] = [],
    color = new T.Color(),
    meadow = new T.Color(0x969d77),
    lush = new T.Color(0x7e906c),
    dry = new T.Color(0xaaa17e),
    earth = new T.Color(0x918b78);
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i],
      z = positions[i + 2],
      n = countryMeadowNoise(x * 0.6, z * 0.6);
    // Broad color fields with short, soft transitions; the terrain lattice
    // lends their edges the same restrained angularity as the miniature kit.
    color
      .copy(meadow)
      .lerp(lush, T.MathUtils.smoothstep(n, 0.2, 0.55))
      .lerp(dry, T.MathUtils.smoothstep(-n, 0.35, 0.7));
    const slope =
      Math.hypot(
        terrainHeight(surface, Math.min(plan.width, x + 4), z) -
          positions[i + 1],
        terrainHeight(surface, x, Math.min(plan.depth, z + 4)) -
          positions[i + 1],
      ) / 4;
    color.lerp(earth, T.MathUtils.smoothstep(slope, 0.08, 0.35) * 0.65);
    const bankDistance=Math.min(...plan.rivers.flatMap(r=>r.slice(1).map((b,j)=>segmentDistance({x,z},r[j],b))));
    color.lerp(new T.Color(0xb3a080), (1-T.MathUtils.smoothstep(bankDistance,9,24+n*4))*.8);
    const forest=plan.sites.every(site=>Math.hypot(x-site.x,z-site.z)>site.extent+12)
      ?T.MathUtils.smoothstep(countryForestDensity(x,z),.08,.3):0;
    color.lerp(new T.Color(0x596b43),forest*.65);
    color.toArray(colors, colors.length);
  }
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geos.push(geo);
  const groundMaterial = material(0xffffff);
  groundMaterial.vertexColors = true;
  const compileGround = groundMaterial.onBeforeCompile;
  groundMaterial.onBeforeCompile = (shader, renderer) => {
    compileGround.call(groundMaterial, shader, renderer);
    atmosphere.shadeGround(shader);
    shader.uniforms.terrainOverview = terrainOverview;
    shader.uniforms.terrainSun = terrainSun;
    shader.uniforms.terrainDaylight = terrainDaylight;
    shader.uniforms.terrainInkDistance = terrainInkDistance;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float terrainOverview;\nvarying vec3 terrainNormal;",
      )
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nterrainNormal=normal;")
      .replace(
        "#include <color_vertex>",
        "#include <color_vertex>\nvColor.rgb=mix(vColor.rgb,vec3(0.212,0.250,0.147),terrainOverview*.88);",
      );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
uniform float terrainOverview;
uniform vec3 terrainSun;
uniform float terrainDaylight;
uniform float terrainInkDistance;
varying vec3 terrainNormal;
float terrainInk(float coordinate) {
  float footprint = max(fwidth(coordinate), .001);
  // Thin strokes at close range; retain their weight as they approach pixel size.
  float width = mix(.018, .06, smoothstep(.025, .20, footprint));
  float line = 1. - smoothstep(width, width + footprint, abs(fract(coordinate + .5) - .5));
  return line * (1. - smoothstep(.25, .65, footprint));
}`,
    );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "texture2D(refinedGrain,refinedUV*.14).rgb",
        "mix(vec3(1.0),(texture2D(refinedGrain,refinedUV*.14).rgb*.4 + texture2D(refinedGrain,mat2(.8,-.6,.6,.8)*refinedUV*.231+vec2(.37,.71)).rgb*.35 + texture2D(refinedGrain,mat2(.36,.93,-.93,.36)*refinedUV*.087).rgb*.25),.09*(1.-terrainOverview))",
      )
      .replace("float mottling=.96+.04*", "float mottling=.995+.005*")
      .replace("#include <opaque_fragment>", `
// World-anchored ink follows the relief's exposure to the moving sun.
// Flat ground stays clean; screen derivatives suppress distant moire.
float shadeSlope = max(0., terrainSun.y - dot(normalize(terrainNormal), terrainSun));
// Country hills are gentle: use their actual slope range, not mountain normals.
float hatchShade = smoothstep(.003, .035, shadeSlope);
float closeHatch = 1. - smoothstep(100., 450., distance(cameraPosition, cloudWorld));
float hatchCoord = dot(refinedUV, vec2(.8, .6)) / 14.;
float crossCoord = dot(refinedUV, vec2(-.6, .8)) / 18.;
// Blend fixed world-space frequencies rather than sliding lines with zoom.
float hatch = mix(terrainInk(hatchCoord), terrainInk(hatchCoord * 2.), closeHatch);
float cross = mix(terrainInk(crossCoord), terrainInk(crossCoord * 2.), closeHatch);
float ink = max(hatch, cross * smoothstep(.022, .065, shadeSlope));
outgoingLight *= 1. - hatchShade * (.08 + ink * .45) * mix(1., .5, closeHatch) * terrainDaylight * (1. - terrainInkDistance);
#include <opaque_fragment>`);
  };
  groundMaterial.customProgramCacheKey = () => "miniature-country-ground-v8";
  const ground = new T.Mesh(geo, groundMaterial);
  ground.receiveShadow = true;
  ground.castShadow = true;
  scene.add(ground);
  const overviewGeometry = new T.BufferGeometry(),
    overviewIndices: number[] = [];
  for (const name of ["position", "normal", "color"])
    overviewGeometry.setAttribute(name, geo.getAttribute(name));
  for (let z = 0; z < surface.rows - 1; z += 4)
    for (let x = 0; x < surface.cols - 1; x += 4) {
      const x1 = Math.min(x + 4, surface.cols - 1),
        z1 = Math.min(z + 4, surface.rows - 1);
      const a = z * surface.cols + x,
        b = z * surface.cols + x1,
        c = z1 * surface.cols + x,
        d = z1 * surface.cols + x1;
      if ([a, b, c, d].every((i) => surface.land[i]))
        overviewIndices.push(a, c, b, b, c, d);
    }
  overviewGeometry.setIndex(overviewIndices);
  geos.push(overviewGeometry);
  const overviewGround = new T.Mesh(overviewGeometry, groundMaterial);
  overviewGround.visible = false;
  scene.add(overviewGround);
  const landscape = countryRefinedLandscape(scene, plan, kit);
  const point = (x: number, z: number, h = 0) => new T.Vector3(x, h, z),
    roads = createCountryRoadScene(scene, plan.roads, surface, point);
  const waterMat = material(0x457e8a),
    box = new T.BoxGeometry(1, 1, 1);
  geos.push(box);
  const riverMatrices: T.Matrix4[] = [],
    batchPose = new T.Object3D();
  for (const river of plan.rivers)
    for (let i = 1; i < river.length; i++) {
      const start = river[i - 1],
        end = river[i];
      let lo = 0,
        hi = 1;
      for (const [axis, max] of [
        ["x", plan.width],
        ["z", plan.depth],
      ] as const) {
        const d = end[axis] - start[axis];
        if (Math.abs(d) < 1e-8) {
          if (start[axis] < 0 || start[axis] > max) hi = -1;
          continue;
        }
        const t0 = -start[axis] / d,
          t1 = (max - start[axis]) / d;
        lo = Math.max(lo, Math.min(t0, t1));
        hi = Math.min(hi, Math.max(t0, t1));
      }
      if (lo >= hi) continue;
      const a = {
          x: start.x + (end.x - start.x) * lo,
          z: start.z + (end.z - start.z) * lo,
        },
        b = {
          x: start.x + (end.x - start.x) * hi,
          z: start.z + (end.z - start.z) * hi,
        };
      batchPose.position.set((a.x + b.x) / 2, 0.0175, (a.z + b.z) / 2);
      // Extend below the sloped banks: the channel bed reaches 18 units
      // from its center, beyond the old six-unit water edge. Terrain hides
      // the overlap and shallow margins remain distinct from the deep channel.
      batchPose.scale.set(40, 0.035, Math.hypot(b.x - a.x, b.z - a.z) + 2);
      batchPose.rotation.set(0, Math.atan2(b.x - a.x, b.z - a.z), 0);
      batchPose.updateMatrix();
      riverMatrices.push(batchPose.matrix.clone());
    }
  const rivers = new T.InstancedMesh(box, waterMat, riverMatrices.length);
  riverMatrices.forEach((matrix, index) => rivers.setMatrixAt(index, matrix));
  rivers.computeBoundingSphere();
  scene.add(rivers);
  const cityView = cityDiorama(host, () => {}, {
    renderer,
    plan: plan.city,
    seed: plan.cityContext.seed,
    profile: settlementProfile(plan.cityContext),
    outskirts: true,
    roadExits: plan.roads.roads
      .filter((r) => r.id === "city-approach")
      .map((r) => ({
        width: r.startWidth ?? r.width,
        points: [
          { x: r.path[0].x - 500, z: r.path[0].y - 900 },
          { x: r.path[0].x - 500 + 24, z: r.path[0].y - 900 },
        ],
      })),
  });
  const cityRoot = cityView.assetRoot();
  cityRoot.position.set(500, 0, 900);
  scene.add(cityRoot);
  const cityNav = createCityTactics(
    plan.city,
    plan.cityContext.seed,
    settlementProfile(plan.cityContext),
  );
  const citySilhouette = new T.Group(),
    silhouetteBox = new T.BoxGeometry(1, 1, 1),
    silhouetteMaterial = new T.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
    }),
    silhouettePose = new T.Object3D();
  const silhouetteLots = plan.city.lots.flatMap((lot) => {
    const placed = combinedLot(
      lot,
      plan.cityContext.seed,
      settlementProfile(plan.cityContext),
    );
    const variant = cityAppearance(
      lot.variant,
      lot.x,
      lot.z,
      plan.cityContext.seed,
    );
    const hash =
      (Math.imul(Math.round(lot.x * 100), 73856093) ^
        Math.round(lot.z * 100) ^
        plan.cityContext.seed) >>>
      0;
    const tint = new T.Color(
      ["#ffffff", "#ded6c6", "#dbbfa8", "#c8ced0", "#ead8b8"][hash % 5],
    );
    // Coarse material masses preserve brick, stone and roof colors in one draw call.
    return (kit.distantVariants.get(variant) ?? []).flatMap((part) => {
      if (part.snow) return [];
      part.geometry.computeBoundingBox();
      const bounds = part.geometry.boundingBox;
      if (!bounds || bounds.isEmpty()) return [];
      const color =
        (part.material as T.MeshStandardMaterial).color?.clone() ??
        new T.Color("white");
      return [{ lot, bounds, placed, color: color.multiply(tint) }];
    });
  });
  const silhouetteBuildings = new T.InstancedMesh(
    silhouetteBox,
    silhouetteMaterial,
    silhouetteLots.length,
  );
  silhouetteLots.forEach(({ lot, bounds, placed, color }, index) => {
    const size = bounds.getSize(new T.Vector3()),
      center = bounds.getCenter(new T.Vector3()),
      scale = lot.scale,
      heightScale = "heightScale" in lot ? (lot.heightScale ?? 1) : 1,
      c = Math.cos(placed.angle),
      s = Math.sin(placed.angle),
      cx = center.x * scale,
      cz = center.z * scale;
    silhouettePose.position.set(
      placed.x + cx * c + cz * s,
      cityNav.surfaceHeight(placed) + center.y * scale * heightScale,
      placed.z - cx * s + cz * c,
    );
    silhouettePose.rotation.set(0, placed.angle, 0);
    silhouettePose.scale.set(
      Math.max(0.02, size.x * scale),
      Math.max(0.02, size.y * scale * heightScale),
      Math.max(0.02, size.z * scale),
    );
    silhouettePose.updateMatrix();
    silhouetteBuildings.setMatrixAt(index, silhouettePose.matrix);
    silhouetteBuildings.setColorAt(index, color);
  });
  silhouetteBuildings.computeBoundingSphere();
  citySilhouette.add(silhouetteBuildings);
  const simpleStreetVertices: number[] = [];
  for (const street of plan.city.streets) {
    const points = street.points.map((p) =>
      combinedPosition(
        p,
        plan.cityContext.seed,
        settlementProfile(plan.cityContext),
      ),
    );
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        dx = b.x - a.x,
        dz = b.z - a.z,
        length = Math.hypot(dx, dz);
      if (length < 1e-5) continue;
      const px = (-dz / length) * (street.width / 2),
        pz = (dx / length) * (street.width / 2),
        h =
          cityNav.surfaceHeight({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }) +
          0.08,
        corners = [
          [a.x + px, h, a.z + pz],
          [a.x - px, h, a.z - pz],
          [b.x - px, h, b.z - pz],
          [b.x + px, h, b.z + pz],
        ];
      for (const corner of [
        corners[0],
        corners[1],
        corners[2],
        corners[0],
        corners[2],
        corners[3],
      ])
        simpleStreetVertices.push(...corner);
    }
  }
  const simpleStreetGeometry = new T.BufferGeometry();
  simpleStreetGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(simpleStreetVertices, 3),
  );
  const simpleStreetMaterial = new T.MeshBasicMaterial({ color: 0x454943 }),
    simpleStreets = new T.Mesh(simpleStreetGeometry, simpleStreetMaterial);
  citySilhouette.add(simpleStreets);
  citySilhouette.position.copy(cityRoot.position);
  citySilhouette.visible = false;
  scene.add(citySilhouette);
  const bagMat = material(0x958769);
  const bagMatrices: T.Matrix4[] = [];
  for (const o of plan.obstacles.filter((o) => o.id.startsWith("cover-")))
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 10; col++) {
        batchPose.position.set(
          o.x - 1.8 + col * 0.38 + (row % 2) * 0.09,
          row * 0.19 + 0.135,
          o.z,
        );
        batchPose.scale.set(0.37, 0.19, 0.6);
        batchPose.rotation.set(0, 0, 0);
        batchPose.updateMatrix();
        bagMatrices.push(batchPose.matrix.clone());
      }
  const bags = new T.InstancedMesh(box, bagMat, bagMatrices.length);
  bagMatrices.forEach((matrix, index) => bags.setMatrixAt(index, matrix));
  bags.computeBoundingSphere();
  scene.add(bags);
  const resident = new Map<string, ReturnType<typeof countryPOIAssets>>();
  // These tiny batches remain resident when full POI assets are streamed out.
  const distantSites = new Map<string, T.InstancedMesh>();
  for (const site of plan.sites.filter((s) => s.poi)) {
    const masses = site.poi!.buildings.flatMap((building) =>
      (
        kit.distantVariants.get(building.variant) ??
        kit.distantVariants.get("home") ??
        []
      ).flatMap((part) => {
        if (part.snow) return [];
        part.geometry.computeBoundingBox();
        const bounds = part.geometry.boundingBox;
        return bounds && !bounds.isEmpty()
          ? [
              {
                building,
                bounds,
                material: part.material as T.MeshStandardMaterial,
              },
            ]
          : [];
      }),
    );
    const mesh = new T.InstancedMesh(
      silhouetteBox,
      silhouetteMaterial,
      masses.length,
    );
    masses.forEach(({ building, bounds, material }, i) => {
      const center = bounds.getCenter(new T.Vector3()),
        size = bounds.getSize(new T.Vector3());
      center.applyAxisAngle(new T.Vector3(0, 1, 0), building.angle);
      silhouettePose.position.set(
        building.x + center.x,
        center.y,
        building.z + center.z,
      );
      silhouettePose.rotation.set(0, building.angle, 0);
      silhouettePose.scale.set(
        Math.max(0.02, size.x),
        Math.max(0.02, size.y),
        Math.max(0.02, size.z),
      );
      silhouettePose.updateMatrix();
      mesh.setMatrixAt(i, silhouettePose.matrix);
      mesh.setColorAt(i, material.color ?? new T.Color("white"));
    });
    mesh.position.set(site.x, 0, site.z);
    mesh.computeBoundingSphere();
    scene.add(mesh);
    distantSites.set(site.id, mesh);
  }
  const rig = bakeInfantry(0),
    bodyMat = new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
    });
  mats.push(bodyMat);
  const infantryKit=createReviewInfantryKit(), atActors=new Map<number,ReturnType<typeof infantryKit.actor>>();
  const rifleActors=new Map<number,ReturnType<typeof infantryKit.actor>>();
  const tank = createMilitaryModel("tank", true),
    enemyTank = createMilitaryModel("tank", true),
    tracks = createTankTracks(tank.root),
    airship = createMilitaryModel("airship", true);
  const objects = new Map<number, T.Group>(),
    soldiers = new Map<number, T.Mesh[]>();
  const ringGeo = new T.RingGeometry(1.1, 1.35, 24).rotateX(-Math.PI / 2);
  geos.push(ringGeo);
  const selectedMat = new T.MeshBasicMaterial({
    color: 0xffdd82,
    depthTest: false,
    side: T.DoubleSide,
  });
  mats.push(selectedMat);
  const enemyRingMat=selectedMat.clone();enemyRingMat.color.set(0xd56a53);mats.push(enemyRingMat);
  const rings = new Map<number, T.Mesh>();
  for (const id of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const root = new T.Group();
    if (id < 3 || (id > 4 && id !== 8)) {
      const parts: T.Mesh[] = [];
      const uniform = id>4 ? bodyMat.clone() : bodyMat;
      if(id>4){uniform.color.set(0xd99484);mats.push(uniform);}
      for(let member=0;member<6;member++){
      const memberParts = rig.parts.map((p) => {
        const m = new T.Mesh(p.geometry, uniform);
        m.matrixAutoUpdate = false;
        return m;
      });
      const model = new T.Group();
      model.position.set((member%3-1)*1.1,0,(Math.floor(member/3)-.5)*1.2);
      model.scale.setScalar(0.55);
      memberParts.forEach((p) => model.add(p));
      parts.push(...memberParts);
      root.add(model);
      const rifleActor=infantryKit.actor("rifle");model.add(rifleActor.root);rifleActors.set(id*100+member,rifleActor);rifleActor.root.visible=false;
      if((id===2||id===7)&&member===0){const actor=infantryKit.actor("antitank");model.add(actor.root);atActors.set(id*100,actor);actor.root.visible=false;}
      }
      soldiers.set(id, parts);
    } else {
      const model = id === 3 ? tank.root : id===8 ? enemyTank.root : airship.root;
      model.scale.setScalar(0.55);
      root.add(model);
    }
    const ring = new T.Mesh(ringGeo, id>4?enemyRingMat:selectedMat);
    ring.rotation.y = 0;
    scene.add(ring);
    rings.set(id, ring);
    objects.set(id, root);
    scene.add(root);
    root.visible = id<=4;
  }
  const ghosts = new Map<
    number,
    { root: T.Group; material: T.MeshBasicMaterial }
  >();
  const ghostMemberMaterials=new Map<number,T.MeshBasicMaterial>();
  const previewPoses={none:tacticalPreviewPose(rig,"none"),partial:tacticalPreviewPose(rig,"partial"),full:tacticalPreviewPose(rig,"full")};
  for (const [id, object] of objects) {
    const ghost = object.clone(true),
      ghostMaterial = new T.MeshBasicMaterial({
        color: 0xa4cddd,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        depthTest: false,
      });
    ghost.traverse((child) => {
      if (child instanceof T.Mesh) {
        child.material = ghostMaterial;
        child.castShadow = false;
      }
    });
    if(id<3||(id>4&&id!==8))ghost.children.forEach((member,i)=>{
      const m=ghostMaterial.clone();mats.push(m);ghostMemberMaterials.set(id*100+i,m);
      member.traverse(child=>{if(child instanceof T.Mesh)child.material=m;});
    });
    const ring = new T.Mesh(ringGeo, ghostMaterial);
    ring.position.y = 0.08;
    ghost.add(ring);
    ghost.visible = false;
    scene.add(ghost);
    ghosts.set(id, { root: ghost, material: ghostMaterial });
  }
  const markerUnits = [
      { id: 1, x: 0, z: 0, kind: "infantry", friendly: true, health: 100 },
      { id: 2, x: 0, z: 0, kind: "infantry", friendly: true, health: 100 },
      { id: 3, x: 0, z: 0, kind: "vehicle", friendly: true, health: 100 },
      { id: 4, x: 0, z: 0, kind: "airship", friendly: true, health: 100 },
      ...[5,6,7,8].map(id=>({id,x:0,z:0,kind:id===8?"vehicle":"infantry",friendly:false,health:0})),
    ],
    unitMarkers = cityUnitMarkers(
      renderer.domElement,
      markerUnits,
      (id, add) => {if(id<=4)select([id], add);},
      (unit) => focus(unit, unit.kind === "airship" ? 100 : 30),
      host,
    );
  const correction = new Map<
    number,
    { x: number; z: number; angle: number; distance: number }
  >();
  let current: SliceState | undefined,
    previous: SliceState | undefined,
    received = 0,
    selection = [1],
    snap = true,
    pathLine: T.LineSegments | undefined;
  const fireGeometry = new T.BufferGeometry();
  const fireMaterial = new T.LineBasicMaterial({color:0xffce79,transparent:true,opacity:.85});
  const fireLines = new T.LineSegments(fireGeometry,fireMaterial);
  fireLines.frustumCulled=false;scene.add(fireLines);geos.push(fireGeometry);mats.push(fireMaterial);
  let lastShot=0, fireUntil=0;
  const y = (p: SlicePoint, air = false) => {
    if (air) return terrainHeight(surface, p.x, p.z) + 25;
    const local = { x: p.x - 500, z: p.z - 900 };
    if (
      Math.abs(local.x) < 159 &&
      Math.abs(
        combinedCanonicalZ(
          local,
          plan.cityContext.seed,
          settlementProfile(plan.cityContext),
        ),
      ) < 159
    )
      return cityNav.surfaceHeight(local);
    let h = terrainHeight(surface, p.x, p.z);
    for (const b of plan.roads.bridges) {
      const dx = p.x - b.x,
        dz = p.z - b.y,
        c = Math.cos(b.angle),
        s = Math.sin(b.angle);
      if (
        Math.abs(dx * c + dz * s) <= b.length / 2 &&
        Math.abs(-dx * s + dz * c) <= b.width / 2
      )
        h = Math.max(h, 0.4);
    }
    return h + 0.15;
  };
  function focus(p: SlicePoint, distance = 130) {
    controls.target.set(p.x, y(p), p.z);
    camera.position
      .copy(controls.target)
      .add(new T.Vector3(0.3, 0.8, 1).normalize().multiplyScalar(distance));
    controls.update();
  }
  const labels = plan.sites.map((site) => {
    const button = document.createElement("button");
    button.className = "slice-site-label";
    button.textContent = site.name;
    button.onclick = () => focus(site, site.id === "city" ? 420 : 160);
    host.append(button);
    return { site, button };
  });
  function drawPath() {
    if (pathLine) {
      pathLine.removeFromParent();
      pathLine.geometry.dispose();
      (pathLine.material as T.Material).dispose();
    }
    const pts: T.Vector3[] = [];
    for (const u of current?.units ?? []) {
      if (!selection.includes(u.id)) continue;
      const path = [u, ...(u.guide?.length ? u.guide : u.path)];
      for (let i = 1; i < path.length; i++)
        for (const p of [path[i - 1], path[i]])
          pts.push(point(p.x, p.z, y(p, u.kind === "airship") + 0.4));
    }
    pathLine = new T.LineSegments(
      new T.BufferGeometry().setFromPoints(pts),
      new T.LineBasicMaterial({
        color: 0xe8d58b,
        depthTest: false,
        transparent: true,
        opacity: 0.75,
      }),
    );
    scene.add(pathLine);
  }
  const canvas = renderer.domElement;
  const hint = document.createElement("div");
  hint.className = "slice-preview-hint";
  host.append(hint);
  let previewRequest:{p:SlicePoint;facing?:number}|undefined,lastPreviewSolve=-Infinity;
  function clearPreview() {
    for (const ghost of ghosts.values()) ghost.root.visible = false;
  }
  function renderPreview(
    p: SlicePoint,
    facing: number | undefined,
    result?: {
      valid: boolean;
      error?: string;
      units: { id: number; path: SlicePoint[]; members?:{id:number;path:SlicePoint[]}[] }[];
    },
  ) {
    clearPreview();
    if(!current)return;
    const placements=previewSlicePlacement(plan,placementNavigation,current,selection,p,facing);
    for(const id of selection){
      const unit=current.units.find(u=>u.id===id),ghost=ghosts.get(id);
      if(!unit||!ghost)continue;
      ghost.root.visible=true;
      ghost.root.position.set(0,0,0);ghost.root.rotation.y=0;
      if(unit.members){
        unit.members.forEach((member,i)=>{
          const child=ghost.root.children[i],goal=placements.find(g=>g.id===member.id);
          child.visible=member.health!==0&&!!goal;
          if(goal){
            child.position.set(goal.x,y(goal),goal.z);child.rotation.y=goal.angle;
            ghostMemberMaterials.get(member.id)?.color.set(tacticalPreviewColor(goal.valid,goal.cover));
            child.children.forEach((part,j)=>{part.visible=j<rig.parts.length;if(j<rig.parts.length)part.matrix.fromArray(previewPoses[goal.cover][j]);});
          }
        });
        // Hide the old group ring: preview each actual soldier, as in city battle.
        ghost.root.children.slice(unit.members.length).forEach(c=>c.visible=false);
      }else{
        const goal=placements.find(g=>g.id===id)??{...p,angle:facing??unit.angle};
        ghost.root.position.set(goal.x,y(goal,unit.kind==="airship"),goal.z);ghost.root.rotation.y=goal.angle;
      }
      const own=placements.filter(g=>unit.members?unit.members.some(m=>m.id===g.id):g.id===id);
      ghost.material.color.set(own.some(g=>!g.valid)?0xff6655:own.some(g=>g.cover!=="none")?0x75e299:0xa4cddd);
    }
    hint.textContent=result&&!result.valid?(result.error??"Route blocked"):"Release to order · Shift queues";
    hint.hidden=false;
  }
  function queuePreview(p: SlicePoint, _append: boolean, facing?: number) {
    previewRequest={p:{...p},facing};
    const now=performance.now();
    if(now-lastPreviewSolve>=80){renderPreview(p,facing);lastPreviewSolve=now;}
  }
  function clearOrderPreview() {
    previewRequest=undefined;lastPreviewSolve=-Infinity;
    hint.hidden=true;clearPreview();
  }
  clearOrderPreview();
  const selectionControls = tacticalSelection(canvas, {
    units: () => {
      const rect = canvas.getBoundingClientRect();
      return [...objects].flatMap(([id, object]) => {
        const unit=current?.units.find(u=>u.id===id);
        if(id>4||!unit||unit.health===0)return [];
        // Each rendered member is a hit target for its parent squad. Far icons
        // keep the aggregate target when member geometry is culled.
        const targets=unit.members&&object.visible
          ?object.children.filter((member,index)=>member.visible&&unit.members![index]?.health!==0)
          :[object];
        return targets.map(target=>{
          const p=target.getWorldPosition(new T.Vector3());
          p.y+=unit.kind==="infantry"?.5:0;
          p.project(camera);
          return {id,x:rect.left+((p.x+1)*rect.width)/2,
            y:rect.top+((1-p.y)*rect.height)/2,visible:p.z>=-1&&p.z<=1};
        });
      });
    },
    box: (ids, add) => select([...new Set(ids)], add),
    click: (id, add) => select(id === undefined ? [] : [id], add),
    clear() {
      clearOrderPreview();
      select([], false);
    },
    radius: 22,
  });
  const tacticalGestures = tacticalViewportGestures(
    canvas,
    () => camera,
    controls,
    () => scene,
    (p) => y(p),
    () => selection.length > 0,
    (p, facing, append = false) => order(p, append, facing),
    (p, facing, append = false) => queuePreview(p, append, facing),
    clearOrderPreview,
  );
  const keyboardCamera = tacticalKeyboardCamera(
    () => camera,
    controls.target,
    (yaw) => tacticalGestures.rotate(yaw),
    () =>
      Math.max(7, camera.position.distanceTo(controls.target) * 0.6),
  );
  const resize = new ResizeObserver(() => {
    const w = host.clientWidth,
      h = host.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  resize.observe(host);
  focus({ x: 506, z: 919 }, 35);
  let frame = 0,
    last = 0,
    ultraCity = false;
  const animate = (time: number) => {
    const dt = Math.min(0.1, (time - last) / 1000);
    last = time;
    if (!document.hidden) {
      if(previewRequest&&time-lastPreviewSolve>=80){renderPreview(previewRequest.p,previewRequest.facing);lastPreviewSolve=time;}
      keyboardCamera.update(dt);
      controls.update();
      camera.position.y = Math.max(
        camera.position.y,
        terrainHeight(surface, camera.position.x, camera.position.z) + 3,
      );
      controls.target.y = Math.max(
        controls.target.y,
        terrainHeight(surface, controls.target.x, controls.target.z),
      );
      if (current) {
        const shots=current.encounter?.shots.filter(s=>s.id>lastShot)??[];
        if(shots.length){
          const vertices:number[]=[];
          for(const shot of shots)vertices.push(shot.x,y(shot)+.8,shot.z,shot.tx,y({x:shot.tx,z:shot.tz})+.8,shot.tz);
          fireGeometry.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
          lastShot=shots.at(-1)!.id;fireUntil=time+220;
        }
        fireLines.visible=time<fireUntil;
        const t = snap ? 1 : Math.min(1, (time - received) / 120);
        const frameState = sampleSliceMotion(current, time - received);
        for (const u of frameState.units) {
          const old = correction.get(u.id) ?? u,
            o = objects.get(u.id)!;
          const x = old.x + (u.x - old.x) * t,
            z = old.z + (u.z - old.z) * t,
            angle =
              old.angle +
              Math.atan2(
                Math.sin(u.angle - old.angle),
                Math.cos(u.angle - old.angle),
              ) *
                t,
            distance = old.distance + (u.distance - old.distance) * t;
          o.userData.distance = distance;
          o.position.set(x, y({ x, z }, u.kind === "airship"), z);
          o.rotation.y = u.kind==="infantry"?0:angle;
          const ring = rings.get(u.id)!;
          ring.position.set(x, y({ x, z }) + 0.03, z);
          ring.visible = selection.includes(u.id);
          const parts = soldiers.get(u.id);
          if (parts) {
            if(u.members){
              u.members.forEach((member,index)=>{
                const model=o.children[index];
                model.visible=member.health!==0;
                model.position.set(member.x-x,y(member)-o.position.y,member.z-z);
                model.rotation.y=member.angle;
                const fireAge=(current!.encounter?.elapsed??0)-(current!.encounter?.shots.filter(s=>s.from===member.id).at(-1)?.at??-100);
                const firing=fireAge<.25;
                const matrices=current!.running&&member.path.length
                  ?rig.walk[Math.floor(((member.distance/1.25)%1)*64)]
                  :rig.pose("aim",.6,firing?.4:0,member.cover&&!member.path.length?(firing?.35:.7):0);
                model.children.slice(0,rig.parts.length).forEach((part,i)=>{(part as T.Mesh).matrix.fromArray(matrices[i]);part.visible=false;});
                const rifle=rifleActors.get(member.id),anti=atActors.get(member.id),actor=member.antiTank?anti:rifle;
                if(rifle)rifle.root.visible=!member.antiTank;
                if(anti)anti.root.visible=!!member.antiTank;
                if(actor){const pose=soldierReview(0);Object.assign(pose,{mode:member.path.length?"run":"aim",phase:(member.distance/1.144)%1,crouch:member.cover?(firing?.3:.6):0,recoil:firing?.5:0,reload:(member.fireMemory?.reload??0)>0?1-(member.fireMemory!.reload/3):-1});actor.update(pose);}
              });
            } else {
            const moving = current.running && u.path.length > 0;
            const matrices = moving
              ? rig.walk[Math.floor(((distance / 1.25) % 1) * 64)]
              : rig.pose("aim", 0.6, 0, u.cover && !u.path.length ? 0.7 : 0);
            parts.forEach((p, i) => p.matrix.fromArray(matrices[i % rig.parts.length]));
            o.children.forEach((member,i)=>member.visible=i<Math.ceil((u.health??100)*6/100));
            }
          }
          if (u.id === 3)
            tracks.update(
              distance / 0.55 - angle * 1.3,
              distance / 0.55 + angle * 1.3,
            );
          if(u.kind==="tank"){
            const turret=o.getObjectByName("turret_yaw");if(turret)turret.rotation.y=(u.turretAngle??u.angle)-angle;
            const barrel=o.getObjectByName("barrel_recoil"), age=(current.encounter?.elapsed??0)-(current.encounter?.shots.filter(s=>s.from===u.id).at(-1)?.at??-100);
            if(barrel)barrel.position.z=age<.5?-.24*Math.exp(-age*8):0;
          }
        }
        for (const marker of markerUnits) {
          marker.health = current.units.find(u=>u.id===marker.id)?.health ?? (marker.id<=4?100:0);
          const object = objects.get(marker.id)!;
          marker.x = object.position.x;
          marker.z = object.position.z;
        }
        const iconIds = unitMarkers.update(
          camera,
          scene,
          (unit) => y(unit, unit.kind === "airship"),
          selection,
        );
        for (const [id, object] of objects) {
          const alive=current.units.some(u=>u.id===id&&u.health!==0);
          object.visible = alive && !iconIds.has(id);
          rings.get(id)!.visible = alive && !iconIds.has(id) && (selection.includes(id)||id>4);
        }
      }
      airship.animate(time / 1000);
      for (const { site, button } of labels) {
        const p = point(site.x, site.z, 5).project(camera);
        button.hidden =
          camera.position.distanceTo(controls.target) < 500 ||
          p.z > 1 ||
          p.z < 0 ||
          Math.abs(p.x) > 1 ||
          Math.abs(p.y) > 1;
        button.style.left = `${((p.x + 1) * host.clientWidth) / 2}px`;
        button.style.top = `${((1 - p.y) * host.clientHeight) / 2}px`;
      }
      for (const s of plan.sites.filter((s) => s.poi)) {
        const wanted =
          Math.hypot(controls.target.x - s.x, controls.target.z - s.z) < 1000 &&
          !ultraCity &&
          camera.position.distanceTo(controls.target) < 650;
        distantSites.get(s.id)!.visible = !wanted;
        if (wanted && !resident.has(s.id)) {
          const asset = countryPOIAssets(s.poi!, kit, false);
          asset.group.position.set(s.x, 0, s.z);
          scene.add(asset.group);
          resident.set(s.id, asset);
        } else if (!wanted && resident.has(s.id)) {
          resident.get(s.id)!.dispose();
          resident.delete(s.id);
        }
      }
      const cityPixels =
        host.clientHeight /
        (2 *
          Math.tan(Math.PI / 8) *
          Math.max(1, camera.position.distanceTo(new T.Vector3(500, 2, 900))));
      if (ultraCity ? cityPixels > 1 : cityPixels < 0.7) {
        ultraCity = !ultraCity;
        cityRoot.visible = !ultraCity;
        citySilhouette.visible = ultraCity;
      }
      if (!ultraCity) cityView.updateEmbedded(camera, cityPixels);
      const near = Math.max(
        0.15,
        camera.position.distanceTo(controls.target) / 1200,
      );
      if (Math.abs(camera.near - near) > 0.01) {
        camera.near = near;
        camera.updateProjectionMatrix();
      }
      const roadLod = roads.update(camera, controls.target);
      landscape.update(camera, controls.target);
      const shadows = camera.position.distanceTo(controls.target) < 850;
      renderer.shadowMap.enabled = shadows;
      const hour =
        lighting === "day"
          ? 14
          : lighting === "night"
            ? 0
            : (Date.now() / 50000) % 24;
      const phase = ((hour - 6) / 24) * Math.PI * 2,
        altitude = Math.sin(phase);
      const daylight = T.MathUtils.smoothstep(altitude, -0.12, 0.35);
      ambient.intensity = 0.32 + 0.78 * daylight;
      sun.intensity = 0.35 + 2.05 * daylight;
      const nightWindows = daylight < 0.4;
      if (nightWindows !== windowsAtNight) {
        windowsAtNight = nightWindows;
        kit.setDusk(nightWindows);
        cityView.setEmbeddedDusk(nightWindows);
      }
      sun.color.set(
        altitude < 0 ? 0xa2bce5 : altitude < 0.3 ? 0xffc28a : 0xffead0,
      );
      const sky = new T.Color(0x101d2d).lerp(new T.Color(0x809397), daylight);
      (scene.background as T.Color).copy(sky);
      (scene.fog as T.FogExp2).color.copy(sky);
      sun.position.set(
        controls.target.x + Math.cos(phase) * 160,
        controls.target.y + 35 + Math.abs(altitude) * 150,
        controls.target.z + 70,
      );
      sun.target.position.copy(controls.target);
      terrainSun.value.copy(sun.position).sub(sun.target.position).normalize();
      terrainDaylight.value = daylight;
      atmosphere.update(camera, terrainSun.value, daylight);
      terrainInkDistance.value = T.MathUtils.smoothstep(
        camera.position.distanceTo(controls.target), 2800, 5500,
      );
      terrainOverview.value = T.MathUtils.smoothstep(
        camera.position.distanceTo(controls.target),
        600,
        2400,
      );
      overviewGround.visible =
        camera.position.distanceTo(controls.target) > 1800;
      ground.visible = !overviewGround.visible;
      host.dataset.lightingHour = hour.toFixed(1);
      host.dataset.cityLod = ultraCity ? "silhouette" : "detailed";
      host.dataset.roadLod = roadLod;
      renderer.render(scene, camera);
      host.dataset.drawCalls = String(renderer.info.render.calls);
      host.dataset.geometries = String(renderer.info.memory.geometries);
    }
    frame = requestAnimationFrame(animate);
  };
  frame = requestAnimationFrame(animate);
  return {
    update(state: SliceState, immediate = false) {
      if (
        current &&
        (state.time < current.time ||
          (state.time === current.time && state.revision < current.revision))
      )
        return;
      correction.clear();
      for (const [id, o] of objects)
        correction.set(id, {
          x: o.position.x,
          z: o.position.z,
          angle: o.rotation.y,
          distance: o.userData.distance ?? 0,
        });
      previous = current;
      current = state;
      snap = immediate || !previous || state.time - previous.time > 1500;
      received = performance.now();
      drawPath();
    },
    select(ids: number[]) {
      selection = ids;
      drawPath();
    },
    setLighting(mode: "cycle" | "day" | "night") {
      lighting = mode;
    },
    focus,
    focusUnit(id: number) {
      const u = current?.units.find((u) => u.id === id);
      if (u) focus(u, u.kind === "airship" ? 100 : 30);
    },
    overview() {
      focus({ x: 1500, z: 900 }, 3200);
    },
    dispose() {
      cancelAnimationFrame(frame);
      resize.disconnect();
      tacticalGestures.dispose();
      selectionControls.dispose();
      keyboardCamera.dispose();
      unitMarkers.dispose();
      clearOrderPreview();
      hint.remove();
      controls.dispose();
      atmosphere.dispose();
      cityView.dispose();
      citySilhouette.removeFromParent();
      silhouetteBuildings.dispose();
      silhouetteBox.dispose();
      silhouetteMaterial.dispose();
      simpleStreetGeometry.dispose();
      simpleStreetMaterial.dispose();
      labels.forEach((l) => l.button.remove());
      resident.forEach((a) => a.dispose());
      distantSites.forEach((mesh) => {
        mesh.removeFromParent();
        mesh.dispose();
      });
      tracks.dispose();
      tank.dispose();
      enemyTank.dispose();
      airship.dispose();
      for (const ghost of ghosts.values()) {
        ghost.root.removeFromParent();
        ghost.material.dispose();
      }
      rig.parts.forEach((p) => p.geometry.dispose());
      infantryKit.dispose();
      roads.dispose();
      landscape.dispose();
      if (pathLine) {
        pathLine.geometry.dispose();
        (pathLine.material as T.Material).dispose();
      }
      scene.traverse((o) => {
        if (o instanceof T.InstancedMesh) o.dispose();
      });
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      grain.dispose();
      kit.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

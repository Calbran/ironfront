import { portWaterfront } from "./portWaterfront";
import {
  PORT_ZONE_LABELS,
  shoreAt,
  type CityWaterfront,
} from "../../../../packages/game-core/src/portDistrict";
import { anchoredCityOrbit } from "./anchoredCityOrbit";
import { cityLightPools } from "./cityLightPools";
import { cityOcclusion } from "./cityOcclusion";
import { refinedGrain, refineSurface, cityAppearance } from "./refinedSurface";
import { createMilitaryModel } from "../prototypes/militaryModels";
import {
  CITY_PROP_SCALE,
  CITY_STREET_PROP_SCALE,
} from "../../../../packages/game-core/src/cityPropScale";
import { createCityTestUnits } from "./cityTestUnits";
import {
  createCityTactics,
  CIVIC_WALLS,
  CITY_PLAZA_SURFACE,
} from "../../../../packages/game-core/src/cityTactics";
import { worldRiverSample } from "../../../../packages/game-core/src/worldRiverSample";
import {
  planCombinedDistrict,
  combinedPosition,
  combinedCanonicalZ,
  combinedHeight,
  combinedLot,
  type TerrainProfile,
} from "../../../../packages/game-core/src/combinedDistrict";
import { streetOutlines, offsetOutline, connectedRoadEnd } from "./streetEdges";
import {
  planTerrainDistrict,
  districtHeight,
  districtGroundHeight,
  TERRAIN_RIVER_Z,
} from "../../../../packages/game-core/src/terrainDistrict";
import {
  planAngledDistrict,
  insetBlock,
} from "../../../../packages/game-core/src/angledDistrict";
import {
  cityBuildingEnvelope,
  cityBuildingFootprint,
} from "../../../../packages/game-core/src/cityBuildingKit";
import { planDistrictCity } from "../../../../packages/game-core/src/districtCity";
import {
  planCraftedNeighborhood,
  neighborhoodHeight,
} from "../../../../packages/game-core/src/craftedNeighborhood";
import {
  planOrganicCity,
  inCivicPrecinct,
  lineDistance,
  lotIntersectsStreet,
  type CityLot,
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
    districts?: { kind: string; buildings: number }[];
  }) => void,
) {
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute("aria-label", "City viewport");
  const focusCanvas = () => renderer.domElement.focus({ preventScroll: true });
  renderer.domElement.addEventListener("pointerdown", focusCanvas, true);
  host.append(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color("#263933");
  const planningCamera = new T.OrthographicCamera(
    -110,
    110,
    90,
    -90,
    0.1,
    1500,
  );
  const streetCamera = new T.PerspectiveCamera(
    36,
    host.clientWidth / host.clientHeight,
    0.1,
    1500,
  );
  let camera: T.OrthographicCamera | T.PerspectiveCamera = planningCamera;
  let streetMode = false;
  let savedPlanning:
    | { position: T.Vector3; target: T.Vector3; zoom: number; minPolar: number }
    | undefined;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.zoomSpeed = -1;
  controls.enableRotate = true;
  controls.minPolarAngle = T.MathUtils.degToRad(15);
  controls.maxPolarAngle = T.MathUtils.degToRad(50);
  controls.screenSpacePanning = false;
  controls.enableDamping = true;
  controls.mouseButtons = {
    LEFT: -1 as T.MOUSE,
    MIDDLE: -1 as T.MOUSE,
    RIGHT: -1 as T.MOUSE,
  };
  controls.minZoom = 0.45;
  controls.maxZoom = 12;
  const panKeys = new Set<string>();
  const typing = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      !!target.closest(
        'textarea,select,input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"])',
      ));
  const keyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (
      !"wasdqe".includes(key) ||
      key.length !== 1 ||
      typing(event.target) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    panKeys.add(key);
    event.preventDefault();
  };
  const keyUp = (event: KeyboardEvent) =>
    panKeys.delete(event.key.toLowerCase());
  const clearPan = () => panKeys.clear();
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  window.addEventListener("blur", clearPan);
  window.addEventListener("focusin", clearPan);
  let lastPan = performance.now();
  const panForward = new T.Vector3(),
    panRight = new T.Vector3(),
    panMove = new T.Vector3();
  const panUp = new T.Vector3(0, 1, 0);

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
    dummy = new T.Object3D(),
    smokeFacing = new T.Quaternion();
  const cutaway = cityOcclusion(
    [...kit.variants.entries(), ...kit.distantVariants.entries()]
      .filter(
        ([name]) =>
          !name.startsWith("tree") &&
          name !== "pine" &&
          !name.startsWith("ground") &&
          !name.startsWith("street"),
      )
      .flatMap(([, parts]) => parts.map((p) => p.material)),
  );
  let group = new T.Group(),
    count = 0,
    extent = 100,
    winter = false,
    dusk = false,
    disposed = false,
    raf = 0;
  let testUnits: ReturnType<typeof createCityTestUnits> | undefined;
  let airship: ReturnType<typeof createMilitaryModel> | undefined;
  let reviewingAirship = false;
  let airshipTime = 0;
  let airshipHeight = 54;
  let orbitHeight: (p: { x: number; z: number }) => number = () => 2;
  const anchoredOrbit = anchoredCityOrbit(
    renderer.domElement,
    () => camera,
    controls,
    () => group,
    (p) => tacticalData?.surfaceHeight(p) ?? orbitHeight(p),
    () => !!testUnits?.state().selectedIds.length,
    (p, facing) => testUnits?.orderAt(p, facing),
    (p, facing) => testUnits?.previewAt(p, facing),
    () => testUnits?.clearPreview(),
  );
  let tacticalFactory: (() => ReturnType<typeof createCityTactics>) | undefined;
  let tacticalData: ReturnType<typeof createCityTactics> | undefined;
  let tacticalOverlay: T.Group | undefined;
  let tacticalRoute: { x: number; z: number }[] = [];
  function showTactics(
    enabled: boolean,
    mover: "infantry" | "vehicle" = "infantry",
  ) {
    if (tacticalOverlay) {
      tacticalOverlay.traverse((o) => {
        if (o instanceof T.Line) {
          o.geometry.dispose();
          (o.material as T.Material).dispose();
        }
      });
      group.remove(tacticalOverlay);
      tacticalOverlay = undefined;
    }
    if (!enabled || !tacticalFactory) return undefined;
    tacticalData ??= tacticalFactory();
    const data = tacticalData;
    tacticalOverlay = new T.Group();
    group.add(tacticalOverlay);
    const lines = (points: { x: number; z: number }[], color: number) => {
      const g = new T.BufferGeometry().setFromPoints(
        points.map((p) => new T.Vector3(p.x, data.height(p) + 0.3, p.z)),
      );
      const line = new T.LineSegments(
        g,
        new T.LineBasicMaterial({
          color,
          depthTest: false,
          transparent: true,
          opacity: 0.8,
        }),
      );
      line.renderOrder = 20;
      tacticalOverlay!.add(line);
    };
    const edges: { x: number; z: number }[] = [];
    for (const o of data.obstacles) {
      const c = Math.cos(o.angle),
        s = Math.sin(o.angle);
      const ps = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([x, z]) => ({
        x: o.x + ((x * o.width) / 2) * c + ((z * o.depth) / 2) * s,
        z: o.z - ((x * o.width) / 2) * s + ((z * o.depth) / 2) * c,
      }));
      for (let i = 0; i < 4; i++) edges.push(ps[i], ps[(i + 1) % 4]);
    }
    lines(edges, 0xff785e);
    lines(
      data.cover.flatMap((c) => [
        c.position,
        { x: c.position.x + c.normal.x, z: c.position.z + c.normal.z },
      ]),
      0x67e3ed,
    );
    lines(
      [
        { x: -24, z: -18 },
        { x: 24, z: -18 },
        { x: 24, z: -18 },
        { x: 24, z: 19 },
        { x: 24, z: 19 },
        { x: -24, z: 19 },
        { x: -24, z: 19 },
        { x: -24, z: -18 },
      ],
      0xffd86b,
    );
    // Use genuine road endpoints as approaches. A failed route is reported, never drawn through obstacles.
    const candidates = data.streets
      .flatMap((s) => s.points)
      .filter((p) => p.z > 100 && data.walkable(p, mover))
      .sort((a, b) => Math.abs(a.x) - Math.abs(b.x) || b.z - a.z);
    const targets =
      mover === "infantry"
        ? [{ x: 0, z: 10 }]
        : data.streets
            .flatMap((s) => s.points)
            .filter(
              (p) =>
                p.z >= 19 &&
                p.z < 25 &&
                Math.abs(p.x) < 40 &&
                data.walkable(p, mover),
            )
            .sort((a, b) => Math.abs(a.x) - Math.abs(b.x));
    tacticalRoute =
      candidates[0] && targets[0]
        ? data.route(candidates[0], targets[0], mover)
        : [];
    lines(
      tacticalRoute.flatMap((p, i) => (i ? [tacticalRoute[i - 1], p] : [])),
      0x88ff82,
    );
    return {
      obstacles: data.obstacles.length,
      cover: data.cover.length,
      routePoints: tacticalRoute.length,
      mover,
    };
  }
  let worldBearing = 0;
  let unitCount = 144;
  let modelCounts: Record<string, number> = {};
  const overviewBounds = new T.Box3();
  let districtSummary: { kind: string; buildings: number }[] = [];
  let activeWaterfront: CityWaterfront | undefined;
  scene.add(group);
  const ownedTextures: T.Texture[] = [];
  const materials: T.Material[] = [],
    geometries: T.BufferGeometry[] = [];
  let winterMeshes: T.Object3D[] = [],
    ground: T.MeshStandardMaterial | undefined;
  const shared = new Set(
    [...kit.variants.values(), ...kit.distantVariants.values()].flatMap((v) =>
      v.map((p) => p.geometry),
    ),
  );
  const sharedMats = new Set(
    [...kit.variants.values(), ...kit.distantVariants.values()].flatMap((v) =>
      v.map((p) => p.material),
    ),
  );
  const mat = (color: string) => {
    const m = new T.MeshStandardMaterial({ color, roughness: 0.9 });
    materials.push(m);
    return m;
  };
  let distant = false;
  let detailMeshes: T.Object3D[] = [],
    distantMeshes: T.Object3D[] = [];
  let lodSnow = new Set<T.Object3D>();
  let smoke: T.InstancedMesh | undefined;
  const localLights: T.PointLight[] = [];
  let fixturePools: ReturnType<typeof cityLightPools>;
  let fixtureGlass: T.MeshStandardMaterial | undefined;
  let fixtureCount = 0;
  let smokeSources: { x: number; y: number; z: number; steam?: boolean }[] = [];
  function clear() {
    anchoredOrbit.cancel();
    testUnits?.dispose();
    testUnits = undefined;
    reviewingAirship = false;
    airshipTime = 0;
    if (airship) {
      airship.root.removeFromParent();
      airship.dispose();
      airship = undefined;
    }
    tacticalFactory = undefined;
    tacticalData = undefined;
    tacticalOverlay = undefined;
    tacticalRoute = [];
    smoke = undefined;
    detailMeshes = [];
    distantMeshes = [];
    lodSnow.clear();
    localLights.length = 0;
    fixturePools = undefined;
    fixtureGlass = undefined;
    fixtureCount = 0;
    smokeSources = [];
    ownedTextures.splice(0).forEach((t) => t.dispose());
    group.traverse((o) => {
      if (o instanceof T.InstancedMesh) o.dispose();
      if (o instanceof T.Mesh || o instanceof T.Line) {
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
  function generate(
    target = 160,
    seed = 731,
    angled = false,
    terrainFit = false,
    riverThrough = false,
    combined = false,
    profile: TerrainProfile = "normal",
    fullTile = false,
  ) {
    clear();
    worldBearing = 0;
    if (combined) {
      angled = true;
      terrainFit = true;
      riverThrough = true;
    }
    count = target;
    unitCount = fullTile ? 0 : 144;
    const crafted = true;
    const elevation = (z: number, x = 0) =>
      combined
        ? combinedHeight(x, z, profile, fullTile)
        : terrainFit
          ? districtHeight(z)
          : crafted
            ? neighborhoodHeight(z)
            : 0;
    orbitHeight = (p) =>
      elevation(combined ? combinedCanonicalZ(p, seed, profile) : p.z, p.x);
    const stone = mat("#aba58c"),
      roof = mat("#485b61"),
      wood = mat("#755d42"),
      brass = mat("#bf9c58"),
      path = mat("#b1a17c"),
      paving = mat("#8f9387"),
      soil = mat("#827456"),
      leaves = mat("#778c51");
    ground = mat(winter ? "#dde3dc" : "#8f9c66");
    const terrainGrain = refinedGrain();
    ownedTextures.push(terrainGrain);
    for (const surface of [ground, soil, leaves, path])
      refineSurface(surface, terrainGrain);
    let civicScale = 1;
    let propAnchor: { x: number; z: number; scale: number } | undefined;
    const batches = new Map<T.Material, T.BufferGeometry[]>();
    let worldRoadSurface = false;
    const add = (
      g: T.BufferGeometry,
      m: T.Material,
      x: number,
      y: number,
      z: number,
      angle = 0,
    ) => {
      g.rotateY(angle);
      if (propAnchor) {
        const s = propAnchor.scale;
        g.scale(s, s, s);
        x = propAnchor.x + (x - propAnchor.x) * s;
        z = propAnchor.z + (z - propAnchor.z) * s;
        y *= s;
      }
      g.translate(x, y, z);
      g.scale(civicScale, civicScale, civicScale);
      if (m !== ground) {
        const pos = g.getAttribute("position");
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i),
            z = pos.getZ(i);
          pos.setY(
            i,
            pos.getY(i) +
              elevation(
                worldRoadSurface && combined
                  ? combinedCanonicalZ({ x, z }, seed, profile)
                  : z,
                x,
              ),
          );
          if (combined && !worldRoadSurface)
            pos.setZ(i, combinedPosition({ x, z }, seed, profile).z);
        }
        g.computeVertexNormals();
      }
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
    ) =>
      add(
        new T.BoxGeometry(
          w,
          h,
          d,
          crafted && m !== ground ? Math.max(1, Math.ceil(w / 2)) : 1,
          1,
          crafted && m !== ground ? Math.max(1, Math.ceil(d / 2)) : 1,
        ),
        m,
        x,
        y,
        z,
        a,
      );
    const terrainPlan = combined
      ? planCombinedDistrict(seed, profile, fullTile)
      : terrainFit
        ? planTerrainDistrict(seed)
        : undefined;
    const parcelPlan =
      terrainPlan ??
      (angled ? planAngledDistrict(seed, riverThrough) : undefined);
    const layout =
      parcelPlan ??
      (target === 28
        ? { ...planCraftedNeighborhood(), districts: [] }
        : planDistrictCity(target, seed));
    if (combined && fullTile && terrainPlan)
      tacticalFactory = () =>
        createCityTactics(
          terrainPlan as ReturnType<typeof planCombinedDistrict>,
          seed,
          profile,
        );
    const oceanCoast = terrainPlan?.waterfront;
    activeWaterfront = oceanCoast;
    const lots = layout.lots;
    const foundationLevels = new Map<object, number>();
    if (terrainPlan)
      for (const f of terrainPlan.foundations)
        foundationLevels.set(lots[f.lotIndex], f.base);
    const buildingBase = (p: { z: number }) =>
      foundationLevels.get(p) ?? elevation(p.z, "x" in p ? Number(p.x) : 0);
    overviewBounds.makeEmpty();
    for (const lot of lots) {
      const p = combined ? combinedLot(lot, seed, profile) : lot;
      overviewBounds.expandByPoint(
        new T.Vector3(p.x - 12, buildingBase(lot), p.z - 12),
      );
      overviewBounds.expandByPoint(
        new T.Vector3(
          p.x + 12,
          buildingBase(lot) +
            (lot.variant.startsWith("commercialTower") ? 50 : 20),
          p.z + 12,
        ),
      );
    }
    districtSummary = parcelPlan
      ? ["commercial", "residential", "industrial"].map((kind) => ({
          kind,
          buildings: parcelPlan.parcels
            .filter((p) => p.kind === kind)
            .reduce((n, p) => n + p.lotIndices.length, 0),
        }))
      : "districts" in layout
        ? layout.districts.map((d) => ({
            kind: d.kind,
            buildings: d.buildings,
          }))
        : [];
    if (terrainPlan?.waterfront) {
      districtSummary = ["commercial", "residential", "industrial"].map(
        (kind) => ({
          kind,
          buildings: terrainPlan.parcels
            .filter((p) => p.kind === kind && !p.portZone)
            .reduce((n, p) => n + p.lotIndices.length, 0),
        }),
      );
      for (const [zone, label] of Object.entries(PORT_ZONE_LABELS))
        districtSummary.push({
          kind: label,
          buildings: terrainPlan.parcels
            .filter((p) => p.portZone === zone)
            .reduce((n, p) => n + p.lotIndices.length, 0),
        });
    }
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
    box(
      ground,
      0,
      -0.65,
      oceanCoast ? (oceanCoast.shoreZ - extent - 16) / 2 : 0,
      extent * 2 + 32,
      1.2,
      oceanCoast ? oceanCoast.shoreZ + extent + 16 : extent * 2 + 32,
    );
    if (crafted) {
      const terrain = new T.PlaneGeometry(
        extent * 2 + 32,
        extent * 2 + 32,
        terrainFit || riverThrough ? 256 : 64,
        terrainFit || riverThrough ? 256 : 64,
      ).rotateX(-Math.PI / 2);
      const pos = terrain.getAttribute("position");
      if (oceanCoast)
        for (let i = 0; i < pos.count; i++)
          pos.setZ(i, Math.min(pos.getZ(i), oceanCoast.shoreZ));
      for (let i = 0; i < pos.count; i++)
        pos.setY(
          i,
          (combined
            ? combinedHeight(pos.getX(i), pos.getZ(i), profile, fullTile) -
              2.6 * Math.max(0, 1 - Math.abs(pos.getZ(i) + 94) / 6)
            : terrainFit
              ? districtGroundHeight(pos.getZ(i))
              : elevation(pos.getZ(i)) -
                (riverThrough
                  ? 2.6 * Math.max(0, 1 - Math.abs(pos.getZ(i) + 94) / 6)
                  : 0)) - 0.04,
        );
      if (combined)
        for (let i = 0; i < pos.count; i++)
          pos.setZ(
            i,
            combinedPosition({ x: pos.getX(i), z: pos.getZ(i) }, seed, profile)
              .z,
          );
      terrain.computeVertexNormals();
      add(terrain, ground, 0, 0, 0);
      // Continuous developed blocks: civic paving, residential yards and lower quay.
      box(
        paving,
        CITY_PLAZA_SURFACE.x,
        0.025,
        CITY_PLAZA_SURFACE.z,
        CITY_PLAZA_SURFACE.width,
        0.1,
        CITY_PLAZA_SURFACE.depth,
      );
      if (!fullTile) {
        box(soil, 0, 0.04, 36, 76, 0.12, 22);
        box(stone, 0, 0.09, 45, 76, 0.2, 2);
      }
    } else box(paving, 0, 0.025, 0, 36, 0.1, 32);
    if (crafted && !fullTile) {
      box(paving, 0, 0.025, 25, 48, 0.1, 18);
      if (target === 28)
        for (const x of [-37, 37]) box(stone, x, 0.5, -7, 0.6, 1, 54);
      for (const x of [-21, 21])
        for (let z = 23; z < 33; z += 1) box(stone, x, 0.13, z, 2, 0.25, 1);
    }
    if ("districts" in layout && !fullTile) {
      for (const d of layout.districts) {
        box(
          d.kind === "industrial" ? soil : paving,
          d.x,
          0.03,
          d.z,
          d.width + 2,
          0.1,
          d.depth + 4,
        );
      }
      const central = layout.districts.filter((d) => d.x === 0);
      if (central.length)
        for (const side of [-1, 1]) {
          const neighbors = layout.districts.filter(
            (d) => d.x === side * 60 && d.kind !== "industrial",
          );
          if (neighbors.length) {
            const low = Math.max(
              Math.min(...central.map((d) => d.z - 14)),
              Math.min(...neighbors.map((d) => d.z - 14)),
            );
            if (low < -30)
              box(paving, side * 30, 0.025, (low - 30) / 2, 16, 0.1, -30 - low);
          }
        }
      const developedWidth =
        Math.max(
          ...layout.districts.map((d) => Math.abs(d.x) + d.width / 2),
          38,
        ) * 2;
      box(soil, 0, 0.02, 55, developedWidth, 0.08, 16);
      box(paving, 0, 0.025, 15, developedWidth, 0.1, 32);
      if (layout.districts.some((d) => d.x === 0))
        box(paving, 0, 0.025, -30, 44, 0.1, 24);
    }
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
    const roadCanvas = document.createElement("canvas");
    roadCanvas.width = roadCanvas.height = 128;
    const roadContext = roadCanvas.getContext("2d")!;
    const pixels = roadContext.createImageData(128, 128);
    for (let i = 0; i < 128 * 128; i++) {
      const grain = 72 + ((Math.imul(i + 17, 1103515245) >>> 16) % 19);
      pixels.data.set([grain, grain + 2, grain, 255], i * 4);
    }
    roadContext.putImageData(pixels, 0, 0);
    const roadTexture = new T.CanvasTexture(roadCanvas);
    roadTexture.colorSpace = T.SRGBColorSpace;
    roadTexture.wrapS = roadTexture.wrapT = T.RepeatWrapping;
    ownedTextures.push(roadTexture);
    const carriageway = mat("#c4c6bd");
    carriageway.map = roadTexture;
    carriageway.bumpMap = roadTexture;
    carriageway.bumpScale = 0.018;
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
    const entrancePath = (
      a: { x: number; z: number },
      b: { x: number; z: number },
    ) => {
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      const width = Math.max(
        3,
        ...layout.streets
          .filter((s) => lineDistance(b, s.points) < 0.01)
          .map((s) => s.width),
      );
      const t = Math.max(0, (length - width / 2 - 0.28) / length);
      if (t > 0)
        ribbon(
          [a, { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }],
          1.25,
          paving,
          0.13,
        );
    };
    if (parcelPlan) {
      const polygon = (
        points: { x: number; z: number }[],
        m: T.Material,
        y: number,
      ) => {
        if (points.length < 3) return;
        const positions: number[] = [];
        const triangle = (
          a: { x: number; z: number },
          b: { x: number; z: number },
          c: { x: number; z: number },
          depth = 0,
        ) => {
          if (
            terrainFit &&
            depth < 6 &&
            Math.max(
              Math.hypot(a.x - b.x, a.z - b.z),
              Math.hypot(a.x - c.x, a.z - c.z),
              Math.hypot(b.x - c.x, b.z - c.z),
            ) > 3
          ) {
            const ab = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
              ac = { x: (a.x + c.x) / 2, z: (a.z + c.z) / 2 },
              bc = { x: (b.x + c.x) / 2, z: (b.z + c.z) / 2 };
            triangle(a, ab, ac, depth + 1);
            triangle(ab, b, bc, depth + 1);
            triangle(ac, bc, c, depth + 1);
            triangle(ab, bc, ac, depth + 1);
          } else for (const p of [a, b, c]) positions.push(p.x, y, p.z);
        };
        for (let i = 1; i < points.length - 1; i++)
          triangle(points[0], points[i + 1], points[i]);
        const geometry = new T.BufferGeometry();
        geometry.setAttribute(
          "position",
          new T.Float32BufferAttribute(positions, 3),
        );
        geometry.setAttribute(
          "uv",
          new T.Float32BufferAttribute(
            positions.flatMap((_, i) =>
              i % 3 === 0 ? [positions[i] / 4, positions[i + 2] / 4] : [],
            ),
            2,
          ),
        );
        geometry.computeVertexNormals();
        add(geometry, m, 0, 0, 0);
      };
      // A shared forecourt joins the civic market to the new district frontage.
      polygon(
        [
          { x: -38, z: -50 },
          { x: 38, z: -50 },
          { x: 38, z: -33 },
          { x: -38, z: -33 },
        ],
        paving,
        0.09,
      );
      for (const parcel of parcelPlan.parcels) {
        polygon(insetBlock(parcel.boundary, 1.8), paving, 0.09);
        if (parcel.court.length >= 3) {
          polygon(parcel.court, soil, 0.18);
          polygon(insetBlock(parcel.court, 0.45), leaves, 0.22);
          ribbon([...parcel.court, parcel.court[0]], 0.3, stone, 0.25);
          for (let i = 0; i < parcel.court.length; i++) {
            const a = parcel.court[i],
              b = parcel.court[(i + 1) % parcel.court.length];
            const length = Math.hypot(b.x - a.x, b.z - a.z);
            if (length < 8) continue;
            const x = (a.x + b.x) / 2 - (b.z - a.z) / length,
              z = (a.z + b.z) / 2 + (b.x - a.x) / length;
            box(
              wood,
              x,
              0.6,
              z,
              2,
              0.16,
              0.65,
              Math.atan2(-(b.z - a.z), b.x - a.x),
            );
          }
        }
      }
      if ("decorations" in parcelPlan)
        for (const feature of (
          parcelPlan as ReturnType<typeof planCombinedDistrict>
        ).decorations) {
          const p = combinedPosition(feature, seed, profile);
          worldRoadSurface = true;
          if (feature.kind !== "plaza")
            box(stone, p.x, 0.13, p.z, 4.4, 0.12, 3.6);
          if (feature.kind === "cargo") {
            for (let i = 0; i < 5; i++)
              box(
                wood,
                p.x - 1.25 + (i % 3) * 1.1,
                0.6 + Math.floor(i / 3) * 0.65,
                p.z - 0.7 + Math.floor(i / 3) * 1.05,
                1,
                0.8,
                0.9,
              );
            for (const side of [-1, 1])
              box(brass, p.x + side * 1.7, 0.35, p.z, 0.12, 0.4, 3);
          } else if (feature.kind === "tank") {
            add(new T.CylinderGeometry(1.1, 1.1, 2.6, 12), roof, p.x, 1.5, p.z);
            add(
              new T.TorusGeometry(1.12, 0.09, 4, 12).rotateX(Math.PI / 2),
              brass,
              p.x,
              2.1,
              p.z,
            );
            box(brass, p.x + 1.3, 0.5, p.z, 0.2, 0.3, 2.4);
          } else {
            box(stone, p.x, 0.35, p.z, 1.3, 0.45, 0.8);
            box(leaves, p.x, 0.65, p.z, 1.15, 0.2, 0.7);
            for (const side of [-1, 1]) {
              box(wood, p.x, 0.36, p.z + side * 1, 1.4, 0.07, 0.36);
              for (const dx of [-1, 1])
                box(
                  roof,
                  p.x + dx * 0.5,
                  0.24,
                  p.z + side * 1,
                  0.055,
                  0.25,
                  0.29,
                );
            }
          }
          worldRoadSurface = false;
        }
      for (const access of parcelPlan.access) {
        if (!terrainFit) {
          entrancePath(access.entrance, access.street);
          continue;
        }
        const a = combined
            ? combinedPosition(access.entrance, seed, profile)
            : access.entrance,
          b = combined
            ? combinedPosition(access.street, seed, profile)
            : access.street,
          base = buildingBase(lots[access.lotIndex]);
        const length = Math.hypot(b.x - a.x, b.z - a.z);
        const dx = (b.x - a.x) / length,
          dz = (b.z - a.z) / length;
        const roadWidth = Math.max(
          ...layout.streets
            .filter((s) => lineDistance(access.street, s.points) < 0.01)
            .map((s) => s.width),
          3,
        );
        // Keep stoops inside the sidewalk; the remaining approach uses existing paving.
        const run = Math.min(1.25, Math.max(0, length - roadWidth / 2 - 0.35));
        const endZ = a.z + dz * run;
        const surfaceHeight = (x: number, z: number) =>
          elevation(
            combined ? combinedCanonicalZ({ x, z }, seed, profile) : z,
            x,
          );
        const rise = base - surfaceHeight(a.x + dx * run, endZ);
        if (rise < 0.14 || run < 0.25) continue;
        const n = Math.min(6, Math.max(1, Math.ceil(rise / 0.17)));
        const angle = Math.atan2(dx, dz);
        for (let i = 0; i < n; i++) {
          const distance = ((i + 0.5) * run) / n,
            x = a.x + dx * distance,
            z = a.z + dz * distance;
          const top = base + 0.12 - (rise * i) / n;
          const g = new T.BoxGeometry(1, 0.1, run / n + 0.015).rotateY(angle);
          const positions = g.getAttribute("position");
          for (let j = 0; j < positions.count; j++) {
            const ground = surfaceHeight(
              x + positions.getX(j),
              z + positions.getZ(j),
            );
            // Solid risers reach the ground; treads stay horizontal on the hill.
            positions.setY(
              j,
              (positions.getY(j) > 0 ? top : ground + 0.07) - ground,
            );
          }
          worldRoadSurface = true;
          add(g, paving, x, 0, z);
          worldRoadSurface = false;
        }
      }
      if (terrainPlan)
        for (const f of terrainPlan.foundations) {
          if (f.base - f.low < 0.04) continue;
          const lot = lots[f.lotIndex],
            pose = combined ? combinedLot(lot, seed, profile) : lot,
            bounds = cityBuildingFootprint(lot.variant);
          // Foundation shares the model's rigid footprint, not its roof/clearance envelope.
          const g = new T.BoxGeometry(
            bounds.width * lot.scale + 0.08,
            0.1,
            bounds.depth * lot.scale + 0.08,
          ).rotateY(pose.angle);
          const p = g.getAttribute("position");
          for (let i = 0; i < p.count; i++) {
            const x = pose.x + p.getX(i),
              z = pose.z + p.getZ(i);
            const ground = elevation(
              combined ? combinedCanonicalZ({ x, z }, seed, profile) : z,
              x,
            );
            p.setY(
              i,
              (p.getY(i) > 0 ? f.base - 0.015 : ground - 0.12) - ground,
            );
          }
          worldRoadSurface = true;
          add(g, kit.architecture.walls, pose.x, 0, pose.z);
          worldRoadSurface = false;
        }
    }
    const water = mat("#477d84");
    if (oceanCoast && terrainPlan) {
      worldRoadSurface = true;
      for (const part of portWaterfront(
        oceanCoast,
        terrainPlan.portInfrastructure,
        {
          water,
          stone,
          wood,
          iron: roof,
          brass,
          roof: kit.architecture.roof,
          brick: kit.architecture.walls,
        },
      ))
        add(part.geometry, part.material, 0, 0, 0);
      worldRoadSurface = false;
    }
    for (const river of layout.rivers) {
      ribbon(
        river,
        7,
        soil,
        (terrainFit && river[0].z === TERRAIN_RIVER_Z) ||
          (riverThrough && river[0].z === -94)
          ? -2
          : 0.015,
      );
      ribbon(
        river,
        4,
        water,
        (terrainFit && river[0].z === TERRAIN_RIVER_Z) ||
          (riverThrough && river[0].z === -94)
          ? -0.65
          : 0.075,
      );
    }
    if (riverThrough) {
      const crossings = layout.streets
        .filter(
          (s) =>
            s.points[0].z < -94 &&
            s.points.at(-1)!.z > -94 &&
            s.points[0].x === s.points.at(-1)!.x,
        )
        .map((s) => s.points[0].x)
        .sort((a, b) => a - b);
      for (const side of [-1, 1]) {
        box(paving, 0, 0.09, -94 + side * 4, fullTile ? 320 : 128, 0.12, 3);
        let start = fullTile ? -160 : -64;
        for (const end of [
          ...crossings.map((x) => x - 2),
          fullTile ? 160 : 64,
        ]) {
          if (end > start)
            box(
              kit.architecture.walls,
              (start + end) / 2,
              -1,
              -94 + side * 2.4,
              end - start,
              2.2,
              0.35,
            );
          if (end > start)
            box(
              stone,
              (start + end) / 2,
              0.13,
              -94 + side * 2.4,
              end - start,
              0.18,
              0.52,
            );
          start = end + 4;
        }
      }
    }
    const trimPaint = mat("#c5bea3");
    const canalZ = riverThrough
      ? -94
      : terrainFit
        ? TERRAIN_RIVER_Z
        : undefined;
    if (canalZ !== undefined) {
      const crossings = layout.streets.filter(
        (s) =>
          (s.points[0].z < canalZ &&
            s.points.at(-1)!.z > canalZ &&
            s.points[0].x === s.points.at(-1)!.x) ||
          (s.points[0].z > canalZ &&
            s.points.at(-1)!.z < canalZ &&
            s.points[0].x === s.points.at(-1)!.x),
      );
      for (const street of crossings) {
        const x = street.points[0].x;
        const arch = (
          width: number,
          height: number,
          offset: number,
          material: T.Material,
          dx = 0,
        ) => {
          const g = new T.BoxGeometry(width, height, 9, 1, 1, 36),
            p = g.getAttribute("position");
          for (let i = 0; i < p.count; i++)
            p.setY(i, p.getY(i) + 0.55 * (1 - Math.pow(p.getZ(i) / 4.5, 2)));
          add(g, material, x + dx, offset, canalZ);
        };
        arch(street.width, 0.45, -0.055, kit.architecture.walls);
        arch(street.width, 0.08, 0.17, carriageway);
        for (const z of [-3, 0, 3]) {
          const g = new T.BoxGeometry(0.11, 0.012, 1.45, 1, 1, 6),
            p = g.getAttribute("position");
          for (let i = 0; i < p.count; i++)
            p.setY(
              i,
              p.getY(i) + 0.55 * (1 - Math.pow((p.getZ(i) + z) / 4.5, 2)),
            );
          add(g, trimPaint, x, 0.217, canalZ + z);
        }
        for (const side of [-1, 1]) {
          arch(
            0.3,
            0.62,
            0.47,
            kit.architecture.walls,
            (side * street.width) / 2,
          );
          arch(0.44, 0.12, 0.84, stone, (side * street.width) / 2);
        }
      }
      // A small open wooden rowboat floats at the same waterline as the channel.
      if (riverThrough) {
        const boatX = 8,
          boatZ = canalZ + 1.05;
        const hull = [
          [-1.65, 0],
          [-1.05, -0.48],
          [0.9, -0.48],
          [1.5, -0.2],
          [1.5, 0.2],
          [0.9, 0.48],
          [-1.05, 0.48],
        ];
        const positions: number[] = [];
        for (let i = 0; i < hull.length; i++) {
          const a = hull[i],
            b = hull[(i + 1) % hull.length];
          const vertices = [
            [a[0], 0.23, a[1]],
            [b[0], 0.23, b[1]],
            [b[0] * 0.82, -0.12, b[1] * 0.7],
            [a[0] * 0.82, -0.12, a[1] * 0.7],
          ];
          for (const j of [0, 1, 2, 0, 2, 3, 2, 1, 0, 3, 2, 0])
            positions.push(...vertices[j]);
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          box(
            wood,
            boatX + (a[0] + b[0]) / 2,
            -0.38,
            boatZ + (a[1] + b[1]) / 2,
            0.08,
            0.08,
            len,
            Math.atan2(b[0] - a[0], b[1] - a[1]),
          );
        }
        const hullGeometry = new T.BufferGeometry();
        hullGeometry.setAttribute(
          "position",
          new T.Float32BufferAttribute(positions, 3),
        );
        hullGeometry.setAttribute(
          "uv",
          new T.Float32BufferAttribute(
            new Float32Array((positions.length / 3) * 2),
            2,
          ),
        );
        hullGeometry.computeVertexNormals();
        add(hullGeometry, wood, boatX, -0.65, boatZ);
        // The visible floor covers the whole pointed interior above the water surface.
        // The lower hull remains submerged; the water plane cannot show through the cockpit.
        const floorVertices: number[] = [];
        for (let i = 1; i < hull.length - 1; i++)
          for (const p of [hull[0], hull[i + 1], hull[i]])
            floorVertices.push(p[0], 0, p[1]);
        const floorGeometry = new T.BufferGeometry();
        floorGeometry.setAttribute(
          "position",
          new T.Float32BufferAttribute(floorVertices, 3),
        );
        floorGeometry.setAttribute(
          "uv",
          new T.Float32BufferAttribute(
            new Float32Array((floorVertices.length / 3) * 2),
            2,
          ),
        );
        floorGeometry.computeVertexNormals();
        add(floorGeometry, wood, boatX, -0.54, boatZ);
        for (const x of [-0.7, 0.45])
          box(wood, boatX + x, -0.46, boatZ, 0.22, 0.08, 0.83);
        box(wood, boatX, -0.32, boatZ, 0.07, 0.06, 1.7, 0.6);
        // Mooring posts, a rope and stacked cargo stay on the promenade.
        for (const x of [7, 19, 38, -44]) {
          add(
            new T.CylinderGeometry(0.12, 0.16, 0.48, 8),
            roof,
            x,
            0.36,
            canalZ + 3,
          );
          box(brass, x, 0.59, canalZ + 3, 0.38, 0.08, 0.18);
        }
        const ropeA = new T.Vector3(boatX - 0.8, -0.38, boatZ + 0.4),
          ropeB = new T.Vector3(7, 0.48, canalZ + 3);
        const delta = ropeB.clone().sub(ropeA),
          middle = ropeA.clone().add(ropeB).multiplyScalar(0.5);
        const rope = new T.CylinderGeometry(0.022, 0.022, delta.length(), 6);
        rope.applyQuaternion(
          new T.Quaternion().setFromUnitVectors(
            new T.Vector3(0, 1, 0),
            delta.normalize(),
          ),
        );
        add(rope, wood, middle.x, middle.y, middle.z);
        if (riverThrough)
          for (const x of [18, 19.1, 37])
            box(wood, x, 0.44, canalZ + 4.2, 0.8, 0.65, 0.75);
      }
    }
    // Nearby road samples let furniture and curb gaps respect junctions without global scans.
    type RoadSample = { x: number; z: number; width: number; owner: number };
    const roadCells = new Map<string, RoadSample[]>();
    for (const [owner, s] of layout.streets.entries())
      for (const p of s.points) {
        const key = `${Math.floor(p.x / 4)},${Math.floor(p.z / 4)}`;
        const bucket = roadCells.get(key) ?? [];
        bucket.push({ ...p, width: s.width, owner });
        roadCells.set(key, bucket);
      }
    const inOtherRoad = (
      x: number,
      z: number,
      owner: number,
      padding = 0.3,
    ) => {
      const cx = Math.floor(x / 4),
        cz = Math.floor(z / 4);
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++)
          if (
            (roadCells.get(`${cx + dx},${cz + dz}`) ?? []).some(
              (p) =>
                p.owner !== owner &&
                Math.hypot(p.x - x, p.z - z) < p.width / 2 + padding,
            )
          )
            return true;
      return false;
    };
    const renderedStreets = layout.streets.map((s) => ({
      ...s,
      points: s.points.map((p) =>
        combined ? combinedPosition(p, seed, profile) : p,
      ),
    }));
    // Construct widths and curb offsets after bending the centerlines. Warping
    // prebuilt road ribbons compresses their widths and shears junctions.
    worldRoadSurface = true;
    // Road end caps fill the same square-ended footprint used by the curb outline.
    for (const s of renderedStreets) {
      if (s.alley || s.points.length < 2) continue;
      for (const [p, q] of [
        [s.points[0], s.points[1]],
        [s.points.at(-1)!, s.points.at(-2)!],
      ]) {
        if (connectedRoadEnd(p, s, renderedStreets)) continue;
        box(
          carriageway,
          p.x,
          0.13,
          p.z,
          s.width,
          0.08,
          s.width,
          Math.atan2(q.x - p.x, q.z - p.z),
        );
      }
    }
    // Continuous bands follow the road union, including mitered corners and T junctions.
    for (const loop of streetOutlines(renderedStreets)) {
      const band = (
        innerDistance: number,
        outerDistance: number,
        bottom: number,
        top: number,
        material: T.Material,
      ) => {
        const inner = offsetOutline(loop, innerDistance),
          outer = offsetOutline(loop, outerDistance),
          vertices: number[] = [];
        const quad = (
          a: { x: number; z: number },
          b: { x: number; z: number },
          c: { x: number; z: number },
          d: { x: number; z: number },
          ya: number,
          yb: number,
          yc: number,
          yd: number,
        ) => {
          const v = [
            [a.x, ya, a.z],
            [b.x, yb, b.z],
            [c.x, yc, c.z],
            [d.x, yd, d.z],
          ];
          for (const i of [0, 1, 2, 0, 2, 3]) vertices.push(...v[i]);
        };
        for (let i = 0; i < loop.length; i++) {
          const j = (i + 1) % loop.length,
            n = Math.max(
              1,
              Math.ceil(
                Math.hypot(loop[j].x - loop[i].x, loop[j].z - loop[i].z) / 1,
              ),
            );
          const lerp = (
            a: { x: number; z: number },
            b: { x: number; z: number },
            t: number,
          ) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
          for (let k = 0; k < n; k++) {
            const a = lerp(inner[i], inner[j], k / n),
              b = lerp(inner[i], inner[j], (k + 1) / n),
              c = lerp(outer[i], outer[j], (k + 1) / n),
              d = lerp(outer[i], outer[j], k / n);
            if (
              canalZ !== undefined &&
              Math.abs(
                (combined
                  ? combinedCanonicalZ(
                      { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
                      seed,
                      profile,
                    )
                  : (a.z + b.z) / 2) - canalZ,
              ) < 4.6 &&
              layout.streets.some(
                (s) =>
                  (s.points[0].z - canalZ!) * (s.points.at(-1)!.z - canalZ!) <
                    0 &&
                  s.points[0].x === s.points.at(-1)!.x &&
                  Math.abs((a.x + b.x) / 2 - s.points[0].x) < s.width / 2 + 1,
              )
            )
              continue;
            quad(a, b, c, d, top, top, top, top);
            quad(a, b, b, a, bottom, bottom, top, top);
            quad(c, d, d, c, bottom, bottom, top, top);
          }
        }
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
        g.setAttribute(
          "uv",
          new T.Float32BufferAttribute(
            new Float32Array((vertices.length / 3) * 2),
            2,
          ),
        );
        g.computeVertexNormals();
        add(g, material, 0, 0, 0);
      };
      band(-0.11, 0.11, 0.1, 0.28, stone);
      band(0.11, 0.81, 0.08, 0.18, paving);
    }
    worldRoadSurface = false;
    // Arc-length dashes keep spacing consistent through curves; leave junctions clear.
    const lanePaint = mat("#c5bea3");
    worldRoadSurface = true;
    for (const [owner, street] of renderedStreets.entries()) {
      if (street.alley || street.width < 2.8) continue;
      let distance = 0;
      for (let i = 1; i < street.points.length; i++) {
        const a = street.points[i - 1],
          b = street.points[i],
          dx = b.x - a.x,
          dz = b.z - a.z,
          length = Math.hypot(dx, dz);
        if (length < 1e-6) continue;
        let along = 0;
        while (along < length - 1e-6) {
          const phase = (distance + along) % 3.6,
            take = Math.min(
              length - along,
              phase < 1.8 ? 1.8 - phase : 3.6 - phase,
            );
          const p = {
            x: a.x + (dx * (along + take / 2)) / length,
            z: a.z + (dz * (along + take / 2)) / length,
          };
          const canonical = combined
            ? { x: p.x, z: combinedCanonicalZ(p, seed, profile) }
            : p;
          if (
            phase < 1.8 &&
            take > 0.025 &&
            !layout.rivers.some((r) => lineDistance(canonical, r) < 5.5) &&
            !renderedStreets.some(
              (s, j) =>
                j !== owner && lineDistance(p, s.points) < s.width / 2 + 1.2,
            ) &&
            (fullTile ||
              !(
                canonical.x > 20 &&
                canonical.x < 54 &&
                canonical.z > 23 &&
                canonical.z < 53
              ))
          )
            box(
              lanePaint,
              p.x,
              0.177,
              p.z,
              0.11,
              0.012,
              take,
              Math.atan2(dx, dz),
            );
          along += Math.max(take, 1e-6);
        }
        distance += length;
      }
    }
    worldRoadSurface = false;
    const lampPositions: { x: number; z: number }[] = [];
    const spillPositions: { x: number; z: number; radius: number }[] = [];
    const lampGlass = mat("#efd696");
    lampGlass.emissive.set("#d4a353");
    lampGlass.emissiveIntensity = 0.5;
    fixtureGlass = lampGlass;
    for (const [streetIndex, street] of layout.streets.entries()) {
      for (let i = 1; i < street.points.length; i++) {
        const a = street.points[i - 1],
          b = street.points[i],
          p = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
        if (
          (!crafted && inCivicPrecinct(p)) ||
          (!fullTile && p.x > 20 && p.x < 54 && p.z > 23 && p.z < 53)
        )
          continue;
        const bridge = layout.rivers.some((r) => lineDistance(p, r) < 4.5);
        if (bridge && canalZ !== undefined && Math.abs(p.z - canalZ) < 4.5)
          continue;
        worldRoadSurface = true;
        ribbon(
          combined
            ? [
                combinedPosition(a, seed, profile),
                combinedPosition(b, seed, profile),
              ]
            : [a, b],
          street.width,
          street.alley ? paving : carriageway,
          bridge ? 0.25 : 0.13,
        );
        worldRoadSurface = false;
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
        if (!street.alley && !bridge && i % 24 === 12) {
          const dx = b.x - a.x,
            dz = b.z - a.z,
            l = Math.hypot(dx, dz),
            x = p.x + (dz / l) * (street.width / 2 + 0.6),
            z = p.z - (dx / l) * (street.width / 2 + 0.6);
          if (
            inOtherRoad(x, z, streetIndex, 0.7) ||
            lampPositions.some((p) => Math.hypot(p.x - x, p.z - z) < 15)
          )
            continue;
          lampPositions.push({ x, z });
          propAnchor = { x, z, scale: 0.7 };
          add(new T.CylinderGeometry(0.16, 0.28, 0.4, 6), roof, x, 0.2, z);
          add(new T.CylinderGeometry(0.07, 0.11, 2.7, 6), brass, x, 1.7, z);
          // Pole is on the road's right shoulder; its arm points back toward the centerline.
          const nx = -dz / l,
            nz = dx / l;
          const armAngle = Math.atan2(-nz, nx);
          const style = streetIndex % 3;
          const reach = style === 0 ? 0 : style === 1 ? 0.68 : 0.75;
          const lampX = x + nx * reach,
            lampZ = z + nz * reach;
          if (style === 1)
            box(
              brass,
              x + nx * 0.35,
              3,
              z + nz * 0.35,
              0.8,
              0.12,
              0.12,
              armAngle,
            );
          if (style === 2) {
            const curve = new T.CatmullRomCurve3([
              new T.Vector3(0, 2.45, 0),
              new T.Vector3(0, 3.05, 0),
              new T.Vector3(nx * 0.3, 3.3, nz * 0.3),
              new T.Vector3(nx * 0.7, 3.18, nz * 0.7),
              new T.Vector3(nx * 0.75, 2.95, nz * 0.75),
            ]);
            add(new T.TubeGeometry(curve, 12, 0.055, 5, false), brass, x, 0, z);
          }
          if (style === 0) {
            add(new T.CylinderGeometry(0.21, 0.13, 0.22, 6), brass, x, 2.5, z);
            add(new T.ConeGeometry(0.09, 0.3, 5), brass, x, 3.48, z);
          }
          box(lampGlass, lampX, 2.8, lampZ, 0.36, 0.5, 0.36, armAngle);
          add(
            new T.ConeGeometry(0.38, 0.3, 4),
            roof,
            lampX,
            3.2,
            lampZ,
            Math.PI / 4 + armAngle,
          );
          box(brass, lampX, 2.52, lampZ, 0.46, 0.1, 0.46, armAngle);
          // A bounded set of lamps illuminates nearby paving and facades.
          const spill = { x: x + (lampX - x) * 0.7, z: z + (lampZ - z) * 0.7 };
          const mappedSpill = combined
            ? combinedPosition(spill, seed, profile)
            : spill;
          spillPositions.push({ ...mappedSpill, radius: 2.4 });
          if (localLights.length < 3 && Math.abs(x) < 26 && Math.abs(z) < 30) {
            const light = new T.PointLight("#ffc77d", 24, 13, 1.5);
            const lx = x + (lampX - x) * 0.7,
              lz = z + (lampZ - z) * 0.7;
            light.position.set(lx, elevation(lz) + 2.8 * 0.7, lz);
            light.castShadow = false;
            group.add(light);
            localLights.push(light);
          }
          propAnchor = undefined;
        }
      }
    }
    civicScale = 0.72;
    const civicBrick = kit.architecture.walls,
      civicRoof = kit.architecture.roof;
    // Capital: raised civic hall, portico, slate roof and a clock tower.
    box(stone, 0, 0.6, -7, 24, 1.2, 16);
    box(civicBrick, 0, 4.6, -7, 21, 8, 13);
    add(
      new T.ConeGeometry(1, 3, 4)
        .rotateY(Math.PI / 4)
        .scale(23 / Math.SQRT2, 1, 15 / Math.SQRT2),
      civicRoof,
      0,
      10,
      -7,
    );
    for (const y of [1.5, 4, 7.6]) box(stone, 0, y, -7, 21.4, 0.2, 13.4);
    box(civicBrick, 0, 9.8, -10, 6, 19.6, 6);
    box(civicRoof, 0, 20, -10, 7, 1, 7);
    add(new T.ConeGeometry(4.8, 5, 4), civicRoof, 0, 23, -10, Math.PI / 4);
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
    clock.scale.setScalar(0.72);
    clock.position.set(0, 16 * 0.72 + elevation(-6.9 * 0.72), -6.9 * 0.72);
    group.add(clock);
    box(civicRoof, 0, 16.4, -6.83, 0.08, 0.8, 0.08);
    box(civicRoof, 0.3, 16, -6.82, 0.6, 0.08, 0.08);
    for (const x of [-10.56, 10.56])
      for (const z of [-11, -7, -3]) {
        box(stone, x, 4.8, z, 0.16, 3.3, 1.9);
        box(glass, x + Math.sign(x) * 0.09, 4.8, z, 0.08, 2.8, 1.45);
        box(stone, x + Math.sign(x) * 0.14, 4.8, z, 0.08, 0.12, 1.5);
      }
    // Victorian civic silhouette: pediment, roof dormers, copper plant and clock trim.
    const copper = mat("#638b80"),
      iron = mat("#3e4b49");
    const pediment = new T.Shape();
    pediment.moveTo(-10.5, 0);
    pediment.lineTo(0, 3.4);
    pediment.lineTo(10.5, 0);
    pediment.closePath();
    add(
      new T.ExtrudeGeometry(pediment, { depth: 0.45, bevelEnabled: false }),
      stone,
      0,
      7.4,
      2.15,
    );
    add(new T.TorusGeometry(0.85, 0.13, 6, 20), brass, 0, 8.65, 2.65);
    for (const side of [-1, 1]) {
      for (const z of [-11, -6]) {
        box(iron, side * 10.7, 4.8, z, 0.18, 7.5, 0.18);
        for (const y of [2, 5, 8])
          box(brass, side * 10.7, y, z, 0.3, 0.16, 0.3);
      }
      for (const x of [side * 5, side * 8]) {
        box(civicBrick, x, 10.7, -4, 2.4, 2, 2.2);
        add(
          new T.ConeGeometry(1, 1.3, 4).rotateY(Math.PI / 4).scale(2, 1, 2),
          civicRoof,
          x,
          12.15,
          -4,
        );
        box(stone, x, 10.8, -2.85, 1.5, 1.65, 0.16);
        box(glass, x, 10.8, -2.73, 1.15, 1.3, 0.08);
      }
      add(
        new T.CylinderGeometry(0.8, 0.8, 2.4, 12),
        copper,
        side * 8,
        10.8,
        -10,
      );
      add(
        new T.SphereGeometry(0.8, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        copper,
        side * 8,
        12,
        -10,
      );
      box(brass, side * 8, 10, -8.5, 0.23, 0.23, 2.5);
    }
    add(new T.TorusGeometry(1.28, 0.11, 6, 24), brass, 0, 16, -6.76);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      box(
        brass,
        Math.sin(a) * 1.48,
        16 + Math.cos(a) * 1.48,
        -6.8,
        0.16,
        0.23,
        0.16,
      );
    }
    civicScale = 1;
    const bench = (x: number, z: number, angle = 0) => {
      const b = CITY_PROP_SCALE.bench;
      box(wood, x, b.seatY, z, b.width, 0.07, b.depth, angle);
      box(
        wood,
        x - Math.sin(angle) * 0.16,
        b.backY,
        z - Math.cos(angle) * 0.16,
        b.width,
        b.backHeight,
        0.06,
        angle,
      );
      for (const side of [-1, 1])
        box(
          iron,
          x + Math.cos(angle) * side * 0.5,
          0.24,
          z - Math.sin(angle) * side * 0.5,
          0.055,
          0.25,
          0.29,
          angle,
        );
    };
    // The entire street-bounded civic block is reserved for the hall and its gardens.
    const wall = (x: number, z: number, w: number, d: number) => {
      const height = CITY_PROP_SCALE.wall.height;
      box(stone, x, height / 2, z, w, height - 0.08, d);
      box(stone, x, height - 0.04, z, w + 0.12, 0.08, d + 0.12);
    };
    for (const w of CIVIC_WALLS) wall(w.x, w.z, w.width - 0.12, w.depth - 0.12);
    for (const side of [-1, 1]) {
      // Street edges are x ±22.5, z -16.5 / 17; retain a narrow pavement verge.
      for (const z of [-15.8, -2.5, 2.2, 16.2]) {
        const p = CITY_PROP_SCALE.pier;
        box(stone, side * 21.7, p.height / 2, z, p.width, p.height, p.width);
        add(
          new T.SphereGeometry(p.finialRadius, 8, 6),
          stone,
          side * 21.7,
          p.height + p.finialRadius * 0.6,
          z,
        );
      }
      for (const z of [-15.8, 16.2]) {
        const p = CITY_PROP_SCALE.pier;
        box(stone, side * 4.3, p.height / 2, z, p.width, p.height, p.width);
        add(
          new T.SphereGeometry(p.finialRadius, 8, 6),
          stone,
          side * 4.3,
          p.height + p.finialRadius * 0.6,
          z,
        );
      }
      // Broad planted wings with paths between beds and the building.
      for (const z of fullTile && seed % 3 === 1 ? [-8.5] : [-8.5, 8]) {
        box(stone, side * 16, 0.18, z, 7.6, 0.28, 9.6);
        box(soil, side * 16, 0.34, z, 7.25, 0.1, 9.25);
        box(leaves, side * 16, 0.43, z, 6.8, 0.1, 8.8);
        for (const dx of [-3, 3])
          for (let dz = -3.8; dz <= 3.8; dz += 1.25)
            add(
              new T.IcosahedronGeometry(0.35, 1),
              leaves,
              side * 16 + dx,
              0.64,
              z + dz,
            );
        for (const dz of [-4, 4])
          box(leaves, side * 16, 0.6, z + dz, 6.6, 0.4, 0.45);
      }
      for (const z of [-14.5, 14.8]) {
        box(stone, side * 12, 0.26, z, 13, 0.4, 1.2);
        box(leaves, side * 12, 0.55, z, 12.6, 0.4, 0.6);
      }
      bench(side * 9, 8);
    }
    // Market square, monument, gardens and a usable supply-depot yard.
    if (fullTile && seed % 3 !== 0) {
      add(new T.CylinderGeometry(2.5, 2.7, 0.45, 24), stone, 0, 0.35, 8);
      add(new T.CylinderGeometry(2.2, 2.2, 0.06, 24), water, 0, 0.59, 8);
      add(new T.CylinderGeometry(0.35, 0.65, 1.5, 12), brass, 0, 1.05, 8);
      add(new T.SphereGeometry(0.5, 12, 8), stone, 0, 1.95, 8);
    } else {
      box(stone, 0, 0.5, 8, 3, 1, 3);
      add(new T.CylinderGeometry(0.45, 0.7, 4, 8), brass, 0, 3, 8);
    }
    if (!crafted)
      for (const x of [-13, 13]) {
        box(leaves, x, 0.08, 8, 5, 0.15, 6);
        box(stone, x, 0.1, 8, 5.5, 0.2, 6.5);
        box(leaves, x, 0.22, 8, 4.7, 0.12, 5.7);
      }
    if (!fullTile) {
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
    }
    if (!crafted)
      for (const edge of [
        { x: -18, z: 0 },
        { x: 18, z: 0 },
        { x: 0, z: -16 },
        { x: 8, z: 16 },
      ]) {
        const nearest = layout.streets
          .flatMap((s) => s.points)
          .filter(
            (p) =>
              !inCivicPrecinct(p) &&
              Math.hypot(p.x - edge.x, p.z - edge.z) < 16,
          )
          .sort(
            (a, b) =>
              Math.hypot(a.x - edge.x, a.z - edge.z) -
              Math.hypot(b.x - edge.x, b.z - edge.z),
          )[0];
        if (nearest && !lots.some((p) => lineDistance(p, [edge, nearest]) < 5))
          ribbon([edge, nearest], 2.2, path, 0.13);
      }
    // Service alleys accumulate clutter; civic and commercial streets stay maintained.
    if ("districts" in layout) {
      const grime = mat("#554e40"),
        iron = mat("#4a5550"),
        paper = mat("#b6a888");
      for (const [index, d] of layout.districts.entries()) {
        const court = d.pattern === "courtyard";
        const occupied = lots.filter(
          (p) => Math.abs(p.x - d.x) < 21 && Math.abs(p.z - d.z) < 14,
        );
        const gardens: { x: number; z: number; w: number; depth: number }[] =
          [];
        const garden = (x: number, z: number, w: number, depth: number) => {
          if (
            gardens.some(
              (g) =>
                Math.abs(g.x - x) < (g.w + w) / 2 + 2.8 &&
                Math.abs(g.z - z) < (g.depth + depth) / 2 + 0.6,
            )
          )
            return;
          // Include benches in the reservation, including on a partially filled block.
          if (
            occupied.some((lot) => {
              const b = cityBuildingEnvelope(lot.variant);
              const c = Math.abs(Math.cos(lot.angle)),
                t = Math.abs(Math.sin(lot.angle));
              return (
                Math.abs(lot.x - x) <
                  ((c * b.width + t * b.depth) * lot.scale) / 2 + w / 2 + 1.4 &&
                Math.abs(lot.z - z) <
                  ((t * b.width + c * b.depth) * lot.scale) / 2 +
                    depth / 2 +
                    0.3
              );
            })
          )
            return;
          gardens.push({ x, z, w, depth });
          box(stone, x, 0.18, z, w, 0.25, depth);
          box(soil, x, 0.33, z, w - 0.35, 0.12, depth - 0.35);
          box(leaves, x, 0.42, z, w - 0.75, 0.1, depth - 0.75);
          for (const side of [-1, 1]) {
            box(
              leaves,
              x + side * (w / 2 - 0.55),
              0.7,
              z,
              0.6,
              0.65,
              depth - 1,
            );
            bench(x + side * (w / 2 + 1), z, (side * Math.PI) / 2);
          }
        };
        if (court) garden(d.x, d.z, 15, 5);
        if (d.pattern === "terraces") {
          // Rear gardens face the central service lane; front doors face the streets.
          for (const lot of occupied) {
            const z = d.z + Math.sign(lot.z - d.z) * 3;
            box(soil, lot.x, 0.16, z, 4.3, 0.15, 3);
            box(leaves, lot.x, 0.26, z, 3.9, 0.08, 2.6);
            box(stone, lot.x - 2.15, 0.48, z, 0.16, 0.65, 3);
          }
        }
        for (const access of d.access)
          entrancePath(access.entrance, access.street);
        // Unfilled budget slots form a small garden, not an unexplained empty slab.
        if (d.kind !== "industrial" && !occupied.some((p) => p.z > d.z + 2))
          garden(d.x, d.z + 7, 28, 7);
        const amount =
          court || d.pattern === "terraces"
            ? 0
            : d.kind === "commercial"
              ? 2
              : d.kind === "industrial"
                ? 12
                : 9;
        for (let i = 0; i < amount; i++) {
          const x = d.x - 16 + ((i * 11 + index * 7) % 32),
            z = d.z + (((i * 3) % 5) - 2) * 0.25;
          box(grime, x, 0.09, z, 1.8, 0.025, 0.85);
          if (i % 3 === 0) {
            box(iron, x, 0.3, z, 0.38, 0.4, 0.38);
            box(roof, x, 0.53, z, 0.43, 0.06, 0.43);
          } else if (i % 3 === 1) {
            box(wood, x, 0.3, z, 0.5, 0.38, 0.45);
            box(brass, x, 0.5, z, 0.53, 0.03, 0.08);
          } else
            for (let j = 0; j < 3; j++)
              box(
                paper,
                x + j * 0.25,
                0.13,
                z + j * 0.12,
                0.23,
                0.025,
                0.16,
                (i + j) * 0.7,
              );
        }
        if (d.kind === "residential" && index % 3 === 0) {
          const pair = lots.filter(
            (p) =>
              p.variant.startsWith("urban") &&
              p.variant !== "urbanBuild" &&
              Math.abs(p.z - d.z) === 6 &&
              Math.abs(p.x - d.x) < 15,
          );
          const front = pair.find((p) =>
            pair.some((q) => q.x === p.x && q.z !== p.z),
          );
          if (front) {
            box(iron, front.x, 4.2, d.z, 1.3, 0.18, 3.4);
            for (const dx of [-0.6, 0.6]) {
              box(brass, front.x + dx, 4.65, d.z, 0.09, 0.08, 3.4);
              for (const dz of [-1.5, 0, 1.5])
                box(iron, front.x + dx, 4.45, d.z + dz, 0.08, 0.5, 0.08);
            }
          }
        }
        if (d.kind === "industrial") {
          if (index % 2 === 0) {
            box(iron, d.x, 3.5, d.z, 0.55, 7, 0.55);
            box(brass, d.x + 2, 7, d.z, 10, 0.35, 0.35);
            box(iron, d.x - 2, 6.65, d.z, 1.8, 0.6, 1.2);
            box(iron, d.x + 6, 5, d.z, 0.045, 4, 0.045);
            box(wood, d.x + 6, 3, d.z, 1.4, 0.12, 1.4);
            for (let h = 1; h < 7; h++) box(brass, d.x, h, d.z, 0.9, 0.1, 0.9);
          }
          for (const dx of [-12, 0, 12])
            add(
              new T.CylinderGeometry(0.25, 0.25, 0.5, 8),
              iron,
              d.x + dx,
              0.37,
              d.z,
            );
        }
      }
    }
    // Gardens and workshops rotate with the frontage rather than the world axes.
    for (const p of lots) {
      const local = (x: number, z: number) => ({
        x: p.x + Math.cos(p.angle) * x + Math.sin(p.angle) * z,
        z: p.z - Math.sin(p.angle) * x + Math.cos(p.angle) * z,
      });
      box(soil, p.x, 0.09, p.z, 6 * p.scale, 0.08, 5 * p.scale, p.angle);
      if (p.variant === "home" && Math.hypot(p.x, p.z) > extent * 0.8) {
        const q = local(0, -3.7);
        box(wood, q.x, 0.42, q.z, 7, 0.07, 0.07, p.angle);
        for (const x of [-3.4, 0, 3.4]) {
          const q = local(x, -3.7);
          box(wood, q.x, 0.3, q.z, 0.08, 0.6, 0.08);
        }
      }
    }
    for (const [m, gs] of batches) {
      const normalized = gs.map((g) => (g.index ? g.toNonIndexed() : g));
      const g = mergeGeometries(normalized)!;
      if (m === path || m === paving || m === carriageway) {
        const pos = g.getAttribute("position"),
          uv = g.getAttribute("uv");
        for (let i = 0; i < pos.count; i++)
          uv.setXY(i, pos.getX(i) / 4, pos.getZ(i) / 4);
      }
      new Set([...gs, ...normalized]).forEach((g) => g.dispose());
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
    cap.scale.setScalar(0.72);
    cap.position.set(0, 10.06 * 0.72 + elevation(-7 * 0.72), -7 * 0.72);
    cap.visible = winter;
    group.add(cap);
    winterMeshes.push(cap);
    const placements: CityLot[] = [
      ...lots.map((lot) => ({
        ...lot,
        variant: cityAppearance(lot.variant, lot.x, lot.z, seed),
      })),
      ...layout.trees,
    ];
    if (fullTile) {
      const worldLots = lots.map((l) => combinedLot(l, seed, profile));
      const entrances = parcelPlan!.access.map((a) => ({
        points: [
          combinedPosition(a.entrance, seed, profile),
          combinedPosition(a.street, seed, profile),
        ],
        width: 1.25,
        alley: true,
      }));
      let cars = 0,
        accents = 0;
      for (const [i, street] of renderedStreets.entries()) {
        const car = (i + seed) % 7 === 0;
        if ((car && cars >= 18) || (!car && (accents >= 60 || i % 3 !== 0)))
          continue;
        for (const fraction of car
          ? [0.23, 0.34, 0.45, 0.56, 0.67, 0.78]
          : [0.5]) {
          const ps = street.points,
            mid = Math.floor(ps.length * fraction),
            a = ps[mid],
            b = ps[mid + 1];
          if (
            !b ||
            ps.length < 22 ||
            Math.abs(
              a.z +
                94 -
                (combinedPosition({ x: a.x, z: -94 }, seed, profile).z + 94),
            ) < 11
          )
            continue;
          const length = Math.hypot(b.x - a.x, b.z - a.z),
            tx = (b.x - a.x) / length,
            tz = (b.z - a.z) / length;
          const offset = car ? street.width / 2 - 0.8 : street.width / 2 + 0.85;
          const q = { x: a.x - tz * offset, z: a.z + tx * offset };
          const tramStop = !car && accents % 7 === 0;
          const span = car || tramStop ? 1.55 : 1,
            width = car ? 1.4 : 1.7;
          const footprint = {
            points: [
              { x: q.x - tx * span, z: q.z - tz * span },
              { x: q.x + tx * span, z: q.z + tz * span },
            ],
            width,
            alley: true,
          };
          if (
            worldLots.some((l) => lotIntersectsStreet(l, footprint)) ||
            renderedStreets.some(
              (s, j) =>
                j !== i && lineDistance(q, s.points) < span + s.width / 2 + 1,
            ) ||
            entrances.some((e) => {
              // Clip the entrance corridor against the oriented prop envelope.
              const local = (p: { x: number; z: number }) => [
                (p.x - q.x) * tx + (p.z - q.z) * tz,
                -(p.x - q.x) * tz + (p.z - q.z) * tx,
              ];
              const a = local(e.points[0]),
                b = local(e.points[1]);
              let lo = 0,
                hi = 1;
              for (let axis = 0; axis < 2; axis++) {
                const half =
                    (axis === 0 ? span : width / 2) + e.width / 2 + 0.1,
                  delta = b[axis] - a[axis];
                if (Math.abs(delta) < 1e-8) {
                  if (Math.abs(a[axis]) > half) return false;
                } else {
                  const t0 = (-half - a[axis]) / delta,
                    t1 = (half - a[axis]) / delta;
                  lo = Math.max(lo, Math.min(t0, t1));
                  hi = Math.min(hi, Math.max(t0, t1));
                  if (lo > hi) return false;
                }
              }
              return true;
            })
          )
            continue;
          const z = combinedCanonicalZ(q, seed, profile);
          placements.push({
            x: q.x,
            z,
            angle: 0,
            worldAngle: Math.atan2(tx, tz),
            scale: car ? 0.85 : 1,
            variant: car
              ? cars % 2
                ? "streetCarSaloon"
                : "streetCarVan"
              : [
                  "streetTramStop",
                  "streetClock",
                  "streetHydrant",
                  "streetBollard",
                  "streetBoiler",
                  "streetValve",
                  "streetVent",
                ][accents % 7],
          });
          if (car) cars++;
          else accents++;
          break;
        }
      }
    }

    if (!crafted)
      for (const x of [-13, 13])
        for (const z of [6, 10])
          placements.push({ x, z, angle: 0, scale: 0.55, variant: "tree" });
    if (fullTile) {
      let covers = 0;
      for (const [i, street] of renderedStreets.entries()) {
        if (
          i % 4 !== 0 ||
          street.alley ||
          street.points.length < 24 ||
          covers >= 24
        )
          continue;
        const mid = Math.floor(street.points.length * 0.38),
          a = street.points[mid],
          b = street.points[mid + 1];
        const n = Math.hypot(b.x - a.x, b.z - a.z),
          p = {
            x: a.x - ((b.z - a.z) / n) * 0.55,
            z: a.z + ((b.x - a.x) / n) * 0.55,
          };
        if (
          Math.abs(combinedCanonicalZ(p, seed, profile) + 94) < 9 ||
          renderedStreets.some(
            (s, j) => j !== i && lineDistance(p, s.points) < 4,
          ) ||
          placements.some(
            (l) =>
              l.variant.startsWith("streetCar") &&
              Math.hypot(
                combinedLot(l, seed, profile).x - p.x,
                combinedLot(l, seed, profile).z - p.z,
              ) < 3,
          )
        )
          continue;
        placements.push({
          x: p.x,
          z: combinedCanonicalZ(p, seed, profile),
          angle: 0,
          scale: 1,
          variant: "streetManhole",
        });
        covers++;
      }
    }
    // Small natural clusters inherit the same land, street and building clearances.
    const roots = placements.filter(
      (p) => p.variant === "tree" || p.variant === "pine",
    );
    for (const [i, root] of roots.entries()) {
      if (root.variant === "tree")
        root.variant = ["tree", "treeTall", "treeYoung"][i % 3];
      for (let k = 0; k < 3 && placements.length < lots.length + 1000; k++) {
        const a = i * 2.399 + k * 2.1,
          radius = 0.7 + k * 0.45;
        const p = {
          x: root.x + Math.cos(a) * radius,
          z: root.z + Math.sin(a) * radius,
        };
        const world = combined ? combinedPosition(p, seed, profile) : p;
        if (
          renderedStreets.some(
            (r) => lineDistance(world, r.points) < r.width / 2 + 0.8,
          )
        )
          continue;
        if (
          lots.some((l) => {
            const bounds = cityBuildingEnvelope(l.variant);
            const dx = p.x - l.x,
              dz = p.z - l.z;
            return (
              Math.abs(dx * Math.cos(l.angle) - dz * Math.sin(l.angle)) <
                (bounds.width * l.scale) / 2 + 1 &&
              Math.abs(dx * Math.sin(l.angle) + dz * Math.cos(l.angle)) <
                (bounds.depth * l.scale) / 2 + 1
            );
          })
        )
          continue;
        if (layout.rivers.some((r) => lineDistance(p, r) < 6)) continue;
        placements.push({
          ...p,
          angle: a,
          scale: 0.8,
          variant: k === 0 ? "groundPebbles" : "groundTufts",
        });
      }
    }
    for (const p of placements)
      if (CITY_STREET_PROP_SCALE[p.variant] !== undefined)
        p.scale = CITY_STREET_PROP_SCALE[p.variant];
    for (const p of placements) {
      const shop =
        p.variant.startsWith("urban") &&
        !["urbanBuild", "urbanCourt"].includes(p.variant);
      if (
        !shop &&
        p.variant !== "streetTramStop" &&
        p.variant !== "streetKiosk"
      )
        continue;
      const placed = combined ? combinedLot(p, seed, profile) : p;
      const offset = shop ? 6.35 * p.scale : 0;
      spillPositions.push({
        x: placed.x + Math.sin(placed.angle) * offset,
        z: placed.z + Math.cos(placed.angle) * offset,
        radius: shop ? 1.1 : 1.5,
      });
    }
    fixtureCount = spillPositions.length;
    fixturePools = cityLightPools(spillPositions, (x, z) =>
      elevation(combined ? combinedCanonicalZ({ x, z }, seed, profile) : z, x),
    );
    if (fixturePools) {
      group.add(fixturePools.mesh);
      fixturePools.setDusk(dusk);
    }
    modelCounts = {};
    for (const p of placements)
      modelCounts[p.variant] = (modelCounts[p.variant] ?? 0) + 1;
    for (const variant of new Set(placements.map((p) => p.variant))) {
      const ps = placements.filter((p) => p.variant === variant);
      const scenery =
        variant.startsWith("tree") ||
        variant === "pine" ||
        variant.startsWith("ground");
      for (const tier of scenery ? [false] : [false, true])
        for (const part of (tier ? kit.distantVariants : kit.variants).get(
          variant,
        )!) {
          const mesh = new T.InstancedMesh(
            part.geometry,
            part.material,
            ps.length,
          );
          ps.forEach((p, i) => {
            const placed = combined ? combinedLot(p, seed, profile) : p;
            dummy.position.set(placed.x, buildingBase(p), placed.z);
            dummy.scale.set(
              p.scale,
              (variant === "streetManhole" ? 1 : p.scale) *
                ("heightScale" in p ? (p.heightScale ?? 1) : 1),
              p.scale,
            );
            dummy.rotation.set(0, placed.angle, 0);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            if (
              !part.snow &&
              !variant.startsWith("street") &&
              !variant.startsWith("ground")
            ) {
              const hash =
                (Math.imul(Math.round(p.x * 100), 73856093) ^
                  Math.round(p.z * 100) ^
                  seed) >>>
                0;
              mesh.setColorAt(
                i,
                new T.Color(
                  ["#ffffff", "#ded6c6", "#dbbfa8", "#c8ced0", "#ead8b8"][
                    hash % 5
                  ],
                ),
              );
            }
          });
          mesh.computeBoundingSphere();
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);
          if (!scenery) {
            (tier ? distantMeshes : detailMeshes).push(mesh);
            if (part.snow) lodSnow.add(mesh);
          } else if (part.snow) winterMeshes.push(mesh);
          if (variant.startsWith("ground")) detailMeshes.push(mesh);
          mesh.visible =
            (!part.snow || winter) && (scenery || tier === distant);
        }
    }
    airship = createMilitaryModel("airship");
    airship.root.name = "City patrol airship";
    airship.root.scale.setScalar(0.55);
    airshipHeight = new T.Box3().setFromObject(group).max.y + 8;
    airship.root.position.set(extent * 0.38, airshipHeight, 0);
    group.add(airship.root);
    smokeSources = [
      ...lots.filter((p) =>
        ["factory", "mill", "boilerHouse"].includes(p.variant),
      ),
      ...lots.filter(
        (p) =>
          (p.variant === "urbanHome" || p.variant === "urbanShop") &&
          cityAppearance(p.variant, p.x, p.z, seed) === p.variant,
      ),
    ]
      .slice(0, 12)
      .map((p) => {
        const industrial = p.variant === "factory";
        const x =
            p.variant === "mill"
              ? 7.5
              : p.variant === "boilerHouse"
                ? 2.1
                : industrial
                  ? 2.8
                  : 1.6,
          z =
            p.variant === "mill"
              ? -2
              : p.variant === "boilerHouse"
                ? -1
                : industrial
                  ? -1.4
                  : -3;
        const pose = combined ? combinedLot(p, seed, profile) : p;
        return {
          x:
            pose.x +
            (x * Math.cos(pose.angle) + z * Math.sin(pose.angle)) * p.scale,
          y:
            buildingBase(p) +
            (p.variant === "mill"
              ? 14
              : p.variant === "boilerHouse"
                ? 8.3
                : industrial
                  ? 6.69
                  : 10.1) *
              p.scale *
              (p.heightScale ?? 1),
          z:
            pose.z +
            (-x * Math.sin(pose.angle) + z * Math.cos(pose.angle)) * p.scale,
        };
      });
    smokeSources.push(
      ...placements
        .filter((p) => p.variant === "streetManhole")
        .slice(0, 8)
        .map((p) => {
          const world = combinedLot(p, seed, profile);
          return {
            x: world.x,
            z: world.z,
            y: buildingBase(p) + 0.22,
            steam: true,
          };
        }),
    );
    if (smokeSources.length) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      const context = canvas.getContext("2d")!;
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255,255,255,.85)");
      gradient.addColorStop(0.4, "rgba(255,255,255,.55)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
      const texture = new T.CanvasTexture(canvas);
      ownedTextures.push(texture);
      const smokeMaterial = new T.MeshBasicMaterial({
        color: "#b4b5ad",
        map: texture,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        toneMapped: false,
      });
      smoke = new T.InstancedMesh(
        new T.PlaneGeometry(2, 2),
        smokeMaterial,
        smokeSources.length * 6,
      );
      smoke.frustumCulled = false;
      smoke.instanceMatrix.setUsage(T.DynamicDrawUsage);
      group.add(smoke);
    }
    const troopMat = mat("#ffffff");
    troopMat.vertexColors = true;
    if (!fullTile)
      for (const part of rig.parts) {
        const mesh = new T.InstancedMesh(part.geometry, troopMat, 144);
        for (let i = 0; i < 144; i++) {
          dummy.position.set(
            -10 + (i % 12) * 0.7,
            elevation(19 + Math.floor(i / 12) * 0.75),
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
    if (!fullTile)
      for (let i = 0; i < 2; i++) {
        const jeep = createJeep();
        const obj = jeep.root;
        const model = obj as unknown as T.Object3D;
        model.position.set(30 + i * 7, elevation(39), 39);
        model.scale.setScalar(0.6);
        group.add(model);
      }
    if (combined && profile === "worldgen") {
      worldBearing = -worldRiverSample(seed).angle;
      group.rotation.y = worldBearing;
      group.updateMatrix();
      overviewBounds.applyMatrix4(group.matrix);
    }
    if (fullTile && tacticalFactory) {
      tacticalData ??= tacticalFactory();
      testUnits = createCityTestUnits(
        group,
        () => camera,
        renderer.domElement,
        rig,
        tacticalData,
        { seed, profile },
        (p) => {
          const target = group.localToWorld(
            new T.Vector3(p.x, tacticalData!.surfaceHeight(p) + 1, p.z),
          );
          const offset = camera.position.clone().sub(controls.target);
          if (streetMode) offset.setLength(18);
          controls.target.copy(target);
          camera.position.copy(target).add(offset);
          camera.zoom = streetMode ? 1 : 4;
          camera.updateProjectionMatrix();
          controls.update();
        },
      );
      unitCount = testUnits.state().units.length;
    }
    configure(winter, renderer.shadowMap.enabled, dusk);
    focus("city");
  }
  function setStreetMode(enabled: boolean) {
    if (enabled === streetMode) return;
    anchoredOrbit.cancel();
    let autoSelect: number | undefined;
    if (enabled) {
      savedPlanning = {
        position: camera.position.clone(),
        target: controls.target.clone(),
        zoom: camera.zoom,
        minPolar: controls.minPolarAngle,
      };
      const state = testUnits?.state();
      const selected = state?.units.find((u) =>
        state.selectedIds.includes(u.id),
      );
      const anchor = anchoredOrbit.anchor();
      const unit = selected ?? (!anchor ? state?.units[0] : undefined);
      if (unit && !selected) autoSelect = unit.id;
      const target = unit
        ? group.localToWorld(
            new T.Vector3(
              unit.x,
              (tacticalData?.surfaceHeight(unit) ?? 0) + 0.7,
              unit.z,
            ),
          )
        : anchor
          ? new T.Vector3(...anchor)
          : controls.target.clone();
      camera = streetCamera;
      camera.zoom = 1;
      controls.object = camera;
      controls.target.copy(target);
      camera.position.copy(target).add(new T.Vector3(11, 7, 11));
    } else {
      camera = planningCamera;
      controls.object = camera;
      if (savedPlanning) {
        camera.position.copy(savedPlanning.position);
        controls.target.copy(savedPlanning.target);
        camera.zoom = savedPlanning.zoom;
      }
    }
    streetMode = enabled;
    controls.minPolarAngle = enabled
      ? 0.15
      : (savedPlanning?.minPolar ?? T.MathUtils.degToRad(15));
    controls.maxPolarAngle = enabled
      ? Math.PI / 2 - 0.08
      : T.MathUtils.degToRad(50);
    controls.minDistance = enabled ? 3 : 0;
    controls.maxDistance = enabled ? 600 : Infinity;
    camera.updateProjectionMatrix();
    controls.update();
    if (autoSelect !== undefined) testUnits?.select(autoSelect);
  }
  function focus(
    view:
      | "waterfront"
      | "angled"
      | "city"
      | "capital"
      | "depot"
      | "street"
      | "industry"
      | "skyline",
  ) {
    const target =
      view === "waterfront"
        ? new T.Vector3(8, 2, -94)
        : view === "angled"
          ? new T.Vector3(0, 2, -94)
          : view === "industry" && count > 28
            ? new T.Vector3(60, 5, 45)
            : view === "skyline" && count > 28
              ? new T.Vector3(0, 14, -55)
              : view === "depot"
                ? new T.Vector3(36, 0, 37)
                : view === "street"
                  ? new T.Vector3(40, 0, -35)
                  : new T.Vector3(0, view === "capital" ? 7 : 0, 3);
    if (view === "city") overviewBounds.getCenter(target);
    else target.applyAxisAngle(new T.Vector3(0, 1, 0), worldBearing);
    controls.target.copy(target);
    controls.minPolarAngle = streetMode ? 0.15 : T.MathUtils.degToRad(15);
    camera.position
      .copy(target)
      .add(
        new T.Vector3(1, Math.SQRT2 * Math.tan(T.MathUtils.degToRad(55)), 1)
          .normalize()
          .multiplyScalar(312),
      );
    camera.zoom =
      view === "angled"
        ? 1.5
        : view === "city"
          ? count === 28
            ? 2
            : 85 / extent
          : view === "capital" || view === "skyline" || view === "industry"
            ? 2.5
            : 4;
    camera.updateProjectionMatrix();
    controls.update();
    if (streetMode) {
      camera.position
        .copy(target)
        .add(
          new T.Vector3(1, 0.65, 1)
            .normalize()
            .multiplyScalar(view === "city" ? extent * 2.8 : 22),
        );
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      controls.update();
      return;
    }
    if (view === "city") {
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      let span = 0;
      for (const x of [overviewBounds.min.x, overviewBounds.max.x])
        for (const y of [overviewBounds.min.y, overviewBounds.max.y])
          for (const z of [overviewBounds.min.z, overviewBounds.max.z]) {
            const p = new T.Vector3(x, y, z).project(camera);
            span = Math.max(span, Math.abs(p.x), Math.abs(p.y));
          }
      camera.zoom = Math.max(0.45, Math.min(3, 0.9 / span));
      camera.updateProjectionMatrix();
    }
  }
  function configure(snow: boolean, shadows: boolean, evening = false) {
    dusk = evening;
    kit.setDusk(dusk);
    fixturePools?.setDusk(dusk);
    if (fixtureGlass) fixtureGlass.emissiveIntensity = dusk ? 2 : 0.15;
    hemi.intensity = dusk ? 0.65 : 2;
    sun.intensity = dusk ? 0.45 : 3;
    scene.background = new T.Color(dusk ? "#202b38" : "#263933");
    localLights.forEach((light) => {
      light.intensity = dusk ? 32 : 16;
    });
    winter = snow;
    winterMeshes.forEach((m) => (m.visible = snow));
    ground?.color.set(snow ? "#dde3dc" : "#8f9c66");
    renderer.shadowMap.enabled = shadows;
    updateDetail();
  }
  const observer = new ResizeObserver(() => {
    const w = host.clientWidth,
      h = host.clientHeight;
    renderer.setSize(w, h);
    planningCamera.left = (-90 * w) / h;
    planningCamera.right = (90 * w) / h;
    planningCamera.updateProjectionMatrix();
    streetCamera.aspect = w / h;
    streetCamera.updateProjectionMatrix();
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
  function updateDetail() {
    const pixelsPerUnit = streetMode
      ? host.clientHeight /
        (2 *
          Math.tan(T.MathUtils.degToRad(streetCamera.fov / 2)) *
          Math.max(1, camera.position.distanceTo(controls.target)))
      : (host.clientHeight * camera.zoom) / 180;
    if (distant ? pixelsPerUnit > 4.5 : pixelsPerUnit < 3.5) distant = !distant;
    detailMeshes.forEach(
      (m) => (m.visible = !distant && (!lodSnow.has(m) || winter)),
    );
    distantMeshes.forEach(
      (m) => (m.visible = distant && (!lodSnow.has(m) || winter)),
    );
  }
  const render = () => {
    if (disposed) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastPan) / 1000);
    lastPan = now;
    if (panKeys.size) {
      const yaw =
        (Number(panKeys.has("q")) - Number(panKeys.has("e"))) * dt * 1.1;
      if (yaw) {
        anchoredOrbit.rotate(yaw);
      }
      camera.getWorldDirection(panForward);
      panForward.y = 0;
      panForward.normalize();
      panRight.crossVectors(panForward, panUp).normalize();
      panMove
        .copy(panForward)
        .multiplyScalar(Number(panKeys.has("w")) - Number(panKeys.has("s")))
        .addScaledVector(
          panRight,
          Number(panKeys.has("d")) - Number(panKeys.has("a")),
        );
      if (panMove.lengthSq() > 0) {
        panMove
          .normalize()
          .multiplyScalar(
            streetMode ? 7 * dt : (40 * dt) / Math.sqrt(camera.zoom),
          );
        camera.position.add(panMove);
        controls.target.add(panMove);
      }
    }
    controls.update();
    testUnits?.update(dt);
    const selection = testUnits?.state();
    cutaway.update(
      camera,
      streetMode && selection
        ? selection.units
            .filter((u) => selection.selectedIds.includes(u.id))
            .map((u) =>
              group.localToWorld(
                new T.Vector3(
                  u.x,
                  (tacticalData?.surfaceHeight(u) ?? 0) + 0.7,
                  u.z,
                ),
              ),
            )
        : [],
    );
    if (airship && !reviewingAirship) {
      airshipTime += dt;
      const t = airshipTime * 0.012;
      airship.root.position.set(
        Math.cos(t) * extent * 0.38,
        airshipHeight + Math.sin(t * 2) * 0.6,
        Math.sin(t) * extent * 0.3,
      );
      airship.root.rotation.y = Math.atan2(
        -0.38 * Math.sin(t),
        0.3 * Math.cos(t),
      );
    }
    airship?.animate(now / 1000);
    if (smoke) {
      smokeFacing.copy(group.quaternion).invert().multiply(camera.quaternion);
      smokeSources.forEach((p, i) => {
        for (let k = 0; k < 6; k++) {
          const age = (now * 0.000085 + k / 6 + i * 0.07) % 1;
          dummy.position.set(
            p.x + age * (p.steam ? 0.55 : 3),
            p.y + age * (p.steam ? 2.8 : 10),
            p.z + Math.sin(age * 4 + i) * 0.5,
          );
          dummy.scale.setScalar(
            (p.steam ? 0.18 + age * 0.85 : 0.35 + age * 2.1) *
              Math.sin(age * Math.PI),
          );
          dummy.quaternion.copy(smokeFacing);
          dummy.updateMatrix();
          smoke!.setMatrixAt(i * 6 + k, dummy.matrix);
        }
      });
      smoke.instanceMatrix.needsUpdate = true;
    }
    updateDetail();
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
          districts: districtSummary,
          units: unitCount,
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
        districts: districtSummary,
      });
      last = now;
      frames = 0;
    }
    raf = requestAnimationFrame(render);
  };
  generate();
  render();
  return {
    focusHarbor() {
      reviewingAirship = false;
      setStreetMode(false);
      focus("city");
      const offset = camera.position.clone().sub(controls.target);
      controls.target.set(
        -45,
        2,
        (activeWaterfront ? shoreAt(activeWaterfront, -45) : 164) + 5,
      );
      camera.position.copy(controls.target).add(offset);
      camera.zoom = 1.7;
      camera.updateProjectionMatrix();
      controls.update();
    },
    cameraPreset(view: "overview" | "neighborhood" | "overhead") {
      reviewingAirship = false;
      setStreetMode(false);
      if (view === "overview") {
        focus("city");
        return;
      }
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new T.Spherical().setFromVector3(offset);
      spherical.phi = view === "overhead" ? 0.001 : T.MathUtils.degToRad(35);
      controls.minPolarAngle =
        view === "overhead" ? 0.001 : T.MathUtils.degToRad(15);
      camera.position
        .copy(controls.target)
        .add(new T.Vector3().setFromSpherical(spherical));
      if (view === "neighborhood") camera.zoom = 4;
      camera.updateProjectionMatrix();
      controls.update();
    },
    generate,
    setStreetMode,
    testUnitState: () => testUnits?.state(),
    toggleBattle: () => testUnits?.toggleBattle(),
    selectBattleSquad: () => testUnits?.selectSquad(),
    advanceTestUnits(seconds: number) {
      if (!Number.isFinite(seconds) || seconds <= 0) return;
      for (let t = 0; t < Math.min(seconds, 60); t += 0.05)
        testUnits?.update(0.05);
    },
    testOrderPreview: () => testUnits?.previewState(),
    testCoverShot(exposed = false) {
      testUnits?.testFire(exposed);
    },
    resetTestHealth() {
      testUnits?.resetHealth();
    },
    selectTestUnit(id: number) {
      testUnits?.select(id);
    },
    stopTestUnit() {
      testUnits?.stop();
    },
    testUnitScreen(id: number) {
      return testUnits?.screen(id);
    },
    projectTestPoint(p: { x: number; z: number }) {
      return testUnits?.project(p);
    },
    showTactics,
    tacticalState() {
      return {
        available: !!tacticalFactory,
        visible: !!tacticalOverlay,
        obstacles: tacticalData?.obstacles.length ?? 0,
        cover: tacticalData?.cover.length ?? 0,
        routePoints: tacticalRoute.length,
      };
    },
    focus(view: Parameters<typeof focus>[0]) {
      reviewingAirship = false;
      focus(view);
    },
    focusAirship() {
      if (!airship) return;
      reviewingAirship = true;
      const target = airship.root
        .getWorldPosition(new T.Vector3())
        .add(new T.Vector3(0, 3, 0));
      controls.target.copy(target);
      camera.position.copy(target).add(new T.Vector3(30, 18, 36));
      camera.zoom = streetMode ? 1 : 6;
      camera.updateProjectionMatrix();
      controls.update();
    },
    configure,
    capture(view: Parameters<typeof focus>[0] = "angled") {
      focus(view);
      updateDetail();
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL("image/png");
    },
    orbitAnchor: () => anchoredOrbit.anchor(),
    cameraState() {
      return {
        position: camera.position.toArray(),
        target: controls.target.toArray(),
        zoom: camera.zoom,
        mode: streetMode ? "street" : "planning",
      };
    },
    modelCounts() {
      return { ...modelCounts };
    },
    detailLevel() {
      return distant ? "distant" : "full";
    },
    effects() {
      return {
        smokeSources: smokeSources.length,
        particles: smoke?.count ?? 0,
        lights: localLights.length,
        litFixtures: fixtureCount,
        dusk,
      };
    },
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
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clearPan);
      window.removeEventListener("focusin", clearPan);
      anchoredOrbit.dispose();
      controls.dispose();
      clear();
      kit.dispose();
      renderer.dispose();
      renderer.domElement.removeEventListener("pointerdown", focusCanvas, true);
      renderer.domElement.remove();
    },
  };
}

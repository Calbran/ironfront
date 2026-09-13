import { countryStreamingLandscape } from "./countryStreamingLandscape";
import { createPacingRuralScene } from "./pacingRuralScene";
import {
  createEmplacementModel,
  disposeEmplacementModel,
} from "./emplacementModels";
import { countryEncounterRoster } from "../../../../packages/game-core/src/countryEncounterRoster";
import {
  COUNTRY_AIRSHIP_ALTITUDE,
  countryEffectiveFireRange,
  countryDaylight,
  countryFireRange,
  countryForestCover,
  countryLightingHour,
  countryVisionRange,
  countryVisibilityScale,
} from "../../../../packages/game-core/src/countryEncounter";
import { tacticalRangeMeters } from "../../../../packages/game-core/src/cityCombatRules";
import { createTacticalPresentation } from "./tacticalPresentation";
import {
  countryPresentedUnits,
  countryPresentedShots,
  blendDisplayedPose,
  type DisplayedPose,
} from "./countryTacticalAdapter";
import { countryForestDensity } from "../../../../packages/game-core/src/countryLandscape";
import { ruralFieldAt } from "../../../../packages/game-core/src/regionalFarmland";
import { roadEnds } from "../../../../packages/game-core/src/countryLayoutGeometry";
import { countryDevelopedGeometry } from "./countryDevelopedGeometry";
import { sampleSliceMotion } from "./sliceMotion";
import { countryAtmosphere } from "./countryAtmosphere";
import { createReviewInfantryKit } from "../prototypes/animatedInfantry";
import { previewSlicePlacement } from "../../../../packages/game-core/src/slicePlacement";
import { createSliceNavigation } from "../../../../packages/game-core/src/countrySlice";
import {
  tacticalPreviewColor,
  tacticalPreviewPose,
} from "./tacticalPreviewStyle";
import { segmentDistance } from "../../../../packages/game-core/src/organicCity";
import {
  countryRefinedLandscape,
  countryMeadowNoise,
} from "./countryRefinedLandscape";
import { tacticalViewportGestures } from "./anchoredCityOrbit";
import { tacticalSelection } from "./tacticalSelection";
import {
  projectedObjectHitTarget,
  TACTICAL_INFANTRY_HIT_RADIUS,
  TACTICAL_TANK_HIT_PADDING,
  TACTICAL_TANK_MIN_HIT_RADIUS,
} from "./tacticalSelectionBounds";
import { tacticalKeyboardCamera } from "./tacticalKeyboardCamera";
import { cityUnitMarkers } from "./cityUnitMarkers";
import { squadSelectionOutline } from "./squadSelectionOutline";
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
import { countryRoadSurfaceHeight } from "../../../../packages/game-core/src/countryRoadNetwork";
import { terrainHeight } from "../../../../packages/game-core/src/connectedTerrain";
import type {
  SlicePlan,
  SliceState,
  SlicePoint,
} from "../../../../packages/game-core/src/countrySlice";
import { bakeInfantry } from "../infantryModel";
import { createMilitaryModel } from "../prototypes/militaryModels";
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
    units: {
      id: number;
      path: SlicePoint[];
      members?: { id: number; path: SlicePoint[] }[];
    }[];
  }>,
  options: {
    roster?: readonly {
      id: number;
      name: string;
      kind: "infantry" | "tank" | "airship";
      enemy?: boolean;
      antiTank?: boolean;
    }[];
    campaign?: boolean;
  } = {},
) {
  const roster = options.roster ?? countryEncounterRoster,
    poiSites = plan.sites.filter((site) => site.poi);
  const friendly = (id: number) => !roster.find((s) => s.id === id)?.enemy;
  const scene = new T.Scene();
  let placementNavigation = createSliceNavigation(plan);
  const cityAnchor = plan.sites.find((s) => s.id === "city") ?? {
    x: 500,
    z: 900,
  };
  const atmosphere = countryAtmosphere(scene);
  scene.background = new T.Color("#203d45");
  const renderer = new T.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: !!plan.campaignMap,
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const detailedPixelRatio = Math.min(devicePixelRatio, 1.5),
    strategicPixelRatio = Math.min(detailedPixelRatio, 1);
  let activePixelRatio = detailedPixelRatio;
  renderer.setPixelRatio(activePixelRatio);
  host.append(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    options.campaign
      ? "Persistent campaign battlefield"
      : "Playable country sector",
  );
  const camera = new T.PerspectiveCamera(
      45,
      1,
      0.15,
      Math.max(15000, plan.width * 12),
    ),
    controls = new OrbitControls(camera, renderer.domElement);
  controls.mouseButtons = {
    LEFT: -1 as T.MOUSE,
    MIDDLE: -1 as T.MOUSE,
    RIGHT: -1 as T.MOUSE,
  };
  renderer.domElement.tabIndex = 0;
  controls.minDistance = 8;
  controls.maxDistance = Math.max(7000, plan.width * 3);
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
  const terrainHatchScale = { value: 1 };
  const terrainHatchBlend = { value: 0 };
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
  const strategyTextureManager = new T.LoadingManager();
  if (plan.campaignMap) {
    host.dataset.strategyTextures = "loading";
    strategyTextureManager.onLoad = () => {
      host.dataset.strategyTextures = "ready";
    };
    strategyTextureManager.onError = () => {
      host.dataset.strategyTextures = "fallback";
    };
  }
  const strategyTextureLoader = new T.TextureLoader(strategyTextureManager);
  const strategyTexture = (name: string) => {
    if (!plan.campaignMap) return grain;
    const texture = strategyTextureLoader.load(
      `/art/strategy/strategy-${name}-v1.webp`,
    );
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  };
  const strategyMaps = {
    plains: strategyTexture("plains"),
    forest: strategyTexture("forest"),
    highlands: strategyTexture("highlands"),
    mountains: strategyTexture("mountains"),
    ocean: strategyTexture("ocean"),
  };
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
    forestWeights: number[] = [],
    slopeWeights: number[] = [],
    color = new T.Color(),
    meadow = new T.Color(0x969d77),
    lush = new T.Color(0x7e906c),
    dry = new T.Color(0xaaa17e),
    earth = new T.Color(0x918b78);
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i],
      z = positions[i + 2],
      n = countryMeadowNoise(
        x * (plan.campaignMap ? 0.008 : 0.6),
        z * (plan.campaignMap ? 0.008 : 0.6),
      );
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
    const bankDistance = plan.campaignMap
      ? Infinity
      : Math.min(
          ...plan.rivers.flatMap((r) =>
            r.slice(1).map((b, j) => segmentDistance({ x, z }, r[j], b)),
          ),
        );
    color.lerp(
      new T.Color(0xb3a080),
      (1 - T.MathUtils.smoothstep(bankDistance, 9, 24 + n * 4)) * 0.8,
    );
    const forest =
      !(plan.campaignMap && ruralFieldAt(plan.campaignMap.fields, x, z)) &&
      plan.sites.every(
        (site) => Math.hypot(x - site.x, z - site.z) > site.extent + 12,
      )
        ? T.MathUtils.smoothstep(
            countryForestDensity(x, z, plan.campaignMap?.version === 3),
            0.08,
            0.3,
          )
        : 0;
    color.lerp(new T.Color(0x596b43), forest * 0.65);
    color.toArray(colors, colors.length);
    forestWeights.push(forest);
    slopeWeights.push(T.MathUtils.smoothstep(slope, 0.04, 0.22));
  }
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geo.setAttribute(
    "terrainForest",
    new T.Float32BufferAttribute(forestWeights, 1),
  );
  geo.setAttribute(
    "terrainSlope",
    new T.Float32BufferAttribute(slopeWeights, 1),
  );
  // The authoritative terrain lattice owns mountain coverage. Passing it to the
  // shared ground shader keeps campaign and country presentation consistent.
  geo.setAttribute(
    "mountainWeight",
    new T.Float32BufferAttribute(surface.mountainWeight, 1),
  );
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geos.push(geo);
  const groundMaterial = material(0xffffff),
    terrainPeak = { value: Math.max(1, surface.peak) };
  groundMaterial.vertexColors = true;
  const compileGround = groundMaterial.onBeforeCompile;
  groundMaterial.onBeforeCompile = (shader, renderer) => {
    compileGround.call(groundMaterial, shader, renderer);
    atmosphere.shadeGround(shader);
    shader.uniforms.terrainOverview = terrainOverview;
    shader.uniforms.terrainSun = terrainSun;
    shader.uniforms.terrainDaylight = terrainDaylight;
    shader.uniforms.terrainInkDistance = terrainInkDistance;
    shader.uniforms.terrainHatchScale = terrainHatchScale;
    shader.uniforms.terrainHatchBlend = terrainHatchBlend;
    shader.uniforms.terrainPeak = terrainPeak;
    shader.uniforms.strategyPlains = { value: strategyMaps.plains };
    shader.uniforms.strategyForest = { value: strategyMaps.forest };
    shader.uniforms.strategyHighlands = { value: strategyMaps.highlands };
    shader.uniforms.strategyMountains = { value: strategyMaps.mountains };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float terrainOverview;\nattribute float mountainWeight;\nattribute float terrainForest;\nattribute float terrainSlope;\nvarying vec3 terrainNormal;\nvarying float terrainMountain;\nvarying float terrainForestWeight;\nvarying float terrainSlopeWeight;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nterrainNormal=normal;\nterrainMountain=mountainWeight;\nterrainForestWeight=terrainForest;\nterrainSlopeWeight=terrainSlope;",
      )
      .replace(
        "#include <color_vertex>",
        "#include <color_vertex>\nvColor.rgb=mix(vColor.rgb,vColor.rgb*.78+vec3(.20,.19,.13)*.22,terrainOverview*.72);",
      );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
uniform float terrainOverview;
uniform vec3 terrainSun;
uniform float terrainDaylight;
uniform float terrainInkDistance;
uniform float terrainHatchScale;
uniform float terrainHatchBlend;
uniform float terrainPeak;
uniform sampler2D strategyPlains;
uniform sampler2D strategyForest;
uniform sampler2D strategyHighlands;
uniform sampler2D strategyMountains;
varying vec3 terrainNormal;
varying float terrainMountain;
varying float terrainForestWeight;
varying float terrainSlopeWeight;
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
        "#include <color_fragment>",
        `#include <color_fragment>
// At continental distance, use a real survey-material family selected from
// authoritative terrain weights. Close views retain the physical miniature surface.
if(terrainOverview>.001) {
  vec2 surveyUV=cloudWorld.xz/920.;
  vec3 survey=texture2D(strategyPlains,surveyUV).rgb;
  survey=mix(survey,texture2D(strategyForest,surveyUV+vec2(.31,.17)).rgb,smoothstep(.18,.72,terrainForestWeight));
  float highlandWeight=smoothstep(.16,.72,terrainSlopeWeight)*(1.-smoothstep(.12,.58,terrainMountain));
  survey=mix(survey,texture2D(strategyHighlands,surveyUV+vec2(.63,.41)).rgb,highlandWeight);
  survey=mix(survey,texture2D(strategyMountains,surveyUV+vec2(.11,.73)).rgb,smoothstep(.16,.72,terrainMountain));
  diffuseColor.rgb=mix(diffuseColor.rgb,survey,terrainOverview*.14);
}
// Mountain coverage comes from the same lattice used by geography and movement.
// Scale-aware procedural fields stay legible from tactical to continental zoom.
float mountainMask = smoothstep(.16, .72, terrainMountain);
float mountainElevation = clamp(cloudWorld.y / terrainPeak, 0., 1.);
float mountainFace = 1. - abs(normalize(terrainNormal).y);
if(mountainMask>.001) {
  // The mipmapped shared grain replaces hash-noise evaluation per pixel. Two
  // scale pairs preserve the same broad rock and fine scree cross-fade.
  vec2 mountainUV = cloudWorld.xz / (14080. * terrainHatchScale);
  float mountainBroad = mix(texture2D(refinedGrain, mountainUV).r, texture2D(refinedGrain, mountainUV * .5 + vec2(.37,.71)).r, terrainHatchBlend);
  mat2 mountainTurn = mat2(.36,.93,-.93,.36);
  float mountainFine = mix(texture2D(refinedGrain, mountainTurn * mountainUV * 3.7 + vec2(.19,.43)).r, texture2D(refinedGrain, mountainTurn * mountainUV * 1.85 + vec2(.56,.11)).r, terrainHatchBlend);
  float rangeTone = texture2D(refinedGrain, cloudWorld.xz * .000009 + vec2(.23,.67)).r;
  vec3 warmStone = vec3(.39, .36, .29);
  vec3 coolSlate = vec3(.29, .33, .31);
  vec3 mountainStone = mix(warmStone, coolSlate, smoothstep(.3, .7, rangeTone));
  float exposedRock = smoothstep(.38, .72, mountainBroad * .52 + mountainFine * .22 + mountainFace * .62 + mountainElevation * .18);
  vec3 mountainSurface = mix(vec3(.39, .43, .30), mountainStone, .52 + exposedRock * .48);
  float scree = smoothstep(.55, .82, mountainFine + mountainFace * .32);
  mountainSurface = mix(mountainSurface, vec3(.235, .245, .215), scree * .42);
  float strataCoordinate = (cloudWorld.y + (mountainBroad - .5) * terrainPeak * .018) / (28. * terrainHatchScale);
  float strataFootprint = max(fwidth(strataCoordinate), .002);
  float strata = 1. - smoothstep(.04, .04 + strataFootprint * 1.5, abs(fract(strataCoordinate) - .5));
  mountainSurface *= .86 + mountainFine * .22 - strata * exposedRock * .13;
  float mountainCoverage = mountainMask * smoothstep(.015, .11, mountainElevation + mountainFace * .65);
  diffuseColor.rgb = mix(diffuseColor.rgb, mountainSurface, mountainCoverage * .9);
}`,
      )
      .replace(
        "texture2D(refinedGrain,refinedUV*.14).rgb",
        "(terrainOverview>.98?vec3(1.0):mix(vec3(1.0),(texture2D(refinedGrain,refinedUV*.14).rgb*.4 + texture2D(refinedGrain,mat2(.8,-.6,.6,.8)*refinedUV*.231+vec2(.37,.71)).rgb*.35 + texture2D(refinedGrain,mat2(.36,.93,-.93,.36)*refinedUV*.087).rgb*.25),.09*(1.-terrainOverview)))",
      )
      .replace("float mottling=.96+.04*", "float mottling=.995+.005*")
      .replace(
        "#include <opaque_fragment>",
        `
// World-anchored ink follows the relief's exposure to the moving sun.
// Flat ground stays clean; screen derivatives suppress distant moire.
float shadeSlope = max(0., terrainSun.y - dot(normalize(terrainNormal), terrainSun));
// Country hills are gentle: use their actual slope range, not mountain normals.
float hatchShade = smoothstep(.003, .035, shadeSlope);
float closeHatch = 1. - smoothstep(100., 450., distance(cameraPosition, cloudWorld));
float closeFrequency = mix(1., 2., closeHatch);
float hatchCoord = dot(refinedUV, vec2(.8, .6)) * closeFrequency / (14. * terrainHatchScale);
float crossCoord = dot(refinedUV, vec2(-.6, .8)) * closeFrequency / (18. * terrainHatchScale);
// Cross-fade power-of-two world scales. Lines remain world anchored while
// strategic zoom receives strokes large enough to survive pixel filtering.
float hatch = mix(terrainInk(hatchCoord), terrainInk(hatchCoord * .5), terrainHatchBlend);
float cross = mix(terrainInk(crossCoord), terrainInk(crossCoord * .5), terrainHatchBlend);
float ink = max(hatch, cross * smoothstep(.022, .065, shadeSlope));
outgoingLight *= 1. - hatchShade * (.08 + ink * .45) * mix(1., .5, closeHatch) * terrainDaylight * (1. - terrainInkDistance);
#include <opaque_fragment>`,
      );
  };
  groundMaterial.customProgramCacheKey = () => "miniature-country-ground-v12";
  const ground = new T.Mesh(geo, groundMaterial);
  ground.receiveShadow = true;
  ground.castShadow = true;
  scene.add(ground);
  const overviewGeometry = new T.BufferGeometry(),
    overviewIndices: number[] = [];
  for (const name of [
    "position",
    "normal",
    "color",
    "mountainWeight",
    "terrainForest",
    "terrainSlope",
  ])
    overviewGeometry.setAttribute(name, geo.getAttribute(name));
  const overviewStep = plan.campaignMap ? 2 : 4;
  for (let z = 0; z < surface.rows - 1; z += overviewStep)
    for (let x = 0; x < surface.cols - 1; x += overviewStep) {
      const x1 = Math.min(x + overviewStep, surface.cols - 1),
        z1 = Math.min(z + overviewStep, surface.rows - 1);
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
  let terrainWindow = "";
  function updateTerrainWindow(distance: number, strategic: boolean) {
    if (plan.campaignMap?.version !== 3) return;
    const radius = Math.max(surface.step * 4, distance * 3);
    const x0 = Math.max(
        0,
        Math.floor((controls.target.x - radius) / surface.step / 8) * 8,
      ),
      z0 = Math.max(
        0,
        Math.floor((controls.target.z - radius) / surface.step / 8) * 8,
      );
    const x1 = Math.min(
        surface.cols - 1,
        Math.ceil((controls.target.x + radius) / surface.step / 8) * 8,
      ),
      z1 = Math.min(
        surface.rows - 1,
        Math.ceil((controls.target.z + radius) / surface.step / 8) * 8,
      );
    const key = strategic ? "overview" : `${x0}:${z0}:${x1}:${z1}`;
    if (key === terrainWindow) return;
    terrainWindow = key;
    const coarse: number[] = [],
      fine: number[] = [];
    for (let z = 0; z < surface.rows - 1; z += overviewStep)
      for (let x = 0; x < surface.cols - 1; x += overviewStep) {
        if (!strategic && x >= x0 && z >= z0 && x < x1 && z < z1) continue;
        const a = z * surface.cols + x,
          b = z * surface.cols + Math.min(x + overviewStep, surface.cols - 1),
          c = Math.min(z + overviewStep, surface.rows - 1) * surface.cols + x,
          d = c + Math.min(overviewStep, surface.cols - 1 - x);
        if ([a, b, c, d].every((i) => surface.land[i]))
          coarse.push(a, c, b, b, c, d);
      }
    if (!strategic)
      for (let z = z0; z < z1; z++)
        for (let x = x0; x < x1; x++) {
          const a = z * surface.cols + x,
            b = a + 1,
            c = a + surface.cols,
            d = c + 1;
          if ([a, b, c, d].every((i) => surface.land[i]))
            fine.push(a, c, b, b, c, d);
        }
    const farIndex = overviewGeometry.getIndex()!;
    farIndex.array.set(coarse);
    farIndex.needsUpdate = true;
    overviewGeometry.setDrawRange(0, coarse.length);
    if (!strategic) {
      const nearIndex = geo.getIndex()!;
      nearIndex.array.set(fine);
      nearIndex.needsUpdate = true;
      geo.setDrawRange(0, fine.length);
    }
  }
  const landscape = plan.campaignMap
    ? countryStreamingLandscape(scene, plan, kit)
    : countryRefinedLandscape(scene, plan, kit);
  const farmland = plan.campaignMap
    ? createPacingRuralScene(
        scene,
        kit,
        {
          farms: [
            {
              id: "fields",
              name: "Fields",
              x: 0,
              y: 0,
              extent: 0,
              fields: plan.campaignMap.fields,
            },
          ],
          pois: [],
        },
        (x, z, h = 0) =>
          new T.Vector3(x, terrainHeight(plan.surface, x, z) + h, z),
      )
    : undefined;
  const point = (x: number, z: number, h = 0) => new T.Vector3(x, h, z),
    roads = createCountryRoadScene(scene, plan.roads, surface, point);
  const waterMat = material(0x457e8a),
    box = new T.BoxGeometry(1, 1, 1);
  geos.push(box);
  if (plan.campaignMap) {
    const seaGeo = new T.PlaneGeometry(plan.width * 3, plan.depth * 3).rotateX(
        -Math.PI / 2,
      ),
      seaMat = new T.MeshBasicMaterial({
        color: 0xffffff,
        map: strategyMaps.ocean,
      }),
      sea = new T.Mesh(seaGeo, seaMat);
    strategyMaps.ocean.repeat.set(plan.width / 900, plan.depth / 900);
    sea.position.set(plan.width / 2, -3, plan.depth / 2);
    scene.add(sea);
    geos.push(seaGeo);
    mats.push(seaMat);
  }
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
          { x: r.path[0].x - cityAnchor.x, z: r.path[0].y - cityAnchor.z },
          { x: r.path[0].x - cityAnchor.x + 24, z: r.path[0].y - cityAnchor.z },
        ],
      })),
  });
  const cityRoot = cityView.assetRoot();
  cityRoot.position.set(cityAnchor.x, 0, cityAnchor.z);
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
  const builtBags = new Map<number, T.Group>();
  let bagSignature = "[]";
  const baseObstacles = [...plan.obstacles];
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
  const developmentGeometry = countryDevelopedGeometry(poiSites),
    developmentMaterial = new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      side: T.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
  scene.add(new T.Mesh(developmentGeometry, developmentMaterial));
  geos.push(developmentGeometry);
  mats.push(developmentMaterial);
  const residentCells = new Map<string, string>();
  const siteStreetGeometry = new T.BufferGeometry(),
    siteStreetPositions: number[] = [];
  for (const site of poiSites)
    for (const road of site.poi!.roads)
      for (const p of roadEnds(road))
        siteStreetPositions.push(site.x + p.x, 0.25, site.z + p.z);
  siteStreetGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(siteStreetPositions, 3),
  );
  const siteStreetMaterial = new T.LineBasicMaterial({
    color: 0xaaa591,
    transparent: true,
    opacity: 0.24,
  });
  const siteStreetLines = new T.LineSegments(
    siteStreetGeometry,
    siteStreetMaterial,
  );
  scene.add(siteStreetLines);
  // These tiny batches remain resident when full POI assets are streamed out.
  const distantSites = new Map<string, T.InstancedMesh>(),
    campaignOverviewMasses: { matrix: T.Matrix4; color: T.Color }[] = [];
  for (const site of poiSites) {
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
      const massColor = material.color ?? new T.Color("white");
      mesh.setColorAt(i, massColor);
      if (plan.campaignMap) {
        const worldMatrix = silhouettePose.matrix.clone();
        worldMatrix.elements[12] += site.x;
        worldMatrix.elements[14] += site.z;
        campaignOverviewMasses.push({ matrix: worldMatrix, color: massColor });
      }
    });
    mesh.position.set(site.x, 0, site.z);
    mesh.computeBoundingSphere();
    mesh.visible = !plan.campaignMap;
    scene.add(mesh);
    distantSites.set(site.id, mesh);
  }
  const campaignSiteOverview = plan.campaignMap
    ? new T.InstancedMesh(
        silhouetteBox,
        silhouetteMaterial,
        campaignOverviewMasses.length,
      )
    : undefined;
  if (campaignSiteOverview) {
    campaignOverviewMasses.forEach(({ matrix, color }, index) => {
      campaignSiteOverview.setMatrixAt(index, matrix);
      campaignSiteOverview.setColorAt(index, color);
    });
    campaignSiteOverview.computeBoundingSphere();
    scene.add(campaignSiteOverview);
  }
  const rig = bakeInfantry(0),
    bodyMat = new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
    });
  mats.push(bodyMat);
  const infantryKit = createReviewInfantryKit();
  const combatObjects = new Map<number, T.Group>(),
    memberCorrection = new Map<number, DisplayedPose>();
  let displayedMembers = new Map<number, DisplayedPose>();
  const vehicles = new Map(
    roster
      .filter((s) => s.kind !== "infantry")
      .map((s) => [
        s.id,
        createMilitaryModel(s.kind as "tank" | "airship", true),
      ]),
  );
  const airships = roster
    .filter((s) => s.kind === "airship")
    .map((s) => vehicles.get(s.id)!);
  const objects = new Map<number, T.Group>(),
    soldiers = new Map<number, T.Mesh[]>();
  const ringGeo = new T.RingGeometry(1.1, 1.35, 24).rotateX(-Math.PI / 2);
  geos.push(ringGeo);
  const squadRingSamples = 40;
  const createSquadRingGeometry = () => {
    const geometry = new T.BufferGeometry(),
      indices: number[] = [];
    geometry.setAttribute(
      "position",
      new T.BufferAttribute(new Float32Array(squadRingSamples * 2 * 3), 3),
    );
    for (let i = 0; i < squadRingSamples; i++) {
      const next = (i + 1) % squadRingSamples,
        outer = i * 2,
        inner = outer + 1,
        nextOuter = next * 2,
        nextInner = nextOuter + 1;
      indices.push(outer, inner, nextOuter, nextOuter, inner, nextInner);
    }
    geometry.setIndex(indices);
    geos.push(geometry);
    return geometry;
  };
  const selectedMat = new T.MeshBasicMaterial({
    color: 0xffdd82,
    depthTest: false,
    side: T.DoubleSide,
  });
  mats.push(selectedMat);
  const enemyRingMat = selectedMat.clone();
  enemyRingMat.color.set(0xd56a53);
  mats.push(enemyRingMat);
  const rings = new Map<number, T.Mesh>(),
    squadRingGeometries = new Map<number, T.BufferGeometry>();
  for (const spec of roster) {
    const id = spec.id;
    const root = new T.Group();
    if (spec.kind === "infantry") {
      const parts: T.Mesh[] = [];
      const uniform = !friendly(id) ? bodyMat.clone() : bodyMat;
      if (!friendly(id)) {
        uniform.color.set(0xd99484);
        mats.push(uniform);
      }
      for (let member = 0; member < 6; member++) {
        const actor = infantryKit.actor(
          spec.antiTank && member === 0 ? "antitank" : "rifle",
        );
        const memberParts = actor.root.children as T.Mesh[];
        memberParts.forEach((part) => (part.material = uniform));
        const wrapper = new T.Group(),
          model = actor.root;
        wrapper.position.set(
          ((member % 3) - 1) * 1.1,
          0,
          (Math.floor(member / 3) - 0.5) * 1.2,
        );
        model.scale.setScalar(0.55);
        wrapper.add(model);
        root.add(wrapper);
        parts.push(...memberParts);
        combatObjects.set(id * 100 + member, wrapper);
      }
      soldiers.set(id, parts);
    } else {
      const model = vehicles.get(id)!.root;
      model.scale.setScalar(0.55);
      root.add(model);
      if (spec.kind === "tank") combatObjects.set(id, root);
    }
    const ringGeometry =
      spec.kind === "infantry" ? createSquadRingGeometry() : ringGeo;
    if (spec.kind === "infantry") squadRingGeometries.set(id, ringGeometry);
    const ring = new T.Mesh(
      ringGeometry,
      !friendly(id) ? enemyRingMat : selectedMat,
    );
    ring.rotation.y = 0;
    scene.add(ring);
    rings.set(id, ring);
    objects.set(id, root);
    scene.add(root);
    root.visible = friendly(id);
  }
  const ghosts = new Map<
    number,
    { root: T.Group; material: T.MeshBasicMaterial }
  >();
  const ghostMemberMaterials = new Map<number, T.MeshBasicMaterial>();
  const previewPoses = {
    none: tacticalPreviewPose(rig, "none"),
    partial: tacticalPreviewPose(rig, "partial"),
    full: tacticalPreviewPose(rig, "full"),
  };
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
    if (roster.find((s) => s.id === id)?.kind === "infantry")
      ghost.children.forEach((member, i) => {
        const m = ghostMaterial.clone();
        mats.push(m);
        ghostMemberMaterials.set(id * 100 + i, m);
        member.traverse((child) => {
          if (child instanceof T.Mesh) child.material = m;
        });
      });
    const ring = new T.Mesh(ringGeo, ghostMaterial);
    ring.position.y = 0.08;
    ghost.add(ring);
    ghost.visible = false;
    scene.add(ghost);
    ghosts.set(id, { root: ghost, material: ghostMaterial });
  }
  const markerUnits = roster.map((s) => ({
      id: s.id,
      x: 0,
      z: 0,
      kind: s.kind === "tank" ? "vehicle" : s.kind,
      friendly: !s.enemy,
      health: s.enemy ? 0 : 100,
    })),
    unitMarkers = cityUnitMarkers(
      renderer.domElement,
      markerUnits,
      (id, add) => {
        if (friendly(id)) select([id], add);
      },
      (unit) => focus(unit, unit.kind === "airship" ? 100 : 30),
      host,
      {
        cluster: !!plan.campaignMap,
        selectGroup: (ids, add) => select(ids.filter(friendly), add),
      },
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
  const y = (p: SlicePoint, air = false) => {
    if (air) return terrainHeight(surface, p.x, p.z) + COUNTRY_AIRSHIP_ALTITUDE;
    const local = { x: p.x - cityAnchor.x, z: p.z - cityAnchor.z };
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
    return (
      countryRoadSurfaceHeight(plan.roads, surface, { x: p.x, y: p.z }) + 0.15
    );
  };
  function updateSquadRing(
    geometry: T.BufferGeometry,
    members: readonly { x: number; z: number }[],
  ) {
    const outer = squadSelectionOutline(members, 1.55, squadRingSamples),
      inner = squadSelectionOutline(members, 1.25, squadRingSamples),
      position = geometry.getAttribute("position") as T.BufferAttribute;
    for (let i = 0; i < squadRingSamples; i++) {
      for (const [edge, p] of [outer[i], inner[i]].entries())
        position.setXYZ(i * 2 + edge, p.x, y(p) + 0.035, p.z);
    }
    position.needsUpdate = true;
    geometry.computeBoundingSphere();
  }
  function focus(p: SlicePoint, distance = 130) {
    controls.target.set(p.x, y(p), p.z);
    camera.position
      .copy(controls.target)
      .add(new T.Vector3(0.3, 0.8, 1).normalize().multiplyScalar(distance));
    controls.update();
  }
  const ranks: Record<string, number> = {
    site: 0,
    hamlet: 1,
    village: 2,
    landmark: 2,
    town: 3,
    city: 4,
    metropolis: 5,
  };
  const labelSites = [
    ...plan.sites,
    ...(plan.campaignMap?.version === 3
      ? surface.ranges.map((r) => ({
          id: r.id,
          name: r.name,
          x: r.x,
          z: r.y,
          extent: r.radius,
          rank: "landmark",
        }))
      : []),
  ];
  const labels = labelSites
    .sort(
      (a, b) =>
        ranks[b.rank ?? (b.id === "city" ? "city" : "site")] -
          ranks[a.rank ?? (a.id === "city" ? "city" : "site")] ||
        b.extent - a.extent,
    )
    .map((site) => {
      const button = document.createElement("button");
      button.className = "slice-site-label";
      button.textContent = site.name;
      button.dataset.rank = site.rank ?? (site.id === "city" ? "city" : "site");
      button.title = `${site.name} · ${button.dataset.rank}`;
      button.onclick = () => focus(site, Math.max(160, site.extent * 2.6));
      host.append(button);
      return { site, button };
    });
  const builtLabels = new Map<number, HTMLButtonElement>();
  const labelCameraMatrix = new T.Matrix4(),
    labelProjection = new T.Vector3();
  let labelViewportWidth = -1,
    labelViewportHeight = -1;
  const rangeLines = new T.Group(),
    visionRangeMaterial = new T.LineBasicMaterial({
      color: 0x67d9e4,
      transparent: true,
      opacity: 0.82,
      depthTest: false,
    }),
    maximumFireRangeMaterial = new T.LineBasicMaterial({
      color: 0xe5a85c,
      transparent: true,
      opacity: 0.32,
      depthTest: false,
    }),
    fireRangeMaterial = new T.LineBasicMaterial({
      color: 0xe5a85c,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
    }),
    rangeHint = document.createElement("div");
  let lastRangeVisibilityScale = -1;
  mats.push(visionRangeMaterial, maximumFireRangeMaterial, fireRangeMaterial);
  scene.add(rangeLines);
  rangeHint.className = "slice-range-legend";
  rangeHint.setAttribute("aria-live", "polite");
  host.append(rangeHint);
  const rangeText = (range: number) => {
    const meters = tacticalRangeMeters(range);
    return meters >= 1000
      ? `${(meters / 1000).toFixed(1)} km`
      : `${Math.round(meters)} m`;
  };
  function clearRangeLines() {
    for (const child of [...rangeLines.children]) {
      child.removeFromParent();
      if (child instanceof T.Line) child.geometry.dispose();
    }
  }
  function drawRanges(daylight = countryDaylight(lighting, Date.now())) {
    lastRangeVisibilityScale = countryVisibilityScale(daylight);
    clearRangeLines();
    const selected = (current?.units ?? []).filter(
      (unit) => selection.includes(unit.id) && !unit.enemy && unit.health !== 0,
    );
    for (const unit of selected) {
      const ranges = [
        {
          radius: countryVisionRange(
            unit,
            countryForestCover(plan, unit),
            daylight,
          ),
          material: visionRangeMaterial,
        },
        { radius: countryFireRange(unit), material: maximumFireRangeMaterial },
        {
          radius: countryEffectiveFireRange(unit),
          material: fireRangeMaterial,
        },
      ];
      for (const { radius, material } of ranges) {
        if (!radius) continue;
        const points = Array.from({ length: 128 }, (_, index) => {
          const angle = (index / 128) * Math.PI * 2,
            p = {
              x: unit.x + Math.cos(angle) * radius,
              z: unit.z + Math.sin(angle) * radius,
            },
            surfacePoint = {
              x: T.MathUtils.clamp(p.x, 0, plan.width),
              z: T.MathUtils.clamp(p.z, 0, plan.depth),
            };
          return new T.Vector3(p.x, y(surfacePoint) + 0.45, p.z);
        });
        rangeLines.add(
          new T.LineLoop(
            new T.BufferGeometry().setFromPoints(points),
            material,
          ),
        );
      }
    }
    if (selected.length === 1) {
      const unit = selected[0],
        vision = countryVisionRange(
          unit,
          countryForestCover(plan, unit),
          daylight,
        ),
        effective = countryEffectiveFireRange(unit),
        maximum = countryFireRange(unit);
      rangeHint.textContent = `${unit.name} · Vision ${rangeText(vision)} · Fire ${effective ? `${rangeText(effective)} effective / ${rangeText(maximum)} max` : "none"}`;
      rangeHint.hidden = false;
    } else if (selected.length > 1) {
      rangeHint.textContent = `${selected.length} selected · cyan vision · amber effective / faint maximum fire`;
      rangeHint.hidden = false;
    } else rangeHint.hidden = true;
  }
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
  const presentation = createTacticalPresentation(
    scene,
    () => camera,
    canvas,
    rig,
    (p) => y(p),
    combatObjects,
    host,
  );
  let presentationTime = 0;
  const hint = document.createElement("div");
  hint.className = "slice-preview-hint";
  host.append(hint);
  let previewRequest: { p: SlicePoint; facing?: number } | undefined,
    lastPreviewSolve = -Infinity;
  function clearPreview() {
    for (const ghost of ghosts.values()) ghost.root.visible = false;
  }
  function renderPreview(
    p: SlicePoint,
    facing: number | undefined,
    result?: {
      valid: boolean;
      error?: string;
      units: {
        id: number;
        path: SlicePoint[];
        members?: { id: number; path: SlicePoint[] }[];
      }[];
    },
  ) {
    clearPreview();
    if (!current) return;
    const placements = previewSlicePlacement(
      plan,
      placementNavigation,
      current,
      selection,
      p,
      facing,
    );
    for (const id of selection) {
      const unit = current.units.find((u) => u.id === id),
        ghost = ghosts.get(id);
      if (!unit || !ghost) continue;
      ghost.root.visible = true;
      ghost.root.position.set(0, 0, 0);
      ghost.root.rotation.y = 0;
      if (unit.members) {
        unit.members.forEach((member, i) => {
          const child = ghost.root.children[i],
            goal = placements.find((g) => g.id === member.id);
          child.visible = member.health !== 0 && !!goal;
          if (goal) {
            child.position.set(goal.x, y(goal), goal.z);
            child.rotation.y = goal.angle;
            ghostMemberMaterials
              .get(member.id)
              ?.color.set(tacticalPreviewColor(goal.valid, goal.cover));
            child.children[0].children.forEach((part, j) => {
              part.matrix.fromArray(previewPoses[goal.cover][j]);
              part.matrixWorldNeedsUpdate = true;
            });
          }
        });
        // Hide the old group ring: preview each actual soldier, as in city battle.
        ghost.root.children
          .slice(unit.members.length)
          .forEach((c) => (c.visible = false));
      } else {
        const goal = placements.find((g) => g.id === id) ?? {
          ...p,
          angle: facing ?? unit.angle,
        };
        ghost.root.position.set(
          goal.x,
          y(goal, unit.kind === "airship"),
          goal.z,
        );
        ghost.root.rotation.y = goal.angle;
      }
      const own = placements.filter((g) =>
        unit.members ? unit.members.some((m) => m.id === g.id) : g.id === id,
      );
      ghost.material.color.set(
        own.some((g) => !g.valid)
          ? 0xff6655
          : own.some((g) => g.cover !== "none")
            ? 0x75e299
            : 0xa4cddd,
      );
    }
    hint.textContent =
      result && !result.valid
        ? (result.error ?? "Route blocked")
        : "Release to order · Shift queues";
    hint.hidden = false;
  }
  function queuePreview(p: SlicePoint, _append: boolean, facing?: number) {
    previewRequest = { p: { ...p }, facing };
    const now = performance.now();
    if (now - lastPreviewSolve >= 80) {
      renderPreview(p, facing);
      lastPreviewSolve = now;
    }
  }
  function clearOrderPreview() {
    previewRequest = undefined;
    lastPreviewSolve = -Infinity;
    hint.hidden = true;
    clearPreview();
  }
  clearOrderPreview();
  const selectionControls = tacticalSelection(canvas, {
    units: () => {
      const rect = canvas.getBoundingClientRect();
      return [...objects].flatMap(([id, object]) => {
        const unit = current?.units.find((u) => u.id === id);
        if (!friendly(id) || !unit || unit.health === 0) return [];
        if (
          (unit.kind === "airship" || unit.kind === "tank") &&
          object.visible
        ) {
          return [
            projectedObjectHitTarget(
              id,
              object,
              camera,
              rect,
              unit.kind === "tank" ? TACTICAL_TANK_MIN_HIT_RADIUS : 24,
              unit.kind === "tank" ? TACTICAL_TANK_HIT_PADDING : 6,
            ),
          ];
        }
        // Each rendered member is a hit target for its parent squad. Far icons
        // keep the aggregate target when member geometry is culled.
        const targets =
          unit.members && object.visible
            ? object.children.filter(
                (member, index) =>
                  member.visible && unit.members![index]?.health !== 0,
              )
            : [object];
        return targets.map((target) => {
          const p = target.getWorldPosition(new T.Vector3());
          p.y += unit.kind === "infantry" ? 0.5 : 0;
          p.project(camera);
          return {
            id,
            x: rect.left + ((p.x + 1) * rect.width) / 2,
            y: rect.top + ((1 - p.y) * rect.height) / 2,
            radius:
              unit.kind === "infantry"
                ? TACTICAL_INFANTRY_HIT_RADIUS
                : undefined,
            visible: p.z >= -1 && p.z <= 1,
          };
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
  const labelWheel = (event: WheelEvent) => {
    const target = event.target;
    if (target instanceof Element && target.closest(".slice-site-label"))
      tacticalGestures.zoom(event);
  };
  host.addEventListener("wheel", labelWheel, { capture: true, passive: false });
  const keyboardCamera = tacticalKeyboardCamera(
    () => camera,
    controls.target,
    (yaw) => tacticalGestures.rotate(yaw),
    () => Math.max(7, camera.position.distanceTo(controls.target) * 0.6),
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
      if (previewRequest && time - lastPreviewSolve >= 80) {
        renderPreview(previewRequest.p, previewRequest.facing);
        lastPreviewSolve = time;
      }
      keyboardCamera.update(dt);
      controls.update();
      camera.position.y = Math.max(
        camera.position.y,
        countryRoadSurfaceHeight(plan.roads, surface, {
          x: camera.position.x,
          y: camera.position.z,
        }) + 3,
      );
      controls.target.y = Math.max(
        controls.target.y,
        countryRoadSurfaceHeight(plan.roads, surface, {
          x: controls.target.x,
          y: controls.target.z,
        }),
      );
      const cameraDistance = camera.position.distanceTo(controls.target);
      if (current) {
        const occupiedBuilds: {
          x: number;
          y: number;
          button: HTMLButtonElement;
          count: number;
        }[] = [];
        for (const bag of current.sandbags ?? []) {
          const button = builtLabels.get(bag.id);
          if (!button) continue;
          const p = new T.Vector3(bag.x, y(bag) + 1, bag.z).project(camera);
          button.hidden =
            cameraDistance < 180 ||
            p.z < 0 ||
            p.z > 1 ||
            Math.abs(p.x) > 1 ||
            Math.abs(p.y) > 1;
          if (button.hidden) continue;
          const x = ((p.x + 1) * host.clientWidth) / 2,
            sy = ((1 - p.y) * host.clientHeight) / 2;
          const group = occupiedBuilds.find(
            (g) => Math.hypot(g.x - x, g.y - sy) < 40,
          );
          if (group) {
            button.hidden = true;
            group.count++;
            group.button.textContent = `▰ ${group.count}`;
          } else {
            button.textContent = "▰";
            button.style.left = `${x}px`;
            button.style.top = `${sy}px`;
            occupiedBuilds.push({ x, y: sy, button, count: 1 });
          }
        }
        if (current.running) presentationTime += dt;
        const t = snap ? 1 : Math.max(0, Math.min(1, (time - received) / 120));
        const frameState = sampleSliceMotion(current, time - received, plan);
        const presented = countryPresentedUnits(frameState);
        for (const unit of presented) {
          const old = memberCorrection.get(unit.id);
          if (old && !snap)
            Object.assign(unit, blendDisplayedPose(old, unit, t));
        }
        displayedMembers = new Map(
          presented.map((u) => [
            u.id,
            {
              x: u.x,
              z: u.z,
              angle: u.angle,
              distance: u.distance,
              turretAngle: u.turretAngle,
            },
          ]),
        );
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
          o.rotation.y = u.kind === "infantry" ? 0 : angle;
          const ring = rings.get(u.id)!;
          if (u.members) {
            const living = u.members
              .filter((member) => member.health !== 0)
              .map((member) => displayedMembers.get(member.id) ?? member);
            if (living.length)
              updateSquadRing(squadRingGeometries.get(u.id)!, living);
            ring.position.set(0, 0, 0);
          } else ring.position.set(x, y({ x, z }) + 0.03, z);
          ring.visible = selection.includes(u.id);
          if (u.members)
            u.members.forEach((member, index) => {
              o.children[index].visible = true;
            });
        }
        presentation.update(
          presentationTime,
          current.running,
          presented,
          countryPresentedShots(current),
          current.sounds,
        );
        for (const marker of markerUnits) {
          marker.health =
            current.units.find((u) => u.id === marker.id)?.health ??
            (friendly(marker.id) ? 100 : 0);
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
          const alive = current.units.some(
            (u) => u.id === id && (u.health !== 0 || u.kind === "infantry"),
          );
          object.visible = alive && !iconIds.has(id);
          rings.get(id)!.visible =
            alive &&
            (current.units.find((u) => u.id === id)?.health ?? 0) > 0 &&
            !iconIds.has(id) &&
            (selection.includes(id) || !friendly(id));
        }
      }
      airships.forEach((airship) => airship.animate(time / 1000));
      camera.updateMatrixWorld();
      const viewportWidth = host.clientWidth,
        viewportHeight = host.clientHeight,
        cameraChanged =
          !labelCameraMatrix.equals(camera.matrixWorld) ||
          labelViewportWidth !== viewportWidth ||
          labelViewportHeight !== viewportHeight;
      if (cameraChanged) {
        labelCameraMatrix.copy(camera.matrixWorld);
        labelViewportWidth = viewportWidth;
        labelViewportHeight = viewportHeight;
        const occupiedLabels: { x: number; y: number; width: number }[] = [];
        let named = 0;
        const labelBudget = Math.max(
          5,
          Math.floor((viewportWidth * viewportHeight) / 65000),
        );
        for (const { site, button } of labels) {
          const p = labelProjection
            .set(site.x, y(site) + 5, site.z)
            .project(camera);
          button.hidden =
            cameraDistance < 180 ||
            p.z > 1 ||
            p.z < 0 ||
            Math.abs(p.x) > 1 ||
            Math.abs(p.y) > 1;
          if (plan.campaignMap && !button.hidden) {
            const rank = ranks[button.dataset.rank!] ?? 0;
            const minRank =
              cameraDistance > 90000
                ? 3
                : cameraDistance > 24000
                  ? 2
                  : cameraDistance > 7000
                    ? 1
                    : 0;
            button.hidden = rank < minRank;
            const width = Math.min(230, site.name.length * 7 + 24);
            if (
              !button.hidden &&
              (named >= labelBudget ||
                occupiedLabels.some(
                  (q) =>
                    Math.abs(q.x - p.x) * viewportWidth <
                      q.width + width + 24 &&
                    Math.abs(q.y - p.y) * viewportHeight < 64,
                ))
            )
              button.hidden = true;
            if (!button.hidden) {
              occupiedLabels.push({ x: p.x, y: p.y, width });
              named++;
            }
          }
          button.style.left = `${((p.x + 1) * viewportWidth) / 2}px`;
          button.style.top = `${((1 - p.y) * viewportHeight) / 2}px`;
        }
      }
      const batchedSites = !!campaignSiteOverview && cameraDistance >= 650;
      siteStreetLines.visible = cameraDistance >= 650 && cameraDistance < 32000;
      if (campaignSiteOverview) campaignSiteOverview.visible = batchedSites;
      if (cameraChanged)
        for (const s of poiSites) {
          const wanted =
            Math.hypot(controls.target.x - s.x, controls.target.z - s.z) <
              Math.max(1000, s.extent + 400) &&
            (!ultraCity || !!plan.campaignMap) &&
            cameraDistance < 650;
          distantSites.get(s.id)!.visible = !wanted && !batchedSites;
          const detailRadius =
            cameraDistance < 80 ? 320 : cameraDistance < 200 ? 640 : 1000;
          const cell = `${Math.round((controls.target.x - s.x) / 320)}:${Math.round((controls.target.z - s.z) / 320)}:${detailRadius}`;
          if (
            wanted &&
            (!resident.has(s.id) ||
              (s.extent > 600 && residentCells.get(s.id) !== cell))
          ) {
            resident.get(s.id)?.dispose();
            const asset = countryPOIAssets(
              s.poi!,
              kit,
              false,
              s.extent > 600
                ? {
                    x: Math.round((controls.target.x - s.x) / 320) * 320,
                    z: Math.round((controls.target.z - s.z) / 320) * 320,
                    radius: detailRadius,
                  }
                : undefined,
              false,
            );
            asset.group.position.set(s.x, 0, s.z);
            scene.add(asset.group);
            resident.set(s.id, asset);
            residentCells.set(s.id, cell);
          } else if (!wanted && resident.has(s.id)) {
            resident.get(s.id)!.dispose();
            resident.delete(s.id);
            residentCells.delete(s.id);
          }
        }
      const cityPixels =
        host.clientHeight /
        (2 *
          Math.tan(Math.PI / 8) *
          Math.max(
            1,
            camera.position.distanceTo(
              new T.Vector3(cityAnchor.x, 2, cityAnchor.z),
            ),
          ));
      if (ultraCity ? cityPixels > 1 : cityPixels < 0.7) {
        ultraCity = !ultraCity;
        cityRoot.visible = !ultraCity;
        citySilhouette.visible = ultraCity;
      }
      if (!ultraCity) cityView.updateEmbedded(camera, cityPixels);
      const near = Math.max(0.15, cameraDistance / 1200);
      if (Math.abs(camera.near - near) > 0.01) {
        camera.near = near;
        camera.updateProjectionMatrix();
      }
      const roadLod = roads.update(camera, controls.target);
      landscape.update(camera, controls.target);
      farmland?.update(camera, controls.target, time);
      if (plan.campaignMap)
        (scene.fog as T.FogExp2).density = Math.min(
          0.00007,
          0.2 / Math.max(1, camera.position.distanceTo(controls.target)),
        );
      const shadows = camera.position.distanceTo(controls.target) < 850;
      renderer.shadowMap.enabled = shadows;
      const now = Date.now(),
        hour = countryLightingHour(lighting, now);
      const phase = ((hour - 6) / 24) * Math.PI * 2,
        altitude = Math.sin(phase);
      const daylight = countryDaylight(lighting, now),
        visibilityScale = countryVisibilityScale(daylight);
      if (Math.abs(visibilityScale - lastRangeVisibilityScale) > 0.02)
        drawRanges(daylight);
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
      if (plan.campaignMap) {
        const hatchLevel = Math.max(0, Math.log2(cameraDistance / 650));
        terrainHatchScale.value = 2 ** Math.floor(hatchLevel);
        terrainHatchBlend.value = hatchLevel - Math.floor(hatchLevel);
        terrainInkDistance.value = T.MathUtils.smoothstep(
          cameraDistance,
          900,
          3200,
        );
      } else {
        terrainHatchScale.value = 1;
        terrainHatchBlend.value = 0;
        terrainInkDistance.value = T.MathUtils.smoothstep(
          cameraDistance,
          2800,
          5500,
        );
      }
      terrainOverview.value = T.MathUtils.smoothstep(
        camera.position.distanceTo(controls.target),
        600,
        2400,
      );
      const strategicTerrain = plan.campaignMap
        ? cameraDistance > Math.max(24000, surface.step * 30)
        : cameraDistance > 1800;
      updateTerrainWindow(cameraDistance, strategicTerrain);
      overviewGround.visible =
        strategicTerrain || plan.campaignMap?.version === 3;
      ground.visible = !strategicTerrain;
      const wantedPixelRatio = strategicTerrain
        ? strategicPixelRatio
        : detailedPixelRatio;
      if (wantedPixelRatio !== activePixelRatio) {
        activePixelRatio = wantedPixelRatio;
        renderer.setPixelRatio(activePixelRatio);
        renderer.setSize(host.clientWidth, host.clientHeight, false);
      }
      host.dataset.lightingHour = hour.toFixed(1);
      host.dataset.cityLod = ultraCity ? "silhouette" : "detailed";
      host.dataset.roadLod = roadLod;
      host.dataset.hatchScale = terrainHatchScale.value.toFixed(2);
      host.dataset.terrainLod = strategicTerrain ? "strategic" : "detailed";
      host.dataset.pixelRatio = activePixelRatio.toFixed(2);
      host.dataset.cameraDistance = cameraDistance.toFixed(2);
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
      memberCorrection.clear();
      for (const [id, pose] of displayedMembers)
        memberCorrection.set(id, { ...pose });
      if (
        immediate ||
        !current ||
        ((state.battlefield ?? state.encounter)?.elapsed ?? 0) <
          ((current.battlefield ?? current.encounter)?.elapsed ?? 0)
      ) {
        presentation.reset();
        presentationTime = 0;
        memberCorrection.clear();
      }
      const nextBags = JSON.stringify(state.sandbags ?? []);
      if (nextBags !== bagSignature) {
        bagSignature = nextBags;
        for (const [id, label] of builtLabels)
          if (!state.sandbags?.some((b) => b.id === id)) {
            label.remove();
            builtLabels.delete(id);
          }
        for (const bag of state.sandbags ?? [])
          if (!builtLabels.has(bag.id)) {
            const button = document.createElement("button");
            button.className = "slice-infrastructure-marker";
            button.title = "Sandbag emplacement";
            button.setAttribute("aria-label", `Sandbag emplacement ${bag.id}`);
            button.onclick = () => focus(bag, 80);
            host.append(button);
            builtLabels.set(bag.id, button);
          }
        for (const [id, object] of builtBags)
          if (!state.sandbags?.some((b) => b.id === id)) {
            disposeEmplacementModel(object);
            builtBags.delete(id);
          }
        for (const bag of state.sandbags ?? [])
          if (!builtBags.has(bag.id)) {
            const object = createEmplacementModel("sandbags");
            object.position.set(bag.x, y(bag), bag.z);
            object.rotation.y = bag.angle;
            scene.add(object);
            builtBags.set(bag.id, object);
          }
        plan.obstacles = [
          ...baseObstacles,
          ...(state.sandbags ?? []).map((b) => ({
            ...b,
            id: "campaign-bag-" + b.id,
            kind: "sandbag" as const,
            width: 4,
            depth: 1,
          })),
        ];
        placementNavigation = createSliceNavigation(plan);
      }
      previous = current;
      current = state;
      lighting = state.lighting ?? "cycle";
      snap = immediate || !previous || state.time - previous.time > 1500;
      received = performance.now();
      drawPath();
      drawRanges(countryDaylight(lighting, state.time));
    },
    select(ids: number[]) {
      selection = ids;
      drawPath();
      drawRanges();
    },
    setLighting(mode: "cycle" | "day" | "night") {
      lighting = mode;
    },
    territoryLabels(
      territories: { id: string; owner: 0 | 1 | null; progress: number }[],
    ) {
      for (const { site, button } of labels) {
        const t = territories.find((t) => t.id === site.id);
        if (t) {
          button.style.borderColor =
            t.owner === 0 ? "#81b6ad" : t.owner === 1 ? "#ce8878" : "#998c68";
          button.style.setProperty(
            "--site-color",
            t.owner === 0 ? "#9addd0" : t.owner === 1 ? "#eea18b" : "#e0d9bd",
          );
          button.textContent =
            site.name +
            (t.progress > 0
              ? ` · occupying ${Math.floor((t.progress / 30) * 100)}%`
              : "");
        }
      }
    },
    focus,
    focusUnit(id: number) {
      const u = current?.units.find((u) => u.id === id);
      if (u) focus(u, u.kind === "airship" ? 100 : 30);
    },
    overview() {
      if (plan.campaignMap) {
        let x0 = Infinity,
          z0 = Infinity,
          x1 = 0,
          z1 = 0;
        for (let i = 0; i < surface.land.length; i++)
          if (surface.land[i]) {
            const x = (i % surface.cols) * surface.step,
              z = Math.floor(i / surface.cols) * surface.step;
            x0 = Math.min(x0, x);
            x1 = Math.max(x1, x);
            z0 = Math.min(z0, z);
            z1 = Math.max(z1, z);
          }
        const distance =
          (Math.max(
            (x1 - x0) / (host.clientWidth / Math.max(1, host.clientHeight)),
            z1 - z0,
          ) /
            (2 * Math.tan(Math.PI / 8))) *
          1.18;
        controls.target.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
        camera.position
          .copy(controls.target)
          .add(new T.Vector3(0, distance, distance * 0.06));
        controls.update();
        return;
      }
      focus(
        { x: plan.width / 2, z: plan.depth / 2 },
        Math.max(plan.width, plan.depth) * 1.1,
      );
    },
    dispose() {
      cancelAnimationFrame(frame);
      resize.disconnect();
      host.removeEventListener("wheel", labelWheel, true);
      tacticalGestures.dispose();
      selectionControls.dispose();
      keyboardCamera.dispose();
      unitMarkers.dispose();
      clearOrderPreview();
      hint.remove();
      clearRangeLines();
      rangeHint.remove();
      rangeLines.removeFromParent();
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
      builtLabels.forEach((b) => b.remove());
      siteStreetGeometry.dispose();
      siteStreetMaterial.dispose();
      resident.forEach((a) => a.dispose());
      campaignSiteOverview?.removeFromParent();
      campaignSiteOverview?.dispose();
      distantSites.forEach((mesh) => {
        mesh.removeFromParent();
        mesh.dispose();
      });
      builtBags.forEach(disposeEmplacementModel);
      presentation.dispose();
      for (const model of vehicles.values()) model.dispose();
      for (const ghost of ghosts.values()) {
        ghost.root.removeFromParent();
        ghost.material.dispose();
      }
      rig.parts.forEach((p) => p.geometry.dispose());
      infantryKit.dispose();
      roads.dispose();
      landscape.dispose();
      farmland?.dispose();
      if (pathLine) {
        pathLine.geometry.dispose();
        (pathLine.material as T.Material).dispose();
      }
      scene.traverse((o) => {
        if (o instanceof T.InstancedMesh) o.dispose();
      });
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      for (const texture of new Set(Object.values(strategyMaps)))
        if (texture !== grain) texture.dispose();
      grain.dispose();
      kit.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

import { buildSteampunkAssets } from "./steampunkAssets";
import {
  URBAN_BUILDING,
  MILL_BUILDING,
  TOWER_BUILDING,
  WAREHOUSE_BUILDING,
} from "../../../../packages/game-core/src/cityBuildingKit";
import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
export interface KitPart {
  geometry: T.BufferGeometry;
  material: T.Material;
  snow: boolean;
}
export interface MiniatureKit {
  architecture: { walls: T.MeshStandardMaterial; roof: T.MeshStandardMaterial };
  variants: Map<string, KitPart[]>;
  distantVariants: Map<string, KitPart[]>;
  setDusk: (enabled: boolean) => void;
  dispose: () => void;
}
/** Shared art-scene models. Callers instance these parts; source geometry is owned here. */
export function createMiniatureKit(): MiniatureKit {
  const groundHeight = (_x: number, _z: number) => 0;
  let randomSeed = 93842;
  const rand = () => {
    randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0;
    return randomSeed / 4294967296;
  };
  const textures: T.Texture[] = [];
  function pattern(kind: "slate" | "brick" | "grain") {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle =
      kind === "slate" ? "#89939a" : kind === "brick" ? "#c7b4a1" : "#d8d8c9";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6000; i++) {
      const shade = 120 + rand() * 100;
      ctx.fillStyle = `rgba(${shade},${shade},${shade},.12)`;
      ctx.fillRect(rand() * 256, rand() * 256, 1 + rand() * 3, 1 + rand() * 3);
    }
    if (kind !== "grain") {
      const rows = kind === "slate" ? 16 : 24,
        cols = kind === "slate" ? 8 : 6;
      for (let y = 0; y < rows; y++)
        for (let x = -1; x < cols; x++) {
          ctx.strokeStyle = kind === "slate" ? "#53616b88" : "#80766c70";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(
            ((x + (y % 2) * 0.5) * 256) / cols,
            (y * 256) / rows,
            256 / cols,
            256 / rows,
          );
        }
    }
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.anisotropy = 4;
    textures.push(texture);
    return texture;
  }
  const grain = pattern("grain");
  grain.repeat.set(22, 22);
  const mat = (color: T.ColorRepresentation, map?: T.Texture) =>
    new T.MeshStandardMaterial({ color, roughness: 0.91, map: map ?? null });
  const stone = mat("#8e9080"),
    wood = mat("#776043"),
    trim = mat("#b5a27a"),
    roof = mat("#8e9aa7", pattern("slate")),
    walls = mat("#b1a082", pattern("brick")),
    glass = mat("#34464c"),
    brass = mat("#ae8950"),
    soil = mat("#65523b"),
    leaves = mat("#67783d", pattern("grain")),
    trunk = mat("#685342"),
    snowMat = mat("#e1e7e5");
  const batches = new Map<T.Material, T.BufferGeometry[]>();
  function add(
    geo: T.BufferGeometry,
    material: T.Material,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
    rotation = 0,
  ) {
    const matrix = new T.Matrix4().compose(
      new T.Vector3(x, y, z),
      new T.Quaternion().setFromEuler(new T.Euler(0, rotation, 0)),
      new T.Vector3(sx, sy, sz),
    );
    geo.applyMatrix4(matrix);
    const list = batches.get(material) ?? [];
    list.push(geo);
    batches.set(material, list);
  }
  const box = (
    m: T.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    a = 0,
  ) => add(new T.BoxGeometry(1, 1, 1), m, x, y, z, w, h, d, a);
  function cylinder(
    m: T.Material,
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
  ) {
    add(new T.CylinderGeometry(r, r, h, 10), m, x, y, z);
  }
  const snowPieces: T.BufferGeometry[] = [];
  function snowCap(
    geo: T.BufferGeometry,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) {
    geo.scale(sx, sy, sz);
    geo.translate(x, y, z);
    snowPieces.push(geo);
  }
  const townSites = [
    { x: 12, z: 18, w: 7, d: 6, h: 4.5, type: "hall" },
    { x: 25, z: 17, w: 6, d: 5, h: 3.2, type: "home" },
    { x: 10, z: 31, w: 10, d: 7, h: 3.6, type: "factory" },
    { x: 25, z: 31, w: 7, d: 6, h: 3.2, type: "shop" },
    { x: 38, z: 28, w: 6, d: 5, h: 3, type: "home" },
  ];
  function tree(x: number, z: number, size: number, pine = false) {
    const y = groundHeight(x, z);
    cylinder(trunk, x, y + size * 0.5, z, size * 0.085, size);
    if (pine) {
      for (let k = 0; k < 4; k++) {
        const h = size * (1.0 - k * 0.15),
          r = size * (0.43 - k * 0.075),
          cy = y + size * (0.55 + k * 0.23);
        add(new T.ConeGeometry(r, h, 9), leaves, x, cy, z);
        snowCap(
          new T.ConeGeometry(r * 0.89, h * 0.84, 9),
          x,
          cy + h * 0.12,
          z,
          1,
          1,
          1,
        );
      }
    } else {
      for (let k = 0; k < 9; k++) {
        const a = k * 2.399,
          rad = k === 0 ? 0 : size * 0.3,
          cx = x + Math.cos(a) * rad,
          cz = z + Math.sin(a) * rad,
          cy = y + size * (0.96 + (k % 3) * 0.13),
          r = size * (0.32 + rand() * 0.08);
        add(new T.IcosahedronGeometry(r, 2), leaves, cx, cy, cz, 1, 0.95, 1);
        snowCap(
          new T.SphereGeometry(r, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.43),
          cx,
          cy + 0.06,
          cz,
          1,
          1,
          1,
        );
      }
    }
  }
  function building(b: (typeof townSites)[number]) {
    const { x, z, w, d, h, type } = b,
      y = groundHeight(x, z);
    box(stone, x, y + 0.22, z, w + 0.45, 0.45, d + 0.45);
    box(walls, x, y + h / 2 + 0.4, z, w, h, d);
    const gable = (
      cx: number,
      cz: number,
      width: number,
      depth: number,
      baseY: number,
      rise: number,
    ) => {
      const shape = new T.Shape();
      shape.moveTo(-width / 2, 0);
      shape.lineTo(0, rise);
      shape.lineTo(width / 2, 0);
      shape.closePath();
      const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
      g.translate(0, 0, -depth / 2);
      add(g, roof, cx, baseY, cz);
      for (const side of [-1, 1]) {
        const snowG = new T.PlaneGeometry(
          Math.hypot(width / 2, rise),
          depth + 0.12,
        );
        snowG.rotateX(-Math.PI / 2);
        snowG.rotateZ(-side * Math.atan2(rise, width / 2));
        snowG.translate(cx + (side * width) / 4, baseY + rise / 2 + 0.08, cz);
        snowPieces.push(snowG);
      }
    };
    if (type === "factory")
      for (let i = 0; i < 3; i++)
        gable(
          x - w / 2 + w / 6 + (i * w) / 3,
          z,
          w / 3 + 0.12,
          d + 0.5,
          y + h + 0.4,
          1.1,
        );
    else
      gable(x, z, w + 0.7, d + 0.7, y + h + 0.4, type === "hall" ? 2.7 : 1.8);
    for (const side of [-1, 1]) {
      box(
        trim,
        x + side * (w / 2 - 0.13),
        y + h / 2 + 0.4,
        z,
        0.23,
        h,
        d + 0.03,
      );
      for (let j = 0; j < 3; j++) {
        const wx = x - w * 0.32 + j * w * 0.32;
        box(trim, wx, y + h * 0.6, z + side * (d / 2 + 0.04), 0.98, 1.4, 0.12);
        box(
          glass,
          wx,
          y + h * 0.6,
          z + side * (d / 2 + 0.12),
          0.72,
          1.13,
          0.05,
        );
        box(trim, wx, y + h * 0.6, z + side * (d / 2 + 0.16), 0.06, 1.1, 0.04);
      }
    }
    box(wood, x, y + 1.0, z + d / 2 + 0.14, 1.2, 1.9, 0.2);
    box(trim, x, y + 0.12, z + d / 2 + 0.65, 1.8, 0.22, 1.1);
    box(walls, x + w * 0.28, y + h + 1.7, z - d * 0.2, 0.66, 2.5, 0.72);
    box(stone, x + w * 0.28, y + h + 3, z - d * 0.2, 0.83, 0.18, 0.88);
    if (type === "hall") {
      box(walls, x - w * 0.28, y + h + 1.5, z + d * 0.1, 2.1, 3.2, 2.2);
      gable(x - w * 0.28, z + d * 0.1, 2.5, 2.6, y + h + 3.1, 1.7);
      add(
        new T.CylinderGeometry(0.46, 0.46, 0.1, 20),
        brass,
        x - w * 0.28,
        y + h + 2.3,
        z + d * 0.1 + 1.15,
        1,
        1,
        1,
        0,
      );
    }
    if (type === "shop") {
      for (let i = 0; i < 7; i++)
        box(
          i % 2 ? trim : mat("#9b5544"),
          x - w * 0.4 + i * w * 0.133,
          y + 2.3,
          z + d / 2 + 1,
          w * 0.133,
          0.15,
          1.8,
        );
      for (const side of [-1, 1])
        box(
          wood,
          x + side * w * 0.45,
          y + 1.1,
          z + d / 2 + 1.7,
          0.13,
          2.2,
          0.13,
        );
    }
  }

  const variants = new Map<string, KitPart[]>();
  const distantVariants = new Map<string, KitPart[]>();
  function capture(name: string, draw: () => void) {
    batches.clear();
    snowPieces.length = 0;
    draw();
    const parts: KitPart[] = [],
      distant: KitPart[] = [];
    for (const [material, geos] of batches) {
      const normalized = geos.map((g) => (g.index ? g.toNonIndexed() : g));
      const large = normalized.filter((g) => {
        g.computeBoundingBox();
        const size = g.boundingBox!.getSize(new T.Vector3());
        return (
          Math.min(size.x, size.y, size.z) > 0.35 ||
          (size.y > 0.12 && size.x * size.z > 8)
        );
      });
      if (large.length)
        distant.push({
          geometry: mergeGeometries(large)!,
          material,
          snow: false,
        });
      const geometry = mergeGeometries(normalized)!;
      parts.push({ geometry, material, snow: false });
      new Set([...geos, ...normalized]).forEach((g) => g.dispose());
    }
    if (snowPieces.length) {
      parts.push({
        geometry: mergeGeometries(snowPieces)!,
        material: snowMat,
        snow: true,
      });
      snowPieces.forEach((g) => g.dispose());
    }
    variants.set(name, parts);
    distant.push(...parts.filter((p) => p.snow));
    distantVariants.set(name, distant);
  }
  for (const b of townSites)
    if (!variants.has(b.type))
      capture(b.type, () => building({ ...b, x: 0, z: 0 }));
  capture("urbanBuild", () => {
    for (const y of [0.2, 3.2, 6.2]) {
      box(stone, 0, y, 0, 5, 0.25, 11);
      for (const x of [-2.2, 2.2])
        for (const z of [-5, 5]) box(wood, x, y + 1.4, z, 0.22, 2.8, 0.22);
    }
    for (const x of [-2.55, 2.55])
      for (const z of [-4.5, 0, 4.5]) box(brass, x, 4.3, z, 0.13, 8.6, 0.13);
    for (const y of [2.6, 5.6, 8.6])
      for (const x of [-2.55, 2.55]) box(wood, x, y, 0, 0.7, 0.13, 10.8);
    box(walls, 0, 1.3, -5.35, 5, 2.5, 0.3);
    box(wood, 0, 6.55, 0, 2, 0.45, 3);
  });
  const ironwork = mat("#424b49");
  const litWindows = mat("#bd9966");
  litWindows.emissive.set("#da8c35");
  litWindows.emissiveIntensity = 0.35;
  const windowDusk = { value: 0 };
  // One material/draw batch, with a stable room pattern unique to each instance.
  litWindows.onBeforeCompile = (shader) => {
    shader.uniforms.windowDusk = windowDusk;
    shader.vertexShader =
      "attribute float windowSeed;\nvarying float vWindowLevel;\n" +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      vec2 buildingSeed = vec2(0.0);
      #ifdef USE_INSTANCING
        buildingSeed = instanceMatrix[3].xz;
      #endif
      float room = fract(sin(dot(buildingSeed, vec2(12.9898,78.233)) + windowSeed * 37.719) * 43758.5453);
      vWindowLevel = room < 0.38 ? 0.0 : (room < 0.7 ? 0.18 : (room < 0.9 ? 0.55 : 1.0));
    `,
    );
    shader.fragmentShader =
      "uniform float windowDusk;\nvarying float vWindowLevel;\n" +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <color_fragment>",
        `
      #include <color_fragment>
      vec3 eveningGlass = mix(vec3(0.035, 0.055, 0.06), diffuseColor.rgb, vWindowLevel);
      diffuseColor.rgb = mix(vec3(0.06, 0.09, 0.10), eveningGlass, windowDusk);
    `,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `
      #include <emissivemap_fragment>
      totalEmissiveRadiance *= vWindowLevel * windowDusk;
    `,
      );
  };
  litWindows.customProgramCacheKey = () => "seeded-room-lighting-v2";
  function windowPane(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) {
    const geometry = new T.BoxGeometry(1, 1, 1);
    const seed = x * 3.17 + y * 7.13 + z * 11.71;
    geometry.setAttribute(
      "windowSeed",
      new T.Float32BufferAttribute(
        new Float32Array(geometry.getAttribute("position").count).fill(seed),
        1,
      ),
    );
    add(geometry, litWindows, x, y, z, w, h, d);
  }

  // Dense street-wall kit: narrow footprints, deep parcels and three readable floors.
  for (const name of [
    "urbanHome",
    "urbanRed",
    "urbanShop",
    "urbanCorner",
    "urbanCornerLeft",
    "urbanTenement",
  ])
    capture(name, () => {
      const facade =
        name === "urbanRed"
          ? mat("#94674e", walls.map!)
          : name === "urbanTenement"
            ? mat("#78766a", walls.map!)
            : name.startsWith("urbanCorner")
              ? mat("#b6a183", walls.map!)
              : walls;
      const { width: w, depth: d } = URBAN_BUILDING;
      // Foundation ends where the wall begins; its ledge stays outside the facade.
      box(stone, 0, 0.2, 0, w + 0.12, 0.4, d + 0.12);
      box(facade, 0, 4.7, 0, w, 8.6, d);
      // A projecting roof slab avoids coplanar side faces with the parapet trim.
      box(roof, 0, 9.125, 0, 5.2, 0.25, 11.2);
      for (const z of [-5.45, 5.45]) box(trim, 0, 9.35, z, 5.1, 0.5, 0.2);
      for (const y of [1.8, 4.5, 7.2])
        for (const z of [-5.55, 5.55])
          for (const x of [-1.35, 1.35]) {
            box(trim, x, y, z, 1.35, 1.8, 0.12);
            windowPane(x, y, z + Math.sign(z) * 0.08, 1.06, 1.5, 0.08);
            box(trim, x, y, z + Math.sign(z) * 0.15, 0.07, 1.42, 0.04);
          }
      for (const y of [3.1, 5.8, 8.6]) box(trim, 0, y, 5.56, 5, 0.13, 0.15);
      box(wood, 0, 1, 5.6, 0.85, 1.8, 0.15);
      box(stone, 0, 0.12, 5.8, 1.2, 0.24, 0.5);
      box(facade, 1.6, 9.6, -3, 0.65, 1, 0.65);
      box(brass, -2.3, 4.5, -5.58, 0.12, 8.4, 0.12);
      box(roof, -1.2, 9.45, -2, 1.4, 0.35, 2.3);
      if (name === "urbanRed") {
        // The tank clears the pitched roof; its lid has a distinct top surface.
        for (const x of [-0.65, 0.65])
          for (const z of [0.85, 2.15])
            box(ironwork, x, 11.2, z, 0.12, 1.1, 0.12);
        box(ironwork, 0, 11.78, 1.5, 1.85, 0.16, 1.85);
        cylinder(wood, 0, 12.61, 1.5, 0.8, 1.5);
        box(brass, 0, 13.44, 1.5, 1.7, 0.12, 1.7);
      }
      if (name === "urbanShop" || name.startsWith("urbanCorner")) {
        box(wood, 0, 2.8, 5.65, 4.7, 0.6, 0.2);
        box(brass, 0, 2.8, 5.78, 3.8, 0.18, 0.05);
        box(trim, 0, 2.2, 5.85, 4.8, 0.12, 0.65);
      }
      // Handed corner shops glaze only the exposed end; the adjoining party wall stays blank.
      if (name.startsWith("urbanCorner")) {
        for (const side of [name === "urbanCornerLeft" ? -1 : 1]) {
          for (const z of [-3.8, -1.3, 1.3, 3.8])
            for (const y of [1.8, 4.5, 7.2]) {
              box(trim, side * 2.53, y, z, 0.12, 1.8, 1.45);
              windowPane(side * 2.61, y, z, 0.06, 1.5, 1.15);
            }
          for (const y of [3.1, 5.8, 8.6])
            box(trim, side * 2.59, y, 0, 0.18, 0.14, 11);
        }
        box(trim, 0, 9.72, 4.8, 3.4, 0.28, 0.6);
        box(brass, 0, 10.05, 4.8, 2.2, 0.35, 0.22);
      }
      if (name === "urbanTenement") {
        // Shallow rear balconies and vertical service pipe stay within the parcel allowance.
        for (const y of [3.7, 6.4]) {
          box(ironwork, -0.2, y, -5.63, 3.8, 0.13, 0.35);
          box(ironwork, -0.2, y + 0.65, -5.77, 3.8, 0.08, 0.08);
          for (const x of [-1.9, -0.8, 0.4, 1.5])
            box(ironwork, x, y + 0.34, -5.77, 0.06, 0.65, 0.06);
        }
        box(wood, 0, 1, -5.61, 0.9, 1.8, 0.15);
        for (const x of [-1.65, 1.65])
          box(facade, x, 9.85, -3, 0.65, 1.6, 0.75);
        box(trim, 0, 9.65, 5.35, 5.15, 0.28, 0.32);
      }
      if (name === "urbanRed") {
        add(
          new T.ConeGeometry(1, 2.5, 4).rotateY(Math.PI / 4),
          roof,
          0,
          10.3,
          0,
          5.3 / Math.SQRT2,
          1,
          11.3 / Math.SQRT2,
        );
        snowCap(
          new T.ConeGeometry(1, 2.5, 4).rotateY(Math.PI / 4),
          0,
          10.36,
          0,
          5.35 / Math.SQRT2,
          1,
          11.35 / Math.SQRT2,
        );
      } else snowCap(new T.BoxGeometry(5.22, 0.1, 11.22), 0, 9.32, 0, 1, 1, 1);
    });
  capture("warehouse", () => {
    const { width: w, depth: d } = WAREHOUSE_BUILDING;
    const brick = mat("#876a53", walls.map!);
    box(stone, 0, 0.22, 0, w + 0.3, 0.44, d + 0.3);
    box(brick, 0, 2.95, 0, w, 5.46, d);
    box(roof, 0, 5.82, 0, w + 0.3, 0.28, d + 0.3);
    for (const x of [-4.7, 0, 4.7]) box(trim, x, 2.95, 3.56, 0.28, 5.4, 0.17);
    for (const side of [-1, 1]) {
      for (const x of [-3.2, 0, 3.2]) {
        box(trim, x, 4.5, side * 3.56, 1.7, 1.4, 0.12);
        box(glass, x, 4.5, side * 3.65, 1.42, 1.15, 0.05);
        box(wood, x, 1.35, side * 3.58, 2.3, 2.6, 0.16);
        for (const dx of [-0.8, 0, 0.8])
          box(ironwork, x + dx, 1.35, side * 3.68, 0.06, 2.5, 0.04);
      }
      box(trim, 0, 3.1, side * 3.57, 10, 0.18, 0.15);
    }
    box(brick, 0, 6.1, 0, 2.5, 0.4, 4);
    box(roof, 0, 6.38, 0, 2.7, 0.16, 4.2);
    snowCap(new T.BoxGeometry(w + 0.32, 0.1, d + 0.32), 0, 6.02, 0, 1, 1, 1);
    snowCap(new T.BoxGeometry(2.72, 0.1, 4.22), 0, 6.52, 0, 1, 1, 1);
  });

  const copper = mat("#668f81"),
    millBrick = mat("#86634e", walls.map!);
  capture("mill", () => {
    const { width: w, depth: d } = MILL_BUILDING;
    box(stone, 0, 0.22, 0, w + 0.25, 0.44, d + 0.25);
    box(millBrick, 0, 3.7, 0, w, 6.95, d);
    for (const x of [-6, -2, 2, 6]) {
      box(roof, x, 7.35, 0, 3.8, 0.32, d + 0.25);
      box(glass, x, 7.7, 0, 2.7, 0.5, 6.8);
      box(ironwork, x, 8, 0, 3, 0.12, 7);
    }
    for (const side of [-1, 1]) {
      for (const x of [-7, -3.5, 0, 3.5, 7]) {
        box(trim, x, 3.65, side * 4.06, 0.28, 6.7, 0.12);
        for (const y of [2.2, 5.2])
          windowPane(x + 1, y, side * 4.15, 1.5, 2, 0.1);
      }
      box(trim, 0, 4, side * 4.09, 18, 0.18, 0.18);
      box(wood, -4, 1.4, side * 4.12, 2.7, 2.7, 0.15);
    }
    // Tall masonry stack, banded flue and restrained external machinery.
    cylinder(millBrick, 7.5, 7, -2, 0.7, 14);
    for (const y of [5, 9, 13.7]) cylinder(ironwork, 7.5, y, -2, 0.8, 0.22);
    cylinder(copper, -7, 4.7, 2, 1.1, 3.4);
    box(brass, -5.5, 5.8, 2, 3, 0.2, 0.2);
    snowCap(new T.BoxGeometry(w + 0.27, 0.1, d + 0.27), 0, 7.58, 0, 1, 1, 1);
  });
  capture("boilerHouse", () => {
    box(stone, 0, 0.2, 0, 8.25, 0.4, 8.25);
    box(millBrick, -1.4, 1.9, 0, 4.8, 3.4, 7.7);
    box(roof, -1.4, 3.8, 0, 5, 0.3, 8.1);
    box(wood, -1.4, 1.4, 3.95, 2, 2.5, 0.15);
    cylinder(copper, 2.1, 2.7, -1, 1.35, 5.2);
    add(
      new T.SphereGeometry(1.35, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      copper,
      2.1,
      5.3,
      -1,
    );
    cylinder(ironwork, 2.1, 6.8, -1, 0.35, 3);
    box(brass, 0.5, 3, 1, 3.2, 0.2, 0.2);
    // Open coal bunker is part of this service building's footprint.
    box(wood, 2.1, 0.7, 2.5, 2.5, 1.3, 2.2);
    box(ironwork, 2.1, 1.39, 2.5, 2.2, 0.1, 1.9);
    snowCap(new T.BoxGeometry(5.05, 0.1, 8.15), -1.4, 4.01, 0, 1, 1, 1);
  });
  capture("commercialTower", () => {
    const { width: w, depth: d, floors, floorHeight } = TOWER_BUILDING;
    const h = floors * floorHeight;
    box(stone, 0, 0.3, 0, w + 0.25, 0.6, d + 0.25);
    box(walls, 0, h / 2 + 0.6, 0, w, h, d);
    for (const side of [-1, 1]) {
      for (const x of [-4.1, 0, 4.1])
        box(trim, x, h / 2 + 0.6, side * 5.56, 0.32, h, 0.15);
      for (let floor = 0; floor < floors; floor++) {
        const y = 1.9 + floor * floorHeight;
        for (const x of [-2.7, -0.9, 0.9, 2.7])
          windowPane(x, y, side * 5.67, 1.2, 1.8, 0.08);
        box(trim, 0, y + 1.15, side * 5.58, w, 0.12, 0.14);
      }
      for (let floor = 0; floor < floors; floor++)
        for (const z of [-3.6, -1.2, 1.2, 3.6])
          windowPane(side * 4.6, 1.9 + floor * floorHeight, z, 0.08, 1.8, 1.45);
    }
    box(wood, 0, 1.5, 5.7, 1.8, 2.8, 0.18);
    box(roof, 0, h + 0.85, 0, 9.3, 0.4, 11.3);
    // Setback crown and oxidized copper dome distinguish the skyline from houses.
    box(walls, 0, h + 2.3, 0, 6.2, 2.5, 7.4);
    cylinder(trim, 0, h + 3.65, 0, 3.4, 0.35);
    add(
      new T.SphereGeometry(3.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      copper,
      0,
      h + 3.8,
      0,
      1,
      1.1,
      1,
    );
    cylinder(brass, 0, h + 8, 0, 0.12, 2);
    for (const side of [-1, 1]) {
      box(brass, side * 4.2, h / 2, -5.6, 0.16, h, 0.16);
      add(new T.ConeGeometry(0.55, 2.1, 6), roof, side * 3.9, h + 2, -4.8);
    }
    snowCap(new T.BoxGeometry(9.35, 0.1, 11.35), 0, h + 1.1, 0, 1, 1, 1);
    snowCap(
      new T.SphereGeometry(3.23, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.43),
      0,
      h + 3.95,
      0,
      1,
      1.1,
      1,
    );
  });
  // Purpose-built shallow courtyard wings retain full-height street facades.
  // Only depth changes; frontage windows, doors and floor heights retain their scale.
  for (const map of [variants, distantVariants])
    map.set(
      "urbanCourt",
      map.get("urbanHome")!.map((p) => ({
        ...p,
        geometry: p.geometry.clone().scale(1, 1, 7 / 11),
      })),
    );
  capture("workshopRow", () => {
    box(stone, 0, 0.18, 0, 5.2, 0.36, 7.2);
    box(millBrick, 0, 2.9, 0, 5, 5.5, 7);
    box(roof, 0, 5.8, 0, 5.25, 0.3, 7.25);
    for (const side of [-1, 1]) {
      box(trim, 0, 3, side * 3.55, 5, 0.16, 0.12);
      for (const x of [-1.35, 1.35])
        windowPane(x, 4.4, side * 3.58, 1.25, 1.5, 0.08);
    }
    box(wood, 0, 1.4, 3.58, 1.8, 2.5, 0.12);
    box(ironwork, 0, 2.75, 3.65, 2.1, 0.12, 0.12);
    box(roof, 0, 6.1, -0.5, 2, 0.3, 3);
    box(brass, 2.1, 2.8, -3.58, 0.16, 5.2, 0.16);
    snowCap(new T.BoxGeometry(5.3, 0.1, 7.3), 0, 6, 0, 1, 1, 1);
  });
  buildSteampunkAssets({
    capture,
    box,
    add,
    windowPane,
    stone,
    walls,
    roof,
    trim,
    wood,
    copper,
    brass,
    iron: ironwork,
    brick: millBrick,
    glass,
  });
  capture("tree", () => tree(0, 0, 4, false));
  capture("pine", () => tree(0, 0, 4, true));
  return {
    variants,
    distantVariants,
    architecture: { walls, roof },
    setDusk(enabled) {
      windowDusk.value = enabled ? 1 : 0;
    },
    dispose() {
      const materials = new Set<T.Material>();
      const geometries = new Set<T.BufferGeometry>();
      for (const parts of [...variants.values(), ...distantVariants.values()])
        for (const p of parts) {
          geometries.add(p.geometry);
          materials.add(p.material);
        }
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

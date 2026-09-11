import * as T from "three";

/** Shared world-space grain: the same scale on terrain, parks and planting beds. */
export function refinedGrain() {
  const data = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const n =
        220 +
        Math.sin(x * 17.3 + y * 31.7) * 14 +
        (Math.sin(x * 0.0468 + Math.sin(y * 0.0324)) * Math.cos(y * 0.0384) +
          0.35 * Math.sin(x * 0.1476 + y * 0.0756) +
          0.12 * Math.sin(x * 0.444 - y * 0.516)) *
          9;
      data.set([n, n, n, 255], (y * 128 + x) * 4);
    }
  const texture = new T.DataTexture(data, 128, 128);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.colorSpace = T.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.magFilter = T.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function refineSurface(
  material: T.MeshStandardMaterial,
  texture: T.Texture,
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.refinedGrain = { value: texture };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 refinedUV;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nrefinedUV=position.xz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 refinedUV;uniform sampler2D refinedGrain;",
      )
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nfloat mottling=.96+.04*sin(refinedUV.x*.39+sin(refinedUV.y*.27))*cos(refinedUV.y*.32); diffuseColor.rgb*=texture2D(refinedGrain,refinedUV*.14).rgb*mottling;",
      );
  };
  material.customProgramCacheKey = () => "refined-city-surface-v1";
}

/** Appearance alternatives stay within the original planner's footprint envelope. */
export function cityAppearance(
  variant: string,
  x: number,
  z: number,
  seed: number,
) {
  let h =
    (Math.imul(Math.round(x * 100), 73856093) ^
      Math.imul(Math.round(z * 100), 19349663) ^
      seed) >>>
    0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = (h ^ (h >>> 16)) >>> 0;
  const options = variant.startsWith("commercialTower")
    ? [
        variant,
        "commercialTowerGothic",
        "commercialTowerObservatory",
        "commercialTowerExchange",
      ]
    : variant.startsWith("urban") &&
        variant !== "urbanCourt" &&
        variant !== "urbanBuild"
      ? [variant, "urbanBayTerrace", "urbanDutchGable", "urbanGlassArcade"]
      : variant.startsWith("warehouse")
        ? [variant, "warehouseSawtooth"]
        : [variant];
  return options[h % options.length];
}

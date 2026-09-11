import { portArtFootprint } from "./portPlacement";
import { Container, Graphics, Sprite, Texture } from "pixi.js";
import type {
  CityArchetype,
  CityLayout,
} from "../../../packages/game-core/src/cityLayout";
import type { RegionFeature } from "../../../packages/game-core/src/index";
import { portOrientation } from "../../../packages/game-core/src/portOrientation";

/** World-space settlement art with a readable cartographic badge above it. */
export function settlementGraphics(
  archetype: CityArchetype,
  feature: RegionFeature,
  scale: number,
  isCapital = false,
  ownerColor?: string | null,
  artTexture?: Texture,
  artRadius = 0,
  layout?: CityLayout,
  portTextures: Texture[] = [],
  visualPortOrientation?: ReturnType<typeof portOrientation>,
) {
  const graphics = new Container();
  const rank = Math.max(
    0,
    ["hamlet", "village", "town", "city", "metropolis"].indexOf(
      feature.size ?? "hamlet",
    ),
  );
  let artWidth = 0,
    artHeight = 0;
  const directionalPort =
    archetype === "port" && layout?.docks.length && portTextures.length >= 8;
  if (artTexture && artRadius > 0 && !directionalPort) {
    const art = new Sprite(artTexture);
    art.anchor.set(0.5);
    art.alpha = 0.96;
    const footprint = artRadius * 1.72;
    art.scale.set(footprint / Math.max(artTexture.width, artTexture.height));
    artWidth = art.width;
    artHeight = art.height;
    graphics.addChild(art);
  }
  if (directionalPort && layout) {
    const orientation = visualPortOrientation ?? portOrientation(layout),
      harbor = new Sprite(portTextures[orientation.frame]);
    harbor.label = `port-art-${orientation.index}`;
    harbor.anchor.set(0.5);
    harbor.alpha = 0.98;
    harbor.rotation = orientation.correction;
    // This atlas depicts two harbor buildings, not an entire city district.
    const footprint = portArtFootprint(artRadius);
    harbor.scale.set(
      footprint / Math.max(harbor.texture.width, harbor.texture.height),
    );
    artWidth = harbor.width;
    artHeight = harbor.height;
    graphics.addChild(harbor);
  }
  const u = 1; // Every settlement gets the same readable type symbol.
  const icon = new Graphics();
  graphics.addChild(icon);
  icon.scale.set(u / scale);
  const ink = "#e4d8b8",
    dark = ownerColor ?? "#4b514d";
  icon
    .roundRect(-12, -13, 24, 33, 3)
    .fill({ color: dark, alpha: 0.96 })
    .stroke({ color: ink, width: 1.25, alpha: 1 });
  const stroke = {
    color: ink,
    width: 1.5,
    cap: "round" as const,
    join: "round" as const,
  };
  if (archetype === "port") {
    icon.circle(0, -4, 1.8).stroke(stroke);
    icon
      .moveTo(0, -2)
      .lineTo(0, 6)
      .moveTo(-4, -0.5)
      .lineTo(4, -0.5)
      .moveTo(-6, 2)
      .quadraticCurveTo(-5, 6, 0, 6)
      .quadraticCurveTo(5, 6, 6, 2)
      .stroke(stroke);
  } else if (archetype === "industrial") {
    icon.poly([-6, 6, -6, -1, -2, -4, -2, -1, 2, -4, 2, 6]).stroke(stroke);
    icon.rect(3, -6, 3, 12).stroke(stroke);
  } else if (archetype === "fortified") {
    icon
      .poly([
        -6, -6, -3, -6, -3, -3, 0, -3, 0, -6, 3, -6, 3, -3, 6, -3, 6, 6, -6, 6,
      ])
      .stroke(stroke);
    icon.rect(-1.5, 2, 3, 4).fill(ink);
  } else {
    icon
      .moveTo(-6, 0)
      .lineTo(0, -5)
      .lineTo(6, 0)
      .moveTo(-4, -1)
      .lineTo(-4, 6)
      .lineTo(4, 6)
      .lineTo(4, -1)
      .stroke(stroke);
    icon.rect(-1, 2, 2, 4).fill(ink);
    if (rank >= 3)
      icon.moveTo(-7, 1).lineTo(-7, 6).moveTo(7, 1).lineTo(7, 6).stroke(stroke);
  }
  // Five visible slots separate size information from the settlement type.
  for (let i = 0; i < 5; i++)
    icon
      .roundRect(-9.5 + i * 4, 12, 3, 4, 0.6)
      .fill({ color: i <= rank ? ink : "#526660", alpha: 1 });
  if (isCapital) {
    const star: number[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5,
        r = i % 2 ? 1.8 : 4;
      star.push(Math.cos(angle) * r, -19 + Math.sin(angle) * r);
    }
    icon.poly(star).fill(ink).stroke({ color: dark, width: 1 });
  }
  return {
    graphics,
    screenScaled: icon,
    width: Math.max((26 * u) / scale, artWidth),
    height: Math.max(((isCapital ? 48 : 42) * u) / scale, artHeight),
  };
}

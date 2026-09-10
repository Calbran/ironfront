import { landscapeClearance } from "../../../packages/game-core/src/landscapeClearance";
import { visualScale } from "../../../packages/game-core/src/visualScale";
import { oceanSurface } from "./oceanSurface";
import { terrainAccentLayer } from "./terrainAccentLayer";
import { biomeSceneryLayer } from "./biomeSceneryLayer";
import { generateCityLayout } from "../../../packages/game-core/src/cityLayout";
import type { MapDetails } from "./mapDetails.worker";
import { settlementOwner } from "../../../packages/game-core/src/settlementCapture";
import { settlementGraphics } from "./settlementGraphics";
import {
  DETAIL_ZOOM,
  POLITICAL_OVERLAY_END_ZOOM,
  politicalColor,
  politicalOverlayAlpha,
} from "./mapStyle";
import { REGION_CURSOR, UNIT_CURSOR } from "./mapCursor";
import { squadLayer } from "./squadLayer";
import { useEffect, useRef, useState } from "react";
import {
  Application,
  Sprite,
  Assets,
  Texture,
  Container,
  Graphics,
  Rectangle,
  Text,
} from "pixi.js";
import { prepareTerrainTextures, terrainGraphics } from "./terrainTexture";
import { mapGeometry } from "./mapGeometry";
import { signedArea } from "../../../packages/game-core/src/geography";
import {
  coverage,
  formationName,
  type World,
} from "../../../packages/game-core/src/index";

const SETTLEMENT_SIZES = [
  "hamlet",
  "village",
  "town",
  "city",
  "metropolis",
] as const;
type SettlementSize = (typeof SETTLEMENT_SIZES)[number];

export function MapView({
  world,
  selected,
  onSelect,
  initialZoom = 1,
  onSelectSettlement,
  selectedSettlement = null,
  resyncKey = 0,
  preview = false,
  focus,
  selectedArmy,
  onSelectArmy,
  onOrder,
  selectedSquads = [],
  placingSquads = false,
  onSelectSquad,
  onAttackTarget,
  onLocalPoint,
  onCaptureSettlement,
  selectedArmies = [],
  onSelectArmies,
  onDeselect,
}: {
  world: World;
  selected: number | null;
  onSelect: (id: number) => void;
  initialZoom?: number;
  onSelectSettlement?: (region: number, feature: string) => void;
  selectedSettlement?: string | null;
  resyncKey?: number;
  preview?: boolean;
  focus?: { region: number; revision: number } | null;
  selectedArmy?: number | null;
  onSelectArmy?: (id: number) => void;
  onOrder?: (region: number, cover?: string) => void;
  selectedSquads?: string[];
  placingSquads?: boolean;
  onSelectSquad?: (id: string, additive: boolean) => void;
  onAttackTarget?: (id: string) => void;
  onLocalPoint?: (x: number, y: number, append: boolean) => void;
  onCaptureSettlement?: (region: number, feature: string) => void;
  onDeselect?: () => void;
  selectedArmies?: number[];
  onSelectArmies?: (ids: number[], additive: boolean) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef({
      world,
      resyncKey,
      onSelectSettlement,
      selectedSettlement,
      selected,
      onSelect,
      selectedArmy,
      onSelectArmy,
      onOrder,
      selectedArmies,
      onSelectArmies,
      onDeselect,
      selectedSquads,
      placingSquads,
      onSelectSquad,
      onAttackTarget,
      onLocalPoint,
      onCaptureSettlement,
    });
  latest.current = {
    world,
    resyncKey,
    onSelectSettlement,
    selectedSettlement,
    selected,
    onSelect,
    selectedArmy,
    onSelectArmy,
    onOrder,
    selectedArmies,
    onSelectArmies,
    onDeselect,
    selectedSquads,
    placingSquads,
    onSelectSquad,
    onAttackTarget,
    onLocalPoint,
    onCaptureSettlement,
  };
  const drawRef = useRef<() => void>(() => {});
  const [zoom, setZoom] = useState(initialZoom);
  const zoomRef = useRef(initialZoom);
  const [strategyView, setStrategyView] = useState(false);
  const strategyRef = useRef(false);
  const cameraRef = useRef<(next: number, reset?: boolean) => void>(() => {});
  const focusRef = useRef<(region: number) => void>(() => {});
  const [orderMenu, setOrderMenu] = useState<{
    region: number;
    feature: string;
    name: string;
    action: "cover" | "capture";
    x: number;
    y: number;
  } | null>(null);
  const [pointerOnMap, setPointerOnMap] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false,
      ready = false;
    const app = new Application();
    const scene = new Container();
    const ocean = new Graphics();
    let oceanTexture: Texture | undefined;
    let oceanSprite: Sprite | undefined;
    const drawOcean = () => {
      if (!host.current) return;
      ocean
        .clear()
        .rect(0, 0, host.current.clientWidth, host.current.clientHeight)
        .fill("#18363e");
      if (oceanSprite) {
        const span = Math.max(maxX - minX, maxY - minY) * 2;
        oceanSprite.position.set(
          scene.x + ((minX + maxX) / 2 - span / 2) * scene.scale.x,
          scene.y + ((minY + maxY) / 2 - span / 2) * scene.scale.y,
        );
        oceanSprite.width = span * scene.scale.x;
        oceanSprite.height = span * scene.scale.y;
      }
    };
    const marquee = new Graphics();
    marquee.eventMode = "none";
    let selecting = false,
      additive = false;
    let observer: ResizeObserver | undefined;
    let stopSquads: (() => void) | undefined;
    let hoveredTarget: string | null = null;
    let liveSquadPositions = new Map<string, { x: number; y: number }>();
    let suppressTap = false;
    let moved = false,
      pointerId: number | null = null;
    let detailTimer: ReturnType<typeof setTimeout> | undefined;
    let origin = { x: 0, y: 0 };
    let dragging = false,
      last = { x: 0, y: 0 },
      offset = { x: 0, y: 0 };
    // Geography is immutable for a campaign; camera input must not rescan it.
    const points = world.regions.flatMap((r) => r.polygon);
    const minX = Math.min(...points.map((p) => p[0])),
      maxX = Math.max(...points.map((p) => p[0]));
    const minY = Math.min(...points.map((p) => p[1])),
      maxY = Math.max(...points.map((p) => p[1]));
    const cityLayouts = new Map(
      world.regions.flatMap((r) =>
        (r.features ?? [])
          .filter((f) => f.kind === "settlement")
          .map((f) => [f.id, generateCityLayout(world, r, f)] as const),
      ),
    );
    const detailCities = world.regions.flatMap((r) =>
      (r.features ?? [])
        .filter((f) => f.kind === "settlement")
        .map((f) => ({
          x: f.x,
          y: f.y,
          region: r.id,
          layout: cityLayouts.get(f.id)!,
        })),
    );
    const mapDetailsWorker = new Worker(
      new URL("./mapDetails.worker.ts", import.meta.url),
      { type: "module" },
    );
    const mapDetails = new Promise<MapDetails>((resolve, reject) => {
      mapDetailsWorker.onmessage = (event: MessageEvent<MapDetails>) =>
        resolve(event.data);
      mapDetailsWorker.onerror = () =>
        reject(new Error("Map detail generation failed."));
    });
    mapDetailsWorker.postMessage({ world, cities: detailCities });
    const geometry = mapGeometry(world);
    const ringsByRegion = geometry.rings;
    let scenery: ReturnType<typeof biomeSceneryLayer> | undefined;
    let accents: ReturnType<typeof terrainAccentLayer> | undefined;
    const screenLabels = new Map<Container, number>();
    const position = () => {
      if (!host.current || !ready) return;
      const scale =
        Math.min(
          (host.current.clientWidth - 48) / (maxX - minX),
          (host.current.clientHeight - (preview ? 80 : 140)) / (maxY - minY),
        ) * zoomRef.current;

      const strategy = !preview && strategyRef.current;
      if (scenery) scenery.layer.visible = !strategy;
      if (accents) accents.layer.visible = !strategy;
      scene.scale.set(scale);
      terrain.setDetailZoom(zoomRef.current);
      for (const [label, fit] of screenLabels) {
        if (label.destroyed) screenLabels.delete(label);
        else label.scale.set(fit / scale);
      }
      scene.position.set(
        host.current.clientWidth / 2 - ((minX + maxX) / 2) * scale + offset.x,
        host.current.clientHeight / 2 - ((minY + maxY) / 2) * scale + offset.y,
      );
      drawOcean();
      scenery?.update(
        -scene.x / scale,
        -scene.y / scale,
        (host.current.clientWidth - scene.x) / scale,
        (host.current.clientHeight - scene.y) / scale,
      );
      accents?.update(
        -scene.x / scale,
        -scene.y / scale,
        (host.current.clientWidth - scene.x) / scale,
        (host.current.clientHeight - scene.y) / scale,
        zoomRef.current,
      );
      host.current.dataset.cameraX = String(scene.x);
      host.current.dataset.cameraY = String(scene.y);
      host.current.dataset.cameraScale = String(scene.scale.x);
    };
    let terrain = terrainGraphics(world, geometry);
    const edges = geometry.edges;
    scene.addChild(terrain);
    const overlay = new Container();
    scene.addChild(overlay);
    const render = () => {
      if (!ready || disposed) return;
      const renderStarted = performance.now();
      screenLabels.clear();
      overlay.removeChildren().forEach((c) => c.destroy({ children: true }));
      const {
        world: w,
        selected: s,
        selectedArmy: chosenArmy,
      } = latest.current;
      position();
      const scale = scene.scale.x,
        detail = zoomRef.current >= DETAIL_ZOOM,
        regional = zoomRef.current >= 1.45;
      const strategy = !preview && strategyRef.current;
      const ownershipAlpha = preview
        ? 0.24
        : politicalOverlayAlpha(zoomRef.current);
      terrain.visible = !strategy;
      const visible = new Set(w.vision?.visible ?? w.regions.map((r) => r.id));
      const viewer = w.vision?.owner;
      const activeArmy = w.armies.find((a) => a.id === chosenArmy);
      const activeSector = activeArmy ? coverage(w, activeArmy) : [];
      const lines = new Graphics(),
        provinces = new Graphics(),
        fronts = new Graphics();
      const text = (
        value: string,
        x: number,
        y: number,
        size: number,
        color: string,
        family = "Arial",
      ) => {
        const t = new Text({
          text: value,
          style: {
            fontFamily: family,
            fontSize: Math.max(14, size),
            fill: "#f2ecd7",
            stroke: { color: "#263532", width: 1.2 },
            fontWeight: family === "Arial" ? "600" : "400",
            letterSpacing: family === "Georgia" ? 0.8 : 0,
          },
        });
        t.resolution = Math.max(2, Math.min(3, devicePixelRatio));
        t.scale.set(1 / scale);
        t.roundPixels = true;
        screenLabels.set(t, 1);
        t.anchor.set(0.5);
        t.position.set(x, y);
        t.eventMode = "none";
        overlay.addChild(t);
        return t;
      };
      for (const r of w.regions) {
        const rings = ringsByRegion[r.id],
          shape = new Graphics();
        for (const ring of rings) {
          shape.poly(ring.flat());
          if (signedArea(ring) > 0)
            shape.fill({
              color:
                r.terrain === "mountains"
                  ? strategy
                    ? "#727d7e"
                    : "#d8daca"
                  : r.owner === null
                    ? "#a3b295"
                    : strategy
                      ? politicalColor(w.nations[r.owner].color)
                      : w.nations[r.owner].color,
              alpha: strategy
                ? 1
                : r.terrain === "mountains"
                  ? 0.1
                  : r.owner === null
                    ? 0.001
                    : ownershipAlpha,
            });
          else shape.cut();
        }
        shape.eventMode = "static";
        shape.cursor = REGION_CURSOR;
        shape.on("pointertap", (event) => {
          if (event.button !== 0) return;
          if (suppressTap || latest.current.placingSquads) return;
          if (!moved) latest.current.onSelect(r.id);
        });
        const hoverOutline = new Graphics();
        for (const ring of rings)
          hoverOutline
            .poly(ring.flat())
            .stroke({ color: "#fff3cb", width: 2.5 / scale, alpha: 0.9 });
        hoverOutline.visible = false;
        hoverOutline.eventMode = "none";
        shape.on("pointerover", () => {
          if (dragging) return;
          hoverOutline.visible = true;
          setHovered(`Territory · ${r.name} · Click to inspect`);
        });
        shape.on("pointerout", () => {
          hoverOutline.visible = false;
          setHovered(null);
        });
        overlay.addChild(shape, hoverOutline);
        if (!visible.has(r.id)) {
          const fog = new Graphics();
          for (const ring of rings) {
            fog.poly(ring.flat());
            if (signedArea(ring) > 0)
              fog.fill({ color: "#112b36", alpha: strategy ? 0.18 : 0.52 });
            else fog.cut();
          }
          fog.eventMode = "none";
          overlay.addChild(fog);
        }
        if (r.owner === viewer) {
          const home = new Graphics();
          for (const ring of rings)
            home
              .poly(ring.flat())
              .stroke({ color: "#75e5ec", width: 1.2 / scale, alpha: 0.65 });
          home.eventMode = "none";
          overlay.addChild(home);
        }
        if (
          !strategy &&
          zoomRef.current < POLITICAL_OVERLAY_END_ZOOM &&
          activeSector.includes(r.id)
        ) {
          const sector = new Graphics();
          for (const ring of rings) {
            sector.poly(ring.flat());
            if (signedArea(ring) > 0)
              sector.fill({
                color: "#edd8a3",
                alpha: 0.16 * (ownershipAlpha / 0.24),
              });
            else sector.cut();
          }
          overlay.addChild(sector);
        }
        if (r.id === s && chosenArmy === null) {
          const selected = new Graphics();
          for (const ring of rings)
            selected.poly(ring.flat()).stroke({
              color: r.terrain === "mountains" ? "#ecebe0" : "#f2dfad",
              width: 2 / scale,
            });
          overlay.addChild(selected);
        }
        if (detail && r.consolidation > 0) {
          const t = text(
            `${r.consolidation}h`,
            r.x,
            r.y + 13 / scale,
            9,
            "#344747",
          );
          t.alpha = 0.85;
        }
      }
      for (const e of edges) {
        const a = w.regions[e.regions[0]],
          b = e.regions.length > 1 ? w.regions[e.regions[1]] : null;
        if (b) lines.moveTo(...e.a).lineTo(...e.b);
        if (b && a.province !== b.province)
          provinces.moveTo(...e.a).lineTo(...e.b);
        if (a.owner !== b?.owner && (a.owner !== null || b?.owner != null))
          fronts.moveTo(...e.a).lineTo(...e.b);
      }
      lines.stroke({
        color: "#314b40",
        width: (strategy ? 1 : detail ? 0.85 : 0.65) / scale,
        alpha: strategy ? 0.7 : detail ? 0.48 : 0.32,
      });
      provinces.stroke({
        color: "#435744",
        width: 0.8 / scale,
        alpha: strategy ? 0 : regional ? 0.5 : 0.27,
      });
      fronts.stroke({
        color: strategy ? "#d9d4c3" : "#e8d5a4",
        width: (strategy ? 2.5 : 1.65) / scale,
        alpha: 0.95,
      });
      overlay.addChild(lines, provinces, fronts);
      const occupied: {
        x: number;
        y: number;
        width: number;
        height: number;
      }[] = [];
      for (const a of preview || strategy ? [] : w.armies) {
        const r = w.regions[a.region];
        if (!r) continue;
        const stack = w.armies.filter(
          (b) => b.region === a.region && b.id < a.id,
        ).length;
        occupied.push({
          x: r.x + (stack * 20 - 19) / scale,
          y: r.y - 26 / scale,
          width: 38 / scale,
          height: 24 / scale,
        });
      }
      const onLand = (x: number, y: number) => {
        if (!w.geography) return true;
        let inside = false;
        for (const ring of w.geography.coastlines) {
          for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const a = ring[i],
              b = ring[j];
            if (
              a[1] > y !== b[1] > y &&
              x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
            )
              inside = !inside;
          }
        }
        return inside;
      };
      const placeLabel = (t: Text, x: number, y: number) => {
        const box = {
          x: x - t.width / 2 - 20 / scale,
          y: y - t.height / 2,
          width: t.width + 40 / scale,
          height: t.height + 14 / scale,
        };
        if (
          ![
            [box.x, box.y],
            [box.x + box.width, box.y],
            [box.x, box.y + box.height],
            [box.x + box.width, box.y + box.height],
          ].every(([px, py]) => onLand(px, py)) ||
          occupied.some(
            (b) =>
              box.x < b.x + b.width &&
              box.x + box.width > b.x &&
              box.y < b.y + b.height &&
              box.y + box.height > b.y,
          )
        )
          t.destroy();
        else occupied.push(box);
      };
      // Names are an information hierarchy, not a label for every map object.
      let settlementLabelCount = 0;
      const settlementLabelBudget = Math.max(
        3,
        Math.floor(
          ((host.current?.clientWidth ?? 1000) *
            (host.current?.clientHeight ?? 700)) /
            90000,
        ),
      );
      // Settlement icons remain inspectable even when their names are hidden.
      for (const r of strategy ? [] : w.regions)
        for (const f of r.features ?? []) {
          if (f.kind !== "settlement") continue;
          const size = SETTLEMENT_SIZES.includes(f.size as SettlementSize)
            ? (f.size as SettlementSize)
            : "hamlet";
          const rank = SETTLEMENT_SIZES.indexOf(size);
          if ((!regional && rank < 3) || (!detail && rank < 2)) continue;
          const marker = new Container();
          marker.position.set(f.x, f.y);
          const layout = cityLayouts.get(f.id) ?? generateCityLayout(w, r, f);
          const isCapital =
            w.nations.some((n) => n.capital === r.id && r.owner === n.id) &&
            (r.features ?? []).find((site) => site.kind === "settlement")
              ?.id === f.id;
          const controller = settlementOwner(r, f);
          const city = settlementGraphics(
            layout.archetype,
            f,
            scale,
            isCapital,
            controller === null ? null : (w.nations[controller]?.color ?? null),
          );
          const markerWidth = city.width,
            markerHeight = city.height;
          marker.addChild(city.graphics);
          screenLabels.set(city.graphics.children[0], 1);
          if (latest.current.selectedSettlement === f.id) {
            const selection = new Graphics()
              .ellipse(0, 0, markerWidth * 0.56, markerHeight * 0.56)
              .fill({ color: "#fff1b1", alpha: 0.14 })
              .stroke({ color: "#fff1b1", width: 2 / scale });
            marker.addChildAt(selection, 0);
          }
          marker.eventMode = "static";
          marker.cursor = "pointer";
          marker.hitArea = new Rectangle(
            -Math.max(markerWidth, 14 / scale) / 2,
            -Math.max(markerHeight, 14 / scale) / 2,
            Math.max(markerWidth, 14 / scale),
            Math.max(markerHeight, 14 / scale),
          );
          marker.on("pointertap", (event) => {
            if (
              event.button !== 0 ||
              moved ||
              suppressTap ||
              latest.current.placingSquads
            )
              return;
            event.stopPropagation();
            latest.current.onSelectSettlement?.(r.id, f.id);
          });
          marker.on("pointerover", () =>
            setHovered(
              `${f.name} · ${f.size ?? "hamlet"} (${rank + 1}/5) · ${controller === null ? "Uncontrolled" : (w.nations[controller]?.name ?? "Unknown controller")} · Click to inspect · Right-click to ${controller === w.vision?.owner ? "garrison" : "capture"}`,
            ),
          );
          marker.on("pointerout", () => setHovered(null));
          overlay.addChild(marker);
          const selectedSite = latest.current.selectedSettlement === f.id;
          const showName =
            selectedSite ||
            isCapital ||
            (zoomRef.current >= 4 && rank >= 3) ||
            (zoomRef.current >= 8 && rank >= 2);
          const sx = f.x * scale + scene.x,
            sy = f.y * scale + scene.y;
          const onScreen =
            sx >= 0 &&
            sy >= 0 &&
            sx <= (host.current?.clientWidth ?? 0) &&
            sy <= (host.current?.clientHeight ?? 0);
          if (
            showName &&
            onScreen &&
            (selectedSite ||
              isCapital ||
              settlementLabelCount < settlementLabelBudget)
          ) {
            settlementLabelCount++;
            const y = f.y + markerHeight / 2 + 10 / scale;
            placeLabel(
              text(f.name, f.x, y, rank >= 3 ? 14 : 12, "#453e30"),
              f.x,
              y,
            );
          }
        }
      // Geographic names lead at continent scale; town names emerge on approach.
      if (!detail && !strategy)
        for (const p of w.geography?.provinces ?? []) {
          placeLabel(
            text(p.name, p.center[0], p.center[1], 14, "#31493d", "Arial"),
            p.center[0],
            p.center[1],
          );
        }
      const labelCandidates = w.regions
        .filter(
          (r) => !strategy && r.id === s && !latest.current.selectedSettlement,
        )
        .sort((a, b) => Number(b.id === s) - Number(a.id === s));
      for (const r of labelCandidates) {
        const t = text(
          r.name,
          r.x,
          r.y,
          r.id === s ? 15 : 13,
          r.terrain === "mountains" ? "#3e4745" : "#293e35",
        );
        const box = {
          x: r.x - t.width / 2 - 3 / scale,
          y: r.y - t.height / 2,
          width: t.width + 6 / scale,
          height: t.height + 5 / scale,
        };
        if (
          occupied.some(
            (b) =>
              box.x < b.x + b.width &&
              box.x + box.width > b.x &&
              box.y < b.y + b.height &&
              box.y + box.height > b.y,
          )
        ) {
          t.destroy();
        } else occupied.push(box);
      }
      if (strategy) {
        // Label actual connected holdings, not historical capital locations.
        const remaining = new Set(
          w.regions.filter((r) => r.owner !== null).map((r) => r.id),
        );
        while (remaining.size) {
          const start = remaining.values().next().value!;
          const owner = w.regions[start].owner!;
          const component = [w.regions[start]];
          remaining.delete(start);
          for (let i = 0; i < component.length; i++)
            for (const id of component[i].neighbors) {
              if (remaining.has(id) && w.regions[id].owner === owner) {
                remaining.delete(id);
                component.push(w.regions[id]);
              }
            }
          const area = component.reduce((sum, r) => sum + r.area, 0);
          const cx = component.reduce((sum, r) => sum + r.x * r.area, 0) / area;
          const cy = component.reduce((sum, r) => sum + r.y * r.area, 0) / area;
          const contains = (x: number, y: number) =>
            component.some((r) => {
              let hit = false;
              for (const ring of ringsByRegion[r.id])
                for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                  const a = ring[i],
                    b = ring[j];
                  if (
                    a[1] > y !== b[1] > y &&
                    x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
                  )
                    hit = !hit;
                }
              return hit;
            });
          // Find a broad, continuous label baseline inside the actual holding.
          // Sampling several headings lets elongated countries carry slanted names.
          let placement = {
            x: component[0].x,
            y: component[0].y,
            angle: 0,
            width: 0,
          };
          const step = Math.max(3, Math.sqrt(area) / 100);
          for (const candidate of [{ x: cx, y: cy }, ...component]) {
            if (!contains(candidate.x, candidate.y)) continue;
            for (const angle of [0, -0.25, 0.25, -0.5, 0.5, -0.75, 0.75]) {
              const ux = Math.cos(angle),
                uy = Math.sin(angle);
              let left = 0,
                right = 0;
              const limit = Math.sqrt(area) * 3;
              while (
                left < limit &&
                contains(
                  candidate.x - ux * (left + step),
                  candidate.y - uy * (left + step),
                )
              )
                left += step;
              while (
                right < limit &&
                contains(
                  candidate.x + ux * (right + step),
                  candidate.y + uy * (right + step),
                )
              )
                right += step;
              const width = left + right;
              if (width > placement.width)
                placement = {
                  x: candidate.x + (ux * (right - left)) / 2,
                  y: candidate.y + (uy * (right - left)) / 2,
                  angle,
                  width,
                };
            }
          }
          const label = text(
            w.nations[owner].name.toUpperCase(),
            placement.x,
            placement.y,
            24,
            "#172829",
            "Georgia",
          );
          label.style.fontWeight = "600";
          label.style.letterSpacing = 1.2;
          label.style.stroke = {
            color: "#263532",
            width: 1.2,
            alpha: 0.9,
          };
          const fit = Math.min(
            (placement.width * 0.78) / label.width,
            (Math.sqrt(area) * 0.12) / label.height,
            1.5,
          );
          label.scale.set(fit / scale);
          label.visible = fit >= 0.58;
          screenLabels.set(label, fit);
          label.rotation = placement.angle;
        }
      }
      if (!strategy)
        for (const r of w.regions.filter((r) => r.building === "fort")) {
          const fort = new Graphics()
            .rect(r.x - 5 / scale, r.y - 5 / scale, 10 / scale, 10 / scale)
            .fill("#756d56")
            .stroke({ color: "#e8ddbd", width: 1.5 / scale });
          fort.eventMode = "none";
          overlay.addChild(fort);
        }
      for (const n of strategy ? [] : w.nations) {
        const r = w.regions[n.capital];
        if (!r) continue;
        const city = new Graphics();
        city
          .circle(r.x, r.y, 2.8 / scale)
          .fill("#e5d1a6")
          .stroke({ color: "#34463c", width: 1 / scale });
        overlay.addChild(city);
        if (!detail)
          placeLabel(
            text(n.name, r.x, r.y - 18 / scale, 10, "#182f32"),
            r.x,
            r.y - 18 / scale,
          );
      }
      for (const a of preview || strategy ? [] : w.armies) {
        const r = w.regions[a.region];
        if (!r) continue;
        const selected =
          latest.current.selectedArmies.includes(a.id) || chosenArmy === a.id;
        if (selected && a.route?.length) {
          const route = new Graphics();
          route.moveTo(r.x, r.y);
          for (const id of a.route) {
            const p = w.regions[id];
            if (p) route.lineTo(p.x, p.y);
          }
          route.stroke({ color: "#f1d9a0", width: 2 / scale });
          overlay.addChild(route);
        } else if (selected && a.target !== null) {
          const t = w.regions[a.target],
            line = new Graphics();
          if (t) {
            line
              .moveTo(r.x, r.y)
              .lineTo(t.x, t.y)
              .stroke({ color: "#f1d9a0", width: 1.5 / scale, alpha: 0.8 });
            overlay.addChild(line);
          }
        }
        if (w.tactics?.squads.some((s) => s.army === a.id && s.strength > 0))
          continue;
        const token = new Container();
        const stack = w.armies.filter(
          (b) => b.region === a.region && b.id < a.id,
        ).length;
        token.position.set(r.x + (stack * 20) / scale, r.y - 14 / scale);
        token.scale.set(1 / scale);
        const compact = !detail || !selected;
        const mine = a.owner === viewer;
        const relationColor =
          viewer === undefined
            ? w.nations[a.owner].color
            : mine
              ? "#75e5ec"
              : "#fa907e";
        const box = new Graphics();
        box
          .roundRect(compact ? -9 : -15, -8, compact ? 18 : 30, 16, 1.5)
          .fill(mine ? "#163b48" : "#402d32")
          .stroke({ color: relationColor, width: selected ? 2.5 : 1.5 });
        if (!mine && viewer !== undefined)
          box.poly([0, -12, 4, -8, 0, -4, -4, -8]).fill(relationColor);
        const symbolX = compact ? -4.5 : -11;
        box.rect(symbolX, -4, 9, 8).stroke({ color: relationColor, width: 1 });
        box
          .moveTo(symbolX, -4)
          .lineTo(symbolX + 9, 4)
          .moveTo(symbolX + 9, -4)
          .lineTo(symbolX, 4)
          .stroke({ color: relationColor, width: 0.8 });
        token.addChild(box);
        if (!compact) {
          const strength = new Text({
            text: String(Math.round(a.strength)),
            style: {
              fontFamily: "Arial",
              fontSize: 8,
              fill: relationColor,
              fontWeight: "600",
            },
          });
          strength.position.set(0, -5);
          strength.resolution = 2;
          token.addChild(strength);
        }
        const highlight = new Graphics()
          .roundRect(compact ? -12 : -18, -11, compact ? 24 : 36, 22, 3)
          .stroke({ color: "#fff4cd", width: 2 });
        highlight.visible = selected;
        highlight.eventMode = "none";
        token.addChild(highlight);
        token.hitArea = new Rectangle(
          compact ? -12 : -18,
          -12,
          compact ? 24 : 36,
          24,
        );
        token.eventMode = "static";
        token.cursor = UNIT_CURSOR;
        token.on("pointerover", () => {
          if (dragging) return;
          highlight.visible = true;
          setHovered(
            `${a.squadKind ? (mine ? "Your squad" : "Other squad") : mine ? "Your army" : "Other army"} · ${w.nations[a.owner].name} · ${formationName(a)} · Click to ${mine ? "command" : "inspect"}`,
          );
        });
        token.on("pointerout", () => {
          highlight.visible = selected;
          setHovered(null);
        });
        token.on("pointertap", (event) => {
          event.stopPropagation();
          if (event.button !== 0) return;
          if (!moved && !suppressTap && !latest.current.placingSquads) {
            if (latest.current.onSelectArmy) latest.current.onSelectArmy(a.id);
            else latest.current.onSelect(a.region);
          }
        });
        overlay.addChild(token);
      }
      if (w.geography && !strategy) {
        text(
          "THE PALE SEA",
          w.geography.width * 0.14,
          w.geography.height * 0.18,
          13,
          "#90aba9",
          "Georgia",
        );
        text(
          "SOUTHERN REACH",
          w.geography.width * 0.7,
          w.geography.height * 0.88,
          11,
          "#90aba9",
          "Georgia",
        );
      }
      host.current?.setAttribute(
        "data-overlay-render-ms",
        (performance.now() - renderStarted).toFixed(1),
      );
    };
    const changeZoom = (
      next: number,
      anchor?: { x: number; y: number },
      reset = false,
    ) => {
      if (!ready || !host.current) return;
      const point = anchor ?? {
        x: host.current.clientWidth / 2,
        y: host.current.clientHeight / 2,
      };
      const worldPoint = {
        x: (point.x - scene.x) / scene.scale.x,
        y: (point.y - scene.y) / scene.scale.y,
      };
      zoomRef.current = Math.min(12, Math.max(0.35, next));
      if (reset) offset = { x: 0, y: 0 };
      position();
      if (!reset) {
        offset.x += point.x - (worldPoint.x * scene.scale.x + scene.x);
        offset.y += point.y - (worldPoint.y * scene.scale.y + scene.y);
        position();
      }
      setZoom(zoomRef.current);
      // Reuse the scene throughout a wheel gesture. Rebuild label/border detail
      // only once input settles, rather than tessellating hundreds of regions per frame.
      if (detailTimer) clearTimeout(detailTimer);
      detailTimer = setTimeout(
        () => {
          detailTimer = undefined;
          if (!disposed) render();
        },
        reset ? 0 : 180,
      );
    };
    const down = (e: PointerEvent) => {
      if (pointerId !== null || ![0, 1, 2].includes(e.button)) return;
      e.preventDefault();
      setOrderMenu(null);
      pointerId = e.pointerId;
      dragging = true;
      selecting =
        e.button === 0 &&
        e.pointerType !== "touch" &&
        !preview &&
        !latest.current.placingSquads;
      additive = e.shiftKey;
      moved = false;
      suppressTap = false;
      origin = last = { x: e.clientX, y: e.clientY };
      app.canvas.setPointerCapture(e.pointerId);
      app.canvas.style.cursor = selecting ? "crosshair" : "grabbing";
    };
    const move = (e: PointerEvent) => {
      setPointerOnMap(e.target === app.canvas && !dragging);
      if (!dragging || e.pointerId !== pointerId) return;
      if (!moved && Math.hypot(e.clientX - origin.x, e.clientY - origin.y) < 5)
        return;
      moved = true;
      setHovered(null);
      if (selecting) {
        const rect = app.canvas.getBoundingClientRect();
        marquee
          .clear()
          .rect(
            Math.min(origin.x, e.clientX) - rect.left,
            Math.min(origin.y, e.clientY) - rect.top,
            Math.abs(e.clientX - origin.x),
            Math.abs(e.clientY - origin.y),
          )
          .fill({ color: "#75e5ec", alpha: 0.12 })
          .stroke({ color: "#b9f5ed", width: 1.5 });
        return;
      }
      offset.x += e.clientX - last.x;
      offset.y += e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      position();
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      dragging = false;
      pointerId = null;
      if (app.canvas.hasPointerCapture(e.pointerId))
        app.canvas.releasePointerCapture(e.pointerId);
      app.canvas.style.cursor = "grab";
      marquee.clear();
      if (selecting && moved && e.type === "pointerup") {
        const rect = app.canvas.getBoundingClientRect();
        const left = Math.min(origin.x, e.clientX) - rect.left,
          right = Math.max(origin.x, e.clientX) - rect.left;
        const top = Math.min(origin.y, e.clientY) - rect.top,
          bottom = Math.max(origin.y, e.clientY) - rect.top;
        const contains = (x: number, y: number) =>
          x >= left && x <= right && y >= top && y <= bottom;
        const w = latest.current.world;
        const ids = strategyRef.current
          ? []
          : w.armies
              .filter((a) => {
                if (a.owner !== w.vision?.owner || a.strength <= 0)
                  return false;
                const squads =
                  w.tactics?.squads.filter(
                    (s) => s.army === a.id && s.strength > 0,
                  ) ?? [];
                if (squads.length)
                  return squads.some((s) => {
                    const p = liveSquadPositions.get(s.id) ?? s;
                    return contains(
                      p.x * scene.scale.x + scene.x,
                      p.y * scene.scale.y + scene.y,
                    );
                  });
                const r = w.regions[a.region];
                return contains(
                  r.x * scene.scale.x + scene.x,
                  r.y * scene.scale.y + scene.y - 14,
                );
              })
              .map((a) => a.id);
        latest.current.onSelectArmies?.(ids, additive);
      }
      selecting = false;
      if (
        e.type === "pointerup" &&
        (e.button === 2 || (e.button === 0 && latest.current.placingSquads)) &&
        !moved &&
        !preview
      ) {
        const rect = app.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - scene.x) / scene.scale.x;
        const y = (e.clientY - rect.top - scene.y) / scene.scale.y;
        if (
          hoveredTarget &&
          (latest.current.selectedSquads.length ||
            latest.current.selectedArmies.length)
        ) {
          const target = latest.current.world.tactics?.squads.find(
            (s) => s.id === hoveredTarget,
          );
          if (
            target &&
            target.owner !== latest.current.world.vision?.owner &&
            target.strength > 0
          ) {
            suppressTap = true;
            latest.current.onAttackTarget?.(target.id);
            return;
          }
        }
        const region = latest.current.world.regions.find((r) => {
          let inside = false;
          for (const ring of ringsByRegion[r.id])
            for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
              const a = ring[i],
                b = ring[j];
              if (
                a[1] > y !== b[1] > y &&
                x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
              )
                inside = !inside;
            }
          return inside;
        });
        const viewer = latest.current.world.vision?.owner;
        const settlement =
          region && zoomRef.current >= DETAIL_ZOOM
            ? region.features?.find(
                (f) =>
                  f.kind === "settlement" &&
                  Math.hypot(
                    (f.x - x) * scene.scale.x,
                    (f.y - y) * scene.scale.y,
                  ) < 16,
              )
            : undefined;
        if (
          region &&
          settlement &&
          latest.current.selectedSquads.length &&
          settlementOwner(region, settlement) !== viewer
        ) {
          suppressTap = true;
          setOrderMenu({
            region: region.id,
            feature: settlement.id,
            name: settlement.name,
            action: "capture",
            x: Math.max(8, Math.min(e.clientX, innerWidth - 248)),
            y: Math.max(8, Math.min(e.clientY, innerHeight - 150)),
          });
          return;
        }
        if (
          region &&
          (latest.current.selectedSquads.length ||
            latest.current.selectedArmies.length)
        ) {
          suppressTap = true;
          latest.current.onLocalPoint?.(x, y, e.shiftKey);
          return;
        }
        if (region) {
          const fort =
            region.building === "fort" &&
            Math.hypot(
              (region.x - x) * scene.scale.x,
              (region.y - y) * scene.scale.y,
            ) < 18;
          if (region.owner === viewer && (settlement || fort))
            setOrderMenu({
              region: region.id,
              feature: settlement?.id ?? "fort",
              name: settlement?.name ?? "Fort",
              action: "cover",
              x: Math.max(8, Math.min(e.clientX, innerWidth - 248)),
              y: Math.max(8, Math.min(e.clientY, innerHeight - 150)),
            });
          else latest.current.onOrder?.(region.id);
        }
      }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = app.canvas.getBoundingClientRect();
      const delta =
        e.deltaY *
        (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1);
      changeZoom(
        zoomRef.current *
          Math.exp(-Math.max(-120, Math.min(120, delta)) * 0.0025),
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
      );
    };
    const keys = new Set<string>();
    const editable = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      !!target.closest('input, textarea, select, [contenteditable="true"]');
    const keydown = (e: KeyboardEvent) => {
      if (preview) return;
      if (e.code === "Escape") {
        keys.clear();
        setOrderMenu(null);
        setHovered(null);
        marquee.clear();
        selecting = false;
        dragging = false;
        moved = true;
        if (pointerId !== null && app.canvas.hasPointerCapture(pointerId))
          app.canvas.releasePointerCapture(pointerId);
        pointerId = null;
        latest.current.onDeselect?.();
        return;
      }
      if (editable(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
        e.preventDefault();
        keys.add(e.code);
      }
    };
    const keyup = (e: KeyboardEvent) => keys.delete(e.code);
    const clearKeys = () => keys.clear();
    const keyboardPan = () => {
      if (!keys.size || dragging || editable(document.activeElement)) return;
      const dx = Number(keys.has("KeyA")) - Number(keys.has("KeyD"));
      const dy = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
      const length = Math.hypot(dx, dy);
      if (!length) return;
      const distance = (Math.min(50, app.ticker.deltaMS) * 0.45) / length;
      offset.x += dx * distance;
      offset.y += dy * distance;
      position();
      setHovered(null);
      setOrderMenu(null);
    };
    const leaveMap = () => setHovered(null);
    const contextMenu = (e: Event) => e.preventDefault();
    app
      .init({
        background: "#18363e",
        antialias: true,
        resolution: Math.min(devicePixelRatio, 2),
        autoDensity: true,
        preference: "webgl",
      })
      .then(() => {
        if (disposed) {
          app.destroy(true, { children: true });
          return;
        }
        ready = true;
        void Assets.load<Texture>("/art/water/ocean-v1.png")
          .then((texture) => {
            if (disposed) return;
            oceanTexture = oceanSurface(texture, world.seed);
            oceanSprite = new Sprite(oceanTexture);
            oceanSprite.eventMode = "none";
            ocean.addChild(oceanSprite);
            drawOcean();
            host.current?.setAttribute("data-ocean-texture", "ready");
          })
          .catch(() => {
            host.current?.setAttribute("data-ocean-texture", "fallback");
          });
        const accentsReady = Assets.load<Texture>(
          "/art/biomes/accents-atlas-v1.webp",
        )
          .then(async (atlas) => {
            const [treeAtlas, farmlandAtlas, details] = await Promise.all([
              Assets.load<Texture>("/art/biomes/scenery-atlas-v1.webp"),
              Assets.load<Texture>("/art/farmland/materials-v1.png").catch(
                () => undefined,
              ),
              mapDetails,
            ]);
            if (disposed) return;
            const { roads, accents: layout } = details;
            const attachStarted = performance.now();
            accents = terrainAccentLayer(
              layout,
              atlas,
              world.geography?.cellSize ?? 8,
              roads,
              treeAtlas,
              farmlandAtlas,
              geometry,
            );
            host.current?.setAttribute(
              "data-terrain-attach-ms",
              (performance.now() - attachStarted).toFixed(1),
            );
            host.current?.setAttribute(
              "data-field-parcels",
              String(layout.fields.length),
            );
            if (layout.fields.length) {
              const field = layout.fields[0];
              host.current?.setAttribute(
                "data-field-focus",
                JSON.stringify({
                  x: field.points.reduce((n, p) => n + p.x, 0) / 4,
                  y: field.points.reduce((n, p) => n + p.y, 0) / 4,
                }),
              );
            }
            scene.addChildAt(accents.layer, scene.getChildIndex(terrain) + 1);
            host.current?.setAttribute("data-city-roads", String(roads.length));
            host.current?.setAttribute(
              "data-terrain-accents",
              String(accents.count),
            );
            host.current?.setAttribute(
              "data-utility-lines",
              String(layout.lines.filter((l) => l.kind === "utility").length),
            );
            position();
            return { layout, roads };
          })
          .catch(() => {
            host.current?.setAttribute("data-terrain-accents", "fallback");
            return undefined;
          });
        void Assets.load<Texture>("/art/biomes/scenery-atlas-v1.webp")
          .then(async (atlas) => {
            const details = await mapDetails;
            if (disposed) return;
            const generated = details.scenery;
            const points = world.mountainScenery
              ? [
                  ...generated.filter((p) => p.kind === "tree"),
                  ...world.mountainScenery,
                ].sort((a, b) => a.y - b.y)
              : generated;
            const attachStarted = performance.now();
            scenery = biomeSceneryLayer(
              points,
              atlas,
              (world.geography?.cellSize ?? 8) * 32,
            );
            host.current?.setAttribute(
              "data-scenery-attach-ms",
              (performance.now() - attachStarted).toFixed(1),
            );
            scene.addChildAt(
              scenery.layer,
              scene.getChildIndex(terrain) + 1 + (accents ? 1 : 0),
            );
            host.current?.setAttribute(
              "data-biome-sprites",
              String(points.length),
            );
            position();
          })
          .catch(() => {
            // Textured ground remains usable when decorative sprite art is unavailable.
            host.current?.setAttribute("data-biome-sprites", "fallback");
          });
        const biomeNames = [
          "plains",
          "forest",
          "highlands",
          "mountains",
          "river",
        ] as const;
        void Promise.all(
          biomeNames.map(
            async (name) =>
              [
                name,
                await Assets.load<Texture>(
                  name === "river"
                    ? "/art/water/river-v1.png"
                    : `/art/biomes/${name}-v1.webp`,
                ),
              ] as const,
          ),
        )
          .then(async (entries) => {
            const textures = Object.fromEntries(entries);
            const prepared = await prepareTerrainTextures(textures);
            const uploadTimes: number[] = [];
            for (const texture of prepared.baked) {
              const uploadStarted = performance.now();
              app.renderer.texture.initSource(texture.source);
              uploadTimes.push(performance.now() - uploadStarted);
              await new Promise<void>((resolve) =>
                requestAnimationFrame(() => resolve()),
              );
            }
            if (disposed) return;
            host.current?.setAttribute(
              "data-ground-bake-ms",
              JSON.stringify(prepared.durations),
            );
            host.current?.setAttribute(
              "data-ground-upload-ms",
              JSON.stringify(uploadTimes),
            );
            const attachStarted = performance.now();
            const textured = terrainGraphics(world, geometry, textures);
            host.current?.setAttribute(
              "data-ground-attach-ms",
              (performance.now() - attachStarted).toFixed(1),
            );
            scene.addChildAt(textured, scene.getChildIndex(terrain));
            scene.removeChild(terrain);
            terrain.destroy({ children: true });
            terrain = textured;
            terrain.visible = preview || !strategyRef.current;
            terrain.setDetailZoom(zoomRef.current);
            host.current?.setAttribute("data-biome-textures", "ready");
          })
          .catch(() => {
            // Solid biome colors remain usable if artwork cannot load.
            host.current?.setAttribute("data-biome-textures", "fallback");
          });
        host.current?.setAttribute("data-settlement-icons", "ready");
        app.ticker.add(keyboardPan);
        window.addEventListener("keydown", keydown);
        window.addEventListener("keyup", keyup);
        window.addEventListener("blur", clearKeys);
        host.current!.appendChild(app.canvas);
        app.stage.addChild(ocean, scene, marquee);
        app.canvas.setAttribute(
          "aria-label",
          "Interactive continent. Use the region selector beside the map for keyboard access.",
        );
        if (!preview)
          stopSquads = squadLayer(
            scene,
            app.ticker,
            () => latest.current.world,
            () => zoomRef.current,
            {
              select: (id) => latest.current.onSelectArmy?.(id),
              selectSquad: (id, additive) =>
                latest.current.onSelectSquad?.(id, additive),
              selectedSquads: () => latest.current.selectedSquads,
              hoverTarget: (id) => {
                hoveredTarget = id;
              },
              strategy: () => strategyRef.current,
              resyncKey: () => latest.current.resyncKey,
              positions: (positions) => {
                liveSquadPositions = positions;
              },
              hover: (id) => {
                const a = latest.current.world.armies.find((a) => a.id === id);
                setHovered(
                  a
                    ? `${a.owner === latest.current.world.vision?.owner ? "Your army" : "Other army"} · ${formationName(a)} · Click to select formation`
                    : null,
                );
              },
              dragged: () =>
                moved || suppressTap || latest.current.placingSquads,
              selected: () =>
                latest.current.selectedArmies.length
                  ? latest.current.selectedArmies
                  : latest.current.selectedArmy === null ||
                      latest.current.selectedArmy === undefined
                    ? []
                    : [latest.current.selectedArmy],
            },
          );
        focusRef.current = (region) => {
          const r = latest.current.world.regions[region];
          if (!r || !host.current) return;
          zoomRef.current = Math.max(zoomRef.current, 3);
          position();
          const tx = host.current.clientWidth / 2;
          const ty = host.current.clientHeight / 2;
          offset.x += tx - (r.x * scene.scale.x + scene.x);
          offset.y += ty - (r.y * scene.scale.y + scene.y);
          setZoom(zoomRef.current);
          render();
        };
        drawRef.current = render;
        cameraRef.current = (next, reset = false) =>
          changeZoom(next, undefined, reset);
        app.canvas.style.cursor = "grab";
        observer = new ResizeObserver(() => {
          if (host.current) {
            app.renderer.resize(
              host.current.clientWidth,
              host.current.clientHeight,
            );
            drawOcean();
            render();
          }
        });
        observer.observe(host.current!);
        app.canvas.addEventListener("pointerleave", leaveMap);
        app.canvas.addEventListener("pointerdown", down);
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
        app.canvas.addEventListener("wheel", wheel, { passive: false });
        app.canvas.addEventListener("contextmenu", contextMenu);
        render();
        if (!preview && latest.current.world.vision)
          focusRef.current(
            latest.current.world.nations[latest.current.world.vision.owner]
              .capital,
          );
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", clearKeys);
      // StrictMode can clean up before asynchronous Pixi initialization finishes.
      // The disposed init continuation handles teardown in that case.
      if (ready) {
        app.ticker.remove(keyboardPan);
      }
      observer?.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (detailTimer) clearTimeout(detailTimer);
      cameraRef.current = () => {};
      drawRef.current = () => {};
      focusRef.current = () => {};
      stopSquads?.();
      mapDetailsWorker.terminate();
      if (ready) {
        scenery?.destroy();
        accents?.destroy();
        app.destroy(true, { children: true });
        oceanTexture?.destroy(true);
      }
    };
  }, [world.id, preview]);
  useEffect(() => {
    if (focus) focusRef.current(focus.region);
  }, [focus]);
  useEffect(() => {
    drawRef.current();
  }, [world, selected, selectedArmy, selectedArmies]);
  return (
    <div className="map-shell">
      <div className="map-canvas" ref={host} />
      {failed && (
        <div className="map-fallback">
          The map renderer could not start. You can still inspect regions and
          issue orders using the region selector.
        </div>
      )}
      <div className="map-caption">
        <span className="live-dot" />
        Continental survey <span>•</span> {world.regions.length} regions
      </div>
      {!preview && (
        <div className="map-interaction" role="status">
          {(placingSquads
            ? "Choose a position · Tap land to move"
            : selectedSquads.length
              ? `${selectedSquads.length} squad(s) selected · ${world.tactics?.squads.filter((s) => selectedSquads.includes(s.id) && s.localOrder?.path.length).length || 0} move orders active · Right-click to move · Shift to queue`
              : null) ??
            (pointerOnMap ? hovered : null) ??
            (selectedArmies.filter((id) =>
              world.armies.some((a) => a.id === id),
            ).length > 1
              ? `${selectedArmies.filter((id) => world.armies.some((a) => a.id === id)).length} armies selected · Right-click to order group`
              : null) ??
            (selectedArmy !== null &&
            selectedArmy !== undefined &&
            world.armies.some((a) => a.id === selectedArmy)
              ? `Selected army · ${formationName(world.armies.find((a) => a.id === selectedArmy)!)} · ${world.nations[world.armies.find((a) => a.id === selectedArmy)!.owner].name}`
              : selected !== null
                ? `Selected territory · ${world.regions[selected]?.name ?? ""}`
                : "Hover to inspect · Drag to pan")}
        </div>
      )}
      {orderMenu && (
        <div
          className="map-order-menu"
          role="menu"
          aria-label={
            orderMenu.action === "capture" ? "Capture order" : "Cover orders"
          }
          style={{ left: orderMenu.x, top: orderMenu.y }}
        >
          <strong>{orderMenu.name}</strong>
          {orderMenu.action === "capture" ? (
            <button
              role="menuitem"
              onClick={() => {
                onCaptureSettlement?.(orderMenu.region, orderMenu.feature);
                setOrderMenu(null);
              }}
            >
              Capture
            </button>
          ) : (
            <>
              <button
                role="menuitem"
                onClick={() => {
                  onOrder?.(orderMenu.region, orderMenu.feature);
                  setOrderMenu(null);
                }}
              >
                Take cover
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  onOrder?.(orderMenu.region);
                  setOrderMenu(null);
                }}
              >
                Move / hold here
              </button>
            </>
          )}
          <button role="menuitem" onClick={() => setOrderMenu(null)}>
            Cancel
          </button>
        </div>
      )}
      <div className="map-tools">
        <button
          aria-label="Zoom out"
          onClick={() => cameraRef.current(zoomRef.current / 1.25)}
          disabled={zoom <= 0.35}
        >
          −
        </button>
        {!preview && (
          <button
            className="map-mode"
            aria-label="Strategy view"
            aria-pressed={strategyView}
            title={
              strategyView
                ? "Switch to terrain view"
                : "Switch to strategy view"
            }
            onClick={() => {
              strategyRef.current = !strategyRef.current;
              setStrategyView(strategyRef.current);
              setOrderMenu(null);
              setHovered(null);
              drawRef.current();
            }}
          >
            {strategyView ? "Strategy" : "Terrain"}
          </button>
        )}
        <output aria-label="Map zoom">{Math.round(zoom * 100)}%</output>
        <button
          onClick={() => cameraRef.current(1, true)}
          aria-label="Fit continent"
        >
          Fit
        </button>
        <button
          aria-label="Zoom in"
          onClick={() => cameraRef.current(zoomRef.current * 1.25)}
          disabled={zoom >= 12}
        >
          +
        </button>
      </div>
    </div>
  );
}

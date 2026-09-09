import { useEffect, useRef, useState } from "react";
import {
  Application,
  Container,
  Graphics,
  Text,
  Sprite,
  Texture,
} from "pixi.js";
import {
  terrainTexture,
  territoryRings,
  boundaryEdges,
} from "./terrainTexture";
import { signedArea } from "../../../packages/game-core/src/geography";
import { coverage, type World } from "../../../packages/game-core/src/index";
export function MapView({
  world,
  selected,
  onSelect,
  initialZoom = 1,
  selectedArmy,
  onSelectArmy,
}: {
  world: World;
  selected: number | null;
  onSelect: (id: number) => void;
  initialZoom?: number;
  selectedArmy?: number | null;
  onSelectArmy?: (id: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef({ world, selected, onSelect, selectedArmy, onSelectArmy });
  latest.current = { world, selected, onSelect, selectedArmy, onSelectArmy };
  const drawRef = useRef<() => void>(() => {});
  const [zoom, setZoom] = useState(initialZoom);
  const zoomRef = useRef(initialZoom);
  const cameraRef = useRef<(next: number, reset?: boolean) => void>(() => {});
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false,
      ready = false;
    const app = new Application();
    const scene = new Container();
    const ocean = new Graphics();
    let observer: ResizeObserver | undefined;
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
    const ringsByRegion = world.regions.map(territoryRings);
    const position = () => {
      if (!host.current || !ready) return;
      const scale =
        Math.min(
          (host.current.clientWidth -
            (host.current.clientWidth > 800 ? 380 : 32)) /
            (maxX - minX),
          (host.current.clientHeight - 140) / (maxY - minY),
        ) * zoomRef.current;

      scene.scale.set(scale);
      scene.position.set(
        host.current.clientWidth / 2 +
          (host.current.clientWidth > 800 ? 170 : 0) -
          ((minX + maxX) / 2) * scale +
          offset.x,
        host.current.clientHeight / 2 - ((minY + maxY) / 2) * scale + offset.y,
      );
    };
    const terrain = new Sprite(Texture.from(terrainTexture(world)));
    const edges = boundaryEdges(world);
    scene.addChild(terrain);
    const overlay = new Container();
    scene.addChild(overlay);
    const render = () => {
      if (!ready || disposed) return;
      overlay.removeChildren().forEach((c) => c.destroy({ children: true }));
      const {
        world: w,
        selected: s,
        selectedArmy: chosenArmy,
      } = latest.current;
      position();
      const scale = scene.scale.x,
        detail = zoomRef.current >= 2.3,
        regional = zoomRef.current >= 1.45;
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
            fontSize: size / scale,
            fill: color,
            fontWeight: family === "Arial" ? "500" : "400",
            letterSpacing: family === "Georgia" ? 1.5 / scale : 0,
          },
        });
        t.resolution = Math.min(16, Math.max(2, scale * devicePixelRatio));
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
                  ? "#d8daca"
                  : r.owner === null
                    ? "#a3b295"
                    : w.nations[r.owner].color,
              alpha:
                r.terrain === "mountains"
                  ? 0.1
                  : r.owner === null
                    ? 0.001
                    : 0.24,
            });
          else shape.cut();
        }
        shape.eventMode = "static";
        shape.cursor = "grab";
        shape.on("pointertap", () => {
          if (!moved) latest.current.onSelect(r.id);
        });
        shape.on("pointerover", () => (shape.alpha = 0.6));
        shape.on("pointerout", () => (shape.alpha = 1));
        overlay.addChild(shape);
        if (activeSector.includes(r.id)) {
          const sector = new Graphics();
          for (const ring of rings)
            sector.poly(ring.flat()).fill({ color: "#edd8a3", alpha: 0.16 });
          overlay.addChild(sector);
        }
        if (r.id === s) {
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
        width: (detail ? 0.85 : 0.65) / scale,
        alpha: detail ? 0.48 : 0.32,
      });
      provinces.stroke({
        color: "#435744",
        width: 0.8 / scale,
        alpha: regional ? 0.5 : 0.27,
      });
      fronts.stroke({ color: "#e8d5a4", width: 1.65 / scale, alpha: 0.85 });
      overlay.addChild(lines, provinces, fronts);
      const occupied: {
        x: number;
        y: number;
        width: number;
        height: number;
      }[] = [];
      for (const a of w.armies) {
        const r = w.regions[a.region];
        if (!r) continue;
        const stack = w.armies.filter(
          (b) => b.region === a.region && b.id < a.id,
        ).length;
        occupied.push({
          x: r.x + (stack * 6 - 19) / scale,
          y: r.y - (26 + stack * 6) / scale,
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
          x: x - t.width / 2 - 5 / scale,
          y: y - t.height / 2,
          width: t.width + 10 / scale,
          height: t.height + 6 / scale,
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
      // Geographic names lead at continent scale; town names emerge on approach.
      if (!detail)
        for (const p of w.geography?.provinces ?? []) {
          placeLabel(
            text(
              p.name.toUpperCase(),
              p.center[0],
              p.center[1],
              regional ? 13 : 11,
              "#31493d",
              "Georgia",
            ),
            p.center[0],
            p.center[1],
          );
        }
      const labelCandidates = w.regions
        .filter((r) => detail || r.id === s)
        .sort((a, b) => Number(b.id === s) - Number(a.id === s));
      for (const r of labelCandidates) {
        const t = text(
          r.name,
          r.x,
          r.y,
          r.id === s ? 13 : 11,
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
      for (const n of w.nations) {
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
      for (const a of w.armies) {
        const r = w.regions[a.region];
        if (!r) continue;
        const selected = chosenArmy === a.id;
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
        const token = new Container();
        const stack = w.armies.filter(
          (b) => b.region === a.region && b.id < a.id,
        ).length;
        token.position.set(
          r.x + (stack * 6) / scale,
          r.y - 14 / scale - (stack * 6) / scale,
        );
        token.scale.set(1 / scale);
        const box = new Graphics();
        box
          .roundRect(-15, -8, 30, 16, 1.5)
          .fill(selected ? "#f2d696" : "#e8e1c8")
          .stroke({ color: w.nations[a.owner].color, width: 1.5 });
        box.rect(-11, -5, 9, 7).stroke({ color: "#344944", width: 1 });
        box
          .moveTo(-11, -5)
          .lineTo(-2, 2)
          .moveTo(-2, -5)
          .lineTo(-11, 2)
          .stroke({ color: "#344944", width: 0.8 });
        token.addChild(box);
        const strength = new Text({
          text: String(Math.round(a.strength)),
          style: {
            fontFamily: "Arial",
            fontSize: 8,
            fill: "#263c36",
            fontWeight: "600",
          },
        });
        strength.position.set(0, -5);
        strength.resolution = 2;
        token.addChild(strength);
        token.eventMode = "static";
        token.cursor = "grab";
        token.on("pointertap", () => {
          if (!moved) {
            if (latest.current.onSelectArmy) latest.current.onSelectArmy(a.id);
            else latest.current.onSelect(a.region);
          }
        });
        overlay.addChild(token);
      }
      if (w.geography) {
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
      zoomRef.current = Math.min(6, Math.max(0.35, next));
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
      pointerId = e.pointerId;
      dragging = true;
      moved = false;
      origin = last = { x: e.clientX, y: e.clientY };
      app.canvas.setPointerCapture(e.pointerId);
      app.canvas.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return;
      if (!moved && Math.hypot(e.clientX - origin.x, e.clientY - origin.y) < 5)
        return;
      moved = true;
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
        host.current!.appendChild(app.canvas);
        app.stage.addChild(ocean, scene);
        app.canvas.setAttribute(
          "aria-label",
          "Interactive continent. Use the region selector beside the map for keyboard access.",
        );
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
            ocean
              .clear()
              .rect(0, 0, host.current.clientWidth, host.current.clientHeight)
              .fill("#18363e");
            render();
          }
        });
        observer.observe(host.current!);
        app.canvas.addEventListener("pointerdown", down);
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
        app.canvas.addEventListener("wheel", wheel, { passive: false });
        app.canvas.addEventListener("contextmenu", contextMenu);
        render();
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (detailTimer) clearTimeout(detailTimer);
      cameraRef.current = () => {};
      drawRef.current = () => {};
      if (ready) {
        terrain.texture.destroy(true);
        app.destroy(true, { children: true });
      }
    };
  }, [world.id]);
  useEffect(() => {
    drawRef.current();
  }, [world, selected, selectedArmy]);
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
      <div className="map-tools">
        <button
          aria-label="Zoom out"
          onClick={() => cameraRef.current(zoomRef.current / 1.25)}
          disabled={zoom <= 0.35}
        >
          −
        </button>
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
          disabled={zoom >= 6}
        >
          +
        </button>
      </div>
    </div>
  );
}

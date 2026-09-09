import { useEffect, useRef, useState } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import type { World } from "../../../packages/game-core/src/index";
export function MapView({
  world,
  selected,
  onSelect,
  initialZoom = 2,
}: {
  world: World;
  selected: number | null;
  onSelect: (id: number) => void;
  initialZoom?: number;
}) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef({ world, selected, onSelect });
  latest.current = { world, selected, onSelect };
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
    let observer: ResizeObserver | undefined;
    let moved = false,
      pointerId: number | null = null,
      frame = 0;
    let origin = { x: 0, y: 0 };
    let dragging = false,
      last = { x: 0, y: 0 },
      offset = { x: 0, y: 0 };
    const position = () => {
      if (!host.current || !ready) return;
      const points = latest.current.world.regions.flatMap((r) => r.polygon);
      const minX = Math.min(...points.map((p) => p[0])),
        maxX = Math.max(...points.map((p) => p[0]));
      const minY = Math.min(...points.map((p) => p[1])),
        maxY = Math.max(...points.map((p) => p[1]));
      const scale =
        Math.min(
          (host.current.clientWidth - 50) / (maxX - minX),
          (host.current.clientHeight - 100) / (maxY - minY),
        ) * zoomRef.current;

      scene.scale.set(scale);
      scene.position.set(
        host.current.clientWidth / 2 - ((minX + maxX) / 2) * scale + offset.x,
        host.current.clientHeight / 2 - ((minY + maxY) / 2) * scale + offset.y,
      );
    };
    const render = () => {
      if (!ready || disposed) return;
      scene.removeChildren().forEach((c) => c.destroy({ children: true }));
      const { world: w, selected: s } = latest.current;
      position();
      const water = new Graphics();
      water.rect(-180, -160, 1380, 1000).fill("#18363e");
      scene.addChild(water);
      const grid = new Graphics();
      for (let x = 0; x < 1000; x += 100) grid.moveTo(x, -50).lineTo(x, 750);
      for (let y = 0; y < 700; y += 100) grid.moveTo(-50, y).lineTo(1050, y);
      grid.stroke({ color: "#335159", width: 0.65, alpha: 0.6 });
      scene.addChild(grid);
      const labels: { label: Text; id: number }[] = [];
      for (const r of w.regions) {
        const owned = r.owner !== null;
        const color = owned ? w.nations[r.owner!].color : "#9ca696";
        const shape = new Graphics();
        shape
          .poly(r.polygon.flat())
          .fill({ color, alpha: 0.93 })
          .stroke({
            color: "#203b3d",
            width: Math.min(1.15, 1.7 / scene.scale.x),
          });
        shape.eventMode = "static";
        shape.cursor = "grab";
        shape.on("pointertap", () => {
          if (!moved) latest.current.onSelect(r.id);
        });
        shape.on("pointerover", () => {
          shape.alpha = 0.8;
        });
        shape.on("pointerout", () => {
          shape.alpha = 1;
        });
        scene.addChild(shape);
        if (r.terrain === "highlands") {
          const m = new Graphics();
          m.moveTo(r.x - 10, r.y + 3)
            .lineTo(r.x - 3, r.y - 10)
            .lineTo(r.x + 5, r.y + 3)
            .moveTo(r.x, r.y + 3)
            .lineTo(r.x + 6, r.y - 6)
            .lineTo(r.x + 13, r.y + 3)
            .stroke({ color: "#203932", width: 1.2, alpha: 0.5 });
          scene.addChild(m);
        } else if (r.terrain === "forest") {
          const f = new Graphics();
          for (let i = -1; i < 2; i++)
            f.moveTo(r.x + i * 7 - 3, r.y)
              .lineTo(r.x + i * 7, r.y - 6)
              .lineTo(r.x + i * 7 + 3, r.y)
              .stroke({ color: "#203932", width: 1, alpha: 0.5 });
          scene.addChild(f);
        }
        if (r.building) {
          const b = new Graphics();
          b.rect(r.x + 14, r.y - 13, 5, 5).fill("#e7ddba");
          scene.addChild(b);
        }
        const label = new Text({
          text: r.name,
          style: {
            fontFamily: "Arial",
            fontSize: Math.min(9, 18 / scene.scale.x),
            fill: "#102a2d",
            fontWeight: "600",
          },
        });
        label.resolution = Math.min(
          16,
          Math.max(2, scene.scale.x * devicePixelRatio),
        );
        label.anchor.set(0.5);
        label.position.set(r.x, r.y + 11);
        label.eventMode = "none";
        label.visible = scene.scale.x >= 0.8 || r.id === s;
        if (r.id === s) label.scale.set(Math.max(1, 1 / scene.scale.x));
        labels.push({ label, id: r.id });
      }
      // Cull labels in map coordinates, preserving the selected region's priority.
      const counterScale = Math.max(
        0.8 / scene.scale.x,
        Math.min(1, 1.6 / scene.scale.x),
      );
      const occupied = w.armies.map((a) => {
        const r = w.regions[a.region];
        return {
          x: r.x - 22 * counterScale,
          y: r.y - 10 - 13 * counterScale,
          width: 44 * counterScale,
          height: 25 * counterScale,
        };
      });
      labels.sort((a, b) => Number(b.id === s) - Number(a.id === s));
      for (const { label } of labels) {
        if (!label.visible) {
          label.destroy();
          continue;
        }
        const box = {
          x: label.x - label.width / 2 - 2,
          y: label.y - label.height / 2 - 1,
          width: label.width + 4,
          height: label.height + 2,
        };
        if (
          occupied.some(
            (r) =>
              box.x < r.x + r.width &&
              box.x + box.width > r.x &&
              box.y < r.y + r.height &&
              box.y + box.height > r.y,
          )
        )
          label.destroy();
        else {
          occupied.push(box);
          scene.addChild(label);
        }
      }
      const fronts = new Graphics();
      for (const r of w.regions) {
        if (r.owner === null) continue;
        for (let i = 0; i < r.polygon.length - 1; i++) {
          const p = r.polygon[i],
            q = r.polygon[i + 1];
          const other = w.regions.find(
            (n) =>
              n.id !== r.id &&
              n.polygon.some(
                (t) =>
                  Math.abs(t[0] - p[0]) < 0.01 && Math.abs(t[1] - p[1]) < 0.01,
              ) &&
              n.polygon.some(
                (t) =>
                  Math.abs(t[0] - q[0]) < 0.01 && Math.abs(t[1] - q[1]) < 0.01,
              ),
          );
          if (!other || other.owner !== r.owner)
            fronts.moveTo(p[0], p[1]).lineTo(q[0], q[1]);
        }
      }
      fronts.stroke({
        color: "#e8dfbf",
        width: Math.min(2, 3 / scene.scale.x),
        alpha: 0.75,
      });
      scene.addChild(fronts);
      if (s !== null && w.regions[s]) {
        const outline = new Graphics();
        outline
          .poly(w.regions[s].polygon.flat())
          .stroke({
            color: "#fff3bf",
            width: Math.min(3.5, 4 / scene.scale.x),
          });
        scene.addChild(outline);
      }
      for (const a of w.armies) {
        const r = w.regions[a.region];
        if (a.order === "advance" && a.target !== null) {
          const t = w.regions[a.target];
          const line = new Graphics();
          line
            .moveTo(r.x, r.y)
            .lineTo(t.x, t.y)
            .stroke({ color: "#f6e5aa", width: 2, alpha: 0.85 });
          const angle = Math.atan2(t.y - r.y, t.x - r.x);
          line
            .moveTo(
              t.x - Math.cos(angle - 0.45) * 10,
              t.y - Math.sin(angle - 0.45) * 10,
            )
            .lineTo(t.x, t.y)
            .lineTo(
              t.x - Math.cos(angle + 0.45) * 10,
              t.y - Math.sin(angle + 0.45) * 10,
            )
            .stroke({ color: "#f6e5aa", width: 2 });
          scene.addChild(line);
        }
        const token = new Container();
        token.position.set(r.x, r.y - 10);
        const box = new Graphics();
        box
          .roundRect(-21, -12, 42, 23, 2)
          .fill("#f1e6c9")
          .stroke({ color: "#193136", width: 1.6 });
        box
          .rect(-17, -8, 12, 9)
          .stroke({ color: w.nations[a.owner].color, width: 1.4 });
        box
          .moveTo(-17, -8)
          .lineTo(-5, 1)
          .moveTo(-5, -8)
          .lineTo(-17, 1)
          .stroke({ color: w.nations[a.owner].color, width: 1.1 });
        token.addChild(box);
        const strength = new Text({
          text: Math.round(a.strength).toString(),
          style: {
            fontFamily: "Arial",
            fontSize: 10,
            fontWeight: "bold",
            fill: "#173139",
          },
        });
        strength.resolution = Math.max(2, devicePixelRatio * 1.6);
        strength.position.set(-1, -7);
        token.addChild(strength);
        token.scale.set(
          Math.max(0.8 / scene.scale.x, Math.min(1, 1.6 / scene.scale.x)),
        );
        token.eventMode = "static";
        token.cursor = "grab";
        token.on("pointertap", () => {
          if (!moved) latest.current.onSelect(r.id);
        });
        scene.addChild(token);
      }
      const sea = new Text({
        text: "T H E   P A L E   S E A",
        style: {
          fontFamily: "Georgia",
          fontSize: 17,
          fontStyle: "italic",
          fill: "#809ba1",
        },
      });
      sea.position.set(64, 620);
      sea.alpha = 0.65;
      scene.addChild(sea);
      position();
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
      zoomRef.current = Math.min(6, Math.max(1, next));
      if (reset) offset = { x: 0, y: 0 };
      position();
      if (!reset) {
        offset.x += point.x - (worldPoint.x * scene.scale.x + scene.x);
        offset.y += point.y - (worldPoint.y * scene.scale.y + scene.y);
        position();
      }
      setZoom(zoomRef.current);
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          render();
        });
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
        app.stage.addChild(scene);
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
      if (frame) cancelAnimationFrame(frame);
      cameraRef.current = () => {};
      drawRef.current = () => {};
      if (ready) app.destroy(true, { children: true });
    };
  }, []);
  useEffect(() => {
    drawRef.current();
  }, [world, selected]);
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
          disabled={zoom <= 1}
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

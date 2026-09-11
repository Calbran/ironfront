import * as T from "three";

export function markerProjection(
  world: T.Vector3,
  camera: T.Camera,
  width: number,
  height: number,
  kind = "infantry",
) {
  const view = world.clone().applyMatrix4(camera.matrixWorldInverse);
  const ndc = world.clone().project(camera);
  const pixelsPerUnit =
    (Math.abs(camera.projectionMatrix.elements[5]) * height) /
    2 /
    (camera instanceof T.PerspectiveCamera ? Math.max(0.001, -view.z) : 1);
  // Airships retain their much larger silhouette at ten times the ground-unit range.
  const iconStart = kind === "airship" ? 0.6 : 6;
  const opacity = T.MathUtils.smoothstep(
    iconStart - pixelsPerUnit,
    0,
    iconStart / 2,
  );
  return {
    x: ((ndc.x + 1) * width) / 2,
    y: ((1 - ndc.y) * height) / 2,
    opacity,
    hideModel: opacity >= 1,
    visible:
      view.z < 0 &&
      ndc.z >= -1 &&
      ndc.z <= 1 &&
      Math.abs(ndc.x) < 1 &&
      Math.abs(ndc.y) < 1,
  };
}

/** Stable ID order spreads nearby badges without losing their ground anchors. */
export function markerPosition(
  x: number,
  y: number,
  placed: { x: number; y: number }[],
  width: number,
  height: number,
) {
  const clamp = (v: number, max: number) => Math.max(20, Math.min(max - 20, v));
  for (let row = 0; row < 20; row++) {
    for (const col of [0, -1, 1, -2, 2]) {
      const p = {
        x: clamp(x + col * 38, width),
        y: clamp(y - 26 - row * 36, height),
      };
      if (
        !placed.some(
          (q) => Math.abs(q.x - p.x) < 36 && Math.abs(q.y - p.y) < 34,
        )
      )
        return p;
    }
  }
  return { x: clamp(x, width), y: clamp(y - 26, height) };
}

type Unit = {
  id: number;
  x: number;
  z: number;
  kind: string;
  vehicleType?: string;
  friendly?: boolean;
  health?: number;
  visible?: boolean;
};
export function cityUnitMarkers(
  canvas: HTMLCanvasElement,
  units: Unit[],
  select: (id: number, add: boolean) => void,
  focus: (unit: Unit) => void,
  overlayRoot: HTMLElement = canvas.parentElement!,
) {
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "absolute",
    inset: "0",
    overflow: "hidden",
    pointerEvents: "none",
  });
  overlay.setAttribute("aria-label", "City unit markers");
  overlayRoot.append(overlay);
  const entries = units.map((unit) => {
    const button = document.createElement("button"),
      stem = document.createElement("div");
    const kind =
      unit.kind === "infantry"
        ? "Infantry"
        : unit.kind === "airship"
          ? "Airship"
          : unit.vehicleType === "jeep"
            ? "Jeep"
            : "Tank";
    const symbol =
      kind === "Infantry"
        ? '<path d="M5 5h14v14H5zM5 5l14 14M19 5L5 19"/>'
        : kind === "Tank"
          ? '<rect x="3" y="7" width="18" height="11" rx="5"/><path d="M9 12h6m-3 0V3"/>'
          : kind === "Airship"
            ? '<path d="M4 12c2-5 14-5 16 0-2 5-14 5-16 0zm8-5v10m-3-1h6"/>'
            : '<path d="M4 15V8h12l4 7H4zM8 8V4h7v4"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>';
    button.innerHTML = `<svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">${symbol}</svg>`;
    button.setAttribute("aria-label", `${kind} ${unit.id} map marker`);
    button.title = `${kind} ${unit.id} — click to select; double-click to focus`;
    Object.assign(button.style, {
      position: "absolute",
      width: "30px",
      height: "30px",
      padding: "3px",
      borderRadius: "7px",
      pointerEvents: "auto",
      boxShadow: "0 2px 5px #0009",
      transform: "translate(-50%,-50%)",
    });
    Object.assign(stem.style, {
      position: "absolute",
      height: "1px",
      background: "#a7d6cf",
      transformOrigin: "0 0",
      pointerEvents: "none",
    });
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      select(unit.id, e.shiftKey);
    });
    button.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      focus(unit);
    });
    overlay.append(stem, button);
    return { unit, button, stem };
  });
  return {
    update(
      camera: T.Camera,
      root: T.Object3D,
      heightAt: (u: Unit) => number,
      selected: number[],
    ) {
      camera.updateMatrixWorld();
      root.updateWorldMatrix(true, false);
      const width = canvas.clientWidth,
        height = canvas.clientHeight,
        placed: { x: number; y: number }[] = [],
        iconIds = new Set<number>();
      for (const { unit, button, stem } of entries) {
        const world = root.localToWorld(
          new T.Vector3(unit.x, heightAt(unit) + 0.7, unit.z),
        );
        const p = markerProjection(world, camera, width, height, unit.kind);
        const show =
          unit.visible !== false &&
          p.visible &&
          p.opacity > 0.05 &&
          (unit.health ?? 100) > 0;
        button.hidden = !show;
        stem.hidden = !show;
        if (!show) continue;
        if (p.hideModel) iconIds.add(unit.id);
        const pos = markerPosition(p.x, p.y, placed, width, height);
        placed.push(pos);
        const active = selected.includes(unit.id),
          color = active
            ? "#ffdc69"
            : unit.friendly === false
              ? "#f16b59"
              : "#ace2db";
        button.setAttribute("aria-pressed", String(active));
        Object.assign(button.style, {
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          opacity: String(p.opacity),
          color,
          background: active ? "#514524" : "#1b3435",
          border: `1px solid ${color}`,
        });
        const dx = p.x - pos.x,
          dy = p.y - pos.y;
        Object.assign(stem.style, {
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          width: `${Math.hypot(dx, dy)}px`,
          opacity: String(p.opacity * 0.65),
          transform: `rotate(${Math.atan2(dy, dx)}rad)`,
        });
      }
      return iconIds;
    },
    dispose() {
      overlay.remove();
    },
  };
}

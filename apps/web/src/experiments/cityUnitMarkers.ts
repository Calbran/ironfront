import * as T from "three";

export const GROUND_UNIT_MODEL_CULL_PIXELS = 1.25;
export const AIRSHIP_MODEL_CULL_PIXELS = GROUND_UNIT_MODEL_CULL_PIXELS / 10;
export const AIRSHIP_MARKER_START_PIXELS = 3;

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
  // Show the airship badge at an ordinary tactical zoom even though its much
  // larger model remains readable, then retain that model to strategic range.
  const iconStart = kind === "airship" ? AIRSHIP_MARKER_START_PIXELS : 6;
  const modelCullPixels =
    kind === "airship"
      ? AIRSHIP_MODEL_CULL_PIXELS
      : GROUND_UNIT_MODEL_CULL_PIXELS;
  const opacity = T.MathUtils.smoothstep(
    iconStart - pixelsPerUnit,
    0,
    iconStart / 2,
  );
  return {
    x: ((ndc.x + 1) * width) / 2,
    y: ((1 - ndc.y) * height) / 2,
    opacity,
    // Keep geometry under the fully visible badge until its silhouette is
    // genuinely subpixel. City and country have small tactical rosters.
    hideModel: pixelsPerUnit <= modelCullPixels,
    strategic: pixelsPerUnit < 0.025,
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
  options: {
    cluster?: boolean;
    selectGroup?: (ids: number[], add: boolean) => void;
  } = {},
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
    const count = document.createElement("span");
    Object.assign(count.style, {
      position: "absolute",
      right: "-7px",
      top: "-7px",
      background: "#183335",
      border: "1px solid currentColor",
      borderRadius: "9px",
      fontSize: "10px",
      padding: "1px 4px",
    });
    let group = [unit.id];
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
            ? '<path d="M2.5 11.5C4.4 6.8 14.6 5.8 19.4 9.2L22 7.4v8.2l-2.6-1.8c-4.8 3.4-15 2.4-16.9-2.3Z"/><path d="M6.8 15.2v1.5h8.4v-1.5M8.2 16.7v1.7h5.6v-1.7M6 11.5h13.7"/>'
            : '<path d="M4 15V8h12l4 7H4zM8 8V4h7v4"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>';
    button.innerHTML = `<svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">${symbol}</svg>`;
    button.append(count);
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
      if (group.length > 1 && options.selectGroup)
        options.selectGroup(group, e.shiftKey);
      else select(unit.id, e.shiftKey);
    });
    button.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      focus(unit);
    });
    overlay.append(stem, button);
    return {
      unit,
      button,
      stem,
      count,
      setGroup: (ids: number[]) => {
        group = ids;
      },
    };
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
      const clustered = new Set<number>();
      for (const { unit, button, stem, count, setGroup } of entries) {
        const world = root.localToWorld(
          new T.Vector3(unit.x, heightAt(unit) + 0.7, unit.z),
        );
        const p = markerProjection(world, camera, width, height, unit.kind);
        const show =
          unit.visible !== false &&
          p.visible &&
          p.opacity > 0.05 &&
          (unit.health ?? 100) > 0 &&
          !clustered.has(unit.id);
        button.hidden = !show;
        stem.hidden = !show;
        if (!show) continue;
        clustered.add(unit.id);
        const group = [unit.id];
        if (options.cluster && p.strategic && !selected.includes(unit.id)) {
          for (const candidate of entries) {
            const other = candidate.unit;
            if (
              other.id === unit.id ||
              clustered.has(other.id) ||
              selected.includes(other.id) ||
              other.friendly !== unit.friendly ||
              other.visible === false ||
              (other.health ?? 100) <= 0
            )
              continue;
            const q = markerProjection(
              root.localToWorld(
                new T.Vector3(other.x, heightAt(other) + 0.7, other.z),
              ),
              camera,
              width,
              height,
              other.kind,
            );
            if (q.visible && Math.hypot(q.x - p.x, q.y - p.y) < 32) {
              group.push(other.id);
              clustered.add(other.id);
              candidate.button.hidden = candidate.stem.hidden = true;
              iconIds.add(other.id);
            }
          }
        }
        setGroup(group);
        count.hidden = group.length === 1;
        count.textContent = String(group.length);
        button.title =
          group.length > 1
            ? `${unit.friendly === false ? "Visible enemy" : "Allied"} formations: ${group.length} — double-click to focus`
            : `${unit.kind} ${unit.id} — click to select; double-click to focus`;
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

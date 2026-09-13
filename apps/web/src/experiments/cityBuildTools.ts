import {createEmplacementModel,disposeEmplacementModel} from "./emplacementModels";
import * as T from "three";
import {
  CITY_BUILD_ITEMS,
  validateCityBuild,
  type CityBuildKind,
  type CityBuildPlacement,
} from "../../../../packages/game-core/src/cityBuildPlacement";
import type { createCityTactics } from "../../../../packages/game-core/src/cityTactics";
import type { TrialUnit } from "../../../../packages/game-core/src/cityUnitTrial";
import "./cityBuildTools.css";
export function cityBuildTools(
  canvas: HTMLCanvasElement,
  layer: T.Group,
  tactics: ReturnType<typeof createCityTactics>,
  ground: (e: PointerEvent) => { x: number; z: number } | undefined,
  units: TrialUnit[],
  server: {
    buildSandbags: (p: {
      x: number;
      z: number;
      angle: number;
    }) => Promise<string>;
    removeSandbags: (id: number) => Promise<string>;
  },
  overlayRoot: HTMLElement = canvas.parentElement!,
) {
  const panel = document.createElement("section");
  panel.className = "city-build";
  panel.setAttribute("aria-label", "Construction");
  const toggle = document.createElement("button");
  toggle.className = "build-toggle";
  toggle.textContent = "＋ Build";
  toggle.setAttribute("aria-expanded", "false");
  const menu = document.createElement("div");
  menu.className = "build-menu";
  menu.hidden = true;
  const title = document.createElement("strong");
  title.textContent = "FIELD CONSTRUCTION";
  const note = document.createElement("p");
  note.textContent =
    "Sandbags provide cover and tanks can crush them. Other items are visual prototypes. Free placement in this battle.";
  const grid = document.createElement("div");
  grid.className = "build-grid";
  const controls = document.createElement("div");
  controls.className = "build-actions";
  const rotate = document.createElement("button");
  rotate.textContent = "Rotate ↻ (R)";
  const cancel = document.createElement("button");
  cancel.textContent = "Cancel";
  const undo = document.createElement("button");
  undo.textContent = "Undo last";
  const status = document.createElement("p");
  status.className = "build-status";
  status.setAttribute("role", "status");
  status.textContent = "Choose an emplacement.";
  const hint = document.createElement("p");
  hint.textContent =
    "Click ground to place · R rotates · right-click or Esc cancels";
  controls.append(rotate, cancel, undo);
  menu.append(title, note, grid, controls, hint);
  panel.append(toggle, status, menu);
  overlayRoot.append(panel);
  let kind: CityBuildKind | undefined,
    angle = 0,
    ghost: T.Group | undefined,
    position: { x: number; z: number } | undefined,
    lastPreview = 0;
  const placed: { data: CityBuildPlacement; object: T.Group; id?: number }[] =
      [],
    buttons = new Map<CityBuildKind, HTMLButtonElement>();
  const updateButtons = () => {
    buttons.forEach((b, k) =>
      b.setAttribute("aria-pressed", String(kind === k)),
    );
    rotate.disabled = cancel.disabled = !kind;
    undo.disabled = !placed.length;
  };
  function clear() {
    kind = undefined;
    if (ghost) disposeEmplacementModel(ghost);
    ghost = undefined;
    position = undefined;
    updateButtons();
  }
  function preview() {
    if (!kind || !ghost || !position) return;
    const data = { ...position, kind, angle },
      reason = validateCityBuild(
        data,
        placed.map((p) => p.data),
        (p) => tactics.walkable(p),
        (p) => tactics.surfaceHeight(p),
        units.filter((u) => u.health > 0 && u.visible !== false),
      );
    ghost.position.set(position.x, tactics.surfaceHeight(position), position.z);
    ghost.rotation.y = angle;
    ghost.visible = true;
    ghost.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.Line) {
        const m = o.material as T.MeshStandardMaterial;
        m.transparent = true;
        m.opacity = 0.55;
        m.depthWrite = false;
        m.color.set(reason ? 0xdf705e : 0x93d9b1);
      }
    });
    status.textContent =
      reason || CITY_BUILD_ITEMS[kind].name + " ready · click ground to place.";
    return reason;
  }
  for (const [key, item] of Object.entries(CITY_BUILD_ITEMS)) {
    const k = key as CityBuildKind,
      b = document.createElement("button");
    b.textContent = item.name;
    const small = document.createElement("small");
    small.textContent = item.description;
    b.append(small);
    b.onclick = () => {
      clear();
      kind = k;
      ghost = createEmplacementModel(k);
      ghost.visible = false;
      layer.add(ghost);
      status.textContent = "Place " + item.name + " · R rotates · Esc cancels";
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      updateButtons();
    };
    buttons.set(k, b);
    grid.append(b);
  }
  toggle.onclick = () => {
    menu.hidden = !menu.hidden;
    toggle.setAttribute("aria-expanded", String(!menu.hidden));
    if (menu.hidden) clear();
  };
  rotate.onclick = () => {
    angle += Math.PI / 4;
    preview();
  };
  cancel.onclick = () => {
    clear();
    status.textContent = "Placement cancelled.";
  };
  undo.onclick = () => {
    const last = placed.at(-1);
    if (last?.id !== undefined) {
      void server.removeSandbags(last.id).then((message) => {
        status.textContent = message;
      });
      status.textContent = "Removing sandbags…";
      return;
    }
    placed.pop();
    if (last) disposeEmplacementModel(last.object);
    status.textContent =
      "Removed last emplacement. " + placed.length + " placed.";
    updateButtons();
    preview();
  };
  const move = (e: PointerEvent) => {
    if (!kind || e.target !== canvas) return;
    position = ground(e);
    if (!position) {
      if (ghost) ghost.visible = false;
      return;
    }
    const now = performance.now();
    if (now - lastPreview < 50) return;
    lastPreview = now;
    preview();
  };
  const down = (e: PointerEvent) => {
    if (!kind || e.target !== canvas || ![0, 2].includes(e.button)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.button === 2) {
      clear();
      status.textContent = "Placement cancelled.";
      return;
    }
    position = ground(e);
    if (!position) return;
    const reason = preview();
    if (reason) return;
    const data = { ...position, kind, angle };
    if (kind === "sandbags") {
      void server.buildSandbags(data).then((message) => {
        status.textContent = message;
      });
      clear();
      status.textContent = "Sending sandbag placement…";
      return;
    }
    const object = createEmplacementModel(kind);
    object.position.set(
      position.x,
      tactics.surfaceHeight(position),
      position.z,
    );
    object.rotation.y = angle;
    layer.add(object);
    placed.push({ data, object });
    clear();
    status.textContent =
      CITY_BUILD_ITEMS[data.kind].name +
      " placed · " +
      placed.length +
      " total.";
    updateButtons();
  };
  let consumed = false;
  const captureDown = (e: PointerEvent) => {
    consumed = !!kind && e.target === canvas && [0, 2].includes(e.button);
    down(e);
  };
  const up = (e: PointerEvent) => {
    if (consumed) {
      e.preventDefault();
      e.stopImmediatePropagation();
      consumed = false;
    }
  };
  const key = (e: KeyboardEvent) => {
    if (
      !kind ||
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;
    if (e.key === "Escape" || e.key.toLowerCase() === "r") {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === "Escape") {
        clear();
        status.textContent = "Placement cancelled.";
      } else {
        angle += Math.PI / 4;
        preview();
      }
    }
  };
  window.addEventListener("pointerdown", captureDown, true);
  window.addEventListener("pointerup", up, true);
  window.addEventListener("pointermove", move, true);
  window.addEventListener("keydown", key, true);
  updateButtons();
  let signature = "";
  return {
    sync(
      items: { id: number; x: number; z: number; angle: number }[],
      message: string,
    ) {
      const next = JSON.stringify(items);
      if (next === signature) {
        if (
          status.textContent?.startsWith("Sending") ||
          status.textContent?.startsWith("Removing")
        )
          status.textContent = message;
        return;
      }
      signature = next;
      for (let i = placed.length - 1; i >= 0; i--)
        if (
          placed[i].id !== undefined &&
          !items.some((p) => p.id === placed[i].id)
        ) {
          disposeEmplacementModel(placed[i].object);
          placed.splice(i, 1);
        }
      for (const p of items)
        if (!placed.some((q) => q.id === p.id)) {
          const object = createEmplacementModel("sandbags");
          object.position.set(p.x, tactics.surfaceHeight(p), p.z);
          object.rotation.y = p.angle;
          layer.add(object);
          placed.push({ data: { ...p, kind: "sandbags" }, object, id: p.id });
        }
      if (!kind) status.textContent = message;
      updateButtons();
    },
    dispose() {
      clear();
      placed.forEach((p) => disposeEmplacementModel(p.object));
      panel.remove();
      window.removeEventListener("pointerdown", captureDown, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("keydown", key, true);
    },
  };
}

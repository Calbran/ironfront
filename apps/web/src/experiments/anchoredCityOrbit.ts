import * as T from "three";
import { rotateCityOrbit } from "./cityOrbitPivot";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
/** Orbit the terrain under the cursor, never building geometry. */
export function anchoredCityOrbit(
  canvas: HTMLCanvasElement,
  getCamera: () => T.Camera,
  controls: OrbitControls,
  root: () => T.Group,
  height: (p: { x: number; z: number }) => number,
  selected: () => boolean,
  order: (p: { x: number; z: number }, facing?: number) => void,
  preview: (p: { x: number; z: number }, facing?: number) => void,
  clearPreview: () => void,
) {
  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  Object.assign(arrow.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "1001",
    display: "none",
  });
  const shaft = document.createElementNS(arrow.namespaceURI, "path");
  shaft.setAttribute("stroke", "#ffdc69");
  shaft.setAttribute("stroke-width", "3");
  shaft.setAttribute("fill", "none");
  arrow.append(shaft);
  document.body.append(arrow);
  const raycaster = new T.Raycaster();
  let drag:
    | {
        x: number;
        y: number;
        lastX: number;
        lastY: number;
        anchor: T.Vector3;
        dragged: boolean;
        pointer: number;
        command: boolean;
      }
    | undefined;
  let lastAnchor: T.Vector3 | undefined;
  const aim = (e: PointerEvent) => {
    const camera = getCamera();
    camera.updateMatrixWorld(true);
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new T.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((e.clientY - rect.top) / rect.height) * 2,
      ),
      camera,
    );
  };
  const ground = (e: PointerEvent) => {
    aim(e);
    const g = root();
    g.updateMatrixWorld(true);
    const ray = raycaster.ray
        .clone()
        .applyMatrix4(g.matrixWorld.clone().invert()),
      p = new T.Vector3();
    let y = 2;
    for (let i = 0; i < 10; i++) {
      if (!ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -y), p))
        return;
      y = height({ x: p.x, z: p.z });
    }
    return g.localToWorld(p);
  };
  const down = (e: PointerEvent) => {
    const command = e.button === 2 && selected();
    const orbit = e.button === 1;
    if (!command && !orbit) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    const floor = ground(e);
    const anchor = command ? floor : floor ?? controls.target.clone();
    if (!anchor) return;
    drag = {
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      anchor,
      dragged: false,
      pointer: e.pointerId,
      command,
    };
    if (drag.command) {
      const p = root().worldToLocal(anchor.clone());
      preview({ x: p.x, z: p.z });
    }
    if (!command) lastAnchor = anchor.clone();
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!drag) return;
    e.stopImmediatePropagation();
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 5)
      drag.dragged = true;
    if (!drag.dragged) return;
    if (drag.command) {
      const a = root().worldToLocal(drag.anchor.clone()),
        b = ground(e);
      if (b) {
        root().worldToLocal(b);
        preview({ x: a.x, z: a.z }, Math.atan2(b.x - a.x, b.z - a.z));
      }
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y,
        d = Math.hypot(dx, dy) || 1,
        nx = dx / d,
        ny = dy / d;
      shaft.setAttribute(
        "d",
        `M ${drag.x} ${drag.y} L ${e.clientX} ${e.clientY} M ${e.clientX - nx * 13 - ny * 7} ${e.clientY - ny * 13 + nx * 7} L ${e.clientX} ${e.clientY} L ${e.clientX - nx * 13 + ny * 7} ${e.clientY - ny * 13 - nx * 7}`,
      );
      arrow.style.display = "block";
      return;
    }
    const yaw = -(e.clientX - drag.lastX) * 0.005,
      requestedPitch = -(e.clientY - drag.lastY) * 0.005;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    rotateCityOrbit(getCamera(), controls.target, drag.anchor, yaw, requestedPitch, controls.minPolarAngle, controls.maxPolarAngle);
    controls.update();
  };
  const cancel = () => {
    if (drag && canvas.hasPointerCapture(drag.pointer))
      canvas.releasePointerCapture(drag.pointer);
    drag = undefined;
    arrow.style.display = "none";
    clearPreview();
  };
  const up = (e: PointerEvent) => {
    if (!drag) return;
    e.stopImmediatePropagation();
    const command = drag.command,
      dragged = drag.dragged;
    const start = root().worldToLocal(drag.anchor.clone()),
      finish = dragged ? ground(e) : undefined;
    const end = finish ? root().worldToLocal(finish) : undefined;
    const facing =
      end && Math.hypot(end.x - start.x, end.z - start.z) > 0.05
        ? Math.atan2(end.x - start.x, end.z - start.z)
        : undefined;
    cancel();
    if (command) order({ x: start.x, z: start.z }, facing);
  };
  const context = (e: Event) => e.preventDefault();
  canvas.addEventListener("pointerdown", down, true);
  canvas.addEventListener("pointermove", move, true);
  canvas.addEventListener("pointerup", up, true);
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("contextmenu", context);
  window.addEventListener("blur", cancel);
  return {
    cancel,
    anchor: () => lastAnchor?.toArray(),
    dispose() {
      cancel();
      arrow.remove();
      canvas.removeEventListener("pointerdown", down, true);
      canvas.removeEventListener("pointermove", move, true);
      canvas.removeEventListener("pointerup", up, true);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("contextmenu", context);
      window.removeEventListener("blur", cancel);
    },
  };
}

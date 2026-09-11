export type TacticalScreenUnit = {
  id: number;
  x: number;
  y: number;
  visible?: boolean;
};

/** Canonical left-click and marquee selection shared by tactical previews. */
export function tacticalSelection(
  canvas: HTMLCanvasElement,
  options: {
    units: () => TacticalScreenUnit[];
    box: (ids: number[], add: boolean) => void;
    click: (id: number | undefined, add: boolean) => void;
    clear: () => void;
    radius?: number;
  },
) {
  const marquee = document.createElement("div");
  Object.assign(marquee.style, {
    position: "fixed",
    pointerEvents: "none",
    border: "1px solid #ffdc69",
    background: "rgba(255,220,105,.12)",
    display: "none",
    zIndex: "1000",
  });
  document.body.append(marquee);
  let drag:
    | {
        x: number;
        y: number;
        pointer: number;
        shifted: boolean;
        moved: boolean;
      }
    | undefined;
  const cancel = () => {
    if (drag && canvas.hasPointerCapture(drag.pointer))
      canvas.releasePointerCapture(drag.pointer);
    drag = undefined;
    marquee.style.display = "none";
  };
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || event.altKey) return;
    event.stopImmediatePropagation();
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    drag = {
      x: event.clientX,
      y: event.clientY,
      pointer: event.pointerId,
      shifted: event.shiftKey,
      moved: false,
    };
    canvas.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    event.stopImmediatePropagation();
    drag.moved ||=
      Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5;
    if (!drag.moved) return;
    Object.assign(marquee.style, {
      display: "block",
      left: `${Math.min(drag.x, event.clientX)}px`,
      top: `${Math.min(drag.y, event.clientY)}px`,
      width: `${Math.abs(event.clientX - drag.x)}px`,
      height: `${Math.abs(event.clientY - drag.y)}px`,
    });
  };
  const up = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    event.stopImmediatePropagation();
    const start = drag,
      units = options.units().filter((unit) => unit.visible !== false);
    cancel();
    if (start.moved) {
      const left = Math.min(start.x, event.clientX),
        right = Math.max(start.x, event.clientX),
        top = Math.min(start.y, event.clientY),
        bottom = Math.max(start.y, event.clientY);
      options.box(
        units
          .filter(
            (unit) =>
              unit.x >= left &&
              unit.x <= right &&
              unit.y >= top &&
              unit.y <= bottom,
          )
          .map((unit) => unit.id),
        start.shifted,
      );
      return;
    }
    const hit = units
      .map((unit) => ({
        ...unit,
        distance: Math.hypot(unit.x - event.clientX, unit.y - event.clientY),
      }))
      .filter((unit) => unit.distance < (options.radius ?? 18))
      .sort((a, b) => a.distance - b.distance)[0];
    options.click(hit?.id, start.shifted);
  };
  const key = (event: KeyboardEvent) => {
    if (
      event.key === "Escape" &&
      !(
        event.target instanceof HTMLElement &&
        event.target.closest("input,textarea,select")
      )
    ) {
      cancel();
      options.clear();
    }
  };
  canvas.addEventListener("pointerdown", down, true);
  canvas.addEventListener("pointermove", move, true);
  canvas.addEventListener("pointerup", up, true);
  canvas.addEventListener("pointercancel", cancel);
  window.addEventListener("keydown", key);
  window.addEventListener("blur", cancel);
  return {
    cancel,
    dispose() {
      cancel();
      marquee.remove();
      canvas.removeEventListener("pointerdown", down, true);
      canvas.removeEventListener("pointermove", move, true);
      canvas.removeEventListener("pointerup", up, true);
      canvas.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
      window.removeEventListener("blur", cancel);
    },
  };
}

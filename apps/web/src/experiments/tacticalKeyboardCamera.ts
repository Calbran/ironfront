import * as T from "three";

/** Canonical WASD pan and Q/E orbit keyboard controls for tactical views. */
export function tacticalKeyboardCamera(
  getCamera: () => T.Camera,
  target: T.Vector3,
  rotate: (yaw: number) => void,
  speed: () => number,
  enabled = true,
) {
  const keys = new Set<string>(),
    forward = new T.Vector3(),
    right = new T.Vector3(),
    movement = new T.Vector3(),
    up = new T.Vector3(0, 1, 0);
  const typing = (eventTarget: EventTarget | null) =>
    eventTarget instanceof HTMLElement &&
    (eventTarget.isContentEditable ||
      !!eventTarget.closest(
        'textarea,select,input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"])',
      ));
  const down = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (
      !"wasdqe".includes(key) ||
      key.length !== 1 ||
      typing(event.target) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    keys.add(key);
    event.preventDefault();
  };
  const keyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
  const clear = () => keys.clear();
  if (enabled) {
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clear);
    window.addEventListener("focusin", clear);
  }
  return {
    update(dt: number) {
      const yaw = (Number(keys.has("q")) - Number(keys.has("e"))) * dt * 1.1;
      if (yaw) rotate(yaw);
      const camera = getCamera();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      right.crossVectors(forward, up).normalize();
      movement
        .copy(forward)
        .multiplyScalar(Number(keys.has("w")) - Number(keys.has("s")))
        .addScaledVector(right, Number(keys.has("d")) - Number(keys.has("a")));
      if (!movement.lengthSq()) return;
      movement.normalize().multiplyScalar(speed() * dt);
      camera.position.add(movement);
      target.add(movement);
    },
    dispose() {
      clear();
      if (!enabled) return;
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clear);
      window.removeEventListener("focusin", clear);
    },
  };
}

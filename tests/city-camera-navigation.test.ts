import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { anchoredCityOrbit } from "../apps/web/src/experiments/anchoredCityOrbit";

function harness() {
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const element = () => ({
    style: {},
    setAttribute() {},
    append() {},
    remove() {},
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElementNS: element, body: { append() {} } },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { addEventListener() {}, removeEventListener() {} },
  });
  const handlers = new Map<string, Function>();
  const canvas = {
    clientHeight: 600,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    addEventListener: (name: string, fn: Function) => handlers.set(name, fn),
    removeEventListener: (name: string) => handlers.delete(name),
    setPointerCapture() {},
    releasePointerCapture() {},
    hasPointerCapture: () => false,
  };
  const camera = new T.OrthographicCamera(-40, 40, 30, -30, 0.1, 1000);
  const target = new T.Vector3();
  camera.position.set(40, 80, 40);
  const controls = {
    target,
    minZoom: 0.45,
    maxZoom: 12,
    minPolarAngle: T.MathUtils.degToRad(15),
    maxPolarAngle: T.MathUtils.degToRad(50),
    update() {
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
    },
  };
  controls.update();
  const orders: any[] = [];
  const root = new T.Group();
  const roof = new T.Mesh(new T.BoxGeometry(200, 2, 200));
  roof.position.y = 20;
  root.add(roof);
  const nav = anchoredCityOrbit(
    canvas as any,
    () => camera,
    controls as any,
    () => root,
    () => 0,
    () => true,
    (...order) => orders.push(order),
    () => {},
    () => {},
  );
  return {
    anchor: nav.anchor,
    camera,
    target,
    handlers,
    orders,
    controls,
    send(name: string, extra: Record<string, unknown> = {}) {
      handlers.get(name)!({
        clientX: 400,
        clientY: 300,
        button: 1,
        pointerId: 1,
        shiftKey: false,
        altKey: false,
        deltaMode: 0,
        deltaY: 0,
        stopImmediatePropagation() {},
        preventDefault() {},
        ...extra,
      });
    },
    close() {
      nav.dispose();
      for (const [name, descriptor] of [
        ["document", oldDocument],
        ["window", oldWindow],
      ] as const) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete (globalThis as any)[name];
      }
    },
  };
}
test("planning wheel zoom keeps the pointed-at ground position fixed, including zoom limits", () => {
  const h = harness();
  try {
    const ndc = new T.Vector2(0.6, -0.2),
      ray = new T.Raycaster();
    ray.setFromCamera(ndc, h.camera);
    const point = ray.ray.intersectPlane(
      new T.Plane(new T.Vector3(0, 1, 0), 0),
      new T.Vector3(),
    )!;
    const height = h.camera.position.y;
    for (let i = 0; i < 40; i++)
      h.send("wheel", { clientX: 640, clientY: 360, deltaY: 300 });
    const after = point.clone().project(h.camera);
    assert.ok(Math.hypot(after.x - ndc.x, after.y - ndc.y) < 1e-8);
    assert.equal(h.camera.zoom, 12);
    assert.equal(h.camera.position.y, height);
    h.send("wheel", { clientX: 640, clientY: 360, deltaY: 300 });
    assert.ok(point.clone().project(h.camera).distanceTo(after) < 1e-8);
  } finally {
    h.close();
  }
});
test("Alt middle drag pans horizontally without rotation, height drift, or orders", () => {
  const h = harness();
  try {
    const offset = h.camera.position.clone().sub(h.target),
      height = h.camera.position.y;
    h.send("pointerdown", { altKey: true });
    h.send("pointermove", { clientX: 480, clientY: 345 });
    h.send("pointerup", { clientX: 480, clientY: 345 });
    assert.ok(h.target.length() > 1);
    assert.equal(h.target.y, 0);
    assert.equal(h.camera.position.y, height);
    assert.ok(
      h.camera.position.clone().sub(h.target).distanceTo(offset) < 1e-8,
    );
    assert.equal(h.orders.length, 0);
  } finally {
    h.close();
  }
});
test("middle drag orbits the floor with bounded 40–75 degree elevation", () => {
  const h = harness();
  try {
    const distance = h.camera.position.length();
    h.send("pointerdown", { shiftKey: false });
    h.send("pointermove", { clientX: 500, clientY: 2000, shiftKey: false });
    let elevation = (Math.asin(h.camera.position.y / distance) * 180) / Math.PI;
    assert.ok(elevation >= 40 - 1e-7 && elevation <= 75 + 1e-7);
    h.send("pointermove", { clientX: 600, clientY: -2000, shiftKey: false });
    elevation = (Math.asin(h.camera.position.y / distance) * 180) / Math.PI;
    assert.ok(elevation >= 40 - 1e-7 && elevation <= 75 + 1e-7);
    assert.ok(h.target.length() < 1e-8);
    assert.ok(Math.abs(h.camera.position.length() - distance) < 1e-8);
  } finally {
    h.close();
  }
});
test("off-center orbit ignores a roof and keeps the floor anchor fixed on screen", () => {
  const h = harness();
  try {
    h.send("pointerdown", { clientX: 640, clientY: 360 });
    const anchor = new T.Vector3(...h.anchor()!);
    assert.ok(Math.abs(anchor.y) < 1e-8);
    const before = anchor.clone().project(h.camera);
    h.send("pointermove", { clientX: 700, clientY: 390 });
    const after = anchor.clone().project(h.camera);
    assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < 1e-8);
  } finally {
    h.close();
  }
});
test("right-click orders remain separate from camera navigation and handlers dispose", () => {
  const h = harness();
  try {
    const before = h.camera.position.clone();
    h.send("pointerdown", { button: 2 });
    h.send("pointerup", { button: 2 });
    assert.equal(h.orders.length, 1);
    assert.ok(h.camera.position.distanceTo(before) < 1e-8);
  } finally {
    h.close();
  }
  assert.equal(h.handlers.size, 0);
});

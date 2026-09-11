import * as T from "three";

type Draw = {
  snow: (geometry: T.BufferGeometry, x: number, y: number, z: number) => void;
  capture: (name: string, draw: () => void) => void;
  box: (
    m: T.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    a?: number,
  ) => void;
  add: (
    g: T.BufferGeometry,
    m: T.Material,
    x: number,
    y: number,
    z: number,
    sx?: number,
    sy?: number,
    sz?: number,
    rotation?: number,
  ) => void;
  windowPane: (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) => void;
  stone: T.Material;
  walls: T.Material;
  roof: T.Material;
  trim: T.Material;
  wood: T.Material;
  copper: T.Material;
  brass: T.Material;
  iron: T.Material;
  brick: T.Material;
  glass: T.Material;
  glow: T.Material;
};
/** Silhouettes and restrained machinery; shared materials and capture-generated LODs. */
export function buildSteampunkAssets(k: Draw) {
  const {
    capture,
    snow,
    box,
    add,
    windowPane,
    stone,
    walls,
    roof,
    trim,
    wood,
    copper,
    brass,
    iron,
    brick,
    glass,
    glow,
  } = k;
  const pipe = (
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    m: T.Material = brass,
  ) => add(new T.CylinderGeometry(r, r, h, 8), m, x, y, z);
  const dome = (x: number, y: number, z: number, r: number) =>
    add(
      new T.SphereGeometry(r, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2),
      copper,
      x,
      y,
      z,
    );
  const clock = (x: number, y: number, z: number, r: number) => {
    add(
      new T.CylinderGeometry(r, r, 0.12, 16).rotateX(Math.PI / 2),
      trim,
      x,
      y,
      z,
    );
    add(new T.TorusGeometry(r, 0.08, 4, 16), brass, x, y, z + 0.09);
    box(iron, x, y + r * 0.22, z + 0.16, 0.07, r * 0.55, 0.05);
    box(iron, x + r * 0.2, y, z + 0.17, r * 0.45, 0.07, 0.05);
  };
  const doors = (d: number) => {
    for (const side of [-1, 1])
      box(wood, 0, 1.3, side * (d / 2 + 0.07), 1.5, 2.6, 0.12);
  };
  const beam = (a: T.Vector3, b: T.Vector3) => {
    const g = new T.BoxGeometry(0.14, a.distanceTo(b), 0.14);
    g.applyQuaternion(
      new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        b.clone().sub(a).normalize(),
      ),
    );
    const c = a.clone().add(b).multiplyScalar(0.5);
    add(g, iron, c.x, c.y, c.z);
  };
  // Different massing, rooflines and fenestration within the shared lot envelopes.
  for (const [i, name] of [
    "commercialTowerGothic",
    "commercialTowerObservatory",
    "commercialTowerExchange",
  ].entries())
    capture(name, () => {
      const floors = [8, 7, 10][i],
        h = floors * 2.7;
      for (let f = 0; f < floors; f++) {
        const inset = i === 2 ? Math.max(0, f - 5) * 0.55 : 0;
        const w = 9 - inset * 2,
          d = 11 - inset * 2,
          y = 0.4 + f * 2.7;
        box(i === 0 ? brick : walls, 0, y + 1.35, 0, w, 2.7, d);
        // Keep cornice and storey top faces on distinct planes, including roof decks.
        box(trim, 0, y + 2.66, 0, w + 0.16, 0.2, d + 0.16);
        for (const side of [-1, 1]) {
          for (const x of [-0.3, 0, 0.3]) {
            windowPane(
              x * w,
              y + 1.4,
              side * (d / 2 + 0.08),
              i === 0 ? 0.8 : 1.5,
              1.85,
              0.08,
            );
            if (i === 0)
              add(
                new T.ConeGeometry(0.52, 0.6, 3),
                trim,
                x * w,
                y + 2.45,
                side * (d / 2 + 0.08),
                1,
                1,
                0.16,
              );
          }
          for (const z of [-0.3, 0, 0.3])
            windowPane(side * (w / 2 + 0.08), y + 1.4, z * d, 0.08, 1.85, 1.3);
        }
      }
      box(stone, 0, 0.2, 0, 9.2, 0.4, 11.2);
      const roofInset = i === 2 ? Math.max(0, floors - 6) * .55 : 0;
      snow(new T.BoxGeometry(9.1 - roofInset * 2, .08, 11.1 - roofInset * 2), 0, h + .54, 0);
      doors(11);
      if (i === 0) {
        for (const x of [-4.15, 4.15])
          for (const z of [-5.1, 5.1]) {
            pipe(x, h / 2, z, 0.28, h, trim);
            add(new T.ConeGeometry(0.48, 4, 6), copper, x, h + 2.4, z);
          }
        box(brick, 0, h + 2, 0, 4, 3.2, 5);
        add(
          new T.ConeGeometry(2.8, 7, 4).rotateY(Math.PI / 4),
          roof,
          0,
          h + 7,
          0,
        );
      } else if (i === 1) {
        pipe(0, h + 2, 0, 3.3, 3, stone);
        dome(0, h + 3.5, 0, 3.5);
        box(brass, 0, h + 5.3, 1, 0.2, 0.2, 5);
        for (const x of [-3.9, 3.9]) pipe(x, h + 1.5, -4.6, 0.32, 2, copper);
      } else {
        box(iron, 0, h + 1, 0, 3.7, 1.4, 5.7);
        for (const x of [-1.2, 1.2]) pipe(x, h + 3, -1.3, 0.35, 3.5, brass);
        clock(0, h + 1, 2.95, 0.6);
      }
    });
  for (const [i, name] of [
    "urbanBayTerrace",
    "urbanDutchGable",
    "urbanGlassArcade",
  ].entries())
    capture(name, () => {
      const h = [10.8, 8.1, 10.8][i];
      box(stone, 0, 0.2, 0, 5.2, 0.4, 11.2);
      box(i === 1 ? brick : walls, 0, h / 2 + 0.4, 0, 5, h, 11);
      for (const side of [-1, 1]) {
        for (let y = 1.8; y < h; y += 2.7) {
          for (const x of [-1.25, 1.25]) {
            if (i === 0) box(trim, x, y, side * 5.64, 1.8, 2.2, 0.45);
            windowPane(x, y, side * (i === 0 ? 5.9 : 5.62), 1.35, 1.75, 0.08);
          }
          box(trim, 0, y + 1.15, side * 5.62, 5.25, 0.16, 0.2);
        }
        if (i === 2) {
          box(copper, 0, 3.05, side * 5.7, 5.2, 0.18, 0.8);
          for (const x of [-2.35, 2.35])
            box(iron, x, 1.5, side * 5.9, 0.12, 3, 0.12);
        }
      }
      doors(11);
      box(roof, 0, h + 0.65, 0, 5.25, 0.35, 11.25);
      snow(new T.BoxGeometry(i === 1 ? 5.2 : 3.8, .08, i === 1 ? 10.6 : 9.8), 0, h + (i === 1 ? .87 : 2.12), 0);
      for (const side of [-1, 1])
        for (let y = 1.8; y < h; y += 2.7)
          for (const z of [-3.5, 0, 3.5])
            windowPane(side * 2.58, y, z, 0.06, 1.7, 1.15);
      if (i === 1)
        for (let s = 0; s < 5; s++) {
          for (const side of [-1, 1])
            box(
              brick,
              0,
              h + 0.9 + s * 0.5,
              side * 5.45,
              5 - s * 0.9,
              0.5,
              0.22,
            );
        }
      else {
        for (let s = 0; s < 3; s++)
          box(
            i === 2 ? copper : roof,
            0,
            h + 0.95 + s * 0.45,
            0,
            5 - s * 0.6,
            0.45,
            11 - s * 0.6,
          );
        for (const x of [-1.3, 1.3]) {
          box(trim, x, h + 1.1, 4.85, 0.9, 1.2, 0.65);
          windowPane(x, h + 1.1, 5.21, 0.65, 0.8, 0.06);
        }
      }
      for (const x of [-1.9, 1.9]) pipe(x, h + 1.6, -3.9, 0.25, 2.4, brick);
    });
  capture("warehouseSawtooth", () => {
    box(stone, 0, 0.2, 0, 10.2, 0.4, 7.2);
    box(brick, 0, 2.7, 0, 10, 5, 7);
    for (const x of [-3.3, 0, 3.3]) {
      add(
        new T.CylinderGeometry(1, 1, 6.8, 3).rotateX(Math.PI / 2),
        roof,
        x,
        5.7,
        0,
        1.85,
        1,
        1,
      );
      box(glass, x, 6.1, 0, 0.15, 1.3, 6.6);
      snow(new T.CylinderGeometry(1, 1, 6.7, 3).rotateX(Math.PI / 2).scale(1.85, 1, 1), x, 5.78, 0);
      windowPane(x, 3.6, 3.58, 2, 1.3, 0.08);
    }
    doors(7);
    pipe(4.4, 5.5, -2.7, 0.35, 8, brick);
  });
  for (const [i, name] of [
    "commercialTowerCopper",
    "commercialTowerClock",
    "commercialTowerIron",
    "commercialTowerCrown",
  ].entries())
    capture(name, () => {
      const floors = [10, 8, 12, 9][i],
        h = floors * 2.7;
      box(stone, 0, 0.2, 0, 9.2, 0.4, 11.2);
      box(i === 2 ? brick : walls, 0, h / 2 + 0.4, 0, 9, h, 11);
      for (const side of [-1, 1]) {
        for (const x of [-4.1, 0, 4.1])
          box(i === 2 ? iron : trim, x, h / 2, side * 5.56, 0.25, h, 0.1);
        for (let f = 0; f < floors; f++) {
          for (const x of [-2.7, -0.9, 0.9, 2.7])
            windowPane(x, 1.7 + f * 2.7, side * 5.63, 1.15, 1.65, 0.08);
          if (f % 2 === 0)
            box(trim, 0, 2.8 + f * 2.7, side * 5.58, 9, 0.12, 0.13);
        }
        for (let f = 0; f < floors; f++)
          for (const z of [-3.5, 0, 3.5])
            windowPane(side * 4.56, 1.7 + f * 2.7, z, 0.08, 1.65, 1.4);
        pipe(side * 4.1, h / 2, -5.58, 0.12, h);
      }
      doors(11);
      box(roof, 0, h + 0.65, 0, 9.25, 0.3, 11.25);
      if (i === 0) {
        box(walls, 0, h + 2, 0, 6, 2.7, 7);
        dome(0, h + 3.4, 0, 3.1);
        pipe(0, h + 7.2, 0, 0.12, 2.2);
        for (const x of [-3.9, 3.9]) {
          pipe(x, h + 1.7, 4.6, 0.32, 2.2);
          dome(x, h + 2.8, 4.6, 0.5);
        }
      } else if (i === 1) {
        box(brick, 0, h + 3.5, 0, 5, 6, 6);
        clock(0, h + 3.8, 3.12, 1.55);
        add(
          new T.ConeGeometry(3.5, 4, 4).rotateY(Math.PI / 4),
          roof,
          0,
          h + 8.5,
          0,
        );
        pipe(0, h + 11, 0, 0.1, 1.7);
      } else if (i === 2) {
        for (let y = 3; y < h - 2; y += 5.4)
          for (const x of [-3, 3])
            beam(
              new T.Vector3(x - 1.2, y, 5.72),
              new T.Vector3(x + 1.2, y + 4.5, 5.72),
            );
        box(iron, 0, h + 1.5, 0, 6, 2, 7);
        pipe(-1.8, h + 4, -1.5, 0.6, 4, iron);
        pipe(1.8, h + 3, 1.5, 0.9, 2, copper);
      } else {
        for (let tier = 0; tier < 3; tier++)
          box(
            tier === 2 ? copper : walls,
            0,
            h + 1.6 + tier * 2.6,
            0,
            7 - tier * 1.6,
            2.5,
            8 - tier * 1.6,
          );
        for (const x of [-3.9, 3.9])
          for (const z of [-4.7, 4.7])
            add(new T.ConeGeometry(0.6, 3, 6), roof, x, h + 2, z);
        pipe(0, h + 9, 0, 0.12, 3);
      }
    });
  for (const [i, name] of [
    "urbanMansard",
    "urbanGable",
    "urbanArcade",
    "urbanCopper",
    "urbanBay",
  ].entries())
    capture(name, () => {
      const floors = [4, 3, 3, 4, 5][i],
        h = floors * 2.7;
      box(stone, 0, 0.2, 0, 5.15, 0.4, 11.15);
      box(i % 2 ? brick : walls, 0, h / 2 + 0.4, 0, 5, h, 11);
      for (const side of [-1, 1]) {
        for (let f = 0; f < floors; f++) {
          for (const x of [-1.3, 1.3]) {
            box(trim, x, 1.9 + f * 2.7, side * 5.55, 1.55, 2, 0.1);
            windowPane(x, 1.9 + f * 2.7, side * 5.63, 1.25, 1.7, 0.06);
          }
          box(trim, 0, 3 + f * 2.7, side * 5.57, 5, 0.16, 0.12);
        }
        pipe(-2.25, h / 2, side * 5.65, 0.09, h);
      }
      doors(11);
      box(roof, 0, h + 0.6, 0, 5.2, 0.3, 11.2);
      if (i === 0)
        for (let step = 0; step < 4; step++)
          box(
            roof,
            0,
            h + 0.9 + step * 0.4,
            0,
            5.1 - step * 0.5,
            0.4,
            11.1 - step * 0.5,
          );
      if (i === 1)
        add(
          new T.ConeGeometry(1, 2.4, 4).rotateY(Math.PI / 4),
          roof,
          0,
          h + 1.9,
          0,
          3.65,
          1,
          7.95,
        );
      if (i === 2) {
        box(trim, 0, 3.5, 5.8, 5.1, 0.3, 0.55);
        for (const x of [-2.25, 2.25]) box(iron, x, 1.6, 5.8, 0.14, 3.2, 0.14);
        clock(0, h - 0.8, 5.72, 0.6);
      }
      if (i === 3) {
        box(walls, 0, h + 1.5, 0, 3, 1.5, 4);
        dome(0, h + 2.3, 0, 1.8);
        pipe(0, h + 4.6, 0, 0.08, 1.4);
      }
      if (i === 4) {
        box(iron, 0, 5.7, 5.8, 3.6, 0.18, 0.55);
        for (const x of [-1.7, 0, 1.7])
          box(brass, x, 6.1, 5.99, 0.07, 0.8, 0.07);
        box(brass, 0, 6.5, 5.99, 3.5, 0.08, 0.08);
      }
      pipe(1.8, h + 1.3, -4, 0.28, 1.8, brick);
    });
  for (const [i, name] of [
    "warehouseFoundry",
    "warehouseEngine",
    "workshopRowCanopy",
  ].entries())
    capture(name, () => {
      const w = i === 2 ? 5 : 10,
        d = 7,
        h = i === 0 ? 7 : 5.5;
      box(stone, 0, 0.2, 0, w + 0.2, 0.4, d + 0.2);
      box(brick, 0, h / 2 + 0.4, 0, w, h, d);
      doors(d);
      for (const side of [-1, 1])
        for (const x of i === 2 ? [-1.4, 1.4] : [-3.5, 0, 3.5])
          windowPane(x, h - 1, side * 3.6, 1.4, 1.5, 0.08);
      box(roof, 0, h + 0.6, 0, w + 0.25, 0.3, d + 0.25);
      if (i === 0) {
        for (const x of [-3, 0, 3]) box(iron, x, h + 1.1, 0, 2.5, 0.7, 5.8);
        pipe(3.5, h + 3, -2, 0.5, 6, brick);
      }
      if (i === 1) {
        pipe(-2, h + 1.7, 0, 1.1, 2, copper);
        pipe(2, h + 2.7, -1, 0.4, 4, iron);
        box(brass, 0, h + 1, 1, 6, 0.2, 0.2);
      }
      if (i === 2) {
        box(iron, 0, 3.3, 3.7, 4.8, 0.18, 0.45);
        clock(0, h - 0.7, 3.72, 0.55);
      }
    });
  for (const [i, name] of ["streetCarSaloon", "streetCarVan"].entries())
    capture(name, () => {
      box(iron, 0, 0.38, 0, 1.35, 0.25, 3.3);
      box(i ? wood : brick, 0, 0.65, 0, 1.45, 0.45, 3.1);
      box(i ? wood : iron, 0, 1.15, -0.35, 1.35, 0.75, i ? 2 : 1.6);
      box(roof, 0, 1.59, -0.35, 1.45, 0.12, i ? 2.15 : 1.8);
      box(glass, 0, 1.25, i ? 0.7 : 0.5, 1.05, 0.45, 0.05);
      box(iron, 0, 0.9, 1.2, 1.3, 0.35, 0.9);
      for (const x of [-0.76, 0.76])
        for (const z of [-1.05, 1.05])
          add(
            new T.CylinderGeometry(0.32, 0.32, 0.16, 8).rotateZ(Math.PI / 2),
            iron,
            x,
            0.32,
            z,
          );
      for (const x of [-0.5, 0.5])
        add(new T.SphereGeometry(0.12, 6, 4), brass, x, 0.8, 1.64);
      // Dented body/rust patches, no animation or lights on derelict vehicles.
      box(wood, 0.73, 0.72, -0.8, 0.025, 0.25, 0.6);
      box(iron, 0, 0.25, 1.72, 1.55, 0.12, 0.1);
    });
  capture("streetTramStop", () => {
    box(stone, 0, .06, 0, 1.5, .12, 3);
    for (const z of [-1.25, 1.25]) {
      pipe(.5, .9, z, .045, 1.8, iron);
      box(brass, .5, 1.55, z, .06, .06, .7);
    }
    box(copper, 0, 1.85, 0, 1.55, .14, 3);
    box(wood, .3, .38, 0, .35, .09, 2.2);
    for (const z of [-.8, .8]) box(iron, .3, .19, z, .06, .38, .06);
    box(iron, .55, 1.25, -.85, .1, .55, .4);
    box(glow, .48, 1.25, -.85, .035, .42, .28);
    box(glow, 0, 1.73, 0, .25, .08, 2.1);
    pipe(-.6, 1, 1.35, .04, 2, iron);
    box(brass, -.6, 1.85, 1.35, .09, .5, .55);
    box(glow, -.66, 1.85, 1.35, .025, .33, .38);
  });
  capture("streetKiosk", () => {
    box(wood, 0, 0.8, 0, 1.4, 1.6, 1);
    box(roof, 0, 1.7, 0, 1.65, 0.18, 1.3);
    box(trim, 0, 1.05, 0.52, 1.15, 0.75, 0.04);
    box(glow, 0, 1.48, .56, 1.05, .17, .025);
    box(iron, 0, 0.6, 0.6, 1.55, 0.12, 0.35);
  });
  capture("streetClock", () => {
    pipe(0, 1.4, 0, 0.1, 2.8, iron);
    clock(0, 2.7, 0.08, 0.43);
    box(stone, 0, 0.15, 0, 0.6, 0.3, 0.6);
  });
  capture("streetHydrant", () => {
    pipe(0, 0.4, 0, 0.15, 0.8, brass);
    dome(0, 0.8, 0, 0.18);
    box(brass, 0, 0.6, 0, 0.55, 0.12, 0.12);
  });
  capture("streetBollard", () => {
    pipe(0, 0.35, 0, 0.1, 0.7, iron);
    add(new T.SphereGeometry(0.13, 8, 4), brass, 0, 0.73, 0);
  });
  capture("streetBoiler", () => {
    pipe(0, 0.75, 0, 0.4, 1.3, copper);
    dome(0, 1.4, 0, 0.4);
    pipe(0.25, 1.6, -0.2, 0.06, 1, brass);
    box(stone, 0, 0.1, 0, 1, 0.2, 1);
  });
  capture("streetManhole", () => {
    add(new T.CylinderGeometry(0.46, 0.46, 0.035, 16), iron, 0, 0.192, 0);
    add(
      new T.TorusGeometry(0.43, 0.025, 4, 16).rotateX(Math.PI / 2),
      brass,
      0,
      0.213,
      0,
    );
    for (const z of [-0.23, 0, 0.23]) box(iron, 0, 0.22, z, 0.55, 0.012, 0.035);
  });
  capture("streetValve", () => {
    box(stone, 0, 0.12, 0, 0.9, 0.24, 0.65);
    pipe(0, 0.7, 0, 0.13, 1.2, brass);
    add(new T.TorusGeometry(0.32, 0.055, 4, 12), iron, 0, 1.05, 0.18);
    box(brass, 0, 1.05, 0.18, 0.55, 0.05, 0.05);
    box(brass, 0, 1.05, 0.18, 0.05, 0.55, 0.05);
  });
  capture("streetVent", () => {
    box(iron, 0, 0.38, 0, 0.85, 0.76, 0.6);
    box(copper, 0, 0.82, 0, 0.95, 0.12, 0.7);
    for (const y of [0.2, 0.35, 0.5, 0.65])
      box(brass, 0, y, 0.32, 0.64, 0.035, 0.025);
  });
}

import * as THREE from "three";
type Part = [THREE.BufferGeometry, number, number?, number?, number?];
/** The 348-triangle articulated model from the approved infantry benchmark.
 * Only two source rigs are built. Live soldiers share baked local transforms. */
export function bakeInfantry(team: number) {
  const entries: {
    joint: THREE.Object3D;
    geometry: THREE.BufferGeometry;
    key: string;
  }[] = [];
  function coloredPart(parts: Part[]) {
    const positions = [],
      normals = [],
      colors = [];
    for (const [geometry, color, x = 0, y = 0, z = 0] of parts) {
      const g = geometry.index ? geometry.toNonIndexed() : geometry;
      g.translate(x, y, z);
      const c = new THREE.Color(color);
      positions.push(...g.attributes.position.array);
      normals.push(...g.attributes.normal.array);
      for (let i = 0; i < g.attributes.position.count; i++)
        colors.push(c.r, c.g, c.b);
      g.dispose();
      if (g !== geometry) geometry.dispose();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }
  const B = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d),
    C = (rt: number, rb: number, h: number, n = 6) =>
      new THREE.CylinderGeometry(rt, rb, h, n);
  function part(
    parent: THREE.Object3D,
    key: string,
    parts: () => Part[],
    soldier: THREE.Object3D,
  ) {
    const geometry = coloredPart(parts());
    const joint = new THREE.Group();
    parent.add(joint);
    entries.push({ joint, geometry, key });
    return joint;
  }
  function createSoldier(team: number) {
    const soldier = new THREE.Group();
    const body = new THREE.Group();
    soldier.add(body);
    const upper = new THREE.Group();
    upper.position.y = 1.04;
    body.add(upper);
    const coat = team ? 0x735448 : 0x46545d,
      band = team ? 0xce714e : 0x219fb6;
    const hips = part(
      body,
      "hips",
      () => [[B(0.43, 0.2, 0.29), 0x625f4e]],
      soldier,
    );
    hips.position.y = 0.91;
    part(
      upper,
      "torso" + team,
      () => [
        [B(0.48, 0.53, 0.32), coat, 0, 0.23, 0],
        [B(0.5, 0.23, 0.3), coat, 0, -0.12, 0],
        [B(0.37, 0.4, 0.2), 0x9b8860, 0, 0.27, -0.25],
        [B(0.49, 0.14, 0.16), 0xb39e73, 0, 0.54, -0.25],
        [B(0.48, 0.07, 0.33), 0x5a4430, 0, 0, 0.01],
        [B(0.055, 0.45, 0.02), 0xb39e73, -0.15, 0.23, 0.17],
        [B(0.055, 0.45, 0.02), 0xb39e73, 0.15, 0.23, 0.17],
      ],
      soldier,
    );
    const head = part(
      upper,
      "head",
      () => [
        [B(0.22, 0.25, 0.2), 0xc39770, 0, 0.075, 0.025],
        [C(0.23, 0.25, 0.025), 0x434a4e, 0, 0.207, 0],
        [C(0.1, 0.22, 0.14), 0x434a4e, 0, 0.285, 0],
      ],
      soldier,
    );
    head.position.y = 0.53;
    const legs: {
      leg: THREE.Group;
      knee: THREE.Group;
      foot: THREE.Group;
      side: number;
    }[] = [];
    for (const side of [-1, 1]) {
      const leg = part(
        body,
        "thigh",
        () => [[B(0.18, 0.32, 0.17), 0x625f4e, 0, -0.16, 0]],
        soldier,
      );
      leg.position.set(side * 0.135, 0.89, 0);
      const knee = part(
        leg,
        "shin",
        () => [[B(0.13, 0.33, 0.14), 0x5a4430, 0, -0.165, 0]],
        soldier,
      );
      knee.position.y = -0.32;
      const foot = part(
        knee,
        "boot",
        () => [[B(0.17, 0.13, 0.28), 0x342d25, 0, 0.015, 0.05]],
        soldier,
      );
      foot.position.y = -0.33;
      legs.push({ leg, knee, foot, side });
    }
    const weapon = part(
      upper,
      "rifle",
      () => [
        [B(0.66, 0.075, 0.065), 0x775030, -0.12, 0.015, 0],
        [B(0.66, 0.032, 0.032), 0x242d31, 0.32, 0.07, 0],
      ],
      soldier,
    );
    const arms = new THREE.Group();
    upper.add(arms);
    arms.position.y = -1.04;
    const armRig = [-1, 1].map((side) => ({
      side,
      shoulder: new THREE.Object3D(),
      upper: part(
        arms,
        "sleeve" + team,
        () => [
          [B(0.17, 1, 0.17), coat],
          [B(0.175, 0.18, 0.175), band, 0, 0.17, 0],
        ],
        soldier,
      ),
      lower: part(
        arms,
        "forearm" + team,
        () => [
          [B(0.13, 1, 0.13), coat],
          [B(0.14, 0.17, 0.14), 0xc39770, 0, 0.43, 0],
        ],
        soldier,
      ),
      hand: new THREE.Object3D(),
      band: null,
    }));
    const upAxis = new THREE.Vector3(0, 1, 0),
      axis = new THREE.Vector3();
    function setLink(o: THREE.Object3D, a: number[], b: number[]) {
      axis.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      o.scale.y = axis.length();
      o.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      o.quaternion.setFromUnitVectors(upAxis, axis.normalize());
    }
    const mix = (a: number, b: number, t: number) => a + (b - a) * t,
      smooth = (t: number) => {
        t = Math.max(0, Math.min(1, t));
        return t * t * (3 - 2 * t);
      };
    function plant(
      l: (typeof legs)[number],
      z: number,
      lift: number,
      pitch: number,
    ) {
      const down =
        0.89 -
        (0.24 + lift + Math.abs(Math.sin(pitch)) * 0.16 - body.position.y);
      const distance = Math.min(0.649, Math.hypot(down, z));
      const hipOffset = Math.acos(
        Math.max(
          -1,
          Math.min(
            1,
            (0.32 * 0.32 + distance * distance - 0.33 * 0.33) /
              (2 * 0.32 * distance),
          ),
        ),
      );
      const kneeBend =
        Math.PI -
        Math.acos(
          Math.max(
            -1,
            Math.min(
              1,
              (0.32 * 0.32 + 0.33 * 0.33 - distance * distance) /
                (2 * 0.32 * 0.33),
            ),
          ),
        );
      l.leg.rotation.x = Math.atan2(-z, down) - hipOffset;
      l.knee.rotation.x = kneeBend;
      l.foot.rotation.x = pitch - l.leg.rotation.x - l.knee.rotation.x;
    }
    function animate(
      mode: "walk" | "run" | "aim",
      u: number,
      recoil = 0,
      crouch = 0,
      lean = 0,
      reload = -1,
    ) {
      const running = mode === "run";
      const walking = mode === "walk" || running,
        aiming = mode === "aim";
      const p = u * Math.PI * 2;
      const aim = aiming ? smooth((u - 0.1) / 0.5) : 0,
        brace = aiming ? smooth(u / 0.38) : 0;
      const breath =
        aiming && u > 0.65 ? Math.sin((u - 0.65) * Math.PI * 5) * 0.008 : 0;

      body.position.y = walking
        ? -0.058 + 0.013 * Math.cos(p * 2)
        : -0.015 - 0.045 * brace;
      body.position.y -= Math.min(crouch, walking ? 0.45 : 1) * 0.4;
      if (running) body.position.y = -0.16 + 0.035 * Math.cos(p * 2);
      hips.rotation.y = walking
        ? (running ? 0.2 : 0.065) * Math.sin(p)
        : -0.07 * brace;
      upper.rotation.set(
        walking ? 0.07 + 0.016 * Math.cos(p * 2) : 0.09 * aim + breath,
        walking ? -(running ? 0.28 : 0.11) * Math.sin(p) : -0.14 * aim,
        walking ? (running ? 0.07 : 0.028) * Math.sin(p) : -0.025 * aim,
      );
      upper.position.x = walking ? 0.018 * Math.sin(p) : 0.016 * brace;
      upper.position.x += lean * 0.24;
      upper.rotation.z -= lean * 0.22;
      upper.rotation.x += crouch * 0.2 + (running ? 0.16 : 0);
      if (running) upper.position.x += 0.025 * Math.sin(p);
      weapon.position.set(
        mix(0.03, 0.17, aim),
        mix(1.19, 1.43, aim) -
          1.04 +
          (walking ? 0.012 * Math.cos(p * 2) : breath),
        mix(0.4, 0.35, aim),
      );
      weapon.rotation.set(0, mix(-0.14, -Math.PI / 2, aim), mix(-0.17, 0, aim));
      if (running) {
        weapon.position.y += 0.035 * Math.cos(p * 2);
        weapon.position.z += 0.045 * Math.sin(p);
        weapon.rotation.z += 0.045 * Math.sin(p);
      }
      const loading = reload >= 0 ? Math.sin(Math.PI * reload) ** 2 : 0;
      weapon.position.y -= loading * 0.18;
      weapon.rotation.z -= loading * 0.32;
      weapon.updateMatrix();
      for (const rig of armRig) {
        const side = rig.side,
          shoulder = [side * 0.28, 1.42, 0];
        const elbow = [
          mix(side * 0.36, side * 0.34, aim),
          mix(1.13, side < 0 ? 1.22 : 1.32, aim),
          mix(0.16, side < 0 ? 0.3 : 0.06, aim),
        ];
        // Both hands follow their rifle grips throughout the raise and shoulder twist.
        const grip = new THREE.Vector3(
          side < 0 ? 0.24 : -0.13,
          0.015,
          0,
        ).applyMatrix4(weapon.matrix);
        grip.y += 1.04;
        if (side < 0 && loading > 0) {
          // Support hand dips to the ammunition pouch and returns to the breech.
          const fetch = Math.sin(Math.PI * Math.min(1, reload * 2)) ** 2;
          grip.x = mix(grip.x, -0.24, loading);
          grip.y = mix(grip.y, 1.19 - fetch * 0.34, loading);
          grip.z = mix(grip.z, 0.27, loading);
        }
        const hand = [grip.x, grip.y, grip.z];
        rig.shoulder.position.set(shoulder[0], shoulder[1], shoulder[2]);
        setLink(rig.upper, shoulder, elbow);
        setLink(rig.lower, elbow, hand);
        rig.hand.position.copy(grip);
      }
      for (const leg of legs) {
        let z = leg.side * 0.1 * brace,
          lift = 0,
          pitch = 0;
        if (running) {
          const cycle = (((u + (leg.side < 0 ? 0.5 : 0)) % 1) + 1) % 1;
          // Contact/down/push occupy 40%; heel recovery and airborne reach the rest.
          if (cycle < 0.4) {
            z = 0.416 - cycle * 2.08;
            pitch =
              -0.14 * (1 - smooth(cycle / 0.12)) +
              0.38 * smooth((cycle - 0.27) / 0.13);
          } else {
            const swing = (cycle - 0.4) / 0.6;
            z = mix(-0.416, 0.416, smooth(swing));
            lift = 0.28 * Math.sin(Math.PI * swing);
            pitch =
              mix(0.38, -0.14, smooth(swing)) -
              0.45 * Math.sin(Math.PI * swing);
          }
        } else if (walking) {
          const cycle = (u + (leg.side < 0 ? 0.5 : 0)) % 1;
          if (cycle < 0.6) {
            const t = cycle / 0.6;
            z = mix(0.18, -0.18, t);
            pitch =
              -0.09 * (1 - smooth(t / 0.18)) + 0.26 * smooth((t - 0.78) / 0.22);
          } else {
            const t = (cycle - 0.6) / 0.4;
            z = mix(-0.18, 0.18, smooth(t));
            lift = 0.105 * Math.sin(Math.PI * t);
            pitch = mix(0.26, -0.09, t) - 0.2 * Math.sin(Math.PI * t);
          }
        } else if (aiming) {
          const step = smooth(u / 0.35);
          z = leg.side * 0.1 * step;
          lift = 0.035 * Math.sin(Math.PI * step) * (leg.side < 0 ? 1 : 0);
        }
        plant(leg, z, lift, pitch);
      }
      head.rotation.set(
        mix(0.09, 0.17, aim),
        0.12 * aim - (walking ? upper.rotation.y * 0.55 : 0),
        -0.035 * aim,
      );
      upper.rotation.x -= recoil * 0.06;
      weapon.position.z -= recoil * 0.04;
    }

    return { soldier, weapon, animate, body, upper };
  }

  const rig = createSoldier(team);
  const capture = (
    mode: "walk" | "run" | "aim",
    phase: number,
    recoil = 0,
    crouch = 0,
    lean = 0,
    reload = -1,
  ) => {
    rig.animate(mode, phase, recoil, crouch, lean, reload);
    rig.soldier.updateMatrixWorld(true);
    return entries.map((e) => new Float32Array(e.joint.matrixWorld.elements));
  };
  const walk = Array.from({ length: 65 }, (_, i) => capture("walk", i / 64));
  const aim = Array.from({ length: 5 }, (_, i) => capture("aim", 0.6, i / 4));
  return {
    pose: capture,
    parts: entries.map((e) => ({ key: e.key, geometry: e.geometry })),
    walk,
    aim,
  };
}

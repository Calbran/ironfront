import * as T from "three";
import {
  countryLandscapeTile,
  type LandscapePlan,
} from "../../../../packages/game-core/src/countryLandscape";
import { countryRefinedLandscape } from "./countryRefinedLandscape";
import type { MiniatureKit } from "./referenceAssets";
/** Camera residency affects only meshes; simulation uses the same seeded tiles independently. */
export function countryStreamingLandscape(
  scene: T.Scene,
  plan: LandscapePlan,
  kit: MiniatureKit,
) {
  const resident = new Map<
    string,
    ReturnType<typeof countryRefinedLandscape>
  >();
  return {
    update(camera: T.Camera, target: T.Vector3) {
      const wanted = new Set<string>();
      if (camera.position.distanceTo(target) < 900) {
        const cx = Math.floor(target.x / 160),
          cz = Math.floor(target.z / 160);
        for (let r = 0; r <= 2; r++)
          for (let z = cz - r; z <= cz + r; z++)
            for (let x = cx - r; x <= cx + r; x++) wanted.add(x + ":" + z);
      }
      for (const [k, t] of resident)
        if (!wanted.has(k)) {
          t.dispose();
          resident.delete(k);
        }
      // At most one new tile per frame avoids a synchronous forest-generation spike.
      for (const k of wanted)
        if (!resident.has(k)) {
          const [x, z] = k.split(":").map(Number);
          resident.set(
            k,
            countryRefinedLandscape(
              scene,
              { ...plan, rivers: [] },
              kit,
              countryLandscapeTile(plan, x, z),
            ),
          );
          break;
        }
      resident.forEach((t) => t.update(camera, target));
    },
    dispose() {
      resident.forEach((t) => t.dispose());
      resident.clear();
    },
  };
}

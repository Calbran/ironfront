import { buildMiniatureData } from "./buildMiniatureData";
import type { World } from "../../../../packages/game-core/src/index";
self.onmessage = ({ data }: MessageEvent<{ seed: string; world?: World }>) => {
  try {
    self.postMessage(buildMiniatureData(data.seed, data.world));
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "World generation failed.",
    });
  }
};

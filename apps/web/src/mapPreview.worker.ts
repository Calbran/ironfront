import { createWorld } from "../../../packages/game-core/src/index.ts";
self.onmessage = (event: MessageEvent<{ seed: string; seats: number }>) => {
  const { seed, seats } = event.data;
  self.postMessage(
    createWorld(`PREVIEW-${seed}-${seats}`, seed, seats, 10000, 0),
  );
};

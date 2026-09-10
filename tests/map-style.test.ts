import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DETAIL_ZOOM,
  POLITICAL_OVERLAY_END_ZOOM,
  STRATEGY_ZOOM,
  politicalOverlayAlpha,
} from "../apps/web/src/mapStyle.ts";

test("political overlays remain through detail zoom and clear by 400%", () => {
  assert.equal(politicalOverlayAlpha(STRATEGY_ZOOM - 0.01), 1);
  assert.equal(politicalOverlayAlpha(STRATEGY_ZOOM), 0.24);
  assert(
    politicalOverlayAlpha((STRATEGY_ZOOM + DETAIL_ZOOM) / 2) > 0 &&
      politicalOverlayAlpha((STRATEGY_ZOOM + DETAIL_ZOOM) / 2) < 0.24,
  );
  assert(politicalOverlayAlpha(DETAIL_ZOOM) > 0);
  assert.equal(politicalOverlayAlpha(POLITICAL_OVERLAY_END_ZOOM), 0);
  assert.equal(politicalOverlayAlpha(12), 0);
});

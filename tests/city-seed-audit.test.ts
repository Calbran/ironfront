import test from "node:test";
import assert from "node:assert/strict";
import {
  auditCitySeed,
  seedCases,
} from "../packages/game-core/src/citySeedAudit";
test("seed audit checks all study cases reproducibly including terrain stress", () => {
  for (const mode of seedCases) {
    const { generationMs, auditMs, ...a } = auditCitySeed(731, mode);
    const { generationMs: g, auditMs: t, ...b } = auditCitySeed(731, mode);
    assert.deepEqual(a, b);
    assert.deepEqual(a.failures, []);
    assert.equal(a.components, 1);
    assert.ok(a.buildings >= 28);
  }
  assert.ok(
    auditCitySeed(731, "steep").rejected >
      auditCitySeed(731, "combined").rejected,
  );
});

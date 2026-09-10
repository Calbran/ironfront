import { test } from "node:test";
import assert from "node:assert/strict";
import { openEnclosedTerritories } from "../packages/game-core/src/territoryPartition.ts";

test("an enclosed territory is opened without losing land, IDs, or connectivity", () => {
  const cols = 15,
    rows = 11;
  const labels = new Int32Array(cols * rows).fill(-1);
  for (let y = 1; y < rows - 1; y++)
    for (let x = 1; x < cols - 1; x++) labels[y * cols + x] = x > 11 ? 2 : 0;
  for (let y = 4; y <= 6; y++)
    for (let x = 5; x <= 7; x++) labels[y * cols + x] = 1;
  const before = labels.slice(),
    repeat = labels.slice();
  assert.equal(openEnclosedTerritories(labels, cols, rows), 1);
  openEnclosedTerritories(repeat, cols, rows);
  assert.deepEqual(labels, repeat);
  assert.deepEqual(new Set(labels), new Set(before));
  const neighbors = (i: number) =>
    [i - 1, i + 1, i - cols, i + cols].filter(
      (n) =>
        n >= 0 && n < labels.length && Math.abs((n % cols) - (i % cols)) <= 1,
    );
  for (let i = 0; i < labels.length; i++) {
    assert.equal(labels[i] < 0, before[i] < 0, "land and sea are unchanged");
    if (before[i] === 2)
      assert.equal(labels[i], 2, "unaffected neighbor is unchanged");
  }
  for (const id of [0, 1, 2]) {
    const cells = [...labels.keys()].filter((i) => labels[i] === id);
    const seen = new Set([cells[0]]),
      queue = [cells[0]];
    for (let k = 0; k < queue.length; k++)
      for (const n of neighbors(queue[k]))
        if (labels[n] === id && !seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
    assert.equal(seen.size, cells.length);
    assert(
      cells.some((i) => neighbors(i).some((n) => labels[n] < 0)),
      "each region reaches an exposed coast",
    );
  }
  assert.equal(
    openEnclosedTerritories(labels, cols, rows),
    0,
    "repair is idempotent",
  );
});

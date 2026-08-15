import assert from "node:assert/strict";
import { test } from "node:test";

import { shuffled } from "../lib/shuffle.ts";

// shuffled() must be a pure permutation: it returns a NEW array holding exactly
// the same elements (a Fisher-Yates shuffle), never mutating its input or
// dropping/duplicating an item. The tile order in every exercise relies on this
// — a bug that dropped an element would silently remove the correct answer.

test("returns a new array, leaving the input untouched", () => {
  const input = [1, 2, 3, 4, 5];
  const copy = [...input];
  const out = shuffled(input);
  assert.notEqual(out, input, "should not return the same array reference");
  assert.deepEqual(input, copy, "input must not be mutated");
});

test("preserves every element exactly once (a true permutation)", () => {
  const input = ["a", "b", "c", "d", "e", "f", "g"];
  const out = shuffled(input);
  assert.equal(out.length, input.length);
  assert.deepEqual([...out].sort(), [...input].sort());
});

test("handles empty and single-element arrays", () => {
  assert.deepEqual(shuffled([]), []);
  assert.deepEqual(shuffled([42]), [42]);
});

test("does eventually change order (not a no-op shuffle)", () => {
  // Over many runs of a 10-element array, at least one must differ from input.
  const input = Array.from({ length: 10 }, (_, i) => i);
  let everChanged = false;
  for (let i = 0; i < 50 && !everChanged; i++) {
    const out = shuffled(input);
    if (out.some((v, idx) => v !== input[idx])) everChanged = true;
  }
  assert.ok(everChanged, "50 shuffles of 10 items should not all be identity");
});

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildMatchPairs,
  buildOddOneOut,
  buildPickPicture,
  UNITS,
  VOCAB,
  type Direction,
  type Exercise,
} from "../content/content-model.ts";

// The most important architectural rule (CLAUDE.md): content is stored ONCE,
// language-neutral, and ONE component renders BOTH directions by reading the
// Direction off the item. These tests lock that in — they run the direction-
// agnostic build helpers in both directions and assert the prompt/answer sides
// flip purely from the Direction, with no per-language forking.

const BG_EN: Direction = { known: "bg", learning: "en" };
const EN_BG: Direction = { known: "en", learning: "bg" };

test("buildPickPicture flips prompt/answer purely from Direction", () => {
  const ex: Exercise = {
    type: "pick_picture",
    prompt: "fruit.apple",
    choices: ["fruit.banana", "fruit.pear"],
  };
  const apple = VOCAB["fruit.apple"];

  const bg = buildPickPicture(ex, BG_EN);
  // Child knows Bulgarian, learns English: the asked word + audio are English.
  assert.equal(bg.questionWord, apple.labels.en);
  assert.equal(bg.promptAudio, apple.audio.en);
  assert.equal(bg.correctId, "fruit.apple");

  const en = buildPickPicture(ex, EN_BG);
  // Same item, opposite direction: now the asked word + audio are Bulgarian.
  assert.equal(en.questionWord, apple.labels.bg);
  assert.equal(en.promptAudio, apple.audio.bg);
  assert.equal(en.correctId, "fruit.apple");

  // The correct id is stable regardless of direction — only the surface flips.
  assert.notEqual(bg.questionWord, en.questionWord);
});

test("buildPickPicture tiles include the answer plus every distractor", () => {
  const ex: Exercise = {
    type: "pick_picture",
    prompt: "fruit.apple",
    choices: ["fruit.banana", "fruit.pear"],
  };
  const { tiles, correctId } = buildPickPicture(ex, BG_EN);
  assert.equal(tiles.length, 3);
  assert.ok(tiles.some((t) => t.id === correctId), "answer must be among the tiles");
  const ids = tiles.map((t) => t.id).sort();
  assert.deepEqual(ids, ["fruit.apple", "fruit.banana", "fruit.pear"]);
  // Each tile shows the learning word big and the known-language gloss.
  const appleTile = tiles.find((t) => t.id === "fruit.apple")!;
  assert.equal(appleTile.main, VOCAB["fruit.apple"].labels.en);
  assert.equal(appleTile.gloss, VOCAB["fruit.apple"].labels.bg);
});

test("buildMatchPairs / buildOddOneOut cover prompt + choices in order", () => {
  const ex: Exercise = { type: "match_pairs", prompt: "animal.cat", choices: ["animal.dog"] };
  const pairs = buildMatchPairs(ex, BG_EN);
  assert.deepEqual(pairs.map((p) => p.id), ["animal.cat", "animal.dog"]);

  const oddEx: Exercise = { type: "odd_one_out", prompt: "fruit.apple", choices: ["animal.cat", "animal.dog"] };
  const odd = buildOddOneOut(oddEx, BG_EN);
  assert.equal(odd.correctId, "fruit.apple", "the odd one is the prompt");
  assert.equal(odd.tiles.length, 3);
});

test("every UNITS lesson has a unique id and at least one exercise", () => {
  const ids = new Set<string>();
  for (const unit of UNITS) {
    for (const lesson of unit.lessons) {
      assert.ok(!ids.has(lesson.id), `duplicate lesson id: ${lesson.id}`);
      ids.add(lesson.id);
      assert.ok(lesson.exercises.length > 0, `lesson ${lesson.id} has no exercises`);
    }
  }
  assert.ok(ids.size >= 13, "expected a substantial curriculum");
});

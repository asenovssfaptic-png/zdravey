/* Generated-content integrity — the mobile bundle must faithfully mirror
 * the web app (single source of truth). */

import { AUDIO_ASSETS, SFX_ASSETS } from "../content/generated/audioAssets";
import { CURRICULUM } from "../content/generated/curriculum";
import { LETTER_STROKES } from "../content/generated/strokes";
import type { ExerciseType, RecipeItem } from "../content/types";

const C = CURRICULUM;
const audioIds = new Set(Object.keys(AUDIO_ASSETS));

const EXERCISE_TYPES: ExerciseType[] = [
  "pick_picture",
  "reverse_pick",
  "match_pairs",
  "build_word",
  "build_syllable",
  "hear_pick_letter",
  "letter_to_sound",
  "trace_letter",
  "read_word_pick_picture",
  "picture_pick_word",
  "hear_pick_word",
  "build_phrase",
];

const extras = Object.fromEntries(C.readingTrack.extras.map((x) => [x.id, x]));
const syllables = Object.fromEntries(C.readingTrack.syllables.map((x) => [x.id, x]));
const wordResolvable = (id: string) => !!(C.vocab[id] || extras[id]);
const resolvable = (id: string) => wordResolvable(id) || !!syllables[id];

describe("generated content integrity", () => {
  test("audio manifest has exactly 373 bundled assets + 3 SFX", () => {
    expect(Object.keys(AUDIO_ASSETS)).toHaveLength(373);
    expect(Object.keys(SFX_ASSETS).sort()).toEqual(["boop", "chime", "match"]);
  });

  test("Georgian-only audio: no English ui clip is bundled", () => {
    // guards the removed ui-* English clips from ever returning
    for (const id of Object.keys(AUDIO_ASSETS)) {
      expect(id).not.toMatch(/^ui-(?!ka-)/);
    }
  });

  test("curriculum counts match the web app", () => {
    expect(C.units).toHaveLength(18);
    expect(Object.keys(C.vocab).length).toBeGreaterThanOrEqual(279);
    expect(C.bonusWords.length).toBeGreaterThanOrEqual(55);
    expect(C.alphabet.flatMap((g) => g.letters)).toHaveLength(33);
    expect(C.lettersPath.groups).toHaveLength(6);
    expect(C.readingTrack.steps).toHaveLength(8);
    expect(Object.keys(C.games).sort()).toEqual(["findHome", "market", "safari"]);
    expect(C.stickers).toHaveLength(30);
  });

  test("every lesson item resolves to a vocab entry with its own clip", () => {
    for (const u of C.units) {
      for (const l of u.lessons) {
        for (const id of l.items) {
          expect(C.vocab[id]).toBeDefined();
          expect(audioIds.has(id)).toBe(true);
        }
      }
    }
  });

  test("all 33 letters have strokes and a bundled letter clip", () => {
    for (const l of C.alphabet.flatMap((g) => g.letters)) {
      expect(LETTER_STROKES[l.ka]).toBeDefined();
      expect(LETTER_STROKES[l.ka].length).toBeGreaterThan(0);
      const aid = C.audioIds.letters[l.ka];
      expect(aid).toBeDefined();
      expect(audioIds.has(aid)).toBe(true);
    }
  });

  test("letters path pools and syllable pools resolve", () => {
    for (const g of C.lettersPath.groups) {
      const recipes: RecipeItem[] = [
        ...(g.steps.exam.recipe ?? []),
        ...(g.steps.read?.recipe ?? []),
      ];
      for (const r of recipes) {
        for (const sid of r.syllablePool ?? []) expect(syllables[sid]).toBeDefined();
      }
      if (g.steps.read?.pool) {
        for (const sid of g.steps.read.pool.syllables) expect(syllables[sid]).toBeDefined();
        for (const wid of g.steps.read.pool.words) expect(wordResolvable(wid)).toBe(true);
      }
    }
  });

  test("reading steps, bonus words and game ids resolve", () => {
    for (const st of C.readingTrack.steps) {
      for (const id of st.items) expect(resolvable(id)).toBe(true);
    }
    for (const id of C.bonusWords) expect(wordResolvable(id)).toBe(true);
    for (const zone of Object.values(C.games.findHome.zones)) {
      for (const id of zone) expect(wordResolvable(id)).toBe(true);
    }
    for (const id of C.games.market.itemIds) expect(wordResolvable(id)).toBe(true);
  });

  test("every recipe type is a known ExerciseType", () => {
    const all: RecipeItem[] = [
      ...C.unitExamRecipe,
      ...C.lettersPath.groups.flatMap((g) => [
        ...(g.steps.exam.recipe ?? []),
        ...(g.steps.read?.recipe ?? []),
      ]),
      ...C.readingTrack.steps.flatMap((s) => [...s.practice, ...s.exam]),
    ];
    for (const r of all) {
      expect(EXERCISE_TYPES).toContain(r.type);
      if (r.fallback) expect(EXERCISE_TYPES).toContain(r.fallback);
    }
  });

  test("every uiKa / praise / example id is a bundled AudioId", () => {
    expect(C.uiKa).toHaveLength(12);
    for (const u of C.uiKa) expect(audioIds.has(u.id)).toBe(true);
    for (const p of C.praise) expect(audioIds.has(p.id)).toBe(true);
    for (const aid of Object.values(C.audioIds.examples)) expect(audioIds.has(aid)).toBe(true);
  });
});

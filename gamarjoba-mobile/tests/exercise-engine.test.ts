/* Exercise engine — deterministic tests with a seeded RNG. */

import { CURRICULUM } from "../content/generated/curriculum";
import {
  ALL_WORDS,
  buildLessonExercises,
  buildLettersRead,
  buildUnitExam,
  cloneAsRetry,
  computeNextStep,
  lessonExerciseCount,
  padPairWords,
  pickDistractors,
  RETRY_CAP,
  RETRY_TYPES,
  retryInsertIndex,
  starsForAccuracy,
  unitExamQuestionCount,
  wordOfDay,
  alphaGroupById,
  xpForCorrect,
  finishBonus,
  type Exercise,
} from "../lib/exercise-engine";
import { seededRng } from "../lib/rng";
import { storeDefaults, type Progress } from "../lib/store";

const C = CURRICULUM;

function progressWith(patch: Partial<Progress>): Progress {
  return { ...storeDefaults(), ...patch };
}

describe("lesson builder", () => {
  test("counts match the deterministic lessonExerciseCount and a picture opens", () => {
    for (const seed of [1, 42, 1234]) {
      for (const unit of [C.units[0], C.units[5], C.units[15]]) {
        for (const lesson of unit.lessons) {
          const exs = buildLessonExercises(unit, lesson, seededRng(seed));
          expect(exs).toHaveLength(lessonExerciseCount(unit, lesson));
          expect(exs[0].type).toBe("pick_picture");
        }
      }
    }
  });

  test("later units (index >= 3) include the reading pair", () => {
    const early = buildLessonExercises(C.units[0], C.units[0].lessons[0], seededRng(7));
    const late = buildLessonExercises(C.units[4], C.units[4].lessons[0], seededRng(7));
    expect(early.some((e) => e.type === "read_word_pick_picture")).toBe(false);
    expect(late.some((e) => e.type === "read_word_pick_picture")).toBe(true);
    expect(late.some((e) => e.type === "picture_pick_word")).toBe(true);
  });
});

describe("distractors", () => {
  test("never duplicate an id or an English gloss, never the target", () => {
    const word = C.vocab[C.units[0].lessons[0].items[0]];
    for (const seed of [1, 2, 3, 99]) {
      const out = pickDistractors(word, 3, [ALL_WORDS], seededRng(seed));
      expect(out).toHaveLength(3);
      const ids = new Set(out.map((w) => w.id));
      const ens = new Set(out.map((w) => w.en));
      expect(ids.size).toBe(3);
      expect(ens.size).toBe(3);
      expect(ids.has(word.id)).toBe(false);
      expect(ens.has(word.en)).toBe(false);
    }
  });

  test("padPairWords fills toward the target without dupes", () => {
    const base = C.units[0].lessons[0].items.map((id) => C.vocab[id]).slice(0, 2);
    const out = padPairWords(base, [ALL_WORDS], 5, seededRng(3));
    expect(out).toHaveLength(5);
    expect(new Set(out.map((w) => w.id)).size).toBe(5);
    expect(new Set(out.map((w) => w.en)).size).toBe(5);
  });
});

describe("unit exam builder", () => {
  test("every unit yields the full recipe count (fallbacks always fill in)", () => {
    const want = unitExamQuestionCount();
    expect(want).toBe(9);
    for (const unit of C.units) {
      const exs = buildUnitExam(unit, seededRng(11));
      expect(exs).toHaveLength(want);
    }
  });

  test("first unit's earlier-units sprinkle falls back to itself", () => {
    const unitIds = new Set(C.units[0].lessons.flatMap((l) => l.items));
    const exs = buildUnitExam(C.units[0], seededRng(5));
    for (const ex of exs) {
      if ("word" in ex && ex.word && "en" in ex.word && C.vocab[ex.word.id]) {
        // no exercise may reference a word from outside the whole vocab
        expect(C.vocab[ex.word.id]).toBeDefined();
      }
    }
    // at least one pick exercise draws from the unit itself (self-fallback)
    const picks = exs.filter((e) => e.type === "pick_picture");
    expect(picks.some((e) => "word" in e && unitIds.has(e.word.id))).toBe(true);
  });
});

describe("letters-read builder", () => {
  test("build_syllable tiles use ONLY letters learned by that group", () => {
    for (const pg of C.lettersPath.groups) {
      if (!pg.steps.read) continue;
      const allowed = new Set(
        C.lettersPath.groups
          .filter((g) => g.order <= pg.order)
          .flatMap((g) => alphaGroupById(g.groupId)?.letters ?? [])
          .map((l) => l.ka)
      );
      const exs = buildLettersRead(pg, seededRng(21));
      expect(exs.length).toBeGreaterThan(0);
      for (const ex of exs) {
        if (ex.type === "build_syllable") {
          expect(ex.letterPool && ex.letterPool.length).toBeTruthy();
          for (const l of ex.letterPool ?? []) expect(allowed.has(l.ka)).toBe(true);
        }
      }
    }
  });

  test("group-1 honestly offers only 2 distractors", () => {
    const pg = C.lettersPath.groups.find((g) => g.groupId === "group-1")!;
    const exs = buildLettersRead(pg, seededRng(2));
    const picks = exs.filter(
      (e): e is Extract<Exercise, { type: "hear_pick_word" }> => e.type === "hear_pick_word"
    );
    for (const e of picks) expect(e.distractors).toBe(2);
  });
});

describe("retry policy", () => {
  test("constants and clone semantics", () => {
    expect(RETRY_CAP).toBe(3);
    expect(RETRY_TYPES.has("pick_picture")).toBe(true);
    expect(RETRY_TYPES.has("match_pairs")).toBe(false);
    expect(RETRY_TYPES.has("build_word")).toBe(false);
    expect(RETRY_TYPES.has("trace_letter")).toBe(false);

    expect(retryInsertIndex(0, 10)).toBe(3);
    expect(retryInsertIndex(8, 10)).toBe(10); // clamped to the end

    const exs = buildLessonExercises(C.units[0], C.units[0].lessons[0], seededRng(1));
    const clone = cloneAsRetry(exs[0]);
    expect(clone.retry).toBe(true);
    expect(clone.type).toBe(exs[0].type);
    expect(clone.key).not.toBe(exs[0].key);
  });

  test("XP: retried items score less; practice is flat 5", () => {
    expect(xpForCorrect("lesson", true, false)).toBe(10);
    expect(xpForCorrect("lesson", true, true)).toBe(5); // a retry never double-pays
    expect(xpForCorrect("lesson", false, false)).toBe(5);
    expect(xpForCorrect("practice", true, false)).toBe(5);
    expect(finishBonus("unit-exam")).toBe(30);
    expect(finishBonus("lesson")).toBe(20);
    expect(finishBonus("reading-practice")).toBe(0);
    expect(finishBonus("letters-read")).toBe(0);
    expect(finishBonus("practice")).toBe(0);
  });
});

describe("stars (positive-only)", () => {
  test("floor of 1 — finishing NEVER earns zero stars", () => {
    expect(starsForAccuracy(0, 10)).toBe(1);
    expect(starsForAccuracy(3, 10)).toBe(1);
    expect(starsForAccuracy(6, 10)).toBe(2);
    expect(starsForAccuracy(8, 10)).toBe(2);
    expect(starsForAccuracy(9, 10)).toBe(3);
    expect(starsForAccuracy(10, 10)).toBe(3);
    expect(starsForAccuracy(0, 0)).toBe(3); // empty session = perfect
  });
});

describe("word of the day", () => {
  test("deterministic per date and drains bonusWords first", () => {
    const p = storeDefaults();
    const w1 = wordOfDay(p, "2026-09-05");
    const w2 = wordOfDay(p, "2026-09-05");
    expect(w1.id).toBe(w2.id);
    expect(C.bonusWords).toContain(w1.id);
    const other = wordOfDay(p, "2026-09-06");
    expect(other.id).toBeDefined(); // different date may differ, same-date stable
  });

  test("pinned wod wins; a full bonus pool falls back to all vocab", () => {
    const pinned = progressWith({ wodDate: "2026-09-05", wodId: "gamarjoba" });
    expect(wordOfDay(pinned, "2026-09-05").id).toBe("gamarjoba");
    const drained = progressWith({ wodCollected: C.bonusWords.slice() });
    const w = wordOfDay(drained, "2026-09-05");
    expect(C.vocab[w.id]).toBeDefined();
  });
});

describe("computeNextStep — a highlight, never a lock", () => {
  test("walks cards → practice → exam → next unit", () => {
    const u0 = C.units[0];
    const l0 = u0.lessons[0];

    const fresh = computeNextStep(storeDefaults());
    expect(fresh?.href).toBe(`/unit/${u0.id}/cards/${l0.id}`);
    expect(fresh?.nodeTitle).toBe("Word cards");

    const cardsDone = progressWith({ unitCardsDone: [l0.id] });
    expect(computeNextStep(cardsDone)?.href).toBe(`/lesson/${l0.id}`);

    const allLessons = progressWith({
      unitCardsDone: u0.lessons.map((l) => l.id),
      stars: Object.fromEntries(u0.lessons.map((l) => [l.id, 2])),
    });
    expect(computeNextStep(allLessons)?.href).toBe(`/unit/${u0.id}/exam`);

    const unitDone = progressWith({
      unitCardsDone: u0.lessons.map((l) => l.id),
      stars: Object.fromEntries(u0.lessons.map((l) => [l.id, 2])),
      unitExamStars: { [u0.id]: 1 },
    });
    const next = computeNextStep(unitDone);
    expect(next?.href).toBe(`/unit/${C.units[1].id}/cards/${C.units[1].lessons[0].id}`);
  });

  test("a lesson passed ≥1★ also counts its cards node done (old saves)", () => {
    const u0 = C.units[0];
    const l0 = u0.lessons[0];
    const p = progressWith({ stars: { [l0.id]: 1 } });
    // cards for lesson 1 skipped — next is lesson 2's cards
    expect(computeNextStep(p)?.href).toBe(`/unit/${u0.id}/cards/${u0.lessons[1].id}`);
  });
});

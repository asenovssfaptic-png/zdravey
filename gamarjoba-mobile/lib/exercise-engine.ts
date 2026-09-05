/* Gamarjoba! mobile — exercise engine.
 *
 * Pure TypeScript, ZERO React Native imports. A faithful port of the
 * builders, distractor logic, retry policy and progress selectors in the
 * web app's app.js (the product spec). All randomness is injectable
 * (`rng`) so tests are deterministic.
 */

import { CURRICULUM } from "../content/generated/curriculum";
import type {
  AlphabetGroup,
  Lesson,
  Letter,
  LettersGroup,
  ReadingStep,
  RecipeItem,
  Speakable,
  Syllable,
  Unit,
  VocabItem,
  ExerciseType,
} from "../content/types";
import type { Progress } from "./store";
import { defaultRng, type Rng } from "./rng";

const C = CURRICULUM;

/* ------------------------------------------------------------------ *
 * Curriculum lookups (module-level, computed once)
 * ------------------------------------------------------------------ */

export const ALL_WORDS: VocabItem[] = Object.keys(C.vocab).map((id) => C.vocab[id]);

export const ALL_LETTERS: Letter[] = C.alphabet.flatMap((g) => g.letters);

export const LETTER_BY_KA: Record<string, Letter> = Object.fromEntries(
  ALL_LETTERS.map((l) => [l.ka, l])
);

export const SYLLABLES: Record<string, Syllable> = Object.fromEntries(
  (C.readingTrack?.syllables ?? []).map((x) => [x.id, x])
);

export const READ_EXTRAS: Record<string, VocabItem> = Object.fromEntries(
  (C.readingTrack?.extras ?? []).map((x) => [x.id, x])
);

/** extras first, then the whole vocabulary — the reading distractor pool. */
export const READ_POOL: VocabItem[] = (C.readingTrack?.extras ?? []).concat(ALL_WORDS);

/** vocab ∪ reading extras ∪ syllables. */
export function readItem(id: string): VocabItem | Syllable | null {
  return C.vocab[id] ?? READ_EXTRAS[id] ?? SYLLABLES[id] ?? null;
}

export function wordsOf(ids: string[]): VocabItem[] {
  return ids.map((id) => C.vocab[id]).filter((w): w is VocabItem => !!w);
}

export function unitWords(unit: Unit): VocabItem[] {
  return wordsOf(unit.lessons.flatMap((l) => l.items));
}

export function findUnit(unitId: string): Unit | null {
  return C.units.find((u) => u.id === unitId) ?? null;
}

export function findLesson(
  lessonId: string
): { unit: Unit; lesson: Lesson; index: number } | null {
  for (const u of C.units) {
    const j = u.lessons.findIndex((l) => l.id === lessonId);
    if (j !== -1) return { unit: u, lesson: u.lessons[j], index: j };
  }
  return null;
}

export function alphaGroupById(groupId: string): AlphabetGroup | null {
  return C.alphabet.find((g) => g.id === groupId) ?? null;
}

export function findPathGroup(groupId: string): LettersGroup | null {
  return C.lettersPath.groups.find((g) => g.groupId === groupId) ?? null;
}

export function findReadingStep(stepId: string): ReadingStep | null {
  return C.readingTrack.steps.find((s) => s.id === stepId) ?? null;
}

/** Buildable as a letter-tile word: 3–7 pure Mkhedruli letters. */
export function isBuildable(word: { ka: string }): boolean {
  return /^[ა-ჿ]{3,7}$/.test(word.ka);
}

/* ------------------------------------------------------------------ *
 * Randomized helpers (rng injectable)
 * ------------------------------------------------------------------ */

export function shuffle<T>(arr: readonly T[], rng: Rng = defaultRng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

/** Pick n distractors for `word`, trying each tier in order; never a
 * duplicate id and never a duplicate English gloss. */
export function pickDistractors(
  word: VocabItem,
  n: number,
  tiers: VocabItem[][],
  rng: Rng = defaultRng
): VocabItem[] {
  const out: VocabItem[] = [];
  const seenId = new Set([word.id]);
  const seenEn = new Set([word.en]);
  for (let t = 0; t < tiers.length && out.length < n; t++) {
    const cand = shuffle(tiers[t], rng);
    for (let i = 0; i < cand.length && out.length < n; i++) {
      const w = cand[i];
      if (seenId.has(w.id) || seenEn.has(w.en)) continue;
      seenId.add(w.id);
      seenEn.add(w.en);
      out.push(w);
    }
  }
  return out;
}

/** Pick n items distinct-by-ka from tiered pools (letters / syllables). */
export function pickByKa<T extends { ka: string }>(
  target: T,
  n: number,
  tiers: readonly T[][],
  rng: Rng = defaultRng
): T[] {
  const out: T[] = [];
  const seen = new Set([target.ka]);
  for (let t = 0; t < tiers.length && out.length < n; t++) {
    const cand = shuffle(tiers[t] ?? [], rng);
    for (let i = 0; i < cand.length && out.length < n; i++) {
      if (seen.has(cand[i].ka)) continue;
      seen.add(cand[i].ka);
      out.push(cand[i]);
    }
  }
  return out;
}

/** Pad a match-pairs word list toward `target` using tiers, never
 * duplicating id or English gloss. */
export function padPairWords(
  base: VocabItem[],
  tiers: VocabItem[][],
  target: number,
  rng: Rng = defaultRng
): VocabItem[] {
  const words = base.slice(0, target);
  const seenId = new Set(words.map((w) => w.id));
  const seenEn = new Set(words.map((w) => w.en));
  for (let t = 0; t < tiers.length && words.length < target; t++) {
    const cand = shuffle(tiers[t], rng);
    for (let i = 0; i < cand.length && words.length < target; i++) {
      const w = cand[i];
      if (seenId.has(w.id) || seenEn.has(w.en)) continue;
      seenId.add(w.id);
      seenEn.add(w.en);
      words.push(w);
    }
  }
  return words;
}

/* ------------------------------------------------------------------ *
 * Exercise model (discriminated union — exactly the web props)
 * ------------------------------------------------------------------ */

/** letter_to_sound accepts a Letter OR a Syllable (both have ka+translit). */
export type SoundItem = Letter | Speakable;

interface ExerciseBase {
  key: string;
  retry: boolean;
}

interface PickWordBase extends ExerciseBase {
  word: VocabItem;
  tiers: VocabItem[][];
  /** option count − 1; defaults to 3 (letters-read honestly offers 2). */
  distractors?: number;
}

export interface PickPictureExercise extends PickWordBase {
  type: "pick_picture";
}
export interface ReversePickExercise extends PickWordBase {
  type: "reverse_pick";
}
export interface ReadWordPickPictureExercise extends PickWordBase {
  type: "read_word_pick_picture";
}
export interface PicturePickWordExercise extends PickWordBase {
  type: "picture_pick_word";
}
export interface HearPickWordExercise extends PickWordBase {
  type: "hear_pick_word";
}

/** The five picture/word choice exercises share one prop shape. */
export type PickWordExercise =
  | PickPictureExercise
  | ReversePickExercise
  | ReadWordPickPictureExercise
  | PicturePickWordExercise
  | HearPickWordExercise;

export interface MatchPairsExercise extends ExerciseBase {
  type: "match_pairs";
  words: VocabItem[];
}

interface BuildBase extends ExerciseBase {
  word: Speakable;
  /** distractor tiles drawn only from these letters when given. */
  letterPool?: Letter[];
}

export interface BuildWordExercise extends BuildBase {
  type: "build_word";
}
export interface BuildSyllableExercise extends BuildBase {
  type: "build_syllable";
}

export interface BuildPhraseExercise extends ExerciseBase {
  type: "build_phrase";
  word: VocabItem;
  pool: VocabItem[];
}

export interface HearPickLetterExercise extends ExerciseBase {
  type: "hear_pick_letter";
  letter: Letter;
  pool: Letter[];
}

export interface LetterToSoundExercise extends ExerciseBase {
  type: "letter_to_sound";
  item: SoundItem;
  pool: SoundItem[];
}

export interface TraceLetterExercise extends ExerciseBase {
  type: "trace_letter";
  letter: Letter;
}

export type Exercise =
  | PickWordExercise
  | MatchPairsExercise
  | BuildWordExercise
  | BuildSyllableExercise
  | BuildPhraseExercise
  | HearPickLetterExercise
  | LetterToSoundExercise
  | TraceLetterExercise;

let exerciseKeyCounter = 0;

function key(): string {
  return "ex" + ++exerciseKeyCounter;
}

function makeEx<T extends Exercise["type"]>(
  type: T,
  props: Omit<Extract<Exercise, { type: T }>, "type" | "key" | "retry">
): Extract<Exercise, { type: T }> {
  return { type, key: key(), retry: false, ...props } as Extract<Exercise, { type: T }>;
}

/* ------------------------------------------------------------------ *
 * Session policy — retries, XP, stars. (Positive-only: stars floor at 1.)
 * ------------------------------------------------------------------ */

export type SessionMode =
  | "lesson"
  | "practice"
  | "letters-exam"
  | "letters-read"
  | "reading-practice"
  | "reading-exam"
  | "unit-exam";

export interface SessionConfig {
  mode: SessionMode;
  title: string;
  exercises: Exercise[];
  lessonId?: string;
  unitId?: string;
  groupId?: string;
  stepId?: string;
}

/** What an exercise renderer reports back to the session player. */
export interface ExerciseResult {
  correct: boolean;
  firstTry: boolean;
  /** Screen-reader announcement for the result. */
  announce?: string;
}

/** Exercise types that get one quiet retry after a miss. */
export const RETRY_TYPES: ReadonlySet<ExerciseType> = new Set([
  "pick_picture",
  "reverse_pick",
  "hear_pick_letter",
  "letter_to_sound",
  "read_word_pick_picture",
  "picture_pick_word",
  "hear_pick_word",
]);

/** Retries are capped per session so "about N questions" stays honest. */
export const RETRY_CAP = 3;

/** A missed item re-appears two exercises later (clamped to the end). */
export function retryInsertIndex(idx: number, queueLength: number): number {
  return Math.min(idx + 3, queueLength);
}

/** Clone a missed exercise for its quiet retry (fresh key, retry: true). */
export function cloneAsRetry(ex: Exercise): Exercise {
  return { ...ex, key: key(), retry: true };
}

/** Per-answer XP: practice flat 5; otherwise 10 for a clean first try on a
 * non-retry item, 5 for everything else. */
export function xpForCorrect(mode: SessionMode, firstTry: boolean, isRetryItem: boolean): number {
  if (mode === "practice") return 5;
  return firstTry && !isRetryItem ? 10 : 5;
}

/** Finish-line XP bonus per mode — exactly the web finishSession: lessons
 * and exams get a bonus (unit exam the biggest), practice modes get none
 * (their reward is the practice star / praise). */
export function finishBonus(mode: SessionMode): number {
  if (mode === "practice" || mode === "reading-practice" || mode === "letters-read") return 0;
  return mode === "unit-exam" ? 30 : 20;
}

/** ≥90% → 3★, ≥60% → 2★, else 1★ — NEVER 0. Finishing always earns a star. */
export function starsForAccuracy(score: number, total: number): 1 | 2 | 3 {
  const acc = total ? score / total : 1;
  return acc >= 0.9 ? 3 : acc >= 0.6 ? 2 : 1;
}

/* ------------------------------------------------------------------ *
 * Builders (ports of app.js buildXxx — same counts, same fallbacks)
 * ------------------------------------------------------------------ */

export function buildLessonExercises(unit: Unit, lesson: Lesson, rng: Rng = defaultRng): Exercise[] {
  const items = wordsOf(lesson.items);
  const tiers = [items, unitWords(unit), ALL_WORDS];
  const exs: Exercise[] = [];

  shuffle(items, rng).forEach((w) => {
    exs.push(makeEx("pick_picture", { word: w, tiers }));
  });

  const nReverse = Math.max(1, Math.min(items.length, 8 - items.length - 2));
  shuffle(items, rng)
    .slice(0, nReverse)
    .forEach((w) => {
      exs.push(makeEx("reverse_pick", { word: w, tiers }));
    });

  const pairWords = padPairWords(shuffle(items, rng), tiers, 5, rng);
  if (pairWords.length >= 3) {
    exs.push(makeEx("match_pairs", { words: pairWords }));
  }

  const buildable = items.filter(isBuildable);
  if (buildable.length) {
    exs.push(makeEx("build_word", { word: shuffle(buildable, rng)[0] }));
  }

  // later units sprinkle in the reading exercises (read the Georgian word)
  if (C.units.indexOf(unit) >= 3) {
    const readPool = shuffle(items, rng);
    exs.push(makeEx("read_word_pick_picture", { word: readPool[0], tiers }));
    exs.push(makeEx("picture_pick_word", { word: readPool[readPool.length - 1], tiers }));
  }

  // keep a picture exercise first (friendliest opener), mix the rest
  return [exs[0], ...shuffle(exs.slice(1), rng)];
}

export function buildPracticeExercises(progress: Progress, rng: Rng = defaultRng): Exercise[] {
  const pool = learnedWords(progress).slice();
  pool.sort(
    (a, b) => (progress.lastPracticed[a.id] ?? 0) - (progress.lastPracticed[b.id] ?? 0)
  );
  const tiers = [pool, ALL_WORDS];
  const exs: Exercise[] = [];
  let wi = 0;
  const nextWord = (): VocabItem => pool[wi++ % pool.length];

  const plan: ExerciseType[] = [
    "pick_picture",
    "reverse_pick",
    "pick_picture",
    "build_word",
    "pick_picture",
    "reverse_pick",
    "match_pairs",
    "pick_picture",
    "reverse_pick",
    "pick_picture",
  ];
  plan.forEach((planned) => {
    let type = planned;
    if (type === "match_pairs") {
      const pairWords = padPairWords(shuffle(pool, rng).slice(0, 5), [ALL_WORDS], 5, rng);
      if (pairWords.length >= 3) {
        exs.push(makeEx("match_pairs", { words: pairWords }));
        return;
      }
      type = "pick_picture";
    }
    if (type === "build_word") {
      const buildable = pool.filter(isBuildable);
      if (buildable.length) {
        exs.push(makeEx("build_word", { word: shuffle(buildable, rng)[0] }));
        return;
      }
      type = "pick_picture";
    }
    if (type === "pick_picture" || type === "reverse_pick") {
      exs.push(makeEx(type, { word: nextWord(), tiers }));
    }
  });
  return exs;
}

export function buildUnitExam(unit: Unit, rng: Rng = defaultRng): Exercise[] {
  const words = unitWords(unit);
  const idx = C.units.indexOf(unit);
  let earlier: VocabItem[] = [];
  for (let j = 0; j < idx; j++) earlier = earlier.concat(unitWords(C.units[j]));
  const tiers = [words, ALL_WORDS];
  const deck = shuffle(words, rng);
  let wi = 0;
  const nextW = (): VocabItem => deck[wi++ % deck.length];

  const exs: Exercise[] = [];
  (C.unitExamRecipe ?? []).forEach((r) => {
    for (let c = 0; c < (r.count ?? 1); c++) {
      let type = r.type;
      if (r.from === "earlier-units") {
        // review sprinkle — the first unit has no earlier units, so it
        // draws from itself (never skipped, never a blocker)
        const pool = earlier.length ? earlier : words;
        exs.push(
          makeEx(type as PickWordExercise["type"], {
            word: shuffle(pool, rng)[0],
            tiers: [pool, ALL_WORDS],
          })
        );
        continue;
      }
      if (type === "match_pairs") {
        const pw = padPairWords(shuffle(words, rng).slice(0, 5), [ALL_WORDS], 5, rng);
        if (pw.length >= 3) {
          exs.push(makeEx("match_pairs", { words: pw }));
          continue;
        }
        type = "pick_picture";
      }
      if (type === "build_word") {
        const buildable = words.filter(isBuildable);
        if (buildable.length) {
          exs.push(makeEx("build_word", { word: shuffle(buildable, rng)[0] }));
          continue;
        }
        type = r.fallback ?? "picture_pick_word";
      }
      exs.push(makeEx(type as PickWordExercise["type"], { word: nextW(), tiers }));
    }
  });
  return exs;
}

export function buildLetterExam(pathGroup: LettersGroup, rng: Rng = defaultRng): Exercise[] {
  const group = alphaGroupById(pathGroup.groupId);
  if (!group) return [];
  const gi = C.alphabet.indexOf(group);
  const own = group.letters;
  let earlier: Letter[] = [];
  for (let j = 0; j < gi; j++) earlier = earlier.concat(C.alphabet[j].letters);
  const deck = shuffle(own, rng);
  let oi = 0;
  const nextOwn = (): Letter => deck[oi++ % deck.length];

  const exs: Exercise[] = [];
  (pathGroup.steps.exam.recipe ?? []).forEach((r) => {
    for (let c = 0; c < (r.count ?? 1); c++) {
      if (r.type === "hear_pick_letter" || r.type === "letter_to_sound") {
        const fromEarlier = r.from === "earlier-groups" && earlier.length > 0;
        const letter = fromEarlier ? shuffle(earlier, rng)[0] : nextOwn();
        const pool = fromEarlier ? earlier : own;
        if (r.type === "hear_pick_letter") {
          exs.push(makeEx("hear_pick_letter", { letter, pool }));
        } else {
          exs.push(makeEx("letter_to_sound", { item: letter, pool }));
        }
      } else if (r.type === "trace_letter") {
        exs.push(makeEx("trace_letter", { letter: nextOwn() }));
      } else if (r.type === "build_syllable") {
        const ids = (r.syllablePool ?? []).slice();
        const syl = ids.length ? SYLLABLES[shuffle(ids, rng)[0]] : null;
        // distractor tiles come from letters learned so far (own + earlier),
        // never from groups the child hasn't met yet
        if (syl) {
          exs.push(makeEx("build_syllable", { word: syl, letterPool: own.concat(earlier) }));
        } else {
          exs.push(makeEx("hear_pick_letter", { letter: nextOwn(), pool: own }));
        }
      }
    }
  });
  return exs;
}

function earlierStepWords(step: ReadingStep): VocabItem[] {
  const idx = C.readingTrack.steps.indexOf(step);
  const pool: VocabItem[] = [];
  for (let j = 0; j < idx; j++) {
    C.readingTrack.steps[j].items.forEach((id) => {
      const it = readItem(id);
      if (it && "en" in it) pool.push(it);
    });
  }
  return pool;
}

export function buildReadingExercises(
  step: ReadingStep,
  which: "practice" | "exam",
  rng: Rng = defaultRng
): Exercise[] {
  const recipe: RecipeItem[] = which === "practice" ? step.practice : step.exam;
  const items = step.items.map(readItem).filter((x): x is VocabItem | Syllable => !!x);
  const words = items.filter((w): w is VocabItem => "en" in w);
  const syls = items.filter((w): w is Syllable => !("en" in w));
  const sylPool: Speakable[] = syls.length ? syls : C.readingTrack?.syllables ?? [];
  const tiers = [words, READ_POOL];

  const wdeck = shuffle(words, rng);
  let wi = 0;
  const nextW = (): VocabItem => wdeck[wi++ % wdeck.length];
  const sdeck = shuffle(sylPool, rng);
  let si = 0;
  const nextS = (): Speakable => sdeck[si++ % sdeck.length];

  const chSet = new Set<string>();
  sylPool.forEach((it) => {
    String(it.ka)
      .split("")
      .forEach((ch) => {
        if (LETTER_BY_KA[ch]) chSet.add(ch);
      });
  });
  const stepLetters = [...chSet].map((ch) => LETTER_BY_KA[ch]);

  const exs: Exercise[] = [];
  (recipe ?? []).forEach((r) => {
    for (let c = 0; c < (r.count ?? 1); c++) {
      if (r.type === "build_syllable") {
        const syl = r.syllablePool ? SYLLABLES[shuffle(r.syllablePool.slice(), rng)[0]] : nextS();
        if (syl) exs.push(makeEx("build_syllable", { word: syl }));
      } else if (r.type === "letter_to_sound") {
        exs.push(makeEx("letter_to_sound", { item: nextS(), pool: sylPool }));
      } else if (r.type === "hear_pick_letter") {
        const L = stepLetters.length ? shuffle(stepLetters, rng)[0] : shuffle(ALL_LETTERS, rng)[0];
        exs.push(makeEx("hear_pick_letter", { letter: L, pool: stepLetters }));
      } else if (r.type === "read_word_pick_picture") {
        let w = nextW();
        if (r.from === "earlier-steps") {
          const earlier = earlierStepWords(step);
          if (earlier.length) w = shuffle(earlier, rng)[0];
        }
        exs.push(makeEx("read_word_pick_picture", { word: w, tiers }));
      } else if (r.type === "picture_pick_word") {
        exs.push(makeEx("picture_pick_word", { word: nextW(), tiers }));
      } else if (r.type === "hear_pick_word") {
        exs.push(makeEx("hear_pick_word", { word: nextW(), tiers }));
      } else if (r.type === "build_phrase") {
        const phrases = words.filter((pw) => String(pw.ka).includes(" "));
        if (phrases.length) {
          exs.push(makeEx("build_phrase", { word: shuffle(phrases, rng)[0], pool: phrases }));
        } else {
          exs.push(makeEx("picture_pick_word", { word: nextW(), tiers }));
        }
      } else if (r.type === "build_word") {
        const buildable = words.filter((bw) => /^[ა-ჿ]{2,7}$/.test(bw.ka));
        if (buildable.length) {
          exs.push(makeEx("build_word", { word: shuffle(buildable, rng)[0] }));
        } else {
          exs.push(makeEx("picture_pick_word", { word: nextW(), tiers }));
        }
      } else if (r.type === "match_pairs") {
        const pw = padPairWords(shuffle(words, rng).slice(0, 5), [ALL_WORDS], 5, rng);
        if (pw.length >= 3) exs.push(makeEx("match_pairs", { words: pw }));
      }
    }
  });
  return exs;
}

/** v4 — "Read with these letters": no-stars bonus node per letters group.
 * Every pool uses ONLY letters learned by that group. */
export function buildLettersRead(pg: LettersGroup, rng: Rng = defaultRng): Exercise[] {
  const read = pg.steps.read;
  if (!read?.pool) return [];
  const sylItems = read.pool.syllables
    .map((id) => SYLLABLES[id])
    .filter((x): x is Syllable => !!x);
  const poolWords = read.pool.words
    .map(readItem)
    .filter((x): x is VocabItem => !!x && "en" in x);
  const earlier: VocabItem[] = []; // union of pool.words of lower-order groups
  C.lettersPath.groups.forEach((g) => {
    if (g.order < pg.order && g.steps.read?.pool) {
      g.steps.read.pool.words.forEach((id) => {
        const it = readItem(id);
        if (it && "en" in it) earlier.push(it);
      });
    }
  });
  const tiers = [poolWords, earlier, READ_POOL];
  // group-1's tiny word pool honestly supplies only 2 distractors → 3 options
  const nDistract = poolWords.length >= 4 ? 3 : 2;
  // letters learned by this group (own + earlier) — distractor tiles in
  // build_syllable stay readable, honoring the only-learned-letters contract
  let groupLetters: Letter[] = [];
  C.lettersPath.groups.forEach((g) => {
    if (g.order <= pg.order) {
      const ag = alphaGroupById(g.groupId);
      if (ag) groupLetters = groupLetters.concat(ag.letters);
    }
  });

  const sdeck = shuffle(sylItems, rng);
  let si = 0;
  const nextS = (): Syllable => sdeck[si++ % sdeck.length];
  const wdeck = shuffle(poolWords, rng);
  let wi = 0;
  const nextW = (): VocabItem => wdeck[wi++ % wdeck.length];

  const exs: Exercise[] = [];
  (read.recipe ?? []).forEach((r) => {
    for (let c = 0; c < (r.count ?? 1); c++) {
      if (r.type === "build_syllable") {
        exs.push(makeEx("build_syllable", { word: nextS(), letterPool: groupLetters }));
      } else if (r.type === "letter_to_sound") {
        exs.push(makeEx("letter_to_sound", { item: nextS(), pool: sylItems }));
      } else if (r.type === "hear_pick_word") {
        exs.push(makeEx("hear_pick_word", { word: nextW(), tiers, distractors: nDistract }));
      } else if (r.type === "read_word_pick_picture") {
        exs.push(
          makeEx("read_word_pick_picture", { word: nextW(), tiers, distractors: nDistract })
        );
      } else if (r.type === "picture_pick_word") {
        exs.push(makeEx("picture_pick_word", { word: nextW(), tiers, distractors: nDistract }));
      }
    }
  });
  return exs;
}

/* ------------------------------------------------------------------ *
 * Progress selectors (pure over Progress)
 * ------------------------------------------------------------------ */

/** Cards node counts done for anyone who already passed practice
 * (old saves are never sent back to flashcards). */
export function cardsNodeDone(progress: Progress, lessonId: string): boolean {
  return progress.unitCardsDone.includes(lessonId) || (progress.stars[lessonId] ?? 0) >= 1;
}

export function lessonsDone(progress: Progress, unit: Unit): number {
  return unit.lessons.filter((l) => (progress.stars[l.id] ?? 0) >= 1).length;
}

export function unitCompleted(progress: Progress, unit: Unit): boolean {
  return lessonsDone(progress, unit) === unit.lessons.length;
}

export function unitNodeCounts(progress: Progress, unit: Unit): { done: number; total: number } {
  const total = unit.lessons.length * 2 + 1;
  let done = 0;
  unit.lessons.forEach((l) => {
    if (cardsNodeDone(progress, l.id)) done++;
    if ((progress.stars[l.id] ?? 0) >= 1) done++;
  });
  if ((progress.unitExamStars[unit.id] ?? 0) >= 1) done++;
  return { done, total };
}

/** Every word met via finished cards or a passed lesson, plus collected
 * words of the day; falls back to lesson 1's items so practice always has
 * something friendly to offer. */
export function learnedWords(progress: Progress): VocabItem[] {
  let ids: string[] = [];
  C.units.forEach((u) => {
    u.lessons.forEach((l) => {
      if ((progress.stars[l.id] ?? 0) >= 1 || progress.unitCardsDone.includes(l.id)) {
        ids = ids.concat(l.items);
      }
    });
  });
  ids = ids.concat(progress.wodCollected.filter((id) => !!C.vocab[id]));
  if (ids.length === 0) ids = C.units[0].lessons[0].items.slice();
  const seen = new Set<string>();
  return wordsOf(ids).filter((w) => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });
}

/** Set of Mkhedruli chars appearing in words of lessons passed ≥1★. */
export function learnedLetterSet(progress: Progress): Set<string> {
  const set = new Set<string>();
  C.units.forEach((u) => {
    u.lessons.forEach((l) => {
      if ((progress.stars[l.id] ?? 0) >= 1) {
        wordsOf(l.items).forEach((w) => {
          String(w.ka)
            .split("")
            .forEach((ch) => {
              if (ch >= "ა" && ch <= "ჿ") set.add(ch);
            });
        });
      }
    });
  });
  return set;
}

export function lettersGroupsDone(progress: Progress): number {
  return C.lettersPath.groups.filter(
    (g) =>
      progress.lettersMeetDone.includes(g.groupId) &&
      progress.lettersTraceDone.includes(g.groupId) &&
      (progress.lettersExamStars[g.groupId] ?? 0) >= 1
  ).length;
}

export function readingStepsDone(progress: Progress): number {
  return C.readingTrack.steps.filter(
    (st) =>
      progress.readingCardsDone.includes(st.id) &&
      progress.readingPracticeDone.includes(st.id) &&
      (progress.readingExamStars[st.id] ?? 0) >= 1
  ).length;
}

export function totalStars(progress: Progress): number {
  let t = progress.practiceStars ?? 0;
  for (const map of [
    progress.stars,
    progress.lettersExamStars,
    progress.readingExamStars,
    progress.unitExamStars,
  ]) {
    Object.keys(map).forEach((k) => {
      t += map[k] ?? 0;
    });
  }
  return t;
}

export interface StarsBreakdown {
  lessons: number;
  unitEx: number;
  letters: number;
  reading: number;
  practice: number;
}

export function starsBreakdown(progress: Progress): StarsBreakdown {
  const sum = (m: Record<string, number>) =>
    Object.keys(m).reduce((n, k) => n + (m[k] ?? 0), 0);
  return {
    lessons: sum(progress.stars),
    unitEx: sum(progress.unitExamStars),
    letters: sum(progress.lettersExamStars),
    reading: sum(progress.readingExamStars),
    practice: progress.practiceStars ?? 0,
  };
}

export interface NextStep {
  /** expo-router href of the friendliest next tap — NEVER a lock. */
  href: string;
  nodeTitle: string;
  unit: Unit;
  lesson: Lesson | null;
}

/** ONE global next step across the course units. Never a lock — just the
 * friendliest place to tap next. Null when every unit is complete. */
export function computeNextStep(progress: Progress): NextStep | null {
  for (const u of C.units) {
    for (const l of u.lessons) {
      if (!cardsNodeDone(progress, l.id)) {
        return { href: `/unit/${u.id}/cards/${l.id}`, nodeTitle: "Word cards", unit: u, lesson: l };
      }
      if ((progress.stars[l.id] ?? 0) < 1) {
        return { href: `/lesson/${l.id}`, nodeTitle: "Practice", unit: u, lesson: l };
      }
    }
    if ((progress.unitExamStars[u.id] ?? 0) < 1) {
      return { href: `/unit/${u.id}/exam`, nodeTitle: "Unit exam", unit: u, lesson: null };
    }
  }
  return null;
}

/** Deterministic word of the day for a date key: 31-hash over un-collected
 * bonus words first (so the bonus pool completes), then the whole
 * vocabulary. Pure — the caller pins it via store.setWod. */
export function wordOfDay(progress: Progress, dateKey: string): VocabItem {
  if (progress.wodDate === dateKey && progress.wodId && C.vocab[progress.wodId]) {
    return C.vocab[progress.wodId];
  }
  const pool = (C.bonusWords ?? []).filter(
    (id) => C.vocab[id] && !progress.wodCollected.includes(id)
  );
  const ids = pool.length ? pool : Object.keys(C.vocab);
  let hsh = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hsh = (hsh * 31 + dateKey.charCodeAt(i)) % 1000003;
  }
  return C.vocab[ids[hsh % ids.length]];
}

/** Reading-stroll pool: union of items of every reading step with ANY
 * progress, de-duped; falls back to read-1's items. */
export function strollPool(progress: Progress): (VocabItem | Syllable)[] {
  let ids: string[] = [];
  C.readingTrack.steps.forEach((st) => {
    const started =
      progress.readingCardsDone.includes(st.id) ||
      progress.readingPracticeDone.includes(st.id) ||
      (progress.readingExamStars[st.id] ?? 0) >= 1;
    if (started) ids = ids.concat(st.items);
  });
  if (!ids.length) {
    const first = findReadingStep("read-1");
    ids = first ? first.items.slice() : [];
  }
  const seen = new Set<string>();
  return ids
    .map(readItem)
    .filter((it): it is VocabItem | Syllable => {
      if (!it || seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });
}

/** Letter-safari pool: letters of every met group, union group-1 as floor. */
export function safariLetterPool(progress: Progress): Letter[] {
  let out: Letter[] = [];
  C.alphabet.forEach((g) => {
    if (g.id === "group-1" || progress.lettersMeetDone.includes(g.id)) {
      out = out.concat(g.letters);
    }
  });
  return out;
}

/* ------------------------------------------------------------------ *
 * Honest "about N questions" counters (deterministic)
 * ------------------------------------------------------------------ */

/** Deterministic count of a lesson's practice exercises — shuffles change
 * order, never counts. */
export function lessonExerciseCount(unit: Unit, lesson: Lesson): number {
  const items = wordsOf(lesson.items);
  let n = items.length; // pick_picture per item
  n += Math.max(1, Math.min(items.length, 8 - items.length - 2)); // reverse picks
  const pairWords = padPairWords(items.slice(), [items, unitWords(unit), ALL_WORDS], 5);
  if (pairWords.length >= 3) n += 1; // match_pairs
  if (items.filter(isBuildable).length) n += 1; // build_word
  if (C.units.indexOf(unit) >= 3) n += 2; // reading pair
  return n;
}

export function recipeQuestionCount(recipe: RecipeItem[] | undefined): number {
  return (recipe ?? []).reduce((n, r) => n + (r.count ?? 1), 0);
}

export function unitExamQuestionCount(): number {
  return recipeQuestionCount(C.unitExamRecipe);
}

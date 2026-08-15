// check-content.mjs — content-integrity guard for the single source of truth.
//
// WHY THIS EXISTS: the content model is a web of string ids. A Unit's exercise
// references vocab by id ("fruit.apple"), and the direction-agnostic build
// helpers (buildPickPicture, buildMatchPairs, …) do UNGUARDED `VOCAB[id]`
// lookups. A typo'd id ("fruit.aple") is a plain string — TypeScript and ESLint
// both pass it — but it explodes at RUNTIME the moment a child opens that
// lesson (`Cannot read properties of undefined`). This script closes that gap:
// it walks every Unit/exercise and asserts the graph is sound BEFORE we ship.
//
// It also checks the invariants that keep the app bilingual + audio-first:
//   • every VocabItem has both language labels and both audio clips
//   • every referenced audio src is present in the generated require-map
//     (lib/audioAssets.ts) — a missing clip means a silent prompt, which
//     violates the audio-first rule
//   • find_on_map targets carry map coordinates
//   • sequence/build_phrase/story shapes are internally consistent
//
// Runs in CI (see .github/workflows/ci.yml) via Node type-stripping, the same
// way the generators read the model. Exits non-zero with a list of problems.
//
//   node --experimental-strip-types scripts/check-content.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ALPHABET,
  CHALLENGE,
  PRAISE,
  UNITS,
  VOCAB,
} from "../content/content-model.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const err = (where, msg) => problems.push(`${where}: ${msg}`);

// --- The bundled audio require-map: the set of srcs Metro can actually load ---
// Parsed straight from the generated file so this check mirrors the real app.
const audioMapSrc = readFileSync(join(ROOT, "lib/audioAssets.ts"), "utf8");
// Keys are audio paths (.mp3 for TTS placeholders, .wav for the original hand
// recordings) mapped to require() calls — accept either extension.
const AUDIO_SRCS = new Set([...audioMapSrc.matchAll(/"([^"]+\.(?:mp3|wav))":\s*require/g)].map((m) => m[1]));

function checkClip(where, clip) {
  if (!clip || typeof clip.src !== "string" || clip.src === "") {
    err(where, "missing audio clip");
    return;
  }
  if (!AUDIO_SRCS.has(clip.src)) {
    err(where, `audio "${clip.src}" not in lib/audioAssets.ts (run npm run generate:audio)`);
  }
}

// --- 1. VOCAB itself is well-formed ------------------------------------------
for (const [key, v] of Object.entries(VOCAB)) {
  const w = `VOCAB["${key}"]`;
  if (v.id !== key) err(w, `id "${v.id}" does not match its key`);
  for (const lang of ["bg", "en"]) {
    if (!v.labels?.[lang]) err(w, `missing ${lang} label`);
    checkClip(`${w}.audio.${lang}`, v.audio?.[lang]);
  }
  if (v.map && (typeof v.map.x !== "number" || typeof v.map.y !== "number")) {
    err(w, "map coordinate is not a {x,y} number pair");
  }
}

// --- 2. Every exercise's vocab references resolve ----------------------------
const need = (where, id) => {
  if (!VOCAB[id]) err(where, `references unknown vocab id "${id}"`);
  return !!VOCAB[id];
};

const seenLessonIds = new Set();
for (const unit of UNITS) {
  for (const lesson of unit.lessons) {
    if (seenLessonIds.has(lesson.id)) err(`Unit "${unit.id}"`, `duplicate lesson id "${lesson.id}"`);
    seenLessonIds.add(lesson.id);
    if (!lesson.title?.bg || !lesson.title?.en) err(`Lesson "${lesson.id}"`, "missing a title translation");

    lesson.exercises.forEach((ex, i) => {
      const w = `Lesson "${lesson.id}" ex[${i}] (${ex.type})`;
      const choices = ex.choices ?? [];
      switch (ex.type) {
        case "pick_picture":
        case "match_pairs":
        case "odd_one_out":
          need(w, ex.prompt);
          choices.forEach((id) => need(w, id));
          if (choices.length === 0) err(w, "needs at least one choice");
          break;
        case "say_it":
          need(w, ex.prompt);
          break;
        case "true_false":
          need(w, ex.prompt);
          if (ex.claim) need(w, ex.claim);
          break;
        case "sequence":
          // `prompt` is a synthetic sequence id (not vocab); `choices` is the
          // correct order and must be real, non-empty vocab.
          if (choices.length < 2) err(w, "sequence needs at least two choices");
          choices.forEach((id) => need(w, id));
          break;
        case "find_on_map": {
          need(w, ex.prompt);
          choices.forEach((id) => need(w, id));
          const target = VOCAB[ex.prompt];
          if (target && !target.map) err(w, `find_on_map target "${ex.prompt}" has no map coordinate`);
          break;
        }
        case "story": {
          if (!ex.story?.lines?.length) {
            err(w, "story has no lines");
            break;
          }
          ex.story.lines.forEach((line, li) => {
            const lw = `${w} line[${li}]`;
            if (!line.text?.bg || !line.text?.en) err(lw, "missing a text translation");
            checkClip(`${lw}.audio.bg`, line.audio?.bg);
            checkClip(`${lw}.audio.en`, line.audio?.en);
            if (line.spotlight) need(lw, line.spotlight);
          });
          break;
        }
        case "build_phrase": {
          const p = ex.phrase;
          if (!p) {
            err(w, "build_phrase has no phrase content");
            break;
          }
          for (const lang of ["bg", "en"]) {
            if (!p.text?.[lang]) err(w, `phrase missing ${lang} text`);
            if (!Array.isArray(p.tokens?.[lang]) || p.tokens[lang].length === 0)
              err(w, `phrase missing ${lang} tokens`);
            checkClip(`${w}.phrase.audio.${lang}`, p.audio?.[lang]);
          }
          break;
        }
        case "letter_sound":
          // Alphabet track exercise — validated via ALPHABET below, no vocab ref.
          break;
        default:
          err(w, `unknown exercise type "${ex.type}"`);
      }
    });
  }
}

// --- 3. Alphabet + the fixed spoken lines (praise/challenge) are voiced -------
for (const [script, letters] of Object.entries(ALPHABET)) {
  letters.forEach((l, i) => checkClip(`ALPHABET.${script}[${i}] "${l.char}"`, l.audio));
}
for (const lang of ["bg", "en"]) {
  checkClip(`PRAISE.${lang}`, PRAISE[lang].audio);
  checkClip(`CHALLENGE.${lang}.intro`, CHALLENGE[lang].introAudio);
  checkClip(`CHALLENGE.${lang}.pass`, CHALLENGE[lang].passAudio);
}

// --- Report ------------------------------------------------------------------
const vocabCount = Object.keys(VOCAB).length;
const lessonCount = seenLessonIds.size;
if (problems.length) {
  console.error(`✗ content check failed — ${problems.length} problem(s):\n`);
  for (const p of problems) console.error("  • " + p);
  process.exit(1);
}
console.log(`✓ content OK — ${vocabCount} vocab items, ${UNITS.length} units, ${lessonCount} lessons, all audio present.`);

/* Gamarjoba! mobile — content bridge.
 *
 * The web app at ../../gamarjoba is the single source of truth for all
 * content. This script evaluates its plain-script globals (data.js,
 * audio-map.js, strokes.js) in a vm sandbox, validates every cross
 * reference, then emits typed TypeScript into content/generated/, copies
 * the bundled mp3 clips into assets/audio/ka/, and synthesizes the
 * three SFX WAVs (the web app used a WebAudio oscillator; native bundles
 * real files instead).
 *
 * Node >= 22, ESM, zero dependencies. Fails loudly (exit 1) on any
 * missing id / missing file so content drift is caught at build time.
 * Stale files in assets/audio/ka/ (e.g. removed English ui-* clips) are
 * deleted so the dir always mirrors the manifest exactly.
 *
 * Run: npm run build:content
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");            // gamarjoba-mobile/
const WEB = path.resolve(__dirname, "../../gamarjoba"); // the web app (source of truth)
const GEN = path.join(ROOT, "content", "generated");
const AUDIO_SRC = path.join(WEB, "audio", "ka");
const AUDIO_DST = path.join(ROOT, "assets", "audio", "ka");
const SFX_DST = path.join(ROOT, "assets", "audio", "sfx");

let failures = 0;
function fail(msg) {
  failures++;
  console.error("  ✗ " + msg);
}
function warn(msg) {
  console.warn("  ! " + msg);
}

/* ------------------------------------------------------------------ *
 * 1. Evaluate the web globals in a sandbox
 * ------------------------------------------------------------------ */

const ctx = { window: {} };
for (const f of ["data.js", "audio-map.js", "strokes.js"]) {
  const file = path.join(WEB, f);
  vm.runInNewContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
}
const C = ctx.window.CURRICULUM;
const AUDIO_FILES = ctx.window.AUDIO_FILES;
const LETTER_STROKES = ctx.window.LETTER_STROKES;
if (!C || !AUDIO_FILES || !LETTER_STROKES) {
  console.error("Failed to capture window.CURRICULUM / AUDIO_FILES / LETTER_STROKES");
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * 2. Validate
 * ------------------------------------------------------------------ */

console.log("Validating content…");

const audioSet = new Set(AUDIO_FILES);

// every manifest id has an mp3 on disk
for (const id of AUDIO_FILES) {
  if (!fs.existsSync(path.join(AUDIO_SRC, id + ".mp3"))) {
    fail(`AUDIO_FILES id "${id}" has no mp3 at gamarjoba/audio/ka/${id}.mp3`);
  }
}
// every mp3 on disk is in the manifest (warn only)
for (const f of fs.readdirSync(AUDIO_SRC)) {
  if (!f.endsWith(".mp3")) continue;
  const id = f.slice(0, -4);
  if (!audioSet.has(id)) warn(`mp3 on disk not in AUDIO_FILES manifest: ${f}`);
}

// vocab ∪ extras ∪ syllables — the "readable item" universe
const extras = Object.fromEntries((C.readingTrack?.extras ?? []).map((x) => [x.id, x]));
const syllables = Object.fromEntries((C.readingTrack?.syllables ?? []).map((x) => [x.id, x]));
const resolvable = (id) => !!(C.vocab[id] || extras[id] || syllables[id]);
const wordResolvable = (id) => !!(C.vocab[id] || extras[id]);

// unit lessons
for (const u of C.units) {
  for (const l of u.lessons) {
    for (const id of l.items) {
      if (!C.vocab[id]) fail(`unit ${u.id} lesson ${l.id}: item "${id}" missing from vocab`);
    }
  }
}

// lettersPath group ids exist in alphabet
const alphaById = Object.fromEntries(C.alphabet.map((g) => [g.id, g]));
for (const g of C.lettersPath.groups) {
  if (!alphaById[g.groupId]) fail(`lettersPath group "${g.groupId}" missing from alphabet`);
  const recipes = [g.steps.exam.recipe ?? [], g.steps.read?.recipe ?? []];
  for (const recipe of recipes) {
    for (const r of recipe) {
      for (const sid of r.syllablePool ?? []) {
        if (!syllables[sid]) fail(`lettersPath ${g.groupId}: syllablePool id "${sid}" missing from readingTrack.syllables`);
      }
    }
  }
  if (g.steps.read?.pool) {
    for (const sid of g.steps.read.pool.syllables) {
      if (!syllables[sid]) fail(`lettersPath ${g.groupId} read pool: syllable "${sid}" missing`);
    }
    for (const wid of g.steps.read.pool.words) {
      if (!wordResolvable(wid)) fail(`lettersPath ${g.groupId} read pool: word "${wid}" not in vocab ∪ extras`);
    }
  }
}

// reading steps
for (const st of C.readingTrack.steps) {
  for (const id of st.items) {
    if (!resolvable(id)) fail(`reading step ${st.id}: item "${id}" not resolvable`);
  }
  for (const recipe of [st.practice, st.exam]) {
    for (const r of recipe) {
      for (const sid of r.syllablePool ?? []) {
        if (!syllables[sid]) fail(`reading step ${st.id}: syllablePool id "${sid}" missing`);
      }
    }
  }
}

// bonus words + game item ids resolve via vocab ∪ extras
for (const id of C.bonusWords) {
  if (!wordResolvable(id)) fail(`bonusWords id "${id}" not in vocab ∪ extras`);
}
for (const zone of Object.values(C.games.findHome.zones)) {
  for (const id of zone) {
    if (!wordResolvable(id)) fail(`games.findHome zone id "${id}" not in vocab ∪ extras`);
  }
}
for (const id of C.games.market.itemIds) {
  if (!wordResolvable(id)) fail(`games.market itemId "${id}" not in vocab ∪ extras`);
}

// all 33 alphabet letters have strokes + letter audio ids
const allLetters = C.alphabet.flatMap((g) => g.letters);
for (const l of allLetters) {
  if (!LETTER_STROKES[l.ka]) fail(`letter ${l.ka} (${l.name}) missing from LETTER_STROKES`);
  const aid = C.audioIds.letters[l.ka];
  if (!aid) fail(`letter ${l.ka} (${l.name}) missing from audioIds.letters`);
  else if (!audioSet.has(aid)) fail(`letter ${l.ka} audio id "${aid}" not in AUDIO_FILES`);
}

// uiKa / praise / examples ids present in AUDIO_FILES
for (const u of C.uiKa) {
  if (!audioSet.has(u.id)) fail(`uiKa "${u.ka}" -> "${u.id}" not in AUDIO_FILES`);
}
// Georgian-only audio (hard rule): no English ui clip may ever return
for (const id of AUDIO_FILES) {
  if (/^ui-(?!ka-)/.test(id)) fail(`English ui clip in AUDIO_FILES: "${id}" (Georgian-only audio rule)`);
}
for (const p of C.praise) {
  if (!audioSet.has(p.id)) fail(`praise "${p.id}" not in AUDIO_FILES`);
}
for (const [ka, aid] of Object.entries(C.audioIds.examples)) {
  if (!audioSet.has(aid)) fail(`audioIds.examples "${ka}" -> "${aid}" not in AUDIO_FILES`);
}

if (failures > 0) {
  console.error(`\nContent validation failed with ${failures} error(s).`);
  process.exit(1);
}
console.log("  ✓ content valid");

/* ------------------------------------------------------------------ *
 * 3–5. Emit generated TypeScript
 * ------------------------------------------------------------------ */

fs.mkdirSync(GEN, { recursive: true });

const HEADER = (src) =>
  `/* GENERATED by scripts/build-content.mjs from ../gamarjoba/${src} — DO NOT EDIT */\n`;

// curriculum.ts
fs.writeFileSync(
  path.join(GEN, "curriculum.ts"),
  HEADER("data.js") +
    `import type { Curriculum } from "../types";\n\n` +
    `export const CURRICULUM: Curriculum = ${JSON.stringify(C, null, 2)};\n`
);

// strokes.ts
fs.writeFileSync(
  path.join(GEN, "strokes.ts"),
  HEADER("strokes.js") +
    `import type { StrokePoints } from "../types";\n\n` +
    `export type { StrokePoints } from "../types";\n\n` +
    `export const LETTER_STROKES: Record<string, StrokePoints[]> = ${JSON.stringify(LETTER_STROKES, null, 1)};\n`
);

// audioAssets.ts — one literal static require per line (Metro requirement)
const idsSorted = AUDIO_FILES.slice();
const union = idsSorted.map((id) => `  | ${JSON.stringify(id)}`).join("\n");
const requires = idsSorted
  .map((id) => `  ${JSON.stringify(id)}: require("../../assets/audio/ka/${id}.mp3"),`)
  .join("\n");
fs.writeFileSync(
  path.join(GEN, "audioAssets.ts"),
  HEADER("audio-map.js") +
    `/* eslint-disable @typescript-eslint/no-require-imports */\n\n` +
    `export type AudioId =\n${union};\n\n` +
    `export const AUDIO_ASSETS: Record<AudioId, number> = {\n${requires}\n};\n\n` +
    `export const SFX_ASSETS = {\n` +
    `  chime: require("../../assets/audio/sfx/chime.wav"),\n` +
    `  boop: require("../../assets/audio/sfx/boop.wav"),\n` +
    `  match: require("../../assets/audio/sfx/match.wav"),\n` +
    `} as const;\n`
);
console.log(`  ✓ generated curriculum.ts, strokes.ts, audioAssets.ts (${idsSorted.length} audio ids)`);

/* ------------------------------------------------------------------ *
 * 6. Copy mp3s (real files, not symlinks — EAS/Metro need real files)
 * ------------------------------------------------------------------ */

fs.mkdirSync(AUDIO_DST, { recursive: true });
// delete stale files so the dir mirrors the manifest exactly
for (const f of fs.readdirSync(AUDIO_DST)) {
  if (!audioSet.has(f.replace(/\.mp3$/, "")) || !f.endsWith(".mp3")) {
    fs.rmSync(path.join(AUDIO_DST, f));
  }
}
let copied = 0;
for (const id of AUDIO_FILES) {
  fs.copyFileSync(path.join(AUDIO_SRC, id + ".mp3"), path.join(AUDIO_DST, id + ".mp3"));
  copied++;
}
console.log(`  ✓ copied ${copied} mp3 clips to assets/audio/ka/`);

/* ------------------------------------------------------------------ *
 * 7. Synthesize SFX WAVs (PCM-16 mono 44.1 kHz) — replaces the web
 *    app's WebAudio oscillator notes with bundled files.
 * ------------------------------------------------------------------ */

const RATE = 44100;
const PEAK = 0.12;

/** notes: [{f, t, d}] — sine at f Hz starting t s for d s, exp-ramp
 * envelope in over 20 ms and out to silence (mirrors the web chime()). */
function renderNotes(notes) {
  const total = Math.max(...notes.map((n) => n.t + n.d)) + 0.05;
  const nSamples = Math.ceil(total * RATE);
  const buf = new Float64Array(nSamples);
  for (const { f, t, d } of notes) {
    const start = Math.floor(t * RATE);
    const len = Math.floor(d * RATE);
    const attack = Math.floor(0.02 * RATE);
    for (let i = 0; i < len && start + i < nSamples; i++) {
      const time = i / RATE;
      let env;
      if (i < attack) {
        // exponential ramp 0.0001 -> PEAK over 20 ms
        env = 0.0001 * Math.pow(PEAK / 0.0001, i / attack);
      } else {
        // exponential ramp PEAK -> 0.0001 over the rest of the note
        const k = (i - attack) / Math.max(1, len - attack);
        env = PEAK * Math.pow(0.0001 / PEAK, k);
      }
      buf[start + i] += env * Math.sin(2 * Math.PI * f * time);
    }
  }
  return buf;
}

function writeWav(file, samples) {
  const n = samples.length;
  const data = Buffer.alloc(44 + n * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + n * 2, 4);
  data.write("WAVE", 8);
  data.write("fmt ", 12);
  data.writeUInt32LE(16, 16); // fmt chunk size
  data.writeUInt16LE(1, 20); // PCM
  data.writeUInt16LE(1, 22); // mono
  data.writeUInt32LE(RATE, 24);
  data.writeUInt32LE(RATE * 2, 28); // byte rate
  data.writeUInt16LE(2, 32); // block align
  data.writeUInt16LE(16, 34); // bits per sample
  data.write("data", 36);
  data.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(file, data);
}

fs.mkdirSync(SFX_DST, { recursive: true });
writeWav(path.join(SFX_DST, "chime.wav"), renderNotes([
  { f: 784, t: 0, d: 0.18 },
  { f: 1174.66, t: 0.12, d: 0.28 },
]));
writeWav(path.join(SFX_DST, "boop.wav"), renderNotes([{ f: 196, t: 0, d: 0.22 }]));
writeWav(path.join(SFX_DST, "match.wav"), renderNotes([{ f: 880, t: 0, d: 0.12 }]));
console.log("  ✓ synthesized sfx: chime.wav, boop.wav, match.wav");

/* ------------------------------------------------------------------ *
 * Summary
 * ------------------------------------------------------------------ */

console.log("\nContent bridge summary:");
console.log(`  units:          ${C.units.length}`);
console.log(`  vocab items:    ${Object.keys(C.vocab).length}`);
console.log(`  alphabet:       ${allLetters.length} letters in ${C.alphabet.length} groups (strokes: ${Object.keys(LETTER_STROKES).length})`);
console.log(`  letters path:   ${C.lettersPath.groups.length} groups`);
console.log(`  reading track:  ${C.readingTrack.steps.length} steps, ${C.readingTrack.syllables.length} syllables, ${C.readingTrack.extras.length} extras`);
console.log(`  games:          ${Object.keys(C.games).length}`);
console.log(`  stickers:       ${C.stickers.length}`);
console.log(`  praise clips:   ${C.praise.length}`);
console.log(`  uiKa clips:     ${C.uiKa.length}`);
console.log(`  audio entries:  ${AUDIO_FILES.length}`);
console.log("Done.");

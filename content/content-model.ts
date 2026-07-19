// content-model.ts
// Data model for the Bulgarian <-> English kids' language app.
//
// CORE IDEA: store every vocabulary item ONCE, language-neutral.
// "Direction" is just a setting that decides which language is the
// prompt (the one the child already knows) and which is the answer
// (the one being learned). One set of content, one set of exercise
// components, and both directions come for free.

export type LangCode = "bg" | "en";

export interface Direction {
  known: LangCode; // child's language -> used for interface + prompts
  learning: LangCode; // language being taught -> answers + audio focus
}

// Example settings for your kids (Bulgarian speakers learning English):
export const DEFAULT_DIRECTION: Direction = { known: "bg", learning: "en" };
// Flip to { known: "en", learning: "bg" } and the entire app mirrors,
// including which alphabet track shows (Latin vs Cyrillic).

// ---------------------------------------------------------------------------
// Vocabulary: one concept, both languages. Never duplicate per direction.
// ---------------------------------------------------------------------------

export interface VocabItem {
  id: string; // stable id, e.g. "fruit.apple"
  emoji?: string; // quick placeholder art before real illustrations
  image?: string; // path to illustration (optional)
  labels: Record<LangCode, string>; // { bg: "ябълка", en: "apple" }
  audio: Record<LangCode, AudioClip>; // per-language recordings
  transliteration?: Partial<Record<LangCode, string>>; // { bg: "yabalka" }
}

// A recording can come from a family member (the heritage feature) or
// a default voice. voiceId lets you swap in баба's recording per word.
export interface AudioClip {
  src: string; // "audio/bg/yabalka__baba.mp3"
  voiceId: string; // "baba" | "mama" | "dyado" | "default"
}

// ---------------------------------------------------------------------------
// Exercises: tuned for ages 5+. Audio-first, positive-only, no timers.
// ---------------------------------------------------------------------------

export type ExerciseType =
  | "pick_picture" // hear a word, tap the matching picture (the workhorse)
  | "match_pairs" // match picture <-> word
  | "say_it" // repeat after the character (record + playback for a parent)
  | "odd_one_out" // Hitar Petar's trick round
  | "letter_sound"; // alphabet track (Latin for bg->en, Cyrillic for en->bg)

export interface Exercise {
  type: ExerciseType;
  prompt: string; // vocab id being asked, e.g. "fruit.apple"
  choices?: string[]; // other vocab ids used as distractors
  hint?: Record<LangCode, string>; // Kuma Lisa's tip, shown in the KNOWN language
}

// A short (3-4 min) lesson = a handful of exercises + one reward.
export interface Lesson {
  id: string;
  title: Record<LangCode, string>; // shown in the known language
  exercises: Exercise[];
  reward: "martenitsa"; // what Baba Marta hands out on completion
}

// A themed unit = a node on the map, hosted by one folklore character.
export interface Unit {
  id: string;
  theme: Record<LangCode, string>; // { bg: "Плодове", en: "Fruits" }
  host: CharacterId; // which helper "lives" in this unit
  guardian?: CharacterId; // optional end-of-unit guardian (e.g. Zmey)
  lessons: Lesson[];
}

export type CharacterId =
  | "pizho"
  | "penda" // mains
  | "baba_marta"
  | "hitar_petar"
  | "samodiva"
  | "krali_marko"
  | "zmey"
  | "kuker"
  | "kuma_lisa";

// ---------------------------------------------------------------------------
// Sample content
// ---------------------------------------------------------------------------

// NOTE: audio files below are placeholder system-TTS recordings (no family
// voices recorded yet) so the app has real, working audio out of the box.
// Swap the .wav files under /assets/audio for real recordings via the
// parent setup screen without touching this data.
export const VOCAB: Record<string, VocabItem> = {
  "fruit.apple": {
    id: "fruit.apple",
    emoji: "🍎",
    labels: { bg: "ябълка", en: "apple" },
    audio: {
      bg: { src: "audio/bg/yabalka__baba.wav", voiceId: "baba" },
      en: { src: "audio/en/apple__default.wav", voiceId: "default" },
    },
    transliteration: { bg: "yabalka" },
  },
  "fruit.banana": {
    id: "fruit.banana",
    emoji: "🍌",
    labels: { bg: "банан", en: "banana" },
    audio: {
      bg: { src: "audio/bg/banan__baba.wav", voiceId: "baba" },
      en: { src: "audio/en/banana__default.wav", voiceId: "default" },
    },
    transliteration: { bg: "banan" },
  },
  "fruit.grapes": {
    id: "fruit.grapes",
    emoji: "🍇",
    labels: { bg: "грозде", en: "grapes" },
    audio: {
      bg: { src: "audio/bg/grozde__baba.wav", voiceId: "baba" },
      en: { src: "audio/en/grapes__default.wav", voiceId: "default" },
    },
    transliteration: { bg: "grozde" },
  },
  "fruit.pear": {
    id: "fruit.pear",
    emoji: "🍐",
    labels: { bg: "круша", en: "pear" },
    audio: {
      bg: { src: "audio/bg/krusha__baba.wav", voiceId: "baba" },
      en: { src: "audio/en/pear__default.wav", voiceId: "default" },
    },
    transliteration: { bg: "krusha" },
  },
  // Animals — audio is TTS-generated (.mp3) via scripts/generate-audio.mjs.
  "animal.cat": {
    id: "animal.cat",
    emoji: "🐱",
    labels: { bg: "котка", en: "cat" },
    audio: {
      bg: { src: "audio/bg/kotka__default.mp3", voiceId: "default" },
      en: { src: "audio/en/cat__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "kotka" },
  },
  "animal.dog": {
    id: "animal.dog",
    emoji: "🐶",
    labels: { bg: "куче", en: "dog" },
    audio: {
      bg: { src: "audio/bg/kuche__default.mp3", voiceId: "default" },
      en: { src: "audio/en/dog__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "kuche" },
  },
  "animal.bird": {
    id: "animal.bird",
    emoji: "🐦",
    labels: { bg: "птица", en: "bird" },
    audio: {
      bg: { src: "audio/bg/ptitsa__default.mp3", voiceId: "default" },
      en: { src: "audio/en/bird__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "ptitsa" },
  },
  "animal.fish": {
    id: "animal.fish",
    emoji: "🐟",
    labels: { bg: "риба", en: "fish" },
    audio: {
      bg: { src: "audio/bg/riba__default.mp3", voiceId: "default" },
      en: { src: "audio/en/fish__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "riba" },
  },
};

export const fruitsUnit: Unit = {
  id: "unit.fruits",
  theme: { bg: "Плодове", en: "Fruits" },
  host: "samodiva",
  guardian: "zmey",
  lessons: [
    {
      id: "unit.fruits.l1",
      title: { bg: "Плодове 1", en: "Fruits 1" },
      reward: "martenitsa",
      exercises: [
        {
          type: "pick_picture",
          prompt: "fruit.apple",
          choices: ["fruit.banana", "fruit.grapes", "fruit.pear"],
          hint: {
            bg: "Слушай първата буква: a-a-apple.",
            en: "Listen for the first sound: я-я-ябълка.",
          },
        },
        { type: "say_it", prompt: "fruit.apple" },
        {
          type: "pick_picture",
          prompt: "fruit.banana",
          choices: ["fruit.apple", "fruit.pear", "fruit.grapes"],
        },
        {
          type: "match_pairs",
          prompt: "fruit.apple",
          choices: ["fruit.banana", "fruit.grapes", "fruit.pear"],
        },
      ],
    },
  ],
};

export const animalsUnit: Unit = {
  id: "unit.animals",
  theme: { bg: "Животни", en: "Animals" },
  host: "samodiva",
  guardian: "zmey",
  lessons: [
    {
      id: "unit.animals.l1",
      title: { bg: "Животни 1", en: "Animals 1" },
      reward: "martenitsa",
      exercises: [
        {
          type: "pick_picture",
          prompt: "animal.cat",
          choices: ["animal.dog", "animal.bird", "animal.fish"],
          hint: {
            bg: "Слушай първия звук: c-c-cat.",
            en: "Listen for the first sound: к-к-котка.",
          },
        },
        { type: "say_it", prompt: "animal.dog" },
        {
          type: "match_pairs",
          prompt: "animal.cat",
          choices: ["animal.dog", "animal.bird", "animal.fish"],
        },
        {
          // Hitar Petar's trick: three animals + one fruit. Tap the odd one.
          type: "odd_one_out",
          prompt: "fruit.apple",
          choices: ["animal.cat", "animal.dog", "animal.bird"],
        },
      ],
    },
  ],
};

// Every unit on the map. Add new units here as they're built.
export const UNITS: Unit[] = [fruitsUnit, animalsUnit];

// ---------------------------------------------------------------------------
// How ONE component renders in BOTH directions.
// Read the direction, then pull the right field off each VocabItem.
// ---------------------------------------------------------------------------

export function buildPickPicture(exercise: Exercise, dir: Direction) {
  const item = VOCAB[exercise.prompt];
  const distractors = (exercise.choices ?? []).map((id) => VOCAB[id]);

  return {
    // audio always plays the language being learned:
    promptAudio: item.audio[dir.learning],
    // question text is in the child's known language:
    // bg->en: "Коя картинка е «apple»?"   en->bg: "Which one is «ябълка»?"
    questionWord: item.labels[dir.learning],
    correctId: item.id,
    // each tile shows the learning word big, with the known-language gloss:
    tiles: [item, ...distractors].map((v) => ({
      id: v.id,
      emoji: v.emoji,
      main: v.labels[dir.learning], // "apple"
      gloss: v.labels[dir.known], // "ябълка"
      audio: v.audio[dir.learning],
    })),
    hint: exercise.hint?.[dir.known],
  };
}

// match_pairs: the prompt + choices become a small set of items the child
// pairs up (picture <-> word). Same direction rule — the word shown is the
// language being learned, its audio is the learning language.
export function buildMatchPairs(exercise: Exercise, dir: Direction) {
  const ids = [exercise.prompt, ...(exercise.choices ?? [])];
  return ids.map((id) => {
    const v = VOCAB[id];
    return {
      id: v.id,
      emoji: v.emoji,
      word: v.labels[dir.learning],
      gloss: v.labels[dir.known],
      audio: v.audio[dir.learning],
    };
  });
}

// say_it: nothing direction-specific to compute beyond the reference clip in
// the language being learned and the label to show. The child records their
// own voice and plays it back against this reference.
export function buildSayIt(exercise: Exercise, dir: Direction) {
  const item = VOCAB[exercise.prompt];
  return {
    referenceAudio: item.audio[dir.learning],
    word: item.labels[dir.learning],
    gloss: item.labels[dir.known],
    emoji: item.emoji,
  };
}

// odd_one_out (Hitar Petar's trick round): `prompt` is the item that does NOT
// belong; `choices` are the group it's mixed into. The child taps the odd one.
export function buildOddOneOut(exercise: Exercise, dir: Direction) {
  const odd = VOCAB[exercise.prompt];
  const group = (exercise.choices ?? []).map((id) => VOCAB[id]);
  return {
    correctId: odd.id,
    tiles: [odd, ...group].map((v) => ({
      id: v.id,
      emoji: v.emoji,
      main: v.labels[dir.learning],
      gloss: v.labels[dir.known],
      audio: v.audio[dir.learning],
    })),
  };
}

// ---------------------------------------------------------------------------
// Alphabet track — the ONLY direction-specific content. A child learning
// English meets the Latin script; a child learning Bulgarian meets Cyrillic.
// Keyed by the script of the language being LEARNED.
// ---------------------------------------------------------------------------

// Which script a learner sees, given the language they're learning.
export type Script = "latin" | "cyrillic";
export const SCRIPT_FOR_LEARNING: Record<LangCode, Script> = {
  en: "latin",
  bg: "cyrillic",
};

export interface Letter {
  char: string; // the glyph shown, e.g. "A" or "Б"
  // Audio clip of the letter's sound. src follows audio/alphabet/{script}/NN.mp3
  // (ASCII, index-based) so filenames stay portable. Generated by TTS in the
  // matching language (Latin -> en voice, Cyrillic -> bg voice).
  audio: AudioClip;
}

function latinLetters(): Letter[] {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  return chars.map((char, i) => ({
    char,
    audio: { src: `audio/alphabet/latin/${String(i).padStart(2, "0")}.mp3`, voiceId: "default" },
  }));
}

function cyrillicLetters(): Letter[] {
  const chars = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЮЯ".split("");
  return chars.map((char, i) => ({
    char,
    audio: { src: `audio/alphabet/cyrillic/${String(i).padStart(2, "0")}.mp3`, voiceId: "default" },
  }));
}

export const ALPHABET: Record<Script, Letter[]> = {
  latin: latinLetters(),
  cyrillic: cyrillicLetters(),
};

// The TTS language to speak each script in, for the audio generator.
export const TTS_LANG_FOR_SCRIPT: Record<Script, LangCode> = {
  latin: "en",
  cyrillic: "bg",
};

// Spoken praise at the reward moment, in the child's KNOWN language, so the
// celebration isn't text-only (audio-first). Generated by the audio script.
export const PRAISE: Record<LangCode, { text: string; audio: AudioClip }> = {
  bg: { text: "Браво!", audio: { src: "audio/bg/praise__default.mp3", voiceId: "default" } },
  en: { text: "Well done!", audio: { src: "audio/en/praise__default.mp3", voiceId: "default" } },
};

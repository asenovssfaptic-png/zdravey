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
      ],
    },
  ],
};

// Every unit on the map. Add new units here as they're built.
export const UNITS: Unit[] = [fruitsUnit];

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

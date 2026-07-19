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
  // For places on the map of Bulgaria: relative position, 0..1 (x = west→east,
  // y = north→south). Used by the find_on_map exercise.
  map?: { x: number; y: number };
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
  | "letter_sound" // alphabet track (Latin for bg->en, Cyrillic for en->bg)
  | "find_on_map"; // hear a city, tap its spot on the map of Bulgaria

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
  // Krali Marko's end-of-unit "юнашки изпит" (hero's challenge): a mixed review
  // of the whole unit. Gets a themed intro, Krali Marko hosts the tiles, and
  // the reward screen adds a hero's medal. Still positive-only.
  boss?: boolean;
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
  // Colors — swatch emoji as the "picture". Audio TTS-generated.
  "color.red": {
    id: "color.red",
    emoji: "🔴",
    labels: { bg: "червено", en: "red" },
    audio: {
      bg: { src: "audio/bg/cherveno__default.mp3", voiceId: "default" },
      en: { src: "audio/en/red__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "cherveno" },
  },
  "color.blue": {
    id: "color.blue",
    emoji: "🔵",
    labels: { bg: "синьо", en: "blue" },
    audio: {
      bg: { src: "audio/bg/sinyo__default.mp3", voiceId: "default" },
      en: { src: "audio/en/blue__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "sinyo" },
  },
  "color.green": {
    id: "color.green",
    emoji: "🟢",
    labels: { bg: "зелено", en: "green" },
    audio: {
      bg: { src: "audio/bg/zeleno__default.mp3", voiceId: "default" },
      en: { src: "audio/en/green__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "zeleno" },
  },
  "color.yellow": {
    id: "color.yellow",
    emoji: "🟡",
    labels: { bg: "жълто", en: "yellow" },
    audio: {
      bg: { src: "audio/bg/zhalto__default.mp3", voiceId: "default" },
      en: { src: "audio/en/yellow__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "zhalto" },
  },
  // Numbers 1–5 — keycap emoji as the "picture".
  "num.one": {
    id: "num.one",
    emoji: "1️⃣",
    labels: { bg: "едно", en: "one" },
    audio: {
      bg: { src: "audio/bg/edno__default.mp3", voiceId: "default" },
      en: { src: "audio/en/one__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "edno" },
  },
  "num.two": {
    id: "num.two",
    emoji: "2️⃣",
    labels: { bg: "две", en: "two" },
    audio: {
      bg: { src: "audio/bg/dve__default.mp3", voiceId: "default" },
      en: { src: "audio/en/two__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "dve" },
  },
  "num.three": {
    id: "num.three",
    emoji: "3️⃣",
    labels: { bg: "три", en: "three" },
    audio: {
      bg: { src: "audio/bg/tri__default.mp3", voiceId: "default" },
      en: { src: "audio/en/three__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "tri" },
  },
  "num.four": {
    id: "num.four",
    emoji: "4️⃣",
    labels: { bg: "четири", en: "four" },
    audio: {
      bg: { src: "audio/bg/chetiri__default.mp3", voiceId: "default" },
      en: { src: "audio/en/four__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "chetiri" },
  },
  "num.five": {
    id: "num.five",
    emoji: "5️⃣",
    labels: { bg: "пет", en: "five" },
    audio: {
      bg: { src: "audio/bg/pet__default.mp3", voiceId: "default" },
      en: { src: "audio/en/five__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "pet" },
  },

  // --- Fruits 2 ---
  "fruit.orange": {
    id: "fruit.orange",
    emoji: "🍊",
    labels: { bg: "портокал", en: "orange" },
    audio: {
      bg: { src: "audio/bg/portokal__default.mp3", voiceId: "default" },
      en: { src: "audio/en/orange__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "portokal" },
  },
  "fruit.strawberry": {
    id: "fruit.strawberry",
    emoji: "🍓",
    labels: { bg: "ягода", en: "strawberry" },
    audio: {
      bg: { src: "audio/bg/yagoda__default.mp3", voiceId: "default" },
      en: { src: "audio/en/strawberry__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "yagoda" },
  },
  "fruit.watermelon": {
    id: "fruit.watermelon",
    emoji: "🍉",
    labels: { bg: "диня", en: "watermelon" },
    audio: {
      bg: { src: "audio/bg/dinya__default.mp3", voiceId: "default" },
      en: { src: "audio/en/watermelon__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "dinya" },
  },
  "fruit.lemon": {
    id: "fruit.lemon",
    emoji: "🍋",
    labels: { bg: "лимон", en: "lemon" },
    audio: {
      bg: { src: "audio/bg/limon__default.mp3", voiceId: "default" },
      en: { src: "audio/en/lemon__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "limon" },
  },

  // --- Animals 2 (farm) ---
  "animal.cow": {
    id: "animal.cow",
    emoji: "🐮",
    labels: { bg: "крава", en: "cow" },
    audio: {
      bg: { src: "audio/bg/krava__default.mp3", voiceId: "default" },
      en: { src: "audio/en/cow__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "krava" },
  },
  "animal.horse": {
    id: "animal.horse",
    emoji: "🐴",
    labels: { bg: "кон", en: "horse" },
    audio: {
      bg: { src: "audio/bg/kon__default.mp3", voiceId: "default" },
      en: { src: "audio/en/horse__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "kon" },
  },
  "animal.sheep": {
    id: "animal.sheep",
    emoji: "🐑",
    labels: { bg: "овца", en: "sheep" },
    audio: {
      bg: { src: "audio/bg/ovtsa__default.mp3", voiceId: "default" },
      en: { src: "audio/en/sheep__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "ovtsa" },
  },
  "animal.pig": {
    id: "animal.pig",
    emoji: "🐷",
    labels: { bg: "прасе", en: "pig" },
    audio: {
      bg: { src: "audio/bg/prase__default.mp3", voiceId: "default" },
      en: { src: "audio/en/pig__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "prase" },
  },

  // --- Colors 2 ---
  "color.orange": {
    id: "color.orange",
    emoji: "🟠",
    labels: { bg: "оранжево", en: "orange" },
    audio: {
      bg: { src: "audio/bg/oranzhevo__default.mp3", voiceId: "default" },
      en: { src: "audio/en/orange_color__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "oranzhevo" },
  },
  "color.purple": {
    id: "color.purple",
    emoji: "🟣",
    labels: { bg: "лилаво", en: "purple" },
    audio: {
      bg: { src: "audio/bg/lilavo__default.mp3", voiceId: "default" },
      en: { src: "audio/en/purple__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "lilavo" },
  },
  "color.black": {
    id: "color.black",
    emoji: "⚫",
    labels: { bg: "черно", en: "black" },
    audio: {
      bg: { src: "audio/bg/cherno__default.mp3", voiceId: "default" },
      en: { src: "audio/en/black__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "cherno" },
  },
  "color.white": {
    id: "color.white",
    emoji: "⚪",
    labels: { bg: "бяло", en: "white" },
    audio: {
      bg: { src: "audio/bg/byalo__default.mp3", voiceId: "default" },
      en: { src: "audio/en/white__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "byalo" },
  },

  // --- Numbers 2 (6–10) ---
  "num.six": {
    id: "num.six",
    emoji: "6️⃣",
    labels: { bg: "шест", en: "six" },
    audio: {
      bg: { src: "audio/bg/shest__default.mp3", voiceId: "default" },
      en: { src: "audio/en/six__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "shest" },
  },
  "num.seven": {
    id: "num.seven",
    emoji: "7️⃣",
    labels: { bg: "седем", en: "seven" },
    audio: {
      bg: { src: "audio/bg/sedem__default.mp3", voiceId: "default" },
      en: { src: "audio/en/seven__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "sedem" },
  },
  "num.eight": {
    id: "num.eight",
    emoji: "8️⃣",
    labels: { bg: "осем", en: "eight" },
    audio: {
      bg: { src: "audio/bg/osem__default.mp3", voiceId: "default" },
      en: { src: "audio/en/eight__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "osem" },
  },
  "num.nine": {
    id: "num.nine",
    emoji: "9️⃣",
    labels: { bg: "девет", en: "nine" },
    audio: {
      bg: { src: "audio/bg/devet__default.mp3", voiceId: "default" },
      en: { src: "audio/en/nine__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "devet" },
  },
  "num.ten": {
    id: "num.ten",
    emoji: "🔟",
    labels: { bg: "десет", en: "ten" },
    audio: {
      bg: { src: "audio/bg/deset__default.mp3", voiceId: "default" },
      en: { src: "audio/en/ten__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "deset" },
  },

  // --- Family ---
  "family.mother": {
    id: "family.mother",
    emoji: "👩",
    labels: { bg: "майка", en: "mother" },
    audio: {
      bg: { src: "audio/bg/mayka__default.mp3", voiceId: "default" },
      en: { src: "audio/en/mother__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "mayka" },
  },
  "family.father": {
    id: "family.father",
    emoji: "👨",
    labels: { bg: "баща", en: "father" },
    audio: {
      bg: { src: "audio/bg/bashta__default.mp3", voiceId: "default" },
      en: { src: "audio/en/father__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "bashta" },
  },
  "family.grandma": {
    id: "family.grandma",
    emoji: "👵",
    labels: { bg: "баба", en: "grandma" },
    audio: {
      bg: { src: "audio/bg/baba__default.mp3", voiceId: "default" },
      en: { src: "audio/en/grandma__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "baba" },
  },
  "family.grandpa": {
    id: "family.grandpa",
    emoji: "👴",
    labels: { bg: "дядо", en: "grandpa" },
    audio: {
      bg: { src: "audio/bg/dyado__default.mp3", voiceId: "default" },
      en: { src: "audio/en/grandpa__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "dyado" },
  },

  // --- Body ---
  "body.hand": {
    id: "body.hand",
    emoji: "✋",
    labels: { bg: "ръка", en: "hand" },
    audio: {
      bg: { src: "audio/bg/raka__default.mp3", voiceId: "default" },
      en: { src: "audio/en/hand__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "raka" },
  },
  "body.eye": {
    id: "body.eye",
    emoji: "👁️",
    labels: { bg: "око", en: "eye" },
    audio: {
      bg: { src: "audio/bg/oko__default.mp3", voiceId: "default" },
      en: { src: "audio/en/eye__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "oko" },
  },
  "body.nose": {
    id: "body.nose",
    emoji: "👃",
    labels: { bg: "нос", en: "nose" },
    audio: {
      bg: { src: "audio/bg/nos__default.mp3", voiceId: "default" },
      en: { src: "audio/en/nose__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "nos" },
  },
  "body.mouth": {
    id: "body.mouth",
    emoji: "👄",
    labels: { bg: "уста", en: "mouth" },
    audio: {
      bg: { src: "audio/bg/usta__default.mp3", voiceId: "default" },
      en: { src: "audio/en/mouth__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "usta" },
  },

  // --- Weather ---
  "weather.sun": {
    id: "weather.sun",
    emoji: "☀️",
    labels: { bg: "слънце", en: "sun" },
    audio: {
      bg: { src: "audio/bg/slantse__default.mp3", voiceId: "default" },
      en: { src: "audio/en/sun__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "slantse" },
  },
  "weather.rain": {
    id: "weather.rain",
    emoji: "🌧️",
    labels: { bg: "дъжд", en: "rain" },
    audio: {
      bg: { src: "audio/bg/dazhd__default.mp3", voiceId: "default" },
      en: { src: "audio/en/rain__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "dazhd" },
  },
  "weather.cloud": {
    id: "weather.cloud",
    emoji: "☁️",
    labels: { bg: "облак", en: "cloud" },
    audio: {
      bg: { src: "audio/bg/oblak__default.mp3", voiceId: "default" },
      en: { src: "audio/en/cloud__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "oblak" },
  },
  "weather.snow": {
    id: "weather.snow",
    emoji: "❄️",
    labels: { bg: "сняг", en: "snow" },
    audio: {
      bg: { src: "audio/bg/snyag__default.mp3", voiceId: "default" },
      en: { src: "audio/en/snow__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "snyag" },
  },

  // --- Cities of Bulgaria (map coords: x west→east, y north→south) ---
  "city.sofia": {
    id: "city.sofia",
    emoji: "🏛️",
    labels: { bg: "София", en: "Sofia" },
    audio: {
      bg: { src: "audio/bg/sofia__default.mp3", voiceId: "default" },
      en: { src: "audio/en/sofia_city__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "Sofia" },
    map: { x: 0.24, y: 0.55 },
  },
  "city.plovdiv": {
    id: "city.plovdiv",
    emoji: "🎭",
    labels: { bg: "Пловдив", en: "Plovdiv" },
    audio: {
      bg: { src: "audio/bg/plovdiv__default.mp3", voiceId: "default" },
      en: { src: "audio/en/plovdiv__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "Plovdiv" },
    map: { x: 0.45, y: 0.66 },
  },
  "city.varna": {
    id: "city.varna",
    emoji: "⚓",
    labels: { bg: "Варна", en: "Varna" },
    audio: {
      bg: { src: "audio/bg/varna__default.mp3", voiceId: "default" },
      en: { src: "audio/en/varna__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "Varna" },
    map: { x: 0.88, y: 0.4 },
  },
  "city.burgas": {
    id: "city.burgas",
    emoji: "⛵",
    labels: { bg: "Бургас", en: "Burgas" },
    audio: {
      bg: { src: "audio/bg/burgas__default.mp3", voiceId: "default" },
      en: { src: "audio/en/burgas__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "Burgas" },
    map: { x: 0.82, y: 0.62 },
  },
  "city.veliko": {
    id: "city.veliko",
    emoji: "🏰",
    labels: { bg: "Велико Търново", en: "Veliko Tarnovo" },
    audio: {
      bg: { src: "audio/bg/veliko_tarnovo__default.mp3", voiceId: "default" },
      en: { src: "audio/en/veliko_tarnovo__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "Veliko Tarnovo" },
    map: { x: 0.56, y: 0.4 },
  },

  // --- Places / nature (picturable geography nouns) ---
  "place.sea": {
    id: "place.sea",
    emoji: "🌊",
    labels: { bg: "море", en: "sea" },
    audio: {
      bg: { src: "audio/bg/more__default.mp3", voiceId: "default" },
      en: { src: "audio/en/sea__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "more" },
  },
  "place.mountain": {
    id: "place.mountain",
    emoji: "⛰️",
    labels: { bg: "планина", en: "mountain" },
    audio: {
      bg: { src: "audio/bg/planina__default.mp3", voiceId: "default" },
      en: { src: "audio/en/mountain__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "planina" },
  },
  "place.river": {
    id: "place.river",
    emoji: "🏞️",
    labels: { bg: "река", en: "river" },
    audio: {
      bg: { src: "audio/bg/reka__default.mp3", voiceId: "default" },
      en: { src: "audio/en/river__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "reka" },
  },
  "place.forest": {
    id: "place.forest",
    emoji: "🌲",
    labels: { bg: "гора", en: "forest" },
    audio: {
      bg: { src: "audio/bg/gora__default.mp3", voiceId: "default" },
      en: { src: "audio/en/forest__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "gora" },
  },
  "place.city": {
    id: "place.city",
    emoji: "🏙️",
    labels: { bg: "град", en: "city" },
    audio: {
      bg: { src: "audio/bg/grad__default.mp3", voiceId: "default" },
      en: { src: "audio/en/city__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "grad" },
  },
  "place.village": {
    id: "place.village",
    emoji: "🏡",
    labels: { bg: "село", en: "village" },
    audio: {
      bg: { src: "audio/bg/selo__default.mp3", voiceId: "default" },
      en: { src: "audio/en/village__default.mp3", voiceId: "default" },
    },
    transliteration: { bg: "selo" },
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
    {
      id: "unit.fruits.l2",
      title: { bg: "Плодове 2", en: "Fruits 2" },
      reward: "martenitsa",
      exercises: [
        {
          type: "pick_picture",
          prompt: "fruit.orange",
          choices: ["fruit.strawberry", "fruit.watermelon", "fruit.lemon"],
        },
        {
          type: "pick_picture",
          prompt: "fruit.strawberry",
          choices: ["fruit.orange", "fruit.watermelon", "fruit.lemon"],
        },
        { type: "say_it", prompt: "fruit.lemon" },
        {
          type: "match_pairs",
          prompt: "fruit.orange",
          choices: ["fruit.strawberry", "fruit.watermelon", "fruit.lemon"],
        },
      ],
    },
    {
      id: "unit.fruits.review",
      title: { bg: "Юнашки изпит — Плодове", en: "Hero's Challenge — Fruits" },
      reward: "martenitsa",
      boss: true,
      exercises: [
        {
          type: "match_pairs",
          prompt: "fruit.apple",
          choices: ["fruit.banana", "fruit.orange", "fruit.strawberry"],
        },
        {
          type: "match_pairs",
          prompt: "fruit.grapes",
          choices: ["fruit.pear", "fruit.watermelon", "fruit.lemon"],
        },
        {
          type: "pick_picture",
          prompt: "fruit.watermelon",
          choices: ["fruit.apple", "fruit.lemon", "fruit.grapes"],
        },
        {
          type: "odd_one_out",
          prompt: "animal.cat",
          choices: ["fruit.apple", "fruit.lemon", "fruit.grapes"],
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
    {
      id: "unit.animals.l2",
      title: { bg: "Животни 2", en: "Animals 2" },
      reward: "martenitsa",
      exercises: [
        {
          type: "pick_picture",
          prompt: "animal.cow",
          choices: ["animal.horse", "animal.sheep", "animal.pig"],
        },
        {
          type: "pick_picture",
          prompt: "animal.horse",
          choices: ["animal.cow", "animal.sheep", "animal.pig"],
        },
        { type: "say_it", prompt: "animal.pig" },
        {
          type: "match_pairs",
          prompt: "animal.cow",
          choices: ["animal.horse", "animal.sheep", "animal.pig"],
        },
        {
          type: "odd_one_out",
          prompt: "color.red",
          choices: ["animal.cow", "animal.horse", "animal.sheep"],
        },
      ],
    },
    {
      id: "unit.animals.boss",
      title: { bg: "Юнашки изпит — Животни", en: "Hero's Challenge — Animals" },
      reward: "martenitsa",
      boss: true,
      exercises: [
        {
          type: "match_pairs",
          prompt: "animal.cat",
          choices: ["animal.dog", "animal.cow", "animal.horse"],
        },
        {
          type: "match_pairs",
          prompt: "animal.bird",
          choices: ["animal.fish", "animal.sheep", "animal.pig"],
        },
        {
          type: "odd_one_out",
          prompt: "fruit.lemon",
          choices: ["animal.cat", "animal.cow", "animal.fish"],
        },
      ],
    },
  ],
};

export const colorsUnit: Unit = {
  id: "unit.colors",
  theme: { bg: "Цветове", en: "Colors" },
  host: "samodiva",
  guardian: "zmey",
  lessons: [
    {
      id: "unit.colors.l1",
      title: { bg: "Цветове 1", en: "Colors 1" },
      reward: "martenitsa",
      exercises: [
        {
          type: "pick_picture",
          prompt: "color.red",
          choices: ["color.blue", "color.green", "color.yellow"],
        },
        { type: "say_it", prompt: "color.blue" },
        {
          type: "match_pairs",
          prompt: "color.red",
          choices: ["color.blue", "color.green", "color.yellow"],
        },
        {
          // three colors + one fruit — tap the odd one.
          type: "odd_one_out",
          prompt: "fruit.apple",
          choices: ["color.red", "color.blue", "color.green"],
        },
      ],
    },
    {
      id: "unit.colors.l2",
      title: { bg: "Цветове 2", en: "Colors 2" },
      reward: "martenitsa",
      exercises: [
        {
          type: "pick_picture",
          prompt: "color.orange",
          choices: ["color.purple", "color.black", "color.white"],
        },
        {
          type: "pick_picture",
          prompt: "color.purple",
          choices: ["color.orange", "color.black", "color.white"],
        },
        { type: "say_it", prompt: "color.white" },
        {
          type: "match_pairs",
          prompt: "color.orange",
          choices: ["color.purple", "color.black", "color.white"],
        },
      ],
    },
    {
      id: "unit.colors.boss",
      title: { bg: "Юнашки изпит — Цветове", en: "Hero's Challenge — Colors" },
      reward: "martenitsa",
      boss: true,
      exercises: [
        {
          type: "match_pairs",
          prompt: "color.red",
          choices: ["color.blue", "color.orange", "color.purple"],
        },
        {
          type: "match_pairs",
          prompt: "color.green",
          choices: ["color.yellow", "color.black", "color.white"],
        },
        {
          type: "odd_one_out",
          prompt: "animal.dog",
          choices: ["color.red", "color.black", "color.yellow"],
        },
      ],
    },
  ],
};

export const numbersUnit: Unit = {
  id: "unit.numbers",
  theme: { bg: "Числа", en: "Numbers" },
  host: "krali_marko",
  guardian: "zmey",
  lessons: [
    {
      id: "unit.numbers.l1",
      title: { bg: "Числа 1", en: "Numbers 1" },
      reward: "martenitsa",
      exercises: [
        {
          type: "pick_picture",
          prompt: "num.three",
          choices: ["num.one", "num.two", "num.five"],
        },
        { type: "say_it", prompt: "num.two" },
        {
          type: "match_pairs",
          prompt: "num.one",
          choices: ["num.two", "num.three", "num.four"],
        },
        {
          type: "pick_picture",
          prompt: "num.five",
          choices: ["num.two", "num.three", "num.four"],
        },
      ],
    },
    {
      id: "unit.numbers.l2",
      title: { bg: "Числа 2", en: "Numbers 2" },
      reward: "martenitsa",
      exercises: [
        {
          type: "pick_picture",
          prompt: "num.seven",
          choices: ["num.six", "num.eight", "num.ten"],
        },
        { type: "say_it", prompt: "num.six" },
        {
          type: "match_pairs",
          prompt: "num.six",
          choices: ["num.seven", "num.eight", "num.nine"],
        },
        {
          type: "pick_picture",
          prompt: "num.ten",
          choices: ["num.six", "num.eight", "num.nine"],
        },
      ],
    },
    {
      id: "unit.numbers.boss",
      title: { bg: "Юнашки изпит — Числа", en: "Hero's Challenge — Numbers" },
      reward: "martenitsa",
      boss: true,
      exercises: [
        {
          type: "match_pairs",
          prompt: "num.one",
          choices: ["num.three", "num.six", "num.eight"],
        },
        {
          type: "match_pairs",
          prompt: "num.five",
          choices: ["num.seven", "num.nine", "num.ten"],
        },
        {
          type: "pick_picture",
          prompt: "num.nine",
          choices: ["num.two", "num.six", "num.ten"],
        },
      ],
    },
  ],
};

export const familyUnit: Unit = {
  id: "unit.family",
  theme: { bg: "Семейство", en: "Family" },
  host: "baba_marta",
  guardian: "zmey",
  lessons: [
    {
      id: "unit.family.l1",
      title: { bg: "Семейство 1", en: "Family 1" },
      reward: "martenitsa",
      exercises: [
        {
          type: "pick_picture",
          prompt: "family.mother",
          choices: ["family.father", "family.grandma", "family.grandpa"],
        },
        {
          type: "pick_picture",
          prompt: "family.grandma",
          choices: ["family.mother", "family.father", "family.grandpa"],
        },
        { type: "say_it", prompt: "family.father" },
        {
          type: "match_pairs",
          prompt: "family.mother",
          choices: ["family.father", "family.grandma", "family.grandpa"],
        },
      ],
    },
  ],
};

export const bodyUnit: Unit = {
  id: "unit.body",
  theme: { bg: "Тяло", en: "Body" },
  host: "kuker",
  guardian: "zmey",
  lessons: [
    {
      id: "unit.body.l1",
      title: { bg: "Тяло 1", en: "Body 1" },
      reward: "martenitsa",
      exercises: [
        {
          type: "pick_picture",
          prompt: "body.hand",
          choices: ["body.eye", "body.nose", "body.mouth"],
        },
        {
          type: "pick_picture",
          prompt: "body.nose",
          choices: ["body.hand", "body.eye", "body.mouth"],
        },
        { type: "say_it", prompt: "body.mouth" },
        {
          type: "match_pairs",
          prompt: "body.hand",
          choices: ["body.eye", "body.nose", "body.mouth"],
        },
      ],
    },
  ],
};

export const weatherUnit: Unit = {
  id: "unit.weather",
  theme: { bg: "Време", en: "Weather" },
  host: "samodiva",
  guardian: "zmey",
  lessons: [
    {
      id: "unit.weather.l1",
      title: { bg: "Време 1", en: "Weather 1" },
      reward: "martenitsa",
      exercises: [
        {
          type: "pick_picture",
          prompt: "weather.sun",
          choices: ["weather.rain", "weather.cloud", "weather.snow"],
        },
        {
          type: "pick_picture",
          prompt: "weather.rain",
          choices: ["weather.sun", "weather.cloud", "weather.snow"],
        },
        { type: "say_it", prompt: "weather.snow" },
        {
          type: "match_pairs",
          prompt: "weather.sun",
          choices: ["weather.rain", "weather.cloud", "weather.snow"],
        },
        {
          type: "odd_one_out",
          prompt: "animal.cat",
          choices: ["weather.sun", "weather.rain", "weather.cloud"],
        },
      ],
    },
  ],
};

// Every unit on the map. Add new units here as they're built.
export const citiesUnit: Unit = {
  id: "unit.cities",
  theme: { bg: "Градове", en: "Cities" },
  host: "krali_marko",
  guardian: "zmey",
  lessons: [
    {
      id: "unit.cities.l1",
      title: { bg: "Градове 1", en: "Cities 1" },
      reward: "martenitsa",
      exercises: [
        {
          type: "find_on_map",
          prompt: "city.sofia",
          choices: ["city.plovdiv", "city.varna", "city.burgas"],
        },
        {
          type: "find_on_map",
          prompt: "city.varna",
          choices: ["city.sofia", "city.plovdiv", "city.burgas"],
        },
        { type: "say_it", prompt: "city.plovdiv" },
        {
          type: "find_on_map",
          prompt: "city.veliko",
          choices: ["city.sofia", "city.varna", "city.burgas"],
        },
        {
          type: "match_pairs",
          prompt: "city.sofia",
          choices: ["city.varna", "city.burgas", "city.plovdiv"],
        },
      ],
    },
    {
      id: "unit.places.l1",
      title: { bg: "Места 1", en: "Places 1" },
      reward: "martenitsa",
      exercises: [
        {
          type: "pick_picture",
          prompt: "place.sea",
          choices: ["place.mountain", "place.river", "place.forest"],
        },
        {
          type: "pick_picture",
          prompt: "place.mountain",
          choices: ["place.sea", "place.city", "place.village"],
        },
        { type: "say_it", prompt: "place.forest" },
        {
          type: "match_pairs",
          prompt: "place.sea",
          choices: ["place.mountain", "place.city", "place.village"],
        },
        {
          type: "odd_one_out",
          prompt: "animal.fish",
          choices: ["place.sea", "place.mountain", "place.forest"],
        },
      ],
    },
  ],
};

export const UNITS: Unit[] = [
  fruitsUnit,
  animalsUnit,
  colorsUnit,
  numbersUnit,
  familyUnit,
  bodyUnit,
  weatherUnit,
  citiesUnit,
];

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

// find_on_map: hear a city, tap its pin on the map of Bulgaria. The prompt is
// the target city; choices are the other pins shown. Each carries its map
// coordinate. City names aren't translated — a place name is the same in both
// directions — but the audio still follows the language being learned.
export function buildFindOnMap(exercise: Exercise, dir: Direction) {
  const items = [VOCAB[exercise.prompt], ...(exercise.choices ?? []).map((id) => VOCAB[id])];
  return {
    correctId: exercise.prompt,
    promptAudio: VOCAB[exercise.prompt].audio[dir.learning],
    promptLabel: VOCAB[exercise.prompt].labels[dir.learning],
    pins: items
      .filter((v) => v.map)
      .map((v) => ({
        id: v.id,
        label: v.labels[dir.learning],
        audio: v.audio[dir.learning],
        x: v.map!.x,
        y: v.map!.y,
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

// Krali Marko's hero's-challenge lines (spoken, in the child's known language):
// an intro before the boss round and a pass line at the medal screen.
export const CHALLENGE: Record<
  LangCode,
  { intro: string; introAudio: AudioClip; pass: string; passAudio: AudioClip }
> = {
  bg: {
    intro: "Юнашко изпитание! Готов ли си?",
    introAudio: { src: "audio/bg/challenge_intro__default.mp3", voiceId: "default" },
    pass: "Ти си юнак!",
    passAudio: { src: "audio/bg/challenge_pass__default.mp3", voiceId: "default" },
  },
  en: {
    intro: "A hero's challenge! Are you ready?",
    introAudio: { src: "audio/en/challenge_intro__default.mp3", voiceId: "default" },
    pass: "You are a hero!",
    passAudio: { src: "audio/en/challenge_pass__default.mp3", voiceId: "default" },
  },
};

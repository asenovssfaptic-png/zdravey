/* Gamarjoba! mobile — curriculum types.
 * Hand-written, foundation-owned. Mirrors the shapes of the web app's
 * data.js (window.CURRICULUM) exactly — the generated content in
 * `content/generated/` is typed against this file.
 */

/** One stroke: an ordered polyline of [x, y] points in a 0–100 box, y down. */
export type StrokePoints = [number, number][];

export interface Letter {
  ka: string;
  name: string;
  translit: string;
  ipa: string;
  example: { ka: string; translit: string; en: string };
}

export interface AlphabetGroup {
  id: string;
  title: string;
  letters: Letter[];
}

export interface VocabItem {
  id: string;
  ka: string;
  translit: string;
  en: string;
  emoji: string;
}

/** Reading-track syllable — no `en`, no `emoji`. */
export interface Syllable {
  id: string;
  ka: string;
  translit: string;
}

/** Anything with an id + ka that can be spoken via its bundled clip. */
export type Speakable = VocabItem | Syllable;

export interface Lesson {
  id: string;
  title: string;
  items: string[];
}

export interface Unit {
  id: string;
  title: string;
  emoji: string;
  description: string;
  lessons: Lesson[];
}

export type ExerciseType =
  | "pick_picture"
  | "reverse_pick"
  | "match_pairs"
  | "build_word"
  | "build_syllable"
  | "hear_pick_letter"
  | "letter_to_sound"
  | "trace_letter"
  | "read_word_pick_picture"
  | "picture_pick_word"
  | "hear_pick_word"
  | "build_phrase";

export interface RecipeItem {
  type: ExerciseType;
  count?: number;
  from?: "group" | "earlier-groups" | "earlier-units" | "earlier-steps";
  syllablePool?: string[];
  fallback?: ExerciseType;
}

export interface LettersStep {
  id: string;
  kind: "meet" | "write" | "exam" | "read";
  title: string;
  sub?: string;
  recipe?: RecipeItem[];
  pool?: { syllables: string[]; words: string[] };
}

export interface LettersGroup {
  groupId: string;
  order: number;
  steps: {
    meet: LettersStep;
    write: LettersStep;
    exam: LettersStep;
    read?: LettersStep;
  };
}

export interface ReadingStep {
  id: string;
  title: string;
  kind: "syllables" | "words" | "phrases";
  items: string[];
  practice: RecipeItem[];
  exam: RecipeItem[];
}

export interface Praise {
  id: string;
  ka: string;
  translit: string;
  en: string;
}

/** Georgian UI clip (feedback / gift / locked-speaker nudges and
 * tap-to-hear screen titles). `id` is also the bundled clip's AudioId.
 * Everything audible in the app is Georgian; `en` is on-screen text only. */
export interface UiKaItem {
  id: string;
  ka: string;
  translit: string;
  en: string;
  use: "miss" | "gift" | "locked-speaker" | "title";
}

export interface Sticker {
  id: string;
  emoji: string;
  name: string;
}

export interface GamesConfig {
  findHome: {
    id: string;
    emoji: string;
    title: string;
    perRound: number;
    zones: { wall: string[]; mid: string[]; floor: string[] };
  };
  market: {
    id: string;
    emoji: string;
    title: string;
    listLen: number;
    stallSize: number;
    itemIds: string[];
  };
  safari: {
    id: string;
    emoji: string;
    title: string;
    gridSize: number;
    copies: number;
  };
}

export interface Curriculum {
  strings: Record<string, string>;
  alphabet: AlphabetGroup[];
  units: Unit[];
  vocab: Record<string, VocabItem>;
  lettersPath: { groups: LettersGroup[] };
  readingTrack: { syllables: Syllable[]; extras: VocabItem[]; steps: ReadingStep[] };
  praise: Praise[];
  uiKa: UiKaItem[];
  audioIds: { letters: Record<string, string>; examples: Record<string, string> };
  bonusWords: string[];
  unitExamRecipe: RecipeItem[];
  stickers: Sticker[];
  games: GamesConfig;
}

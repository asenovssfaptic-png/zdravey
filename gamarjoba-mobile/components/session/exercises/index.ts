/* RENDERERS — one component per exercise type, keyed exactly by
 * ExerciseType. build_syllable reuses BuildWord (same renderer, syllables
 * just have no meaning row). The map's value types are exact: each entry
 * must accept its own narrowed exercise variant. */

import type React from "react";

import type { ExerciseType } from "../../../content/types";
import type { Exercise, ExerciseResult } from "../../../lib/exercise-engine";
import BuildPhrase from "./BuildPhrase";
import BuildWord from "./BuildWord";
import HearPickLetter from "./HearPickLetter";
import HearPickWord from "./HearPickWord";
import LetterToSound from "./LetterToSound";
import MatchPairs from "./MatchPairs";
import PickPicture from "./PickPicture";
import PicturePickWord from "./PicturePickWord";
import ReadWordPickPicture from "./ReadWordPickPicture";
import ReversePick from "./ReversePick";
import TraceLetter from "./TraceLetter";

export type RendererMap = {
  [K in ExerciseType]: React.ComponentType<{
    ex: Extract<Exercise, { type: K }>;
    onResult: (r: ExerciseResult) => void;
  }>;
};

export const RENDERERS: RendererMap = {
  pick_picture: PickPicture,
  reverse_pick: ReversePick,
  match_pairs: MatchPairs,
  build_word: BuildWord,
  build_syllable: BuildWord,
  build_phrase: BuildPhrase,
  hear_pick_letter: HearPickLetter,
  letter_to_sound: LetterToSound,
  trace_letter: TraceLetter,
  read_word_pick_picture: ReadWordPickPicture,
  picture_pick_word: PicturePickWord,
  hear_pick_word: HearPickWord,
};

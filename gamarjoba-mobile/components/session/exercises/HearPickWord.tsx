/* hear_pick_word — "Which word did you hear?": the word-level sibling of
 * hear_pick_letter. The clip plays on mount; options are Georgian text
 * ONLY (no translit, no per-option 🔊 — a speaker would answer the
 * question); the accessible label carries the translit instead. First tap
 * answers; a miss gently reveals (the player speaks it). */

import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { spacing } from "../../../constants/theme";
import { playWord } from "../../../lib/audio";
import {
  pickDistractors,
  shuffle,
  type Exercise,
  type ExerciseResult,
} from "../../../lib/exercise-engine";
import AudioButton from "../../ui/AudioButton";
import InstructionLine from "../../ui/InstructionLine";
import WordCardOption from "../../ui/WordCardOption";
import { useChoiceState } from "./PickPicture";

export type HearPickWordExercise = Extract<Exercise, { type: "hear_pick_word" }>;

export interface HearPickWordProps {
  ex: HearPickWordExercise;
  onResult: (r: ExerciseResult) => void;
}

export function HearPickWord({ ex, onResult }: HearPickWordProps): React.ReactElement {
  const word = ex.word;
  const options = useMemo(
    () => shuffle([word, ...pickDistractors(word, ex.distractors ?? 3, ex.tiers)]),
    [ex, word]
  );
  const answerIndex = options.findIndex((o) => o.id === word.id);
  const choice = useChoiceState({
    answerIndex,
    correctAnnounce: `Correct! ${word.ka} — ${word.en || word.translit}`,
    missAnnounce: `Almost! The answer is ${word.ka} — ${word.en || word.translit}`,
    onResult,
  });

  useEffect(() => {
    playWord(word).catch(() => {});
  }, [word]);

  return (
    <View style={styles.wrap}>
      <InstructionLine text="Which word did you hear?" />
      <View style={styles.prompt}>
        <AudioButton audioId={word.id} lg label="Play the word again" />
      </View>
      <View style={styles.list}>
        {options.map((opt, i) => (
          <WordCardOption
            key={opt.id}
            ka={opt.ka}
            accessibilityLabel={opt.translit}
            onPress={choice.pressFor(i)}
            disabled={choice.disabled}
            status={choice.statusFor(i)}
            revealContinue={choice.revealContinueFor(i)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  prompt: {
    alignItems: "center",
  },
  list: {
    gap: spacing.sm,
  },
});

export default HearPickWord;

/* picture_pick_word — "Which word says it?": the reading variant of
 * reverse_pick. Options show the GEORGIAN FORM ONLY (no translit) so the
 * child truly reads; the per-row 🔊 stays the free explore affordance.
 * First tap answers; a miss gently reveals (the player speaks it). */

import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, type } from "../../../constants/theme";
import { playWord } from "../../../lib/audio";
import {
  pickDistractors,
  shuffle,
  type Exercise,
  type ExerciseResult,
} from "../../../lib/exercise-engine";
import AudioButton from "../../ui/AudioButton";
import EmojiIcon from "../../ui/EmojiIcon";
import InstructionLine from "../../ui/InstructionLine";
import WordCardOption from "../../ui/WordCardOption";
import { useChoiceState } from "./PickPicture";

export type PicturePickWordExercise = Extract<Exercise, { type: "picture_pick_word" }>;

export interface PicturePickWordProps {
  ex: PicturePickWordExercise;
  onResult: (r: ExerciseResult) => void;
}

export function PicturePickWord({ ex, onResult }: PicturePickWordProps): React.ReactElement {
  const word = ex.word;
  const options = useMemo(
    () => shuffle([word, ...pickDistractors(word, ex.distractors ?? 3, ex.tiers)]),
    [ex, word]
  );
  const answerIndex = options.findIndex((o) => o.id === word.id);
  const choice = useChoiceState({
    answerIndex,
    correctAnnounce: `Correct! ${word.ka} — ${word.en}`,
    missAnnounce: `Almost! The answer is ${word.ka} — ${word.en}`,
    onCorrect: () => {
      playWord(word).catch(() => {});
    },
    onResult,
  });

  return (
    <View style={styles.wrap}>
      <InstructionLine text="Which word says it?" />
      <View style={styles.prompt}>
        <EmojiIcon emoji={word.emoji} label={word.en} size={44} />
        <Text style={styles.promptEn}>{word.en}</Text>
      </View>
      <View style={styles.list}>
        {options.map((opt, i) => (
          <View key={opt.id} style={styles.row}>
            <View style={styles.cardWrap}>
              <WordCardOption
                ka={opt.ka}
                accessibilityLabel={opt.ka}
                onPress={choice.pressFor(i)}
                disabled={choice.disabled}
                status={choice.statusFor(i)}
                revealContinue={choice.revealContinueFor(i)}
              />
            </View>
            <AudioButton audioId={opt.id} small label="Hear this word" />
          </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  promptEn: {
    fontSize: type.h2,
    fontWeight: type.h2Weight,
    color: colors.ink,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardWrap: {
    flex: 1,
  },
});

export default PicturePickWord;

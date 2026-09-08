/* read_word_pick_picture — "Read it — then tap its picture": the reading
 * test. NO audio and NO translit up front (that would answer for the
 * child); the speaker starts LOCKED but still TALKS — tapping it wiggles
 * and explains, and it unlocks (with the translit) after the answer.
 * First tap on a picture answers; a miss gently reveals. */

import React, { useMemo, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTarget, spacing, type } from "../../../constants/theme";
import { announce, useReducedMotion } from "../../../lib/announce";
import { playUiKa, playWord } from "../../../lib/audio";
import {
  pickDistractors,
  shuffle,
  type Exercise,
  type ExerciseResult,
} from "../../../lib/exercise-engine";
import AudioButton from "../../ui/AudioButton";
import InstructionLine from "../../ui/InstructionLine";
import KaText from "../../ui/KaText";
import OptionCard from "../../ui/OptionCard";
import { OptionsGrid, useChoiceState } from "./PickPicture";

export type ReadWordPickPictureExercise = Extract<Exercise, { type: "read_word_pick_picture" }>;

export interface ReadWordPickPictureProps {
  ex: ReadWordPickPictureExercise;
  onResult: (r: ExerciseResult) => void;
}

export function ReadWordPickPicture({
  ex,
  onResult,
}: ReadWordPickPictureProps): React.ReactElement {
  const word = ex.word;
  const options = useMemo(
    () => shuffle([word, ...pickDistractors(word, ex.distractors ?? 3, ex.tiers)]),
    [ex, word]
  );
  const answerIndex = options.findIndex((o) => o.id === word.id);
  const [shakeX] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();

  const choice = useChoiceState({
    answerIndex,
    correctAnnounce: `Correct! ${word.ka} — ${word.en}`,
    missAnnounce: `Almost! The answer is ${word.ka} — ${word.en}`,
    onCorrect: () => {
      playWord(word).catch(() => {});
    },
    onResult,
  });

  // right OR revealed, the sound unlocks either way once answered
  const unlocked = choice.answered;

  const lockedTap = (): void => {
    if (!reduced) {
      Animated.sequence(
        [8, -8, 6, 0].map((v) =>
          Animated.timing(shakeX, { toValue: v, duration: 70, useNativeDriver: true })
        )
      ).start();
    }
    playUiKa("ui-ka-jer-tsaikitkhe").catch(() => {});
    announce("Read it first — then the sound unlocks!");
  };

  return (
    <View style={styles.wrap}>
      <InstructionLine text="Read it — then tap its picture" />
      <View style={styles.prompt}>
        <KaText text={word.ka} size={type.h1} />
        <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
          {unlocked ? (
            <AudioButton audioId={word.id} label="Hear the word" />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Read it first — then the sound unlocks!"
              onPress={lockedTap}
              style={({ pressed }) => [styles.lockedBtn, pressed && styles.lockedPressed]}
            >
              <Text style={styles.lockedIcon} accessibilityElementsHidden>
                🔒
              </Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
      {unlocked ? <Text style={styles.translit}>{word.translit}</Text> : null}
      <OptionsGrid>
        {options.map((opt, i) => (
          <OptionCard
            key={opt.id}
            emoji={opt.emoji}
            caption={opt.en}
            accessibilityLabel={opt.en}
            onPress={choice.pressFor(i)}
            disabled={choice.disabled}
            status={choice.statusFor(i)}
            revealContinue={choice.revealContinueFor(i)}
          />
        ))}
      </OptionsGrid>
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
    gap: spacing.lg,
  },
  translit: {
    fontSize: type.body,
    color: colors.inkSoft,
    textAlign: "center",
  },
  lockedBtn: {
    width: 56,
    height: 56,
    minWidth: minTarget,
    minHeight: minTarget,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockedPressed: {
    backgroundColor: colors.warnSoft,
  },
  lockedIcon: {
    fontSize: 24,
  },
});

export default ReadWordPickPicture;

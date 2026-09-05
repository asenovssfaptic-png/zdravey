/* pick_picture — "Tap what you hear": the workhorse exercise. The word
 * plays on mount; four emoji picture cards answer on the FIRST tap.
 *
 * This file also exports `useChoiceState`, the shared first-tap-answers
 * state machine for the whole pick family (reverse_pick, hear_pick_*,
 * letter_to_sound, read_word_pick_picture, picture_pick_word). It lives
 * here (the base picture exercise) so sibling renderers can import it
 * without creating a module cycle through exercises/index.ts.
 *
 * Gentle-only feedback (hard rule): a miss shakes/dims the tapped card and
 * reveals the right one — the SessionPlayer speaks it and continues; the
 * revealed card is also tappable to continue (a REPEAT onResult call for
 * the same exercise means "continue now" — the player treats it so).
 * There is NO failure state.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import InstructionLine from "../../ui/InstructionLine";
import KaText from "../../ui/KaText";
import OptionCard, { type AnswerStatus } from "../../ui/OptionCard";

/* ------------------------------------------------------------------ *
 * Shared choice-exercise state (first tap answers; reveal continues)
 * ------------------------------------------------------------------ */

export interface ChoiceConfig {
  /** Index of the correct option in the caller's (pre-shuffled) list. */
  answerIndex: number;
  correctAnnounce: string;
  missAnnounce: string;
  /** Side effect on a correct tap (e.g. replay the word). */
  onCorrect?: () => void;
  onResult: (r: ExerciseResult) => void;
}

export interface ChoiceState {
  answered: boolean;
  missed: boolean;
  statusFor(i: number): AnswerStatus;
  /** All options disable after the answer (the reveal stays tappable). */
  disabled: boolean;
  /** True for the revealed correct card after a miss — tappable-to-continue. */
  revealContinueFor(i: number): boolean;
  /** The one tap handler per option: answers first, continues after. */
  pressFor(i: number): () => void;
}

export function useChoiceState(cfg: ChoiceConfig): ChoiceState {
  const [picked, setPicked] = useState<number | null>(null);
  const [missed, setMissed] = useState(false);
  const missResult = useRef<ExerciseResult | null>(null);
  const answered = picked !== null;

  return {
    answered,
    missed,
    disabled: answered,
    statusFor(i: number): AnswerStatus {
      if (!answered) return "idle";
      if (i === cfg.answerIndex) return "correct";
      if (missed && i === picked) return "miss";
      return "idle";
    },
    revealContinueFor(i: number): boolean {
      return missed && i === cfg.answerIndex;
    },
    pressFor(i: number): () => void {
      return () => {
        if (!answered) {
          setPicked(i);
          if (i === cfg.answerIndex) {
            cfg.onCorrect?.();
            cfg.onResult({ correct: true, firstTry: true, announce: cfg.correctAnnounce });
          } else {
            setMissed(true);
            const r: ExerciseResult = {
              correct: false,
              firstTry: false,
              announce: cfg.missAnnounce,
            };
            missResult.current = r;
            cfg.onResult(r);
          }
          return;
        }
        // after a miss, tapping the revealed green card continues: the
        // player treats a repeated result for the same exercise as "go on"
        if (missed && i === cfg.answerIndex && missResult.current) {
          cfg.onResult(missResult.current);
        }
      };
    },
  };
}

/** Shared 2-column grid for picture option cards. */
export function OptionsGrid({ children }: { children: React.ReactNode }): React.ReactElement {
  return <View style={gridStyles.grid}>{children}</View>;
}

const gridStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
});

/* ------------------------------------------------------------------ *
 * pick_picture renderer
 * ------------------------------------------------------------------ */

export type PickPictureExercise = Extract<Exercise, { type: "pick_picture" }>;

export interface PickPictureProps {
  ex: PickPictureExercise;
  onResult: (r: ExerciseResult) => void;
}

export function PickPicture({ ex, onResult }: PickPictureProps): React.ReactElement {
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
    onResult,
  });

  // the prompt IS the audio — say the word straight away
  useEffect(() => {
    playWord(word).catch(() => {});
  }, [word]);

  return (
    <View style={styles.wrap}>
      <InstructionLine text="Tap what you hear" />
      <View style={styles.prompt}>
        <KaText text={word.ka} size={type.h1} speak audioId={word.id} />
        <AudioButton audioId={word.id} label="Hear the word again" />
      </View>
      <Text style={styles.translit}>{word.translit}</Text>
      <Text style={styles.sayHint}>say it: {word.translit}</Text>
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
  sayHint: {
    fontSize: type.body - 3,
    color: colors.inkSoft,
    fontStyle: "italic",
    textAlign: "center",
  },
});

export default PickPicture;

/* hear_pick_letter — "Tap the letter you hear": the letter sound plays on
 * mount (and again via the big 🔊); four big glyph tiles answer on the
 * first tap. A miss gently reveals the right tile (the player speaks it). */

import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { spacing } from "../../../constants/theme";
import { letterAudioId, playLetter } from "../../../lib/audio";
import {
  ALL_LETTERS,
  pickByKa,
  shuffle,
  type Exercise,
  type ExerciseResult,
} from "../../../lib/exercise-engine";
import AudioButton from "../../ui/AudioButton";
import InstructionLine from "../../ui/InstructionLine";
import Tile from "../../ui/Tile";
import { useChoiceState } from "./PickPicture";

export type HearPickLetterExercise = Extract<Exercise, { type: "hear_pick_letter" }>;

export interface HearPickLetterProps {
  ex: HearPickLetterExercise;
  onResult: (r: ExerciseResult) => void;
}

export function HearPickLetter({ ex, onResult }: HearPickLetterProps): React.ReactElement {
  const letter = ex.letter;
  const options = useMemo(
    () => shuffle([letter, ...pickByKa(letter, 3, [ex.pool ?? [], ALL_LETTERS])]),
    [ex, letter]
  );
  const answerIndex = options.findIndex((o) => o.ka === letter.ka);
  const choice = useChoiceState({
    answerIndex,
    correctAnnounce: `Correct! ${letter.ka} — ${letter.name}`,
    missAnnounce: `Almost! The answer is ${letter.ka} — ${letter.name}`,
    onResult,
  });

  useEffect(() => {
    playLetter(letter).catch(() => {});
  }, [letter]);

  return (
    <View style={styles.wrap}>
      <InstructionLine text="Tap the letter you hear" />
      <View style={styles.prompt}>
        <AudioButton audioId={letterAudioId(letter)} lg label="Play the letter sound again" />
      </View>
      <View style={styles.grid}>
        {options.map((opt, i) => {
          const revealContinue = choice.revealContinueFor(i);
          return (
            <Tile
              key={opt.ka}
              ka={opt.ka}
              size={84}
              accessibilityLabel={`Letter ${opt.name}, ${opt.translit}`}
              onPress={choice.pressFor(i)}
              disabled={choice.disabled && !revealContinue}
              status={choice.statusFor(i)}
            />
          );
        })}
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
  },
});

export default HearPickLetter;

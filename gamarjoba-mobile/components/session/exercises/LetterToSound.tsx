/* letter_to_sound — "What sound does it make?": a big glyph (letter OR
 * syllable) up top, transliterated sound cards below. Each row's small 🔊
 * explores out loud without answering; the FIRST tap on a card answers.
 * A miss gently reveals (the player speaks the right sound). */

import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { spacing, type } from "../../../constants/theme";
import { CURRICULUM } from "../../../content/generated/curriculum";
import type { Letter } from "../../../content/types";
import { letterAudioId } from "../../../lib/audio";
import {
  ALL_LETTERS,
  pickByKa,
  shuffle,
  type Exercise,
  type ExerciseResult,
  type SoundItem,
} from "../../../lib/exercise-engine";
import AudioButton from "../../ui/AudioButton";
import InstructionLine from "../../ui/InstructionLine";
import KaText from "../../ui/KaText";
import WordCardOption from "../../ui/WordCardOption";
import { useChoiceState } from "./PickPicture";

export type LetterToSoundExercise = Extract<Exercise, { type: "letter_to_sound" }>;

export interface LetterToSoundProps {
  ex: LetterToSoundExercise;
  onResult: (r: ExerciseResult) => void;
}

function isLetter(item: SoundItem): item is Letter {
  return "name" in item;
}

/** Bundled clip for a letter (via the letter-audio map) or a speakable. */
function itemAudioId(item: SoundItem): string | null {
  return isLetter(item) ? letterAudioId(item) : item.id;
}

export function LetterToSound({ ex, onResult }: LetterToSoundProps): React.ReactElement {
  const item = ex.item;
  const options = useMemo(() => {
    const padTier: SoundItem[] = isLetter(item)
      ? ALL_LETTERS
      : CURRICULUM.readingTrack?.syllables ?? [];
    return shuffle([item, ...pickByKa(item, 3, [ex.pool ?? [], padTier])]);
  }, [ex, item]);
  const answerIndex = options.findIndex((o) => o.ka === item.ka);
  const choice = useChoiceState({
    answerIndex,
    correctAnnounce: `Correct! ${item.ka} — ${item.translit}`,
    missAnnounce: `Almost! ${item.ka} says ${item.translit}`,
    onResult,
  });

  return (
    <View style={styles.wrap}>
      <InstructionLine text="What sound does it make?" />
      <View style={styles.prompt}>
        <KaText text={item.ka} size={type.h1 + 16} speak audioId={itemAudioId(item)} />
        <AudioButton audioId={itemAudioId(item)} label="Hear it" />
      </View>
      <View style={styles.list}>
        {options.map((opt, i) => (
          <View key={opt.ka} style={styles.row}>
            <View style={styles.cardWrap}>
              <WordCardOption
                translit={opt.translit}
                accessibilityLabel={opt.translit}
                onPress={choice.pressFor(i)}
                disabled={choice.disabled}
                status={choice.statusFor(i)}
                revealContinue={choice.revealContinueFor(i)}
              />
            </View>
            <AudioButton audioId={itemAudioId(opt)} small label="Hear this option" />
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
    gap: spacing.lg,
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

export default LetterToSound;

/* AlphabetGrid — the 6 alphabet groups as grids of letter tiles.
 * Port of the web renderAlphabet grid: each tile opens the LetterModal;
 * a small 🔊 beside it plays the letter without opening. Letters already
 * seen in passed lessons get a gentle "learned" tint — a celebration,
 * never a gate (every tile is always tappable). */

import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTarget, radii, shadow, spacing, type } from "../../constants/theme";
import { CURRICULUM } from "../../content/generated/curriculum";
import { letterAudioId } from "../../lib/audio";
import { ALL_LETTERS, learnedLetterSet } from "../../lib/exercise-engine";
import { useProgress } from "../../lib/store";
import AudioButton from "../ui/AudioButton";
import KaText from "../ui/KaText";

export interface AlphabetGridProps {
  onOpenLetter: (flatIndex: number) => void;
}

export function AlphabetGrid({ onOpenLetter }: AlphabetGridProps): React.ReactElement {
  const progress = useProgress();
  const learned = useMemo(() => learnedLetterSet(progress), [progress]);

  return (
    <View style={styles.groups}>
      {CURRICULUM.alphabet.map((group) => (
        <View key={group.id} style={styles.group}>
          <Text style={styles.groupTitle} accessibilityRole="header">
            {group.title}
          </Text>
          <View style={styles.grid}>
            {group.letters.map((letter) => {
              const flatIdx = ALL_LETTERS.indexOf(letter);
              const isLearned = learned.has(letter.ka);
              return (
                <View key={letter.ka} style={styles.tileWrap}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      `Letter ${letter.name}, ${letter.translit}` + (isLearned ? ", learned" : "")
                    }
                    onPress={() => onOpenLetter(flatIdx)}
                    style={({ pressed }) => [
                      styles.tile,
                      isLearned && styles.tileLearned,
                      pressed && styles.tilePressed,
                    ]}
                  >
                    <KaText text={letter.ka} size={26} />
                    <Text style={styles.translit}>{letter.translit}</Text>
                  </Pressable>
                  <AudioButton
                    audioId={letterAudioId(letter)}
                    label={`Hear letter ${letter.name}`}
                    small
                  />
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  groups: {
    gap: spacing.xl,
  },
  group: {
    gap: spacing.md,
  },
  groupTitle: {
    fontSize: type.h2,
    fontWeight: type.h2Weight,
    color: colors.ink,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  tileWrap: {
    alignItems: "center",
    gap: spacing.xs,
  },
  tile: {
    width: 76,
    minHeight: minTarget + 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    ...shadow,
  },
  tileLearned: {
    backgroundColor: colors.successTint,
    borderColor: colors.success,
  },
  tilePressed: {
    backgroundColor: colors.accentTint,
  },
  translit: {
    fontSize: type.body - 4,
    color: colors.inkSoft,
    fontWeight: "600",
  },
});

export default AlphabetGrid;

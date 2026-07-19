import { Pressable, StyleSheet, Text } from "react-native";

import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";

export type TileState = "idle" | "correct" | "gentle" | "disabled";

interface TileProps {
  emoji?: string;
  main: string; // learning-language word, shown big
  gloss: string; // known-language gloss, shown smaller
  state: TileState;
  onPress: () => void;
}

// One exercise type per component: this is the pick_picture answer tile.
// Tapping it both plays the word's own audio and registers the pick —
// there is no separate "listen" affordance to teach kids to look for.
export function Tile({ emoji, main, gloss, state, onPress }: TileProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={state === "disabled"}
      accessibilityRole="button"
      accessibilityLabel={main}
      style={({ pressed }) => [
        styles.tile,
        state === "correct" && styles.correct,
        state === "gentle" && styles.gentle,
        state === "disabled" && styles.disabled,
        pressed && state !== "disabled" && styles.pressed,
      ]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.main}>{main}</Text>
      <Text style={styles.gloss}>{gloss}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: "45%",
    minHeight: TouchTarget.min * 1.4,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    borderWidth: 3,
    borderColor: Colors.darkRed,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  correct: {
    backgroundColor: "#E7F5EC",
    borderColor: Colors.correct,
  },
  gentle: {
    borderColor: Colors.textMuted,
  },
  disabled: {
    opacity: 0.5,
  },
  emoji: {
    fontSize: FontSizes.huge,
  },
  main: {
    fontSize: FontSizes.label,
    fontWeight: "700",
    color: Colors.text,
  },
  gloss: {
    fontSize: FontSizes.body,
    color: Colors.textMuted,
  },
});

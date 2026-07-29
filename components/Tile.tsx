import { Image, Pressable, StyleSheet, Text } from "react-native";

import { Pop } from "@/components/Pop";
import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";
import { vocabImage } from "@/lib/images";

export type TileState = "idle" | "correct" | "gentle" | "disabled";

interface TileProps {
  emoji?: string;
  vocabId?: string; // resolves a painted illustration if one exists (else emoji)
  main: string; // learning-language word, shown big
  gloss: string; // known-language gloss, shown smaller
  state: TileState;
  onPress: () => void;
  // When true (and state is "correct"), the card gives a little celebratory
  // pop — the caller sets this only when the CHILD answered correctly, so the
  // bounce rewards the right action (a plain reveal of the answer stays static).
  win?: boolean;
}

// One exercise type per component: this is the pick_picture answer tile.
// Tapping it both plays the word's own audio and registers the pick —
// there is no separate "listen" affordance to teach kids to look for.
export function Tile({ emoji, vocabId, main, gloss, state, onPress, win }: TileProps) {
  const painted = vocabImage(vocabId);
  return (
    <Pop pop={state === "correct" && !!win} style={styles.wrap}>
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
        {painted ? (
          <Image source={painted} style={styles.image} resizeMode="contain" accessibilityIgnoresInvertColors />
        ) : (
          <Text style={styles.emoji}>{emoji}</Text>
        )}
        <Text style={styles.main}>{main}</Text>
        <Text style={styles.gloss}>{gloss}</Text>
      </Pressable>
    </Pop>
  );
}

const styles = StyleSheet.create({
  // The flex item in the grid (so the whole card can scale without disturbing
  // layout — the pop transform lives on this wrapper). The row stretches every
  // wrapper to the tallest card's height…
  wrap: {
    flexBasis: "45%",
  },
  tile: {
    width: "100%",
    flex: 1, // …and the tile fills that height, keeping cards equal per row.
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
    backgroundColor: Colors.tintGreen,
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
  image: {
    width: 88,
    height: 88,
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

/* StrollCard — one relaxed flip card for the Reading stroll.
 *
 * Front: just the Georgian word, read it yourself (no audio — reading
 * first), "tap to flip" hint. Back: emoji (🔤 for syllables), the word
 * (tap-to-hear), translit — meaning, and a 🔊 "Hear it again". The gentle
 * flip animation gates on reduced motion. Port of the web sprint-card.
 */

import React, { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, shadow, spacing, type } from "../../constants/theme";
import type { Syllable, VocabItem } from "../../content/types";
import { useReducedMotion } from "../../lib/announce";
import AudioButton from "../ui/AudioButton";
import EmojiIcon from "../ui/EmojiIcon";
import KaText from "../ui/KaText";

export interface StrollCardProps {
  item: VocabItem | Syllable;
  flipped: boolean;
  onFlip: () => void;
}

export function StrollCard({ item, flipped, onFlip }: StrollCardProps): React.ReactElement {
  const reduced = useReducedMotion();
  const [turn] = useState(() => new Animated.Value(1));
  const en = "en" in item ? item.en : "";
  const emoji = "emoji" in item && item.emoji ? item.emoji : "🔤";

  useEffect(() => {
    if (!flipped || reduced) return;
    turn.setValue(0);
    Animated.timing(turn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [flipped, reduced, turn]);

  if (!flipped) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Card: ${item.ka} — read it, then tap to flip and hear it`}
        onPress={onFlip}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <KaText text={item.ka} size={34} />
        <Text style={styles.hint} accessibilityElementsHidden>
          tap to flip
        </Text>
      </Pressable>
    );
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [
            {
              rotateY: turn.interpolate({
                inputRange: [0, 1],
                outputRange: ["90deg", "0deg"],
              }),
            },
          ],
        },
      ]}
    >
      <EmojiIcon emoji={emoji} label={en || "syllable"} size={44} />
      <KaText text={item.ka} size={34} speak audioId={item.id} />
      <Text style={styles.translit}>
        {item.translit}
        {en ? ` — ${en}` : ""}
      </Text>
      <AudioButton audioId={item.id} label="Hear it again" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    maxWidth: 420,
    width: "100%",
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadow,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  hint: {
    fontSize: type.body - 3,
    fontWeight: "600",
    color: colors.inkSoft,
  },
  translit: {
    fontSize: type.body - 1,
    color: colors.inkSoft,
    textAlign: "center",
  },
});

export default StrollCard;

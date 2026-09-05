/* WordCardOption — a Georgian-word answer card (reverse_pick,
 * picture_pick_word, hear_pick_word, letter_to_sound). The FIRST tap
 * answers — the Georgian text inside is plain (never `speak`); a separate
 * AudioButton beside the card is the free "explore out loud" affordance.
 */

import React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTarget, radii, shadow, spacing, type } from "../../constants/theme";
import KaText from "./KaText";
import { useShakeDim, type AnswerStatus } from "./OptionCard";

export interface WordCardOptionProps {
  /** Georgian text (omit for a translit-only sound card). */
  ka?: string;
  /** Latin line under/instead of the Georgian. */
  translit?: string;
  onPress: () => void;
  disabled?: boolean;
  status?: AnswerStatus;
  accessibilityLabel: string;
  revealContinue?: boolean;
}

export function WordCardOption({
  ka,
  translit,
  onPress,
  disabled,
  status = "idle",
  accessibilityLabel,
  revealContinue,
}: WordCardOptionProps): React.ReactElement {
  const { translateX, scale, dimmed } = useShakeDim(status);
  const correct = status === "correct";

  return (
    <Animated.View style={{ transform: [{ translateX }, { scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !!disabled && !revealContinue }}
        disabled={disabled && !revealContinue}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          correct && styles.correct,
          dimmed && styles.dim,
          pressed && !disabled && styles.pressed,
        ]}
      >
        {ka ? <KaText text={ka} size={type.h2} /> : null}
        {translit ? <Text style={styles.translit}>{translit}</Text> : null}
        {correct ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✓</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: minTarget + 8,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadow,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  correct: {
    backgroundColor: colors.successTint,
    borderColor: colors.success,
  },
  dim: {
    opacity: 0.45,
  },
  translit: {
    fontSize: type.body - 2,
    color: colors.inkSoft,
    fontWeight: "600",
  },
  badge: {
    marginLeft: "auto",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.surface,
    fontWeight: "800",
  },
});

export default WordCardOption;

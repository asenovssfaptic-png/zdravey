/* OptionCard — an emoji + caption answer card (pick_picture family).
 *
 * Gentle-only feedback: a missed tap shakes briefly then dims; the correct
 * card turns success-green with a ✓ and pops. There is NO failure state —
 * the revealed correct card becomes tappable to continue.
 */

import React, { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTarget, radii, shadow, spacing, type } from "../../constants/theme";
import { useReducedMotion } from "../../lib/announce";

export type AnswerStatus = "idle" | "correct" | "miss" | "dim";

export interface OptionCardProps {
  emoji: string;
  caption: string;
  onPress: () => void;
  disabled?: boolean;
  status?: AnswerStatus;
  accessibilityLabel: string;
  /** After a miss reveal, the correct card also continues on tap. */
  revealContinue?: boolean;
}

export function useShakeDim(status: AnswerStatus): {
  translateX: Animated.Value;
  scale: Animated.Value;
  dimmed: boolean;
} {
  const [translateX] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(1));
  const reduced = useReducedMotion();
  const dimmed = status === "dim" || status === "miss";

  useEffect(() => {
    if (reduced) return;
    if (status === "miss") {
      Animated.sequence(
        [8, -8, 6, -6, 0].map((v) =>
          Animated.timing(translateX, { toValue: v, duration: 70, useNativeDriver: true })
        )
      ).start();
    } else if (status === "correct") {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 120, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [status, reduced, translateX, scale]);

  return { translateX, scale, dimmed };
}

export function OptionCard({
  emoji,
  caption,
  onPress,
  disabled,
  status = "idle",
  accessibilityLabel,
  revealContinue,
}: OptionCardProps): React.ReactElement {
  const { translateX, scale, dimmed } = useShakeDim(status);
  const correct = status === "correct";

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateX }, { scale }] }]}>
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
        <Text style={styles.emoji} accessibilityElementsHidden>
          {emoji}
        </Text>
        <Text style={[styles.caption, correct && styles.captionCorrect]}>{caption}</Text>
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
  wrap: {
    flexBasis: "47%",
    flexGrow: 1,
  },
  card: {
    minHeight: minTarget * 2,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
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
  emoji: {
    fontSize: 44,
  },
  caption: {
    fontSize: type.body - 2,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
  captionCorrect: {
    color: colors.success,
  },
  badge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
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

export default OptionCard;

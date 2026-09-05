/* Tile — a big square letter/word tile (build slots, letter choices,
 * safari grid). ≥48dp target, Georgian text plain (the tile answers). */

import React from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { colors, minTarget, radii, shadow, spacing, type } from "../../constants/theme";
import KaText from "./KaText";
import { useShakeDim, type AnswerStatus } from "./OptionCard";
import { Text } from "react-native";

export interface TileProps {
  ka: string;
  onPress: () => void;
  disabled?: boolean;
  status?: AnswerStatus | "locked";
  accessibilityLabel: string;
  size?: number;
}

export function Tile({
  ka,
  onPress,
  disabled,
  status = "idle",
  accessibilityLabel,
  size = 64,
}: TileProps): React.ReactElement {
  const anim = useShakeDim(status === "locked" ? "idle" : status);
  const locked = status === "locked";
  const correct = status === "correct" || locked;

  return (
    <Animated.View style={{ transform: [{ translateX: anim.translateX }, { scale: anim.scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.tile,
          { width: size, height: Math.max(size, minTarget) },
          correct && styles.correct,
          anim.dimmed && styles.dim,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <KaText text={ka} size={Math.round(size * 0.42)} />
        {locked ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✓</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.xs,
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
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.surface,
    fontSize: type.body - 6,
    fontWeight: "800",
  },
});

export default Tile;

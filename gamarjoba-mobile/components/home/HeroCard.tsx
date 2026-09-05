/* HeroCard — "Day N · continue your adventure". STUB (Agent A — Learn):
 * already wired to computeNextStep so the continue flow is demoable. */

import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";

import { colors, minTarget, radii, shadow, spacing, type } from "../../constants/theme";
import { computeNextStep, totalStars } from "../../lib/exercise-engine";
import { useProgress } from "../../lib/store";

export function HeroCard(): React.ReactElement {
  const progress = useProgress();
  const next = computeNextStep(progress);
  const started = progress.xp > 0 || totalStars(progress) > 0 || progress.unitCardsDone.length > 0;
  const day = Math.max(1, progress.daysPlayed.length);
  const heroLine = next
    ? `${started ? "Keep going: " : "Start here: "}${next.unit.emoji} ${next.nodeTitle}` +
      (next.lesson ? ` · ${next.lesson.title}` : "") +
      ` — ${next.unit.title}`
    : "Every unit done — mix everything in Practice!";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Day ${day} of your adventure. ${heroLine}`}
      onPress={() => router.push((next ? next.href : "/practice") as never)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.day}>☀️ Day {day} of your adventure</Text>
      <Text style={styles.line}>{heroLine}</Text>
      <Text style={styles.chevron} accessibilityElementsHidden>
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: minTarget + 24,
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadow,
  },
  pressed: {
    backgroundColor: colors.accentDeep,
  },
  day: {
    color: colors.surface,
    fontSize: type.body - 2,
    fontWeight: "700",
    opacity: 0.95,
  },
  line: {
    color: colors.surface,
    fontSize: type.body,
    fontWeight: "800",
  },
  chevron: {
    position: "absolute",
    right: spacing.lg,
    top: "50%",
    color: colors.surface,
    fontSize: 26,
  },
});

export default HeroCard;

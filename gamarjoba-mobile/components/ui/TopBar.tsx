/* Persistent top bar: the borjgali brand (speaks გამარჯობა! and goes
 * home) plus ⭐/⚡ chips that open My treasures and pop when a value
 * increases (rewards only ever go up). */

import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { colors, minTarget, radii, spacing, type } from "../../constants/theme";
import { playId } from "../../lib/audio";
import { CURRICULUM } from "../../content/generated/curriculum";
import { totalStars } from "../../lib/exercise-engine";
import { useReducedMotion } from "../../lib/announce";
import { useProgress } from "../../lib/store";
import Borjgali from "./Borjgali";

function Chip({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: number;
  label: string;
}): React.ReactElement {
  const [scale] = useState(() => new Animated.Value(1));
  const prev = useRef<number | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (prev.current !== null && value > prev.current && !reduced) {
      scale.setValue(1);
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: 140, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
    prev.current = value;
  }, [value, reduced, scale]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push("/treasures" as never)}
    >
      <Animated.View style={[styles.chip, { transform: [{ scale }] }]}>
        <Text style={styles.chipEmoji} accessibilityElementsHidden>
          {emoji}
        </Text>
        <Text style={styles.chipVal}>{value}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function TopBar(): React.ReactElement {
  const progress = useProgress();
  const stars = totalStars(progress);

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Gamarjoba! — go home"
        onPress={() => {
          playId(CURRICULUM.vocab.gamarjoba.id).catch(() => {});
          router.navigate("/" as never);
        }}
        style={({ pressed }) => [styles.brand, pressed && { opacity: 0.7 }]}
      >
        <Borjgali size={30} />
        <Text style={styles.brandText}>Gamarjoba!</Text>
      </Pressable>
      <View style={styles.chips}>
        <Chip emoji="⭐" value={stars} label={`Total stars: ${stars} — open My treasures`} />
        <Chip emoji="⚡" value={progress.xp} label={`Total XP: ${progress.xp} — open My treasures`} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: {
    minHeight: minTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brandText: {
    fontSize: type.h2,
    fontWeight: type.h1Weight,
    color: colors.accentDeep,
  },
  chips: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  chip: {
    minHeight: minTarget - 8,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipVal: {
    fontSize: type.body - 1,
    fontWeight: "800",
    color: colors.ink,
  },
});

export default TopBar;

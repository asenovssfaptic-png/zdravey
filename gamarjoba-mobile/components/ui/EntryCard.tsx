/* EntryCard — a big home/hub entry with emoji (optionally inside a
 * ProgressRing), Georgian + English label, sub line and chevron. */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTarget, radii, shadow, spacing, type } from "../../constants/theme";
import KaText from "./KaText";
import ProgressRing from "./ProgressRing";

export interface EntryCardProps {
  emoji: string;
  /** Georgian label (plain, not tappable here — the card answers). */
  kaLabel?: string;
  label: string;
  sub: string;
  onPress: () => void;
  accessibilityLabel: string;
  ring?: { frac: number; done: boolean };
}

export function EntryCard({
  emoji,
  kaLabel,
  label,
  sub,
  onPress,
  accessibilityLabel,
  ring,
}: EntryCardProps): React.ReactElement {
  const face = <Text style={styles.emoji}>{emoji}</Text>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {ring ? (
        <ProgressRing frac={ring.frac} done={ring.done} size={56}>
          {face}
        </ProgressRing>
      ) : (
        <View style={styles.faceWrap}>{face}</View>
      )}
      <View style={styles.middle}>
        <View style={styles.titleRow}>
          {kaLabel ? <KaText text={kaLabel} size={type.body} /> : null}
          <Text style={styles.title}>{kaLabel ? ` · ${label}` : label}</Text>
        </View>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      <Text style={styles.chevron} accessibilityElementsHidden>
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: minTarget + 24,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadow,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  faceWrap: {
    width: 56,
    alignItems: "center",
  },
  emoji: {
    fontSize: 30,
  },
  middle: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
  },
  title: {
    fontSize: type.body,
    fontWeight: "800",
    color: colors.ink,
  },
  sub: {
    fontSize: type.body - 3,
    color: colors.inkSoft,
  },
  chevron: {
    fontSize: 26,
    color: colors.inkSoft,
  },
});

export default EntryCard;

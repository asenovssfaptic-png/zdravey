/* PathNode — one node on a step path (Letters / Reading / Unit paths).
 * Ring + face + ✓ / "Up next" pill. Everything is ALWAYS tappable —
 * done/next are highlights, NEVER locks. */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTarget, radii, shadow, spacing, type } from "../../constants/theme";
import ProgressRing from "./ProgressRing";

export interface PathNodeProps {
  /** Emoji string or a custom face (e.g. a KaText glyph). */
  face: React.ReactNode;
  title: string;
  /** Plain sub line, or a node (e.g. a StarRow). */
  sub?: React.ReactNode;
  done: boolean;
  next: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

export function PathNode({
  face,
  title,
  sub,
  done,
  next,
  onPress,
  accessibilityLabel,
}: PathNodeProps): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.node,
        done && styles.done,
        next && styles.next,
        pressed && styles.pressed,
      ]}
    >
      <View>
        <ProgressRing frac={done ? 1 : 0} done={done} size={52}>
          {typeof face === "string" ? <Text style={styles.faceEmoji}>{face}</Text> : face}
        </ProgressRing>
        {done ? (
          <View style={styles.check}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.label}>
        <Text style={styles.title}>{title}</Text>
        {typeof sub === "string" ? <Text style={styles.sub}>{sub}</Text> : sub ?? null}
      </View>
      {next ? (
        <View style={styles.pill}>
          <Text style={styles.pillText}>Up next</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  node: {
    minHeight: minTarget + 16,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadow,
  },
  done: {
    backgroundColor: colors.successTint,
    borderColor: colors.success,
  },
  next: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  faceEmoji: {
    fontSize: 22,
  },
  check: {
    position: "absolute",
    right: -4,
    top: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "800",
  },
  label: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: type.body,
    fontWeight: "700",
    color: colors.ink,
  },
  sub: {
    fontSize: type.body - 3,
    color: colors.inkSoft,
  },
  pill: {
    backgroundColor: colors.accent,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillText: {
    color: colors.surface,
    fontSize: type.body - 4,
    fontWeight: "800",
  },
});

export default PathNode;

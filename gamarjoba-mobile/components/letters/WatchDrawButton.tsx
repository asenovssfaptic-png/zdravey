/* WatchDrawButton — the shared "▶ Watch it draw" control for every trace
 * surface (web watchDrawBtn). It only fires `onPress`; the owning screen
 * calls its TraceCanvas ref's watch(...) and records the trace (watching
 * counts as tracing — keyboard/motor accessibility, never a gate). */

import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, minTarget, radii, spacing, type } from "../../constants/theme";

export interface WatchDrawButtonProps {
  /** triggers TraceCanvas ref.watch(...) in the owning screen. */
  onPress: () => void;
  letterKa: string;
}

export function WatchDrawButton({ onPress, letterKa }: WatchDrawButtonProps): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Watch the letter ${letterKa} draw itself stroke by stroke`}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Text style={styles.text}>▶ Watch it draw</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: minTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  pressed: {
    backgroundColor: colors.accentTint,
  },
  text: {
    fontSize: type.body - 1,
    fontWeight: "700",
    color: colors.ink,
  },
});

export default WatchDrawButton;

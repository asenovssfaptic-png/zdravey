/* InstructionLine — the one way to put an instruction on screen: a
 * replayable line with a 🔊. NEVER auto-narrated (users found voice-over
 * repetitive) — tap to hear it, always. */

import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, minTarget, radii, spacing, type } from "../../constants/theme";
import { playUi } from "../../lib/audio";

export interface InstructionLineProps {
  text: string;
}

export function InstructionLine({ text }: InstructionLineProps): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text + " — tap to hear the instruction again"}
      onPress={() => {
        playUi(text).catch(() => {});
      }}
      style={({ pressed }) => [styles.line, pressed && styles.pressed]}
    >
      <Text style={styles.text}>{text}</Text>
      <Text style={styles.speaker} accessibilityElementsHidden>
        🔊
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  line: {
    minHeight: minTarget,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    alignSelf: "center",
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  text: {
    fontSize: type.h2,
    fontWeight: type.h2Weight,
    color: colors.ink,
    textAlign: "center",
  },
  speaker: {
    fontSize: 16,
  },
});

export default InstructionLine;

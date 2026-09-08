/* InstructionLine — the one way to put an instruction on screen: a plain,
 * non-interactive text pill. Georgian-only audio (hard rule): instruction
 * lines lost their English clips, so there is no speaker / press handler.
 * A small type icon (👂 hear · 👀 read · ✋ do) gives pre-readers a
 * non-text cue for what kind of turn this is — same rule as the web app. */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, minTarget, radii, spacing, type } from "../../constants/theme";

export interface InstructionLineProps {
  text: string;
}

/** Mirrors web app.js instructionIcon(): hear → 👂, read → 👀, else ✋. */
function instructionIcon(text: string): string {
  if (/\bhear\b/.test(text)) return "👂";
  if (/^Read it|^Which word says/.test(text)) return "👀";
  return "✋";
}

export function InstructionLine({ text }: InstructionLineProps): React.ReactElement {
  return (
    <View style={styles.line} accessibilityRole="text">
      <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
        {instructionIcon(text)}
      </Text>
      <Text style={styles.text} accessibilityLabel={text}>
        {text}
      </Text>
    </View>
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
  icon: {
    fontSize: 16,
  },
  text: {
    fontSize: type.h2,
    fontWeight: type.h2Weight,
    color: colors.ink,
    textAlign: "center",
  },
});

export default InstructionLine;

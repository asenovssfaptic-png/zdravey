/* TraceLetterHeader — letter identity above every trace canvas:
 * "ა · ani — says a" + 🔊. Port of the web traceLetterHeader(). Shared by
 * the trace screen and the trace_letter exercise renderer. */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, type } from "../../constants/theme";
import type { Letter } from "../../content/types";
import { letterAudioId } from "../../lib/audio";
import AudioButton from "../ui/AudioButton";
import KaText from "../ui/KaText";

export interface TraceLetterHeaderProps {
  letter: Letter;
}

export function TraceLetterHeader({ letter }: TraceLetterHeaderProps): React.ReactElement {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`You are writing the letter ${letter.name} — it says ${letter.translit}`}
    >
      <View style={styles.glyphAndText} importantForAccessibility="no-hide-descendants">
        <KaText text={letter.ka} size={34} />
        <View style={styles.textCol}>
          <Text style={styles.name}>{letter.name}</Text>
          <Text style={styles.sound}>says {letter.translit}</Text>
        </View>
      </View>
      <AudioButton
        audioId={letterAudioId(letter)}
        label={`Hear the letter ${letter.name}`}
        small
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  glyphAndText: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  textCol: {
    gap: 0,
  },
  name: {
    fontSize: type.body,
    fontWeight: "700",
    color: colors.ink,
  },
  sound: {
    fontSize: type.body - 3,
    color: colors.inkSoft,
  },
});

export default TraceLetterHeader;

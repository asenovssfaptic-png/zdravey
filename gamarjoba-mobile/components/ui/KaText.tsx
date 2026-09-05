/* KaText — the one way to render Georgian text.
 *
 * With `speak`, the text becomes tappable IFF a bundled clip resolves
 * (explicit `audioId` first, else the shared KA_SPEAK index); clip-less
 * text stays plain. HARD RULE (from the web app): answer controls NEVER
 * pass `speak` — the first tap must answer, not talk.
 */

import React from "react";
import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

import { colors, minTarget, type } from "../../constants/theme";
import { playId } from "../../lib/audio";
import { resolveKaAudio } from "../../lib/ka-speak";

export interface KaTextProps {
  text: string;
  /** Base font size — Georgian renders at ×1.15 of it (web `.ka`). */
  size?: number;
  /** Explicit clip id; defaults to the KA_SPEAK lookup when `speak`. */
  audioId?: string | null;
  /** Tappable tap-to-hear. NEVER set this on an answer control. */
  speak?: boolean;
  style?: StyleProp<TextStyle>;
}

export function KaText({ text, size, audioId, speak, style }: KaTextProps): React.ReactElement {
  const fontSize = Math.round((size ?? type.body) * type.kaScale);
  const resolved = speak ? (audioId ?? resolveKaAudio(text)) : null;

  const textEl = (
    <Text style={[styles.ka, { fontSize }, style]} accessibilityLanguage="ka">
      {text}
    </Text>
  );

  if (!resolved) return textEl;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={"Listen: " + text}
      hitSlop={Math.max(0, (minTarget - fontSize) / 2)}
      onPress={() => {
        playId(resolved).catch(() => {});
      }}
    >
      {textEl}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ka: {
    color: colors.ink,
    fontWeight: "600",
  },
});

export default KaText;

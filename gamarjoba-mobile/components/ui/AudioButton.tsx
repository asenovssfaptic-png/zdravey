/* AudioButton — the ONE way to put a 🔊 next to a word or letter.
 * Strictly a secondary control: it NEVER selects or submits an answer
 * (it is its own Pressable, outside any answer card). */

import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, minTarget } from "../../constants/theme";
import { playId } from "../../lib/audio";

export interface AudioButtonProps {
  /** Bundled clip id (silent no-op when null/unknown). */
  audioId: string | null | undefined;
  /** Accessible label, e.g. "Hear the word again". */
  label?: string;
  small?: boolean;
  lg?: boolean;
  /** Override the tap action (e.g. a locked 🔊 that explains itself). */
  onPress?: () => void;
}

export function AudioButton({
  audioId,
  label = "Listen",
  small,
  lg,
  onPress,
}: AudioButtonProps): React.ReactElement {
  const size = lg ? 72 : small ? minTarget : 56;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        if (onPress) onPress();
        else playId(audioId).catch(() => {});
      }}
      style={({ pressed }) => [
        styles.btn,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
      ]}
      hitSlop={small ? 4 : 0}
    >
      <Text style={{ fontSize: lg ? 34 : small ? 20 : 26 }} accessibilityElementsHidden>
        🔊
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentTint,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
});

export default AudioButton;

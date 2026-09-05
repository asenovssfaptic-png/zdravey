import React from "react";
import { Text } from "react-native";

export interface EmojiIconProps {
  emoji: string;
  /** Meaningful label, or omit for decorative (hidden from readers). */
  label?: string;
  size?: number;
}

/** An emoji as image — labeled for screen readers or explicitly hidden. */
export function EmojiIcon({ emoji, label, size = 32 }: EmojiIconProps): React.ReactElement {
  return (
    <Text
      style={{ fontSize: size, lineHeight: Math.round(size * 1.25) }}
      accessibilityRole="image"
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? "yes" : "no-hide-descendants"}
    >
      {emoji}
    </Text>
  );
}

export default EmojiIcon;

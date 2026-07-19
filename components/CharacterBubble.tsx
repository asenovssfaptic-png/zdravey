import { StyleSheet, Text, View } from "react-native";

import type { CharacterMeta } from "@/characters/characters";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";

interface CharacterBubbleProps {
  character: CharacterMeta;
  text: string;
}

export function CharacterBubble({ character, text }: CharacterBubbleProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: character.color }]}>
        <Text style={styles.avatarEmoji}>{character.emoji}</Text>
      </View>
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radii.round,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: 32,
  },
  bubble: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    borderWidth: 2,
    borderColor: Colors.darkRed,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  bubbleText: {
    fontSize: FontSizes.body,
    color: Colors.text,
  },
});

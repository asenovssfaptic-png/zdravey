import { Platform, Pressable, StyleSheet, Text } from "react-native";

import { Colors, TouchTarget } from "@/constants/theme";

interface AudioButtonProps {
  onPress: () => void;
  accessibilityLabel: string;
  isPlaying?: boolean;
  size?: number;
}

// Purely presentational — callers wire up playback via lib/audio's
// useClipPlayer so a single player instance can be shared with other UI
// (e.g. auto-play-on-mount for a lesson prompt).
export function AudioButton({ onPress, accessibilityLabel, isPlaying, size = TouchTarget.min }: AudioButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        isPlaying && styles.playing,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.icon, { fontSize: size * 0.45 }]}>🔊</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: { boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.15)" },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  playing: {
    backgroundColor: Colors.red,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  icon: {},
});

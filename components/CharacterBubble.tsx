import { useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { CharacterMeta } from "@/characters/characters";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import type { AudioClip } from "@/content/content-model";
import { useClipPlayer } from "@/lib/audio";
import { characterImage } from "@/lib/images";

interface CharacterBubbleProps {
  character: CharacterMeta;
  text: string;
  // When set, the bubble speaks: it plays the clip once on mount and shows a
  // tap-to-replay speaker. Used for audio-first tips/instructions (e.g. Kuma
  // Lisa's hint) so a pre-reader hears the guidance instead of only seeing it.
  audio?: AudioClip;
  audioLabel?: string;
}

export function CharacterBubble({ character, text, audio, audioLabel }: CharacterBubbleProps) {
  const painted = characterImage(character.id);
  return (
    <View style={styles.row}>
      {painted ? (
        <Image
          source={painted}
          style={styles.avatar}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.avatar, { backgroundColor: character.color }]}>
          <Text style={styles.avatarEmoji}>{character.emoji}</Text>
        </View>
      )}
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{text}</Text>
      </View>
      {/* The audio player is only mounted when a clip is supplied, so bubbles on
          non-mount-gated screens (home/profile) stay free of client-only audio
          hooks during the static export. */}
      {audio && <BubbleSpeaker audio={audio} label={audioLabel ?? text} />}
    </View>
  );
}

function BubbleSpeaker({ audio, label }: { audio: AudioClip; label: string }) {
  const { play, isPlaying } = useClipPlayer(audio);
  // Speak once when the bubble appears (e.g. the moment the hint is opened).
  useEffect(() => {
    play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Pressable
      onPress={play}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.speaker, isPlaying && styles.speakerOn, pressed && styles.speakerPressed]}
    >
      <Text style={styles.speakerIcon}>🔊</Text>
    </Pressable>
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
  speaker: {
    width: 48,
    height: 48,
    borderRadius: Radii.round,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  speakerOn: { backgroundColor: Colors.tintGold },
  speakerPressed: { opacity: 0.7 },
  speakerIcon: { fontSize: 24 },
});

import { useAudioPlayer, useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from "expo-audio";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CHARACTERS } from "@/characters/characters";
import { AudioButton } from "@/components/AudioButton";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";
import { buildSayIt } from "@/content/content-model";
import { useClipPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";

import { type ExerciseProps } from "./types";

// Kuker's "say it out loud" round: hear the word, record your own voice, play
// it back. No scoring — recording is optional practice a parent can review.
// Kuker is the pronunciation/celebration character, so he hosts regardless of
// the unit's usual host.
export function SayIt({ exercise, onDone }: ExerciseProps) {
  const { direction } = useDirection();
  const kuker = CHARACTERS.kuker;
  const built = buildSayIt(exercise, direction);

  const reference = useClipPlayer(built.referenceAudio);
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const [recording, setRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const playback = useAudioPlayer(recordedUri ? { uri: recordedUri } : null);

  async function startRecording() {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) return;
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
  }

  async function stopRecording() {
    await recorder.stop();
    setRecording(false);
    if (recorder.uri) setRecordedUri(recorder.uri);
  }

  function playRecording() {
    playback.seekTo(0);
    playback.play();
  }

  return (
    <View style={styles.container}>
      <CharacterBubble
        character={kuker}
        text={direction.known === "bg" ? "Кажи го на глас!" : "Say it out loud!"}
      />

      <View style={styles.card}>
        <Text style={styles.emoji}>{built.emoji}</Text>
        <Text style={styles.word}>{built.word}</Text>
        <Text style={styles.gloss}>{built.gloss}</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.action}>
          <AudioButton
            onPress={reference.play}
            isPlaying={reference.isPlaying}
            accessibilityLabel={built.word}
            size={88}
          />
          <Text style={styles.actionLabel}>{direction.known === "bg" ? "Чуй" : "Listen"}</Text>
        </View>

        <View style={styles.action}>
          <Pressable
            onPress={recording ? stopRecording : startRecording}
            accessibilityRole="button"
            accessibilityLabel={
              recording
                ? direction.known === "bg"
                  ? "Спри"
                  : "Stop"
                : direction.known === "bg"
                  ? "Запиши"
                  : "Record"
            }
            style={({ pressed }) => [
              styles.recordButton,
              recording && styles.recording,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.recordIcon}>{recording ? "⏹️" : "🎤"}</Text>
          </Pressable>
          <Text style={styles.actionLabel}>
            {recording
              ? direction.known === "bg"
                ? "Спри"
                : "Stop"
              : direction.known === "bg"
                ? "Запиши"
                : "Record"}
          </Text>
        </View>

        <View style={[styles.action, !recordedUri && styles.actionDisabled]}>
          <AudioButton
            onPress={playRecording}
            accessibilityLabel={direction.known === "bg" ? "Чуй себе си" : "Hear yourself"}
            size={88}
          />
          <Text style={styles.actionLabel}>{direction.known === "bg" ? "Ти" : "You"}</Text>
        </View>
      </View>

      <Pressable
        onPress={onDone}
        accessibilityRole="button"
        style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
      >
        <Text style={styles.nextText}>{direction.known === "bg" ? "Напред" : "Next"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.lg,
    alignItems: "center",
  },
  card: {
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
  },
  emoji: {
    fontSize: 96,
  },
  word: {
    fontSize: FontSizes.title,
    fontWeight: "800",
    color: Colors.text,
  },
  gloss: {
    fontSize: FontSizes.label,
    color: Colors.textMuted,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.xl,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  action: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  actionDisabled: {
    opacity: 0.4,
  },
  actionLabel: {
    fontSize: FontSizes.body,
    color: Colors.text,
    fontWeight: "600",
  },
  recordButton: {
    width: TouchTarget.min,
    height: TouchTarget.min,
    borderRadius: Radii.round,
    backgroundColor: Colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  recording: {
    backgroundColor: Colors.darkRed,
  },
  recordIcon: {
    fontSize: 36,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  nextButton: {
    marginTop: "auto",
    backgroundColor: Colors.gold,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  nextText: {
    fontSize: FontSizes.label,
    fontWeight: "700",
    color: Colors.text,
  },
});

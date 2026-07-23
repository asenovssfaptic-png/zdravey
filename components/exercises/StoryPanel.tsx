import { useEffect, useState } from "react";
import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";

import { CHARACTERS } from "@/characters/characters";
import { AudioButton } from "@/components/AudioButton";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";
import { VOCAB } from "@/content/content-model";
import { useClipPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";
import { background, vocabImage } from "@/lib/images";

import type { ExerciseProps } from "./types";

// A storybook panel: characters tell a short tale one line at a time, narrated
// in the child's known language, with an optional spotlight word the child can
// tap to hear in the language being learned. Audio-first, positive-only — there
// is no wrong answer, just "Напред" (Next) to turn the page. Stories frame a
// lesson (intro/outro) so the vocab arrives inside a little folk narrative.
export function StoryPanel({ exercise, onDone }: ExerciseProps) {
  const { direction } = useDirection();
  const known = direction.known;
  const learning = direction.learning;
  const story = exercise.story;

  const [line, setLine] = useState(0);

  // Fall back gracefully if a story exercise has no content.
  const lines = story?.lines ?? [];
  const current = lines[Math.min(line, lines.length - 1)];

  // Hooks must run every render — compute safe clips even when a line lacks a
  // spotlight (reuse the narration clip as a harmless stand-in that we simply
  // don't wire to a button).
  const narrationClip = current?.audio[known] ?? { src: "", voiceId: "default" };
  const narration = useClipPlayer(narrationClip);

  const spotlightVocab = current?.spotlight ? VOCAB[current.spotlight] : null;
  const spotlightClip = spotlightVocab ? spotlightVocab.audio[learning] : narrationClip;
  const spotlight = useClipPlayer(spotlightClip);

  // Narrate each line as it turns.
  useEffect(() => {
    narration.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line, known]);

  if (!story || lines.length === 0) {
    // Nothing to tell — advance immediately.
    onDone();
    return <View style={styles.container} />;
  }

  const speaker = CHARACTERS[current.speaker];
  const isLast = line >= lines.length - 1;
  const scene = story.scene ? background(story.scene) : null;
  const spotImg = spotlightVocab ? vocabImage(spotlightVocab.id) : null;

  function next() {
    if (isLast) onDone();
    else setLine((l) => l + 1);
  }

  const body = (
    <View style={styles.panel}>
      <CharacterBubble character={speaker} text={current.text[known]} />

      <View style={styles.narrateRow}>
        <AudioButton
          onPress={narration.play}
          isPlaying={narration.isPlaying}
          accessibilityLabel={known === "bg" ? "Чуй пак" : "Hear again"}
          size={64}
        />
      </View>

      {spotlightVocab && (
        <Pressable
          onPress={spotlight.play}
          accessibilityRole="button"
          accessibilityLabel={spotlightVocab.labels[learning]}
          style={({ pressed }) => [styles.spotlight, pressed && styles.pressed]}
        >
          {spotImg ? (
            <Image source={spotImg} style={styles.spotImg} accessibilityIgnoresInvertColors />
          ) : (
            <Text style={styles.spotEmoji}>{spotlightVocab.emoji ?? "🔊"}</Text>
          )}
          <View style={styles.spotText}>
            <Text style={styles.spotWord}>{spotlightVocab.labels[learning]}</Text>
            <Text style={styles.spotGloss}>{spotlightVocab.labels[known]}</Text>
          </View>
          <Text style={styles.spotSpeaker}>🔊</Text>
        </Pressable>
      )}

      <Pressable
        onPress={next}
        accessibilityRole="button"
        accessibilityLabel={isLast ? (known === "bg" ? "Хайде!" : "Let's go!") : known === "bg" ? "Напред" : "Next"}
        style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
      >
        <Text style={styles.nextText}>
          {isLast ? (known === "bg" ? "Хайде!" : "Let's go!") : known === "bg" ? "Напред ▸" : "Next ▸"}
        </Text>
      </Pressable>

      {/* Page dots so the child sees the story has a length + progress. */}
      <View style={styles.dots}>
        {lines.map((_, i) => (
          <View key={i} style={[styles.dot, i === line && styles.dotActive]} />
        ))}
      </View>
    </View>
  );

  if (!scene) return <View style={styles.container}>{body}</View>;

  return (
    <ImageBackground source={scene} resizeMode="cover" style={styles.container}>
      <View style={styles.scrim} pointerEvents="none" />
      {body}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: Radii.lg, overflow: "hidden" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: Colors.scrim },
  panel: { flex: 1, justifyContent: "center", gap: Spacing.lg, padding: Spacing.md },
  narrateRow: { alignItems: "center" },
  spotlight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    borderWidth: 3,
    borderColor: Colors.gold,
    padding: Spacing.md,
  },
  spotImg: { width: 72, height: 72, borderRadius: Radii.md },
  spotEmoji: { fontSize: 56, width: 72, textAlign: "center" },
  spotText: { flex: 1 },
  spotWord: { fontSize: FontSizes.title, fontWeight: "800", color: Colors.darkRed },
  spotGloss: { fontSize: FontSizes.body, color: Colors.textMuted },
  spotSpeaker: { fontSize: 28 },
  nextButton: {
    minHeight: TouchTarget.min,
    backgroundColor: Colors.red,
    borderRadius: Radii.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
  },
  nextText: { fontSize: FontSizes.title, fontWeight: "800", color: Colors.white },
  pressed: { transform: [{ scale: 0.98 }] },
  dots: { flexDirection: "row", gap: Spacing.sm, justifyContent: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.textMuted, opacity: 0.4 },
  dotActive: { backgroundColor: Colors.red, opacity: 1 },
});

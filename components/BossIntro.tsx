import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CHARACTERS } from "@/characters/characters";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";
import type { LangCode } from "@/content/content-model";
import { CHALLENGE } from "@/content/content-model";
import { useClipPlayer } from "@/lib/audio";

// The gate before a Krali Marko boss round: he appears, speaks the challenge,
// and a big sword button starts it. Still positive-only — this is a hero's
// game, not a test you can fail.
export function BossIntro({ known, onStart }: { known: LangCode; onStart: () => void }) {
  const kraliMarko = CHARACTERS.krali_marko;
  const intro = useClipPlayer(CHALLENGE[known].introAudio);

  useEffect(() => {
    intro.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.wrap}>
      <CharacterBubble character={kraliMarko} text={CHALLENGE[known].intro} />
      <Text style={styles.crest}>🗡️</Text>
      <Pressable
        onPress={onStart}
        accessibilityRole="button"
        accessibilityLabel={known === "bg" ? "Започни" : "Start"}
        style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}
      >
        <Text style={styles.startText}>{known === "bg" ? "Започни" : "Start"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xl,
    padding: Spacing.lg,
  },
  crest: {
    fontSize: 96,
  },
  startButton: {
    minHeight: TouchTarget.min,
    justifyContent: "center",
    backgroundColor: Colors.darkRed,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  startText: {
    fontSize: FontSizes.label,
    fontWeight: "800",
    color: Colors.white,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
});

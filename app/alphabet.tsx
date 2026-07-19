import { useRouter } from "expo-router";
import { useSyncExternalStore } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";
import type { Letter } from "@/content/content-model";
import { ALPHABET, SCRIPT_FOR_LEARNING } from "@/content/content-model";
import { useOnDemandPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";

const emptySubscribe = () => () => {};

// The alphabet track — the one direction-specific screen. A child learning
// English sees Latin; learning Bulgarian sees Cyrillic. Tap a letter to hear
// its sound. Kuker (the "say it out loud" character) hosts.
//
// The audio hook isn't safe to run during the static export's server render,
// so the interactive content lives in AlphabetContent, mounted client-side
// only. The shell matches between server and first client render (no
// hydration mismatch).
export default function AlphabetScreen() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return <SafeAreaView style={styles.safeArea} />;
  return <AlphabetContent />;
}

function AlphabetContent() {
  const router = useRouter();
  const { direction } = useDirection();
  const kuker = CHARACTERS.kuker;
  const { play } = useOnDemandPlayer();

  const script = SCRIPT_FOR_LEARNING[direction.learning];
  const letters = ALPHABET[script];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={direction.known === "bg" ? "Назад" : "Back"}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>{direction.known === "bg" ? "Азбука" : "Alphabet"}</Text>
        <View style={styles.backButton} />
      </View>

      <CharacterBubble
        character={kuker}
        text={direction.known === "bg" ? "Докосни буква, за да я чуеш!" : "Tap a letter to hear it!"}
      />

      <ScrollView contentContainerStyle={styles.grid}>
        {letters.map((letter) => (
          <LetterTile key={letter.audio.src} letter={letter} onPress={() => play(letter.audio)} />
        ))}
      </ScrollView>

      <Pressable
        onPress={() => router.push("/alphabet-practice")}
        accessibilityRole="button"
        accessibilityLabel={direction.known === "bg" ? "Упражнение" : "Practice"}
        style={({ pressed }) => [styles.practiceButton, pressed && styles.pressed]}
      >
        <Text style={styles.practiceIcon}>👂</Text>
        <Text style={styles.practiceText}>{direction.known === "bg" ? "Упражнение" : "Practice"}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function LetterTile({ letter, onPress }: { letter: Letter; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={letter.char}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <Text style={styles.letter}>{letter.char}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: Radii.round,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 32,
    color: Colors.darkRed,
    fontWeight: "800",
  },
  title: {
    fontSize: FontSizes.title,
    fontWeight: "800",
    color: Colors.darkRed,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    justifyContent: "center",
    paddingVertical: Spacing.md,
  },
  tile: {
    width: TouchTarget.comfortable,
    height: TouchTarget.comfortable,
    borderRadius: Radii.lg,
    backgroundColor: Colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  tilePressed: {
    backgroundColor: Colors.darkRed,
    transform: [{ scale: 0.94 }],
  },
  letter: {
    fontSize: FontSizes.title,
    fontWeight: "800",
    color: Colors.white,
  },
  pressed: {
    opacity: 0.7,
  },
  practiceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.gold,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  practiceIcon: {
    fontSize: 28,
  },
  practiceText: {
    fontSize: FontSizes.label,
    fontWeight: "700",
    color: Colors.text,
  },
});

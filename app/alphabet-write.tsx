import { useRouter } from "expo-router";
import { useState, useSyncExternalStore } from "react";
import { PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { CharacterBubble } from "@/components/CharacterBubble";
import { SparkleBurst } from "@/components/SparkleBurst";
import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";
import { ALPHABET, PRAISE, SCRIPT_FOR_LEARNING } from "@/content/content-model";
import { useOnDemandPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";
import { useSfx } from "@/lib/sfx";

// "Пиши буквите" — trace/write the letters. A big faint guide letter with a
// finger-paint surface over it: the child drags to lay down ink. Strictly
// positive-only — there is NO accuracy check, any drawing is celebrated (young
// hands just enjoy tracing). Kuker (pronunciation/alphabet) hosts. Client-only
// (audio + pointer), mount-gated so the static export's shell matches.
const emptySubscribe = () => () => {};
const DOT = 16;
const MIN_STEP = 7; // px between sampled ink dots

interface Pt {
  x: number;
  y: number;
}

export default function AlphabetWriteScreen() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return <SafeAreaView style={styles.safeArea} />;
  return <WriteContent />;
}

function WriteContent() {
  const router = useRouter();
  const { direction } = useDirection();
  const known = direction.known;
  const kuker = CHARACTERS.kuker;
  const { play } = useOnDemandPlayer();
  const sfx = useSfx();
  const { width } = useWindowDimensions();
  const board = Math.min(width - Spacing.lg * 2, 340);

  const script = SCRIPT_FOR_LEARNING[direction.learning];
  const letters = ALPHABET[script];

  const [index, setIndex] = useState(0);
  const [points, setPoints] = useState<Pt[]>([]);
  const [wins, setWins] = useState(0);
  const letter = letters[index];

  // The ink surface. `last` is a closure variable (not a React ref) so nothing
  // reads a ref during render; created once via a useState initializer.
  const [pan] = useState(() => {
    let last: Pt | null = null;
    const add = (x: number, y: number) => {
      if (last && Math.hypot(x - last.x, y - last.y) < MIN_STEP) return;
      last = { x, y };
      setPoints((prev) => (prev.length > 900 ? prev : [...prev, { x, y }]));
    };
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        last = null;
        add(e.nativeEvent.locationX, e.nativeEvent.locationY);
      },
      onPanResponderMove: (e) => add(e.nativeEvent.locationX, e.nativeEvent.locationY),
    });
    return { handlers: responder.panHandlers, reset: () => (last = null) };
  });

  function clear() {
    pan.reset();
    setPoints([]);
  }

  function done() {
    sfx.play("success");
    play(PRAISE[known].audio);
    setWins((w) => w + 1);
    setTimeout(() => {
      setIndex((i) => (i + 1) % letters.length);
      pan.reset();
      setPoints([]);
    }, 900);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={known === "bg" ? "Назад" : "Back"}
          style={({ pressed }) => [styles.backButton, pressed && styles.faded]}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>{known === "bg" ? "Пиши буквите" : "Write the letters"}</Text>
        <View style={styles.backButton} />
      </View>

      <CharacterBubble
        character={kuker}
        text={known === "bg" ? "Проследи буквата с пръст!" : "Trace the letter with your finger!"}
      />

      <View style={styles.boardWrap}>
        <View style={[styles.board, { width: board, height: board }]} {...pan.handlers}>
          <Text style={[styles.guide, { fontSize: board * 0.72 }]} pointerEvents="none">
            {letter.char}
          </Text>
          {points.map((pt, i) => (
            <View key={i} style={[styles.ink, { left: pt.x - DOT / 2, top: pt.y - DOT / 2 }]} pointerEvents="none" />
          ))}
          <View style={styles.burst} pointerEvents="none">
            <SparkleBurst trigger={wins} size={board} distance={board * 0.4} />
          </View>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={() => play(letter.audio)}
          accessibilityRole="button"
          accessibilityLabel={known === "bg" ? "Чуй буквата" : "Hear the letter"}
          style={({ pressed }) => [styles.ctrl, styles.ctrlGold, pressed && styles.faded]}
        >
          <Text style={styles.ctrlIcon}>🔊</Text>
        </Pressable>
        <Pressable
          onPress={clear}
          accessibilityRole="button"
          accessibilityLabel={known === "bg" ? "Изчисти" : "Clear"}
          style={({ pressed }) => [styles.ctrl, styles.ctrlPlain, pressed && styles.faded]}
        >
          <Text style={styles.ctrlIcon}>🧽</Text>
        </Pressable>
        <Pressable
          onPress={done}
          accessibilityRole="button"
          accessibilityLabel={known === "bg" ? "Готово" : "Done"}
          style={({ pressed }) => [styles.ctrl, styles.ctrlDone, pressed && styles.faded]}
        >
          <Text style={styles.ctrlDoneText}>{known === "bg" ? "Готово ✓" : "Done ✓"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white, padding: Spacing.lg, gap: Spacing.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 32, color: Colors.darkRed, fontWeight: "800" },
  title: { fontSize: FontSizes.title, fontWeight: "800", color: Colors.darkRed },
  boardWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  board: {
    backgroundColor: Colors.tintGold,
    borderRadius: Radii.lg,
    borderWidth: 3,
    borderColor: Colors.gold,
    overflow: "hidden",
  },
  guide: {
    position: "absolute",
    width: "100%",
    height: "100%",
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "800",
    color: Colors.textMuted,
    opacity: 0.3,
  },
  ink: {
    position: "absolute",
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: Colors.red,
  },
  burst: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  controls: { flexDirection: "row", gap: Spacing.md, justifyContent: "center", alignItems: "center" },
  ctrl: {
    minHeight: TouchTarget.min,
    minWidth: TouchTarget.min,
    borderRadius: Radii.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  ctrlGold: { backgroundColor: Colors.gold },
  ctrlPlain: { backgroundColor: Colors.white, borderWidth: 3, borderColor: Colors.darkRed },
  ctrlDone: { backgroundColor: Colors.correct, flex: 1 },
  ctrlIcon: { fontSize: 30 },
  ctrlDoneText: { fontSize: FontSizes.label, fontWeight: "800", color: Colors.white },
  faded: { opacity: 0.7 },
});

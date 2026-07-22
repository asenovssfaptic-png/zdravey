import { useRouter } from "expo-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import { VOCAB } from "@/content/content-model";
import { useOnDemandPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";
import { shuffled } from "@/lib/shuffle";

// Игра — памет ("Открий двойките" / Find the pairs). A supplementary memory
// game: flip cards, match the pairs. Positive-only — no timer, no score, no
// fail; mismatches just flip back. Client-only (audio hooks).
const PAIRS = 4;
const emptySubscribe = () => () => {};

// Pool of picturable items (emoji reads clearly on a small card).
const POOL = [
  "fruit.apple",
  "fruit.banana",
  "fruit.grapes",
  "fruit.pear",
  "fruit.orange",
  "fruit.strawberry",
  "animal.cat",
  "animal.dog",
  "animal.bird",
  "animal.fish",
];

interface Card {
  key: string; // unique per card
  id: string; // vocab id (two cards share it -> a pair)
  emoji: string;
  audioSrc: string;
}

function makeDeck(learning: "bg" | "en"): Card[] {
  const chosen = shuffled(POOL).slice(0, PAIRS);
  const cards: Card[] = [];
  chosen.forEach((id, i) => {
    const v = VOCAB[id];
    for (const half of [0, 1]) {
      cards.push({ key: `${id}-${half}-${i}`, id, emoji: v.emoji ?? "❓", audioSrc: v.audio[learning].src });
    }
  });
  return shuffled(cards);
}

export default function MemoryGameScreen() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return <SafeAreaView style={styles.safeArea} />;
  return <MemoryContent />;
}

function MemoryContent() {
  const router = useRouter();
  const { direction } = useDirection();
  const known = direction.known;
  const kuma = CHARACTERS.kuma_lisa;
  const player = useOnDemandPlayer();

  const [deck, setDeck] = useState<Card[]>(() => makeDeck(direction.learning));
  const [flipped, setFlipped] = useState<string[]>([]); // card keys currently face-up (unmatched)
  const [matched, setMatched] = useState<Set<string>>(new Set()); // matched vocab ids

  const done = useMemo(() => matched.size === PAIRS, [matched]);

  // Two cards are up -> we're evaluating; block further flips until it resolves.
  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped.map((k) => deck.find((c) => c.key === k)!);
    const isPair = a.id === b.id;
    const t = setTimeout(
      () => {
        if (isPair) setMatched((prev) => new Set(prev).add(a.id));
        setFlipped([]);
      },
      isPair ? 500 : 850,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  function flip(card: Card) {
    if (matched.has(card.id) || flipped.includes(card.key) || flipped.length === 2) return;
    player.play({ src: card.audioSrc, voiceId: "default" });
    setFlipped((prev) => [...prev, card.key]);
  }

  function restart() {
    setMatched(new Set());
    setFlipped([]);
    setDeck(makeDeck(direction.learning));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={known === "bg" ? "Назад" : "Back"}
          style={styles.back}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>{known === "bg" ? "Открий двойките" : "Find the pairs"}</Text>
        <View style={styles.back} />
      </View>

      {done ? (
        <View style={styles.doneWrap}>
          <CharacterBubble character={kuma} text={known === "bg" ? "Браво! Откри всички!" : "Great! You found them all!"} />
          <Text style={styles.doneEmoji}>🦊🎉</Text>
          <Pressable onPress={restart} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>{known === "bg" ? "Още веднъж" : "Play again"}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.grid}>
          {deck.map((card) => {
            const isUp = flipped.includes(card.key) || matched.has(card.id);
            return (
              <Pressable
                key={card.key}
                testID="memcard"
                onPress={() => flip(card)}
                accessibilityRole="button"
                accessibilityLabel={isUp ? card.id : known === "bg" ? "Карта" : "Card"}
                style={[styles.card, isUp ? styles.cardUp : styles.cardDown, matched.has(card.id) && styles.cardMatched]}
              >
                <Text style={styles.cardFace}>{isUp ? card.emoji : "❓"}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  back: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 32, color: Colors.darkRed, fontWeight: "800" },
  title: { fontSize: FontSizes.title, fontWeight: "800", color: Colors.darkRed },
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    alignContent: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  card: {
    width: 150,
    height: 150,
    borderRadius: Radii.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
  cardDown: { backgroundColor: Colors.red, borderColor: Colors.darkRed },
  cardUp: { backgroundColor: Colors.white, borderColor: Colors.darkRed },
  cardMatched: { backgroundColor: Colors.tintGreen, borderColor: Colors.correct },
  cardFace: { fontSize: FontSizes.huge },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.xl, padding: Spacing.lg },
  doneEmoji: { fontSize: 72 },
  button: {
    backgroundColor: Colors.red,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  buttonText: { fontSize: FontSizes.label, fontWeight: "700", color: Colors.white },
  pressed: { transform: [{ scale: 0.97 }] },
});

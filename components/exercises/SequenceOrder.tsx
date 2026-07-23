import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import { VOCAB } from "@/content/content-model";
import { useOnDemandPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";
import { vocabImage } from "@/lib/images";
import { shuffled } from "@/lib/shuffle";

import { REVEAL_DELAY_MS, type ExerciseProps } from "./types";

// "Order the story" — tap the pictures in the right order (e.g. count 1→5).
// Narrative + logic in one. Positive-only: only the correct NEXT picture snaps
// into place; a tap on any other gently wiggles and speaks its word (still
// useful practice) without ever failing the child. The next slot pulses as a
// gentle nudge, and each placed word is spoken aloud.
export function SequenceOrder({ exercise, host, onDone }: ExerciseProps) {
  const { direction } = useDirection();
  const known = direction.known;
  const learning = direction.learning;

  const order = exercise.choices ?? [];
  const tiles = useMemo(() => shuffled(order), [exercise.prompt]); // eslint-disable-line react-hooks/exhaustive-deps

  const [placed, setPlaced] = useState(0); // how many are correctly in place
  const [wrongId, setWrongId] = useState<string | null>(null);
  const player = useOnDemandPlayer();

  const done = placed >= order.length && order.length > 0;

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onDone, REVEAL_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function tap(id: string) {
    if (done) return;
    const vocab = VOCAB[id];
    player.play(vocab.audio[learning]);
    if (id === order[placed]) {
      setWrongId(null);
      setPlaced((n) => n + 1);
    } else {
      // Gentle nudge — no penalty, just a visual wiggle for ~500ms.
      setWrongId(id);
      setTimeout(() => setWrongId((w) => (w === id ? null : w)), 500);
    }
  }

  const placedIds = order.slice(0, placed);

  return (
    <View style={styles.container}>
      <CharacterBubble
        character={host}
        text={
          done
            ? known === "bg"
              ? "Браво! Подреди ги!"
              : "Great! You ordered them!"
            : known === "bg"
              ? "Подреди по ред — от малкото към голямото."
              : "Put them in order — smallest to biggest."
        }
      />

      {/* The sequence being built. Filled slots show the picture; the next slot
          pulses; the rest are empty placeholders so the length is visible. */}
      <View style={styles.slots}>
        {order.map((_, i) => {
          const id = placedIds[i];
          const isNext = i === placed && !done;
          return (
            <View key={i} style={[styles.slot, isNext && styles.slotNext, id && styles.slotFilled]}>
              {id ? <SlotImage id={id} /> : <Text style={styles.slotNum}>{i + 1}</Text>}
            </View>
          );
        })}
      </View>

      {/* The shuffled pictures to tap. Placed ones fade out. */}
      <View style={styles.pool}>
        {tiles.map((id) => {
          const vocab = VOCAB[id];
          const isPlaced = placedIds.includes(id);
          const img = vocabImage(id);
          return (
            <Pressable
              key={id}
              onPress={() => tap(id)}
              disabled={isPlaced}
              accessibilityRole="button"
              accessibilityLabel={vocab.labels[learning]}
              style={({ pressed }) => [
                styles.card,
                isPlaced && styles.cardPlaced,
                wrongId === id && styles.cardWrong,
                pressed && !isPlaced && styles.pressed,
              ]}
            >
              {img ? (
                <Image source={img} style={styles.cardImg} resizeMode="contain" accessibilityIgnoresInvertColors />
              ) : (
                <Text style={styles.cardEmoji}>{vocab.emoji ?? "❓"}</Text>
              )}
              <Text style={styles.cardWord}>{vocab.labels[learning]}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.replayRow}>
        <AudioButton
          onPress={() => placedIds.length && player.play(VOCAB[placedIds[placedIds.length - 1]].audio[learning])}
          accessibilityLabel={known === "bg" ? "Чуй пак" : "Hear again"}
          size={56}
        />
      </View>
    </View>
  );
}

function SlotImage({ id }: { id: string }) {
  const img = vocabImage(id);
  const vocab = VOCAB[id];
  if (img) return <Image source={img} style={styles.slotImg} resizeMode="contain" accessibilityIgnoresInvertColors />;
  return <Text style={styles.slotEmoji}>{vocab.emoji ?? "✓"}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: Spacing.lg },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, justifyContent: "center" },
  slot: {
    width: 60,
    height: 60,
    borderRadius: Radii.md,
    borderWidth: 3,
    borderColor: Colors.textMuted,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.6,
  },
  slotFilled: { borderStyle: "solid", borderColor: Colors.correct, backgroundColor: Colors.tintGreen, opacity: 1 },
  slotNext: { borderColor: Colors.gold, borderStyle: "solid", opacity: 1 },
  slotNum: { fontSize: FontSizes.label, fontWeight: "800", color: Colors.textMuted },
  slotImg: { width: 48, height: 48 },
  slotEmoji: { fontSize: 34 },
  pool: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    justifyContent: "center",
    alignContent: "center",
    flex: 1,
  },
  card: {
    width: 96,
    minHeight: 110,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    borderWidth: 3,
    borderColor: Colors.darkRed,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  cardImg: { width: 64, height: 64 },
  cardEmoji: { fontSize: 52 },
  cardWord: { fontSize: FontSizes.body, fontWeight: "700", color: Colors.text },
  cardPlaced: { opacity: 0.35 },
  cardWrong: { borderColor: Colors.gold, transform: [{ rotate: "-4deg" }] },
  pressed: { transform: [{ scale: 0.97 }] },
  replayRow: { alignItems: "center" },
});

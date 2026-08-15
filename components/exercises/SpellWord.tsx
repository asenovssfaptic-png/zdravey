import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import { AudioButton } from "@/components/AudioButton";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Pop } from "@/components/Pop";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import { ALPHABET, SCRIPT_FOR_LEARNING, VOCAB } from "@/content/content-model";
import { useClipPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";
import { vocabImage } from "@/lib/images";
import { useSfx } from "@/lib/sfx";
import { shuffled } from "@/lib/shuffle";

import { REVEAL_DELAY_MS, type ExerciseProps } from "./types";

// spell_word — assemble a single vocab word (in the language being learned)
// from letter tiles, guided by its picture + spoken word. A gentle bridge from
// the alphabet track to real words. Positive-only: only the correct NEXT letter
// snaps in; any other tap wiggles (no penalty). Completing speaks the whole word
// and rewards. Client-only (the lesson tree is mount-gated), so the letter bank
// is shuffled once in a useState initializer with no SSR/hydration concern.

const DISTRACTORS = 3; // extra wrong letters mixed into the bank

interface Tile {
  id: number;
  char: string;
}

export function SpellWord({ exercise, host, onDone }: ExerciseProps) {
  const { direction } = useDirection();
  const known = direction.known;
  const learning = direction.learning;
  const item = VOCAB[exercise.prompt];

  const word = item?.labels[learning] ?? "";
  const letters = [...word];

  // Build the tile bank once: the word's own letters plus a few distractor
  // letters from the learned script, all shuffled.
  const [bank] = useState<Tile[]>(() => {
    const script = SCRIPT_FOR_LEARNING[learning];
    const alphabet = ALPHABET[script].map((l) => l.char);
    const inWord = new Set(letters.map((c) => c.toLowerCase()));
    const pool = alphabet.filter((c) => !inWord.has(c.toLowerCase()));
    const extras = shuffled(pool).slice(0, DISTRACTORS);
    const chars = shuffled([...letters, ...extras]);
    return chars.map((char, id) => ({ id, char }));
  });

  const [placed, setPlaced] = useState(0); // how many letters are correctly down
  const [used, setUsed] = useState<Set<number>>(new Set());
  const [wrongId, setWrongId] = useState<number | null>(null);

  const player = useClipPlayer(item?.audio[learning] ?? { src: "", voiceId: "default" });
  const sfx = useSfx();
  const done = placed >= letters.length && letters.length > 0;
  const img = vocabImage(exercise.prompt);

  function sameLetter(a: string, b: string) {
    return a.toLowerCase() === b.toLowerCase();
  }

  function tap(tile: Tile) {
    if (done || used.has(tile.id)) return;
    if (sameLetter(tile.char, letters[placed])) {
      setUsed((prev) => new Set(prev).add(tile.id));
      const next = placed + 1;
      setPlaced(next);
      setWrongId(null);
      if (next >= letters.length) {
        sfx.play("success");
        setTimeout(player.play, 250); // speak the finished word
        setTimeout(onDone, REVEAL_DELAY_MS);
      } else {
        sfx.play("pop");
      }
    } else {
      setWrongId(tile.id);
      setTimeout(() => setWrongId((w) => (w === tile.id ? null : w)), 500);
    }
  }

  return (
    <View style={styles.container}>
      <CharacterBubble
        character={host}
        text={
          done
            ? known === "bg"
              ? "Браво! Написа думата!"
              : "Bravo! You spelled it!"
            : known === "bg"
              ? "Спелувай думата:"
              : "Spell the word:"
        }
      />

      {/* The picture + hear the word in the language being learned. */}
      <View style={styles.promptRow}>
        {img ? (
          <Image source={img} style={styles.picture} resizeMode="contain" accessibilityIgnoresInvertColors />
        ) : (
          <Text style={styles.pictureEmoji}>{item?.emoji ?? "❓"}</Text>
        )}
        <AudioButton
          onPress={player.play}
          isPlaying={player.isPlaying}
          accessibilityLabel={item?.labels[learning] ?? ""}
          size={64}
        />
      </View>

      {/* Build area — the spelled-out letters so far, with a caret. */}
      <View style={styles.slots}>
        {letters.map((ch, i) => (
          <View key={i} style={styles.slot}>
            {i < placed ? (
              <Pop pop>
                <Text style={styles.slotFilled}>{ch}</Text>
              </Pop>
            ) : (
              <Text style={styles.slotEmpty}>{i === placed ? "_" : ""}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Letter bank — tap in order. Placed letters fade out. */}
      <View style={styles.bank}>
        {bank.map((tile) => {
          const isUsed = used.has(tile.id);
          return (
            <Pressable
              key={tile.id}
              onPress={() => tap(tile)}
              disabled={isUsed}
              accessibilityRole="button"
              accessibilityLabel={tile.char}
              style={[styles.key, isUsed && styles.keyUsed, wrongId === tile.id && styles.keyWrong]}
            >
              <Text style={[styles.keyText, isUsed && styles.keyUsedText]}>{tile.char}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: Spacing.lg },
  promptRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.lg },
  picture: { width: 96, height: 96 },
  pictureEmoji: { fontSize: 72 },
  slots: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
    minHeight: 56,
    alignItems: "center",
  },
  slot: {
    minWidth: 40,
    borderBottomWidth: 3,
    borderBottomColor: Colors.gold,
    alignItems: "center",
    paddingBottom: Spacing.xs,
  },
  slotFilled: { fontSize: FontSizes.title, fontWeight: "800", color: Colors.darkRed },
  slotEmpty: { fontSize: FontSizes.title, fontWeight: "800", color: Colors.textMuted },
  bank: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    justifyContent: "center",
    alignContent: "flex-start",
    flex: 1,
  },
  key: {
    minWidth: 56,
    minHeight: 56,
    borderRadius: Radii.md,
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.darkRed,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  keyUsed: { opacity: 0.3, borderColor: Colors.textMuted },
  keyWrong: { borderColor: Colors.gold, transform: [{ rotate: "-4deg" }] },
  keyText: { fontSize: FontSizes.title, fontWeight: "800", color: Colors.darkRed },
  keyUsedText: { color: Colors.textMuted },
});

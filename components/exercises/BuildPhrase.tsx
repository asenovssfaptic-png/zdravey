import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Pop } from "@/components/Pop";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import { useClipPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";
import { useSfx } from "@/lib/sfx";
import { shuffled } from "@/lib/shuffle";

import { REVEAL_DELAY_MS, type ExerciseProps } from "./types";

// build_phrase — tap the word tiles (in the language being learned) in order to
// assemble a phrase, guided by its meaning in the known language. Duolingo-style
// word bank. Positive-only: only the correct NEXT word snaps in; any other tap
// gently wiggles (no penalty). Completing it speaks the whole phrase + rewards.
export function BuildPhrase({ exercise, host, onDone }: ExerciseProps) {
  const { direction } = useDirection();
  const known = direction.known;
  const learning = direction.learning;
  const phrase = exercise.phrase;

  const target = phrase?.tokens[learning] ?? [];
  // Stable shuffled bank of token indices (client-only — the lesson tree is
  // mount-gated, so no SSR/hydration concern).
  const [order] = useState(() => shuffled(target.map((_, i) => i)));
  const [placed, setPlaced] = useState(0); // how many words are correctly down
  const [used, setUsed] = useState<Set<number>>(new Set());
  const [wrongId, setWrongId] = useState<number | null>(null);

  const player = useClipPlayer(phrase?.audio[learning] ?? { src: "", voiceId: "default" });
  const sfx = useSfx();
  const done = placed >= target.length && target.length > 0;

  if (!phrase || target.length === 0) {
    onDone();
    return <View style={styles.container} />;
  }

  function tap(id: number) {
    if (done || used.has(id)) return;
    if (target[id] === target[placed]) {
      const nextUsed = new Set(used).add(id);
      setUsed(nextUsed);
      const next = placed + 1;
      setPlaced(next);
      setWrongId(null);
      if (next >= target.length) {
        sfx.play("success");
        setTimeout(player.play, 250); // speak the finished phrase
        setTimeout(onDone, REVEAL_DELAY_MS);
      } else {
        sfx.play("pop");
      }
    } else {
      setWrongId(id);
      setTimeout(() => setWrongId((w) => (w === id ? null : w)), 500);
    }
  }

  return (
    <View style={styles.container}>
      <CharacterBubble
        character={host}
        text={
          done
            ? known === "bg"
              ? "Браво! Подреди изречението!"
              : "Bravo! You built the sentence!"
            : known === "bg"
              ? "Подреди изречението:"
              : "Build the sentence:"
        }
      />

      {/* The meaning (known language) + hear the phrase in the learning tongue. */}
      <View style={styles.promptRow}>
        <Text style={styles.meaning}>{phrase.text[known]}</Text>
        <AudioButton
          onPress={player.play}
          isPlaying={player.isPlaying}
          accessibilityLabel={known === "bg" ? "Чуй изречението" : "Hear the sentence"}
          size={56}
        />
      </View>

      {/* Build area — the assembled words so far. */}
      <View style={styles.buildArea}>
        {target.slice(0, placed).map((tok, i) => (
          <Pop key={i} pop={i === placed - 1}>
            <View style={styles.builtChip}>
              <Text style={styles.builtText}>{tok}</Text>
            </View>
          </Pop>
        ))}
        {!done && <View style={styles.caret} />}
      </View>

      {/* Word bank — tap in order. Placed words fade out. */}
      <View style={styles.bank}>
        {order.map((id) => {
          const isUsed = used.has(id);
          return (
            <Pressable
              key={id}
              onPress={() => tap(id)}
              disabled={isUsed}
              accessibilityRole="button"
              accessibilityLabel={target[id]}
              style={[styles.bankChip, isUsed && styles.bankUsed, wrongId === id && styles.bankWrong]}
            >
              <Text style={[styles.bankText, isUsed && styles.bankUsedText]}>{target[id]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: Spacing.lg },
  promptRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.md },
  meaning: { fontSize: FontSizes.label, fontWeight: "700", color: Colors.text, flexShrink: 1 },
  buildArea: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: 64,
    borderBottomWidth: 3,
    borderBottomColor: Colors.gold,
    paddingBottom: Spacing.sm,
  },
  builtChip: {
    backgroundColor: Colors.red,
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  builtText: { fontSize: FontSizes.label, fontWeight: "800", color: Colors.white },
  caret: { width: 3, height: 28, backgroundColor: Colors.gold, opacity: 0.6 },
  bank: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    justifyContent: "center",
    alignContent: "flex-start",
    flex: 1,
  },
  bankChip: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    borderWidth: 3,
    borderColor: Colors.darkRed,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  bankUsed: { opacity: 0.3, borderColor: Colors.textMuted },
  bankWrong: { borderColor: Colors.gold, transform: [{ rotate: "-4deg" }] },
  bankText: { fontSize: FontSizes.label, fontWeight: "800", color: Colors.darkRed },
  bankUsedText: { color: Colors.textMuted },
});

import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";
import { useDirection } from "@/lib/direction";
import { shuffled } from "@/lib/shuffle";

// ParentGate — a simple "prove you're a grown-up" check in front of every
// screen that changes core settings (direction, parental controls). A young
// pre-reader must not be able to one-tap into the setup screen and flip the
// learning direction by accident. The challenge is a small two-digit addition
// ("14 + 23 = ?") answered by tapping one of four big number buttons — trivial
// for a parent, out of reach for a 5-year-old who can't yet add.
//
// Strictly positive-only, like the rest of the app: a wrong tap just dims and
// resets to a fresh sum (no lockout, no scary error, no counter). ✕ cancels.
// Mount this conditionally ({visible && <ParentGate .../>}) so it is client-only
// — the sum is drawn with Math.random in a useState initializer, never during a
// server/static render.

interface Challenge {
  a: number;
  b: number;
  options: number[];
}

function makeChallenge(): Challenge {
  const a = 10 + Math.floor(Math.random() * 40); // 10–49
  const b = 10 + Math.floor(Math.random() * 40);
  const answer = a + b;
  const distractors = new Set<number>();
  while (distractors.size < 3) {
    const delta = Math.floor(Math.random() * 21) - 10; // -10..10
    const wrong = answer + delta;
    if (delta !== 0 && wrong > 0) distractors.add(wrong);
  }
  return { a, b, options: shuffled([answer, ...distractors]) };
}

export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const { direction } = useDirection();
  const known = direction.known;
  const [challenge, setChallenge] = useState(makeChallenge);
  const [wrong, setWrong] = useState<number | null>(null);
  const answer = challenge.a + challenge.b;

  function pick(n: number) {
    if (n === answer) {
      onPass();
    } else {
      // Gentle reset — dim the wrong choice briefly, then a fresh sum.
      setWrong(n);
      setTimeout(() => {
        setChallenge(makeChallenge());
        setWrong(null);
      }, 500);
    }
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={known === "bg" ? "Затвори" : "Close"}
            style={({ pressed }) => [styles.close, pressed && styles.faded]}
            hitSlop={12}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>

          <Text style={styles.forGrownups}>{known === "bg" ? "За възрастни" : "For grown-ups"}</Text>
          <Text
            style={styles.sum}
            accessibilityRole="header"
            accessibilityLabel={`${challenge.a} + ${challenge.b}`}
          >
            {challenge.a} + {challenge.b} = ?
          </Text>

          <View style={styles.options}>
            {challenge.options.map((n) => (
              <Pressable
                key={n}
                onPress={() => pick(n)}
                accessibilityRole="button"
                accessibilityLabel={String(n)}
                style={({ pressed }) => [
                  styles.option,
                  wrong === n && styles.optionWrong,
                  pressed && styles.faded,
                ]}
              >
                <Text style={styles.optionText}>{n}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(58,35,35,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    borderWidth: 3,
    borderColor: Colors.darkRed,
    padding: Spacing.lg,
    gap: Spacing.lg,
    alignItems: "center",
  },
  close: { position: "absolute", top: Spacing.sm, right: Spacing.md, padding: Spacing.xs },
  closeIcon: { fontSize: 26, fontWeight: "800", color: Colors.textMuted },
  forGrownups: { fontSize: FontSizes.body, fontWeight: "700", color: Colors.textMuted, marginTop: Spacing.sm },
  sum: { fontSize: FontSizes.huge, fontWeight: "800", color: Colors.darkRed },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.md,
  },
  option: {
    minWidth: 120,
    minHeight: TouchTarget.min,
    borderRadius: Radii.md,
    backgroundColor: Colors.tintGold,
    borderWidth: 3,
    borderColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  optionWrong: { opacity: 0.35, borderColor: Colors.textMuted },
  optionText: { fontSize: FontSizes.title, fontWeight: "800", color: Colors.darkRed },
  faded: { opacity: 0.7 },
});

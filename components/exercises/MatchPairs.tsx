import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CharacterBubble } from "@/components/CharacterBubble";
import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";
import { buildMatchPairs } from "@/content/content-model";
import { useClipPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";
import { shuffled } from "@/lib/shuffle";

import { REVEAL_DELAY_MS, type ExerciseProps } from "./types";

type Side = "picture" | "word";

// Match each picture to its word. Two columns; tap one from each. A correct
// pair locks in (green); a mismatch bounces both back gently — no penalty.
export function MatchPairs({ exercise, host, onDone }: ExerciseProps) {
  const { direction } = useDirection();
  const items = useMemo(() => buildMatchPairs(exercise, direction), [exercise, direction]);

  const pictureOrder = useMemo(() => shuffled(items), [items]);
  const wordOrder = useMemo(() => shuffled(items), [items]);

  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [pick, setPick] = useState<{ side: Side; id: string } | null>(null);
  const [wrong, setWrong] = useState<{ picture?: string; word?: string }>({});

  const allMatched = matched.size === items.length;

  useEffect(() => {
    if (!allMatched) return;
    const timer = setTimeout(onDone, REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatched]);

  function select(side: Side, id: string) {
    if (matched.has(id)) return;
    if (!pick) {
      setPick({ side, id });
      return;
    }
    if (pick.side === side) {
      // Re-picking the same column just moves the selection.
      setPick({ side, id });
      return;
    }
    if (pick.id === id) {
      // Same concept picked from both columns -> a match.
      setMatched((prev) => new Set(prev).add(id));
      setPick(null);
    } else {
      // Gentle mismatch: flash both, then clear.
      const pictureId = side === "picture" ? id : pick.id;
      const wordId = side === "word" ? id : pick.id;
      setWrong({ picture: pictureId, word: wordId });
      setPick(null);
      setTimeout(() => setWrong({}), 500);
    }
  }

  return (
    <View style={styles.container}>
      <CharacterBubble
        character={host}
        text={direction.known === "bg" ? "Свържи картинката с думата." : "Match each picture to its word."}
      />

      <View style={styles.columns}>
        <View style={styles.column}>
          {pictureOrder.map((item) => (
            <PictureCell
              key={item.id}
              item={item}
              done={matched.has(item.id)}
              selected={pick?.side === "picture" && pick.id === item.id}
              wrong={wrong.picture === item.id}
              onPress={() => select("picture", item.id)}
            />
          ))}
        </View>

        <View style={styles.column}>
          {wordOrder.map((item) => (
            <WordCell
              key={item.id}
              label={item.word}
              done={matched.has(item.id)}
              selected={pick?.side === "word" && pick.id === item.id}
              wrong={wrong.word === item.id}
              onPress={() => select("word", item.id)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function PictureCell({
  item,
  done,
  selected,
  wrong,
  onPress,
}: {
  item: ReturnType<typeof buildMatchPairs>[number];
  done: boolean;
  selected: boolean;
  wrong: boolean;
  onPress: () => void;
}) {
  const { play } = useClipPlayer(item.audio);
  return (
    <Pressable
      onPress={() => {
        play();
        onPress();
      }}
      disabled={done}
      accessibilityRole="button"
      accessibilityLabel={item.gloss}
      style={({ pressed }) => [
        styles.cell,
        selected && styles.cellSelected,
        done && styles.cellDone,
        wrong && styles.cellWrong,
        pressed && !done && styles.pressed,
      ]}
    >
      <Text style={styles.cellEmoji}>{item.emoji}</Text>
    </Pressable>
  );
}

function WordCell({
  label,
  done,
  selected,
  wrong,
  onPress,
}: {
  label: string;
  done: boolean;
  selected: boolean;
  wrong: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={done}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.cell,
        selected && styles.cellSelected,
        done && styles.cellDone,
        wrong && styles.cellWrong,
        pressed && !done && styles.pressed,
      ]}
    >
      <Text style={styles.cellWord}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.lg,
  },
  columns: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.lg,
    justifyContent: "center",
  },
  column: {
    flex: 1,
    gap: Spacing.md,
    justifyContent: "center",
  },
  cell: {
    minHeight: TouchTarget.min,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    borderWidth: 3,
    borderColor: Colors.darkRed,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
  },
  cellSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.tintGold,
  },
  cellDone: {
    borderColor: Colors.correct,
    backgroundColor: Colors.tintGreen,
    opacity: 0.7,
  },
  cellWrong: {
    borderColor: Colors.textMuted,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  cellEmoji: {
    fontSize: FontSizes.huge,
  },
  cellWord: {
    fontSize: FontSizes.label,
    fontWeight: "700",
    color: Colors.text,
  },
});

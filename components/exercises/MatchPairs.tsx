import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CharacterBubble } from "@/components/CharacterBubble";
import { Pop } from "@/components/Pop";
import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";
import { buildMatchPairs } from "@/content/content-model";
import { useClipPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";
import { useSfx } from "@/lib/sfx";
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
  const [justMatched, setJustMatched] = useState<string | null>(null);
  const sfx = useSfx();
  // Track the mismatch-clear timer so a second mismatch doesn't cut the first's
  // flash short, and so it never fires after unmount.
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allMatched = matched.size === items.length;

  useEffect(() => {
    if (!allMatched) return;
    const timer = setTimeout(onDone, REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatched]);

  useEffect(() => () => {
    if (wrongTimer.current) clearTimeout(wrongTimer.current);
  }, []);

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
      const next = new Set(matched).add(id);
      setMatched(next);
      setJustMatched(id);
      setPick(null);
      // A brighter chime when the last pair lands, a little pop otherwise.
      sfx.play(next.size === items.length ? "success" : "pop");
    } else {
      // Gentle mismatch: flash both, then clear.
      const pictureId = side === "picture" ? id : pick.id;
      const wordId = side === "word" ? id : pick.id;
      setWrong({ picture: pictureId, word: wordId });
      setPick(null);
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setWrong({}), 500);
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
              win={justMatched === item.id}
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
              win={justMatched === item.id}
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
  win,
  onPress,
}: {
  item: ReturnType<typeof buildMatchPairs>[number];
  done: boolean;
  selected: boolean;
  wrong: boolean;
  win: boolean;
  onPress: () => void;
}) {
  const { play } = useClipPlayer(item.audio);
  return (
    <Pop pop={win}>
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
    </Pop>
  );
}

function WordCell({
  label,
  done,
  selected,
  wrong,
  win,
  onPress,
}: {
  label: string;
  done: boolean;
  selected: boolean;
  wrong: boolean;
  win: boolean;
  onPress: () => void;
}) {
  return (
    <Pop pop={win}>
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
    </Pop>
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

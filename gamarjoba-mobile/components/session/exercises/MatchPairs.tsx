/* match_pairs — two columns: Georgian words left, English right. Tapping a
 * Georgian card speaks it; a matched pair locks with a ✓ and a soft note;
 * a mismatch just shakes and deselects — try again, no failure state.
 * The exercise always ends correct (firstTry = zero mismatches). */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTarget, radii, shadow, spacing, type } from "../../../constants/theme";
import type { VocabItem } from "../../../content/types";
import { announce, useReducedMotion } from "../../../lib/announce";
import { playWord } from "../../../lib/audio";
import { match } from "../../../lib/sfx";
import { shuffle, type Exercise, type ExerciseResult } from "../../../lib/exercise-engine";
import InstructionLine from "../../ui/InstructionLine";
import KaText from "../../ui/KaText";

export type MatchPairsExercise = Extract<Exercise, { type: "match_pairs" }>;

export interface MatchPairsProps {
  ex: MatchPairsExercise;
  onResult: (r: ExerciseResult) => void;
}

interface PairButtonProps {
  word: VocabItem;
  isKa: boolean;
  selected: boolean;
  locked: boolean;
  /** Increment to shake (a mismatch). */
  shakeN: number;
  onPress: () => void;
}

function PairButton({
  word,
  isKa,
  selected,
  locked,
  shakeN,
  onPress,
}: PairButtonProps): React.ReactElement {
  const [x] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!shakeN || reduced) return;
    Animated.sequence(
      [8, -8, 6, -6, 0].map((v) =>
        Animated.timing(x, { toValue: v, duration: 70, useNativeDriver: true })
      )
    ).start();
  }, [shakeN, reduced, x]);

  return (
    <Animated.View style={{ transform: [{ translateX: x }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isKa ? `${word.ka} (${word.translit})` : word.en}
        accessibilityState={{ selected, disabled: locked }}
        disabled={locked}
        onPress={onPress}
        style={({ pressed }) => [
          styles.pairBtn,
          selected && styles.selected,
          locked && styles.locked,
          pressed && !locked && styles.pressed,
        ]}
      >
        {isKa ? (
          <KaText text={word.ka} size={type.body} />
        ) : (
          <Text style={styles.en}>{word.en}</Text>
        )}
        {locked ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✓</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export function MatchPairs({ ex, onResult }: MatchPairsProps): React.ReactElement {
  const words = ex.words;
  const left = useMemo(() => shuffle(words), [words]);
  const right = useMemo(() => shuffle(words), [words]);

  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [selLeft, setSelLeft] = useState<string | null>(null);
  const [selRight, setSelRight] = useState<string | null>(null);
  const [shakes, setShakes] = useState<Record<string, number>>({});
  const mistakes = useRef(0);
  const finished = useRef(false);
  const deselectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (deselectTimer.current) clearTimeout(deselectTimer.current);
    },
    []
  );

  const check = (l: string, r: string): void => {
    if (l === r) {
      const locked = [...lockedIds, l];
      setLockedIds(locked);
      setSelLeft(null);
      setSelRight(null);
      match();
      const w = words.find((x) => x.id === l);
      if (w) announce(`Matched: ${w.ka} — ${w.en}`);
      if (locked.length === words.length && !finished.current) {
        finished.current = true;
        onResult({
          correct: true,
          firstTry: mistakes.current === 0,
          announce: "All pairs matched!",
        });
      }
    } else {
      mistakes.current++;
      setShakes((s) => ({ ...s, [`L${l}`]: (s[`L${l}`] ?? 0) + 1, [`R${r}`]: (s[`R${r}`] ?? 0) + 1 }));
      announce("Not a pair — try again!");
      deselectTimer.current = setTimeout(() => {
        setSelLeft(null);
        setSelRight(null);
      }, 360);
    }
  };

  const tap = (word: VocabItem, isKa: boolean): void => {
    if (finished.current || lockedIds.includes(word.id)) return;
    if (isKa) {
      if (selLeft === word.id) {
        setSelLeft(null);
        return;
      }
      setSelLeft(word.id);
      playWord(word).catch(() => {});
      if (selRight) check(word.id, selRight);
    } else {
      if (selRight === word.id) {
        setSelRight(null);
        return;
      }
      setSelRight(word.id);
      if (selLeft) check(selLeft, word.id);
    }
  };

  return (
    <View style={styles.wrap}>
      <InstructionLine text="Match the pairs" />
      <View style={styles.grid}>
        <View style={styles.col}>
          {left.map((w) => (
            <PairButton
              key={w.id}
              word={w}
              isKa
              selected={selLeft === w.id}
              locked={lockedIds.includes(w.id)}
              shakeN={shakes[`L${w.id}`] ?? 0}
              onPress={() => tap(w, true)}
            />
          ))}
        </View>
        <View style={styles.col}>
          {right.map((w) => (
            <PairButton
              key={w.id}
              word={w}
              isKa={false}
              selected={selRight === w.id}
              locked={lockedIds.includes(w.id)}
              shakeN={shakes[`R${w.id}`] ?? 0}
              onPress={() => tap(w, false)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  grid: {
    flexDirection: "row",
    gap: spacing.md,
  },
  col: {
    flex: 1,
    gap: spacing.sm,
  },
  pairBtn: {
    minHeight: minTarget + 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...shadow,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  selected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentTint,
  },
  locked: {
    backgroundColor: colors.successTint,
    borderColor: colors.success,
  },
  en: {
    fontSize: type.body - 1,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: "800",
  },
});

export default MatchPairs;

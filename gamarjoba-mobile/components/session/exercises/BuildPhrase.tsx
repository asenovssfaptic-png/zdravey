/* build_phrase — build_word with whole-word tiles: put the words of a
 * phrase in order. Exactly ONE distractor token comes from another phrase
 * in the pool. A wrong tile shakes the waiting slot; two slips reveal a
 * "Show me" hint. Always ends correct — firstTry = no slips, no hint. */

import React, { useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTarget, radii, shadow, spacing, type } from "../../../constants/theme";
import { announce, useReducedMotion } from "../../../lib/announce";
import { shuffle, type Exercise, type ExerciseResult } from "../../../lib/exercise-engine";
import AudioButton from "../../ui/AudioButton";
import EmojiIcon from "../../ui/EmojiIcon";
import InstructionLine from "../../ui/InstructionLine";
import KaText from "../../ui/KaText";

export type BuildPhraseExercise = Extract<Exercise, { type: "build_phrase" }>;

export interface BuildPhraseProps {
  ex: BuildPhraseExercise;
  onResult: (r: ExerciseResult) => void;
}

export function BuildPhrase({ ex, onResult }: BuildPhraseProps): React.ReactElement {
  const word = ex.word;
  const parts = useMemo(() => String(word.ka).split(" "), [word]);

  // one distractor word taken from another phrase in the pool
  const tiles = useMemo(() => {
    const inTarget = new Set(parts);
    const candTokens: string[] = [];
    (ex.pool ?? []).forEach((p) => {
      if (p.id === word.id) return;
      String(p.ka)
        .split(" ")
        .forEach((tok) => {
          if (tok && !inTarget.has(tok)) candTokens.push(tok);
        });
    });
    const extras = candTokens.length ? [shuffle(candTokens)[0]] : [];
    return shuffle([...parts, ...extras]);
  }, [ex, parts, word]);

  const [placed, setPlaced] = useState(0);
  const [used, setUsed] = useState<boolean[]>(() => tiles.map(() => false));
  const [showHint, setShowHint] = useState(false);
  const [done, setDone] = useState(false);
  const misplacements = useRef(0);
  const usedHint = useRef(false);

  const [slotShake] = useState(() => new Animated.Value(0));
  const [slotsPop] = useState(() => new Animated.Value(1));
  const reduced = useReducedMotion();

  const shakeSlot = (): void => {
    if (reduced) return;
    Animated.sequence(
      [8, -8, 6, -6, 0].map((v) =>
        Animated.timing(slotShake, { toValue: v, duration: 70, useNativeDriver: true })
      )
    ).start();
  };

  const place = (tileIdx: number): void => {
    setUsed((u) => {
      const next = u.slice();
      next[tileIdx] = true;
      return next;
    });
    const nextPlaced = placed + 1;
    setPlaced(nextPlaced);
    if (nextPlaced === parts.length && !done) {
      setDone(true);
      if (!reduced) {
        Animated.sequence([
          Animated.timing(slotsPop, { toValue: 1.08, duration: 120, useNativeDriver: true }),
          Animated.timing(slotsPop, { toValue: 1, duration: 160, useNativeDriver: true }),
        ]).start();
      }
      onResult({
        correct: true,
        firstTry: misplacements.current === 0 && !usedHint.current,
        announce: `You built it! ${word.ka} — ${word.en}`,
      });
    }
  };

  const tapTile = (i: number): void => {
    if (done || used[i]) return;
    if (tiles[i] === parts[placed]) {
      place(i);
    } else {
      misplacements.current++;
      shakeSlot();
      announce("Not that one — try another word!");
      if (misplacements.current >= 2) setShowHint(true);
    }
  };

  const hint = (): void => {
    if (done) return;
    usedHint.current = true;
    const need = parts[placed];
    for (let i = 0; i < tiles.length; i++) {
      if (!used[i] && tiles[i] === need) {
        place(i);
        return;
      }
    }
  };

  return (
    <View style={styles.wrap}>
      <InstructionLine text="Put the words in order" />
      <View style={styles.prompt}>
        <EmojiIcon emoji={word.emoji} label={word.en} size={40} />
        <Text style={styles.promptEn}>{word.en}</Text>
        <AudioButton audioId={word.id} label="Hear it" />
      </View>
      <Text style={styles.translit}>{word.translit}</Text>

      <Animated.View
        style={[styles.slots, { transform: [{ scale: slotsPop }] }]}
        accessibilityLabel="Phrase slots"
      >
        {parts.map((tok, i) => {
          const isCurrent = i === placed && !done;
          const slot = (
            <View key={i} style={[styles.slot, i < placed && styles.slotFilled]}>
              {i < placed ? <KaText text={tok} size={type.body} /> : null}
            </View>
          );
          return isCurrent ? (
            <Animated.View key={i} style={{ transform: [{ translateX: slotShake }] }}>
              {slot}
            </Animated.View>
          ) : (
            slot
          );
        })}
      </Animated.View>

      <View style={styles.tiles}>
        {tiles.map((tok, i) => (
          <Pressable
            key={`${tok}-${i}`}
            accessibilityRole="button"
            accessibilityLabel={`Word ${tok}`}
            accessibilityState={{ disabled: used[i] || done }}
            disabled={used[i] || done}
            onPress={() => tapTile(i)}
            style={({ pressed }) => [
              styles.wordTile,
              used[i] && styles.wordTileUsed,
              pressed && !used[i] && styles.pressed,
            ]}
          >
            <KaText text={tok} size={type.body} />
          </Pressable>
        ))}
      </View>

      {showHint && !done ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show me the next word"
          onPress={hint}
          style={({ pressed }) => [styles.hintBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.hintText}>Show me</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  prompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  promptEn: {
    fontSize: type.h2,
    fontWeight: type.h2Weight,
    color: colors.ink,
  },
  translit: {
    fontSize: type.body,
    color: colors.inkSoft,
    textAlign: "center",
  },
  slots: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  slot: {
    minWidth: 84,
    height: minTarget + 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  slotFilled: {
    borderStyle: "solid",
    borderColor: colors.success,
    backgroundColor: colors.successTint,
  },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
  },
  wordTile: {
    minHeight: minTarget + 8,
    minWidth: minTarget,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.md,
    ...shadow,
  },
  wordTileUsed: {
    opacity: 0.45,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  hintBtn: {
    minHeight: minTarget,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  hintText: {
    fontSize: type.body,
    fontWeight: "700",
    color: colors.accentDeep,
  },
});

export default BuildPhrase;

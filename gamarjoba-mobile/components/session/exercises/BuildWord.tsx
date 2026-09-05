/* build_word AND build_syllable — spell the word from letter tiles.
 * Slots fill left-to-right; a wrong tile just shakes the waiting slot
 * (never a failure state); after two slips a "Show me" hint appears that
 * places the next letter. Completing always succeeds — firstTry means no
 * slips and no hint. Syllables (no meaning) get "Build what you hear"
 * plus the clip on mount. */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTarget, radii, spacing, type } from "../../../constants/theme";
import { announce, useReducedMotion } from "../../../lib/announce";
import { playWord } from "../../../lib/audio";
import { ALL_LETTERS, shuffle, type Exercise, type ExerciseResult } from "../../../lib/exercise-engine";
import AudioButton from "../../ui/AudioButton";
import EmojiIcon from "../../ui/EmojiIcon";
import InstructionLine from "../../ui/InstructionLine";
import KaText from "../../ui/KaText";
import Tile from "../../ui/Tile";

export type BuildExercise = Extract<Exercise, { type: "build_word" | "build_syllable" }>;

export interface BuildWordProps {
  ex: BuildExercise;
  onResult: (r: ExerciseResult) => void;
}

export function BuildWord({ ex, onResult }: BuildWordProps): React.ReactElement {
  const word = ex.word;
  const letters = useMemo(() => String(word.ka).split(""), [word]);
  const hasMeaning = "emoji" in word && !!word.emoji;
  const instText = hasMeaning ? "Build the word" : "Build what you hear";

  // 2 distractor letters not present in the word — drawn from ex.letterPool
  // when given (letters learned so far), so tiles never show unmet letters
  const tiles = useMemo(() => {
    const inWord = new Set(letters);
    const src = ex.letterPool?.length ? ex.letterPool : ALL_LETTERS;
    const extras = shuffle(src.filter((l) => !inWord.has(l.ka)))
      .slice(0, 2)
      .map((l) => l.ka);
    return shuffle([...letters, ...extras]);
  }, [ex, letters]);

  const [placed, setPlaced] = useState(0);
  const [used, setUsed] = useState<boolean[]>(() => tiles.map(() => false));
  const [showHint, setShowHint] = useState(false);
  const [done, setDone] = useState(false);
  const misplacements = useRef(0);
  const usedHint = useRef(false);

  const [slotShake] = useState(() => new Animated.Value(0));
  const [slotsPop] = useState(() => new Animated.Value(1));
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!hasMeaning) playWord(word).catch(() => {}); // say the syllable straight away
  }, [hasMeaning, word]);

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
    if (nextPlaced === letters.length && !done) {
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
        announce: `You built it! ${word.ka}${"en" in word && word.en ? ` — ${word.en}` : ""}`,
      });
    }
  };

  const tapTile = (i: number): void => {
    if (done || used[i]) return;
    if (tiles[i] === letters[placed]) {
      place(i);
    } else {
      misplacements.current++;
      shakeSlot();
      announce("Not that one — try another letter!");
      if (misplacements.current >= 2) setShowHint(true);
    }
  };

  const hint = (): void => {
    if (done) return;
    usedHint.current = true;
    const need = letters[placed];
    for (let i = 0; i < tiles.length; i++) {
      if (!used[i] && tiles[i] === need) {
        place(i);
        return;
      }
    }
  };

  return (
    <View style={styles.wrap}>
      <InstructionLine text={instText} />
      <View style={styles.prompt}>
        {hasMeaning && "en" in word ? (
          <>
            <EmojiIcon emoji={word.emoji} label={word.en} size={44} />
            <Text style={styles.promptEn}>{word.en}</Text>
          </>
        ) : null}
        <AudioButton audioId={word.id} label="Hear it" />
      </View>
      <Text style={styles.translit}>{word.translit}</Text>

      <Animated.View
        style={[styles.slots, { transform: [{ scale: slotsPop }] }]}
        accessibilityLabel="Word slots"
      >
        {letters.map((ch, i) => {
          const isCurrent = i === placed && !done;
          const slot = (
            <View key={i} style={[styles.slot, i < placed && styles.slotFilled]}>
              {i < placed ? <KaText text={ch} size={type.h2} /> : null}
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
        {tiles.map((ch, i) => (
          <Tile
            key={`${ch}-${i}`}
            ka={ch}
            size={64}
            accessibilityLabel={`Letter ${ch}`}
            onPress={() => tapTile(i)}
            disabled={used[i] || done}
            status={used[i] ? "dim" : "idle"}
          />
        ))}
      </View>

      {showHint && !done ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show me the next letter"
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
    justifyContent: "center",
    gap: spacing.sm,
  },
  slot: {
    width: 52,
    height: 60,
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

export default BuildWord;

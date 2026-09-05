/* MeetDeck — "Meet the letters": one card per letter with the big glyph
 * (tap to hear), name/translit, IPA and the example word. Port of the web
 * renderMeet deck: swipe left/right (dx > 40 and |dx| > |dy|), prev/next
 * arrows, counter, the letter auto-plays as each card appears, and the
 * last card's Finish hands off to the owning screen (rewards live there).
 * Never judged — just meeting friends. */

import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTarget, radii, shadow, spacing, type } from "../../constants/theme";
import type { AlphabetGroup } from "../../content/types";
import { announce, useReducedMotion, useToast } from "../../lib/announce";
import { exampleAudioId, letterAudioId, playLetter } from "../../lib/audio";
import { recordLetterOpened } from "../../lib/rewards";
import AudioButton from "../ui/AudioButton";
import EmojiIcon from "../ui/EmojiIcon";
import KaText from "../ui/KaText";
import { vocabMatchFor } from "./LetterModal";

export interface MeetDeckProps {
  group: AlphabetGroup;
  /** finish → +15/5 XP, praise, toast, back (owner implements). */
  onFinish: () => void;
}

export function MeetDeck({ group, onFinish }: MeetDeckProps): React.ReactElement {
  const [current, setCurrent] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const { toast } = useToast();
  const reduced = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(1));

  const letter = group.letters[Math.max(0, Math.min(current, group.letters.length - 1))];
  const ex = letter.example;
  const vocabMatch = vocabMatchFor(ex.ka);
  const isLast = current === group.letters.length - 1;

  // per-card entry: badge bookkeeping, announce, auto letter audio, ready pulse
  useEffect(() => {
    const badge = recordLetterOpened(letter.ka);
    if (badge) toast(`New badge: ${badge.name}! 🎉`);
    announce(
      `Letter ${letter.name}, ${letter.translit}. Card ${current + 1} of ${group.letters.length}`
    );
    playLetter(letter).catch(() => {});
    if (!reduced) {
      pulse.setValue(1);
      // after the card has had a beat, the forward control does a small
      // "ready" pulse — an invitation, never a lock
      const t = setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1.12, duration: 450, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }),
          ]),
          { iterations: 3 }
        ).start();
      }, 1200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const goPrev = () => {
    if (current > 0) setCurrent(current - 1);
  };
  const goNext = () => {
    if (current < group.letters.length - 1) setCurrent(current + 1);
  };

  return (
    <View style={styles.deckArea}>
      <View
        style={styles.card}
        onTouchStart={(e) => {
          touchStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        }}
        onTouchEnd={(e) => {
          const s = touchStart.current;
          touchStart.current = null;
          if (!s) return;
          const dx = e.nativeEvent.pageX - s.x;
          const dy = e.nativeEvent.pageY - s.y;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) goPrev();
            else goNext();
          }
        }}
      >
        <View style={styles.glyphRow}>
          <KaText text={letter.ka} size={64} speak audioId={letterAudioId(letter)} />
          <AudioButton audioId={letterAudioId(letter)} label="Hear the letter" />
        </View>
        <Text style={styles.name}>
          {letter.name} · {letter.translit}
        </Text>
        <Text style={styles.ipa}>sound: /{letter.ipa}/</Text>

        <View style={styles.exampleRow}>
          {vocabMatch ? <EmojiIcon emoji={vocabMatch.emoji} label={ex.en} size={40} /> : null}
          <KaText text={ex.ka} size={24} speak audioId={exampleAudioId(ex.ka, vocabMatch)} />
          <AudioButton
            audioId={exampleAudioId(ex.ka, vocabMatch)}
            label="Hear the example word"
            small
          />
        </View>
        <Text style={styles.exampleEn}>
          {ex.translit} — {ex.en}
        </Text>
      </View>

      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous letter"
          accessibilityState={{ disabled: current === 0 }}
          disabled={current === 0}
          onPress={goPrev}
          style={[styles.arrow, current === 0 && styles.arrowDisabled]}
        >
          <Text style={styles.arrowText} accessibilityElementsHidden>
            ←
          </Text>
        </Pressable>
        <Text
          style={styles.counter}
          accessibilityLabel={`Card ${current + 1} of ${group.letters.length}`}
        >
          {current + 1} / {group.letters.length}
        </Text>
        {isLast ? (
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Finish meeting these letters"
              onPress={onFinish}
              style={({ pressed }) => [styles.finishBtn, pressed && styles.finishPressed]}
            >
              <Text style={styles.finishText}>Finish ✓</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next letter"
              onPress={goNext}
              style={styles.arrow}
            >
              <Text style={styles.arrowText} accessibilityElementsHidden>
                →
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deckArea: {
    gap: spacing.lg,
    alignItems: "stretch",
  },
  card: {
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadow,
  },
  glyphRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  name: {
    fontSize: type.h2,
    fontWeight: type.h2Weight,
    color: colors.ink,
  },
  ipa: {
    fontSize: type.body - 3,
    color: colors.inkSoft,
  },
  exampleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  exampleEn: {
    fontSize: type.body - 1,
    color: colors.inkSoft,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  arrow: {
    width: minTarget + 8,
    height: minTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  arrowDisabled: {
    opacity: 0.35,
  },
  arrowText: {
    fontSize: 22,
    color: colors.ink,
  },
  counter: {
    fontSize: type.body - 2,
    color: colors.inkSoft,
    fontWeight: "600",
  },
  finishBtn: {
    minHeight: minTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
  },
  finishPressed: {
    backgroundColor: colors.accentDeep,
  },
  finishText: {
    fontSize: type.body,
    fontWeight: "800",
    color: colors.white,
  },
});

export default MeetDeck;

/* CardsDeck — the ONE card deck for unit word cards (mode "vocab") and
 * reading word cards (mode "reading"). Port of the web renderCardsDeck:
 *   · swipe left/right (dx > 40 and |dx| > |dy|) + prev/next arrows + counter
 *   · vocab mode: meaning always visible, the word auto-plays as you meet it
 *   · reading mode: per-letter tap buttons, Sound-it-out, Show-hint
 *   · Finish → markDone() (+15 XP first time, +5 after) + praise + keep-toast
 *     + back — always completable, never judged.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { colors, minTarget, radii, shadow, spacing, type } from "../constants/theme";
import type { Syllable, VocabItem } from "../content/types";
import { CURRICULUM } from "../content/generated/curriculum";
import { announce, useReducedMotion, useToast } from "../lib/announce";
import { playId, playWord, soundOut, stopAll, type SoundOutHandle } from "../lib/audio";
import { LETTER_BY_KA } from "../lib/exercise-engine";
import { addXp } from "../lib/store";
import { playPraise } from "../lib/audio";
import AudioButton from "./ui/AudioButton";
import EmojiIcon from "./ui/EmojiIcon";
import KaText from "./ui/KaText";

export interface CardsDeckProps {
  items: (VocabItem | Syllable)[];
  mode: "vocab" | "reading";
  /** Record completion; return true the FIRST time (drives the XP size). */
  markDone: () => boolean;
  /** Where Finish navigates back to. */
  backHref: string;
  doneToast?: string;
}

function isMkhedruli(ch: string): boolean {
  return ch >= "ა" && ch <= "ჿ";
}

export function CardsDeck({
  items,
  mode,
  markDone,
  backHref,
  doneToast,
}: CardsDeckProps): React.ReactElement {
  const [current, setCurrent] = useState(0);
  // per-card derived state — keyed by card index so changing cards resets
  // hint/highlight without any effect-driven setState
  const [hintCard, setHintCard] = useState(-1);
  const [lit, setLit] = useState<{ card: number; index: number | null }>({
    card: -1,
    index: null,
  });
  const soundHandle = useRef<SoundOutHandle | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const { toast } = useToast();
  const reduced = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(1));

  const item = items[current];
  const en = "en" in item ? item.en : "";
  const emoji = "emoji" in item ? item.emoji : "🔤";
  const chars = String(item.ka).split("");
  const allGeorgian = chars.every(isMkhedruli);
  const hintShown = hintCard === current;
  const litIndex = lit.card === current ? lit.index : null;

  const cancelSound = useCallback(() => {
    soundHandle.current?.cancel();
    soundHandle.current = null;
  }, []);

  // per-card entry: announce, auto-play (vocab), ready pulse
  useEffect(() => {
    announce(
      `Card ${current + 1} of ${items.length}: ${item.translit}` +
        (mode === "vocab" && en ? `, ${en}` : "")
    );
    if (mode === "vocab") playWord(item).catch(() => {}); // hear every word as you meet it
    // ready pulse on the forward control after a beat — an invitation, never a lock
    if (!reduced) {
      pulse.setValue(1);
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

  useEffect(() => () => cancelSound(), [cancelSound]);

  const goPrev = () => {
    cancelSound();
    if (current > 0) setCurrent(current - 1);
  };
  const goNext = () => {
    cancelSound();
    if (current < items.length - 1) setCurrent(current + 1);
  };

  const finish = () => {
    cancelSound();
    stopAll();
    const first = markDone();
    addXp(first ? 15 : 5);
    playPraise();
    toast(doneToast ?? "Cards done! 🎉", { keep: true });
    if (router.canGoBack()) router.back();
    else router.replace(backHref as never);
  };

  const isLast = current === items.length - 1;

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
        <EmojiIcon emoji={emoji} label={en || "syllable"} size={56} />

        {/* the word — reading mode gets per-letter tap buttons */}
        {mode === "reading" ? (
          <View style={styles.wordRow}>
            {chars.map((ch, i) =>
              isMkhedruli(ch) ? (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={
                    "Letter " +
                    (LETTER_BY_KA[ch]
                      ? `${LETTER_BY_KA[ch].name}, ${LETTER_BY_KA[ch].translit}`
                      : ch)
                  }
                  onPress={() => {
                    cancelSound();
                    setLit({ card: current, index: i });
                    playId(CURRICULUM.audioIds.letters[ch] ?? null).catch(() => {});
                  }}
                  style={[styles.readLetter, litIndex === i && styles.lit]}
                >
                  <KaText text={ch} size={26} />
                </Pressable>
              ) : (
                <Text key={i} style={styles.sep} accessibilityElementsHidden>
                  {ch}
                </Text>
              )
            )}
          </View>
        ) : (
          <KaText text={item.ka} size={30} speak audioId={item.id} />
        )}

        {/* audio row */}
        <View style={styles.audioRow}>
          {mode === "reading" && allGeorgian ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sound it out, letter by letter"
              onPress={() => {
                cancelSound();
                const card = current;
                soundHandle.current = soundOut(item, (i) => {
                  setLit({ card, index: i >= 0 ? i : null });
                });
              }}
              style={styles.soundBtn}
            >
              <Text style={styles.soundBtnText}>🔍 Sound it out</Text>
            </Pressable>
          ) : null}
          <AudioButton audioId={item.id} label="Hear the whole word" />
        </View>

        {/* meaning: vocab always shows it; reading hides it behind a hint */}
        {mode === "vocab" ? (
          <Text style={styles.meaning}>
            {item.translit}
            {en ? ` — ${en}` : ""}
          </Text>
        ) : hintShown ? (
          <Text style={styles.meaning}>
            {item.translit}
            {en ? ` — ${en}` : ""}
          </Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show hint"
            onPress={() => setHintCard(current)}
            style={styles.hintBtn}
          >
            <Text style={styles.hintBtnText}>Show hint</Text>
          </Pressable>
        )}
      </View>

      {/* nav */}
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous card"
          accessibilityState={{ disabled: current === 0 }}
          disabled={current === 0}
          onPress={goPrev}
          style={[styles.arrow, current === 0 && styles.arrowDisabled]}
        >
          <Text style={styles.arrowText}>←</Text>
        </Pressable>
        <Text style={styles.counter} accessibilityLabel={`Card ${current + 1} of ${items.length}`}>
          {current + 1} / {items.length}
        </Text>
        {isLast ? (
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Finish the cards"
              onPress={finish}
              style={styles.finishBtn}
            >
              <Text style={styles.finishText}>Finish ✓</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next card"
              onPress={goNext}
              style={styles.arrow}
            >
              <Text style={styles.arrowText}>→</Text>
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
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadow,
  },
  wordRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.xs,
  },
  readLetter: {
    minWidth: minTarget,
    minHeight: minTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  lit: {
    backgroundColor: colors.accentTint,
    borderColor: colors.accent,
  },
  sep: {
    fontSize: 26,
    color: colors.inkSoft,
    alignSelf: "center",
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  soundBtn: {
    minHeight: minTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  soundBtnText: {
    fontSize: type.body - 1,
    fontWeight: "700",
    color: colors.ink,
  },
  meaning: {
    fontSize: type.body,
    color: colors.inkSoft,
    textAlign: "center",
  },
  hintBtn: {
    minHeight: minTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  hintBtnText: {
    fontSize: type.body - 1,
    fontWeight: "700",
    color: colors.accentDeep,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  arrow: {
    width: minTarget + 8,
    height: minTarget + 8,
    borderRadius: (minTarget + 8) / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  arrowDisabled: {
    opacity: 0.35,
  },
  arrowText: {
    fontSize: 24,
    color: colors.ink,
  },
  counter: {
    fontSize: type.body - 2,
    color: colors.inkSoft,
    fontWeight: "600",
  },
  finishBtn: {
    minHeight: minTarget + 8,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
  },
  finishText: {
    color: colors.surface,
    fontSize: type.body,
    fontWeight: "800",
  },
});

export default CardsDeck;

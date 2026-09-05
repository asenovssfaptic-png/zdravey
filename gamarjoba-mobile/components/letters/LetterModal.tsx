/* LetterModal — one letter's card: big glyph (tap to hear), name/translit,
 * IPA, example word with picture + audio, "Hear it" chain (letter → example),
 * prev/next through all 33 letters. Port of the web openLetterDialog.
 * Native a11y replaces the web focus trap: accessibilityViewIsModal +
 * announceForAccessibility on navigation. */

import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTarget, radii, shadow, spacing, type } from "../../constants/theme";
import type { Letter, VocabItem } from "../../content/types";
import { announce, useToast } from "../../lib/announce";
import { exampleAudioId, letterAudioId, playExample, playLetter } from "../../lib/audio";
import { ALL_LETTERS, ALL_WORDS } from "../../lib/exercise-engine";
import { recordLetterOpened } from "../../lib/rewards";
import AudioButton from "../ui/AudioButton";
import EmojiIcon from "../ui/EmojiIcon";
import KaText from "../ui/KaText";

/** The vocab item whose Georgian word matches a letter's example (for its
 * emoji + reusing its audio clip) — web vocabEmojiFor. */
export function vocabMatchFor(exampleKa: string): VocabItem | null {
  return ALL_WORDS.find((w) => w.ka === exampleKa) ?? null;
}

export interface LetterModalProps {
  /** index into the flat 33-letter list. */
  index: number;
  visible: boolean;
  onClose: () => void;
}

export function LetterModal({ index, visible, onClose }: LetterModalProps): React.ReactElement {
  // seeded from the tapped tile; the owner remounts (key) per opening
  const [current, setCurrent] = useState(index);
  const openRef = useRef(visible);
  const { toast } = useToast();

  useEffect(() => {
    openRef.current = visible;
    return () => {
      openRef.current = false; // unmounted — the example chain stays quiet
    };
  }, [visible]);

  const safe = Math.max(0, Math.min(current, ALL_LETTERS.length - 1));
  const letter: Letter = ALL_LETTERS[safe];

  // every letter shown counts as "opened" (alphabet-explorer badge)
  useEffect(() => {
    if (!visible) return;
    const badge = recordLetterOpened(letter.ka);
    if (badge) toast(`New badge: ${badge.name}! 🎉`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, letter.ka]);

  const ex = letter.example;
  const vocabMatch = vocabMatchFor(ex.ka);

  const go = (dir: -1 | 1) => {
    const next = safe + dir;
    if (next < 0 || next >= ALL_LETTERS.length) return;
    setCurrent(next);
    const L = ALL_LETTERS[next];
    announce(`Letter ${L.name}, ${L.translit}`);
  };

  const hearIt = () => {
    playLetter(letter).catch(() => {});
    setTimeout(() => {
      // modal closed (or moved on) before the example fired? stay quiet
      if (!openRef.current) return;
      playExample(ex.ka, vocabMatch).catch(() => {});
    }, 900);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} accessibilityLabel="Close" onPress={onClose}>
        <Pressable
          style={styles.dialog}
          accessibilityViewIsModal
          accessibilityLabel={`Letter ${letter.name}`}
          onPress={() => {}}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={styles.close}
            hitSlop={8}
          >
            <Text style={styles.closeText} accessibilityElementsHidden>
              ✕
            </Text>
          </Pressable>

          <KaText text={letter.ka} size={64} speak audioId={letterAudioId(letter)} />
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
          <Text style={styles.sayHint}>say it: {letter.translit}</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Hear the letter ${letter.name} and its example word`}
            onPress={hearIt}
            style={({ pressed }) => [styles.hearBtn, pressed && styles.pressedPrimary]}
          >
            <Text style={styles.hearBtnText}>🔊 Hear it</Text>
          </Pressable>

          <View style={styles.nav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous letter"
              accessibilityState={{ disabled: safe === 0 }}
              disabled={safe === 0}
              onPress={() => go(-1)}
              style={[styles.arrow, safe === 0 && styles.arrowDisabled]}
            >
              <Text style={styles.arrowText} accessibilityElementsHidden>
                ←
              </Text>
            </Pressable>
            <Text style={styles.counter} accessibilityLabel={`Letter ${safe + 1} of ${ALL_LETTERS.length}`}>
              {safe + 1} / {ALL_LETTERS.length}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next letter"
              accessibilityState={{ disabled: safe === ALL_LETTERS.length - 1 }}
              disabled={safe === ALL_LETTERS.length - 1}
              onPress={() => go(1)}
              style={[styles.arrow, safe === ALL_LETTERS.length - 1 && styles.arrowDisabled]}
            >
              <Text style={styles.arrowText} accessibilityElementsHidden>
                →
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(43, 35, 32, 0.45)", // ink scrim (modal backdrop only)
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  dialog: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    ...shadow,
  },
  close: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: minTarget,
    height: minTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: minTarget / 2,
    backgroundColor: colors.surfaceAlt,
  },
  closeText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.inkSoft,
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
  sayHint: {
    fontSize: type.body - 2,
    fontStyle: "italic",
    color: colors.accentDeep,
  },
  hearBtn: {
    minHeight: minTarget,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    marginTop: spacing.sm,
  },
  pressedPrimary: {
    backgroundColor: colors.accentDeep,
  },
  hearBtnText: {
    fontSize: type.body,
    fontWeight: "800",
    color: colors.white,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    marginTop: spacing.sm,
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
});

export default LetterModal;

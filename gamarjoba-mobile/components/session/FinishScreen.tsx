/* FinishScreen — celebration at the end of every session. Rewards ONLY:
 * stars fill (never empty out), "+N XP", confetti, "Well done!" then a
 * Georgian praise clip; missed words appear as quiet, judgment-free
 * tap-to-hear chips (a signal for grown-ups, never a grade). Continue
 * goes to the mode's home; Redo restarts with a fresh shuffle. */

import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTarget, radii, shadow, spacing, type } from "../../constants/theme";
import { CURRICULUM } from "../../content/generated/curriculum";
import type { VocabItem } from "../../content/types";
import { announce } from "../../lib/announce";
import { playPraise, playUi } from "../../lib/audio";
import { computeNextStep, type SessionConfig } from "../../lib/exercise-engine";
import type { FinishOutcome } from "../../lib/rewards";
import { useProgress } from "../../lib/store";
import AudioButton from "../ui/AudioButton";
import Borjgali from "../ui/Borjgali";
import Confetti from "../ui/Confetti";
import KaText from "../ui/KaText";
import { StarSlots } from "../ui/StarRow";

const C = CURRICULUM;

export interface FinishScreenProps {
  config: SessionConfig;
  outcome: FinishOutcome;
  /** total per-answer XP earned in the session (bonus already inside outcome). */
  xpEarned: number;
  /** words to gently see again — a signal for grown-ups, never a grade. */
  missed: VocabItem[];
  onContinue: () => void;
  onRedo: () => void;
}

export function FinishScreen({
  config,
  outcome,
  xpEarned,
  missed,
  onContinue,
  onRedo,
}: FinishScreenProps): React.ReactElement {
  const progress = useProgress();
  const mode = config.mode;
  const isPractice = mode === "practice";
  const isReadingPractice = mode === "reading-practice" || mode === "letters-read";
  const isExam = mode === "letters-exam" || mode === "reading-exam" || mode === "unit-exam";
  const totalXp = xpEarned + outcome.xpBonus;
  const alive = useRef(true);

  // celebrate: "Well done!" in the child's known language first, then a
  // Georgian praise clip — and announce the whole outcome politely
  useEffect(() => {
    alive.current = true;
    let tail: string;
    if (isPractice) {
      tail = `Practice complete. You earned a practice star and ${totalXp} XP.`;
    } else if (isReadingPractice) {
      tail = `Reading practice complete. You earned ${totalXp} XP.`;
    } else {
      const what = isExam ? "Exam" : "Lesson";
      tail = `${what} complete. You earned ${outcome.starsEarned}${
        outcome.starsEarned === 1 ? " star" : " stars"
      } and ${totalXp} XP.`;
    }
    announce(`Excellent! ${tail}`);
    const t = setTimeout(() => {
      if (!alive.current) return;
      playUi("Well done!", 2400)
        .then(() => {
          if (alive.current) playPraise();
        })
        .catch(() => {});
    }, 600);
    return () => {
      alive.current = false;
      clearTimeout(t);
    };
    // fire once per finish
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = !isExam && !isReadingPractice ? computeNextStep(progress) : null;
  const teaseWord = next?.lesson ? C.vocab[next.lesson.items[0]] : null;

  let redoLabel = "Redo lesson";
  if (isPractice || isReadingPractice) redoLabel = "Practice again";
  if (isExam) redoLabel = "Redo exam";

  return (
    <View style={styles.wrap}>
      <Confetti trigger={1} />
      <Borjgali size={64} />
      <View style={styles.titleRow}>
        <KaText text={C.strings.excellent} size={type.h2} />
        <Text style={styles.title}> · Excellent!</Text>
      </View>

      <StarSlots
        slotCount={outcome.slotCount}
        filled={outcome.starsEarned}
        label={
          isPractice
            ? "Practice star earned"
            : `${outcome.starsEarned} of 3 stars earned`
        }
      />
      {isPractice ? <Text style={styles.note}>Practice star!</Text> : null}
      {isReadingPractice ? <Text style={styles.note}>Reading practice complete!</Text> : null}

      <Text style={styles.xp}>+{totalXp} XP</Text>

      {missed.length ? (
        <View style={styles.seeAgain}>
          <Text style={styles.note}>Words to see again:</Text>
          <View style={styles.seeAgainRow}>
            {missed.slice(0, 4).map((w) => (
              <View key={w.id} style={styles.chip}>
                <KaText text={w.ka} size={type.body} speak audioId={w.id} />
                <AudioButton
                  audioId={w.id}
                  small
                  label={`Hear ${w.en || w.translit} again`}
                />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {next ? (
        <View style={styles.teaser}>
          <Text style={styles.teaserText}>
            Next up: {next.nodeTitle}
            {next.lesson ? ` · ${next.lesson.title}` : ""} — {next.unit.title}
            {teaseWord ? `. You’ll meet ${teaseWord.emoji} ${teaseWord.en}` : ""}
          </Text>
          {teaseWord ? (
            <AudioButton audioId={teaseWord.id} small label={`Hear ${teaseWord.en}`} />
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue"
          onPress={onContinue}
          style={({ pressed }) => [styles.primary, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.primaryText}>Continue</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={redoLabel}
          onPress={onRedo}
          style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.secondaryText}>{redoLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  title: {
    fontSize: type.h2,
    fontWeight: type.h1Weight,
    color: colors.ink,
  },
  note: {
    fontSize: type.body - 1,
    color: colors.inkSoft,
    textAlign: "center",
  },
  xp: {
    fontSize: type.h2,
    fontWeight: "800",
    color: colors.accentDeep,
  },
  seeAgain: {
    gap: spacing.sm,
    alignItems: "center",
  },
  seeAgainRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  teaser: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  teaserText: {
    fontSize: type.body - 2,
    color: colors.inkSoft,
    textAlign: "center",
    flexShrink: 1,
  },
  actions: {
    alignSelf: "stretch",
    gap: spacing.sm,
  },
  primary: {
    minHeight: minTarget + 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
  },
  primaryText: {
    color: colors.surface,
    fontSize: type.body,
    fontWeight: "800",
  },
  secondary: {
    minHeight: minTarget + 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
  secondaryText: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: "700",
  },
});

export default FinishScreen;

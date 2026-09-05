/* Write it — tracing screen. Port of the web renderTrace:
 * letter identity header + TraceCanvas + Watch-it-draw / Clear / Done.
 * The stroke-order demo auto-plays once per letter per session (a gift,
 * never a gate). Done is ALWAYS enabled — tracing is doing, never judged:
 * every letter ends in praise + confetti, and finishing the group records
 * it append-only with +15/5 XP. */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";

import TraceLetterHeader from "../../../components/letters/TraceLetterHeader";
import WatchDrawButton from "../../../components/letters/WatchDrawButton";
import BackLink from "../../../components/ui/BackLink";
import Confetti from "../../../components/ui/Confetti";
import KaText from "../../../components/ui/KaText";
import Screen from "../../../components/ui/Screen";
import TraceCanvas, { type TraceCanvasHandle } from "../../../components/ui/TraceCanvas";
import { colors, minTarget, radii, spacing, type } from "../../../constants/theme";
import { CURRICULUM } from "../../../content/generated/curriculum";
import { announce, useReducedMotion, useToast } from "../../../lib/announce";
import { playLetter, playPraise, stopAll } from "../../../lib/audio";
import { alphaGroupById } from "../../../lib/exercise-engine";
import { recordTraced } from "../../../lib/rewards";
import { addXp, pushOnce } from "../../../lib/store";

export default function TraceScreen(): React.ReactElement {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const group = alphaGroupById(String(groupId));
  const [idx, setIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [busy, setBusy] = useState(false);
  const canvas = useRef<TraceCanvasHandle>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  const reduced = useReducedMotion();

  const letters = group?.letters ?? [];
  const letter = letters[Math.min(idx, Math.max(0, letters.length - 1))];

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  // letter entry: announce it, hear it (the auto stroke demo is the canvas')
  useEffect(() => {
    if (!letter || finished) return;
    announce(
      `Letter ${idx + 1} of ${letters.length}: ${letter.name} — it says ${letter.translit}`
    );
    playLetter(letter).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, finished]);

  const badgeToast = useCallback(
    (ka: string) => {
      const badge = recordTraced(ka);
      if (badge) toast(`New badge: ${badge.name}! 🎉`);
    },
    [toast]
  );

  if (!group || !letter) return <Redirect href="/letters" />;

  const finishTrace = () => {
    const first = pushOnce("lettersTraceDone", String(groupId));
    addXp(first ? 15 : 5);
    setFinished(true);
    setConfetti((c) => c + 1);
    playPraise();
    announce("Excellent! You traced all the letters in this group.");
  };

  const onDone = () => {
    if (busy) return;
    setBusy(true);
    if ((canvas.current?.getStrokeCount() ?? 0) > 0) badgeToast(letter.ka);
    const p = playPraise();
    toast(`${p ? p.ka + " " : ""}Beautiful ${letter.ka}!`);
    setConfetti((c) => c + 1);
    announce(`Beautiful ${letter.ka}!`);
    timer.current = setTimeout(
      () => {
        setBusy(false);
        if (idx + 1 < letters.length) setIdx(idx + 1);
        else finishTrace();
      },
      reduced ? 400 : 900
    );
  };

  const onWatch = () => {
    canvas.current?.watch(() => {
      badgeToast(letter.ka);
      announce("The letter drew itself — now it counts as traced!");
    });
  };

  if (finished) {
    return (
      <Screen scroll={false}>
        <BackLink label="Letters" href="/letters" />
        <View style={styles.finishWrap}>
          <View style={styles.finishRow}>
            <KaText text={CURRICULUM.strings.excellent} size={type.h1} />
            <Text style={styles.finishTitle}> · Excellent!</Text>
          </View>
          <Text style={styles.finishNote}>
            You traced all {letters.length} letters!
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Letters"
            onPress={() => {
              stopAll();
              if (router.canGoBack()) router.back();
              else router.replace("/letters" as never);
            }}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryPressed]}
          >
            <Text style={styles.primaryText}>Back to Letters</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Trace this group again"
            onPress={() => {
              setFinished(false);
              setIdx(0);
            }}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryPressed]}
          >
            <Text style={styles.secondaryText}>Trace again</Text>
          </Pressable>
          <Confetti trigger={confetti} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <BackLink label="Letters" href="/letters" />
      <Text style={styles.h1} accessibilityRole="header">
        {group.title} · Write it
      </Text>
      <Text style={styles.counter}>
        Letter {idx + 1} of {letters.length}
      </Text>
      <TraceLetterHeader letter={letter} />
      <View style={styles.canvasWrap}>
        {/* key remounts the canvas per letter — fresh ink, fresh demo */}
        <TraceCanvas ref={canvas} key={letter.ka} letter={letter} autoDemo />
        <Confetti trigger={confetti} />
      </View>
      <View style={styles.controls}>
        <WatchDrawButton onPress={onWatch} letterKa={letter.ka} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear your drawing"
          onPress={() => canvas.current?.clear()}
          style={({ pressed }) => [styles.ghostBtn, pressed && styles.secondaryPressed]}
        >
          <Text style={styles.ghostText}>Clear</Text>
        </Pressable>
        {/* always enabled — skipping the drawing is fine, never judged */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done with this letter"
          onPress={onDone}
          style={({ pressed }) => [styles.doneBtn, pressed && styles.primaryPressed]}
        >
          <Text style={styles.primaryText}>Done ✓</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: type.h1,
    fontWeight: type.h1Weight,
    color: colors.ink,
  },
  counter: {
    fontSize: type.body - 2,
    color: colors.inkSoft,
  },
  canvasWrap: {
    alignSelf: "stretch",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
    marginTop: spacing.sm,
  },
  ghostBtn: {
    minHeight: minTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ghostText: {
    fontSize: type.body - 1,
    fontWeight: "700",
    color: colors.ink,
  },
  doneBtn: {
    minHeight: minTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
  },
  primaryPressed: {
    backgroundColor: colors.accentDeep,
  },
  primaryText: {
    fontSize: type.body - 1,
    fontWeight: "800",
    color: colors.white,
  },
  finishWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  finishRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  finishTitle: {
    fontSize: type.h1,
    fontWeight: type.h1Weight,
    color: colors.ink,
  },
  finishNote: {
    fontSize: type.body,
    color: colors.inkSoft,
    textAlign: "center",
  },
  primaryBtn: {
    minHeight: minTarget + 4,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
  },
  secondaryBtn: {
    minHeight: minTarget + 4,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  secondaryPressed: {
    backgroundColor: colors.accentTint,
  },
  secondaryText: {
    fontSize: type.body,
    fontWeight: "700",
    color: colors.ink,
  },
});

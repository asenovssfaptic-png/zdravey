/* SessionPlayer — the shared lesson/exam/practice player. Exact port of
 * the web app's startSession/handleResult/finishSession loop.
 *
 * FROZEN prop contract: { config: SessionConfig, onExit() } — the letters
 * and reading screens mount this with a built SessionConfig.
 *
 * Positive-only, always: forward-only progress bar; correct → XP + chime +
 * advance after 900 ms; miss → soft boop + warm flash, the renderer
 * reveals the right answer, the player SPEAKS it (the Georgian თითქმის
 * clip "ui-ka-titkmis" then the answer clip — nothing audible is
 * English), quietly re-queues one retry (cap 3,
 * two exercises later) and then moves on by itself — Continue button,
 * tapping the revealed card, and the auto-advance all funnel through one
 * miss-index-guarded step, so the child is never stuck and never punished.
 * A renderer signals "the revealed card was tapped" by REPEATING its miss
 * result — the player treats a repeat for the current exercise as go-on.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { colors, minTarget, radii, spacing, type } from "../../constants/theme";
import type { Letter, Speakable, VocabItem } from "../../content/types";
import { announce, useReducedMotion, useToast } from "../../lib/announce";
import { playItem, playUiKa, stopAll } from "../../lib/audio";
import {
  buildLessonExercises,
  buildLetterExam,
  buildLettersRead,
  buildPracticeExercises,
  buildReadingExercises,
  buildUnitExam,
  cloneAsRetry,
  findLesson,
  findPathGroup,
  findReadingStep,
  findUnit,
  retryInsertIndex,
  RETRY_CAP,
  RETRY_TYPES,
  xpForCorrect,
  type Exercise,
  type ExerciseResult,
  type SessionConfig,
} from "../../lib/exercise-engine";
import { finishSession, recordBuildFirstTry, type FinishOutcome } from "../../lib/rewards";
import { boop, chime } from "../../lib/sfx";
import { addXp, getProgress, markPracticed } from "../../lib/store";
import ProgressBar from "../ui/ProgressBar";
import { RENDERERS } from "./exercises";
import FinishScreen from "./FinishScreen";

export interface SessionPlayerProps {
  config: SessionConfig;
  onExit: () => void;
}

interface SessState {
  queue: Exercise[];
  totalOriginal: number;
  idx: number;
  score: number;
  xpEarned: number;
  missed: VocabItem[];
  retriesQueued: number;
  maxPct: number;
  phase: "play" | "miss" | "finished";
  flash: boolean;
  outcome: FinishOutcome | null;
  /** Bumped on redo — stale timers/audio chains check it and stand down. */
  run: number;
}

function initState(exercises: Exercise[], run: number): SessState {
  return {
    queue: exercises.slice(),
    totalOriginal: exercises.length,
    idx: 0,
    score: 0,
    xpEarned: 0,
    missed: [],
    retriesQueued: 0,
    maxPct: 0,
    phase: "play",
    flash: false,
    outcome: null,
    run,
  };
}

/** The answer item a miss should reveal-and-speak. */
function answerOf(ex: Exercise): Speakable | Letter | null {
  if ("word" in ex) return ex.word;
  if ("letter" in ex) return ex.letter;
  if ("item" in ex) return ex.item;
  return null;
}

/** Instruction text per exercise (mirrors each renderer's InstructionLine)
 * — used only for the screen-reader announcement of a new question. */
function instructionFor(ex: Exercise): string {
  switch (ex.type) {
    case "pick_picture":
      return "Tap what you hear";
    case "reverse_pick":
      return "Tap the Georgian word for:";
    case "match_pairs":
      return "Match the pairs";
    case "build_word":
      return "en" in ex.word ? "Build the word" : "Build what you hear";
    case "build_syllable":
      return "Build what you hear";
    case "build_phrase":
      return "Put the words in order";
    case "hear_pick_letter":
      return "Tap the letter you hear";
    case "letter_to_sound":
      return "What sound does it make?";
    case "trace_letter":
      return "Trace the letter";
    case "read_word_pick_picture":
      return "Read it — then tap its picture";
    case "picture_pick_word":
      return "Which word says it?";
    case "hear_pick_word":
      return "Which word did you hear?";
  }
}

/** What the current exercise is about, for the live announcement. */
function exPromptText(ex: Exercise): string {
  const it = answerOf(ex);
  if (!it) return "";
  return it.translit || it.ka || "";
}

/** Redo re-runs the mode's builder — a fresh shuffle every time, exactly
 * like the web's startXxx redo branches. */
function rebuildExercises(config: SessionConfig): Exercise[] {
  switch (config.mode) {
    case "lesson": {
      const f = config.lessonId ? findLesson(config.lessonId) : null;
      return f ? buildLessonExercises(f.unit, f.lesson) : [];
    }
    case "practice":
      return buildPracticeExercises(getProgress());
    case "unit-exam": {
      const u = config.unitId ? findUnit(config.unitId) : null;
      return u ? buildUnitExam(u) : [];
    }
    case "letters-exam": {
      const g = config.groupId ? findPathGroup(config.groupId) : null;
      return g ? buildLetterExam(g) : [];
    }
    case "letters-read": {
      const g = config.groupId ? findPathGroup(config.groupId) : null;
      return g ? buildLettersRead(g) : [];
    }
    case "reading-practice": {
      const st = config.stepId ? findReadingStep(config.stepId) : null;
      return st ? buildReadingExercises(st, "practice") : [];
    }
    case "reading-exam": {
      const st = config.stepId ? findReadingStep(config.stepId) : null;
      return st ? buildReadingExercises(st, "exam") : [];
    }
  }
}

/* One soft beat as each new question (or the finish screen) mounts —
 * fade + 8px rise over 280ms, so the screen never "teleports" under a
 * young child. Skipped entirely under reduced motion (web §4.4 parity). */
function ExEnter({ children }: { children: React.ReactNode }): React.ReactElement {
  const reduced = useReducedMotion();
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) {
      anim.setValue(1);
      return;
    }
    Animated.timing(anim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [anim, reduced]);
  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export function SessionPlayer({ config, onExit }: SessionPlayerProps): React.ReactElement {
  const [s, setS] = useState<SessState>(() => initState(config.exercises, 0));
  const sRef = useRef(s);
  useEffect(() => {
    // handlers/timers always fire after effects, so the mirror is fresh
    sRef.current = s;
  }, [s]);
  const aliveRef = useRef(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { toast } = useToast();

  useEffect(
    () => () => {
      aliveRef.current = false;
      timers.current.forEach(clearTimeout);
      stopAll();
    },
    []
  );

  /** Guarded timeout: fires only while mounted and in the same run. */
  const later = useCallback((fn: () => void, ms: number, run: number): void => {
    timers.current.push(
      setTimeout(() => {
        if (aliveRef.current && sRef.current.run === run) fn();
      }, ms)
    );
  }, []);

  const finish = useCallback(
    (run: number): void => {
      const st = sRef.current;
      const outcome = finishSession(config, st.score, st.totalOriginal);
      outcome.milestones.forEach((m) => toast(`${m.label} — ${m.at} XP! 🎉`));
      outcome.badges.forEach((b) => toast(`New badge: ${b.name}! 🎉`));
      if (outcome.sticker) {
        toast(`🎁 New sticker: ${outcome.sticker.emoji} ${outcome.sticker.name}!`);
      }
      if (outcome.crowned && config.unitId) {
        const u = findUnit(config.unitId);
        if (u) toast(`👑 ${u.title} complete!`);
      }
      setS((prev) =>
        prev.run === run ? { ...prev, phase: "finished", outcome, maxPct: 100, flash: false } : prev
      );
    },
    [config, toast]
  );

  const advance = useCallback(
    (run: number): void => {
      const st = sRef.current;
      if (!aliveRef.current || st.run !== run || st.phase === "finished") return;
      const nextIdx = st.idx + 1;
      if (nextIdx >= st.queue.length) {
        finish(run);
        return;
      }
      const pct = Math.round((nextIdx / st.queue.length) * 100);
      setS((prev) =>
        prev.run === run
          ? {
              ...prev,
              idx: nextIdx,
              phase: "play",
              flash: false,
              maxPct: Math.max(prev.maxPct, pct),
            }
          : prev
      );
    },
    [finish]
  );

  /** After a miss the child is never frozen: the Continue button, the
   * revealed card and the auto-advance all funnel through here, guarded by
   * the miss index so nothing double-advances. */
  const goOn = useCallback(
    (missIdx: number, run: number): void => {
      const st = sRef.current;
      if (!aliveRef.current || st.run !== run) return;
      if (st.phase !== "miss" || st.idx !== missIdx) return;
      advance(run);
    },
    [advance]
  );

  const handleResult = useCallback(
    (ex: Exercise, result: ExerciseResult): void => {
      const st = sRef.current;
      if (!aliveRef.current || st.phase === "finished") return;
      if (st.queue[st.idx] !== ex) return; // stale renderer — ignore

      // a repeated result during the miss pause = the revealed card was
      // tapped: continue now
      if (st.phase === "miss") {
        goOn(st.idx, st.run);
        return;
      }

      // remember practice recency for every word in this exercise
      const words: Speakable[] =
        ex.type === "match_pairs" ? ex.words : "word" in ex && ex.word ? [ex.word] : [];
      markPracticed(words.map((w) => w.id));

      if (result.correct) {
        const xp = xpForCorrect(config.mode, result.firstTry, ex.retry);
        addXp(xp).forEach((m) => toast(`${m.label} — ${m.at} XP! 🎉`));
        chime();
        if (ex.type === "build_word" && result.firstTry) {
          const badge = recordBuildFirstTry();
          if (badge) toast(`New badge: ${badge.name}! 🎉`);
        }
        if (result.announce) announce(result.announce);
        setS((prev) =>
          prev.run === st.run
            ? { ...prev, score: prev.score + 1, xpEarned: prev.xpEarned + xp }
            : prev
        );
        later(() => advance(st.run), 900, st.run);
        return;
      }

      // ---- gentle miss treatment ----
      boop();
      if (result.announce) announce(result.announce);
      const missIdx = st.idx;
      setS((prev) => {
        if (prev.run !== st.run) return prev;
        let queue = prev.queue;
        let retriesQueued = prev.retriesQueued;
        // quietly re-queue the same item two exercises later for one retry —
        // capped per session so "about N questions" stays honest
        if (!ex.retry && RETRY_TYPES.has(ex.type) && retriesQueued < RETRY_CAP) {
          retriesQueued++;
          queue = queue.slice();
          queue.splice(retryInsertIndex(prev.idx, queue.length), 0, cloneAsRetry(ex));
        }
        // remember the word for the finish screen's gentle "see again" note
        let missed = prev.missed;
        if (
          "word" in ex &&
          ex.word &&
          "en" in ex.word &&
          !missed.some((w) => w.id === ex.word.id)
        ) {
          missed = [...missed, ex.word as VocabItem];
        }
        return { ...prev, queue, retriesQueued, missed, phase: "miss", flash: true };
      });
      later(
        () =>
          setS((prev) =>
            prev.run === st.run && prev.flash ? { ...prev, flash: false } : prev
          ),
        600,
        st.run
      );
      // reveal in the child's known language first, then SPEAK the right
      // answer, then a beat — and a generous failsafe so a blocked clip
      // never strands the session
      void (async () => {
        await playUiKa("ui-ka-titkmis", 3600);
        if (!aliveRef.current || sRef.current.run !== st.run) return;
        await playItem(answerOf(ex));
        later(() => goOn(missIdx, st.run), 1400, st.run);
      })();
      later(() => goOn(missIdx, st.run), 9000, st.run);
    },
    [advance, config.mode, goOn, later, toast]
  );

  const redo = useCallback((): void => {
    const exercises = rebuildExercises(config);
    setS((prev) => initState(exercises.length ? exercises : config.exercises, prev.run + 1));
  }, [config]);

  const continueTo = useCallback((): void => {
    const mode = config.mode;
    if (mode === "letters-exam" || mode === "letters-read") {
      router.replace("/letters" as never);
    } else if (mode === "reading-exam" || mode === "reading-practice") {
      router.replace("/reading" as never);
    } else if (mode === "unit-exam") {
      router.replace(`/unit/${config.unitId}` as never);
    } else {
      router.replace("/" as never);
    }
  }, [config.mode, config.unitId]);

  const current = s.phase === "finished" ? null : s.queue[s.idx];

  // keyboard-focus glide of the web becomes a polite announcement per
  // question: the rule + what it is about
  useEffect(() => {
    if (!current) return;
    const p = exPromptText(current);
    announce(instructionFor(current) + (p ? `: ${p}` : ""));
    // announce once per exercise instance
  }, [current]);

  const stepNum = Math.min(s.idx + 1, s.queue.length);
  const pct = s.phase === "finished" ? 100 : s.maxPct;

  return (
    <View style={styles.wrap}>
      <View style={styles.topbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Exit — your XP is saved"
          onPress={() => {
            toast("⭐ XP saved! See you soon 👋", { keep: true });
            onExit();
          }}
          style={({ pressed }) => [styles.exit, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.exitText} accessibilityElementsHidden>
            ✕
          </Text>
        </Pressable>
        <ProgressBar pct={pct} valueText={`Step ${stepNum} of ${s.queue.length}`} />
        <Text style={styles.counter} importantForAccessibility="no">
          {stepNum} / {s.queue.length}
        </Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        // drawing must never scroll the page out from under the finger
        scrollEnabled={!current || current.type !== "trace_letter"}
      >
        {s.phase === "finished" && s.outcome ? (
          <ExEnter>
            <FinishScreen
              config={config}
              outcome={s.outcome}
              xpEarned={s.xpEarned}
              missed={s.missed}
              onContinue={continueTo}
              onRedo={redo}
            />
          </ExEnter>
        ) : current ? (
          <View style={[styles.area, s.flash && styles.flash]}>
            {(() => {
              const Renderer = RENDERERS[current.type] as React.ComponentType<{
                ex: Exercise;
                onResult: (r: ExerciseResult) => void;
              }>;
              return (
                <ExEnter key={`${current.key}:${s.run}`}>
                  <Renderer ex={current} onResult={(r) => handleResult(current, r)} />
                </ExEnter>
              );
            })()}
            {s.phase === "miss" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue"
                onPress={() => goOn(s.idx, s.run)}
                style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.continueText}>Continue</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  exit: {
    width: minTarget,
    height: minTarget,
    borderRadius: minTarget / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exitText: {
    fontSize: 18,
    color: colors.ink,
  },
  counter: {
    fontSize: type.body - 3,
    fontWeight: "700",
    color: colors.inkSoft,
    minWidth: 52,
    textAlign: "right",
  },
  content: {
    paddingBottom: spacing.xl,
  },
  area: {
    gap: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.xs,
  },
  flash: {
    backgroundColor: colors.warnSoft,
  },
  continueBtn: {
    minHeight: minTarget + 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    marginTop: spacing.sm,
  },
  continueText: {
    color: colors.surface,
    fontSize: type.body,
    fontWeight: "800",
  },
});

export default SessionPlayer;

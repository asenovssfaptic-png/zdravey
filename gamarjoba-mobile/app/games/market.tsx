/* Market day — fill Baba's shopping list at the stall. 4 list items among
 * 8 stall items; each find fills a basket slot (+3 XP first tap, +1 via
 * reveal — the slot fills EITHER WAY, never stuck). A complete list is a
 * +5 XP celebration and the round counter ticks up; then a fresh list.
 * Port of renderGameMarket. */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import BasketBar from "../../components/games/BasketBar";
import MarketStall from "../../components/games/MarketStall";
import AudioButton from "../../components/ui/AudioButton";
import BackLink from "../../components/ui/BackLink";
import Confetti from "../../components/ui/Confetti";
import InstructionLine from "../../components/ui/InstructionLine";
import KaText from "../../components/ui/KaText";
import type { AnswerStatus } from "../../components/ui/OptionCard";
import Screen from "../../components/ui/Screen";
import { colors, minTarget, radii, spacing, type } from "../../constants/theme";
import { CURRICULUM } from "../../content/generated/curriculum";
import { announce, useToast } from "../../lib/announce";
import { playItem, playPraise, playUiKa, playWord, stopAll } from "../../lib/audio";
import { shuffle } from "../../lib/exercise-engine";
import { recordGameRound } from "../../lib/rewards";
import { addXp, useProgress } from "../../lib/store";
import { chime } from "../../lib/sfx";

const C = CURRICULUM;

interface ListRound {
  list: string[]; // Baba's list, in find order
  stall: string[]; // list items + distractors, shuffled
}

function makeList(): ListRound {
  const cfg = C.games.market;
  const ids = shuffle(cfg.itemIds.filter((id) => !!C.vocab[id]));
  return {
    list: ids.slice(0, cfg.listLen),
    stall: shuffle(ids.slice(0, cfg.stallSize)),
  };
}

type Phase = "live" | "correct" | "miss" | "done";

export default function MarketScreen(): React.ReactElement {
  const cfg = C.games.market;
  const { toast } = useToast();
  const progress = useProgress();
  const listsDone = progress.gameRounds["market"] ?? 0;

  const [round, setRound] = useState<ListRound>(() => makeList());
  const [li, setLi] = useState(0); // index into round.list
  const [foundIds, setFoundIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("live");
  const [missedId, setMissedId] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(0);

  const tokenRef = useRef(0); // bumps on new list / unmount
  const turnRef = useRef(0); // bumps on every prompt change — scopes goOn
  const wentRef = useRef(false); // once-guard for the current turn's advance
  const liRef = useRef(0); // li mirror for timer callbacks (updaters stay pure)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const currentWord = li < round.list.length ? C.vocab[round.list[li]] : null;

  const awardXp = useCallback(
    (n: number) => {
      addXp(n).forEach((m) => toast(`${m.label} — ${m.at} XP! 🎉`));
    },
    [toast]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      tokenRef.current++;
      timers.forEach(clearTimeout);
      stopAll();
    };
  }, []);

  // each list item auto-plays as its prompt appears (content audio)
  useEffect(() => {
    if (!currentWord) return;
    announce(`Find: ${currentWord.translit}, ${currentWord.en}`);
    playWord(currentWord).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [li, round]);

  const finishList = useCallback((): void => {
    setPhase("done");
    const badge = recordGameRound("market");
    if (badge) toast(`New badge: ${badge.name}! 🎉`);
    awardXp(5); // list-complete bonus
    setConfetti((n) => n + 1);
    playPraise();
    announce("Baba’s list is complete! Wonderful shopping.");
  }, [awardXp, toast]);

  const advance = useCallback(
    (delay: number): void => {
      const token = tokenRef.current;
      const t = setTimeout(() => {
        if (token !== tokenRef.current) return;
        const next = liRef.current + 1;
        liRef.current = next;
        turnRef.current++; // new turn — stale goOn callers become no-ops
        setLi(next);
        if (next < round.list.length) {
          setPhase("live");
          setMissedId(null);
          wentRef.current = false;
        } else {
          finishList();
        }
      }, delay);
      timersRef.current.push(t);
    },
    [round.list.length, finishList]
  );

  /** Advance past THIS turn (identified by `turn`) — first caller wins;
   * a stale failsafe or audio chain from an earlier turn is a no-op.
   * Mirrors the web's per-turn `went` closure. */
  const goOn = useCallback(
    (delay: number, turn: number): void => {
      if (turn !== turnRef.current || wentRef.current) return;
      wentRef.current = true;
      advance(delay);
    },
    [advance]
  );

  const newList = (): void => {
    tokenRef.current++;
    turnRef.current++;
    wentRef.current = false;
    liRef.current = 0;
    setRound(makeList());
    setLi(0);
    setFoundIds([]);
    setPhase("live");
    setMissedId(null);
  };

  const onPick = (id: string): void => {
    if (!currentWord) return;
    const turn = turnRef.current;
    if (phase === "miss") {
      // the revealed item continues on tap — never stuck
      if (id === currentWord.id) goOn(0, turn);
      return;
    }
    if (phase !== "live" || foundIds.includes(id)) return;

    if (id === currentWord.id) {
      setPhase("correct");
      setFoundIds((f) => [...f, id]);
      chime();
      awardXp(3);
      announce(`Into the basket! ${currentWord.ka} — ${currentWord.en}`);
      goOn(900, turn);
    } else {
      setPhase("miss");
      setMissedId(id);
      setFoundIds((f) => [...f, currentWord.id]); // the slot fills anyway
      awardXp(1);
      announce(`Almost! Here it is: ${currentWord.ka} — ${currentWord.en}`);
      playUiKa("ui-ka-titkmis", 3600)
        .then(() => playItem(currentWord))
        .then(() => goOn(1400, turn))
        .catch(() => {});
      const t = setTimeout(() => {
        goOn(0, turn); // never stuck
      }, 9000);
      timersRef.current.push(t);
    }
  };

  const statusOf = (id: string): AnswerStatus => {
    if (foundIds.includes(id)) return "correct";
    if (phase === "miss") return id === missedId ? "miss" : "dim";
    return "idle";
  };

  const disabledOf = (id: string): boolean => {
    if (phase === "live") return foundIds.includes(id);
    if (phase === "miss") return id !== currentWord?.id; // revealed stays tappable
    return true;
  };

  // basket fills as list items complete (li advances past them), plus the
  // current item the moment it lands in foundIds
  const filled = Math.min(
    round.list.filter((id, i) => i < li || foundIds.includes(id)).length,
    round.list.length
  );

  return (
    <Screen>
      <BackLink label="Games" href="/games" />
      <Text style={styles.h1} accessibilityRole="header">
        {cfg.emoji} {cfg.title}
      </Text>
      <Text style={styles.score}>Lists done: {listsDone} 🧺</Text>
      <InstructionLine text="Find it at the market!" />

      <BasketBar listIds={round.list} foundCount={filled} />

      {currentWord && phase !== "done" ? (
        <View style={styles.prompt}>
          <View style={styles.promptRow}>
            <KaText text={currentWord.ka} size={30} speak audioId={currentWord.id} />
            <AudioButton audioId={currentWord.id} label="Hear it again" />
          </View>
          <Text style={styles.translit}>{currentWord.translit}</Text>
        </View>
      ) : null}

      <MarketStall
        itemIds={round.stall}
        statusOf={statusOf}
        disabledOf={disabledOf}
        onPick={onPick}
      />

      {phase === "done" ? (
        <View style={styles.doneBox}>
          <Text style={styles.doneNote}>List complete! 🎉 +5 XP</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New shopping list"
            onPress={newList}
            style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.btnPrimaryText}>New list 🧺</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take a break — back to Games"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/games" as never);
          }}
          style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.btnSecondaryText}>Take a break 👋</Text>
        </Pressable>
      </View>
      <Confetti trigger={confetti} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: type.h1,
    fontWeight: type.h1Weight,
    color: colors.ink,
  },
  score: {
    textAlign: "center",
    fontSize: type.body - 1,
    fontWeight: "600",
    color: colors.inkSoft,
  },
  prompt: {
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  promptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  translit: {
    fontSize: type.body - 1,
    color: colors.inkSoft,
  },
  doneBox: {
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  doneNote: {
    fontSize: type.h2,
    fontWeight: type.h2Weight,
    color: colors.success,
  },
  actions: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  btn: {
    minHeight: minTarget + 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
  },
  btnPrimaryText: {
    color: colors.surface,
    fontSize: type.body,
    fontWeight: "800",
  },
  btnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryText: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: "700",
  },
});

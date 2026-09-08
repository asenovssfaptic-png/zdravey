/* Find it at home — hear a word, find its emoji in the cozy room.
 * Endless relaxed rounds: +3 XP per first-tap find, +1 via reveal; the
 * round counter only ever goes up. A miss gently reveals AND speaks the
 * right one — never stuck, never punished. Port of renderGameFindHome. */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import RoomScene from "../../components/games/RoomScene";
import AudioButton from "../../components/ui/AudioButton";
import BackLink from "../../components/ui/BackLink";
import InstructionLine from "../../components/ui/InstructionLine";
import KaText from "../../components/ui/KaText";
import Screen from "../../components/ui/Screen";
import type { AnswerStatus } from "../../components/ui/OptionCard";
import { colors, minTarget, radii, spacing, type } from "../../constants/theme";
import { CURRICULUM } from "../../content/generated/curriculum";
import { announce, useToast } from "../../lib/announce";
import { playItem, playPraise, playUiKa, playWord, stopAll } from "../../lib/audio";
import { chime } from "../../lib/sfx";
import { shuffle } from "../../lib/exercise-engine";
import { recordGameRound } from "../../lib/rewards";
import { addXp } from "../../lib/store";

const C = CURRICULUM;
const ZONES = ["wall", "mid", "floor"] as const;

interface Round {
  targetId: string;
  rows: { wall: string[]; mid: string[]; floor: string[] };
}

function makeRound(prevTargetId: string | null): Round {
  const cfg = C.games.findHome;
  const all: string[] = [];
  ZONES.forEach((z) => {
    cfg.zones[z].forEach((id) => {
      if (C.vocab[id]) all.push(id);
    });
  });
  const candidates = all.filter((id) => id !== prevTargetId);
  const targetId = shuffle(candidates)[0] ?? all[0];

  const rows = { wall: [] as string[], mid: [] as string[], floor: [] as string[] };
  ZONES.forEach((z) => {
    const ids = cfg.zones[z].filter((id) => !!C.vocab[id]);
    // 3 per zone; the target always sits in its home zone
    let sample = shuffle(ids.filter((id) => id !== targetId)).slice(0, 3);
    if (ids.includes(targetId)) sample = shuffle([targetId, ...sample.slice(0, 2)]);
    rows[z] = sample;
  });
  return { targetId, rows };
}

type Phase = "live" | "correct" | "miss";

export default function FindHomeScreen(): React.ReactElement {
  const cfg = C.games.findHome;
  const { toast } = useToast();

  const [round, setRound] = useState<Round>(() => makeRound(null));
  const [phase, setPhase] = useState<Phase>("live");
  const [missedId, setMissedId] = useState<string | null>(null);
  const [found, setFound] = useState(0); // session, counts up only

  const tokenRef = useRef(0);
  const endedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const word = C.vocab[round.targetId];

  const awardXp = useCallback(
    (n: number) => {
      addXp(n).forEach((m) => toast(`${m.label} — ${m.at} XP! 🎉`));
    },
    [toast]
  );

  // clear pending timers + audio when leaving the room
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      tokenRef.current++;
      timers.forEach(clearTimeout);
      stopAll();
    };
  }, []);

  // each round's word auto-plays (content audio; instructions stay tap-only)
  useEffect(() => {
    playWord(word).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const startNextRound = useCallback((prevId: string) => {
    tokenRef.current++;
    endedRef.current = false;
    setRound(makeRound(prevId));
    setPhase("live");
    setMissedId(null);
  }, []);

  /** End THIS round (identified by `token`) after `delay` — first caller
   * wins, stale callers (audio chains / failsafes from an already-ended
   * round) are no-ops. Mirrors the web's per-round completeRound closure. */
  const completeRound = useCallback(
    (delay: number, token: number, targetId: string) => {
      if (token !== tokenRef.current) return;
      const t = setTimeout(() => {
        if (token !== tokenRef.current || endedRef.current) return;
        endedRef.current = true;
        const badge = recordGameRound("find-home");
        if (badge) toast(`New badge: ${badge.name}! 🎉`);
        startNextRound(targetId);
      }, delay);
      timersRef.current.push(t);
    },
    [startNextRound, toast]
  );

  const onPick = (id: string): void => {
    const token = tokenRef.current;
    const targetId = round.targetId;
    if (phase === "miss") {
      // the revealed item continues on tap — never stuck
      if (id === targetId) completeRound(0, token, targetId);
      return;
    }
    if (phase !== "live") return;

    if (id === targetId) {
      setPhase("correct");
      chime();
      const n = found + 1;
      setFound(n);
      awardXp(3);
      announce(`You found it! ${word.ka} — ${word.en}`);
      if (n % 3 === 0) playPraise();
      completeRound(900, token, targetId);
    } else {
      setPhase("miss");
      setMissedId(id);
      awardXp(1); // participation still trickles up
      announce(`Almost! Here it is: ${word.ka} — ${word.en}`);
      // miss rule in the child's language first, then reveal AND speak
      playUiKa("ui-ka-titkmis", 3600)
        .then(() => playItem(word))
        .then(() => completeRound(1400, token, targetId))
        .catch(() => {});
      completeRound(9000, token, targetId); // never stuck
    }
  };

  const statusOf = (id: string): AnswerStatus => {
    if (phase === "correct") return id === round.targetId ? "correct" : "idle";
    if (phase === "miss") {
      if (id === round.targetId) return "correct";
      if (id === missedId) return "miss";
      return "dim";
    }
    return "idle";
  };

  const disabledOf = (id: string): boolean => {
    if (phase === "live") return false;
    return !(phase === "miss" && id === round.targetId);
  };

  return (
    <Screen>
      <BackLink label="Games" href="/games" />
      <Text style={styles.h1} accessibilityRole="header">
        {cfg.emoji} {cfg.title}
      </Text>
      {/* ✅, not ⭐ — this game awards XP only; a star would promise stars
          it never grants */}
      <Text style={styles.score}>Found: {found} ✅</Text>
      <InstructionLine text="Find it in the room!" />

      <View style={styles.prompt}>
        <View style={styles.promptRow}>
          <KaText text={word.ka} size={30} speak audioId={word.id} />
          <AudioButton audioId={word.id} label="Hear the word again" />
        </View>
        <Text style={styles.translit}>{word.translit}</Text>
      </View>

      <RoomScene rows={round.rows} statusOf={statusOf} disabledOf={disabledOf} onPick={onPick} />

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take a break — back to Games"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/games" as never);
          }}
          style={({ pressed }) => [styles.breakBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.breakText}>Take a break 👋</Text>
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
  actions: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  breakBtn: {
    minHeight: minTarget + 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakText: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: "700",
  },
});

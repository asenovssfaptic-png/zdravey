/* Letter safari — find every copy of a letter in a 4×4 glyph grid.
 * Progress-aware pool (letters of every met group, group-1 as floor).
 * +1 XP per find, +3 round bonus; wrong taps are a free learning moment
 * (the tile speaks its own letter and stays live — no penalty, ever).
 * Port of renderGameLetterSafari. */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import SafariGrid from "../../components/games/SafariGrid";
import AudioButton from "../../components/ui/AudioButton";
import BackLink from "../../components/ui/BackLink";
import InstructionLine from "../../components/ui/InstructionLine";
import Screen from "../../components/ui/Screen";
import { colors, minTarget, radii, spacing, type } from "../../constants/theme";
import { CURRICULUM } from "../../content/generated/curriculum";
import type { Letter } from "../../content/types";
import { announce, useToast } from "../../lib/announce";
import { letterAudioId, playLetter, playPraise, stopAll } from "../../lib/audio";
import { safariLetterPool, shuffle } from "../../lib/exercise-engine";
import { recordGameRound } from "../../lib/rewards";
import { addXp, getProgress, useProgress } from "../../lib/store";
import { chime, match } from "../../lib/sfx";

const C = CURRICULUM;

interface Round {
  target: Letter;
  tiles: Letter[];
}

function makeRound(prevKa: string | null): Round {
  const cfg = C.games.safari;
  // progress-aware pool: letters of every met group, union group-1 as floor
  const pool = safariLetterPool(getProgress());
  const target = shuffle(pool.filter((l) => l.ka !== prevKa))[0] ?? pool[0];
  const others = pool.filter((l) => l.ka !== target.ka);

  const tiles: Letter[] = [];
  for (let i = 0; i < cfg.copies; i++) tiles.push(target);
  for (let i = 0; i < cfg.gridSize - cfg.copies; i++) {
    // repeats allowed, never the target
    tiles.push(others[Math.floor(Math.random() * others.length)]);
  }
  return { target, tiles: shuffle(tiles) };
}

export default function LetterSafariScreen(): React.ReactElement {
  const cfg = C.games.safari;
  const { toast } = useToast();
  const progress = useProgress();
  const roundsDone = progress.gameRounds["letter-safari"] ?? 0;

  const [round, setRound] = useState<Round>(() => makeRound(null));
  const [foundIdx, setFoundIdx] = useState<number[]>([]);
  const [caption, setCaption] = useState("");
  const [miss, setMiss] = useState<{ index: number; seq: number } | null>(null);

  const sessionRounds = useRef(0);
  const tokenRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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

  // each round's letter auto-plays (content audio)
  useEffect(() => {
    playLetter(round.target).catch(() => {});
    announce(`Find every ${round.target.name}`);
  }, [round]);

  const startNewRound = useCallback((prevKa: string) => {
    tokenRef.current++;
    setRound(makeRound(prevKa));
    setFoundIdx([]);
    setCaption("");
    setMiss(null);
  }, []);

  const onTap = (i: number): void => {
    if (foundIdx.includes(i)) return;
    const lt = round.tiles[i];
    if (lt.ka === round.target.ka) {
      const next = [...foundIdx, i];
      setFoundIdx(next);
      match();
      awardXp(1);
      announce(`${next.length} of ${cfg.copies} found`);
      if (next.length === cfg.copies) {
        chime();
        awardXp(3); // round bonus
        sessionRounds.current++;
        const badge = recordGameRound("letter-safari");
        if (badge) toast(`New badge: ${badge.name}! 🎉`);
        if (sessionRounds.current % 3 === 0) playPraise();
        announce(`All ${cfg.copies} found! Here comes a new letter.`);
        const token = tokenRef.current;
        const targetKa = round.target.ka;
        const t = setTimeout(() => {
          if (token !== tokenRef.current) return;
          startNewRound(targetKa);
        }, 900);
        timersRef.current.push(t);
      }
    } else {
      // a free learning moment — no penalty, tile stays enabled
      setMiss((m) => ({ index: i, seq: (m?.seq ?? 0) + 1 }));
      playLetter(lt).catch(() => {});
      setCaption(`that one is ${lt.name}`);
      announce(`That one is ${lt.name} — keep looking for ${round.target.name}!`);
    }
  };

  const pips = Array.from({ length: cfg.copies }, (_, p) =>
    p < foundIdx.length ? "●" : "○"
  ).join(" ");

  return (
    <Screen>
      <BackLink label="Games" href="/games" />
      <Text style={styles.h1} accessibilityRole="header">
        {cfg.emoji} {cfg.title}
      </Text>
      <Text style={styles.score}>Safari rounds: {roundsDone} 🔎</Text>
      <InstructionLine text="Tap every one you see!" />

      <View style={styles.prompt}>
        <View style={styles.promptRow}>
          {/* the glyph itself is the challenge — only the letter's NAME shows */}
          <Text style={styles.promptEn}>
            Find every <Text style={styles.promptStrong}>{round.target.name}</Text>
          </Text>
          <AudioButton
            audioId={letterAudioId(round.target)}
            label="Hear the letter again"
            lg
          />
        </View>
        <Text
          style={styles.pips}
          accessibilityRole="image"
          accessibilityLabel={`${foundIdx.length} of ${cfg.copies} found`}
        >
          {pips}
        </Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>

      <SafariGrid
        tiles={round.tiles}
        targetKa={round.target.ka}
        foundIndices={foundIdx}
        onTap={onTap}
        miss={miss}
      />

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
  promptEn: {
    fontSize: type.h2,
    color: colors.ink,
  },
  promptStrong: {
    fontWeight: "800",
  },
  pips: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.success,
    letterSpacing: 2,
  },
  caption: {
    minHeight: 22,
    fontSize: type.body - 2,
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

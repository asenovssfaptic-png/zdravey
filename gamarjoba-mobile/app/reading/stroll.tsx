/* Reading stroll — endless relaxed flip cards. No timer, no score, no
 * end: read the front, tap to flip and hear it (+1 XP), stroll on, leave
 * whenever you like. (Route name "stroll"; the store key stays
 * `sprintFlips` — ids are save keys, not copy.) Port of the web
 * renderReadingSprint. */

import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import StrollCard from "../../components/reading/StrollCard";
import BackLink from "../../components/ui/BackLink";
import InstructionLine from "../../components/ui/InstructionLine";
import Screen from "../../components/ui/Screen";
import { colors, minTarget, radii, spacing, type } from "../../constants/theme";
import type { Syllable, VocabItem } from "../../content/types";
import { announce, useToast } from "../../lib/announce";
import { playWord, stopAll } from "../../lib/audio";
import { shuffle, strollPool } from "../../lib/exercise-engine";
import { recordStrollFlip } from "../../lib/rewards";
import { addXp, getProgress } from "../../lib/store";

type Item = VocabItem | Syllable;

export default function StrollScreen(): React.ReactElement {
  const { toast } = useToast();
  // deck is session-local: stable across the store writes each flip causes
  const [deck, setDeck] = useState<Item[]>(() => shuffle(strollPool(getProgress())));
  const [di, setDi] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [flips, setFlips] = useState(0);

  useEffect(() => () => stopAll(), []);

  const item = deck[di];

  const flip = (): void => {
    if (!item || flipped) return;
    setFlipped(true);
    playWord(item).catch(() => {}); // the item auto-plays once on flip
    setFlips((f) => f + 1);
    addXp(1).forEach((m) => toast(`${m.label} — ${m.at} XP! 🎉`));
    const badge = recordStrollFlip();
    if (badge) toast(`New badge: ${badge.name}! 🎉`);
    const en = "en" in item ? item.en : "";
    announce(item.translit + (en ? `, ${en}` : ""));
  };

  const showNext = (): void => {
    setFlipped(false);
    if (di + 1 >= deck.length) {
      // endless — reshuffle (progress may have unlocked more) & continue
      setDeck(shuffle(strollPool(getProgress())));
      setDi(0);
    } else {
      setDi(di + 1);
    }
  };

  return (
    <Screen>
      <BackLink label="Reading" href="/reading" />
      <Text style={styles.h1} accessibilityRole="header">
        Reading stroll
      </Text>
      <InstructionLine text="Tap the card to flip it" />

      <View style={styles.deckArea}>
        {item ? <StrollCard item={item} flipped={flipped} onFlip={flip} /> : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next card"
          onPress={showNext}
          style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.btnPrimaryText}>Next card →</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take a break — back to Reading"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/reading" as never);
          }}
          style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.btnSecondaryText}>Take a break 👋</Text>
        </Pressable>
      </View>

      <Text style={styles.counter}>Cards flipped this visit: {flips}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: type.h1,
    fontWeight: type.h1Weight,
    color: colors.ink,
  },
  deckArea: {
    alignItems: "center",
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
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
  counter: {
    textAlign: "center",
    fontSize: type.body - 2,
    color: colors.inkSoft,
    marginTop: spacing.md,
  },
});

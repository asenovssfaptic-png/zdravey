/* Home — the adventure hub (port of the web renderHome): Day-N continue
 * hero, the 3 newest badges as quiet chips, word of the day, five entry
 * cards with live progress rings, and the 16-unit path in two labeled
 * parts. Nothing here is ever locked — "Up next" is a highlight. */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import DailyGiftModal from "../components/gift/DailyGiftModal";
import HeroCard from "../components/home/HeroCard";
import UnitPathList from "../components/home/UnitPathList";
import Screen from "../components/ui/Screen";
import WordOfDayCard from "../components/wod/WordOfDayCard";
import { colors, radii, spacing, type } from "../constants/theme";
import { CURRICULUM } from "../content/generated/curriculum";
import {
  learnedWords,
  lettersGroupsDone,
  readingStepsDone,
  totalStars,
} from "../lib/exercise-engine";
import EntryCard from "../components/ui/EntryCard";
import { badgeInfo } from "../lib/rewards";
import { useProgress } from "../lib/store";

const C = CURRICULUM;

export default function HomeScreen(): React.ReactElement {
  const progress = useProgress();
  const nGroups = C.lettersPath.groups.length;
  const gDone = lettersGroupsDone(progress);
  const nSteps = C.readingTrack.steps.length;
  const sDone = readingStepsDone(progress);
  const nReady = learnedWords(progress).length;

  return (
    <Screen>
      <Text style={styles.h1} accessibilityRole="header">
        Your Georgian adventure
      </Text>

      <HeroCard />

      {progress.badges.length ? (
        <View style={styles.badgesRow} accessibilityRole="list" accessibilityLabel="Newest badges">
          {progress.badges.slice(-3).map((id) => {
            const b = badgeInfo(id);
            return b ? (
              <View key={id} style={styles.badgeChip} accessibilityLabel={`Badge: ${b.name}`}>
                <Text style={styles.badgeEmoji} accessibilityElementsHidden>
                  {b.emoji}
                </Text>
                <Text style={styles.badgeName}>{b.name}</Text>
              </View>
            ) : null;
          })}
        </View>
      ) : null}

      <WordOfDayCard />

      <EntryCard
        emoji="🔤"
        kaLabel={C.strings.letters}
        label="Letters"
        sub={`${gDone} of ${nGroups} groups done · all 33 letters, step by step`}
        onPress={() => router.push("/letters" as never)}
        accessibilityLabel={`Open the Letters path — ${gDone} of ${nGroups} groups done`}
        ring={{ frac: nGroups ? gDone / nGroups : 0, done: nGroups > 0 && gDone === nGroups }}
      />
      <EntryCard
        emoji="📖"
        kaLabel={C.strings.reading}
        label="Reading"
        sub={`${sDone} of ${nSteps} steps done · sound out real words`}
        onPress={() => router.push("/reading" as never)}
        accessibilityLabel={`Open the Reading path — ${sDone} of ${nSteps} steps done`}
        ring={{ frac: nSteps ? sDone / nSteps : 0, done: nSteps > 0 && sDone === nSteps }}
      />
      <EntryCard
        emoji="🧠"
        kaLabel={C.strings.practice}
        label="Practice"
        sub={`Mix everything you know — ${nReady} words ready`}
        onPress={() => router.push("/practice" as never)}
        accessibilityLabel={`Practice everything you have learned — ${nReady} words ready`}
      />
      <EntryCard
        emoji="🎲"
        kaLabel={C.strings.games}
        label="Games"
        sub="Three cozy games with words you know"
        onPress={() => router.push("/games" as never)}
        accessibilityLabel="Open Games"
      />
      <EntryCard
        emoji="🏆"
        kaLabel={C.strings.treasures}
        label="My treasures"
        sub={`${totalStars(progress)} stars · ${progress.stickers.length} stickers · ${progress.badges.length} badges`}
        onPress={() => router.push("/treasures" as never)}
        accessibilityLabel="Open My treasures"
      />

      <UnitPathList />

      <DailyGiftModal />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: type.h1,
    fontWeight: type.h1Weight,
    color: colors.ink,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeEmoji: {
    fontSize: 15,
  },
  badgeName: {
    fontSize: type.body - 4,
    fontWeight: "700",
    color: colors.inkSoft,
  },
});

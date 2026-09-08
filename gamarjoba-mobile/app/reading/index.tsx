/* Reading path — 8 steps × cards / practice / exam + the Reading-stroll
 * entry. Highlights ("Up next") only — never locks. Port of the web
 * renderReadingPath. */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import BackLink from "../../components/ui/BackLink";
import EntryCard from "../../components/ui/EntryCard";
import KaText from "../../components/ui/KaText";
import PathNode from "../../components/ui/PathNode";
import Screen from "../../components/ui/Screen";
import StarRow from "../../components/ui/StarRow";
import { colors, spacing, type } from "../../constants/theme";
import { CURRICULUM } from "../../content/generated/curriculum";
import { recipeQuestionCount } from "../../lib/exercise-engine";
import { useProgress } from "../../lib/store";

const C = CURRICULUM;

export default function ReadingPathScreen(): React.ReactElement {
  const progress = useProgress();

  // the first not-done node gets the "Up next" pill — a highlight, never a lock
  const seq: { key: string; done: boolean }[] = [];
  C.readingTrack.steps.forEach((step) => {
    seq.push({ key: `cards-${step.id}`, done: progress.readingCardsDone.includes(step.id) });
    seq.push({ key: `practice-${step.id}`, done: progress.readingPracticeDone.includes(step.id) });
    seq.push({ key: `exam-${step.id}`, done: (progress.readingExamStars[step.id] ?? 0) >= 1 });
  });
  const nextKey = seq.find((s) => !s.done)?.key ?? null;

  return (
    <Screen>
      <BackLink label="Home" href="/" />
      <View style={styles.titleRow}>
        <KaText text={C.strings.reading} size={type.h1} speak />
        <Text style={styles.h1}> · Reading</Text>
      </View>
      <Text style={styles.intro}>
        Sound out real Georgian — from tiny syllables to long, delicious words.
      </Text>

      <EntryCard
        emoji="🪁"
        kaLabel={C.strings.readingSprint}
        label="Reading stroll"
        sub="Flip through everything you can read — no rush, no score"
        onPress={() => router.push("/reading/stroll" as never)}
        accessibilityLabel="Reading stroll — flip through everything you can read, no rush, no score"
      />

      {C.readingTrack.steps.map((step, i) => {
        const cardsDone = progress.readingCardsDone.includes(step.id);
        const practiceDone = progress.readingPracticeDone.includes(step.id);
        const examStars = progress.readingExamStars[step.id] ?? 0;
        const examDone = examStars >= 1;
        const cardsNext = nextKey === `cards-${step.id}`;
        const practiceNext = nextKey === `practice-${step.id}`;
        const examNext = nextKey === `exam-${step.id}`;
        return (
          <React.Fragment key={step.id}>
            <Text style={styles.groupTitle}>
              {i + 1} · {step.title}
            </Text>
            <PathNode
              face="🃏"
              title="Word cards"
              sub={`${step.items.length} cards`}
              done={cardsDone}
              next={cardsNext}
              onPress={() => router.push(`/reading/${step.id}/cards` as never)}
              accessibilityLabel={
                `Word cards — ${step.title}` +
                (cardsDone ? ", completed" : cardsNext ? ", up next" : "")
              }
            />
            <PathNode
              face="🧩"
              title="Practice"
              sub="Playful exercises"
              done={practiceDone}
              next={practiceNext}
              onPress={() => router.push(`/reading/${step.id}/practice` as never)}
              accessibilityLabel={
                `Practice — ${step.title}` +
                (practiceDone ? ", completed" : practiceNext ? ", up next" : "")
              }
            />
            <PathNode
              face="🏅"
              title="Mini exam"
              sub={
                examStars > 0 ? (
                  <StarRow earned={examStars} />
                ) : (
                  `About ${recipeQuestionCount(step.exam)} questions`
                )
              }
              done={examDone}
              next={examNext}
              onPress={() => router.push(`/reading/${step.id}/exam` as never)}
              accessibilityLabel={
                `Mini exam — ${step.title}` +
                (examDone ? `, completed, best ${examStars} of 3 stars` : examNext ? ", up next" : "")
              }
            />
          </React.Fragment>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "baseline" },
  h1: { fontSize: type.h1, fontWeight: type.h1Weight, color: colors.ink },
  intro: { fontSize: type.body, color: colors.inkSoft },
  groupTitle: {
    fontSize: type.h2,
    fontWeight: type.h2Weight,
    color: colors.ink,
    marginTop: spacing.sm,
  },
});

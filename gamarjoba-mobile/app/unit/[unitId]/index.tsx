/* Unit step path — per lesson Word-cards + Practice nodes, then the Unit
 * exam node. STUB (Agent A — Learn): already renders the real step path
 * (never locked) so navigation is demoable. */

import React from "react";
import { StyleSheet, Text } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";

import BackLink from "../../../components/ui/BackLink";
import PathNode from "../../../components/ui/PathNode";
import Screen from "../../../components/ui/Screen";
import StarRow from "../../../components/ui/StarRow";
import { colors, type } from "../../../constants/theme";
import {
  cardsNodeDone,
  findUnit,
  lessonExerciseCount,
  unitExamQuestionCount,
} from "../../../lib/exercise-engine";
import { useProgress } from "../../../lib/store";

export default function UnitScreen(): React.ReactElement {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const progress = useProgress();
  const unit = findUnit(String(unitId));
  if (!unit) return <Redirect href="/" />;

  const examStars = progress.unitExamStars[unit.id] ?? 0;

  // the first not-done node gets the "Up next" pill — a highlight, never a lock
  const seq: { key: string; done: boolean }[] = [];
  unit.lessons.forEach((l) => {
    seq.push({ key: `cards-${l.id}`, done: cardsNodeDone(progress, l.id) });
    seq.push({ key: `practice-${l.id}`, done: (progress.stars[l.id] ?? 0) >= 1 });
  });
  seq.push({ key: "exam", done: examStars >= 1 });
  const nextKey = seq.find((s) => !s.done)?.key ?? null;

  return (
    <Screen>
      <BackLink label="All units" href="/" />
      <Text style={styles.h1} accessibilityRole="header">
        {unit.emoji} {unit.title}
      </Text>
      <Text style={styles.desc}>{unit.description}</Text>

      {unit.lessons.map((l, li) => {
        const cardsDone = cardsNodeDone(progress, l.id);
        const earned = progress.stars[l.id] ?? 0;
        const practiceDone = earned >= 1;
        const cardsNext = nextKey === `cards-${l.id}`;
        const practiceNext = nextKey === `practice-${l.id}`;
        return (
          <React.Fragment key={l.id}>
            <Text style={styles.groupTitle}>
              {li + 1} · {l.title}
            </Text>
            <PathNode
              face="🃏"
              title="Word cards"
              sub={`${l.items.length} cards`}
              done={cardsDone}
              next={cardsNext}
              onPress={() => router.push(`/unit/${unit.id}/cards/${l.id}` as never)}
              accessibilityLabel={
                `Word cards — ${l.title}, ${l.items.length} cards` +
                (cardsDone ? ", completed" : cardsNext ? ", up next" : "")
              }
            />
            <PathNode
              face="🧩"
              title="Practice"
              sub={
                practiceDone ? (
                  <StarRow earned={earned} />
                ) : (
                  `~${lessonExerciseCount(unit, l)} playful steps`
                )
              }
              done={practiceDone}
              next={practiceNext}
              onPress={() => router.push(`/lesson/${l.id}` as never)}
              accessibilityLabel={
                `Practice — ${l.title}` +
                (practiceDone
                  ? `, completed, best ${earned} of 3 stars`
                  : practiceNext
                    ? ", up next"
                    : "")
              }
            />
          </React.Fragment>
        );
      })}

      <PathNode
        face="🏅"
        title="Unit exam"
        sub={
          examStars >= 1 ? (
            <StarRow earned={examStars} />
          ) : (
            `About ${unitExamQuestionCount()} questions`
          )
        }
        done={examStars >= 1}
        next={nextKey === "exam"}
        onPress={() => router.push(`/unit/${unit.id}/exam` as never)}
        accessibilityLabel={
          `Unit exam — ${unit.title}` +
          (examStars >= 1 ? `, completed, best ${examStars} of 3 stars` : "")
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: type.h1,
    fontWeight: type.h1Weight,
    color: colors.ink,
  },
  desc: {
    fontSize: type.body,
    color: colors.inkSoft,
  },
  groupTitle: {
    fontSize: type.h2,
    fontWeight: type.h2Weight,
    color: colors.ink,
    marginTop: 8,
  },
});

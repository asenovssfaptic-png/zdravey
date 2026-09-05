/* Unit word cards — meet every word BEFORE practicing it. Mounts the
 * foundation CardsDeck (mode "vocab"). Owned by Agent A — Learn. */

import React from "react";
import { StyleSheet, Text } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";

import CardsDeck from "../../../../components/CardsDeck";
import BackLink from "../../../../components/ui/BackLink";
import Screen from "../../../../components/ui/Screen";
import { colors, type } from "../../../../constants/theme";
import { findLesson, findUnit, wordsOf } from "../../../../lib/exercise-engine";
import { pushOnce } from "../../../../lib/store";

export default function UnitCardsScreen(): React.ReactElement {
  const { unitId, lessonId } = useLocalSearchParams<{ unitId: string; lessonId: string }>();
  const unit = findUnit(String(unitId));
  const found = findLesson(String(lessonId));
  if (!unit || !found || found.unit !== unit) return <Redirect href="/" />;

  return (
    <Screen>
      <BackLink label={unit.title} href={`/unit/${unit.id}`} />
      <Text style={styles.h1} accessibilityRole="header">
        {found.lesson.title} · Word cards
      </Text>
      <CardsDeck
        items={wordsOf(found.lesson.items)}
        mode="vocab"
        markDone={() => pushOnce("unitCardsDone", String(lessonId))}
        backHref={`/unit/${unit.id}`}
        doneToast="Cards done! 🎉"
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
});

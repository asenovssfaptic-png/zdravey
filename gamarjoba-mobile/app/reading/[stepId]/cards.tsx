/* Reading word cards — CardsDeck in "reading" mode (tap-a-letter,
 * Sound-it-out, Show-hint). Owned by Agent C. */

import React from "react";
import { StyleSheet, Text } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";

import CardsDeck from "../../../components/CardsDeck";
import BackLink from "../../../components/ui/BackLink";
import Screen from "../../../components/ui/Screen";
import { colors, type } from "../../../constants/theme";
import type { Syllable, VocabItem } from "../../../content/types";
import { findReadingStep, readItem } from "../../../lib/exercise-engine";
import { pushOnce } from "../../../lib/store";

export default function ReadingCardsScreen(): React.ReactElement {
  const { stepId } = useLocalSearchParams<{ stepId: string }>();
  const step = findReadingStep(String(stepId));
  if (!step) return <Redirect href="/reading" />;

  const items = step.items
    .map(readItem)
    .filter((x): x is VocabItem | Syllable => !!x);

  return (
    <Screen>
      <BackLink label="Reading" href="/reading" />
      <Text style={styles.h1} accessibilityRole="header">
        {step.title} · Word cards
      </Text>
      <CardsDeck
        items={items}
        mode="reading"
        markDone={() => pushOnce("readingCardsDone", step.id)}
        backHref="/reading"
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

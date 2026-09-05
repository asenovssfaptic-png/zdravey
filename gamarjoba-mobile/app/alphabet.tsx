/* Alphabet browser — all 33 letters in their 6 groups, with the
 * LetterModal for a closer look (prev/next, letter → example audio).
 * Port of the web renderAlphabet + openLetterDialog. */

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import AlphabetGrid from "../components/letters/AlphabetGrid";
import LetterModal from "../components/letters/LetterModal";
import BackLink from "../components/ui/BackLink";
import KaText from "../components/ui/KaText";
import Screen from "../components/ui/Screen";
import { colors, type } from "../constants/theme";
import { CURRICULUM } from "../content/generated/curriculum";
import { ALL_LETTERS } from "../lib/exercise-engine";

const C = CURRICULUM;

export default function AlphabetScreen(): React.ReactElement {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Screen>
      <BackLink label="Home" href="/" />
      <View style={styles.titleRow}>
        <KaText text={C.strings.alphabet} size={type.h1} />
        <Text style={styles.h1} accessibilityRole="header">
          {" "}
          · The alphabet
        </Text>
      </View>
      <View style={styles.introRow}>
        <KaText text={C.strings.georgianAlphabet} size={type.body} />
        <Text style={styles.intro}>
          {" "}
          — {ALL_LETTERS.length} letters, and every one says exactly one sound.
        </Text>
      </View>

      <AlphabetGrid onOpenLetter={(flatIndex) => setOpenIndex(flatIndex)} />

      {/* keyed by the tapped letter — every opening starts a fresh deck */}
      <LetterModal
        key={openIndex ?? -1}
        index={openIndex ?? 0}
        visible={openIndex !== null}
        onClose={() => setOpenIndex(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
  },
  h1: {
    fontSize: type.h1,
    fontWeight: type.h1Weight,
    color: colors.ink,
  },
  introRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
  },
  intro: {
    fontSize: type.body,
    color: colors.inkSoft,
    flexShrink: 1,
  },
});

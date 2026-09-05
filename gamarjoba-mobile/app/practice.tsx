/* Practice — intro card, then the mixed-review session in-screen.
 * Owned by Agent A — Learn (stub already wires the real builder). */

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import SessionPlayer from "../components/session/SessionPlayer";
import BackLink from "../components/ui/BackLink";
import KaText from "../components/ui/KaText";
import Screen from "../components/ui/Screen";
import { colors, minTarget, radii, shadow, spacing, type } from "../constants/theme";
import { CURRICULUM } from "../content/generated/curriculum";
import {
  buildPracticeExercises,
  learnedWords,
  type SessionConfig,
} from "../lib/exercise-engine";
import { getProgress, useProgress } from "../lib/store";

export default function PracticeScreen(): React.ReactElement {
  const progress = useProgress();
  const [config, setConfig] = useState<SessionConfig | null>(null);

  if (config) {
    return (
      <Screen scroll={false} topBar={false}>
        <SessionPlayer config={config} onExit={() => setConfig(null)} />
      </Screen>
    );
  }

  const nReady = learnedWords(progress).length;

  return (
    <Screen>
      <BackLink label="Home" href="/" />
      <View style={styles.titleRow}>
        <KaText text={CURRICULUM.strings.practice} size={type.h1} />
        <Text style={styles.h1}> · Review</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.emoji} accessibilityElementsHidden>
          🧠
        </Text>
        <Text style={styles.h2}>Practice everything you’ve learned</Text>
        <Text style={styles.count}>{nReady} words ready to practice</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start practice"
          onPress={() =>
            setConfig({
              mode: "practice",
              title: "Practice",
              exercises: buildPracticeExercises(getProgress()),
            })
          }
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.btnText}>Start practice</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  h1: {
    fontSize: type.h1,
    fontWeight: type.h1Weight,
    color: colors.ink,
  },
  card: {
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadow,
  },
  emoji: {
    fontSize: 44,
  },
  h2: {
    fontSize: type.h2,
    fontWeight: type.h2Weight,
    color: colors.ink,
    textAlign: "center",
  },
  count: {
    fontSize: type.body - 1,
    color: colors.inkSoft,
  },
  btn: {
    minHeight: minTarget + 4,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
  },
  btnText: {
    color: colors.surface,
    fontSize: type.body,
    fontWeight: "800",
  },
});

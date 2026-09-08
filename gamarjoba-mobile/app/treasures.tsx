/* My treasures — everything the child has ever earned, and it only ever
 * grows: stars breakdown, XP + milestones, badges, crowned units, the
 * sticker album and My dictionary. Port of the web renderTreasures. */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import DictionaryList from "../components/treasures/DictionaryList";
import StickerAlbum from "../components/treasures/StickerAlbum";
import BackLink from "../components/ui/BackLink";
import KaText from "../components/ui/KaText";
import Screen from "../components/ui/Screen";
import { colors, radii, shadow, spacing, type } from "../constants/theme";
import { CURRICULUM } from "../content/generated/curriculum";
import { findUnit, starsBreakdown, totalStars } from "../lib/exercise-engine";
import { BADGES, XP_MILESTONES } from "../lib/rewards";
import { useProgress } from "../lib/store";

const C = CURRICULUM;

function Chip({ emoji, name, label }: { emoji: string; name: string; label: string }): React.ReactElement {
  return (
    <View style={styles.chip} accessibilityRole="text" accessibilityLabel={label}>
      <Text style={styles.chipEmoji} accessibilityElementsHidden>
        {emoji}
      </Text>
      <Text style={styles.chipName}>{name}</Text>
    </View>
  );
}

export default function TreasuresScreen(): React.ReactElement {
  const progress = useProgress();
  const b = starsBreakdown(progress);
  const milestoneLine = XP_MILESTONES.map((m) =>
    progress.xp >= m.at ? `${m.label} ✓` : `${m.label} at ${m.at}`
  ).join(" · ");
  const crownedUnits = progress.crowns
    .map((uid) => findUnit(uid))
    .filter((u): u is NonNullable<typeof u> => !!u);

  return (
    <Screen>
      <BackLink label="Home" href="/" />
      <View style={styles.titleRow}>
        <Text style={styles.h1}>🏆 </Text>
        <KaText text={C.strings.treasures} size={type.h1} speak />
        <Text style={styles.h1}> · My treasures</Text>
      </View>
      <Text style={styles.intro}>
        Everything here only ever grows. ☀️ Day {Math.max(1, progress.daysPlayed.length)} of your
        adventure.
      </Text>

      <View style={styles.section}>
        <Text style={styles.h2}>⭐ Stars — {totalStars(progress)}</Text>
        <Text style={styles.line}>
          Lessons {b.lessons} · Unit exams {b.unitEx} · Letters {b.letters} · Reading {b.reading} ·
          Practice {b.practice}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>⚡ {progress.xp} XP</Text>
        <Text style={styles.line}>{milestoneLine}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>🎖️ Badges — {progress.badges.length}</Text>
        {progress.badges.length ? (
          <View style={styles.chipRow} accessibilityLabel="Badges earned" accessibilityRole="none">
            {progress.badges.map((id) =>
              BADGES[id] ? (
                <Chip
                  key={id}
                  emoji={BADGES[id].emoji}
                  name={BADGES[id].name}
                  label={`Badge: ${BADGES[id].name}`}
                />
              ) : null
            )}
          </View>
        ) : (
          <Text style={styles.line}>Your first badge is waiting in your very first lesson!</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>👑 Crowns — {progress.crowns.length}</Text>
        {crownedUnits.length ? (
          <View style={styles.chipRow} accessibilityLabel="Crowned units" accessibilityRole="none">
            {crownedUnits.map((u) => (
              <Chip
                key={u.id}
                emoji={`👑 ${u.emoji}`}
                name={u.title}
                label={`Crowned unit: ${u.title}`}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.line}>Finish a unit’s lessons and its exam to crown it!</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>
          🎁 Sticker album — {progress.stickers.length} of {C.stickers.length}
        </Text>
        <Text style={styles.line}>Baba has a gift waiting every day you visit.</Text>
        <StickerAlbum ownedIds={progress.stickers} />
      </View>

      <View style={styles.section}>
        <View style={styles.dictTitleRow}>
          <Text style={styles.h2}>📖 </Text>
          <KaText text={C.strings.dictionary} size={type.h2 - 2} speak />
          <Text style={styles.h2}> · My dictionary — {progress.wodCollected.length}</Text>
        </View>
        <DictionaryList wordIds={progress.wodCollected} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap" },
  h1: { fontSize: type.h1, fontWeight: type.h1Weight, color: colors.ink },
  intro: { fontSize: type.body, color: colors.inkSoft },
  section: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadow,
  },
  h2: { fontSize: type.h2, fontWeight: type.h2Weight, color: colors.ink },
  line: { fontSize: type.body - 2, color: colors.inkSoft },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  chipEmoji: { fontSize: type.body },
  chipName: { fontSize: type.body - 3, fontWeight: "700", color: colors.ink },
  dictTitleRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap" },
});

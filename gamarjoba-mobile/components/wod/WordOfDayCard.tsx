/* WordOfDayCard — the deterministic daily word (31-hash over the date,
 * un-collected bonus words first) + "Collect it" into My dictionary
 * (+5 XP, once). Port of the web wod-card. */

import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { colors, minTarget, radii, shadow, spacing, type } from "../../constants/theme";
import { CURRICULUM } from "../../content/generated/curriculum";
import { announce, useToast } from "../../lib/announce";
import AudioButton from "../ui/AudioButton";
import EmojiIcon from "../ui/EmojiIcon";
import KaText from "../ui/KaText";
import { todayKey } from "../../lib/dates";
import { wordOfDay } from "../../lib/exercise-engine";
import { addXp, pushOnce, setWod, useProgress } from "../../lib/store";

export function WordOfDayCard(): React.ReactElement {
  const progress = useProgress();
  const { toast } = useToast();
  const dateKey = todayKey();
  const w = wordOfDay(progress, dateKey);
  const owned = progress.wodCollected.includes(w.id);

  // pin today's pick so it stays stable all day (and after collecting)
  useEffect(() => {
    setWod(dateKey, w.id);
  }, [dateKey, w.id]);

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <KaText text={CURRICULUM.strings.wordOfDay} size={type.body - 1} speak />
        <Text style={styles.title}> · Word of the day</Text>
      </View>
      <View style={styles.row}>
        <EmojiIcon emoji={w.emoji} label={w.en} size={40} />
        <KaText text={w.ka} size={24} speak audioId={w.id} />
        <AudioButton audioId={w.id} label={`Hear ${w.en}`} small />
      </View>
      <Text style={styles.translit}>
        {w.translit} — {w.en}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          owned ? `${w.en} is in your dictionary` : `Collect ${w.en} into your dictionary`
        }
        onPress={() => {
          if (owned) {
            router.push("/treasures" as never);
            return;
          }
          pushOnce("wodCollected", w.id);
          addXp(5).forEach((m) => toast(`${m.label} — ${m.at} XP! 🎉`));
          toast("Added to your dictionary! 📖");
          announce(`${w.en} added to your dictionary.`);
        }}
        style={({ pressed }) => [
          styles.btn,
          owned ? styles.btnSecondary : styles.btnPrimary,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={owned ? styles.btnSecondaryText : styles.btnPrimaryText}>
          {owned ? "✓ In your dictionary" : "Collect it ✓"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadow,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  title: {
    fontSize: type.body - 1,
    fontWeight: "800",
    color: colors.ink,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  translit: {
    fontSize: type.body - 2,
    color: colors.inkSoft,
  },
  btn: {
    minHeight: minTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
  },
  btnPrimaryText: {
    color: colors.surface,
    fontSize: type.body - 1,
    fontWeight: "800",
  },
  btnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryText: {
    color: colors.ink,
    fontSize: type.body - 1,
    fontWeight: "700",
  },
});

export default WordOfDayCard;

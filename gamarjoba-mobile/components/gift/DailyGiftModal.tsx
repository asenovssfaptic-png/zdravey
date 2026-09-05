/* DailyGiftModal — Baba's gift on the first visit of the day: the next
 * sticker in album order, or a golden +10 XP day once the album is full.
 * NEVER a word about missed days (gaps are nobody's business). Port of
 * the web showDailyGift. */

import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTarget, radii, spacing, type } from "../../constants/theme";
import { CURRICULUM } from "../../content/generated/curriculum";
import type { Sticker } from "../../content/types";
import { announce, useToast } from "../../lib/announce";
import { playPraise, playUi } from "../../lib/audio";
import { grantSticker } from "../../lib/rewards";
import { addXp, consumeFirstVisitToday, getProgress } from "../../lib/store";
import Confetti from "../ui/Confetti";

interface Gift {
  sticker: Sticker | null;
  day: number;
}

/** Claim today's gift once per app session (module-level memo, so React
 * re-mounts/strict double-invokes can never double-grant). Null when
 * today's gift was already claimed or it isn't the first visit today. */
let claimedGift: Gift | null | undefined;
function claimDailyGift(): Gift | null {
  if (claimedGift !== undefined) return claimedGift;
  if (!consumeFirstVisitToday()) {
    claimedGift = null;
    return claimedGift;
  }
  const sticker = grantSticker(); // quiet — the dialog IS the celebration
  if (!sticker) addXp(10); // golden borjgali day
  claimedGift = { sticker, day: Math.max(1, getProgress().daysPlayed.length) };
  return claimedGift;
}

export function DailyGiftModal(): React.ReactElement | null {
  const [gift] = useState<Gift | null>(claimDailyGift);
  const [visible, setVisible] = useState(gift !== null);
  const { toast } = useToast();

  useEffect(() => {
    if (!gift) return;
    // "A gift for you!" first, then a Georgian praise clip (web parity)
    playUi("A gift for you!")
      .then(() => {
        playPraise();
      })
      .catch(() => {});
    announce(
      `Day ${gift.day} of your adventure! ` +
        (gift.sticker ? `New sticker: ${gift.sticker.name}` : "Golden borjgali day, plus ten XP") +
        "."
    );
  }, [gift]);

  if (!visible || !gift) return null;
  const { sticker, day } = gift;

  const close = () => {
    setVisible(false);
    toast(
      sticker
        ? `🎁 ${sticker.emoji} ${sticker.name} added to your treasures!`
        : "🌟 +10 XP added!"
    );
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={close}>
      <Pressable
        style={styles.backdrop}
        accessibilityRole="button"
        accessibilityLabel="Dismiss the gift dialog"
        onPress={close}
      >
        <Pressable style={styles.dialogWrap} onPress={() => {}} accessibilityRole="none">
          <View style={styles.dialog} accessibilityViewIsModal accessibilityLabel="Daily gift">
            <Confetti trigger={1} />
          <Text style={styles.title}>{CURRICULUM.vocab.gamarjoba.ka}! · Good to see you!</Text>
          <Text style={styles.day}>Day {day}! Baba’s gift for you:</Text>
          <View style={styles.gift}>
            <Text style={styles.giftEmoji}>{sticker ? sticker.emoji : "🌟"}</Text>
            <Text style={styles.giftName}>
              {sticker ? sticker.name : "Golden borjgali day — +10 XP!"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add to my treasures"
            onPress={close}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.btnText}>Add to my treasures ✓</Text>
          </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(43, 35, 32, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  dialogWrap: {
    alignSelf: "stretch",
    maxWidth: 420,
  },
  dialog: {
    alignSelf: "stretch",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    overflow: "hidden",
  },
  title: {
    fontSize: type.h2,
    fontWeight: type.h1Weight,
    color: colors.ink,
    textAlign: "center",
  },
  day: {
    fontSize: type.body,
    color: colors.inkSoft,
  },
  gift: {
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.accentTint,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignSelf: "stretch",
  },
  giftEmoji: {
    fontSize: 52,
  },
  giftName: {
    fontSize: type.body,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
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

export default DailyGiftModal;

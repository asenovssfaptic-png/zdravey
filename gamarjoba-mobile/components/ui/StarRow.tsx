/* Stars — display only, always additive.
 * StarRow: inline best-of-3 (path subs). StarSlots: big finish-screen slots. */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../../constants/theme";

export interface StarRowProps {
  earned: number;
  total?: number;
  size?: number;
}

export function StarRow({ earned, total = 3, size = 16 }: StarRowProps): React.ReactElement {
  return (
    <View
      style={styles.row}
      accessibilityRole="image"
      accessibilityLabel={`${earned} of ${total} stars earned`}
    >
      {Array.from({ length: total }, (_, i) => (
        <Text
          key={i}
          style={{ fontSize: size, color: i < earned ? colors.gold : colors.border }}
        >
          {i < earned ? "★" : "☆"}
        </Text>
      ))}
    </View>
  );
}

export interface StarSlotsProps {
  slotCount: number;
  filled: number;
  label?: string;
}

export function StarSlots({ slotCount, filled, label }: StarSlotsProps): React.ReactElement | null {
  if (slotCount <= 0) return null;
  return (
    <View
      style={[styles.row, styles.slots]}
      accessibilityRole="image"
      accessibilityLabel={label ?? `${filled} of ${slotCount} stars earned`}
    >
      {Array.from({ length: slotCount }, (_, i) => (
        <Text key={i} style={[styles.slot, { color: i < filled ? colors.gold : colors.border }]}>
          ★
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
  },
  slots: {
    gap: spacing.md,
    justifyContent: "center",
  },
  slot: {
    fontSize: 44,
  },
});

export default StarRow;

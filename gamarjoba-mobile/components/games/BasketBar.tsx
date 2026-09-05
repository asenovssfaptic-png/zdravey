/* BasketBar — Baba's shopping list for Market day: one slot per list
 * item, ❓ until found, then the item's emoji with a ✓. Slots only ever
 * fill — they never empty. */

import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, type } from "../../constants/theme";
import { CURRICULUM } from "../../content/generated/curriculum";
import { useReducedMotion } from "../../lib/announce";

const C = CURRICULUM;

export interface BasketBarProps {
  /** Baba's list, in order; found slots show the emoji + ✓. */
  listIds: string[];
  foundCount: number;
}

function Slot({ id, filled }: { id: string; filled: boolean }): React.ReactElement {
  const w = C.vocab[id];
  const [pop] = useState(() => new Animated.Value(1));
  const wasFilled = useRef(filled);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (filled && !wasFilled.current && !reduced) {
      pop.setValue(0.4);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true }).start();
    }
    wasFilled.current = filled;
  }, [filled, reduced, pop]);

  return (
    <Animated.View
      style={[styles.slot, filled && styles.slotFilled, { transform: [{ scale: pop }] }]}
      accessibilityRole="image"
      accessibilityLabel={filled && w ? `${w.en} — in the basket` : "still to find"}
    >
      <Text style={styles.slotEmoji} accessibilityElementsHidden>
        {filled && w ? w.emoji : "❓"}
      </Text>
      {filled ? (
        <Text style={styles.slotCheck} accessibilityElementsHidden>
          ✓
        </Text>
      ) : null}
    </Animated.View>
  );
}

export function BasketBar({ listIds, foundCount }: BasketBarProps): React.ReactElement {
  return (
    <View style={styles.bar} accessibilityLabel="Baba’s shopping list" accessibilityRole="none">
      <Text style={styles.label}>Baba’s list</Text>
      {listIds.map((id, i) => (
        <Slot key={`${id}-${i}`} id={id} filled={i < foundCount} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md - 2,
    marginVertical: spacing.md,
  },
  label: {
    fontWeight: "800",
    fontSize: type.body - 2,
    color: colors.ink,
  },
  slot: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radii.md + 2,
  },
  slotFilled: {
    borderStyle: "solid",
    borderColor: colors.success,
    backgroundColor: colors.successTint,
  },
  slotEmoji: {
    fontSize: 30,
  },
  slotCheck: {
    position: "absolute",
    top: -8,
    right: -4,
    fontSize: 16,
    fontWeight: "800",
    color: colors.success,
  },
});

export default BasketBar;

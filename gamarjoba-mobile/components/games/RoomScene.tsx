/* RoomScene — the cozy room for "Find it at home": three zone bands
 * (wall shelf / middle furniture / floor rug) of big emoji items.
 *
 * Also exports SceneItem, the one emoji game tile (reused by the market
 * stall): gentle-only feedback — a missed tap shakes then dims, the
 * correct item turns success-green with a ✓ and stays tappable to move
 * on. Pure RN layout, no images beyond emoji text.
 */

import React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTarget, radii, shadow, spacing } from "../../constants/theme";
import { CURRICULUM } from "../../content/generated/curriculum";
import { useShakeDim, type AnswerStatus } from "../ui/OptionCard";

const C = CURRICULUM;

/* ------------------------------------------------------------------ *
 * SceneItem — one emoji tile (room + market stall)
 * ------------------------------------------------------------------ */

export interface SceneItemProps {
  emoji: string;
  /** Accessible name — the item's English word (never the answer's ka). */
  label: string;
  status: AnswerStatus;
  disabled: boolean;
  onPress: () => void;
}

export function SceneItem({
  emoji,
  label,
  status,
  disabled,
  onPress,
}: SceneItemProps): React.ReactElement {
  const { translateX, scale, dimmed } = useShakeDim(status);
  const correct = status === "correct";

  return (
    <Animated.View style={{ transform: [{ translateX }, { scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.item,
          correct && styles.itemCorrect,
          dimmed && styles.itemDim,
          pressed && !disabled && styles.itemPressed,
        ]}
      >
        <Text style={styles.itemEmoji} accessibilityElementsHidden>
          {emoji}
        </Text>
        {correct ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✓</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ *
 * RoomScene
 * ------------------------------------------------------------------ */

export interface RoomSceneProps {
  /** wall / mid / floor rows of vocab ids shown this round. */
  rows: { wall: string[]; mid: string[]; floor: string[] };
  statusOf: (id: string) => AnswerStatus;
  disabledOf: (id: string) => boolean;
  onPick: (id: string) => void;
}

export function RoomScene({
  rows,
  statusOf,
  disabledOf,
  onPick,
}: RoomSceneProps): React.ReactElement {
  const renderRow = (ids: string[]): React.ReactElement[] =>
    ids
      .filter((id) => !!C.vocab[id])
      .map((id) => (
        <SceneItem
          key={id}
          emoji={C.vocab[id].emoji}
          label={C.vocab[id].en}
          status={statusOf(id)}
          disabled={disabledOf(id)}
          onPress={() => onPick(id)}
        />
      ));

  return (
    <View style={styles.scene} accessibilityLabel="A cozy room" accessibilityRole="none">
      {/* wall band — a shelf strip */}
      <View style={[styles.row, styles.wallRow]}>{renderRow(rows.wall)}</View>
      {/* middle band — furniture height */}
      <View style={styles.row}>{renderRow(rows.mid)}</View>
      {/* floor band — the rug */}
      <View style={[styles.row, styles.floorRow]}>{renderRow(rows.floor)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    borderRadius: radii.xl - 4,
    padding: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderTopWidth: 14,
    borderTopColor: colors.border,
    gap: spacing.md,
    ...shadow,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.md + 2,
    paddingVertical: spacing.xs,
  },
  wallRow: {
    borderBottomWidth: 4,
    borderBottomColor: colors.border, // the shelf under the wall things
    paddingBottom: spacing.md,
  },
  floorRow: {
    backgroundColor: colors.accentTint, // the rug
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
  item: {
    minWidth: 76,
    minHeight: Math.max(76, minTarget),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    ...shadow,
  },
  itemPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  itemCorrect: {
    backgroundColor: colors.successTint,
    borderColor: colors.success,
  },
  itemDim: {
    opacity: 0.45,
  },
  itemEmoji: {
    fontSize: 44,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.surface,
    fontWeight: "800",
  },
});

export default RoomScene;

/* MarketStall — the Market-day stall: a red-and-white svg awning over a
 * 4-wide grid of emoji items (SceneItem tiles — same gentle feedback as
 * the room). Found items stay green-checked for the rest of the list. */

import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Polygon, Rect } from "react-native-svg";

import { colors, radii, shadow, spacing } from "../../constants/theme";
import { CURRICULUM } from "../../content/generated/curriculum";
import type { AnswerStatus } from "../ui/OptionCard";
import { SceneItem } from "./RoomScene";

const C = CURRICULUM;

function Awning({ width }: { width: number }): React.ReactElement {
  const seg = 28;
  const n = Math.max(1, Math.ceil(width / seg));
  const tris: React.ReactElement[] = [];
  for (let i = 0; i < n; i++) {
    tris.push(
      <Polygon
        key={i}
        points={`${i * seg},0 ${(i + 1) * seg},0 ${i * seg + seg / 2},18`}
        fill={i % 2 === 0 ? colors.accent : colors.white}
      />
    );
  }
  return (
    <Svg width="100%" height={18} viewBox={`0 0 ${n * seg} 18`} preserveAspectRatio="none">
      <Rect x={0} y={0} width={n * seg} height={6} fill={colors.accent} />
      {tris}
    </Svg>
  );
}

export interface MarketStallProps {
  /** the stall's grid of vocab ids (list items + distractors, shuffled). */
  itemIds: string[];
  statusOf: (id: string) => AnswerStatus;
  disabledOf: (id: string) => boolean;
  onPick: (id: string) => void;
}

export function MarketStall({
  itemIds,
  statusOf,
  disabledOf,
  onPick,
}: MarketStallProps): React.ReactElement {
  const [width, setWidth] = useState(320);
  return (
    <View
      style={styles.scene}
      accessibilityLabel="A market stall"
      accessibilityRole="none"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.awning} accessibilityElementsHidden>
        <Awning width={width} />
      </View>
      <View style={styles.grid}>
        {itemIds
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
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    borderRadius: radii.xl - 4,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    ...shadow,
  },
  awning: {
    marginHorizontal: -spacing.lg + 4,
    marginBottom: spacing.md,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    overflow: "hidden",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
  },
});

export default MarketStall;

/* SafariGrid — the Letter-safari 4×4 grid of big Mkhedruli glyph tiles.
 * Found targets lock green with a ✓ (they never un-find); a wrong tap
 * only shakes and stays live — a free learning moment, no penalty. */

import React, { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTarget, radii, shadow, spacing } from "../../constants/theme";
import type { Letter } from "../../content/types";
import { useReducedMotion } from "../../lib/announce";
import KaText from "../ui/KaText";

interface TileProps {
  letter: Letter;
  found: boolean;
  /** increments each time THIS tile is a wrong tap → shake. */
  shakeSeq: number;
  onPress: () => void;
}

function SafariTile({ letter, found, shakeSeq, onPress }: TileProps): React.ReactElement {
  const [translateX] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!shakeSeq || reduced) return;
    Animated.sequence(
      [8, -8, 6, -6, 0].map((v) =>
        Animated.timing(translateX, { toValue: v, duration: 70, useNativeDriver: true })
      )
    ).start();
  }, [shakeSeq, reduced, translateX]);

  return (
    <Animated.View style={[styles.tileWrap, { transform: [{ translateX }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          `Letter ${letter.name}, ${letter.translit}` + (found ? ", found" : "")
        }
        accessibilityState={{ disabled: found }}
        disabled={found}
        onPress={onPress}
        style={({ pressed }) => [
          styles.tile,
          found && styles.tileFound,
          pressed && !found && styles.tilePressed,
        ]}
      >
        <KaText text={letter.ka} size={31} />
        {found ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✓</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export interface SafariGridProps {
  tiles: Letter[];
  targetKa: string;
  foundIndices: number[];
  onTap: (index: number) => void;
  /** last wrong tap: which tile + a sequence number to key the shake. */
  miss?: { index: number; seq: number } | null;
}

export function SafariGrid({
  tiles,
  foundIndices,
  onTap,
  miss,
}: SafariGridProps): React.ReactElement {
  return (
    <View style={styles.grid}>
      {tiles.map((lt, i) => (
        <SafariTile
          key={i}
          letter={lt}
          found={foundIndices.includes(i)}
          shakeSeq={miss && miss.index === i ? miss.seq : 0}
          onPress={() => onTap(i)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md - 2,
    maxWidth: 420,
    alignSelf: "center",
    width: "100%",
  },
  tileWrap: {
    flexBasis: "22%",
    flexGrow: 1,
    maxWidth: 96,
  },
  tile: {
    minHeight: Math.max(72, minTarget),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    ...shadow,
  },
  tilePressed: {
    backgroundColor: colors.surfaceAlt,
  },
  tileFound: {
    backgroundColor: colors.successTint,
    borderColor: colors.success,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.surface,
    fontWeight: "800",
    fontSize: 13,
  },
});

export default SafariGrid;

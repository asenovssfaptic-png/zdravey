/* Progress ring (port of the web ringSvg) — a track circle + a fill arc
 * that only ever grows; `done` turns it success-green. Children render
 * centered (an emoji face, a glyph…). Decorative — the OWNING control
 * carries the accessible label. */

import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { colors } from "../../constants/theme";

export interface ProgressRingProps {
  frac: number;
  done?: boolean;
  /** Crowned unit: the done fill turns gold (web `.node-crowned` parity). */
  gold?: boolean;
  size?: number;
  children?: React.ReactNode;
}

const R = 50;
const CIRC = 2 * Math.PI * R;

export function ProgressRing({
  frac,
  done = false,
  gold = false,
  size = 56,
  children,
}: ProgressRingProps): React.ReactElement {
  const clamped = Math.min(1, Math.max(0, frac));
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} viewBox="0 0 108 108">
        <Circle cx={54} cy={54} r={R} stroke={colors.border} strokeWidth={7} fill="none" />
        <Circle
          cx={54}
          cy={54}
          r={R}
          stroke={done ? (gold ? colors.gold : colors.success) : colors.accent}
          strokeWidth={7}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${(CIRC * clamped).toFixed(2)} ${CIRC.toFixed(2)}`}
          transform="rotate(-90 54 54)"
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ProgressRing;

/* Session progress bar. The fill must ONLY EVER MOVE FORWARD (retries
 * never pull it back): pass a monotonic `pct` — the SessionPlayer already
 * tracks `maxPct` in its reducer, so this stays a pure view. */

import React from "react";
import { StyleSheet, View } from "react-native";

import { colors, radii } from "../../constants/theme";

export interface ProgressBarProps {
  /** 0–100, NON-DECREASING (callers pass their tracked maxPct). */
  pct: number;
  /** e.g. "Step 3 of 12" — spoken value for the progress bar. */
  valueText?: string;
}

export function ProgressBar({ pct, valueText }: ProgressBarProps): React.ReactElement {
  const shown = Math.min(100, Math.max(0, pct));
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityLabel="Lesson progress"
      accessibilityValue={{ min: 0, max: 100, now: shown, text: valueText }}
    >
      <View style={[styles.fill, { width: `${shown}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
    flex: 1,
  },
  fill: {
    height: "100%",
    borderRadius: radii.md,
    backgroundColor: colors.accent,
  },
});

export default ProgressBar;

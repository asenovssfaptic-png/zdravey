import { StyleSheet, View } from "react-native";

import { Colors, Radii, Spacing } from "@/constants/theme";

interface ProgressBarProps {
  total: number;
  completed: number;
}

// Progress = collecting martenitsi. No hearts, no losable state — this only
// ever fills in, one dot per exercise finished.
export function ProgressBar({ total, completed }: ProgressBarProps) {
  return (
    <View style={styles.row} accessibilityLabel={`${completed} of ${total} collected`}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i < completed ? styles.dotDone : styles.dotPending]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: Radii.round,
    borderWidth: 2,
    borderColor: Colors.darkRed,
  },
  dotDone: {
    backgroundColor: Colors.red,
  },
  dotPending: {
    backgroundColor: Colors.white,
  },
});

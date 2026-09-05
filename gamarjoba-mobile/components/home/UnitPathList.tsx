/* UnitPathList — the 16-unit adventure path in two labeled parts.
 * STUB (Agent A — Learn): already renders real units with progress rings
 * and crowns so the path is demoable; A replaces with the full design. */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { colors, minTarget, radii, shadow, spacing, type } from "../../constants/theme";
import { CURRICULUM } from "../../content/generated/curriculum";
import { computeNextStep, unitNodeCounts } from "../../lib/exercise-engine";
import ProgressRing from "../ui/ProgressRing";
import { useProgress } from "../../lib/store";

const C = CURRICULUM;

export function UnitPathList(): React.ReactElement {
  const progress = useProgress();
  const next = computeNextStep(progress);

  return (
    <View style={styles.list}>
      {C.units.map((u, i) => {
        const counts = unitNodeCounts(progress, u);
        const crowned = progress.crowns.includes(u.id);
        const completed = crowned || counts.done === counts.total;
        const isNext = !!next && next.unit.id === u.id;
        return (
          <React.Fragment key={u.id}>
            {i === 0 ? <Text style={styles.section}>Part 1 · First words</Text> : null}
            {i === 8 && C.units.length > 8 ? (
              <Text style={styles.section}>Part 2 · Out & about</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                `Unit: ${u.title}, ${counts.done} of ${counts.total} steps complete` +
                (crowned ? ", crowned" : "") +
                (isNext ? ", up next" : "")
              }
              onPress={() => router.push(`/unit/${u.id}` as never)}
              style={({ pressed }) => [
                styles.stop,
                isNext && styles.next,
                pressed && styles.pressed,
              ]}
            >
              <ProgressRing
                frac={counts.total ? counts.done / counts.total : 0}
                done={completed}
                size={52}
              >
                <Text style={styles.face}>{u.emoji}</Text>
              </ProgressRing>
              <View style={styles.label}>
                <Text style={styles.title}>
                  {crowned ? "👑 " : ""}
                  {u.title}
                </Text>
                <Text style={styles.sub}>
                  {counts.done} / {counts.total} steps
                </Text>
              </View>
              {isNext ? (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>Up next</Text>
                </View>
              ) : null}
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  section: {
    fontSize: type.h2,
    fontWeight: type.h2Weight,
    color: colors.ink,
    marginTop: spacing.md,
  },
  stop: {
    minHeight: minTarget + 12,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadow,
  },
  next: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  face: {
    fontSize: 22,
  },
  label: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: type.body,
    fontWeight: "700",
    color: colors.ink,
  },
  sub: {
    fontSize: type.body - 3,
    color: colors.inkSoft,
  },
  pill: {
    backgroundColor: colors.accent,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillText: {
    color: colors.surface,
    fontSize: type.body - 4,
    fontWeight: "800",
  },
});

export default UnitPathList;

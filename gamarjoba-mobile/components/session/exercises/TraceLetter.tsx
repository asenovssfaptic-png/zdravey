/* trace_letter — write the letter with a finger. Tracing is DOING, never
 * judged: Done ✓ always succeeds, Clear is free, and "Watch it draw" also
 * counts as tracing. Wraps the foundation TraceCanvas (which plays the
 * once-per-letter auto demo itself). */

import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTarget, radii, spacing, type } from "../../../constants/theme";
import { announce, useToast } from "../../../lib/announce";
import { letterAudioId, playLetter } from "../../../lib/audio";
import type { Exercise, ExerciseResult } from "../../../lib/exercise-engine";
import { recordTraced } from "../../../lib/rewards";
import AudioButton from "../../ui/AudioButton";
import InstructionLine from "../../ui/InstructionLine";
import KaText from "../../ui/KaText";
import TraceCanvas, { type TraceCanvasHandle } from "../../ui/TraceCanvas";

export type TraceLetterExercise = Extract<Exercise, { type: "trace_letter" }>;

export interface TraceLetterProps {
  ex: TraceLetterExercise;
  onResult: (r: ExerciseResult) => void;
}

export function TraceLetter({ ex, onResult }: TraceLetterProps): React.ReactElement {
  const letter = ex.letter;
  const canvas = useRef<TraceCanvasHandle>(null);
  const done = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    announce(`You are writing the letter ${letter.name} — it says ${letter.translit}`);
    playLetter(letter).catch(() => {});
  }, [letter]);

  const traced = (): void => {
    const badge = recordTraced(letter.ka);
    if (badge) toast(`New badge: ${badge.name}! 🎉`);
  };

  return (
    <View style={styles.wrap}>
      <InstructionLine text="Trace the letter" />

      <View
        style={styles.header}
        accessibilityLabel={`You are writing the letter ${letter.name} — it says ${letter.translit}`}
      >
        <KaText text={letter.ka} size={type.h1} />
        <View style={styles.headerText}>
          <Text style={styles.headerName}>{letter.name}</Text>
          <Text style={styles.headerSound}>says {letter.translit}</Text>
        </View>
        <AudioButton audioId={letterAudioId(letter)} label={`Hear the letter ${letter.name}`} />
      </View>

      <View style={styles.canvasCard}>
        <TraceCanvas ref={canvas} letter={letter} autoDemo />
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Watch the letter ${letter.ka} draw itself stroke by stroke`}
          onPress={() => {
            canvas.current?.watch(() => {
              traced();
              announce("The letter drew itself — now it counts as traced!");
            });
          }}
          style={({ pressed }) => [styles.btn, styles.secondary, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.secondaryText}>▶ Watch it draw</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear your tracing"
          onPress={() => canvas.current?.clear()}
          style={({ pressed }) => [styles.btn, styles.ghost, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.ghostText}>Clear</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done — finish this letter"
          onPress={() => {
            if (done.current) return;
            done.current = true;
            if ((canvas.current?.getStrokeCount() ?? 0) > 0) traced();
            // tracing is doing — always correct, never judged
            onResult({ correct: true, firstTry: true, announce: `You wrote ${letter.ka}!` });
          }}
          style={({ pressed }) => [styles.btn, styles.primary, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.primaryText}>Done ✓</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  headerText: {
    gap: 2,
  },
  headerName: {
    fontSize: type.h2,
    fontWeight: type.h2Weight,
    color: colors.ink,
  },
  headerSound: {
    fontSize: type.body - 2,
    color: colors.inkSoft,
  },
  canvasCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  btn: {
    minHeight: minTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  primaryText: {
    color: colors.surface,
    fontSize: type.body,
    fontWeight: "800",
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.ink,
    fontSize: type.body - 1,
    fontWeight: "700",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  ghostText: {
    color: colors.accentDeep,
    fontSize: type.body - 1,
    fontWeight: "700",
  },
});

export default TraceLetter;

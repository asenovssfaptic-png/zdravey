/* Reading practice — no-stars session (praise + XP only). Owned by
 * Agent C; computes buildReadingExercises and mounts A's SessionPlayer. */

import React, { useMemo } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";

import SessionPlayer from "../../../components/session/SessionPlayer";
import Screen from "../../../components/ui/Screen";
import {
  buildReadingExercises,
  findReadingStep,
  type SessionConfig,
} from "../../../lib/exercise-engine";

export default function ReadingPracticeScreen(): React.ReactElement {
  const { stepId } = useLocalSearchParams<{ stepId: string }>();
  const step = findReadingStep(String(stepId));

  const config = useMemo<SessionConfig | null>(
    () =>
      step
        ? {
            mode: "reading-practice",
            stepId: step.id,
            title: `${step.title} — Practice`,
            exercises: buildReadingExercises(step, "practice"),
          }
        : null,
    [step]
  );

  if (!config) return <Redirect href="/reading" />;

  return (
    <Screen scroll={false} topBar={false}>
      <SessionPlayer config={config} onExit={() => router.replace("/reading" as never)} />
    </Screen>
  );
}

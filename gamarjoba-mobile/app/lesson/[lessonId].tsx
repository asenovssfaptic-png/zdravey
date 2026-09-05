/* Lesson player route — builds the lesson's exercises and mounts the
 * SessionPlayer (frozen contract). Owned by Agent A — Learn. */

import React, { useMemo } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";

import SessionPlayer from "../../components/session/SessionPlayer";
import Screen from "../../components/ui/Screen";
import { buildLessonExercises, findLesson, type SessionConfig } from "../../lib/exercise-engine";

export default function LessonScreen(): React.ReactElement {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const found = findLesson(String(lessonId));

  const config = useMemo<SessionConfig | null>(
    () =>
      found
        ? {
            mode: "lesson",
            lessonId: found.lesson.id,
            unitId: found.unit.id,
            title: found.lesson.title,
            exercises: buildLessonExercises(found.unit, found.lesson),
          }
        : null,
    [found]
  );

  if (!found || !config) return <Redirect href="/" />;

  return (
    <Screen scroll={false} topBar={false}>
      <SessionPlayer
        config={config}
        onExit={() => router.replace(`/unit/${found.unit.id}` as never)}
      />
    </Screen>
  );
}

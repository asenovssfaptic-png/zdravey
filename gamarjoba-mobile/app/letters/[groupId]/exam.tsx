/* Letter exam — recipe-driven, incl. trace_letter and build_syllable.
 * Owned by Agent B — Letters; only computes buildLetterExam and mounts
 * A's SessionPlayer via its frozen prop contract. */

import React, { useMemo } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";

import SessionPlayer from "../../../components/session/SessionPlayer";
import Screen from "../../../components/ui/Screen";
import {
  alphaGroupById,
  buildLetterExam,
  findPathGroup,
  type SessionConfig,
} from "../../../lib/exercise-engine";

export default function LettersExamScreen(): React.ReactElement {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const pg = findPathGroup(String(groupId));
  const group = pg ? alphaGroupById(pg.groupId) : null;

  const config = useMemo<SessionConfig | null>(
    () =>
      pg && group
        ? {
            mode: "letters-exam",
            groupId: pg.groupId,
            title: `${group.title} — Letter exam`,
            exercises: buildLetterExam(pg),
          }
        : null,
    [pg, group]
  );

  if (!config) return <Redirect href="/letters" />;

  return (
    <Screen scroll={false} topBar={false}>
      <SessionPlayer config={config} onExit={() => router.replace("/letters" as never)} />
    </Screen>
  );
}

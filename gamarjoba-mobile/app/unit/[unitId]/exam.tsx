/* Unit exam route — builds the recipe-driven exam and mounts the
 * SessionPlayer (frozen contract). Owned by Agent A — Learn. */

import React, { useMemo } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";

import SessionPlayer from "../../../components/session/SessionPlayer";
import Screen from "../../../components/ui/Screen";
import { buildUnitExam, findUnit, type SessionConfig } from "../../../lib/exercise-engine";

export default function UnitExamScreen(): React.ReactElement {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const unit = findUnit(String(unitId));

  const config = useMemo<SessionConfig | null>(
    () =>
      unit
        ? {
            mode: "unit-exam",
            unitId: unit.id,
            title: `${unit.title} — Unit exam`,
            exercises: buildUnitExam(unit),
          }
        : null,
    [unit]
  );

  if (!unit || !config) return <Redirect href="/" />;

  return (
    <Screen scroll={false} topBar={false}>
      <SessionPlayer config={config} onExit={() => router.replace(`/unit/${unit.id}` as never)} />
    </Screen>
  );
}
